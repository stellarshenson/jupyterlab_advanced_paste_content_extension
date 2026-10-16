import pytest

pytest_plugins = ("pytest_jupyter.jupyter_server", )


@pytest.fixture(scope="session")
def clippings_dir(tmp_path_factory):
    """The folder the test server writes terminal clippings into.

    Session-scoped and shared: the server reads its configuration once, so the
    tests and the server have to agree on one folder. Tests that care about its
    contents empty it first.
    """
    return tmp_path_factory.mktemp("clippings")


@pytest.fixture
def jp_server_config(jp_server_config, clippings_dir):
    return {
        "ServerApp": {
            "jpserver_extensions": {
                "jupyterlab_advanced_paste_content_extension": True,
            },
            # Test against a server which requires authentication on all endpoints
            "allow_unauthenticated_access": False,
        },
        "PasteClippingsConfig": {"clippings_dir": str(clippings_dir)},
    }
