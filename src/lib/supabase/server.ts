/**
 * Cliente Supabase para o servidor (SSR).
 *
 * Usa `@supabase/ssr` com os cookies do Astro para manter a sessao
 * entre requisicoes. Funciona tanto no `astro dev` quanto no Cloudflare Worker
 * (bindings em `locals.runtime.env`, variaveis `PUBLIC_*` via `import.meta.env`).
 */

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ServerContext {
  request: Request;
  cookies: AstroCookies;
  locals: App.Locals;
}

/** Le um valor do ambiente, priorizando os bindings do Worker. */
export function readEnv(
  locals: App.Locals,
  key: string,
): string | undefined {
  const runtimeEnv = locals.runtime?.env as Record<string, unknown> | undefined;
  const fromRuntime = runtimeEnv?.[key];
  if (typeof fromRuntime === 'string' && fromRuntime.trim() !== '') {
    return fromRuntime.trim();
  }

  const fromBuild = (import.meta.env as Record<string, string | undefined>)[key];
  if (typeof fromBuild === 'string' && fromBuild.trim() !== '') {
    return fromBuild.trim();
  }

  return undefined;
}

/** URL + chave anon do Supabase, ou `null` se ainda nao configurado. */
export function getSupabaseCredentials(
  locals: App.Locals,
): { url: string; anonKey: string } | null {
  const url = readEnv(locals, 'PUBLIC_SUPABASE_URL');
  const anonKey = readEnv(locals, 'PUBLIC_SUPABASE_ANON_KEY');

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

/**
 * Chave `service_role` (opcional). Usada apenas no servidor, em operacoes
 * que o anon key nao pode fazer (upload de midia, leitura de tabela restrita).
 */
export function getServiceRoleKey(locals: App.Locals): string | undefined {
  return readEnv(locals, 'SUPABASE_SERVICE_ROLE_KEY');
}

/** Cliente com privilegios elevados (service role). `null` se nao houver chave. */
export function createServiceClient(locals: App.Locals): SupabaseClient | null {
  const credentials = getSupabaseCredentials(locals);
  const serviceKey = getServiceRoleKey(locals);

  if (!credentials || !serviceKey) return null;

  return createClient(credentials.url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** Converte o cabecalho `Cookie` em pares `{ name, value }`. */
function parseCookieHeader(header: string | null): { name: string; value: string }[] {
  if (!header) return [];

  return header
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf('=');
      if (separator === -1) return { name: part, value: '' };

      const name = part.slice(0, separator).trim();
      const rawValue = part.slice(separator + 1).trim();

      let value = rawValue;
      try {
        value = decodeURIComponent(rawValue);
      } catch {
        value = rawValue;
      }

      return { name, value };
    });
}

/**
 * Cria o cliente Supabase amarrado aos cookies da requisicao.
 * Retorna `null` quando as chaves ainda nao foram configuradas (modo mock).
 */
export function createSupabaseServerClient(context: ServerContext): SupabaseClient | null {
  const credentials = getSupabaseCredentials(context.locals);
  if (!credentials) return null;

  return createServerClient(credentials.url, credentials.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(context.request.headers.get('cookie'));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          context.cookies.set(name, value, {
            path: '/',
            ...options,
          });
        }
      },
    },
  });
}
