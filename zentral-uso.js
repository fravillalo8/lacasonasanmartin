/* ============================================================================
 *  ZENTRAL · USO — Beacon de telemetría (append-only, fire-and-forget)
 *  Se copia IDÉNTICO en cada instancia (CRM, Conta, Care, ...). Es la MISMA
 *  mejora en un solo archivo: para actualizar el tracking, se cambia acá y se
 *  replica.  NO bloquea la app y es 100% INERTE si no existe window.ZENTRAL_USO.
 *
 *  Config (uso-config.js, cargado ANTES que este archivo):
 *    window.ZENTRAL_USO = {
 *      URL:      'https://xxxx.supabase.co',   // proyecto CENTRAL zentral-uso
 *      ANON_KEY: 'anon key del proyecto central (pública)',
 *      tenant:   '<cliente>',                  // cliente/proyecto
 *      producto: 'crm'                         // crm | conta | care | capital | cumple | core
 *    };
 *
 *  Enganche en el app (una sola línea en boot(), tras autenticar):
 *    if (window.ZentralUso) ZentralUso.boot({ email: <correo>, userId: <uid> });
 *  El seguimiento de módulos es AUTOMÁTICO: envuelve window.showView().
 * ========================================================================== */
(function () {
  var C = window.ZENTRAL_USO || null;
  var ready = !!(C && C.URL && C.ANON_KEY && C.tenant && C.producto
                 && C.URL.indexOf('TU-PROYECTO') < 0 && C.ANON_KEY.indexOf('TU_ANON') < 0);

  var ident = { email: null, userId: null };
  var started = false, curView = null, lastActive = 0, hbTimer = null;
  var anonSent = false, anonWatch = null;   // modo anónimo sin cookies (sitios públicos sin consentimiento)
  var errCount = 0, techInit = false;        // monitoreo: errores JS (con tope) + rendimiento
  var geoPais = null;   // país (ISO-2) del visitante, vía /cdn-cgi/trace de Cloudflare

  function now() { try { return Date.now(); } catch (e) { return +new Date(); } }

  /* ── DE DÓNDE (país) ──────────────────────────────────────────────────────
     Todo el sitio está detrás de Cloudflare, que expone /cdn-cgi/trace en el
     MISMO origen (sin CORS, sin terceros). De ahí sacamos SOLO el país (loc=CL),
     NO el IP → no guardamos dato personal. Va en meta.pais de cada evento.
     Si el sitio no está proxied por CF, /cdn-cgi/trace no existe y queda null. */
  function fetchGeo() {
    if (geoPais) return;
    try {
      fetch('/cdn-cgi/trace', { cache: 'no-store' })
        .then(function (r) {
          /* 🔴 `r.ok` NO BASTA. Un sitio que NO esta proxeado por Cloudflare no
             devuelve 404 en esta ruta: si tiene fallback de SPA responde
             HTTP 200 con la PORTADA ENTERA. Medido en body-zu.app el
             1-sep-2026 (server: LiteSpeed, sin cf-ray):
                 GET /cdn-cgi/trace  ->  200 · text/html · 89.499 bytes
             Sin esta guarda se descarga esa portada en CADA visita para no
             sacar nada: el `loc=` no aparece nunca y el pais queda null
             igual — lo unico que cambia es que se paga el trafico.
             Se corta por content-type ANTES de leer el cuerpo y se cancela
             el stream, para no traerselo siquiera. */
          var ct = r.headers.get('content-type') || '';
          if (!r.ok || ct.indexOf('text/plain') === -1) {
            try { if (r.body && r.body.cancel) r.body.cancel(); } catch (e) {}
            return '';
          }
          return r.text();
        })
        .then(function (t) { var m = /(?:^|\n)loc=([A-Z]{2})/.exec(t || ''); if (m) geoPais = m[1]; })
        .catch(function () {});
    } catch (e) {}
  }

  /* ── DE DÓNDE (canal) ─────────────────────────────────────────────────────
     "¿De dónde vienen las conexiones?" — para decidir dónde invertir. Se lee
     UNA sola vez (la ENTRADA de la sesión) y se congela en sessionStorage:
     en una SPA las navegaciones internas borran el referrer, y en una recarga
     el referrer es la propia página. Guardamos SÓLO el HOST del referrer y un
     canal clasificado, NUNCA la URL completa (su path/query puede traer datos).
     Los utm_* / gclid / fbclid son parámetros de campaña que ponemos NOSOTROS
     en los enlaces → seguros. Va en meta.canal/ref/utm de cada evento. */
  var origen = null;
  function clasificaHost(h) {
    h = h || '';
    if (/(wa\.me|whatsapp)/.test(h)) return 'whatsapp';
    if (/(chatgpt\.com|chat\.openai|openai\.com|perplexity\.|gemini\.google|bard\.google|copilot\.microsoft|claude\.ai)/.test(h)) return 'ia';
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|yandex|baidu)\./.test(h)) return 'buscador';
    if (/(instagram|facebook|fb\.me|l\.facebook|t\.co|twitter|x\.com|tiktok|linkedin|lnkd\.in|youtube|youtu\.be|pinterest|reddit)/.test(h)) return 'social';
    if (/(mail\.|outlook|gmail|correo)/.test(h)) return 'email';
    return 'referral';
  }
  function getOrigen() {
    if (origen) return origen;
    try { var c = sessionStorage.getItem('zu_org'); if (c) { origen = JSON.parse(c); return origen; } } catch (e) {}
    var o = {};
    try {
      var qs = new URLSearchParams(location.search || '');
      var us = qs.get('utm_source'), um = qs.get('utm_medium'), uc = qs.get('utm_campaign');
      var self = (location.hostname || '').replace(/^www\./, '');
      var refHost = '';
      try { if (document.referrer) refHost = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
      if (us)                       o.canal = 'utm:' + us.toLowerCase().slice(0, 24);
      else if (qs.get('gclid'))     o.canal = 'ads';
      else if (qs.get('fbclid'))    o.canal = 'social';
      else if (!refHost || refHost === self) o.canal = 'directo';
      else                          o.canal = clasificaHost(refHost);
      if (refHost && refHost !== self) o.ref = refHost.slice(0, 60);
      var utm = {};
      if (us) utm.s = us.slice(0, 40);
      if (um) utm.m = um.slice(0, 40);
      if (uc) utm.c = uc.slice(0, 60);
      if (Object.keys(utm).length) o.utm = utm;
    } catch (e) { o = { canal: 'directo' }; }
    /* NUEVO vs RECURRENTE: ¿primera vez de este navegador? Se decide UNA vez por
       sesión y se congela (si no, al marcar 'visto' cambiaría a recurrente a
       mitad de sesión). Es un booleano, no identifica a nadie. */
    try {
      var seen = localStorage.getItem('zu_seen');
      o.nuevo = !seen;
      if (!seen) localStorage.setItem('zu_seen', String(now()));
    } catch (e) {}
    origen = o;
    try { sessionStorage.setItem('zu_org', JSON.stringify(o)); } catch (e) {}
    return origen;
  }

  /* ── VISITA INTERNA ───────────────────────────────────────────────────────
     En las demos nadie se loguea, así que un barrido nuestro de QA se veía
     igual que un prospecto navegando. Abrir la página UNA vez con `?yo=1`
     marca este navegador como interno (queda en localStorage, sobrevive a la
     sesión); `?yo=0` lo desmarca. Los eventos internos igual se guardan, pero
     viajan con meta.interno=true para que el panel los descuente. */
  function interno() {
    try {
      var q = location.search || '';
      if (/[?&]yo=1\b/.test(q)) localStorage.setItem('zu_interno', '1');
      else if (/[?&]yo=0\b/.test(q)) localStorage.removeItem('zu_interno');
      return localStorage.getItem('zu_interno') === '1';
    } catch (e) { return false; }
  }

  function sid() {
    try {
      var s = sessionStorage.getItem('zu_sid');
      if (!s) {
        s = (window.crypto && crypto.randomUUID)
              ? crypto.randomUUID()
              : (now().toString(36) + Math.random().toString(36).slice(2, 10));
        sessionStorage.setItem('zu_sid', s);
      }
      return s;
    } catch (e) { return 'nosid'; }
  }

  /* ── Consentimiento ────────────────────────────────────────────────────────
     Este beacon corre en paginas PUBLICAS, donde el visitante todavia no
     acepto nada. Gatearlo no es opcional: al lado, cookie-consent.js retiene
     GA4 a proposito hasta el opt-in. Un candado en una puerta y la otra
     abierta es peor que ninguno, porque da por cumplida una obligacion que no
     se cumple. Ruta + navegador + identificador de sesion es dato personal
     aunque no lleve el nombre (Ley 21.719, vigente 1-dic-2026).

     Los banners de la flota NO guardan todos lo mismo, asi que esto acepta
     las dos formas que existen (verificadas en el codigo de cada banner, no
     supuestas) y ante cualquier duda NO manda:
       'granted'                        -> mundial-2026, Pet-zu
       {analytics:true, ...} en JSON    -> Cru-zu, Zu-Lab
     Si no hay clave (el visitante aun no responde el banner) devuelve false. */
  function hayConsentimiento() {
    if (!C || !C.requiereConsentimiento) return true;
    try {
      var v = localStorage.getItem(C.claveConsentimiento);
      if (!v) return false;
      /* 🔴 CUARTO FORMATO — O'Cult guarda la decision CON sello de tiempo:
         "si|2026-08-09T17:00:00.000Z". Sin esta linea el gate salia por el
         charAt(0)!=='{' y el beacon NO MEDIA NUNCA, sin error ni aviso.
         Se corta por '|' y se compara EXACTO (nada de .trim()): asi
         ' granted' con espacio adelante sigue sin medir, que es un caso
         deliberado de la prueba. */
      var d = v.split('|')[0];
      /* QUINTO FORMATO — LosAlgarrobos guarda la_cookie='all' al aceptar todo.
         Additivo: 'all' == aceptado. Sin esto el beacon nunca media en ese sitio. */
      if (d === 'granted' || d === 'si' || d === 'all') return true;
      if (v.charAt(0) !== '{') return false;
      return JSON.parse(v).analytics === true;
    } catch (e) { return false; }
  }

  function send(evento, vista, meta) {
    if (!ready) return;
    /* El candado va ACA y no en `ready`: el consentimiento puede llegar a
       mitad de visita. Comprobandolo en cada envio, empieza a medir desde ese
       momento sin recargar, y deja de medir si el visitante vuelve y rechaza. */
    if (!hayConsentimiento()) return;
    var row = {
      tenant: C.tenant, producto: C.producto, evento: evento,
      vista: vista || null,
      email: ident.email || null, user_id: ident.userId || null,
      sid: sid(),
      ua: (navigator.userAgent || '').slice(0, 300),
      path: location.pathname
    };
    if (meta) row.meta = meta;
    var org = getOrigen();
    if (org && org.canal) row.meta = Object.assign({}, row.meta || {}, org);
    if (geoPais) row.meta = Object.assign({}, row.meta || {}, { pais: geoPais });
    if (interno()) row.meta = Object.assign({}, row.meta || {}, { interno: true });
    try {
      fetch(C.URL.replace(/\/+$/, '') + '/rest/v1/uso_eventos', {
        method: 'POST', keepalive: true,
        headers: {
          'apikey': C.ANON_KEY,
          'Authorization': 'Bearer ' + C.ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify([row])
      }).catch(function () {});
    } catch (e) { /* nunca romper la app por telemetría */ }
  }

  /* ── MODO ANÓNIMO SIN COOKIES ──────────────────────────────────────────────
     Para MEDIR sitios públicos sin subcontar: si el visitante todavía no aceptó
     el banner, igual contamos UNA "visita" agregada — país + ruta + canal —, SIN
     tocar el dispositivo (cero cookies, cero localStorage, cero sessionStorage),
     sin id de sesión, sin user-agent, sin identidad. No es dato personal → no
     requiere consentimiento (estilo Plausible/Fathom). Si luego acepta el banner,
     boot() reintenta y pasa al modo COMPLETO (sesión, nuevo/recurrente, etc.). */
  function anonOrigen() {
    var o = {};
    try {
      var qs = new URLSearchParams(location.search || '');
      var us = qs.get('utm_source');
      var self = (location.hostname || '').replace(/^www\./, '');
      var refHost = '';
      try { if (document.referrer) refHost = new URL(document.referrer).hostname.replace(/^www\./, ''); } catch (e) {}
      if (us)                        o.canal = 'utm:' + us.toLowerCase().slice(0, 24);
      else if (qs.get('gclid'))      o.canal = 'ads';
      else if (qs.get('fbclid'))     o.canal = 'social';
      else if (!refHost || refHost === self) o.canal = 'directo';
      else                           o.canal = clasificaHost(refHost);
      if (refHost && refHost !== self) o.ref = refHost.slice(0, 60);
    } catch (e) { o = { canal: 'directo' }; }
    return o;
  }
  function anonVisita() {
    if (anonSent || !ready) return;
    anonSent = true;
    var meta = { anon: true };
    var org = anonOrigen();
    if (org.canal) meta.canal = org.canal;
    if (org.ref)   meta.ref = org.ref;
    if (geoPais)   meta.pais = geoPais;
    var row = {                       // SIN sid, SIN ua, SIN email/user_id, SIN storage
      tenant: C.tenant, producto: C.producto, evento: 'visita',
      path: location.pathname, meta: meta
    };
    try {
      fetch(C.URL.replace(/\/+$/, '') + '/rest/v1/uso_eventos', {
        method: 'POST', keepalive: true,
        headers: { 'apikey': C.ANON_KEY, 'Authorization': 'Bearer ' + C.ANON_KEY,
                   'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify([row])
      }).catch(function () {});
    } catch (e) {}
  }

  /* ── MONITOREO TÉCNICO: errores JS + rendimiento ───────────────────────────
     Señales de MONITOREO (no de negocio): ¿este sitio se está rompiendo? ¿carga
     lento? Son técnicas, sin dato personal. En modo completo van con sesión;
     en modo anónimo van igual pero sin sid/ua/storage (mismo criterio legal que
     la visita anónima). El mensaje de error se recorta y de la fuente se guarda
     sólo ruta:línea (nunca query, que podría traer datos). */
  function sendTech(evento, meta) {
    if (!ready) return;
    if (!C.requiereConsentimiento || hayConsentimiento()) {
      send(evento, null, meta);   // modo completo: reusa send() (con sid/país/canal)
      return;
    }
    var m = Object.assign({ anon: true }, meta || {});   // modo anónimo: stripped, sin storage
    var org = anonOrigen(); if (org.canal) m.canal = org.canal;
    if (geoPais) m.pais = geoPais;
    var row = { tenant: C.tenant, producto: C.producto, evento: evento, path: location.pathname, meta: m };
    try {
      fetch(C.URL.replace(/\/+$/, '') + '/rest/v1/uso_eventos', {
        method: 'POST', keepalive: true,
        headers: { 'apikey': C.ANON_KEY, 'Authorization': 'Bearer ' + C.ANON_KEY,
                   'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify([row])
      }).catch(function () {});
    } catch (e) {}
  }
  function initTech() {
    if (techInit || !ready) return;
    techInit = true;
    // Errores JS (tope de 5 por carga para no inundar el pozo con un bucle roto).
    window.addEventListener('error', function (e) {
      if (errCount >= 5) return; errCount++;
      var msg = (e && e.message ? String(e.message) : 'error').slice(0, 200);
      var src = '';
      try { src = (e.filename ? new URL(e.filename).pathname : '') + (e.lineno ? (':' + e.lineno) : ''); }
      catch (x) { src = String(e.filename || '').slice(0, 120); }
      sendTech('error', { msg: msg, src: src.slice(0, 160) });
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
      if (errCount >= 5) return; errCount++;
      var r = e && e.reason;
      var msg = (r && r.message) ? String(r.message) : String(r || 'rejection');
      sendTech('error', { msg: msg.slice(0, 200), src: 'promise' });
    });
    // Rendimiento: una medición al terminar de cargar (Navigation Timing).
    try {
      var medir = function () {
        var meta = null;
        var nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
        if (nav) meta = { load_ms: Math.round(nav.duration || 0), ttfb_ms: Math.round(nav.responseStart || 0), dcl_ms: Math.round(nav.domContentLoadedEventEnd || 0) };
        else if (performance.timing) {
          var t = performance.timing;
          meta = { load_ms: t.loadEventEnd - t.navigationStart, ttfb_ms: t.responseStart - t.navigationStart, dcl_ms: t.domContentLoadedEventEnd - t.navigationStart };
        }
        if (meta && meta.load_ms > 0 && meta.load_ms < 120000) sendTech('perf', meta);
      };
      if (document.readyState === 'complete') setTimeout(medir, 0);
      else window.addEventListener('load', function () { setTimeout(medir, 300); });
    } catch (e) {}
  }

  function touch() { lastActive = now(); }

  function heartbeat() {
    if (document.visibilityState !== 'visible') return;   // pestaña en segundo plano no cuenta
    if (now() - lastActive > 10 * 60 * 1000) return;      // >10 min inactivo: no cuenta
    send('heartbeat', curView);
  }

  function wrapNav(name) {
    var fn = window[name];
    if (typeof fn === 'function' && !fn.__zu) {
      var wrapped = function (v) {
        try { curView = v; send('view', v); } catch (e) {}
        return fn.apply(this, arguments);
      };
      wrapped.__zu = true;
      window[name] = wrapped;
    }
  }

  window.ZentralUso = {
    boot: function (o) {
      if (!ready || started) return;
      o = o || {};
      /* Sitio público sin consentimiento AÚN → MODO ANÓNIMO: una visita sin
         cookies para no subcontar, y quedar atento por si acepta después
         (ahí pasa al modo completo). No marca started, para permitir el upgrade. */
      if (C.requiereConsentimiento && !hayConsentimiento()) {
        fetchGeo();
        setTimeout(anonVisita, 1200);   // deja resolver el país; keepalive cubre el cierre rápido
        if (!anonWatch) anonWatch = setInterval(function () {
          if (hayConsentimiento()) { clearInterval(anonWatch); anonWatch = null; try { window.ZentralUso.boot(o); } catch (e) {} }
        }, 3000);
        return;
      }
      started = true;
      ident.email  = o.email  || ident.email;
      ident.userId = o.userId || ident.userId;
      touch();
      fetchGeo();   // resuelve el país en background; se adjunta a los eventos siguientes

      // 'login' una vez por sesión de pestaña; en recarga no se duplica.
      try {
        if (!sessionStorage.getItem('zu_login')) {
          sessionStorage.setItem('zu_login', '1');
          send('login', null);
        }
      } catch (e) { send('login', null); }

      wrapNav(o.nav || 'showView');   // envuelve la fn de navegación (showView por defecto)

      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(function (ev) {
        try { window.addEventListener(ev, touch, { passive: true }); } catch (e) {}
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') { touch(); heartbeat(); }
      });
      hbTimer = setInterval(heartbeat, 3 * 60 * 1000);   // peaks / duración de sesión
    },
    view:   function (n) { curView = n; send('view', n); },
    action: function (n, meta) { send('action', n, meta); },
    id:     function (o) { if (o) { ident.email = o.email || ident.email; ident.userId = o.userId || ident.userId; } },
    // Lo consume zentral-feedback.js para saber quién sugiere y en qué vista, sin config extra.
    ident:  function () { return { email: ident.email, userId: ident.userId, view: curView }; },
    // true si este navegador está marcado como nuestro (abierto alguna vez con ?yo=1).
    interno: interno
  };

  /* Monitoreo técnico (errores + rendimiento): siempre activo si hay config
     válida, sin depender de login ni de consentimiento — son señales técnicas. */
  if (ready) { try { initTech(); } catch (e) {} }

  /* Auto-arranque para landings publicas (producto:'web'). Muchas CSP traen
     script-src 'self' SIN unsafe-inline, que BLOQUEA un <script> inline de boot
     (queda 0 eventos, sin error visible). Al vivir DENTRO de este archivo (self),
     el arranque pasa la CSP. Solo 'web': las apps llaman boot() con el usuario
     tras login. boot() es idempotente (started), no duplica si el sitio igual lo llama. */
  if (C && C.producto === 'web') {
    if (document.readyState === 'loading')
      document.addEventListener('DOMContentLoaded', function () { try { window.ZentralUso.boot(); } catch (e) {} });
    else { try { window.ZentralUso.boot(); } catch (e) {} }
  }
})();
