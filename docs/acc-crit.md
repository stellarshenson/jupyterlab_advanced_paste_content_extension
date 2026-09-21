# Acceptance Criteria

Advanced paste content extension for JupyterLab, target version 1.0.0. What each content type does on each receiving surface is specified in [design-content-types.md](design-content-types.md); the criteria below assert the individual cells of that matrix.

## Authors

- `@kj` Konrad Jelen

## Paste Routing `ROUTE`

Which conversion a pasted payload gets, decided by whether the receiving surface renders markdown

- [x] `ACC-ROUTE-1` **Markdown file takes markdown** - HIGH; rich HTML pasted into a .md file is inserted as markdown; matrix in docs/design-content-types.md
  - related: DEF-PASTE-15 - the conversion fidelity this criterion does not reach
  - evidence: decide.spec 'converts HTML to markdown on markdown-file'; markdown.spec asserts ATX heading and - list markers out of turndown; 57 jest green
  - test: copy a heading and a bullet list from a web page, paste into a .md file, assert ATX heading and - markers
  - test-tags: FUNCTIONAL, E2E
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: decide routes HTML to markdown on markdown-file
  - log: 2026-09-20T18:05:46Z @kj closed on unit tests exercising clean b and h2 HTML only; DEF-PASTE-15 records that Word and Google Docs CSS-only formatting is not rebuilt by this converter
- [x] `ACC-ROUTE-2` **Markdown cell takes markdown** - HIGH; rich HTML pasted into a notebook markdown cell is inserted as markdown
  - evidence: decide.spec 'converts HTML to markdown on markdown-cell'; same converter as ACC-ROUTE-1; 57 jest green
  - test: same clipboard as ACC-ROUTE-1, paste into a markdown cell, assert the same output
  - test-tags: FUNCTIONAL, E2E
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: decide routes HTML to markdown on markdown-cell
  - log: 2026-09-20T18:05:46Z @kj same coverage limit as ACC-ROUTE-1; see DEF-PASTE-15
- [x] `ACC-ROUTE-3` **Text file takes plain text** - HIGH; rich HTML pasted into a .txt file is inserted as plain text, no markup
  - evidence: decide.spec 'leaves HTML to the browser on text-file' returns kind none, so the plain-text flavour is what lands; 57 jest green
  - test: copy a formatted paragraph, paste into a .txt file, assert no markdown characters
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: decide leaves HTML to the browser on text-file
- [x] `ACC-ROUTE-4` **Code cell takes plain text** - HIGH; rich HTML pasted into a notebook code cell is inserted as plain text, no markup
  - evidence: decide.spec 'leaves HTML to the browser on code-cell' returns kind none; 57 jest green
  - test: copy a formatted paragraph, paste into a code cell, assert no markdown characters
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: decide leaves HTML to the browser on code-cell
- [x] `ACC-ROUTE-5` **Terminal takes plain text** - MEDIUM; rich HTML pasted into a terminal is inserted as plain text, no markup
  - evidence: decide.spec 'leaves HTML to the browser on terminal' returns kind none; 57 jest green
  - test: copy a formatted paragraph, paste into a terminal, assert no markdown characters
  - test-tags: MANUAL
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: decide leaves HTML to the browser on terminal
- [x] `ACC-ROUTE-6` **Edge: clipboard carries no HTML** - MEDIUM; a clipboard holding text/plain only inserts the text unchanged on every surface
  - evidence: content.spec 'falls back to plain text when no HTML is offered'; decide.spec 'never intercepts plain text' across all five surfaces; 57 jest green
  - test: copy from a plain editor, paste into each of the five surfaces, assert byte-identical text
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:04Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: plain text is never intercepted

## Image Handling `IMAGE`

Bitmap pastes, which carry pixels and no source file

