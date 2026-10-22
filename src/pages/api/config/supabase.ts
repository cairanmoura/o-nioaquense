import type { APIRoute } from 'astro';

import { getSupabaseCredentials } from '../../../lib/supabase/server';

/**
 * GET /api/config/supabase
 * -----------------------------------------------------------------------------
 * Expõe a URL e a anon key do Supabase para o navegador.
 *
 * Esses valores são lidos das secrets do servidor (SUPABASE_URL,
 * SUPABASE_ANON_KEY) e nunca incluem a service_role key. É seguro expor para
 * o cliente porque a anon key e' projetada para uso público (RLS protege os
 * dados).
 */
export const GET: APIRoute = async ({ locals }) => {
  const creds = getSupabaseCredentials(locals);

  if (!creds) {
    return new Response(
      JSON.stringify({ error: 'Supabase nao configurado' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(
    JSON.stringify({
      url: creds.url,
      anonKey: creds.anonKey,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
