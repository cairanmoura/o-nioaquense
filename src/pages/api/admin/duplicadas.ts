import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { jsonOk, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';

/** DELETE ?id=<uuid> | ?all=1 : descarta duplicadas guardadas. */
export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    if (!isAdmin(session)) throw new Error('Acesso negado');
    const creds = getSupabaseCredentials(locals);
    const key = getServiceRoleKey(locals);
    if (!creds || !key) throw new Error('Supabase nao configurado');
    const sb = createClient(creds.url, key, { auth: { persistSession: false } });
    const u = new URL(request.url);
    const id = u.searchParams.get('id');
    const q = id ? sb.from('duplicate_articles').delete().eq('id', id) : u.searchParams.get('all') ? sb.from('duplicate_articles').delete().not('id', 'is', null) : null;
    if (!q) throw new Error('Informe id ou all');
    const { error } = await q;
    if (error) throw new Error(error.message);
    return jsonOk({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
};
