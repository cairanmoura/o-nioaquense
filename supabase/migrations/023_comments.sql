-- 023: comentarios nas materias, com moderacao.
-- status: approved (publicado) | pending (aguarda moderacao) | rejected (oculto pelo admin)
create table if not exists public.article_comments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.articles(id) on delete cascade,
  author_name text not null,
  body text not null,
  status text not null default 'pending' check (status in ('approved','pending','rejected')),
  flag_reason text,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_article on public.article_comments (article_id, status, created_at);
create index if not exists idx_comments_ip on public.article_comments (ip_hash, created_at);
alter table public.article_comments enable row level security;
drop policy if exists "comments_public_read" on public.article_comments;
create policy "comments_public_read" on public.article_comments for select using (status = 'approved');
-- Escrita so pelo servidor (service role): nenhuma policy de insert/update para anon.
notify pgrst, 'reload schema';
