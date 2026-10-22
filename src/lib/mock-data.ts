/**
 * mock-data.ts
 * -----------------------------------------------------------------------------
 * Dados de EXEMPLO do portal "O Nioaquense".
 *
 * Objetivo: permitir que a home, a materia e o painel /admin sejam developidos
 * e revisados (design, layout, mobile-first) ANTES de conectar as chaves de
 * producao do Supabase.
 *
 * IMPORTANTE: todo o conteudo abaixo e' FICTICIO e serve apenas como semente.
 * Ao conectar o Supabase, `src/lib/content.ts` passa a ler do banco e este
 * arquivo fica sendo o fallback de desenvolvimento.
 *
 * Espelha 1:1 as tabelas de `supabase/migrations/001_initial_schema.sql`.
 */

import type {
  Article,
  BusSchedule,
  LocalAd,
  Profile,
  PublicUtility,
  ReaderSubmission,
} from './types';

/* =============================================================================
 *  Perfis (redacao + colunistas)
 * ============================================================================= */

export const mockProfiles: Profile[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
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
    id: '00000000-0000-4000-8000-000000000002',
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
    id: '00000000-0000-4000-8000-000000000003',
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
    id: '00000000-0000-4000-8000-000000000004',
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
];

/* =============================================================================
 *  Materias
 * ============================================================================= */

