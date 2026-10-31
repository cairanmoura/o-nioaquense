-- 020: Metropoles (politica e economia do Brasil e do Mundo). Portal privado:
-- reescrita pela IA, sempre rascunho. O feed ja traz a materia inteira.
insert into public.news_sources (name, rss_url, source_type, ownership, is_active, auto_publish, ai_rewrite, use_original_image, keywords_filter, default_category, default_scope) values
 ('Metrópoles Brasil', 'https://www.metropoles.com/brasil/feed', 'rss', 'private', true, false, true, true,
  'política,politica,economia,governo,congresso,senado,câmara,camara,stf,lula,ministro,ministério,ministerio,inflação,inflacao,juros,selic,dólar,dolar,banco central,imposto,orçamento,orcamento,eleição,eleicao,mercado,pib', 'Política', 'brasil'),
 ('Metrópoles Mundo', 'https://www.metropoles.com/mundo/feed', 'rss', 'private', true, false, true, true,
  'presidente,governo,eleição,eleicao,economia,tarifa,trump,guerra,otan,onu,china,estados unidos,união europeia,uniao europeia,mercado,banco,petróleo,petroleo,sanção,sancao,acordo', 'Mundo', 'mundo')
on conflict (rss_url) do update set name = excluded.name, is_active = true, keywords_filter = excluded.keywords_filter,
  default_scope = excluded.default_scope, updated_at = now();
