/**
 * mock-data.ts
 * -----------------------------------------------------------------------------
 * Dados de EXEMPLO do portal "O Nioaquense".
 *
 * Objetivo: permitir que a home, a materia e o painel /admin sejam developidos
 * e revisados (design, layout, mobile-first) ANTES de conectar as chaves de
 * producao do Supabase.
 *
 * Os titulos e resumos abaixo sao de Matters de Nioaque (MS), MS e Brasil
 * publicados nos portais locais de referencia, usados aqui como semente de
 * desenvolvimento. Sao seeds de demonstracao, nao acervo proprio do portal.
 *
 * IMPORTANTE: todo o conteudo abaixo e' FICTICIO e serve apenas como
 * semente. Ao conectar o Supabase, `src/lib/content.ts` passa a ler do
 * banco e este arquivo fica sendo o fallback de desenvolvimento.
 *
 * Espelha 1:1 as tabelas de `supabase/migrations/001_initial_schema.sql`.
 */

import type {
  Article,
  Authority,
  BusSchedule,
  LocalAd,
  LotteryResult,
  MarketQuote,
  Profile,
  PublicUtility,
  ReaderSubmission,
  UtilityGuide,
} from './types';

/* =============================================================================
 *  Perfis (redacao + colunistas)
 * ============================================================================= */

export const mockProfiles: Profile[] = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    full_name: 'Redacao O Nioaquense',
    slug: 'redacao-o-nioaquense',
    role: 'admin',
    column_name: 'Redacao',
    bio: 'Equipe editorial do portal. Publica o dia a dia de Nioaque, do Sul de Mato Grosso do Sul e do Brasil.',
    avatar_url: '/covers/avatar-redacao.svg',
    social_links: { instagram: 'https://instagram.com/onioaquense', whatsapp: '5567999990000' },
    can_publish_directly: true,
    active: true,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    full_name: 'Marcos Aurelio Duarte',
    slug: 'marcos-aurelio-duarte',
    role: 'columnist',
    column_name: 'Visao de Nioaque',
    bio: 'Jornalista local ha 18 anos. Escreve sobre politica municipal, economia regional e o futuro das cidades pequenas do MS.',
    avatar_url: '/covers/avatar-marcos.svg',
    social_links: { instagram: 'https://instagram.com/visaodenioaque' },
    can_publish_directly: false,
    active: true,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    full_name: 'Cleide Ramos',
    slug: 'cleide-ramos',
    role: 'columnist',
    column_name: 'Giro de Bairro',
    bio: 'Moradora do bairro Vila Nova. Leva para a coluna o que acontece nas esquinas, nas escolas e nas feiras da cidade.',
    avatar_url: '/covers/avatar-cleide.svg',
    social_links: { whatsapp: '5567988881111' },
    can_publish_directly: false,
    active: true,
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    full_name: 'Rafael Prado',
    slug: 'rafael-prado',
    role: 'columnist',
    column_name: 'Radar MS',
    bio: 'Correspondente regional. Acompanha as decisoes do governo estadual e os numeros que impactam o interior de MS.',
    avatar_url: '/covers/avatar-rafael.svg',
    social_links: { linkedin: 'https://linkedin.com/in/radarms' },
    can_publish_directly: true,
    active: true,
  },
  {
    id: '10000000-0000-4000-8000-000000000005',
    full_name: 'Vinicius Prado',
    slug: 'vinicius-prado',
    role: 'columnist',
    column_name: 'Bastidores',
    bio: 'Fica nos bastidores da Camera, da Prefeitura e das entidades do municipio. O que o anuncio nao conta.',
    avatar_url: '/covers/avatar-vinicius.svg',
    social_links: {},
    can_publish_directly: false,
    active: true,
  },
];

/* =============================================================================
 *  Materias - Nioaque
 * ============================================================================= */

