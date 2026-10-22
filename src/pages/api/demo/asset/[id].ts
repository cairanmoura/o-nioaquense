import type { APIRoute } from 'astro';

import { demoStore } from '../../../../lib/demo-store';
import { isSupabaseConfigured } from '../../../../lib/auth';

/**
 * GET /api/demo/asset/[id]
 * -----------------------------------------------------------------------------
 * Serve as imagens enviadas no modo demonstracao (sem Supabase).
 * Com o Supabase configurado, a rota nao existe de fato: as capas vao para o
 * bucket `covers` do Storage.
 */
export const GET: APIRoute = async ({ params, locals }) => {
  if (isSupabaseConfigured(locals)) {
    return new Response('Nao disponivel', { status: 404 });
  }

  const asset = demoStore.getAsset(params.id ?? '');

  if (!asset) {
    return new Response('Nao encontrado', { status: 404 });
  }

  return new Response(asset.data, {
    headers: {
      'Content-Type': asset.mime,
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
