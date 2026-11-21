// Painel administrativo: login (Firebase Auth), lista de produtos em tempo real
// (onSnapshot) e operacoes de escrita pela API Node.js (/api/admin/*).
import { h, icon, announce } from '../lib/dom.js';
import { firebaseReady, getApp, loadAuth, loadFirestore } from '../lib/firebase.js';
import {
  CATEGORIAS, CONDICAO_LABEL, disponibilidade, formatBRL, categoriaNome,
} from '../catalog.js';
import { formatarTelefone } from '../whatsapp.js';
import { CLOUDINARY } from '../config.js';

const $ = (id) => document.getElementById(id);
const DISP_TEXTO = { 'em-estoque': 'Em estoque', 'ultimas-unidades': 'Últimas unidades', esgotado: 'Esgotado' };
const STATUS_TEXTO = { reservado: 'Reservado', concluido: 'Concluído', cancelado: 'Cancelado' };

let auth;
let authFns;
let cancelarProdutos = () => {};
const produtos = new Map();
const linhas = new Map();
let editandoId = null;

// ---------- utilidades ----------
function mensagem(texto, tipo = 'ok') {
  const el = $('toast');
  el.hidden = false;
  el.className = `notice notice--${tipo}`;
  el.textContent = texto;
  announce(texto);
  clearTimeout(mensagem.t);
  mensagem.t = setTimeout(() => { el.hidden = true; }, 6000);
}

