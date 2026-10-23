import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { deleteAd, updateAd, type AdInput } from '../../../../lib/admin';
import type { AdOfferType, AdSlotPosition } from '../../../../lib/types';

/**
 * POST /api/admin/ads/[id]
 * -----------------------------------------------------------------------------
 * Atualiza um anuncio local: ativa/pausa, edita dados, troca a foto, muda a
 * posicao no site e o periodo de veiculacao.
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);
    const patch: Partial<AdInput> = {};

    if (payload.active !== undefined) patch.active = Boolean(payload.active);
    if (payload.client_name !== undefined) patch.client_name = String(payload.client_name);
    if (payload.title !== undefined) patch.title = String(payload.title);
    if (payload.image_url !== undefined) {
      patch.image_url = payload.image_url ? String(payload.image_url) : null;
    }
    if (payload.target_url !== undefined) {
      patch.target_url = payload.target_url ? String(payload.target_url) : null;
    }
    if (payload.whatsapp_number !== undefined) {
      patch.whatsapp_number = payload.whatsapp_number ? String(payload.whatsapp_number) : null;
    }
    if (payload.slot_position !== undefined) {
      patch.slot_position = String(payload.slot_position) as AdSlotPosition;
    }
    if (payload.offer_type !== undefined) {
      patch.offer_type = String(payload.offer_type) as AdOfferType;
    }
    if (payload.price_label !== undefined) {
      patch.price_label = payload.price_label ? String(payload.price_label) : null;
    }
    if (payload.notes !== undefined) patch.notes = payload.notes ? String(payload.notes) : null;
    if (payload.starts_at !== undefined) {
      patch.starts_at = payload.starts_at ? toIsoDate(String(payload.starts_at)) : null;
    }
    if (payload.ends_at !== undefined) {
      patch.ends_at = payload.ends_at ? toIsoDate(String(payload.ends_at)) : null;
    }

    const ad = await updateAd(locals, session, id, patch);
    return jsonOk({ ad });
  } catch (error) {
    return toErrorResponse(error);
  }
};

/**
 * DELETE /api/admin/ads/[id]
 * -----------------------------------------------------------------------------
 * Exclui definitivamente um anuncio local.
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';
    if (!id) throw new Error('Anuncio invalido.');

    const deleted = await deleteAd(locals, session, id);
    return jsonOk({ deleted });
  } catch (error) {
    return toErrorResponse(error);
  }
};

/** "2026-10-22" -> ISO completo (inicio do dia, UTC). */
function toIsoDate(value: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00:00.000Z`;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
