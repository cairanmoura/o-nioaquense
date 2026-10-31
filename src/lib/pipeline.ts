/**
 * pipeline.ts - extracao de noticias dividida em tarefas pequenas para a fila
 * (Cloudflare Queues).
 *
 * O plano gratis do Workers limita cada invocacao a ~10 ms de CPU e 50
 * subrequests. Em vez de uma execucao gigante, o trabalho vira mensagens:
 *
 *   sweep   -> lista as fontes ativas e enfileira 1 mensagem `source` por fonte
 *   source  -> baixa o feed/pagina inicial, descobre materias NOVAS e enfileira
 *              1 mensagem `article` por materia (so o link, sem baixar a pagina)
 *   article -> 1 materia por invocacao: pagina -> IA -> imagem -> insert
 *   quotes  -> atualiza dolar/boi/soja
 *
 * Quem consome as mensagens fica em src/worker.ts (handler `queue`).
 */

import { createClient } from '@supabase/supabase-js';
import {
  fetchHtmlCoverImage,
  getArteFallback,
  isPhotoCover,
  detectLocalTags,
  detectCategory,
  normCity,
  stripHtml,
  isGoogleNewsFeed,
  parseGoogleNewsItems,
  resolveGoogleNewsUrl,
  discoverSitemapUrls,
  fetchGoogleNewsFeed,
  isBingNewsFeed,
  parseBingNewsItems,
} from './rss';
import { normalizeCategory } from './categories';
import { classifyScope } from './geo';
import { blockedByViolencePolicy, violenceInfo } from './importance';
import { fetchPageHtml, extractArticleLinks, parseArticlePage, BROWSER_HEADERS } from './scraper';
import { cleanTitle } from './format';
import { sanitizeArticleHtml, assessQuality, htmlToText } from './clean-content';
import { extractArticle, fetchViaJina, isLogoImage, type ExtractedArticle } from './extractor';
import { mirrorImageToStorage } from './media';
import { rewriteArticle } from './rewrite';
import { parseFeedItems } from './feed';
import { refreshDollarQuote, refreshAgroQuotes } from './quotes';
import type { ArticleScope } from './types';

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/** Dados minimos de uma materia a processar (cabem folgado nos 128 KB da mensagem). */
export interface QueueEntry {
  title?: string | null;
  link: string;
  rawDesc?: string | null;
  pubDate?: string | null;
  rssImage?: string | null;
  /** Veiculo real (Google/Bing News declaram o portal de origem). */
  publisherName?: string | null;
  /** Link de redirect do Google News: resolver antes de baixar. */
  needsResolution?: boolean;
  /** Link ja real, mas a pagina precisa ser baixada (Bing News, scraper, sitemap). */
  needsPageFetch?: boolean;
  /** Veio de Bing/Google News: o veiculo real e' o credito, nunca o nome da busca. */
  aggregator?: boolean;
}

export type NewsJob =
  | { type: 'sweep'; backfill?: boolean }
  | { type: 'source'; sourceId: string; backfill?: boolean }
  | { type: 'article'; sourceId: string; entry: QueueEntry }
  | { type: 'quotes' };

export interface ProcessOutcome {
  /** retry = falha temporaria (IA fora do ar etc.): a fila tenta de novo mais tarde. */
  status: 'inserted' | 'skipped' | 'retry';
  reason?: string;
  title?: string;
  held?: boolean;
}

const DEFAULT_AUTHOR_ID = '10000000-0000-4000-8000-000000000001';
/** Materias novas enfileiradas por fonte a cada varredura (o resto entra na proxima). */
const MAX_NEW_PER_SOURCE = 8;
const MAX_NEW_BACKFILL = 30;
/** So entram materias publicadas nos ultimos 30 dias (data do veiculo original). */
const MAX_AGE_DAYS = 30;