export const mockArticles: Article[] = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    title:
      'Motociclista de 28 anos morre apos grave acidente entre moto e Fiorino no ultimo sabado, em Nioaque',
    subtitle: 'Colisao frontal ocorreu na BR-060; vítima foi socorrida em estado grave',
    slug: 'motociclista-28-anos-morre-acidente-moto-fiorino-br-060-nioaque',
    summary_bullets: [
      'A colisao frontal aconteceu na BR-060, no ultimo sabado (17), em Nioaque.',
      'Wellington Henrique foi socorrido em estado grave e encaminhado para Campo Grande.',
      'A vitima nao resistiu aos ferimentos e o caso foi registrado como morte no local.',
    ],
    content: `<p>Um motociclista de 28 anos morreu na noite do sabado (17) apos se envolver em uma colisao frontal entre uma moto e um Fiorino na BR-060, em Nioaque.</p>
<p>Wellington Henrique foi socorrido ainda no local, em estado grave, e encaminhado para uma unidade hospitalar de Campo Grande. Nao resistiu aos ferimentos.</p>
<p>A Policia Militar atendeu a chamada e iniciou o resgate. A prova de crash foi recolhida pela pericia.</p>
<p>Segundo informacoes da corporacao, a pista estava molhada no momento da colisao. A apuracao das causas segue em andamento.</p>`,
    cover_image_url: '/covers/cap-01.svg',
    cover_image_caption: 'Trecho da BR-060 onde aconteceu a colisao',
    scope: 'nioaque',
    category_label: 'Acidente Nioaque',
    is_breaking: false,
    is_featured: true,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 9840,
    published_at: '2026-10-15T11:20:00Z',
    created_at: '2026-10-15T10:50:00Z',
    updated_at: '2026-10-15T11:20:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    title: 'De Nioaque para Portugal: pratica de inclusao da rede municipal ganha projecao internacional',
    subtitle: 'Experiencia em escolas municipais virou estudo de caso apresentado em Braga',
    slug: 'de-nioaque-para-portugal-pratica-inclusao-rede-municipal',
    summary_bullets: [
      "A experiencia desenvolvida nas escolas municipais virou estudo de caso em um livro sobre educacao de estudantes autistas.",
      'O material foi apresentado em Braga, Portugal, para uma plateia de professores.',
      'A rede municipal earned o reconhecimento por meio de uma pratica de acompanhamento pedagogico.',
    ],
    content: `<p>Uma pratica desenvolvida nas escolas municipais de Nioaque sobre educacao de estudantes autistas virou estudo de caso de um livro publicado no exterior. O trabalho foi apresentado em Braga, Portugal.</p>
<p>A iniciativa da rede municipal earned o destaque por adotar um acompanhamento pedagogico que combina avaliacao continua e participacao da familia no plano de ensino de cada aluno.</p>
<p>Segundo a Secretaria de Educacao, o reconhecimento internacional abre porta para intercambio de formacao com outras redes municipais do pais.</p>`,
    cover_image_url: '/covers/cap-02.svg',
    cover_image_caption: 'Presentation da pratica em Braga, Portugal',
    scope: 'nioaque',
    category_label: 'Educacao Nioaque',
    is_breaking: false,
    is_featured: true,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 6120,
    published_at: '2026-10-08T12:30:00Z',
    created_at: '2026-10-08T12:00:00Z',
    updated_at: '2026-10-08T12:30:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    title: 'Produtores rurais de Nioaque recebem fertilizante organico para ampliar producao',
    subtitle: 'Distribuicao busca reduzir custos, ampliar a producao e fortalecer a renda das familias rurais',
    slug: 'produtores-rurais-nioaque-recebem-fertilizante-organico',
    summary_bullets: [
      'A entrega do fertilizante organico foi feita a familias produtoras do municipio.',
      'A acao busca reduzir o custo de producao e ampliar a produtividade na lavoura.',
      'Produtores apontam que a medida fortalece a renda e a permanencia das familias no campo.',
    ],
    content: `<p>Produtores rurais de Nioaque receberam fertilizante organico em uma acao promovida com apoio do poder publico. A distribuicao tem como meta reduzir custos, ampliar a producao e fortalecer a renda das familias.</p>
<p>O material, de origem organica, foi distribuido conforme a area de cada propriedade e o tipo de cultura. Para quem vive da lavoura, a reducao do custo de insumo e' o principal ganho.</p>
<p>A expectativa e' de que a producao local aumente e que mais familias permaneçam no campo, em um municipio que tem a agricultura familiar como base da economia.</p>`,
    cover_image_url: '/covers/cap-03.svg',
    cover_image_caption: 'Entrega do fertilizante as familias produtoras',
    scope: 'nioaque',
    category_label: 'Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 5480,
    published_at: '2026-10-08T09:15:00Z',
    created_at: '2026-10-08T08:50:00Z',
    updated_at: '2026-10-08T09:15:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    title: 'Nioaque institui comite para acompanhar alfabetizacao e aprendizagem dos alunos',
    subtitle: 'Novo grupo monitora resultados, apoia professores e define estrategias de desempenho',
    slug: 'nioaque-institui-comite-alfabetizacao-aprendizagem-alunos',
    summary_bullets: [
      'O novo comite terá participacao de profissionais da educacao da rede municipal.',
      'O grupo vai monitorar resultados, apoiar professores e definir estrategias de melhoria.',
      'A acao mira direto no desempenho dos estudantes nos primeiros anos do ensino fundamental.',
    ],
    content: `<p>Nioaque instituiu um comite para acompanhar a alfabetizacao e a aprendizagem dos alunos da rede municipal. O grupo tera participacao de profissionais da educacao.</p>
<p>Entre as atribuicoes estao monitorar os resultados, apoiar os professores e definir estrategias para melhorar o desempenho dos estudantes.</p>
<p>A medida foi apresentada como parte do trabalho de recuperacao da aprendizagem, que concentra o esforco nos primeiros anos do ensino fundamental.</p>`,
    cover_image_url: '/covers/cap-04.svg',
    cover_image_caption: 'Reuniao de apresentacao do novo comite',
    scope: 'nioaque',
    category_label: 'Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 4930,
    published_at: '2026-10-01T14:00:00Z',
    created_at: '2026-10-01T13:30:00Z',
    updated_at: '2026-10-01T14:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    title: 'Frigorifico de Nioaque, Frigocampo, volta a paralisar atividades por falta de materia-prima',
    subtitle: 'Unidade havia retomado as atividades em agosto e anunciou nova paralisacao',
    slug: 'frigorifico-nioaque-frigocampo-paralisa-falta-materia-prima',
    summary_bullets: [
      'O frigorifico havia retomado as atividades em agosto, apos um periodo parado.',
      'A empresa anunciou nova paralisacao diante das dificuldades no abastecimento de materia-prima.',
      'A situacao affects o emprego e o abastecimento de carne na regiao.',
    ],
    content: `<p>O Frigorifico de Nioaque, o Frigocampo, voltou a paralisar suas atividades por falta de materia-prima. A unidade, que havia retomado o trabalho em agosto, anunciou uma nova suspensao.</p>
<p>O abastecimento irregular temReachado o municipio eDivide a regiao. A empresa informou que tenta regularizar o fluxo de insumos.</p>
<p>Trabalhadores da unidade foram orientados sobre a situacao. A Camera Municipal deve convocar representantes para clarear o cronograma.</p>`,
    cover_image_url: '/covers/cap-05.svg',
    cover_image_caption: 'Frigocampo, frigorifico de Nioaque',
    scope: 'nioaque',
    category_label: 'Frigorifico Nioaque',
    is_breaking: false,
    is_featured: true,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 11240,
    published_at: '2026-09-22T10:00:00Z',
    created_at: '2026-09-22T09:30:00Z',
    updated_at: '2026-09-22T10:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    title: 'Feira do Produtor movimenta Nioaque com produtos frescos e fortalece agricultores locais',
    subtitle: 'Realizada duas vezes por semana na proximidade da Rodoviaria',
    slug: 'feira-do-produtor-movimenta-nioaque-agricultores-locais',
    summary_bullets: [
      "A feira e' realizada duas vezes por semana nas proximidades da Rodoviaria.",
      "A proximidade do consumidor e' do produtor ajuda a movimentar a agricultura familiar.",
      'A resolucao dafeira amplia o comercio local e a oferta de produtos frescos na cidade.',
    ],
    content: `<p>A Feira do Produtor movimenta Nioaque com produtos frescos e ajuda a fortalecer os agricultores locais. A feira acontece duas vezes por semana nas proximidades da Rodoviaria.</p>
<p>A proximidade entre consumidor e produtor e' apontada como o principal trunfo da iniciativa, que amplia o comercio local e a oferta de produtos frescos na cidade.</p>
<p>Produtores da agricultura familiarParticipam com verduras, frutas, queijo,___
</p>`.replace('\n', ''),
    cover_image_url: '/covers/cap-06.svg',
    cover_image_caption: 'Bancas da Feira do Produtor na Rodoviaria',
    scope: 'nioaque',
    category_label: 'Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 2610,
    published_at: '2026-09-22T08:20:00Z',
    created_at: '2026-09-22T08:00:00Z',
    updated_at: '2026-09-22T08:20:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000007',
    title: 'Crianca de 3 anos morre apos descarga eletrica em propriedade rural de Nioaque',
    subtitle: 'Salomao Eduardo Rodrigues foi encontrado proximo a um galinheiro, em contato com fio solto',
    slug: 'crianca-3-anos-morre-descarga-eletrica-propriedade-rural-nioaque',
    summary_bullets: [
      'A crianca de 3 anos foi encontrada caida proximo a um galinheiro, em contato com um fio de energia solto.',
      'As circunstancias da morte serao investigadas pela authorities locais.',
      "O caso foi encaminhado a Policia Civil.",
    ],
    content: `<p>Uma crianca de 3 anos morreu apos descarga eletrica em uma propriedade rural de Nioaque. Salomão Eduardo Rodrigues foi encontrado caido proximo a um galinheiro e em contato com um fio de energia solto.</p>
<p>As circunstancias da morte serao investigadas. O caso foi encaminhado a Policia Civil e o corpo foi enviado ao IML de Jardim.</p>
<p>A comunidade rural pediu reforco na manutencao da rede eletrica na regiao, que tem historico de outages em areas deetti.</p>`,
    cover_image_url: '/covers/cap-07.svg',
    cover_image_caption: 'Propriedade rural onde aconteceu a fatalidade',
    scope: 'nioaque',
    category_label: 'Fatalidade',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 8340,
    published_at: '2026-09-20T15:30:00Z',
    created_at: '2026-09-20T15:00:00Z',
    updated_at: '2026-09-20T15:30:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000008',
    title: '70 municipios de MS estao em alerta para tempestade; Nioaque esta entre as cidades',
    subtitle: 'Aviso do INMET predicts chuva de ate 50 mm por dia, ventos de 60 km/h e granizo',
    slug: '70-municipios-ms-alerta-tempestade-nioaque-inmet',
    summary_bullets: [
      'O aviso do INMET cobre 70 municipios de Mato Grosso do Sul, Nioaque entre eles.',
      'A previsao indica chuva de ate 50 mm por dia e ventos de ate 60 km/h.',
      'Existe possibilidade de granizo; a populacao deve se proteger em caso de temporal.',
    ],
    content: `<p>O INMET emitiu aviso de tempestade para 70 municipios de Mato Grosso do Sul, e Nioaque esta entre as cidades incluidas. O alerta predicts chuva de ate 50 mm por dia, ventos de ate 60 km/h e possibilidade de granizo.</p>
<p>A Defesa Civil orientou a populacao a se abrigar em construcoes seguras, evitar areas de grande circulacao de veiculos e observar o risco de queda de arvores.</p>
<p>Antes, o INMET tinha emitido alerta vermelho com grande perigo para 33 cidades do Estado, com ventos de ate 100 km/h.</p>`,
    cover_image_url: '/covers/cap-08.svg',
    cover_image_caption: 'Céu sobre a região durante o temporal',
    scope: 'nioaque',
    category_label: 'Tempestade',
    is_breaking: true,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 3890,
    published_at: '2026-09-20T09:00:00Z',
    created_at: '2026-09-20T08:30:00Z',
    updated_at: '2026-09-20T09:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000009',
    title: 'Nioaque tera Campeonato Municipal de Futebol com R$ 18,4 mil em premiacao',
    subtitle: 'Decreto publicado no Diario Oficial preve inicio da competicao para o dia 27 de setembro',
    slug: 'nioaque-campeonato-municipal-futebol-premiacao-18-4-mil',
    summary_bullets: [
      'O decreto foi publicado no Diario Oficial do Municipio e preve o inicio da competicao em 27 de setembro.',
      "A premiacao total e' de R$ 18,4 mil, com R$ 10 mil destinados ao campeao.",
      'A competicao envolve as equipes do municipio e movimenta o esporte local.',
    ],
    content: `<p>Nioaque tera Campeonato Municipal de Futebol com premio total de R$ 18,4 mil. O decreto foi publicado no Diario Oficial do Municipio.</p>
<p>O cronograma preve o inicio da competicao para o dia 27 de setembro, com R$ 10 mil destinados ao campeao. As inscricoes das equipes ficam abertas ate a data limite prevista no decreto.</p>
<p>A iniciativa movimenta o esporte amador e dao mais espaco para os atletas do municipio.</p>`,
    cover_image_url: '/covers/cap-09.svg',
    cover_image_caption: 'Campo onde será disputada a competição',
    scope: 'nioaque',
    category_label: 'Esportes',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 2140,
    published_at: '2026-09-20T07:45:00Z',
    created_at: '2026-09-20T07:20:00Z',
    updated_at: '2026-09-20T07:45:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000010',
    title: 'Nioaque instala Conselho Municipal dos Direitos da Mulher e amplia participacao feminina',
    subtitle: 'Novo orgao reune Poder Publico e sociedade civil para acompanhar politicas publicas',
    slug: 'nioaque-instala-conselho-direitos-da-mulher',
    summary_bullets: [
      'O novo orgao reune o Poder Publico e a sociedade civil.',
      "A ideia e' acompanhar e contribuir com politicas publicas voltadas as mulheres.",
      'A instalacao amplia a participacao feminina na tomada de decisoes do municipio.',
    ],
    content: `<p>Nioaque instalou o Conselho Municipal dos Direitos da Mulher. O novo orgao reune o Poder Publico e a sociedade civil.</p>
<p>A competencia do conselho e' acompanhar e contribuir com as politicas publicas voltadas as mulheres do municipio, dando mais peso a participacao feminina nas decisoes do municipio.</p>
<p>A instalacao foi acompanhada por representatives do municipio e por entidades da sociedade civil.</p>`,
    cover_image_url: '/covers/cap-10.svg',
    cover_image_caption: 'Sessao de instalacao do conselho',
    scope: 'nioaque',
    category_label: 'Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1780,
    published_at: '2026-08-22T13:00:00Z',
    created_at: '2026-08-22T12:30:00Z',
    updated_at: '2026-08-22T13:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000011',
    title: "Suspeito de duplo homicide em Nioaque informa onde teria deixado a arma; revolver e' apreendido",
    subtitle: 'Diligencias da Policia Civil encontraram revólver calibre .38',
    slug: 'suspeito-duplo-homicidio-nioaque-revolver-apreendido',
    summary_bullets: [
      'O homem se apresentou na Brigada de Policia Civil de Nioaque e indicou o local da arma.',
      'A equipe policial realizo diligencias e encontrou um revolver calibre .38.',
      'O crime uninsured no Assentamento Colonia Conceicao, na ultima sexta-feira (17).',
    ],
    content: `<p>Apos se apresentar na.SUPP de Policia Civil de Nioaque, o homem apontado como suspeito pelo duploFILES indicou aos policiais o local onde teria se desfeito da arma utilizada no crime.</p>
<p>A equipe policial realizou diligencias e encontrou o revolver calibre .38 no local apontado. O crime uninsured no Assentamento Colonia Conceicao, na ultima sexta-feira (17).</p>
<p>As apuracoes seguem em andamento.</p>`,
    cover_image_url: '/covers/cap-11.svg',
    cover_image_caption: 'Revólver apreendido pela Polícia Civil',
    scope: 'nioaque',
    category_label: 'Policia Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1520,
    published_at: '2026-07-22T16:00:00Z',
    created_at: '2026-07-22T15:30:00Z',
    updated_at: '2026-07-22T16:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000012',
    title: 'Urgente: possivel morte por afogamento mobiliza autoridades no bairro Baia, em Nioaque',
    subtitle: 'Policia Militar e Civil confirmaram a ocorrencia; Policia Cientifica foi acionada',
    slug: 'urgente-possivel-morte-por-afogamento-bairro-baia-nioaque',
    summary_bullets: [
      'A Policia Militar e a Policia Civil confirmaram a ocorrencia a reportagem.',
      'A Policia Cientifica foi acionada para realizar a pericia.',
      'As autoridades trabalham para esclarecer as circunstancias da morte.',
    ],
    content: `<p>Possivel morte por afogamento mobilizou autoridades no bairro Baia, em Nioaque. A Policia Militar e a Policia Civil confirmaram a ocorrencia a reportagem.</p>
<p>A Policia Cientifica foi acionada para realizar a pericia e esclarecer as circunstancias da morte. Equipes também trabalharam na busca na regiao.</p>`,
    cover_image_url: '/covers/cap-12.svg',
    cover_image_caption: 'Área da ocorrência no bairro Baía',
    scope: 'nioaque',
    category_label: 'Policia Nioaque',
    is_breaking: true,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1290,
    published_at: '2026-06-22T11:00:00Z',
    created_at: '2026-06-22T10:30:00Z',
    updated_at: '2026-06-22T11:00:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* MATO GROSSO DO SUL                                                 */
  /* ------------------------------------------------------------------ */
  {
    id: '20000000-0000-4000-8000-000000000020',
    title: 'Agehab-MS notifica moradores de 19 cidades de MS sobre dividas de casas populares',
    subtitle: 'Mutuarios relacionados tem cinco dias uteis para quitar os atrasados',
    slug: 'agehab-ms-notifica-moradores-19-cidades-dividas-casas-populares',
    summary_bullets: [
      'A Agehab-MS notificou moradores de 19 cidades de Mato Grosso do Sul.',
      'Os mutuarios relacionados tem cinco dias uteis para quitar os atrasados.',
      'A notificacao trata de dividas de casas populares do programa estadual.',
    ],
    content: `<p>A Agehab-MS notify moradores de 19 cidades de Mato Grosso do Sul sobre dividas de casas populares. Os mutuarios relacionados tem cinco dias uteis para quitar os atrasados.</p>
<p>A notificacao e' etapa de regularizacao do programa estadual de moradias. Quem nao quitar no prazo pode ter o contrato reavaliado.</p>`,
    cover_image_url: '/covers/cap-13.svg',
    cover_image_caption: 'Conjunto habitacional do programa estadual',
    scope: 'ms',
    category_label: 'Cotidiano',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1240,
    published_at: '2026-10-22T12:53:38Z',
    created_at: '2026-10-22T12:53:38Z',
    updated_at: '2026-10-22T12:53:38Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000021',
    title: "Empresa e' contratada por R$ 12 milhoes para asfalto em Aquidauana",
    subtitle: 'Agesul formalizou contrato para obras de asfalto e drenagem em vias urbanas',
    slug: 'empresa-contratada-12-milhoes-asfalto-aquidauana',
    summary_bullets: [
      'A Agesul formalizou contrato com empreiteira para asfalto e drenagem.',
      "O valor do contrato e' de R$ 12 milhoes para obras em vias urbanas de Aquidauana.",
      'A intervencao responde a uma das principais demandas da cidade vizinha.',
    ],
    content: `<p>Uma empresa foi contratada por R$ 12 milhoes para_execucao de obras de asfalto e drenagem em vias urbanas de Aquidauana. A Agesul formalizou o contrato com a empreiteira.</p>
<p>O pacote responde a uma das principais demandas de circulacao da cidade vizinha e faz parte do ritmo de intervencoes na regiao.</p>`,
    cover_image_url: '/covers/cap-14.svg',
    cover_image_caption: 'Obra de asfalto em via urbana de Aquidauana',
    scope: 'ms',
    category_label: 'Transparencia',
    is_breaking: false,
    is_featured: true,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1130,
    published_at: '2026-10-22T12:45:40Z',
    created_at: '2026-10-22T12:45:40Z',
    updated_at: '2026-10-22T12:45:40Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000022',
    title: 'Mato Grosso do Sul entra em alerta amarelo para tempestades com granizo ate domingo',
    subtitle: 'Sul do Estado tem previsao de temporais mais intensos na sexta-feira (23)',
    slug: 'ms-alerta-amarelo-tempestades-com-granizo-ate-domingo',
    summary_bullets: [
      'O Estado entrou em alerta amarelo para tempestades com granizo ate domingo.',
      'O Sul de MS tem previsao de temporais mais intensos na sexta-feira (23).',
      'A populace deve se proteger de raios, ventos fortes e queda de arvores.',
    ],
    content: `<p>Mato Grosso do Sul entrou em alerta amarelo para tempestades com granizo ate domingo. O Sul do Estado tem previsao de temporais mais intensos na sexta-feira (23).</p>
<p>O aviso indica rajadas de vento, chuva intensa e possibilidade de granizo. A orientacao e' evitar locais expostos e atividades ao ar livre.</p>`,
    cover_image_url: '/covers/cap-15.svg',
    cover_image_caption: 'Céu de tempestade sobre a região',
    scope: 'ms',
    category_label: 'Cotidiano',
    is_breaking: true,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1980,
    published_at: '2026-10-22T11:08:44Z',
    created_at: '2026-10-22T11:08:44Z',
    updated_at: '2026-10-22T11:08:44Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000023',
    title: 'Semifinais do Estadual Sub-17 comecam neste sabado com duelos de ida',
    subtitle: 'Nautico encara o Pantanal e Colorado enfrenta o Operario',
    slug: 'semifinais-estadual-sub-17-comecam-neste-sabado',
    summary_bullets: [
      'As semifinais do Estadual Sub-17 comecam neste sabado com jogos de ida.',
      'Nautico encara o Pantanal; Colorado enfrenta o Operario.',
      'Os classificados disputam a final no domingo seguinte.',
    ],
    content: `<p>As semifinais do Estadual Sub-17 comecam neste sabado, com os duelos de ida. Nautico encara o Pantanal e Colorado enfrenta o Operario.</p>
<p>Quem vencer somando as duas partidas avanca para a final. A tabela e' disputada no domingo seguinte.</p>`,
    cover_image_url: '/covers/cap-16.svg',
    cover_image_caption: 'Estádio onde acontecem as semifinais',
    scope: 'ms',
    category_label: 'Esportes',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 760,
    published_at: '2026-10-22T11:13:53Z',
    created_at: '2026-10-22T11:13:53Z',
    updated_at: '2026-10-22T11:13:53Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000024',
    title: 'Taxas de juros encerram de lado de olho em disputa eleitoral e alivio no cenario externo',
    subtitle: 'Os vencimentos medios e longos chegaram a virar para o terreno positivo',
    slug: 'taxas-de-juros-encerram-disputa-eleitoral-alivio-cenario-externo',
    summary_bullets: [
      'Os vencimentos medios e longos da curva de juros viraram para o terreno positivo.',
      "O mercado tambem registrou o alivio no cenario externo.",
      "Para o produtor rural, a leitura e' de custo de capital mais previsivel.",
    ],
    content: `<p>As taxas de juros encerraram de lado de olho, em meio a disputa eleitoral e ao alivio no cenario externo. Os vencimentos medios e longos chegaram a virar para o terreno positivo.</p>
<p>Para quem produz no campo, a traducao pratica e' de custo de capital mais previsivel na proxima safra.</p>`,
    cover_image_url: '/covers/cap-17.svg',
    cover_image_caption: 'Safra financiada pela linha de credito rural',
    scope: 'ms',
    category_label: 'Economia',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 940,
    published_at: '2026-10-22T04:15:28Z',
    created_at: '2026-10-22T04:15:28Z',
    updated_at: '2026-10-22T04:15:28Z',
  },

  /* ------------------------------------------------------------------ */
  /* BRASIL                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: '20000000-0000-4000-8000-000000000030',
    title: 'PF investiga esquema de fraude em investimentos que deixou mais de 10 mil vitimas',
    subtitle: 'Diligencias sao cumpridas em municipios de cinco estados diferentes',
    slug: 'pf-investiga-esquema-fraude-investimentos-10-mil-vitimas',
    summary_bullets: [
      'A Policia Federal investiga esquema de fraude em investimentos.',
      'As diligencias sao cumpridas em municipios de cinco estados.',
      'O numero de vitimas ja ultrapassa 10 mil pessoas.',
    ],
    content: `<p>A Policia Federal investiga um esquema de fraude em investimentos que deixou mais de 10 mil vitimas. As diligencias estao sendo cumpridas em municipios de cinco estados diferentes.</p>
<p>As autoridades ouviram os envolvidos e analisam documentos e sistemas para determinar a origem dos recursos e o numero de vitimas.</p>`,
    cover_image_url: '/covers/cap-18.svg',
    cover_image_caption: 'Operação da Polícia Federal',
    scope: 'brasil',
    category_label: 'Brasil',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 2410,
    published_at: '2026-10-22T11:56:23Z',
    created_at: '2026-10-22T11:56:23Z',
    updated_at: '2026-10-22T11:56:23Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000031',
    title: 'Homem morre apos cair no tumulo do pai em cemiterio no Espirito Santo',
    subtitle: 'A vitima tinha ido ao local para o sepultamento de um amigo que morreu em acidente',
    slug: 'homem-morre-cair-tumulo-pai-cemiterio-espirito-santo',
    summary_bullets: [
      'A vitima tinha ido ao cemiterio para o sepultamento de um amigo.',
      'A queda no tumulo do pai causou a morte.',
      'O caso foi registrado pela Policia Civil local.',
    ],
    content: `<p>Um homem morreu apos cair no tumulo do pai em um cemiterio do Espirito Santo. A vitima tinha ido ao local para o sepultamento de um amigo que morreu em acidente.</p>
<p>O caso foi registrado pela Policia Civil local, que apura as circunstancias da queda.</p>`,
    cover_image_url: '/covers/cap-19.svg',
    cover_image_caption: 'Cemitério onde aconteceu o caso',
    scope: 'brasil',
    category_label: 'Brasil',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1180,
    published_at: '2026-10-22T12:53:38Z',
    created_at: '2026-10-22T12:53:38Z',
    updated_at: '2026-10-22T12:53:38Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000032',
    title: 'Palmeiras sofre em casa, mas vence Fluminense nos penaltis e vai a final da Libertadores',
    subtitle: 'Fluminense mostrou uma postura corajosa no inicio do jogo',
    slug: 'palmeiras-vence-fluminense-penaltis-final-libertadores',
    summary_bullets: [
      'O Palmeiras venceu o Fluminense nos penaltis e vai a final da Libertadores.',
      "A equipe paulista sofreu em casa e empatou no tempo normal.",
      'Fluminense mostrou postura corajosa no inicio do jogo.',
    ],
    content: `<p>O Palmeiras sofreu em casa, mas venceu o Fluminense nos penaltis e avanca para a final da Libertadores. O Fluminense mostrou uma postura corajosa no inicio do jogo e chegou a abrir o placar.</p>
<p>Foi necessario o roketa de GK para a vitoria paulista. O jogo de ida da final esta marcado para a proxima semana.</p>`,
    cover_image_url: '/covers/cap-20.svg',
    cover_image_caption: 'Estádio onde foi disputada a semifinal',
    scope: 'brasil',
    category_label: 'Esportes',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 3420,
    published_at: '2026-10-22T03:03:00Z',
    created_at: '2026-10-22T03:03:00Z',
    updated_at: '2026-10-22T03:03:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000033',
    title: 'Ira atinge sete navios e ameaca EUA no Oriente; Russia ataca refinaria da Ucrania',
    subtitle: 'Se confirmado, sera o maior ataque em um dia em Ormuz desde fevereiro',
    slug: 'ira-atinge-sete-navios-ameaca-eua-oriente-russia-ataca-refinaria',
    summary_bullets: [
      'O Ira atingiu sete navios e passa a ameacar os EUA no Oriente.',
      'A Russia atacou uma refinaria da Ucrania.',
      'Sera o maior ataque em um dia em Ormuz desde fevereiro, se confirmado.',
    ],
    content: `<p>O Ira atingiu sete navios e passou a ameacar os EUA no Oriente, enquanto a Russia atacou uma refinaria da Ucrania. Se o numero for confirmado, sera o maior ataque em um dia em Ormuz desde fevereiro.</p>
<p>O mercado de petroleo reage a tensao, com alta na cotacao do barril.</p>`,
    cover_image_url: '/covers/cap-21.svg',
    cover_image_caption: 'Tensao no Oriente Medio',
    scope: 'brasil',
    category_label: 'Mundo',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 2890,
    published_at: '2026-10-22T12:07:06Z',
    created_at: '2026-10-22T12:07:06Z',
    updated_at: '2026-10-22T12:07:06Z',
  },

  /* ------------------------------------------------------------------ */
  /* COLUNAS                                                            */
  /* ------------------------------------------------------------------ */
  {
    id: '20000000-0000-4000-8000-000000000040',
    title: "O municipio que aprendeu a fazer do medo um projeto",
    subtitle: 'Coluna Visao de Nioaque',
    slug: 'coluna-visao-nioaque-municipio-que-aprendeu-do-medo',
    summary_bullets: [
      'A resposta a alertas de tempestade em Nioaque virou rotina de protecao da populacao.',
      'Defesa Civil,_INMET e comunicacao local trabalhando na mesma direcao.',
      'O que era reacao de urgencia virou plano.',
    ],
    content: `<p>Toda cidade do interior aprende a ler o ceu. O que Nioaque aprendeu a fazer melhor foi transformar o alerta em rotina.</p>
<p>Em poucas semanas, a comunicacao do municipio passou a repassar os avisos do INMET com a mesma frequencia com que avisa sobre o transporte ou a farmacia de plantao. Isso parece pequeno, nao e: e' a diferenca entre a pessoa se assustar e a pessoa se preparar.</p>
<p>Tem preco, tem protocolo, tem quem cuide. E' assim que se construtor de Confianca entre quem produz e quem decide.</p>`,
    cover_image_url: '/covers/cap-22.svg',
    cover_image_caption: 'Ilustracao sobre preparo para temporais',
    scope: 'coluna',
    category_label: 'Visao de Nioaque',
    is_breaking: false,
    is_featured: true,
    author_id: '10000000-0000-4000-8000-000000000002',
    status: 'published',
    views_count: 4210,
    published_at: '2026-10-22T07:00:00Z',
    created_at: '2026-10-22T06:20:00Z',
    updated_at: '2026-10-22T07:00:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000041',
    title: 'Feira do Produtor: o que parece pequeno e sustenta a cidade',
    subtitle: 'Coluna Giro de Bairro',
    slug: 'coluna-giro-de-bairro-feira-do-produtor-sustenta-cidade',
    summary_bullets: [
      'Duas manhas por semana a feira aproxima produtor e consumidor.',
      'A agricultura familiar movimenta o comercio do municipio inteiro.',
      'Quem produz em Nioaque precisa de quem compra perto de casa.',
    ],
    content: `<p>Toda cidade que quer ser grande precisa de uma base que a sustente. Em Nioaque, essa base tem nome e horario: a Feira do Produtor, duas vezes por semana na Rodoviaria.</p>
<p>Quem passa la na manha ve o que o campo produz e, no mesmo minuto, ve quem compra. E' essa proximidade que sustenta a agricultura familiar e, com ela, boa parte do comercio local.</p>
<p>Feira e' onde a cidade ve a si mesma. Bom sinal.</p>`,
    cover_image_url: '/covers/cap-23.svg',
    cover_image_caption: 'Bancas da Feira do Produtor',
    scope: 'coluna',
    category_label: 'Giro de Bairro',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000003',
    status: 'published',
    views_count: 2680,
    published_at: '2026-10-21T07:30:00Z',
    created_at: '2026-10-21T07:00:00Z',
    updated_at: '2026-10-21T07:30:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000042',
    title: 'Asfalto em Aquidauana e o que diz sobre a regiao',
    subtitle: 'Coluna Radar MS',
    slug: 'coluna-radar-ms-asfalto-aquidauana-regiao',
    summary_bullets: [
      'Contrato de R$ 12 milhoes para asfalto e drenagem em Aquidauana foi formalizado.',
      'A intervencao mostra a prioridade do Estado na regiao de Aquidauana.',
      "Para Nioaque, a licao e' sobre a ordem das obras.",
    ],
    content: `<p>R$ 12 milhoes em asfalto e drenagem em Aquidauana: o contrato foi formalizado e diz bastante sobre como o Estado esta olhando para o Sul.</p>
<p>Aquidauana e' a referencia regional para Nioaque em logistica, saude e comercio. Quando a cidade vizinha recebe obra de pavimentacao, o efeito chega aqui em horas.</p>
<p>A licao pratica e' simples: quem tem projeto pronto espera menos. Nossas obras, por menorem, precisam de um passo a mais - e esse passo comeca no papel, nao nainauguracao.</p>`,
    cover_image_url: '/covers/cap-24.svg',
    cover_image_caption: 'Máquina de pavimentação em via de Aquidauana',
    scope: 'coluna',
    category_label: 'Radar MS',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1930,
    published_at: '2026-10-21T06:45:00Z',
    created_at: '2026-10-21T06:20:00Z',
    updated_at: '2026-10-21T06:45:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000043',
    title: 'Quem apaga o vazio do quadro de avisos',
    subtitle: 'Coluna Bastidores',
    slug: 'coluna-bastidores-quem-apaga-o-vazio-do-quadro-de-avisos',
    summary_bullets: [
      'No municipio, muita informacao existe apenas em papel colado na porta.',
      'Diario Oficial, editais e contratos ficam acessiveis a quem sabe onde olhar.',
      'Transparencia so vale se o cidadao encontra.',
    ],
    content: `<p>Existe uma informacao que quase nunca chega a quem precisa: a que esta afixada na porta da secretaria, em papel, defasada de duas semanas.</p>
<p>Licitacao, contrato, parecer tecnico, ata de comissao. Tudo isso existe, e tudo isso esta no Diario Oficial do municipio. O problema e' a distancia entre o documento e a pessoa que precisa dele.</p>
<p>Num municipio pequeno, transparencia nao e' um departing. E' a unica forma de o morador conferir se o que o municipio diz combina com o que ele fez.</p>`,
    cover_image_url: '/covers/cap-25.svg',
    cover_image_caption: 'Quadro de avisos da secretaria',
    scope: 'coluna',
    category_label: 'Bastidores',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000005',
    status: 'published',
    views_count: 1340,
    published_at: '2026-10-20T09:00:00Z',
    created_at: '2026-10-20T08:30:00Z',
    updated_at: '2026-10-20T09:00:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* RADAR OFICIAL (Prefeitura, Camara, Concursos, Diario Oficial)      */
  /* ------------------------------------------------------------------ */
  {
    id: '20000000-0000-4000-8000-000000000050',
    title: 'Nioaque homologa empresa por R$ 3,57 milhoes para nova creche no bairro Monte Alto',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-nioaque-homologa-empresa-creche-monte-alto-3-57-milhoes',
    summary_bullets: [
      'A Dias Construtora e Empreendimentos LTDA foi declarada vencedora da licitacao.',
      "O valor e' de R$ 3.574.000,00 para uma Creche Pre-Escola Tipo 2 do FNDE.",
      'A obra sera construida no bairro Monte Alto.',
    ],
    content: `<p>Foi homologada a empresa que vai construir a nova creche do bairro Monte Alto. A Dias Construtora e Empreendimentos LTDA foi declarada vencedora da concurrencia para construcao de uma Creche Pre-Escola Tipo 2 do FNDE.</p>
<p>O valor contrato e' de R$ 3.574.000,00. O prazo de execucao consta no processo, consultado pela redacao junto a secretaria de Obras.</p>`,
    cover_image_url: '/covers/cap-26.svg',
    cover_image_caption: 'Terreno da futura creche no bairro Monte Alto',
    scope: 'radar_oficial',
    category_label: 'Prefeitura',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 890,
    published_at: '2026-10-21T15:40:00Z',
    created_at: '2026-10-21T15:00:00Z',
    updated_at: '2026-10-21T15:40:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000051',
    title: 'Camara de Campo Grande vota criacao do Conselho de Migrantes nesta quinta-feira',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-camara-campo-grande-conselho-migrantes-votacao',
    summary_bullets: [
      'A Camara de Campo Grande vota nesta quinta-feira a criacao do Conselho de Migrantes.',
      'Um projeto que revoga a doacao de imovel publico tambem sera analisado.',
      'As sessoes sao transmitidas e podem ser acompanhadas pelo cidade.',
    ],
    content: `<p>A Camara de Campo Grande vota nesta quinta-feira a criacao do Conselho de Migrantes. Um projeto que revoga a doacao de imovel publico tambem sera analisado na mesma sessao.</p>
<p>Sessoes da Camara sao transmitidas e podem ser acompanhadas pelo cidade, no site oficial.</p>`,
    cover_image_url: '/covers/cap-27.svg',
    cover_image_caption: 'Plenário da Câmara Municipal',
    scope: 'radar_oficial',
    category_label: 'Câmara',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 610,
    published_at: '2026-10-21T14:20:00Z',
    created_at: '2026-10-21T14:00:00Z',
    updated_at: '2026-10-21T14:20:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000052',
    title: 'Camara de Paraiso das Aguas abre concurso com salarios de ate R$ 8,1 mil',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-camara-paraiso-aguas-concurso-8-1-mil',
    summary_bullets: [
      'O edital oferece vagas para candidatos com ensino medio e superior.',
      'Os salarios chegam a R$ 8,1 mil.',
      'As inscricoes seguem conforme o cronograma do edital.',
    ],
    content: `<p>A Camara de Paraiso das Aguas abriu concurso com salarios de ate R$ 8,1 mil. O edital oferece vagas para candidatos com ensino medio e superior.</p>
<p>As inscricoes seguem conforme o cronograma publicado no edital, consultado pela redacao.</p>`,
    cover_image_url: '/covers/cap-28.svg',
    cover_image_caption: 'Edital publicado no Diário Oficial',
    scope: 'radar_oficial',
    category_label: 'Concursos',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1420,
    published_at: '2026-10-21T13:10:00Z',
    created_at: '2026-10-21T13:00:00Z',
    updated_at: '2026-10-21T13:10:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000053',
    title: 'De saladeiro a vigia, Campo Grande oferta mais de 600 vagas nesta quinta-feira',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-campo-grande-600-vagas-emprego',
    summary_bullets: [
      'Mais de 600 vagas sao ofertadas nesta quinta-feira em Campo Grande.',
      '418 delas sao para pessoas sem experiencia.',
      "A selecao e' feita em um unico dia, por ordem de chegada.",
    ],
    content: `<p>De saladeiro a vigia: Campo Grande oferta mais de 600 vagas nesta quinta-feira. Do total, 418 sao para pessoas sem experiencia.</p>
<p>A selecao acontece em um unico dia, por ordem de chegada. Quem busca a vaga precisa levar documento de identidade e comprovante de endereco.</p>`,
    cover_image_url: '/covers/cap-29.svg',
    cover_image_caption: 'Fila de candidatos na seleção de vagas',
    scope: 'radar_oficial',
    category_label: 'Concursos',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 980,
    published_at: '2026-10-21T12:30:00Z',
    created_at: '2026-10-21T12:10:00Z',
    updated_at: '2026-10-21T12:30:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000054',
    title: 'Diario Oficial do municipio: confira as publicacoes desta semana',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-diario-oficial-publicacoes-da-semana',
    summary_bullets: [
      'A edicao da semana reune portarias, editais e atos de licitacao.',
      'O gazeto pode ser lido online ou retirado em grafica no centro.',
      'Prazos para impugnacao vencem nesta sexta-feira.',
    ],
    content: `<p>A edicao desta semana do Diario Oficial do municipio reune portarias, editais e atos de licitacao. O gazeto pode ser lido online ou retirado em grafica no centro.</p>
<p>Destaques: o regulamento do transporte escolar, a licitacao da obra de recapeamento e a tabela de onibus para o proximo trimestre. Os prazos para impugnacao vencem nesta sexta-feira.</p>`,
    cover_image_url: '/covers/cap-30.svg',
    cover_image_caption: 'Edição semanal do Diário Oficial',
    scope: 'radar_oficial',
    category_label: 'Diário Oficial',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 520,
    published_at: '2026-10-20T16:40:00Z',
    created_at: '2026-10-20T16:20:00Z',
    updated_at: '2026-10-20T16:40:00Z',
  },
  {
    id: '20000000-0000-4000-8000-000000000055',
    title: 'Feira do Produtor amplia movecao e estabelece novo dia de funcionamento',
    subtitle: 'Radar Oficial',
    slug: 'radar-oficial-feira-produtor-novo-dia-funcionamento',
    summary_bullets: [
      'A feira passa a ter mais um dia de funcionamento por semana.',
      'Produtores da agricultura familiar tem cadastro aberto.',
      'A lista dos participantes pode ser consultada na secretaria.',
    ],
    content: `<p>A Feira do Produtor amplia a movimentacao e estabelece novo dia de funcionamento. Produtores da agricultura familiar tem cadastro aberto.</p>
<p>A lista dos participantes pode ser consultada na secretaria, das 8h as 17h.</p>`,
    cover_image_url: '/covers/cap-31.svg',
    cover_image_caption: 'Organização das bancas no novo dia de funcionamento',
    scope: 'radar_oficial',
    category_label: 'Prefeitura',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 430,
    published_at: '2026-10-19T11:20:00Z',
    created_at: '2026-10-19T11:00:00Z',
    updated_at: '2026-10-19T11:20:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* RASCUNHO (demonstra o RBAC)                                         */
  /* ------------------------------------------------------------------ */
  {
    id: '20000000-0000-4000-8000-000000000099',
    title: 'Feira do Produtor confirma 60 expositores para a proxima edicao',
    subtitle: 'Rascunho em revisao editorial',
    slug: 'feira-do-produtor-confirma-60-expositores',
    summary_bullets: [
      'Inscricoes de expositores terminam no fim do mes.',
      'O espaco da feira sera dividido em tres setores.',
    ],
    content: `<p>A organizacao da Feira do Produtor confirmou 60 expositores para a proxima edicao. As inscricoes terminam no fim do mes e o espaco sera dividido em tres setores: alimentacao, artesanato e producao rural.</p>`,
    cover_image_url: '/covers/cap-32.svg',
    cover_image_caption: 'Montagem das bancas da feira municipal',
    scope: 'nioaque',
    category_label: 'Nioaque',
    is_breaking: false,
    is_featured: false,
    author_id: '10000000-0000-4000-8000-000000000002',
    status: 'pending_review',
    views_count: 0,
    published_at: null,
    created_at: '2026-10-22T09:15:00Z',
    updated_at: '2026-10-22T09:15:00Z',
  },
];

/* =============================================================================
 *  Servicos publicos (farmacia de plantao, alertas, onibus)
 * ============================================================================= */

export const mockPublicUtilities: PublicUtility[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    duty_date: '2026-10-22',
    pharmacy_name: 'Drogaria Sao Lucas',
    pharmacy_phone: '(67) 3465-1122',
    pharmacy_address: 'Rua Pedro Celestino, 320 - Centro, Nioaque/MS',
    alert_active: true,
    alert_message:
      'Mato Grosso do Sul em alerta amarelo para tempestades com granizo ate domingo. Chuva forte a partir das 16h em Nioaque; prefira a rota pela Avenida Afonso Arinos.',
    alert_level: 'warning',
    bus_schedule_html: `<ul>
      <li><strong>Rio Brilhante</strong> - 06:30 e 18:00</li>
      <li><strong>Aquidauana</strong> - 07:15 e 17:30</li>
      <li><strong>Campo Grande</strong> - 05:45 e 15:45</li>
    </ul>`,
    updated_at: '2026-10-22T05:00:00Z',
  },
  {
    id: '30000000-0000-4000-8000-000000000002',
    duty_date: '2026-10-23',
    pharmacy_name: 'Farmacia Central Popular',
    pharmacy_phone: '(67) 3465-2431',
    pharmacy_address: 'Avenida Matsunaga, 1450 - Centro, Nioaque/MS',
    alert_active: false,
    alert_message: null,
    alert_level: 'info',
    bus_schedule_html: `<ul>
      <li><strong>Rio Brilhante</strong> - 06:30 e 18:00</li>
      <li><strong>Aquidauana</strong> - 07:15 e 17:30</li>
      <li><strong>Campo Grande</strong> - 05:45 e 15:45</li>
    </ul>`,
    updated_at: '2026-10-22T05:00:00Z',
  },
];

