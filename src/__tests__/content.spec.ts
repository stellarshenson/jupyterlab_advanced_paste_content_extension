import { classify } from '../content';

/**
 * Minimal stand-in for DataTransfer: jsdom does not construct one with files.
 */
function transfer(options: {
  files?: File[];
  html?: string;
  text?: string;
}): DataTransfer {
  const data: Record<string, string> = {};
  if (options.html !== undefined) {
    data['text/html'] = options.html;
  }
  if (options.text !== undefined) {
    data['text/plain'] = options.text;
  }
  return {
    files: options.files || [],
    getData: (type: string) => data[type] || ''
  } as unknown as DataTransfer;
}

function imageFile(name: string, type = 'image/png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe('classify', () => {
  it('reads a synthetic image name as a bitmap', () => {
    const result = classify(transfer({ files: [imageFile('image.png')] }));
    expect(result?.kind).toEqual('bitmap');
    expect(result?.kind === 'bitmap' && result.extension).toEqual('png');
  });

  it('normalises a jpeg bitmap extension to jpg', () => {
    const result = classify(
      transfer({ files: [imageFile('image.jpeg', 'image/jpeg')] })
    );
    expect(result?.kind === 'bitmap' && result.extension).toEqual('jpg');
  });

  it('falls back to png rather than inventing an extension from the type', () => {
    // image/svg+xml used to yield paste-....svg+xml.
    const svg = new File(['x'], '', { type: 'image/svg+xml' });
    const result = classify(transfer({ files: [svg] }));
    expect(result?.kind === 'bitmap' && result.extension).toEqual('png');
  });

  it('carries the extension for each bitmap type it knows', () => {
    const webp = new File(['x'], 'image.webp', { type: 'image/webp' });
    expect(
      (classify(transfer({ files: [webp] })) as { extension: string }).extension
    ).toEqual('webp');
  });

  it('reads a real filename as a file reference, not a bitmap', () => {
    const result = classify(transfer({ files: [imageFile('diagram.png')] }));
    expect(result?.kind).toEqual('file');
  });

  it('reads a non-image file as a file reference', () => {
    const file = new File(['x'], 'report.pdf', { type: 'application/pdf' });
    const result = classify(transfer({ files: [file] }));
    expect(result?.kind === 'file' && result.files[0].name).toEqual(
      'report.pdf'
    );
  });

  it('does not collapse a mixed list to a bitmap', () => {
    // A real file named image.png beside others used to discard the others.
    const files = [
      imageFile('image.png'),
      new File(['x'], 'report.pdf', { type: 'application/pdf' }),
      new File(['y'], 'data.csv', { type: 'text/csv' })
    ];
    const result = classify(transfer({ files }));
    expect(result?.kind).toEqual('file');
    expect(result?.kind === 'file' && result.files.map(f => f.name)).toEqual([
      'image.png',
      'report.pdf',
      'data.csv'
    ]);
  });

  it('still reads a lone synthetic image as a bitmap', () => {
    const result = classify(transfer({ files: [imageFile('image.png')] }));
    expect(result?.kind).toEqual('bitmap');
  });

  it('keeps every pasted file, not just the first', () => {
    const files = [
      new File(['a'], 'a.pdf', { type: 'application/pdf' }),
      new File(['b'], 'b.pdf', { type: 'application/pdf' }),
      new File(['c'], 'c.pdf', { type: 'application/pdf' })
    ];
    const result = classify(transfer({ files }));
    expect(result?.kind === 'file' && result.files.map(f => f.name)).toEqual([
      'a.pdf',
      'b.pdf',
      'c.pdf'
    ]);
  });

  it('prefers HTML over plain text when both are present', () => {
    const result = classify(transfer({ html: '<b>bold</b>', text: 'bold' }));
    expect(result?.kind).toEqual('html');
    expect(result?.kind === 'html' && result.text).toEqual('bold');
  });

  it('falls back to plain text when no HTML is offered', () => {
    const result = classify(transfer({ text: 'just text' }));
    expect(result?.kind).toEqual('text');
    expect(result?.kind === 'text' && result.text).toEqual('just text');
  });

  it('returns null for an empty clipboard', () => {
    expect(classify(transfer({}))).toBeNull();
  });
});
