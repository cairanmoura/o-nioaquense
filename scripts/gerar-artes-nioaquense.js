/**
 * scripts/gerar-artes-nioaquense.js
 * -----------------------------------------------------------------------------
 * Gera as artes geometricas de Nioaque em SVG (16:9, 1200x675)
 * Usando a paleta oficial:
 *  - Verde Nioaque: #008026
 *  - Vermelho Nioaque: #E60000
 *  - Fundo editorial: #FAF9F6
 *  - Texto chumbo: #1E293B
 *  - Branco: #FFFFFF
 *
 * Copia as capas existentes e cria 8 novas variacoes editoriais.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

const BASE = join(process.cwd(), 'public', 'artes-nioarquense');
const COVERS = join(process.cwd(), 'public', 'covers');

const GREEN = '#008026';
const RED = '#E60000';
const CREAM = '#FAF9F6';
const INK = '#1E293B';
const WHITE = '#FFFFFF';

function svgHeader() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" role="img">`;
}

function svgFooter() {
  return `</svg>`;
}

function logoMini(x, y, scale = 0.34) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="0" y="0" width="100" height="18" fill="${GREEN}"/>
    <rect x="0" y="18" width="100" height="64" fill="${WHITE}"/>
    <rect x="0" y="82" width="100" height="18" fill="${RED}"/>
    <rect x="26" y="28" width="8" height="44" fill="${RED}"/>
    <rect x="18" y="37" width="24" height="8" fill="${RED}"/>
  </g>`;
}

/* -------------------------------------------------------------------------- */
/* 1) Copiar as capas existentes para artes-nioarquense                      */
/* -------------------------------------------------------------------------- */

mkdirSync(BASE, { recursive: true });

const capaFiles = readdirSync(COVERS).filter((f) => f.startsWith('cap-') && f.endsWith('.svg'));

for (const f of capaFiles) {
  copyFileSync(join(COVERS, f), join(BASE, f));
  console.log(`Copiado: ${f}`);
}

/* -------------------------------------------------------------------------- */
/* 2) Criar 8 novas variacoes editoriais                                     */
/* -------------------------------------------------------------------------- */

function createSvg(name, content) {
  const path = join(BASE, `${name}.svg`);
  writeFileSync(path, svgHeader() + content + svgFooter());
  console.log(`Criado: ${name}.svg`);
}

/* A - Camara / Politica */
createSvg('arte-camara-politica', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${GREEN}"/>
  <rect y="567" width="1200" height="108" fill="${RED}"/>
  <rect x="300" y="198" width="300" height="270" rx="24" fill="${WHITE}"/>
  <circle cx="900" cy="338" r="120" fill="${GREEN}" opacity="0.14"/>
  <rect x="450" y="460" width="300" height="40" rx="8" fill="${INK}" opacity="0.85"/>
  <rect x="450" y="520" width="180" height="28" rx="8" fill="${INK}" opacity="0.4"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* B - Prefeitura / Obras */
createSvg('arte-prefeitura-obras', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${INK}"/>
  <rect y="567" width="1200" height="108" fill="${RED}"/>
  <circle cx="850" cy="338" r="140" fill="${GREEN}" opacity="0.12"/>
  <rect x="240" y="210" width="400" height="30" rx="6" fill="${WHITE}"/>
  <rect x="240" y="260" width="280" height="24" rx="6" fill="${WHITE}" opacity="0.85"/>
  <rect x="240" y="304" width="200" height="20" rx="6" fill="${WHITE}" opacity="0.6"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* C - Agro / Campo */
createSvg('arte-agro-campo', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${GREEN}"/>
  <rect y="567" width="1200" height="108" fill="${RED}"/>
  <path d="M300 200 Q450 100 600 200 T900 200" fill="none" stroke="${GREEN}" stroke-width="12" opacity="0.3"/>
  <path d="M300 500 Q450 600 600 500 T900 500" fill="none" stroke="${RED}" stroke-width="12" opacity="0.3"/>
  <rect x="480" y="280" width="240" height="115" rx="16" fill="${WHITE}"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* D - Seguranca / Plantao */
createSvg('arte-seguranca-plantao', `
  <rect width="1200" height="675" fill="${INK}"/>
  <rect width="1200" height="108" fill="${RED}"/>
  <rect y="567" width="1200" height="108" fill="${GREEN}"/>
  <rect x="300" y="180" width="600" height="180" rx="24" fill="${RED}" opacity="0.15"/>
  <circle cx="600" cy="270" r="90" fill="${RED}" opacity="0.4"/>
  <rect x="400" y="420" width="400" height="40" rx="8" fill="${WHITE}"/>
  <rect x="400" y="480" width="240" height="28" rx="8" fill="${WHITE}" opacity="0.85"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* E - Saude */
createSvg('arte-saude', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${RED}"/>
  <rect y="567" width="1200" height="108" fill="${GREEN}"/>
  <path d="M200 200 L400 200 L400 400 L600 400 L600 200 L800 200 L800 400 L1000 400" fill="none" stroke="${RED}" stroke-width="16" stroke-linecap="round"/>
  <circle cx="600" cy="338" r="130" fill="${RED}" opacity="0.12"/>
  <rect x="380" y="470" width="440" height="40" rx="8" fill="${WHITE}"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* F - Educacao */
createSvg('arte-educacao', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${GREEN}"/>
  <rect y="567" width="1200" height="108" fill="${RED}"/>
  <rect x="180" y="180" width="240" height="270" rx="12" fill="${GREEN}" opacity="0.15"/>
  <rect x="440" y="180" width="240" height="270" rx="12" fill="${RED}" opacity="0.15"/>
  <rect x="700" y="180" width="240" height="270" rx="12" fill="${INK}" opacity="0.1"/>
  <rect x="480" y="440" width="240" height="32" rx="6" fill="${WHITE}"/>
  <rect x="480" y="490" width="160" height="24" rx="6" fill="${WHITE}" opacity="0.85"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* G - Esporte */
createSvg('arte-esporte', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${RED}"/>
  <rect y="567" width="1200" height="108" fill="${GREEN}"/>
  <circle cx="300" cy="338" r="60" fill="${GREEN}" opacity="0.9"/>
  <circle cx="300" cy="338" r="12" fill="${WHITE}"/>
  <rect x="400" y="150" width="400" height="300" rx="24" fill="${WHITE}"/>
  <path d="M400 300 Q600 150 800 300" fill="none" stroke="${GREEN}" stroke-width="8" opacity="0.3"/>
  <rect x="540" y="460" width="120" height="32" rx="8" fill="${INK}" opacity="0.85"/>
  ${logoMini(1080, 604, 0.34)}
`);

/* H - Cultura / 9º GAC */
createSvg('arte-cultura-9gac', `
  <rect width="1200" height="675" fill="${CREAM}"/>
  <rect width="1200" height="108" fill="${INK}"/>
  <rect y="567" width="1200" height="108" fill="${RED}"/>
  <rect x="200" y="220" width="140" height="140" rx="8" fill="${GREEN}" opacity="0.9"/>
  <rect x="360" y="220" width="140" height="140" rx="8" fill="${WHITE}"/>
  <rect x="520" y="220" width="140" height="140" rx="8" fill="${RED}" opacity="0.9"/>
  <rect x="680" y="220" width="140" height="140" rx="8" fill="${WHITE}"/>
  <rect x="840" y="220" width="140" height="140" rx="8" fill="${GREEN}" opacity="0.9"/>
  <rect x="480" y="430" width="240" height="36" rx="6" fill="${RED}" opacity="0.85"/>
  ${logoMini(1080, 604, 0.34)}
`);