export const mockArticles: Article[] = [
  /* ------------------------------------------------------------------ */
  /* NIOAQUE                                                            */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    title: 'Recapeamento da MS-178 chega ao centro e muda o trajeto de 6 mil nioaquenses',
    subtitle: 'Pista nova, sinalizacao e rotulos novos: o que muda para quem usa a rodovia todos os dias',
    slug: 'recapeamento-ms-178-centro-nioaque-trecho-6-4-km',
    summary_bullets: [
      'A etapa final cobre 1,2 km entre a entrada da cidade e a praca central, com os servicos de recapeamento concluidos desde segunda-feira.',
      'Sinalizacao horizontal refeita e 18 novos olhos-de-gato instalados nas faixas de pedestres.',
      'A prefeitura estima retorno do transito normal em 10 dias; comerciantes relatam queda de movimento no centro.',
    ],
    content: `<p>A rodar pelo centro de Nioaque virou um teste de paciencia nas ultimas semanas. A partir desta segunda-feira, pelo menos, o cenario muda: a etapa final do recapeamento da MS-178 foi entregue e a prefeitura projeta o retorno do fluxo normal em cerca de dez dias.</p>
<p>O trecho principal tem 1,2 km e passa exatamente pelo coracao comercial da cidade, onde o trafego se concentra entre as 17h e as 19h. A empresa responsavel refez a pintura das faixas, trocou 42 placas e instalou 18 olhos-de-gato nas travessias mais movimentadas.</p>
<p>Para quem depende da rodovia para trabalhar em Aquidauana ou Campo Grande, o conselho e' simples: redimensionar o tempo de trajeto nos proximos dias e, se possivel, evitar o centro entre 17h e 19h.</p>
<p>A segunda atribuicao do contrato preve a manutencao corretiva do pavimento nas duas primeiras semanas, sem interdição total. A equipe de Transito acompanha os trabalhos com radar.</p>`,
    cover_image_url: '/covers/cap-01.svg',
    cover_image_caption: 'Trecho central da MS-178 durante a fase de pintura de faixas',
    scope: 'nioaque',
    category_label: 'Cidade',
    is_breaking: false,
    is_featured: true,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 4821,
    published_at: '2026-10-22T08:10:00Z',
    created_at: '2026-10-21T17:40:00Z',
    updated_at: '2026-10-22T08:10:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    title: 'Mutirao de limpeza retira 12 toneladas de residuos em tres bairros',
    subtitle: 'Acao que combinou equipes das secretarias, caminhoes da coleta e comunidade',
    slug: 'mutirao-limpeza-12-toneladas-tres-bairros-nioaque',
    summary_bullets: [
      'Operacao recuperou areas de descarte irregular em Vila Nova, Vila Rica e Bao Vista.',
      'Material reciclavel foi separado e destinado a cooperativa de catadores da cidade.',
      'Proxima etapa esta marcada para o dia 29, com foco em entulho da construcao civil.',
    ],
    content: `<p>Uma acao integrada entre as secretarias de Meio Ambiente e de Infraestrutura resultou na retirada de 12 toneladas de residuos solidos de tres bairros de Nioaque na quarta-feira. O material foi recolhido em areas de descarte irregular, pontos turisticos e nas bordas de um lote vazio na Vila Nova.</p>
<p>De acordo com a coordenacao da acao, 40 moradores participaram da etapa manual de separacao. O plastico, o papel e o metal foram destinados a cooperativa de catadores que opera no municipio desde 2024.</p>
<p>Restam depositos de entulho, massa e madeira. A prefeitura informou que uma nova etapa esta marcada para o dia 29 de outubro, quando o foco sera o material de construcao civil.</p>`,
    cover_image_url: '/covers/cap-02.svg',
    cover_image_caption: 'Equipes municipais durante a coleta nos bairros Vila Nova e Vila Rica',
    scope: 'nioaque',
    category_label: 'Meio Ambiente',
    is_breaking: true,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 3167,
    published_at: '2026-10-22T06:45:00Z',
    created_at: '2026-10-21T19:05:00Z',
    updated_at: '2026-10-22T06:45:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    title: 'Escolas municipais fecham o ano com 100% da matricula e contraturno ampliado',
    subtitle: 'Tres unidades passam a oferecer oficina de leitura e esporte em horario estendido',
    slug: 'escolas-municipais-nioaque-100-matricula-contraturno-ampliado',
    summary_bullets: [
      'Nenhuma crianca ficou fora da matricula na rede municipal de Nioaque neste ano.',
      'Contraturno passa a ter oficina de leitura, educacao fisica e robotica basica.',
      'Alimentacao escolar foi reajustada e o cardapio sera ampliado na merenda do contraturno.',
    ],
    content: `<p>A rede municipal de ensino de Nioaque fechou o periodo de matriculas sem nenhuma crianca de fora da lista de espera. Nas tres escolas que oferecem contraturno, o numero de vagas dobrou em relacao ao ano passado.</p>
<p>Segundo a Secretaria de Educacao, o novo horario estendido inclui oficina de leitura, educacao fisica e uma modalidade de robotica basica para os alunos do segundo ano do ensino fundamental. O contraturno funciona ate as 18h, com dois turnos de alimentacao.</p>
<p>As familias interessadas podem se cadastrar na secretaria, na Rua Pedro Celestino, das 8h as 17h.</p>`,
    cover_image_url: '/covers/cap-03.svg',
    cover_image_caption: 'Turmas do contraturno na Escola Municipal Presidente Medici',
    scope: 'nioaque',
    category_label: 'Educacao',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1544,
    published_at: '2026-10-21T14:20:00Z',
    created_at: '2026-10-21T13:10:00Z',
    updated_at: '2026-10-21T14:20:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    title: 'UBS Central passa a oferecer cardiologia com equipe compartilhada',
    subtitle: 'Atendimento acontece as tercas e quintas; agendamento ja esta aberto ao publico',
    slug: 'ubs-central-nioaque-cardiologia-equipe-compartilhada',
    summary_bullets: [
      'Consulta de cardiologia ocorre as tercas e quintas, das 7h as 17h.',
      "O atendimento e' feito por equipe compartilhada com o Hospital Nossa Senhora Aparecida.",
      'Exames de rotina (eletrocardiograma e Holter) passam a ser realizados na propria unidade.',
    ],
    content: `<p>A UBS Central de Nioaque passa a oferecer consulta de cardiologia com equipe medica compartilhada com o Hospital Nossa Senhora Aparecida. O atendimento acontece as tercas e quintas, das 7h as 17h, mediante agendamento previo na recepcao.</p>
<p>De acordo com a coordenacao da unidade, o ganho pratico esta na reducao do deslocamento: exames de rotina como eletrocardiograma e Holter passam a ser realizados na propria UBS, sem necessidade de viagem.</p>
<p>A Secretaria Municipal de Saude informou que a lista de espera foi zerada para os agendamentos de urgencia. Casos de risco sao encaminhados pelo SAMU 192.</p>`,
    cover_image_url: '/covers/cap-04.svg',
    cover_image_caption: 'Fachada da UBS Central, no centro de Nioaque',
    scope: 'nioaque',
    category_label: 'Saude',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 2870,
    published_at: '2026-10-20T16:05:00Z',
    created_at: '2026-10-20T15:00:00Z',
    updated_at: '2026-10-20T16:05:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    title: 'Festival de Musica de Nioaque confirma line-up e abre venda de ingressos',
    subtitle: 'Evento ocupa tres noites e movimenta a rede hoteleira da cidade',
    slug: 'festival-musica-nioaque-confirma-line-up-ingressos',
    summary_bullets: [
      'Tres noites de shows com nomes regionais e duas bandas da capital.',
      'Ingressos sao vendidos online e na bilheteria instalada na praca central.',
      'A prefeitura estima movimentacao de R$ 1,2 milhao para o comercio local.',
    ],
    content: `<p>A organizacao do Festival de Musica de Nioaque confirmou o line-up completo desta edicao. Seran tres noites de shows, com duas bandas da capital e nomes ja conhecidos pelo publico regional.</p>
<p>Os ingressos comecam a ser vendidos nesta semana pela internet e tambem presencialmente na bilheteria instalada na praca central. A previsao e' de 4 mil pessoas por noite.</p>
<p>Como ja aconteceu em edicoes anteriores, a rede hoteleira local esta com a ocupacao praticamente cheia. A prefeitura estima R$ 1,2 milhao de movimentacao direta para o comercio da cidade.</p>`,
    cover_image_url: '/covers/cap-05.svg',
    cover_image_caption: 'Palco principal do festival montado na area de eventos',
    scope: 'nioaque',
    category_label: 'Cultura',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 6033,
    published_at: '2026-10-19T11:30:00Z',
    created_at: '2026-10-19T10:12:00Z',
    updated_at: '2026-10-19T11:30:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    title: 'Obras de saneamento chegam a Vila Nova e reduzem perdas de agua',
    subtitle: 'Intervencao em 7,3 km de rede promete pressao melhor e menos rompimentos',
    slug: 'obras-saneamento-vila-nova-nioaque-reduz-perdas-agua',
    summary_bullets: [
      'Ate 40% menos rompimentos de tubulacao na regiao, segundo a concessionaria.',
      'Trabalhos comecaram em agosto e devem terminar antes do periodo chuvoso.',
      'Interrupcoes sao sempre comunicadas com 48h de antecedencia.',
    ],
    content: `<p>A obra de saneamento que atende o bairro Vila Nova chegou a 60% e ja reduz o indice de rompimentos na regiao. A intervencao cobre 7,3 km de rede de agua e 4,1 km de esgoto em uma das areas que mais crescem na cidade.</p>
<p>Segundo a concessionaria, a expectativa e' de queda de ate 40% nas paradas nao programadas e melhora perceptivel da pressao nas unidades residenciais.</p>
<p>O cronograma preve a conclusao dos servicos antes do inicio das chuvas. Interrupcoes no abastecimento sao comunicadas com 48h de antecedencia por meio da empresa e dos canais oficiais da prefeitura.</p>`,
    cover_image_url: '/covers/cap-06.svg',
    cover_image_caption: 'Equipe da concessionaria em trabalho de troca de rede na Vila Nova',
    scope: 'nioaque',
    category_label: 'Infraestrutura',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1976,
    published_at: '2026-10-18T09:40:00Z',
    created_at: '2026-10-18T09:05:00Z',
    updated_at: '2026-10-18T09:40:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* MATO GROSSO DO SUL                                                 */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    title: 'MS avanca no ranking de saneamento e puxa investimento para o Sul',
    subtitle: 'Estado libera recursos para ampliar rede de agua e esgotamento no interior',
    slug: 'ms-avanca-ranking-saneamento-investimento-sul',
    summary_bullets: [
      'Nioaque, Aquidauana e Rio Brilhante entram na lista de municipios contemplados.',
      'Recursos sao de origem estadual, com contrapartida municipal de 8%.',
      "O prazo de execucao das obras e' de 24 meses.",
    ],
    content: `<p>Mato Grosso do Sul subiu tres posicoes no ranking nacional de saneamento e anuncio a liberacao de recursos para ampliar a rede de agua e esgotamento no interior do Estado. Entre os municipios contemplados estao Nioaque, Aquidauana e Rio Brilhante.</p>
<p>O programa exige contrapartida municipal de 8% e tem prazo de execucao de 24 meses a partir da assinatura dos convenios. A secretaria estadual informou que a selecao considerou o indice de cobertura e a capacidade de manutencao das equipes locais.</p>
<p>Para Nioaque, a estimativa e' de ampliacao de 5 mil lares ao abastecimento com agua tratada ate 2028.</p>`,
    cover_image_url: '/covers/cap-07.svg',
    cover_image_caption: 'Obras de rede de agua em um municipio do interior de MS',
    scope: 'ms',
    category_label: 'Estado',
    is_breaking: false,
    is_featured: true,
    author_id: '00000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 2210,
    published_at: '2026-10-21T18:00:00Z',
    created_at: '2026-10-21T17:10:00Z',
    updated_at: '2026-10-21T18:00:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    title: 'Rota do turismo rural: Nioaque entra em novo circuito de cachoeiras e fazendas',
    subtitle: 'Circuito reune seis municipios e promete movimentar R$ 18 milhoes ao ano',
    slug: 'rota-turismo-rural-nioaque-circuito-cachoeiras-fazendas',
    summary_bullets: [
      'Circuito de seis municipios foi lancado oficialmente nesta semana.',
      'Passeios comecam no fim de semana, com saida da praca central as 7h.',
      'Agropecuarios locais podem oferecer visitacao mediante agendamento previo.',
    ],
    content: `<p>Nioaque passou a integrar oficialmente o novo circuito de turismo rural do Sul de Mato Grosso do Sul, apresentado nesta semana em Campo Grande. O roteiro percorre seis municipios e inclui cachoeiras, fazendas panoramicas e trilhas de meia-dia.</p>
<p>Os passeios comecam neste fim de semana, com saida as 7h da praca central. A organizacao recomenda reserva antecipada, ja que a capacidade dos grupos e' limitada a 30 pessoas por van.</p>
<p>Produtores locais podem oferecer visitacao e degustacao mediante agendamento previo pela secretaria de turismo.</p>`,
    cover_image_url: '/covers/cap-08.svg',
    cover_image_caption: 'Trilha panoramica aberta aos visitantes do circuito turistico',
    scope: 'ms',
    category_label: 'Turismo',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1420,
    published_at: '2026-10-20T10:20:00Z',
    created_at: '2026-10-20T09:30:00Z',
    updated_at: '2026-10-20T10:20:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* BRASIL                                                             */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    title: 'Senado aprova PEC do seguro rural com leitura parecida para o pequeno produtor',
    subtitle: 'Texto aprovado permite ajuste do prazo de contrato conforme o ciclo da lavoura',
    slug: 'senado-aprova-pec-seguro-rural-pequeno-produtor',
    summary_bullets: [
      'A PEC foi aprovada por unanimidade em segundo turno.',
      'O novo texto permite o ajuste do prazo de contratacao conforme o ciclo da lavoura.',
      'A publicacao no Diario Oficial ainda depende de sancao presidencial.',
    ],
    content: `<p>O Senado Federal aprovou em segundo turno a proposta de emenda a Constituicao que trata do seguro rural. O texto permite o ajuste do prazo de contratacao da apolice conforme o ciclo da lavoura, ponto considerado relevante por entidades do agronegocio de pequeno porte.</p>
<p>Agora a PEC segue para sancao presidencial. A publicacao no Diario Oficial ainda depende dessa etapa, e analises do setor apontam discussoes sobre o impacto nos pequenos produtores.</p>`,
    cover_image_url: '/covers/cap-09.svg',
    cover_image_caption: 'Lavoura de grao em propriedade rural da regiao',
    scope: 'brasil',
    category_label: 'Brasil',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 5102,
    published_at: '2026-10-21T20:15:00Z',
    created_at: '2026-10-21T19:50:00Z',
    updated_at: '2026-10-21T20:15:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000010',
    title: 'Banco Central mantem a taxa basica e projeta inflacao dentro da meta',
    subtitle: 'Decisao mantem o credito barato para quem produz no campo',
    slug: 'banco-central-mantem-taxa-basica-inflacao-meta',
    summary_bullets: [
      'A taxa Selic foi mantida por decisao unanime do comite.',
      'O relatorio projeta inflacao dentro da meta ate o fim do ano.',
      'Credito rural deve acompanhar a estabilidade da moeda, avaliam entidades do setor.',
    ],
    content: `<p>O comite de politica monetaria manteve a taxa basica de juros e sinalizou que a inflacao deve permanecer dentro da meta no horizonte previsto. A decisao foi unanime.</p>
<p>Para o agronegocio, a estabilidade da moeda e' o ponto mais relevante. As entidades do setor avaliam que o credito rural deve acompanhar essa estabilidade, com custo de capitalizacao mais previsivel para o produtor.</p>`,
    cover_image_url: '/covers/cap-10.svg',
    cover_image_caption: 'Praca de negociacao de graos no interior de MS',
    scope: 'brasil',
    category_label: 'Economia',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 3880,
    published_at: '2026-10-20T19:30:00Z',
    created_at: '2026-10-20T19:00:00Z',
    updated_at: '2026-10-20T19:30:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* COLUNAS                                                            */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000011',
    title: 'Nioaque nao pode ficar de fora do orcamento federal',
    subtitle: 'Coluna Visao de Nioaque',
    slug: 'coluna-nioaquense-orcamento-federal',
    summary_bullets: [
      'Recursos federais sao disputados por municipios de maior porte.',
      'O plano diretor de saneamento exige planejamento de oito anos.',
      'Sem projeto tecnico pronto, Nioaque nao disputa recurso que nao acessa.',
    ],
    content: `<p>Toda discussao sobre recurso federal passa por um detalhe que quase nunca aparece nos debates: a existencia de projeto tecnico pronto. Nioaque tem direito a recurso, tem capacidade de execucao, mas nao tem projeto. Enquanto isso, municipios maiores, com equipes tecnicas estruturas, capturam a maior parte do que sobra.</p>
<p>Nao e' uma critica a gestao municipal. E' um alerta sobre a fragilidade da nossa estrutura. Um plano diretor de saneamento serio, com horizonte de oito anos e um desenho de atribuicoes claro, muda a conversa com o orcamento federal.</p>
<p>O proximo passo e' concreto: organizar o setor de planejamento, mapear as obras prioritarias e deixar tudo pronto para quando a portaria de abertura sair. Quem se prepara captura. Quem espera, assiste.</p>`,
    cover_image_url: '/covers/cap-11.svg',
    cover_image_caption: 'Simbologia do orcamento federal',
    scope: 'coluna',
    category_label: 'Visao de Nioaque',
    is_breaking: false,
    is_featured: true,
    author_id: '00000000-0000-4000-8000-000000000002',
    status: 'published',
    views_count: 2745,
    published_at: '2026-10-22T07:00:00Z',
    created_at: '2026-10-22T06:20:00Z',
    updated_at: '2026-10-22T07:00:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000012',
    title: 'O bairro que ensina a cidade a andar devagar',
    subtitle: 'Coluna Giro de Bairro',
    slug: 'coluna-giro-de-bairro-vila-nova-andar-devagar',
    summary_bullets: [
      'A praca de convivencia virou ponto de encontro de criancas e idosos.',
      'A mudanca de ritmo na rua veio de um acordo simples entre moradores e commerciantes.',
      'A ideia esta sendo levada a prefeitura como piloto para outros bairros.',
    ],
    content: `<p>Toda tarde, por volta das cinco e meia, a praca do bairro Vila Nova muda de ritmo. As criancas que ocupavam a calcada da rua foram recuadas para a area da praca, e os commerciantes aceitaram fechar a passagem de veiculos por meia hora.</p>
<p>Foi um acordo simples, feito na assembleia de moradores, sem projeto e sem dinheiro. Em seis meses, a praca virou o ponto de encontro de criancas, idosos e de um grupo de caminhada que passou a la no fim da tarde.</p>
<p>Levar a ideia para a prefeitura como piloto em outros bairros e' o proximo passo. Custa pouco e muda muito.</p>`,
    cover_image_url: '/covers/cap-12.svg',
    cover_image_caption: 'Praca de convivencia do bairro Vila Nova',
    scope: 'coluna',
    category_label: 'Giro de Bairro',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000003',
    status: 'published',
    views_count: 1204,
    published_at: '2026-10-19T13:00:00Z',
    created_at: '2026-10-19T12:30:00Z',
    updated_at: '2026-10-19T13:00:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* RADAR OFICIAL                                                      */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000013',
    title: 'Radar Oficial: obras, licitacoes e prazos que o cidadao precisa acompanhar',
    subtitle: 'O resumo da semana em Nioaque, com datas e canais de participacao',
    slug: 'radar-oficial-obras-licitacoes-prazos-nioaque',
    summary_bullets: [
      'Duas licitacoes abrem na proxima semana: recapeamento urbano e playground na Vila Rica.',
      'Prazo de credenciamento dos trades do festival encerra sexta-feira.',
      'Consulta publica de planos urbanisticos fica aberta na secretaria de obras.',
    ],
    content: `<p>Esta e' a edicao semanal do Radar Oficial do O Nioaquense, com o que voce precisa acompanhar no municipio de Nioaque: o que abre, o que encerra e onde participar.</p>
<p><strong>Licitacoes que abrem</strong><br />Duas licitacoes abrem na proxima semana. A primeira trata do recapeamento de ruas do bairro Vila Rica; a segunda, da implantacao de playground na praca do setor norte. Os editais estarao disponiveis no Diario Oficial do municipio e no mural da secretaria de obras.</p>
<p><strong>Prazos</strong><br />O prazo de credenciamento dos trades do festival encerra nesta sexta-feira, as 17h.</p>
<p><strong>Participacao</strong><br />A consulta publica de planos urbanisticos permanece aberta. Para conferir, basta levar o RG ao setor de urbanismo, das 8h as 16h.</p>`,
    cover_image_url: '/covers/cap-13.svg',
    cover_image_caption: 'Painel de avisos da secretaria de obras',
    scope: 'radar_oficial',
    category_label: 'Radar Oficial',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 890,
    published_at: '2026-10-21T12:00:00Z',
    created_at: '2026-10-21T11:30:00Z',
    updated_at: '2026-10-21T12:00:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* RASCUNHO / REVISAO (demonstra o RBAC)                              */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000014',
    title: 'Feira do Produtor confirma 60 expositores para a proxima edicao',
    subtitle: 'Rascunho em revisao editorial',
    slug: 'feira-do-produtor-confirma-60-expositores',
    summary_bullets: [
      'Inscricoes de expositores terminam no fim do mes.',
      'O espaco da feira sera dividido em tres setores.',
    ],
    content: `<p>A organizacao da Feira do Produtor confirmou 60 expositores para a proxima edicao. As inscricoes terminam no fim do mes e o espaco sera dividido em tres setores: alimentacao, artesanato e producao rural.</p>`,
    cover_image_url: '/covers/cap-14.svg',
    cover_image_caption: 'Montagem das barracas da feira municipal',
    scope: 'nioaque',
    category_label: 'Economia',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000002',
    status: 'pending_review',
    views_count: 0,
    published_at: null,
    created_at: '2026-10-22T09:15:00Z',
    updated_at: '2026-10-22T09:15:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* RADAR OFICIAL - grupos (Prefeitura, Camara, Concursos, Diario)      */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000015',
    title: 'Prefeitura entrega recapeamento de 4 km em dois bairros e reabre a via',
    subtitle: 'Radar Oficial',
    slug: 'prefeitura-recapeamento-4-km-dois-bairros-reabre-via',
    summary_bullets: [
      'Trechos da Vila Rica e do Bao Vista foram recapeados e liberados ao trafego.',
      'Sinalizacao e limpeza de bueiros fazem parte do pacote de entrega da obra.',
      'A rua foi reaberta as 16h de quarta-feira.',
    ],
    content: `<p>A Prefeitura entregou na quarta-feira a etapa de recapeamento que alcanca 4 km de vias na Vila Rica e no Bao Vista. Com a conclusao do servico, as duas ruas voltaram a aceitar o trafego pesado na mesma noite.</p>
<p>Além da pista nova, o pacote inclui repintura de faixas, limpeza de bueiros e reposicao de 12 placas de sinalizacao. A administracao municipal afirma que a etapa seguinte cobre o acesso ao hospital.</p>
<p>Moradores relataram melhora na passagem de onibus e das vans que fazem a linha do centro.</p>`,
    cover_image_url: '/covers/cap-15.svg',
    cover_image_caption: 'Vias recapeadas na Vila Rica',
    scope: 'radar_oficial',
    category_label: 'Prefeitura',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 712,
    published_at: '2026-10-22T11:20:00Z',
    created_at: '2026-10-22T10:40:00Z',
    updated_at: '2026-10-22T11:20:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000016',
    title: 'Novo programa municipal atende 300 familias com cesta basica',
    subtitle: 'Radar Oficial',
    slug: 'novo-programa-municipal-300-familias-cesta-basica',
    summary_bullets: [
      'Cadastro fica aberto de segunda a sexta, das 8h as 14h, na Secretaria de Assistencia Social.',
      'Criterios consideram renda familiar e numero de moradores por domicilio.',
      'A primeira entrega esta prevista para o dia 15 do mes que vem.',
    ],
    content: `<p>A Prefeitura abriu cadastro para um novo programa de cesta basica que deve atender 300 familias do municipio. O atendimento acontece na Secretaria de Assistencia Social, de segunda a sexta, das 8h as 14h.</p>
<p>Os criterios consideram a renda familiar e o numero de moradores por domicilio. O cadastro exige documento de identidade, comprovante de residencia e declaracao de renda, que pode ser feita na hora.</p>
<p>A primeira entrega esta prevista para o dia 15 do mes que vem. A pasta com os documentos pode ser baixada no site da Prefeitura.</p>`,
    cover_image_url: '/covers/cap-16.svg',
    cover_image_caption: 'Atendimento na Secretaria de Assistencia Social',
    scope: 'radar_oficial',
    category_label: 'Prefeitura',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 531,
    published_at: '2026-10-21T15:40:00Z',
    created_at: '2026-10-21T15:00:00Z',
    updated_at: '2026-10-21T15:40:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000017',
    title: 'Camara aprova projeto que preve desconto de IPTU para comerccio de rua',
    subtitle: 'Radar Oficial',
    slug: 'camara-aprova-projeto-desconto-iptu-comercio-rua',
    summary_bullets: [
      'A reducao vale para empresas de pequeno porte com alvara no comercio de rua.',
      "O desconto e' de ate 30% e depende da regularidade fiscal.",
      'Agora o projeto vai para sancao do Executivo.',
    ],
    content: `<p>A Camara Municipal aprovou em primeira votacao o projeto que preve desconto no IPTU para empresas de pequeno porte que atuam no comercio de rua. A reducao pode chegar a 30% para quem estiver em dia com o pagamento do imposto.</p>
<p>Segundo o projeto, o desconto e' aplicado automaticamente pelo sistema tributario, sem solicitacao. A mesma medida tambem inclui a liberacao de publicidade gratuita em radio local para quem participar do programa.</p>
<p>Aprovado na Camara, o texto segue agora para sancao do Executivo e publicacao no Diario Oficial.</p>`,
    cover_image_url: '/covers/cap-17.svg',
    cover_image_caption: 'Sessao da Camara Municipal',
    scope: 'radar_oficial',
    category_label: 'Câmara',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 448,
    published_at: '2026-10-21T13:05:00Z',
    created_at: '2026-10-21T12:30:00Z',
    updated_at: '2026-10-21T13:05:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000018',
    title: 'Vereadores aprovam em segunda votacao o novo plano diretor',
    subtitle: 'Radar Oficial',
    slug: 'vereadores-aprovam-segunda-votacao-plano-diretor',
    summary_bullets: [
      'O texto amplia o perimetro de expansao urbana nos dois lados do municipio.',
      'Novas regras de ocupacao entram em vigor com a publicacao no Diario Oficial.',
      'A convite popular foi aberta a contribuicoes por 15 dias.',
    ],
    content: `<p>Os vereadores aprovaram em segunda votacao o novo plano diretor do municipio. O texto amplia o perimetro de expansao urbana nos dois sentidos e cria criterios de ocupacao para as areas de borda.</p>
<p>As novas regras entram em vigor depois da publicacao no Diario Oficial. A contribuicao popular foi aberta por 15 dias e reuniu 212 manifestacoes, sendo 43 aceitas pela Casa.</p>
<p>Segundo a Camara, o proximo passo e' a criacao das zonas de interesse social, que vao definir onde cada tipo de obra pode ser prioridade.</p>`,
    cover_image_url: '/covers/cap-18.svg',
    cover_image_caption: 'Plenario durante a votacao do plano diretor',
    scope: 'radar_oficial',
    category_label: 'Câmara',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 623,
    published_at: '2026-10-20T17:30:00Z',
    created_at: '2026-10-20T16:50:00Z',
    updated_at: '2026-10-20T17:30:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000019',
    title: 'Concurso municipal abre cerca de 40 vagas para a area de educacao',
    subtitle: 'Radar Oficial',
    slug: 'concurso-municipal-40-vagas-educacao',
    summary_bullets: [
      'Sao vagas de professor e de agente administrativo em escolas da rede municipal.',
      'Inscricoes comecam na segunda-feira e ficam abertas por 10 dias.',
      'O edital completo esta no site da Prefeitura e no Diario Oficial.',
    ],
    content: `<p>A Prefeitura publicou o edital de concurso com cerca de 40 vagas para a rede municipal de ensino. Sao posicoes de professor e de agente administrativo, com exigencia de ensino superior para as duas.</p>
<p>As inscricoes comecam na segunda-feira e ficam abertas por 10 dias, das 8h as 17h. A taxa e isenta para candidatos de baixa renda que apresentarem a declaracao exigida no ato da inscricao.</p>
<p>O edital completo, com o conteudo do programa e o cronograma de provas, esta no site da Prefeitura e no Diario Oficial.</p>`,
    cover_image_url: '/covers/cap-19.svg',
    cover_image_caption: 'Edital publicado no Diario Oficial do municipio',
    scope: 'radar_oficial',
    category_label: 'Concursos',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 1105,
    published_at: '2026-10-20T12:15:00Z',
    created_at: '2026-10-20T11:45:00Z',
    updated_at: '2026-10-20T12:15:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000020',
    title: 'Diario Oficial da cidade: confira as publicacoes desta semana',
    subtitle: 'Radar Oficial',
    slug: 'diario-oficial-publicacoes-da-semana',
    summary_bullets: [
      'A edicao da semana reune 12 portarias, 3 editais e 2 atos de licitacao.',
      'O gazeto pode ser lido online ou retirado em grafica no centro.',
      'Prazo para impugnacao dos editais deONEY vence sexta-feira.',
    ],
    content: `<p>A edicao desta semana do Diario Oficial do municipio reune 12 portarias, 3 editais e 2 atos de licitacao. O gazeto pode ser lido online em PDF ou retirado em grafica no centro.</p>
<p>Destaques da edicao: o novo regulamento do transporte escolar, a licitacao da obra de recapeamento e a tabela de horario de onibus para o proximo trimestre.</p>
<p>Os prazos para impugnacao dos editais vencem nesta sexta-feira. Quem tiver interesse em participar das licitacoes pode pedir o processo completo na Secretaria de Obras.</p>`,
    cover_image_url: '/covers/cap-20.svg',
    cover_image_caption: 'Edicao semanal do Diario Oficial do municipio',
    scope: 'radar_oficial',
    category_label: 'Diário Oficial',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000001',
    status: 'published',
    views_count: 388,
    published_at: '2026-10-19T14:45:00Z',
    created_at: '2026-10-19T14:00:00Z',
    updated_at: '2026-10-19T14:45:00Z',
  },

  /* ------------------------------------------------------------------ */
  /* COLUNAS adicionais                                                */
  /* ------------------------------------------------------------------ */
  {
    id: 'a1000000-0000-4000-8000-000000000021',
    title: 'A praca do bairro virou a sala de estar da cidade',
    subtitle: 'Coluna Giro de Bairro',
    slug: 'coluna-praca-sala-de-estar-da-cidade',
    summary_bullets: [
      'A praca ganhou sombra, bancos e um campo de futsal de terra.',
      'O conjunto foi feito com dinheiro de um convênio estadual.',
      'O bom exemplo esta sendo estudado por outros bairros.',
    ],
    content: `<p>Toda cidade tem uma praca que e' a sua sala de estar. Em Nioaque, durante muitos anos, essa sala ficou fechada para o cars e aberta so para o transito.</p>
<p>A do bairro Vila Nova virou outra coisa depois que a prefeitura aceitou a proposta da assembleia de moradores: sombra nova, bancos reformados e um campo de futsal de terra que a galera montou no proprio sabado de manha.</p>
<p>Convênio estadual pagou o material; a mao de obra foi do bairro. O exemplo ta sendo estudado pela secretaria de obras para outras praças da cidade.</p>`,
    cover_image_url: '/covers/cap-21.svg',
    cover_image_caption: 'Praca de convivencia do bairro Vila Nova',
    scope: 'coluna',
    category_label: 'Giro de Bairro',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000003',
    status: 'published',
    views_count: 998,
    published_at: '2026-10-21T07:30:00Z',
    created_at: '2026-10-21T07:00:00Z',
    updated_at: '2026-10-21T07:30:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000022',
    title: 'O sul do estado parou de esperar',
    subtitle: 'Coluna Radar MS',
    slug: 'coluna-radar-ms-o-sul-do-estado-parou-de-esperar',
    summary_bullets: [
      'Os indicadores do interior finally melhoram em tres areas simultaneas.',
      'Saneamento, educacao e infraestrutura sao os tres eixos do ciclo.',
      "O risco agora e' transformar o ciclo em promessa sem execucao.",
    ],
    content: `<p>Quem acompanha os indicadores do interior de Mato Grosso do Sul percebe uma coisa simples: pela primeira vez em muito tempo, o sul do estado aparece na mesma linha do que chamamos de desenvolvimento, e nao duas casas atras.</p>
<p>Saneamento, educacao e infraestrutura estao funcionando juntas. Nenhuma das tres areas resolve o problema sozinha, mas a combinacao delas comeca a aparecer nas ruas.</p>
<p>O risco agora e' outro: transformar ciclo em promessa. A populacao do interior ja viu muito plano bonito. O que marca a diferenca agora e' a obra entregue no prazo - e ela precisa aparecer no seu bairro, nao no orcamento de outro lugar.</p>`,
    cover_image_url: '/covers/cap-22.svg',
    cover_image_caption: 'Cidade do interior de MS',
    scope: 'coluna',
    category_label: 'Radar MS',
    is_breaking: false,
    is_featured: false,
    author_id: '00000000-0000-4000-8000-000000000004',
    status: 'published',
    views_count: 1642,
    published_at: '2026-10-20T06:45:00Z',
    created_at: '2026-10-20T06:20:00Z',
    updated_at: '2026-10-20T06:45:00Z',
  },
];

