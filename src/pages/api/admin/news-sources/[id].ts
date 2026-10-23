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
    const { data, error } = await client
      .from('news_sources')
      .update(payload)
      .eq('id', params.id)
      .select()
      .single();
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
