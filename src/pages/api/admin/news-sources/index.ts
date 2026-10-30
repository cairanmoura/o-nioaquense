import type { APIRoute } from 'astro';

import { readPayload, requireSession, toErrorResponse } from '../../../../lib/api';
import { isAdmin } from '../../../../lib/auth';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../../lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getClient(locals: any) {
  const creds = getSupabaseCredentials(locals);
  const key = getServiceRoleKey(locals);
  if (!creds || !key) return null;
  return createClient(creds.url, key, { auth: { persistSession: false } });
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const client = getClient(locals);
    if (!client) throw new Error('Supabase nao configurado');
    const { data, error } = await client.from('news_sources').select('*').order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify(data ?? []), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return toErrorResponse(err);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const client = getClient(locals);
    if (!client) throw new Error('Supabase nao configurado');
    const payload = await readPayload(request);
    const { data, error } = await client.from('news_sources').insert({
      name: String(payload.name ?? ''),
      rss_url: String(payload.rss_url ?? ''),
      source_type: payload.source_type === 'html_scraper' ? 'html_scraper' : 'rss',
      is_active: payload.is_active !== false,
      auto_publish: payload.auto_publish !== false,
      ai_rewrite: payload.ai_rewrite !== false,
      use_original_image: payload.use_original_image !== false,
      keywords_filter: payload.keywords_filter ? String(payload.keywords_filter) : null,
      default_category: payload.default_category ? String(payload.default_category) : null,
    }).select().single();
    if (error) throw new Error(error.message);
    return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return toErrorResponse(err);
  }
};
