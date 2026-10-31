/**
 * categories.ts - lista unica de editorias tematicas do portal.
 *
 * Fonte de verdade para: opcoes do painel, instrucao da IA, deteccao por
 * palavras-chave e paginas /editoria/<slug>. `norm()` ignora acento e caixa.
 */

export interface Category {
  label: string;
  slug: string;
  description: string;
  /** Nomes alternativos que a IA ou uma fonte podem usar para a mesma editoria. */
  synonyms: string[];
  /** Palavras-chave (sem acento) para classificar pelo titulo/texto. */
  keywords: string[];
}

export const norm = (t: string | null | undefined): string =>
  (t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const CATEGORIES: Category[] = [
  {
    label: 'Política', slug: 'politica', description: 'Prefeitura, Câmara, governos, eleições e decisões que afetam a cidade.',
    synonyms: ['politica e poder', 'poder', 'prefeitura', 'camara', 'governo', 'eleicoes', 'legislativo', 'executivo', 'estado'],
    keywords: ['prefeit', 'vereador', 'camara municipal', 'camara de', 'deputad', 'senador', 'governador', 'governo do estado', 'governo federal', 'lula', 'bolsonaro', 'eleic', 'candidat', 'partido', 'projeto de lei', 'sancion', 'assembleia', 'congresso', 'stf', 'ministro', 'planalto', 'legislativ'],
  },
  {
    label: 'Cidade', slug: 'cidade', description: 'O dia a dia de Nioaque: serviços, comunidade e avisos.',
    synonyms: ['local', 'comunidade', 'servicos', 'utilidade publica'],
    keywords: ['moradores', 'bairro', 'comunidade', 'interdit', 'falta de agua', 'energia eletrica', 'coleta de lixo', 'feira livre'],
  },
  {
    label: 'Polícia', slug: 'policia', description: 'Ocorrências, operações e segurança pública.',
    synonyms: ['seguranca', 'seguranca publica', 'policial', 'crime', 'policia e justica'],
    keywords: ['policia', 'policial', 'preso', 'prisao', 'homicid', 'assassin', 'roubo', 'furto', 'trafico', 'droga', 'apreend', 'operacao', 'acusado', 'suspeito', 'delegacia', 'bombeiro', 'faccao', 'estupro', 'latrocin', 'feminicid'],
  },
  {
    label: 'Justiça', slug: 'justica', description: 'Decisões judiciais, Ministério Público e direitos.',
    synonyms: ['judiciario', 'direito', 'tribunal'],
    keywords: ['justica', 'tribunal', 'tjms', 'juiz', 'juiza', 'ministerio publico', 'mpms', 'denuncia', 'condenad', 'sentenca', 'liminar', 'processo judicial', 'defensoria', 'stj'],
  },
  {
    label: 'Saúde', slug: 'saude', description: 'Postos de saúde, campanhas, hospitais e prevenção.',
    synonyms: ['saude publica'],
    keywords: ['saude', 'hospital', 'ubs', 'vacin', 'medic', 'enfermag', 'epidemia', 'dengue', 'doenca', 'cirurgia', 'chikungunya', 'covid', 'gripe'],
  },
  {
    label: 'Educação', slug: 'educacao', description: 'Escolas, universidades, matrículas e ensino.',
    synonyms: ['escola', 'ensino'],
    keywords: ['educac', 'escola', 'aluno', 'professor', 'universidade', 'ufms', 'uems', 'enem', 'matricula', 'ensino', 'merenda', 'creche', 'estudante', 'vestibular'],
  },
  {
    label: 'Agro', slug: 'agro', description: 'Pecuária, lavoura, preços e a vida no campo.',
    synonyms: ['agricultura', 'agronegocio', 'pecuaria', 'rural', 'campo', 'agro e campo'],
    keywords: ['agro', 'lavoura', 'fazenda', 'produtor rural', 'plantio', 'colheita', 'boi gordo', 'gado', 'soja', 'milho', 'pecuaria', 'rebanho', 'safra', 'arroba', 'sindicato rural', 'famasul'],
  },
  {
    label: 'Economia', slug: 'economia', description: 'Preços, negócios e o bolso do cidadão.',
    synonyms: ['financas', 'negocios', 'mercado', 'dinheiro'],
    keywords: ['economia', 'inflacao', 'dolar', 'juros', 'selic', 'pib', 'salario', 'imposto', 'ipva', 'iptu', 'comercio', 'empresa', 'preco', 'banco', 'pix', 'inss', 'aposentad', 'beneficio'],
  },
  {
    label: 'Emprego e Concursos', slug: 'emprego-concursos', description: 'Vagas, concursos, processos seletivos e oportunidades.',
    synonyms: ['emprego', 'concursos', 'concurso', 'vagas', 'trabalho', 'processo seletivo'],
    keywords: ['concurso', 'processo seletivo', 'vagas', 'edital', 'inscricoes abertas', 'contratacao', 'emprego', 'estagio'],
  },
  {
    label: 'Infraestrutura', slug: 'infraestrutura', description: 'Obras, estradas, saneamento, energia e habitação.',
    synonyms: ['obras', 'habitacao', 'saneamento', 'urbanismo'],
    keywords: ['obra', 'rodovia', 'ponte', 'asfalto', 'pavimenta', 'saneamento', 'esgoto', 'habitacional', 'casa propria', 'energisa', 'sanesul', 'agesul'],
  },
  {
    label: 'Trânsito e Transporte', slug: 'transito', description: 'Acidentes, ônibus, habilitação e mobilidade.',
    synonyms: ['transito', 'transporte', 'mobilidade'],
    keywords: ['transito', 'acidente', 'colisao', 'capotamento', 'detran', 'onibus', 'motorista', 'cnh', 'multa', 'rodoviaria', 'atropel'],
  },
  {
    label: 'Meio Ambiente', slug: 'meio-ambiente', description: 'Natureza, queimadas, rios, fauna e sustentabilidade.',
    synonyms: ['ambiente', 'sustentabilidade', 'ecologia'],
    keywords: ['ambiental', 'meio ambiente', 'queimada', 'incendio florestal', 'desmat', 'imasul', 'ibama', 'fauna', 'pantanal', 'seca', 'onca', 'sustentab', 'reciclag'],
  },
  {
    label: 'Clima', slug: 'clima', description: 'Previsão do tempo, chuvas, calor e alertas.',
    synonyms: ['tempo', 'previsao do tempo'],
    keywords: ['previsao do tempo', 'chuva', 'tempestade', 'onda de calor', 'frente fria', 'inmet', 'temporal', 'geada', 'granizo', 'temperatura'],
  },
  {
    label: 'Turismo', slug: 'turismo', description: 'Destinos, passeios e a região do Pantanal e da Bodoquena.',
    synonyms: ['viagem', 'turismo e lazer'],
    keywords: ['turismo', 'turista', 'bonito', 'hotel', 'pousada', 'ecoturismo', 'cachoeira', 'trilha', 'passeio'],
  },
  {
    label: 'Esporte', slug: 'esporte', description: 'Times, campeonatos e atletas da região.',
    synonyms: ['esportes'],
    keywords: ['esporte', 'futebol', 'campeonato', 'atleta', 'torcida', 'estadio', 'volei', 'olimp', 'corinthians', 'flamengo', 'palmeiras', 'operario', 'costa rica', 'tenis', 'corrida'],
  },
  {
    label: 'Cultura', slug: 'cultura', description: 'Eventos, festas, artistas e tradições locais.',
    synonyms: ['eventos', 'arte', 'lazer', 'entretenimento', 'tradicao'],
    keywords: ['cultura', 'festival', 'show', 'musica', 'teatro', 'exposicao', 'artista', 'livro', 'festa', 'cinema', 'folclore', 'danca', 'cantor', 'rodeio', 'exposul'],
  },
  {
    label: 'Assistência Social', slug: 'assistencia-social', description: 'Programas sociais, cidadania e apoio às famílias.',
    synonyms: ['social', 'cidadania', 'direitos humanos'],
    keywords: ['cras', 'creas', 'bolsa familia', 'cadunico', 'assistencia social', 'idoso', 'pessoa com deficiencia', 'indigena', 'quilombol', 'vulnerabilidade', 'doacao', 'agasalho'],
  },
  {
    label: 'Religião', slug: 'religiao', description: 'Igrejas, festas religiosas e vida de fé.',
    synonyms: ['fe', 'igreja'],
    keywords: ['igreja', 'missa', 'padre', 'pastor', 'paroquia', 'diocese', 'catolic', 'evangelic', 'romaria', 'padroeiro'],
  },
  {
    label: 'Tecnologia', slug: 'tecnologia', description: 'Internet, inovação, segurança digital e golpes online.',
    synonyms: ['ciencia', 'inovacao', 'ciencia e tecnologia'],
    keywords: ['tecnologia', 'internet', 'inteligencia artificial', 'aplicativo', 'celular', 'golpe virtual', 'whatsapp', 'hacker', 'starlink', 'fibra optica', 'ciencia'],
  },
  {
    label: 'Mundo', slug: 'mundo', description: 'O que acontece no exterior e importa para o Brasil.',
    synonyms: ['internacional', 'exterior'],
    keywords: ['estados unidos', 'china', 'russia', 'ucrania', 'israel', 'gaza', 'europa', 'argentina', 'paraguai', 'bolivia', 'onu', 'otan', 'trump'],
  },
  {
    label: 'Geral', slug: 'geral', description: 'Outros assuntos.',
    synonyms: ['outros', 'variedades', 'noticias'],
    keywords: [],
  },
];

export const CATEGORY_LABELS = CATEGORIES.map((c) => c.label);

/** Converte um rotulo livre (da IA ou digitado) para a editoria oficial; null se nao reconhece. */
export function normalizeCategory(raw: string | null | undefined): string | null {
  const n = norm(raw);
  if (!n) return null;
  for (const c of CATEGORIES) {
    if (norm(c.label) === n || c.slug === n || c.synonyms.includes(n)) return c.label;
  }
  return null;
}

/** Classifica pelo titulo (peso 3) e pelo comeco do texto (peso 1). Sem pista => Geral. */
export function detectCategory(title: string, body = ''): string {
  const t = ` ${norm(title)} `;
  const b = ` ${norm(body.slice(0, 1200))} `;
  let best: { label: string; score: number } | null = null;
  for (const c of CATEGORIES) {
    let score = 0;
    for (const k of c.keywords) {
      if (t.includes(k)) score += 3;
      else if (b.includes(k)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { label: c.label, score };
  }
  return best && best.score >= 2 ? best.label : 'Geral';
}
