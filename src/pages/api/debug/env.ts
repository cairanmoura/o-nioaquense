import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, request }) => {
  const runtimeEnv = (locals as any)?.runtime?.env as Record<string, unknown> | undefined;
  const session = (locals as any)?.adminUser;

  const cookie = request.headers.get('cookie') ?? '';
  const hasDemoCookie = cookie.includes('onioaquense_demo');
  const hasSbCookie = cookie.includes('sb-');

  return new Response(
    JSON.stringify({
      env: {
        hasSupabaseUrl: !!runtimeEnv?.SUPABASE_URL,
        hasAnonKey: !!runtimeEnv?.SUPABASE_ANON_KEY,
        hasServiceRole: !!runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY,
        hasCronSecret: !!runtimeEnv?.CRON_SECRET,
        allKeys: Object.keys(runtimeEnv ?? {}),
      },
      session: session
        ? {
            id: session.id,
            email: session.email,
            role: session.profile?.role,
            isAdmin: session.profile?.role === 'admin',
            isDemo: session.isDemo,
          }
        : null,
      cookies: {
        hasDemoCookie,
        hasSbCookie,
        cookieLength: cookie.length,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};
