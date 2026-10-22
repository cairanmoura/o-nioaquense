/**
 * scripts/generate-seed.mjs
 * -----------------------------------------------------------------------------
 * Gera `supabase/seed.sql` a partir de `src/lib/mock-data.ts`.
 *
 * Assim o mock e o banco nunca saem de sincronia: rode
 *   node scripts/generate-seed.mjs
 * sempre que alterar os dados de exemplo.
 *
 * O seed cria tambem os usuarios em `auth.users`, para que os perfis
 * (que tem FK para auth.users) possam ser inseridos.
 */

import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const { mockProfiles, mockArticles, mockPublicUtilities, mockLocalAds, mockBusSchedules } =
  await import(pathToFileURL(resolve(ROOT, 'src/lib/mock-data.ts')).href);

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const q = (value) => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const json = (value) => q(JSON.stringify(value));

/* -------------------------------------------------------------------------- */
/* Blocos                                                                     */
/* -------------------------------------------------------------------------- */

const authUsers = mockProfiles
  .map((profile) => {
    const email = `${profile.slug}@exemplo.onioaquense.com.br`;
    return `insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', ${q(profile.id)}, 'authenticated', 'authenticated',
    ${q(email)}, crypt('nioaquense123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    ${json({ full_name: profile.full_name })},
    now(), now()
  ) on conflict (id) do nothing;`;
  })
  .join('\n\n');

const profileRows = mockProfiles
  .map(
    (profile) => `insert into public.profiles (
    id, full_name, slug, role, column_name, bio, avatar_url, social_links,
    can_publish_directly, active
  ) values (
    ${q(profile.id)}, ${q(profile.full_name)}, ${q(profile.slug)}, ${q(profile.role)}::public.user_role,
    ${q(profile.column_name)}, ${q(profile.bio)}, ${q(profile.avatar_url)}, ${json(profile.social_links)}::jsonb,
    ${profile.can_publish_directly}, ${profile.active}
  ) on conflict (id) do nothing;`,
  )
  .join('\n\n');

const articleRows = mockArticles
  .map(
    (article) => `insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    ${q(article.id)}, ${q(article.title)}, ${q(article.subtitle)}, ${q(article.slug)},
    ${json(article.summary_bullets)}::jsonb, ${q(article.content)},
    ${q(article.cover_image_url)}, ${q(article.cover_image_caption)},
    ${q(article.scope)}::public.article_scope, ${q(article.category_label)},
    ${article.is_breaking}, ${article.is_featured}, ${q(article.author_id)},
    ${q(article.status)}::public.article_status, ${article.views_count},
    ${q(article.published_at)}, ${q(article.created_at)}, ${q(article.updated_at)}
  ) on conflict (id) do nothing;`,
  )
  .join('\n\n');

const utilityRows = mockPublicUtilities
  .map(
    (utility) => `insert into public.public_utilities (
    id, duty_date, pharmacy_name, pharmacy_phone, pharmacy_address,
    alert_active, alert_message, alert_level, bus_schedule_html, updated_at
  ) values (
    ${q(utility.id)}, ${q(utility.duty_date)}, ${q(utility.pharmacy_name)},
    ${q(utility.pharmacy_phone)}, ${q(utility.pharmacy_address)},
    ${utility.alert_active}, ${q(utility.alert_message)},
    ${q(utility.alert_level)}::public.alert_level, ${q(utility.bus_schedule_html)},
    ${q(utility.updated_at)}
  ) on conflict (id) do nothing;`,
  )
  .join('\n\n');

const adRows = mockLocalAds
  .map(
    (ad) => `insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    ${q(ad.id)}, ${q(ad.client_name)}, ${q(ad.title)}, ${q(ad.image_url)},
    ${q(ad.target_url)}, ${q(ad.whatsapp_number)},
    ${q(ad.slot_position)}::public.ad_slot_position,
    ${q(ad.offer_type)}::public.ad_offer_type, ${q(ad.price_label)}, ${q(ad.notes)},
    ${ad.active}, ${q(ad.starts_at)}, ${q(ad.ends_at)}, ${ad.clicks_count}
  ) on conflict (id) do nothing;`,
  )
  .join('\n\n');

