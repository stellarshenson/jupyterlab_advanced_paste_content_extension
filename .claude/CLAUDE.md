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

- **Frontend** (TypeScript, `src/index.ts`) - the `jupyterlab_advanced_paste_content_extension:plugin`
  plugin, currently the template's activation stub; `src/request.ts` calls the server under the
  `jupyterlab-advanced-paste-content-extension` API namespace
- **Server** (Python, `jupyterlab_advanced_paste_content_extension/routes.py`) - `setup_route_handlers`
  registers the handlers; currently the template's `/hello` stub
- **Tests** - jest (`src/__tests__/`), pytest (`jupyterlab_advanced_paste_content_extension/tests/`),
  Playwright galata (`ui-tests/`)
- **CI/CD** - GitHub Actions plus jupyter-releaser under `.github/workflows/`

## Build Lifecycle - Makefile Only

The Makefile owns the whole lifecycle. Never run `pip`, `jlpm`, `yarn`, `npm`, `python -m build`,
`twine`, or any build, publish or clean command directly - those bypass the project-local
`.nodeenv/` toolchain the Makefile pins.

| Target | Effect |
|---|---|
| `make install` | build and install the extension |
| `make publish` | release to npm and PyPI - needs explicit approval every time |
| `make clean` | remove build artefacts |
| `make mrproper` | remove all build and virtual-environment artefacts |
| `make test` | jest plus pytest |

**Makefile version check**: the local Makefile declares its version on line 1. Compare it against
`/home/lab/workspace/private/jupyterlab/@utils/jupyterlab-extensions/Makefile` and copy the canonical
file over the local one as soon as the canonical version is higher. Check at the start of any build
work. Local version at project creation: 1.40, identical to canonical.

## Git Rules (Project-Specific)

- **`package.json` and `package-lock.json` are committed together, always** - a lockfile left behind
  makes CI fail with YN0028 on an immutable install
- The repository was initialised with `git init -b main` and an initial import of every artefact

## Journal Rules (Project-Specific)

- **APPEND ONLY**: New journal entries MUST be appended at the end of the file, never inserted between existing entries
- Entries maintain strict chronological order by position - the last entry in the file is always the most recent work
- Never reorder, move, or insert entries out of sequence
- The Stellars **journal plugin** is the canonical tool for this file: create via `/journal:create`, append via `/journal:update`, archive via `/journal:archive`. The `journal:journal` skill auto-triggers on any mention of "journal" and runs `journal-tools check` after every write
- Direct edits to `JOURNAL.md` are a last resort - prefer the plugin so modus secundis format, continuous numbering and append-only order are enforced automatically

## Acceptance Criteria and Defects

- **Every feature carries acceptance criteria** - write and maintain them through the
  `/project-management:acc-crit` command into `docs/acc-crit-*.md`, one document per feature area.
  No feature is done until its criteria are closed
- **Every defect is tracked** - file, triage and close through `/project-management:defect` into
  `docs/defects.md`, with the mandatory CRITICAL/MAJOR/MEDIUM/MINOR severity and a repro line
- Both documents are written only through `pm-tools`, never by hand - ids, author handles and the
  append-only log trail are the CLI's invariants
- Status and coverage come from `/project-management:report`

## Required Workspace Skills

| Skill | Use |
|---|---|
| `jupyterlab-extension` | extension development guidelines, CI/CD, jupyter-releaser, caveats |
| `playwright` | browser automation for screenshots and UI verification |

## Strengthened Rules

- **ASCII arrows in this repo** - use `->` in README and other GitHub-rendered markdown, not the
  Unicode arrow the global style prefers, so the text stays renderer-safe
- **No screenshot claim without a render** - a statement about the extension's visible behaviour
  needs a real browser session behind it