async function api(caminho, { metodo = 'GET', corpo } = {}) {
  const token = await auth.currentUser.getIdToken();
  const resp = await fetch(`/api/admin${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.status === 204) return null;
  const dados = await resp.json().catch(() => null);
  if (!resp.ok) {
    const erro = (dados && dados.erro) || {};
    const detalhes = Array.isArray(erro.detalhes) ? ` ${erro.detalhes.join(' ')}` : '';
    throw new Error((erro.mensagem || 'Erro ao falar com o servidor.') + detalhes);
  }
  return dados;
}

function parsePreco(texto) {
  const limpo = String(texto).trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(limpo);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : NaN;
}

const centavosParaCampo = (c) => (c / 100).toFixed(2).replace('.', ',');

// ---------- login ----------
// Traduz o codigo do Firebase em uma causa concreta, para o administrador saber o que corrigir.
function mensagemDeLogin(codigo) {
  const mapa = {
    'auth/operation-not-allowed': 'O login por e-mail e senha não está ativado. No Firebase, vá em Authentication > Sign-in method e ative "E-mail/senha".',
    'auth/invalid-email': 'O formato do e-mail é inválido.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
    'auth/network-request-failed': 'Sem conexão com o Firebase. Verifique a internet.',
    'auth/user-disabled': 'Esta conta de acesso foi desativada no Firebase.',
    'auth/invalid-api-key': 'A chave do Firebase em public/js/config.js está incorreta.',
    'auth/user-not-found': 'Não existe conta com este e-mail no Firebase (Authentication > Users).',
    'auth/wrong-password': 'Senha incorreta. Use "Redefinir senha" no Firebase se necessário.',
    'auth/invalid-credential': 'E-mail ou senha incorretos, ou a conta não existe neste projeto Firebase.',
  };
  return mapa[codigo] || `Não foi possível entrar (${codigo || 'erro desconhecido'}).`;
}

function marcar(campo, msg) {
  campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
  $(`${campo.id}-error`).textContent = msg || '';
  return !msg;
}

async function iniciarAuth() {
  if (!firebaseReady()) {
    const erro = $('login-error');
    erro.hidden = false;
    erro.textContent = 'Firebase não configurado. Preencha public/js/config.js (veja o guia de montagem).';
    $('login-submit').disabled = true;
    return;
  }
  const [app, fns] = await Promise.all([getApp(), loadAuth()]);
  authFns = fns;
  auth = fns.getAuth(app);
  fns.onAuthStateChanged(auth, aoMudarSessao);
}

async function aoMudarSessao(usuario) {
  if (!usuario) {
    cancelarProdutos();
    $('login-view').hidden = false;
    $('panel-view').hidden = true;
    $('logout').hidden = true;
    return;
  }
  try {
    await api('/me');
  } catch (e) {
    const uid = usuario.uid;
    await authFns.signOut(auth);
    const erro = $('login-error');
    erro.hidden = false;
    erro.textContent = /permiss/i.test(e.message)
      ? `Conta entrou, mas não é administrador. No Firestore, crie o documento admins/${uid} com o campo ativo = true.`
      : `${e.message} (Se o problema continuar, confira se o servidor está rodando com o .env preenchido.)`;
    erro.focus();
    return;
  }
  $('login-view').hidden = true;
  $('panel-view').hidden = false;
  $('logout').hidden = false;
  $('admin-user').textContent = `Conectado como ${usuario.email}`;
  assinarProdutos();
}

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('login-email');
  const senha = $('login-password');
  const ok = $('login-consent');
  const falhas = [
    [email, /^\S+@\S+\.\S+$/.test(email.value.trim()) ? '' : 'Informe um e-mail válido.'],
    [senha, senha.value ? '' : 'Informe a senha.'],
    [ok, ok.checked ? '' : 'Marque a ciência da Política de Privacidade para continuar.'],
  ].filter(([campo, msg]) => !marcar(campo, msg));
  if (falhas.length) { falhas[0][0].focus(); return; }

  const erro = $('login-error');
  erro.hidden = true;
  $('login-submit').disabled = true;
  try {
    await authFns.signInWithEmailAndPassword(auth, email.value.trim(), senha.value);
    senha.value = '';
  } catch (err) {
    const limite = err.code === 'auth/too-many-requests';
    erro.hidden = false;
    erro.textContent = mensagemDeLogin(err.code);
    erro.focus();
  } finally {
    $('login-submit').disabled = false;
  }
});

$('logout').addEventListener('click', () => authFns.signOut(auth));

// ---------- abas ----------
function mostrarAba(nome) {
  const produtosAtivos = nome === 'produtos';
  $('products-view').hidden = !produtosAtivos;
  $('orders-view').hidden = produtosAtivos;
  $('tab-products').setAttribute('aria-pressed', String(produtosAtivos));
  $('tab-orders').setAttribute('aria-pressed', String(!produtosAtivos));
  if (!produtosAtivos) carregarPedidos();
}
$('tab-products').addEventListener('click', () => mostrarAba('produtos'));
$('tab-orders').addEventListener('click', () => mostrarAba('pedidos'));

// ---------- produtos em tempo real ----------
async function assinarProdutos() {
  cancelarProdutos();
  const [app, fs] = await Promise.all([getApp(), loadFirestore()]);
  const db = fs.getFirestore(app);
  cancelarProdutos = fs.onSnapshot(
    fs.collection(db, 'produtos'),
    (snap) => {
      produtos.clear();
      snap.docs.forEach((d) => produtos.set(d.id, { id: d.id, ...d.data() }));
      renderizarProdutos();
    },
    () => mensagem('Não foi possível ler os produtos. Confira as regras do Firestore e se sua conta está em "admins".', 'error')
  );
}

async function acao(botao, fn, sucesso) {
  botao.disabled = true;
  try {
    await fn();
    if (sucesso) mensagem(sucesso);
  } catch (e) {
    mensagem(e.message, 'error');
  } finally {
    botao.disabled = false;
  }
}

function criarLinha(id) {
  const ref = {
    nome: h('strong', {}),
    meta: h('span', { class: 'table__sub' }),
    preco: h('td', {}),
    qtd: h('span', { class: 'qty__value' }),
    situacao: h('span', { class: 'stock' }, h('span', { class: 'stock__dot', 'aria-hidden': 'true' }), h('span', { class: 'stock__text' })),
    ativo: h('input', { type: 'checkbox' }),
    ativoLabel: h('label', {}),
    menos: h('button', { type: 'button', class: 'icon-btn icon-btn--sm' }, icon('minus')),
    mais: h('button', { type: 'button', class: 'icon-btn icon-btn--sm' }, icon('plus')),
    editar: h('button', { type: 'button', class: 'icon-btn icon-btn--sm' }, icon('edit')),
    excluir: h('button', { type: 'button', class: 'icon-btn icon-btn--sm icon-btn--danger' }, icon('trash')),
  };
  const idAtivo = `ativo-${id}`;
  ref.ativo.id = idAtivo;
  ref.ativoLabel.setAttribute('for', idAtivo);

  ref.menos.addEventListener('click', () => acao(ref.menos, () => api(`/produtos/${id}/estoque`, { metodo: 'PATCH', corpo: { delta: -1 } })));
  ref.mais.addEventListener('click', () => acao(ref.mais, () => api(`/produtos/${id}/estoque`, { metodo: 'PATCH', corpo: { delta: 1 } })));
  ref.ativo.addEventListener('change', () => {
    const marcado = ref.ativo.checked;
    acao(ref.ativo, () => api(`/produtos/${id}`, { metodo: 'PATCH', corpo: { ativo: marcado } }),
      marcado ? 'Produto visível na loja.' : 'Produto oculto da loja.');
  });
  ref.editar.addEventListener('click', () => abrirFormulario(id));
  ref.excluir.addEventListener('click', () => {
    const p = produtos.get(id);
    if (!window.confirm(`Excluir "${p ? p.nome : 'produto'}" definitivamente? Esta ação não pode ser desfeita.`)) return;
    acao(ref.excluir, () => api(`/produtos/${id}`, { metodo: 'DELETE' }), 'Produto excluído.');
  });

  ref.el = h('tr', { dataset: { id } },
    h('th', { scope: 'row', class: 'table__name' }, ref.nome, ref.meta),
    ref.preco,
    h('td', {}, h('div', { class: 'qty', role: 'group' }, ref.menos, ref.qtd, ref.mais)),
    h('td', {}, ref.situacao),
    h('td', {}, h('div', { class: 'check check--compact' }, ref.ativo, ref.ativoLabel)),
    h('td', {}, h('div', { class: 'row-actions' }, ref.editar, ref.excluir)));
  return ref;
}

function preencherLinha(ref, p) {
  const estoque = Number.isInteger(p.estoque) ? p.estoque : 0;
  const disp = disponibilidade(estoque);
  ref.nome.textContent = p.nome;
  ref.meta.textContent = `${categoriaNome(p.categoriaId)} - ${CONDICAO_LABEL[p.condicao] || p.condicao}`;
  ref.preco.textContent = formatBRL(p.precoCentavos);
  ref.qtd.textContent = String(estoque);
  ref.situacao.dataset.estado = disp;
  ref.situacao.lastChild.textContent = DISP_TEXTO[disp];
  ref.ativo.checked = p.ativo === true;
  ref.ativoLabel.textContent = p.ativo === true ? 'Visível' : 'Oculto';
  ref.menos.setAttribute('aria-label', `Diminuir estoque de ${p.nome}`);
  ref.mais.setAttribute('aria-label', `Aumentar estoque de ${p.nome}`);
  ref.editar.setAttribute('aria-label', `Editar ${p.nome}`);
  ref.excluir.setAttribute('aria-label', `Excluir ${p.nome}`);
  ref.menos.disabled = estoque <= 0;
}

function renderizarProdutos() {
  const lista = [...produtos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const corpo = $('products-body');
  let anterior = null;
  lista.forEach((p) => {
    let ref = linhas.get(p.id);
    if (!ref) { ref = criarLinha(p.id); linhas.set(p.id, ref); }
    preencherLinha(ref, p);
    const alvo = anterior ? anterior.nextSibling : corpo.firstChild;
    if (ref.el !== alvo) corpo.insertBefore(ref.el, alvo);
    anterior = ref.el;
  });
  for (const [id, ref] of linhas) {
    if (!produtos.has(id)) { ref.el.remove(); linhas.delete(id); }
  }
  $('products-empty').hidden = lista.length > 0;
  $('products-count').textContent = lista.length ? `(${lista.length})` : '';
}

// ---------- formulario de produto ----------
const dialogoProduto = $('product-dialog');
$('pf-categoria').replaceChildren(...CATEGORIAS.map((c) => h('option', { value: c.id }, c.nome)));

function abrirFormulario(id) {
  editandoId = id || null;
  const p = id ? produtos.get(id) : null;
  $('product-dialog-title').textContent = p ? 'Editar produto' : 'Novo produto';
  $('pf-nome').value = p ? p.nome : '';
  $('pf-categoria').value = p ? p.categoriaId : CATEGORIAS[0].id;
  $('pf-condicao').value = p ? p.condicao : 'novo';
  $('pf-procedencia').value = p ? p.procedencia : 'original';
  $('pf-descricao').value = p ? p.descricao : '';
  $('pf-preco').value = p ? centavosParaCampo(p.precoCentavos) : '';
  $('pf-estoque').value = p ? String(p.estoque) : '0';
  $('pf-garantia').value = p ? String(p.garantiaLojaDias || 0) : '0';
  fotos = p ? fotosDoProduto(p) : [];
  $('pf-alt').value = p ? p.imagemAlt || '' : '';
  $('pf-imagem').value = '';
  statusFoto('');
  escolherOrigem('url');
  desenharGaleria();
  $('pf-ativo').checked = p ? p.ativo === true : true;
  $('pf-error').hidden = true;
  dialogoProduto.showModal();
  $('pf-nome').focus();
}


// ---------- foto do produto: URL ou arquivo do computador ----------
const LIMITE_FOTO = 8 * 1024 * 1024;
let enviandoFoto = false;

const cloudinaryConfigurado = () =>
  !String(CLOUDINARY.cloudName).includes('PREENCHER') && !String(CLOUDINARY.uploadPreset).includes('PREENCHER');

// Galeria do produto: a primeira foto e a principal (vitrine). Limite de MAX_FOTOS.
const MAX_FOTOS = 8;
let fotos = [];

const fotosDoProduto = (p) =>
  Array.isArray(p.imagens) && p.imagens.length ? p.imagens.slice() : (p.imagemUrl ? [p.imagemUrl] : []);

const linkValido = (v) => {
  try { return new URL(v).protocol === 'https:' && v.length <= 500; } catch (e) { return false; }
};

const statusFoto = (texto) => { $('pf-foto-status').textContent = texto; };

// Confere no navegador que o link carrega uma imagem (nao aceita paginas HTML).
function verificarImagem(url) {
  return new Promise((ok) => {
    const img = new Image();
    const limite = setTimeout(() => { img.onload = img.onerror = null; ok(false); }, 10000);
    img.onload = () => { clearTimeout(limite); ok(true); };
    img.onerror = () => { clearTimeout(limite); ok(false); };
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

// Enquanto uma foto esta sendo conferida ou enviada, o produto nao pode ser salvo.
async function comEnvio(fn) {
  enviandoFoto = true;
  $('pf-submit').disabled = true;
  try { return await fn(); } finally {
    enviandoFoto = false;
    $('pf-submit').disabled = false;
  }
}

async function adicionarFoto(url) {
  const v = url.trim();
  if (fotos.length >= MAX_FOTOS) { statusFoto(`Limite de ${MAX_FOTOS} fotos por produto.`); return false; }
  if (!linkValido(v)) { statusFoto('Informe um link https válido de até 500 caracteres.'); return false; }
  if (fotos.includes(v)) { statusFoto('Essa foto já está na lista.'); return false; }
  statusFoto('Conferindo o link...');
  const ok = await verificarImagem(v);
  if (!ok) {
    statusFoto('Este link não carregou uma imagem. Confira se é o endereço direto da foto: ao abrir o link no navegador, deve aparecer só a imagem.');
    return false;
  }
  fotos.push(v);
  desenharGaleria();
  statusFoto('Foto adicionada. Ela será salva ao confirmar o produto.');
  announce('Foto adicionada');
  return true;
}

function botaoFoto(texto, fn) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn--secondary btn--sm';
  b.textContent = texto;
  b.addEventListener('click', fn);
  return b;
}

function desenharGaleria() {
  const lista = $('pf-galeria');
  const nome = $('pf-nome').value.trim() || 'produto';
  $('pf-galeria-resumo').textContent = fotos.length
    ? `${fotos.length} ${fotos.length === 1 ? 'foto' : 'fotos'}. A primeira é a principal.`
    : 'Nenhuma foto cadastrada.';
  lista.replaceChildren(...fotos.map((url, i) => {
    const item = document.createElement('li');
    item.className = 'galeria__item';
    const img = document.createElement('img');
    img.className = 'galeria__img';
    img.src = url;
    img.width = 96;
    img.height = 96;
    img.loading = 'lazy';
    img.alt = `Foto ${i + 1} de ${nome}${i === 0 ? ', principal' : ''}`;
    img.addEventListener('error', () => { img.alt = `Foto ${i + 1} não carrega. Remova e adicione outro link.`; });
    const acoes = document.createElement('div');
    acoes.className = 'galeria__acoes';
    const abrir = document.createElement('a');
    abrir.className = 'btn btn--secondary btn--sm';
    abrir.href = url;
    abrir.target = '_blank';
    abrir.rel = 'noopener noreferrer';
    abrir.textContent = 'Abrir foto';
    acoes.append(abrir);
    if (i > 0) acoes.append(botaoFoto('Tornar principal', () => { fotos.unshift(fotos.splice(i, 1)[0]); desenharGaleria(); }));
    acoes.append(botaoFoto('Remover', () => { fotos.splice(i, 1); desenharGaleria(); statusFoto('Foto removida.'); }));
    item.append(img, acoes);
    return item;
  }));
}

function escolherOrigem(origem) {
  const arquivo = origem === 'arquivo';
  document.querySelectorAll('input[name="pf-origem"]').forEach((r) => { r.checked = r.value === origem; });
  $('pf-origem-url').hidden = arquivo;
  $('pf-origem-arquivo').hidden = !arquivo;
}

// Reduz a foto no navegador (lado maior ate 1200 px, WebP) antes do envio
async function reduzirFoto(arquivo) {
  const imagem = await createImageBitmap(arquivo);
  const escala = Math.min(1, 1200 / Math.max(imagem.width, imagem.height));
  const tela = document.createElement('canvas');
  tela.width = Math.max(1, Math.round(imagem.width * escala));
  tela.height = Math.max(1, Math.round(imagem.height * escala));
  tela.getContext('2d').drawImage(imagem, 0, 0, tela.width, tela.height);
  imagem.close && imagem.close();
  return new Promise((ok, falha) => tela.toBlob(
    (blob) => (blob ? ok(blob) : falha(new Error('Não foi possível processar a foto.'))),
    'image/webp',
    0.85,
  ));
}

async function enviarParaCloudinary(blob, nomeOriginal) {
  const dados = new FormData();
  dados.append('file', blob, `${(nomeOriginal || 'foto').replace(/\.[^.]+$/, '')}.webp`);
  dados.append('upload_preset', CLOUDINARY.uploadPreset);
  const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`, {
    method: 'POST',
    body: dados,
  });
  const resposta = await resp.json().catch(() => ({}));
  if (!resp.ok || !resposta.secure_url) {
    throw new Error((resposta.error && resposta.error.message) || 'Falha ao enviar a foto.');
  }
  return versaoWebp(resposta.secure_url);
}

