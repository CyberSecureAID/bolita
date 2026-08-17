/* movil/markets.js — Pantalla 2 (Mercados). Lista TODAS las monedas de la
   plataforma (las que usan las gráficas), categorizadas. Al tocar una moneda
   se abre un selector para ir a Liquidity Pools / Radar Institucional /
   Smart Levels. Precios y % de 24h en vivo desde Binance (con fallback). */

import { IC } from './iconos.js?v=1';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const MEMES = new Set(['DOGE', 'PEPE', 'WIF', 'BONK', 'FLOKI', 'SHIB', 'ORDI']);

/* categorías de la barra superior */
const CATS = [
  { k: 'todas',   t: 'Todas' },
  { k: 'cripto',  t: 'Cripto' },
  { k: 'meme',    t: 'Memecoins' },
  { k: 'divisa',  t: 'Divisas' },
  { k: 'materia', t: 'Materias' },
];

let _pares = [];
let _cat = 'todas';
let _fav = cargarFav();
let _tab = 'spot';          // favoritos | spot
let _precios = {};          // symbol -> { p, chg }

function cargarFav() { try { return new Set(JSON.parse(localStorage.getItem('mv-fav') || '[]')); } catch (_) { return new Set(); } }
function guardarFav() { try { localStorage.setItem('mv-fav', JSON.stringify([..._fav])); } catch (_) {} }

export async function pintarMercados(host, api) {
  if (!_pares.length) {
    try { const c = await import('../niveles/config.js?v=1'); _pares = (c.PARES || []).slice(); } catch (_) { _pares = []; }
  }

  host.innerHTML = `
    <div class="mv-top" style="padding-left:0;padding-right:0">
      <button class="mv-search" id="mv-mk-search" style="flex:1">${IC.search}<span>Busca una moneda…</span></button>
      <button class="mv-ico-btn" id="mv-mk-alert">${IC.bell}</button>
    </div>
    <div class="mv-mk-tabs">
      <button data-t="fav" class="${_tab === 'fav' ? 'on' : ''}">Favoritos</button>
      <button data-t="spot" class="${_tab === 'spot' ? 'on' : ''}">Spot</button>
    </div>
    <div class="mv-mk-cats" id="mv-mk-cats">
      ${CATS.map((c) => `<button data-c="${c.k}" class="${c.k === _cat ? 'on' : ''}">${c.t}</button>`).join('')}
    </div>
    <div class="mv-mk-sort"><span>Moneda</span><span>Último precio / 24h</span></div>
    <div id="mv-mk-list"></div>
  `;

  $('mv-mk-search').onclick = () => { api.abrir && api.abrir('buscar'); };
  $('mv-mk-alert').onclick = () => { api.abrir && api.abrir('alertas'); };
  host.querySelectorAll('.mv-mk-tabs button').forEach((b) => b.onclick = () => { _tab = b.getAttribute('data-t'); pintarMercados(host, api); });
  host.querySelectorAll('.mv-mk-cats button').forEach((b) => b.onclick = () => { _cat = b.getAttribute('data-c'); render(api); });

  render(api);
  cargarPrecios(api);          // en vivo, actualiza cuando llegan
}

function filtrar() {
  let l = _pares.slice();
  if (_tab === 'fav') l = l.filter((p) => _fav.has(p.id));
  if (_cat === 'cripto') l = l.filter((p) => (p.grupo || 'cripto') === 'cripto' && !MEMES.has(p.id));
  else if (_cat === 'meme') l = l.filter((p) => MEMES.has(p.id));
  else if (_cat === 'divisa') l = l.filter((p) => p.grupo === 'divisa');
  else if (_cat === 'materia') l = l.filter((p) => p.grupo === 'materia');
  return l;
}

