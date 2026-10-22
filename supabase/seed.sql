-- =============================================================================
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
insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'redacao-o-nioaquense@exemplo.onioaquense.com.br', crypt('nioaquense123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Redacao O Nioaquense"}',
    now(), now()
  ) on conflict (id) do nothing;

insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'marcos-aurelio-duarte@exemplo.onioaquense.com.br', crypt('nioaquense123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Marcos Aurelio Duarte"}',
    now(), now()
  ) on conflict (id) do nothing;

insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'cleide-ramos@exemplo.onioaquense.com.br', crypt('nioaquense123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Cleide Ramos"}',
    now(), now()
  ) on conflict (id) do nothing;

insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', '00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'rafael-prado@exemplo.onioaquense.com.br', crypt('nioaquense123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Rafael Prado"}',
    now(), now()
  ) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  2) Perfis (redacao + colunistas)
-- ---------------------------------------------------------------------------
insert into public.profiles (
    id, full_name, slug, role, column_name, bio, avatar_url, social_links,
    can_publish_directly, active
  ) values (
    '00000000-0000-4000-8000-000000000001', 'Redacao O Nioaquense', 'redacao-o-nioaquense', 'admin'::public.user_role,
    'Redacao', 'Equipe editorial do portal. Publica o dia a dia de Nioaque, do Sul de Mato Grosso do Sul e do Brasil.', '/covers/avatar-redacao.svg', '{"instagram":"https://instagram.com/onioaquense","whatsapp":"5567999990000"}'::jsonb,
    true, true
  ) on conflict (id) do nothing;

insert into public.profiles (
    id, full_name, slug, role, column_name, bio, avatar_url, social_links,
    can_publish_directly, active
  ) values (
    '00000000-0000-4000-8000-000000000002', 'Marcos Aurelio Duarte', 'marcos-aurelio-duarte', 'columnist'::public.user_role,
    'Visao de Nioaque', 'Jornalista local ha 18 anos. Escreve sobre politica municipal, economia regional e o futuro das cidades pequenas do MS.', '/covers/avatar-marcos.svg', '{"instagram":"https://instagram.com/visaodenioaque"}'::jsonb,
    false, true
  ) on conflict (id) do nothing;

insert into public.profiles (
    id, full_name, slug, role, column_name, bio, avatar_url, social_links,
    can_publish_directly, active
  ) values (
    '00000000-0000-4000-8000-000000000003', 'Cleide Ramos', 'cleide-ramos', 'columnist'::public.user_role,
    'Giro de Bairro', 'Moradora do bairro Vila Nova. Leva para a coluna o que acontece nas esquinas, nas escolas e nas feiras da cidade.', '/covers/avatar-cleide.svg', '{"whatsapp":"5567988881111"}'::jsonb,
    false, true
  ) on conflict (id) do nothing;

insert into public.profiles (
    id, full_name, slug, role, column_name, bio, avatar_url, social_links,
    can_publish_directly, active
  ) values (
    '00000000-0000-4000-8000-000000000004', 'Rafael Prado', 'rafael-prado', 'columnist'::public.user_role,
    'Radar MS', 'Correspondente regional. Acompanha as decisoes do governo estadual e os numeros que impactam o interior de MS.', '/covers/avatar-rafael.svg', '{"linkedin":"https://linkedin.com/in/radarms"}'::jsonb,
    true, true
  ) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  3) Materias
-- ---------------------------------------------------------------------------
insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000001', 'Recapeamento da MS-178 chega ao centro e muda o trajeto de 6 mil nioaquenses', 'Pista nova, sinalizacao e rotulos novos: o que muda para quem usa a rodovia todos os dias', 'recapeamento-ms-178-centro-nioaque-trecho-6-4-km',
    '["A etapa final cobre 1,2 km entre a entrada da cidade e a praca central, com os servicos de recapeamento concluidos desde segunda-feira.","Sinalizacao horizontal refeita e 18 novos olhos-de-gato instalados nas faixas de pedestres.","A prefeitura estima retorno do transito normal em 10 dias; comerciantes relatam queda de movimento no centro."]'::jsonb, '<p>A rodar pelo centro de Nioaque virou um teste de paciencia nas ultimas semanas. A partir desta segunda-feira, pelo menos, o cenario muda: a etapa final do recapeamento da MS-178 foi entregue e a prefeitura projeta o retorno do fluxo normal em cerca de dez dias.</p>
