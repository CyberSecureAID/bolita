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
import { pintarOperar, prepararOperar, restaurarBotCard } from './operar.js?v=1';
import { pintarActivos } from './activos.js?v=1';
import { abrirMenu } from './menu.js?v=1';
import { abrirBuscar } from './buscar.js?v=1';
import { abrirAlerta } from './alerta.js?v=1';

const $ = (id) => document.getElementById(id);
const _movil = () => window.matchMedia('(max-width: 760px)').matches;

let _deps = { conectarWallet: null };
let _tab = 'home';
let _tabPrevBots = 'home';
let _bal = null;

export function initMovil(deps) { _deps = Object.assign(_deps, deps || {}); }

/* ── Servicios con activación/pago ──
   Estructura preparada para conectar, más adelante, el smart contract de cada
   servicio. Hoy está vacío (todo libre). Para marcar uno como de pago:
     SERVICIOS_PAGO['clave'] = { nombre, precio, desc, contrato? }
   y requiereActivacion() decidirá según el contrato / activación del usuario. */
const SERVICIOS_PAGO = {
  // ej: academy: { nombre: 'Academia Pro', precio: '10 USDT', desc: 'Acceso completo a los cursos.' }
};
function activado(clave) { try { return localStorage.getItem('cco-activado-' + clave) === '1'; } catch (_) { return false; } }
function requiereActivacion(clave) {
  const s = SERVICIOS_PAGO[clave];
  if (!s) return false;                 // servicio libre
  // FUTURO: aquí se consultará el contrato (¿el usuario ya pagó/activó?).
  return !activado(clave);
}
function avisoActivacion(clave) {
  const s = SERVICIOS_PAGO[clave]; if (!s) return;
  let sh = $('mv-sheet'); if (sh) sh.remove();
  sh = document.createElement('div'); sh.id = 'mv-sheet';
  sh.innerHTML = `<div class="mv-sheet-bg"></div><div class="mv-sheet-card">
    <button class="mv-sheet-x">✕</button>
    <div class="al-h"><b>${s.nombre || 'Servicio premium'}</b><span>${s.desc || 'Este servicio requiere activación para poder usarse.'}</span></div>
    ${s.precio ? `<div class="op-field al-field" style="justify-content:center"><b style="color:var(--mv-gold)">${s.precio}</b></div>` : ''}
    <button class="al-ok" id="mv-activar">Activar</button>
    <button class="al-cancel">Ahora no</button></div>`;
  document.body.appendChild(sh);
  const cerrar = () => sh.remove();
  sh.querySelector('.mv-sheet-bg').onclick = cerrar;
  sh.querySelector('.mv-sheet-x').onclick = cerrar;
  sh.querySelector('.al-cancel').onclick = cerrar;
  sh.querySelector('#mv-activar').onclick = () => {
    // FUTURO: disparar el pago/activación vía el contrato del servicio.
    avisoSimple('Activación', 'La activación de pago se conectará con su contrato próximamente.');
    cerrar();
  };
}

async function abrir(clave, arg) {
  if (requiereActivacion(clave)) { avisoActivacion(clave); return; }
  try {
    switch (clave) {
      case 'swap':      { const m = await import('../gridbot/swap.js?v=1'); m.abrirSwap && m.abrirSwap(); sacarSwapDelWeb(); break; }
      case 'polvo':     await abrirToolDirecto('polvo'); break;
      case 'alerta':    abrirAlerta(); break;
      case 'alertas':   abrirAlerta(); break;
      case 'alertasTool': abrirAlerta(); break;
      case 'recibir':   abrirRecibir(); break;
      case 'market':    { const m = await import('../market.js?v=125'); m.abrirMarket && m.abrirMarket(); break; }
      case 'buy':       await abrirMarketTab('mk-t5'); break;
      case 'sell':      await abrirMarketTab('mk-t2'); break;
      case 'fondos':    abrirMetamaskBuy(); break;
      case 'prize':     { const m = await import('../prizepool.js?v=125'); m.abrirPrizePool && m.abrirPrizePool(); break; }
      case 'perfil':    { const m = await import('../perfil.js?v=125'); m.abrirPerfil && m.abrirPerfil(); if (_movil()) uidEnPerfil(); break; }
      case 'tools':     { inyectarFixTools(); const m = await import('../tools.js?v=125'); m.abrirTools && m.abrirTools(); break; }
      case 'academy':   { inyectarFixGrafica(); const m = await import('../academy.js?v=125'); m.abrirAcademy && m.abrirAcademy(); break; }
      case 'niveles':   { inyectarFixGrafica(); const m = await import('../niveles.js?v=126'); m.abrirNiveles && m.abrirNiveles(); break; }
      case 'muros':     { inyectarFixGrafica(); const m = await import('../muros.js?v=126'); m.abrirMuros && m.abrirMuros(); break; }
      case 'liquidity': { inyectarFixGrafica(); const m = await import('../liquidity.js?v=126'); m.abrirLiquidity && m.abrirLiquidity(); break; }
      case 'bots':      modoBots(true); break;
      case 'buscar':    abrirBuscar(api()); break;
      case 'soporte':   abrirSoporte(); break;
      case 'menu':      abrirMenu(api()); break;
      case 'idioma':    clicWeb('c-idioma'); break;
      case 'instalar':  clicWeb('c-instalar'); break;
      default: break;
    }
  } catch (_) {}
}