/* =============================================================================
 *  Publicidade local
 * ============================================================================= */

export const mockLocalAds: LocalAd[] = [
  {
    id: '40000000-0000-4000-8000-000000000001',
    client_name: 'Farmacia Popular Nioaque',
    title: '20% de desconto em essenciais para nioaquenses no dia do cidadao',
    image_url: '/covers/ad-01.svg',
    target_url: '#',
    whatsapp_number: '5567999912043',
    slot_position: 'header_billboard',
    active: true,
    starts_at: '2026-10-15T00:00:00Z',
    ends_at: '2026-10-31T23:59:59Z',
    clicks_count: 412,
    offer_type: 'banner',
    price_label: null,
    notes: 'Faixa no topo do portal durante todo o mes.',
  },
  {
    id: '40000000-0000-4000-8000-000000000002',
    client_name: 'Auto Pecas Silva',
    title: 'Revisao completa e troca de oleo com preco especial para a regiao',
    image_url: '/covers/ad-02.svg',
    target_url: '#',
    whatsapp_number: '5567998844210',
    slot_position: 'home_middle',
    active: true,
    starts_at: '2026-10-01T00:00:00Z',
    ends_at: null,
    clicks_count: 238,
    offer_type: 'banner',
    price_label: null,
    notes: null,
  },
  {
    id: '40000000-0000-4000-8000-000000000003',
    client_name: 'Padaria Pao Quente',
    title: 'Pao na chapa, cafe com receitas da casa e bolo de leite de quintal',
    image_url: '/covers/ad-03.svg',
    target_url: '#',
    whatsapp_number: '5567977701234',
    slot_position: 'daily_deal',
    active: true,
    starts_at: null,
    ends_at: null,
    clicks_count: 96,
    offer_type: 'daily_deal',
    price_label: 'Oferta do dia',
    notes: 'Oferta valida so no dia da publicacao.',
  },
  {
    id: '40000000-0000-4000-8000-000000000004',
    client_name: 'Nioaque Imoveis',
    title: 'Casas e lotes na regiao com financiamento facilitado',
    image_url: '/covers/ad-04.svg',
    target_url: '#',
    whatsapp_number: '5567996633001',
    slot_position: 'sidebar',
    active: true,
    starts_at: null,
    ends_at: null,
    clicks_count: 153,
    offer_type: 'banner',
    price_label: null,
    notes: null,
  },
  {
    id: '40000000-0000-4000-8000-000000000005',
    client_name: 'Mercado Nilo',
    title: 'Carnes nobres com 25% de desconto nesta sexta-feira',
    image_url: '/covers/ad-03.svg',
    target_url: '#',
    whatsapp_number: '5567991112223',
    slot_position: 'daily_deal',
    active: false,
    starts_at: '2026-10-19T00:00:00Z',
    ends_at: '2026-10-24T23:59:59Z',
    clicks_count: 74,
    offer_type: 'daily_deal',
    price_label: '25% OFF',
    notes: 'Oferta encerrada - aguardando proxima campanha.',
  },
];

