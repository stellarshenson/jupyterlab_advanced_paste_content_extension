import base64
import json
import os

import pytest
from tornado.httpclient import HTTPClientError

NAMESPACE = "jupyterlab-advanced-paste-content-extension"

PNG = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"payload").decode()
OTHER = base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"different").decode()


async def write(jp_fetch, **body):
    response = await jp_fetch(
        NAMESPACE, "write", method="POST", body=json.dumps(body)
    )
    return json.loads(response.body)


async def test_writes_the_payload(jp_fetch, jp_root_dir):
    payload = await write(
        jp_fetch, folder="", filename="paste-20260920-191530.png", content_base64=PNG
    )

    assert payload == {"filename": "paste-20260920-191530.png", "reused": False}
    written = jp_root_dir / "paste-20260920-191530.png"
    assert written.exists()
    assert written.read_bytes() == base64.b64decode(PNG)


async def test_writes_into_a_subfolder(jp_fetch, jp_root_dir):
    (jp_root_dir / "work").mkdir()

    payload = await write(
        jp_fetch, folder="work", filename="paste-20260920-191530.png", content_base64=PNG
    )

    assert payload["reused"] is False
    assert (jp_root_dir / "work" / "paste-20260920-191530.png").exists()


async def test_identical_content_is_not_written_twice(jp_fetch, jp_root_dir):
    first = await write(
        jp_fetch, folder="", filename="paste-20260920-191530.png", content_base64=PNG
    )
    second = await write(
        jp_fetch, folder="", filename="paste-20260920-191602.png", content_base64=PNG
    )

    assert first["reused"] is False
    assert second == {"filename": "paste-20260920-191530.png", "reused": True}
    assert len(list(jp_root_dir.glob("paste-*.png"))) == 1


async def test_same_name_different_content_gets_a_suffix(jp_fetch, jp_root_dir):
    await write(
        jp_fetch, folder="", filename="paste-20260920-191530.png", content_base64=PNG
    )
    second = await write(
        jp_fetch, folder="", filename="paste-20260920-191530.png", content_base64=OTHER
    )

    assert second == {"filename": "paste-20260920-191530-1.png", "reused": False}
    assert (jp_root_dir / "paste-20260920-191530.png").exists()
    assert (jp_root_dir / "paste-20260920-191530-1.png").exists()


async def test_a_real_filename_is_kept(jp_fetch, jp_root_dir):
    payload = await write(
        jp_fetch, folder="", filename="report.pdf", content_base64=PNG
    )

    assert payload["filename"] == "report.pdf"
    assert (jp_root_dir / "report.pdf").exists()


@pytest.mark.parametrize(
    "body",
    [
        {"folder": "", "content_base64": PNG},
        {"folder": "", "filename": "a.png"},
        {"folder": "", "filename": "../escape.png", "content_base64": PNG},
        {"folder": "", "filename": "sub/escape.png", "content_base64": PNG},
        {"folder": "", "filename": "a.png", "content_base64": "not base64!!"},
    ],
)
async def test_bad_input_is_rejected(jp_fetch, body):
    with pytest.raises(HTTPClientError) as error:
        await jp_fetch(NAMESPACE, "write", method="POST", body=json.dumps(body))

    assert error.value.code == 400


async def test_folder_outside_the_root_is_rejected(jp_fetch):
    with pytest.raises(HTTPClientError) as error:
        await jp_fetch(
            NAMESPACE,
            "write",
            method="POST",
            body=json.dumps(
                {"folder": "../..", "filename": "a.png", "content_base64": PNG}
            ),
        )

    assert error.value.code == 400


async def test_missing_folder_is_reported(jp_fetch):
    with pytest.raises(HTTPClientError) as error:
        await jp_fetch(
            NAMESPACE,
            "write",
            method="POST",
            body=json.dumps(
                {"folder": "absent", "filename": "a.png", "content_base64": PNG}
            ),
        )

    assert error.value.code == 404
    assert "absent" in json.loads(error.value.response.body)["message"]


