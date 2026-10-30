import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals, request }) => {
  const runtimeEnv = (locals as any)?.runtime?.env as Record<string, unknown> | undefined;
  const session = (locals as any)?.adminUser;
  const cookie = request.headers.get('cookie') ?? '';

  return new Response(
    JSON.stringify({
      ok: true,
      session: session
        ? {
            id: session.id,
            role: session.profile?.role,
            isAdmin: session.profile?.role === 'admin',
            isDemo: session.isDemo,
            email: session.email,
          }
        : null,
      cookies: {
        hasCookie: cookie.length > 0,
        hasDemoCookie: cookie.includes('onioaquense_demo'),
        hasSbCookie: cookie.includes('sb-'),
        cookiePreview: cookie.slice(0, 100) + (cookie.length > 100 ? '...' : ''),
      },
      env: {
        hasCronSecret: !!runtimeEnv?.CRON_SECRET,
        hasSupabaseUrl: !!runtimeEnv?.SUPABASE_URL,
        hasAnonKey: !!runtimeEnv?.SUPABASE_ANON_KEY,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
};
