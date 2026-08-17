/* movil/activos.js — Pantalla 4 (Activos). Tarjeta de balance total + lista de
   las monedas que el usuario tiene en su wallet. Comprar/Vender → Marketplace. */

import { IC } from './iconos.js?v=1';
import * as wallet from '../wallet.js?v=125';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const APP_NOMBRE = 'CriptoCuba Oficial';   // provisional; cambiará en el futuro
let _ojo = (() => { try { return localStorage.getItem('mv-ojo') === '1'; } catch (_) { return false; } })();

export function pintarActivos(host, api) {
  const con = api.estaConectado();
  const b = api.balance();

  host.innerHTML = `
    <div class="mv-top" style="padding-left:0;padding-right:0">
      <b style="font-size:20px;font-weight:800">Activos</b>
      <div style="flex:1"></div>
      <button class="mv-ico-btn" id="ac-alert">${IC.bell}</button>
    </div>

    <div class="ac-card">
      <div class="ac-card-top">
        <span class="ac-lbl" id="ac-eye">Balance total (USDT) ${IC.eye}</span>
        <span class="ac-brand">${esc(APP_NOMBRE)}</span>
      </div>
      <div class="ac-bal" id="ac-bal">—</div>
      <div class="ac-sub" id="ac-sub"></div>
      <div class="ac-acts">
        <button class="ac-act" id="ac-buy"><span>${IC.buy}</span>Comprar</button>
        <button class="ac-act" id="ac-sell"><span>${IC.sell}</span>Vender</button>
        <button class="ac-act" id="ac-swap"><span>${IC.swap}</span>Swap</button>
      </div>
    </div>

    <div class="ac-tabs"><button class="on">Spot</button></div>
    <div id="ac-list"></div>
  `;

  $('ac-alert').onclick = () => api.abrir('alertas');
  $('ac-buy').onclick = () => api.abrir('buy');
  $('ac-sell').onclick = () => api.abrir('sell');
  $('ac-swap').onclick = () => api.abrir('swap');
  $('ac-eye').onclick = () => { _ojo = !_ojo; try { localStorage.setItem('mv-ojo', _ojo ? '1' : '0'); } catch (_) {} pintar(); };

  const pintar = () => {
    const bal = $('ac-bal'), sub = $('ac-sub'), list = $('ac-list');
    if (!con || !b || !b.conectado) {
      bal.textContent = '—'; sub.textContent = '';
      list.innerHTML = `<div class="mv-empty">Conecta tu wallet para ver tus activos.</div>`;
      return;
    }
    bal.textContent = _ojo ? '••••••' : fmt(b.totalUSD);
    sub.textContent = _ojo ? '' : '≈ $' + fmt(b.totalUSD);
    const act = (b.activos || []).slice().sort((x, y) => y.usd - x.usd);
    if (!act.length) { list.innerHTML = `<div class="mv-empty">Tu wallet no tiene saldo todavía.</div>`; return; }
    list.innerHTML = act.map((a) => `
      <div class="ac-row">
        <div class="ac-ci">${esc(a.id.slice(0, 3))}</div>
        <div class="ac-nm"><b>${esc(a.id)}</b><small>${_ojo ? '••••' : fmtAmt(a.bal)}</small></div>
        <div class="ac-am"><b>${_ojo ? '••••' : '$' + fmt(a.usd)}</b></div>
      </div>`).join('');
  };
  pintar();
  host._pintarBal = pintar;
  // refresca cuando llegue el balance
  api.abrir && setTimeout(() => { if (api.balance()) { const nb = api.balance(); Object.assign(b || {}, nb || {}); pintar(); } }, 50);
}

function fmt(v) { const n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function fmtAmt(v) { v = Number(v) || 0; return v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 4 }) : v.toLocaleString('en-US', { maximumFractionDigits: 8 }); }
