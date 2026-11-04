/**
 * img.ts
 * -----------------------------------------------------------------------------
 * Fotos em tamanho certo: capas ficam no Supabase Storage em ate 1200 px; o
 * celular so precisa de 400-800 px. `/img` (src/pages/img.ts) redimensiona na
 * borda; aqui montamos a URL e o `srcset`. URLs de outros hosts passam direto.
 */

const COVERS = /^https:\/\/[a-z0-9]+\.supabase\.co\/storage\/v1\/object\/public\/covers\/(.+)$/i;

/** Larguras aceitas pelo /img (o endpoint recusa as demais). */
export const IMG_WIDTHS = [320, 480, 640, 800, 1200] as const;

/** `/img?p=imports/x.webp&w=480` para capas do Supabase; senao, a propria URL. */
export function imgUrl(url: string, width: number): string {
  const m = COVERS.exec(url);
  if (!m) return url;
  return `/img?p=${encodeURIComponent(m[1]!)}&w=${width}`;
}

/** `srcset` com as larguras pedidas (undefined se a URL nao e' capa do Supabase). */
export function imgSrcset(url: string, widths: readonly number[]): string | undefined {
  if (!COVERS.test(url)) return undefined;
  return widths.map((w) => `${imgUrl(url, w)} ${w}w`).join(', ');
}
