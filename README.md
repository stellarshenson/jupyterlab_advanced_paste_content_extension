# jupyterlab_advanced_paste_content_extension

[![GitHub Actions](https://github.com/stellarshenson/jupyterlab_advanced_paste_content_extension/actions/workflows/build.yml/badge.svg)](https://github.com/stellarshenson/jupyterlab_advanced_paste_content_extension/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/jupyterlab_advanced_paste_content_extension.svg)](https://www.npmjs.com/package/jupyterlab_advanced_paste_content_extension)
[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-advanced-paste-content-extension.svg)](https://pypi.org/project/jupyterlab-advanced-paste-content-extension/)
[![Total PyPI downloads](https://static.pepy.tech/badge/jupyterlab-advanced-paste-content-extension)](https://pepy.tech/project/jupyterlab-advanced-paste-content-extension)
[![JupyterLab 4](https://img.shields.io/badge/JupyterLab-4-orange.svg)](https://jupyterlab.readthedocs.io/en/stable/)
[![Brought To You By KOLOMOLO](https://img.shields.io/badge/Brought%20To%20You%20By-KOLOMOLO-00ffff?style=flat)](https://kolomolo.com)
[![Donate PayPal](https://img.shields.io/badge/Donate-PayPal-blue?style=flat)](https://www.paypal.com/donate/?hosted_button_id=B4KPBJDLLXTSA)

Paste anything into JupyterLab and have it land as a real file. The extension intercepts the paste,
writes the clipboard payload into the folder you are working in, and gives the surface that received
the paste a reference to that file instead of a blob of inline content.

A screenshot pasted into a markdown cell becomes a PNG on disk plus an image link. A copied file
becomes a copy in the current folder. Text stays text.

## Features

- **Clipboard content written to disk** - the pasted payload is saved into the current folder, not
  embedded in the document
- **Handler per content type** - text, files and graphics each take their own handler, so the
  written artefact matches what was pasted
- **Receiving surface aware** - the reference handed back suits the target: a `.txt` file, a `.md`
  file, a `.py` file, or a terminal
- **Server-side write** - the file is created through a Jupyter server endpoint, so it lands in the
  server's workspace rather than the browser sandbox

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