- [x] `ACC-IMAGE-7` **Bitmap always becomes a file** - CRITICAL; a bitmap paste writes a file on every surface, including the three that insert plain text
  - evidence: decide.spec 'writes a bitmap on %s' parameterised over all five surfaces returns write-bitmap; 57 jest green
  - test: paste a screenshot into each of the five surfaces, assert a file appears in the folder each time
  - test-tags: FUNCTIONAL, E2E
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: bitmap writes on every surface
- [x] `ACC-IMAGE-8` **Bitmaps written as PNG** - HIGH; every bitmap is written as PNG whatever the clipboard carried
  - evidence: content.spec asserts extension png for image/png and jpg for image/jpeg; naming.spec 'carries the extension it is given'; 57 jest green
  - test: paste a screenshot, assert the written file starts with the PNG magic bytes
  - test-tags: UNIT, FUNCTIONAL
  - mechanism: 2026-09-20T17:20:38Z @kj screenshots are flat colour and text, which JPEG damages; the browser normalises a raw DIB to PNG when the item is read, so no conversion step is needed
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: PNG derived from the clipboard type
- [x] `ACC-IMAGE-9` **Timestamp filename** - HIGH; a written bitmap is named paste-YYYYMMDD-HHMMSS.png
  - evidence: naming.spec asserts paste-20260920-191530.png for a fixed date, zero padding, and the regex paste-[0-9]{8}-[0-9]{6}.png; 57 jest green
  - test: paste a screenshot, assert the name matches paste-[0-9]{8}-[0-9]{6}.png
  - test-tags: UNIT
  - mechanism: 2026-09-20T17:20:38Z @kj a bitmap has no source name so one must be invented; timestamp chosen over counter, content hash and prompt because it never collides, which removes the overwrite case entirely
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: timestamp naming
- [x] `ACC-IMAGE-10` **Written beside the document** - HIGH; a bitmap is written to the folder holding the document that received the paste, so the inserted link is the bare filename
  - evidence: galata 'a bitmap pasted into a markdown cell writes that file and links it' reads the filename the extension chose out of the cell and asserts contents.fileExists(tmpPath/name) is true, so the file landed in the notebook's own folder; 4 E2E passed in 38.7s against JupyterLab 4.6.3 with the extension installed and enabled
  - related: DEF-TEST-21 - the galata assertions that must be fixed before a run can close this
  - test: open a .md file in a subfolder, paste a screenshot, assert the file lands in that subfolder
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:38Z @kj server side proven by pytest test_writes_into_a_subfolder; the frontend folder derivation lives in index.ts which has no unit coverage, so this stays open until the galata suite runs
  - log: 2026-09-20T18:23:39Z @kj closed: proven by the galata suite against a real browser
- [x] `ACC-IMAGE-11` **Identical bitmap is not written twice** - MEDIUM; the payload is hashed before writing; a byte-identical file already in the folder is referenced instead of writing a second copy
  - evidence: pytest test_identical_content_is_not_written_twice: second write returns the first name with reused true and one file on disk; 12 pytest green
  - test: paste the same screenshot twice, assert one file on disk and two references to it
  - test-tags: UNIT, FUNCTIONAL
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: server-side hash dedup
- [x] `ACC-IMAGE-12` **Reference form per surface** - HIGH; image link on the two markdown surfaces with the destination in angle brackets, JSON-quoted filename in a code cell, bare filename in a .txt file and a terminal
  - evidence: reference.spec asserts every form including a name with a space and a name with a quote; jest 61 green
  - test: paste one screenshot into each of the five surfaces, assert each inserted form against the matrix in docs/design-content-types.md
  - test-tags: FUNCTIONAL, E2E
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: reference form per surface
  - log: 2026-09-20T18:05:45Z @kj edited text and evidence (replaced)

## File Reference Handling `FILES`

Pastes carrying a real file copied from a file manager

- [x] `ACC-FILES-13` **Copied file is copied in** - HIGH; a file pasted from a file manager is copied into the current folder
  - evidence: pytest test_writes_the_payload and test_writes_into_a_subfolder assert the bytes land under the named folder; 12 pytest green
  - test: copy a file in the OS file manager, paste into a .md file, assert the copy exists in the folder
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: server writes the payload
- [x] `ACC-FILES-14` **Original filename kept** - MEDIUM; a copied file keeps its own name, unlike a bitmap, because the name is real information
  - evidence: pytest test_a_real_filename_is_kept asserts report.pdf is written under its own name; 12 pytest green
  - test: copy report.pdf, paste, assert the written file is named report.pdf
  - test-tags: UNIT
  - log: 2026-09-20T17:20:38Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: real filename preserved
