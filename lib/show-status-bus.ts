import type { ShowStatus } from "@/lib/library/database";

const listeners = new Set<(status: ShowStatus) => void>();

export function publishShowStatus(status: ShowStatus): void {
  for (const listener of listeners) {
    listener(status);
  }
}

export function subscribeShowStatus(
  listener: (status: ShowStatus) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
