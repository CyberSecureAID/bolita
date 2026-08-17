/* movil/movil.js — Cáscara de la experiencia MÓVIL tipo exchange.
   Monta #mv-app SOLO en móvil, con barra inferior y router de pantallas.
   Reusa TODAS las secciones reales (import diferido). La web no se toca. */

import * as wallet from '../wallet.js?v=125';
import * as gb from '../gridbot.js?v=125';
import { inyectarMovil } from './estilos.js?v=1';
import { IC } from './iconos.js?v=1';
import { pintarInicio } from './inicio.js?v=1';
import { pintarMercados } from './markets.js?v=1';
import { abrirMenu } from './menu.js?v=1';
import { abrirBuscar } from './buscar.js?v=1';

const $ = (id) => document.getElementById(id);
const _movil = () => window.matchMedia('(max-width: 760px)').matches;

let _deps = { conectarWallet: null };
let _tab = 'home';
let _bal = null;         // { conectado, totalUSD, activos:[{id,bal,usd}], precios:{id:usd} }

export function initMovil(deps) { _deps = Object.assign(_deps, deps || {}); }

/* ── Despachador a secciones REALES ── */
async function abrir(clave) {
  try {
    switch (clave) {
      case 'swap':      { const m = await import('../gridbot/swap.js?v=1'); m.abrirSwap && m.abrirSwap(); break; }
      case 'market':    { const m = await import('../market.js?v=125'); m.abrirMarket && m.abrirMarket(); break; }
      case 'prize':     { const m = await import('../prizepool.js?v=125'); m.abrirPrizePool && m.abrirPrizePool(); break; }
      case 'perfil':    { const m = await import('../perfil.js?v=125'); m.abrirPerfil && m.abrirPerfil(); break; }
      case 'tools':     { const m = await import('../tools.js?v=125'); m.abrirTools && m.abrirTools(); break; }
      case 'academy':   { const m = await import('../academy.js?v=125'); m.abrirAcademy && m.abrirAcademy(); break; }
      case 'niveles':   await abrirGraficaConVuelta('niveles'); break;
      case 'muros':     await abrirGraficaConVuelta('muros'); break;
      case 'liquidity': await abrirGraficaConVuelta('liquidity'); break;
      case 'bots':      revelarPortada(); break;
      case 'buscar':    abrirBuscar(api()); break;
      case 'soporte':   abrirSoporte(); break;
      case 'alertas':   avisoSimple('Alertas de precio', 'Muy pronto podrás fijar alertas por moneda desde aquí.'); break;
      case 'menu':      abrirMenu(api()); break;
      case 'idioma':    clicWeb('c-idioma'); break;
      case 'instalar':  clicWeb('c-instalar'); break;
      default: break;
    }
  } catch (_) { /* si un módulo no carga, la cáscara sigue */ }
}

async function abrirGrafica(g, par) { await abrir(g); }

/* Abre una gráfica y garantiza un botón de VOLVER (Smart Levels/Radar/Pools
   se dibujan por encima de la cáscara y en móvil el cierre no siempre es
   alcanzable). */
async function abrirGraficaConVuelta(clave) {
  if (clave === 'niveles') { const m = await import('../niveles.js?v=126'); m.abrirNiveles && m.abrirNiveles(); }
  else if (clave === 'muros') { const m = await import('../muros.js?v=126'); m.abrirMuros && m.abrirMuros(); }
  else if (clave === 'liquidity') { const m = await import('../liquidity.js?v=126'); m.abrirLiquidity && m.abrirLiquidity(); }
  botonVolver(() => {
    ['nv-overlay', 'mu-overlay', 'lq-overlay', 'lqp-overlay', 'nv-picker', 'mu-picker', 'lq-mas-menu'].forEach((id) => { const e = $(id); if (e) e.remove(); });
  }, 10050);
}

/* Botón flotante de volver (se autolimpia al pulsarlo). */
function botonVolver(alVolver, z) {
  quitarVolver();
  const v = document.createElement('button');
  v.id = 'mv-volver';
  v.innerHTML = '‹ Inicio';
  v.style.zIndex = String(z || 8600);
  v.onclick = () => { try { alVolver && alVolver(); } catch (_) {} quitarVolver(); const app = $('mv-app'); if (app) app.style.display = 'flex'; };
  document.body.appendChild(v);
}
function quitarVolver() { const v = $('mv-volver'); if (v) v.remove(); }

