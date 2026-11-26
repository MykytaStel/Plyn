import { describe, expect, it } from 'vitest';
import { EXTRACT_CODES } from '../src/services/extract/urlExtractor';
import { handleExtract } from './index';

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
