"""Configuration for the advanced-paste-content extension.

Users can set options in their jupyter_server_config.py:

    c.PasteClippingsConfig.clippings_dir = "/tmp/paste-clippings"

A paste into a terminal produces no document to anchor a reference to, so the
file it writes is a clipping and lands in `clippings_dir` instead of the folder
the file browser shows. The shell receives the absolute path, which resolves
from whatever directory it has changed into.

The default sits under the system temporary directory because a clipping is
clipboard-like: it is not meant to outlive the machine's uptime. To keep them,
put the folder anywhere and point the default name at it:

    mkdir -p ~/.cache/paste-clippings
    ln -s ~/.cache/paste-clippings /tmp/paste-clippings

The symlink is followed - the resolved directory is what gets written into - so
the clips survive a reboot that clears the temporary directory.
"""

from __future__ import annotations

import os
import tempfile

from traitlets import Unicode
from traitlets.config import Configurable

#: Where a terminal paste lands when `clippings_dir` is left alone.
DEFAULT_CLIPPINGS_DIR = os.path.join(tempfile.gettempdir(), "paste-clippings")


class PasteClippingsConfig(Configurable):
    """Configurable settings for jupyterlab_advanced_paste_content_extension.

    Set in jupyter_server_config.py:

        c.PasteClippingsConfig.clippings_dir = "/tmp/paste-clippings"
    """

    clippings_dir = Unicode(
        DEFAULT_CLIPPINGS_DIR,
        config=True,
        help=(
            "Directory a paste into a terminal writes into. The file browser "
            "does not reach this folder and is not expected to: the shell is "
            "handed the absolute path of the file instead. A symlink is "
            "followed, so pointing this at a folder outside the temporary "
            "directory is how clippings are made to survive a reboot. The "
            f"default is {DEFAULT_CLIPPINGS_DIR}. When the directory cannot be "
            "created, or resolves to one this process does not own, the paste "
            "falls back to the folder the file browser shows rather than "
            "failing."
        ),
    )
