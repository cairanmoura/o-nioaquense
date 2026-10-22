/**
 * src/lib/rss.ts
 * -----------------------------------------------------------------------------
 * Integrador de RSS de agencias de noticao publicas (Agencia Brasil, etc).
 *
 * Busca feeds RSS, converte para o formato Article do portal e prioriza
 * materias com fotos reais para uso como capa.
 */

export interface RssArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  content?: string;
  image?: string;
  source: string;
}

/**
 * Busca e parseia um feed RSS.
 * Usa a API rss-to-json ou parseia XML diretamente.
 */
async function fetchRSS(url: string): Promise<RssArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; O Nioaquense Bot/1.0; +https://onioaquense.com)',
      },
    });

    if (!response.ok) {
      console.warn(`RSS ${url}: status ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSS(xml, url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`RSS ${url}: erro ao buscar - ${msg}`);
    return [];
  }
}

/**
 * Parseia XML de RSS (RSS 2.0) para o formato interno.
 */
function parseRSS(xml: string, sourceUrl: string): RssArticle[] {
  const articles: RssArticle[] = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const items = doc.querySelectorAll('item');
    const sourceName = extractSourceName(doc);

    for (const item of items) {
      const title = item.querySelector('title')?.textContent?.trim() ?? '';
      const link = item.querySelector('link')?.textContent?.trim() ?? '';
      const description =
        item.querySelector('description')?.textContent?.trim() ?? '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() ?? '';

      // Tenta extrair imagem de media:content ou enclosure
      let image: string | undefined;

      const mediaContent = item.querySelector('media\\:content');
      if (mediaContent?.getAttribute('url')) {
        image = mediaContent.getAttribute('url') ?? undefined;
      }

      const enclosure = item.querySelector('enclosure');
      const encUrl = enclosure?.getAttribute('url');
      if (!image && encUrl?.match(/\.(jpg|jpeg|png|webp)$/i)) {
        image = encUrl;
      }

      // Tenta extrair imagem do content:encoded
      if (!image) {
        const contentEncoded = item.querySelector('content\\:encoded');
        if (contentEncoded?.textContent) {
          const imgMatch = contentEncoded.textContent.match(
            /<img[^>]+src=["']([^"']+)["']/i,
          );
          if (imgMatch) image = imgMatch[1];
        }
      }

      if (title && link) {
        articles.push({
          title,
          link,
          description,
          pubDate,
          content: description,
          image,
          source: sourceName,
        });
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`RSS ${sourceUrl}: erro ao parsear - ${msg}`);
  }

  return articles;
}

/**
 * Extrai o nome da fonte do canal RSS.
 */
function extractSourceName(doc: Document): string {
  const title = doc.querySelector('channel > title')?.textContent?.trim();
  return title ?? 'Fonte RSS';
}

/**
 * Feeds RSS configurados (agencias publicas brasileiras).
 */
const RSS_FEEDS: { url: string; scope: ArticleScope; sourceName: string }[] = [
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimas-noticias.xml',
    scope: 'brasil',
    sourceName: 'Agência Brasil',
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/politica.xml',
    scope: 'brasil',
    sourceName: 'Agência Brasil - Política',
  },
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/economia.xml',
    scope: 'brasil',
    sourceName: 'Agência Brasil - Economia',
  },
];

type ArticleScope = 'nioaque' | 'ms' | 'brasil' | 'coluna' | 'radar_oficial';

/**
 * Busca todas as feeds RSS e retorna artigos normalizados.
 * Limita a quantidade para nao sobrecarregar.
 */
export async function fetchRSSArticles(): Promise<RssArticle[]> {
  const allArticles: RssArticle[] = [];

  for (const feed of RSS_FEEDS) {
    const articles = await fetchRSS(feed.url);
    for (const article of articles) {
      allArticles.push({
        ...article,
        source: feed.sourceName,
      });
    }
    // Pequeno delay entre requisicoes
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return allArticles.slice(0, 20);
}

/**
 * Converte um artigo RSS para o formato Article do portal.
 * Se nao houver imagem, usa uma arte geometrica como capa.
 */
export function rssToArticle(
  rss: RssArticle,
  scope: ArticleScope = 'brasil',
): import('./types').Article {
  const slug = rss.link
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .slice(0, 80);

  // Mapeia fonte para escopo se ainda nao definido
  const articleScope = scope;

  // Se nao tem imagem real, usa arte geometrica como fallback
  const coverImage =
    rss.image ??
    `/artes-nioarquense/arte-${scope === 'brasil' ? 'cultura-9gac' : scope}.svg`;

  return {
    id: `rss-${slug}`,
    title: rss.title,
    subtitle: rss.description.slice(0, 160),
    slug: `rss-${slug}`,
    summary_bullets: [rss.description.slice(0, 100)],
    content: `<p>${rss.content ?? rss.description}</p><p><small>Fonte: ${rss.source}</small></p>`,
    cover_image_url: coverImage,
    cover_image_caption: `Foto: ${rss.source}`,
    scope: articleScope,
    category_label: rss.source,
    is_featured: false,
    is_breaking: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 0,
    published_at: rss.pubDate ?? new Date().toISOString(),
    created_at: rss.pubDate ?? new Date().toISOString(),
    updated_at: rss.pubDate ?? new Date().toISOString(),
  };
}

/**
 * Lista de artes disponiveis como fallback por escopo.
 */
const ARTE_FALLBACK: Record<ArticleScope, string> = {
  nioaque: '/artes-nioarquense/arte-agro-campo.svg',
  ms: '/artes-nioarquense/arte-prefeitura-obras.svg',
  brasil: '/artes-nioarquense/arte-cultura-9gac.svg',
  coluna: '/artes-nioarquense/arte-educacao.svg',
  radar_oficial: '/artes-nioarquense/arte-seguranca-plantao.svg',
};

export function getArteFallback(scope: ArticleScope): string {
  return ARTE_FALLBACK[scope] ?? '/artes-nioarquense/arte-cultura-9gac.svg';
}
