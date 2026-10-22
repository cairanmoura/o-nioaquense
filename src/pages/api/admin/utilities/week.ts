import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { upsertWeeklyUtilities, type WeekEntry } from '../../../../lib/admin';

/**
 * POST /api/admin/utilities/week
 * -----------------------------------------------------------------------------
 * Salva a escala da farmacia de plantao da semana de uma vez (upsert por
 * `duty_date`).
 *
 * Aceita dois formatos:
 *   JSON      { "week": [{ "duty_date": "2026-10-19", "pharmacy_name": "...", ... }] }
 *   FormData  nome-2026-10-19=...&tel-2026-10-19=...   (formulario sem JS)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    let week: WeekEntry[] = [];

    if (Array.isArray(payload.week)) {
      week = (payload.week as Partial<WeekEntry>[]).map((entry) => ({
        duty_date: String(entry.duty_date ?? ''),
        pharmacy_name: String(entry.pharmacy_name ?? ''),
        pharmacy_phone: entry.pharmacy_phone ? String(entry.pharmacy_phone) : null,
        pharmacy_address: entry.pharmacy_address ? String(entry.pharmacy_address) : null,
      }));
    } else {
      // Formulario: pares "nome-<iso>" e "tel-<iso>"
      const byDate = new Map<string, WeekEntry>();

      for (const [key, value] of Object.entries(payload)) {
        const match = /^(nome|tel)-(20\d{2}-\d{2}-\d{2})$/.exec(key);
        if (!match) continue;

        const kind = match[1]!;
        const iso = match[2]!;
        const entry = byDate.get(iso) ?? {
          duty_date: iso,
          pharmacy_name: '',
          pharmacy_phone: null,
          pharmacy_address: null,
        };

        if (kind === 'nome') entry.pharmacy_name = String(value ?? '');
        if (kind === 'tel') entry.pharmacy_phone = String(value ?? '') || null;

        byDate.set(iso, entry);
      }

      week = [...byDate.values()];
    }

    const saved = await upsertWeeklyUtilities(locals, session, week);

    return jsonOk({ utilities: saved });
  } catch (error) {
    return toErrorResponse(error);
  }
};
