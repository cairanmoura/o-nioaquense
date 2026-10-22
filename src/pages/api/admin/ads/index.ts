import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { createAd, type AdInput } from '../../../../lib/admin';
import type { AdOfferType, AdSlotPosition } from '../../../../lib/types';

/** POST /api/admin/ads — cadastra um banner ou uma "Oferta do Dia". */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const input: AdInput = {
      client_name: String(payload.client_name ?? ''),
      title: String(payload.title ?? ''),
      image_url: payload.image_url ? String(payload.image_url) : null,
      target_url: payload.target_url ? String(payload.target_url) : null,
      whatsapp_number: payload.whatsapp_number ? String(payload.whatsapp_number) : null,
      slot_position: (payload.slot_position ?? 'sidebar') as AdSlotPosition,
      offer_type: (payload.offer_type ?? 'banner') as AdOfferType,
      price_label: payload.price_label ? String(payload.price_label) : null,
      notes: payload.notes ? String(payload.notes) : null,
      starts_at: payload.starts_at ? toIsoDate(String(payload.starts_at)) : null,
      ends_at: payload.ends_at ? toIsoDate(String(payload.ends_at)) : null,
      active: payload.active === undefined ? true : Boolean(payload.active),
    };

    const ad = await createAd(locals, session, input);
    return jsonOk({ ad }, 201);
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
