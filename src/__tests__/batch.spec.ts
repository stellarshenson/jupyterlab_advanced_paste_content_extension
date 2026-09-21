import { writeAll } from '../batch';

describe('writeAll', () => {
  it('inserts every reference joined by the separator', async () => {
    const inserted: string[] = [];
    await writeAll(
      ['a', 'b', 'c'],
      async name => `${name}.png`,
      text => inserted.push(text),
      '\n\n'
    );
    expect(inserted).toEqual(['a.png\n\nb.png\n\nc.png']);
  });

  it('inserts what was written when a later write fails', async () => {
    const inserted: string[] = [];
    const boom = new Error('server said no');

    await expect(
      writeAll(
        ['a', 'b', 'c'],
        async name => {
          if (name === 'c') {
            throw boom;
          }
          return `${name}.png`;
        },
        text => inserted.push(text),
        ' '
      )
    ).rejects.toThrow('server said no');

    // a.png and b.png are on disk, so the document must reference them.
    expect(inserted).toEqual(['a.png b.png']);
  });

  it('inserts nothing when the first write fails', async () => {
    const inserted: string[] = [];

    await expect(
      writeAll(
        ['a'],
        async () => {
          throw new Error('no');
        },
        text => inserted.push(text),
        ' '
      )
    ).rejects.toThrow('no');

    expect(inserted).toEqual([]);
  });

  it('inserts nothing for an empty batch', async () => {
    const inserted: string[] = [];
    await writeAll(
      [],
      async () => 'x',
      text => inserted.push(text),
      ' '
    );
    expect(inserted).toEqual([]);
  });

  it('writes in order', async () => {
    const order: string[] = [];
    await writeAll(
      ['a', 'b', 'c'],
      async name => {
        order.push(name);
        return name;
      },
      () => undefined,
      ' '
    );
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
