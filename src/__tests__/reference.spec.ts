import { referenceFor, shellEscape } from '../reference';

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

  it('inserts the bare filename in a text file', () => {
    expect(referenceFor('text-file', NAME, 'image')).toEqual(NAME);
    expect(referenceFor('text-file', 'Q3 report.pdf', 'file')).toEqual(
      'Q3 report.pdf'
    );
  });

  it('inserts the path in a terminal, shell-escaped', () => {
    expect(referenceFor('terminal', `../shots/${NAME}`, 'image')).toEqual(
      `../shots/${NAME}`
    );
    expect(referenceFor('terminal', 'docs/Q3 report.pdf', 'file')).toEqual(
      'docs/Q3\\ report.pdf'
    );
  });
});

describe('shellEscape', () => {
  it('leaves a path of safe characters unchanged', () => {
    expect(shellEscape('/home/me/data_v1.2/a-b+c@d%e:f,g=h.csv')).toEqual(
      '/home/me/data_v1.2/a-b+c@d%e:f,g=h.csv'
    );
  });

  it('backslash-escapes every character the shell would read', () => {
    expect(shellEscape(`it's (1) $HOME;*.png`)).toEqual(
      "it\\'s\\ \\(1\\)\\ \\$HOME\\;\\*.png"
    );
  });

  it('keeps a character outside the basic plane whole', () => {
    // Without the u flag each half of the surrogate pair got its own backslash.
    expect(shellEscape('a\u{1F600}.png')).toEqual('a\\\u{1F600}.png');
  });
});
