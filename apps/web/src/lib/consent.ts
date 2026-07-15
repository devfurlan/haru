// Consentimento de cookies (LGPD/ANPD). Fonte única da chave, da versão e dos
// sinais - o script inline do layout e o banner em React leem daqui pra não
// divergirem em silêncio.
//
// Modelo: "basic consent mode" do Google. Nada de terceiro carrega antes de uma
// escolha explícita - nem o container do GTM (ver cookie-consent.tsx). Quem
// rejeita não gera UMA requisição pro Google. É verificável no DevTools em 30s,
// que é o que uma fiscalização consegue conferir.
//
// Guia orientativo de cookies da ANPD (out/2022), p. 30 e 33: rejeitar tem que ter
// o mesmo destaque de aceitar, categoria não essencial vem DESLIGADA por padrão, e
// banner de um botão só está na lista de dark patterns.

export type ConsentState = {
  /** GA4 e Microsoft Clarity: medir uso e achar onde a tela trava. */
  analytics: boolean;
  /** Pixel da Meta e Google Ads: medir anúncio. */
  marketing: boolean;
};

// ID do container do GTM (tagmanager.google.com). Hardcoded de propósito: é público
// - vai inlined no bundle do browser de qualquer jeito - e nunca muda. Como env
// seria pior: esquecer de setar na Vercel não daria erro, só GTM que nunca carrega.
// Vazio = GTM não monta.
//
// Não fire em localhost/preview: resolva com condição de hostname no trigger, DENTRO
// do GTM. Lógica de ambiente mora lá, não aqui.
export const GTM_ID = '';

export const CONSENT_KEY = 'demandae-cookie-consent';

// Bumpar SEMPRE que o texto do banner mudar de escopo: aceite dado sobre "só
// cookies essenciais" (v1) não cobre analytics/publicidade (v2). Bumpar re-pergunta
// a quem já tinha aceitado. Mesma regra do TERMS_VERSION.
export const CONSENT_VERSION = 2;

/** Reabre o banner de fora (link "Gerenciar cookies"). */
export const OPEN_CONSENT_EVENT = 'demandae:abrir-consentimento';

export const DENY_ALL: ConsentState = { analytics: false, marketing: false };
export const GRANT_ALL: ConsentState = { analytics: true, marketing: true };

type StoredConsent = ConsentState & { v: number; at: string };

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    clarity?: (...args: unknown[]) => void;
  }
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent | null;
    if (parsed?.v !== CONSENT_VERSION) return null;
    return { analytics: !!parsed.analytics, marketing: !!parsed.marketing };
  } catch {
    // localStorage bloqueado (aba anônima): trata como sem escolha
    return null;
  }
}

// A ANPD (p. 19-20) põe o ônus de COMPROVAR o consentimento no controlador e
// recomenda registrar. Guardamos versão + carimbo de tempo junto da escolha.
function writeConsent(state: ConsentState) {
  try {
    const stored: StoredConsent = { v: CONSENT_VERSION, ...state, at: new Date().toISOString() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
  } catch {
    // sem persistência: vale só pra sessão atual
  }
}

/** Sinais do Google Consent Mode v2. */
function signals(state: ConsentState) {
  const ads = state.marketing ? 'granted' : 'denied';
  return {
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
    analytics_storage: state.analytics ? 'granted' : 'denied',
  };
}

// Roda inline no <head>, antes do GTM (que o @next/third-parties injeta como
// afterInteractive). O Google é explícito: consent 'default' fora de ordem não
// funciona. Como lemos o localStorage de forma síncrona aqui, quem já escolheu
// entra na página já com o estado certo - sem piscar e sem pageview perdido.
//
// ponytail: sem `wait_for_update`. Ele existe pra esperar CMP assíncrono de
// terceiro; aqui é síncrono, não há corrida pra esperar.
export const CONSENT_BOOTSTRAP_SCRIPT = `
window.dataLayer=window.dataLayer||[];
window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
var s={ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied'};
try{
var c=JSON.parse(localStorage.getItem(${JSON.stringify(CONSENT_KEY)}));
if(c&&c.v===${CONSENT_VERSION}){
var a=c.marketing?'granted':'denied';
s={ad_storage:a,ad_user_data:a,ad_personalization:a,analytics_storage:c.analytics?'granted':'denied'};
}
}catch(e){}
window.gtag('consent','default',s);
`.trim();

/**
 * Grava a escolha e propaga pros terceiros.
 *
 * Revogar recarrega a página de propósito: script de rastreamento já carregado não
 * se descarrega de forma confiável. Recarregar é a única forma honesta de garantir
 * que ele não roda mais - no reload o GTM nem monta (ver cookie-consent.tsx).
 */
export function applyConsent(prev: ConsentState | null, next: ConsentState) {
  writeConsent(next);

  const revoked = prev
    ? (prev.analytics && !next.analytics) || (prev.marketing && !next.marketing)
    : false;
  if (revoked) {
    window.location.reload();
    return;
  }

  window.gtag?.('consent', 'update', signals(next));

  // Clarity tem consentimento próprio - não lê o Consent Mode do Google (aquilo é
  // infra do Google). `consentv2` é a API atual; a antiga (`clarity('consent', bool)`)
  // está deprecada. O camelCase com S maiúsculo é da doc da Microsoft, não é typo.
  window.clarity?.('consentv2', {
    ad_Storage: next.marketing ? 'granted' : 'denied',
    analytics_Storage: next.analytics ? 'granted' : 'denied',
  });
}
