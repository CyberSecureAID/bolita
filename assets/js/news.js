/* ══════════════════════════════════════════════════════════════
   NOTICIAS (News) — ventana compartida por Institutional Radar,
   Liquidity Pools y Smart Levels.

   Fuente: API pública y gratuita de CryptoCompare (noticias cripto en
   tiempo real). Tiene CORS abierto, así que se consume directo desde el
   navegador SIN proxies ni clave. Si algún día falla, muestra reintentar.
   Se expone en window.abrirNoticias().
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.abrirNoticias) return;

  // Endpoints de CryptoCompare (CORS abierto, sin API key).
  // sortOrder=latest es CLAVE: por defecto ordena por popularidad y devuelve
  // artículos viejos; con 'latest' trae lo de AHORA MISMO.
  var FUENTES = [
    'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest',
    'https://min-api.cryptocompare.com/data/v2/news/?lang=ES&sortOrder=latest',
    'https://min-api.cryptocompare.com/data/v2/news/?lang=EN&sortOrder=latest&categories=Trading,Technical%20Analysis,Market,Regulation'
  ];
  // Respaldo por RSS (por si CryptoCompare estuviera bloqueado en tu red).
  var RSS = [
    'https://es.cointelegraph.com/rss',
    'https://cointelegraph.com/rss/tag/tech-analysis',
    'https://es.investing.com/rss/news_301.rss',
    'https://www.dailyforex.com/forex-rss'
  ];

  var _cache = null, _cacheAt = 0;

  function conTimeout(promesa, ms) {
    return new Promise(function (res, rej) {
      var to = setTimeout(function () { rej(new Error('timeout')); }, ms);
      promesa.then(function (v) { clearTimeout(to); res(v); }, function (e) { clearTimeout(to); rej(e); });
    });
  }

  function traer(url) {
    return conTimeout(fetch(url, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status); return r.json();
    }), 10000).then(function (j) {
      var arr = (j && j.Data) || [];
      return arr.map(function (n) {
        return {
          titulo: (n.title || '').trim(),
          link: n.url || n.guid || '',
          desc: (n.body || '').replace(/\s+/g, ' ').trim().slice(0, 220),
          fuente: (n.source_info && n.source_info.name) || n.source || 'Crypto',
          img: n.imageurl || '',
          ts: n.published_on ? n.published_on * 1000 : 0
        };
      }).filter(function (x) { return x.titulo && x.link; });
    });
  }

  // Respaldo: leer un RSS vía servicios con CORS abierto (rss2json / allorigins).
  function traerRSS(url) {
    var vias = [
      function () {
        return conTimeout(fetch('https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(url), { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); }), 9000)
          .then(function (j) {
            if (!j || j.status !== 'ok' || !j.items || !j.items.length) throw 0;
            var fuente = (j.feed && j.feed.title) || 'RSS';
            return j.items.map(function (it) {
              return { titulo: (it.title || '').trim(), link: it.link || '', desc: (it.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220), fuente: fuente, img: it.thumbnail || (it.enclosure && it.enclosure.link) || '', ts: it.pubDate ? Date.parse(it.pubDate) : 0 };
            }).filter(function (x) { return x.titulo && x.link; });
          });
      },
      function () {
        return conTimeout(fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url), { cache: 'no-store' })
          .then(function (r) { if (!r.ok) throw 0; return r.json(); }), 9000)
          .then(function (j) { var it = parsearXML(j.contents || '', url); if (!it.length) throw 0; return it; });
      }
    ];
    var i = 0;
    function paso() { if (i >= vias.length) return Promise.resolve([]); return vias[i++]().catch(paso); }
    return paso();
  }

  function parsearXML(xml, url) {
    try {
      var doc = new DOMParser().parseFromString(xml, 'text/xml');
      var host = (url.split('/')[2] || 'RSS').replace('www.', '');
      var items = [].slice.call(doc.querySelectorAll('item'));
      if (!items.length) items = [].slice.call(doc.querySelectorAll('entry'));
      return items.map(function (it) {
        var g = function (s) { var n = it.querySelector(s); return n ? (n.textContent || '').trim() : ''; };
        var link = g('link'); if (!link) { var l = it.querySelector('link'); if (l) link = l.getAttribute('href') || ''; }
        var fecha = g('pubDate') || g('published') || g('updated');
        return { titulo: g('title'), link: link, desc: (g('description') || g('summary') || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 220), fuente: host, img: '', ts: fecha ? Date.parse(fecha) : 0 };
      }).filter(function (x) { return x.titulo && x.link; });
    } catch (e) { return []; }
  }

  function cargarTodo() {
    if (_cache && Date.now() - _cacheAt < 120000) return Promise.resolve(_cache);
    var ps = FUENTES.map(function (u) { return traer(u).catch(function () { return []; }); });
    return Promise.all(ps).then(function (listas) {
      var todo = [];
      listas.forEach(function (l) { todo = todo.concat(l); });
      if (todo.length) return fusionar(todo);
      // CryptoCompare no dio nada → respaldo RSS.
      var rs = RSS.map(function (u) { return traerRSS(u).catch(function () { return []; }); });
      return Promise.all(rs).then(function (l2) { var t2 = []; l2.forEach(function (l) { t2 = t2.concat(l); }); return fusionar(t2); });
    });
  }

  function fusionar(todo) {
    if (!todo || !todo.length) return [];
    var visto = {}, out = [];
    todo.forEach(function (n) { var k = (n.link || n.titulo).slice(0, 80); if (k && !visto[k]) { visto[k] = 1; out.push(n); } });
    out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    // Priorizar lo RECIENTE: si hay suficientes de los últimos 7 días, mostramos
    // solo esos (nada de artículos viejos colándose). Si no, mostramos todo.
    var limite = Date.now() - 7 * 864e5;
    var frescas = out.filter(function (n) { return n.ts && n.ts >= limite; });
    var lista = frescas.length >= 12 ? frescas : out;
    _cache = lista.slice(0, 60); _cacheAt = Date.now();
    return _cache;
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
    '#news-box .nw-list{flex:1;overflow-y:auto;padding:14px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;align-content:start}' +
    '#news-box .nw-item{display:flex;flex-direction:column;text-decoration:none;border-radius:14px;overflow:hidden;background:#141a23;border:1px solid rgba(255,255,255,.07);transition:border-color .15s,transform .08s,box-shadow .15s}' +
    '#news-box .nw-item:hover{border-color:rgba(232,184,75,.55);box-shadow:0 10px 26px rgba(0,0,0,.4);transform:translateY(-2px)}' +
    '#news-box .nw-item:active{transform:translateY(0)}' +
    '#news-box .nw-ph{position:relative;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#1c2530,#0e131a);overflow:hidden}' +
    '#news-box .nw-ph img{width:100%;height:100%;object-fit:cover;display:block}' +
    '#news-box .nw-ph.noimg::after{content:"CRIPTOCUBA";position:absolute;inset:0;display:grid;place-items:center;font-family:ui-monospace,monospace;font-weight:800;font-size:15px;letter-spacing:2px;color:rgba(232,184,75,.35)}' +
    '#news-box .nw-ph .nw-src{position:absolute;left:8px;top:8px;padding:3px 7px;border-radius:7px;background:rgba(8,11,16,.82);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);font-size:9.5px;font-weight:800;color:#E8B84B;font-family:ui-monospace,monospace;text-transform:uppercase;letter-spacing:.5px;max-width:75%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#news-box .nw-ph .nw-time{position:absolute;right:8px;top:8px;padding:3px 7px;border-radius:7px;background:rgba(8,11,16,.82);font-size:9.5px;color:#cfd6de;font-family:ui-monospace,monospace}' +
    '#news-box .nw-body{padding:11px 13px 13px;display:flex;flex-direction:column;gap:6px}' +
    '#news-box .nw-t{font-size:14.5px;font-weight:800;color:#eef2f7;line-height:1.32;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}' +
    '#news-box .nw-d{font-size:12px;color:#939daa;line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' +
    '#news-box .nw-state{grid-column:1/-1;padding:56px 22px;text-align:center;color:#8b95a1;font-size:13.5px;line-height:1.6}' +
    '#news-box .nw-spin{width:28px;height:28px;border:3px solid rgba(232,184,75,.25);border-top-color:#E8B84B;border-radius:50%;margin:0 auto 14px;animation:nwSpin .8s linear infinite}' +
    '#news-box .nw-retry{margin-top:14px;padding:9px 16px;border-radius:9px;border:1px solid rgba(232,184,75,.5);background:rgba(232,184,75,.12);color:#E8B84B;font-weight:700;font-size:12.5px;cursor:pointer}' +
    '@keyframes nwSpin{to{transform:rotate(360deg)}}' +
    '@keyframes nwPulse{0%{box-shadow:0 0 0 0 rgba(246,70,93,.55)}70%{box-shadow:0 0 0 7px rgba(246,70,93,0)}100%{box-shadow:0 0 0 0 rgba(246,70,93,0)}}' +
    '@media(max-width:760px){#news-box{padding:0}#news-box .nw-c{max-width:100%;height:100%;border-radius:0;border:none}#news-box .nw-list{grid-template-columns:1fr;gap:12px;padding:12px}}';
    document.head.appendChild(s);
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render(lista, items) {
    if (!items.length) {
      lista.innerHTML = '<div class="nw-state">No se pudieron cargar las noticias ahora mismo.' +
        '<br><button class="nw-retry" id="nw-retry">Reintentar</button></div>';
      var rb = lista.querySelector('#nw-retry');
      if (rb) rb.onclick = function () { pintar(lista, true); };
      return;
    }
    lista.innerHTML = '';
    items.forEach(function (n) {
      var a = document.createElement('a');
      a.className = 'nw-item'; a.href = n.link; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.innerHTML =
        '<div class="nw-ph' + (n.img ? '' : ' noimg') + '">' +
          (n.img ? '<img loading="lazy" src="' + esc(n.img) + '" onerror="this.parentNode.classList.add(\'noimg\');this.remove()">' : '') +
          '<span class="nw-src">' + esc(n.fuente) + '</span>' +
          (n.ts ? '<span class="nw-time">' + hace(n.ts) + '</span>' : '') +
        '</div>' +
        '<div class="nw-body">' +
          '<p class="nw-t">' + esc(n.titulo) + '</p>' +
          (n.desc ? '<p class="nw-d">' + esc(n.desc) + '</p>' : '') +
        '</div>';
      lista.appendChild(a);
    });
  }

  function pintar(lista, forzar) {
    lista.innerHTML = '<div class="nw-state"><div class="nw-spin"></div>Cargando noticias\u2026</div>';
    if (forzar) { _cache = null; }
    cargarTodo().then(function (items) { if (lista.isConnected) render(lista, items); })
      .catch(function () { if (lista.isConnected) render(lista, []); });
  }

  window.abrirNoticias = function () {
    css();
    var prev = document.getElementById('news-box'); if (prev) prev.remove();
    var box = document.createElement('div'); box.id = 'news-box';
    box.innerHTML =
      '<div class="nw-bg"></div>' +
      '<div class="nw-c">' +
        '<div class="nw-h"><span class="nw-dot"></span><b>News</b><span>Crypto</span>' +
          '<button class="nw-x" aria-label="Cerrar">\u2715</button></div>' +
        '<div class="nw-list"></div>' +
      '</div>';
    document.body.appendChild(box);
    var cerrar = function () { box.remove(); };
    box.querySelector('.nw-bg').onclick = cerrar;
    box.querySelector('.nw-x').onclick = cerrar;
    pintar(box.querySelector('.nw-list'), false);
  };
})();
