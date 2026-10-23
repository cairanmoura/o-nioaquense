/**
 * admin.ts
 * -----------------------------------------------------------------------------
 * Camada de dados e mutacoes do painel /admin.
 *
 * Toda mutacao revalida o papel do usuario NO SERVIDOR antes de gravar.
 * O banco (RLS) e' a ultima linha de defesa; aqui ensuring que a UX
 * e a logica de negocio nao dependem do client.
 *
 * Quando o Supabase esta configurado, usa o banco. Caso contrario, usa o
 * `demo-store` (memoria) para permitir revisar o painel sem credenciais.
 */

import {
  canPublishDirectly,
  ForbiddenError,
  isAdmin,
  ValidationError,
  type AdminSession,
} from './auth';
import { demoStore } from './demo-store';
import { uniqueSlug } from './slug';
import type {
  AdOfferType,
  AdSlotPosition,
  Article,
  ArticleScope,
  ArticleStatus,
  BusSchedule,
  LocalAd,
  Profile,
  PublicUtility,
  ReaderSubmission,
} from './types';

export const SCOPE_OPTIONS: { value: ArticleScope; label: string }[] = [
  { value: 'nioaque', label: 'Nioaque' },
  { value: 'ms', label: 'Mato Grosso do Sul' },
  { value: 'brasil', label: 'Brasil' },
  { value: 'coluna', label: 'Coluna' },
  { value: 'radar_oficial', label: 'Radar Oficial' },
];

export const CATEGORY_OPTIONS = [
  'Cidade',
  'Educação',
  'Saúde',
  'Meio Ambiente',
  'Infraestrutura',
  'Cultura',
  'Economia',
  'Estado',
  'Turismo',
  'Prefeitura',
  'Câmara',
  'Concursos',
  'Diário Oficial',
  'Brasil',
  'Esportes',
  'Segurança',
  'Polícia',
  'Justiça',
  'Transporte',
  'Habitação',
  'Meio Ambiente',
  'Agricultura',
  'Emprego',
  'Assistência Social',
  'Religião',
];

/* -------------------------------------------------------------------------- */
/* Leitura                                                                    */
/* -------------------------------------------------------------------------- */

interface AdminData {
  articles: Article[];
  profiles: Profile[];
  submissions: ReaderSubmission[];
  utilities: PublicUtility[];
  ads: LocalAd[];
  busSchedules: BusSchedule[];
}

async function loadAll(locals: App.Locals): Promise<AdminData> {
  const supabase = locals.supabase;

  if (supabase) {
    const [articles, profiles, submissions, utilities, ads, busSchedules] = await Promise.all([
      supabase.from('articles').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase.from('reader_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('public_utilities').select('*').order('duty_date', { ascending: false }),
      supabase.from('local_ads').select('*').order('created_at', { ascending: false }),
      supabase.from('bus_schedules').select('*').order('position', { ascending: true }),
    ]);

    const rows = (result: { data: unknown }) =>
      Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];

    return {
      articles: rows(articles).map((row) => mapArticle(row)),
      profiles: rows(profiles).map((row) => mapProfile(row)),
      submissions: rows(submissions).map((row) => mapSubmission(row)),
      utilities: rows(utilities).map((row) => mapUtility(row)),
      ads: rows(ads).map((row) => mapAd(row)),
      busSchedules: rows(busSchedules).map((row) => mapBusSchedule(row)),
    };
  }

  return {
    articles: demoStore.listArticles(),
    profiles: demoStore.listProfiles(),
    submissions: demoStore.listSubmissions(),
    utilities: demoStore.listUtilities(),
    ads: demoStore.listAds(),
    busSchedules: demoStore.listBusSchedules(),
  };
}