// Entrega sempre em WebP: o Cloudinary converte na hora (f_webp), mesmo quando o
// navegador nao consegue gerar WebP (ex.: Safari envia PNG). Largura maxima 1200 px.
function versaoWebp(url) {
  const marca = '/image/upload/';
  if (!url.includes(marca)) return url;
  return url.replace(marca, `${marca}f_webp,q_auto,c_limit,w_1200/`);
}

document.querySelectorAll('input[name="pf-origem"]').forEach((r) => {
  r.addEventListener('change', () => escolherOrigem(r.value));
});

// Enter no campo de link adiciona a foto (sem enviar o formulario do produto)
$('pf-imagem').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  $('pf-adicionar-url').click();
});

$('pf-adicionar-url').addEventListener('click', () => comEnvio(async () => {
  if (await adicionarFoto($('pf-imagem').value)) $('pf-imagem').value = '';
}));

$('pf-nome').addEventListener('change', desenharGaleria);

$('pf-arquivo').addEventListener('change', async (e) => {
  const entrada = e.target;
  const arquivo = entrada.files && entrada.files[0];
  if (!arquivo) return;
  entrada.value = '';

  if (!cloudinaryConfigurado()) {
    statusFoto('Envio de fotos ainda não configurado. Preencha CLOUDINARY em public/js/config.js ou use a opção Colar URL.');
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
    statusFoto('Formato não aceito. Use JPG, PNG ou WebP.');
    return;
  }
  if (arquivo.size > LIMITE_FOTO) {
    statusFoto('Foto muito grande. O limite é 8 MB.');
    return;
  }
  if (fotos.length >= MAX_FOTOS) {
    statusFoto(`Limite de ${MAX_FOTOS} fotos por produto.`);
    return;
  }

  await comEnvio(async () => {
    statusFoto('Enviando foto...');
    try {
      const blob = await reduzirFoto(arquivo);
      const url = await enviarParaCloudinary(blob, arquivo.name);
      await adicionarFoto(url);
    } catch (err) {
      statusFoto(`Não foi possível enviar a foto: ${err.message}`);
    }
  });
});

