/**
 * api.ts
 * -----------------------------------------------------------------------------
 * Utilitarios compartilhados pelas rotas de API do painel /admin.
 */

import { ForbiddenError, ValidationError, type AdminSession } from './auth';

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Erro padronizado -> resposta HTTP. */
export function toErrorResponse(error: unknown): Response {
  if (error instanceof ForbiddenError) return jsonError(error.message, 403);
  if (error instanceof ValidationError) return jsonError(error.message, 400);

  const message = error instanceof Error ? error.message : 'Erro inesperado.';
  return jsonError(message, 500);
}

/**
 * Exige sessao administrativa valida.
 * O painel nunca confia no client: a sessao e' resolvida no servidor.
 */
export function requireSession(locals: App.Locals): AdminSession {
  const session = locals.adminUser;

  if (!session) {
    throw new ForbiddenError('Faca login para continuar.');
  }

  return session;
}

/** Le o corpo JSON de uma requisicao (aceita JSON puro ou FormData). */
export async function readPayload(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      return (await request.json()) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  const form = await request.formData();
  const payload: Record<string, unknown> = {};

  for (const [key, value] of form.entries()) {
    payload[key] = typeof value === 'string' ? value : value;
  }

  return payload;
}
