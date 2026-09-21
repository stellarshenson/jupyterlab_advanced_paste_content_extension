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


class _FakePty:
    def __init__(self, pid):
        self.pid = pid


class _FakeTerminal:
    def __init__(self, pid):
        self.ptyproc = _FakePty(pid)


class _FakeTerminalManager:
    def __init__(self, terminals):
        self._terminals = terminals

    def get_terminal(self, name):
        return self._terminals[name]


def test_terminal_cwd_resolves_the_shell_working_directory(tmp_path):
    """Only the server can read this; the frontend has no API for it."""
    from jupyterlab_advanced_paste_content_extension import routes

    root = str(tmp_path)
    work = tmp_path / "work" / "deep"
    work.mkdir(parents=True)

    # This process's own cwd stands in for the shell's.
    import subprocess
    import sys

    child = subprocess.Popen(
        [sys.executable, "-c", "import sys; sys.stdin.read()"],
        cwd=str(work),
        stdin=subprocess.PIPE,
    )
    try:
        manager = _FakeTerminalManager({"1": _FakeTerminal(child.pid)})
        assert routes._terminal_cwd(manager, "1", root) == os.path.join(
            "work", "deep"
        )
    finally:
        child.stdin.close()
        child.wait(timeout=10)


def test_terminal_cwd_refuses_a_shell_outside_the_root(tmp_path):
    from jupyterlab_advanced_paste_content_extension import routes

    root = tmp_path / "root"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()

    import subprocess
    import sys

    child = subprocess.Popen(
        [sys.executable, "-c", "import sys; sys.stdin.read()"],
        cwd=str(outside),
        stdin=subprocess.PIPE,
    )
    try:
        manager = _FakeTerminalManager({"1": _FakeTerminal(child.pid)})
        assert routes._terminal_cwd(manager, "1", str(root)) is None
    finally:
        child.stdin.close()
        child.wait(timeout=10)


def test_terminal_cwd_returns_none_without_a_manager_or_name():
    from jupyterlab_advanced_paste_content_extension import routes

    assert routes._terminal_cwd(None, "1", "/") is None
    assert routes._terminal_cwd(_FakeTerminalManager({}), "", "/") is None


def test_terminal_cwd_returns_none_for_an_unknown_terminal(tmp_path):
    from jupyterlab_advanced_paste_content_extension import routes

    manager = _FakeTerminalManager({})
    assert routes._terminal_cwd(manager, "99", str(tmp_path)) is None