function mapArticle(row: Record<string, unknown>): Article {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    slug: String(row.slug ?? ''),
    summary_bullets: Array.isArray(row.summary_bullets) ? (row.summary_bullets as string[]) : [],
    content: String(row.content ?? ''),
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    cover_image_caption: row.cover_image_caption ? String(row.cover_image_caption) : null,
    scope: (row.scope ?? 'nioaque') as ArticleScope,
    category_label: row.category_label ? String(row.category_label) : null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    is_breaking: Boolean(row.is_breaking),
    is_featured: Boolean(row.is_featured),
    author_id: row.author_id ? String(row.author_id) : '',
    status: (row.status ?? 'draft') as ArticleStatus,
    views_count: Number(row.views_count ?? 0),
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapProfile(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    slug: String(row.slug ?? ''),
    role: (row.role ?? 'columnist') as Profile['role'],
    column_name: row.column_name ? String(row.column_name) : null,
    bio: row.bio ? String(row.bio) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    social_links:
      row.social_links && typeof row.social_links === 'object'
        ? (row.social_links as Record<string, string>)
        : {},
    can_publish_directly: Boolean(row.can_publish_directly),
    active: Boolean(row.active),
  };
}

function mapSubmission(row: Record<string, unknown>): ReaderSubmission {
  return {
    id: String(row.id),
    sender_name: String(row.sender_name ?? ''),
    sender_whatsapp: String(row.sender_whatsapp ?? ''),
    neighborhood: row.neighborhood ? String(row.neighborhood) : null,
    message: String(row.message ?? ''),
    media_urls: Array.isArray(row.media_urls) ? (row.media_urls as string[]) : [],
    status: (row.status ?? 'pending') as ReaderSubmission['status'],
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function mapUtility(row: Record<string, unknown>): PublicUtility {
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

function mapAd(row: Record<string, unknown>): LocalAd {
  return {
    id: String(row.id),
    client_name: String(row.client_name ?? ''),
    title: String(row.title ?? ''),
    image_url: row.image_url ? String(row.image_url) : null,
    target_url: row.target_url ? String(row.target_url) : null,
    whatsapp_number: row.whatsapp_number ? String(row.whatsapp_number) : null,
    slot_position: (row.slot_position ?? 'sidebar') as LocalAd['slot_position'],
    active: Boolean(row.active),
    starts_at: row.starts_at ? String(row.starts_at) : null,
    ends_at: row.ends_at ? String(row.ends_at) : null,
    clicks_count: Number(row.clicks_count ?? 0),
    offer_type: (row.offer_type ?? 'banner') as AdOfferType,
    price_label: row.price_label ? String(row.price_label) : null,
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapBusSchedule(row: Record<string, unknown>): BusSchedule {
  return {
    id: String(row.id),
    route_name: String(row.route_name ?? ''),
    destination: String(row.destination ?? ''),
    departure_times: Array.isArray(row.departure_times)
      ? (row.departure_times as string[])
      : [],
    frequency: row.frequency ? String(row.frequency) : null,
    notes: row.notes ? String(row.notes) : null,
    position: Number(row.position ?? 0),
    active: Boolean(row.active),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
  };
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface AdminDashboard {
  role: 'admin' | 'columnist';
  canPublishDirectly: boolean;
  counts: {
    published: number;
    pendingReview: number;
    drafts: number;
    submissions: number;
    activeAds: number;
    columnists: number;
  };
  myArticles: Article[];
  pendingArticles: Article[];
  submissions: ReaderSubmission[];
  utilities: PublicUtility[];
  ads: LocalAd[];
  busSchedules: BusSchedule[];
  columnists: Profile[];
  authors: Map<string, Profile>;
  /** Relatorio comercial: total de cliques por anunciante. */
  adReport: {
    totalClicks: number;
    activeAds: number;
    byOfferType: Record<AdOfferType, number>;
    top: { id: string; client_name: string; title: string; clicks_count: number }[];
  };
}

/** Dados consolidados do dashboard, ja filtrados pelo papel do usuario. */
export async function getAdminDashboard(
  locals: App.Locals,
  session: AdminSession,
): Promise<AdminDashboard> {
  const data = await loadAll(locals);
  const admin = isAdmin(session);

  const authors = new Map(data.profiles.map((profile) => [profile.id, profile]));

  // Textos do proprio usuario (para o colunista e tambem para o Editor-Chefe,
  // que cria rascunhos ao transformar pistas do leitor em materias).
  const myArticles = data.articles
    .filter((article) => article.author_id === session.profile.id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  const pendingArticles = admin
    ? data.articles
        .filter((article) => article.status === 'pending_review')
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    : [];

  return {
    role: session.profile.role,
    canPublishDirectly: canPublishDirectly(session),
    counts: {
      published: data.articles.filter((article) => article.status === 'published').length,
      pendingReview: data.articles.filter((article) => article.status === 'pending_review').length,
      drafts: data.articles.filter((article) => article.status === 'draft').length,
      submissions: data.submissions.filter((item) => item.status === 'pending').length,
      activeAds: data.ads.filter((ad) => ad.active).length,
      columnists: data.profiles.filter((profile) => profile.role === 'columnist').length,
    },
    myArticles,
    pendingArticles,
    submissions: admin ? data.submissions : [],
    utilities: admin ? data.utilities : [],
    ads: admin ? data.ads : [],
    busSchedules: admin ? data.busSchedules : [],
    columnists: admin ? data.profiles.filter((profile) => profile.role === 'columnist') : [],
    authors,
    adReport: {
      totalClicks: data.ads.reduce((sum, ad) => sum + ad.clicks_count, 0),
      activeAds: data.ads.filter((ad) => ad.active).length,
      byOfferType: {
        banner: data.ads.filter((ad) => ad.offer_type === 'banner').length,
        daily_deal: data.ads.filter((ad) => ad.offer_type === 'daily_deal').length,
      },
      top: [...data.ads]
        .sort((a, b) => b.clicks_count - a.clicks_count)
        .slice(0, 5)
        .map((ad) => ({
          id: ad.id,
          client_name: ad.client_name,
          title: ad.title,
          clicks_count: ad.clicks_count,
        })),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Materias                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Busca uma materia para edicao, respeitando o papel:
 * - admin: qualquer materia;
 * - colunista: apenas as proprias.
 */
export async function getArticleForAdmin(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<Article | null> {
  const data = await loadAll(locals);
  const article = data.articles.find((item) => item.id === id);

  if (!article) return null;
  if (!isAdmin(session) && article.author_id !== session.profile.id) return null;

  return article;
}

export interface ArticleInput {
  id?: string;
  title: string;
  subtitle?: string | null;
  slug?: string | null;
  summary_bullets: string[];
  content: string;
  cover_image_url?: string | null;
  cover_image_caption?: string | null;
  scope: ArticleScope;
  category_label?: string | null;
  /** Tags da materia. */
  tags?: string[];
  is_breaking?: boolean;
  is_featured?: boolean;
  status?: ArticleStatus;
}

/**
 * Resolve o status final respeitando a trava `can_publish_directly`.
 * Colunista sem a flag NUNCA publica: cai para `pending_review`.
 */
export function resolveStatus(
  session: AdminSession,
  requested: ArticleStatus | undefined,
): { status: ArticleStatus; coerced: boolean } {
  const wanted = requested ?? 'draft';

  if (isAdmin(session)) {
    return { status: wanted, coerced: false };
  }

  if (!canPublishDirectly(session)) {
    return {
      status: wanted === 'published' ? 'pending_review' : wanted === 'draft' ? 'draft' : 'pending_review',
      coerced: wanted === 'published',
    };
  }

  return { status: wanted, coerced: false };
}

/** Cria ou atualiza uma materia. */
export async function saveArticle(
  locals: App.Locals,
  session: AdminSession,
  input: ArticleInput,
): Promise<{ article: Article; coerced: boolean }> {
  if (!input.title?.trim()) {
    throw new ValidationError('O titulo e obrigatorio.');
  }

  const data = await loadAll(locals);
  const existing = input.id ? data.articles.find((article) => article.id === input.id) : undefined;

  // Colunista so edita materia propria
  if (existing && !isAdmin(session) && existing.author_id !== session.profile.id) {
    throw new ForbiddenError('Voce so pode editar as suas proprias materias.');
  }

  const { status, coerced } = resolveStatus(session, input.status);

  const slug =
    slugOrGenerate(input.slug, input.title, data.articles, existing?.id);

  const now = new Date().toISOString();
  const publishedAt =
    status === 'published' ? (existing?.published_at ?? now) : null;

  const payload: Article = {
    id: existing?.id ?? crypto.randomUUID(),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || null,
    slug,
    summary_bullets: input.summary_bullets.filter((bullet) => bullet.trim()).slice(0, 3),
    content: input.content ?? '',
    cover_image_url: input.cover_image_url ?? existing?.cover_image_url ?? null,
    cover_image_caption: input.cover_image_caption ?? existing?.cover_image_caption ?? null,
    scope: input.scope ?? 'nioaque',
    category_label: input.category_label?.trim() || null,
    tags: Array.isArray(input.tags) ? input.tags.filter((t) => t.trim()).slice(0, 10) : [],
    is_breaking: Boolean(input.is_breaking),
    is_featured: isAdmin(session) ? Boolean(input.is_featured) : (existing?.is_featured ?? false),
    author_id: existing?.author_id ?? session.profile.id,
    status,
    views_count: existing?.views_count ?? 0,
    published_at: publishedAt,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };

  if (locals.supabase) {
    const supabase = locals.supabase;
    const row = {
      title: payload.title,
      subtitle: payload.subtitle,
      slug: payload.slug,
      summary_bullets: payload.summary_bullets,
      content: payload.content,
      cover_image_url: payload.cover_image_url,
      cover_image_caption: payload.cover_image_caption,
      scope: payload.scope,
      category_label: payload.category_label,
      tags: payload.tags,
      is_breaking: payload.is_breaking,
      is_featured: payload.is_featured,
      status: payload.status,
      published_at: payload.published_at,
      updated_at: payload.updated_at,
    };

    const result = existing
      ? await supabase.from('articles').update(row).eq('id', payload.id).select('*').maybeSingle()
      : await supabase
          .from('articles')
          .insert({ ...row, author_id: payload.author_id, created_at: payload.created_at })
          .select('*')
          .maybeSingle();

    if (result.error) throw new Error(result.error.message);

    return { article: mapArticle(result.data as Record<string, unknown>), coerced };
  }

  const saved = existing
    ? demoStore.updateArticle(payload.id, payload)
    : demoStore.createArticle(payload);

  return { article: saved!, coerced };
}

function slugOrGenerate(
  requested: string | null | undefined,
  title: string,
  articles: Article[],
  currentId?: string,
): string {
  const existingSlugs = articles
    .filter((article) => article.id !== currentId)
    .map((article) => article.slug);

  const base = requested?.trim() || title;
  return uniqueSlug(base, existingSlugs);
}

/** Publica (aprova em 1 clique) uma materia pendente. */
export async function publishArticle(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<Article> {
  const data = await loadAll(locals);
  const article = data.articles.find((item) => item.id === id);
  if (!article) throw new ValidationError('Materia nao encontrada.');

  if (!isAdmin(session)) {
    if (article.author_id !== session.profile.id) {
      throw new ForbiddenError('Voce so pode publicar as suas proprias materias.');
    }
    if (!canPublishDirectly(session)) {
      throw new ForbiddenError(
        'Sua coluna nao tem a permissao "pode publicar direto". Envie para a revisao do Editor-Chefe.',
      );
    }
  }

  const now = new Date().toISOString();

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('articles')
      .update({ status: 'published', published_at: article.published_at ?? now, updated_at: now })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapArticle(updated as Record<string, unknown>);
  }

  return demoStore.updateArticle(id, {
    status: 'published',
    published_at: article.published_at ?? now,
  })!;
}

/** Devolve a materia para rascunho (rejeicao na fila de revisao). */
export async function returnArticleToDraft(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<Article> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente o Editor-Chefe pode devolver um texto para rascunho.');
  }

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('articles')
      .update({ status: 'draft', published_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapArticle(updated as Record<string, unknown>);
  }

  return demoStore.updateArticle(id, { status: 'draft', published_at: null })!;
}

/* -------------------------------------------------------------------------- */
/* Perfis                                                                     */
/* -------------------------------------------------------------------------- */

export interface ProfileInput {
  full_name: string;
  column_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  social_links?: Record<string, string>;
}

/** Atualiza o proprio perfil (colunista ou admin). */
export async function updateOwnProfile(
  locals: App.Locals,
  session: AdminSession,
  input: ProfileInput,
): Promise<Profile> {
  if (!input.full_name?.trim()) {
    throw new ValidationError('Informe o nome de exibicao.');
  }

  const patch = {
    full_name: input.full_name.trim(),
    column_name: input.column_name?.trim() || null,
    bio: input.bio?.trim() || null,
    avatar_url: input.avatar_url ?? session.profile.avatar_url,
    social_links: input.social_links ?? session.profile.social_links,
  };

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('profiles')
      .update(patch)
      .eq('id', session.profile.id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapProfile(updated as Record<string, unknown>);
  }

  return demoStore.updateProfile(session.profile.id, patch)!;
}

export interface ColumnistInput {
  full_name: string;
  email: string;
  column_name?: string | null;
  bio?: string | null;
  can_publish_directly?: boolean;
}

/** Cadastra um novo colunista (somente Editor-Chefe). */
export async function createColumnist(
  locals: App.Locals,
  session: AdminSession,
  input: ColumnistInput,
): Promise<Profile> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente o Editor-Chefe pode cadastrar colunistas.');
  }

  if (!input.full_name?.trim()) throw new ValidationError('Informe o nome do colunista.');
  if (!input.email?.trim() || !input.email.includes('@')) {
    throw new ValidationError('Informe um e-mail valido.');
  }

  const data = await loadAll(locals);
  const slug = uniqueSlug(
    input.full_name,
    data.profiles.map((profile) => profile.slug),
  );

  if (locals.supabase) {
    const supabase = locals.supabase;

    // 1) cria o usuario no Auth (a senha inicial e' trocada pelo proprio colunista)
    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email: input.email.trim(),
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: input.full_name.trim() },
    });

    if (authError || !created.user) {
      throw new ValidationError(authError?.message ?? 'Nao foi possivel criar o usuario.');
    }

    const profileId = created.user.id;

    // 2) cria/atualiza o perfil com as permissoes pedidas
    const { data: profile, error } = await supabase
      .from('profiles')
      .upsert({
        id: profileId,
        full_name: input.full_name.trim(),
        slug,
        role: 'columnist',
        column_name: input.column_name?.trim() || null,
        bio: input.bio?.trim() || null,
        can_publish_directly: Boolean(input.can_publish_directly),
        active: true,
      })
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapProfile(profile as Record<string, unknown>);
  }

  const profile: Profile = {
    id: crypto.randomUUID(),
    full_name: input.full_name.trim(),
    slug,
    role: 'columnist',
    column_name: input.column_name?.trim() || null,
    bio: input.bio?.trim() || null,
    avatar_url: null,
    social_links: {},
    can_publish_directly: Boolean(input.can_publish_directly),
    active: true,
  };

  return demoStore.createProfile(profile);
}

/** Liga/desliga a chave "Pode publicar direto" e ativa/desativa o colunista. */
export async function updateColumnist(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  patch: { can_publish_directly?: boolean; active?: boolean; column_name?: string | null },
): Promise<Profile> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente o Editor-Chefe pode alterar colunistas.');
  }

  if (locals.supabase) {
    const update: Record<string, unknown> = {};
    if (patch.can_publish_directly !== undefined) {
      update.can_publish_directly = patch.can_publish_directly;
    }
    if (patch.active !== undefined) update.active = patch.active;
    if (patch.column_name !== undefined) update.column_name = patch.column_name;

    const { data: updated, error } = await locals.supabase
      .from('profiles')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapProfile(updated as Record<string, unknown>);
  }

  return demoStore.updateProfile(id, patch)!;
}

/**
 * Exclui um colunista (somente Editor-Chefe).
 *
 * Antes de remover o perfil, os artigos do colunista sao reatribuidos a quem
 * esta excluindo: assim a FK `articles.author_id` nao quebra e nenhuma materia
 * ja publicada se perde no caminho.
 */
export async function deleteColumnist(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<boolean> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente o Editor-Chefe pode excluir colunistas.');
  }

  // Ninguem exclui a propria conta: evita deixar o painel sem editor-chefe.
  if (session.id === id) {
    throw new ForbiddenError('Voce nao pode excluir o seu proprio perfil.');
  }

  if (locals.supabase) {
    // Reatribui os artigos para o editor que esta excluindo (preserva o conteudo).
    const { error: reassignError } = await locals.supabase
      .from('articles')
      .update({ author_id: session.id })
      .eq('author_id', id);
    if (reassignError) throw new Error(reassignError.message);

    const { error } = await locals.supabase.from('profiles').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  throw new Error('A exclusao de colunistas exige o banco configurado.');
}

/* -------------------------------------------------------------------------- */
/* Pistas, servicos e anuncios                                                */
/* -------------------------------------------------------------------------- */

export async function updateSubmission(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  status: ReaderSubmission['status'],
): Promise<ReaderSubmission> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode tratar as pistas do leitor.');
  }

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('reader_submissions')
      .update({ status })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapSubmission(updated as Record<string, unknown>);
  }

  return demoStore.updateSubmission(id, { status })!;
}

export async function updateUtility(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  patch: Partial<PublicUtility>,
): Promise<PublicUtility> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar os servicos da cidade.');
  }

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('public_utilities')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapUtility(updated as Record<string, unknown>);
  }

  return demoStore.updateUtility(id, patch)!;
}

