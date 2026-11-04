/**
 * colunas.ts - colunistas do X e seus posts (cada post e' uma "coluna" do portal).
 *
 * Os posts sao cadastrados no painel (/admin/colunas) colando o link do post;
 * os dados (texto, data, foto) vem da API publica do FxTwitter. A leitura
 * completa e' feita com o embed oficial do X na pagina da coluna.
 */

export interface XColumnist {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  sort_order: number;
}

export interface XPost {
  id: string;
  columnist_id: string;
  tweet_id: string;
  url: string;
  text: string;
  media_url: string | null;
  posted_at: string;
  columnist?: XColumnist;
}

/** Avatar do colunista (o salvo, ou o servico publico unavatar como reserva). */
export const avatarOf = (c: Pick<XColumnist, 'handle' | 'avatar_url'>) =>
  c.avatar_url || `https://unavatar.io/x/${encodeURIComponent(c.handle)}`;

/**
 * Chave de funcionamento das Colunas do X. Sem migracao: e' uma linha reservada em
 * `x_columnists` (handle abaixo, active = true). A funcao fica PAUSADA por padrao e so
 * funciona enquanto essa linha existir e estiver ativa (botao em /admin/colunas).
 */
export const X_FLAG_HANDLE = '_x_ativo_';

/** Colunistas ativos; lista vazia (funcao pausada) se a chave estiver desligada. */
export async function getColumnists(locals: App.Locals): Promise<XColumnist[]> {
  const sb = locals.supabase;
  if (!sb) return [];
  const { data, error } = await sb.from('x_columnists').select('*').eq('active', true).order('sort_order');
  if (error || !data) return [];
  const rows = data as XColumnist[];
  if (!rows.some((c) => c.handle === X_FLAG_HANDLE)) return [];
  return rows.filter((c) => c.handle !== X_FLAG_HANDLE);
}

export async function getXPosts(locals: App.Locals, opts: { limit?: number; columnistId?: string } = {}): Promise<XPost[]> {
  const sb = locals.supabase;
  if (!sb) return [];
  let q = sb.from('x_posts').select('*').order('posted_at', { ascending: false }).limit(opts.limit ?? 30);
  if (opts.columnistId) q = q.eq('columnist_id', opts.columnistId);
  const [{ data, error }, columnists] = await Promise.all([q, getColumnists(locals)]);
  if (error || !data) return [];
  const byId = new Map(columnists.map((c) => [c.id, c]));
  return (data as XPost[]).map((p) => ({ ...p, columnist: byId.get(p.columnist_id) })).filter((p) => p.columnist);
}

export async function getXPost(locals: App.Locals, id: string): Promise<XPost | null> {
  const sb = locals.supabase;
  if (!sb) return null;
  const { data } = await sb.from('x_posts').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const columnists = await getColumnists(locals);
  const columnist = columnists.find((c) => c.id === (data as XPost).columnist_id);
  return columnist ? { ...(data as XPost), columnist } : null;
}

/** Extrai {handle, id} de um link de post do X/Twitter. */
export function parseTweetUrl(raw: string): { handle: string; id: string } | null {
  const m = raw.trim().match(/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/i);
  return m ? { handle: m[1], id: m[2] } : null;
}

/** Busca o post na API publica do FxTwitter. */
export async function fetchTweet(handle: string, id: string): Promise<{ text: string; posted_at: string; media_url: string | null; author: { name: string; avatar: string | null; bio: string | null } } | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/${handle}/status/${id}`, { headers: { 'User-Agent': 'Mozilla/5.0 (O Nioaquense)' } });
    if (!res.ok) return null;
    const t = ((await res.json()) as any)?.tweet;
    if (!t) return null;
    const photo = t.media?.photos?.[0]?.url ?? t.media?.all?.find((m: any) => m.type === 'photo')?.url ?? null;
    return {
      text: String(t.text ?? t.raw_text?.text ?? ''),
      posted_at: t.created_timestamp ? new Date(t.created_timestamp * 1000).toISOString() : new Date(t.created_at).toISOString(),
      media_url: photo,
      author: { name: String(t.author?.name ?? handle), avatar: t.author?.avatar_url ?? null, bio: t.author?.description ?? null },
    };
  } catch {
    return null;
  }
}

export async function fetchXProfile(handle: string): Promise<{ name: string; bio: string | null; avatar: string | null } | null> {
  try {
    const res = await fetch(`https://api.fxtwitter.com/${handle}`, { headers: { 'User-Agent': 'Mozilla/5.0 (O Nioaquense)' } });
    if (!res.ok) return null;
    const u = ((await res.json()) as any)?.user;
    if (!u) return null;
    return { name: String(u.name ?? handle), bio: u.description ?? null, avatar: u.avatar_url ? String(u.avatar_url).replace('_normal.', '_400x400.') : null };
  } catch {
    return null;
  }
}