/* =============================================================================
 *  Servicos publicos (farmacia de plantao, alertas, onibus)
 * ============================================================================= */

export const mockPublicUtilities: PublicUtility[] = [
  {
    id: 'u1000000-0000-4000-8000-000000000001',
    duty_date: '2026-10-22',
    pharmacy_name: 'Drogaria Sao Lucas',
    pharmacy_phone: '(67) 3465-1122',
    pharmacy_address: 'Rua Pedro Celestino, 320 - Centro, Nioaque/MS',
    alert_active: true,
    alert_message:
      'Chuva forte prevista para a regiao a partir das 16h. A Rua das Palmeiras pode alagar; prefira a rota pela Avenida Afonso Arinos.',
    alert_level: 'warning',
    bus_schedule_html: `<ul>
      <li><strong>Rio Brilhante</strong> - 06:30 e 18:00</li>
      <li><strong>Aquidauana</strong> - 07:15 e 17:30</li>
      <li><strong>Campo Grande</strong> - 05:45 e 15:45</li>
    </ul>`,
    updated_at: '2026-10-22T05:00:00Z',
  },
  {
    id: 'u1000000-0000-4000-8000-000000000002',
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
    id: 'ad100000-0000-4000-8000-000000000001',
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
    id: 'ad100000-0000-4000-8000-000000000002',
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
    id: 'ad100000-0000-4000-8000-000000000003',
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
    id: 'ad100000-0000-4000-8000-000000000004',
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
    id: 'ad100000-0000-4000-8000-000000000005',
    client_name: 'Mercado Nilo',
    title: 'Carnes nobres com 25% de desconto nesta sexta-feira',
    image_url: '/covers/ad-03.svg',
    target_url: '#',
    whatsapp_number: '5567991122334',
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
    id: 'b1000000-0000-4000-8000-000000000001',
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
    id: 'b1000000-0000-4000-8000-000000000002',
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
    id: 'b1000000-0000-4000-8000-000000000003',
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
    id: 'b1000000-0000-4000-8000-000000000004',
    route_name: 'Linha 09',
    destination: 'Vila Yara e entorno',
    departure_times: ['08:00', '13:00', '18:30'],
    frequency: 'Seg a Sex',
    notes: 'LinhaCircular do bairro.',
    position: 4,
    active: true,
    updated_at: '2026-10-20T05:00:00Z',
  },
];

/* =============================================================================
 *  Pistas do leitor
 * ============================================================================= */

export const mockReaderSubmissions: ReaderSubmission[] = [
  {
    id: 's1000000-0000-4000-8000-000000000001',
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
    id: 's1000000-0000-4000-8000-000000000002',
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
    id: 's1000000-0000-4000-8000-000000000003',
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