/* =============================================================================
 *  Horarios de onibus intermunicipais
 * ============================================================================= */

export const mockBusSchedules: BusSchedule[] = [
  {
    id: '60000000-0000-4000-8000-000000000001',
    route_name: 'Linha 01',
    destination: 'Rio Brilhante',
    departure_times: ['06:30', '18:00'],
    frequency: 'Diaria',
    notes: 'Sai do terminal central, em frente a praca.',
    position: 1,
    active: true,
    updated_at: '2026-10-20T05:00:00Z',
  },
  {
    id: '60000000-0000-4000-8000-000000000002',
    route_name: 'Linha 02',
    destination: 'Aquidauana',
    departure_times: ['07:15', '17:30'],
    frequency: 'Diaria',
    notes: null,
    position: 2,
    active: true,
    updated_at: '2026-10-20T05:00:00Z',
  },
  {
    id: '60000000-0000-4000-8000-000000000003',
    route_name: 'Linha 05',
    destination: 'Campo Grande',
    departure_times: ['05:45', '15:45'],
    frequency: 'Diaria',
    notes: 'Passa pela MS-178. Leva cerca de 3h20.',
    position: 3,
    active: true,
    updated_at: '2026-10-20T05:00:00Z',
  },
  {
    id: '60000000-0000-4000-8000-000000000004',
    route_name: 'Linha 09',
    destination: 'Vila Yara e entorno',
    departure_times: ['08:00', '13:00', '18:30'],
    frequency: 'Seg a Sex',
    notes: 'Linha circular do bairro.',
    position: 4,
    active: true,
    updated_at: '2026-10-20T05:00:00Z',
  },
];

