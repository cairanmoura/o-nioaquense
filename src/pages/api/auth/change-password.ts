import type { APIRoute } from 'astro';

/**
 * POST /api/auth/change-password
 * -----------------------------------------------------------------------------
 * Troca de senha com o usuario ja autenticado (card "Senha de acesso" no
 * perfil). Funciona sem e-mail: e' o caminho mais rapido para sair de uma
 * senha temporaria.
 *
 * A senha atual e' conferida de verdade: refazemos o login no Supabase antes
 * de chamar `updateUser` (que, sozinho, aceitaria a troca apenas com o cookie).
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const session = locals.adminUser;

  if (!session) {
    return redirect('/admin/login', 302);
  }

  if (session.isDemo || !locals.supabase) {
    return redirect('/admin/perfil?erro=demo', 302);
  }

  const form = await request.formData();
  const current = String(form.get('current_password') ?? '');
  const password = String(form.get('new_password') ?? '');
  const confirm = String(form.get('confirm_password') ?? '');

  if (!current) {
    return redirect('/admin/perfil?erro=atual', 302);
  }

  if (password.length < 8) {
    return redirect('/admin/perfil?erro=curta', 302);
  }

  if (password !== confirm) {
    return redirect('/admin/perfil?erro=confirmacao', 302);
  }

  if (password === current) {
    return redirect('/admin/perfil?erro=igual', 302);
  }

  const { error: checkError } = await locals.supabase.auth.signInWithPassword({
    email: session.email,
    password: current,
  });

  if (checkError) {
    return redirect('/admin/perfil?erro=atual', 302);
  }

  const { error } = await locals.supabase.auth.updateUser({ password });

  if (error) {
    console.error('[auth] Falha ao trocar a senha:', error.message);
    return redirect('/admin/perfil?erro=supabase', 302);
  }

  return redirect('/admin/perfil?senha=ok', 302);
};
