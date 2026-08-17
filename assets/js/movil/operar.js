/* movil/operar.js — Pantalla 3 (Operar). Panel de trading al estilo de un
   exchange, pero SPOT y no custodial: sin apalancamiento. Muestra precio y
   libro de órdenes en vivo (Binance), selector de moneda, Market/Limit, y
   Comprar/Vender. La ejecución real se enruta a lo que ya existe:
   · Market  → Swap (compra/venta al momento).
   · Limit   → Smart Levels (poner orden a un precio).
   Accesos arriba: mini-gráfica, bots, velas (Smart Levels) y ⋮ (Herramientas). */

import { IC } from './iconos.js?v=1';
import { abrirPicker } from './picker.js?v=1';
import { abrirAlerta } from './alerta.js?v=1';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const LOGO_ESP = { EUR: 'https://flagcdn.com/w80/eu.png', GBP: 'https://flagcdn.com/w80/gb.png', PAXG: 'https://assets.coingecko.com/coins/images/9519/small/paxgold.png' };

let _pares = [];
let _par = null;          // par actual
let _tipo = 'market';     // market | limit
let _lado = null;         // solo para resaltar
let _quote = 'USDT';
let _libro = { asks: [], bids: [], precio: null, chg: null };
let _timer = null;
let _api = null;

export async function pintarOperar(host, api) {
  _api = api;
  if (!_pares.length) { try { const c = await import('../niveles/config.js?v=1'); _pares = (c.PARES || []).slice(); } catch (_) { _pares = []; } }
  if (!_par) _par = _pares.find((p) => p.id === 'BNB') || _pares.find((p) => p.id === 'BTC') || _pares[0];

  host.innerHTML = `
    <div class="op-head">
      <button class="op-sel" id="op-sel">
        <span class="op-logo" id="op-logo"></span>
        <b id="op-sym">${esc(_par ? _par.s : 'BTCUSDT')}</b>
        ${chev()}
      </button>
      <div class="op-acts">
        <button class="op-ic" id="op-alert" title="Alerta de precio">${IC.bell}</button>
        <button class="op-ic" id="op-mini" title="Gráfica">${IC.minichart}</button>
        <button class="op-ic" id="op-bots" title="Bots">${IC.bot}</button>
        <button class="op-ic" id="op-vela" title="Smart Levels">${IC.candles}</button>
        <button class="op-ic" id="op-tools" title="Herramientas">${IC.dots}</button>
      </div>
    </div>
    <div class="op-subhead">
      <span class="op-tag">Spot</span>
      <span class="op-price" id="op-price">—</span>
      <span class="op-chg" id="op-chg"></span>
    </div>

    <div class="op-grid">
      <div class="op-book" id="op-book"></div>
      <div class="op-form">
        <div class="op-ol">
          <button class="op-olt on" data-ol="market">Market</button>
          <button class="op-olt" data-ol="limit">Limit</button>
        </div>
        <div class="op-field" id="op-field-price" style="display:none">
          <span>Precio</span><input id="op-in-price" inputmode="decimal" placeholder="0.00"><b>${esc(_quote)}</b>
        </div>
        <div class="op-field">
          <span>Importe</span><input id="op-in-amt" inputmode="decimal" placeholder="0.00">
          <button class="op-qsel" id="op-qsel">${esc(_quote)} ${chev(10)}</button>
        </div>
        <input class="op-range" id="op-range" type="range" min="0" max="100" value="0">
        <div class="op-pcts">${[25, 50, 75, 100].map((p) => `<button data-p="${p}">${p}%</button>`).join('')}</div>
        <button class="op-sltoggle" id="op-sltoggle"><span>Stop-loss <em>(opcional)</em></span><i>▾</i></button>
        <div class="op-field op-slbox" id="op-slbox" style="display:none">
          <span>Stop</span><input id="op-in-sl" inputmode="decimal" placeholder="0.00"><b>${esc(_quote)}</b>
        </div>
        <div class="op-avail" id="op-avail">Disponible: — ${esc(_quote)}</div>
        <button class="op-buy" id="op-buy">Comprar ${esc(_par ? _par.id : '')}</button>
        <button class="op-sell" id="op-sell">Vender ${esc(_par ? _par.id : '')}</button>
      </div>
    </div>

    <div class="op-tabs">
      <button class="op-tab on" data-pt="pos">Posición</button>
      <button class="op-tab" data-pt="ord">Mis órdenes</button>
      <button class="op-tab" data-pt="bots">Bots</button>
    </div>
    <div class="op-panel" id="op-panel"></div>
  `;

  // Cabecera
  $('op-sel').onclick = () => selectorMoneda();
  $('op-mini').onclick = $('op-vela').onclick = () => api.abrirGrafica('niveles', _par);
  $('op-bots').onclick = () => api.abrir('bots');
  $('op-tools').onclick = () => api.abrir('tools');
  $('op-alert').onclick = () => abrirAlerta(_par);
  ponerLogo();

  // Slider % y stop-loss
  const slider = $('op-range');
  if (slider) slider.oninput = () => { /* visual; el cálculo real usa el saldo en vivo */ };
  host.querySelectorAll('.op-pcts button').forEach((b) => b.onclick = () => { if (slider) slider.value = b.getAttribute('data-p'); });
  const slt = $('op-sltoggle'); if (slt) slt.onclick = () => { const box = $('op-slbox'); const ab = box.style.display === 'none'; box.style.display = ab ? '' : 'none'; slt.classList.toggle('on', ab); };

  // Si se llegó desde Smart Levels con un lado, se resalta el botón.
  if (_lado === 'sell') { const s = $('op-sell'); if (s) s.style.outline = '2px solid var(--mv-down)'; }
  else if (_lado === 'buy') { const s = $('op-buy'); if (s) s.style.outline = '2px solid var(--mv-up)'; }
  _lado = null;

  // Market/Limit
  host.querySelectorAll('.op-olt').forEach((b) => b.onclick = () => {
    _tipo = b.getAttribute('data-ol');
    host.querySelectorAll('.op-olt').forEach((x) => x.classList.toggle('on', x === b));
    $('op-field-price').style.display = _tipo === 'limit' ? '' : 'none';
  });
  $('op-qsel').onclick = () => selectorQuote();
  $('op-buy').onclick = () => operar('buy');
  $('op-sell').onclick = () => operar('sell');

  // Posición / órdenes / bots
  host.querySelectorAll('.op-tab').forEach((b) => b.onclick = () => {
    host.querySelectorAll('.op-tab').forEach((x) => x.classList.toggle('on', x === b));
    pintarPanel(b.getAttribute('data-pt'));
  });
  pintarPanel('pos');

  renderBook();
  cargar();
  clearInterval(_timer);
  _timer = setInterval(cargar, 4000);
  host._limpiar = () => clearInterval(_timer);
}

