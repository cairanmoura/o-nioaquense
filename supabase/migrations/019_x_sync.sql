-- 019: sincronizacao automatica dos colunistas pela API oficial do X.
alter table public.x_columnists add column if not exists x_user_id text;
alter table public.x_columnists add column if not exists last_tweet_id text;
notify pgrst, 'reload schema';
