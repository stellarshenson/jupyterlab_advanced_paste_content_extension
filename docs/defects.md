# Defects

Advanced paste content extension for JupyterLab. Behaviour these defects are measured against is specified in [design-content-types.md](design-content-types.md) and asserted in [acc-crit.md](acc-crit.md).

## Authors

- `@kj` Konrad Jelen

## Paste Handling `PASTE`

The paste listener, its handlers and what they do with the clipboard payload

- [x] `DEF-PASTE-1` **Only the first of several pasted files is written** - MAJOR; classify() returns files[0] and index.ts writes that one; pasting three files writes one and drops two with no message
  - test-tags: UNIT
  - evidence: content.spec 'keeps every pasted file, not just the first' asserts all three names survive; decide.spec asserts write-files on all five surfaces; 57 jest tests green
  - repro: copy three files in a file manager, paste into a .md file, count the files written
  - root-cause: 2026-09-20T17:30:15Z @kj classify() was written for the single-file case and returns one File, so the array length is lost before the handler sees it
  - log: 2026-09-20T17:30:15Z @kj added
  - log: 2026-09-20T17:34:12Z @kj closed: classify returns the whole file list; handler maps over it
  - log: 2026-09-20T17:34:43Z @kj edited test-tags (added)
- [x] `DEF-PASTE-2` **A failed write loses the paste silently** - MAJOR; the handler calls preventDefault then writes asynchronously; when the write rejects, the catch only calls console.error, so the user sees nothing and the clipboard content is gone from the document
  - test-tags: UNIT
  - evidence: failure.spec asserts Notification.error is called with the reason for both Error and string inputs, and that the console line still happens; 57 jest tests green
  - repro: stop the server extension, paste a screenshot into a markdown cell, observe that nothing is inserted and no message appears
  - log: 2026-09-20T17:30:15Z @kj added
  - log: 2026-09-20T17:34:12Z @kj closed: reporting extracted to src/failure.ts and unit tested
  - log: 2026-09-20T17:34:43Z @kj edited test-tags (added)
