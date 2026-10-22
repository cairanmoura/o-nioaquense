import type { APIRoute } from 'astro';

import { readPayload, requireSession, jsonOk, toErrorResponse } from '../../../lib/api';
import { updateOwnProfile, type ProfileInput } from '../../../lib/admin';

/**
 * POST /api/admin/me
 * -----------------------------------------------------------------------------
 * Atualiza o proprio perfil (foto, bio, nome da coluna).
 *
 * O usuario so mexe no proprio perfil - e nunca em `role` nem em
 * `can_publish_directly` (validado no banco pelo trigger
 * `guard_profile_privileges`).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = requireSession(locals);
    const payload = await readPayload(request);

    const input: ProfileInput = {
      full_name: String(payload.full_name ?? session.profile.full_name),
      column_name: payload.column_name ? String(payload.column_name) : null,
      bio: payload.bio ? String(payload.bio) : null,
      avatar_url: payload.avatar_url ? String(payload.avatar_url) : null,
      social_links:
        payload.social_links && typeof payload.social_links === 'object'
          ? (payload.social_links as Record<string, string>)
          : session.profile.social_links,
    };

    const profile = await updateOwnProfile(locals, session, input);
    return jsonOk({ profile });
  } catch (error) {
    return toErrorResponse(error);
  }
};