export async function toggleAd(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  active: boolean,
): Promise<LocalAd> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode gerenciar os anuncios.');
  }

  if (locals.supabase) {
    const { data: updated, error } = await locals.supabase
      .from('local_ads')
      .update({ active })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapAd(updated as Record<string, unknown>);
  }

  return demoStore.updateAd(id, { active })!;
}

/* -------------------------------------------------------------------------- */
/* Gestao comercial                                                           */
/* -------------------------------------------------------------------------- */

export interface AdInput {
  client_name: string;
  title: string;
  image_url?: string | null;
  target_url?: string | null;
  whatsapp_number?: string | null;
  slot_position: AdSlotPosition;
  offer_type: AdOfferType;
  price_label?: string | null;
  notes?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  active?: boolean;
}

/** Cadastra um novo anuncio local (bannner ou Oferta do Dia). */
export async function createAd(
  locals: App.Locals,
  session: AdminSession,
  input: AdInput,
): Promise<LocalAd> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode cadastrar anuncios.');
  }

  if (!input.client_name?.trim()) {
    throw new ValidationError('Informe o nome do comercio.');
  }
  if (!input.title?.trim()) {
    throw new ValidationError('Informe o texto do anuncio.');
  }

  const ad: LocalAd = {
    id: crypto.randomUUID(),
    client_name: input.client_name.trim(),
    title: input.title.trim(),
    image_url: input.image_url?.trim() || null,
    target_url: input.target_url?.trim() || null,
    whatsapp_number: input.whatsapp_number?.trim() || null,
    slot_position: input.slot_position,
    offer_type: input.offer_type,
    price_label: input.price_label?.trim() || null,
    notes: input.notes?.trim() || null,
    active: input.active ?? true,
    starts_at: input.starts_at || null,
    ends_at: input.ends_at || null,
    clicks_count: 0,
  };

  if (locals.supabase) {
    const { data, error } = await locals.supabase
      .from('local_ads')
      .insert({
        client_name: ad.client_name,
        title: ad.title,
        image_url: ad.image_url,
        target_url: ad.target_url,
        whatsapp_number: ad.whatsapp_number,
        slot_position: ad.slot_position,
        offer_type: ad.offer_type,
        price_label: ad.price_label,
        notes: ad.notes,
        active: ad.active,
        starts_at: ad.starts_at,
        ends_at: ad.ends_at,
        clicks_count: 0,
      })
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapAd(data as Record<string, unknown>);
  }

  return demoStore.createAd(ad);
}

