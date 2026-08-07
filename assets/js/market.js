// market.js — Marketplace P2P (caja fuerte + tramos + reputación). Módulo independiente.
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm';
import * as wallet from './wallet.js?v=45';

const MARKET = '0xe60Ca0e7b504de347DC35c8FabF174F8907dfa33';
const USDT   = '0x55d398326f99059fF775485246999027B3197955';
const USDC   = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
const TOKENS = { [USDT.toLowerCase()]: 'USDT', [USDC.toLowerCase()]: 'USDC' };
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://rpc.ankr.com/bsc'
];

const ABI = [
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador))',
  'function perfiles(address) view returns (tuple(string nombre,string pais,string moneda,string contacto,bool existe,uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint64 sumaEstrellas,uint32 numVotos,uint64 desde))',
  'function reputacionDe(address) view returns (uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint256 estrellasX100,uint32 votos,uint64 desde)',
  'function ordenesAbiertas(uint256,uint256) view returns (uint256[])',
  'function totalOrdenes() view returns (uint256)',
  'function comisionBnb() view returns (uint256)',
  'function fianzaDe(address) view returns (uint256)',
  'function fianzaMinima() view returns (uint256)',
  'function limiteDe(address) view returns (uint256)',
  'function misOrdenes(address) view returns (uint256[])',
  'function misCompras(address) view returns (uint256[])',
  'function pendientesDeCalificar(address) view returns (uint256[])',
  'function guardarPerfil(string,string,string,string)',
  'function depositarFianza(uint256)',
  'function retirarFianza(uint256)',
  'function crearOrden(address,uint256,uint16,string,string,uint256) payable returns (uint256)',
  'function tomarOrden(uint256,address)',
  'function marcarPagado(uint256)',
  'function liberarTramo(uint256)',
  'function cancelarOrden(uint256)',
  'function cancelarPorTiempo(uint256)',
  'function abrirDisputa(uint256)',
  'function calificar(uint256,uint8)'
];
const ERC20 = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

/* ── helpers ── */
let _i = 0;
async function lee(fn, args = []) {
  for (let k = 0; k < RPCS.length; k++) {
    try {
      const c = new ethers.Contract(MARKET, ABI, new ethers.JsonRpcProvider(RPCS[_i % RPCS.length], 56, { staticNetwork: true }));
      return await c[fn](...args);
    } catch (e) { _i++; await new Promise(r => setTimeout(r, 150)); }
  }
  throw new Error('rpc');
}
async function firmante() { return new ethers.BrowserProvider(window.ethereum).getSigner(); }
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const f18 = (v) => Number(ethers.formatUnits(v, 18));
const num = (n, d = 2) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
const simbolo = (t) => TOKENS[String(t).toLowerCase()] || 'Token';
const ESTADOS = ['Abierta', 'En curso', 'Completada', 'Cancelada', 'En disputa'];
const MONEDAS = ['CUP', 'MLC', 'USD', 'MXN', 'COP', 'ARS', 'EUR', 'BRL', 'CAD', 'CLP', 'PEN', 'DOP', 'VES'];
const METODOS = ['Transferencia', 'Saldo movil', 'Efectivo', 'Zelle', 'Otro'];

/* ── Distancia (se calcula en el navegador; nada se guarda on-chain) ── */
const claveUbic = (a) => 'aurex-ubic:' + String(a).toLowerCase();
function guardarUbic(a, lat, lon) { try { localStorage.setItem(claveUbic(a), JSON.stringify({ lat, lon, t: Date.now() })); } catch (_) {} }
function leerUbic(a) { try { return JSON.parse(localStorage.getItem(claveUbic(a)) || 'null'); } catch (_) { return null; } }
function kmEntre(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}
function pedirUbicacion() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('sin geo'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => rej(new Error('denegado')), { timeout: 10000, maximumAge: 600000 });
  });
}

