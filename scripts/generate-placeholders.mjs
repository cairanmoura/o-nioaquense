/**
 * scripts/generate-placeholders.mjs
 * -----------------------------------------------------------------------------
 * Gera as imagens placeholder (SVG) usadas pelo mock data:
 * capas de materia, avatares de colunistas, banners de anuncio local e
 * imagens de pistas do leitor.
 *
 * Tudo vetorial, offline e com a paleta oficial da bandeira de Nioaque.
 *
 * Uso: node scripts/generate-placeholders.mjs
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public', 'covers');

const GREEN = '#008026';
const RED = '#E60000';
const WHITE = '#FFFFFF';
const EDITORIAL = '#FAF9F6';
const INK = '#1E293B';

mkdirSync(OUT_DIR, { recursive: true });

/* -------------------------------------------------------------------------- */
/* Composicoes de capa                                                        */
/* -------------------------------------------------------------------------- */

const compositions = [
  // 1 - Bandas horizontais (lembra a bandeira)
  (w, h) => `
    <rect width="${w}" height="${h}" fill="${EDITORIAL}"/>
    <rect width="${w}" height="${h * 0.16}" fill="${GREEN}"/>
    <rect y="${h * 0.84}" width="${w}" height="${h * 0.16}" fill="${RED}"/>
    <rect x="${w * 0.12}" y="${h * 0.34}" width="${w * 0.42}" height="${h * 0.3}" rx="18" fill="${WHITE}"/>
    <circle cx="${w * 0.78}" cy="${h * 0.5}" r="${h * 0.19}" fill="${GREEN}" opacity="0.14"/>`,

  // 2 - Sol / radial vermelho
  (w, h) => `
    <rect width="${w}" height="${h}" fill="${EDITORIAL}"/>
    <circle cx="${w * 0.72}" cy="${h * 0.42}" r="${h * 0.34}" fill="${RED}" opacity="0.12"/>
    <circle cx="${w * 0.72}" cy="${h * 0.42}" r="${h * 0.22}" fill="${RED}" opacity="0.2"/>
    <circle cx="${w * 0.72}" cy="${h * 0.42}" r="${h * 0.1}" fill="${RED}"/>
    <rect x="${w * 0.08}" y="${h * 0.58}" width="${w * 0.4}" height="${h * 0.05}" rx="8" fill="${INK}" opacity="0.85"/>
    <rect x="${w * 0.08}" y="${h * 0.68}" width="${w * 0.26}" height="${h * 0.04}" rx="8" fill="${INK}" opacity="0.4"/>`,

  // 3 - Grade de quadrados
  (w, h) => {
    const cols = 8;
    const rows = 5;
    const cell = w / cols;
    let out = `<rect width="${w}" height="${h}" fill="${WHITE}"/>`;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const variant = (row * 3 + col * 5) % 7;
        const color =
          variant === 0
            ? GREEN
            : variant === 3
              ? RED
              : variant === 5
                ? INK
                : EDITORIAL;
        const opacity = variant === 0 || variant === 3 ? 0.9 : variant === 5 ? 0.16 : 1;
        out += `<rect x="${col * cell}" y="${row * (h / rows)}" width="${cell}" height="${h / rows}" fill="${color}" opacity="${opacity}"/>`;
      }
    }

    return out;
  },

  // 4 - Curvas concentricas
  (w, h) => {
    let out = `<rect width="${w}" height="${h}" fill="${EDITORIAL}"/>`;
    for (let i = 0; i < 7; i += 1) {
      const r = h * (0.12 + i * 0.09);
      const stroke = i % 3 === 0 ? RED : GREEN;
      out += `<circle cx="${w * 0.5}" cy="${h * 0.62}" r="${r}" fill="none" stroke="${stroke}" stroke-width="${h * 0.02}" opacity="${0.85 - i * 0.09}"/>`;
    }
    out += `<rect width="${w}" height="${h * 0.12}" fill="${GREEN}"/>`;
    return out;
  },

  // 5 - Ondas em camadas
  (w, h) => `
    <rect width="${w}" height="${h}" fill="${EDITORIAL}"/>
    <path d="M0 ${h * 0.72} C ${w * 0.22} ${h * 0.54}, ${w * 0.42} ${h * 0.88}, ${w} ${h * 0.62} L ${w} ${h} L 0 ${h} Z" fill="${GREEN}" opacity="0.22"/>
    <path d="M0 ${h * 0.82} C ${w * 0.28} ${h * 0.68}, ${w * 0.55} ${h * 0.96}, ${w} ${h * 0.76} L ${w} ${h} L 0 ${h} Z" fill="${GREEN}"/>
    <path d="M0 ${h * 0.92} C ${w * 0.3} ${h * 0.86}, ${w * 0.6} ${h}, ${w} ${h * 0.9} L ${w} ${h} L 0 ${h} Z" fill="${RED}"/>
    <circle cx="${w * 0.2}" cy="${h * 0.24}" r="${h * 0.09}" fill="${RED}" opacity="0.9"/>`,

  // 6 - Blocos diagonais
  (w, h) => `
    <rect width="${w}" height="${h}" fill="${EDITORIAL}"/>
    <path d="M0 0 L ${w * 0.55} 0 L ${w * 0.22} ${h} L 0 ${h} Z" fill="${GREEN}"/>
    <path d="M${w * 0.55} 0 L ${w * 0.8} 0 L ${w * 0.47} ${h} L ${w * 0.22} ${h} Z" fill="${WHITE}"/>
    <path d="M${w * 0.8} 0 L ${w} 0 L ${w} ${h} L ${w * 0.47} ${h} Z" fill="${RED}" opacity="0.88"/>
    <rect x="${w * 0.06}" y="${h * 0.46}" width="${w * 0.1}" height="${h * 0.06}" rx="10" fill="${WHITE}" opacity="0.9"/>`,
];

