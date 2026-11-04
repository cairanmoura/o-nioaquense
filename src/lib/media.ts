/**
 * media.ts
 * -----------------------------------------------------------------------------
 * Download seguro de imagens de portais externos (com Referer e User-Agent de
 * navegador, para furar hotlink protection) e espelhamento no Supabase Storage.
 */

import { BROWSER_UA } from './extractor';

const MAX_BYTES = 8 * 1024 * 1024;

/** Bloqueia URLs que nao sejam http(s) publicas (anti-SSRF). */
export function isSafeRemoteUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
    const h = u.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
    if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return false;
    if (h === '[::1]' || h.startsWith('[fc') || h.startsWith('[fd') || h.startsWith('[fe80')) return false;
    return true;
  } catch {
    return false;
  }
}

export interface FetchedImage {
  bytes: Uint8Array;
  mime: string;
}

export async function fetchImage(url: string, referer?: string): Promise<FetchedImage | null> {
  if (!isSafeRemoteUrl(url)) return null;
  const origin = (() => {
    try {
      return new URL(referer ?? url).origin + '/';
    } catch {
      return undefined;
    }
  })();

  try {
    const res = await fetch(url.replace(/^http:\/\//i, 'https://'), {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        ...(origin ? { Referer: referer ?? origin } : {}),
      },
      redirect: 'follow',
    } as RequestInit);
    if (!res.ok) return null;
    const mime = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!mime.startsWith('image/') || mime.includes('svg')) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 2000 || buf.byteLength > MAX_BYTES) return null;
    return { bytes: buf, mime };
  } catch {
    return null;
  }
}

/**
 * Baixa a imagem e sobe para o bucket `covers` do Supabase Storage.
 * Devolve a URL publica propria, ou null se algo falhar.
 */
export async function mirrorImageToStorage(supabase: any, url: string, referer?: string): Promise<string | null> {
  const img = await fetchImage(url, referer);
  if (!img || !supabase) return null;
  const ext = img.mime.includes('webp') ? 'webp' : img.mime.includes('png') ? 'png' : img.mime.includes('avif') ? 'avif' : 'jpg';
  const path = `imports/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('covers').upload(path, img.bytes, {
    contentType: img.mime,
    cacheControl: '31536000', // nome unico por imagem: cache de 1 ano (PageSpeed: ciclo de vida de cache)
    upsert: false,
  });
  if (error) return null;
  return supabase.storage.from('covers').getPublicUrl(path).data.publicUrl as string;
}

/** URL do proxy interno (para exibir fotos no painel sem hotlink/mixed content). */
export function proxied(url: string, referer?: string): string {
  const q = new URLSearchParams({ url });
  if (referer) q.set('ref', referer);
  return `/api/media/proxy?${q.toString()}`;
}
