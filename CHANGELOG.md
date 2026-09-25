# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- <START NEW CHANGELOG ENTRY> -->

## [1.0.2] - 2026-09-25

### Changed

- A screenshot or file pasted into a terminal is written into the folder the file browser shows, and
  the terminal receives the path to it relative to the shell's working directory, escaped for the
  shell; this includes Claude Code and the other AI assistant terminals

### Fixed

- The path inserted into a terminal resolves when the shell is outside the server root
- A pasted file whose name holds a space or a shell character reaches the shell as one argument
- The path follows a nested shell such as `bash` or `sudo -s` after a `cd` inside it
- A paste naming a terminal that is no longer running no longer starts a shell, which also broke the
  server's terminal list
- A paste into a folder the server cannot write names the folder and the reason instead of
  "Unhandled error"

<!-- <END NEW CHANGELOG ENTRY> -->

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
