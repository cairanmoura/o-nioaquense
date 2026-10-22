import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { updateUtility } from '../../../../lib/admin';
import type { AlertLevel } from '../../../../lib/types';

/**
 * POST /api/admin/utilities/[id]
 * -----------------------------------------------------------------------------
 * Atualiza a farmacia de plantao / alerta / horarios de onibus de um dia.
 *
 * Aceita JSON e FormData. No FormData, o checkbox `alert_active` so chega
 * marcado; por isso a ausencia da chave significa "desligar".
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);
    const isForm = !(request.headers.get('content-type') ?? '').includes('application/json');

    const patch: Record<string, unknown> = {};

    if (payload.pharmacy_name !== undefined) patch.pharmacy_name = String(payload.pharmacy_name);
    if (payload.pharmacy_phone !== undefined) {
      patch.pharmacy_phone = payload.pharmacy_phone ? String(payload.pharmacy_phone) : null;
    }
    if (payload.pharmacy_address !== undefined) {
      patch.pharmacy_address = payload.pharmacy_address ? String(payload.pharmacy_address) : null;
    }
    if (payload.alert_active !== undefined) {
      patch.alert_active = Boolean(payload.alert_active);
    } else if (isForm) {
      // Formulario sem o checkbox marcado => alerta desligado
      patch.alert_active = false;
    }
    if (payload.alert_message !== undefined) {
      patch.alert_message = payload.alert_message ? String(payload.alert_message) : null;
    }
    if (payload.alert_level !== undefined) {
      patch.alert_level = String(payload.alert_level) as AlertLevel;
    }
    if (payload.bus_schedule_html !== undefined) {
      patch.bus_schedule_html = payload.bus_schedule_html ? String(payload.bus_schedule_html) : null;
    }

    const utility = await updateUtility(locals, session, id, patch);
    return jsonOk({ utility });
  } catch (error) {
    return toErrorResponse(error);
  }
};
