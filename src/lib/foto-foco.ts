/**
 * Enquadramento das fotos das autoridades.
 * Cada foto tem tamanhos e fundos diferentes (retrato de corpo inteiro, rosto pequeno
 * no meio de um quadrado...). Aqui fica o ponto do rosto (x, y em fracao da imagem) e
 * o zoom, para o circulo mostrar sempre o rosto, na pagina e no PNG.
 */
export interface Foco {
  /** largura e altura reais do arquivo */
  w: number;
  h: number;
  /** centro do rosto, de 0 a 1 */
  x: number;
  y: number;
  /** zoom sobre o recorte quadrado padrao (1 = foto toda) */
  z: number;
}

export const FOCOS: Record<string, Foco> = {
  '/autoridades/prefeito.jpg': { w: 533, h: 800, x: 0.53, y: 0.31, z: 1.45 },
  '/autoridades/vice-prefeito.png': { w: 449, h: 800, x: 0.5, y: 0.18, z: 1.6 },
  '/autoridades/sec-secretaria-de-governo.jpg': { w: 240, h: 240, x: 0.5, y: 0.41, z: 1.65 },
  '/autoridades/sec-secretaria-de-financas.jpg': { w: 240, h: 240, x: 0.52, y: 0.3, z: 1.65 },
  '/autoridades/sec-secretaria-de-saude.jpg': { w: 240, h: 240, x: 0.49, y: 0.4, z: 1.65 },
  '/autoridades/sec-secretaria-de-educacao.jpg': { w: 240, h: 240, x: 0.51, y: 0.37, z: 1.65 },
  '/autoridades/sec-secretaria-de-assistencia-social.jpg': { w: 240, h: 240, x: 0.52, y: 0.38, z: 1.65 },
  '/autoridades/sec-secretaria-de-cultura-esporte-turismo-e-lazer.jpg': { w: 240, h: 240, x: 0.49, y: 0.4, z: 1.65 },
  '/autoridades/sec-secretaria-de-desenvolvimento-rural.jpg': { w: 240, h: 240, x: 0.51, y: 0.37, z: 1.65 },
  '/autoridades/sec-semditec.jpg': { w: 240, h: 240, x: 0.5, y: 0.41, z: 1.65 },
};

/** Recorte quadrado (em pixels da imagem) que centra o rosto sem sair da foto. */
export function recorte(f: Foco): { sx: number; sy: number; s: number } {
  const s = Math.min(f.w, f.h) / f.z;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), max);
  return { sx: clamp(f.x * f.w - s / 2, f.w - s), sy: clamp(f.y * f.h - s / 2, f.h - s), s };
}