- [x] `DEF-PASTE-3` **Bitmap branch swallows a multi-file paste** - MAJOR; files.find matched an image at any position, so one file named image.png collapsed the whole list to one payload and the rest were discarded; DEF-PASTE-1 re-entering through a branch its fix did not cover
  - evidence: content.spec 'does not collapse a mixed list to a bitmap' asserts image.png beside report.pdf and data.csv returns kind file with all three names, and 'still reads a lone synthetic image as a bitmap' holds the primary path; jest 61 green
  - repro: paste image.png, report.pdf and data.csv together into a .md file, count the files written
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: predicate tightened to files.length === 1
- [x] `DEF-PASTE-4` **Markdown reference is not a link when the name carries a space** - MAJOR; the destination was interpolated raw, so a name with a space or a parenthesis rendered as literal text; verified against marked in this tree
  - evidence: reference.spec 'wraps the destination so a name with a space still renders' asserts both the image and link forms; marked in this tree renders the wrapped form as an anchor and the bare form as literal text; jest 61 green
  - repro: paste a file named Q3 report.pdf into a markdown cell and run it
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: markdown destination wrapped in angle brackets unconditionally
- [x] `DEF-PASTE-5` **An image copied from a file manager inserted as a text link** - MAJOR; kind was hard-coded file for every write-files entry, so a pasted chart.png rendered as a clickable name instead of the picture
  - evidence: src/index.ts maps file.type.startsWith('image/') to the image reference; reference.spec covers both forms on every surface; jest 61 green
  - repro: copy chart.png in the file manager, paste into a markdown cell, run it
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: kind derived from the file MIME type
- [x] `DEF-PASTE-6` **Several markdown references run together on one line** - MINOR; separatorFor returned a single newline, which markdown joins into one paragraph
  - evidence: decide.spec 'puts a blank line between references' asserts two newlines; marked renders one newline as a single run-together paragraph and two as separate paragraphs; jest 61 green
  - repro: paste three files into a markdown cell and run it
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: separator is a blank line on markdown surfaces
- [x] `DEF-PASTE-7` **A quote in a filename breaks the code-cell string** - MINOR; the code-cell form was built by string interpolation, so a name carrying a double quote produced invalid Python
  - evidence: reference.spec 'escapes a quote in a code cell rather than breaking the string' asserts say "hi".txt becomes a valid escaped Python string; jest 61 green
  - repro: paste a file named say "hi".txt into a code cell
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: code-cell form built by JSON.stringify
- [x] `DEF-PASTE-11` **Paste target resolved from the shell, not the event** - MAJOR; resolveTarget reads app.shell.currentWidget and onPaste never passes event.target, so a paste aimed at the search field, a dialog or a side-panel input is cancelled and inserted into the active cell instead
  - evidence: guards.spec 'refuses a node outside the host, which is the hijack case' plus the host, nested-child, null-host and non-node cases; the listener now returns before classifying when receives() is false; jest 75 green
  - repro: open a notebook with a markdown cell active, press Ctrl+F, paste a web phrase, look at the cell source
  - test-tags: E2E
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:12:12Z @kj closed: containment test extracted to src/guards.ts and wired into onPaste
- [x] `DEF-PASTE-12` **No payload ceiling on the frontend** - MAJOR; toBase64 and JSON.stringify run on the main thread with no size test; measured 32MB 944ms, 200MB fatal out-of-memory, 420MB exceeds V8's string limit
  - evidence: guards.spec asserts accept at exactly MAX_PAYLOAD_BYTES and refuse above it; the oversized branch reports through failure.ts and returns without preventDefault, so the browser's own paste stays the fallback; jest 75 green
  - repro: copy a 200 MB file in the file manager and paste it into a markdown cell
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:12:13Z @kj closed: payload ceiling extracted to src/guards.ts, checked before the browser paste is cancelled
- [x] `DEF-PASTE-13` **Images carried as data URIs are inlined verbatim** - MAJOR; turndown emits the data: URI unchanged, so pasting Gmail, Outlook or rendered matplotlib HTML writes the base64 blob into the cell, which is what the extension exists to prevent
  - evidence: markdown.spec 'drops a data: image rather than inlining the blob' asserts no base64 survives and the alt text does; 'drops a file:/// image' and 'keeps an http image' cover the other two cases; jest 75 green
  - repro: copy a rendered matplotlib figure from a notebook output and paste into a markdown cell
  - test-tags: UNIT
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:12:13Z @kj closed: turndown rule dropping any img whose src is not http(s)
- [x] `DEF-PASTE-14` **Terminal writes to the file browser folder, not the shell cwd** - MAJOR; browser.model.path and the shell working directory agree only until the first cd; the inserted bare name then does not resolve. xterm's handlePasteEvent has no defaultPrevented check, so the terminal also receives the plain-text flavour
  - evidence: pytest test_terminal_cwd_resolves_the_shell_working_directory spawns a real process in a subdirectory and asserts _terminal_cwd returns that path relative to the root; test_terminal_cwd_refuses_a_shell_outside_the_root asserts None, so the root guarantee holds; two more cover a missing manager, an empty name and an unknown terminal. 22 pytest green
  - repro: open a terminal, cd somewhere, navigate the file browser elsewhere, paste a screenshot into the terminal
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:12:13Z @kj the xterm half is fixed: the terminal branch now calls stopPropagation alongside preventDefault, so the terminal no longer receives the plain-text flavour as well. The folder-versus-cwd half stays open and is unfixable in principle - JupyterLab exposes no API for the shell's working directory - and is now recorded as a limitation in docs/design-content-types.md
  - log: 2026-09-20T18:26:34Z @kj rejected: wontfix, cannot fix: the write-folder half has no possible remedy. A terminal has no document, and JupyterLab's ITerminalConnection exposes no shell working directory, so browser.model.path is the only folder the frontend can name and it diverges from the shell's cwd after the first cd. Recorded as a stated limitation in docs/design-content-types.md. The other half of this defect, xterm receiving the plain-text flavour alongside the inserted reference, was fixed by calling stopPropagation on the terminal branch
  - log: 2026-09-20T18:37:51Z @kj reopened: rejection withdrawn: I claimed no remedy exists because JupyterLab exposes no shell working directory. That is false. The frontend cannot know it; the SERVER can, through terminal_manager.get_terminal(name).ptyproc.pid and /proc/<pid>/cwd, and this extension has a server side. The sibling jupyterlab_terminal_show_in_file_browser_extension does exactly this. The premise was wrong, so the rejection was wrong
  - log: 2026-09-20T18:39:08Z @kj closed: the server resolves the shell's working directory; the frontend names the terminal instead of a folder
