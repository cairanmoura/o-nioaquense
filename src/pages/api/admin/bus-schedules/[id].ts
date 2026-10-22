import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { deleteBusSchedule, updateBusSchedule, type BusScheduleInput } from '../../../../lib/admin';

/** POST /api/admin/bus-schedules/[id] — atualiza ou remove uma linha. */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);
    const action = String(payload.action ?? 'update');

    if (action === 'delete') {
      const removed = await deleteBusSchedule(locals, session, id);
      return jsonOk({ removed });
    }

    const patch: Partial<BusScheduleInput> = {};

    if (payload.route_name !== undefined) patch.route_name = String(payload.route_name);
    if (payload.destination !== undefined) patch.destination = String(payload.destination);
    if (payload.departure_times !== undefined) {
      patch.departure_times = Array.isArray(payload.departure_times)
        ? (payload.departure_times as string[])
        : [];
    }
    if (payload.frequency !== undefined) {
      patch.frequency = payload.frequency ? String(payload.frequency) : null;
    }
    if (payload.notes !== undefined) patch.notes = payload.notes ? String(payload.notes) : null;
    if (payload.position !== undefined) patch.position = Number(payload.position);
    if (payload.active !== undefined) patch.active = Boolean(payload.active);

    const schedule = await updateBusSchedule(locals, session, id, patch);
    return jsonOk({ schedule });
  } catch (error) {
    return toErrorResponse(error);
  }
};
