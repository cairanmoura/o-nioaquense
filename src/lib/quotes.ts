/**
 * Atualizacao automatica da cotacao do dolar (AwesomeAPI, sem chave).
 * Boi gordo e soja nao tem API gratuita confiavel: ficam em `market_quotes`
 * e sao atualizados manualmente (symbols `boi_gordo` e `soja`).
 */
export async function refreshDollarQuote(supabase: any): Promise<boolean> {
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; ONioaquenseBot/1.0)', Accept: 'application/json' };
    let value = NaN;
    let change = 0;
    try {
      const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL', { headers });
      if (res.ok) {
        const data = (await res.json())?.USDBRL;
        value = Number(data?.bid);
        change = Number(data?.pctChange);
      }
    } catch {
      // cai no fallback
    }
    if (!Number.isFinite(value) || value <= 0) {
      // Fallback: open.er-api.com (sem chave)
      const res2 = await fetch('https://open.er-api.com/v6/latest/USD', { headers });
      if (res2.ok) value = Number((await res2.json())?.rates?.BRL);
    }
    if (!Number.isFinite(value) || value <= 0) return false;
    const { error } = await supabase.from('market_quotes').upsert(
      {
        symbol: 'dolar',
        label: 'Dólar Comercial',
        value,
        change_percent: Number.isFinite(change) ? change : 0,
        unit: 'R$',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'symbol' },
    );
    return !error;
  } catch {
    return false;
  }
}

/**
 * Boi gordo (MS) e soja via AgroDoc API (JSON publico, CC-BY-4.0).
 * Atualiza as linhas de `market_quotes` pelo `symbol` (boi_gordo / soja).
 */
export async function refreshAgroQuotes(supabase: any): Promise<{ boi_gordo: number | null; soja: number | null }> {
  const out = { boi_gordo: null as number | null, soja: null as number | null };
  try {
    const res = await fetch('https://agrodocai.com.br/api/v1/cotacao?uf=MS', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return out;
    const json: any = await res.json();
    const boi = Number(json?.boi_gordo_uf?.preco);
    const soja = Number(json?.soja);
    const now = new Date().toISOString();

    const save = async (symbol: string, label: string, value: number, unit: string) => {
      if (!Number.isFinite(value) || value <= 0) return false;
      const { data: prev } = await supabase.from('market_quotes').select('value').eq('symbol', symbol).maybeSingle();
      const old = Number(prev?.value);
      const change = old > 0 ? ((value - old) / old) * 100 : 0;
      const { error } = await supabase
        .from('market_quotes')
        .upsert({ symbol, label, value, change_percent: Number(change.toFixed(2)), unit, updated_at: now }, { onConflict: 'symbol' });
      return !error;
    };

    if (await save('boi_gordo', 'Boi Gordo (@ MS)', boi, 'R$/@')) out.boi_gordo = boi;
    if (await save('soja', 'Soja (Sc 60kg)', soja, 'R$/sc')) out.soja = soja;
  } catch {
    // mantem o ultimo valor salvo
  }
  return out;
}
