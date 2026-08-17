/* movil/picker.js — Selector de moneda compacto y reutilizable: logo, precio,
   % 24h y barra de búsqueda. Lo usan Operar (moneda/limit), el balance de
   Inicio y las alertas de precio. Datos: cache de Mercados (mv-cg) + CoinGecko. */

import { IC } from './iconos.js?v=1';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const LOGO_ESP = { EUR: 'https://flagcdn.com/w80/eu.png', GBP: 'https://flagcdn.com/w80/gb.png', PAXG: 'https://assets.coingecko.com/coins/images/9519/small/paxgold.png' };

/* abrirPicker(titulo, items, onPick)
   items: [{ id, s?, n, cg? }]  (precio/logo se resuelven solos) */
export function abrirPicker(titulo, items, onPick) {
  let m = document.getElementById('mv-picker'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'mv-picker';
  m.innerHTML = `
    <div class="mvp-bg"></div>
    <div class="mvp-card">
      <div class="mvp-h"><b>${esc(titulo)}</b><button aria-label="Cerrar">✕</button></div>
      <div class="mvp-search">${IC.search}<input id="mvp-q" placeholder="Busca por símbolo…" autocomplete="off"></div>
      <div class="mvp-list" id="mvp-list"></div>
    </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.mvp-bg').onclick = cerrar;
  m.querySelector('.mvp-h button').onclick = cerrar;

  const datos = leerCache();
  let q = '';
  const pintar = () => {
    const l = items.filter((it) => !q || (it.id + ' ' + (it.n || '') + ' ' + (it.s || '')).toLowerCase().includes(q));
    const cont = document.getElementById('mvp-list');
    if (!l.length) { cont.innerHTML = `<div class="mvp-empty">Sin resultados.</div>`; return; }
    cont.innerHTML = l.map((it) => {
      const d = (it.cg && datos[it.cg]) || {};
      const logo = LOGO_ESP[it.id] || d.img || '';
      const chg = d.chg;
      const cls = chg == null ? 'fl' : (chg > 0 ? 'up' : (chg < 0 ? 'dn' : 'fl'));
      const chgTxt = chg == null ? '' : (chg > 0 ? '+' : '') + Number(chg).toFixed(2) + '%';
      const pr = d.price == null ? '' : fmtP(d.price);
      return `<button class="mvp-row" data-id="${esc(it.id)}">
        <span class="mvp-ci" style="${logo ? `background-image:url(${logo})` : ''}">${logo ? '' : esc(it.id.slice(0, 3))}</span>
        <span class="mvp-nm"><b>${esc(it.s || it.id)}</b><small>${esc(it.n || '')}</small></span>
        <span class="mvp-pr"><b>${pr}</b><small class="${cls}">${chgTxt}</small></span>
      </button>`;
    }).join('');
    cont.querySelectorAll('[data-id]').forEach((b) => b.onclick = () => { cerrar(); onPick(b.getAttribute('data-id')); });
  };
  pintar();
  const inp = document.getElementById('mvp-q');
  inp.oninput = () => { q = inp.value.trim().toLowerCase(); pintar(); };
  setTimeout(() => inp.focus(), 60);

  // completa precios/logos que falten
  completar(items, datos).then(() => { if (document.getElementById('mv-picker')) pintar(); });
}

function leerCache() { try { const c = JSON.parse(localStorage.getItem('mv-cg') || 'null'); return (c && c.d) || {}; } catch (_) { return {}; } }

async function completar(items, datos) {
  const faltan = [...new Set(items.map((i) => i.cg).filter((cg) => cg && !datos[cg]))];
  if (!faltan.length) return;
  try {
    const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${faltan.join(',')}&per_page=250`);
    if (r.ok) { const j = await r.json(); j.forEach((x) => { datos[x.id] = { img: x.image, price: x.current_price, chg: x.price_change_percentage_24h }; }); try { localStorage.setItem('mv-cg', JSON.stringify({ t: Date.now(), d: datos })); } catch (_) {} }
  } catch (_) {}
}

function fmtP(p) { p = +p; if (!isFinite(p)) return ''; if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 }); if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 3 }); return p.toLocaleString('en-US', { maximumFractionDigits: 6 }); }
