import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { createBusSchedule, type BusScheduleInput } from '../../../../lib/admin';

/** POST /api/admin/bus-schedules — cadastra uma linha de onibus. */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const input: BusScheduleInput = {
      route_name: String(payload.route_name ?? ''),
      destination: String(payload.destination ?? ''),
      departure_times: Array.isArray(payload.departure_times)
        ? (payload.departure_times as string[])
        : [],
      frequency: payload.frequency ? String(payload.frequency) : null,
      notes: payload.notes ? String(payload.notes) : null,
      position: payload.position ? Number(payload.position) : 0,
      active: payload.active === undefined ? true : Boolean(payload.active),
    };

    const schedule = await createBusSchedule(locals, session, input);
    return jsonOk({ schedule }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
};
