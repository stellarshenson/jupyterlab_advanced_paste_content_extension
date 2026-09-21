import { Notification } from '@jupyterlab/apputils';

/**
 * Report a write that did not happen.
 *
 * The handler cancels the browser's own paste before writing, so a failure that
 * only reached the console would lose the content with no trace the user sees.
 */
export function reportFailure(reason: unknown): void {
  const message = reason instanceof Error ? reason.message : String(reason);
  console.error('advanced paste: could not write the pasted content', reason);
  Notification.error(`Could not write the pasted content: ${message}`, {
    autoClose: 5000
  });
}
