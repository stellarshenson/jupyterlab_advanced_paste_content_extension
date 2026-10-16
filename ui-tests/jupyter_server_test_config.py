"""Server configuration for integration tests.

!! Never use this configuration in production because it
opens the server to the world and provide access to JupyterLab
JavaScript objects through the global window variable.
"""
from jupyterlab.galata import configure_jupyter_server

configure_jupyter_server(c)

# A paste into a terminal is a clipping, and a clipping is written outside the
# workspace, so the suite points it at a folder of its own instead of the
# default this machine's own lab shares.
c.PasteClippingsConfig.clippings_dir = "/tmp/jupyterlab-paste-e2e-clippings"

# Uncomment to set server log level to debug level
# c.ServerApp.log_level = "DEBUG"