const busRows = mockBusSchedules
  .map(
    (schedule) => `insert into public.bus_schedules (
    id, route_name, destination, departure_times, frequency, notes, position, active
  ) values (
    ${q(schedule.id)}, ${q(schedule.route_name)}, ${q(schedule.destination)},
    ${json(schedule.departure_times)}::jsonb, ${q(schedule.frequency)}, ${q(schedule.notes)},
    ${schedule.position}, ${schedule.active}
  ) on conflict (id) do nothing;`,
  )
  .join('\n\n');

/* -------------------------------------------------------------------------- */
/* Saida                                                                       */
/* -------------------------------------------------------------------------- */

const sql = `-- =============================================================================
--  O Nioaquense | Seed de desenvolvimento
-- -----------------------------------------------------------------------------
--  Arquivo gerado por: node scripts/generate-seed.mjs
--  Fonte dos dados  : src/lib/mock-data.ts
--
--  Como usar:
--    supabase db reset            (aplica migrations + seed)
--    supabase db reset --seed-only
--
--  IMPORTANTE: este seed cria usuarios ficticios em auth.users com a senha
--  "nioaquense123". Troque a senha (ou apague o seed) antes de usar em producao.
-- =============================================================================

-- ---------------------------------------------------------------------------
--  1) Usuarios (necessarios para satisfazer a FK de public.profiles)
-- ---------------------------------------------------------------------------
${authUsers}

-- ---------------------------------------------------------------------------
--  2) Perfis (redacao + colunistas)
-- ---------------------------------------------------------------------------
${profileRows}

-- ---------------------------------------------------------------------------
--  3) Materias
-- ---------------------------------------------------------------------------
${articleRows}

-- ---------------------------------------------------------------------------
--  4) Servicos publicos (farmacia de plantao, alertas, onibus)
-- ---------------------------------------------------------------------------
${utilityRows}

-- ---------------------------------------------------------------------------
--  5) Publicidade local
-- ---------------------------------------------------------------------------
${adRows}

-- ---------------------------------------------------------------------------
--  6) Horarios de onibus intermunicipais
-- ---------------------------------------------------------------------------
${busRows}

-- ---------------------------------------------------------------------------
--  7) Pistas do leitor
-- ---------------------------------------------------------------------------
insert into public.reader_submissions (
  id, sender_name, sender_whatsapp, neighborhood, message, media_urls, status, created_at
) values
  (
    's1000000-0000-4000-8000-000000000001', 'Joana Pereira', '5567991234567', 'Vila Nova',
    'Boa tarde! O poste da esquina da Rua das Flores esta com a luz queimada ha quase duas semanas. Alguem da prefeitura poderia verificar?',
    '[]'::jsonb, 'pending', '2026-10-22T08:40:00Z'
  ),
  (
    's1000000-0000-4000-8000-000000000002', 'Carlos Henrique Souza', '5567987654321', 'Bao Vista',
    'Bom dia, o onibus para Campo Grande saiu hoje mais cedo que o normal. Alguem sabe se a tabela foi alterada?',
    '[]'::jsonb, 'reviewed', '2026-10-21T16:10:00Z'
  ),
  (
    's1000000-0000-4000-8000-000000000003', 'Luzia Aparecida Martins', '5567911223344', 'Centro',
    'A padaria da esquina esta vendendo pao com mofo. Gostaria que o portal publicasse a situacao para nao passar ninguem.',
    '["/covers/submission-01.svg"]'::jsonb, 'pending', '2026-10-22T10:05:00Z'
  )
on conflict (id) do nothing;
`;

writeFileSync(resolve(ROOT, 'supabase', 'seed.sql'), sql, 'utf8');

console.log('supabase/seed.sql gerado com:', {
  perfis: mockProfiles.length,
  materias: mockArticles.length,
  servicos: mockPublicUtilities.length,
  anuncios: mockLocalAds.length,
  onibus: mockBusSchedules.length,
});
