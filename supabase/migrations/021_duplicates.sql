-- 021: "Outras versoes" - quando outro veiculo noticia o MESMO fato de uma materia ja existente,
-- a segunda nao passa pela IA (poupa credito): fica registrada aqui, ligada a original.
create table if not exists public.duplicate_articles (
  id uuid primary key default gen_random_uuid(),
  duplicate_of uuid references public.articles(id) on delete cascade,
  source_name text,
  source_url text not null unique,
  title text not null,
  excerpt text,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_duplicates_of on public.duplicate_articles (duplicate_of);
alter table public.duplicate_articles enable row level security;
drop policy if exists "duplicates_public_read" on public.duplicate_articles;
create policy "duplicates_public_read" on public.duplicate_articles for select using (true);
notify pgrst, 'reload schema';