- [x] `ACC-FILES-15` **Reference form per surface** - MEDIUM; link with the destination in angle brackets on the two markdown surfaces, JSON-quoted filename in a code cell, bare filename in a .txt file and a terminal; a pasted image file gets the image form
  - evidence: reference.spec asserts both kinds on every surface; jest 61 green
  - test: paste one file into each of the five surfaces, assert each inserted form against the matrix in docs/design-content-types.md
  - test-tags: FUNCTIONAL
  - log: 2026-09-20T17:20:39Z @kj added
  - log: 2026-09-20T17:34:32Z @kj closed: reference form per surface
  - log: 2026-09-20T18:05:45Z @kj edited text and evidence (replaced)
- [x] `ACC-FILES-16` **Edge: name already taken by different content** - HIGH; a payload whose name exists in the folder and whose bytes differ is written as <stem>-1.<ext>, then -2; an existing file is never overwritten
  - evidence: pytest test_same_name_different_content_gets_a_suffix asserts paste-...-1.png is written and the original survives with its own bytes; 12 pytest green
  - test: write a.png, then write different bytes as a.png, assert both a.png and a-1.png exist with their own contents
  - test-tags: UNIT, FUNCTIONAL
  - mechanism: 2026-09-20T17:28:25Z @kj dedup handles the identical case, so a surviving name clash always means different content; overwriting would destroy a file the user already had
  - log: 2026-09-20T17:28:25Z @kj added
  - log: 2026-09-20T17:34:33Z @kj closed: suffix on a taken name
- [x] `ACC-FILES-17` **Writes cannot escape the server root** - CRITICAL; a folder resolving outside the Jupyter server root is refused with 400, and a filename carrying any path separator is refused with 400
  - evidence: pytest test_a_dangling_symlink_does_not_escape_the_root asserts the outside path is never created, plus the five lexical cases and the folder guard; 15 pytest green
  - test: POST folder ../.. and filename sub/escape.png, assert 400 on each and no file written
  - test-tags: UNIT, FUNCTIONAL
  - mechanism: 2026-09-20T17:28:26Z @kj the server writes wherever the frontend names, so the frontend is not trusted; the resolved absolute path must sit under contents_manager.root_dir
  - log: 2026-09-20T17:28:26Z @kj added
  - log: 2026-09-20T17:34:33Z @kj closed: traversal refused
  - log: 2026-09-20T18:05:45Z @kj reopened: closed on lexical-traversal evidence only; the adversarial review reproduced an escape through a dangling symlink, so the guarantee was false; evidence retired: pytest test_folder_outside_the_root_is_rejected and the parametrised bad-input cases assert 400 on folder ../.. and on filenames carrying a separator; 12 pytest green
  - log: 2026-09-20T18:05:45Z @kj closed: creation hardened with O_EXCL and O_NOFOLLOW
- [x] `ACC-FILES-18` **Every pasted file is written** - HIGH; a paste carrying several files writes all of them and inserts all their references, separated by a blank line on markdown surfaces and a space elsewhere
  - evidence: content.spec asserts a mixed list is not collapsed to a bitmap and all names survive; decide.spec asserts the blank-line separator; jest 61 green
  - test: paste three files into a .md file, assert three files written and three links on their own lines
  - test-tags: UNIT, FUNCTIONAL
  - mechanism: 2026-09-20T17:31:11Z @kj classify returns the whole file list rather than the first entry, so the handler cannot silently drop the rest
  - log: 2026-09-20T17:31:11Z @kj added
  - log: 2026-09-20T17:34:33Z @kj closed: all files written
  - log: 2026-09-20T18:05:45Z @kj edited text and evidence (replaced)
