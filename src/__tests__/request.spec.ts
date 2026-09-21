import { ServerConnection } from '@jupyterlab/services';

import { writeFile } from '../request';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

describe('writeFile', () => {
  const settings = ServerConnection.makeSettings({
    baseUrl: 'http://localhost:8888/'
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('posts the payload to the write endpoint', async () => {
    const spy = jest
      .spyOn(ServerConnection, 'makeRequest')
      .mockResolvedValue(jsonResponse({ filename: 'a.png', reused: false }));

    await writeFile(settings, 'work', 'a.png', 'AAAA');

    const [url, init] = spy.mock.calls[0];
    expect(url).toContain('/jupyterlab-advanced-paste-content-extension/write');
    expect(init.method).toEqual('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      folder: 'work',
      filename: 'a.png',
      content_base64: 'AAAA'
    });
  });

  it('returns the name the server actually used', async () => {
    jest
      .spyOn(ServerConnection, 'makeRequest')
      .mockResolvedValue(jsonResponse({ filename: 'a-1.png', reused: false }));

    const result = await writeFile(settings, '', 'a.png', 'AAAA');

    expect(result).toEqual({ filename: 'a-1.png', reused: false });
  });

  it('reports a reused file so no second copy is written', async () => {
    jest
      .spyOn(ServerConnection, 'makeRequest')
      .mockResolvedValue(jsonResponse({ filename: 'first.png', reused: true }));

    const result = await writeFile(settings, '', 'second.png', 'AAAA');

    expect(result).toEqual({ filename: 'first.png', reused: true });
  });
});
