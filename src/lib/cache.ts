/**
 * cache.ts
 * -----------------------------------------------------------------------------
 * Politicas de cache da borda (Cloudflare).
 *
 * O portal e' SSR: cada requisicao renderiza no Worker. Para aguentar picos de
 * trafego em noticias urgentes sem custo extra, as paginas publicas sao:
 *
 *   - servidas do cache da borda (`caches.default`) enquanto valem;
 *   - devolvidas com `Cache-Control: public, s-maxage=<X>, stale-while-revalidate=<Y>`,
 *     o que permite ao CDN do Cloudflare entregar a versao antiga enquanto
 *     revalida em segundo plano (zero espera para o morador).
 *
 * Paginas do painel e APIs NUNCA sao cacheadas.
 */

export interface CachePolicy {
  /** Tempo que o edge/CDN guarda a resposta (segundos). */
  sMaxAge: number;
  /** Tempo que a versao antiga ainda pode ser servida (segundos). */
  staleWhileRevalidate: number;
  /** `no-store` para conteudo sensivel. */
  private?: boolean;
}

export const CACHE_POLICIES = {
  /** Home: muda o dia todo, mas precisa reflecting noticia nova rapido. */
  home: { sMaxAge: 60, staleWhileRevalidate: 300 },
  /** Materia: uma vez publicada, muda pouco. */
  article: { sMaxAge: 300, staleWhileRevalidate: 3600 },
  /** Editorias, busca, paginas institucionais. */
  page: { sMaxAge: 120, staleWhileRevalidate: 600 },
  /** Sitemap e robots: atualizados com pouca frequencia. */
  seo: { sMaxAge: 900, staleWhileRevalidate: 3600 },
  /** Painel e APIs: nada de cache. */
  private: { sMaxAge: 0, staleWhileRevalidate: 0, private: true },
} as const satisfies Record<string, CachePolicy>;

export type CachePolicyName = keyof typeof CACHE_POLICIES;

/** Monta o cabecalho `Cache-Control` de uma politica. */
export function cacheControl(policy: CachePolicy): string {
  if (policy.private) {
    return 'private, no-store, max-age=0, must-revalidate';
  }

  return [
    'public',
    'max-age=0',
    `s-maxage=${policy.sMaxAge}`,
    `stale-while-revalidate=${policy.staleWhileRevalidate}`,
  ].join(', ');
}

/** Define os cabecolos de cache numa resposta. */
export function applyCacheHeaders(response: Response, policy: CachePolicy): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', cacheControl(policy));

  if (policy.private) {
    headers.set('Vary', 'Cookie');
  } else {
    headers.set('CDN-Cache-Control', cacheControl(policy));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/** Escolhe a politica pelo caminho da requisicao. */
export function policyForPath(pathname: string): CachePolicy {
  if (pathname.startsWith('/admin') || pathname.startsWith('/api')) {
    return CACHE_POLICIES.private;
  }

  if (pathname === '/' || pathname === '/') {
    return CACHE_POLICIES.home;
  }

  if (pathname.startsWith('/materia/')) {
    return CACHE_POLICIES.article;
  }

  if (pathname.endsWith('.xml') || pathname.endsWith('.txt') || pathname.endsWith('.json')) {
    return CACHE_POLICIES.seo;
  }

  return CACHE_POLICIES.page;
}

/** A requisicao pode ser servida do cache? */
export function isCacheable(request: Request, method = request.method): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;

  const url = new URL(request.url);

  // Nunca cachear quem esta autenticado (previa do painel).
  if (request.headers.has('authorization')) return false;
  if (request.headers.get('cookie')?.includes('sb-') || request.headers.get('cookie')?.includes('onioaquense_demo')) {
    return false;
  }

  // Respostas de API e painel ficam de fora.
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api')) return false;

  return true;
}

/* -------------------------------------------------------------------------- */
/* Cache da borda (API do Cloudflare)                                          */
/* -------------------------------------------------------------------------- */

/**
 * A `caches.default` do Cloudflare usa os tipos de `workers-types`, que sao
 * diferentes dos tipos DOM de `Request`/`Response`. Esta interface isolada
 * evita espalhar casts pelo middleware.
 */
export interface EdgeCache {
  match(request: unknown): Promise<Response | undefined>;
  put(request: unknown, response: unknown): Promise<void>;
}

/** Obtem o cache da borda (ou `null` fora do Cloudflare). */
export function getEdgeCache(locals: App.Locals): EdgeCache | null {
  const cache = locals.runtime?.caches?.default as unknown as EdgeCache | undefined;
  return cache ?? null;
}
