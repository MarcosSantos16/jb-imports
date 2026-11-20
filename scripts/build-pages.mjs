// Monta as paginas HTML finais (public/*.html) a partir de src/templates.
// Existe para que cabecalho, rodape (dados da empresa) e banner de cookies
// fiquem em UM lugar e apareçam identicos em todas as paginas.
//
// Uso: npm run build
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const modelos = join(raiz, 'src', 'templates');
const publico = join(raiz, 'public');

const parciais = Object.fromEntries(
  readdirSync(join(modelos, 'partials')).map((f) => [
    f.replace(/\.html$/, ''),
    readFileSync(join(modelos, 'partials', f), 'utf8'),
  ])
);
const layout = readFileSync(join(modelos, 'layout.html'), 'utf8');
const ano = String(new Date().getFullYear());

const CSS_BASE = ['/css/tokens.css', '/css/base.css', '/css/layout.css', '/css/components.css'];

function parcial(nome, arquivo) {
  if (!(nome in parciais)) throw new Error(`${arquivo}: parcial "${nome}" nao existe em src/templates/partials`);
  return parciais[nome];
}

let total = 0;
for (const arquivo of readdirSync(join(modelos, 'pages'))) {
  const fonte = readFileSync(join(modelos, 'pages', arquivo), 'utf8');
  const m = fonte.match(/^<!--meta (\{.*\}) -->\s*/);
  if (!m) throw new Error(`${arquivo}: linha <!--meta {...} --> ausente no topo`);

  const meta = {
    robots: 'index,follow',
    header: 'header-simple',
    extra: '',
    bodyClass: '',
    css: [],
    scripts: [],
    ...JSON.parse(m[1]),
  };

  const variaveis = {
    title: meta.title,
    description: meta.description,
    robots: meta.robots,
    bodyClass: meta.bodyClass,
    year: ano,
    content: fonte.slice(m[0].length),
    cssLinks: [...CSS_BASE, ...meta.css, '/css/motion.css'].map((h) => `<link rel="stylesheet" href="${h}">`).join('\n'),
    scriptTags: meta.scripts.map((s) => `<script type="module" src="${s}"></script>`).join('\n'),
  };

  let html = layout
    .replace(/\{\{@header\}\}/g, () => parcial(meta.header, arquivo))
    .replace(/\{\{@extra\}\}/g, () => (meta.extra ? parcial(meta.extra, arquivo) : ''))
    .replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, nome) => parcial(nome, arquivo))
    .replace(/\{\{(\w+)\}\}/g, (_, chave) => {
      if (!(chave in variaveis)) throw new Error(`${arquivo}: variavel {{${chave}}} desconhecida`);
      return variaveis[chave];
    });

  const destino = join(publico, meta.out);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, html);
  total += 1;
  console.log(`  gerado: public/${meta.out}`);
}
console.log(`Build concluido: ${total} paginas.`);
