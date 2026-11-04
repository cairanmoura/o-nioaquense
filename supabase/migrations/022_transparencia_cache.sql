-- Armazenamento duravel da Transparencia (Camara e Prefeitura): detalhes de
-- empenhos, resumos prontos, estado e agenda das atualizacoes.
-- Acesso so pelo service role (RLS ligado, sem politicas).
create table if not exists public.transparencia_cache (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.transparencia_cache enable row level security;
