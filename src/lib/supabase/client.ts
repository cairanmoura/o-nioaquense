/**
 * Cliente Supabase para o navegador.
 *
 * Usado apenas pelas ilhas React interativas (formulario de pista do leitor,
 * login no painel /admin).
 *
 * As credenciais sao obtidas primeiro de `import.meta.env.PUBLIC_*` (build
 * time) e, em falta disso, do endpoint `/api/config/supabase` (runtime,
 * lido das secrets do servidor).
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

async function loadConfig(): Promise<{ url: string; anonKey: string } | null> {
  // 1) Variaveis de build (Vite expso so PUBLIC_*)
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (url && anonKey) {
    return { url, anonKey };
  }

  // 2) Endpoint de runtime (ler as secrets do servidor)
  try {
    const res = await fetch('/api/config/supabase', {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { url?: string; anonKey?: string };

    if (data.url && data.anonKey) {
      return { url: data.url, anonKey: data.anonKey };
    }
  } catch {
    /* endpoint indisponível: segue sem Supabase */
  }

  return null;
}

/** Retorna o cliente do navegador ou `null` se o Supabase nao estiver configurado. */
export async function createSupabaseBrowserClient(): Promise<SupabaseClient | null> {
  if (cached) return cached;

  const config = await loadConfig();

  if (!config) return null;

  cached = createBrowserClient(config.url, config.anonKey);
  return cached;
}