function posGuardadas() { try { return JSON.parse(localStorage.getItem('mv-pos') || '[]'); } catch (_) { return []; } }
function posGuardar(l) { try { localStorage.setItem('mv-pos', JSON.stringify(l)); } catch (_) {} }

async function pintarPanel(t) {
  const el = $('op-panel'); if (!el) return;
  const con = _api && _api.estaConectado && _api.estaConectado();
  if (t === 'bots') {
    el.innerHTML = con ? `<div class="op-empty">Aún no tienes bots activos. <button class="op-link" id="op-crear">Crear bot</button></div>`
                       : `<div class="op-empty">Conecta tu wallet para ver tus bots activos.</div>`;
    const c = $('op-crear'); if (c) c.onclick = () => _api.abrir('bots');
    return;
  }
  if (t === 'ord') {
    let ordenes = [];
    try { const o = await import('../orden.js?v=126'); if (o.ordenesPuestas) ordenes = o.ordenesPuestas() || []; } catch (_) {}
    if (!con) { el.innerHTML = `<div class="op-empty">Conecta tu wallet para ver tus órdenes.</div>`; return; }
    if (!ordenes.length) { el.innerHTML = `<div class="op-empty">No tienes órdenes limit abiertas.<br><span style="font-size:12px">Ponlas desde Smart Levels (Limit).</span></div>`; return; }
    el.innerHTML = ordenes.map((o) => `<div class="op-item"><div><b>${esc(o.par || o.simbolo || '')}</b><small>${o.vender ? 'Vender' : 'Comprar'} · ${esc(String(o.precio || ''))}</small></div><span class="${o.vender ? 'dn' : 'up'}">Limit</span></div>`).join('');
    return;
  }
  // Posición: compras hechas desde aquí (entrada + P/L). Eliminar = vender.
  if (!con) { el.innerHTML = `<div class="op-empty">Conecta tu wallet para ver tu posición.</div>`; return; }
  const pos = posGuardadas();
  if (!pos.length) { el.innerHTML = `<div class="op-empty">Sin posiciones. Cuando compres a mercado desde aquí, tu entrada aparece con su ganancia en vivo.</div>`; return; }
  el.innerHTML = pos.map((p, i) => {
    const actual = (p.id === _par.id && _libro.precio) ? _libro.precio : p.entrada;
    const pl = p.entrada ? ((actual - p.entrada) / p.entrada) * 100 : 0;
    const cls = pl >= 0 ? 'up' : 'dn';
    return `<div class="op-item">
      <div><b>${esc(p.id)}</b><small>Entrada ${fmtP(p.entrada)} · ${p.cantidad} ${esc(p.quote || 'USDT')}</small></div>
      <div style="text-align:right"><span class="${cls}">${pl >= 0 ? '+' : ''}${pl.toFixed(2)}%</span>
      <button class="op-del" data-i="${i}">Eliminar</button></div>
    </div>`;
  }).join('');
  el.querySelectorAll('.op-del').forEach((b) => b.onclick = () => {
    const i = +b.getAttribute('data-i'); const l = posGuardadas(); l.splice(i, 1); posGuardar(l);
    _api.abrir('swap');                 // vender = intercambiar de vuelta a USDT
    pintarPanel('pos');
  });
}

