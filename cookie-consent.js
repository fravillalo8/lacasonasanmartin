/**
 * Cookie Consent — Google Consent Mode v2
 * Chile · Ley 19.628 + Ley 21.719 · Reutilizable en la flota TimeToMarket
 *
 * Requisitos en la página:
 *   1. Antes de cargar gtag.js, definir el consentimiento por defecto en DENIED:
 *        gtag('consent', 'default', { analytics_storage:'denied', ad_storage:'denied',
 *          functionality_storage:'denied', personalization_storage:'denied', wait_for_update:500 });
 *   2. Incluir este script antes de </body>.
 *   3. (Opcional) Un enlace "Preferencias de cookies" con onclick="showCookiePreferences()".
 *
 * Mientras el usuario no acepte, GA4 opera en modo sin cookies (Consent Mode v2):
 * no escribe cookies de análisis/publicidad hasta el opt-in.
 *
 * NOTA: este archivo es un duplicado de public/cookie-consent.js. El que se
 * publica es el de public/ (Vite lo copia a la raíz de dist/). Mantener ambos en sync.
 */
(function () {
  var STORAGE_KEY = 'cookie_consent';
  var POLICY_URL = '/politica-privacidad.html';

  var STYLES = `
    #cc-banner {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: #1a1a1a;
      color: #f0f0f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      padding: 16px 20px;
      box-shadow: 0 -2px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      animation: cc-slide-up 0.3s ease-out;
    }
    @keyframes cc-slide-up {
      from { transform: translateY(100%); opacity: 0; }
      to   { transform: translateY(0);   opacity: 1; }
    }
    #cc-banner p {
      margin: 0;
      flex: 1;
      min-width: 220px;
    }
    #cc-banner a { color: #d4a574; text-decoration: underline; }
    #cc-buttons { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }
    #cc-accept {
      background: #d4a574;
      color: #1a1a1a;
      border: none;
      padding: 9px 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    #cc-accept:hover { background: #e2bd94; }
    #cc-reject {
      background: transparent;
      color: #ccc;
      border: 1px solid #555;
      padding: 9px 20px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
    }
    #cc-reject:hover { border-color: #999; color: #fff; }
  `;

  function injectStyles() {
    if (document.getElementById('cc-styles')) return;
    var style = document.createElement('style');
    style.id = 'cc-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function updateConsent(value) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        analytics_storage: value,
        ad_storage: value,
        ad_user_data: value,
        ad_personalization: value,
        functionality_storage: value,
        personalization_storage: value
      });
    }
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function removeBanner() {
    var b = document.getElementById('cc-banner');
    if (b) b.remove();
  }

  function showBanner() {
    injectStyles();
    removeBanner();
    var banner = document.createElement('div');
    banner.id = 'cc-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML =
      '<p>Usamos cookies <strong>necesarias</strong> para que el sitio funcione y, solo si las aceptas, ' +
      'cookies de <strong>análisis</strong> (Google Analytics) para mejorar tu experiencia. ' +
      'No activamos ninguna cookie de análisis hasta que lo autorices. ' +
      'Conoce más en nuestra <a href="' + POLICY_URL + '" target="_blank" rel="noopener">Política de Privacidad</a>.</p>' +
      '<div id="cc-buttons">' +
      '<button id="cc-reject" type="button">Solo necesarias</button>' +
      '<button id="cc-accept" type="button">Aceptar cookies</button>' +
      '</div>';
    document.body.appendChild(banner);

    document.getElementById('cc-accept').addEventListener('click', function () {
      updateConsent('granted');
      removeBanner();
    });
    document.getElementById('cc-reject').addEventListener('click', function () {
      updateConsent('denied');
      removeBanner();
    });
  }

  // Exponer la reapertura del panel para el enlace "Preferencias de cookies" del pie.
  window.showCookiePreferences = showBanner;

  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}

  if (saved === 'granted') {
    updateConsent('granted');
  } else if (saved === 'denied') {
    // Consentimiento denegado previamente → GA4 sigue bloqueado por el default 'denied'.
  } else {
    // Sin decisión previa → mostrar el banner.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
