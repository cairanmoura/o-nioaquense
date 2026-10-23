import type { APIRoute } from 'astro';

/**
 * POST /api/auth/reset-password
 * -----------------------------------------------------------------------------
 * Define a nova senha depois que o usuario abriu o link do e-mail.
 *
 * Exige a sessao temporaria criada em `/api/auth/callback` - sem ela, o
 * `updateUser` nao tem a quem aplicar a senha.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  if (!locals.supabase) {
    return redirect('/admin/login?erro=config', 302);
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const confirm = String(form.get('confirm') ?? '');

  if (password.length < 8) {
    return redirect('/admin/redefinir-senha?erro=curta', 302);
  }

  if (password !== confirm) {
    return redirect('/admin/redefinir-senha?erro=confirmacao', 302);
  }

  const {
    data: { user },
  } = await locals.supabase.auth.getUser();

  if (!user) {
    return redirect('/admin/login?erro=link', 302);
  }

  const { error } = await locals.supabase.auth.updateUser({ password });

  if (error) {
    console.error('[auth] Falha ao definir a nova senha:', error.message);
    return redirect('/admin/redefinir-senha?erro=supabase', 302);
  }

  return redirect('/admin/perfil?senha=ok', 302);
};
