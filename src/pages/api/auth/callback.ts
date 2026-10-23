import type { APIRoute } from 'astro';

/**
 * GET /api/auth/callback
 * -----------------------------------------------------------------------------
 * Destino do link enviado por e-mail (recuperacao de senha).
 *
 * O Supabase devolve um `code` de uso unico; trocamos por uma sessao curta,
 * gravada nos cookies, e seguimos para a tela de nova senha.
 */
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  const errorCode = url.searchParams.get('error_code');
  const next = url.searchParams.get('next') ?? '/admin';
  const safeNext = next.startsWith('/admin') ? next : '/admin';

  if (!locals.supabase) {
    return redirect('/admin/login?erro=config', 302);
  }

  // Link invalido/expirado: o proprio Supabase devolve `error_code`.
  if (!code || errorCode) {
    return redirect('/admin/login?erro=link', 302);
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('[auth] Falha ao validar o link de recuperacao:', error.message);
    return redirect('/admin/login?erro=link', 302);
  }

  return redirect(safeNext, 302);
};