- [x] `DEF-PASTE-15` **Word list structure is lost** - MAJOR; Word writes bulleted and numbered lists as ordinary paragraphs carrying the bullet as literal text, with no ul or li anywhere; bare turndown emits them as paragraphs with a stray bullet character. Bold is no longer affected
  - evidence: markdown.spec 'rebuilds a Word list, which arrives as paragraphs with a literal bullet' asserts both items convert and the bullet character is gone; 'indents a nested Word list item by its level' asserts the level-2 indent against a realistic parent-plus-child list; jest 86 green
  - repro: copy a heading and a bold sentence from Google Docs, paste into a markdown cell
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:13:31Z @kj amended title "Word and Google Docs formatting is lost" -> "Word list structure is lost"; text "both carry bold as CSS on a bare span and lists as paragraphs with a literal bullet; bare turndown has no rule for either, and the Google Docs wrapper yields stray asterisk lines" -> "Word writes bulleted and numbered lists as ordinary paragraphs carrying the bullet as literal text, with no ul or li anywhere; bare turndown emits them as paragraphs with a stray bullet character. Bold is no longer affected"
  - log: 2026-09-20T18:13:31Z @kj bold half fixed: two turndown rules rebuild CSS-only bold from a span and drop the Google Docs font-weight:normal wrapper that produced stray asterisks; markdown.spec covers both plus the keyword form. List reconstruction is what remains, and the sibling extension's 630-line converter is still the only known complete answer
  - log: 2026-09-20T18:28:06Z @kj closed: two turndown rules rebuild Word's paragraph-based lists
- [x] `DEF-PASTE-16` **A multi-file paste failing partway inserts no references** - MAJOR; references accumulate in a local array and are inserted only after the loop completes, so a rejection discards the references for files already written
  - evidence: batch.spec 'inserts what was written when a later write fails' asserts a rejection on file 3 of 3 still inserts references for files 1 and 2, plus the empty-batch, first-write-fails and ordering cases; jest 86 green across 10 suites
  - repro: paste ten files with the fifth oversized, then look at the folder and the cell
  - test-tags: UNIT
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:12:13Z @kj writeAllAndInsert now inserts the accumulated references from a finally block, so files already written are referenced even when a later write fails. NOT closed: the code sits in index.ts, which has no unit coverage, so this is inspected rather than proven and closes on the galata run
  - log: 2026-09-20T18:23:39Z @kj the galata suite now runs green but does not exercise a mid-batch write failure, so this stays open: the finally-block fix is still inspected rather than proven
  - log: 2026-09-20T18:28:06Z @kj closed: the accumulate-and-insert loop extracted to src/batch.ts
- [-] `DEF-PASTE-17` **The late insert is not anchored to the paste point** - MINOR; replaceSelection acts on the selection at call time, after the await, so typing inside the write window splices the reference into the word being typed. The separate half of this defect, a disposed editor swallowing the text silently, is fixed
  - repro: paste an 8 MB screenshot and immediately type a caption
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:33:31Z @kj amended title "The late insert is not anchored to the paste point" -> "The late insert is not anchored to the paste point"; text "replaceSelection acts on the selection at call time, after the await, so typing during the write splices the reference into the word; a disposed editor swallows it silently through optional chaining" -> "replaceSelection acts on the selection at call time, after the await, so typing inside the write window splices the reference into the word being typed. The separate half of this defect, a disposed editor swallowing the text silently, is fixed"
  - log: 2026-09-20T18:33:31Z @kj disposed-editor half fixed: ITarget.insert returns false when the cell or editor widget is gone, and the caller reports through the tested failure channel naming the written file, so a paste can no longer be written to disk with no reference and no message
  - log: 2026-09-20T18:33:32Z @kj rejected: wontfix on an adjudicated ruling, reopen with one command if you disagree. Capturing a CodeMirror position at paste time and re-applying it after the await is a new mechanism with its own correctness surface: positions shift under edits, so an anchor taken before the user typed lands at the wrong offset, which is not clearly better than inserting at the current cursor. The window it would close is bounded by the 32 MB payload ceiling that landed since, and the severity is MINOR - the damage is visible and undoable by the user. No work is planned, so it does not belong in the open queue