<p>O trecho principal tem 1,2 km e passa exatamente pelo coracao comercial da cidade, onde o trafego se concentra entre as 17h e as 19h. A empresa responsavel refez a pintura das faixas, trocou 42 placas e instalou 18 olhos-de-gato nas travessias mais movimentadas.</p>
<p>Para quem depende da rodovia para trabalhar em Aquidauana ou Campo Grande, o conselho e'' simples: redimensionar o tempo de trajeto nos proximos dias e, se possivel, evitar o centro entre 17h e 19h.</p>
<p>A segunda atribuicao do contrato preve a manutencao corretiva do pavimento nas duas primeiras semanas, sem interdição total. A equipe de Transito acompanha os trabalhos com radar.</p>',
    '/covers/cap-01.svg', 'Trecho central da MS-178 durante a fase de pintura de faixas',
    'nioaque'::public.article_scope, 'Cidade',
    false, true, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 4821,
    '2026-10-22T08:10:00Z', '2026-10-21T17:40:00Z', '2026-10-22T08:10:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000002', 'Mutirao de limpeza retira 12 toneladas de residuos em tres bairros', 'Acao que combinou equipes das secretarias, caminhoes da coleta e comunidade', 'mutirao-limpeza-12-toneladas-tres-bairros-nioaque',
    '["Operacao recuperou areas de descarte irregular em Vila Nova, Vila Rica e Bao Vista.","Material reciclavel foi separado e destinado a cooperativa de catadores da cidade.","Proxima etapa esta marcada para o dia 29, com foco em entulho da construcao civil."]'::jsonb, '<p>Uma acao integrada entre as secretarias de Meio Ambiente e de Infraestrutura resultou na retirada de 12 toneladas de residuos solidos de tres bairros de Nioaque na quarta-feira. O material foi recolhido em areas de descarte irregular, pontos turisticos e nas bordas de um lote vazio na Vila Nova.</p>
<p>De acordo com a coordenacao da acao, 40 moradores participaram da etapa manual de separacao. O plastico, o papel e o metal foram destinados a cooperativa de catadores que opera no municipio desde 2024.</p>
<p>Restam depositos de entulho, massa e madeira. A prefeitura informou que uma nova etapa esta marcada para o dia 29 de outubro, quando o foco sera o material de construcao civil.</p>',
    '/covers/cap-02.svg', 'Equipes municipais durante a coleta nos bairros Vila Nova e Vila Rica',
    'nioaque'::public.article_scope, 'Meio Ambiente',
    true, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 3167,
    '2026-10-22T06:45:00Z', '2026-10-21T19:05:00Z', '2026-10-22T06:45:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000003', 'Escolas municipais fecham o ano com 100% da matricula e contraturno ampliado', 'Tres unidades passam a oferecer oficina de leitura e esporte em horario estendido', 'escolas-municipais-nioaque-100-matricula-contraturno-ampliado',
    '["Nenhuma crianca ficou fora da matricula na rede municipal de Nioaque neste ano.","Contraturno passa a ter oficina de leitura, educacao fisica e robotica basica.","Alimentacao escolar foi reajustada e o cardapio sera ampliado na merenda do contraturno."]'::jsonb, '<p>A rede municipal de ensino de Nioaque fechou o periodo de matriculas sem nenhuma crianca de fora da lista de espera. Nas tres escolas que oferecem contraturno, o numero de vagas dobrou em relacao ao ano passado.</p>
<p>Segundo a Secretaria de Educacao, o novo horario estendido inclui oficina de leitura, educacao fisica e uma modalidade de robotica basica para os alunos do segundo ano do ensino fundamental. O contraturno funciona ate as 18h, com dois turnos de alimentacao.</p>
<p>As familias interessadas podem se cadastrar na secretaria, na Rua Pedro Celestino, das 8h as 17h.</p>',
    '/covers/cap-03.svg', 'Turmas do contraturno na Escola Municipal Presidente Medici',
    'nioaque'::public.article_scope, 'Educacao',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 1544,
    '2026-10-21T14:20:00Z', '2026-10-21T13:10:00Z', '2026-10-21T14:20:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000004', 'UBS Central passa a oferecer cardiologia com equipe compartilhada', 'Atendimento acontece as tercas e quintas; agendamento ja esta aberto ao publico', 'ubs-central-nioaque-cardiologia-equipe-compartilhada',
    '["Consulta de cardiologia ocorre as tercas e quintas, das 7h as 17h.","O atendimento e'' feito por equipe compartilhada com o Hospital Nossa Senhora Aparecida.","Exames de rotina (eletrocardiograma e Holter) passam a ser realizados na propria unidade."]'::jsonb, '<p>A UBS Central de Nioaque passa a oferecer consulta de cardiologia com equipe medica compartilhada com o Hospital Nossa Senhora Aparecida. O atendimento acontece as tercas e quintas, das 7h as 17h, mediante agendamento previo na recepcao.</p>
<p>De acordo com a coordenacao da unidade, o ganho pratico esta na reducao do deslocamento: exames de rotina como eletrocardiograma e Holter passam a ser realizados na propria UBS, sem necessidade de viagem.</p>
<p>A Secretaria Municipal de Saude informou que a lista de espera foi zerada para os agendamentos de urgencia. Casos de risco sao encaminhados pelo SAMU 192.</p>',
    '/covers/cap-04.svg', 'Fachada da UBS Central, no centro de Nioaque',
    'nioaque'::public.article_scope, 'Saude',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 2870,
    '2026-10-20T16:05:00Z', '2026-10-20T15:00:00Z', '2026-10-20T16:05:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000005', 'Festival de Musica de Nioaque confirma line-up e abre venda de ingressos', 'Evento ocupa tres noites e movimenta a rede hoteleira da cidade', 'festival-musica-nioaque-confirma-line-up-ingressos',
    '["Tres noites de shows com nomes regionais e duas bandas da capital.","Ingressos sao vendidos online e na bilheteria instalada na praca central.","A prefeitura estima movimentacao de R$ 1,2 milhao para o comercio local."]'::jsonb, '<p>A organizacao do Festival de Musica de Nioaque confirmou o line-up completo desta edicao. Seran tres noites de shows, com duas bandas da capital e nomes ja conhecidos pelo publico regional.</p>