/** Atualiza os dados de um anuncio existente. */
export async function updateAd(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  patch: Partial<AdInput>,
): Promise<LocalAd> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar anuncios.');
  }

  if (locals.supabase) {
    const update: Record<string, unknown> = {};

    if (patch.client_name !== undefined) update.client_name = patch.client_name;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.image_url !== undefined) update.image_url = patch.image_url;
    if (patch.target_url !== undefined) update.target_url = patch.target_url;
    if (patch.whatsapp_number !== undefined) update.whatsapp_number = patch.whatsapp_number;
    if (patch.slot_position !== undefined) update.slot_position = patch.slot_position;
    if (patch.offer_type !== undefined) update.offer_type = patch.offer_type;
    if (patch.price_label !== undefined) update.price_label = patch.price_label;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.active !== undefined) update.active = patch.active;
    if (patch.starts_at !== undefined) update.starts_at = patch.starts_at;
    if (patch.ends_at !== undefined) update.ends_at = patch.ends_at;

    const { data, error } = await locals.supabase
      .from('local_ads')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapAd(data as Record<string, unknown>);
  }

  return demoStore.updateAd(id, patch as Partial<LocalAd>)!;
}

/** Exclui um anuncio local (somente a redacao / editor-chefe). */
export async function deleteAd(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<boolean> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode excluir anuncios.');
  }

  if (locals.supabase) {
    const { error } = await locals.supabase.from('local_ads').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  throw new Error('A exclusao de anuncios exige o banco configurado.');
}

