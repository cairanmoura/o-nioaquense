import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../../lib/api';
import { isAdmin } from '../../../../lib/auth';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const creds = getSupabaseCredentials(locals);
    const key = getServiceRoleKey(locals);
    if (!creds || !key) throw new Error('Supabase nao configurado');
    const client = createClient(creds.url, key, { auth: { persistSession: false } });
    const payload = await readPayload(request);
    // Lista branca: so estes campos podem ser alterados pelo painel
    const ALLOWED = ['name', 'rss_url', 'source_type', 'ownership', 'is_active', 'auto_publish', 'ai_rewrite', 'use_original_image', 'keywords_filter', 'default_category', 'default_scope'];
    const patch: Record<string, unknown> = {};
    for (const k of ALLOWED) if (k in payload) patch[k] = (payload as any)[k];
    if (patch.source_type && patch.source_type !== 'html_scraper') patch.source_type = 'rss';
    if (patch.ownership && patch.ownership !== 'public') patch.ownership = 'private';
    if (patch.name === null || patch.rss_url === null) throw new Error('Nome e URL sao obrigatorios');

    let result = await client.from('news_sources').update(patch).eq('id', params.id).select().single();
    // Migracao 016 ainda nao rodou: tenta de novo sem o campo novo
    if (result.error && /default_scope/.test(result.error.message) && 'default_scope' in patch) {
      delete patch.default_scope;
      result = await client.from('news_sources').update(patch).eq('id', params.id).select().single();
    }
    const { data, error } = result;
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return toErrorResponse(err);
  }
};

export const DELETE: APIRoute = async ({ locals, params }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const creds = getSupabaseCredentials(locals);
    const key = getServiceRoleKey(locals);
    if (!creds || !key) throw new Error('Supabase nao configurado');
    const client = createClient(creds.url, key, { auth: { persistSession: false } });
    const { error } = await client.from('news_sources').delete().eq('id', params.id);
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return toErrorResponse(err);
  }
};
