/* movil/inicio.js — Pantalla 1 (Inicio). */

import { IC } from './iconos.js?v=1';
import * as wallet from '../wallet.js?v=125';

const $ = (id) => document.getElementById(id);
const LS = { ojo: 'mv-ojo', denom: 'mv-denom' };

const QUICK = [
  { k: 'buy',       ic: 'buy',    t: 'Comprar' },
  { k: 'sell',      ic: 'sell',   t: 'Vender' },
  { k: 'bots',      ic: 'bot',    t: 'Bots', tag: 'HOT' },
  { k: 'swap',      ic: 'swap',   t: 'Swap' },
  { k: 'liquidity', ic: 'pool',   t: 'Liquidity' },
  { k: 'academy',   ic: 'book',   t: 'Academia', tag: 'TOP' },
];

const PROMOS = [
  { ic: 'book',   t: 'Academia CriptoCuba', s: 'Aprende a operar y multiplica tu ventaja', go: 'academy' },
  { ic: 'trophy', t: 'Prize Pool comunitario', s: 'Participa y gana del fondo común', go: 'prize' },
  { ic: 'bot',    t: 'Bots que operan por ti', s: 'Compran abajo y venden arriba, en tu wallet', go: 'bots' },
  { ic: 'tools',  t: 'Herramientas', s: 'Calculadoras y utilidades para operar mejor', go: 'tools' },
];

/* TODOS los servicios pasan por las tarjetas. Iconos y colores REALES (los de
   la web para los bots). */
const SERVICIOS = [
  { go: 'bots',      color: '#4d9fff', ic: 'botGrid', kick: 'Smart Grid',          h: 'Gana en el rango',        p: 'Compra y vende en niveles; cierra cada cuadrícula solo en ganancia.' },
  { go: 'bots',      color: '#b47cff', ic: 'botAcum', kick: 'Acumulador',          h: 'Acumula en la caída',     p: 'Compra por tramos cuando baja y arma posición sin que estés pendiente.' },
  { go: 'bots',      color: '#e8b84b', ic: 'botCash', kick: 'Cash Out',            h: 'Asegura ganancias',       p: 'Vende lo que ya tienes al precio o % que elijas.' },
  { go: 'bots',      color: '#34d97b', ic: 'botDca',  kick: 'DCA',                 h: 'Invierte a intervalos',   p: 'Compra cantidades fijas cada cierto tiempo para promediar tu entrada.' },
  { go: 'liquidity', color: '#2ebd85', ic: 'pool',    kick: 'Liquidity Pools',     h: 'Profundidad real',        p: 'Mira dónde está la liquidez y los muros del mercado.' },
  { go: 'muros',     color: '#f6465d', ic: 'candles', kick: 'Radar Institucional', h: 'Flujo de órdenes',        p: 'Detecta la mano fuerte: órdenes grandes y absorción.' },
  { go: 'niveles',   color: '#E8B84B', ic: 'chart',   kick: 'Smart Levels',        h: 'Analiza y opera',         p: 'Niveles, indicadores y compra/venta al toque en la gráfica.' },
  { go: 'academy',   color: '#4c8dff', ic: 'book',    kick: 'Academia',            h: 'Aprende a operar',        p: 'Formación paso a paso para sacarle ventaja al mercado.' },
  { go: 'swap',      color: '#2ebd85', ic: 'swap',    kick: 'Swap',                h: 'Intercambia al momento',  p: 'Cambia cualquier cripto por otra, sin KYC y no custodial.' },
  { go: 'market',    color: '#E8B84B', ic: 'market',  kick: 'Marketplace',         h: 'Compra y vende P2P',      p: 'Órdenes de compra y venta entre personas, con garantía.' },
  { go: 'prize',     color: '#f6465d', ic: 'trophy',  kick: 'Prize Pool',          h: 'Fondo comunitario',       p: 'Participa y gana del pozo acumulado de la comunidad.' },
];

let _ojo = leer(LS.ojo) === '1';
let _denom = leer(LS.denom) || 'USDT';

