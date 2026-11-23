#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

import { fileURLToPath } from 'url';
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const erros = [];
const avisos = [];
let ok = 0;

function pass(msg) { console.log(`  OK  ${msg}`); ok++; }
function fail(msg) { console.error(`  FALHA  ${msg}`); erros.push(msg); }
function warn(msg) { console.warn(`  AVISO  ${msg}`); avisos.push(msg); }

function listarArquivos(dir, exts = []) {
  const resultado = [];
  if (!fs.existsSync(dir)) return resultado;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) resultado.push(...listarArquivos(full, exts));
    else if (exts.length === 0 || exts.some(e => ent.name.endsWith(e)))
      resultado.push(full);
  }
  return resultado;
}

console.log('\n=== 1. Arquivos Obrigatorios ===');
const obrigatorios = [
  'package.json', 'vercel.json', '.env.example', '.gitignore',
  'firestore.rules', 'server.js', 'api/index.js',
  'src/app.js', 'src/config/firebase.js', 'src/config/catalogo.js',
  'src/middleware/errors.js', 'src/middleware/auth.js', 'src/middleware/rateLimit.js',
  'src/services/produtos.service.js', 'src/services/pedidos.service.js',
  'src/controllers/produtos.controller.js', 'src/controllers/pedidos.controller.js',
  'src/routes/index.js', 'src/routes/produtos.routes.js', 'src/routes/pedidos.routes.js',
  'public/css/tokens.css', 'public/css/base.css', 'public/css/layout.css',
  'public/css/components.css', 'public/css/store.css', 'public/css/legal.css', 'public/css/admin.css',
  'public/js/config.js', 'public/js/catalog.js', 'public/js/cart.js',
  'public/js/whatsapp.js', 'public/js/consent.js', 'public/js/main.js',
  'public/js/store-data.js', 'public/js/catalog-view.js', 'public/js/cart-view.js',
  'public/js/contact.js', 'public/js/admin/admin.js',
  'public/js/lib/dom.js', 'public/js/lib/firebase.js',
  'public/index.html', 'public/admin/index.html', 'public/404.html',
  'public/privacidade.html', 'public/termos.html', 'public/reembolso.html',
  'public/img/placeholder.svg', 'public/favicon.svg', 'public/robots.txt',
];
for (const f of obrigatorios) {
  if (fs.existsSync(path.join(ROOT, f))) pass(f);
  else fail(`Arquivo ausente: ${f}`);
}

console.log('\n=== 2. Verificacao de Emojis (RF18) ===');
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F1FF}\u{FE00}-\u{FE0F}]/u;
const arquivosTexto = listarArquivos(ROOT, ['.html','.css','.js','.mjs','.json','.md','.txt','.rules'])
  .filter(f => !f.includes('node_modules') && !f.includes('.git'));

let totalEmoji = 0;
for (const f of arquivosTexto) {
  const conteudo = fs.readFileSync(f, 'utf8');
  const linhas = conteudo.split('\n');
  for (let i = 0; i < linhas.length; i++) {
    if (EMOJI_RE.test(linhas[i])) {
      fail(`Emoji na linha ${i+1} de ${path.relative(ROOT,f)}: ${linhas[i].trim().slice(0,80)}`);
      totalEmoji++;
    }
  }
}
if (totalEmoji === 0) pass('Nenhum emoji encontrado em ' + arquivosTexto.length + ' arquivos');

console.log('\n=== 3. Placeholders Legais ===');
const placeholders = ['[PREENCHER]'];
const pagesHTML = listarArquivos(path.join(ROOT,'public'), ['.html']);
for (const f of pagesHTML) {
  const c = fs.readFileSync(f,'utf8');
  const found = placeholders.filter(p => c.includes(p));
  if (found.length) warn(`${path.relative(ROOT,f)} tem ${found.length} placeholder(s) a preencher: ${found.join(', ')}`);
}
pass('Verificacao de placeholders concluida (avisos sao esperados ate o proprietario preencher)');

console.log('\n=== 4. Tokens de Cores ===');
const tokens = fs.readFileSync(path.join(ROOT,'public/css/tokens.css'),'utf8');
const coresObrig = { '--bg':'#0a0a0a', '--surface':'#141414', '--border':'#262626', '--accent':'#76ff03' };
for (const [token, hex] of Object.entries(coresObrig)) {
  if (tokens.includes(token) && tokens.toLowerCase().includes(hex)) pass(`${token}: ${hex}`);
  else fail(`Token ${token} com valor ${hex} nao encontrado em tokens.css`);
}

console.log('\n=== 5. Contraste WCAG AA (verificacao estatica) ===');
function lin(c) { const v=c/255; return v<=0.04045 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }
function lum([r,g,b]) { return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b); }
function contraste(l1,l2) { const [a,b]=[Math.max(l1,l2),Math.min(l1,l2)]; return (a+0.05)/(b+0.05); }
const pares = [
  { nome:'verde neon #76FF03 sobre preto #0A0A0A', c1:[118,255,3], c2:[10,10,10] },
  { nome:'preto #0A0A0A sobre verde neon #76FF03 (botao)', c1:[10,10,10], c2:[118,255,3] },
  { nome:'branco #FFFFFF sobre preto #0A0A0A', c1:[255,255,255], c2:[10,10,10] },
  { nome:'cinza #D1D5DB sobre preto #0A0A0A', c1:[209,213,219], c2:[10,10,10] },
];
for (const { nome, c1, c2 } of pares) {
  const ratio = contraste(lum(c1), lum(c2));
  if (ratio >= 4.5) pass(`${nome} -> ${ratio.toFixed(2)}:1 (WCAG AA OK)`);
  else fail(`${nome} -> ${ratio.toFixed(2)}:1 (abaixo de 4.5:1!)`);
}

console.log('\n=== 6. robots.txt ===');
const robots = fs.readFileSync(path.join(ROOT,'public/robots.txt'),'utf8');
if (robots.includes('Disallow: /admin')) pass('Admin bloqueado no robots.txt');
else fail('robots.txt nao bloqueia /admin');
if (robots.includes('Disallow: /api')) pass('API bloqueada no robots.txt');
else fail('robots.txt nao bloqueia /api');

console.log('\n=== RESUMO ===');
console.log(`  Verificacoes OK:    ${ok}`);
console.log(`  Erros:              ${erros.length}`);
console.log(`  Avisos:             ${avisos.length}`);
if (erros.length === 0) {
  console.log('\n  PROJETO APROVADO - Nenhum erro critico encontrado.\n');
  process.exit(0);
} else {
  console.error('\n  PROJETO COM ERROS - Corrija antes de publicar.\n');
  process.exit(1);
}
