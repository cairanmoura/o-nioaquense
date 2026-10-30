/**
 * Atualizacao automatica da cotacao do dolar (AwesomeAPI, sem chave).
 * Boi gordo e soja nao tem API gratuita confiavel: ficam em `market_quotes`
 * e sao atualizados manualmente (symbols `boi_gordo` e `soja`).
 */
export async function refreshDollarQuote(supabase: any): Promise<boolean> {
  try {
    const res = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
    if (!res.ok) return false;
    const data = (await res.json())?.USDBRL;
    const value = Number(data?.bid);
    const change = Number(data?.pctChange);
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