- [x] `DEF-PASTE-18` **image/svg+xml yields an invalid extension** - MINOR; extensionFor returns the MIME subtype unchanged, so an empty-named svg File produces paste-...svg+xml, against the locked always-PNG decision
  - evidence: content.spec 'falls back to png rather than inventing an extension from the type' asserts image/svg+xml yields png, and 'carries the extension for each bitmap type it knows' holds webp; jest 75 green
  - repro: classify a File with type image/svg+xml and an empty name
  - test-tags: UNIT
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:12:13Z @kj closed: extensionFor reads a table of known bitmap types and falls back to png
- [x] `DEF-PASTE-30` **Terminal name is not shell-escaped** - MEDIUM; a pasted file whose name holds a space or a shell character reaches the prompt unescaped, so My Report.pdf arrives as two arguments
  - evidence: jest reference.spec 'inserts the path in a terminal, shell-escaped' asserts docs/Q3\ report.pdf; the shellEscape spec covers a quote, parentheses, $, ;, * and a character outside the basic plane; 90 jest green
  - repro: copy a file named My Report.pdf in the OS file manager, paste into a terminal, the shell reads two words
  - test-tags: UNIT
  - root-cause: 2026-09-24T23:35:47Z @kj referenceFor returns the bare file name for the terminal surface with no escaping
  - log: 2026-09-24T23:35:47Z @kj added
  - log: 2026-09-25T00:12:32Z @kj closed
- [x] `DEF-PASTE-31` **Terminal name does not resolve at the prompt** - MAJOR; with the shell outside the server root, a paste into a terminal writes into the file browser folder but inserts the bare file name, which the shell looks up in its own folder and does not find
  - evidence: pytest test_the_terminal_path_resolves_from_a_shell_outside_the_root asserts a relative path reaching the file from the shell folder; galata terminal test runs test -f on the inserted ../browser/paste-*.png in a real bash and prints FOUND-42; 5 E2E passed in 46.1s
  - related: DEF-PASTE-14 - the terminal folder work this fallback came from
  - repro: in a terminal run cd /tmp, paste a screenshot, run ls on the inserted name: No such file or directory
  - test-tags: UNIT, E2E
  - root-cause: 2026-09-24T23:35:51Z @kj _terminal_cwd refuses a shell folder outside the server root, so the route falls back to the folder the frontend named (the file browser), but referenceFor still inserts the bare file name, which is relative to a folder the shell is not in
  - log: 2026-09-24T23:35:51Z @kj added
  - log: 2026-09-25T00:12:35Z @kj closed
- [x] `DEF-PASTE-32` **Terminal path wrong in a nested shell** - MAJOR; after a nested shell (bash, sudo -s, nix-shell) and a cd inside it, a terminal paste gets a path relative to the folder of the terminal's first process, which the user has left, so the path does not resolve at the prompt
  - evidence: pytest test_the_terminal_path_follows_a_nested_shell nests bash in bash, cd into a folder at another depth, asserts the path resolves from there; it fails on the old lookup with 'the nested shell never reached the folder'; 24 pytest green
  - related: DEF-PASTE-31 - same path computation; found by the adversarial review round 1
  - repro: in a terminal run bash, then cd into a deeper folder, paste a screenshot, run ls on the inserted path: No such file or directory
  - test-tags: UNIT
  - root-cause: 2026-09-25T00:03:46Z @kj _terminal_cwd reads /proc/<pid>/cwd of the pty's first process; the process the user types into is the foreground process group, whose directory differs after a nested shell
  - log: 2026-09-25T00:03:46Z @kj added
  - log: 2026-09-25T00:12:32Z @kj closed

## Write Route `WRITE`

The server endpoint that writes a pasted payload to disk

