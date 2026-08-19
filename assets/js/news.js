/* ══════════════════════════════════════════════════════════════
   NOTICIAS + CALENDARIO ECONÓMICO — ventanas compartidas por
   Institutional Radar, Liquidity Pools y Smart Levels.

   Usan los widgets oficiales y GRATUITOS de TradingView (iframe, sin
   API key, datos EN VIVO y siempre frescos, sin problemas de CORS ni
   de proveedores caídos). La estética exterior (cabecera dorada,
   marca CriptoCuba, puntico) es nuestra; solo el contenido de datos
   viene de TradingView.

   Expone: window.abrirNoticias()  y  window.abrirCalendario()
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.abrirNoticias && window.abrirCalendario) return;

  function css() {
    if (document.getElementById('nwx-css')) return;
    var s = document.createElement('style'); s.id = 'nwx-css';
    s.textContent =
    '.nwx-box{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,sans-serif}' +
    '.nwx-box .nwx-bg{position:absolute;inset:0;background:rgba(3,5,8,.86);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '.nwx-box .nwx-c{position:relative;width:100%;max-width:820px;height:min(760px,92vh);display:flex;flex-direction:column;background:linear-gradient(180deg,#12171f,#0a0d12);border:1px solid rgba(232,184,75,.4);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '.nwx-box .nwx-h{display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto}' +
    '.nwx-box .nwx-dot{width:9px;height:9px;border-radius:50%;background:#f6465d;box-shadow:0 0 0 0 rgba(246,70,93,.6);animation:nwxPulse 2s infinite;flex:0 0 auto}' +
    '.nwx-box .nwx-h b{font-family:var(--display,system-ui);font-weight:800;font-size:17px;color:#E8B84B;letter-spacing:.3px}' +
    '.nwx-box .nwx-h span{font-size:11.5px;color:#8b95a1;font-family:ui-monospace,monospace}' +
    '.nwx-box .nwx-x{margin-left:auto;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#c8cfd8;font-size:18px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}' +
    '.nwx-box .nwx-x:active{transform:translateY(1px)}' +
    '.nwx-box .nwx-body{flex:1;min-height:0;position:relative;background:#0b0f15}' +
    '.nwx-box .nwx-body .tradingview-widget-container,.nwx-box .nwx-body .tradingview-widget-container__widget,.nwx-box .nwx-body iframe{width:100%!important;height:100%!important;border:0}' +
    '.nwx-box .nwx-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#8b95a1;font-size:13px;pointer-events:none}' +
    '.nwx-box .nwx-spin{width:26px;height:26px;border:3px solid rgba(232,184,75,.25);border-top-color:#E8B84B;border-radius:50%;animation:nwxSpin .8s linear infinite}' +
    '.nwx-box .nwx-foot{flex:0 0 auto;padding:7px 12px;text-align:center;font-size:10px;color:#5c6672;font-family:ui-monospace,monospace;border-top:1px solid rgba(255,255,255,.05)}' +
    '@keyframes nwxSpin{to{transform:rotate(360deg)}}' +
    '@keyframes nwxPulse{0%{box-shadow:0 0 0 0 rgba(246,70,93,.55)}70%{box-shadow:0 0 0 7px rgba(246,70,93,0)}100%{box-shadow:0 0 0 0 rgba(246,70,93,0)}}' +
    '@media(max-width:760px){.nwx-box{padding:0}.nwx-box .nwx-c{max-width:100%;height:100%;border-radius:0;border:none}}';
    document.head.appendChild(s);
  }

  function abrir(cfg) {
    css();
    var prev = document.getElementById('nwx-box'); if (prev) prev.remove();
    var box = document.createElement('div'); box.id = 'nwx-box'; box.className = 'nwx-box';
    box.innerHTML =
      '<div class="nwx-bg"></div>' +
      '<div class="nwx-c">' +
        '<div class="nwx-h"><span class="nwx-dot"></span><b>' + cfg.titulo + '</b><span>' + cfg.sub + '</span>' +
          '<button class="nwx-x" aria-label="Cerrar">\u2715</button></div>' +
        '<div class="nwx-body"><div class="nwx-load"><div class="nwx-spin"></div>Cargando\u2026</div></div>' +
        '<div class="nwx-foot">Datos en vivo \u00b7 TradingView</div>' +
      '</div>';
    document.body.appendChild(box);
    var cerrar = function () { box.remove(); };
    box.querySelector('.nwx-bg').onclick = cerrar;
    box.querySelector('.nwx-x').onclick = cerrar;

    var body = box.querySelector('.nwx-body');
    var cont = document.createElement('div');
    cont.className = 'tradingview-widget-container';
    var w = document.createElement('div');
    w.className = 'tradingview-widget-container__widget';
    cont.appendChild(w);
    var sc = document.createElement('script');
    sc.type = 'text/javascript';
    sc.async = true;
    sc.src = cfg.src;
    sc.text = JSON.stringify(cfg.opts);
    cont.appendChild(sc);
    body.appendChild(cont);
    // quitar el "Cargando" cuando aparezca el iframe
    var t0 = Date.now();
    var iv = setInterval(function () {
      if (!box.isConnected) { clearInterval(iv); return; }
      if (body.querySelector('iframe') || Date.now() - t0 > 8000) {
        var l = body.querySelector('.nwx-load'); if (l) l.remove();
        clearInterval(iv);
      }
    }, 250);
  }

  window.abrirNoticias = function () {
    abrir({
      titulo: 'News', sub: 'Crypto \u00b7 en vivo',
      src: 'https://s3.tradingview.com/external-embedding/embed-widget-timeline.js',
      opts: { feedMode: 'market', market: 'crypto', isTransparent: true, displayMode: 'regular',
        width: '100%', height: '100%', colorTheme: 'dark', locale: 'es' }
    });
  };

  window.abrirCalendario = function () {
    abrir({
      titulo: 'Calendario econ\u00f3mico', sub: 'Eventos \u00b7 en vivo',
      src: 'https://s3.tradingview.com/external-embedding/embed-widget-events.js',
      opts: { colorTheme: 'dark', isTransparent: true, width: '100%', height: '100%',
        locale: 'es', importanceFilter: '0,1', countryFilter: 'us,eu,gb,jp,cn,ca,au' }
    });
  };
})();
