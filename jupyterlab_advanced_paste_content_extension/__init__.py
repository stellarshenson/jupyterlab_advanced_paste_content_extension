try:
    from ._version import __version__
except ImportError:
    # Fallback when using the package in dev mode without installing
    # in editable mode with pip. It is highly recommended to install
    # the package from a stable release or in editable mode: https://pip.pypa.io/en/stable/topics/local-project-installs/#editable-installs
    import warnings
    warnings.warn("Importing 'jupyterlab_advanced_paste_content_extension' outside a proper installation.")
    __version__ = "dev"
from .config import PasteClippingsConfig
from .routes import setup_route_handlers


def _jupyter_labextension_paths():
    return [{
        "src": "labextension",
        "dest": "jupyterlab_advanced_paste_content_extension"
    }]


def _jupyter_server_extension_points():
    return [{
        "module": "jupyterlab_advanced_paste_content_extension"
    }]


def _load_jupyter_server_extension(server_app):
    """Registers the API handler to receive HTTP requests from the frontend extension.

    Parameters
    ----------
    server_app: jupyterlab.labapp.LabApp
        JupyterLab application instance
    """
    config = PasteClippingsConfig(parent=server_app)
    setup_route_handlers(server_app.web_app, config=config)
    name = "jupyterlab_advanced_paste_content_extension"
    server_app.log.info(f"Registered {name} server extension")
    # Named because a clipping is written outside the file browser's view, so
    # the folder is the only way to find it without reading the config.
    server_app.log.info(f"Terminal clippings are written to {config.clippings_dir}")
