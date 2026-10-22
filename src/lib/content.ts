/**
 * Camada de conteudo do portal.
 *
 * Regra: se o Supabase estiver configurado e responder, lemos do banco;
 * caso contrario, caimos nos dados mock de `src/lib/mock-data.ts`.
 * Assim da para ver o site funcionando antes de ter as chaves de producao.
 */

import type { PostgrestFilterBuilder, SupabaseClient } from '@supabase/supabase-js';

import { mockReaderSubmissions } from './mock-data';
import { mockLotteryResults, mockMarketQuotes } from './mock-data';
import { demoStore } from './demo-store';
import { isAdLive, pickLiveAd } from './ads';
import { fetchRSSArticles, rssToArticle } from './rss';
import type {
  AdSlotPosition,
  Article,
  ArticleScope,
  LocalAd,
  LotteryResult,
  MarketQuote,
  Profile,
  PublicUtility,
  ReaderSubmission,
} from './types';

export type DataSource = 'supabase' | 'mock';

/* -------------------------------------------------------------------------- */
/* Normalizadores                                                            */
/* -------------------------------------------------------------------------- */

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeArticle(row: Record<string, unknown>): Article {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    slug: String(row.slug ?? ''),
    summary_bullets: toStringArray(row.summary_bullets),
    content: String(row.content ?? ''),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    cover_image_caption: row.cover_image_caption ? String(row.cover_image_caption) : null,
    scope: (row.scope ?? 'nioaque') as ArticleScope,
    category_label: row.category_label ? String(row.category_label) : null,
    is_breaking: Boolean(row.is_breaking),
    is_featured: Boolean(row.is_featured),
    author_id: row.author_id ? String(row.author_id) : '',
    status: (row.status ?? 'draft') as Article['status'],
    views_count: Number(row.views_count ?? 0),
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeUtility(row: Record<string, unknown>): PublicUtility {
  return {
    id: String(row.id),
    duty_date: String(row.duty_date ?? ''),
    pharmacy_name: String(row.pharmacy_name ?? ''),
    pharmacy_phone: row.pharmacy_phone ? String(row.pharmacy_phone) : null,
    pharmacy_address: row.pharmacy_address ? String(row.pharmacy_address) : null,
    alert_active: Boolean(row.alert_active),
    alert_message: row.alert_message ? String(row.alert_message) : null,
    alert_level: (row.alert_level ?? 'info') as PublicUtility['alert_level'],
    bus_schedule_html: row.bus_schedule_html ? String(row.bus_schedule_html) : null,
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function normalizeAd(row: Record<string, unknown>): LocalAd {
  return {
    id: String(row.id),
    client_name: String(row.client_name ?? ''),
    title: String(row.title ?? ''),
    image_url: row.image_url ? String(row.image_url) : null,
    target_url: row.target_url ? String(row.target_url) : null,
    whatsapp_number: row.whatsapp_number ? String(row.whatsapp_number) : null,
    slot_position: (row.slot_position ?? 'sidebar') as AdSlotPosition,
    active: Boolean(row.active),
    starts_at: row.starts_at ? String(row.starts_at) : null,
    ends_at: row.ends_at ? String(row.ends_at) : null,
    clicks_count: Number(row.clicks_count ?? 0),
    offer_type: (row.offer_type ?? 'banner') as LocalAd['offer_type'],
    price_label: row.price_label ? String(row.price_label) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function normalizeProfile(row: Record<string, unknown>): Profile {
  const socialLinks =
    row.social_links && typeof row.social_links === 'object'
      ? (row.social_links as Record<string, string>)
      : {};

  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    slug: String(row.slug ?? ''),
    role: (row.role ?? 'columnist') as Profile['role'],
    column_name: row.column_name ? String(row.column_name) : null,
    bio: row.bio ? String(row.bio) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    social_links: socialLinks,
    can_publish_directly: Boolean(row.can_publish_directly),
    active: Boolean(row.active),
  };
}

/* -------------------------------------------------------------------------- */
/* Consultas                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Executa uma consulta simples e devolve `null` quando o Supabase falha.
 * (Permite cair no mock sem quebrar a pagina.)
 */
type AnyFilterBuilder = PostgrestFilterBuilder<any, any, any, any, any, any>;

async function query<T>(
  supabase: SupabaseClient,
  table: string,
  build: (query: AnyFilterBuilder) => AnyFilterBuilder,
  normalize: (row: Record<string, unknown>) => T,
): Promise<T[] | null> {
  const builder = supabase.from(table).select('*') as unknown as AnyFilterBuilder;
  const { data, error } = await build(builder);

  if (error || !data) return null;
  return (data as Record<string, unknown>[]).map(normalize);
}

export interface HomeFeed {
  articles: Article[];
  featured: Article[];
  breaking: Article[];
  byScope: Record<ArticleScope, Article[]>;
  profiles: Profile[];
  utility: PublicUtility | null;
  ads: Partial<Record<AdSlotPosition, LocalAd>>;
  source: DataSource;
}

const EMPTY_SCOPES: Record<ArticleScope, Article[]> = {
  nioaque: [],
  ms: [],
  brasil: [],
  coluna: [],
  radar_oficial: [],
};

function groupByScope(articles: Article[]): Record<ArticleScope, Article[]> {
  const grouped: Record<ArticleScope, Article[]> = { ...EMPTY_SCOPES };

  for (const article of articles) {
    grouped[article.scope] ??= [];
    grouped[article.scope].push(article);
  }

  return grouped;
}

/** Monta o feed da home. Cai no mock quando o Supabase nao responde. */
export async function getHomeFeed(locals: App.Locals): Promise<HomeFeed> {
  const supabase = locals.supabase;

  if (supabase) {
    const [articles, profiles, utilities, ads] = await Promise.all([
      query(
        supabase,
        'articles',
        (q) => q.eq('status', 'published').lte('published_at', new Date().toISOString()),
        normalizeArticle,
      ),
      query(supabase, 'profiles', (q) => q.eq('active', true), normalizeProfile),
      query(
        supabase,
        'public_utilities',
        (q) => q.order('duty_date', { ascending: false }).limit(1),
        normalizeUtility,
      ),
      query(
        supabase,
        'local_ads',
        // Ordem de cadastro (o mais antigo primeiro): o ultimo da lista e' o
        // anuncio mais recente e, portanto, o que fica no ar no slot.
        (q) => q.eq('active', true).order('created_at', { ascending: true }),
        normalizeAd,
      ),
    ]);

    if (articles && articles.length > 0) {
      const adsBySlot: Partial<Record<AdSlotPosition, LocalAd>> = {};
      for (const ad of ads ?? []) {
        if (!adsBySlot[ad.slot_position]) adsBySlot[ad.slot_position] = ad;
      }

      return {
        articles,
        featured: articles.filter((article) => article.is_featured),
        breaking: articles.filter((article) => article.is_breaking),
        byScope: groupByScope(articles),
        profiles: profiles ?? [],
        utility: utilities?.[0] ?? null,
        ads: adsBySlot,
        source: 'supabase',
      };
    }
  }

  /* ---- Fallback: dados de demonstracao (em memoria) ---- */
  const source = demoStore.listArticles();
  let articles = source
    .filter((article) => article.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime(),
    );

  // Busca artigos reais via RSS (Agencia Brasil etc.) e mescla ao feed
  try {
    const rssArticles = await fetchRSSArticles();
    const rssConverted = rssArticles.map((rss) => rssToArticle(rss, 'brasil'));
    articles = [...articles, ...rssConverted].sort(
      (a, b) => {
        const dateA = new Date(a.published_at ?? a.created_at ?? '').getTime();
        const dateB = new Date(b.published_at ?? b.created_at ?? '').getTime();
        return dateB - dateA;
      },
    );
  } catch {
    /* Se o RSS falhar, segue apenas com os artigos mock */
  }

  const adsBySlot: Partial<Record<AdSlotPosition, LocalAd>> = {};

  // So entra no ar o anuncio ativo E dentro do periodo de veiculacao.
  // A lista vem em ordem de cadastro: o ultimo vence o slot.
  for (const ad of demoStore.listAds()) {
    if (!isAdLive(ad)) continue;
    adsBySlot[ad.slot_position] = ad;
  }

  return {
    articles,
    featured: articles.filter((article) => article.is_featured),
    breaking: articles.filter((article) => article.is_breaking),
    byScope: groupByScope(articles),
    profiles: demoStore.listProfiles(),
    utility: demoStore.listUtilities()[0] ?? null,
    ads: adsBySlot,
    source: 'mock',
  };
}

/* -------------------------------------------------------------------------- */
/* Consultas auxiliares (Etapa 2)                                             */
/* -------------------------------------------------------------------------- */

/** Busca um anuncio pelo id (usado pela rota de contagem de clique). */
export async function getAdById(locals: App.Locals, id: string): Promise<LocalAd | null> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'local_ads',
      (q) => q.eq('id', id).limit(1),
      normalizeAd,
    );

    if (rows?.[0]) return rows[0];
  }

  // O `demoStore` nasce com os anuncios de exemplo e recebe os cadastrados
  // pelo painel. Buscar so no `mockLocalAds` faria a rota de clique nao
  // encontrar um anuncio recem-cadastrado e o morador cairia na home.
  return demoStore.listAds().find((ad) => ad.id === id) ?? null;
}

/**
 * Anuncio do topo do portal (slot `header_billboard`).
 *
 * Consulta leve: apenas o slot do topo, sem carregar o feed inteiro. O
 * layout principal usa isso em todas as paginas publicas.
 */
export async function getHeaderBillboard(locals: App.Locals): Promise<LocalAd | null> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'local_ads',
      (q) =>
        q
          .eq('slot_position', 'header_billboard')
          .eq('active', true)
          .order('created_at', { ascending: true }),
      normalizeAd,
    );

    if (rows?.length) {
      // A lista vem do mais antigo para o mais novo: o ultimo e' o vencedor.
      const live = rows.filter((ad) => isAdLive(ad));
      return live.length > 0 ? live[live.length - 1]! : null;
    }
  }

  return pickLiveAd(demoStore.listAds(), 'header_billboard');
}

