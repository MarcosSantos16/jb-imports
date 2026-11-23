import { h, icon, announce } from './lib/dom.js';
import { cart } from './cart.js';
import { formatBRL, CONDICAO_LABEL, disponibilidade } from './catalog.js';
import { waUrl, mensagemPedido, telefoneValido } from './whatsapp.js';

export function iniciarCarrinho({ obterProduto }) {
  const $ = (id) => document.getElementById(id);
  const dialogo = $('cart-dialog');
  const abrirBtn = $('cart-open');
  const contador = $('cart-count');
  const lista = $('cart-lines');
  const vazio = $('cart-empty');
  const aviso = $('cart-notice');
  const subtotal = $('cart-subtotal');
  const form = $('checkout-form');
  const erroForm = $('checkout-error');
  const enviar = $('checkout-submit');
  const secoes = {
    lista: $('cart-view-list'),
    dados: $('checkout-form'),
    fim: $('cart-view-done'),
  };
  const rodape = $('cart-foot');
  const irParaDados = $('cart-checkout');
  let visao = 'lista';
  let enviando = false;

  function mostrar(v) {
    visao = v;
    Object.entries(secoes).forEach(([nome, el]) => { el.hidden = nome !== v; });
    rodape.hidden = v !== 'lista';
    $('cart-title').textContent = v === 'dados' ? 'Seus dados' : v === 'fim' ? 'Pedido enviado' : 'Carrinho';
  }

  function linhas() {
    let ajustou = false;
    const resultado = cart.itens().map((item) => {
      const produto = obterProduto(item.id);
      if (!produto) return { item, produto: null, valida: false };
      const estoque = Number.isInteger(produto.estoque) ? produto.estoque : 0;
      if (disponibilidade(estoque) === 'esgotado') return { item, produto, valida: false };
      if (item.qtd > estoque) { cart.definir(item.id, estoque); item.qtd = estoque; ajustou = true; }
      return { item, produto, valida: true, estoque };
    });
    return { resultado, ajustou };
  }

  function desenhar() {
    const { resultado, ajustou } = linhas();
    if (ajustou) return;

    const total = cart.total();
    contador.textContent = String(total);
    contador.hidden = total === 0;
    abrirBtn.setAttribute('aria-label', total ? `Abrir carrinho, ${total} ${total === 1 ? 'item' : 'itens'}` : 'Abrir carrinho, vazio');

    vazio.hidden = resultado.length > 0;
    lista.replaceChildren(...resultado.map(({ item, produto, valida, estoque }) => {
      const nome = produto ? produto.nome : 'Produto não está mais disponível';
      const mudarQtd = (n) => { cart.definir(item.id, n); announce(`${nome}: quantidade ${n}`); };
      return h('li', { class: `cart-line${valida ? '' : ' cart-line--off'}` },
        h('div', { class: 'cart-line__info' },
          h('p', { class: 'cart-line__name' }, nome),
          produto && h('p', { class: 'cart-line__meta' }, `${CONDICAO_LABEL[produto.condicao] || ''} - ${formatBRL(produto.precoCentavos)}`),
          !valida && h('p', { class: 'cart-line__warn', role: 'status' }, 'Indisponível no momento. Remova do carrinho para continuar.')),
        h('div', { class: 'cart-line__actions' },
          valida && h('div', { class: 'qty', role: 'group', 'aria-label': `Quantidade de ${nome}` },
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Diminuir quantidade de ${nome}`, onClick: () => mudarQtd(item.qtd - 1) }, icon('minus')),
            h('span', { class: 'qty__value', 'aria-live': 'polite' }, String(item.qtd)),
            h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Aumentar quantidade de ${nome}`, disabled: item.qtd >= Math.min(estoque, 20), onClick: () => mudarQtd(item.qtd + 1) }, icon('plus'))),
          h('button', { type: 'button', class: 'icon-btn icon-btn--sm', 'aria-label': `Remover ${nome} do carrinho`, onClick: () => { cart.remover(item.id); announce(`${nome} removido do carrinho`); } }, icon('trash'))));
    }));

    const validas = resultado.filter((r) => r.valida);
    const soma = validas.reduce((s, r) => s + r.produto.precoCentavos * r.item.qtd, 0);
    subtotal.textContent = formatBRL(soma);
    const bloqueado = !validas.length || validas.length !== resultado.length;
    irParaDados.disabled = bloqueado;
    aviso.hidden = !resultado.some((r) => !r.valida);
    aviso.textContent = aviso.hidden ? '' : 'Há itens indisponíveis no carrinho.';
  }

  cart.assinar(desenhar);

  abrirBtn.addEventListener('click', () => {
    mostrar('lista');
    desenhar();
    dialogo.showModal();
  });
  dialogo.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dialogo.close()));
  dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });
  irParaDados.addEventListener('click', () => {
    const n = cart.total();
    $('checkout-summary').textContent = `Resumo: ${n} ${n === 1 ? 'item' : 'itens'}, subtotal de ${subtotal.textContent}.`;
    mostrar('dados');
    $('checkout-name').focus();
  });
  $('checkout-back').addEventListener('click', () => { mostrar('lista'); irParaDados.focus(); });

  function erroCampo(campo, mensagem) {
    const msg = $(`${campo.id}-error`);
    campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
    msg.textContent = mensagem || '';
    return !mensagem;
  }

  function validar() {
    const nome = $('checkout-name');
    const fone = $('checkout-phone');
    const ok = $('checkout-consent');
    const resultados = [
      [nome, nome.value.trim().length >= 2 ? '' : 'Informe seu nome (mínimo 2 letras).'],
      [fone, telefoneValido(fone.value) ? '' : 'Informe o WhatsApp com DDD, por exemplo 81 98454-3444.'],
      [ok, ok.checked ? '' : 'Marque a ciência da Política de Privacidade para continuar.'],
    ];
    const invalidos = resultados.filter(([campo, msg]) => !erroCampo(campo, msg));
    if (invalidos.length) invalidos[0][0].focus();
    return invalidos.length === 0;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (enviando || !validar()) return;
    erroForm.hidden = true;

    const { resultado } = linhas();
    const corpo = {
      cliente: { nome: $('checkout-name').value.trim(), whatsapp: $('checkout-phone').value },
      itens: resultado.filter((r) => r.valida).map((r) => ({ produtoId: r.item.id, qtd: r.item.qtd })),
      consentimento: $('checkout-consent').checked,
      website: $('checkout-website').value,
    };

    enviando = true;
    enviar.disabled = true;
    enviar.textContent = 'Reservando...';
    try {
      const resp = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      const dados = await resp.json().catch(() => null);

      if (!resp.ok) {
        const erro = (dados && dados.erro) || {};
        if (resp.status === 409) {
          mostrar('lista');
          aviso.hidden = false;
          aviso.textContent = erro.mensagem || 'O estoque mudou. Revise o carrinho.';
          return;
        }
        const detalhes = Array.isArray(erro.detalhes) ? ` ${erro.detalhes.filter((d) => typeof d === 'string').join(' ')}` : '';
        throw new Error((erro.mensagem || 'Não foi possível enviar o pedido.') + detalhes);
      }

      const url = waUrl(mensagemPedido(dados));
      $('done-number').textContent = dados.numero;
      $('done-link').href = url;
      cart.limpar();
      form.reset();
      mostrar('fim');
      window.location.assign(url);
    } catch (erro) {
      erroForm.hidden = false;
      erroForm.textContent = erro.message === 'Failed to fetch'
        ? 'Sem conexão com o servidor. Verifique sua internet e tente novamente.'
        : erro.message;
      erroForm.focus();
    } finally {
      enviando = false;
      enviar.disabled = false;
      enviar.textContent = 'Reservar e enviar pelo WhatsApp';
    }
  });

  desenhar();
  return { desenhar };
}