<p>Os ingressos comecam a ser vendidos nesta semana pela internet e tambem presencialmente na bilheteria instalada na praca central. A previsao e'' de 4 mil pessoas por noite.</p>
<p>Como ja aconteceu em edicoes anteriores, a rede hoteleira local esta com a ocupacao praticamente cheia. A prefeitura estima R$ 1,2 milhao de movimentacao direta para o comercio da cidade.</p>',
    '/covers/cap-05.svg', 'Palco principal do festival montado na area de eventos',
    'nioaque'::public.article_scope, 'Cultura',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 6033,
    '2026-10-19T11:30:00Z', '2026-10-19T10:12:00Z', '2026-10-19T11:30:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000006', 'Obras de saneamento chegam a Vila Nova e reduzem perdas de agua', 'Intervencao em 7,3 km de rede promete pressao melhor e menos rompimentos', 'obras-saneamento-vila-nova-nioaque-reduz-perdas-agua',
    '["Ate 40% menos rompimentos de tubulacao na regiao, segundo a concessionaria.","Trabalhos comecaram em agosto e devem terminar antes do periodo chuvoso.","Interrupcoes sao sempre comunicadas com 48h de antecedencia."]'::jsonb, '<p>A obra de saneamento que atende o bairro Vila Nova chegou a 60% e ja reduz o indice de rompimentos na regiao. A intervencao cobre 7,3 km de rede de agua e 4,1 km de esgoto em uma das areas que mais crescem na cidade.</p>
<p>Segundo a concessionaria, a expectativa e'' de queda de ate 40% nas paradas nao programadas e melhora perceptivel da pressao nas unidades residenciais.</p>
<p>O cronograma preve a conclusao dos servicos antes do inicio das chuvas. Interrupcoes no abastecimento sao comunicadas com 48h de antecedencia por meio da empresa e dos canais oficiais da prefeitura.</p>',
    '/covers/cap-06.svg', 'Equipe da concessionaria em trabalho de troca de rede na Vila Nova',
    'nioaque'::public.article_scope, 'Infraestrutura',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 1976,
    '2026-10-18T09:40:00Z', '2026-10-18T09:05:00Z', '2026-10-18T09:40:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000007', 'MS avanca no ranking de saneamento e puxa investimento para o Sul', 'Estado libera recursos para ampliar rede de agua e esgotamento no interior', 'ms-avanca-ranking-saneamento-investimento-sul',
    '["Nioaque, Aquidauana e Rio Brilhante entram na lista de municipios contemplados.","Recursos sao de origem estadual, com contrapartida municipal de 8%.","O prazo de execucao das obras e'' de 24 meses."]'::jsonb, '<p>Mato Grosso do Sul subiu tres posicoes no ranking nacional de saneamento e anuncio a liberacao de recursos para ampliar a rede de agua e esgotamento no interior do Estado. Entre os municipios contemplados estao Nioaque, Aquidauana e Rio Brilhante.</p>
<p>O programa exige contrapartida municipal de 8% e tem prazo de execucao de 24 meses a partir da assinatura dos convenios. A secretaria estadual informou que a selecao considerou o indice de cobertura e a capacidade de manutencao das equipes locais.</p>
<p>Para Nioaque, a estimativa e'' de ampliacao de 5 mil lares ao abastecimento com agua tratada ate 2028.</p>',
    '/covers/cap-07.svg', 'Obras de rede de agua em um municipio do interior de MS',
    'ms'::public.article_scope, 'Estado',
    false, true, '00000000-0000-4000-8000-000000000004',
    'published'::public.article_status, 2210,
    '2026-10-21T18:00:00Z', '2026-10-21T17:10:00Z', '2026-10-21T18:00:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000008', 'Rota do turismo rural: Nioaque entra em novo circuito de cachoeiras e fazendas', 'Circuito reune seis municipios e promete movimentar R$ 18 milhoes ao ano', 'rota-turismo-rural-nioaque-circuito-cachoeiras-fazendas',
    '["Circuito de seis municipios foi lancado oficialmente nesta semana.","Passeios comecam no fim de semana, com saida da praca central as 7h.","Agropecuarios locais podem oferecer visitacao mediante agendamento previo."]'::jsonb, '<p>Nioaque passou a integrar oficialmente o novo circuito de turismo rural do Sul de Mato Grosso do Sul, apresentado nesta semana em Campo Grande. O roteiro percorre seis municipios e inclui cachoeiras, fazendas panoramicas e trilhas de meia-dia.</p>
