-- Cotacoes da faixa Agro (home). Valores iniciais de REFERENCIA: atualize
-- pela tabela public.market_quotes (value, change_percent, updated_at).
-- O dolar e' atualizado automaticamente pelo cron horario.
create unique index if not exists market_quotes_symbol_key on public.market_quotes (symbol);

insert into public.market_quotes (symbol, label, value, change_percent, unit)
values
  ('dolar',     'Dólar Comercial',         5.04,   0, 'R$'),
  ('boi_gordo', 'Arroba do Boi Gordo (MS)', 300.00, 0, 'R$/@'),
  ('soja',      'Saca de Soja 60kg (Maracaju)', 125.00, 0, 'R$/sc')
on conflict (symbol) do nothing;
