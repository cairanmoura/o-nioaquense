/// <reference types="astro/client" />

/* -----------------------------------------------------------------------------
 * Tipagem do ambiente (Astro 5 + @astrojs/cloudflare v12 + Supabase)
 * -----------------------------------------------------------------------------
 * `Runtime` vem do adaptador Cloudflare e expoe `locals.runtime.env`
 * (bindings + variaveis do Worker). `Env` descreve os bindings que usamos.
 * -------------------------------------------------------------------------- */

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<Env>;
type SupabaseClient = import('@supabase/supabase-js').SupabaseClient;
type SupabaseSession = import('@supabase/supabase-js').Session;
type SupabaseUser = import('@supabase/supabase-js').User;

declare namespace App {
  interface Locals extends CloudflareRuntime {
    /** Cliente Supabase ligado ao cookie da requisicao (null se nao configurado). */
    supabase: SupabaseClient | null;
    /** Le a sessao do usuario autenticado com seguranca (valida no servidor). */
    getSession: () => Promise<{ session: SupabaseSession | null; user: SupabaseUser | null }>;
    /** Sessao administrativa resolvida (null fora do /admin ou sem login). */
    adminUser: import('./lib/auth').AdminSession | null;
  }
}

/** Bindings/variaveis disponiveis no Worker. */
interface Env {
  PUBLIC_SUPABASE_URL?: string;
  PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  COHERE_API_KEY?: string;
  APIFY_TOKEN?: string;
  [key: string]: unknown;
}

/** Variaveis publicas expostas ao bundle do cliente. */
interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_GOOGLE_ADSENSE_CLIENT?: string;
  readonly PUBLIC_ADSENSE_SLOT_DEFAULT?: string;
  /** WhatsApp da redação (canal "Mande sua Notícia"). */
  readonly PUBLIC_REDACAO_WHATSAPP?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