<p>Os passeios comecam neste fim de semana, com saida as 7h da praca central. A organizacao recomenda reserva antecipada, ja que a capacidade dos grupos e'' limitada a 30 pessoas por van.</p>
<p>Produtores locais podem oferecer visitacao e degustacao mediante agendamento previo pela secretaria de turismo.</p>',
    '/covers/cap-08.svg', 'Trilha panoramica aberta aos visitantes do circuito turistico',
    'ms'::public.article_scope, 'Turismo',
    false, false, '00000000-0000-4000-8000-000000000004',
    'published'::public.article_status, 1420,
    '2026-10-20T10:20:00Z', '2026-10-20T09:30:00Z', '2026-10-20T10:20:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000009', 'Senado aprova PEC do seguro rural com leitura parecida para o pequeno produtor', 'Texto aprovado permite ajuste do prazo de contrato conforme o ciclo da lavoura', 'senado-aprova-pec-seguro-rural-pequeno-produtor',
    '["A PEC foi aprovada por unanimidade em segundo turno.","O novo texto permite o ajuste do prazo de contratacao conforme o ciclo da lavoura.","A publicacao no Diario Oficial ainda depende de sancao presidencial."]'::jsonb, '<p>O Senado Federal aprovou em segundo turno a proposta de emenda a Constituicao que trata do seguro rural. O texto permite o ajuste do prazo de contratacao da apolice conforme o ciclo da lavoura, ponto considerado relevante por entidades do agronegocio de pequeno porte.</p>
<p>Agora a PEC segue para sancao presidencial. A publicacao no Diario Oficial ainda depende dessa etapa, e analises do setor apontam discussoes sobre o impacto nos pequenos produtores.</p>',
    '/covers/cap-09.svg', 'Lavoura de grao em propriedade rural da regiao',
    'brasil'::public.article_scope, 'Brasil',
    false, false, '00000000-0000-4000-8000-000000000004',
    'published'::public.article_status, 5102,
    '2026-10-21T20:15:00Z', '2026-10-21T19:50:00Z', '2026-10-21T20:15:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000010', 'Banco Central mantem a taxa basica e projeta inflacao dentro da meta', 'Decisao mantem o credito barato para quem produz no campo', 'banco-central-mantem-taxa-basica-inflacao-meta',
    '["A taxa Selic foi mantida por decisao unanime do comite.","O relatorio projeta inflacao dentro da meta ate o fim do ano.","Credito rural deve acompanhar a estabilidade da moeda, avaliam entidades do setor."]'::jsonb, '<p>O comite de politica monetaria manteve a taxa basica de juros e sinalizou que a inflacao deve permanecer dentro da meta no horizonte previsto. A decisao foi unanime.</p>
<p>Para o agronegocio, a estabilidade da moeda e'' o ponto mais relevante. As entidades do setor avaliam que o credito rural deve acompanhar essa estabilidade, com custo de capitalizacao mais previsivel para o produtor.</p>',
    '/covers/cap-10.svg', 'Praca de negociacao de graos no interior de MS',
    'brasil'::public.article_scope, 'Economia',
    false, false, '00000000-0000-4000-8000-000000000004',
    'published'::public.article_status, 3880,
    '2026-10-20T19:30:00Z', '2026-10-20T19:00:00Z', '2026-10-20T19:30:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000011', 'Nioaque nao pode ficar de fora do orcamento federal', 'Coluna Visao de Nioaque', 'coluna-nioaquense-orcamento-federal',
    '["Recursos federais sao disputados por municipios de maior porte.","O plano diretor de saneamento exige planejamento de oito anos.","Sem projeto tecnico pronto, Nioaque nao disputa recurso que nao acessa."]'::jsonb, '<p>Toda discussao sobre recurso federal passa por um detalhe que quase nunca aparece nos debates: a existencia de projeto tecnico pronto. Nioaque tem direito a recurso, tem capacidade de execucao, mas nao tem projeto. Enquanto isso, municipios maiores, com equipes tecnicas estruturas, capturam a maior parte do que sobra.</p>
<p>Nao e'' uma critica a gestao municipal. E'' um alerta sobre a fragilidade da nossa estrutura. Um plano diretor de saneamento serio, com horizonte de oito anos e um desenho de atribuicoes claro, muda a conversa com o orcamento federal.</p>
<p>O proximo passo e'' concreto: organizar o setor de planejamento, mapear as obras prioritarias e deixar tudo pronto para quando a portaria de abertura sair. Quem se prepara captura. Quem espera, assiste.</p>',
    '/covers/cap-11.svg', 'Simbologia do orcamento federal',
    'coluna'::public.article_scope, 'Visao de Nioaque',
    false, true, '00000000-0000-4000-8000-000000000002',
    'published'::public.article_status, 2745,
    '2026-10-22T07:00:00Z', '2026-10-22T06:20:00Z', '2026-10-22T07:00:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000012', 'O bairro que ensina a cidade a andar devagar', 'Coluna Giro de Bairro', 'coluna-giro-de-bairro-vila-nova-andar-devagar',
    '["A praca de convivencia virou ponto de encontro de criancas e idosos.","A mudanca de ritmo na rua veio de um acordo simples entre moradores e commerciantes.","A ideia esta sendo levada a prefeitura como piloto para outros bairros."]'::jsonb, '<p>Toda tarde, por volta das cinco e meia, a praca do bairro Vila Nova muda de ritmo. As criancas que ocupavam a calcada da rua foram recuadas para a area da praca, e os commerciantes aceitaram fechar a passagem de veiculos por meia hora.</p>
