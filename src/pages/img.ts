import type { APIRoute } from 'astro';
import { IMG_WIDTHS } from '../lib/img';

/**
 * GET /img?p=imports/<arquivo>&w=480
 * -----------------------------------------------------------------------------
 * Redimensiona capas do Supabase (bucket `covers`) com o binding Images da
 * Cloudflare e devolve em AVIF/WebP com cache de 1 ano. So aceita o bucket
 * `covers` e larguras fixas (nao e' um proxy aberto). Se a transformacao falhar
 * (limite gratuito, formato raro), redireciona para a imagem original.
 */
const ORIGIN = 'https://ejlnffliojbtgpfeestj.supabase.co/storage/v1/object/public/covers/';
const CACHE = 'public, max-age=31536000, immutable';

export const GET: APIRoute = async ({ url, request, locals }) => {
  const path = url.searchParams.get('p') ?? '';
  const w = Number(url.searchParams.get('w'));

  if (!/^[\w\-./]+$/.test(path) || path.includes('..') || !(IMG_WIDTHS as readonly number[]).includes(w)) {
    return new Response('Bad request', { status: 400 });
  }

  const origin = ORIGIN + path;
  const runtime = locals.runtime as unknown as { env?: { IMAGES?: any }; caches?: { default?: Cache } } | undefined;
  const images = runtime?.env?.IMAGES;
  const accept = request.headers.get('accept') ?? '';
  const format = accept.includes('image/avif') ? 'image/avif' : 'image/webp';

  const cache = runtime?.caches?.default;
  const key = new Request(`${url.origin}/img?p=${encodeURIComponent(path)}&w=${w}&f=${format}`);
  const hit = await cache?.match(key);
  if (hit) return hit;

  const fallback = () => new Response(null, { status: 302, headers: { Location: origin, 'Cache-Control': 'public, max-age=300' } });
  if (!images) return fallback();

  try {
    const src = await fetch(origin);
    if (!src.ok || !src.body) return fallback();
    const out = (await images.input(src.body).transform({ width: w, fit: 'scale-down' }).output({ format, quality: 78 })).response();
    const res = new Response(out.body, {
      headers: { 'Content-Type': format, 'Cache-Control': CACHE, Vary: 'Accept', 'X-Robots-Tag': 'noindex' },
    });
    if (cache) await cache.put(key, res.clone());
    return res;
  } catch {
    return fallback();
  }
};
