import pytest

pytest_plugins = ("pytest_jupyter.jupyter_server", )


@pytest.fixture
def jp_server_config(jp_server_config):
    return {
        "ServerApp": {
            # The terminals extension supplies the terminal manager a paste into
            # a terminal reads the shell's working directory from.
            "jpserver_extensions": {
                "jupyterlab_advanced_paste_content_extension": True,
                "jupyter_server_terminals": True,
            },
            # Test against a server which requires authentication on all endpoints
            "allow_unauthenticated_access": False,
        }
    }
