import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { upsertWeeklyUtilities, type WeekEntry } from '../../../../lib/admin';

/**
 * POST /api/admin/utilities/week
 * -----------------------------------------------------------------------------
 * Salva a escala da farmacia de plantao da semana de uma vez.
 * Body: { week: [{ duty_date, pharmacy_name, pharmacy_phone, pharmacy_address }] }
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const week = Array.isArray(payload.week)
      ? (payload.week as Partial<WeekEntry>[]).map((entry) => ({
          duty_date: String(entry.duty_date ?? ''),
          pharmacy_name: String(entry.pharmacy_name ?? ''),
          pharmacy_phone: entry.pharmacy_phone ? String(entry.pharmacy_phone) : null,
          pharmacy_address: entry.pharmacy_address ? String(entry.pharmacy_address) : null,
        }))
      : [];

    const saved = await upsertWeeklyUtilities(locals, session, week);

    return jsonOk({ utilities: saved });
  } catch (error) {
    return toErrorResponse(error);
  }
};