/* -------------------------------------------------------------------------- */
/* Utilidade publica: escala semanal e horarios de onibus                    */
/* -------------------------------------------------------------------------- */

export interface WeekEntry {
  duty_date: string;
  pharmacy_name: string;
  pharmacy_phone?: string | null;
  pharmacy_address?: string | null;
}

/**
 * Salva a escala da farmacia de plantao da semana de uma vez.
 * Faz upsert por `duty_date` (uma linha por dia).
 */
export async function upsertWeeklyUtilities(
  locals: App.Locals,
  session: AdminSession,
  week: WeekEntry[],
): Promise<PublicUtility[]> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar a escala da farmacia.');
  }

  if (week.length === 0) {
    throw new ValidationError('Nenhum dia enviado.');
  }

  const saved: PublicUtility[] = [];

  for (const entry of week) {
    if (!entry.duty_date) continue;

    const payload = {
      duty_date: entry.duty_date,
      pharmacy_name: entry.pharmacy_name?.trim() || 'A definir',
      pharmacy_phone: entry.pharmacy_phone?.trim() || null,
      pharmacy_address: entry.pharmacy_address?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (locals.supabase) {
      const { data, error } = await locals.supabase
        .from('public_utilities')
        .upsert(payload, { onConflict: 'duty_date' })
        .select('*')
        .maybeSingle();

      if (error) throw new Error(error.message);
      saved.push(mapUtility(data as Record<string, unknown>));
      continue;
    }

    const existing = demoStore
      .listUtilities()
      .find((item) => item.duty_date === entry.duty_date);

    if (existing) {
      saved.push(demoStore.updateUtility(existing.id, payload)!);
    } else {
      const created: PublicUtility = {
        id: crypto.randomUUID(),
        ...payload,
        alert_active: false,
        alert_message: null,
        alert_level: 'info',
        bus_schedule_html: null,
      };
      demoStore.createUtility(created);
      saved.push(created);
    }
  }

  return saved;
}

