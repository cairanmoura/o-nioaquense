import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { getServiceRoleKey, getSupabaseCredentials } from '../../../lib/supabase/server';
import { refreshLotteries } from '../../../lib/lotteries';

/**
 * GET /api/cron/update-lotteries
 * Atualiza `lottery_results` (loterias-api). Protegido por `x-cron-secret`
 * quando CRON_SECRET existe.
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
  const result = await refreshLotteries(supabase);
  return new Response(JSON.stringify({ ok: true, result }), { headers: { 'Content-Type': 'application/json' } });
};
