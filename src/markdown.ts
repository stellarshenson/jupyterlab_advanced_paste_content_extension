import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';

/**
 * HTML to markdown conversion for the two surfaces that render markdown.
 *
 * Stylesheets, scripts and document metadata are dropped rather than converted
 * to text, so a paste from Word does not arrive with its CSS attached.
 */
function build(): TurndownService {
  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced'
  });
  service.use(gfm);
  service.remove(['style', 'script', 'meta', 'link', 'title']);

  // An <img> the document cannot load is worse than no image. A data: URI is the
  // base64 blob this extension exists to remove, and Word and Outlook reference
  // their images as file:/// paths in a local temp folder that resolve nowhere.
  // Both keep their alt text and lose the source.
  service.addRule('unloadableImages', {
    filter: node =>
      node.nodeName === 'IMG' &&
      !/^https?:\/\//i.test(node.getAttribute('src') || ''),
    replacement: (_content, node) =>
      (node as HTMLElement).getAttribute('alt') || ''
  });
  // Word and Google Docs carry bold as a style on a bare <span> rather than as
  // a tag, which turndown has no rule for and drops without a trace. This is
  // why a Word paste arrives as unformatted text.
  service.addRule('cssBold', {
    filter: node =>
      node.nodeName === 'SPAN' &&
      /font-weight:\s*(bold|[6-9]00)/i.test(node.getAttribute('style') || ''),
    replacement: content => (content.trim() ? `**${content}**` : content)
  });

  // Google Docs wraps the whole fragment in <b style="font-weight:normal">,
  // which turndown faithfully converts to a stray pair of asterisks.
  service.addRule('normalWeightBold', {
    filter: node =>
      (node.nodeName === 'B' || node.nodeName === 'STRONG') &&
      /font-weight:\s*normal/i.test(node.getAttribute('style') || ''),
    replacement: content => content
  });

  // Word writes bulleted and numbered lists as ordinary paragraphs carrying the
  // bullet as literal text - there is no <ul> or <li> anywhere in a Word paste.
  // The marker itself sits in a span the document flags as decoration.
  service.addRule('wordListMarker', {
    filter: node =>
      node.nodeName === 'SPAN' &&
      /mso-list:\s*ignore/i.test(node.getAttribute('style') || ''),
    replacement: () => ''
  });

  service.addRule('wordListItem', {
    filter: node =>
      node.nodeName === 'P' &&
      /mso-list:\s*l\d+\s+level\d+/i.test(node.getAttribute('style') || ''),
    replacement: (content, node) => {
      const style = (node as HTMLElement).getAttribute('style') || '';
      const level = Number((style.match(/level(\d+)/i) || [])[1] || 1);
      const text = content
        .replace(/^[\s\u00b7\u2022\u25aa\u00a0o-]+/, '')
        .trim();
      return text ? `${'    '.repeat(level - 1)}-   ${text}\n` : '';
    }
  });

  return service;
}

let service: TurndownService | null = null;

/**
 * Convert clipboard HTML to markdown. Falls back to the plain-text flavour when
 * the HTML converts to nothing, so an unconvertible paste still inserts.
 */
export function htmlToMarkdown(html: string, fallback: string): string {
  service = service || build();
  const converted = service.turndown(html).trim();
  return converted.length > 0 ? converted : fallback;
}