export interface BusScheduleInput {
  route_name: string;
  destination: string;
  departure_times: string[];
  frequency?: string | null;
  notes?: string | null;
  position?: number;
  active?: boolean;
}

/** Cadastra uma linha de onibus. */
export async function createBusSchedule(
  locals: App.Locals,
  session: AdminSession,
  input: BusScheduleInput,
): Promise<BusSchedule> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar os horarios de onibus.');
  }

  if (!input.route_name?.trim() || !input.destination?.trim()) {
    throw new ValidationError('Informe a linha e o destino.');
  }

  const schedule: BusSchedule = {
    id: crypto.randomUUID(),
    route_name: input.route_name.trim(),
    destination: input.destination.trim(),
    departure_times: (input.departure_times ?? []).filter((time) => time.trim()),
    frequency: input.frequency?.trim() || null,
    notes: input.notes?.trim() || null,
    position: input.position ?? 0,
    active: input.active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (locals.supabase) {
    const { data, error } = await locals.supabase
      .from('bus_schedules')
      .insert({
        route_name: schedule.route_name,
        destination: schedule.destination,
        departure_times: schedule.departure_times,
        frequency: schedule.frequency,
        notes: schedule.notes,
        position: schedule.position,
        active: schedule.active,
      })
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapBusSchedule(data as Record<string, unknown>);
  }

  return demoStore.createBusSchedule(schedule);
}

