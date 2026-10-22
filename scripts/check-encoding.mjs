import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync(
  'git',
  ['ls-files', 'src', 'supabase', 'scripts', 'public', '*.md', '*.toml'],
  { encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean)
  // o proprio script de checagem contem os padroes que procura
  .filter((file) => !file.endsWith('check-encoding.mjs'));

const MOJIBAKE = /Ã[-¿]|â€|Â[^\s]|ï¿½/;
const broken = [];

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  if (MOJIBAKE.test(text)) {
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (MOJIBAKE.test(line)) broken.push(`${file}:${index + 1}: ${line.trim().slice(0, 100)}`);
    });
  }
}

console.log(broken.length ? `ARQUIVOS COM ENCODING CORROMPIDO (${broken.length} linhas):` : 'OK: nenhum mojibake');
for (const line of broken.slice(0, 40)) console.log('  ' + line);
if (broken.length > 40) console.log(`  ... e mais ${broken.length - 40}`);
