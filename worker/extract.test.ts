import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXTRACT_CODES } from '../src/services/extract/urlExtractor';
import {
  decodeHtmlBytes,
  extractArticleText,
  handleExtract,
  isBlockedHostname
} from './index';

function post(body: unknown): Request {
  return new Request('https://plyn.test/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

async function json(res: Response): Promise<{ code?: string; error?: string }> {
  return (await res.json()) as { code?: string; error?: string };
}

describe('/api/extract error codes', () => {
  it('rejects GET with method_not_allowed', async () => {
    const res = await handleExtract(new Request('https://plyn.test/api/extract'));
    expect(res.status).toBe(405);
    expect((await json(res)).code).toBe('method_not_allowed');
  });

  it('rejects malformed JSON with invalid_request', async () => {
    const res = await handleExtract(post('{nope'));
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe('invalid_request');
  });

  it('rejects a non-URL with invalid_url', async () => {
    const res = await handleExtract(post({ url: 'not a url' }));
    expect((await json(res)).code).toBe('invalid_url');
  });

  it('rejects ftp with unsupported_protocol', async () => {
    const res = await handleExtract(post({ url: 'ftp://x' }));
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe('unsupported_protocol');
  });

  it('rejects private hosts with blocked_host', async () => {
    const res = await handleExtract(post({ url: 'http://127.0.0.1' }));
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe('blocked_host');
  });

  it('answers every error with a code the client knows, and no untranslated text', async () => {
    const requests = [
      new Request('https://plyn.test/api/extract'),
      post('{nope'),
      post({ url: 'not a url' }),
      post({ url: 'ftp://x' }),
      post({ url: 'http://127.0.0.1' })
    ];
    for (const req of requests) {
      const body = await json(await handleExtract(req));
      expect(EXTRACT_CODES).toContain(body.code);
      expect(body).not.toHaveProperty('error');
    }
  });
});

describe('isBlockedHostname (IMP-01 SSRF)', () => {
  it.each([
    'localhost',
    'app.localhost',
    'printer.local',
    '10.0.0.1',
    '172.16.5.4',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '2130706433',
    '0x7f000001',
    '0177.0.0.1',
    '[::1]',
    '::',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    'fd00::1',
    'fe80::1',
    'localhost.'
  ])('blocks %s', (host) => {
    expect(isBlockedHostname(host)).toBe(true);
  });

  it.each(['example.com', '8.8.8.8', '2606:4700::1111', 'pravda.com.ua'])(
    'allows %s',
    (host) => {
      expect(isBlockedHostname(host)).toBe(false);
    }
  );
});

describe('/api/extract fetch pipeline', () => {
  const para =
    'Це довгий абзац статті, який точно має більше ніж сорок символів для імпорту.';

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(handler: (url: string) => Response) {
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        const url = typeof input === 'string' ? input : input.toString();
        calls.push(url);
        return handler(url);
      })
    );
    return calls;
  }

  it('checks every redirect hop and blocks a redirect to a private host', async () => {
    const calls = stubFetch(() =>
      new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } })
    );
    const res = await handleExtract(post({ url: 'https://example.com/a' }));
    expect((await json(res)).code).toBe('blocked_host');
    expect(calls).toEqual(['https://example.com/a']);
  });

  it('stops after 5 redirects', async () => {
    let n = 0;
    const calls = stubFetch(() => {
      n += 1;
      return new Response(null, {
        status: 301,
        headers: { location: `https://example.com/r${n}` }
      });
    });
    const res = await handleExtract(post({ url: 'https://example.com/' }));
    expect((await json(res)).code).toBe('too_many_redirects');
    expect(calls.length).toBe(6);
  });

  it('refuses a response over the 2 MB cap', async () => {
    stubFetch(
      () =>
        new Response(new Uint8Array(2 * 1024 * 1024 + 10), {
          status: 200,
          headers: { 'content-type': 'text/html' }
        })
    );
    const res = await handleExtract(post({ url: 'https://example.com/' }));
    expect(res.status).toBe(413);
    expect((await json(res)).code).toBe('response_too_large');
  });

  it('maps 401/403 to login_required', async () => {
    stubFetch(() => new Response('no', { status: 403 }));
    const res = await handleExtract(post({ url: 'https://example.com/' }));
    expect((await json(res)).code).toBe('login_required');
  });

  it('follows a redirect and returns the final URL', async () => {
    stubFetch((url) =>
      url.endsWith('/old')
        ? new Response(null, { status: 301, headers: { location: '/new' } })
        : new Response(`<html><body><article><p>${para}</p></article></body></html>`, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' }
          })
    );
    const res = await handleExtract(post({ url: 'https://example.com/old' }));
    const body = (await res.json()) as { sourceUrl: string; text: string };
    expect(body.sourceUrl).toBe('https://example.com/new');
    expect(body.text).toBe(para);
  });
});

describe('decodeHtmlBytes', () => {
  // "Привіт" in Windows-1251
  const cp1251 = new Uint8Array([0xcf, 0xf0, 0xe8, 0xe2, 0xb3, 0xf2]);

  it('uses the charset from Content-Type', () => {
    expect(decodeHtmlBytes(cp1251, 'text/html; charset=windows-1251')).toBe('Привіт');
  });

  it('finds <meta charset> when the header has none', () => {
    const head = new TextEncoder().encode('<meta charset="windows-1251">');
    const bytes = new Uint8Array([...head, ...cp1251]);
    expect(decodeHtmlBytes(bytes, 'text/html')).toBe('<meta charset="windows-1251">Привіт');
  });

  it('falls back to UTF-8 for an unknown charset', () => {
    const bytes = new TextEncoder().encode('Привіт');
    expect(decodeHtmlBytes(bytes, 'text/html; charset=bogus-9')).toBe('Привіт');
  });
});

describe('extractArticleText noise filtering', () => {
  const p1 =
    'Перший справжній абзац статті, який читач хоче бачити у своїх картках.';
  const p2 =
    'Другий справжній абзац статті, теж достатньо довгий для імпорту в Плин.';

  it('drops a flat "read also" block', () => {
    const html = `<article><p>${p1}</p><div class="read-also"><p>Інша новина з довгим заголовком для приманки</p></div><p>${p2}</p></article>`;
    expect(extractArticleText(html)).toBe(`${p1}\n\n${p2}`);
  });

  it('keeps article text inside a wrapper whose class mentions share', () => {
    const html = `<article><div class="post-body has-share-buttons"><p>${p1}</p><div class="inner"><p>${p2}</p></div></div></article>`;
    expect(extractArticleText(html)).toBe(`${p1}\n\n${p2}`);
  });

  it('keeps a flat article body even when its class looks like noise', () => {
    const html = `<article><div class="entry-content social-ready"><p>${p1}</p><p>${p2}</p></div></article>`;
    expect(extractArticleText(html)).toBe(`${p1}\n\n${p2}`);
  });
});

describe('/api/extract long articles', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('trims a very long article at a paragraph break and marks it truncated', async () => {
    const p = `<p>${'Слово '.repeat(300).trim()}.</p>`;
    const html = `<article>${p.repeat(80)}</article>`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(html, { status: 200, headers: { 'content-type': 'text/html' } }))
    );
    const res = await handleExtract(post({ url: 'https://example.com/long' }));
    const body = (await res.json()) as { text: string; truncated?: boolean };
    expect(body.truncated).toBe(true);
    expect(body.text.length).toBeLessThanOrEqual(120_000);
    expect(body.text.endsWith('.')).toBe(true);
  });
});
