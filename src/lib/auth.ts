/**
 * auth.ts
 * -----------------------------------------------------------------------------
 * Sessao e RBAC do painel /admin.
 *
 * Regra do projeto (AGENTS.md #3): **o papel e' sempre validado no servidor**.
 * O client nunca decide o que o usuario pode fazer - ele apenas envia
 * requisicoes; quem autoriza e' o servidor, usando o perfil lido do banco.
 */

import { demoStore, DEMO_ADMIN_ID, DEMO_COLUMNIST_ID } from './demo-store';
import { getSupabaseCredentials } from './supabase/server';
import type { Profile } from './types';

/** Cookie do modo demonstracao (so existe quando o Supabase nao esta configurado). */
export const DEMO_COOKIE = 'onioaquense_demo';

export type AdminRole = 'admin' | 'columnist';

export interface AdminSession {
  /** Id do usuario (auth.uid) ou do perfil de demonstracao. */
  id: string;
  email: string;
  profile: Profile;
  /** `true` quando a sessao veio do modo demonstracao (sem Supabase). */
  isDemo: boolean;
}

/** O Supabase esta configurado neste ambiente? */
export function isSupabaseConfigured(locals: App.Locals): boolean {
  return getSupabaseCredentials(locals) !== null;
}

/* -------------------------------------------------------------------------- */
/* Sessao                                                                     */
/* -------------------------------------------------------------------------- */

/** Le o perfil do usuario autenticado no banco (ignora RLS de escrita). */
async function loadProfile(locals: App.Locals, userId: string): Promise<Profile | null> {
  const supabase = locals.supabase;
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;

  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    slug: String(row.slug ?? ''),
    role: (row.role ?? 'columnist') as Profile['role'],
    column_name: row.column_name ? String(row.column_name) : null,
    bio: row.bio ? String(row.bio) : null,
    avatar_url: row.avatar_url ? String(row.avatar_url) : null,
    social_links:
      row.social_links && typeof row.social_links === 'object'
        ? (row.social_links as Record<string, string>)
        : {},
    can_publish_directly: Boolean(row.can_publish_directly),
    active: Boolean(row.active),
  };
}

/**
 * Resolve a sessao administrativa.
 * - Com Supabase: valida o token (getSession) e le o perfil no banco.
 * - Sem Supabase: aceita o cookie de demonstracao.
 */
export async function resolveAdminSession(
  locals: App.Locals,
  demoCookieValue?: string,
): Promise<AdminSession | null> {
  if (isSupabaseConfigured(locals)) {
    const { session, user } = await locals.getSession();
    if (!session || !user) return null;

    const profile = await loadProfile(locals, user.id);
    if (!profile || !profile.active) return null;

    return {
      id: user.id,
      email: user.email ?? '',
      profile,
      isDemo: false,
    };
  }

  /* ---- Modo demonstracao ---- */
  if (!demoCookieValue) return null;

  const profileId =
    demoCookieValue === 'admin'
      ? DEMO_ADMIN_ID
      : demoCookieValue === 'columnist'
        ? DEMO_COLUMNIST_ID
        : demoCookieValue;

  const profile = demoStore.findProfile(profileId);
  if (!profile || !profile.active) return null;

  return {
    id: profile.id,
    email: `${profile.slug}@exemplo.onioaquense.com.br`,
    profile,
    isDemo: true,
  };
}

/* -------------------------------------------------------------------------- */
/* RBAC                                                                       */
/* -------------------------------------------------------------------------- */

export function isAdmin(session: AdminSession | null | undefined): boolean {
  return session?.profile.role === 'admin';
}

/** O usuario pode publicar direto (sem passar pela revisao)? */
export function canPublishDirectly(session: AdminSession | null | undefined): boolean {
  if (!session) return false;
  return session.profile.role === 'admin' || session.profile.can_publish_directly;
}

/** O usuario e' dono da materia? */
export function ownsArticle(session: AdminSession | null | undefined, authorId: string): boolean {
  return Boolean(session && session.profile.id === authorId);
}

/** Erro de autorizacao padronizado (vira 403 na API). */
export class ForbiddenError extends Error {
  constructor(message = 'Voce nao tem permissao para esta acao.') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Erro de validacao (vira 400 na API). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