/* Deja ver la portada real (creador de bots) ocultando la cáscara. */
function revelarPortada() {
  const app = $('mv-app'); if (app) app.style.display = 'none';
  const web = $('colmena-app'); if (web) web.style.visibility = 'visible';
  if (window._mvHideWeb) window._mvHideWeb.disabled = true;
  botonVolver(() => {
    const web2 = $('colmena-app'); if (web2) web2.style.visibility = 'hidden';
    if (window._mvHideWeb) window._mvHideWeb.disabled = false;
  }, 8600);
}

/* Soporte = chatbot (el asistente). Dispara su botón; si el panel queda
   detrás, ocultamos la cáscara y ofrecemos volver. */
function abrirSoporte() {
  const fab = $('npFab') || $('np-fab-previo');
  if (fab) fab.click();
  const app = $('mv-app'); if (app) app.style.display = 'none';
  botonVolver(() => {
    const chat = $('npChat'); if (chat && chat.classList.contains('is-open')) { const x = $('npClose'); if (x) x.click(); }
  }, 100000);
}

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

/* ── Balance real por moneda (valorado en USD vía CoinGecko). ── */
async function leerBalance() {
  try {
    const cuenta = wallet.cuentaActual && wallet.cuentaActual();
    if (!cuenta) return { conectado: false };
    const tk = await import('../tokens.js?v=125');
    const saldos = await wallet.saldosTodas(cuenta);           // { id: bal }
    const tienen = Object.entries(saldos || {}).filter(([, v]) => Number(v) > 0);
    if (!tienen.length) return { conectado: true, totalUSD: 0, activos: [], precios: {} };
    // precios USD por CoinGecko (una llamada)
    const cgById = {}; Object.values(tk.MONEDAS || {}).forEach((m) => { if (m.cg) cgById[m.id] = m.cg; });
    const ids = [...new Set(tienen.map(([id]) => cgById[id]).filter(Boolean))].join(',');
    let precioCg = {};
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (r.ok) precioCg = await r.json();
    } catch (_) {}
    const precios = {}; const activos = []; let total = 0;
    tienen.forEach(([id, bal]) => {
      const cg = cgById[id];
      const px = (id === 'USDT' || id === 'USDC' || id === 'USDTZ') ? 1 : (cg && precioCg[cg] ? precioCg[cg].usd : 0);
      precios[id] = px;
      const usd = Number(bal) * px;
      total += usd;
      activos.push({ id, bal: Number(bal), usd });
    });
    activos.sort((a, b) => b.usd - a.usd);
    return { conectado: true, totalUSD: total, activos, precios };
  } catch (_) { return { conectado: false }; }
}

function api() {
  return {
    abrir,
    conectar: () => { _deps.conectarWallet ? _deps.conectarWallet() : revelarPortada(); },
    estaConectado: () => !!(wallet.cuentaActual && wallet.cuentaActual()),
    balance: () => _bal,
    abrirGrafica,
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

async function irA(tab) {
  const host = $('mv-scroll'); if (!host) return;
  if (host._limpiar) { try { host._limpiar(); } catch (_) {} host._limpiar = null; }
  host.scrollTop = 0;

  if (tab === 'home')    { _tab = 'home'; pintarNav(); pintarInicio(host, api()); refrescarBalance(); return; }
  if (tab === 'markets') { _tab = 'markets'; pintarNav(); pintarMercados(host, api()); return; }
  // Pantallas 3 y 4 en construcción: abren la sección real para NO ocultar nada.
  if (tab === 'trade')   { abrir('niveles'); return; }
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
  const app = document.createElement('div');
  app.id = 'mv-app';
  app.innerHTML = `<div id="mv-scroll"></div><nav id="mv-nav"></nav>`;
  document.body.appendChild(app);

  pintarNav();
  irA('home');

  try { if (wallet.alCambiar) wallet.alCambiar(() => { _bal = null; refrescarBalance(); if (_tab === 'home') irA('home'); }); } catch (_) {}
}
