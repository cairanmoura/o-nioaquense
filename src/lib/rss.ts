/**
 * src/lib/rss.ts
 * -----------------------------------------------------------------------------
 * Integrador de RSS de agencias de noticia publicas (Agencia Brasil).
 *
 * Importante: o portal roda no Cloudflare Workers, que NAO tem DOMParser.
 * Por isso o XML e' lido com expressoes regulares (sem dependencia nova) e o
 * HTML do resumo e' limpo antes de ir para a pagina.
 */

import type { ArticleScope } from './types';

export interface RssArticle {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  image?: string;
  source: string;
}

/* -------------------------------------------------------------------------- */
/* Texto                                                                      */
/* -------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rdquo: '"',
  ldquo: '"',
  rsquo: "'",
  lsquo: "'",
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (full, name) => ENTITIES[name.toLowerCase()] ?? full);
}

export function stripHtml(value: string): string {
  // O RSS da Agencia Brasil vem com o HTML escapado (&lt;p&gt;...). Primeiro
  // desescapamos, depois removemos as tags; o contrario deixaria o HTML visivel.
  return decodeEntities(
    decodeEntities(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripCdata(value: string): string {
  return value.replace(/^\s*<!\[CDATA\[/, '').replace(/\]\]>\s*$/, '');
}

/** Corta um texto no fim de uma frase, sem deixar palavra pela metade. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}

function sentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 24);
}

/* -------------------------------------------------------------------------- */
/* XML                                                                        */
/* -------------------------------------------------------------------------- */

function takeTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? stripCdata(match[1]).trim() : '';
}

function extractImage(block: string): string | undefined {
  const candidates: string[] = [];

  // Tag propria do feed da Agencia Brasil: e' a foto de capa de verdade.
  const featured = block.match(/<imagem-destaque>([\s\S]*?)<\/imagem-destaque>/i);
  if (featured) candidates.push(featured[1].trim());

  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media) candidates.push(media[1]);

  const thumbnail = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbnail) candidates.push(thumbnail[1]);

  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) candidates.push(enclosure[1]);

  const description = decodeEntities(takeTag(block, 'description'));
  const content = decodeEntities(takeTag(block, 'content:encoded'));

  for (const html of [description, content]) {
    for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      candidates.push(img[1]);
    }
  }

  for (const candidate of candidates) {
    const url = candidate.startsWith('//') ? `https:${candidate}` : candidate;
    if (!/^https?:\/\//i.test(url)) continue;
    // Logo da agencia e pixels de rastreamento nao sao foto de materia.
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/\/ebc\.(png|gif)\?/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    return url;
  }

  return undefined;
}

function parseRSS(xml: string, sourceUrl: string): RssArticle[] {
  const articles: RssArticle[] = [];
  const sourceName =
    takeTag(xml, 'title') ||
    xml.match(/<channel>[\s\S]*?<title>([\s\S]*?)<\/title>/i)?.[1]?.trim() ||
    'Agencia Brasil';

  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const title = stripHtml(takeTag(block, 'title'));
    const link = takeTag(block, 'link');
    const rawDescription = takeTag(block, 'description');
    const pubDate = takeTag(block, 'pubDate');

    if (!title || !link) continue;

    articles.push({
      title,
      link,
      description: rawDescription,
      pubDate,
      image: extractImage(block),
      source: sourceName,
    });
  }

  if (!articles.length) {
    console.warn(`RSS ${sourceUrl}: nenhum item reconhecido`);
  }

  return articles;
}

async function fetchRSS(url: string): Promise<RssArticle[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; O Nioaquense Bot/1.0; +https://onioaquense.com)',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
      // A borda guarda o feed por 10 minutos: uma busca por pagina, nao por visita.
      cf: { cacheTtl: 600, cacheEverything: true },
    } as RequestInit & { cf: { cacheTtl: number; cacheEverything: boolean } });

    if (!response.ok) {
      console.warn(`RSS ${url}: status ${response.status}`);
      return [];
    }

    return parseRSS(await response.text(), url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`RSS ${url}: erro ao buscar - ${msg}`);
    return [];
  }
}

/**
 * Feeds configurados. A Agencia Brasil mudou os enderecos em 2025; os antigos
 * (`/rss/ultimas-noticias.xml`) devolvem 404.
 */
const RSS_FEEDS: { url: string; scope: ArticleScope; sourceName: string }[] = [
  {
    url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
    scope: 'brasil',
    sourceName: 'Agência Brasil',
  },
];

