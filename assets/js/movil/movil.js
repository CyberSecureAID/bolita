/* movil/movil.js — Cáscara MÓVIL tipo exchange.
   · La barra inferior (Inicio/Mercados/Operar/Activos) es PERPETUA: vive fuera
     de la cáscara, con z-index por encima de todo, visible en toda sección.
   · No hay botón "volver" flotante: se navega con la barra inferior.
   · Las secciones reales abren por ENCIMA del contenido de la cáscara. */

import * as wallet from '../wallet.js?v=125';
import * as gb from '../gridbot.js?v=125';
import { inyectarMovil } from './estilos.js?v=1';
import { IC } from './iconos.js?v=1';
import { pintarInicio } from './inicio.js?v=1';
import { pintarMercados } from './markets.js?v=1';
import { pintarOperar } from './operar.js?v=1';
import { abrirMenu } from './menu.js?v=1';
import { abrirBuscar } from './buscar.js?v=1';

const $ = (id) => document.getElementById(id);
const _movil = () => window.matchMedia('(max-width: 760px)').matches;

let _deps = { conectarWallet: null };
let _tab = 'home';
let _bal = null;

export function initMovil(deps) { _deps = Object.assign(_deps, deps || {}); }

async function abrir(clave, arg) {
  try {
    switch (clave) {
      case 'swap':      { const m = await import('../gridbot/swap.js?v=1'); m.abrirSwap && m.abrirSwap(); break; }
      case 'market':    { const m = await import('../market.js?v=125'); m.abrirMarket && m.abrirMarket(); break; }
      case 'buy':       await abrirMarketTab('mk-t5'); break;
      case 'sell':      await abrirMarketTab('mk-t2'); break;
      case 'fondos':    abrirMetamaskBuy(); break;
      case 'prize':     { const m = await import('../prizepool.js?v=125'); m.abrirPrizePool && m.abrirPrizePool(); break; }
      case 'perfil':    { const m = await import('../perfil.js?v=125'); m.abrirPerfil && m.abrirPerfil(); if (_movil()) uidEnPerfil(); break; }
      case 'tools':     { const m = await import('../tools.js?v=125'); m.abrirTools && m.abrirTools(); break; }
      case 'academy':   { const m = await import('../academy.js?v=125'); m.abrirAcademy && m.abrirAcademy(); break; }
      case 'niveles':   { inyectarFixGrafica(); const m = await import('../niveles.js?v=126'); m.abrirNiveles && m.abrirNiveles(); break; }
      case 'muros':     { inyectarFixGrafica(); const m = await import('../muros.js?v=126'); m.abrirMuros && m.abrirMuros(); break; }
      case 'liquidity': { inyectarFixGrafica(); const m = await import('../liquidity.js?v=126'); m.abrirLiquidity && m.abrirLiquidity(); break; }
      case 'bots':      modoBots(true); break;
      case 'buscar':    abrirBuscar(api()); break;
      case 'soporte':   abrirSoporte(); break;
      case 'alertas':   avisoSimple('Alertas de precio', 'Muy pronto podrás fijar alertas por moneda desde aquí.'); break;
      case 'menu':      abrirMenu(api()); break;
      case 'idioma':    clicWeb('c-idioma'); break;
      case 'instalar':  clicWeb('c-instalar'); break;
      default: break;
    }
  } catch (_) {}
}

/* La gráfica Smart Levels sí se abre con moneda, desde el panel Operar. */
async function abrirGrafica(g, par) { await abrir(g === 'niveles' ? 'niveles' : g); }

async function abrirMarketTab(tabId) {
  const m = await import('../market.js?v=125');
  if (m.abrirMarket) m.abrirMarket();
  setTimeout(() => { const t = $(tabId); if (t) t.click(); }, 120);
}

function abrirMetamaskBuy() {
  const url = 'https://portfolio.metamask.io/buy';
  try { window.open(url, '_blank', 'noopener'); } catch (_) { location.href = url; }
}

/* CSS responsive para las gráficas: compacta la cabecera y deja hueco para la
   barra inferior perpetua (no se corta). */
