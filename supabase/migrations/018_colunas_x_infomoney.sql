-- 018: Colunas do X (colunistas externos) + fonte InfoMoney.

-- ---------------------------------------------------------------------------
-- Colunistas do X e seus posts (cada post vira uma "coluna" no portal)
-- ---------------------------------------------------------------------------
create table if not exists public.x_columnists (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  name text not null,
  bio text,
  avatar_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.x_posts (
  id uuid primary key default gen_random_uuid(),
  columnist_id uuid not null references public.x_columnists(id) on delete cascade,
  tweet_id text not null unique,
  url text not null,
  text text not null default '',
  media_url text,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_x_posts_posted on public.x_posts (posted_at desc);
create index if not exists idx_x_posts_columnist on public.x_posts (columnist_id, posted_at desc);

alter table public.x_columnists enable row level security;
alter table public.x_posts enable row level security;

-- Leitura publica; escrita somente pelo painel (service role ignora RLS)
drop policy if exists "x_columnists_public_read" on public.x_columnists;
create policy "x_columnists_public_read" on public.x_columnists for select using (active = true);
drop policy if exists "x_posts_public_read" on public.x_posts;
create policy "x_posts_public_read" on public.x_posts for select using (true);

insert into public.x_columnists (handle, name, bio, sort_order) values
  ('SamPancher',   'Sam Pancher',         'Jornalista no Metrópoles. Comentando F1.', 1),
  ('FMouraBrasil', 'Felipe Moura Brasil', 'Jornalista, comentarista de política e atualidades.', 2),
  ('Ricamconsult', 'Ricardo Amorim',      'Economista sem economês e com bom humor.', 3)
on conflict (handle) do nothing;

-- ---------------------------------------------------------------------------
-- InfoMoney: Brasil e Mundo (economia e politica). Portal privado: reescrita + rascunho.
-- ---------------------------------------------------------------------------
insert into public.news_sources (
  name, rss_url, source_type, ownership, is_active, auto_publish, ai_rewrite,
  use_original_image, keywords_filter, default_category, default_scope
) values (
  'InfoMoney', 'https://www.infomoney.com.br/feed/', 'rss', 'private', true, false, true,
  true, null, 'Economia', 'brasil'
)
on conflict (rss_url) do update set
  name = excluded.name, is_active = true, ai_rewrite = true,
  default_category = excluded.default_category, default_scope = excluded.default_scope,
  updated_at = now();

notify pgrst, 'reload schema';
