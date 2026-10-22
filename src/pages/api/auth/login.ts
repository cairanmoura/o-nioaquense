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

  /* -------------------- Supabase (producao) -------------------- */
  if (isSupabaseConfigured(locals)) {
    if (!email || !password) {
      return json({ error: 'Informe e-mail e senha.' }, 400);
    }

    const { error } = await locals.supabase!.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return json({ error: 'E-mail ou senha invalidos.' }, 401);
    }

    return redirect(safeNext, 302);
  }

  /* -------------------- Modo demonstracao -------------------- */
  if (demoRole !== 'admin' && demoRole !== 'columnist') {
    return json({ error: 'Perfil de demonstracao invalido.' }, 400);
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

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