/* =============================================================================
 *  Resultados das loterias
 * ============================================================================= */

export const mockLotteryResults: LotteryResult[] = [
  {
    id: '70000000-0000-4000-8000-000000000001',
    modality: 'Mega-Sena',
    contest_number: '3072',
    contest_date: '2026-10-20',
    numbers: ['02', '06', '09', '16', '31', '40'],
    prize_value: null,
    created_at: '2026-10-20T22:00:00Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000002',
    modality: 'Quina',
    contest_number: '7148',
    contest_date: '2026-10-21',
    numbers: ['13', '16', '55', '72', '74'],
    prize_value: null,
    created_at: '2026-10-21T22:00:00Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000003',
    modality: 'Lotofacil',
    contest_number: '3810',
    contest_date: '2026-10-21',
    numbers: [
      '01', '05', '06', '07', '10', '11', '14', '15',
      '16', '17', '18', '19', '20', '23', '24',
    ],
    prize_value: null,
    created_at: '2026-10-21T22:00:00Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000004',
    modality: 'Lotomania',
    contest_number: '2990',
    contest_date: '2026-10-21',
    numbers: [
      '04', '06', '11', '19', '25', '27', '29', '32', '35', '37',
      '42', '52', '63', '66', '67', '70', '76', '80', '81', '99',
    ],
    prize_value: null,
    created_at: '2026-10-21T22:00:00Z',
  },
  {
    id: '70000000-0000-4000-8000-000000000005',
    modality: 'Duplasena',
    contest_number: '3023',
    contest_date: '2026-10-21',
    numbers: ['08', '12', '20', '43', '47', '50'],
    prize_value: null,
    created_at: '2026-10-21T22:00:00Z',
  },
];

