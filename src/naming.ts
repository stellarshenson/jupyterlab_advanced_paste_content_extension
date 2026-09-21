/**
 * Naming for written payloads.
 *
 * A bitmap arrives with no source name, so one is invented. A timestamp is used
 * because it cannot collide in normal use, which removes the overwrite case.
 */

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * Build the name for a pasted bitmap: `paste-YYYYMMDD-HHMMSS.png`.
 *
 * @param date the moment of the paste
 * @param extension file extension without the dot
 */
export function timestampName(date: Date, extension: string): string {
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1, 2)}${pad(date.getDate(), 2)}` +
    `-${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}${pad(date.getSeconds(), 2)}`;
  return `paste-${stamp}.${extension}`;
}
