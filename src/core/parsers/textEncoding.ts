/**
 * Encoding detection for plain-text books (0.23, EXP-04).
 *
 * Order: a byte-order mark; UTF-16 without a mark (zero / 0x04 high bytes);
 * strict UTF-8; then the two common Cyrillic 8-bit encodings, Windows-1251
 * and KOI8-U, scored by how much of the Cyrillic comes out lowercase.
 * (Real text is mostly lowercase; the wrong one of the two turns lowercase
 * into uppercase and the other way round.)
 *
 * When nothing fits well it falls back to UTF-8 and says it is not sure,
 * so the UI can show a calm hint. No dependency beyond `TextDecoder`.
 */

export type TextEncodingId = 'utf-8' | 'utf-16le' | 'utf-16be' | 'windows-1251' | 'koi8-u';

export interface DetectedEncoding {
  encoding: TextEncodingId;
  /** False when the guess is a fallback; some letters may look wrong. */
  confident: boolean;
}

export interface DecodedText extends DetectedEncoding {
  text: string;
}

/** Enough bytes to decide; scoring the whole of a big book adds nothing. */
const SAMPLE_BYTES = 64 * 1024;

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((b, i) => bytes[i] === b);
}

function bomEncoding(bytes: Uint8Array): { encoding: TextEncodingId; length: number } | null {
  if (hasPrefix(bytes, [0xef, 0xbb, 0xbf])) return { encoding: 'utf-8', length: 3 };
  if (hasPrefix(bytes, [0xff, 0xfe])) return { encoding: 'utf-16le', length: 2 };
  if (hasPrefix(bytes, [0xfe, 0xff])) return { encoding: 'utf-16be', length: 2 };
  return null;
}

/**
 * UTF-16 text in Latin or Cyrillic has a high byte of 0x00 or 0x04 in almost
 * every pair. 8-bit text practically never contains those bytes.
 */
function utf16WithoutBom(sample: Uint8Array): TextEncodingId | null {
  const pairs = Math.floor(sample.length / 2);
  if (pairs < 2) return null;
  let evenHigh = 0;
  let oddHigh = 0;
  for (let i = 0; i + 1 < sample.length; i += 2) {
    if (sample[i] === 0x00 || sample[i] === 0x04) evenHigh += 1;
    if (sample[i + 1] === 0x00 || sample[i + 1] === 0x04) oddHigh += 1;
  }
  if (oddHigh / pairs > 0.6 && evenHigh / pairs < 0.2) return 'utf-16le';
  if (evenHigh / pairs > 0.6 && oddHigh / pairs < 0.2) return 'utf-16be';
  return null;
}

function isValidUtf8(sample: Uint8Array, isWhole: boolean): boolean {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample, { stream: !isWhole });
    return true;
  } catch {
    return false;
  }
}

const CYRILLIC = /[Ѐ-ӿ]/g;
const CYRILLIC_LOWER = /[а-џґ]/g;

/** Share of Cyrillic letters that are lowercase, and how many there were. */
function cyrillicScore(text: string): { lowerShare: number; count: number } {
  const count = text.match(CYRILLIC)?.length ?? 0;
  if (count === 0) return { lowerShare: 0, count: 0 };
  const lower = text.match(CYRILLIC_LOWER)?.length ?? 0;
  return { lowerShare: lower / count, count };
}

export function detectTextEncoding(bytes: Uint8Array): DetectedEncoding {
  const bom = bomEncoding(bytes);
  if (bom) return { encoding: bom.encoding, confident: true };

  const isWhole = bytes.length <= SAMPLE_BYTES;
  const sample = isWhole ? bytes : bytes.subarray(0, SAMPLE_BYTES);

  const utf16 = utf16WithoutBom(sample);
  if (utf16) return { encoding: utf16, confident: true };

  if (isValidUtf8(sample, isWhole)) return { encoding: 'utf-8', confident: true };

  const cp1251 = cyrillicScore(new TextDecoder('windows-1251').decode(sample));
  const koi8 = cyrillicScore(new TextDecoder('koi8-u').decode(sample));
  const best =
    cp1251.lowerShare >= koi8.lowerShare
      ? { encoding: 'windows-1251' as const, ...cp1251 }
      : { encoding: 'koi8-u' as const, ...koi8 };

  // Some real Cyrillic, mostly lowercase: a confident 8-bit guess.
  if (best.count >= 3 && best.lowerShare >= 0.6) {
    return { encoding: best.encoding, confident: true };
  }
  return { encoding: 'utf-8', confident: false };
}

/** Decodes a text file's bytes with the detected encoding, dropping any BOM. */
export function decodeTextBytes(bytes: Uint8Array): DecodedText {
  const detected = detectTextEncoding(bytes);
  const bom = bomEncoding(bytes);
  const body = bom ? bytes.subarray(bom.length) : bytes;
  // ignoreBOM: the mark (if any) is already cut off above.
  const text = new TextDecoder(detected.encoding, { ignoreBOM: true }).decode(body);
  return { ...detected, text };
}