/* =============================================================================
 *  Cotacoes da economia
 * ============================================================================= */

export const mockMarketQuotes: MarketQuote[] = [
  {
    id: '80000000-0000-4000-8000-000000000001',
    symbol: 'dolar',
    label: 'Dolar',
    value: 5.04,
    change_percent: 0.37,
    unit: 'R$',
    updated_at: '2026-10-22T05:10:00Z',
  },
  {
    id: '80000000-0000-4000-8000-000000000002',
    symbol: 'euro',
    label: 'Euro',
    value: 5.65,
    change_percent: 0.15,
    unit: 'R$',
    updated_at: '2026-10-22T05:10:00Z',
  },
  {
    id: '80000000-0000-4000-8000-000000000003',
    symbol: 'bitcoin',
    label: 'Bitcoin',
    value: 436738.27,
    change_percent: -3.54,
    unit: 'R$',
    updated_at: '2026-10-22T05:10:00Z',
  },
  {
    id: '80000000-0000-4000-8000-000000000004',
    symbol: 'ibovespa',
    label: 'Ibovespa',
    value: 206495.23,
    change_percent: 0,
    unit: 'pts',
    updated_at: '2026-10-22T05:10:00Z',
  },
];

/* =============================================================================
 *  Pistas do leitor
 * ============================================================================= */