/** Busca os feeds e devolve os itens mais recentes. */
export async function fetchRSSArticles(limit = 8): Promise<RssArticle[]> {
  const all: RssArticle[] = [];

  for (const feed of RSS_FEEDS) {
    const articles = await fetchRSS(feed.url);
    for (const article of articles) {
      all.push({ ...article, source: feed.sourceName });
    }
  }

  return all.slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Conversao para o formato do portal                                         */
/* -------------------------------------------------------------------------- */

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * Converte um item de RSS em materia do portal.
 *
 * O portal NAO republica o texto da agencia: mostra a chamada, a foto com
 * credito e um link para a materia original. Isso e' o correto editorialmente
 * e evita duplicacao de conteudo.
 */
export function rssToArticle(
  rss: RssArticle,
  scope: ArticleScope = 'brasil',
): import('./types').Article {
  const clean = stripHtml(rss.description);
  const bullets = sentences(clean).slice(0, 3);
  const lead = bullets.length ? bullets.join(' ') : clean;
  const slug = `rss-${slugify(rss.title)}-${slugify(new URL(rss.link).hostname.split('.').slice(-2).join('-'))}`;

  return {
    id: slug,
    title: rss.title,
    subtitle: truncate(lead, 180) || null,
    slug,
    summary_bullets: bullets.length ? bullets : [truncate(clean, 160)],
    content: [
      `<p>${escapeHtml(truncate(lead, 700))}</p>`,
      `<p>Leia a matéria completa na <a href="${escapeHtml(rss.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(rss.source)}</a>.</p>`,
    ].join(''),
    cover_image_url: rss.image ?? getArteFallback(scope),
    cover_image_caption: rss.image ? `Foto: ${rss.source}` : null,
    scope,
    local_tags: [],
    category_label: rss.source,
    is_featured: false,
    is_breaking: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 0,
    published_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    created_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    updated_at: rss.pubDate ? new Date(rss.pubDate).toISOString() : new Date().toISOString(),
    source_name: rss.source,
    source_url: rss.link,
  };
}

/** Lista de artes disponiveis como fallback por escopo. */
const ARTE_FALLBACK: Record<ArticleScope, string> = {
  nioaque: '/artes-nioarquense/arte-agro-campo.svg',
  regiao: '/artes-nioarquense/arte-cultura-9gac.svg',
  ms: '/artes-nioarquense/arte-prefeitura-obras.svg',
  brasil: '/artes-nioarquense/arte-cultura-9gac.svg',
  coluna: '/artes-nioarquense/arte-educacao.svg',
  radar_oficial: '/artes-nioarquense/arte-seguranca-plantao.svg',
};

export function getArteFallback(scope: ArticleScope): string {
  return ARTE_FALLBACK[scope] ?? '/artes-nioarquense/arte-cultura-9gac.svg';
}

/**
 * As artes geometricas oficiais sao capas de template: a caixa branca central
 * fica vazia quando usadas como imagem. Elas nao contam como foto de materia.
 */
const BLANK_COVER = /^\/(?:covers|artes-nioarquense)\/(?:cap-\d+|arte-[a-z0-9-]+)\.svg$/i;

export function isPhotoCover(url: string | null | undefined): url is string {
  return Boolean(url && !BLANK_COVER.test(url));
}

/* -------------------------------------------------------------------------- */
/* Extracao avançada de fotos reais (Etapa 3)                                 */
/* -------------------------------------------------------------------------- */

/** Resolve uma URL relativa (começando com /) para absoluta usando o domínio da fonte. */
export function resolveImageUrl(url: string, sourceUrl: string): string {
  try {
    if (/^https?:\/\//i.test(url)) return url;
    if (url.startsWith('//')) return `https:${url}`;
    if (url.startsWith('/')) {
      const base = new URL(sourceUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    // Caminho relativo simples: junta ao domínio
    const base = new URL(sourceUrl);
    return `${base.protocol}//${base.host}/${url.replace(/^\//, '')}`;
  } catch {
    return url;
  }
}

/** Extrai a imagem de um item RSS (media:content, enclosure, thumbnail, img no description/content:encoded). */
export function extractRssImage(block: string, sourceUrl: string): string | undefined {
  const candidates: string[] = [];

  // media:content
  const media = block.match(/<media:content[^>]+url=["']([^"']+)["']/i);
  if (media) candidates.push(media[1]);

  // media:thumbnail
  const thumbnail = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (thumbnail) candidates.push(thumbnail[1]);

  // enclosure
  const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/i);
  if (enclosure) candidates.push(enclosure[1]);

  // imagem-destaque (Agência Brasil)
  const featured = block.match(/<imagem-destaque>([\s\S]*?)<\/imagem-destaque>/i);
  if (featured) candidates.push(featured[1].trim());

  // img dentro de description / content:encoded
  const description = decodeEntities(takeTag(block, 'description'));
  const content = decodeEntities(takeTag(block, 'content:encoded'));
  for (const html of [description, content]) {
    for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
      candidates.push(img[1]);
    }
  }

  for (const candidate of candidates) {
    const url = resolveImageUrl(candidate, sourceUrl);
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/\/ebc\.(png|gif)\?/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    return url;
  }

  return undefined;
}

/**
 * Busca o HTML da URL original da notícia e extrai a melhor imagem de capa,
 * seguindo a ordem de prioridade:
 *   1) <meta property="og:image" content="...">
 *   2) <meta name="twitter:image" content="...">
 *   3) Primeira <img> dentro de <article> ou <figure>
 *   4) Primeira <img> principal do corpo
 */
export async function fetchHtmlCoverImage(
  articleUrl: string,
  sourceUrl: string,
): Promise<{ url: string | null; caption: string | null }> {
  try {
    const response = await fetch(articleUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    } as RequestInit);

    if (!response.ok) return { url: null, caption: null };
    const html = await response.text();

    // 1) og:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    if (ogMatch) {
      const url = resolveImageUrl(ogMatch[1], sourceUrl);
      return { url, caption: extractCaption(html, ogMatch[1]) };
    }

    // 2) twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (twMatch) {
      const url = resolveImageUrl(twMatch[1], sourceUrl);
      return { url, caption: extractCaption(html, twMatch[1]) };
    }

    // 3) primeira imagem dentro de <article> ou <figure>
    const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
    const figureMatch = html.match(/<figure[\s\S]*?<\/figure>/i);
    const blocks = [articleMatch?.[0], figureMatch?.[0]].filter((b): b is string => Boolean(b));
    for (const block of blocks) {
      const imgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch?.[1]) {
        const url = resolveImageUrl(imgMatch[1], sourceUrl);
        const caption = extractCaption(block, imgMatch[1]);
        return { url, caption };
      }
    }

    // 4) primeira imagem qualquer do corpo (sem ser ícone/logo)
    const anyImg = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (anyImg?.[1]) {
      const url = resolveImageUrl(anyImg[1], sourceUrl);
      if (!/logo|icon|\.(svg|gif)(\?|$)/i.test(url)) {
        return { url, caption: extractCaption(html, anyImg[1]) };
      }
    }

    return { url: null, caption: null };
  } catch {
    return { url: null, caption: null };
  }
}

