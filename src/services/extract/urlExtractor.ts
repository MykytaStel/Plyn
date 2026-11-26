import { PlynError } from '../../core/errors';

export interface ExtractedArticle {
  title: string;
  text: string;
  sourceUrl: string;
}

/** Mirrors worker/index.ts (the worker is outside the app's tsconfig). */
export type ExtractErrorCode =
  | 'method_not_allowed'
  | 'invalid_request'
  | 'invalid_url'
  | 'unsupported_protocol'
  | 'blocked_host'
  | 'upstream_error'
  | 'no_article'
  | 'network_error';

export const EXTRACT_CODES: readonly string[] = [
  'method_not_allowed',
  'invalid_request',
  'invalid_url',
  'unsupported_protocol',
  'blocked_host',
  'upstream_error',
  'no_article',
  'network_error'
];

export class ExtractError extends Error {
  readonly code: ExtractErrorCode | 'unknown';
  readonly status?: number;

  constructor(
    code: ExtractErrorCode | 'unknown',
    details: { status?: number } = {}
  ) {
    super(code);
    this.name = 'ExtractError';
    this.code = code;
    this.status = details.status;
  }
}

/**
 * Витягує чистий текст статті за URL через наш Cloudflare Worker (/api/extract).
 */
export async function extractArticleFromUrl(
  rawUrl: string
): Promise<ExtractedArticle> {
  const url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    throw new PlynError('url_invalid');
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new PlynError('offline');
  }

  let response: Response;
  try {
    response = await fetch('/api/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
  } catch {
    // fetch rejects only when the request never reached our server
    // (no connection, or the app is offline behind the service worker).
    throw new PlynError('offline');
  }

  const payload = (await response.json().catch(() => null)) as
    | (ExtractedArticle & { code?: string; status?: number })
    | null;

  if (!response.ok || !payload || !payload.text) {
    const code =
      payload?.code && EXTRACT_CODES.includes(payload.code)
        ? (payload.code as ExtractErrorCode)
        : 'unknown';
    throw new ExtractError(code, {
      status: payload?.status ?? response.status
    });
  }

  return payload;
}