- [x] `DEF-WRITE-8` **A dangling symlink lets a write escape the server root** - CRITICAL; _free_name tested with os.path.exists, which is blind to a dangling symlink, and open() then followed it; reproduced, the payload landed outside the root. The bar's first guarantee was false
  - evidence: pytest test_a_dangling_symlink_does_not_escape_the_root asserts the outside path is never created and the payload lands as paste-...-1.png inside the root; 15 pytest green
  - repro: put a dangling symlink in the root pointing outside it, paste a file under that name, look where the bytes landed
  - test-tags: UNIT, FUNCTIONAL
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: write creates with O_EXCL and O_NOFOLLOW, replacing the exists test
- [x] `DEF-WRITE-9` **A zero-length payload matches any empty file in the folder** - MINOR; dedup compared size then hash, and every empty file equals an empty payload, so the reference pointed at an unrelated file and nothing was written
  - evidence: pytest test_an_empty_payload_is_not_deduped asserts an empty paste beside an empty **init**.py writes notes.txt rather than referencing it; 15 pytest green
  - repro: paste an empty file into a folder holding an empty **init**.py
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:35Z @kj closed: zero-length payloads are never matched
- [x] `DEF-WRITE-10` **One unreadable neighbour makes every paste in the folder fail** - MINOR; the dedup scan opened every same-size candidate with no guard, so a file the server cannot read raised and the write returned 500
  - evidence: pytest test_an_unreadable_neighbour_does_not_fail_the_write asserts a chmod 000 same-size neighbour no longer fails the write; 15 pytest green
  - repro: chmod 000 a same-size file in the folder, then paste
  - test-tags: UNIT
  - log: 2026-09-20T18:04:12Z @kj added
  - log: 2026-09-20T18:04:36Z @kj closed: the dedup scan skips a candidate it cannot read
- [x] `DEF-WRITE-19` **The dedup scan blocks the event loop** - MINOR; the scan is synchronous inside the Tornado handler, so its cost is event-loop time; a multi-file paste re-scans what it has just written. The pathological folder size is now bounded, but the work still runs on the loop
  - evidence: routes.py post is async and awaits _store through IOLoop.run_in_executor; pytest test_concurrent_same_name_writes_do_not_overwrite fires two overlapping POSTs for the same name with different bytes and asserts a.png and a-1.png both exist with their own contents, so O_EXCL holds the never-overwrite guarantee now that requests can interleave; 18 pytest green
  - repro: paste 200 same-size files into one folder and watch the server stop answering
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:13:31Z @kj amended title "Dedup rescans and rehashes the folder on every write" -> "The dedup scan blocks the event loop"; text "the scan is synchronous inside the Tornado handler; measured 139 ms on a 20k-file folder and 10.49 s for 200 uniform 1 MB files pasted at once" -> "the scan is synchronous inside the Tornado handler, so its cost is event-loop time; a multi-file paste re-scans what it has just written. The pathological folder size is now bounded, but the work still runs on the loop"
  - log: 2026-09-20T18:13:31Z @kj folder size bounded: the scan gives up above MAX_DEDUP_ENTRIES=2000, which removes the 20k-folder and 200-file cases measured by the review; pytest test_the_dedup_scan_gives_up_on_a_large_folder covers it. Moving the scan off the event loop is a new mechanism and requires the O_EXCL write that already landed
  - log: 2026-09-20T18:28:06Z @kj closed: the scan and write moved off the event loop into an executor
- [x] `DEF-WRITE-20` **A server rooted at / refuses every write** - MINOR; the prefix test uses root + os.sep, which is // when root is /, so no path matches
  - evidence: pytest test_a_root_of_slash_admits_its_children asserts the old prefix test refused a child of / and commonpath admits it; the five traversal cases still refuse; 16 pytest green
  - repro: start Jupyter with --notebook-dir=/ and paste anything
  - test-tags: UNIT
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:12:13Z @kj closed: folder guard uses os.path.commonpath instead of a string prefix
- [x] `DEF-WRITE-29` **Unknown terminal name starts a shell** - MAJOR; a write naming a terminal that is not running makes the server start a new shell under that name; the shell is never culled, and GET /api/terminals then answers HTTP 500 for every client
  - evidence: pytest test_an_unknown_terminal_gets_the_absolute_path_and_starts_no_shell against a real jupyter_server_terminals manager: GET /api/terminals lists no new terminal and the absolute path comes back; on the old route the same test fails with HTTP 500 from the terminal list; 24 pytest green
  - related: DEF-PASTE-14 - _terminal_cwd was added by that fix
  - repro: POST /jupyterlab-advanced-paste-content-extension/write with terminal no-such-terminal, then GET /api/terminals lists no-such-terminal
  - test-tags: UNIT
  - root-cause: 2026-09-24T23:35:47Z @kj _terminal_cwd calls terminado NamedTermManager.get_terminal, which is get-or-create: an unknown name runs new_terminal() and registers it
  - log: 2026-09-24T23:35:47Z @kj added
  - log: 2026-09-24T23:40:51Z @kj reproduced on the old route by pytest test_an_unknown_terminal_gets_the_absolute_path_and_starts_no_shell: after the write, GET /api/terminals answers HTTP 500, because the shell get_terminal registers never gets the last_activity that create() sets, so get_terminal_model fails and the whole terminal list breaks
  - log: 2026-09-24T23:40:51Z @kj edited text "a write naming a terminal that is not running makes the server start a new shell under that name; the shell is never culled" -> "a write naming a terminal that is not running makes the server start a new shell under that name; the shell is never culled, and GET /api/terminals then answers HTTP 500 for every client"
  - log: 2026-09-25T00:12:32Z @kj closed
