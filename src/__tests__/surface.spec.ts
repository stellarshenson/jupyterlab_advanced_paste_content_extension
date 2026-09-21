import {
  rendersMarkdown,
  surfaceForCellType,
  surfaceForPath
} from '../surface';

describe('surface', () => {
  it('treats only the two markdown surfaces as rendering markdown', () => {
    expect(rendersMarkdown('markdown-file')).toBe(true);
    expect(rendersMarkdown('markdown-cell')).toBe(true);
    expect(rendersMarkdown('text-file')).toBe(false);
    expect(rendersMarkdown('code-cell')).toBe(false);
    expect(rendersMarkdown('terminal')).toBe(false);
  });

  it('maps a .md path to the markdown file surface', () => {
    expect(surfaceForPath('notes.md')).toEqual('markdown-file');
    expect(surfaceForPath('work/deep/NOTES.MD')).toEqual('markdown-file');
  });

  it('maps every other editor path to the text file surface', () => {
    expect(surfaceForPath('notes.txt')).toEqual('text-file');
    expect(surfaceForPath('script.py')).toEqual('text-file');
    expect(surfaceForPath('readme')).toEqual('text-file');
  });

  it('maps cell types to their surfaces', () => {
    expect(surfaceForCellType('markdown')).toEqual('markdown-cell');
    expect(surfaceForCellType('code')).toEqual('code-cell');
    expect(surfaceForCellType('raw')).toEqual('code-cell');
  });
});