function renderBook() {
  const el = $('op-book'); if (!el) return;
  const asks = _libro.asks.slice(0, 6).reverse();
  const bids = _libro.bids.slice(0, 6);
  const maxV = Math.max(1, ...asks.map((r) => r[1]), ...bids.map((r) => r[1]));
  const fila = (r, lado) => {
    const w = Math.min(100, (r[1] / maxV) * 100);
    return `<div class="op-row ${lado}"><span class="op-bar" style="width:${w}%"></span><em>${fmtP(r[0])}</em><i>${fmtQ(r[1])}</i></div>`;
  };
  el.innerHTML =
    `<div class="op-bk-h"><span>Precio</span><span>Cantidad</span></div>` +
    asks.map((r) => fila(r, 'ask')).join('') +
    `<div class="op-bk-mid ${_libro.chg >= 0 ? 'up' : 'dn'}">${_libro.precio == null ? '—' : fmtP(_libro.precio)}</div>` +
    bids.map((r) => fila(r, 'bid')).join('');
}

async function cargar() {
  if (!_par) return;
  try {
    const r = await fetch(`https://api.binance.com/api/v3/depth?symbol=${_par.s}&limit=12`);
    if (r.ok) { const j = await r.json(); _libro.asks = (j.asks || []).map((x) => [+x[0], +x[1]]); _libro.bids = (j.bids || []).map((x) => [+x[0], +x[1]]); }
  } catch (_) {}
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${_par.s}`);
    if (r.ok) { const j = await r.json(); _libro.precio = +j.lastPrice; _libro.chg = +j.priceChangePercent; }
  } catch (_) {}
  const pr = $('op-price'), ch = $('op-chg');
  if (pr) pr.textContent = _libro.precio == null ? '—' : fmtP(_libro.precio);
  if (ch && _libro.chg != null) { ch.textContent = (_libro.chg >= 0 ? '+' : '') + _libro.chg.toFixed(2) + '%'; ch.className = 'op-chg ' + (_libro.chg >= 0 ? 'up' : 'dn'); }
  renderBook();
}

async function operar(lado) {
  // ¿Se puede comerciar esta moneda en la plataforma?
  let ok = true;
  try { const o = await import('../orden.js?v=126'); if (o.sePuedeOperar) ok = await o.sePuedeOperar(_par.id); } catch (_) {}
  if (!ok) { mensaje('Solo para análisis', `${_par.id} está disponible para analizar en las gráficas, pero no se puede comerciar en la plataforma.`); return; }
  // Al vender, ¿tiene saldo de esa moneda?
  if (lado === 'sell') {
    const b = _api.balance && _api.balance();
    const tiene = b && b.activos && b.activos.find((a) => a.id === _par.id && a.bal > 0);
    if (b && b.conectado && !tiene) { mensaje('Sin saldo', `No tienes ${_par.id} en tu wallet para vender.`); return; }
  }
  if (_tipo === 'market') {
    if (lado === 'buy' && _api.estaConectado && _api.estaConectado()) {
      const amt = parseFloat(($('op-in-amt') || {}).value) || 0;
      if (amt > 0 && _libro.precio) { const l = posGuardadas(); l.push({ id: _par.id, cantidad: amt, quote: _quote, entrada: _libro.precio, ts: Date.now() }); posGuardar(l); }
    }
    _api.abrir('swap');
  } else {
    _api.abrirGrafica('niveles', _par);
  }
}


/* Mensaje responsive (no bloqueante), reutiliza el toast de la cáscara. */
function mensaje(t, s) {
  let d = document.getElementById('mv-toast');
  if (!d) { d = document.createElement('div'); d.id = 'mv-toast'; document.body.appendChild(d); }
  d.innerHTML = `<b>${esc(t)}</b><br><span>${esc(s)}</span>`;
  d.classList.add('show');
  clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('show'), 3200);
}

/* Llegada desde Smart Levels: fija la moneda y el lado antes de mostrar Operar. */
export function prepararOperar(parId, lado) {
  const set = (list) => { const p = (list || []).find((x) => x.id === parId); if (p) _par = p; _lado = lado || null; _libro = { asks: [], bids: [], precio: null, chg: null }; };
  if (_pares.length) set(_pares);
  else { import('../niveles/config.js?v=1').then((c) => { _pares = (c.PARES || []).slice(); set(_pares); }).catch(() => {}); }
}

function selectorMoneda() {
  abrirPicker('Elige un par', _pares, (id) => {
    _par = _pares.find((x) => x.id === id) || _par;
    _libro = { asks: [], bids: [], precio: null, chg: null };
    pintarOperar(document.getElementById('mv-scroll'), _api);
  });
}
function selectorQuote() {
  const quotes = [{ id: 'USDT', n: 'Tether' }, { id: 'USDC', n: 'USD Coin' }, { id: 'BNB', n: 'BNB', cg: 'binancecoin' }];
  abrirPicker('Moneda de pago', quotes, (id) => {
    _quote = id;
    const q = $('op-qsel'); if (q) q.innerHTML = `${esc(_quote)} ${chev(10)}`;
    const a = $('op-avail'); if (a) a.textContent = `Disponible: — ${esc(_quote)}`;
  });
}

function ponerLogo() {
  const el = $('op-logo'); if (!el || !_par) return;
  const url = LOGO_ESP[_par.id] || (_par.cg ? '' : '');
  if (url) { el.style.backgroundImage = `url(${url})`; return; }
  if (!_par.cg) { el.textContent = _par.id.slice(0, 1); return; }
  // CoinGecko (cache compartida con Mercados)
  try {
    const c = JSON.parse(localStorage.getItem('mv-cg') || 'null');
    if (c && c.d && c.d[_par.cg] && c.d[_par.cg].img) { el.style.backgroundImage = `url(${c.d[_par.cg].img})`; return; }
  } catch (_) {}
  el.textContent = _par.id.slice(0, 1);
}

function fmtP(p) { p = +p; if (!isFinite(p)) return '—'; if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 }); if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 3 }); return p.toLocaleString('en-US', { maximumFractionDigits: 6 }); }
function fmtQ(q) { q = +q; if (!isFinite(q)) return ''; if (q >= 1000) return (q / 1000).toFixed(1) + 'K'; if (q >= 1) return q.toFixed(2); return q.toFixed(4); }
function chev(sz) { const s = sz || 12; return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" style="vertical-align:middle"><path d="M6 9l6 6 6-6"/></svg>`; }