<p>Foi um acordo simples, feito na assembleia de moradores, sem projeto e sem dinheiro. Em seis meses, a praca virou o ponto de encontro de criancas, idosos e de um grupo de caminhada que passou a la no fim da tarde.</p>
<p>Levar a ideia para a prefeitura como piloto em outros bairros e'' o proximo passo. Custa pouco e muda muito.</p>',
    '/covers/cap-12.svg', 'Praca de convivencia do bairro Vila Nova',
    'coluna'::public.article_scope, 'Giro de Bairro',
    false, false, '00000000-0000-4000-8000-000000000003',
    'published'::public.article_status, 1204,
    '2026-10-19T13:00:00Z', '2026-10-19T12:30:00Z', '2026-10-19T13:00:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000013', 'Radar Oficial: obras, licitacoes e prazos que o cidadao precisa acompanhar', 'O resumo da semana em Nioaque, com datas e canais de participacao', 'radar-oficial-obras-licitacoes-prazos-nioaque',
    '["Duas licitacoes abrem na proxima semana: recapeamento urbano e playground na Vila Rica.","Prazo de credenciamento dos trades do festival encerra sexta-feira.","Consulta publica de planos urbanisticos fica aberta na secretaria de obras."]'::jsonb, '<p>Esta e'' a edicao semanal do Radar Oficial do O Nioaquense, com o que voce precisa acompanhar no municipio de Nioaque: o que abre, o que encerra e onde participar.</p>
<p><strong>Licitacoes que abrem</strong><br />Duas licitacoes abrem na proxima semana. A primeira trata do recapeamento de ruas do bairro Vila Rica; a segunda, da implantacao de playground na praca do setor norte. Os editais estarao disponiveis no Diario Oficial do municipio e no mural da secretaria de obras.</p>
<p><strong>Prazos</strong><br />O prazo de credenciamento dos trades do festival encerra nesta sexta-feira, as 17h.</p>
<p><strong>Participacao</strong><br />A consulta publica de planos urbanisticos permanece aberta. Para conferir, basta levar o RG ao setor de urbanismo, das 8h as 16h.</p>',
    '/covers/cap-13.svg', 'Painel de avisos da secretaria de obras',
    'radar_oficial'::public.article_scope, 'Radar Oficial',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 890,
    '2026-10-21T12:00:00Z', '2026-10-21T11:30:00Z', '2026-10-21T12:00:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000014', 'Feira do Produtor confirma 60 expositores para a proxima edicao', 'Rascunho em revisao editorial', 'feira-do-produtor-confirma-60-expositores',
    '["Inscricoes de expositores terminam no fim do mes.","O espaco da feira sera dividido em tres setores."]'::jsonb, '<p>A organizacao da Feira do Produtor confirmou 60 expositores para a proxima edicao. As inscricoes terminam no fim do mes e o espaco sera dividido em tres setores: alimentacao, artesanato e producao rural.</p>',
    '/covers/cap-14.svg', 'Montagem das barracas da feira municipal',
    'nioaque'::public.article_scope, 'Economia',
    false, false, '00000000-0000-4000-8000-000000000002',
    'pending_review'::public.article_status, 0,
    null, '2026-10-22T09:15:00Z', '2026-10-22T09:15:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000015', 'Prefeitura entrega recapeamento de 4 km em dois bairros e reabre a via', 'Radar Oficial', 'prefeitura-recapeamento-4-km-dois-bairros-reabre-via',
    '["Trechos da Vila Rica e do Bao Vista foram recapeados e liberados ao trafego.","Sinalizacao e limpeza de bueiros fazem parte do pacote de entrega da obra.","A rua foi reaberta as 16h de quarta-feira."]'::jsonb, '<p>A Prefeitura entregou na quarta-feira a etapa de recapeamento que alcanca 4 km de vias na Vila Rica e no Bao Vista. Com a conclusao do servico, as duas ruas voltaram a aceitar o trafego pesado na mesma noite.</p>
<p>Além da pista nova, o pacote inclui repintura de faixas, limpeza de bueiros e reposicao de 12 placas de sinalizacao. A administracao municipal afirma que a etapa seguinte cobre o acesso ao hospital.</p>
<p>Moradores relataram melhora na passagem de onibus e das vans que fazem a linha do centro.</p>',
    '/covers/cap-15.svg', 'Vias recapeadas na Vila Rica',
    'radar_oficial'::public.article_scope, 'Prefeitura',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 712,
    '2026-10-22T11:20:00Z', '2026-10-22T10:40:00Z', '2026-10-22T11:20:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000016', 'Novo programa municipal atende 300 familias com cesta basica', 'Radar Oficial', 'novo-programa-municipal-300-familias-cesta-basica',
    '["Cadastro fica aberto de segunda a sexta, das 8h as 14h, na Secretaria de Assistencia Social.","Criterios consideram renda familiar e numero de moradores por domicilio.","A primeira entrega esta prevista para o dia 15 do mes que vem."]'::jsonb, '<p>A Prefeitura abriu cadastro para um novo programa de cesta basica que deve atender 300 familias do municipio. O atendimento acontece na Secretaria de Assistencia Social, de segunda a sexta, das 8h as 14h.</p>
