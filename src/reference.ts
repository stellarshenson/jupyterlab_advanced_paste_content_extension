import { Surface, rendersMarkdown } from './surface';

/**
 * What a written file is referenced as. An image gets an image link on a
 * markdown surface; any other file gets an ordinary link.
 */
export type ReferenceKind = 'image' | 'file';

/**
 * Build the text inserted at the paste point for a file that was written.
 *
 * - markdown surfaces: `![](<name>)` for an image, `[name](<name>)` otherwise
 * - code cell: the name as a JSON string, so it drops into `plt.imread()`
 * - text file and terminal: the bare name
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
  filename: string,
  kind: ReferenceKind
): string {
  if (rendersMarkdown(surface)) {
    return kind === 'image'
      ? `![](<${filename}>)`
      : `[${filename}](<${filename}>)`;
  }
  if (surface === 'code-cell') {
    return JSON.stringify(filename);
  }
  return filename;
}
