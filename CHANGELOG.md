# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- <START NEW CHANGELOG ENTRY> -->

## [1.0.1] - 2026-09-21

First public release.

### Added

- Paste routing decided by the receiving surface: rich HTML is converted to markdown in a markdown
  file or a markdown cell, and taken as the plain-text flavour in a text file, a code cell and a
  terminal
- A clipboard bitmap, which carries pixels and no source file, is written to the current folder as
  `paste-YYYYMMDD-HHMMSS.png` and referenced with an image link
- Files copied from a file manager are written into the current folder under their own names,
  several at once, each referenced in the syntax the surface expects
- A paste into a terminal resolves the shell's own working directory, read from the shell process by
  the server
- Server write endpoint creating files with `O_EXCL` and `O_NOFOLLOW`, deduplicating byte-identical
  payloads by sha256, and refusing any folder outside the server root
- Payload ceiling of 32 MB, above which the paste is left to JupyterLab to handle

### Fixed

- The `Check Links` job of the Build workflow no longer fails on the downloads badge, whose URL only
  resolves after the first release

<!-- <END NEW CHANGELOG ENTRY> -->
