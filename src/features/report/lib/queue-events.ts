/** Lets the sync banner refresh its count when a report is saved to (or leaves) the device. */
const listeners = new Set<() => void>();

export function onOfflineQueueChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyOfflineQueueChanged(): void {
  listeners.forEach((listener) => listener());
}
