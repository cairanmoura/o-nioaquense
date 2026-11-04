import type { APIRoute } from 'astro';

import { jsonOk, readPayload, requireSession, toErrorResponse } from '../../../lib/api';
import { isAdmin } from '../../../lib/auth';
import { createServiceClient } from '../../../lib/supabase/server';
import { iniciarRodada, lerConfig, lerEstado } from '../../../lib/transparencia-job';
import { dataLocal, devidaHoje, DIAS_SEMANA, diaExtraDaSemana, gravarChave, proximasAtualizacoes } from '../../../lib/transparencia-store';

export const prerender = false;

function preparar(locals: App.Locals) {
  const session = requireSession(locals);
  if (!isAdmin(session)) throw new Error('Acesso negado');
  const sb = createServiceClient(locals);
  if (!sb) throw new Error('Supabase nao configurado');
  return sb;
}

async function situacao(locals: App.Locals) {
  const sb = preparar(locals);
  const [estado, config, resumos] = await Promise.all([
    lerEstado(sb),
    lerConfig(sb),
    sb.from('transparencia_cache').select('key, updated_at').like('key', 'resumo:%').order('key'),
  ]);
  const hoje = dataLocal();
  return {
    estado,
    config,
    resumos: resumos.data ?? [],
    diaExtraDestaSemana: DIAS_SEMANA[diaExtraDaSemana(hoje.y, hoje.m, hoje.d)],
    hojeDevida: devidaHoje(config, hoje).devida,
    proximas: proximasAtualizacoes(config, 5),
  };
}

export const GET: APIRoute = async ({ locals }) => {
  try {
    return jsonOk(await situacao(locals));
  } catch (err) {
    return toErrorResponse(err);
  }
};

/** POST { acao: 'atualizar' } ou { acao: 'config', domingo, modo, diaFixo, ativo } */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sb = preparar(locals);
    const body = (await readPayload(request)) as Record<string, any>;
    const acao = String(body.acao ?? '');

    if (acao === 'atualizar') {
      const estado = await lerEstado(sb);
      if (estado.pendentes.length) return jsonOk({ ok: true, jaEmAndamento: true, ...(await situacao(locals)) });
      const queue = (locals as any).runtime?.env?.NEWS_QUEUE;
      if (!queue) throw new Error('Fila de tarefas indisponivel neste ambiente');
      await iniciarRodada(sb, queue, 'manual', Boolean(body.completa));
      return jsonOk({ ok: true, ...(await situacao(locals)) });
    }

    if (acao === 'config') {
      const atual = await lerConfig(sb);
      const cfg = {
        ...atual,
        domingo: body.domingo === undefined ? atual.domingo : Boolean(body.domingo),
        ativo: body.ativo === undefined ? atual.ativo : Boolean(body.ativo),
        modo: body.modo === 'fixo' ? ('fixo' as const) : ('auto' as const),
        diaFixo: Math.min(5, Math.max(2, Number(body.diaFixo) || atual.diaFixo)),
      };
      await gravarChave(sb, 'config', cfg);
      return jsonOk({ ok: true, ...(await situacao(locals)) });
    }

    throw new Error('Acao desconhecida');
  } catch (err) {
    return toErrorResponse(err);
  }
};
