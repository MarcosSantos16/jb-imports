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

const SITE_URL = (process.env.SITE_URL || 'https://jb-imports-pi.vercel.app').replace(/\/$/, '');
const OG_IMAGEM = `${SITE_URL}/img/og-jb-imports.jpg`;
const SITE_ID = `${SITE_URL}/#site`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function dadosEstruturados(meta, url) {
  const contexto = 'https://schema.org';
  const site = { '@type': 'WebSite', '@id': SITE_ID, url: `${SITE_URL}/`, name: 'JB Imports', inLanguage: 'pt-BR' };
  const pagina = { '@type': 'WebPage', '@id': `${url}#pagina`, url, name: meta.title, description: meta.description, inLanguage: 'pt-BR', isPartOf: { '@id': SITE_ID } };
  if (meta.out !== 'index.html') return { '@context': contexto, '@graph': [site, pagina] };
  const loja = {
    '@type': 'ElectronicsStore',
    '@id': `${SITE_URL}/#loja`,
    name: 'JB Imports',
    url: `${SITE_URL}/`,
    description: meta.description,
    image: OG_IMAGEM,
    telephone: '+55 81 98454-3444',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rua do Atlântico, 69',
      addressLocality: 'Recife',
      addressRegion: 'PE',
      addressCountry: 'BR',
    },
    areaServed: { '@type': 'City', name: 'Recife' },
  };
  return { '@context': contexto, '@graph': [site, pagina, loja] };
}

function tagsSeo(meta) {
  if (meta.robots.includes('noindex')) return '';
  const url = meta.out === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${meta.out}`;
  const linhas = [
    `<link rel="canonical" href="${url}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="JB Imports">',
    '<meta property="og:locale" content="pt_BR">',
    `<meta property="og:title" content="${esc(meta.title)}">`,
    `<meta property="og:description" content="${esc(meta.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${OG_IMAGEM}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="JB Imports: iPhones, peças e acessórios em Boa Viagem, Recife">',
    '<meta name="twitter:card" content="summary_large_image">',
    `<meta name="twitter:title" content="${esc(meta.title)}">`,
    `<meta name="twitter:description" content="${esc(meta.description)}">`,
    `<meta name="twitter:image" content="${OG_IMAGEM}">`,
    `<script type="application/ld+json">${JSON.stringify(dadosEstruturados(meta, url))}</script>`,
  ];
  return linhas.join('\n');
}

function parcial(nome, arquivo) {
  if (!(nome in parciais)) throw new Error(`${arquivo}: parcial "${nome}" nao existe em src/templates/partials`);
  return parciais[nome];
}

let total = 0;
const indexaveis = [];
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
    seo: tagsSeo(meta),
  };
  if (!meta.robots.includes('noindex')) indexaveis.push(meta.out);

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
const hoje = new Date().toISOString().slice(0, 10);
const urls = indexaveis.map((out) => `  <url><loc>${out === 'index.html' ? `${SITE_URL}/` : `${SITE_URL}/${out}`}</loc><lastmod>${hoje}</lastmod></url>`);
writeFileSync(join(publico, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
console.log('  gerado: public/sitemap.xml');
console.log(`Build concluido: ${total} paginas.`);
