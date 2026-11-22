// Liga os modulos da vitrine quando a pagina carrega.
import { assinarProdutos } from './store-data.js';
import { iniciarCatalogo, iniciarPainelEstoque } from './catalog-view.js';
import { iniciarCarrinho } from './cart-view.js';
import { iniciarContato } from './contact.js';
import { cart } from './cart.js';
import { announce } from './lib/dom.js';
import { disponibilidade } from './catalog.js';

const $ = (id) => document.getElementById(id);

let produtos = new Map();
let primeiraCarga = true;

const painel = iniciarPainelEstoque({ lista: $('live-list'), status: $('live-status') });

const catalogo = iniciarCatalogo({
  grade: $('product-grid'),
  filtros: $('category-filters'),
  selectCondicao: $('condition-filter'),
  busca: $('search'),
  contagem: $('result-count'),
  vazio: $('catalog-empty'),
  aoAdicionar(id) {
    const p = produtos.get(id);
    if (!p) return;
    const limite = Number.isInteger(p.estoque) ? p.estoque : 0;
    if (cart.adicionar(id, limite)) announce(`${p.nome} adicionado ao carrinho`);
    else announce(`${p.nome}: quantidade máxima disponível já está no carrinho`);
  },
});

const carrinho = iniciarCarrinho({ obterProduto: (id) => produtos.get(id) });
iniciarContato();

function anunciarMudancas(mudancas) {
  mudancas.forEach(({ tipo, id, dados }) => {
    if (tipo !== 'modified') return;
    const antes = produtos.get(id);
    if (!antes) return;
    const d0 = disponibilidade(antes.estoque);
    const d1 = disponibilidade(dados.estoque);
    if (d0 === d1) return;
    if (d1 === 'esgotado') announce(`${dados.nome} acabou de esgotar.`);
    else if (d0 === 'esgotado') announce(`${dados.nome} voltou ao estoque.`);
    else if (d1 === 'ultimas-unidades') announce(`${dados.nome}: últimas unidades.`);
  });
}

assinarProdutos(
  (lista, mudancas) => {
    if (!primeiraCarga) anunciarMudancas(mudancas);
    primeiraCarga = false;
    produtos = new Map(lista.map((p) => [p.id, p]));
    catalogo.atualizar(lista);
    painel.atualizar(lista);
    carrinho.desenhar();
  },
  (erro) => {
    const naoConfigurado = erro && erro.message === 'firebase-nao-configurado';
    catalogo.falhou(
      naoConfigurado
        ? 'Catálogo indisponível: o Firebase ainda não foi configurado em public/js/config.js.'
        : 'Não foi possível carregar o catálogo agora. Verifique sua conexão ou fale com a gente pelo WhatsApp.'
    );
    painel.indisponivel(naoConfigurado ? 'Firebase não configurado' : 'Sem conexão');
  }
);
