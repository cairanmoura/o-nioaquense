/**
 * scripts/generate-icons.mjs
 * -----------------------------------------------------------------------------
 * Gera os icones PNG do PWA a partir do logo SVG (bandeira de Nioaque).
 *
 * Saida em public/icons/:
 *   - icon-192.png / icon-512.png  : icones "any" (fundo branco)
 *   - icon-maskable-512.png        : icone maskable (fundo verde, area segura)
 *   - apple-touch-icon.png         : icone iOS
 *
 * Uso: node scripts/generate-icons.mjs
 */

import { Buffer } from 'node:buffer';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'public', 'icons');

mkdirSync(OUT_DIR, { recursive: true });

const GREEN = '#008026';
const RED = '#E60000';
const WHITE = '#FFFFFF';

/**
 * Marca (cruz latina sobre as faixas) centralizada.
 * `padding` e a margem segura em torno do simbolo (0.12 = 12% de cada lado).
 */
function markSvg({ size, padding, background, symbolColor = RED, bandColors = true }) {
  const inner = size * (1 - padding * 2);
  const offset = size * padding;

  // Faixas horizontais (verde / branca / vermelha)
  const bandHeight = inner * 0.18;
  const whiteHeight = inner * 0.64;

  // Cruz latina
  const barWidth = inner * 0.09;
  const barHeight = inner * 0.44;
  const armWidth = inner * 0.26;
  const armHeight = inner * 0.09;

  const centerX = offset + inner / 2;
  const centerY = offset + inner / 2;

  const bands = bandColors
    ? `<rect x="${offset}" y="${offset}" width="${inner}" height="${bandHeight}" fill="${GREEN}"/>
       <rect x="${offset}" y="${offset + bandHeight}" width="${inner}" height="${whiteHeight}" fill="${WHITE}"/>
       <rect x="${offset}" y="${offset + bandHeight + whiteHeight}" width="${inner}" height="${bandHeight}" fill="${RED}"/>`
    : `<rect x="${offset}" y="${offset}" width="${inner}" height="${inner}" fill="${WHITE}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  ${bands}
  <g fill="${symbolColor}">
    <rect x="${centerX - barWidth / 2}" y="${centerY - barHeight / 2}" width="${barWidth}" height="${barHeight}"/>
    <rect x="${centerX - armWidth / 2}" y="${centerY - barHeight / 2 + barHeight * 0.2}" width="${armWidth}" height="${armHeight}"/>
  </g>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0.16, background: WHITE },
  { file: 'icon-512.png', size: 512, padding: 0.16, background: WHITE },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.22, background: GREEN, bandColors: false },
  { file: 'apple-touch-icon.png', size: 180, padding: 0.14, background: WHITE },
];

for (const target of targets) {
  const svg = markSvg({
    size: target.size,
    padding: target.padding,
    background: target.background,
    bandColors: target.bandColors !== false,
  });

  const buffer = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

  writeFileSync(resolve(OUT_DIR, target.file), buffer);
  console.log(`${target.file} (${target.size}x${target.size})`);
}

// Favicon ICO-like: PNG 32 para o /favicon.ico
const favicon = await sharp(Buffer.from(markSvg({ size: 32, padding: 0.08, background: WHITE })))
  .png()
  .toBuffer();

writeFileSync(resolve(ROOT, 'public', 'favicon-32.png'), favicon);
console.log('favicon-32.png (32x32)');
