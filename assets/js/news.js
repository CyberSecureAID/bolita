/* ══════════════════════════════════════════════════════════════
   NOTICIAS (News) — ventana compartida por Institutional Radar,
   Liquidity Pools y Smart Levels. Lee los RSS indicados y los muestra
   ordenados por fecha. No inventa contenido: si un feed no carga, lo omite.
   Se expone en window.abrirNoticias() para poder llamarlo desde cualquier
   módulo sin acoplarlos entre sí.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.abrirNoticias) return;   // evitar doble carga

  var FEEDS = [
    { url: 'https://es.cointelegraph.com/rss', fuente: 'Cointelegraph' },
    { url: 'https://es.cointelegraph.com/editors_pick_rss', fuente: 'Cointelegraph · Editors' },
    { url: 'https://cointelegraph.com/rss/tag/tech-analysis', fuente: 'Cointelegraph · TA' },
    { url: 'https://es.investing.com/rss/news_301.rss', fuente: 'Investing' },
    { url: 'https://www.dailyforex.com/forex-rss', fuente: 'DailyForex' }
  ];
  // Proxies CORS (se prueban en orden hasta que uno responda).
  var PROXIES = [
    function (u) { return 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u); },
    function (u) { return 'https://corsproxy.io/?url=' + encodeURIComponent(u); },
    function (u) { return 'https://thingproxy.freeboard.io/fetch/' + u; }
  ];

  var _cache = null, _cacheAt = 0;

  function traerFeed(feed) {
    var intentos = PROXIES.map(function (p) { return p(feed.url); });
    var i = 0;
    function siguiente() {
      if (i >= intentos.length) return Promise.resolve([]);
      var url = intentos[i++];
      return fetch(url, { cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); })
        .then(function (xml) { var it = parsear(xml, feed.fuente); if (!it.length) throw new Error('vacío'); return it; })
        .catch(function () { return siguiente(); });
    }
    return siguiente();
  }

  function parsear(xml, fuente) {
    try {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      var items = [].slice.call(doc.querySelectorAll('item'));
      if (!items.length) items = [].slice.call(doc.querySelectorAll('entry')); // Atom
      return items.map(function (it) {
        var g = function (sel) { var n = it.querySelector(sel); return n ? (n.textContent || '').trim() : ''; };
        var link = g('link');
        if (!link) { var l = it.querySelector('link'); if (l) link = l.getAttribute('href') || ''; }
        var desc = g('description') || g('summary') || g('content');
        desc = desc.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        var fecha = g('pubDate') || g('published') || g('updated') || '';
        var ts = fecha ? Date.parse(fecha) : 0;
        return { titulo: g('title'), link: link, desc: desc.slice(0, 240), fuente: fuente, fecha: fecha, ts: isNaN(ts) ? 0 : ts };
      }).filter(function (x) { return x.titulo && x.link; });
    } catch (e) { return []; }
  }

  function cargarTodo() {
    if (_cache && Date.now() - _cacheAt < 180000) return Promise.resolve(_cache);
    return Promise.all(FEEDS.map(traerFeed)).then(function (listas) {
      var todo = [];
      listas.forEach(function (l) { todo = todo.concat(l); });
      // de-duplicar por título
      var visto = {}, out = [];
      todo.forEach(function (n) { var k = n.titulo.toLowerCase().slice(0, 60); if (!visto[k]) { visto[k] = 1; out.push(n); } });
      out.sort(function (a, b) { return b.ts - a.ts; });
      _cache = out.slice(0, 60); _cacheAt = Date.now();
      return _cache;
    });
  }

  function hace(ts) {
    if (!ts) return '';
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'ahora';
    if (s < 3600) return Math.floor(s / 60) + ' min';
    if (s < 86400) return Math.floor(s / 3600) + ' h';
    return Math.floor(s / 86400) + ' d';
  }

  function css() {
    if (document.getElementById('news-css')) return;
    var s = document.createElement('style'); s.id = 'news-css';
    s.textContent =
    '#news-box{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom,0px));font-family:system-ui,-apple-system,sans-serif}' +
    '#news-box .nw-bg{position:absolute;inset:0;background:rgba(3,5,8,.86);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}' +
    '#news-box .nw-c{position:relative;width:100%;max-width:860px;height:min(720px,90vh);display:flex;flex-direction:column;background:linear-gradient(180deg,#12171f,#0a0d12);border:1px solid rgba(232,184,75,.4);border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6)}' +
    '#news-box .nw-h{display:flex;align-items:center;gap:10px;padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07);flex:0 0 auto}' +
    '#news-box .nw-h .nw-dot{width:9px;height:9px;border-radius:50%;background:#f6465d;box-shadow:0 0 0 0 rgba(246,70,93,.6);animation:nwPulse 2s infinite}' +
    '#news-box .nw-h b{font-family:var(--display,system-ui);font-weight:800;font-size:17px;color:#E8B84B;letter-spacing:.3px}' +
    '#news-box .nw-h span{font-size:11.5px;color:#8b95a1;font-family:ui-monospace,monospace}' +
    '#news-box .nw-x{margin-left:auto;width:34px;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#c8cfd8;font-size:18px;cursor:pointer;display:grid;place-items:center}' +
    '#news-box .nw-x:active{transform:translateY(1px)}' +
    '#news-box .nw-list{flex:1;overflow-y:auto;padding:10px 12px 16px;display:flex;flex-direction:column;gap:8px}' +
    '#news-box .nw-item{display:block;text-decoration:none;padding:13px 14px;border-radius:12px;background:#161c25;border:1px solid rgba(255,255,255,.06);transition:border-color .15s,transform .05s}' +
    '#news-box .nw-item:hover{border-color:rgba(232,184,75,.45)}' +
    '#news-box .nw-item:active{transform:translateY(1px)}' +
    '#news-box .nw-meta{display:flex;align-items:center;gap:8px;margin-bottom:5px}' +
    '#news-box .nw-src{font-size:10.5px;font-weight:800;color:#E8B84B;font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.4px}' +
    '#news-box .nw-time{font-size:10.5px;color:#6b7681;font-family:ui-monospace,monospace}' +
    '#news-box .nw-t{font-size:14.5px;font-weight:700;color:#eaf0f6;line-height:1.35;margin:0 0 4px}' +
    '#news-box .nw-d{font-size:12.5px;color:#9aa3ad;line-height:1.5;margin:0}' +
    '#news-box .nw-state{padding:40px 20px;text-align:center;color:#8b95a1;font-size:13.5px;line-height:1.6}' +
    '#news-box .nw-spin{width:26px;height:26px;border:3px solid rgba(232,184,75,.25);border-top-color:#E8B84B;border-radius:50%;margin:0 auto 14px;animation:nwSpin .8s linear infinite}' +
    '@keyframes nwSpin{to{transform:rotate(360deg)}}' +
    '@keyframes nwPulse{0%{box-shadow:0 0 0 0 rgba(246,70,93,.55)}70%{box-shadow:0 0 0 7px rgba(246,70,93,0)}100%{box-shadow:0 0 0 0 rgba(246,70,93,0)}}' +
    '@media(max-width:760px){#news-box{padding:0}#news-box .nw-c{max-width:100%;height:100%;border-radius:0;border:none}}';
    document.head.appendChild(s);
  }

  window.abrirNoticias = function () {
    css();
    var prev = document.getElementById('news-box'); if (prev) prev.remove();
    var box = document.createElement('div'); box.id = 'news-box';
    box.innerHTML =
      '<div class="nw-bg"></div>' +
      '<div class="nw-c">' +
        '<div class="nw-h"><span class="nw-dot"></span><b>News</b><span>Crypto &amp; Forex</span>' +
          '<button class="nw-x" aria-label="Cerrar">\u2715</button></div>' +
        '<div class="nw-list"><div class="nw-state"><div class="nw-spin"></div>Cargando noticias\u2026</div></div>' +
      '</div>';
    document.body.appendChild(box);
    var cerrar = function () { box.remove(); };
    box.querySelector('.nw-bg').onclick = cerrar;
    box.querySelector('.nw-x').onclick = cerrar;
    var lista = box.querySelector('.nw-list');
    cargarTodo().then(function (items) {
      if (!box.isConnected) return;
      if (!items.length) {
        lista.innerHTML = '<div class="nw-state">No se pudieron cargar las noticias ahora mismo.<br>Vuelve a intentarlo en un momento.</div>';
        return;
      }
      lista.innerHTML = '';
      items.forEach(function (n) {
        var a = document.createElement('a');
        a.className = 'nw-item'; a.href = n.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.innerHTML =
          '<div class="nw-meta"><span class="nw-src">' + esc(n.fuente) + '</span>' +
            (n.ts ? '<span class="nw-time">\u00b7 ' + hace(n.ts) + '</span>' : '') + '</div>' +
          '<p class="nw-t">' + esc(n.titulo) + '</p>' +
          (n.desc ? '<p class="nw-d">' + esc(n.desc) + '</p>' : '');
        lista.appendChild(a);
      });
    }).catch(function () {
      if (box.isConnected) lista.innerHTML = '<div class="nw-state">No se pudieron cargar las noticias ahora mismo.</div>';
    });
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
})();