/* La gráfica Smart Levels sí se abre con moneda, desde el panel Operar. */
async function abrirGrafica(g, par) { await abrir(g === 'niveles' ? 'niveles' : g); }

/* El swap (y su selector de moneda) se insertan dentro de #colmena-app, que en
   móvil está oculto y además crea un contexto de apilamiento (isolation) que
   deja el modal por debajo de la cáscara. Los movemos al <body>. */
/* El swap se inserta en #colmena-app, que en móvil está oculto y con
   isolation:isolate (contexto de apilamiento) queda por debajo de la cáscara.
   En vez de mover el modal (rompe su CSS ligado a #colmena-app), elevamos el
   z-index de #colmena-app mientras el swap está abierto y lo restauramos al
   cerrarse. Así se ve por encima de la cáscara y conserva todo su estilo. */
function sacarSwapDelWeb() {
  const web = $('colmena-app');
  if (!web) return;
  web.style.zIndex = '9500';                 // encima de la cáscara (100), debajo del nav (10100)
  web.style.pointerEvents = 'auto';
  if (web._mvSwapObs) return;
  const obs = new MutationObserver(() => {
    if (!$('swap-modal') && !$('coin-modal')) {   // swap cerrado → restaurar
      web.style.zIndex = ''; web.style.pointerEvents = '';
      obs.disconnect(); web._mvSwapObs = null;
    }
  });
  obs.observe(web, { childList: true, subtree: true });
  web._mvSwapObs = obs;
}