async def test_an_unwritable_folder_is_named_in_the_error(jp_fetch, jp_root_dir):
    locked = jp_root_dir / "locked"
    locked.mkdir()
    locked.chmod(0o500)
    try:
        with pytest.raises(HTTPClientError) as error:
            await write(jp_fetch, folder="locked", filename="a.png", content_base64=PNG)
    finally:
        locked.chmod(0o700)

    message = json.loads(error.value.response.body)["message"]
    assert "locked" in message
    assert "Permission denied" in message


async def test_a_dangling_symlink_does_not_escape_the_root(
    jp_fetch, jp_root_dir, tmp_path
):
    """os.path.exists is blind to a dangling symlink; open() would follow it."""
    outside = tmp_path / "outside"
    outside.mkdir()
    escape = outside / "nothere.png"
    (jp_root_dir / "paste-20260920-191530.png").symlink_to(escape)

    payload = await write(
        jp_fetch, folder="", filename="paste-20260920-191530.png", content_base64=PNG
    )

    assert not escape.exists()
    assert payload["filename"] == "paste-20260920-191530-1.png"
    assert (jp_root_dir / "paste-20260920-191530-1.png").read_bytes() == (
        base64.b64decode(PNG)
    )


async def test_an_empty_payload_is_not_deduped(jp_fetch, jp_root_dir):
    """Every empty file equals an empty payload, so none of them is a match."""
    (jp_root_dir / "__init__.py").write_bytes(b"")

    payload = await write(
        jp_fetch, folder="", filename="notes.txt", content_base64=""
    )

    assert payload == {"filename": "notes.txt", "reused": False}
    assert (jp_root_dir / "notes.txt").exists()


@pytest.mark.skipif(os.geteuid() == 0, reason="root reads any file")
async def test_an_unreadable_neighbour_does_not_fail_the_write(
    jp_fetch, jp_root_dir
):
    """One unreadable same-size file used to make every paste in the folder 500."""
    blocked = jp_root_dir / "blocked.png"
    blocked.write_bytes(base64.b64decode(OTHER))
    blocked.chmod(0o000)
    try:
        payload = await write(
            jp_fetch, folder="", filename="a.png", content_base64=OTHER
        )
    finally:
        blocked.chmod(0o644)

    assert payload["reused"] is False
    assert (jp_root_dir / "a.png").exists()


def test_a_root_of_slash_admits_its_children():
    """The old prefix test built "//" from root "/" and refused every path."""
    root = "/"
    target = os.path.abspath(os.path.join(root, "home", "lab"))

    assert not target.startswith(root + os.sep)  # the old test, which refused
    assert os.path.commonpath([root, target]) == root  # the one now used


def test_the_dedup_scan_gives_up_on_a_large_folder(tmp_path, monkeypatch):
    """The scan costs more than the duplicate it saves past a few thousand files."""
    from jupyterlab_advanced_paste_content_extension import routes

    payload = b"identical"
    (tmp_path / "twin.bin").write_bytes(payload)

    assert routes._find_identical(str(tmp_path), payload) == "twin.bin"

    monkeypatch.setattr(routes, "MAX_DEDUP_ENTRIES", 0)
    assert routes._find_identical(str(tmp_path), payload) is None


async def test_concurrent_same_name_writes_do_not_overwrite(jp_fetch, jp_root_dir):
    """The handler is async now, so two requests can overlap; O_EXCL must hold."""
    import asyncio

    first, second = await asyncio.gather(
        write(jp_fetch, folder="", filename="a.png", content_base64=PNG),
        write(jp_fetch, folder="", filename="a.png", content_base64=OTHER),
    )

    names = sorted([first["filename"], second["filename"]])
    assert names == ["a-1.png", "a.png"]

    written = sorted(p.read_bytes() for p in jp_root_dir.glob("a*.png"))
    assert written == sorted([base64.b64decode(PNG), base64.b64decode(OTHER)])


def _empty(folder):
    for entry in folder.iterdir():
        if entry.is_dir() and not entry.is_symlink():
            _empty(entry)
            entry.rmdir()
        else:
            entry.unlink()


