/**
 * Atualizacao automatica das loterias (Caixa) pela API aberta
 * guto-alves/loterias-api. O host e' gratuito e pode ficar fora do ar: qualquer
 * falha mantem o ultimo resultado ja gravado em `lottery_results`.
 */

const BASE = 'https://loteriascaixa-api.herokuapp.com/api';

const MODALITIES: Array<{ slug: string; label: string }> = [
  { slug: 'megasena', label: 'Mega-Sena' },
  { slug: 'quina', label: 'Quina' },
  { slug: 'lotofacil', label: 'Lotofacil' },
  { slug: 'lotomania', label: 'Lotomania' },
  { slug: 'duplasena', label: 'Duplasena' },
];

/** "dd/mm/aaaa" -> "aaaa-mm-dd" (null se invalida). */
function isoDate(br: unknown): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br ?? ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

function brl(value: unknown): string | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0
    ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
    : null;
}

/** Busca o ultimo concurso de cada modalidade e grava (idempotente). */
export async function refreshLotteries(supabase: any): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  await Promise.all(
    MODALITIES.map(async ({ slug, label }) => {
      try {
        const res = await fetch(`${BASE}/${slug}/latest`, {
          headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; ONioaquenseBot/1.0)' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) {
          out[slug] = `http ${res.status}`;
          return;
        }
        const d: any = await res.json();
        const date = isoDate(d?.data);
        const numbers = Array.isArray(d?.dezenas) ? d.dezenas.map(String) : [];
        if (!d?.concurso || !date || numbers.length === 0) {
          out[slug] = 'resposta invalida';
          return;
        }
        const { error } = await supabase.from('lottery_results').upsert(
          {
            modality: label,
            contest_number: String(d.concurso),
            contest_date: date,
            numbers,
            prize_value: brl(d.valorEstimadoProximoConcurso),
          },
          { onConflict: 'modality,contest_number,contest_date' },
        );
        out[slug] = error ? `erro: ${error.message}` : `ok #${d.concurso}`;
      } catch (e: any) {
        out[slug] = `falhou: ${e?.message ?? e}`;
      }
    }),
  );
  return out;
}
