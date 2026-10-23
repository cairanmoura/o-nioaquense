-- Issue 6 (conteudo):
--   1) Remove as 4 materias FICTICIAS (colunas editoriais de showcase).
--   2) Corrige acentos quebrados + atribui capa geometrica as 6 materias
--      REAIS do Radar Oficial que estavam sem foto.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Materias ficticias (colunas editoriais) -> fora do site
-- ---------------------------------------------------------------------------
DELETE FROM public.articles
WHERE status = 'published'
  AND scope = 'coluna'
  AND title IN (
    'Feira do Produtor: o que parece pequeno e sustenta a cidade',
    'O municipio que aprendeu a fazer do medo um projeto',
    'Asfalto em Aquidauana e o que diz sobre a regiao',
    'Quem apaga o vazio do quadro de avisos'
  );

-- ---------------------------------------------------------------------------
-- 2) Radar Oficial (reais): capa + titulos/corpo com acentos corrigidos
-- ---------------------------------------------------------------------------

-- Creche do Monte Alto
UPDATE public.articles SET
  cover_image_url = '/covers/cap-10.svg',
  title = 'Nioaque homologa empresa por R$ 3,57 milhões para nova creche no bairro Monte Alto',
  summary_bullets = ARRAY[
    'A Dias Construtora e Empreendimentos Ltda foi declarada vencedora da licitação.',
    'O valor é de R$ 3.574.000,00 para uma Creche Pré-Escola Tipo 2 do FNDE.',
    'A obra será construída no bairro Monte Alto.'
  ]::text[],
  content = '<p>Foi homologada a empresa que vai construir a nova creche do bairro Monte Alto. A Dias Construtora e Empreendimentos Ltda foi declarada vencedora da concorrência para construção de uma Creche Pré-Escola Tipo 2 do FNDE.</p>
<p>O valor do contrato é de R$ 3.574.000,00. O prazo de execução consta no processo, consultado pela redação junto à Secretaria de Obras.</p>'
WHERE id = '20000000-0000-4000-8000-000000000050';

-- Conselho de Migrantes (Câmara de Campo Grande)
UPDATE public.articles SET
  cover_image_url = '/covers/cap-11.svg',
  title = 'Câmara de Campo Grande vota criação do Conselho de Migrantes nesta quinta-feira',
  summary_bullets = ARRAY[
    'A Câmara de Campo Grande vota nesta quinta-feira a criação do Conselho de Migrantes.',
    'Um projeto que revoga a doação de imóvel público também será analisado.',
    'As sessões são transmitidas e podem ser acompanhadas no site oficial.'
  ]::text[],
  content = '<p>A Câmara de Campo Grande vota nesta quinta-feira a criação do Conselho de Migrantes. Um projeto que revoga a doação de imóvel público também será analisado na mesma sessão.</p>
<p>Sessões da Câmara são transmitidas e podem ser acompanhadas no site oficial.</p>'
WHERE id = '20000000-0000-4000-8000-000000000051';

-- Concurso da Câmara de Paraíso das Águas
UPDATE public.articles SET
  cover_image_url = '/covers/cap-12.svg',
  title = 'Câmara de Paraíso das Águas abre concurso com salários de até R$ 8,1 mil',
  summary_bullets = ARRAY[
    'O edital oferece vagas para candidatos com ensino médio e superior.',
    'Os salários chegam a R$ 8,1 mil.',
    'As inscrições seguem conforme o cronograma do edital.'
  ]::text[],
  content = '<p>A Câmara de Paraíso das Águas abriu concurso com salários de até R$ 8,1 mil. O edital oferece vagas para candidatos com ensino médio e superior.</p>
<p>As inscrições seguem conforme o cronograma publicado no edital, consultado pela redação.</p>'
WHERE id = '20000000-0000-4000-8000-000000000052';

-- 600 vagas em Campo Grande
UPDATE public.articles SET
  cover_image_url = '/covers/cap-13.svg',
  title = 'De saladeiro a vigia, Campo Grande oferta mais de 600 vagas nesta quinta-feira',
  summary_bullets = ARRAY[
    'Mais de 600 vagas são ofertadas nesta quinta-feira em Campo Grande.',
    '418 delas são para pessoas sem experiência.',
    'A seleção é feita em um único dia, por ordem de chegada.'
  ]::text[],
  content = '<p>De saladeiro a vigia: Campo Grande oferta mais de 600 vagas nesta quinta-feira. Do total, 418 são para pessoas sem experiência.</p>
<p>A seleção acontece em um único dia, por ordem de chegada. Quem busca a vaga precisa levar documento de identidade e comprovante de endereço.</p>'
WHERE id = '20000000-0000-4000-8000-000000000053';

-- Diário Oficial do município
UPDATE public.articles SET
  cover_image_url = '/covers/cap-14.svg',
  title = 'Diário Oficial do município: confira as publicações desta semana',
  summary_bullets = ARRAY[
    'A edição da semana reúne portarias, editais e atos de licitação.',
    'O gazeto pode ser lido online ou retirado em gráfica no centro.',
    'Prazos para impugnação vencem nesta sexta-feira.'
  ]::text[],
  content = '<p>A edição desta semana do Diário Oficial do município reúne portarias, editais e atos de licitação. O gazeto pode ser lido online ou retirado em gráfica no centro.</p>
<p>Destaques: o regulamento do transporte escolar, a licitação da obra de recapeamento e o calendário de coleta de resíduos. Os prazos para impugnação vencem nesta sexta-feira.</p>'
WHERE id = '20000000-0000-4000-8000-000000000054';

-- Feira do Produtor
UPDATE public.articles SET
  cover_image_url = '/covers/cap-15.svg',
  title = 'Feira do Produtor amplia movimentação e estabelece novo dia de funcionamento',
  summary_bullets = ARRAY[
    'A feira passa a ter mais um dia de funcionamento por semana.',
    'Produtores da agricultura familiar têm cadastro aberto.',
    'A lista dos participantes pode ser consultada na secretaria.'
  ]::text[],
  content = '<p>A Feira do Produtor amplia a movimentação e estabelece novo dia de funcionamento. Produtores da agricultura familiar têm cadastro aberto.</p>
<p>A lista dos participantes pode ser consultada na secretaria, das 8h às 17h.</p>'
WHERE id = '20000000-0000-4000-8000-000000000055';

COMMIT;
