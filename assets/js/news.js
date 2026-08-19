/* ══════════════════════════════════════════════════════════════
   CALENDARIO ECONÓMICO — ventana compartida por Institutional Radar,
   Liquidity Pools y Smart Levels.

   Usa el widget de CashbackForex (gratuito, en vivo, sin API key). La
   estética exterior (cabecera dorada, marca, puntico) es nuestra; solo
   los datos del calendario vienen del proveedor.

   (Las NOTICIAS se retiraron: las fuentes disponibles no daban datos en
   tiempo real. Este módulo ya solo expone el calendario.)

   Expone: window.abrirCalendario()
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.abrirCalendario) return;
  var _seq = 0;

  function css() {
    if (document.getElementById('nwx-css')) return;
    var s = document.createElement('style'); s.id = 'nwx-css';
    s.textContent =
    '.nwx-box{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,sans-serif}' +
    '.nwx-box .nwx-bg{position:absolute;inset:0;background:rgba(3,5,8,.86);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '.nwx-box .nwx-c{position:relative;width:100%;max-width:860px;height:min(780px,92vh);display:flex;flex-direction:column;background:linear-gradient(180deg,#12171f,#0a0d12);border:1px solid rgba(232,184,75,.4);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '.nwx-box .nwx-h{display:flex;align-items:center;gap:10px;padding:15px 18px;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto}' +
    '.nwx-box .nwx-dot{width:9px;height:9px;border-radius:50%;background:#f6465d;box-shadow:0 0 0 0 rgba(246,70,93,.6);animation:nwxPulse 2s infinite;flex:0 0 auto}' +
    '.nwx-box .nwx-h b{font-family:var(--display,system-ui);font-weight:800;font-size:17px;color:#E8B84B;letter-spacing:.3px}' +
    '.nwx-box .nwx-h span{font-size:11.5px;color:#8b95a1;font-family:ui-monospace,monospace}' +
    '.nwx-box .nwx-x{margin-left:auto;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#c8cfd8;font-size:18px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}' +
    '.nwx-box .nwx-x:active{transform:translateY(1px)}' +
    '.nwx-box .nwx-body{flex:1;min-height:0;position:relative;overflow:auto;background:#0b0f15}' +
    '.nwx-box .nwx-body>div{width:100%}' +
    '.nwx-box .nwx-load{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#8b95a1;font-size:13px;pointer-events:none}' +
    '.nwx-box .nwx-spin{width:26px;height:26px;border:3px solid rgba(232,184,75,.25);border-top-color:#E8B84B;border-radius:50%;animation:nwxSpin .8s linear infinite}' +
    '.nwx-box .nwx-foot{flex:0 0 auto;padding:7px 12px;text-align:center;font-size:10px;color:#5c6672;font-family:ui-monospace,monospace;border-top:1px solid rgba(255,255,255,.05)}' +
    // Acentos con los colores de la marca sobre el widget embebido (best-effort).
    '.nwx-box .nwx-body a{color:#E8B84B!important}' +
    '.nwx-box .nwx-body ::selection{background:rgba(232,184,75,.35)}' +
    '.nwx-box .nwx-body::-webkit-scrollbar{width:10px}' +
    '.nwx-box .nwx-body::-webkit-scrollbar-thumb{background:rgba(232,184,75,.35);border-radius:8px}' +
    '.nwx-box .nwx-body::-webkit-scrollbar-track{background:transparent}' +
    '@keyframes nwxSpin{to{transform:rotate(360deg)}}' +
    '@keyframes nwxPulse{0%{box-shadow:0 0 0 0 rgba(246,70,93,.55)}70%{box-shadow:0 0 0 7px rgba(246,70,93,0)}100%{box-shadow:0 0 0 0 rgba(246,70,93,0)}}' +
    '@media(max-width:760px){.nwx-box{padding:0}.nwx-box .nwx-c{max-width:100%;height:100%;border-radius:0;border:none}}';
    document.head.appendChild(s);
  }

  function montarCalendario(body) {
    var id = 'economic-calendar-' + (Date.now() % 1000000) + (_seq++);
    var cont = document.createElement('div'); cont.id = id;
    body.appendChild(cont);
    var opts = { Lang: 'es', DefaultTime: 'today', DefaultTheme: 'dark',
      Url: 'https://www.cashbackforex.com', SubPath: 'economic-calendar',
      IsShowEmbedButton: false, ContainerId: id };
    var lanzar = function () { try { if (window.RemoteCalendar) window.RemoteCalendar(opts); } catch (_) {} };
    if (window.RemoteCalendar) { lanzar(); return; }
    var prev = document.getElementById('cbfx-cal-js');
    if (prev) { var t = setInterval(function () { if (window.RemoteCalendar) { clearInterval(t); lanzar(); } }, 200); setTimeout(function () { clearInterval(t); }, 8000); return; }
    var sc = document.createElement('script'); sc.id = 'cbfx-cal-js';
    sc.src = 'https://www.cashbackforex.com/Content/remote/remote-calendar-widget.js';
    sc.onload = lanzar;
    document.body.appendChild(sc);
  }

  window.abrirCalendario = function () {
    css();
    var prev = document.getElementById('nwx-box'); if (prev) prev.remove();
    var box = document.createElement('div'); box.id = 'nwx-box'; box.className = 'nwx-box';
    box.innerHTML =
      '<div class="nwx-bg"></div>' +
      '<div class="nwx-c">' +
        '<div class="nwx-h"><span class="nwx-dot"></span><b>Calendario econ\u00f3mico</b><span>Eventos \u00b7 hoy</span>' +
          '<button class="nwx-x" aria-label="Cerrar">\u2715</button></div>' +
        '<div class="nwx-body"><div class="nwx-load"><div class="nwx-spin"></div>Cargando\u2026</div></div>' +
        '<div class="nwx-foot">Datos en vivo</div>' +
      '</div>';
    document.body.appendChild(box);
    var cerrar = function () { box.remove(); };
    box.querySelector('.nwx-bg').onclick = cerrar;
    box.querySelector('.nwx-x').onclick = cerrar;
    var body = box.querySelector('.nwx-body');
    montarCalendario(body);
    var t0 = Date.now();
    var iv = setInterval(function () {
      if (!box.isConnected) { clearInterval(iv); return; }
      if (body.querySelector('iframe, table, .economic-calendar, [class*="calendar"]') || Date.now() - t0 > 9000) {
        var l = body.querySelector('.nwx-load'); if (l) l.remove(); clearInterval(iv);
      }
    }, 300);
  };

  // Compatibilidad: si algún botón viejo llama a abrirNoticias, abrimos el calendario.
  window.abrirNoticias = function () { window.abrirCalendario(); };
})();
