// avisos.js — Notificaciones del Marketplace (dentro de la web + push del navegador).
// Módulo independiente. No usa servidores: lee los eventos directamente de la blockchain.
// La librería vive en ESTE repositorio. Carga directa: sin CDN, sin esperas,
// sin nada externo que pueda quedarse colgado y dejar la app en 'Cargando…'.
import * as ethers from './vendor/ethers-6.13.4.min.js?v=84';
import * as wallet from './wallet.js?v=84';

const MARKET = '0x1131c4760Da083aaFCf20d6848Af93A8a2edFb18';
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://rpc.ankr.com/bsc'
];
const ABI = [
  'function misOrdenes(address) view returns (uint256[])',
  'function misCompras(address) view returns (uint256[])',
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador))'
];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ── Preferencia del usuario (push activado por defecto) ── */
const KEY = 'aurex-push';
export function pushActivado() { try { return localStorage.getItem(KEY) !== 'off'; } catch (_) { return true; } }
export function setPush(v) { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch (_) {} }
export function pushSoportado() { return typeof Notification !== 'undefined'; }
export function pushPermiso() { return pushSoportado() ? Notification.permission : 'unsupported'; }

export async function pedirPermisoPush() {
  if (!pushSoportado()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; } catch (_) { return false; }
}

function lanzarPush(titulo, cuerpo) {
  if (!pushActivado() || !pushSoportado() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(titulo, { body: cuerpo, icon: 'assets/img/logo-samurai.webp', tag: 'aurex-market' });
    n.onclick = () => { window.focus(); n.close(); const b = $('c-market'); if (b) b.click(); };
  } catch (_) {}
}

/* ── Estilos ── */
function estilos() {
  if ($('av-css')) return;
  const s = document.createElement('style'); s.id = 'av-css';
  s.textContent = `
  #av-wrap{position:fixed;right:16px;bottom:16px;z-index:9500;display:flex;flex-direction:column;gap:9px;max-width:340px}
  #av-wrap .av{background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid var(--gold-soft,#C9A84B);border-radius:14px;padding:13px 15px;box-shadow:0 14px 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);cursor:pointer;animation:avIn .22s ease both}
  @keyframes avIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  #av-wrap .av .t{font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;color:var(--gold,#E8B84B);margin-bottom:3px;display:flex;align-items:center;gap:7px}
  #av-wrap .av .t i{width:7px;height:7px;border-radius:50%;background:var(--neon-lit,#2ee86a);box-shadow:0 0 7px var(--neon-lit,#2ee86a);flex:0 0 auto}
  #av-wrap .av .d{font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.5}
  #av-wrap .av .x{position:absolute;top:7px;right:9px;color:#7d8794;font-size:13px}
  #colmena-app .c-market{position:relative}
  #colmena-app .mk-punto{position:absolute;top:5px;right:5px;width:9px;height:9px;border-radius:50%;background:var(--rojo,#f6465d);box-shadow:0 0 8px rgba(246,70,93,.9);animation:avPul 1.4s ease-in-out infinite}
  @keyframes avPul{0%,100%{opacity:.55}50%{opacity:1}}
  @media(max-width:560px){#av-wrap{right:10px;left:10px;bottom:10px;max-width:none}}
  `;
  document.head.appendChild(s);
}

/* ── Aviso visual dentro de la web ── */
export function avisar(titulo, texto) {
  estilos();
  let w = $('av-wrap');
  if (!w) { w = document.createElement('div'); w.id = 'av-wrap'; document.body.appendChild(w); }
  const d = document.createElement('div');
  d.className = 'av';
  d.style.position = 'relative';
  d.innerHTML = `<span class="x">✕</span><div class="t"><i></i>${esc(titulo)}</div><div class="d">${esc(texto)}</div>`;
  d.onclick = () => { d.remove(); const b = $('c-market'); if (b) b.click(); };
  d.querySelector('.x').onclick = (e) => { e.stopPropagation(); d.remove(); };
  w.appendChild(d);
  setTimeout(() => { if (d.parentNode) d.remove(); }, 15000);
  lanzarPush(titulo, texto);
  punto(true);
}

function punto(on) {
  const b = $('c-market'); if (!b) return;
  let p = b.querySelector('.mk-punto');
  if (on && !p) { p = document.createElement('span'); p.className = 'mk-punto'; b.appendChild(p); }
  if (!on && p) p.remove();
}
export function limpiarPunto() { punto(false); }

/* ── Vigilancia (compara el estado cada 25 s; sin servidores) ── */
let _idx = 0, _timer = null, _previo = {}, _primera = true;
async function lee(fn, args = []) {
  for (let k = 0; k < RPCS.length; k++) {
    try {
      const c = new ethers.Contract(MARKET, ABI, new ethers.JsonRpcProvider(RPCS[_idx % RPCS.length], 56, { staticNetwork: true }));
      return await c[fn](...args);
    } catch (_) { _idx++; }
  }
  throw new Error('rpc');
}

async function revisar() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) return;
  let ids = [];
  try {
    const [v, c] = await Promise.all([
      lee('misOrdenes', [cuenta]).catch(() => []),
      lee('misCompras', [cuenta]).catch(() => [])
    ]);
    ids = [...new Set([...v, ...c].map(String))];
  } catch (_) { return; }
  if (ids.length === 0) return;

  const ords = (await Promise.all(ids.map(id => lee('ordenes', [id]).catch(() => null)))).filter(Boolean);
  const soyV = (o) => String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase();

  for (const o of ords) {
    const id = String(o.id);
    const est = Number(o.estado), hechos = Number(o.tramosHechos), pagado = !!o.tramoPagado;
    const ant = _previo[id];
    _previo[id] = { est, hechos, pagado };
    if (_primera || !ant) continue;   // la primera vuelta solo toma la foto

    if (ant.est === 0 && est === 1 && soyV(o)) {
      avisar('Tomaron tu oferta', `Alguien quiere comprar tu orden #${id}. Espera su pago del primer tramo.`);
    }
    if (!ant.pagado && pagado && soyV(o)) {
      avisar('Marcaron un pago', `El comprador dice que pagó el tramo ${hechos + 1} de la orden #${id}. Verifica y libera.`);
    }
    if (hechos > ant.hechos && !soyV(o)) {
      avisar('Recibiste un tramo', `El vendedor liberó el tramo ${hechos} de la orden #${id}. Ya está en tu wallet.`);
    }
    if (ant.est !== 2 && est === 2) {
      avisar('Operación completada', `La orden #${id} terminó. Falta que califiques con estrellas.`);
    }
    if (ant.est !== 4 && est === 4) {
      avisar('Se abrió una disputa', `La orden #${id} está en disputa. Un árbitro la revisará.`);
    }
    if (ant.est !== 3 && est === 3) {
      avisar('Orden cancelada', `La orden #${id} fue cancelada.`);
    }
  }
  _primera = false;
}

export function iniciar() {
  estilos();
  if (_timer) return;
  revisar();                                  // foto inicial
  _timer = setInterval(revisar, 25000);       // cada 25 segundos
  // Si el push está activado por defecto, pide permiso en el primer toque del usuario.
  const pedir = async () => {
    document.removeEventListener('click', pedir);
    if (pushActivado() && pushPermiso() === 'default') await pedirPermisoPush();
  };
  document.addEventListener('click', pedir, { once: true });
}
export function detener() { if (_timer) { clearInterval(_timer); _timer = null; } }
