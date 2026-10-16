<!-- @import /home/lab/.claude/CLAUDE.md -->
<!-- @import /home/lab/workspace/.claude/CLAUDE.md -->

# Project-Specific Configuration

This file is an overlay. It imports two layers and copies neither:

- **User layer** - `/home/lab/.claude/CLAUDE.md`, applies to every project on this machine
- **Workspace layer** - `/home/lab/workspace/.claude/CLAUDE.md`, applies to everything under `~/workspace`

Both layers apply in full. Rules below extend or strengthen them; where they overlap, the stricter
wording wins. Consult those files and the skills they name for standards not restated here.

## Mandatory Bans (Reinforced)

The following workspace rules are STRICTLY ENFORCED for this project:

- **No automatic git tags** - only create tags when user explicitly requests
- **No automatic version changes** - only modify version in package.json/pyproject.toml/etc. when user explicitly requests
- **No automatic publishing** - never run `make publish`, `npm publish`, `twine upload`, or similar without explicit user request
- **No manual package installs if Makefile exists** - use `make install` or equivalent Makefile targets, not direct `pip install`/`uv install`/`npm install`
- **No automatic git commits or pushes** - only when user explicitly requests

## Project Context

JupyterLab 4 extension, `kind: frontend-and-server`, scaffolded from the official copier template
`jupyterlab/extension-template` v4.6.5. It captures pasted content - text, a file, a graphics file,
a screenshot - writes it into the current folder, and hands the receiving surface a reference:
a `.txt`, `.md` or `.py` file, or a terminal. Content type selects the handler.

**Architecture**:

- **Frontend** (TypeScript) - a document-level capture-phase paste listener in `src/index.ts`.
  `content.ts` classifies the clipboard, `surface.ts` names the receiving surface, `decide.ts` is the
  behaviour matrix as one function, `reference.ts` builds the inserted text, `naming.ts` the
  timestamp filename, `markdown.ts` the turndown conversion, `failure.ts` the error notification,
  `request.ts` the server call
- **Server** (Python, `jupyterlab_advanced_paste_content_extension/routes.py`) - one route,
  `POST /jupyterlab-advanced-paste-content-extension/write`: base64 payload in, hash dedup, creation
  with `O_EXCL` and `O_NOFOLLOW`, refusal of any folder outside the server root
- **Tests** - jest (`src/__tests__/`), pytest (`jupyterlab_advanced_paste_content_extension/tests/`),
  Playwright galata (`ui-tests/`)
- **CI/CD** - GitHub Actions plus jupyter-releaser under `.github/workflows/`

## Build Lifecycle - Makefile Only

The Makefile owns the whole lifecycle. Never run `pip`, `jlpm`, `yarn`, `npm`, `python -m build`,
`twine`, or any build, publish or clean command directly - those bypass the project-local
`.nodeenv/` toolchain the Makefile pins.

| Target          | Effect                                                       |
| --------------- | ------------------------------------------------------------ |
| `make install`  | build and install the extension                              |
| `make publish`  | release to npm and PyPI - needs explicit approval every time |
| `make clean`    | remove build artefacts                                       |
| `make mrproper` | remove all build and virtual-environment artefacts           |
| `make test`     | jest plus pytest                                             |

**Measured traps in the canonical Makefile**:

- `make install` depends on `build`, which depends on `increment_version`, so a routine local install
  rewrites the patch version in `package.json`
- `make build` runs `clean`, and `clean` runs `uninstall`, so a build removes the extension from the
  live `/opt/conda` environment; `make test` then fails in its auth gate with
  `ExtensionModuleNotFound`
- `make upgrade` is a no-op: it runs `jlpm up` with no package names, which upgrades nothing, and
  then prints an audit report
- jest never compiles `src/index.ts`, because nothing imports it, so the suite can be green over a
  package that cannot be built at all

**Makefile version check**: the local Makefile declares its version on line 1. Compare it against
`/home/lab/workspace/private/jupyterlab/@utils/jupyterlab-extensions/Makefile` and copy the canonical
file over the local one as soon as the canonical version is higher. Check at the start of any build
work. Local version at project creation: 1.40; 1.46 as of 2026-10-16.

