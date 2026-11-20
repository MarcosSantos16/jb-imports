// Painel administrativo: login (Firebase Auth), lista de produtos em tempo real
// (onSnapshot) e operacoes de escrita pela API Node.js (/api/admin/*).
import { h, icon, announce } from '../lib/dom.js';
import { firebaseReady, getApp, loadAuth, loadFirestore } from '../lib/firebase.js';
import {
  CATEGORIAS, CONDICAO_LABEL, disponibilidade, formatBRL, categoriaNome,
} from '../catalog.js';
import { formatarTelefone } from '../whatsapp.js';

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
    await authFns.signOut(auth);
    const erro = $('login-error');
    erro.hidden = false;
    erro.textContent = e.message;
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
    erro.textContent = limite
      ? 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'
      : 'E-mail ou senha incorretos.';
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
  $('pf-imagem').value = p ? p.imagemUrl || '' : '';
  $('pf-alt').value = p ? p.imagemAlt || '' : '';
  $('pf-ativo').checked = p ? p.ativo === true : true;
  $('pf-error').hidden = true;
  dialogoProduto.showModal();
  $('pf-nome').focus();
}

$('new-product').addEventListener('click', () => abrirFormulario(null));
dialogoProduto.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialogoProduto.close()));

$('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const erro = $('pf-error');
  erro.hidden = true;

  const precoCentavos = parsePreco($('pf-preco').value);
  if (Number.isNaN(precoCentavos)) {
    erro.hidden = false;
    erro.textContent = 'Preço inválido. Use o formato 1299,90.';
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
    imagemUrl: $('pf-imagem').value,
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