const PUBLISHERS: Record<string, string> = {
  'opantaneiro.com.br': 'O Pantaneiro',
  'campograndenews.com.br': 'Campo Grande News',
  'midiamax.com.br': 'Midiamax',
  'topmidianews.com.br': 'TopMídiaNews',
  'g1.globo.com': 'g1',
  'correiodoestado.com.br': 'Correio do Estado',
  'primeirapagina.com.br': 'Primeira Página',
  'agenciadenoticias.ms.gov.br': 'Agência de Notícias MS',
  'agenciabrasil.ebc.com.br': 'Agência Brasil',
  'infomoney.com.br': 'InfoMoney',
  'ms.gov.br': 'Governo de MS',
  'campograndenews.com': 'Campo Grande News',
};

/** Nome do veiculo a partir do endereco (ex.: opantaneiro.com.br -> O Pantaneiro). */
export function publisherFromHost(link: string): string | null {
  let h: string;
  try {
    h = new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const [k, v] of Object.entries(PUBLISHERS)) if (h === k || h.endsWith('.' + k)) return v;
  return h;
}

/** Bing/Google embrulham o link real em apiclick/redirect: devolve a URL do veiculo. */
function unwrapAggregatorUrl(link: string): string {
  try {
    const u = new URL(link);
    if (/bing\.com$/i.test(u.hostname)) {
      const real = u.searchParams.get('url');
      if (real && /^https?:/i.test(real)) return real;
    }
  } catch {
    /* mantem */
  }
  return link;
}

const isFresh = (iso: string | null | undefined) => {
  if (!iso) return true; // sem data: decide depois, com a pagina
  const t = new Date(iso).getTime();
  return Number.isNaN(t) || t >= Date.now() - MAX_AGE_DAYS * 86400000;
};

/* -------------------------------------------------------------------------- */
/* Utilitarios                                                                */
/* -------------------------------------------------------------------------- */

export function makeServiceClient(env: Record<string, any>) {
  const url = env?.SUPABASE_URL || env?.PUBLIC_SUPABASE_URL;
  const key = env?.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(String(url).trim(), String(key).trim(), { auth: { persistSession: false } });
}

const slugify = (title: string) =>
  title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

/** Similaridade (0-1) entre dois titulos pelas palavras significativas (>= 4 letras). */
export function titleSimilarity(a: string, b: string): number {
  const tok = (t: string) =>
    new Set(
      t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4),
    );
  const A = tok(a);
  const B = tok(b);
  if (A.size < 3 || B.size < 3) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  // Jaccard, exigindo ao menos 4 palavras em comum: evita juntar fatos diferentes da mesma cidade
  return inter >= 4 ? inter / (A.size + B.size - inter) : 0;
}

const hostOf = (u: string): string | null => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** Grava o ultimo recado da fonte; ignora erro (coluna pode nao existir ainda - migracao 014). */
export async function noteSource(supabase: any, sourceId: string, patch: Record<string, unknown>) {
  try {
    const { error } = await supabase.from('news_sources').update(patch).eq('id', sourceId);
    // Sem a migracao 014 as colunas de recado nao existem: grava so o que ja existia
    if (error && 'last_fetched_at' in patch) {
      await supabase.from('news_sources').update({ last_fetched_at: patch.last_fetched_at }).eq('id', sourceId);
    }
  } catch {
    /* sem rede: so informativo */
  }
}

