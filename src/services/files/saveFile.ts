export type SaveFileResult = 'shared' | 'downloaded' | 'cancelled';

/** How long the object URL lives after the click: some browsers start the download asynchronously. */
export const REVOKE_DELAY_MS = 1000;

/** Phones and tablets: the share sheet sends the file to Files / iCloud / Drive in one step. */
function canShareFile(file: File): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches &&
    navigator.canShare({ files: [file] })
  );
}

/**
 * Hands a file to the reader: the share sheet on touch devices, a download elsewhere
 * (or when sharing fails). A closed share sheet is reported as `cancelled`.
 */
export async function saveFile(file: File): Promise<SaveFileResult> {
  if (canShareFile(file)) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
      // Share failed for another reason: fall back to a download.
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  return 'downloaded';
}
