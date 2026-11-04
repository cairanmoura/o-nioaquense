import type { APIRoute } from 'astro';
import { createServiceClient } from '../../lib/supabase/server';
import { jsonError, jsonOk } from '../../lib/api';
import { hashIp, moderar } from '../../lib/comments';

/**
 * GET  /api/comentarios?slug=...  -> comentarios aprovados da materia
 * POST /api/comentarios           -> { slug, name, body, website (isca), t (hora de abertura) }
 *
 * Anti-spam: campo-isca `website`, tempo minimo de preenchimento (4 s), limite
 * por IP (3 a cada 10 min e 20 por dia), comentario repetido, links/contatos,
 * propaganda e baixo calao (src/lib/comments.ts). Escrita so pelo servidor.
 */
type Sb = NonNullable<ReturnType<typeof createServiceClient>>;

async function articleId(sb: Sb, slug: string): Promise<string | null> {
  const { data } = await sb.from('articles').select('id').eq('slug', slug).eq('status', 'published').maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export const GET: APIRoute = async ({ url, locals }) => {
  const sb = createServiceClient(locals);
  const slug = url.searchParams.get('slug') ?? '';
  const empty = () => new Response(JSON.stringify({ comments: [] }), { headers: { 'Content-Type': 'application/json' } });
  if (!sb || !slug) return empty();
  const id = await articleId(sb, slug);
  if (!id) return empty();
  const { data } = await sb
    .from('article_comments')
    .select('id, author_name, body, created_at')
    .eq('article_id', id)
    .eq('status', 'approved')
    .order('created_at', { ascending: true })
    .limit(100);
  return new Response(JSON.stringify({ comments: data ?? [] }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  let p: { slug?: string; name?: string; body?: string; website?: string; t?: number };
  try {
    p = await request.json();
  } catch {
    return jsonError('Não foi possível ler o comentário.', 400);
  }

  // Isca: robos preenchem; fingimos sucesso
  if (p.website) return jsonOk({ ok: true, status: 'pending' }, 201);

  const sb = createServiceClient(locals);
  if (!sb) return jsonError('Comentários indisponíveis no momento.', 503);

  if (typeof p.t !== 'number' || Date.now() - p.t < 4000) {
    return jsonError('Aguarde alguns segundos antes de enviar.', 429);
  }

  const name = (p.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const body = (p.body ?? '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (name.length < 2) return jsonError('Informe seu nome (ou apelido).', 400);

  const v = moderar(name, body);
  if (v.acao === 'reject') return jsonError(v.mensagem, 422);

  const id = await articleId(sb, p.slug ?? '');
  if (!id) return jsonError('Matéria não encontrada.', 404);

  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for') ?? 'local';
  const env = locals.runtime?.env as unknown as Record<string, string> | undefined;
  const salt = env?.SUPABASE_SERVICE_ROLE_KEY?.slice(-12) ?? 'nioaque';
  const ipHash = await hashIp(ip, salt);

  const desde = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  const [recent, day, dup] = await Promise.all([
    sb.from('article_comments').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', desde(10)),
    sb.from('article_comments').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', desde(1440)),
    sb.from('article_comments').select('id', { count: 'exact', head: true }).eq('article_id', id).eq('body', body),
  ]);
  if ((recent.count ?? 0) >= 3 || (day.count ?? 0) >= 20) return jsonError('Muitos comentários em pouco tempo. Tente mais tarde.', 429);
  if ((dup.count ?? 0) > 0) return jsonError('Você já enviou esse comentário.', 409);

  const status = v.acao === 'ok' ? 'approved' : 'pending';
  const { error } = await sb.from('article_comments').insert({
    article_id: id,
    author_name: name,
    body,
    status,
    flag_reason: v.acao === 'pending' ? v.motivo : null,
    ip_hash: ipHash,
  });
  if (error) return jsonError('Não foi possível enviar agora.', 500);
  return jsonOk({ ok: true, status }, 201);
};