/* ── Estilos ── */
function estilos() {
  if ($('mk-css')) return;
  const s = document.createElement('style'); s.id = 'mk-css';
  s.textContent = `
  #mk-overlay{position:fixed;inset:0;z-index:9300;display:none;align-items:center;justify-content:center;background:rgba(3,5,8,.8);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);padding:18px}
  #mk-overlay.show{display:flex}
  #mk-overlay *{box-sizing:border-box}
  #mk-overlay .mk-card{width:100%;max-width:780px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#12161c,#0b0e12);border:1px solid #2b3139;border-radius:20px;box-shadow:0 40px 120px rgba(0,0,0,.72);padding:24px;position:relative;animation:mkIn .18s ease both}
  @keyframes mkIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  #mk-overlay .mk-x{position:absolute;top:15px;right:15px;width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;display:grid;place-items:center;cursor:pointer;font-size:16px;z-index:3}
  #mk-overlay .mk-head{text-align:center;margin-bottom:16px;padding-right:40px}
  #mk-overlay .mk-title{font-family:var(--display,sans-serif);font-weight:800;font-size:24px;letter-spacing:1.5px;color:var(--gold,#E8B84B);text-transform:uppercase}
  #mk-overlay .mk-title .ln{display:inline-block;width:22px;height:1px;background:var(--gold-soft,#C9A84B);vertical-align:middle;margin:0 11px;opacity:.6}
  #mk-overlay .mk-sub{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;letter-spacing:1px;margin-top:4px;text-transform:uppercase}
  #mk-overlay .mk-tabs{display:flex;gap:7px;background:#0b0e12;border:1px solid #2b3139;border-radius:12px;padding:5px;margin-bottom:16px}
  #mk-overlay .mk-tab{flex:1;padding:10px 6px;border:none;border-radius:8px;background:transparent;color:#b7bdc6;font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer}
  #mk-overlay .mk-tab.on{color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);box-shadow:0 3px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.4)}
  #mk-overlay .mk-pane{display:none} #mk-overlay .mk-pane.on{display:block;animation:mkIn .16s ease both}

  #mk-overlay .mk-of{background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid #2b3139;border-radius:14px;padding:15px;margin-bottom:11px;box-shadow:0 4px 0 rgba(0,0,0,.3)}
  #mk-overlay .mk-of-top{display:flex;align-items:center;gap:11px;margin-bottom:11px}
  #mk-overlay .mk-ava{width:38px;height:38px;flex:0 0 auto;border-radius:11px;display:grid;place-items:center;background:linear-gradient(160deg,#f7db8d,var(--gold,#E8B84B) 55%,#b98614);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:16px}
  #mk-overlay .mk-quien{flex:1;min-width:0}
  #mk-overlay .mk-nom{font-family:var(--display,sans-serif);font-weight:700;font-size:14.5px;color:#eaecef;display:flex;align-items:center;gap:7px;flex-wrap:wrap}
  #mk-overlay .mk-rep{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-top:2px;display:flex;gap:9px;flex-wrap:wrap}
  #mk-overlay .mk-rep .st{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-monto{text-align:right;flex:0 0 auto}
  #mk-overlay .mk-monto b{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--gold,#E8B84B);display:block;line-height:1.1}
  #mk-overlay .mk-monto span{font-family:var(--mono,monospace);font-size:10px;color:#7d8794}
  #mk-overlay .mk-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:11px}
  #mk-overlay .mk-chip{font-family:var(--mono,monospace);font-size:10.5px;color:#b7bdc6;background:rgba(255,255,255,.04);border:1px solid #2b3139;border-radius:8px;padding:5px 9px}
  #mk-overlay .mk-chip b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-acts{display:flex;gap:8px;flex-wrap:wrap}
  #mk-overlay .mk-b{flex:1;min-width:120px;padding:11px;border-radius:10px;font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 3px 0 #8f6a1a}
  #mk-overlay .mk-b:active{transform:translateY(2px);box-shadow:0 1px 0 #8f6a1a}
  #mk-overlay .mk-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:var(--gold,#E8B84B);box-shadow:0 3px 0 rgba(0,0,0,.4)}
  #mk-overlay .mk-b:disabled{opacity:.5;cursor:not-allowed}

  #mk-overlay .mk-prog{margin:11px 0}
  #mk-overlay .mk-prog-lab{display:flex;justify-content:space-between;font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-bottom:6px}
  #mk-overlay .mk-prog-lab b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-steps{display:flex;gap:4px}
  #mk-overlay .mk-step{flex:1;height:9px;border-radius:4px;background:#0b0e12;border:1px solid #2b3139}
  #mk-overlay .mk-step.ok{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 60%,#c79426);border-color:#c79426;box-shadow:0 0 8px rgba(232,184,75,.35)}
  #mk-overlay .mk-step.now{background:rgba(232,184,75,.22);border-color:var(--gold-soft,#C9A84B);animation:mkPul 1.3s ease-in-out infinite}
  @keyframes mkPul{0%,100%{opacity:.5}50%{opacity:1}}

  #mk-overlay label{display:block;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.7px;margin:12px 0 6px}
  #mk-overlay input,#mk-overlay select{width:100%;background:#0b0e12;border:1px solid #2b3139;border-radius:10px;color:#eaecef;font-family:var(--mono,monospace);font-size:14px;padding:12px}
  #mk-overlay input:focus,#mk-overlay select:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #mk-overlay .mk-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #mk-overlay .mk-msg{font-family:var(--mono,monospace);font-size:12px;text-align:center;margin-top:12px;min-height:16px;line-height:1.5}
  #mk-overlay .mk-msg.err{color:var(--rojo,#f6465d)} #mk-overlay .mk-msg.ok{color:var(--neon-lit,#2ee86a)} #mk-overlay .mk-msg.info{color:#7d8794}
  #mk-overlay .mk-vacio{font-family:var(--mono,monospace);font-size:13px;color:#7d8794;text-align:center;padding:34px 0;line-height:1.7}
  #mk-overlay .mk-nota{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-align:center;margin-top:14px;line-height:1.6}
  #mk-overlay .mk-box{background:rgba(255,255,255,.02);border:1px solid #2b3139;border-radius:13px;padding:14px;margin-bottom:12px}
  #mk-overlay .mk-box .bt{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  #mk-overlay .mk-row{display:flex;justify-content:space-between;gap:10px;font-family:var(--mono,monospace);font-size:12.5px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05)}
  #mk-overlay .mk-row:last-child{border-bottom:none}
  #mk-overlay .mk-row .k{color:#7d8794} #mk-overlay .mk-row .v{color:#eaecef;font-weight:700}
  #mk-overlay .mk-est{font-family:var(--mono,monospace);font-size:10px;padding:3px 9px;border-radius:9px;border:1px solid #3a424c;color:#b7bdc6;background:rgba(255,255,255,.04)}
  #mk-overlay .mk-est.a{color:var(--neon-lit,#2ee86a);border-color:rgba(46,232,106,.4)}
  #mk-overlay .mk-est.d{color:var(--rojo,#f6465d);border-color:rgba(246,70,93,.4)}
  #mk-overlay .mk-stars{display:flex;gap:6px;justify-content:center;margin:10px 0}
  #mk-overlay .mk-star{font-size:28px;cursor:pointer;color:#3a424c;line-height:1}
  #mk-overlay .mk-star.on{color:var(--gold,#E8B84B);text-shadow:0 0 10px rgba(232,184,75,.4)}
  #mk-overlay .mk-dist{font-family:var(--mono,monospace);font-size:11px;color:#7fb0ff;text-align:center;padding:9px;border-radius:10px;background:rgba(127,176,255,.08);border:1px solid rgba(127,176,255,.3);margin-top:9px}
  @media(max-width:560px){
    #mk-overlay{padding:0}
    #mk-overlay .mk-card{max-width:100%;max-height:100vh;height:100vh;border-radius:0;border:none;padding:18px 14px}
    #mk-overlay .mk-title{font-size:20px}
    #mk-overlay .mk-2{grid-template-columns:1fr}
    #mk-overlay .mk-b{min-width:100%}
    #mk-overlay .mk-tab{font-size:11px;padding:9px 4px}
  }`;
  document.head.appendChild(s);
}

