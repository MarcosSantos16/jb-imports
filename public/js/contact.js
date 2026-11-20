// Formulario de contato: monta a mensagem e abre o WhatsApp.
// Nenhum dado e enviado ou armazenado em nossos servidores (coleta minima).
import { waUrl, telefoneValido, formatarTelefone } from './whatsapp.js';

export function iniciarContato() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const $ = (id) => document.getElementById(id);
  const status = $('contact-status');

  function marcar(campo, mensagem) {
    campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
    $(`${campo.id}-error`).textContent = mensagem || '';
    return !mensagem;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = $('contact-name');
    const fone = $('contact-phone');
    const item = $('contact-item');
    const ok = $('contact-consent');

    const falhas = [
      [nome, nome.value.trim().length >= 2 ? '' : 'Informe seu nome (mínimo 2 letras).'],
      [fone, telefoneValido(fone.value) ? '' : 'Informe o WhatsApp com DDD, por exemplo 81 98454-3444.'],
      [item, item.value.trim().length >= 3 ? '' : 'Conte qual item você procura.'],
      [ok, ok.checked ? '' : 'Marque a ciência da Política de Privacidade para continuar.'],
    ].filter(([campo, msg]) => !marcar(campo, msg));

    if (falhas.length) { falhas[0][0].focus(); return; }

    const texto = [
      'Olá, JB Imports!',
      `Meu nome é ${nome.value.trim()} e meu WhatsApp é ${formatarTelefone(fone.value)}.`,
      `Tenho interesse em: ${item.value.trim()}`,
    ].join('\n');

    window.open(waUrl(texto), '_blank', 'noopener');
    status.textContent = 'Abrindo o WhatsApp. Nenhum dado foi salvo em nossos servidores.';
    form.reset();
  });
}
