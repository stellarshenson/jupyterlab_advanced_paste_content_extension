import { URLExt } from '@jupyterlab/coreutils';

import { ServerConnection } from '@jupyterlab/services';

/**
 * Call the server extension
 *
 * @param endPoint API REST end point for the extension
 * @param serverSettings The server settings to use for the request
 * @param init Initial values for the request
 * @returns The response body interpreted as JSON
 */
export async function requestAPI<T>(
  endPoint: string,
  serverSettings: ServerConnection.ISettings,
  init: RequestInit = {}
): Promise<T> {
  // Make request to Jupyter API
  const requestUrl = URLExt.join(
    serverSettings.baseUrl,
    'jupyterlab-advanced-paste-content-extension', // our server extension's API namespace
    endPoint
  );

  let response: Response;
  try {
    response = await ServerConnection.makeRequest(
      requestUrl,
      init,
      serverSettings
    );
  } catch (error) {
    throw new ServerConnection.NetworkError(error as any);
  }

  let data: any = await response.text();

  if (data.length > 0) {
    try {
      data = JSON.parse(data);
    } catch {
      console.log('Not a JSON response body.', response);
    }
  }

  if (!response.ok) {
    throw new ServerConnection.ResponseError(response, data.message || data);
  }

  return data;
}

/**
 * What the server did with a payload: the name it landed under, and whether an
 * identical file was already there.
 */
export interface IWriteResult {
  filename: string;
  reused: boolean;
  /**
   * On a write that named a terminal: the path the shell reaches the file by,
   * relative to its working directory, or absolute when that could not be read.
   */
  terminal_path?: string;
}

/**
 * Write a payload into a folder on the server.
 *
 * The server writes into the Jupyter workspace, which the browser cannot reach
 * directly. It returns the name of an existing byte-identical file instead of
 * writing a second copy.
 */
export async function writeFile(
  serverSettings: ServerConnection.ISettings,
  folder: string,
  filename: string,
  contentBase64: string,
  terminal?: string
): Promise<IWriteResult> {
  return requestAPI<IWriteResult>('write', serverSettings, {
    method: 'POST',
    body: JSON.stringify({
      folder,
      filename,
      content_base64: contentBase64,
      // Naming the terminal lets the server answer the path relative to the
      // shell's working directory, which the frontend has no way to read.
      ...(terminal ? { terminal } : {})
    })
  });
}
