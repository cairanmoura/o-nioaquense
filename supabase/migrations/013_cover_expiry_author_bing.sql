-- =============================================================================
-- 013: validade da capa manual, nome do autor por materia, Google News -> Bing
-- =============================================================================
alter table public.articles add column if not exists tags text[] default '{}';
alter table public.articles add column if not exists author_name text;
alter table public.articles add column if not exists featured_until timestamptz;

-- Google News bloqueia o Worker da Cloudflare; Bing News aceita e ja entrega
-- o link real da materia + o nome do veiculo.
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=Nioaque&format=rss&setlang=pt-BR&cc=BR'
 where name = 'Radar Google News - Nioaque Direto';
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=%22Jardim+MS%22+OR+Bonito+OR+Aquidauana+OR+Anast%C3%A1cio+OR+%22BR-060%22&format=rss&setlang=pt-BR&cc=BR',
       name = 'Radar Regiao Sudoeste/Pantanal'
 where name = 'Radar Google News - Regiao Sudoeste/Pantanal';
update public.news_sources set name = 'Radar Nioaque Direto' where name = 'Radar Google News - Nioaque Direto';
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=site%3Atopmidianews.com.br&format=rss&setlang=pt-BR&cc=BR'
 where rss_url like 'https://news.google.com/rss/search?q=site:topmidianews%';
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=site%3Aprimeirapagina.com.br&format=rss&setlang=pt-BR&cc=BR'
 where rss_url like 'https://news.google.com/rss/search?q=site:primeirapagina%';
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=site%3Ag1.globo.com%2Fms&format=rss&setlang=pt-BR&cc=BR'
 where rss_url like 'https://news.google.com/rss/search?q=site:g1.globo.com%';
update public.news_sources set rss_url = 'https://www.bing.com/news/search?q=site%3Acampograndenews.com.br&format=rss&setlang=pt-BR&cc=BR'
 where rss_url like 'https://news.google.com/rss/search?q=site:campograndenews%';

-- Credito correto: a materia "Carreta do Dogao" e' do Jornal O Pantaneiro
update public.articles
   set source_name = 'Jornal O Pantaneiro',
       content = regexp_replace(content, '(<p>Fonte: <a [^>]*>)[^<]*(</a>)', '\1Jornal O Pantaneiro\2')
 where title ilike 'Carreta do Dog%' and source_name like 'Radar%';

-- Nome do autor: nunca o do dono do painel; padrao Redacao
update public.articles set author_name = 'Redação' where author_name is null;

notify pgrst, 'reload schema';
