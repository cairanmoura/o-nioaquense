import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';
import { refreshAgroQuotes, refreshDollarQuote } from '../../../lib/quotes';

/**
 * GET /api/cron/update-quotes
 * Atualiza dolar (AwesomeAPI) e boi gordo MS + soja (AgroDoc API) em
 * `market_quotes`. Protegido por `x-cron-secret` quando CRON_SECRET existe.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  const expected = (locals as any)?.runtime?.env?.CRON_SECRET ?? '';
  if (expected && request.headers.get('x-cron-secret') !== expected) {
    return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 401 });
  }

  const creds = getSupabaseCredentials(locals);
  const serviceKey = getServiceRoleKey(locals);
  if (!creds || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Supabase nao configurado' }), { status: 500 });
  }
  const supabase = createClient(creds.url, serviceKey, { auth: { persistSession: false } });

  const dolar = await refreshDollarQuote(supabase);
  const agro = await refreshAgroQuotes(supabase);
  return new Response(JSON.stringify({ ok: true, dolar, ...agro }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
