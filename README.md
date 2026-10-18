# jupyterlab_advanced_paste_content_extension

[![GitHub Actions](https://github.com/stellarshenson/jupyterlab_advanced_paste_content_extension/actions/workflows/build.yml/badge.svg)](https://github.com/stellarshenson/jupyterlab_advanced_paste_content_extension/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/jupyterlab_advanced_paste_content_extension.svg)](https://www.npmjs.com/package/jupyterlab_advanced_paste_content_extension)
[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-advanced-paste-content-extension.svg)](https://pypi.org/project/jupyterlab-advanced-paste-content-extension/)
[![Total PyPI downloads](https://static.pepy.tech/badge/jupyterlab-advanced-paste-content-extension)](https://pepy.tech/project/jupyterlab-advanced-paste-content-extension)
[![JupyterLab 4](https://img.shields.io/badge/JupyterLab-4-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Brought To You By KOLOMOLO](https://img.shields.io/badge/Brought%20To%20You%20By-KOLOMOLO-00ffff?style=flat)](https://kolomolo.com)
[![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-blue?style=flat)](https://www.paypal.com/donate/?hosted_button_id=B4KPBJDLLXTSA)

Paste a screenshot or a file into JupyterLab and have it land as a real file. The extension
intercepts the paste, writes the payload into the folder you are working in, and gives the surface
that received the paste a reference to that file instead of a blob of inline content. A plain-text
paste is left alone.

A screenshot pasted into a markdown cell becomes a PNG on disk plus an image link. A copied file
becomes a copy in the current folder. Text stays text.

A terminal has no document to give the file a home, so a paste into one becomes a clipping: the file
is written into a clippings folder of its own and the shell receives its absolute path.

## Features

- **Screenshots become files** - a pasted bitmap is written as PNG named `paste-20260920-191530.png`
  in the folder holding the document, instead of a base64 blob inside the notebook
- **Pasted files are copied in** - a file copied from a file manager lands in the current folder
  under its own name; several files at once all arrive
- **The reference suits the surface** - `![](name)` in a markdown file or markdown cell, `"name"` in
  a code cell so it drops into `plt.imread()`, the bare name in a text file
- **Rich HTML becomes markdown** - only on the two surfaces that render it; a text file, a code cell
  and a terminal take the plain-text flavour, which is what a normal paste already gives them
- **A terminal gets a clipping** - a file or image pasted into a terminal is written into the
  clippings folder, `/tmp/paste-files` by default, and the terminal receives the
  absolute path to it, escaped for the shell, so it resolves wherever the shell has changed into;
  Claude Code and the other AI assistant terminals included
- **Nothing is written twice** - an identical payload references the file already in the folder, and
  a name clash never overwrites
- **Server-side write** - the file is created through a Jupyter server endpoint, so it lands in the
  server's workspace rather than the browser sandbox; a request-named folder cannot escape the
  server root, and the server-chosen clippings folder is the deliberate exception

The full behaviour of every content type on every surface is in
[docs/design-content-types.md](docs/design-content-types.md).

## Configuration

The clippings folder is where a paste into a terminal writes. It defaults to
`/tmp/paste-files` and is set in `jupyter_server_config.py`:

```python
c.PasteClippingsConfig.clippings_dir = "/srv/clippings"
```

A clipping is treated like clipboard content and is not expected to survive a reboot, which is why
the default sits in the temporary directory. To keep them, put the folder anywhere and point the
default name at it:

```bash
mkdir -p ~/.cache/paste-files && chmod 700 ~/.cache/paste-files
ln -s ~/.cache/paste-files /tmp/paste-files
```

The symlink is followed, so clips land in the folder under your home directory and outlive the
temporary directory being cleared.

When the configured folder cannot be created, or resolves to one this server does not own, the paste
is written into the folder the file browser shows instead. A paste never fails because of the
clippings folder.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install jupyterlab_advanced_paste_content_extension
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall jupyterlab_advanced_paste_content_extension
```