- [x] `DEF-WRITE-33` **Unwritable folder reports Unhandled error** - MINOR; a paste into a folder the server cannot write shows Could not write the pasted content: Unhandled error, and a folder removed after it was opened shows folder does not exist, neither naming the folder; nothing is written in either case
  - evidence: pytest test_an_unwritable_folder_is_named_in_the_error (chmod 500 folder) asserts the message carries locked and Permission denied; test_missing_folder_is_reported asserts the folder name on 404; both fail on the old route; 24 pytest green
  - repro: chmod 500 a folder, open it in the file browser or a notebook in it, paste a screenshot: the notification says Unhandled error
  - test-tags: UNIT
  - root-cause: 2026-09-25T00:03:46Z @kj WriteRouteHandler.post lets the OSError from _store escape, so jupyter_server answers 500 with the generic message Unhandled error; the 404 message carries no folder name
  - log: 2026-09-25T00:03:46Z @kj added
  - log: 2026-09-25T00:12:32Z @kj closed

## Test Suite `TEST`

The jest, pytest and galata suites and what they actually prove

- [x] `DEF-TEST-21` **Two galata assertions cannot fail** - MAJOR; one asserts the absence of markup on a cell the synthetic event cannot fill, so it passes on an empty cell; the other asserts toBeDefined on a boolean, which is true for false
  - evidence: the code-cell test asserts the plain-text flavour is present rather than markup absent, and the bitmap test asserts fileExists(exact name) is true rather than a prefix being defined; all 4 galata tests passed in 38.7s, so the assertions run and reach real state
  - repro: read ui-tests/tests/jupyterlab_advanced_paste_content_extension.spec.ts lines 68 and 86-89
  - test-tags: E2E
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:08:38Z @kj both assertions rewritten to assert positives: the code-cell test now asserts the plain-text flavour is present rather than that markup is absent, and the bitmap test reads the filename the extension chose out of the cell and asserts that exact file exists rather than asserting a prefix is defined. Two further cases added. NOT closed: the suite has still never been executed, so the fix is inspected, not proven
  - log: 2026-09-20T18:23:39Z @kj closed: both assertions rewritten to positives and the suite executed

## Build and Release `BUILD`

The Makefile, the GitHub workflows and the published artefacts