/** Extrai legenda/crédito da foto: figcaption, alt da imagem, ou fallback "Foto: Reprodução / [Fonte]". */
export function extractCaption(html: string, imageUrl: string, sourceName = 'Fonte'): string {
  // Tenta figcaption próxima à imagem
  const figCaption = html.match(
    new RegExp(`<figure[\\s\\S]*?<img[^>]+src=["']${escapeRegExp(imageUrl)}["'][\\s\\S]*?<figcaption[^>]*>([\\s\\S]*?)<\\/figcaption>`, 'i'),
  );
  if (figCaption) {
    const text = stripHtml(figCaption[1]).trim();
    if (text) return text;
  }

  // Tenta alt da própria imagem
  const altMatch = html.match(
    new RegExp(`<img[^>]+src=["']${escapeRegExp(imageUrl)}["'][^>]*alt=["']([^"']*)["']`, 'i'),
  );
  if (altMatch) {
    const text = stripHtml(altMatch[1]).trim();
    if (text) return `Foto: ${text}`;
  }

  return `Foto: Reprodução / ${sourceName}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrai todas as imagens internas de um HTML (para inclusão no corpo da matéria).
 * Retorna array de { url, caption }.
 */
export function extractInternalImages(html: string, sourceUrl: string, sourceName: string): Array<{ url: string; caption: string }> {
  const images: Array<{ url: string; caption: string }> = [];
  const seen = new Set<string>();

  for (const img of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    let url = img[1];
    url = resolveImageUrl(url, sourceUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (/\.(svg|gif)(\?|$)/i.test(url)) continue;
    if (/logo/i.test(url)) continue;
    if (/\/pixel|tracking|\d{1,3}x\d{1,3}/i.test(url)) continue;

    const caption = extractCaption(html, img[1], sourceName);
    images.push({ url, caption });
  }

  return images;
}

/* -------------------------------------------------------------------------- */
/* Classificacao geografica e tematica (Etapa 4)                              */
/* -------------------------------------------------------------------------- */

/** Cidades e locais da regiao de Nioaque (MS) usados na deteccao por conteudo. */
export const REGION_CITIES: string[] = [
  'Jardim',
  'Guia Lopes da Laguna',
  'Bonito',
  'Anastacio',
  'Anastácio',
  'Aquidauana',
  'Sidrolandia',
  'Sidrolândia',
  'Maracaju',
  'Dois Irmãos do Buriti',
  'Dois Irmãos do Buriti'.replace('ã', 'a'),
  'Miranda',
  'Bodoquena',
  'Porto Murtinho',
  'Rota Bioceania',
  'Rota Bioceânica',
  'BR-060',
  'BR-419',
];

/** Fontes estaduais (usadas como fallback quando nao ha Nioaque nem regiao). */
const STATE_SOURCES: Record<string, boolean> = {
  'G1 Mato Grosso do Sul': true,
  'Campo Grande News': true,
  'Midiamax': true,
  'Agencia de Noticias de MS': true,
  'Agência de Notícias de MS': true,
};

/** Fontes nacionais. */
const NATIONAL_SOURCES: Record<string, boolean> = {
  'Agencia Brasil / EBC': true,
  'Agência Brasil': true,
};

/** Normaliza uma string para comparacao (remove acentos, espacos duplos). */
export function normCity(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta "Nioaque" e cidades da constante REGION_CITIES no texto.
 * Devolve array de local_tags (sem duplicatas, ordem de aparecimento).
 */
export function detectLocalTags(text: string): string[] {
  const haystack = normCity(text);
  const tags: string[] = [];
  const seen = new Set<string>();

  const nioaqueNorm = normCity('Nioaque');
  if (haystack.includes(nioaqueNorm) && !seen.has(nioaqueNorm)) {
    tags.push('Nioaque');
    seen.add(nioaqueNorm);
  }

  for (const city of REGION_CITIES) {
    const cn = normCity(city);
    if (haystack.includes(cn) && !seen.has(cn)) {
      tags.push(city);
      seen.add(cn);
    }
  }

  return tags;
}

/**
 * Roteamento de escopo baseado nas regras de proximidade geografica.
 *
 * Regras:
 *  a) Se encontrou "Nioaque": scope = 'nioaque'
 *  b) Se NAO encontrou Nioaque, mas encontrou cidade da regiao: scope = 'regiao'
 *  c) Se NAO encontrou nenhum dos dois, mas fonte estadual: scope = 'ms'
 *  d) Se for Agencia Brasil: scope = 'brasil'
 */
export function routeScope(
  localTags: string[],
  sourceName: string,
  defaultFallback: ArticleScope = 'ms',
): ArticleScope {
  const hasNioaque = localTags.some((t) => normCity(t) === normCity('Nioaque'));
  const hasRegion = localTags.length > 0 && !hasNioaque;

  if (hasNioaque) return 'nioaque';
  if (hasRegion) return 'regiao';
  if (STATE_SOURCES[sourceName ?? '']) return 'ms';
  if (NATIONAL_SOURCES[sourceName ?? '']) return 'brasil';
  return defaultFallback;
}

/**
 * Detecta a editoria tematica com base em palavras-chave do titulo.
 */
export function detectCategory(title: string): string {
  const t = title.toLowerCase();

  const themes: Array<{ keywords: string[]; label: string }> = [
    { keywords: ['policial', 'polícia', 'homicidio', 'assassinato', 'prisao', 'prisão', 'fuzil', 'revolver', 'droga', 'trafico', 'tráfico', 'roubo', 'frota', 'facao', 'facção'], label: 'Polícia' },
    { keywords: ['agro', 'agricultura', 'lavoura', 'fazenda', 'produtor rural', 'plantio', 'colheita', 'boi', 'gado', 'soja', 'milho', 'pecuaria'], label: 'Agro' },
    { keywords: ['prefeitura', 'camara', 'câmara', 'vereador', 'prefeito', 'projeto de lei', 'sessao', 'sessão', 'legislativo', 'executivo', 'edital', 'concurso publico'], label: 'Política' },
    { keywords: ['saude', 'saúde', 'hospital', 'ubs', 'vacina', 'vacinacao', 'vacinação', 'medico', 'médico', 'enfermagem', 'epidemia', 'dengue'], label: 'Saúde' },
    { keywords: ['futebol', 'time', 'campeonato', 'esporte', 'atleta', 'jogo', 'partida', 'torcida', 'estadio'], label: 'Esporte' },
    { keywords: ['cultura', 'festival', 'show', 'musica', 'música', 'teatro', 'exposicao', 'exposição', 'artista', 'livro'], label: 'Cultura' },
  ];

  for (const theme of themes) {
    if (theme.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return theme.label;
    }
  }

  return 'Geral';
}
