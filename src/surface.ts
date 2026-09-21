/**
 * The surfaces that can receive a paste, and the one property that decides how
 * text-shaped content is converted.
 *
 * See docs/design-content-types.md for the full behaviour matrix.
 */
export type Surface =
  'markdown-file' | 'text-file' | 'markdown-cell' | 'code-cell' | 'terminal';

/**
 * Whether a surface renders markdown. This is the only knob that decides
 * conversion: two surfaces do, three do not.
 */
export function rendersMarkdown(surface: Surface): boolean {
  return surface === 'markdown-file' || surface === 'markdown-cell';
}

/**
 * Map a file path to the editor surface it opens as.
 *
 * Only `.md` counts as a markdown file; everything else opened in the plain
 * editor is treated as text.
 */
export function surfaceForPath(path: string): Surface {
  return /\.md$/i.test(path) ? 'markdown-file' : 'text-file';
}

/**
 * Map a notebook cell type to its surface.
 */
export function surfaceForCellType(cellType: string): Surface {
  return cellType === 'markdown' ? 'markdown-cell' : 'code-cell';
}
