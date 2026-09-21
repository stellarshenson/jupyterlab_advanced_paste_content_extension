import { timestampName } from '../naming';

describe('timestampName', () => {
  it('builds paste-YYYYMMDD-HHMMSS with the given extension', () => {
    const date = new Date(2026, 8, 20, 19, 15, 30);
    expect(timestampName(date, 'png')).toEqual('paste-20260920-191530.png');
  });

  it('zero-pads every field', () => {
    const date = new Date(2026, 0, 2, 3, 4, 5);
    expect(timestampName(date, 'png')).toEqual('paste-20260102-030405.png');
  });

  it('matches the pattern the criteria assert', () => {
    const name = timestampName(new Date(), 'png');
    expect(name).toMatch(/^paste-[0-9]{8}-[0-9]{6}\.png$/);
  });

  it('carries the extension it is given', () => {
    expect(timestampName(new Date(2026, 8, 20, 19, 15, 30), 'jpg')).toEqual(
      'paste-20260920-191530.jpg'
    );
  });
});
