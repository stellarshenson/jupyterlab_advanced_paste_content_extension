import { Notification } from '@jupyterlab/apputils';

import { reportFailure } from '../failure';

describe('reportFailure', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the user a notification, not only a console line', () => {
    const notify = jest.spyOn(Notification, 'error').mockReturnValue('id');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    reportFailure(new Error('server is down'));

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify.mock.calls[0][0]).toContain('server is down');
  });

  it('reports a non-Error reason as text', () => {
    const notify = jest.spyOn(Notification, 'error').mockReturnValue('id');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    reportFailure('plain string reason');

    expect(notify.mock.calls[0][0]).toContain('plain string reason');
  });

  it('still writes to the console for the developer', () => {
    jest.spyOn(Notification, 'error').mockReturnValue('id');
    const logged = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    reportFailure(new Error('boom'));

    expect(logged).toHaveBeenCalled();
  });
});
