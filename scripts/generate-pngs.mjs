/**
 * scripts/generate-pngs.mjs
 * -----------------------------------------------------------------------------
 * Gera versões PNG das artes geometricas de Nioaque para download.
 * Produz:
 *  - 1200x675px (16:9, padrão editorial)
 *  - 1080x1080px (Instagram quadrado)
 *
 * Requer: npm install sharp --save-dev
 */

import sharp from 'sharp';
import { readFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const BASE = join(process.cwd(), 'public', 'artes-nioarquense');
const OUT_PNG = join(process.cwd(), 'public', 'artes-nioarquense', 'png');

const SIZES = [
  { name: '1200x675', width: 1200, height: 675 },
  { name: '1080x1080', width: 1080, height: 1080 },
];

mkdirSync(OUT_PNG, { recursive: true });

const svgs = readdirSync(BASE).filter((f) => f.endsWith('.svg'));

console.log(`\nGerando PNGs para ${svgs.length} SVGs...\n`);

for (const svgFile of svgs) {
  const svgPath = join(BASE, svgFile);
  const svgContent = readFileSync(svgPath, 'utf8');
  const baseName = basename(svgFile, '.svg');

  for (const size of SIZES) {
    const outName = `${baseName}-${size.name}.png`;
    const outPath = join(OUT_PNG, outName);

    try {
      await sharp(Buffer.from(svgContent), { density: 150 })
        .resize(size.width, size.height, { fit: 'cover', background: { r: 250, g: 249, b: 246, alpha: 1 } })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log(`  OK: ${outName}`);
    } catch (err) {
      console.error(`  ERRO: ${outName}: ${err.message}`);
    }
  }
}

console.log(`\nConcluído! PNGs em: ${OUT_PNG}`);