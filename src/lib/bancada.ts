/**
 * Bancada de Mato Grosso do Sul no Congresso Nacional.
 *
 * REVISAR EM 01/02/2027 (posse da nova legislatura), ha uma tarefa agendada: conferir
 * `ELEITOS_2026` (titulo/texto "a partir de" vira "em exercicio"; suplentes e
 * mudancas de partido) e o nome exato dos novos parlamentares na API
 * (`AUTORES_EMENDAS`, principalmente Renan Contar, Rose Modesto, Mara Caseiro,
 * Isa Marcondes e Reinaldo Azambuja).
 */

export interface Parlamentar {
  nome: string;
  partido?: string;
}

/** Eleitos em 2026, mandato de 01/02/2027 a 31/01/2031. Aqui so os nomes, sem emendas. */
export const ELEITOS_2026: { deputados: Parlamentar[]; senadores: Parlamentar[] } = {
  deputados: [
    { nome: 'Camila Jara', partido: 'PT' },
    { nome: 'Marcos Pollon', partido: 'PL' },
    { nome: 'Rose Modesto', partido: 'UNIÃO' },
    { nome: 'Mara Caseiro', partido: 'PL' },
    { nome: 'Rodolfo Nogueira', partido: 'PL' },
    { nome: 'Beto Pereira', partido: 'REPUBLICANOS' },
    { nome: 'Isa Marcondes', partido: 'REPUBLICANOS' },
    { nome: 'Dagoberto Nogueira', partido: 'PP' },
  ],
  // Reinaldo Azambuja e Renan Barbosa Contar (Capitao Contar) tomam posse em 2027; Tereza Cristina segue no mandato
  senadores: [{ nome: 'Reinaldo Azambuja' }, { nome: 'Renan Barbosa Contar (Capitão Contar)' }, { nome: 'Tereza Cristina' }],
};

/**
 * Trechos de nome usados no filtro `nomeAutor` da API de Dados do Portal da
 * Transparencia. Inclui quem esta em exercicio ate 31/01/2027 (Vander Loubet,
 * Geraldo Resende, Soraya Thronicke, Nelsinho Trad) e os eleitos (que so passam
 * a ter emendas depois da posse).
 */
export const AUTORES_EMENDAS = [
  'CAMILA JARA',
  'MARCOS POLLON',
  'ROSE MODESTO',
  'MARA CASEIRO',
  'RODOLFO NOGUEIRA',
  'BETO PEREIRA',
  'ISA MARCONDES',
  'DAGOBERTO NOGUEIRA',
  'VANDER LOUBET',
  'GERALDO RESENDE',
  'REINALDO AZAMBUJA',
  'CONTAR', // casa tambem com o senador Fabiano Contarato: o filtro descarta quem nao e de MS
  'TEREZA CRISTINA',
  'SORAYA THRONICKE',
  'NELSINHO TRAD',
  'BANCADA DO MATO GROSSO DO SUL',
];
