import { PlynError } from '../../core/errors';

export interface ExtractedArticle {
  title: string;
  text: string;
  sourceUrl: string;
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

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  const payload = (await response.json().catch(() => null)) as
    | (ExtractedArticle & { error?: string })
    | null;

  if (!response.ok || !payload || !payload.text) {
    throw new Error(
      payload?.error ||
        'Не вдалося завантажити статтю. Спробуй скопіювати текст вручну.'
    );
  }

  return payload;
}