function inyectarFixGrafica() {
  if ($('mv-nv-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-nv-fix';
  s.textContent = `@media(max-width:760px){
    #nv-overlay .nv-cab,#mu-overlay .mu-cab{flex-wrap:wrap!important;gap:6px!important;padding:8px 10px 8px 12px!important}
    #nv-overlay .nv-tfs{order:5!important;width:100%!important;overflow-x:auto!important;flex-wrap:nowrap!important;scrollbar-width:none}
    #nv-overlay .nv-tfs::-webkit-scrollbar{display:none}
    #nv-overlay .nv-tf{flex:0 0 auto!important}
    #nv-overlay .nv-estado{display:none!important}
    #nv-overlay .nv-der{margin-left:auto!important;gap:4px!important}
    #nv-overlay .nv-rg-tx,#nv-overlay .nv-ind-tx,#nv-overlay .nv-cf-tx{display:none!important}
    #nv-overlay .nv-sel{max-width:44vw}
    #nv-overlay .nv-c,#mu-overlay .mu-c,#lqp-overlay,#lq-overlay{padding-bottom:64px!important}
    #swap-modal{padding-bottom:80px!important}
  }`;
  document.head.appendChild(s);
}

/* ── Modo Bots: portada real sin cabecera/cinta/logo/FAB; barra inferior visible. ── */
function modoBots(on) {
  inyectarFixBots();
  const web = $('colmena-app');
  if (on) {
    document.body.classList.add('mv-bots');
    if (web) web.style.visibility = 'visible';
    if (window._mvHideWeb) window._mvHideWeb.disabled = true;
  } else salirBots();
}
function salirBots() {
  if (!document.body.classList.contains('mv-bots')) return;
  document.body.classList.remove('mv-bots');
  const web = $('colmena-app'); if (web) web.style.visibility = 'hidden';
  if (window._mvHideWeb) window._mvHideWeb.disabled = false;
}
function inyectarFixBots() {
  if ($('mv-bots-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-bots-fix';
  s.textContent = `
    body.mv-bots #colmena-app{visibility:visible!important;padding-top:8px;padding-bottom:70px}
    body.mv-bots #colmena-app .c-hdr,body.mv-bots #colmena-app #c-ticker,body.mv-bots #colmena-app .c-ticker,
    body.mv-bots #np-fab-previo,body.mv-bots #npFab,body.mv-bots #np-chat,body.mv-bots #npChat{display:none!important}
    body.mv-bots #mv-app{background:transparent!important;pointer-events:none}
    body.mv-bots #mv-scroll{display:none!important}
  `;
  document.head.appendChild(s);
}

function uidEnPerfil() {
  if ($('mv-uid-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-uid-fix';
  s.textContent = `@media(max-width:760px){#pf-addr::before{content:"UID: ";color:var(--mv-mut,#8b96a3);font-weight:700}}`;
  document.head.appendChild(s);
}

function abrirSoporte() { const fab = $('npFab') || $('np-fab-previo'); if (fab) fab.click(); }

function clicWeb(id) {
  const b = $(id);
  if (b) { b.click(); return; }
  const men = $('c-menu'); if (men) men.click();
  setTimeout(() => { const b2 = $(id); if (b2) b2.click(); }, 80);
}

function avisoSimple(t, s) {
  let d = $('mv-toast');
  if (!d) { d = document.createElement('div'); d.id = 'mv-toast'; document.body.appendChild(d); }
  d.innerHTML = `<b>${t}</b><br><span>${s}</span>`;
  d.classList.add('show');
  clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('show'), 2600);
}

async function leerBalance() {
  try {
    const cuenta = wallet.cuentaActual && wallet.cuentaActual();
    if (!cuenta) return { conectado: false };
    const tk = await import('../tokens.js?v=125');
    const saldos = await wallet.saldosTodas(cuenta);
    const tienen = Object.entries(saldos || {}).filter(([, v]) => Number(v) > 0);
    if (!tienen.length) return { conectado: true, totalUSD: 0, activos: [], precios: {} };
    const cgById = {}; Object.values(tk.MONEDAS || {}).forEach((m) => { if (m.cg) cgById[m.id] = m.cg; });
    const ids = [...new Set(tienen.map(([id]) => cgById[id]).filter(Boolean))].join(',');
    let precioCg = {};
    try { const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`); if (r.ok) precioCg = await r.json(); } catch (_) {}
    const precios = {}; const activos = []; let total = 0;
    tienen.forEach(([id, bal]) => {
      const cg = cgById[id];
      const px = (id === 'USDT' || id === 'USDC' || id === 'USDTZ') ? 1 : (cg && precioCg[cg] ? precioCg[cg].usd : 0);
      precios[id] = px; const usd = Number(bal) * px; total += usd;
      activos.push({ id, bal: Number(bal), usd });
    });
    activos.sort((a, b) => b.usd - a.usd);
    return { conectado: true, totalUSD: total, activos, precios };
  } catch (_) { return { conectado: false }; }
}

function api() {
  return {
    abrir, abrirGrafica,
    conectar: () => { _deps.conectarWallet ? _deps.conectarWallet() : modoBots(true); },
    estaConectado: () => !!(wallet.cuentaActual && wallet.cuentaActual()),
    balance: () => _bal,
    irA,
  };
}

const TABS = [
  { k: 'home',    ic: 'home',    t: 'Inicio' },
  { k: 'markets', ic: 'candles', t: 'Mercados' },
  { k: 'trade',   ic: 'chart',   t: 'Operar' },
  { k: 'assets',  ic: 'wallet',  t: 'Activos' },
];

function pintarNav() {
  const nav = $('mv-nav'); if (!nav) return;
  nav.innerHTML = TABS.map((t) => `<button data-tab="${t.k}" class="${t.k === _tab ? 'on' : ''}">${IC[t.ic]}<span>${t.t}</span></button>`).join('');
  nav.querySelectorAll('button').forEach((b) => { b.onclick = () => irA(b.getAttribute('data-tab')); });
}

/* Cierra cualquier overlay de sección abierto (para que la barra inferior
   siempre lleve a una pantalla de la cáscara). */
function cerrarSecciones() {
  ['nv-overlay', 'mu-overlay', 'lq-overlay', 'lqp-overlay', 'nv-picker', 'mu-picker', 'lq-mas-menu',
   'mk-overlay', 'swap-modal', 'coin-modal', 'pf-overlay', 'tools-overlay', 'ac-overlay', 'pp-overlay'].forEach((id) => { const e = $(id); if (e) e.remove(); });
  document.querySelectorAll('[id$="-overlay"]').forEach((e) => { if (e.id !== 'mv-app') e.remove(); });
  salirBots();
}

async function irA(tab) {
  cerrarSecciones();
  const host = $('mv-scroll'); if (!host) return;
  if (host._limpiar) { try { host._limpiar(); } catch (_) {} host._limpiar = null; }
  host.scrollTop = 0;
  _tab = tab; pintarNav();
  if (tab === 'home')    { pintarInicio(host, api()); refrescarBalance(); return; }
  if (tab === 'markets') { pintarMercados(host, api()); return; }
  if (tab === 'trade')   { pintarOperar(host, api()); return; }
  if (tab === 'assets')  { abrir('perfil'); return; }
}

async function refrescarBalance() {
  _bal = await leerBalance();
  const host = $('mv-scroll');
  if (host && host._pintarBal && _tab === 'home') { try { host._pintarBal(); } catch (_) {} }
}

export async function montarMovil(deps) {
  if (!_movil()) return;
  if (deps) initMovil(deps);
  if ($('mv-app')) return;
  inyectarMovil();
  // Oculta el FAB del asistente en móvil (el soporte se abre desde la cáscara).
  const st = document.createElement('style'); st.id = 'mv-fab-fix';
  st.textContent = '@media(max-width:760px){#np-fab-previo{display:none!important}}';
  document.head.appendChild(st);

  const app = document.createElement('div');
  app.id = 'mv-app';
  app.innerHTML = `<div id="mv-scroll"></div>`;
  document.body.appendChild(app);
  // Barra inferior PERPETUA (fuera de la cáscara, siempre encima).
  const nav = document.createElement('nav');
  nav.id = 'mv-nav';
  document.body.appendChild(nav);

  pintarNav();
  irA('home');
  try { if (wallet.alCambiar) wallet.alCambiar(() => { _bal = null; refrescarBalance(); if (_tab === 'home') irA('home'); }); } catch (_) {}
}
