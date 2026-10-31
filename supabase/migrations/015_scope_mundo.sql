-- 015: novo local "Mundo" (alem de Nioaque, Regiao, MS e Brasil).
-- Execute sozinho (ALTER TYPE ... ADD VALUE nao roda dentro de transacao com uso do valor).
do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = (select oid from pg_type where typname = 'article_scope') and enumlabel = 'mundo'
  ) then
    alter type public.article_scope add value 'mundo';
  end if;
end $$;