async def test_a_clipping_lands_in_the_clippings_folder_not_the_named_one(
    jp_fetch, jp_root_dir, clippings_dir
):
    _empty(clippings_dir)
    (jp_root_dir / "browser").mkdir(exist_ok=True)

    payload = await write(
        jp_fetch,
        folder="browser",
        filename="a b.png",
        content_base64=PNG,
        clippings=True,
    )

    assert (clippings_dir / "a b.png").exists()
    # Owner-only: the keep recipe can put the folder in a shared cache.
    assert (clippings_dir / "a b.png").stat().st_mode & 0o077 == 0
    assert not (jp_root_dir / "browser" / "a b.png").exists()
    # Absolute, because a shell resolves it from whatever directory it is in.
    assert payload["terminal_path"] == str(clippings_dir / "a b.png")


def test_the_default_clippings_folder_is_paste_files():
    """An unconfigured server writes terminal pastes to /tmp/paste-files."""
    import tempfile

    from jupyterlab_advanced_paste_content_extension.config import PasteClippingsConfig

    expected = os.path.join(tempfile.gettempdir(), "paste-files")
    assert PasteClippingsConfig().clippings_dir == expected


async def test_a_write_that_is_not_a_clipping_still_uses_the_named_folder(
    jp_fetch, jp_root_dir
):
    """A notebook cell or a file editor is untouched by the clippings path."""
    (jp_root_dir / "work").mkdir(exist_ok=True)

    payload = await write(
        jp_fetch, folder="work", filename="a.png", content_base64=PNG
    )

    assert (jp_root_dir / "work" / "a.png").exists()
    assert "terminal_path" not in payload


async def test_the_clippings_folder_is_created_when_it_is_missing(
    jp_fetch, clippings_dir
):
    _empty(clippings_dir)
    clippings_dir.rmdir()
    assert not clippings_dir.exists()

    await write(
        jp_fetch, folder="", filename="a.png", content_base64=PNG, clippings=True
    )

    assert (clippings_dir / "a.png").exists()


async def test_a_symlinked_clippings_folder_is_followed_to_its_target(
    jp_fetch, clippings_dir
):
    """The documented way to keep clippings: point the folder at ~/.cache.

    The target is deliberately left uncreated, because a user who sets the
    symlink up first must not get a silent fallback to the file browser's
    folder.
    """
    _empty(clippings_dir)
    clippings_dir.rmdir()
    target = clippings_dir.parent / "persistent-clippings"
    clippings_dir.symlink_to(target, target_is_directory=True)

    payload = await write(
        jp_fetch, folder="", filename="a.png", content_base64=PNG, clippings=True
    )

    assert (target / "a.png").exists()
    assert payload["terminal_path"] == str(target / "a.png")


def test_clippings_folder_is_none_for_a_path_that_cannot_be_a_directory(tmp_path):
    from jupyterlab_advanced_paste_content_extension import routes

    blocker = tmp_path / "a-file"
    blocker.write_text("not a directory")

    assert routes._clippings_folder("") is None
    assert routes._clippings_folder(str(blocker / "under-a-file")) is None


def test_clippings_folder_refuses_a_directory_this_process_does_not_own(
    tmp_path, monkeypatch
):
    """The default name is fixed and the temporary directory is world-writable.

    Another user can therefore create the folder before the server does and read
    every clip written into it. The ownership test is what refuses that.
    """
    from jupyterlab_advanced_paste_content_extension import routes

    target = tmp_path / "someone-elses"
    target.mkdir()
    real_uid = os.getuid()
    monkeypatch.setattr(routes.os, "getuid", lambda: real_uid + 1)

    assert routes._clippings_folder(str(target)) is None


def test_clippings_folder_resolves_and_creates_the_directory(tmp_path):
    from jupyterlab_advanced_paste_content_extension import routes

    target = tmp_path / "made" / "on" / "demand"

    assert routes._clippings_folder(str(target)) == str(target)
    assert target.is_dir()
    # Group and other have no access: the temporary directory is world-writable,
    # so the folder is not shared with everyone who can list it.
    assert target.stat().st_mode & 0o077 == 0
