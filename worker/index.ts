interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  EXTRACT_RATE_LIMITER?: RateLimitBinding;
}

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_ARTICLE_CHARS = 120_000;

export type ExtractErrorCode =
  | 'method_not_allowed'
  | 'invalid_request'
  | 'invalid_url'
  | 'unsupported_protocol'
  | 'blocked_host'
  | 'too_many_redirects'
  | 'timeout'
  | 'response_too_large'
  | 'rate_limited'
  | 'login_required'
  | 'js_required'
  | 'upstream_error'
  | 'no_article'
  | 'network_error';

function isPrivateIpv4Octets(a: number, b: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/**
 * Checks if a hostname points to localhost, a private/reserved IPv4,
 * a private/reserved IPv6, an IPv4-mapped IPv6, or a numeric/octal/hex IP.
 */
export function isBlockedHostname(rawHostname: string): boolean {
  const host = rawHostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');

  if (!host) return true;

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  // Single integer / hex / octal IPv4 forms (e.g. 2130706433, 0x7f000001)
  if (/^(?:0x[0-9a-f]+|0[0-7]+|\d+)$/i.test(host)) {
    return true;
  }

  // Dotted IPv4 (including octal/hex parts)
  const ipv4Parts = host.split('.');
  if (
    ipv4Parts.length === 4 &&
    ipv4Parts.every((p) => /^(?:0x[0-9a-f]+|\d+)$/i.test(p))
  ) {
    const nums = ipv4Parts.map((p) => {
      if (p.startsWith('0x')) return parseInt(p, 16);
      if (p.length > 1 && p.startsWith('0')) return parseInt(p, 8);
      return Number(p);
    });
    if (nums.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
    return isPrivateIpv4Octets(nums[0], nums[1]);
  }

  // IPv6 checks
  if (host.includes(':')) {
    if (host === '::' || host === '::1') return true;
    // IPv4-mapped IPv6 in dotted form: ::ffff:127.0.0.1
    const mappedDotted = /^::ffff:(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(
      host
    );
    if (mappedDotted) {
      return isPrivateIpv4Octets(
        Number(mappedDotted[1]),
        Number(mappedDotted[2])
      );
    }
    // IPv4-mapped IPv6 in hex form: ::ffff:7f00:1 or ::ffff:7f00:0001
    const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(host);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const a = (hi >> 8) & 0xff;
      const b = hi & 0xff;
      return isPrivateIpv4Octets(a, b);
    }
    // Unique local (fc00::/7), link-local (fe80::/10), multicast (ff00::/8)
    const firstHextet = host.split(':')[0] || '0';
    if (/^(?:fc|fd|fe[89ab]|ff)/i.test(firstHextet)) {
      return true;
    }
  }

  return false;
}

function detectHtmlCharset(
  contentType: string | null,
  bytes: Uint8Array
): string {
  if (contentType) {
    const headerMatch = /charset\s*=\s*["']?([a-zA-Z0-9._-]+)/i.exec(
      contentType
    );
    if (headerMatch?.[1]) return headerMatch[1].toLowerCase();
  }

  // Inspect first 4 KB as ASCII for <meta charset="..."> or http-equiv Content-Type
  const headSlice = bytes.subarray(0, Math.min(bytes.length, 4096));
  const asciiHead = new TextDecoder('latin1').decode(headSlice);

  const metaCharset =
    /<meta[^>]+charset\s*=\s*["']?\s*([a-zA-Z0-9._-]+)/i.exec(asciiHead) ||
    /<meta[^>]+content\s*=\s*["'][^"']*charset\s*=\s*([a-zA-Z0-9._-]+)/i.exec(
      asciiHead
    );
  if (metaCharset?.[1]) return metaCharset[1].toLowerCase();

  return 'utf-8';
}

export function decodeHtmlBytes(
  bytes: Uint8Array,
  contentType: string | null
): string {
  const rawCharset = detectHtmlCharset(contentType, bytes);
  const normalized = rawCharset === 'cp1251' ? 'windows-1251' : rawCharset;

  try {
    return new TextDecoder(normalized).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&hellip;/gi, '…')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

export function extractTitle(html: string): string {
  const ogMatch =
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(
      html
    ) ||
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i.exec(
      html
    );
  if (ogMatch?.[1]) return decodeHtmlEntities(ogMatch[1]).trim();

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(titleMatch[1]).replace(/\s+/g, ' ').trim();
  }
  return '';
}

const NOISE_CONTAINER_ATTR =
  /(?:related|read[-_]?also|read[-_]?more|chitajte|share|social|comment|cookie|consent|newsletter|subscribe|sidebar|promo|banner|advert|menu|breadcrumb|recommend)/i;

const BOILERPLATE_LINE =
  /^(?:читайте також|читай також|підписуйтесь на|підписатися на|поділитися|read also|read more|related articles|share this|subscribe to|cookie policy|accept all cookies|sign in to continue|log in to read)/i;

function stripNoisyBlocks(html: string): string {
  // Strip structural chrome first
  let out = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form\b[\s\S]*?<\/form>/gi, ' ')
    .replace(/<dialog\b[\s\S]*?<\/dialog>/gi, ' ');

  // Remove flat div/section/ul blocks whose class or id clearly marks related/promo noise
  out = out.replace(
    /<(div|section|ul)\b[^>]*(?:class|id)=["']([^"']*)["'][^>]*>([\s\S]*?)<\/\1>/gi,
    (full, _tag, attrVal: string) =>
      NOISE_CONTAINER_ATTR.test(attrVal) ? ' ' : full
  );

  return out;
}

export function extractArticleText(html: string): string {
  const articleMatch = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainMatch =
    /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html) ||
    /<div\b[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/div>/i.exec(html);

  let scope = html;
  if (articleMatch && articleMatch[1].length > 350) {
    scope = articleMatch[1];
  } else if (mainMatch && mainMatch[1].length > 350) {
    scope = mainMatch[1];
  }

  const cleaned = stripNoisyBlocks(scope);

  const paragraphs: string[] = [];
  const blockRegex = /<(p|h1|h2|h3|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    const rawText = match[2].replace(/<[^>]+>/g, ' ');
    const text = decodeHtmlEntities(rawText).replace(/\s+/g, ' ').trim();
    if (text.length >= 25 && !BOILERPLATE_LINE.test(text)) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  return decodeHtmlEntities(cleaned.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function detectFailureReason(html: string): 'login_required' | 'js_required' | 'no_article' {
  const lower = html.toLowerCase();

  if (
    /<input[^>]+type=["']password["']/i.test(html) ||
    /(?:sign in to continue|log in to continue|subscribe to read|увійдіть,? щоб|авторизуйтесь,? щоб)/i.test(
      html
    )
  ) {
    return 'login_required';
  }

  if (
    /<noscript[^>]*>[^<]*(?:javascript|js)[^<]*<\/noscript>/i.test(lower) ||
    /<div[^>]+id=["'](?:root|app|__next)["'][^>]*>\s*<\/div>/i.test(html) ||
    /enable javascript/i.test(lower)
  ) {
    return 'js_required';
  }

  return 'no_article';
}

function trimArticleText(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_ARTICLE_CHARS) {
    return { text, truncated: false };
  }
  const slice = text.slice(0, MAX_ARTICLE_CHARS);
  const lastBreak = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf(' '));
  const clean =
    lastBreak > MAX_ARTICLE_CHARS * 0.8 ? slice.slice(0, lastBreak) : slice;
  return { text: clean.trim(), truncated: true };
}

async function readBodyWithLimit(
  response: Response,
  maxBytes: number
): Promise<{ bytes: Uint8Array; exceeded: boolean }> {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxBytes) {
    return { bytes: new Uint8Array(0), exceeded: true };
  }

  if (!response.body) {
    const buf = new Uint8Array(await response.arrayBuffer());
    return { bytes: buf, exceeded: buf.byteLength > maxBytes };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return { bytes: new Uint8Array(0), exceeded: true };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes: out, exceeded: false };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function errorResponse(
  code: ExtractErrorCode,
  status: number,
  extra: Record<string, unknown> = {}
): Response {
  return jsonResponse({ code, ...extra }, status);
}

export async function handleExtract(
  request: Request,
  env?: Partial<Env>
): Promise<Response> {
  if (request.method !== 'POST') {
    return errorResponse('method_not_allowed', 405);
  }

  if (env?.EXTRACT_RATE_LIMITER) {
    const clientKey =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for') ||
      'anonymous';
    const { success } = await env.EXTRACT_RATE_LIMITER.limit({ key: clientKey });
    if (!success) {
      return errorResponse('rate_limited', 429);
    }
  }

  let rawUrl = '';
  try {
    const data = (await request.json()) as { url?: string };
    rawUrl = (data.url || '').trim();
  } catch {
    return errorResponse('invalid_request', 400);
  }

  let currentUrl: URL;
  try {
    currentUrl = new URL(rawUrl);
  } catch {
    return errorResponse('invalid_url', 400);
  }

  if (currentUrl.protocol !== 'http:' && currentUrl.protocol !== 'https:') {
    return errorResponse('unsupported_protocol', 400);
  }

  if (isBlockedHostname(currentUrl.hostname)) {
    return errorResponse('blocked_host', 400);
  }

  try {
    let upstream: Response | null = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      const response = await fetch(currentUrl.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; PlynReader/1.0; +https://plyn.app)',
          Accept: 'text/html,application/xhtml+xml'
        },
        redirect: 'manual',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      });

      const isRedirect =
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.has('location');

      if (!isRedirect) {
        upstream = response;
        break;
      }

      if (hop === MAX_REDIRECTS) {
        return errorResponse('too_many_redirects', 502);
      }

      const location = response.headers.get('location') || '';
      let nextUrl: URL;
      try {
        nextUrl = new URL(location, currentUrl);
      } catch {
        return errorResponse('invalid_url', 502);
      }

      if (nextUrl.protocol !== 'http:' && nextUrl.protocol !== 'https:') {
        return errorResponse('unsupported_protocol', 400);
      }
      if (isBlockedHostname(nextUrl.hostname)) {
        return errorResponse('blocked_host', 400);
      }

      currentUrl = nextUrl;
    }

    if (!upstream) {
      return errorResponse('too_many_redirects', 502);
    }

    if (upstream.status === 401 || upstream.status === 403) {
      return errorResponse('login_required', 422, { status: upstream.status });
    }

    if (!upstream.ok) {
      return errorResponse('upstream_error', 502, { status: upstream.status });
    }

    const { bytes, exceeded } = await readBodyWithLimit(
      upstream,
      MAX_RESPONSE_BYTES
    );
    if (exceeded) {
      return errorResponse('response_too_large', 413);
    }

    const html = decodeHtmlBytes(bytes, upstream.headers.get('content-type'));
    const title = extractTitle(html) || currentUrl.hostname;
    const rawText = extractArticleText(html);

    if (rawText.length < 40) {
      return errorResponse(detectFailureReason(html), 422);
    }

    const { text, truncated } = trimArticleText(rawText);

    return jsonResponse({
      title,
      text,
      sourceUrl: currentUrl.toString(),
      ...(truncated ? { truncated: true } : {})
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'TimeoutError' || err.name === 'AbortError')
    ) {
      return errorResponse('timeout', 504);
    }
    return errorResponse('network_error', 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/extract') {
      return handleExtract(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
