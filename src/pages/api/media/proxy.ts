import type { APIRoute } from 'astro';

import { isAdmin } from '../../../lib/auth';
import { fetchImage } from '../../../lib/media';

/**
 * GET /api/media/proxy?url=...&ref=...
 * Proxy de imagem para o painel: faz o fetch no servidor com Referer e
 * User-Agent de navegador (evita hotlink protection e mixed content).
 * Restrito a admins; so aceita URLs http(s) publicas.
 */
export const GET: APIRoute = async ({ url, locals }) => {
  const session = (locals as any).adminUser;
  if (!session || !isAdmin(session)) return new Response('Nao autorizado', { status: 401 });

  const target = url.searchParams.get('url') ?? '';
  const ref = url.searchParams.get('ref') ?? undefined;
  const img = await fetchImage(target, ref);
  if (!img) return new Response('Imagem indisponivel', { status: 404 });

  return new Response(img.bytes as unknown as BodyInit, {
    headers: {
      'Content-Type': img.mime,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
