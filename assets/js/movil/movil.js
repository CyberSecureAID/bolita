/* movil/movil.js — Cáscara de la experiencia MÓVIL tipo exchange.
   Monta una capa a pantalla completa (#mv-app) SOLO en móvil, con barra
   inferior (Inicio / Mercados / Operar / Activos) y un router de pantallas.
   Reusa TODAS las secciones reales por import diferido; no duplica lógica.
   La web (escritorio) no se toca: si no es móvil, no monta nada. */

import * as wallet from '../wallet.js?v=125';
import * as gb from '../gridbot.js?v=125';
import { inyectarMovil } from './estilos.js?v=1';
import { IC } from './iconos.js?v=1';
import { pintarInicio } from './inicio.js?v=1';
import { pintarMercados } from './markets.js?v=1';
import { abrirMenu } from './menu.js?v=1';

const $ = (id) => document.getElementById(id);
const _movil = () => window.matchMedia('(max-width: 760px)').matches;

let _deps = { conectarWallet: null };
let _tab = 'home';
let _balCache = null;

export function initMovil(deps) { _deps = Object.assign(_deps, deps || {}); }

/* Abre una sección REAL (import diferido, igual que hace la web). */
async function abrir(clave) {
  try {
    switch (clave) {
      case 'swap':      { const m = await import('../gridbot/swap.js?v=1'); m.abrirSwap && m.abrirSwap(); break; }
      case 'market':    { const m = await import('../market.js?v=125'); m.abrirMarket && m.abrirMarket(); break; }
      case 'liquidity': { const m = await import('../liquidity.js?v=126'); m.abrirLiquidity && m.abrirLiquidity(); break; }
      case 'niveles':   { const m = await import('../niveles.js?v=126'); m.abrirNiveles && m.abrirNiveles(); break; }
      case 'tools':     { const m = await import('../tools.js?v=125'); m.abrirTools && m.abrirTools(); break; }
      case 'academy':   { const m = await import('../academy.js?v=125'); m.abrirAcademy && m.abrirAcademy(); break; }
      case 'prize':     { const m = await import('../prizepool.js?v=125'); m.abrirPrizePool && m.abrirPrizePool(); break; }
      case 'perfil':    { const m = await import('../perfil.js?v=125'); m.abrirPerfil && m.abrirPerfil(); break; }
      case 'muros':     { const m = await import('../muros.js?v=126'); m.abrirMuros && m.abrirMuros(); break; }
      case 'bots':      revelarPortada(); break;   // el creador de bots es la portada
      case 'buscar':    { const m = await import('../market.js?v=125'); m.abrirMarket && m.abrirMarket(); break; }
      case 'soporte':   abrirSoporte(); break;
      case 'alertas':   abrirAlertas(); break;
      case 'menu':      abrirMenu(api()); break;
      case 'idioma':    clicWeb('c-idioma'); break;
      case 'instalar':  clicWeb('c-instalar'); break;
      default: break;
    }
  } catch (e) { /* si un módulo no carga, no rompemos la cáscara */ }
}

/* Reusa un control existente de la web (idioma, instalar) disparando su click. */
function clicWeb(id) {
  const b = document.getElementById(id);
  if (b) { b.click(); return; }
  const men = document.getElementById('c-menu'); if (men) men.click();
  setTimeout(() => { const b2 = document.getElementById(id); if (b2) b2.click(); }, 60);
}

/* Abre la gráfica elegida para una moneda (Smart Levels / Radar / Pools). */
async function abrirGrafica(g, par) {
  await abrir(g === 'niveles' ? 'niveles' : g === 'muros' ? 'muros' : 'liquidity');
}

/* Deja ver la portada real (creador de bots) ocultando la cáscara, con botón de volver. */
function revelarPortada() {
  const app = $('mv-app'); if (!app) return;
  app.style.display = 'none';
  if (!$('mv-volver')) {
    const v = document.createElement('button');
    v.id = 'mv-volver';
    v.textContent = '◀ Inicio';
    v.style.cssText = 'position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:8600;background:linear-gradient(180deg,#f2ca63,#c99a2e);color:#1a1200;font-weight:800;border:0;border-radius:22px;padding:11px 18px;box-shadow:0 6px 16px rgba(0,0,0,.4);font-family:inherit';
    v.onclick = () => { app.style.display = 'flex'; v.remove(); };
    document.body.appendChild(v);
  }
}

