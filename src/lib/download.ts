/* Saving files is the most fragile part of a browser app: sandboxed preview
 * iframes silently block <a download>, some browsers hide the anchor click, and
 * Safari needs a user gesture. This module tries, in order:
 *   1. the File System Access picker ("Save as…") when available,
 *   2. a synthetic <a download> click,
 * and reports which route was used so the UI can explain what happened.
 */

export type SaveMethod = 'picker' | 'anchor' | 'cancelled' | 'blocked';

export function isEmbeddedFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

type PickerWindow = Window & {
  showSaveFilePicker?: (opts: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>;
};

export async function saveBlob(blob: Blob, filename: string): Promise<SaveMethod> {
  const picker = (window as PickerWindow).showSaveFilePicker;
  const ext = filename.split('.').pop() ?? 'webm';
  if (picker && !isEmbeddedFrame()) {
    try {
      const handle = await picker({
        suggestedName: filename,
        types: [
          {
            description: ext.toUpperCase(),
            accept: { [blob.type || `video/${ext}`]: [`.${ext}`] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return 'picker';
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
        if (e.name === 'AbortError') return 'cancelled';
      }
      /* fall through to the anchor */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  try {
    a.click();
    return 'anchor';
  } finally {
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  }
}

export function openBlobInTab(blob: Blob): Window | null {
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) {
    try {
      win.opener = null;
    } catch {
      /* cross-origin window — nothing to do */
    }
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return win;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
