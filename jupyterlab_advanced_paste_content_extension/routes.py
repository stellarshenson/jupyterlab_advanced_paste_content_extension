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


def _terminal_cwd(terminal_manager, name, root):
    """Resolve a terminal's shell working directory, relative to the root.

    Only the server can answer this. The frontend has no API for a terminal's
    cwd, so without it a paste into a terminal writes wherever the file browser
    happens to be pointing and the inserted name does not resolve at the prompt.

    Returns None when the terminal is unknown, when the platform has no /proc,
    or when the shell has walked outside the server root - the caller then falls
    back to the folder the frontend named.
    """
    if terminal_manager is None or not name:
        return None
    try:
        terminal = terminal_manager.get_terminal(name)
        pid = terminal.ptyproc.pid
        cwd = os.path.realpath(os.path.join("/proc", str(pid), "cwd"))
    except Exception:
        return None
    if not os.path.isdir(cwd):
        return None
    if cwd != root and not cwd.startswith(root + os.sep):
        return None
    return "" if cwd == root else os.path.relpath(cwd, root)


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

        # A paste into a terminal names the terminal rather than a folder: the
        # frontend cannot know where the shell has cd'd to, and the file browser
        # it would otherwise name diverges after the first cd.
        terminal = body.get("terminal")
        if terminal:
            resolved = _terminal_cwd(
                self.settings.get("terminal_manager"), terminal, root
            )
            if resolved is not None:
                folder = resolved

        target_folder = os.path.abspath(os.path.join(root, folder))
        # commonpath, not a string prefix: with root "/" the prefix would be "//"
        # and every path under it would be refused.
        if os.path.commonpath([root, target_folder]) != root:
            raise tornado.web.HTTPError(400, "folder is outside the server root")
        if not os.path.isdir(target_folder):
            raise tornado.web.HTTPError(404, "folder does not exist")

        try:
            data = base64.b64decode(content_base64, validate=True)
        except Exception:
            raise tornado.web.HTTPError(400, "content_base64 is not valid base64")

        written, reused = await IOLoop.current().run_in_executor(
            None, _store, target_folder, filename, data
        )
        self.finish(json.dumps({"filename": written, "reused": reused}))


def setup_route_handlers(web_app):
    host_pattern = ".*$"
    base_url = web_app.settings["base_url"]

    write_route_pattern = url_path_join(base_url, NAMESPACE, "write")
    handlers = [(write_route_pattern, WriteRouteHandler)]

    web_app.add_handlers(host_pattern, handlers)
