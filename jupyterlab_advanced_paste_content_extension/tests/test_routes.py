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


async def _open_terminal(jp_fetch, cwd):
    response = await jp_fetch(
        "api", "terminals", method="POST", body=json.dumps({"cwd": str(cwd)})
    )
    return json.loads(response.body)["name"]


async def _terminal_names(jp_fetch):
    response = await jp_fetch("api", "terminals", method="GET")
    return [terminal["name"] for terminal in json.loads(response.body)]


async def test_a_terminal_paste_lands_in_the_folder_named_not_the_shell_folder(
    jp_fetch, jp_root_dir
):
    (jp_root_dir / "browser").mkdir()
    (jp_root_dir / "shell").mkdir()
    name = await _open_terminal(jp_fetch, jp_root_dir / "shell")

    payload = await write(
        jp_fetch, folder="browser", filename="a b.png", content_base64=PNG, terminal=name
    )

    assert (jp_root_dir / "browser" / "a b.png").exists()
    assert not (jp_root_dir / "shell" / "a b.png").exists()
    assert payload["terminal_path"] == os.path.join("..", "browser", "a b.png")


async def test_the_terminal_path_resolves_from_a_shell_outside_the_root(
    jp_fetch, jp_root_dir
):
    outside = jp_root_dir.parent / "outside"
    outside.mkdir()
    name = await _open_terminal(jp_fetch, outside)

    payload = await write(
        jp_fetch, folder="", filename="a.png", content_base64=PNG, terminal=name
    )

    assert not os.path.isabs(payload["terminal_path"])
    reached = os.path.join(os.path.realpath(outside), payload["terminal_path"])
    assert os.path.realpath(reached) == os.path.realpath(jp_root_dir / "a.png")


async def test_an_unknown_terminal_gets_the_absolute_path_and_starts_no_shell(
    jp_fetch, jp_root_dir
):
    payload = await write(
        jp_fetch,
        folder="",
        filename="a.png",
        content_base64=PNG,
        terminal="no-such-terminal",
    )

    # terminado's get_terminal is get-or-create: this is the assertion that
    # fails if the lookup ever goes back through it.
    assert "no-such-terminal" not in await _terminal_names(jp_fetch)
    assert payload["terminal_path"] == os.path.join(
        os.path.realpath(jp_root_dir), "a.png"
    )


def test_terminal_cwd_is_none_without_a_terminal_manager():
    from jupyterlab_advanced_paste_content_extension import routes

    assert routes._terminal_cwd(None, "1") is None


def test_the_terminal_path_follows_a_nested_shell(tmp_path):
    """The directory that counts is the foreground process's, not the pty's first."""
    import time
    from types import SimpleNamespace

    from ptyprocess import PtyProcessUnicode

    from jupyterlab_advanced_paste_content_extension import routes

    outer = tmp_path / "outer"
    inner = outer / "deep"
    browser = tmp_path / "browser"
    inner.mkdir(parents=True)
    browser.mkdir()

    shell = PtyProcessUnicode.spawn(["bash", "--norc", "-i"], cwd=str(outer))
    manager = SimpleNamespace(terminals={"t": SimpleNamespace(ptyproc=shell)})
    try:
        shell.write("bash --norc -i\n")
        shell.write(f"cd '{inner}'\n")
        deadline = time.monotonic() + 5
        while routes._terminal_cwd(manager, "t") != str(inner.resolve()):
            assert time.monotonic() < deadline, "the nested shell never reached the folder"
            time.sleep(0.05)

        path = routes._terminal_path(manager, "t", str(browser), "a b.png")

        # outer and deep sit at different depths, so a path computed from the
        # pty's first process would not resolve from where the user is.
        assert os.path.realpath(os.path.join(inner, path)) == str(
            (browser / "a b.png").resolve()
        )
    finally:
        shell.terminate(force=True)
