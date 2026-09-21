import { referenceFor } from '../reference';

const NAME = 'paste-20260920-191530.png';

describe('referenceFor', () => {
  it('inserts an image link on the two markdown surfaces', () => {
    expect(referenceFor('markdown-file', NAME, 'image')).toEqual(
      `![](<${NAME}>)`
    );
    expect(referenceFor('markdown-cell', NAME, 'image')).toEqual(
      `![](<${NAME}>)`
    );
  });

  it('inserts an ordinary link for a non-image file on markdown surfaces', () => {
    expect(referenceFor('markdown-file', 'report.pdf', 'file')).toEqual(
      '[report.pdf](<report.pdf>)'
    );
  });

  it('wraps the destination so a name with a space still renders', () => {
    // Without the angle brackets marked renders this as literal text.
    expect(referenceFor('markdown-cell', 'Q3 report.png', 'image')).toEqual(
      '![](<Q3 report.png>)'
    );
    expect(referenceFor('markdown-file', 'invoice (1).pdf', 'file')).toEqual(
      '[invoice (1).pdf](<invoice (1).pdf>)'
    );
  });

  it('quotes the filename in a code cell so it drops into a call', () => {
    expect(referenceFor('code-cell', NAME, 'image')).toEqual(`"${NAME}"`);
    expect(referenceFor('code-cell', 'data.csv', 'file')).toEqual('"data.csv"');
  });

  it('escapes a quote in a code cell rather than breaking the string', () => {
    expect(referenceFor('code-cell', 'say "hi".txt', 'file')).toEqual(
      '"say \\"hi\\".txt"'
    );
  });

  it('inserts the bare filename in a text file and a terminal', () => {
    expect(referenceFor('text-file', NAME, 'image')).toEqual(NAME);
    expect(referenceFor('terminal', NAME, 'image')).toEqual(NAME);
    expect(referenceFor('terminal', 'data.csv', 'file')).toEqual('data.csv');
  });
});
