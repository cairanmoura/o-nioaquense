/**
 * Cliente Supabase para o navegador.
 *
 * Usado apenas pelas ilhas React interativas (formulario de pista do leitor,
 * login no painel /admin). O `PUBLIC_*` e' seguro para expor no bundle.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/** Retorna o cliente do navegador ou `null` se o Supabase nao estiver configurado. */
export function createSupabaseBrowserClient(): SupabaseClient | null {
  if (cached) return cached;

  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  cached = createBrowserClient(url, anonKey);
  return cached;
}