function abrirSoporte() {
  const tg = 'https://t.me/JesusDevTrader';
  try { window.open(tg, '_blank', 'noopener'); } catch (_) { location.href = tg; }
}

function abrirAlertas() {
  // Notificaciones/alertas: usa el sistema de avisos existente si está; si no, aviso simple.
  import('../avisos.js?v=126').then((a) => {
    if (a && a.abrir) a.abrir();
    else avisoSimple('Alertas de precio', 'Muy pronto podrás fijar alertas por moneda desde aquí.');
  }).catch(() => avisoSimple('Alertas de precio', 'Muy pronto podrás fijar alertas por moneda desde aquí.'));
}

function avisoSimple(t, s) {
  let d = $('mv-toast');
  if (!d) { d = document.createElement('div'); d.id = 'mv-toast';
    d.style.cssText = 'position:fixed;left:50%;top:80px;transform:translateX(-50%);z-index:8700;background:#1b222c;color:#eaecef;border:1px solid #232b36;border-radius:14px;padding:14px 18px;max-width:86%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.5);font-family:inherit';
    document.body.appendChild(d); }
  d.innerHTML = `<b style="color:#E8B84B">${t}</b><br><span style="color:#8b96a3;font-size:13px">${s}</span>`;
  d.style.display = 'block';
  clearTimeout(d._t); d._t = setTimeout(() => { d.style.display = 'none'; }, 2600);
}

/* Balance real desde la wallet (defensivo: si no hay wallet, queda en —). */
async function leerBalance() {
  try {
    const cuenta = wallet.cuentaActual && wallet.cuentaActual();
    if (!cuenta) return null;
    if (wallet.saldosTodas) {
      const s = await wallet.saldosTodas(cuenta);
      if (s && typeof s.totalUSD === 'number') return { total: s.totalUSD, moneda: 'USDT' };
      if (Array.isArray(s)) {
        const tot = s.reduce((a, x) => a + (Number(x.usd) || 0), 0);
        return { total: tot, moneda: 'USDT' };
      }
    }
    return null;
  } catch (_) { return null; }
}

function api() {
  return {
    abrir,
    conectar: () => { _deps.conectarWallet ? _deps.conectarWallet() : abrir('bots'); },
    estaConectado: () => !!(wallet.cuentaActual && wallet.cuentaActual()),
    balance: () => _balCache,
    alertas: () => 0,
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
  _tab = tab;
  pintarNav();
  const host = $('mv-scroll'); if (!host) return;
  if (host._limpiar) { try { host._limpiar(); } catch (_) {} host._limpiar = null; }
  host.scrollTop = 0;

  if (tab === 'home')    { pintarInicio(host, api()); refrescarBalance(); return; }
  if (tab === 'markets') { pintarMercados(host, api()); return; }
  // Pantallas 3 y 4 (Operar / Activos): se construyen en los siguientes pasos.
  // Por ahora abren la sección real equivalente para NO ocultar nada; el tab
  // vuelve a la pantalla previa detrás.
  if (tab === 'trade')   { _tab = 'markets'; pintarMercados(host, api()); abrir('niveles'); return; }
  if (tab === 'assets')  { _tab = 'home'; pintarInicio(host, api()); abrir('perfil'); return; }
}

async function refrescarBalance() {
  const b = await leerBalance();
  if (!b) return;
  _balCache = b;
  const el = $('mv-bal'); if (el && _tab === 'home') { pintarInicio($('mv-scroll'), api()); }
}

export async function montarMovil(deps) {
  if (!_movil()) return;                 // SOLO móvil. La web no se toca.
  if (deps) initMovil(deps);
  if ($('mv-app')) return;               // ya montado

  inyectarMovil();
  const app = document.createElement('div');
  app.id = 'mv-app';
  app.innerHTML = `<div id="mv-scroll"></div><nav id="mv-nav"></nav>`;
  document.body.appendChild(app);

  pintarNav();
  irA('home');

  // refresca el balance cuando la wallet cambie
  try { if (wallet.alCambiar) wallet.alCambiar(() => { _balCache = null; refrescarBalance(); }); } catch (_) {}
}