/* ── Overlay ── */
function overlay() {
  let o = $('mk-overlay');
  if (o) return o;
  o = document.createElement('div'); o.id = 'mk-overlay';
  o.innerHTML = `<div class="mk-card" id="mk-card"></div>`;
  document.body.appendChild(o);
  o.addEventListener('click', (e) => { if (e.target === o) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  return o;
}
function cerrar() { const o = $('mk-overlay'); if (o) o.classList.remove('show'); }
function msg(t, c) { const m = $('mk-msg'); if (m) { m.className = 'mk-msg ' + (c || 'info'); m.textContent = t; } }
function traducir(e) {
  const s = (e && (e.reason || e.shortMessage || e.message) || '').toLowerCase();
  if (s.includes('user rejected') || s.includes('denied')) return 'Cancelaste la operación.';
  if (s.includes('sinfianza')) return 'Necesitas depositar la fianza para poder vender.';
  if (s.includes('limitereputacion')) return 'Ese monto supera tu límite. Completa más ventas para subirlo.';
  if (s.includes('montoinvalido')) return 'El monto debe dividirse exacto entre los tramos.';
  if (s.includes('nombrevacio')) return 'Primero crea tu perfil.';
  if (s.includes('insufficient')) return 'Saldo insuficiente.';
  if (s.includes('tramonopagado')) return 'El comprador aún no marcó el pago.';
  if (s.includes('aunnovence')) return 'Todavía no se cumple el plazo.';
  return 'No se pudo completar. Intenta de nuevo.';
}

/* ── Abrir ── */
export async function abrirMarket() {
  estilos();
  const o = overlay(); const card = $('mk-card');
  o.classList.add('show');
  card.innerHTML = `<button class="mk-x" id="mk-x">✕</button><div class="mk-vacio">Cargando marketplace…</div>`;
  $('mk-x').onclick = cerrar;

  card.innerHTML = `
  <button class="mk-x" id="mk-x">✕</button>
  <div class="mk-head">
    <div class="mk-title"><span class="ln"></span>Marketplace<span class="ln"></span></div>
    <div class="mk-sub">Compra y vende con caja fuerte y entrega por tramos</div>
  </div>
  <div class="mk-tabs">
    <button class="mk-tab on" id="mk-t1">Ofertas</button>
    <button class="mk-tab" id="mk-t2">Vender</button>
    <button class="mk-tab" id="mk-t3">Mis operaciones</button>
  </div>
  <div class="mk-pane on" id="mk-p1"><div class="mk-vacio">Cargando ofertas…</div></div>
  <div class="mk-pane" id="mk-p2"></div>
  <div class="mk-pane" id="mk-p3"></div>
  <div class="mk-msg info" id="mk-msg"></div>
  <div class="mk-nota">Tu cripto queda trabada en el contrato hasta que confirmes cada tramo. Aurex no custodia fondos ni interviene en el pago en efectivo.</div>`;
  $('mk-x').onclick = cerrar;

  const tabs = [['mk-t1', 'mk-p1'], ['mk-t2', 'mk-p2'], ['mk-t3', 'mk-p3']];
  tabs.forEach(([t, p], i) => {
    $(t).onclick = () => {
      tabs.forEach(([tt, pp], j) => { $(tt).classList.toggle('on', i === j); $(pp).classList.toggle('on', i === j); });
      $('mk-card').scrollTop = 0; msg('');
      if (i === 1) panelVender();
      if (i === 2) panelMisOps();
    };
  });
  listarOfertas();
}

/* ── Ofertas ── */
async function listarOfertas() {
  const box = $('mk-p1'); if (!box) return;
  try {
    const total = Number(await lee('totalOrdenes'));
    if (total === 0) { box.innerHTML = `<div class="mk-vacio">Todavía no hay ofertas publicadas.<br>Sé el primero: pasa a "Vender".</div>`; return; }
    const desde = total > 40 ? total - 40 : 0;
    const ids = await lee('ordenesAbiertas', [desde, 40]);
    if (!ids || ids.length === 0) { box.innerHTML = `<div class="mk-vacio">No hay ofertas abiertas ahora mismo.</div>`; return; }
    const datos = await Promise.all(ids.map(async (id) => {
      const [o, p, r] = await Promise.all([
        lee('ordenes', [id]).catch(() => null),
        null, null
      ]);
      if (!o) return null;
      const [perf, rep] = await Promise.all([
        lee('perfiles', [o.vendedor]).catch(() => null),
        lee('reputacionDe', [o.vendedor]).catch(() => null)
      ]);
      return { o, perf, rep };
    }));
    const cuenta = wallet.cuentaActual && wallet.cuentaActual();
    box.innerHTML = datos.filter(Boolean).map(d => tarjeta(d, cuenta)).join('') || `<div class="mk-vacio">No hay ofertas abiertas.</div>`;
    wireTarjetas();
  } catch (e) {
    box.innerHTML = `<div class="mk-vacio">No se pudieron cargar las ofertas.<br>Revisa tu conexión.</div>`;
  }
}

function estrellasTxt(rep) {
  if (!rep || Number(rep.votos) === 0) return 'sin calificaciones';
  const e = Number(rep.estrellasX100) / 100;
  return `<span class="st">★ ${e.toFixed(1)}</span> (${Number(rep.votos)})`;
}

function tarjeta({ o, perf, rep }, cuenta) {
  const sim = simbolo(o.token);
  const monto = f18(o.monto);
  const porTramo = monto / Number(o.tramos);
  const nombre = perf && perf.nombre ? perf.nombre : 'Sin nombre';
  const ini = nombre.trim().charAt(0).toUpperCase() || '?';
  const mio = cuenta && String(cuenta).toLowerCase() === String(o.vendedor).toLowerCase();
  const precio = Number(o.precioFiat) / 100;
  return `
  <div class="mk-of" data-id="${o.id}">
    <div class="mk-of-top">
      <div class="mk-ava">${esc(ini)}</div>
      <div class="mk-quien">
        <div class="mk-nom">${esc(nombre)} ${perf && perf.pais ? `<span class="mk-est">${esc(perf.pais)}</span>` : ''}</div>
        <div class="mk-rep">${estrellasTxt(rep)} <span>${rep ? Number(rep.ventasOk) : 0} ventas</span>${rep && Number(rep.disputasPerdidas) > 0 ? `<span style="color:#f6465d">${Number(rep.disputasPerdidas)} disputas</span>` : ''}</div>
      </div>
      <div class="mk-monto"><b>${num(monto, 2)}</b><span>${sim}</span></div>
    </div>
    <div class="mk-chips">
      ${precio > 0 ? `<span class="mk-chip">Precio <b>${num(precio, 2)} ${esc(o.moneda)}</b></span>` : `<span class="mk-chip">Moneda <b>${esc(o.moneda)}</b></span>`}
      <span class="mk-chip">${esc(o.metodo)}</span>
      <span class="mk-chip">En <b>${o.tramos}</b> tramos de <b>${num(porTramo, 2)}</b></span>
    </div>
    <div class="mk-acts">
      ${mio
        ? `<button class="mk-b gris" data-cancel="${o.id}">Cancelar mi oferta</button>`
        : `<button class="mk-b" data-tomar="${o.id}">Comprar</button>
           <button class="mk-b gris" data-contacto="${o.vendedor}">Ver contacto</button>
           <button class="mk-b gris" data-dist="${o.vendedor}">Distancia</button>`}
    </div>
    <div id="mk-extra-${o.id}"></div>
  </div>`;
}

function wireTarjetas() {
  document.querySelectorAll('[data-tomar]').forEach(b => b.onclick = () => tomar(b.getAttribute('data-tomar')));
  document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => cancelar(b.getAttribute('data-cancel')));
  document.querySelectorAll('[data-contacto]').forEach(b => b.onclick = () => verContacto(b.getAttribute('data-contacto'), b));
  document.querySelectorAll('[data-dist]').forEach(b => b.onclick = () => verDistancia(b.getAttribute('data-dist'), b));
}

async function verContacto(dir, btn) {
  const cont = btn.closest('.mk-of').querySelector('[id^="mk-extra-"]');
  try {
    const p = await lee('perfiles', [dir]);
    cont.innerHTML = `<div class="mk-dist" style="color:#E8B84B;background:rgba(232,184,75,.08);border-color:rgba(232,184,75,.3)">Contacto: <b>${esc(p.contacto || 'no publicado')}</b></div>`;
  } catch (_) { cont.innerHTML = `<div class="mk-dist">No se pudo leer el contacto.</div>`; }
}

async function verDistancia(dir, btn) {
  const cont = btn.closest('.mk-of').querySelector('[id^="mk-extra-"]');
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { cont.innerHTML = `<div class="mk-dist">Conecta tu wallet primero.</div>`; return; }
  cont.innerHTML = `<div class="mk-dist">Pidiendo tu ubicación…</div>`;
  let mia = leerUbic(cuenta);
  if (!mia) {
    try { mia = await pedirUbicacion(); guardarUbic(cuenta, mia.lat, mia.lon); }
    catch (_) { cont.innerHTML = `<div class="mk-dist">No diste permiso de ubicación.</div>`; return; }
  }
  const suya = leerUbic(dir);
  if (!suya) {
    cont.innerHTML = `<div class="mk-dist">La otra persona todavía no ha compartido su ubicación. Pídesela por el contacto: si no quiere mostrarla, tú decides si sigues.</div>`;
    return;
  }
  const km = kmEntre(mia, suya);
  cont.innerHTML = `<div class="mk-dist">Están a <b>${km} km</b> de distancia. ${km < 30 ? 'Están cerca: podrían verse en persona.' : ''}</div>`;
}

/* ── Tomar / cancelar ── */
async function tomar(id) {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { msg('Conecta tu wallet primero.', 'err'); return; }
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    const tx = await c.tomarOrden(id, ARBITRO); await tx.wait();
    msg('¡Listo! Ya puedes pagar el primer tramo. Ve a "Mis operaciones".', 'ok');
    setTimeout(() => { listarOfertas(); }, 1200);
  } catch (e) { msg(traducir(e), 'err'); }
}
let ARBITRO = '0x97e01a1C430E0cC826AcA6e9BE643721e45BCA7d'; // árbitro por defecto (owner)