function leer(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
function guardar(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

export function pintarInicio(host, api) {
  const con = api.estaConectado();
  const winfo = (con && wallet.walletInfo && wallet.walletInfo()) || null;
  const wlogo = winfo && (winfo.icon || winfo.icono);

  host.innerHTML = `
    <div class="mv-top">
      <button class="mv-ava" id="mv-ava" aria-label="Perfil">
        ${wlogo ? `<img src="${wlogo}" alt="">` : IC.user}
        <i class="mv-ava-dot ${con ? 'on' : ''}"></i>
      </button>
      <div class="mv-search" id="mv-search"><span class="mv-search-ic">${IC.search}</span><span class="mv-search-ph">Busca servicios, ofertas, monedas…</span></div>
      <button class="mv-ico-btn" id="mv-support" aria-label="Soporte">${IC.support}</button>
      <button class="mv-ico-btn" id="mv-alerts" aria-label="Alertas">${IC.bell}</button>
    </div>

    <div class="mv-bal-lbl" id="mv-bal-lbl">Balance total ${IC.eye}</div>
    <div class="mv-bal-row">
      <span class="mv-bal" id="mv-bal">—</span>
      <button class="mv-denom-in" id="mv-denom">${_denom} ${chev()}</button>
    </div>
    <div class="mv-bal-sub" id="mv-bal-sub">${con ? '' : 'Conecta tu wallet para ver tu saldo'}</div>

    <div class="mv-cta">
      <button class="mv-primary" id="mv-add">Agregar fondos</button>
      <button class="mv-second" id="mv-trade">Operar</button>
    </div>

    <div class="mv-quick" id="mv-quick">
      ${QUICK.map((q) => `
        <div class="mv-qi" data-k="${q.k}">
          <div class="mv-qbox">${IC[q.ic] || ''}${q.tag ? `<span class="mv-qtag">${q.tag}</span>` : ''}</div>
          <span>${q.t}</span>
        </div>`).join('')}
    </div>
    <div class="mv-dots"><i class="on"></i><i></i></div>

    ${con ? '' : `
    <div class="mv-connect">
      <p><b>Exchange no custodial.</b> Tú controlas tus fondos siempre. Conecta tu wallet para operar, crear bots e intercambiar.</p>
      <button id="mv-connect-btn">Conectar wallet</button>
    </div>`}

    <div class="mv-strip" id="mv-strip">
      <div class="mv-strip-ic" id="mv-strip-ic">${IC.book}</div>
      <div class="mv-strip-tx"><b id="mv-strip-t">—</b><small id="mv-strip-s">—</small></div>
      <button class="mv-strip-go" id="mv-strip-go">Ver</button>
    </div>

    <div class="mv-sec-h"><b>Todos los servicios</b><span id="mv-viewall">Ver todo →</span></div>
    <div class="mv-two">
      <div class="mv-tcard" id="mv-tc-0"></div>
      <div class="mv-tcard" id="mv-tc-1"></div>
    </div>

    <div class="mv-sec-h"><b>Prize Pool</b><span id="mv-prize-more">Ver →</span></div>
    <div class="mv-strip" id="mv-prize-strip">
      <div class="mv-strip-ic">${IC.trophy}</div>
      <div class="mv-strip-tx"><b>Fondo comunitario</b><small>Participa y gana del pozo acumulado</small></div>
      <button class="mv-strip-go" id="mv-prize-go">Entrar</button>
    </div>
  `;

  $('mv-ava').onclick = () => api.abrir('perfil');
  $('mv-search').onclick = () => api.abrir('buscar');
  $('mv-support').onclick = () => api.abrir('soporte');
  $('mv-alerts').onclick = () => api.abrir('alertas');
  $('mv-add').onclick = () => api.abrir('fondos');
  $('mv-trade').onclick = () => api.abrir('niveles');
  const cb = $('mv-connect-btn'); if (cb) cb.onclick = () => api.conectar();
  host.querySelectorAll('.mv-qi').forEach((el) => { el.onclick = () => api.abrir(el.getAttribute('data-k')); });
  $('mv-prize-go').onclick = $('mv-prize-more').onclick = () => api.abrir('prize');
  $('mv-viewall').onclick = () => api.abrir('menu');

  // Balance
  const pintarBal = () => {
    const b = api.balance();
    const bal = $('mv-bal'), sub = $('mv-bal-sub');
    if (!b || !b.conectado) { bal.textContent = '—'; return; }
    if (_ojo) { bal.textContent = '••••••'; sub.textContent = ''; return; }
    bal.textContent = fmtDenom(valorEn(b, _denom), _denom);
    sub.textContent = '≈ $' + fmt(b.totalUSD);
  };
  $('mv-bal-lbl').onclick = () => { _ojo = !_ojo; guardar(LS.ojo, _ojo ? '1' : '0'); pintarBal(); };
  $('mv-denom').onclick = () => menuDenom(api, () => { $('mv-denom').innerHTML = `${_denom} ${chev()}`; pintarBal(); });
  pintarBal();

  // Franja rotativa (promos)
  let pi = 0;
  const pintarPromo = () => {
    const p = PROMOS[pi % PROMOS.length];
    $('mv-strip-ic').innerHTML = IC[p.ic] || IC.book;
    $('mv-strip-t').textContent = p.t; $('mv-strip-s').textContent = p.s;
    $('mv-strip-go').onclick = (e) => { e.stopPropagation(); api.abrir(p.go); };
    $('mv-strip').onclick = () => api.abrir(p.go);
  };
  pintarPromo();
  const tPromo = setInterval(() => { pi++; pintarPromo(); }, 4500);

  // Tarjetas: TODOS los servicios pasan de dos en dos con transición suave.
  let ti = 0;
  const pintarCards = (fade) => {
    for (let j = 0; j < 2; j++) {
      const c = SERVICIOS[(ti * 2 + j) % SERVICIOS.length];
      const el = $('mv-tc-' + j); if (!el) continue;
      const set = () => {
        el.style.setProperty('--bc', c.color);
        el.innerHTML = `<div class="mv-tc-kick" style="color:${c.color}">${c.kick}</div>
          <div class="mv-tc-logo" style="color:${c.color}">${IC[c.ic] || IC.bot}</div>
          <h4>${c.h}</h4><p>${c.p}</p>`;
        el.onclick = () => api.abrir(c.go);
        el.classList.remove('fade-out');
      };
      if (fade) { el.classList.add('fade-out'); setTimeout(set, 220); } else set();
    }
  };
  pintarCards(false);
  const tCards = setInterval(() => { ti++; pintarCards(true); }, 3800);

  host._limpiar = () => { clearInterval(tPromo); clearInterval(tCards); };
  host._pintarBal = pintarBal;
}

function menuDenom(api, cb) {
  const b = api.balance();
  const opts = ['USDT'];
  if (b && b.activos) b.activos.forEach((a) => { if (!opts.includes(a.id)) opts.push(a.id); });
  let m = document.getElementById('mv-denom-menu'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'mv-denom-menu';
  m.innerHTML = `<div class="mv-dm-bg"></div><div class="mv-dm-card">
    <div class="mv-dm-h">Ver balance en</div>
    ${opts.map((o) => `<button data-o="${o}" class="${o === _denom ? 'on' : ''}">${o}</button>`).join('')}
  </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.mv-dm-bg').onclick = cerrar;
  m.querySelectorAll('[data-o]').forEach((b2) => b2.onclick = () => { _denom = b2.getAttribute('data-o'); guardar('mv-denom', _denom); cerrar(); cb(); });
}

function valorEn(b, denom) {
  if (denom === 'USDT' || denom === 'USDC') return b.totalUSD;
  const p = b.precios && b.precios[denom];
  return p ? b.totalUSD / p : b.totalUSD;
}
function fmtDenom(v, denom) {
  v = Number(v) || 0;
  const dec = (denom === 'USDT' || denom === 'USDC') ? 2 : (v >= 1 ? 4 : 6);
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmt(v) { const n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function chev() { return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" style="vertical-align:middle"><path d="M6 9l6 6 6-6"/></svg>'; }
