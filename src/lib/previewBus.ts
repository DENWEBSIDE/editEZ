/* Small bridge so panels can ask the preview for a still frame. */
let snapshotProvider: (() => string | undefined) | null = null;

export function setSnapshotProvider(fn: (() => string | undefined) | null) {
  snapshotProvider = fn;
}

export function getSnapshot(): string | undefined {
  try {
    return snapshotProvider?.();
  } catch {
    return undefined;
  }
}