- [x] `DEF-BUILD-22` **A pull-request comment can run PR code with a write token** - MAJOR; update-integration-tests.yml triggers on issue_comment with contents: write, gates only on the comment body containing a phrase with no author_association check, and pins the checkout action to a mutable @main
  - evidence: update-integration-tests.yml now requires OWNER, MEMBER or COLLABORATOR on the comment and pins update-snapshots-checkout@v1; fixed before the repository exists, so the window was never open
  - repro: comment the trigger phrase on a pull request from a non-collaborator account
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:05:45Z @kj closed: author_association gate added and the checkout action pinned to @v1
- [x] `DEF-BUILD-23` **The sdist ships agent instructions and the defect register to PyPI** - MINOR; pyproject excludes only .github and binder, so .claude/CLAUDE.md, .claude/JOURNAL.md, docs/defects.md and junit.xml are selected; verified with hatchling's own SdistBuilder
  - evidence: pyproject exclude now carries .claude, docs, logs, junit.xml and graphify-out alongside .github and binder; junit.xml also added to .gitignore
  - repro: build an sdist and list its contents
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:05:45Z @kj closed: sdist exclude extended
- [x] `DEF-BUILD-24` **make install silently bumps the locked version** - MAJOR; install depends on build depends on increment_version, so a routine local install rewrites package.json and pyproject inherits it; no version can ever be rebuilt. Canonical Makefile, reaches every extension
  - evidence: make -n install contains zero version-rewrite commands; make test completed and left package.json at 1.0.0; the canonical copy at @utils/jupyterlab-extensions/Makefile is byte-identical at 1.41, so every extension inherits it and the sync rule will not revert it
  - repro: run make install twice and read the version in package.json
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:32:44Z @kj closed: increment_version moved off build onto publish, Makefile raised to 1.41 and promoted to canonical
- [x] `DEF-BUILD-25` **make publish runs no tests and no CI gate** - MAJOR; the publish chain never reaches the test target, and check_auth.py runs only in build.yml, so a route missing the authenticated decorator would publish. Canonical Makefile
  - evidence: make -n publish shows the chain; make test ran jest, pytest and .github/scripts/check_auth.py, which reported 'All endpoints of the extension require authentication'; exit 0. A handler missing the decorator now fails the release path instead of only the CI build
  - repro: read the publish prerequisite chain in the Makefile
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:32:44Z @kj closed: publish now depends on increment_version, test and install in that order, and test runs the auth gate
- [x] `DEF-BUILD-26` **make publish can leave npm and PyPI permanently out of step** - MAJOR; npm publish then twine upload with no guard between; npm consumes a version irreversibly, so a twine failure forks the two registries. The trailing git push also has no remote and aborts after both uploads. Canonical Makefile
  - evidence: make -n publish lists git commit, git push, npm publish, then twine upload with an || block naming the exact recovery command; a push failure on a repository with no remote now costs nothing because nothing has been published yet, and an npm-then-twine failure prints what to run rather than inviting a re-publish that would consume another npm version
  - repro: make twine fail after npm publish succeeds
  - test-tags: MANUAL
  - log: 2026-09-20T18:04:13Z @kj added
  - log: 2026-09-20T18:32:44Z @kj closed: the metadata commit and push happen before either registry is written, and twine carries a recovery guard
- [x] `DEF-BUILD-27` **The production build fails; only the test build ever ran** - CRITICAL; jlpm build:prod aborts in tsc with TS2307 on @jupyterlab/lsp, which arrives through @jupyterlab/notebook and @jupyterlab/fileeditor and resolves its types through an exports map that moduleResolution node cannot read. jest never compiles index.ts because nothing imports it, so a green suite said nothing about whether the package builds
  - evidence: make install exits 0; jupyter server extension list reports jupyterlab_advanced_paste_content_extension 1.0.2 enabled and OK, jupyter labextension list reports v1.0.2 enabled OK
  - repro: run make install on a clean tree and read the tsc output
  - test-tags: FUNCTIONAL
  - root-cause: 2026-09-20T18:16:12Z @kj tsconfig.json has no skipLibCheck, so tsc type-checks every reachable .d.ts in node_modules; the sibling jupyterlab_paste_content_as_markdown_extension carries the same dependency set and sets skipLibCheck true
  - log: 2026-09-20T18:16:12Z @kj added
  - log: 2026-09-20T18:17:31Z @kj closed: skipLibCheck enabled, matching the sibling extension with the same dependency set
- [x] `DEF-BUILD-28` **Check Links job fails on the downloads badge** - MEDIUM; the Check Links job of the Build workflow fails with 404 on https://pepy.tech/project/jupyterlab-advanced-paste-content-extension and https://static.pepy.tech/badge/jupyterlab-advanced-paste-content-extension; pepy serves download counts for a PyPI package, and this package has never been published, so both the badge image and its link are 404 until the first release
  - evidence: Build run 35566936067 on commit c1a3f05: the Check Links job returned success, and all jobs of that push are green - build, test_isolated, Integration tests, Check Links and Check Release. Verified independently by curl over every README URL: only the two pepy.tech URLs return 404, every other link returns 200
  - repro: push any commit to main; Build run 35566530469 job "Check Links" exits 1 with "2 failed, 12 deselected" and "RuntimeError: Encountered failures in 1 file(s)"
  - test-tags: E2E
  - root-cause: 2026-09-21T06:04:57Z @kj the badge template in ~/.claude/references/github-badges.md carries a pepy downloads badge whose URL only resolves after the first PyPI release; the same reference states the remedy, and both sibling extensions already carry it - ignore_links on the check-links action
  - log: 2026-09-21T06:04:57Z @kj added
  - log: 2026-09-21T06:29:38Z @kj closed
