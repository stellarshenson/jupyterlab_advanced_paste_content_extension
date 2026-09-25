# Content Types and Receiving Surfaces

What the extension does with a paste is decided by two things: what the clipboard holds, and what received the paste. Text-shaped content is converted, binary content always becomes a file, and only the inserted reference varies by surface.

## Content types

The clipboard carries several representations of one copy. The handler is picked from the richest flavour present, in this order.

- **Rich HTML** - `text/html` is present; produced by a web page, Word, Outlook, Google Docs, Confluence, Notion
- **Plain text** - `text/plain` only
- **Bitmap** - a `DataTransfer` item with `kind: "file"` and an `image/*` type, carrying pixels and no source file; a screenshot or a copied image region
- **File reference** - `DataTransfer.files` holds a real file copied from a file manager, with its own name

## Receiving surfaces

- **Markdown file** - a `.md` file open in the editor
- **Text file** - a `.txt` file open in the editor
- **Markdown cell** - a notebook cell in markdown mode
- **Code cell** - a notebook cell in code mode
- **Terminal** - a terminal session

## Behaviour matrix

Columns are the receiving surface. The first row is the knob that decides conversion: whether the surface renders markdown. Two rows per content type answer the only two questions a reader has - what lands on disk, and what is inserted where the cursor was.

|                      | Markdown file | Text file  | Markdown cell |    Code cell    |  Terminal  |
| -------------------- | :-----------: | :--------: | :-----------: | :-------------: | :--------: |
| **renders markdown** |      yes      |     no     |      yes      |       no        |     no     |
| **RICH HTML**        |               |            |               |                 |            |
| written to disk      |    nothing    |  nothing   |    nothing    |     nothing     |  nothing   |
| inserted             |   markdown    | plain text |   markdown    |   plain text    | plain text |
| **PLAIN TEXT**       |               |            |               |                 |            |
| written to disk      |    nothing    |  nothing   |    nothing    |     nothing     |  nothing   |
| inserted             |     text      |    text    |     text      |      text       |    text    |
| **BITMAP**           |               |            |               |                 |            |
| written to disk      |      PNG      |    PNG     |      PNG      |       PNG       |    PNG     |
| inserted             |  image link   |  filename  |  image link   | quoted filename | shell path |
| **FILE REFERENCE**   |               |            |               |                 |            |
| written to disk      |     copy      |    copy    |     copy      |      copy       |    copy    |
| inserted             |     link      |  filename  |     link      | quoted filename | shell path |

Inserted forms, for a written file named `paste-20260920-191530.png`:

- **image link** - `![](<paste-20260920-191530.png>)`
- **link** - `[report.pdf](<report.pdf>)`
- **quoted filename** - `"paste-20260920-191530.png"`, so it drops straight into `plt.imread()` or `Image()`
- **filename** - `paste-20260920-191530.png`, bare
- **shell path** - the path from the shell's working directory to the file, backslash-escaped for the shell: `../shots/paste-20260920-191530.png`, or `docs/Q3\ report.pdf` for a name with a space

The markdown destination is always wrapped in angle brackets. Without them a name carrying a space or a parenthesis renders as literal text rather than a link, and names from a file manager routinely carry both; the wrapped form renders identically for names that do not. The code-cell form is built by `JSON.stringify`, so a name carrying a quote stays a valid string. A pasted file whose type is an image gets the image link, not the ordinary link.

## What holds in every column

These do not vary by surface and are not repeated in the grid.

- **Binary always becomes a file** - a bitmap or a file reference is written to disk on every surface, including the three that take plain text
- **Text never becomes a file** - rich HTML and plain text are inserted at the cursor, never written out
- **Destination is the current folder** - the folder holding the document that received the paste, so the relative link is the bare filename. On a terminal there is no document, so the destination is the folder the file browser shows. The frontend also names the terminal; the server reads the shell's working directory from its process and answers the path from there to the file, the same form the drag-and-drop path extension inserts, so the path resolves at the prompt wherever the shell has `cd`'d to. The AI assistant panels open Claude Code, Codex, Kimi and Gemini as terminals of this kind, so a paste into them behaves the same
- **Bitmaps are written as PNG** - screenshots are flat colour and text, which JPEG damages; the browser normalises a raw DIB to PNG when the item is read, so no conversion step is needed
- **Bitmap names are timestamps** - `paste-YYYYMMDD-HHMMSS.png`; a bitmap has no source name, and a timestamp never collides, so no overwrite case exists
- **File references keep their own name** - the name is real information and is preserved
- **Every pasted file is written** - a paste carrying several files writes all of them; the references are separated by a blank line where the surface renders markdown and by a space elsewhere, because a newline in a terminal would run the line. A single newline is not enough - markdown joins those into one paragraph
- **A clipboard bitmap is always a single item** - that is how it is told apart from a real file named `image.png`; a paste carrying several files is never read as a bitmap
- **Identical content is not written twice** - the payload is hashed before writing; a byte-identical file already in the folder is referenced instead. The scan gives up in a folder holding more than 2000 entries, where it would cost more than the duplicate it saves
- **A taken name never overwrites** - dedup already absorbed the identical case, so a surviving clash means different bytes; the payload is written as `<stem>-1.<ext>`, then `-2`
- **Payloads over 32 MB are refused** - measured, 200 MB is a fatal out-of-memory in the browser's own conversion; the paste is left to the browser and the reason is shown
- **Writes cannot escape the server root** - the frontend names the folder, so the server resolves it and refuses anything outside `contents_manager.root_dir`, and refuses a filename carrying a path separator. The file is created with `O_EXCL` and `O_NOFOLLOW`, so the name test and the create are one operation and a symlink sitting at the name is refused rather than followed

## Cases the grid does not cover

- **Word and Outlook images** - the HTML references them as `file:///` paths in a local temp folder, readable by neither the browser nor the server. Recovery depends on whether the browser exposes the `text/rtf` flavour, which embeds the bytes as hex. Undecided pending measurement
- **Web images inside rich HTML** - `http(s)` sources are fetchable and can be written to disk with the links rewritten. Not yet specified
- **Console prompt, settings editor** - not covered surfaces; the paste is left to JupyterLab
- **Relative terminal path needs `/proc`** - the server reads the shell's working directory from `/proc/<pid>/cwd`; on a platform without `/proc`, or when the shell's working directory cannot be read, the terminal receives the absolute path, which resolves from any folder
- **Word list structure** - Word writes lists as ordinary paragraphs with the bullet as literal text and no `<ul>` anywhere, and this converter does not rebuild them. Bold carried as CSS on a `<span>` is rebuilt
- **Images the document cannot load** - an `<img>` whose source is not `http(s)`, which covers a `data:` blob and Word's `file:///` temp paths, keeps its alt text and loses the source rather than inlining a blob or emitting a dead link

## Relationship to jupyterlab_paste_content_as_markdown_extension

The HTML to markdown conversion in the matrix above already exists in `jupyterlab_paste_content_as_markdown_extension`, which runs Turndown with the GFM plugins and rebuilds Word's CSS-only bold and paragraph-based lists. That extension is frontend-only and therefore drops every image it cannot resolve.

Writing those images to disk is what this extension adds and what the server side exists for. Whether the two extensions merge or layer is undecided.