/** Materias do Radar Oficial (traduzidas por `category_label`). */
export async function getRadarArticles(locals: App.Locals): Promise<Article[]> {
  const feed = await getHomeFeed(locals);
  return feed.byScope.radar_oficial;
}

export interface ColumnistPick {
  profile: Profile;
  article: Article | null;
}

export interface ColumnistSummary {
  profile: Profile;
  articleCount: number;
  latestArticle: Article | null;
}

/** Colunistas ativos com a contagem de textos publicados. */
export async function getColumnists(locals: App.Locals): Promise<ColumnistSummary[]> {
  const feed = await getHomeFeed(locals);

  return feed.profiles
    .filter((profile) => profile.role === 'columnist' && profile.active)
    .map((profile) => {
      const articles = feed.articles.filter((article) => article.author_id === profile.id);

      return {
        profile,
        articleCount: articles.length,
        latestArticle: articles[0] ?? null,
      };
    })
    .sort((a, b) => b.articleCount - a.articleCount);
}

/** Perfil de um colunista pelo slug, com o historico de textos. */
export async function getColumnistBySlug(
  locals: App.Locals,
  slug: string,
): Promise<{ profile: Profile; articles: Article[] } | null> {
  const feed = await getHomeFeed(locals);
  const profile = feed.profiles.find((item) => item.slug === slug);

  if (!profile) return null;

  const articles = feed.articles
    .filter((article) => article.author_id === profile.id)
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime(),
    );

  return { profile, articles };
}