$('new-product').addEventListener('click', () => abrirFormulario(null));
dialogoProduto.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialogoProduto.close()));

$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = $('pf-error');
  erro.hidden = true;

  if (enviandoFoto) {
    erro.hidden = false;
    erro.textContent = 'Aguarde o envio da foto terminar antes de salvar.';
    erro.focus();
    return;
  }

  const precoCentavos = parsePreco($('pf-preco').value);
  if (Number.isNaN(precoCentavos)) {
    erro.hidden = false;
    erro.textContent = 'Preço inválido. Use o formato 1299,90.';
    erro.focus();
    return;
  }

  if ($('pf-imagem').value.trim()) {
    erro.hidden = false;
    erro.textContent = 'Clique em "Adicionar link" para incluir a foto, ou apague o texto do campo.';
    erro.focus();
    return;
  }

  const corpo = {
    nome: $('pf-nome').value,
    categoriaId: $('pf-categoria').value,
    condicao: $('pf-condicao').value,
    procedencia: $('pf-procedencia').value,
    descricao: $('pf-descricao').value,
    precoCentavos,
    estoque: Number($('pf-estoque').value),
    garantiaLojaDias: Number($('pf-garantia').value || 0),
    imagens: fotos.slice(),
    imagemUrl: fotos[0] || '',
    imagemAlt: $('pf-alt').value,
    ativo: $('pf-ativo').checked,
  };

  const botao = $('pf-submit');
  botao.disabled = true;
  try {
    if (editandoId) await api(`/produtos/${editandoId}`, { metodo: 'PATCH', corpo });
    else await api('/produtos', { metodo: 'POST', corpo });
    dialogoProduto.close();
    mensagem(editandoId ? 'Produto atualizado.' : 'Produto criado.');
  } catch (err) {
    erro.hidden = false;
    erro.textContent = err.message;
    erro.focus();
  } finally {
    botao.disabled = false;
  }
});