<p>Os criterios consideram a renda familiar e o numero de moradores por domicilio. O cadastro exige documento de identidade, comprovante de residencia e declaracao de renda, que pode ser feita na hora.</p>
<p>A primeira entrega esta prevista para o dia 15 do mes que vem. A pasta com os documentos pode ser baixada no site da Prefeitura.</p>',
    '/covers/cap-16.svg', 'Atendimento na Secretaria de Assistencia Social',
    'radar_oficial'::public.article_scope, 'Prefeitura',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 531,
    '2026-10-21T15:40:00Z', '2026-10-21T15:00:00Z', '2026-10-21T15:40:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000017', 'Camara aprova projeto que preve desconto de IPTU para comerccio de rua', 'Radar Oficial', 'camara-aprova-projeto-desconto-iptu-comercio-rua',
    '["A reducao vale para empresas de pequeno porte com alvara no comercio de rua.","O desconto e'' de ate 30% e depende da regularidade fiscal.","Agora o projeto vai para sancao do Executivo."]'::jsonb, '<p>A Camara Municipal aprovou em primeira votacao o projeto que preve desconto no IPTU para empresas de pequeno porte que atuam no comercio de rua. A reducao pode chegar a 30% para quem estiver em dia com o pagamento do imposto.</p>
<p>Segundo o projeto, o desconto e'' aplicado automaticamente pelo sistema tributario, sem solicitacao. A mesma medida tambem inclui a liberacao de publicidade gratuita em radio local para quem participar do programa.</p>
<p>Aprovado na Camara, o texto segue agora para sancao do Executivo e publicacao no Diario Oficial.</p>',
    '/covers/cap-17.svg', 'Sessao da Camara Municipal',
    'radar_oficial'::public.article_scope, 'Câmara',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 448,
    '2026-10-21T13:05:00Z', '2026-10-21T12:30:00Z', '2026-10-21T13:05:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000018', 'Vereadores aprovam em segunda votacao o novo plano diretor', 'Radar Oficial', 'vereadores-aprovam-segunda-votacao-plano-diretor',
    '["O texto amplia o perimetro de expansao urbana nos dois lados do municipio.","Novas regras de ocupacao entram em vigor com a publicacao no Diario Oficial.","A convite popular foi aberta a contribuicoes por 15 dias."]'::jsonb, '<p>Os vereadores aprovaram em segunda votacao o novo plano diretor do municipio. O texto amplia o perimetro de expansao urbana nos dois sentidos e cria criterios de ocupacao para as areas de borda.</p>
<p>As novas regras entram em vigor depois da publicacao no Diario Oficial. A contribuicao popular foi aberta por 15 dias e reuniu 212 manifestacoes, sendo 43 aceitas pela Casa.</p>
<p>Segundo a Camara, o proximo passo e'' a criacao das zonas de interesse social, que vao definir onde cada tipo de obra pode ser prioridade.</p>',
    '/covers/cap-18.svg', 'Plenario durante a votacao do plano diretor',
    'radar_oficial'::public.article_scope, 'Câmara',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 623,
    '2026-10-20T17:30:00Z', '2026-10-20T16:50:00Z', '2026-10-20T17:30:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000019', 'Concurso municipal abre cerca de 40 vagas para a area de educacao', 'Radar Oficial', 'concurso-municipal-40-vagas-educacao',
    '["Sao vagas de professor e de agente administrativo em escolas da rede municipal.","Inscricoes comecam na segunda-feira e ficam abertas por 10 dias.","O edital completo esta no site da Prefeitura e no Diario Oficial."]'::jsonb, '<p>A Prefeitura publicou o edital de concurso com cerca de 40 vagas para a rede municipal de ensino. Sao posicoes de professor e de agente administrativo, com exigencia de ensino superior para as duas.</p>
<p>As inscricoes comecam na segunda-feira e ficam abertas por 10 dias, das 8h as 17h. A taxa e isenta para candidatos de baixa renda que apresentarem a declaracao exigida no ato da inscricao.</p>
<p>O edital completo, com o conteudo do programa e o cronograma de provas, esta no site da Prefeitura e no Diario Oficial.</p>',
    '/covers/cap-19.svg', 'Edital publicado no Diario Oficial do municipio',
    'radar_oficial'::public.article_scope, 'Concursos',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 1105,
    '2026-10-20T12:15:00Z', '2026-10-20T11:45:00Z', '2026-10-20T12:15:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000020', 'Diario Oficial da cidade: confira as publicacoes desta semana', 'Radar Oficial', 'diario-oficial-publicacoes-da-semana',
    '["A edicao da semana reune 12 portarias, 3 editais e 2 atos de licitacao.","O gazeto pode ser lido online ou retirado em grafica no centro.","Prazo para impugnacao dos editais deONEY vence sexta-feira."]'::jsonb, '<p>A edicao desta semana do Diario Oficial do municipio reune 12 portarias, 3 editais e 2 atos de licitacao. O gazeto pode ser lido online em PDF ou retirado em grafica no centro.</p>
