import { htmlToMarkdown } from '../markdown';

describe('htmlToMarkdown', () => {
  it('converts a heading to ATX', () => {
    expect(htmlToMarkdown('<h2>Title</h2>', '')).toEqual('## Title');
  });

  it('converts a list to hyphen markers', () => {
    const markdown = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>', '');
    expect(markdown).toEqual('-   one\n-   two');
  });

  it('keeps bold and italic', () => {
    expect(htmlToMarkdown('<p><b>bold</b> and <i>italic</i></p>', '')).toEqual(
      '**bold** and _italic_'
    );
  });

  it('converts a table through the gfm plugin', () => {
    const markdown = htmlToMarkdown(
      '<table><tr><th>a</th><th>b</th></tr><tr><td>1</td><td>2</td></tr></table>',
      ''
    );
    expect(markdown).toContain('| a | b |');
    expect(markdown).toContain('| 1 | 2 |');
  });

  it('drops stylesheets rather than pasting them as text', () => {
    const markdown = htmlToMarkdown(
      '<style>p { color: red }</style><p>text</p>',
      ''
    );
    expect(markdown).toEqual('text');
  });

  it('drops a data: image rather than inlining the blob', () => {
    const blob = 'data:image/png;base64,' + 'A'.repeat(200);
    const markdown = htmlToMarkdown(
      `<p>before</p><img alt="chart" src="${blob}"><p>after</p>`,
      ''
    );
    expect(markdown).not.toContain('base64');
    expect(markdown).toContain('chart');
    expect(markdown).toContain('before');
    expect(markdown).toContain('after');
  });

  it('drops a file:/// image, which resolves on no other machine', () => {
    const markdown = htmlToMarkdown(
      '<p>x</p><img src="file:///C:/Users/a/Temp/clip_image001.png">',
      ''
    );
    expect(markdown).not.toContain('file:///');
  });

  it('keeps an http image, which the document can load', () => {
    const markdown = htmlToMarkdown(
      '<img alt="logo" src="https://example.com/logo.png">',
      ''
    );
    expect(markdown).toContain('https://example.com/logo.png');
  });

  it('rebuilds bold carried as CSS on a span, as Word and Docs emit it', () => {
    const markdown = htmlToMarkdown(
      '<p><span style="font-weight:700">bold run</span> normal</p>',
      ''
    );
    expect(markdown).toContain('**bold run**');
  });

  it('accepts the bold keyword as well as a numeric weight', () => {
    expect(
      htmlToMarkdown('<span style="font-weight: bold">x</span>', '')
    ).toContain('**x**');
  });

  it('does not emit stray asterisks for the Google Docs wrapper', () => {
    // <b style="font-weight:normal"> wraps the whole fragment.
    const markdown = htmlToMarkdown(
      '<b style="font-weight:normal" id="docs-internal-guid-1"><p>text</p></b>',
      ''
    );
    expect(markdown).toEqual('text');
  });

  it('rebuilds a Word list, which arrives as paragraphs with a literal bullet', () => {
    const word =
      "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'>" +
      "<span style='mso-list:Ignore'>\u00b7</span>First item</p>" +
      "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'>" +
      "<span style='mso-list:Ignore'>\u00b7</span>Second item</p>";
    const markdown = htmlToMarkdown(word, '');
    expect(markdown).toContain('-   First item');
    expect(markdown).toContain('-   Second item');
    expect(markdown).not.toContain('\u00b7');
  });

  it('indents a nested Word list item by its level', () => {
    // A level-2 item always follows a level-1 parent; on its own the leading
    // indent is trimmed off the front of the document, as it should be.
    const nested =
      "<p style='mso-list:l0 level1 lfo1'>" +
      "<span style='mso-list:Ignore'>\u00b7</span>Parent</p>" +
      "<p style='mso-list:l0 level2 lfo1'>" +
      "<span style='mso-list:Ignore'>o</span>Nested</p>";
    const markdown = htmlToMarkdown(nested, '');
    expect(markdown).toContain('-   Parent');
    expect(markdown).toContain('    -   Nested');
  });

  it('leaves an ordinary paragraph alone', () => {
    expect(htmlToMarkdown('<p>plain paragraph</p>', '')).toEqual(
      'plain paragraph'
    );
  });

  it('falls back to the plain text flavour when the HTML converts to nothing', () => {
    expect(htmlToMarkdown('<style>p{}</style>', 'fallback')).toEqual(
      'fallback'
    );
  });
});
