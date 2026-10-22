-- =============================================================================
--  O Nioaquense - Seed SQL para popular o banco Supabase
-- -----------------------------------------------------------------------------
--  Como usar: cole este script no SQL Editor do painel Supabase
--  https://supabase.com/dashboard/project/_/sql
-- =============================================================================

-- ---------------------------------------------------------------------------
--  1. PERFIS (profiles)
-- ---------------------------------------------------------------------------
insert into public.profiles (id, full_name, slug, role, column_name, bio, avatar_url, social_links, can_publish_directly, active) values
  ('10000000-0000-4000-8000-000000000001', 'Redação O Nioaquense', 'redacao-o-nioaquense', 'admin', 'Redação', 'Equipe editorial do portal. Publica o dia a dia de Nioaque, do Sul de Mato Grosso do Sul e do Brasil.', '/covers/avatar-redacao.svg', '{"instagram": "https://instagram.com/onioaquense", "whatsapp": "5567999990000"}', true, true),
  ('10000000-0000-4000-8000-000000000002', 'Marcos Aurelio Duarte', 'marcos-aurelio-duarte', 'columnist', 'Visão de Nioaque', 'Jornalista local há 18 anos. Escreve sobre política municipal, economia regional e o futuro das cidades pequenas do MS.', '/covers/avatar-marcos.svg', '{"instagram": "https://instagram.com/visaodenioaque"}', false, true),
  ('10000000-0000-4000-8000-000000000003', 'Cleide Ramos', 'cleide-ramos', 'columnist', 'Giro de Bairro', 'Moradora do bairro Vila Nova. Leva para a coluna o que acontece nas esquinas, nas escolas e nas feiras da cidade.', '/covers/avatar-cleide.svg', '{"whatsapp": "5567988881111"}', false, true),
  ('10000000-0000-4000-8000-000000000004', 'Rafael Prado', 'rafael-prado', 'columnist', 'Radar MS', 'Correspondente regional. Acompanha as decisões do governo estadual e os números que impactam o interior de MS.', '/covers/avatar-rafael.svg', '{"linkedin": "https://linkedin.com/in/radarms"}', true, true),
  ('10000000-0000-4000-8000-000000000005', 'Vinícius Prado', 'vinicius-prado', 'columnist', 'Bastidores', 'Fica nos bastidores da Câmara, da Prefeitura e das entidades do município. O que o anúncio não conta.', '/covers/avatar-vinicius.svg', '{}', false, true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  2. MATÉRIAS (articles) - Nioaque
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000001',
    'Frigorífico de Nioaque, o Frigocampo, volta a paralisar atividades por falta de matéria-prima',
    'Unidade havia retomado as atividades em agosto após um período parado.',
    'frigorifico-nioaque-frigocampo-paralisa-falta-materia-prima',
    ARRAY[
      'O frigorífico havia retomado as atividades em agosto, após um período parado.',
      'A empresa anunciou nova paralisação diante das dificuldades no abastecimento de matéria-prima.',
      'A situação afeta o emprego e o abastecimento de carne na região.'
    ],
    '<p>O Frigorífico de Nioaque, o Frigocampo, voltou a paralisar suas atividades por falta de matéria-prima. A unidade, que havia retomado as atividades em agosto, após um período parado, anunciou nesta semana uma nova paralisação diante das dificuldades no abastecimento.</p><p>Segundo a administração, cerca de 150 funcionários estão diretamente afetados pela parada. O abastecimento de carne na região também sente os reflexos da decisão.</p><p>O Sindicato dos Trabalhadores nas Indústrias da Alimentação de MS aguarda uma reunião com os responsáveis pela empresa para esta semana.</p>',
    '/covers/cap-01.svg',
    'Trecho da BR-060 onde aconteceu a colisão',
    'nioaque',
    'Frigorífico Nioaque',
    false,
    true,
    '10000000-0000-4000-8000-000000000001',
    'published',
    1240,
    '2026-10-20T10:30:00Z',
    '2026-10-20T10:30:00Z',
    '2026-10-20T10:30:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'Feira do Produtor confirma 60 expositores para a próxima edição',
    'Evento acontece neste sábado na praça central com produtos da agricultura familiar.',
    'feira-do-produtor-confirma-60-expositores-proxima-edicao',
    ARRAY[
      'Mais de 60 expositores confirmados para edição deste sábado.',
      'Produtos da agricultura familiar de Nioaque e região.',
      'Evento acontece das 7h às 13h na praça central.'
    ],
    '<p>A Feira do Produtor de Nioaque confirma 60 expositores para sua próxima edição, que acontece neste sábado na praça central da cidade. O evento reúne produtores da agricultura familiar de Nioaque e municípios da região.</p><p>Entre os produtos disponíveis estão hortaliças, frutas, mel, queijos caseiros, bolos e artesanato local. A feira funciona das 7h às 13h e tem entrada gratuita.</p><p>A iniciativa é organizada pela Prefeitura Municipal em parceria com a Emater-MS, com o objetivo de fortalecer a economia local e incentivar o consumo de produtos da região.</p>',
    '/covers/cap-05.svg',
    'Produtos da agricultura familiar',
    'nioaque',
    'Agricultura Familiar',
    false,
    false,
    '10000000-0000-4000-8000-000000000003',
    'published',
    890,
    '2026-10-19T14:00:00Z',
    '2026-10-19T14:00:00Z',
    '2026-10-19T14:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'Prefeitura de Nioaque anuncia pavimentação de três ruas no bairro Vila Nova',
    'Obras começam na próxima semana com recursos próprios do município.',
    'prefeitura-nioaque-anuncia-pavimentacao-vila-nova',
    ARRAY[
      'Três ruas do bairro Vila Nova serão pavimentadas.',
      'Obras começam na próxima semana.',
      'Recursos são próprios do município.'
    ],
    '<p>A Prefeitura de Nioaque anunciou nesta terça-feira a pavimentação de três ruas no bairro Vila Nova. As obras devem começar na próxima semana e são executadas com recursos próprios do município.</p><p>As ruas contempladas são a Rua das Acácias, Rua do Ipê e Rua do Jabuticabeiro, que atendem cerca de 200 famílias da região. O investimento estimado é de R$ 320 mil.</p><p>O prefeito destacou que a pavimentação melhora a mobilidade, reduz a poeira nos períodos secos e evita alagamentos em épocas de chuva.</p>',
    '/covers/cap-02.svg',
    'Obras de pavimentação em Nioaque',
    'nioaque',
    'Obras Públicas',
    false,
    false,
    '10000000-0000-0000-8000-000000000004',
    'published',
    650,
    '2026-10-18T09:15:00Z',
    '2026-10-18T09:15:00Z',
    '2026-10-18T09:15:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'Câmara de Nioaque aprova projeto que cria Conselho Municipal da Juventude',
    'Projeto de lei foi aprovado por unanimidade em sessão ordinária.',
    'camara-nioaque-aprova-conselho-municipal-juventude',
    ARRAY[
      'Projeto de lei aprovado por unanimidade.',
      'Conselho terá 15 membros entre jovens e representantes.',
      'Objetivo é discutir políticas públicas para jovens de Nioaque.'
    ],
    '<p>A Câmara Municipal de Nioaque aprovou por unanimidade, em sessão ordinária desta segunda-feira, o projeto de lei que cria o Conselho Municipal da Juventude. A proposta segue agora para sanção do prefeito.</p><p>O conselho será composto por 15 membros, sendo metade jovens com idade entre 15 e 29 anos e metade representantes de entidades e órgãos públicos. O mandato será de dois anos, permitindo uma recondução.</p><p>Segundo o autor do projeto, vereador João Silva, o objetivo é criar um canal permanente de discussão sobre políticas públicas voltadas para a juventude de Nioaque, incluindo educação, emprego, cultura e esporte.</p>',
    '/covers/cap-03.svg',
    'Sessão ordinária da Câmara Municipal',
    'nioaque',
    'Câmara Municipal',
    false,
    false,
    '10000000-0000-4000-8000-000000000002',
    'published',
    420,
    '2026-10-17T16:45:00Z',
    '2026-10-17T16:45:00Z',
    '2026-10-17T16:45:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'Unidade Básica de Saúde do Centro amplia horário de atendimento',
    'Nova escala começa segunda-feira com atendimento até as 20h.',
    'ubs-centro-amplia-horario-atendimento',
    ARRAY[
      'UBS do Centro passa a atender até as 20h.',
      'Nova escala começa na próxima segunda-feira.',
      'Mudança busca atender população que trabalha durante o dia.'
    ],
    '<p>A Unidade Básica de Saúde (UBS) do Centro de Nioaque amplia seu horário de atendimento a partir da próxima segunda-feira. A unidade passa a funcionar até as 20h, de segunda a sexta-feira.</p><p>A mudança busca atender a população que trabalha durante o dia e não consegue buscar atendimento médico no horário comercial. Antes, a UBS fechava às 17h.</p><p>Segundo a Secretaria Municipal de Saúde, a ampliação contempla consultas médicas, de enfermagem, vacinação e coleta de exames. O agendamento pode ser feito presencialmente ou pelo aplicativo da prefeitura.</p>',
    '/covers/cap-04.svg',
    'Fachada da UBS Centro de Nioaque',
    'nioaque',
    'Saúde',
    false,
    false,
    '10000000-0000-4000-8000-000000000003',
    'published',
    530,
    '2026-10-16T11:20:00Z',
    '2026-10-16T11:20:00Z',
    '2026-10-16T11:20:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'Escola Municipal José Pereira sedia campeonato de futsal escolar',
    'Cerca de 120 estudantes de 10 escolas participam do torneio.',
    'escola-jose-pereira-sedia-campeonato-futsal-escolar',
    ARRAY[
      'Cerca de 120 estudantes de 10 escolas participam.',
      'Torneio acontece na quadra coberta da escola.',
      'Premiação com medalhas e troféus para as três primeiras colocações.'
    ],
    '<p>A Escola Municipal José Pereira sedia, nesta quinta e sexta-feira, o Campeonato de Futsal Escolar de Nioaque. Cerca de 120 estudantes de 10 escolas da rede municipal participam do torneio.</p><p>Os jogos acontecem na quadra coberta da escola, com partidas nas categorias mirim (9 a 11 anos) e infantil (12 a 14 anos), tanto no masculino quanto no feminino.</p><p>A premiação ocorre no final da tarde de sexta-feira, com medalhas e troféus para as três primeiras colocações de cada categoria. O evento é organizado pela Secretaria Municipal de Educação em parceria com o Departamento de Esportes.</p>',
    '/covers/cap-06.svg',
    'Quadra de futsal da Escola Municipal José Pereira',
    'nioaque',
    'Esporte',
    false,
    false,
    '10000000-0000-4000-8000-000000000005',
    'published',
    310,
    '2026-10-15T15:00:00Z',
    '2026-10-15T15:00:00Z',
    '2026-10-15T15:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  3. MATÉRIAS - Mato Grosso do Sul
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000011',
    'Governo de MS anuncia R$ 150 milhões para pavimentação em municípios do interior',
    'Recursos são destinados a 22 cidades, incluindo Nioaque e região.',
    'governo-ms-anuncia-r150-milhoes-pavimentacao-interior',
    ARRAY[
      'R$ 150 milhões destinados a 22 municípios.',
      'Nioaque está entre as cidades contempladas.',
      'Recursos são para pavimentação asfáltica.'
    ],
    '<p>O Governo de Mato Grosso do Sul anunciou nesta semana um investimento de R$ 150 milhões para pavimentação asfáltica em 22 municípios do interior do estado. Nioaque está entre as cidades contempladas com o programa.</p><p>Os recursos são provenientes de financiamento junto a instituições financeiras e serão liberados gradualmente conforme a apresentação dos projetos pelos municípios.</p><p>O governador destacou que a pavimentação melhora a trafegabilidade, reduz acidentes e valoriza imóveis nas regiões atendidas. As obras devem começar nos próximos 90 dias.</p>',
    '/covers/cap-07.svg',
    'Obras de pavimentação em MS',
    'ms',
    'Infraestrutura',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    780,
    '2026-10-19T08:00:00Z',
    '2026-10-19T08:00:00Z',
    '2026-10-19T08:00:00Z'
  ),
  (
    '20000000-0000-4000-8000-000000000012',
    'Campo Grande sedia Feira Nacional da Agricultura Familiar',
    'Evento reúne produtores de todo o estado até domingo.',
    'campo-grande-sedia-feira-agricultura-familiar',
    ARRAY[
      'Feira reúne produtores de todo o estado.',
      'Evento acontece até domingo no Parque de Exposições.',
      'Produtos coloniais, artesanato e alimentos da roça.'
    ],
    '<p>Campo Grande sedia, até domingo, a Feira Nacional da Agricultura Familiar. O evento reúne produtores rurais de todo o estado de Mato Grosso do Sul no Parque de Exposições Laucídio Coelho.</p><p>São mais de 200 estandes com produtos coloniais, alimentos da roça, artesanato, queijos, mel, doces e cachaças artesanais. A entrada é gratuita e o evento funciona das 9h às 21h.</p><p>Segundo os organizadores, a feira movimenta cerca de R$ 2 milhões em negócios e é uma importante vitrine para os pequenos produtores do estado.</p>',
    '/covers/cap-08.svg',
    'Produtos da agricultura familiar na feira',
    'ms',
    'Agricultura Familiar',
    false,
    false,
    '10000000-0000-4000-8000-000000000004',
    'published',
    560,
    '2026-10-18T12:30:00Z',
    '2026-10-18T12:30:00Z',
    '2026-10-18T12:30:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  4. MATÉRIAS - Brasil
-- ---------------------------------------------------------------------------
insert into public.articles (id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption, scope, category_label, is_breaking, is_featured, author_id, status, views_count, published_at, created_at, updated_at) values
  (
    '20000000-0000-4000-8000-000000000021',
    'Governo federal libera R$ 2 bilhões para o programa Minha Casa, Minha Vida',
    'Recursos são destinados a famílias com renda de até dois salários mínimos.',
    'governo-federal-libera-r2-bilhoes-minha-casa-minha-vida',
    ARRAY[
      'R$ 2 bilhões para o programa Minha Casa, Minha Vida.',
      'Famílias com renda de até dois salários mínimos são contempladas.',
      'Previsão é de construção de 50 mil moradias.'
    ],
    '<p>O governo federal anunciou a liberação de R$ 2 bilhões para o programa Minha Casa, Minha Vida. Os recursos são destinados a famílias com renda de até dois salários mínimos.</p><p>De acordo com o Ministério das Cidades, a previsão é de construção de 50 mil moradias em todo o país nos próximos 18 meses. As primeiras cidades a receber os recursos serão anunciadas na próxima semana.</p><p>O programa é uma das principais bandeiras do governo federal na área de habitação e visa reduzir o déficit habitacional no país.</p>',
    '/covers/cap-09.svg',
    'Conjunto habitacional',
    'brasil',
    'Habitação',
    false,
    false,
    '10000000-0000-4000-8000-000000000001',
    'published',
    940,
    '2026-10-18T14:30:00Z',
    '2026-10-18T14:30:00Z',
    '2026-10-18T14:30:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  5. UTILIDADE PÚBLICA (public_utilities)
-- ---------------------------------------------------------------------------
insert into public.public_utilities (id, duty_date, pharmacy_name, pharmacy_phone, pharmacy_address, alert_active, alert_message, alert_level, created_at, updated_at) values
  (
    '30000000-0000-4000-8000-000000000001',
    '2026-10-22',
    'Farmácia Popular Nioaque',
    '(67) 9 9999-1234',
    'Rua das Flores, 120 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '2026-10-23',
    'Farmácia São João',
    '(67) 9 9888-5678',
    'Avenida Principal, 450 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '2026-10-24',
    'Farmácia Central',
    '(67) 9 9777-9012',
    'Rua Comércio, 200 - Centro, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '2026-10-25',
    'Farmácia do Trabalhador',
    '(67) 9 9666-3344',
    'Rua da Paz, 80 - Vila Nova, Nioaque-MS',
    false,
    null,
    null,
    '2026-10-22T08:00:00Z',
    '2026-10-22T08:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  6. HORÁRIOS DE ÔNIBUS (bus_schedules)
-- ---------------------------------------------------------------------------
insert into public.bus_schedules (id, route_name, destination, departure_times, frequency, active, created_at, updated_at) values
  (
    '40000000-0000-4000-8000-000000000001',
    'Linha 01',
    'Centro',
    ARRAY['06:00', '07:30', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    'Diária',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'Linha 02',
    'Vila Nova',
    ARRAY['06:30', '08:00', '09:30', '11:30', '13:30', '15:30', '17:30', '19:30'],
    'Diária',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'Linha 03',
    'Assentamento',
    ARRAY['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00'],
    'Seg a Sex',
    true,
    '2026-10-20T08:00:00Z',
    '2026-10-20T08:00:00Z'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  7. ANÚNCIOS (local_ads)
-- ---------------------------------------------------------------------------
insert into public.local_ads (id, client_name, title, image_url, target_url, whatsapp_number, slot_position, offer_type, price_label, notes, starts_at, ends_at, active, clicks_count, created_at, updated_at) values
  (
    '50000000-0000-4000-8000-000000000001',
    'Mercado Nilo',
    '20% de desconto em cesta básica nesta semana',
    '/covers/ad-01.svg',
    null,
    '5567999990000',
    'sidebar',
    'banner',
    'R$ 39,90',
    'Válido até domingo.',
    '2026-10-15',
    '2026-10-31',
    true,
    45,
    '2026-10-15T08:00:00Z',
    '2026-10-15T08:00:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'Auto Peças Silva',
    'Pneus com 15% de desconto para pagamento à vista',
    '/covers/ad-02.svg',
    null,
    '5567998887766',
    'home_middle',
    'banner',
    'Consulte preços',
    'Frete grátis em Nioaque.',
    '2026-10-10',
    '2026-10-30',
    true,
    32,
    '2026-10-10T08:00:00Z',
    '2026-10-10T08:00:00Z'
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    'Padaria Pão Quente',
    'Oferta do Dia: pão francês a R$ 0,40',
    '/covers/ad-03.svg',
    null,
    '5567997776655',
    'daily_deal',
    'daily_deal',
    'R$ 0,40',
    'Válido apenas hoje.',
    '2026-10-22',
    '2026-10-22',
    true,
    89,
    '2026-10-22T06:00:00Z',
    '2026-10-22T06:00:00Z'
  )
on conflict (id) do nothing;

-- =============================================================================
--  Fim do seed
-- =============================================================================
