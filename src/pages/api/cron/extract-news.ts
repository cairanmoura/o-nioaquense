import type { APIRoute } from 'astro';

import { getServiceRoleKey, getSupabaseCredentials, createSupabaseServerClient } from '../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { discoverSource, processEntry, refreshQuotes, sweepSources, type NewsJob } from '../../../lib/pipeline';

/**
 * POST/GET /api/cron/extract-news
 * -----------------------------------------------------------------------------
 * Disparado manualmente pelo admin (/admin/fontes -> "Extrair agora").
 * O cron do Cloudflare NAO passa mais por aqui: src/worker.ts enfileira direto.
 *
 * Busca as fontes ativas em `news_sources`, extrai as ultimas materias do RSS,
 * aplica filtro de palavras-chave, classifica geograficamente (scope + local_tags)
 * pelo conteudo, extrai a foto real da materia original, opcionalmente reescreve
 * com IA e insere como `status = 'published'` (auto_publish) ou `status = 'draft'`.
 *
 * Protegido por `x-cron-secret` (igual a CRON_SECRET) OU sessao admin.
 */

/* -------------------------------------------------------------------------- */
/* Handler principal                                                          */
/* -------------------------------------------------------------------------- */

export const GET: APIRoute = async ({ request, locals }) => {
  const secret = request.headers.get('x-cron-secret');
  const expected = (locals as any)?.runtime?.env?.CRON_SECRET ?? '';
  const isCron = !expected || (expected && secret === expected);

  if (!isCron && expected) {
    let session = (locals as any)?.adminUser;

    // Se o middleware nao resolveu a sessao (ex.: rotas /api/cron antes do ajuste),
    // tentamos resolver manualmente usando o cookie sb-...-auth-token do Supabase.
    if (!session || session.role !== 'admin') {
      // 2a) Token enviado explicitamente pelo cliente no header x-user-token.
      // Mais confiavel do que depender do cookie no Worker (que nem sempre chega parseado).
      try {
        const userToken = request.headers.get('x-user-token');
        if (userToken) {
          const { url } = getSupabaseCredentials(locals) ?? {};
          const serviceKey = getServiceRoleKey(locals);
          if (url && serviceKey) {
            const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
            const { data } = await adminClient.auth.getUser(userToken);
            if (data?.user) {
              const { data: profile } = await adminClient
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .maybeSingle();
              if (profile && profile.role === 'admin' && profile.active) {
                session = { id: profile.id, role: profile.role };
              }
            }
          }
        }
      } catch {
        // ignora
      }
    }

    if (!session || session.role !== 'admin') {
      try {
        const supabase = createSupabaseServerClient({
          request,
          cookies: {
            getAll() {
              const cookieHeader = request.headers.get('cookie') ?? '';
              return cookieHeader
                .split(';')
                .map((part) => part.trim())
                .filter(Boolean)
                .map((part) => {
                  const sep = part.indexOf('=');
                  if (sep === -1) return { name: part, value: '' };
                  return {
                    name: part.slice(0, sep).trim(),
                    value: part.slice(sep + 1).trim(),
                  };
                });
            },
            setAll() {},
          },
          locals,
        } as any);

        if (!supabase) throw new Error('sem supabase');

        const {
          data: { session: supabaseSession },
        } = await supabase.auth.getSession();

        if (supabaseSession?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseSession.user.id)
            .maybeSingle();

          if (profile && profile.role === 'admin' && profile.active) {
            session = {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email ?? '',
              profile: {
                id: profile.id,
                full_name: profile.full_name ?? '',
                slug: profile.slug ?? '',
                role: profile.role as 'admin' | 'columnist',
                column_name: profile.column_name ?? null,
                bio: profile.bio ?? null,
                avatar_url: profile.avatar_url ?? null,
                social_links: profile.social_links ?? {},
                can_publish_directly: profile.can_publish_directly ?? false,
                active: profile.active ?? false,
              },
              isDemo: false,
            };
          }
        }
      } catch {
        // ignora erro de resolucao manual de sessao
      }
    }

    if (!session || session.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Nao autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const creds = getSupabaseCredentials(locals);
  const serviceKey = getServiceRoleKey(locals);
  if (!creds || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase nao configurado' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const supabase = createClient(creds.url, serviceKey, { auth: { persistSession: false } });
  const env = (locals as any)?.runtime?.env ?? {};
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

  // Producao: so enfileira. Quem trabalha e' o consumidor da fila (src/worker.ts),
  // uma materia por invocacao, sem teto de 5 por rodada.
  if (env.NEWS_QUEUE && !import.meta.env.DEV) {
    const backfill = new URL(request.url).searchParams.get('backfill') === '1';
    await env.NEWS_QUEUE.send({ type: 'sweep', backfill } satisfies NewsJob);
    return json({ ok: true, queued: true, backfill });
  }

  // Dev local (sem consumidor de fila): executa inline, poucas materias por fonte
  const sources = await sweepSources(supabase);
  const results: Record<string, unknown>[] = [];
  let inserted = 0;
  for (const s of sources) {
    const { data: source } = await supabase.from('news_sources').select('*').eq('id', s.id).maybeSingle();
    if (!source) continue;
    try {
      const { entries } = await discoverSource(supabase, source);
      let ins = 0;
      for (const entry of entries.slice(0, 2)) {
        const out = await processEntry(supabase, env, source, entry);
        if (out.status === 'inserted') ins++;
      }
      inserted += ins;
      results.push({ source: source.name, inserted: ins });
    } catch (e: any) {
      results.push({ source: source.name, inserted: 0, error: e?.message });
    }
  }
  await refreshQuotes(supabase);
  return json({ ok: true, inserted, results });
};

export const POST = GET;
