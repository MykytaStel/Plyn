import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlynError } from '../../core/errors';
import { ExtractError, extractArticleFromUrl } from './urlExtractor';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubOnline(onLine: boolean) {
  vi.stubGlobal('navigator', { onLine });
}

describe('extractArticleFromUrl', () => {
  it('rejects a URL without http(s) before any request', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(extractArticleFromUrl('example.com')).rejects.toMatchObject({
      code: 'url_invalid'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says "offline" without a request when the browser is offline', async () => {
    stubOnline(false);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const err = await extractArticleFromUrl('https://example.com/a').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PlynError);
    expect((err as PlynError).code).toBe('offline');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('says "offline" when the request never reaches the server', async () => {
    stubOnline(true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(extractArticleFromUrl('https://example.com/a')).rejects.toMatchObject({
      code: 'offline'
    });
  });

  it('keeps server error codes as ExtractError', async () => {
    stubOnline(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'no_article' }), { status: 422 })
      )
    );
    const err = await extractArticleFromUrl('https://example.com/a').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ExtractError);
    expect((err as ExtractError).code).toBe('no_article');
  });

  it('returns the article on success', async () => {
    stubOnline(true);
    const article = { title: 'T', text: 'Body', sourceUrl: 'https://example.com/a' };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(article))));
    await expect(extractArticleFromUrl('https://example.com/a')).resolves.toEqual(article);
  });
});