/** Atualiza uma linha de onibus. */
export async function updateBusSchedule(
  locals: App.Locals,
  session: AdminSession,
  id: string,
  patch: Partial<BusScheduleInput>,
): Promise<BusSchedule> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar os horarios de onibus.');
  }

  if (locals.supabase) {
    const update: Record<string, unknown> = {};

    if (patch.route_name !== undefined) update.route_name = patch.route_name;
    if (patch.destination !== undefined) update.destination = patch.destination;
    if (patch.departure_times !== undefined) update.departure_times = patch.departure_times;
    if (patch.frequency !== undefined) update.frequency = patch.frequency;
    if (patch.notes !== undefined) update.notes = patch.notes;
    if (patch.position !== undefined) update.position = patch.position;
    if (patch.active !== undefined) update.active = patch.active;

    const { data, error } = await locals.supabase
      .from('bus_schedules')
      .update(update)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    return mapBusSchedule(data as Record<string, unknown>);
  }

  return demoStore.updateBusSchedule(id, patch as Partial<BusSchedule>)!;
}

/** Remove uma linha de onibus. */
export async function deleteBusSchedule(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<boolean> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode editar os horarios de onibus.');
  }

  if (locals.supabase) {
    const { error } = await locals.supabase.from('bus_schedules').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return true;
  }

  return demoStore.deleteBusSchedule(id);
}

