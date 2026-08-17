/* movil/activos.js — Pantalla 4 (Activos). Tarjeta de balance + lista de
   monedas de la wallet (con logo), Recibir (QR), y herramientas repartidas:
   Colector de polvo y Alertas de precio. */

import { IC } from './iconos.js?v=1';
import * as wallet from '../wallet.js?v=125';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const APP_NOMBRE = 'CriptoCuba Oficial';
const LOGO_ESP = { EUR: 'https://flagcdn.com/w80/eu.png', GBP: 'https://flagcdn.com/w80/gb.png' };
let _ojo = (() => { try { return localStorage.getItem('mv-ojo') === '1'; } catch (_) { return false; } })();
let _tab = 'spot';
let _cg = {};   // id -> cg
let _img = {};  // cg -> img url

export function pintarActivos(host, api) {
  const con = api.estaConectado();
  const b = api.balance();

  host.innerHTML = `
    <div class="mv-top" style="padding-left:0;padding-right:0">
      <b style="font-size:20px;font-weight:800">Activos</b>
      <div style="flex:1"></div>
      <button class="mv-ico-btn" id="ac-alert" title="Alertas de precio">${IC.bell}</button>
    </div>

    <div class="ac-card">
      <div class="ac-card-top">
        <span class="ac-lbl" id="ac-eye">Balance total (USDT) ${IC.eye}</span>
        <span class="ac-brand">${esc(APP_NOMBRE)}</span>
      </div>
      <div class="ac-bal" id="ac-bal">—</div>
      <div class="ac-sub" id="ac-sub"></div>
      <div class="ac-acts">
        <button class="ac-act" id="ac-recv"><span>${IC.arrowDown}</span>Recibir</button>
        <button class="ac-act" id="ac-buy"><span>${IC.buy}</span>Comprar</button>
        <button class="ac-act" id="ac-sell"><span>${IC.sell}</span>Vender</button>
        <button class="ac-act" id="ac-swap"><span>${IC.swap}</span>Swap</button>
      </div>
    </div>

    <div class="ac-tabs" id="ac-tabs">
      <button data-t="spot" class="${_tab === 'spot' ? 'on' : ''}">Spot</button>
      <button data-t="polvo" class="${_tab === 'polvo' ? 'on' : ''}">Colector de polvo</button>
      <button data-t="activity" class="${_tab === 'activity' ? 'on' : ''}">Actividad</button>
    </div>
    <div id="ac-list"></div>
  `;

  $('ac-alert').onclick = () => api.abrir('alertasTool');
  $('ac-recv').onclick = () => api.abrir('recibir');
  $('ac-buy').onclick = () => api.abrir('buy');
  $('ac-sell').onclick = () => api.abrir('sell');
  $('ac-swap').onclick = () => api.abrir('swap');
  $('ac-eye').onclick = () => { _ojo = !_ojo; try { localStorage.setItem('mv-ojo', _ojo ? '1' : '0'); } catch (_) {} pintar(); };
  host.querySelectorAll('#ac-tabs button').forEach((btn) => btn.onclick = () => {
    const t = btn.getAttribute('data-t');
    if (t === 'polvo') { api.abrir('polvo'); return; }               // colector de polvo (tools)
    if (t === 'activity') { const c = wallet.cuentaActual && wallet.cuentaActual(); if (c) { try { window.open('https://bscscan.com/address/' + c, '_blank', 'noopener'); } catch (_) {} } else api.abrir('perfil'); return; }
    _tab = t; host.querySelectorAll('#ac-tabs button').forEach((x) => x.classList.toggle('on', x === btn)); pintar();
  });

  cargarCg();
  const pintar = () => {
    const bal = $('ac-bal'), sub = $('ac-sub'), list = $('ac-list');
    if (!con || !b || !b.conectado) { bal.textContent = '—'; sub.textContent = ''; list.innerHTML = `<div class="mv-empty">Conecta tu wallet para ver tus activos.</div>`; return; }
    bal.textContent = _ojo ? '••••••' : fmt(b.totalUSD);
    sub.textContent = _ojo ? '' : '≈ $' + fmt(b.totalUSD);
    const act = (b.activos || []).slice().sort((x, y) => y.usd - x.usd);
    if (!act.length) { list.innerHTML = `<div class="mv-empty">Tu wallet no tiene saldo todavía.</div>`; return; }
    list.innerHTML = act.map((a) => {
      const logo = LOGO_ESP[a.id] || (_cg[a.id] && _img[_cg[a.id]]) || '';
      return `<div class="ac-row">
        <div class="ac-ci" style="${logo ? `background-image:url(${logo});background-size:cover` : ''}">${logo ? '' : esc(a.id.slice(0, 3))}</div>
        <div class="ac-nm"><b>${esc(a.id)}</b><small>${_ojo ? '••••' : fmtAmt(a.bal)}</small></div>
        <div class="ac-am"><b>${_ojo ? '••••' : '$' + fmt(a.usd)}</b></div>
      </div>`;
    }).join('');
  };
  pintar();
  host._pintarBal = pintar;
}

async function cargarCg() {
  try { const tk = await import('../tokens.js?v=125'); Object.values(tk.MONEDAS || {}).forEach((m) => { if (m.cg) _cg[m.id] = m.cg; }); } catch (_) {}
  try { const c = JSON.parse(localStorage.getItem('mv-cg') || 'null'); if (c && c.d) Object.keys(c.d).forEach((k) => { if (c.d[k] && c.d[k].img) _img[k] = c.d[k].img; }); } catch (_) {}
  // completa logos que falten desde CoinGecko
  try {
    const faltan = Object.values(_cg).filter((cg) => !_img[cg]);
    if (faltan.length) {
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${[...new Set(faltan)].join(',')}&per_page=250`);
      if (r.ok) { const j = await r.json(); j.forEach((x) => { _img[x.id] = x.image; }); const list = $('ac-list'); const host = $('mv-scroll'); if (host && host._pintarBal) host._pintarBal(); }
    }
  } catch (_) {}
}

function fmt(v) { const n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function fmtAmt(v) { v = Number(v) || 0; return v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : v.toLocaleString('en-US', { maximumFractionDigits: 8 }); }
