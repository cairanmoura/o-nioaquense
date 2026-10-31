-- 016: local padrao por fonte (usado so quando nada na materia indica o local).
-- O local REAL de cada materia e' decidido pelo assunto (IA + palavras-chave);
-- este campo e' apenas o desempate: nioaque | regiao | ms | brasil | mundo.
alter table public.news_sources add column if not exists default_scope text;
