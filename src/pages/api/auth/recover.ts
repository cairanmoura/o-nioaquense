import type { APIRoute } from 'astro';

/**
 * POST /api/auth/recover
 * -----------------------------------------------------------------------------
 * Dispara o e-mail de redefinicao de senha do Supabase Auth.
 *
 * A resposta e' sempre a mesma, exista ou nao o e-mail cadastrado: isso evita
 * que a tela sirva para descobrir quais contas existem no portal (enumeracao
 * de usuarios).
 *
 * O link do e-mail aponta para `/api/auth/callback`, que troca o codigo por
 * uma sessao temporaria e leva o usuario para `/admin/redefinir-senha`.
 */
export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const email = String(form.get('email') ?? '')
    .trim()
    .toLowerCase();

  if (!locals.supabase) {
    return redirect('/admin/recuperar-senha?erro=config', 302);
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return redirect('/admin/recuperar-senha?erro=email', 302);
  }

  const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${url.origin}/api/auth/callback?next=/admin/redefinir-senha`,
  });

  // Nao revelamos o erro na tela: ele pode significar "e-mail inexistente"
  // ou limite de envio atingido. A resposta e' identica nos dois casos.
  if (error) {
    console.error('[auth] Falha ao enviar recuperacao de senha:', error.message);
  }

  return redirect('/admin/recuperar-senha?enviado=1', 302);
};
