import type { APIRoute } from 'astro';

import { DEMO_COOKIE, isSupabaseConfigured } from '../../../lib/auth';

/** POST /api/auth/logout — encerra a sessao (Supabase ou demonstracao). */
export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  if (isSupabaseConfigured(locals)) {
    await locals.supabase!.auth.signOut();
  }

  cookies.delete(DEMO_COOKIE, { path: '/' });

  return redirect('/admin/login', 302);
};