// ---------- pedidos ----------
async function carregarPedidos() {
  const corpo = $('orders-body');
  try {
    const { pedidos } = await api('/pedidos');
    $('orders-empty').hidden = pedidos.length > 0;
    corpo.replaceChildren(...pedidos.map(linhaPedido));
  } catch (e) {
    mensagem(e.message, 'error');
  }
}

function linhaPedido(p) {
  const aberto = p.status === 'reservado';
  const botao = (rotulo, classe, fn) => {
    const b = h('button', { type: 'button', class: `btn btn--sm ${classe}` }, rotulo);
    b.addEventListener('click', () => acao(b, async () => { await fn(); await carregarPedidos(); }));
    return b;
  };
  const telefone = p.cliente && p.cliente.whatsapp;
  return h('tr', {},
    h('th', { scope: 'row', class: 'table__name' }, h('strong', {}, p.numero),
      h('span', { class: 'table__sub' }, p.criadoEm ? new Date(p.criadoEm).toLocaleString('pt-BR') : '')),
    h('td', {}, p.cliente.nome,
      telefone ? h('span', { class: 'table__sub' },
        h('a', { href: `https://wa.me/${telefone}`, target: '_blank', rel: 'noopener' }, formatarTelefone(telefone))) : null),
    h('td', {}, h('ul', { class: 'plain-list' }, p.itens.map((i) => h('li', {}, `${i.qtd}x ${i.nome}`)))),
    h('td', {}, formatBRL(p.subtotalCentavos)),
    h('td', {}, STATUS_TEXTO[p.status] || p.status),
    h('td', {}, h('div', { class: 'row-actions' },
      aberto && botao('Concluir', 'btn--primary', () => api(`/pedidos/${p.id}/status`, { metodo: 'PATCH', corpo: { status: 'concluido' } })),
      aberto && botao('Cancelar', 'btn--secondary', () => {
        if (!window.confirm(`Cancelar o pedido ${p.numero}? As unidades voltam ao estoque.`)) return Promise.resolve();
        return api(`/pedidos/${p.id}/status`, { metodo: 'PATCH', corpo: { status: 'cancelado' } });
      }),
      !aberto && p.cliente.whatsapp && botao('Anonimizar', 'btn--secondary', () => {
        if (!window.confirm(`Remover nome e WhatsApp do pedido ${p.numero}?`)) return Promise.resolve();
        return api(`/pedidos/${p.id}/anonimizar`, { metodo: 'POST' });
      }))));
}
$('refresh-orders').addEventListener('click', carregarPedidos);

iniciarAuth().catch(() => {
  const erro = $('login-error');
  erro.hidden = false;
  erro.textContent = 'Não foi possível carregar o Firebase. Verifique sua conexão.';
});
