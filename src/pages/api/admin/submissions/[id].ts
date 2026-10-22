import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../../lib/api';
import { convertSubmissionToDraft, updateSubmission } from '../../../../lib/admin';
import type { SubmissionStatus } from '../../../../lib/types';

/**
 * POST /api/admin/submissions/[id]
 * -----------------------------------------------------------------------------
 * - `status` : muda o status da pista (reviewed, archived, ...)
 * - `action` = `to_draft` : transforma a pista em um rascunho de materia
 */
export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const session = requireSession(locals);
    const id = params.id ?? '';

    const payload = await readPayload(request);

    if (String(payload.action ?? '') === 'to_draft') {
      const result = await convertSubmissionToDraft(locals, session, id);
      return jsonOk(result, 201);
    }

    const status = String(payload.status ?? 'reviewed') as SubmissionStatus;
    const submission = await updateSubmission(locals, session, id, status);

    return jsonOk({ submission });
  } catch (error) {
    return toErrorResponse(error);
  }
};