export const mockReaderSubmissions: ReaderSubmission[] = [
  {
    id: '50000000-0000-4000-8000-000000000001',
    sender_name: 'Joana Pereira',
    sender_whatsapp: '5567991234567',
    neighborhood: 'Vila Nova',
    message:
      'Boa tarde! O poste da esquina da Rua das Flores esta com a luz queimada ha quase duas semanas. Alguem da prefeitura poderia verificar?',
    media_urls: [],
    status: 'pending',
    created_at: '2026-10-22T08:40:00Z',
  },
  {
    id: '50000000-0000-4000-8000-000000000002',
    sender_name: 'Carlos Henrique Souza',
    sender_whatsapp: '5567987654321',
    neighborhood: 'Bao Vista',
    message:
      'Bom dia, o onibus para Campo Grande saiu hoje mais cedo que o normal. Alguem sabe se a tabela foi alterada?',
    media_urls: [],
    status: 'reviewed',
    created_at: '2026-10-21T16:10:00Z',
  },
  {
    id: '50000000-0000-4000-8000-000000000003',
    sender_name: 'Luzia Aparecida Martins',
    sender_whatsapp: '5567911223344',
    neighborhood: 'Centro',
    message:
      'A padaria da esquina esta vendendo pao com mofo. Gostaria que o portal publicasse a situacao para nao passar ninguem.',
    media_urls: ['/covers/submission-01.svg'],
    status: 'pending',
    created_at: '2026-10-22T10:05:00Z',
  },
];