<p>Destaques da edicao: o novo regulamento do transporte escolar, a licitacao da obra de recapeamento e a tabela de horario de onibus para o proximo trimestre.</p>
<p>Os prazos para impugnacao dos editais vencem nesta sexta-feira. Quem tiver interesse em participar das licitacoes pode pedir o processo completo na Secretaria de Obras.</p>',
    '/covers/cap-20.svg', 'Edicao semanal do Diario Oficial do municipio',
    'radar_oficial'::public.article_scope, 'Diário Oficial',
    false, false, '00000000-0000-4000-8000-000000000001',
    'published'::public.article_status, 388,
    '2026-10-19T14:45:00Z', '2026-10-19T14:00:00Z', '2026-10-19T14:45:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000021', 'A praca do bairro virou a sala de estar da cidade', 'Coluna Giro de Bairro', 'coluna-praca-sala-de-estar-da-cidade',
    '["A praca ganhou sombra, bancos e um campo de futsal de terra.","O conjunto foi feito com dinheiro de um convênio estadual.","O bom exemplo esta sendo estudado por outros bairros."]'::jsonb, '<p>Toda cidade tem uma praca que e'' a sua sala de estar. Em Nioaque, durante muitos anos, essa sala ficou fechada para o cars e aberta so para o transito.</p>
<p>A do bairro Vila Nova virou outra coisa depois que a prefeitura aceitou a proposta da assembleia de moradores: sombra nova, bancos reformados e um campo de futsal de terra que a galera montou no proprio sabado de manha.</p>
<p>Convênio estadual pagou o material; a mao de obra foi do bairro. O exemplo ta sendo estudado pela secretaria de obras para outras praças da cidade.</p>',
    '/covers/cap-21.svg', 'Praca de convivencia do bairro Vila Nova',
    'coluna'::public.article_scope, 'Giro de Bairro',
    false, false, '00000000-0000-4000-8000-000000000003',
    'published'::public.article_status, 998,
    '2026-10-21T07:30:00Z', '2026-10-21T07:00:00Z', '2026-10-21T07:30:00Z'
  ) on conflict (id) do nothing;

insert into public.articles (
    id, title, subtitle, slug, summary_bullets, content, cover_image_url, cover_image_caption,
    scope, category_label, is_breaking, is_featured, author_id, status, views_count,
    published_at, created_at, updated_at
  ) values (
    'a1000000-0000-4000-8000-000000000022', 'O sul do estado parou de esperar', 'Coluna Radar MS', 'coluna-radar-ms-o-sul-do-estado-parou-de-esperar',
    '["Os indicadores do interior finally melhoram em tres areas simultaneas.","Saneamento, educacao e infraestrutura sao os tres eixos do ciclo.","O risco agora e'' transformar o ciclo em promessa sem execucao."]'::jsonb, '<p>Quem acompanha os indicadores do interior de Mato Grosso do Sul percebe uma coisa simples: pela primeira vez em muito tempo, o sul do estado aparece na mesma linha do que chamamos de desenvolvimento, e nao duas casas atras.</p>
<p>Saneamento, educacao e infraestrutura estao funcionando juntas. Nenhuma das tres areas resolve o problema sozinha, mas a combinacao delas comeca a aparecer nas ruas.</p>
<p>O risco agora e'' outro: transformar ciclo em promessa. A populacao do interior ja viu muito plano bonito. O que marca a diferenca agora e'' a obra entregue no prazo - e ela precisa aparecer no seu bairro, nao no orcamento de outro lugar.</p>',
    '/covers/cap-22.svg', 'Cidade do interior de MS',
    'coluna'::public.article_scope, 'Radar MS',
    false, false, '00000000-0000-4000-8000-000000000004',
    'published'::public.article_status, 1642,
    '2026-10-20T06:45:00Z', '2026-10-20T06:20:00Z', '2026-10-20T06:45:00Z'
  ) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  4) Servicos publicos (farmacia de plantao, alertas, onibus)
-- ---------------------------------------------------------------------------
insert into public.public_utilities (
    id, duty_date, pharmacy_name, pharmacy_phone, pharmacy_address,
    alert_active, alert_message, alert_level, bus_schedule_html, updated_at
  ) values (
    'u1000000-0000-4000-8000-000000000001', '2026-10-22', 'Drogaria Sao Lucas',
    '(67) 3465-1122', 'Rua Pedro Celestino, 320 - Centro, Nioaque/MS',
    true, 'Chuva forte prevista para a regiao a partir das 16h. A Rua das Palmeiras pode alagar; prefira a rota pela Avenida Afonso Arinos.',
    'warning'::public.alert_level, '<ul>
      <li><strong>Rio Brilhante</strong> - 06:30 e 18:00</li>
      <li><strong>Aquidauana</strong> - 07:15 e 17:30</li>
      <li><strong>Campo Grande</strong> - 05:45 e 15:45</li>
    </ul>',
    '2026-10-22T05:00:00Z'
  ) on conflict (id) do nothing;

