import fs from 'node:fs';

const file = process.argv[2];
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

lines.forEach((line, index) => {
  const singleQuotes = (line.match(/'/g) || []).length;
  const backticks = (line.match(/`/g) || []).length;

  // String delimitada por apostrofo com conteudo ímpar de apostrofos = nao fechada
  if (singleQuotes % 2 === 1 && backticks % 2 === 0) {
    console.log(`${index + 1}: [${singleQuotes}] ${line.trim()}`);
  }
});