/* =============================================================================
 *  Guias de utilidade publica de Nioaque (ESF, secretarias, escolas)
 * ============================================================================= */

export const mockUtilityGuides: UtilityGuide[] = [
  { id: 'ug-001', name: 'ESF Centro', category: 'saude', address: 'Rua das Flores, 120 - Centro', phone: '(67) 3236-1000', hours: 'Seg a Sex, 07h-17h', notes: 'Atendimento basico e vacinacao' },
  { id: 'ug-002', name: 'ESF Vila Nova', category: 'saude', address: 'Av. Principal, 450 - Vila Nova', phone: '(67) 3236-1001', hours: 'Seg a Sex, 07h-17h', notes: null },
  { id: 'ug-003', name: 'Secretaria de Saude', category: 'secretaria', address: 'Prefeitura Municipal - Centro', phone: '(67) 3236-1010', hours: 'Seg a Sex, 07h30-13h30', notes: null },
  { id: 'ug-004', name: 'Secretaria de Educacao', category: 'secretaria', address: 'Prefeitura Municipal - Centro', phone: '(67) 3236-1020', hours: 'Seg a Sex, 07h30-13h30', notes: null },
  { id: 'ug-005', name: 'Escola Municipal Jose Pereira', category: 'educacao', address: 'Rua da Escola, 80 - Centro', phone: '(67) 3236-1030', hours: 'Seg a Sex, 07h-17h', notes: 'Ensino Fundamental' },
  { id: 'ug-006', name: 'SAMU 192', category: 'emergencia', address: 'Atendimento movel', phone: '192', hours: '24h', notes: 'Emergencias medicas' },
  { id: 'ug-007', name: 'Bombeiros', category: 'emergencia', address: 'Quartel - Centro', phone: '193', hours: '24h', notes: null },
];

/* =============================================================================
 *  Autoridades municipais de Nioaque
 * ============================================================================= */

export const mockAuthorities: Authority[] = [
  { id: 'aut-001', name: 'Prefeito Municipal', role: 'Prefeito', party: null, photo_url: null, contact: '(67) 3236-1000' },
  { id: 'aut-002', name: 'Vice-Prefeito', role: 'Vice-Prefeito', party: null, photo_url: null, contact: null },
  { id: 'aut-003', name: 'Secretario de Saude', role: 'Secretario de Saude', party: null, photo_url: null, contact: '(67) 3236-1010' },
  { id: 'aut-004', name: 'Secretario de Educacao', role: 'Secretario de Educacao', party: null, photo_url: null, contact: '(67) 3236-1020' },
  { id: 'aut-005', name: 'Presidente da Camara', role: 'Vereador / Presidente', party: null, photo_url: null, contact: null },
];

/* =============================================================================
 *  Seletores uteis (usados pela camada de conteudo e pelo painel)
 * ============================================================================= */

export const getProfileById = (id: string): Profile | undefined =>
  mockProfiles.find((profile) => profile.id === id);

export const getPublishedArticles = (): Article[] =>
  mockArticles
    .filter((article) => article.status === 'published')
    .sort(
      (a, b) =>
        new Date(b.published_at ?? b.created_at).getTime() -
        new Date(a.published_at ?? a.created_at).getTime(),
    );

export const getFeaturedArticles = (): Article[] =>
  getPublishedArticles().filter((article) => article.is_featured);

export const getArticlesByScope = (scope: Article['scope']): Article[] =>
  getPublishedArticles().filter((article) => article.scope === scope);

export const getArticleBySlug = (slug: string): Article | undefined =>
  mockArticles.find((article) => article.slug === slug);

export const getCurrentUtility = (): PublicUtility | undefined =>
  mockPublicUtilities[0];