function render(api) {
  const cont = $('mv-mk-list'); if (!cont) return;
  const l = filtrar();
  if (!l.length) {
    cont.innerHTML = `<div class="mv-empty">${_tab === 'fav' ? 'Aún no tienes favoritos. Toca la estrella en una moneda.' : 'Sin monedas en esta categoría.'}</div>`;
    return;
  }
  cont.innerHTML = l.map((p) => {
    const pr = _precios[p.s] || {};
    const chg = pr.chg;
    const cls = chg == null ? 'fl' : (chg > 0 ? 'up' : (chg < 0 ? 'dn' : 'fl'));
    const chgTxt = chg == null ? '—' : (chg > 0 ? '+' : '') + chg.toFixed(2) + '%';
    const precio = pr.p == null ? '—' : fmtPrecio(pr.p);
    const fav = _fav.has(p.id);
    return `<div class="mv-row" data-id="${esc(p.id)}">
      <button class="mv-fav-b" data-fav="${esc(p.id)}" style="background:none;border:0;padding:0;color:${fav ? 'var(--mv-gold)' : 'var(--mv-mut2)'}">${fav ? IC.star : starOutline()}</button>
      <div class="mv-ci"><span class="ico-fb">${esc(p.id.slice(0, 3))}</span><i data-cg="${esc(p.cg || '')}"></i></div>
      <div class="mv-cn"><b>${esc(p.s)}</b><small>${esc(p.n)}</small></div>
      <div class="mv-cp"><b>${precio}</b><small class="${cls}">${chgTxt}</small></div>
    </div>`;
  }).join('');

  cont.querySelectorAll('.mv-row').forEach((row) => {
    row.onclick = (e) => {
      if (e.target.closest('[data-fav]')) return;
      const id = row.getAttribute('data-id');
      selectorGrafica(l.find((x) => x.id === id), api);
    };
  });
  cont.querySelectorAll('[data-fav]').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); const id = b.getAttribute('data-fav'); if (_fav.has(id)) _fav.delete(id); else _fav.add(id); guardarFav(); render(api); };
  });
  ponerLogos(cont);
}

/* Selector: a qué gráfica ir con la moneda tocada */
function selectorGrafica(par, api) {
  if (!par) return;
  let sh = $('mv-sheet');
  if (sh) sh.remove();
  sh = document.createElement('div');
  sh.id = 'mv-sheet';
  sh.innerHTML = `
    <div class="mv-sheet-bg"></div>
    <div class="mv-sheet-card">
      <div class="mv-sheet-h"><b>${esc(par.id)} · ${esc(par.n)}</b><span>Elige la gráfica</span></div>
      <button class="mv-sheet-op" data-g="niveles">${IC.chart}<div><b>Smart Levels</b><small>Niveles y operaciones al toque</small></div></button>
      <button class="mv-sheet-op" data-g="muros">${IC.candles}<div><b>Radar Institucional</b><small>Flujo de órdenes y muros</small></div></button>
      <button class="mv-sheet-op" data-g="liquidity">${IC.pool}<div><b>Liquidity Pools</b><small>Profundidad y liquidez</small></div></button>
      <button class="mv-sheet-cancel">Cancelar</button>
    </div>`;
  document.body.appendChild(sh);
  const cerrar = () => sh.remove();
  sh.querySelector('.mv-sheet-bg').onclick = cerrar;
  sh.querySelector('.mv-sheet-cancel').onclick = cerrar;
  sh.querySelectorAll('.mv-sheet-op').forEach((b) => {
    b.onclick = () => { cerrar(); api.abrirGrafica ? api.abrirGrafica(b.getAttribute('data-g'), par) : api.abrir(b.getAttribute('data-g')); };
  });
}

/* Precios 24h en vivo (Binance). Silencioso si falla (sandbox/red). */
async function cargarPrecios(api) {
  try {
    const syms = _pares.map((p) => p.s).filter(Boolean);
    const url = 'https://api.binance.com/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(syms));
    const r = await fetch(url);
    if (!r.ok) return;
    const arr = await r.json();
    arr.forEach((x) => { _precios[x.symbol] = { p: Number(x.lastPrice), chg: Number(x.priceChangePercent) }; });
    const host = document.getElementById('mv-scroll');
    if (host && $('mv-mk-list')) render(api);
  } catch (_) { /* red bloqueada: quedan en — */ }
}

/* Logos: intenta el logo real por coingecko id (mismo criterio que la web). */
function ponerLogos(cont) {
  cont.querySelectorAll('i[data-cg]').forEach((i) => {
    const cg = i.getAttribute('data-cg'); if (!cg) return;
    const img = new Image();
    img.onload = () => { const box = i.closest('.mv-ci'); if (box) { box.innerHTML = ''; box.appendChild(img); } };
    img.onerror = () => {};
    img.src = `https://assets.coingecko.com/coins/images/thumb/${cg}.png`;
    // coingecko no expone por slug directo; si falla, se queda el fallback de 3 letras.
  });
}

function fmtPrecio(p) {
  if (!isFinite(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 3 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 6 });
}
function starOutline() { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg>'; }
