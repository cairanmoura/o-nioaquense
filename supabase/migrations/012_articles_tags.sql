-- Coluna `tags` (editorial, livre) usada pelo editor e pela Curadoria.
alter table public.articles
  add column if not exists tags text[] default '{}';

-- Recarrega o cache de schema do PostgREST
notify pgrst, 'reload schema';