/* -------------------------------------------------------------------------- */
/* Geradores                                                                  */
/* -------------------------------------------------------------------------- */

function svg(width, height, body, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"${extra}>
${body}
</svg>
`;
}

function cover(index) {
  const w = 1600;
  const h = 900;
  const body = compositions[index % compositions.length](w, h);

  // Gota de marca no canto inferior direito
  const mark = `<g transform="translate(${w - 92} ${h - 92}) scale(0.34)">
    <rect x="0" y="0" width="100" height="18" fill="${GREEN}"/>
    <rect x="0" y="18" width="100" height="64" fill="${WHITE}"/>
    <rect x="0" y="82" width="100" height="18" fill="${RED}"/>
    <rect x="26" y="28" width="8" height="44" fill="${RED}"/>
    <rect x="18" y="37" width="24" height="8" fill="${RED}"/>
  </g>`;

  return svg(w, h, body + mark);
}

function avatar(initials, background, foreground = WHITE) {
  const size = 400;
  const body = `
    <rect width="${size}" height="${size}" fill="${background}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.42}" fill="${foreground}" opacity="0.14"/>
    <text x="50%" y="50%" dy="0.36em" text-anchor="middle" fill="${foreground}"
      font-family="'Plus Jakarta Sans','Arial Black',Arial,sans-serif" font-weight="800"
      font-size="${size * 0.34}" letter-spacing="2">${initials}</text>`;

  return svg(size, size, body);
}

function ad(index) {
  const w = 1200;
  const h = 420;
  const body = compositions[index % compositions.length](w, h);

  return svg(w, h, body);
}

function submission() {
  const w = 1200;
  const h = 900;
  const body = `
    <rect width="${w}" height="${h}" fill="${EDITORIAL}"/>
    <rect width="${w}" height="${h * 0.1}" fill="${RED}"/>
    <rect y="${h * 0.9}" width="${w}" height="${h * 0.1}" fill="${INK}"/>
    <rect x="${w * 0.18}" y="${h * 0.26}" width="${w * 0.64}" height="${h * 0.44}" rx="24" fill="${WHITE}" stroke="${RED}" stroke-width="6"/>
    <circle cx="${w * 0.5}" cy="${h * 0.42}" r="${h * 0.1}" fill="${RED}" opacity="0.25"/>
    <path d="M${w * 0.5 - 40} ${h * 0.44} l32 -34 l40 44 h-72 z" fill="${RED}"/>
    <rect x="${w * 0.3}" y="${h * 0.58}" width="${w * 0.4}" height="${h * 0.035}" rx="8" fill="${INK}" opacity="0.45"/>
    <rect x="${w * 0.36}" y="${h * 0.64}" width="${w * 0.28}" height="${h * 0.03}" rx="8" fill="${INK}" opacity="0.25"/>`;

  return svg(w, h, body);
}

/* -------------------------------------------------------------------------- */
/* Escrita                                                                   */
/* -------------------------------------------------------------------------- */

const written = [];

for (let i = 0; i < 22; i += 1) {
  const name = `cap-${String(i + 1).padStart(2, '0')}.svg`;
  writeFileSync(resolve(OUT_DIR, name), cover(i));
  written.push(name);
}

const avatars = [
  ['ON', GREEN],
  ['MD', INK],
  ['CR', RED],
  ['RP', '#0F766E'],
];

avatars.forEach(([initials, color], index) => {
  const name = `avatar-${['redacao', 'marcos', 'cleide', 'rafael'][index]}.svg`;
  writeFileSync(resolve(OUT_DIR, name), avatar(initials, color));
  written.push(name);
});

for (let i = 0; i < 4; i += 1) {
  const name = `ad-0${i + 1}.svg`;
  writeFileSync(resolve(OUT_DIR, name), ad(i));
  written.push(name);
}

writeFileSync(resolve(OUT_DIR, 'submission-01.svg'), submission());
written.push('submission-01.svg');

console.log(`${written.length} imagens geradas em public/covers/`);
