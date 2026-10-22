/** Geracao de slugs amigaveis para URLs (padrao do portal). */

/** Converte um texto em slug: minusculas, sem acentos, hifenizado. */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

/** Gera um slug unico entre os ja existentes. */
export function uniqueSlug(base: string, existing: string[]): string {
  const root = slugify(base) || 'materia';
  if (!existing.includes(root)) return root;

  let suffix = 2;
  while (existing.includes(`${root}-${suffix}`)) suffix += 1;

  return `${root}-${suffix}`;
}
