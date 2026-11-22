// Monta o link do WhatsApp e valida o telefone.
import { WHATSAPP_NUMBER } from './config.js';
import { formatBRL, CONDICAO_LABEL } from './catalog.js';

export const waUrl = (texto) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;

export function formatarTelefone(digitos) {
  const d = String(digitos).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

export function telefoneValido(valor) {
  const d = String(valor).replace(/\D/g, '');
  return /^(55)?\d{10,11}$/.test(d);
}

export function mensagemPedido(pedido) {
  const linhas = pedido.itens.map(
    (i) =>
      `- ${i.qtd}x ${i.nome} (${CONDICAO_LABEL[i.condicao] || i.condicao}) - ${formatBRL(i.precoCentavos)} cada`
  );
  return [
    `Olá, JB Imports! Acabei de reservar o pedido ${pedido.numero} pelo site.`,
    '',
    `Nome: ${pedido.cliente.nome}`,
    `WhatsApp: ${formatarTelefone(pedido.cliente.whatsapp)}`,
    '',
    'Itens:',
    ...linhas,
    '',
    `Subtotal: ${formatBRL(pedido.subtotalCentavos)}`,
    '',
    'Aguardo a confirmação de pagamento, frete (se houver) e prazo de entrega ou retirada.',
  ].join('\n');
}
