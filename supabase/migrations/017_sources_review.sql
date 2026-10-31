-- 017: revisao das fontes automaticas.
--  * Primeira Pagina cobre MT e MS: restringe ao caminho /mato-grosso-do-sul (consulta + filtro pela URL).
--  * Local padrao so como desempate: o local real vem do assunto da materia (IA + palavras-chave).
--  * Agencias publicas passam a usar a IA apenas para classificar (local, tema, tags) e gerar o
--    "Direto ao Ponto"; o texto publicado continua sendo o original.
update public.news_sources
   set rss_url = 'https://www.bing.com/news/search?q=site%3Aprimeirapagina.com.br%2Fmato-grosso-do-sul&format=rss&setlang=pt-BR&cc=BR',
       keywords_filter = 'mato-grosso-do-sul',
       updated_at = now()
 where name ilike 'primeira p%gina%';

update public.news_sources set default_scope = 'brasil', ai_rewrite = true where name ilike 'ag%ncia brasil%';
update public.news_sources set default_scope = 'ms',     ai_rewrite = true where name ilike 'ag%ncia de not%cias%ms%';
update public.news_sources set default_scope = 'ms'
 where name in ('TopMidiaNews', 'Campo Grande News', 'G1 Mato Grosso do Sul') or name ilike 'primeira p%gina%';