insert into public.public_utilities (
    id, duty_date, pharmacy_name, pharmacy_phone, pharmacy_address,
    alert_active, alert_message, alert_level, bus_schedule_html, updated_at
  ) values (
    'u1000000-0000-4000-8000-000000000002', '2026-10-23', 'Farmacia Central Popular',
    '(67) 3465-2431', 'Avenida Matsunaga, 1450 - Centro, Nioaque/MS',
    false, null,
    'info'::public.alert_level, '<ul>
      <li><strong>Rio Brilhante</strong> - 06:30 e 18:00</li>
      <li><strong>Aquidauana</strong> - 07:15 e 17:30</li>
      <li><strong>Campo Grande</strong> - 05:45 e 15:45</li>
    </ul>',
    '2026-10-22T05:00:00Z'
  ) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  5) Publicidade local
-- ---------------------------------------------------------------------------
insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    'ad100000-0000-4000-8000-000000000001', 'Farmacia Popular Nioaque', '20% de desconto em essenciais para nioaquenses no dia do cidadao', '/covers/ad-01.svg',
    '#', '5567999912043',
    'header_billboard'::public.ad_slot_position,
    'banner'::public.ad_offer_type, null, 'Faixa no topo do portal durante todo o mes.',
    true, '2026-10-15T00:00:00Z', '2026-10-31T23:59:59Z', 412
  ) on conflict (id) do nothing;

insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    'ad100000-0000-4000-8000-000000000002', 'Auto Pecas Silva', 'Revisao completa e troca de oleo com preco especial para a regiao', '/covers/ad-02.svg',
    '#', '5567998844210',
    'home_middle'::public.ad_slot_position,
    'banner'::public.ad_offer_type, null, null,
    true, '2026-10-01T00:00:00Z', null, 238
  ) on conflict (id) do nothing;

insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    'ad100000-0000-4000-8000-000000000003', 'Padaria Pao Quente', 'Pao na chapa, cafe com receitas da casa e bolo de leite de quintal', '/covers/ad-03.svg',
    '#', '5567977701234',
    'daily_deal'::public.ad_slot_position,
    'daily_deal'::public.ad_offer_type, 'Oferta do dia', 'Oferta valida so no dia da publicacao.',
    true, null, null, 96
  ) on conflict (id) do nothing;

insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    'ad100000-0000-4000-8000-000000000004', 'Nioaque Imoveis', 'Casas e lotes na regiao com financiamento facilitado', '/covers/ad-04.svg',
    '#', '5567996633001',
    'sidebar'::public.ad_slot_position,
    'banner'::public.ad_offer_type, null, null,
    true, null, null, 153
  ) on conflict (id) do nothing;

insert into public.local_ads (
    id, client_name, title, image_url, target_url, whatsapp_number,
    slot_position, offer_type, price_label, notes,
    active, starts_at, ends_at, clicks_count
  ) values (
    'ad100000-0000-4000-8000-000000000005', 'Mercado Nilo', 'Carnes nobres com 25% de desconto nesta sexta-feira', '/covers/ad-03.svg',
    '#', '5567991122334',
    'daily_deal'::public.ad_slot_position,
    'daily_deal'::public.ad_offer_type, '25% OFF', 'Oferta encerrada - aguardando proxima campanha.',
    false, '2026-10-19T00:00:00Z', '2026-10-24T23:59:59Z', 74
  ) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
--  6) Horarios de onibus intermunicipais
-- ---------------------------------------------------------------------------
insert into public.bus_schedules (
    id, route_name, destination, departure_times, frequency, notes, position, active
  ) values (
    'b1000000-0000-4000-8000-000000000001', 'Linha 01', 'Rio Brilhante',
    '["06:30","18:00"]'::jsonb, 'Diaria', 'Sai do terminal central, em frente a praca.',
    1, true
  ) on conflict (id) do nothing;

insert into public.bus_schedules (
    id, route_name, destination, departure_times, frequency, notes, position, active
  ) values (
    'b1000000-0000-4000-8000-000000000002', 'Linha 02', 'Aquidauana',
    '["07:15","17:30"]'::jsonb, 'Diaria', null,
    2, true
  ) on conflict (id) do nothing;

insert into public.bus_schedules (
    id, route_name, destination, departure_times, frequency, notes, position, active
  ) values (
    'b1000000-0000-4000-8000-000000000003', 'Linha 05', 'Campo Grande',
    '["05:45","15:45"]'::jsonb, 'Diaria', 'Passa pela MS-178. Leva cerca de 3h20.',
    3, true
  ) on conflict (id) do nothing;

insert into public.bus_schedules (
    id, route_name, destination, departure_times, frequency, notes, position, active
  ) values (
    'b1000000-0000-4000-8000-000000000004', 'Linha 09', 'Vila Yara e entorno',
    '["08:00","13:00","18:30"]'::jsonb, 'Seg a Sex', 'LinhaCircular do bairro.',
    4, true
  ) on conflict (id) do nothing;

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
