import { PasteContent } from './content';
import { Surface, rendersMarkdown } from './surface';

/**
 * What a paste resolves to. `none` means the browser's own paste is left alone,
 * which already produces the specified result for text-shaped content on a
 * surface that does not render markdown.
 */
export type Action =
  | { kind: 'write-bitmap'; file: File; extension: string }
  | { kind: 'write-files'; files: File[] }
  | { kind: 'insert-markdown'; html: string; text: string }
  | { kind: 'none' };

/**
 * The behaviour matrix in docs/design-content-types.md, as one function.
 *
 * Binary content always becomes a file, on every surface. Rich HTML is
 * converted only where the surface renders markdown. Plain text is never
 * intercepted.
 */
export function decide(content: PasteContent, surface: Surface): Action {
  switch (content.kind) {
    case 'bitmap':
      return {
        kind: 'write-bitmap',
        file: content.file,
        extension: content.extension
      };
    case 'file':
      return { kind: 'write-files', files: content.files };
    case 'html':
      return rendersMarkdown(surface)
        ? { kind: 'insert-markdown', html: content.html, text: content.text }
        : { kind: 'none' };
    case 'text':
      return { kind: 'none' };
  }
}

/**
 * How several references are joined at the paste point: a blank line between
 * them where the surface renders markdown, space separated elsewhere, because a
 * newline in a terminal would run the line.
 *
 * A single newline is not enough: markdown joins those into one paragraph, so
 * the references render run together on one line.
 */
export function separatorFor(surface: Surface): string {
  return rendersMarkdown(surface) ? '\n\n' : ' ';
}
