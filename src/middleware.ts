import { defineMiddleware } from 'astro:middleware';
import { DEMO_COOKIE, resolveAdminSession } from './lib/auth';
import { CACHE_POLICIES, applyCacheHeaders, getEdgeCache, isCacheable, policyForPath } from './lib/cache';
import { createSupabaseServerClient } from './lib/supabase/server';

/**
 * Middleware global.
 *
 * Responsabilidades:
 *  - criar o cliente SupabaseSSR amarrado aos cookies da requisicao;
 *  - expor `locals.getSession()` para validar a sessao no servidor
 *    (a coluna do portal nunca confia em dados do cliente);
 *  - **proteger as rotas `/admin/*`**: sem sessao valida, o usuario vai
 *    para `/admin/login`;
 *  - **cache na borda**: paginas publicas sao servidas do cache do Cloudflare
 *    com `s-maxage` + `stale-while-revalidate` (picos de trafego sem custo).
 *
 * Se as chaves do Supabase ainda nao estiverem configuradas, o cliente e'
 * `null` e o portal funciona 100% com os dados mock de `src/lib/mock-data.ts`.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createSupabaseServerClient(context);

  context.locals.supabase = supabase;
  context.locals.getSession = async () => {
    if (!supabase) return { session: null, user: null };

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return { session, user: session?.user ?? null };
  };

  const pathname = context.url.pathname;

  // Paginas do painel e suas APIs precisam da sessao resolvida no servidor.
  const isAdminPage = pathname.startsWith('/admin');
  const isAdminApi = pathname.startsWith('/api/admin');

  if (isAdminPage || isAdminApi) {
    const isLoginRoute = pathname === '/admin/login';

    const demoCookie = context.cookies.get(DEMO_COOKIE)?.value;
    const session = await resolveAdminSession(context.locals, demoCookie);

    context.locals.adminUser = session;

    if (isAdminPage) {
      if (!session && !isLoginRoute) {
        const next_ = encodeURIComponent(`${pathname}${context.url.search}`);
        // O redirect sai antes do bloco de cache: aplicamos a politica
        // `private` aqui para que nem o navegador nem o CDN guardem o 302.
        return applyCacheHeaders(
          context.redirect(`/admin/login?next=${next_}`),
          CACHE_POLICIES.private,
        );
      }

      if (session && isLoginRoute) {
        return applyCacheHeaders(context.redirect('/admin'), CACHE_POLICIES.private);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Cache da borda                                                    */
  /* ---------------------------------------------------------------- */
  const policy = policyForPath(pathname);
  const cacheable = isCacheable(context.request);

  if (!cacheable || policy.private) {
    const response = await next();
    return applyCacheHeaders(response, policy);
  }

  const edgeCache = getEdgeCache(context.locals);

  if (!edgeCache) {
    const response = await next();
    return applyCacheHeaders(response, policy);
  }

  const cacheKey = context.request.url;

  // Quanto tempo a versao gravada ainda pode ser entregue.
  const maxStaleMs = (policy.sMaxAge + policy.staleWhileRevalidate) * 1000;

  try {
    const cached = await edgeCache.match(cacheKey);

    if (cached) {
      // Carimbo gravado por nos no momento do `put`. Entradas antigas (sem o
      // carimbo) sao tratadas como vencidas: o `Date` nao serve porque a borda
      // o reescreve a cada entrega.
      const stamped = Number(cached.headers.get('x-edge-stored-at'));
      const ageMs =
        Number.isFinite(stamped) && stamped > 0
          ? Date.now() - stamped
          : Number.POSITIVE_INFINITY;

      // Sem essa checagem a borda serviria a mesma pagina para sempre.
      if (ageMs >= 0 && ageMs <= maxStaleMs) {
        return applyCacheHeaders(cached, policy);
      }
    }
  } catch {
    /* cache indisponivel: seguimos servindo direto */
  }

  const response = await next();

  // Os cabecalhos entram ANTES de gravar no cache: e' o `Cache-Control` da
  // resposta guardada que define a validade da entrada na borda.
  const finalResponse = applyCacheHeaders(response, policy);

  try {
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      const clone = finalResponse.clone();
      const headers = new Headers(clone.headers);
      headers.set('x-edge-stored-at', String(Date.now()));

      await edgeCache.put(
        cacheKey,
        new Response(clone.body, { status: clone.status, statusText: clone.statusText, headers }),
      );
    }
  } catch {
    /* falha ao gravar no cache: o usuario nao e' afetado */
  }

  return finalResponse;
});
