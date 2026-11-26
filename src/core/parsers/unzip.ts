import { unzip, unzipSync, type Unzipped } from 'fflate';

/**
 * Unzips off the main thread where the browser has workers (fflate starts
 * them itself), so a big book does not freeze the screen. Falls back to the
 * synchronous version in tests and if a worker cannot start.
 */
export async function unzipBytes(bytes: Uint8Array): Promise<Unzipped> {
  if (typeof Worker === 'undefined') return unzipSync(bytes);
  try {
    return await new Promise<Unzipped>((resolve, reject) => {
      unzip(bytes, (err, data) => (err ? reject(err) : resolve(data)));
    });
  } catch {
    return unzipSync(bytes);
  }
}

/** A zip archive starts with "PK\x03\x04". */
export function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}
