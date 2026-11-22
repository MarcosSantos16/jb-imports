// Consentimento de cookies e carregamento do Google Analytics so apos o aceite.
import { GA_MEASUREMENT_ID, POLICY_VERSION, isPlaceholder } from './config.js';

const CHAVE = 'jb_consent_v1';

window.dataLayer = window.dataLayer || [];
function gtag() {
  window.dataLayer.push(arguments);
}

gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500,
});

function lerEscolha() {
  try {
    const dado = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    return dado && dado.politica === POLICY_VERSION && typeof dado.analiticos === 'boolean' ? dado : null;
  } catch (e) {
    return null;
  }
}

function gravarEscolha(analiticos) {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({ politica: POLICY_VERSION, analiticos, em: new Date().toISOString() })
    );
  } catch (e) {
  }
}

let gaCarregado = false;

function carregarAnalytics() {
  if (gaCarregado || isPlaceholder(GA_MEASUREMENT_ID)) return;
  gaCarregado = true;
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.append(script);
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

function apagarCookiesAnaliticos() {
  const dominios = [location.hostname, `.${location.hostname}`, ''];
  document.cookie.split(';').forEach((c) => {
    const nome = c.split('=')[0].trim();
    if (nome === '_ga' || nome.startsWith('_ga_') || nome === '_gid') {
      dominios.forEach((d) => {
        document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
      });
    }
  });
}

function aplicar(analiticos) {
  if (analiticos) {
    gtag('consent', 'update', { analytics_storage: 'granted' });
    carregarAnalytics();
  } else {
    gtag('consent', 'update', { analytics_storage: 'denied' });
    if (!isPlaceholder(GA_MEASUREMENT_ID)) window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    apagarCookiesAnaliticos();
  }
}

function iniciarBanner() {
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  const painel = banner.querySelector('[data-cookie-panel]');
  const caixaAnaliticos = banner.querySelector('[data-cookie-analytics]');
  const botaoPersonalizar = banner.querySelector('[data-cookie-customize]');
  let retorno = null;

  function abrir(origem) {
    retorno = origem || null;
    const atual = lerEscolha();
    caixaAnaliticos.checked = atual ? atual.analiticos : false;
    painel.hidden = true;
    botaoPersonalizar.setAttribute('aria-expanded', 'false');
    banner.hidden = false;
    if (origem) banner.querySelector('[data-cookie-title]').focus();
  }

  function decidir(analiticos) {
    gravarEscolha(analiticos);
    aplicar(analiticos);
    banner.hidden = true;
    const alvo = retorno || document.getElementById('conteudo');
    if (alvo) alvo.focus();
    retorno = null;
  }

  banner.querySelector('[data-cookie-accept]').addEventListener('click', () => decidir(true));
  banner.querySelector('[data-cookie-reject]').addEventListener('click', () => decidir(false));
  banner.querySelector('[data-cookie-save]').addEventListener('click', () => decidir(caixaAnaliticos.checked));
  botaoPersonalizar.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
    botaoPersonalizar.setAttribute('aria-expanded', String(!painel.hidden));
  });
  banner.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !painel.hidden) {
      painel.hidden = true;
      botaoPersonalizar.setAttribute('aria-expanded', 'false');
      botaoPersonalizar.focus();
    }
  });

  document.querySelectorAll('[data-cookie-prefs]').forEach((b) =>
    b.addEventListener('click', () => abrir(b))
  );

  const escolha = lerEscolha();
  if (escolha) aplicar(escolha.analiticos);
  else abrir(null);
}

iniciarBanner();
