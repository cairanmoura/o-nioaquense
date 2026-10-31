-- 014: recado da ultima execucao por fonte (mostrado em /admin/fontes).
-- O extrator agora roda em fila (Cloudflare Queues); cada fonte guarda o resultado
-- da ultima varredura / o ultimo erro. Sem esta migracao tudo continua funcionando,
-- apenas sem o recado na tela.
alter table public.news_sources add column if not exists last_status text;
alter table public.news_sources add column if not exists last_message text;