/** Colunistas com o texto mais recente de cada um. */
export async function getColumnistPicks(locals: App.Locals): Promise<ColumnistPick[]> {
  const feed = await getHomeFeed(locals);

  const columnists = feed.profiles.filter(
    (profile) => profile.role === 'columnist' && Boolean(profile.column_name),
  );

  return columnists.map((profile) => {
    const article =
      feed.articles.find(
        (item) => item.author_id === profile.id && item.scope === 'coluna',
      ) ?? feed.articles.find((item) => item.author_id === profile.id) ?? null;

    return { profile, article };
  });
}

/** Busca simples por titulo, subtitulo e texto. */
export async function searchArticles(locals: App.Locals, term: string): Promise<Article[]> {
  const clean = term.trim().toLowerCase();
  if (!clean) return [];

  const feed = await getHomeFeed(locals);

  return feed.articles.filter((article) => {
    const haystack = [
      article.title,
      article.subtitle ?? '',
      article.category_label ?? '',
      article.summary_bullets.join(' '),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(clean);
  });
}

export interface ArticlePage {
  article: Article | null;
  author: Profile | null;
  related: Article[];
  source: DataSource;}

/** Busca uma materia pelo slug (para `/noticia/[slug]`). */
export async function getArticlePage(
  locals: App.Locals,
  slug: string,
): Promise<ArticlePage> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'articles',
      (q) => q.eq('slug', slug).eq('status', 'published').limit(1),
      normalizeArticle,
    );

    const article = rows?.[0];
    if (article) {
      const authorRows = await query(
        supabase,
        'profiles',
        (q) => q.eq('id', article.author_id).limit(1),
        normalizeProfile,
      );

      const relatedRows = await query(
        supabase,
        'articles',
        (q) => q.eq('status', 'published').eq('scope', article.scope).limit(4),
        normalizeArticle,
      );

      return {
        article,
        author: authorRows?.[0] ?? null,
        related: (relatedRows ?? []).filter((item) => item.id !== article.id).slice(0, 3),
        source: 'supabase',
      };
    }
  }

  /* ---- Fallback: dados de demonstracao (em memoria) ---- */
  const article = demoStore.findArticleBySlug(slug) ?? null;
  if (!article) return { article: null, author: null, related: [], source: 'mock' };

  return {
    article,
    author: demoStore.findProfile(article.author_id) ?? null,
    related: demoStore
      .listArticles()
      .filter((item) => item.status === 'published' && item.scope === article.scope)
      .filter((item) => item.id !== article.id)
      .slice(0, 3),
    source: 'mock',
  };
}

