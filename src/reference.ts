import { Surface, rendersMarkdown } from './surface';

/**
 * What a written file is referenced as. An image gets an image link on a
 * markdown surface; any other file gets an ordinary link.
 */
export type ReferenceKind = 'image' | 'file';

/**
 * Escape a path for use as a bare shell argument: every character outside a
 * safe set gets a backslash, the same form the drag-and-drop path extension
 * inserts.
 *
 * The `u` flag is load-bearing: without it the pattern matches UTF-16 code
 * units, so a character outside the basic plane - an emoji in a filename - is
 * split and a backslash lands between the halves of its surrogate pair.
 */
export function shellEscape(path: string): string {
  return path.replace(/[^A-Za-z0-9_./@%+:,=-]/gu, '\\$&');
}

/**
 * Build the text inserted at the paste point for a file that was written.
 *
 * `path` is the file name, which resolves beside the document; on a terminal it
 * is the path the server computed from the shell's working directory.
 *
 * - markdown surfaces: `![](<name>)` for an image, `[name](<name>)` otherwise
 * - code cell: the name as a JSON string, so it drops into `plt.imread()`
 * - text file: the bare name
 * - terminal: the path, shell-escaped, so a name with a space is one argument
 *
 * The markdown destination is always wrapped in angle brackets: a name carrying
 * a space or a parenthesis renders as literal text without them, and the
 * wrapped form renders identically for names that do not. The code-cell form is
 * built by JSON.stringify so a name carrying a quote stays valid Python.
 *
 * See docs/design-content-types.md.
 */
export function referenceFor(
  surface: Surface,
  path: string,
  kind: ReferenceKind
): string {
  if (rendersMarkdown(surface)) {
    return kind === 'image' ? `![](<${path}>)` : `[${path}](<${path}>)`;
  }
  if (surface === 'code-cell') {
    return JSON.stringify(path);
  }
  if (surface === 'terminal') {
    return shellEscape(path);
  }
  return path;
}
