import type { APIRoute } from 'astro';

import { DEMO_COOKIE, isSupabaseConfigured } from '../../../lib/auth';

/**
 * POST /api/auth/login
 * -----------------------------------------------------------------------------
 * Autenticacao do painel /admin.
 *
 * Com Supabase configurado: e-mail + senha (validados pelo Supabase Auth).
 * Sem Supabase: modo demonstracao local, com um perfil de exemplo.
 *
 * O modo demonstracao e' **impossivel** quando o Supabase esta configurado -
 * a rota devolve 403 nesse caso.
 */
export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const demoRole = String(form.get('demo_role') ?? '');
  const next = String(form.get('next') ?? '/admin');

  const safeNext = next.startsWith('/admin') ? next : '/admin';

  /** Volta para o login preservando o destino e o motivo da falha. */
  const backToLogin = (code: string) =>
    redirect(
      `/admin/login?next=${encodeURIComponent(safeNext)}&erro=${encodeURIComponent(code)}`,
      302,
    );

  /* -------------------- Supabase (producao) -------------------- */
  if (isSupabaseConfigured(locals)) {
    if (!email || !password) {
      return backToLogin('campos');
    }

    const { error } = await locals.supabase!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return backToLogin('credenciais');
    }

    return redirect(safeNext, 302);
  }

  /* -------------------- Modo demonstracao -------------------- */
  if (demoRole !== 'admin' && demoRole !== 'columnist') {
    return backToLogin('demo');
  }

  cookies.set(DEMO_COOKIE, demoRole, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 8,
  });

  return redirect(safeNext, 302);
};