function keywordMatcher(source: any) {
  const keywords: string[] =
    source.keywords_filter
      ?.split(',')
      .map((k: string) => k.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return (text: string): boolean => {
    if (keywords.length === 0) return true;
    const lower = text.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  };
}

/* -------------------------------------------------------------------------- */
/* Etapa 1 - sweep: uma mensagem por fonte                                    */
/* -------------------------------------------------------------------------- */

export async function sweepSources(supabase: any): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('news_sources')
    .select('id, name')
    .eq('is_active', true)
    // Rodizio justo: a fonte atendida ha mais tempo (ou nunca) vai primeiro
    .order('last_fetched_at', { ascending: true, nullsFirst: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Etapa 2 - source: descobre materias novas (sem baixar as paginas)          */
/* -------------------------------------------------------------------------- */

export async function discoverSource(
  supabase: any,
  source: any,
  opts: { backfill?: boolean } = {},
): Promise<{ entries: QueueEntry[]; skipped: number; note?: string }> {
  const isScraper = (source.source_type ?? 'rss') === 'html_scraper';
  const matches = keywordMatcher(source);
  let entries: QueueEntry[] = [];
  let skipped = 0;

  if (isScraper) {
    const homeHtml = await fetchPageHtml(source.rss_url);
    if (!homeHtml) throw new Error(`Falha ao baixar a pagina inicial de ${source.name}`);
    const links = await extractArticleLinks(homeHtml, source.rss_url, opts.backfill ? 30 : 14);
    entries = links.map((link) => ({ link, needsPageFetch: true }));
  } else {
    const gnews = isGoogleNewsFeed(source.rss_url);
    const bing = isBingNewsFeed(source.rss_url);
    let xml = '';
    let feedNote = '';

    // Varias paginas do mesmo feed (so no "povoar": ultimo mes). Bing: &first=11,21...; WordPress: &paged=2...
    const xmls: string[] = [];

    if (gnews) {
      const gurl = opts.backfill ? source.rss_url.replace(/when:\d+[dh]/i, 'when:30d') : source.rss_url;
      xml = await fetchGoogleNewsFeed(gurl, 40);
      if (!xml) feedNote = 'Google News recusou o Worker e todos os proxies';
      else xmls.push(xml);
    } else {
      const pages = opts.backfill ? (bing ? 6 : 5) : 1;
      for (let pg = 0; pg < pages; pg++) {
        let url = source.rss_url as string;
        if (pg > 0) {
          const sep = url.includes('?') ? '&' : '?';
          url = bing ? `${url}${sep}first=${pg * 10 + 1}` : `${url}${sep}paged=${pg + 1}`;
        }
        try {
          const res = await fetch(url, {
            headers: {
              ...BROWSER_HEADERS,
              Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
            },
          });
          if (!res.ok) {
            if (pg === 0) feedNote = `HTTP ${res.status}`;
            break;
          }
          const text = await res.text();
          if (pg === 0) xml = text;
          if (!/<(item|entry)\b/i.test(text)) break;
          xmls.push(text);
        } catch (e: any) {
          if (pg === 0) feedNote = String(e?.message ?? e).slice(0, 120);
          break;
        }
      }
    }

    const seenLinks = new Set<string>();
    for (const x of xmls) {
      if (gnews) {
        for (const it of parseGoogleNewsItems(x, 40)) {
          if (seenLinks.has(it.link)) continue;
          seenLinks.add(it.link);
          entries.push({ title: it.title, link: it.link, pubDate: it.pubDate, needsResolution: true, aggregator: true, publisherName: it.sourceName });
        }
      } else if (bing) {
        for (const it of parseBingNewsItems(x, 15)) {
          const link = unwrapAggregatorUrl(it.link);
          if (seenLinks.has(link)) continue;
          seenLinks.add(link);
          entries.push({ title: it.title, link, rawDesc: it.description?.slice(0, 6000) ?? null, pubDate: it.pubDate, needsPageFetch: true, aggregator: true, publisherName: it.sourceName });
        }
      } else {
        for (const it of parseFeedItems(x, 30)) {
          if (seenLinks.has(it.link)) continue;
          seenLinks.add(it.link);
          const d = it.pubDate ? new Date(it.pubDate) : null;
          entries.push({ title: it.title, link: it.link, rawDesc: it.description?.slice(0, 6000) ?? null, pubDate: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null, rssImage: it.image });
        }
      }
    }

    // Feed vazio/fora do ar -> sitemap (link apenas; a pagina e' baixada no job da materia)
    if (entries.length === 0) {
      const urls = await discoverSitemapUrls(source.rss_url, 12);
      entries = urls.slice(0, 8).map((link) => ({ link, needsPageFetch: true }));
      if (entries.length === 0) {
        throw new Error(
          xml ? 'Feed sem itens e sitemap sem URLs de materias' : `Feed indisponivel (${feedNote || 'sem resposta'}) e sitemap sem materias`,
        );
      }
    }
  }

  // Janela de 30 dias (data do veiculo original) e diretriz de violencia (so no titulo, antes de gastar IA)
  entries = entries.filter((e) => {
    if (!isFresh(e.pubDate)) {
      skipped++;
      return false;
    }
    if (e.title && blockedByViolencePolicy({ title: e.title, text: e.rawDesc ?? '', mentionsNioaque: /nioaque/i.test(`${e.title} ${e.rawDesc ?? ''}`) })) {
      skipped++;
      return false;
    }
    return true;
  });

  // Filtro de palavras-chave onde ja da para decidir (titulo/descricao do feed).
  // Itens so com link (scraper, sitemap, redirect do Google) filtram depois, com o corpo.
  entries = entries.filter((e) => {
    if (!e.title || e.needsResolution) return true;
    const ok = matches(e.title) || (e.rawDesc ? matches(e.rawDesc) : false);
    // Sem palavras-chave configuradas matches() e' sempre true; com filtro, itens de
    // agregadores (needsPageFetch) esperam o corpo
    if (!ok && e.needsPageFetch) return true;
    if (!ok) skipped++;
    return ok;
  });

  // Ja existentes (link ou slug): 2 queries em lote
  if (entries.length > 0) {
    const links = entries.map((e) => e.link);
    const { data: linkRows } = await supabase.from('articles').select('source_url').in('source_url', links);
    const haveLink = new Set((linkRows ?? []).map((r: any) => r.source_url));
    const slugs = [...new Set(entries.filter((e) => e.title).map((e) => slugify(e.title as string)))];
    let haveSlug = new Set<string>();
    if (slugs.length) {
      const { data: slugRows } = await supabase.from('articles').select('slug').in('slug', slugs);
      haveSlug = new Set((slugRows ?? []).map((r: any) => r.slug));
    }
    const before = entries.length;
    entries = entries.filter((e) => !haveLink.has(e.link) && !(e.title && haveSlug.has(slugify(e.title))));
    skipped += before - entries.length;
  }

  return { entries: entries.slice(0, opts.backfill ? MAX_NEW_BACKFILL : MAX_NEW_PER_SOURCE), skipped };
}

/* -------------------------------------------------------------------------- */
/* Etapa 3 - article: uma materia por invocacao                               */
/* -------------------------------------------------------------------------- */

/**
 * Pagina -> texto limpo. O parse com linkedom + Readability custa dezenas de ms
 * de CPU (o plano gratis permite ~10 ms por invocacao), entao por padrao o
 * Jina Reader faz esse trabalho fora do Worker. Com plano pago, defina
 * EXTRACT_PREFER=local para extrair no proprio Worker.
 */
async function loadArticle(link: string, siteName: string, env: any): Promise<{ ex: ExtractedArticle | null; html: string | null }> {
  const preferLocal = String(env?.EXTRACT_PREFER ?? 'jina').toLowerCase() === 'local';

  if (!preferLocal) {
    const jina = await fetchViaJina(link);
    if (jina && jina.text.length >= 300) return { ex: jina, html: null };
  }
  const html = await fetchPageHtml(link);
  if (html) {
    const ex = extractArticle(html, link, siteName);
    if (ex.text.length >= 300) return { ex, html };
    if (preferLocal) {
      const jina = await fetchViaJina(link);
      if (jina && jina.text.length > ex.text.length) return { ex: { ...jina, title: jina.title || ex.title, coverImage: jina.coverImage ?? ex.coverImage }, html };
    }
    return { ex, html };
  }
  return { ex: null, html: null };
}

export async function processEntry(supabase: any, env: any, source: any, input: QueueEntry): Promise<ProcessOutcome> {
  const entry: QueueEntry = { ...input, link: unwrapAggregatorUrl(input.link) };
  const matches = keywordMatcher(source);

  // Revalida: outra execucao pode ter inserido esta materia
  if (entry.link) {
    const { data: dup } = await supabase.from('articles').select('id').eq('source_url', entry.link).limit(1);
    if (dup?.length) return { status: 'skipped', reason: 'ja existe' };
  }

  if (entry.needsResolution) {
    const resolved = await resolveGoogleNewsUrl(entry.link);
    if (!resolved) return { status: 'skipped', reason: 'redirect do Google News nao resolvido' };
    entry.link = resolved;
    const { data: dup2 } = await supabase.from('articles').select('id').eq('source_url', entry.link).limit(1);
    if (dup2?.length) return { status: 'skipped', reason: 'ja existe' };
  }

  const loaded = await loadArticle(entry.link, source.name, env);
  const html = loaded.html;
  let ex = loaded.ex;
  // Portal bloqueado por anti-bot (ex.: Midiamax): usa o texto do proprio feed, mas so como RASCUNHO
  let feedOnly = false;
  if ((!ex || ex.text.length < 150) && entry.rawDesc) {
    const t = htmlToText(entry.rawDesc);
    if (t.length >= 150) {
      ex = {
        title: entry.title ?? '', siteName: null, description: '', publishedAt: null, text: t,
        contentHtml: `<p>${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`, paragraphs: 1,
        coverImage: null, coverCaption: null, images: [], via: 'fallback',
      };
      feedOnly = true;
    }
  }
  if (!ex || ex.text.length < 150) return { status: 'skipped', reason: 'nao foi possivel ler a pagina da materia (portal bloqueou e o feed nao traz o texto)' };

  // Capa/legenda/data: a extracao limpa; se faltar e houver HTML, o parser do scraper completa
  let cover = ex.coverImage && !isLogoImage(ex.coverImage) ? ex.coverImage : ex.images.find((i) => !isLogoImage(i.url))?.url ?? null;
  let caption = ex.coverCaption;
  let pubDate = entry.pubDate ?? ex.publishedAt ?? null;
  let rawDesc = entry.rawDesc ?? (ex.description || null);
  if (html && (!cover || !pubDate)) {
    const parsed = parseArticlePage(html, entry.link, source.name);
    if (parsed) {
      cover = cover ?? (parsed.coverImageUrl && !isLogoImage(parsed.coverImageUrl) ? parsed.coverImageUrl : null);
      caption = caption ?? parsed.coverImageCaption ?? null;
      pubDate = pubDate ?? parsed.pubDate ?? null;
      rawDesc = rawDesc ?? (parsed.description || null);
    }
  }

  if (!isFresh(pubDate)) return { status: 'skipped', reason: 'publicada ha mais de 30 dias' };

  // Titulo: o do portal real e' mais preciso que o do agregador
  const feedTitle = entry.title ?? '';
  const title = ex.title.length >= 10 && (!feedTitle || entry.needsResolution || entry.needsPageFetch) ? ex.title : feedTitle || ex.title;
  if (!title) return { status: 'skipped', reason: 'sem titulo' };
  const slug = slugify(title);

  if (!matches(title) && !(rawDesc && matches(rawDesc)) && !matches(ex.text) && !matches(entry.link)) {
    return { status: 'skipped', reason: 'fora das palavras-chave da fonte' };
  }
  const nioaqueInText = /nioaque/i.test(`${title} ${ex.text}`);
  const blocked = blockedByViolencePolicy({ title, text: ex.text, mentionsNioaque: nioaqueInText });
  if (blocked) return { status: 'skipped', reason: blocked };

  const { data: slugDup } = await supabase.from('articles').select('id').eq('slug', slug).limit(1);
  if (slugDup?.length) return { status: 'skipped', reason: 'titulo ja publicado' };

  // Mesmo fato noticiado por outro veiculo (titulos quase iguais nas ultimas 72 h)
  const since = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
  const { data: recent } = await supabase.from('articles').select('title').gte('created_at', since).limit(300);
  if (recent?.some((r: any) => titleSimilarity(title, String(r.title ?? '')) >= 0.5)) {
    return { status: 'skipped', reason: 'mesmo fato ja publicado por outro veiculo' };
  }

  const link = entry.link;
  const scrapedText = ex.text;

  // Credito: agregadores (Google/Bing News) nao sao o veiculo; usa o portal real
  // O nome da fonte cadastrada (ex.: "Radar Nioaque Direto") e' so' o nome da busca: o credito e' o veiculo real.
  const isAggregator = Boolean(entry.aggregator || entry.needsResolution || entry.publisherName || /bing\.com|news\.google\./i.test(source.rss_url));
  const publisher: string = isAggregator
    ? entry.publisherName || (ex.siteName && !/bing|google/i.test(ex.siteName) ? ex.siteName : null) || publisherFromHost(link) || hostOf(link) || 'portal de origem'
    : source.name ?? 'portal de origem';

  // Classificacao geografica
  const fullText = `${title} ${rawDesc ?? ''} ${scrapedText.slice(0, 3000)}`;
  const localTags = detectLocalTags(fullText);

  // Imagem
  let coverImage: string | null = null;
  let coverCaption: string | null = null;
  if (source.use_original_image) {
    if (cover && /^https?:\/\//i.test(cover)) {
      coverImage = cover;
      coverCaption = caption ?? `Foto: Reproducao / ${source.name}`;
    } else if (entry.rssImage && /^https?:\/\//i.test(entry.rssImage)) {
      coverImage = entry.rssImage;
      coverCaption = `Foto: Reproducao / ${source.name}`;
    } else {
      const htmlCover = await fetchHtmlCoverImage(link, source.rss_url);
      if (htmlCover.url && !isLogoImage(htmlCover.url)) {
        coverImage = htmlCover.url;
        coverCaption = htmlCover.caption ?? `Foto: Reproducao / ${source.name}`;
      }
    }
  }
  if (!coverImage || !isPhotoCover(coverImage)) {
    coverImage = getArteFallback('ms');
    coverCaption = null;
  }

  // IA
  const hasNioaqueAndRegion =
    localTags.some((t) => normCity(t) === normCity('Nioaque')) && localTags.length > 1;
  const extraInstruction = hasNioaqueAndRegion
    ? 'Importante: Esta notícia cita Nioaque e outras cidades da região. Ao reescrever, puxe o foco narrativo do título e do primeiro parágrafo para o impacto local em Nioaque e sua conexão com as cidades vizinhas.'
    : undefined;

  const ownership: 'public' | 'private' = source.ownership === 'public' ? 'public' : 'private';
  const sourceText = scrapedText.length >= 200 ? scrapedText : htmlToText(rawDesc ?? '');
  let finalTitle = title;
  let subtitle: string | null = null;
  let summaryBullets: string[] = [];
  let content = '';
  let bodyText = '';
  let bodyParagraphs = 0;
  let aiCategory: string | null = null;
  let aiScope: string | null = null;
  let aiTags: string[] = [];
  let aiViolence: boolean | null = null;
  let aiImportance: number | null = null;
  const warnings: string[] = feedOnly ? ['portal bloqueou a leitura: texto vindo so do feed (curto)'] : [];

  if (ownership === 'private') {
    // Portal privado: reescrita TOTAL obrigatoria (nunca republica o texto original)
    try {
      const rw = await rewriteArticle({ text: sourceText, sourceName: publisher, sourceUrl: link, extraInstruction }, env);
      finalTitle = rw.title;
      subtitle = rw.subtitle;
      summaryBullets = rw.summary_bullets;
      content = rw.content_html;
      aiCategory = rw.suggested_category;
      aiScope = rw.suggested_scope;
      aiTags = rw.tags;
      aiViolence = rw.violence;
      aiImportance = rw.importance;
      warnings.push(...rw.warnings);
      const clean = sanitizeArticleHtml(rw.content_html);
      bodyText = clean.text;
      bodyParagraphs = clean.paragraphs;
    } catch (aiErr) {
      const reason = `IA: ${String((aiErr as any)?.message ?? aiErr).slice(0, 380)}`;
      await noteSource(supabase, source.id, { last_message: reason });
      return { status: 'retry', reason, title };
    }
  } else {
    // Fonte publica: mantem o texto limpo; a IA (se ligada) so gera o Direto ao Ponto
    const clean = sanitizeArticleHtml(ex.contentHtml);
    content = clean.html;
    bodyText = clean.text;
    bodyParagraphs = clean.paragraphs;
    if (clean.text.length < 400 && htmlToText(rawDesc ?? '').length >= 80) {
      const d = htmlToText(rawDesc ?? '').slice(0, 1500);
      content = `<p>${d.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</p>`;
      bodyText = d;
      bodyParagraphs = 1;
    }
    if (source.ai_rewrite) {
      try {
        const rw = await rewriteArticle({ text: sourceText, sourceName: publisher, sourceUrl: link, extraInstruction }, env);
        summaryBullets = rw.summary_bullets;
        aiCategory = rw.suggested_category;
        aiScope = rw.suggested_scope;
        aiTags = rw.tags;
        aiViolence = rw.violence;
        aiImportance = rw.importance;
      } catch (aiErr) {
        await noteSource(supabase, source.id, { last_message: `IA: ${String((aiErr as any)?.message ?? aiErr).slice(0, 380)}` });
      }
    }
  }

  // Direto ao Ponto sem IA: primeiras frases do corpo
  if (summaryBullets.length < 3) {
    const sentences = bodyText
      .split(/(?<=[.!?])\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 40 && x.length <= 220);
    const extra = sentences.filter((x) => !summaryBullets.some((b) => b.slice(0, 40) === x.slice(0, 40)));
    summaryBullets = [...summaryBullets.filter((b) => b.length >= 20), ...extra].slice(0, 3);
  }

  // Segunda checagem com o julgamento da IA (violencia + importancia 1-5)
  const blockedByAi = blockedByViolencePolicy({ title: finalTitle, text: bodyText, mentionsNioaque: nioaqueInText || localTags.includes('Nioaque'), aiViolence, aiImportance });
  if (blockedByAi) return { status: 'skipped', reason: blockedByAi, title: finalTitle };
  // Mesmo fato ja publicado (agora comparando com o titulo reescrito)
  if (recent?.some((r: any) => titleSimilarity(finalTitle, String(r.title ?? '')) >= 0.45)) {
    return { status: 'skipped', reason: 'mesmo fato ja publicado por outro veiculo', title: finalTitle };
  }

  const categoryLabel = normalizeCategory(aiCategory) || detectCategory(finalTitle, bodyText);
  // Local pelo ASSUNTO (IA + palavras-chave); a fonte so desempata quando nada indica o local
  const scope = classifyScope({
    title: finalTitle,
    text: `${bodyText} ${scrapedText.slice(0, 1500)}`,
    localTags,
    aiScope,
    fallback: source.default_scope && ['nioaque', 'regiao', 'ms', 'brasil', 'mundo'].includes(source.default_scope) ? source.default_scope : 'ms',
  }) as ArticleScope;

  // Capa espelhada no nosso Storage (evita hotlink/mixed content)
  if (coverImage && isPhotoCover(coverImage) && /^https?:\/\//i.test(coverImage)) {
    const stored = await mirrorImageToStorage(supabase, coverImage, link);
    if (stored) coverImage = stored;
  }

  content += `<p><br/></p><p>Fonte: <a href="${link}" target="_blank" rel="noopener noreferrer">${publisher}</a>.</p>`;

  // Status: publicado direto ou rascunho
  const now = new Date().toISOString();
  const quality = assessQuality({
    title: cleanTitle(finalTitle) || finalTitle,
    bodyText,
    paragraphs: bodyParagraphs,
    hasPhoto: isPhotoCover(coverImage),
    bullets: summaryBullets,
  });
  const status = ownership === 'private' || feedOnly || warnings.length ? 'draft' : source.auto_publish && quality.ok ? 'published' : 'draft';
  // Data do veiculo original (nunca a da extracao); rascunho tambem guarda, para sair com a data certa ao publicar
  const origDate = pubDate && !Number.isNaN(new Date(pubDate).getTime()) && new Date(pubDate).getTime() <= Date.now() ? new Date(pubDate).toISOString() : null;
  const publishedAt = origDate ?? (status === 'published' ? now : null);

  // Autor padrao (evita quebrar a FK quando o perfil nao existe)
  const { data: authorRow } = await supabase.from('profiles').select('id').eq('id', DEFAULT_AUTHOR_ID).maybeSingle();

  const article = {
    title: (cleanTitle(finalTitle) || finalTitle).slice(0, 200),
    subtitle,
    slug,
    summary_bullets: summaryBullets,
    content,
    cover_image_url: coverImage,
    cover_image_caption: coverCaption,
    scope,
    local_tags: localTags,
    tags: aiTags,
    category_label: categoryLabel,
    is_breaking: false,
    is_featured: false,
    author_id: authorRow ? DEFAULT_AUTHOR_ID : null,
    status,
    views_count: 0,
    published_at: publishedAt,
    source_name: publisher,
    author_name: 'Redação',
    source_url: link,
    created_at: now,
    updated_at: now,
  };

  let payload: Record<string, unknown> = { ...article };
  let insErr: { message: string } | null = null;
  // Resiliencia a migracoes nao aplicadas: remove colunas inexistentes e tenta de novo
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await supabase.from('articles').insert(payload);
    insErr = res.error;
    if (!insErr) break;
    const colMatch = insErr.message.match(/Could not find the '([^']+)' column/);
    if (colMatch) {
      delete payload[colMatch[1]];
      continue;
    }
    if (/scope|regiao/.test(insErr.message) && payload.scope && payload.scope !== 'ms') {
      payload.scope = 'ms';
      continue;
    }
    break;
  }

  if (insErr && /duplicate key|23505/i.test(insErr.message)) return { status: 'skipped', reason: 'duplicada' };
  if (insErr) {
    await noteSource(supabase, source.id, { last_message: `Insert: ${insErr.message.slice(0, 300)}` });
    return { status: 'retry', reason: `Insert: ${insErr.message}`, title };
  }
  if (warnings.length) {
    await noteSource(supabase, source.id, { last_message: `Rascunho para revisao: "${article.title.slice(0, 50)}" - ${warnings.join('; ')}` });
  }
  return { status: 'inserted', title: article.title, held: !quality.ok || warnings.length > 0 };
}

/* -------------------------------------------------------------------------- */
/* Cotacoes                                                                   */
/* -------------------------------------------------------------------------- */

export async function refreshQuotes(supabase: any) {
  await refreshDollarQuote(supabase);
  await refreshAgroQuotes(supabase);
}

/* -------------------------------------------------------------------------- */
/* Enfileiramento com escalonamento                                           */
/* -------------------------------------------------------------------------- */

/**
 * Envia mensagens em lotes de 50, escalonando a entrega (`delayStep` segundos
 * entre mensagens): suaviza o ritmo para nao estourar limites das APIs de IA.
 */
export async function enqueueJobs(queue: any, jobs: NewsJob[], delayStep = 0, baseDelay = 0): Promise<void> {
  for (let i = 0; i < jobs.length; i += 50) {
    const chunk = jobs.slice(i, i + 50).map((body, k) => ({
      body,
      ...(delayStep || baseDelay ? { delaySeconds: Math.min(baseDelay + (i + k) * delayStep, 3600) } : {}),
    }));
    await queue.sendBatch(chunk);
  }
}

/** Passo `source`: descobre e enfileira as materias novas. Devolve quantas. */
export async function runSourceJob(supabase: any, queue: any, sourceId: string, backfill = false): Promise<{ queued: number; skipped: number }> {
  const { data: source } = await supabase.from('news_sources').select('*').eq('id', sourceId).maybeSingle();
  if (!source || !source.is_active) return { queued: 0, skipped: 0 };
  try {
    const { entries, skipped } = await discoverSource(supabase, source, { backfill });
    await enqueueJobs(
      queue,
      entries.map((entry) => ({ type: 'article', sourceId, entry }) as NewsJob),
      backfill ? 5 : 6, // uma materia nova a cada ~6 s: a IA gratuita nao aguenta rajada
    );
    await noteSource(supabase, sourceId, {
      last_fetched_at: new Date().toISOString(),
      last_status: 'ok',
      last_message: `${entries.length} materia(s) nova(s) na fila, ${skipped} ja existiam/ignoradas`,
    });
    return { queued: entries.length, skipped };
  } catch (err: any) {
    // Marca a tentativa: fonte com erro nao pode ficar para sempre na frente da fila
    await noteSource(supabase, sourceId, {
      last_fetched_at: new Date().toISOString(),
      last_status: 'erro',
      last_message: String(err?.message ?? err).slice(0, 400),
    });
    return { queued: 0, skipped: 0 };
  }
}
