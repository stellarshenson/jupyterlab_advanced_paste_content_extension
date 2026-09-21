/**
 * Classification of what the clipboard holds.
 *
 * The richest available flavour wins, in the order bitmap, file, HTML, text.
 * See docs/design-content-types.md.
 */
export type PasteContent =
  | { kind: 'bitmap'; file: File; extension: string }
  | { kind: 'file'; files: File[] }
  | { kind: 'html'; html: string; text: string }
  | { kind: 'text'; text: string };

/**
 * Names the browser invents for a clipboard bitmap that has no source file.
 * Chrome uses `image.png`; a region copied out of an image editor arrives the
 * same way. A file copied from a file manager carries its real name instead,
 * and that is the only signal separating the two cases.
 */
const SYNTHETIC_NAME = /^image\.(png|jpe?g|gif|webp|bmp)$/i;

/**
 * The bitmap types a clipboard actually carries, and the extension each is
 * written under. Anything else falls back to png rather than inventing an
 * extension from the MIME subtype: image/svg+xml used to yield `.svg+xml`.
 */
const BITMAP_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp'
};

function extensionFor(type: string): string {
  return BITMAP_EXTENSIONS[type.toLowerCase()] || 'png';
}

/**
 * Decide which handler a paste belongs to, or null when the clipboard holds
 * nothing this extension acts on.
 */
export function classify(data: DataTransfer): PasteContent | null {
  const files = Array.from(data.files || []);
  const image = files.find(file => file.type.startsWith('image/'));

  // A clipboard bitmap is always the only item. Requiring that keeps a real
  // file named image.png, pasted alongside others, from collapsing the whole
  // list to one payload and discarding the rest.
  if (
    files.length === 1 &&
    image &&
    (SYNTHETIC_NAME.test(image.name) || image.name === '')
  ) {
    return { kind: 'bitmap', file: image, extension: extensionFor(image.type) };
  }
  if (files.length > 0) {
    return { kind: 'file', files };
  }

  const html = data.getData('text/html');
  const text = data.getData('text/plain');
  if (html) {
    return { kind: 'html', html, text };
  }
  if (text) {
    return { kind: 'text', text };
  }
  return null;
}
