import type { APIRoute } from 'astro';
import { jsonOk, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { createServiceClient } from '../../../lib/supabase/server';

/** PATCH { id, status: approved|pending|rejected } | DELETE ?id=<uuid> : moderacao de comentarios. */
function guard(locals: App.Locals) {
  const session = requireSession(locals);
  if (!isAdmin(session)) throw new Error('Acesso negado');
  const sb = createServiceClient(locals);
  if (!sb) throw new Error('Supabase nao configurado');
  return sb;
}

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const sb = guard(locals);
    const { id, status } = (await request.json()) as { id?: string; status?: string };
    if (!id || !['approved', 'pending', 'rejected'].includes(status ?? '')) throw new Error('Dados invalidos');
    const { error } = await sb.from('article_comments').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
};

export const DELETE: APIRoute = async ({ url, locals }) => {
  try {
    const sb = guard(locals);
    const id = url.searchParams.get('id');
    if (!id) throw new Error('Informe o id');
    const { error } = await sb.from('article_comments').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return jsonOk({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
};