async function cancelar(id) {
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    const tx = await c.cancelarOrden(id); await tx.wait();
    msg('Oferta cancelada. Tu cripto volvió a tu wallet.', 'ok');
    listarOfertas();
  } catch (e) { msg(traducir(e), 'err'); }
}

/* ── Vender ── */
async function panelVender() {
  const box = $('mk-p2'); if (!box) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { box.innerHTML = `<div class="mk-vacio">Conecta tu wallet para publicar una oferta.</div>`; return; }
  box.innerHTML = `<div class="mk-vacio">Cargando…</div>`;

  const [perf, fianza, fmin, limite] = await Promise.all([
    lee('perfiles', [cuenta]).catch(() => null),
    lee('fianzaDe', [cuenta]).catch(() => 0n),
    lee('fianzaMinima').catch(() => 0n),
    lee('limiteDe', [cuenta]).catch(() => 0n)
  ]);
  const tienePerfil = perf && perf.existe;
  const fOk = fianza >= fmin;
  const lim = limite > (2n ** 200n) ? 'sin límite' : num(f18(limite), 0) + ' USDT';

  box.innerHTML = `
  <div class="mk-box">
    <div class="bt">Tu situación</div>
    <div class="mk-row"><span class="k">Perfil</span><span class="v">${tienePerfil ? `<span class="mk-est a">Creado</span>` : `<span class="mk-est d">Falta</span>`}</span></div>
    <div class="mk-row"><span class="k">Fianza depositada</span><span class="v">${num(f18(fianza), 2)} / ${num(f18(fmin), 0)} USDT ${fOk ? '<span class="mk-est a">OK</span>' : '<span class="mk-est d">Falta</span>'}</span></div>
    <div class="mk-row"><span class="k">Puedes vender hasta</span><span class="v">${lim}</span></div>
  </div>

  ${!tienePerfil ? `
  <div class="mk-box">
    <div class="bt">1. Crea tu perfil</div>
    <div class="mk-2"><div><label>Tu nombre o alias</label><input id="mk-nom" maxlength="32" placeholder="Ej: Jesus"></div>
    <div><label>País</label><input id="mk-pais" maxlength="8" placeholder="CU"></div></div>
    <div class="mk-2"><div><label>Moneda habitual</label><select id="mk-mon">${MONEDAS.map(m => `<option>${m}</option>`).join('')}</select></div>
    <div><label>Contacto (Telegram)</label><input id="mk-cont" maxlength="64" placeholder="@usuario"></div></div>
    <button class="mk-b" id="mk-savep" style="margin-top:12px">Guardar perfil</button>
  </div>` : ''}

  ${tienePerfil && !fOk ? `
  <div class="mk-box">
    <div class="bt">2. Deposita tu fianza</div>
    <div style="font-family:var(--mono,monospace);font-size:11.5px;color:#8b96a3;line-height:1.6;margin-bottom:10px">
      La fianza es <b style="color:#E8B84B">tuya</b> y la retiras cuando quieras. Solo respalda a tu comprador si un árbitro determina que hubo estafa.
    </div>
    <input id="mk-fianza" type="number" step="1" placeholder="${num(f18(fmin), 0)}">
    <button class="mk-b" id="mk-dep" style="margin-top:10px">Depositar fianza</button>
  </div>` : ''}

  ${tienePerfil && fOk ? `
  <div class="mk-box">
    <div class="bt">Publicar oferta</div>
    <div class="mk-2">
      <div><label>Qué vendes</label><select id="mk-tok"><option value="${USDT}">USDT</option><option value="${USDC}">USDC</option></select></div>
      <div><label>Cantidad</label><input id="mk-cant" type="number" step="any" placeholder="100"></div>
    </div>
    <div class="mk-2">
      <div><label>En cuántos tramos</label><select id="mk-tra"><option value="5" selected>5 tramos (recomendado)</option><option value="3">3 tramos</option><option value="2">2 tramos (mínimo)</option><option value="10">10 tramos</option></select></div>
      <div><label>Moneda que aceptas</label><select id="mk-moneda">${MONEDAS.map(m => `<option${perf.moneda === m ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
    </div>
    <div class="mk-2">
      <div><label>Cómo te pagan</label><select id="mk-met">${METODOS.map(m => `<option>${m}</option>`).join('')}</select></div>
      <div><label>Precio por unidad</label><input id="mk-prec" type="number" step="any" placeholder="Ej: 420"></div>
    </div>
    <button class="mk-b" id="mk-pub" style="margin-top:14px">Publicar oferta</button>
    <div style="font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-align:center;margin-top:9px">Tu cripto queda trabada en el contrato hasta que confirmes cada tramo.</div>
  </div>` : ''}`;

  if ($('mk-savep')) $('mk-savep').onclick = guardarPerfil;
  if ($('mk-dep')) $('mk-dep').onclick = depositarFianza;
  if ($('mk-pub')) $('mk-pub').onclick = publicar;
}

async function guardarPerfil() {
  const n = ($('mk-nom').value || '').trim(), p = ($('mk-pais').value || '').trim().toUpperCase();
  const m = $('mk-mon').value, c = ($('mk-cont').value || '').trim();
  if (!n) { msg('Pon tu nombre.', 'err'); return; }
  try {
    msg('Confirma en tu wallet…', 'info');
    const ct = new ethers.Contract(MARKET, ABI, await firmante());
    const tx = await ct.guardarPerfil(n, p, m, c); await tx.wait();
    msg('Perfil guardado en la blockchain.', 'ok'); panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

async function depositarFianza() {
  const v = Number($('mk-fianza').value || 0);
  if (!(v > 0)) { msg('Pon un monto.', 'err'); return; }
  try {
    const signer = await firmante();
    const cuenta = await signer.getAddress();
    const monto = ethers.parseUnits(String(v), 18);
    const t = new ethers.Contract(USDT, ERC20, signer);
    msg('Revisando permiso de USDT…', 'info');
    if ((await t.allowance(cuenta, MARKET)) < monto) {
      msg('Aprueba el USDT en tu wallet…', 'info');
      await (await t.approve(MARKET, monto)).wait();
    }
    msg('Confirma el depósito…', 'info');
    const c = new ethers.Contract(MARKET, ABI, signer);
    await (await c.depositarFianza(monto)).wait();
    msg('Fianza depositada. Ya puedes vender.', 'ok'); panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

async function publicar() {
  const tok = $('mk-tok').value;
  const cant = Number($('mk-cant').value || 0);
  const tramos = Number($('mk-tra').value);
  const moneda = $('mk-moneda').value;
  const metodo = $('mk-met').value;
  const precio = Number($('mk-prec').value || 0);
  if (!(cant > 0)) { msg('Pon la cantidad.', 'err'); return; }
  const porTramo = cant / tramos;
  if (Math.abs(porTramo * tramos - cant) > 1e-9) { msg('La cantidad debe dividirse exacta entre los tramos.', 'err'); return; }
  try {
    const signer = await firmante();
    const cuenta = await signer.getAddress();
    const monto = ethers.parseUnits(String(cant), 18);
    if (monto % BigInt(tramos) !== 0n) { msg('Elige una cantidad que se divida exacta entre los tramos.', 'err'); return; }
    const t = new ethers.Contract(tok, ERC20, signer);
    msg('Revisando permiso…', 'info');
    if ((await t.allowance(cuenta, MARKET)) < monto) {
      msg('Aprueba el token en tu wallet…', 'info');
      await (await t.approve(MARKET, monto)).wait();
    }
    const fee = await lee('comisionBnb');
    msg('Confirma la publicación…', 'info');
    const c = new ethers.Contract(MARKET, ABI, signer);
    await (await c.crearOrden(tok, monto, tramos, moneda, metodo, Math.round(precio * 100), { value: fee })).wait();
    msg('¡Oferta publicada!', 'ok');
    setTimeout(() => { $('mk-t1').click(); }, 1000);
  } catch (e) { msg(traducir(e), 'err'); }
}

/* ── Mis operaciones ── */
async function panelMisOps() {
  const box = $('mk-p3'); if (!box) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { box.innerHTML = `<div class="mk-vacio">Conecta tu wallet.</div>`; return; }
  box.innerHTML = `<div class="mk-vacio">Cargando…</div>`;
  try {
    const [ventas, compras] = await Promise.all([
      lee('misOrdenes', [cuenta]).catch(() => []),
      lee('misCompras', [cuenta]).catch(() => [])
    ]);
    const ids = [...new Set([...ventas, ...compras].map(String))];
    if (ids.length === 0) { box.innerHTML = `<div class="mk-vacio">Todavía no tienes operaciones.</div>`; return; }
    const ords = (await Promise.all(ids.map(id => lee('ordenes', [id]).catch(() => null)))).filter(Boolean);
    ords.sort((a, b) => Number(b.id) - Number(a.id));
    box.innerHTML = ords.map(o => opCard(o, cuenta)).join('');
    wireOps();
  } catch (e) { box.innerHTML = `<div class="mk-vacio">No se pudo cargar.</div>`; }
}

function opCard(o, cuenta) {
  const soyV = String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase();
  const est = Number(o.estado);
  const sim = simbolo(o.token);
  const monto = f18(o.monto), tramos = Number(o.tramos), hechos = Number(o.tramosHechos);
  const porTramo = monto / tramos;
  const pasos = Array.from({ length: tramos }, (_, i) =>
    `<div class="mk-step ${i < hechos ? 'ok' : (i === hechos && est === 1 ? 'now' : '')}"></div>`).join('');
  let acciones = '';
  if (est === 1) {
    if (soyV) {
      acciones = `${o.tramoPagado ? `<button class="mk-b" data-lib="${o.id}">Recibí el pago · liberar tramo ${hechos + 1}</button>` : `<button class="mk-b gris" disabled>Esperando que pague el tramo ${hechos + 1}</button>`}
        <button class="mk-b gris" data-disp="${o.id}">Abrir disputa</button>`;
    } else {
      acciones = `${o.tramoPagado ? `<button class="mk-b gris" disabled>Esperando que el vendedor confirme</button>` : `<button class="mk-b" data-pag="${o.id}">Ya pagué el tramo ${hechos + 1}</button>`}
        <button class="mk-b gris" data-disp="${o.id}">Abrir disputa</button>`;
    }
  } else if (est === 2) {
    const falta = soyV ? !o.califVendedor : !o.califComprador;
    acciones = falta ? `<button class="mk-b" data-cal="${o.id}">Calificar (obligatorio)</button>` : `<button class="mk-b gris" disabled>Completada y calificada</button>`;
  } else if (est === 0 && soyV) {
    acciones = `<button class="mk-b gris" data-cancel2="${o.id}">Cancelar oferta</button>`;
  }
  const clase = est === 2 ? 'a' : (est === 4 ? 'd' : '');
  return `
  <div class="mk-of">
    <div class="mk-of-top">
      <div class="mk-quien">
        <div class="mk-nom">#${o.id} · ${soyV ? 'Vendo' : 'Compro'} ${num(monto, 2)} ${sim} <span class="mk-est ${clase}">${ESTADOS[est]}</span></div>
        <div class="mk-rep">${esc(o.moneda)} · ${esc(o.metodo)}</div>
      </div>
      <div class="mk-monto"><b>${hechos}/${tramos}</b><span>tramos</span></div>
    </div>
    <div class="mk-prog">
      <div class="mk-prog-lab"><span>Progreso</span><span>Entregado <b>${num(f18(o.liberado), 2)}</b> de ${num(monto, 2)} · tramo de ${num(porTramo, 2)}</span></div>
      <div class="mk-steps">${pasos}</div>
    </div>
    <div class="mk-acts">${acciones}</div>
    <div id="mk-cal-${o.id}"></div>
  </div>`;
}

function wireOps() {
  const tx = async (fn, id, okMsg) => {
    try {
      msg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c[fn](id)).wait();
      msg(okMsg, 'ok'); panelMisOps();
    } catch (e) { msg(traducir(e), 'err'); }
  };
  document.querySelectorAll('[data-pag]').forEach(b => b.onclick = () => tx('marcarPagado', b.getAttribute('data-pag'), 'Pago marcado. Espera la confirmación del vendedor.'));
  document.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => tx('liberarTramo', b.getAttribute('data-lib'), 'Tramo liberado.'));
  document.querySelectorAll('[data-disp]').forEach(b => b.onclick = () => tx('abrirDisputa', b.getAttribute('data-disp'), 'Disputa abierta. Un árbitro revisará el caso.'));
  document.querySelectorAll('[data-cancel2]').forEach(b => b.onclick = () => tx('cancelarOrden', b.getAttribute('data-cancel2'), 'Oferta cancelada.'));
  document.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => pedirEstrellas(b.getAttribute('data-cal')));
}

function pedirEstrellas(id) {
  const cont = $('mk-cal-' + id); if (!cont) return;
  let sel = 0;
  cont.innerHTML = `<div class="mk-box" style="margin-top:11px"><div class="bt">¿Cómo te fue con esta persona?</div>
    <div class="mk-stars" id="mk-st-${id}">${[1,2,3,4,5].map(i => `<span class="mk-star" data-v="${i}">★</span>`).join('')}</div>
    <button class="mk-b" id="mk-envcal-${id}" disabled>Enviar calificación</button></div>`;
  const stars = cont.querySelectorAll('.mk-star');
  stars.forEach(s => s.onclick = () => {
    sel = Number(s.getAttribute('data-v'));
    stars.forEach(x => x.classList.toggle('on', Number(x.getAttribute('data-v')) <= sel));
    $('mk-envcal-' + id).disabled = false;
  });
  $('mk-envcal-' + id).onclick = async () => {
    try {
      msg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.calificar(id, sel)).wait();
      msg('¡Gracias! Calificación registrada.', 'ok'); panelMisOps();
    } catch (e) { msg(traducir(e), 'err'); }
  };
}

/* Compartir mi ubicación (para que otros vean la distancia) */
export async function compartirUbicacion() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) return false;
  try { const u = await pedirUbicacion(); guardarUbic(cuenta, u.lat, u.lon); return true; } catch (_) { return false; }
}