## Git Rules (Project-Specific)

- **`package.json` and `yarn.lock` are committed together, always** - a lockfile left behind makes
  CI fail with YN0028 on an immutable install. The rule was written naming `package-lock.json`,
  which this project never produces and CI never reads: it is `jlpm`/Yarn Berry, so `yarn.lock` is
  the lockfile the failure is about
- The repository was initialised with `git init -b main` and an initial import of every artefact

## Journal Rules (Project-Specific)

- **APPEND ONLY**: New journal entries MUST be appended at the end of the file, never inserted between existing entries
- Entries maintain strict chronological order by position - the last entry in the file is always the most recent work
- Never reorder, move, or insert entries out of sequence
- The Stellars **journal plugin** is the canonical tool for this file: create via `/journal:create`, append via `/journal:update`, archive via `/journal:archive`. The `journal:journal` skill auto-triggers on any mention of "journal" and runs `journal-tools check` after every write
- Direct edits to `JOURNAL.md` are a last resort - prefer the plugin so modus secundis format, continuous numbering and append-only order are enforced automatically

## Acceptance Criteria and Defects

- **Every feature carries acceptance criteria** - write and maintain them through the
  `project-management` plugin into `docs/acc-crit.md`, one consolidated document with a category per
  feature area. No feature is done until its criteria are closed
- **Every defect is tracked** - file, triage and close through the same plugin into
  `docs/defects.md`, with the mandatory CRITICAL/MAJOR/MEDIUM/MINOR severity and a repro line
- **Close only on evidence** - `close --evidence` takes the test that ran and what it showed, never
  a plan. A criterion whose assertion no executed test reaches stays open and says why
- Both documents are written only through `pm-tools`, never by hand - ids, author handles and the
  append-only log trail are the CLI's invariants
- Status and coverage come from `/project-management:report`

## Required Workspace Skills

| Skill                  | Use                                                                    |
| ---------------------- | ---------------------------------------------------------------------- |
| `jupyterlab-extension` | extension development guidelines, CI/CD, jupyter-releaser, caveats     |
| `playwright`           | browser automation for screenshots and UI verification                 |
| `devils-advocate`      | adversarial review before a risky commit; a panel needs an adjudicator |

## Strengthened Rules

- **ASCII arrows in this repo** - use `->` in README and other GitHub-rendered markdown, not the
  Unicode arrow the global style prefers, so the text stays renderer-safe
- **No screenshot claim without a render** - a statement about the extension's visible behaviour
  needs a real browser session behind it

## Running the galata suite locally

The Makefile has no E2E target, so this is the one lifecycle step outside it.

- `jlpm install` in `ui-tests/`, then `jlpm playwright install chromium`
- `ui-tests/playwright.config.js` hardcodes port 8888, which this workstation's own JupyterLab
  holds. Run with a throwaway config on another port rather than pointing the suite at a live lab -
  the tests create notebooks and write files into whatever workspace they reach
- Kill the test server afterwards; a stale one holds the port and the next run fails to start. `ss`
  can report the port free while the server still answers; find it with
  `ps -eo pid,cmd | grep jupyter_server_test_config` and kill that pid
- The throwaway config is `ui-tests/playwright.local.config.js` (port 8899, gitignored); run with
  `jlpm playwright test --config playwright.local.config.js`
- A container restart returns `/opt/conda` and `/galaxalab` to the image. Run `make install` before
  the suite, or it tests the image's older build of this extension. Install the browser with
  `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright-ui-tests` and pass the same variable to the
  test run: `/galaxalab/ms-playwright` is reset, and `~/.cache/ms-playwright/.links` is owned by root
- The spec overrides galata's `waitForApplication`. The default waits for the Launcher tab, and this
  lab opens a Welcome tab at start, so every test timed out in setup
- Build the notebook through `page.contents.uploadContent` and open it with `notebook.openByPath`.
  Galata's `notebook.createNew` drives the File menu and then blocks on a kernel dialog, which does
  not appear on a lab carrying other extensions - `nb_venv_kernels` alone swaps the kernel spec
  manager
