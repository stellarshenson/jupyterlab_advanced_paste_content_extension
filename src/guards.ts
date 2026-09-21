/**
 * The two tests that decide whether a paste is this extension's business at all.
 *
 * Both live here rather than inline in the listener so they can be tested
 * without a JupyterLab shell.
 */

/**
 * Largest payload written through the server.
 *
 * Measured on the conversion path: 32 MB costs about one second of blocked main
 * thread, 200 MB is a fatal out-of-memory inside JSON.stringify, and 420 MB
 * exceeds the engine's string limit inside btoa. Refusing above this leaves the
 * browser's own paste as the behaviour the user can still reason about.
 */
export const MAX_PAYLOAD_BYTES = 32 * 1024 * 1024;

/**
 * Whether a payload is small enough to write.
 */
export function isWritableSize(size: number): boolean {
  return size <= MAX_PAYLOAD_BYTES;
}

/**
 * Whether the paste actually landed in the surface that was resolved.
 *
 * The receiving surface is resolved from the shell's current widget, which does
 * not move when focus sits in a dialog, a side panel or the document-search
 * field. Without this test a paste aimed at any of those is cancelled and
 * written into the active cell instead.
 */
export function receives(
  host: Node | null | undefined,
  target: EventTarget | null
): boolean {
  if (!host || !(target instanceof Node)) {
    return false;
  }
  return host === target || host.contains(target);
}
