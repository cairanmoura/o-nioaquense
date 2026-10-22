import type { APIRoute } from 'astro';

import { adDestination } from '../../../../lib/ads';
import { getAdById } from '../../../../lib/content';

/**
 * GET /api/ads/click/[id]
 * -----------------------------------------------------------------------------
 * Rota de contagem de clique dos anuncios locais.
 *
 * O botao "Chamar no WhatsApp" (e o banner) NUNCA apontam direto para o
 * anunciante: eles passam por aqui. A rota:
 *
 *   1. busca o anuncio no banco (ou no mock);
 *   2. incrementa `clicks_count` via RPC `increment_ad_clicks`;
 *   3. redireciona (302) para o WhatsApp ou para a URL de destino.
 *
 * Sem o passo 2, nenhum click seria contabilizado.
 */
export const GET: APIRoute = async ({ params, redirect, locals }) => {
  const id = params.id ?? '';
  const ad = await getAdById(locals, id);

  // Contabiliza o clique (falha no contador nunca deve quebrar a navegacao)
  if (locals.supabase && id) {
    try {
      await locals.supabase.rpc('increment_ad_clicks', { p_ad_id: id });
    } catch {
      /* contador indisponivel: seguimos com o redirecionamento */
    }
  }

  return redirect(adDestination(ad), 302);
};
