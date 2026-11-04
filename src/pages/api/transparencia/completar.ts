import type { APIRoute } from 'astro';
import { anosDisponiveis, getDespesasAno } from '../../../lib/transparencia';

export const prerender = false;

/** Le mais alguns detalhes de empenhos no portal (lote pequeno) e diz quantos faltam. */
export const GET: APIRoute = async ({ locals, url }) => {
  const anos = anosDisponiveis();
  const ano = Number(url.searchParams.get('ano'));
  if (!anos.includes(ano)) return new Response('{"faltam":0}', { status: 400 });
  const r = await getDespesasAno(locals, ano, 30);
  return new Response(JSON.stringify({ faltam: r?.semDetalhe ?? 0 }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