/* -------------------------------------------------------------------------- */
/* Boca no Trombone -> rascunho de materia                                    */
/* -------------------------------------------------------------------------- */

/**
 * Transforma uma pista do leitor em um rascunho de materia.
 * A pista e marcada como `converted_to_article` e o rascunho fica no
 * rascunho (nunca publicado direto).
 */
export async function convertSubmissionToDraft(
  locals: App.Locals,
  session: AdminSession,
  id: string,
): Promise<{ article: Article; submission: ReaderSubmission }> {
  if (!isAdmin(session)) {
    throw new ForbiddenError('Somente a redacao pode transformar pistas em materias.');
  }

  const data = await loadAll(locals);
  const submission = data.submissions.find((item) => item.id === id);

  if (!submission) throw new ValidationError('Pista nao encontrada.');

  const title = `Pista: ${submission.neighborhood ?? 'Nioaque'}`;
  const now = new Date().toISOString();

  const article: Article = {
    id: crypto.randomUUID(),
    title,
    subtitle: `Relato de ${submission.sender_name}`,
    slug: uniqueSlug(`pista-${submission.neighborhood ?? 'nioaque'}`, data.articles.map((a) => a.slug)),
    summary_bullets: [],
    content:
      `<p>${submission.message}</p>` +
      `<p><em>Enviado por ${submission.sender_name} (${submission.sender_whatsapp}) em ${submission.created_at.slice(0, 10)}.</em></p>`,
    cover_image_url: submission.media_urls[0] ?? null,
    cover_image_caption: 'Imagem enviada pelo leitor',
    scope: 'nioaque',
    category_label: 'Cidade',
    tags: [],
    is_breaking: false,
    is_featured: false,
    author_id: session.profile.id,
    status: 'draft',
    views_count: 0,
    published_at: null,
    created_at: now,
    updated_at: now,
  };

  let savedArticle: Article;

  if (locals.supabase) {
    const { data: inserted, error } = await locals.supabase
      .from('articles')
      .insert({
        title: article.title,
        subtitle: article.subtitle,
        slug: article.slug,
        summary_bullets: article.summary_bullets,
        content: article.content,
        cover_image_url: article.cover_image_url,
        cover_image_caption: article.cover_image_caption,
        scope: article.scope,
        category_label: article.category_label,
        is_breaking: false,
        is_featured: false,
        author_id: session.profile.id,
        status: 'draft',
        views_count: 0,
        published_at: null,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .maybeSingle();

    if (error) throw new Error(error.message);
    savedArticle = mapArticle(inserted as Record<string, unknown>);
  } else {
    savedArticle = demoStore.createArticle(article);
  }

  const savedSubmission = await updateSubmission(locals, session, id, 'converted_to_article');

  return { article: savedArticle, submission: savedSubmission };
}
