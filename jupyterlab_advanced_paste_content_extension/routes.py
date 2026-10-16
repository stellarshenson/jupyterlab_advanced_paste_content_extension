import base64
import hashlib
import json
import os

from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
from tornado.ioloop import IOLoop
import tornado

NAMESPACE = "jupyterlab-advanced-paste-content-extension"

# Above this many entries the dedup scan costs more than the duplicate it saves.
# Measured: 20 000 entries is 139 ms of blocked event loop per write, and a
# multi-file paste re-scans what it has just written.
MAX_DEDUP_ENTRIES = 2000


def _sha256(data):
    return hashlib.sha256(data).hexdigest()


def _find_identical(folder, data):
    """Return the name of a file in folder whose bytes equal data, or None.

    Size is compared first so only same-size candidates are read. An empty
    payload is never matched: every empty file in the folder equals it, so the
    reference would point at an unrelated file.
    """
    want_size = len(data)
    if want_size == 0:
        return None
    names = sorted(os.listdir(folder))
    if len(names) > MAX_DEDUP_ENTRIES:
        return None
    want_hash = _sha256(data)
    for name in names:
        candidate = os.path.join(folder, name)
        try:
            if not os.path.isfile(candidate):
                continue
            if os.path.getsize(candidate) != want_size:
                continue
            with open(candidate, "rb") as handle:
                if _sha256(handle.read()) == want_hash:
                    return name
        except OSError:
            # An unreadable neighbour is not this write's problem.
            continue
    return None


def _write_new(folder, filename, data):
    """Write data under filename, or under filename-N when that name is taken.

    Creating with O_EXCL makes the name test and the create one operation, so
    there is no window between them and no dangling symlink to follow: a symlink
    sitting at the name fails EEXIST and the next suffix is tried. O_NOFOLLOW
    refuses a symlink at the final component outright. Testing the name with
    os.path.exists first, as this did, was blind to a dangling symlink and the
    write then followed it outside the server root.

    O_NOFOLLOW covers the last component alone, so a symlink standing in for a
    directory on the way is followed. That is what lets the clippings folder be
    a symlink into a directory the user keeps.
    """
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0)
    stem, ext = os.path.splitext(filename)
    candidate = filename
    index = 0
    while True:
        try:
            handle = os.open(os.path.join(folder, candidate), flags, 0o644)
        except FileExistsError:
            index += 1
            candidate = f"{stem}-{index}{ext}"
            continue
        with os.fdopen(handle, "wb") as stream:
            stream.write(data)
        return candidate


def _clippings_folder(directory):
    """Create and return the folder a terminal paste writes into, or None.

    The path comes from this extension's own configuration, never from a
    request, so the server-root confinement that guards a client-named folder
    does not apply to it. Confinement exists to stop a request naming a path
    outside the root; nothing here is request-named.

    The path is resolved before it is created. Clippings are meant to be
    disposable, so the default sits in the temporary directory, and the
    documented way to keep them is a symlink from that name to a folder under
    the user's home. Resolving first means a symlink whose target does not exist
    yet creates the target, instead of failing and silently falling back.

    Returns None when the folder cannot be created, or resolves to a directory
    this process does not own. The temporary directory is world-writable, so
    with a fixed default name another user could create the folder ahead of the
    server and read every clip written into it; the ownership test refuses that.
    A symlink into a directory the user owns resolves to one they own and
    passes.
    """
    if not directory:
        return None
    try:
        resolved = os.path.realpath(directory)
        os.makedirs(resolved, mode=0o700, exist_ok=True)
        if not os.path.isdir(resolved):
            return None
        getuid = getattr(os, "getuid", None)
        if getuid is not None and os.stat(resolved).st_uid != getuid():
            return None
    except OSError:
        return None
    return resolved


def _store(folder, filename, data):
    """Reference an identical file, or write a new one.

    Blocking: it stats and reads the folder, so it runs in an executor rather
    than on the event loop. O_EXCL inside _write_new is what keeps the
    never-overwrite guarantee true now that two requests can overlap.
    """
    existing = _find_identical(folder, data)
    if existing is not None:
        return existing, True
    return _write_new(folder, filename, data), False


class WriteRouteHandler(APIHandler):
    # The following decorator should be present on all verb methods (head, get, post,
    # patch, put, delete, options) to ensure only authorized user can request the
    # Jupyter server
    @tornado.web.authenticated
    async def post(self):
        body = self.get_json_body() or {}
        folder = body.get("folder", "")
        filename = body.get("filename")
        content_base64 = body.get("content_base64")

        if not filename or content_base64 is None:
            raise tornado.web.HTTPError(400, "filename and content_base64 are required")
        if os.path.basename(filename) != filename:
            raise tornado.web.HTTPError(400, "filename must not contain a path")

        root = os.path.abspath(self.contents_manager.root_dir)

        # A paste into a terminal has no document to anchor a reference to, so
        # the file it writes is a clipping: it belongs in this extension's own
        # folder rather than the one the file browser shows. Every other surface
        # still names the folder it wants, and that name still has to be inside
        # the server root. When the clipping folder is unavailable the named
        # folder is used instead, so a paste degrades rather than fails.
        config = self.settings.get("paste_clippings_config")
        target_folder = None
        if body.get("clippings"):
            target_folder = _clippings_folder(
                getattr(config, "clippings_dir", "") if config else ""
            )

        if target_folder is None:
            target_folder = os.path.abspath(os.path.join(root, folder))
            # commonpath, not a string prefix: with root "/" the prefix would be
            # "//" and every path under it would be refused.
            if os.path.commonpath([root, target_folder]) != root:
                raise tornado.web.HTTPError(400, "folder is outside the server root")
            if not os.path.isdir(target_folder):
                raise tornado.web.HTTPError(404, f"folder {folder or '/'} does not exist")

        try:
            data = base64.b64decode(content_base64, validate=True)
        except Exception:
            raise tornado.web.HTTPError(400, "content_base64 is not valid base64")

        # Without this the user reads "Unhandled error" and cannot tell which
        # folder refused the write, or why.
        try:
            written, reused = await IOLoop.current().run_in_executor(
                None, _store, target_folder, filename, data
            )
        except OSError as error:
            # The folder actually attempted, which on a clipping is not the one
            # the request named.
            raise tornado.web.HTTPError(
                500, f"could not write into {target_folder}: {error.strerror}"
            ) from error
        answer = {"filename": written, "reused": reused}
        # The shell is handed an absolute path, which it resolves from whatever
        # directory it has changed into. No terminal needs to be consulted, and
        # no shell's working directory needs to be read.
        if body.get("clippings"):
            answer["terminal_path"] = os.path.join(target_folder, written)
        self.finish(json.dumps(answer))


def setup_route_handlers(web_app, config=None):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    write_route_pattern = url_path_join(base_url, NAMESPACE, "write")
    handlers = [(write_route_pattern, WriteRouteHandler)]

    web_app.add_handlers(host_pattern, handlers)
    web_app.settings["paste_clippings_config"] = config
