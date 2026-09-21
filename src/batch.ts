/**
 * Writing several payloads from one paste.
 *
 * Separated from the listener so the partial-failure path can be tested: the
 * files that were written are already on disk, so their references belong in
 * the document even when a later write fails.
 */
export async function writeAll<T>(
  payloads: T[],
  write: (payload: T) => Promise<string>,
  insert: (text: string) => void,
  separator: string
): Promise<void> {
  const references: string[] = [];
  try {
    for (const payload of payloads) {
      references.push(await write(payload));
    }
  } finally {
    if (references.length > 0) {
      insert(references.join(separator));
    }
  }
}