/** Pistas do leitor (somente admin enxerga no banco). */
export async function getReaderSubmissions(
  locals: App.Locals,
): Promise<{ submissions: ReaderSubmission[]; source: DataSource }> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'reader_submissions',
      (q) => q.order('created_at', { ascending: false }),
      (row) => ({
        id: String(row.id),
        sender_name: String(row.sender_name ?? ''),
        sender_whatsapp: String(row.sender_whatsapp ?? ''),
        neighborhood: row.neighborhood ? String(row.neighborhood) : null,
        message: String(row.message ?? ''),
        media_urls: toStringArray(row.media_urls),
        status: (row.status ?? 'pending') as ReaderSubmission['status'],
        created_at: String(row.created_at ?? new Date().toISOString()),
      }),
    );

    if (rows) return { submissions: rows, source: 'supabase' };
  }

  return { submissions: mockReaderSubmissions, source: 'mock' };
}

/* -------------------------------------------------------------------------- */
/* Blocos de servico: loterias e cotacoes                                      */
/* -------------------------------------------------------------------------- */

/** Ultimo resultado de cada modalidade de loteria. */
export async function getLotteryResults(locals: App.Locals): Promise<LotteryResult[]> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'lottery_results',
      (q) => q.order('contest_date', { ascending: false }),
      (row) => ({
        id: String(row.id),
        modality: String(row.modality ?? ''),
        contest_number: String(row.contest_number ?? ''),
        contest_date: String(row.contest_date ?? ''),
        numbers: toStringArray(row.numbers),
        prize_value: row.prize_value ? String(row.prize_value) : null,
        created_at: String(row.created_at ?? new Date().toISOString()),
      }),
    );

    if (rows?.length) {
      // apenas o resultado mais recente de cada modalidade
      const latest = new Map<string, LotteryResult>();
      for (const row of rows) {
        if (!latest.has(row.modality)) latest.set(row.modality, row);
      }
      return [...latest.values()];
    }
  }

  return mockLotteryResults;
}

/** Cotacoes da economia (dolar, euro, bitcoin, Ibovespa). */
export async function getMarketQuotes(locals: App.Locals): Promise<MarketQuote[]> {
  const supabase = locals.supabase;

  if (supabase) {
    const rows = await query(
      supabase,
      'market_quotes',
      (q) => q.order('symbol', { ascending: true }),
      (row) => ({
        id: String(row.id),
        symbol: String(row.symbol ?? ''),
        label: String(row.label ?? ''),
        value: Number(row.value ?? 0),
        change_percent: Number(row.change_percent ?? 0),
        unit: row.unit ? String(row.unit) : null,
        updated_at: String(row.updated_at ?? new Date().toISOString()),
      }),
    );

    if (rows?.length) return rows;
  }

  return mockMarketQuotes;
}