/* Achica los logos de moneda del swap en móvil (sin tocar el botón central). */
function inyectarFixSwap() {
  if ($('mv-swap-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-swap-fix';
  s.textContent = `@media(max-width:760px){
    #swap-modal .coin-sel-ico,#coin-modal .cm-coin-ico{width:24px!important;height:24px!important;flex:0 0 auto}
    #swap-modal .coin-sel-ico svg,#swap-modal .coin-sel-ico img,#coin-modal .cm-coin-ico svg,#coin-modal .cm-coin-ico img{width:24px!important;height:24px!important}
    #swap-modal .sw-box{max-width:400px}
  }`;
  document.head.appendChild(s);
}
async function abrirToolDirecto(id) {
  inyectarFixTools();
  const m = await import('../tools.js?v=125');
  if (m.abrirTools) m.abrirTools();
  const tl = $('tl-overlay'); if (tl) tl.style.visibility = 'hidden';   // sin flash de Tools
  setTimeout(() => {
    const btn = document.querySelector(`[data-tool="${id}"]`); if (btn) btn.click();
    // cuando el overlay de la herramienta aparezca, cerrar Tools del todo
    let n = 0; const t = setInterval(() => {
      n++;
      if ($('pv-overlay') || $('al-overlay')) { clearInterval(t); const e = $('tl-overlay'); if (e) e.remove(); }
      else if (n > 40) { clearInterval(t); const e = $('tl-overlay'); if (e) e.style.visibility = ''; }
    }, 60);
  }, 140);
}

/* Tools en móvil: cuadrícula compacta (2 por fila), modal responsive con scroll. */
function inyectarFixTools() {
  if ($('mv-tools-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-tools-fix';
  s.textContent = `@media(max-width:760px){
    #tl-overlay{align-items:flex-start!important;padding:calc(10px + env(safe-area-inset-top,0px)) 10px 70px!important}
    #tl-overlay .tl-c{max-width:440px!important;width:calc(100% - 20px)!important;margin:0 auto!important;max-height:calc(100vh - 90px)!important;overflow-y:auto!important;padding:16px!important}
    #tl-overlay .tl-lista{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important}
    #tl-overlay .tl-item{flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;
      min-height:104px!important;padding:13px!important;gap:7px!important}
    #tl-overlay .tl-item>*{text-align:left!important}
    #tl-overlay .tl-c::-webkit-scrollbar{display:none}
    #pv-overlay{align-items:flex-start!important;padding:calc(10px + env(safe-area-inset-top,0px)) 10px 70px!important}
    #pv-overlay .pv-c{max-width:460px!important;width:calc(100% - 20px)!important;margin:0 auto!important;max-height:calc(100vh - 90px)!important;overflow-y:auto!important;padding:20px 15px!important}
    #pv-overlay .pv-c::-webkit-scrollbar{display:none}
  }`;
  document.head.appendChild(s);
}

/* Recibir: dirección + QR de la wallet conectada. */
function abrirRecibir() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { avisoSimple('Recibir', 'Conecta tu wallet para ver tu dirección de recepción.'); return; }
  let sh = $('mv-sheet'); if (sh) sh.remove();
  sh = document.createElement('div'); sh.id = 'mv-sheet';
  sh.innerHTML = `<div class="mv-sheet-bg"></div><div class="mv-sheet-card">
    <div class="mv-sheet-h"><b>Recibir</b><span>Red BNB Smart Chain (BEP-20)</span></div>
    <div id="mv-qr" style="display:flex;justify-content:center;padding:8px 0"></div>
    <div style="background:var(--mv-card2);border:1px solid var(--mv-line);border-radius:12px;padding:12px;word-break:break-all;font-size:12.5px;text-align:center" id="mv-addr">${cuenta}</div>
    <button class="mv-sheet-op" id="mv-copy" style="justify-content:center;color:var(--mv-gold);font-weight:800;margin-top:10px">Copiar dirección</button>
    <button class="mv-sheet-cancel">Cerrar</button></div>`;
  document.body.appendChild(sh);
  const cerrar = () => sh.remove();
  sh.querySelector('.mv-sheet-bg').onclick = cerrar;
  sh.querySelector('.mv-sheet-cancel').onclick = cerrar;
  $('mv-copy').onclick = () => { try { navigator.clipboard.writeText(cuenta); avisoSimple('Copiado', 'Dirección copiada al portapapeles.'); } catch (_) {} };
  // QR con la librería vendor
  const pinta = () => { try { const q = window.qrcode(0, 'M'); q.addData(cuenta); q.make(); $('mv-qr').innerHTML = q.createImgTag(4, 8); const img = $('mv-qr').querySelector('img'); if (img) { img.style.borderRadius = '10px'; img.style.background = '#fff'; img.style.padding = '8px'; } } catch (_) {} };
  if (window.qrcode) pinta();
  else { const sc = document.createElement('script'); sc.src = 'assets/js/vendor/qrcode.js?v=125'; sc.onload = pinta; document.body.appendChild(sc); }
}

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
    #nv-overlay #nv-widget{display:none!important}
    #nv-overlay .nv-sel{max-width:44vw}
    #nv-overlay .nv-c,#mu-overlay .mu-c{padding-bottom:64px!important}
    #lqp-overlay,#lq-overlay,#ac-overlay{align-items:flex-start!important;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 70px!important}
    #lqp-overlay .lqp-c,#lq-overlay .lq-c,#ac-overlay .ac-c{max-height:calc(100vh - 90px)!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch}
    /* ── REDISEÑO COMPLETO de Liquidity (Análisis profesional) en móvil ── */
    #lqp-overlay .lqp-c{background:linear-gradient(180deg,#12161c,#0B0E11)!important;border:1px solid #232b36!important;padding:24px 14px 20px!important;border-radius:20px!important}
    #lqp-overlay .lqp-x{background:var(--mv-card2)!important;border:1px solid var(--mv-line)!important;color:var(--mv-mut)!important;width:36px!important;height:36px!important;border-radius:11px!important}
    #lqp-overlay .lqp-eyebrow{color:#E8B84B!important;font-size:11px!important;letter-spacing:1.4px!important;text-transform:uppercase!important;font-weight:800!important}
    #lqp-overlay .lqp-t{color:#eaecef!important;font-size:23px!important;margin:5px 0 4px!important}
    #lqp-overlay .lqp-s{color:#8b96a3!important;font-size:13px!important;margin-bottom:18px!important}
    #lqp-overlay .lqp-activo{background:color-mix(in srgb,#2ebd85 12%,transparent)!important;border:1px solid color-mix(in srgb,#2ebd85 40%,transparent)!important;color:#2ebd85!important;border-radius:12px!important;padding:12px!important;margin-bottom:14px!important}
    /* Tarjetas de servicio: limpias, imagen 50px, textos ordenados */
    #lqp-overlay .lqp-servs{display:flex!important;flex-direction:column!important;gap:11px!important;margin-bottom:22px!important}
    #lqp-overlay .lqp-serv{position:relative!important;display:grid!important;grid-template-columns:50px minmax(0,1fr)!important;column-gap:13px!important;row-gap:3px!important;align-items:start!important;
      background:#151b23!important;border:1px solid #232b36!important;border-radius:15px!important;padding:14px!important;text-align:left!important;transition:border-color .2s!important}
    #lqp-overlay .lqp-serv:active{border-color:#E8B84B!important}
    #lqp-overlay .lqp-img{grid-column:1!important;grid-row:1/span 4!important;width:50px!important;height:50px!important;border-radius:13px!important;align-self:center!important;margin:0!important;flex:0 0 auto!important;background-size:cover!important;background-position:center!important}
    #lqp-overlay .lqp-ini{font-size:20px!important}
    #lqp-overlay .lqp-nom{grid-column:2!important;font-size:15.5px!important;font-weight:800!important;color:#eaecef!important;margin:0!important}
    #lqp-overlay .lqp-lema{grid-column:2!important;font-size:12px!important;color:#E8B84B!important;font-weight:700!important;margin:0!important}
    #lqp-overlay .lqp-desc{grid-column:2!important;font-size:11.5px!important;color:#8b96a3!important;line-height:1.4!important;margin:2px 0 0!important;overflow-wrap:anywhere!important}
    #lqp-overlay .lqp-abrir{grid-column:2!important;justify-self:start!important;margin-top:8px!important;font-size:12px!important;font-weight:800!important;color:#E8B84B!important;
      background:color-mix(in srgb,#E8B84B 14%,transparent)!important;padding:6px 13px!important;border-radius:9px!important}
    #lqp-overlay .lqp-pronto{grid-column:2!important;justify-self:start!important;margin-top:8px!important;font-size:11.5px!important;color:#8b96a3!important;background:var(--mv-card2)!important;padding:6px 12px!important;border-radius:9px!important}
    #lqp-overlay .lqp-serv.pronto{opacity:.6!important}
    /* Separador */
    #lqp-overlay .lqp-sep{display:flex!important;align-items:center!important;gap:12px!important;margin:4px 0 16px!important;color:#8b96a3!important;font-size:12px!important}
    #lqp-overlay .lqp-sep::before,#lqp-overlay .lqp-sep::after{content:''!important;flex:1!important;height:1px!important;background:#232b36!important}
    /* Planes: atractivos, precio grande, botón dorado */
    #lqp-overlay .lqp-planes{display:flex!important;flex-direction:column!important;gap:12px!important;margin-bottom:16px!important}
    #lqp-overlay .lqp-plan{position:relative!important;display:grid!important;grid-template-columns:1fr auto!important;column-gap:12px!important;row-gap:2px!important;align-items:center!important;
      background:#151b23!important;border:1px solid #232b36!important;border-radius:16px!important;padding:16px 15px!important;text-align:left!important}
    #lqp-overlay .lqp-plan.top{border:1.5px solid #E8B84B!important;background:linear-gradient(180deg,rgba(232,184,75,.11),rgba(232,184,75,.02))!important;box-shadow:0 8px 26px rgba(232,184,75,.1)!important}
    #lqp-overlay .lqp-badge{position:absolute!important;top:-10px!important;left:15px!important;background:#E8B84B!important;color:#1a1200!important;font-size:10px!important;font-weight:900!important;letter-spacing:.4px!important;padding:3px 10px!important;border-radius:8px!important;text-transform:uppercase!important}
    #lqp-overlay .lqp-plan-n{grid-column:1!important;grid-row:1!important;font-size:16px!important;font-weight:800!important;color:#eaecef!important}
    #lqp-overlay .lqp-precio{grid-column:2!important;grid-row:1/span 2!important;display:flex!important;align-items:baseline!important;gap:3px!important;justify-self:end!important}
    #lqp-overlay .lqp-precio b{font-size:28px!important;color:#E8B84B!important;font-weight:800!important;line-height:1!important}
    #lqp-overlay .lqp-precio span{font-size:12px!important;color:#8b96a3!important;font-weight:700!important}
    #lqp-overlay .lqp-ahorro{grid-column:1!important;grid-row:2!important;font-size:12.5px!important;color:#2ebd85!important;font-weight:800!important}
    #lqp-overlay .lqp-ahorro-x{grid-column:1!important;grid-row:2!important;font-size:12px!important;color:#8b96a3!important}
    #lqp-overlay .lqp-b{grid-column:1/3!important;grid-row:3!important;margin-top:12px!important;width:100%!important;
      background:linear-gradient(180deg,#f7db8d,#E8B84B 55%,#c79426)!important;color:#3a2800!important;font-weight:800!important;border:0!important;border-radius:12px!important;padding:14px!important;font-size:15px!important}
    #lqp-overlay .lqp-b:active{filter:brightness(1.05)!important}
    #lqp-overlay .lqp-dias{grid-column:1/3!important;grid-row:4!important;text-align:center!important;margin-top:8px!important;font-size:11.5px!important;color:#8b96a3!important}
    #lqp-overlay .lqp-pago{color:#8b96a3!important;font-size:11.5px!important;line-height:1.5!important;text-align:center!important}
    #lqp-overlay .lqp-pago b{color:#E8B84B!important}
    /* Academy: solo tonos de la app (sin rediseño estructural) */
    #ac-overlay .ac-c{background:linear-gradient(180deg,#12161c,#0B0E11)!important;border:1px solid #232b36!important}
    #ac-overlay .ac-que,#ac-overlay .ac-plan{background:#151b23!important;border:1px solid #232b36!important}
    #ac-overlay .ac-plan.top{border:1px solid #E8B84B!important;background:linear-gradient(180deg,rgba(232,184,75,.12),rgba(232,184,75,.02))!important}
    #ac-overlay .ac-eyebrow{color:#E8B84B!important}
    #ac-overlay .ac-t,#ac-overlay h2{color:#eaecef!important}
    #ac-overlay .ac-x{background:var(--mv-card2)!important;border:1px solid var(--mv-line)!important;color:var(--mv-mut)!important}
    #lqp-overlay .lqp-c{padding:22px 14px 18px!important}
    #lqp-overlay .lqp-servs{gap:10px!important}
    #lqp-overlay .lqp-serv{grid-template-columns:54px minmax(0,1fr)!important;gap:2px 12px!important;padding:13px!important;align-items:center!important}
    #lqp-overlay .lqp-img{width:54px!important;height:54px!important;border-radius:12px!important}
    #lqp-overlay .lqp-nom{font-size:15px!important;font-weight:800!important}
    #lqp-overlay .lqp-lema{font-size:12px!important}
    #lqp-overlay .lqp-desc{font-size:11.5px!important;line-height:1.4!important;margin-top:2px!important}
    #lqp-overlay .lqp-abrir{font-size:12px!important;margin-top:4px!important}
    #lqp-overlay .lqp-sep{margin:18px 0 14px!important}
    #lqp-overlay .lqp-planes{gap:11px!important}
    #lqp-overlay .lqp-plan{padding:15px 14px!important;border-radius:14px!important}
    #swap-modal{padding-bottom:80px!important}
  }`;
  document.head.appendChild(s);
}

/* ── Modo Bots: portada real sin cabecera/cinta/logo/FAB; barra inferior visible. ── */
function modoBots(on) {
  inyectarFixBots();
  try { restaurarBotCard(); } catch (_) {}
  const web = $('colmena-app');
  if (on) {
    _tabPrevBots = _tab;
    document.body.classList.add('mv-bots');
    if (web) web.style.visibility = 'visible';
    if (window._mvHideWeb) window._mvHideWeb.disabled = true;
    if (!$('mv-bots-x')) {
      const x = document.createElement('button');
      x.id = 'mv-bots-x'; x.innerHTML = '✕'; x.setAttribute('aria-label', 'Cerrar');
      x.onclick = () => { const dest = _tabPrevBots && _tabPrevBots !== 'home' ? _tabPrevBots : 'home'; salirBots(); irA(dest); };
      document.body.appendChild(x);
    }
  } else salirBots();
}
function salirBots() {
  const x = $('mv-bots-x'); if (x) x.remove();
  if (!document.body.classList.contains('mv-bots')) return;
  document.body.classList.remove('mv-bots');
  const web = $('colmena-app'); if (web) web.style.visibility = 'hidden';
  if (window._mvHideWeb) window._mvHideWeb.disabled = false;
}
function inyectarFixBots() {
  if ($('mv-bots-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-bots-fix';
  s.textContent = `
    body.mv-bots #colmena-app{visibility:visible!important;padding-top:52px;padding-bottom:70px}
    body.mv-bots #colmena-app .c-hdr,body.mv-bots #colmena-app #c-ticker,body.mv-bots #colmena-app .c-ticker,
    body.mv-bots #np-fab-previo,body.mv-bots #npFab{display:none!important}
    body.mv-bots #mv-app{background:transparent!important;pointer-events:none}
    body.mv-bots #mv-scroll{display:none!important}
    @media(max-width:760px){
      body.mv-bots #colmena-app .rej{padding:13px!important;margin-top:12px!important;border-radius:14px!important}
      body.mv-bots #colmena-app .rej-top{margin-bottom:9px!important}
      body.mv-bots #colmena-app .rej-par{font-size:15px!important}
      body.mv-bots #colmena-app .pio-box{padding:9px 11px!important}
      body.mv-bots #colmena-app .pio-box .v{font-size:14px!important}
      body.mv-bots #colmena-app .rej .l,body.mv-bots #colmena-app .rej .r{padding:11px 13px!important}
      body.mv-bots #colmena-app .rej .v{font-size:16px!important;line-height:1.1!important}
      body.mv-bots #colmena-app .rej .k{font-size:11px!important}
      body.mv-bots #colmena-app .rej-btns{margin-top:10px!important}
      body.mv-bots #colmena-app .rej-btns button{padding:11px!important}
    }
  `;
  document.head.appendChild(s);
}

function uidEnPerfil() {
  if ($('mv-uid-fix')) return;
  const s = document.createElement('style'); s.id = 'mv-uid-fix';
  s.textContent = `@media(max-width:760px){#pf-addr::before{content:"UID: ";color:var(--mv-mut,#8b96a3);font-weight:700}}`;
  document.head.appendChild(s);
}

function abrirSoporte() {
  // El FAB está oculto en móvil pero sigue siendo funcional: al hacer click
  // carga el asistente y abre el chat. Si ya cargó, usamos el real (#npFab).
  const real = $('npFab');
  if (real) { real.click(); return; }
  const previo = $('np-fab-previo');
  if (previo) { previo.click(); return; }
  // Último recurso: reintentar cuando aparezca el asistente.
  let n = 0; const t = setInterval(() => { n++; const r = $('npFab'); if (r) { clearInterval(t); r.click(); } else if (n > 40) clearInterval(t); }, 150);
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
      activos.push({ id, bal: Number(bal), usd, cg });
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
  if (tab === 'assets')  { pintarActivos(host, api()); refrescarBalance(); return; }
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
  st.textContent = '@media(max-width:760px){#np-fab-previo,#npFab{display:none!important}#np-chat,#npChat{z-index:11500!important}}';
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

  /* Puente Smart Levels → Operar (solo móvil): al tocar "Establecer posición"
     en el menú de clic derecho, en vez de la ficha, va a Operar con esa moneda. */
  document.addEventListener('click', (e) => {
    if (!_movil()) return;
    const btn = e.target.closest && e.target.closest('.od-menu .od-m-b');
    if (!btn) return;
    if (!$('nv-overlay')) return;                 // solo desde Smart Levels
    const menu = btn.closest('.od-menu');
    const vender = menu && menu.classList.contains('vender');
    const selB = document.querySelector('#nv-sel b');
    const coinId = selB ? selB.textContent.trim() : null;
    e.preventDefault(); e.stopPropagation();
    if (menu) menu.remove();
    prepararOperar(coinId, vender ? 'sell' : 'buy');
    irA('trade');
  }, true);

  try { if (wallet.alCambiar) wallet.alCambiar(() => { _bal = null; refrescarBalance(); irA(_tab); }); } catch (_) {}
}
