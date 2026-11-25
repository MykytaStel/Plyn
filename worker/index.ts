interface Env {
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower === '::1'
  ) {
    return true;
  }

  // Блокуємо приватні IPv4-діапазони (захист від SSRF)
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(lower);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }

  return false;
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

function extractTitle(html: string): string {
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

function extractArticleText(html: string): string {
  // Надаємо перевагу тегу <article> або <main>, якщо він достатньо великий
  const articleMatch = /<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html);
  const mainMatch = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);

  let scope = html;
  if (articleMatch && articleMatch[1].length > 400) {
    scope = articleMatch[1];
  } else if (mainMatch && mainMatch[1].length > 400) {
    scope = mainMatch[1];
  }

  // Прибираємо скрипти, стилі, навігацію, футери й форми
  const cleaned = scope
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form\b[\s\S]*?<\/form>/gi, ' ');

  // Витягуємо абзаци та заголовки
  const paragraphs: string[] = [];
  const blockRegex = /<(p|h1|h2|h3|blockquote|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(cleaned)) !== null) {
    const rawText = match[2].replace(/<[^>]+>/g, ' ');
    const text = decodeHtmlEntities(rawText).replace(/\s+/g, ' ').trim();
    if (text.length >= 25) {
      paragraphs.push(text);
    }
  }

  if (paragraphs.length > 0) {
    return paragraphs.join('\n\n');
  }

  // Фолбек: весь видимий текст
  return decodeHtmlEntities(cleaned.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

async function handleExtract(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Метод не підтримується' }, 405);
  }

  let rawUrl = '';
  try {
    const data = (await request.json()) as { url?: string };
    rawUrl = (data.url || '').trim();
  } catch {
    return jsonResponse({ error: 'Некоректний JSON-запит' }, 400);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return jsonResponse({ error: 'Некоректний формат посилання' }, 400);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return jsonResponse({ error: 'Дозволені лише http/https посилання' }, 400);
  }

  if (isBlockedHostname(parsedUrl.hostname)) {
    return jsonResponse({ error: 'Ця адреса недоступна для імпорту' }, 400);
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; PlynReader/1.0; +https://plyn.app)',
        Accept: 'text/html,application/xhtml+xml'
      },
      redirect: 'follow'
    });

    if (!upstream.ok) {
      return jsonResponse(
        { error: `Сайт відповів помилкою (${upstream.status})` },
        502
      );
    }

    const html = await upstream.text();
    const title = extractTitle(html) || parsedUrl.hostname;
    const text = extractArticleText(html);

    if (text.length < 40) {
      return jsonResponse(
        {
          error:
            'Не вдалося знайти текст статті (можливо, сайт вимагає JavaScript або вхід).'
        },
        422
      );
    }

    return jsonResponse({
      title,
      text: text.slice(0, 120000),
      sourceUrl: parsedUrl.toString()
    });
  } catch {
    return jsonResponse(
      { error: 'Не вдалося з’єднатися із сайтом. Спробуй скопіювати текст вручну.' },
      502
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/extract') {
      return handleExtract(request);
    }
    return env.ASSETS.fetch(request);
  }
};
