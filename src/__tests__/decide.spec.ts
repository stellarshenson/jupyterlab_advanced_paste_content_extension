import { PasteContent } from '../content';
import { decide, separatorFor } from '../decide';
import { Surface } from '../surface';

const SURFACES: Surface[] = [
  'markdown-file',
  'text-file',
  'markdown-cell',
  'code-cell',
  'terminal'
];

const MARKDOWN_SURFACES: Surface[] = ['markdown-file', 'markdown-cell'];
const TEXT_SURFACES: Surface[] = ['text-file', 'code-cell', 'terminal'];

const bitmap: PasteContent = {
  kind: 'bitmap',
  file: new File(['x'], 'image.png', { type: 'image/png' }),
  extension: 'png'
};
const files: PasteContent = {
  kind: 'file',
  files: [new File(['x'], 'report.pdf', { type: 'application/pdf' })]
};
const html: PasteContent = { kind: 'html', html: '<h2>T</h2>', text: 'T' };
const text: PasteContent = { kind: 'text', text: 'plain' };

describe('decide - the behaviour matrix', () => {
  it.each(SURFACES)('writes a bitmap on %s', surface => {
    expect(decide(bitmap, surface)).toMatchObject({
      kind: 'write-bitmap',
      extension: 'png'
    });
  });

  it.each(SURFACES)('writes pasted files on %s', surface => {
    expect(decide(files, surface)).toMatchObject({ kind: 'write-files' });
  });

  it.each(MARKDOWN_SURFACES)('converts HTML to markdown on %s', surface => {
    expect(decide(html, surface)).toEqual({
      kind: 'insert-markdown',
      html: '<h2>T</h2>',
      text: 'T'
    });
  });

  it.each(TEXT_SURFACES)('leaves HTML to the browser on %s', surface => {
    expect(decide(html, surface)).toEqual({ kind: 'none' });
  });

  it.each(SURFACES)('never intercepts plain text on %s', surface => {
    expect(decide(text, surface)).toEqual({ kind: 'none' });
  });
});

describe('separatorFor', () => {
  it.each(MARKDOWN_SURFACES)(
    'puts a blank line between references on %s',
    s => {
      // A single newline renders as one run-together paragraph.
      expect(separatorFor(s)).toEqual('\n\n');
    }
  );

  it.each(TEXT_SURFACES)('separates references with a space on %s', s => {
    expect(separatorFor(s)).toEqual(' ');
  });
});
