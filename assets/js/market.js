// market.js — Marketplace P2P (caja fuerte + tramos + reputación). Módulo independiente.
// La librería vive en ESTE repositorio. Carga directa: sin CDN, sin esperas,
// sin nada externo que pueda quedarse colgado y dejar la app en 'Cargando…'.
import * as ethers from './vendor/ethers-6.13.4.min.js?v=74';
import * as wallet from './wallet.js?v=74';

const MARKET = '0x1131c4760Da083aaFCf20d6848Af93A8a2edFb18';
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
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador,uint8 tipo,string motivo,uint64 disputaEn,bool cancelaV,bool cancelaC))',
  'function perfiles(address) view returns (tuple(string nombre,string pais,string moneda,string contacto,bool existe,uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint64 sumaEstrellas,uint32 numVotos,uint64 desde,bool compartirUbic,int32 lat1e3,int32 lon1e3,string zona,string horario))',
  'function reputacionDe(address) view returns (uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint256 estrellasX100,uint32 votos,uint64 desde)',
  'function totalOrdenes() view returns (uint256)',
  'function comisionBnb() view returns (uint256)',
  'function fianzaDe(address) view returns (uint256)',
  'function fianzaMinima() view returns (uint256)',
  'function owner() view returns (address)',
  'function limiteDe(address) view returns (uint256)',
  'function misOrdenes(address) view returns (uint256[])',
  'function misCompras(address) view returns (uint256[])',
  'function pendientesDeCalificar(address) view returns (uint256[])',
  'function guardarPerfil(string,string,string,string)',
  'function ubicacionDe(address) view returns (bool comparte,int32 lat1e3,int32 lon1e3,string zona)',
  'function compartirUbicacion(int32,int32,string)',
  'function guardarHorario(string)',
  'function crearAnuncioCompra(address,uint256,string,string,uint256) payable returns (uint256)',
  'function ocultarUbicacion()',
  'function depositarFianza(uint256)',
  'function retirarFianza(uint256)',
  'function crearOrden(address,uint256,uint16,string,string,uint256) payable returns (uint256)',
  'function tomarOrden(uint256,address)',
  'function marcarPagado(uint256)',
  'function liberarTramo(uint256)',
  'function cancelarOrden(uint256)',
  'function cancelarPorTiempo(uint256)',
  'function abrirDisputa(uint256,string)',
  'function anularDisputa(uint256)',
  'function caducarDisputa(uint256)',
  'function pedirCancelar(uint256)',
  'function liberarReserva(uint256)',
  'function abandonarVenta(uint256)',
  'function retirarTodo() returns (uint256)',
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
/** Números grandes en corto: 1.170.000 → 1,17 M · 2.300.000.000 → 2,3 MM */
function corto(n) {
  const x = Number(n) || 0;
  if (x >= 1e9) return num(x / 1e9, 2) + ' MM';
  if (x >= 1e6) return num(x / 1e6, 2) + ' M';
  if (x >= 1e5) return num(x, 0);
  return num(x, x >= 1000 ? 0 : 2);
}
const ESTADOS = ['Abierta', 'En curso', 'Completada', 'Cancelada', 'En disputa'];
const MONEDAS = ['CUP', 'MLC', 'USD', 'MXN', 'COP', 'ARS', 'EUR', 'BRL', 'CAD', 'CLP', 'PEN', 'DOP', 'VES'];
const METODOS = ['Transferencia', 'Zelle', 'PayPal', 'Saldo movil', 'Efectivo', 'Otro'];
// Monedas "a la par" (se cotizan cerca de 1:1 con el dólar): sugerimos multiplicadores.
const PAR = ['USD', 'MLC', 'EUR'];
const SUGERE = { CUP: [380, 400, 420, 440], MXN: [17, 18, 19, 20], COP: [3900, 4000, 4200], ARS: [1000, 1100, 1200], VES: [36, 38, 40], DOP: [58, 60, 62], PEN: [3.7, 3.8, 3.9], CLP: [900, 950, 1000], BRL: [5, 5.2, 5.5], CAD: [1.35, 1.4, 1.45] };

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
      (e) => rej(new Error(e && e.code === 2 ? 'sistema' : 'denegado')),
      { timeout: 12000, maximumAge: 600000 });
  });
}

/* ── Logos ── */
const LOGO = {
  USDT: `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#26A17B"/><path fill="#fff" d="M17.9 17.4v0c-.1 0-.7.1-1.9.1-1 0-1.7 0-2 0v0c-3.6-.2-6.2-.8-6.2-1.5s2.7-1.3 6.2-1.5v2.3c.3 0 1.1.1 2 .1 1.2 0 1.8-.1 1.9-.1v-2.3c3.6.2 6.2.8 6.2 1.5s-2.7 1.3-6.2 1.5m0-3.2v-2h4.7v-3.1H9.4v3.1h4.7v2C10.3 14.4 7.4 15.2 7.4 16.1s2.9 1.7 6.7 1.9v6.6h3.8v-6.6c3.8-.2 6.7-1 6.7-1.9s-2.9-1.7-6.7-1.9"/></svg>`,
  USDC: `<svg viewBox="0 0 32 32" width="100%" height="100%"><circle cx="16" cy="16" r="16" fill="#2775CA"/><path fill="#fff" d="M20.3 18.5c0-2.3-1.4-3.1-4.1-3.4-2-.3-2.4-.8-2.4-1.7s.7-1.6 2-1.6c1.2 0 1.8.4 2.1 1.4.1.2.3.3.4.3h1.1c.2 0 .4-.2.4-.4v0c-.3-1.5-1.5-2.6-3-2.8V8.7c0-.2-.2-.4-.4-.4h-1c-.2 0-.4.2-.4.4v1.5c-2 .3-3.2 1.6-3.2 3.3 0 2.2 1.3 3.1 4 3.4 1.9.3 2.5.7 2.5 1.8s-.9 1.8-2.2 1.8c-1.7 0-2.3-.7-2.5-1.7 0-.2-.2-.3-.4-.3h-1.2c-.2 0-.4.2-.4.4v0c.3 1.7 1.4 2.9 3.4 3.2v1.5c0 .2.2.4.4.4h1c.2 0 .4-.2.4-.4v-1.5c2-.3 3.3-1.7 3.3-3.6z"/><path fill="#fff" d="M12.9 25.5c-4.1-1.5-6.2-6.1-4.7-10.2.8-2.2 2.5-3.9 4.7-4.7.2-.1.3-.3.3-.5v-.9c0-.2-.1-.4-.3-.4-.1 0-.2 0-.3 0-5 1.6-7.7 6.9-6.1 11.9.9 2.9 3.2 5.2 6.1 6.1.2.1.4 0 .5-.2.1-.1.1-.1.1-.2v-.9c0-.2-.2-.4-.3-.5zm6.5-17.2c-.2-.1-.4 0-.5.2-.1.1-.1.1-.1.2v.9c0 .2.2.4.3.5 4.1 1.5 6.2 6.1 4.7 10.2-.8 2.2-2.5 3.9-4.7 4.7-.2.1-.3.3-.3.5v.9c0 .2.1.4.3.4.1 0 .2 0 .3 0 5-1.6 7.7-6.9 6.1-11.9-.9-2.9-3.2-5.2-6.1-6.2z"/></svg>`
};
const ICOCT = {
  Telegram: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M21.9 4.3 18.7 19c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 12.7 1.4 11.2c-1-.3-1.1-1 .2-1.5L20.5 2.4c.9-.3 1.6.2 1.4 1.9z"/></svg>`,
  WhatsApp: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>`,
  'Teléfono': `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"/></svg>`
};
const logoMoneda = (t) => LOGO[simbolo(t)] || '';

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
  #mk-overlay .mk-tabs{display:flex;gap:6px;background:#0b0e12;border:1px solid #2b3139;border-radius:12px;padding:5px;margin-bottom:16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  #mk-overlay .mk-tabs::-webkit-scrollbar{display:none}
  #mk-overlay .mk-tab{flex:1 0 auto;min-height:44px;padding:11px 12px;border:none;border-radius:8px;background:transparent;color:#b7bdc6;font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer;white-space:nowrap}
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
  #mk-overlay input[type=number]::-webkit-outer-spin-button,#mk-overlay input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
  /* Desplegable con flecha propia, bien separada del borde */
  #mk-overlay .mk-sel{position:relative}
  #mk-overlay .mk-sel select{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding-right:44px;cursor:pointer}
  #mk-overlay .mk-sel::after{content:'';position:absolute;right:16px;top:50%;width:8px;height:8px;border-right:2px solid var(--gold,#E8B84B);border-bottom:2px solid var(--gold,#E8B84B);transform:translateY(-70%) rotate(45deg);pointer-events:none;border-radius:1px}
  #mk-overlay .mk-sel::before{content:'';position:absolute;right:6px;top:6px;bottom:6px;width:32px;border-left:1px solid #2b3139;pointer-events:none}
  /* Cantidad con − y + propios */
  #mk-overlay .mk-step-in{display:flex;gap:7px;align-items:stretch}
  #mk-overlay .mk-step-in input{flex:1;min-width:0;text-align:center;font-size:16px;font-weight:700}
  #mk-overlay .mk-mm{flex:0 0 auto;width:48px;border-radius:10px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-size:20px;font-weight:800;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);line-height:1}
  #mk-overlay .mk-mm:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  /* Chips seleccionables */
  #mk-overlay .mk-chips-sel{display:flex;flex-wrap:wrap;gap:7px}
  #mk-overlay .mk-cs{min-height:40px;padding:9px 13px;border-radius:9px;border:1px solid #2b3139;background:linear-gradient(180deg,#1b2027,#0d1117);color:#b7bdc6;font-family:var(--mono,monospace);font-size:12px;cursor:pointer;font-weight:700}
  #mk-overlay .mk-cs.on{color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);border-color:#c79426;box-shadow:0 2px 0 #8f6a1a}
  #mk-overlay .mk-rapidos{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  #mk-overlay .mk-rp{padding:7px 12px;border-radius:8px;border:1px solid #3a424c;background:rgba(255,255,255,.04);color:var(--gold,#E8B84B);font-family:var(--mono,monospace);font-size:12px;cursor:pointer}
  #mk-overlay .mk-rp:active{transform:translateY(1px)}
  #mk-overlay .mk-hint{font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;line-height:1.55;margin-top:6px}
  #mk-overlay .mk-hint b{color:var(--gold-soft,#C9A84B)}
  #mk-overlay .mk-lab-s{text-transform:none;letter-spacing:0;color:#5f6a75}
  #mk-overlay .mk-i{width:16px;height:16px;border-radius:50%;border:1px solid #6f7a86;background:transparent;color:#8b96a3;font-size:10px;font-style:italic;font-family:Georgia,serif;cursor:pointer;display:inline-grid;place-items:center;vertical-align:middle;margin-left:4px;padding:0}
  #mk-overlay .mk-i:hover{border-color:var(--gold,#E8B84B);color:var(--gold,#E8B84B)}
  #mk-overlay label b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-chip.pr{background:rgba(232,184,75,.1);border-color:rgba(232,184,75,.35);color:var(--gold,#E8B84B)}
  #mk-overlay .mk-chip.pr b{color:#eaecef;font-size:12.5px}
  #mk-overlay .tx-s{display:none}
  #mk-overlay input:focus,#mk-overlay select:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #mk-overlay .mk-2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #mk-overlay .mk-msg{font-family:var(--mono,monospace);font-size:12px;text-align:center;margin-top:12px;min-height:16px;line-height:1.5}
  #mk-overlay .mk-msg.err{color:var(--rojo,#f6465d)} #mk-overlay .mk-msg.ok{color:var(--neon-lit,#2ee86a)} #mk-overlay .mk-msg.info{color:#7d8794}
  #mk-overlay .mk-vacio{font-family:var(--mono,monospace);font-size:13px;color:#7d8794;text-align:center;padding:34px 0;line-height:1.7}
  #mk-overlay .mk-nota{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-align:center;margin-top:14px;line-height:1.6}
  #mk-overlay .mk-wz{display:flex;align-items:center;gap:6px;margin-bottom:12px}
  #mk-overlay .mk-wz-p{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center;opacity:.5}
  #mk-overlay .mk-wz-p.now,#mk-overlay .mk-wz-p.ok{opacity:1}
  #mk-overlay .mk-wz-p .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--display,sans-serif);font-weight:800;font-size:13px;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid #3a424c;color:#7d8794}
  #mk-overlay .mk-wz-p.now .n{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);border-color:#c79426;color:#3a2800;box-shadow:0 3px 0 #8f6a1a}
  #mk-overlay .mk-wz-p.ok .n{background:rgba(46,232,106,.16);border-color:rgba(46,232,106,.5);color:var(--neon-lit,#2ee86a)}
  #mk-overlay .mk-wz-p .t{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;line-height:1.3}
  #mk-overlay .mk-wz-p.now .t{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-wz-l{width:18px;height:1px;background:#3a424c;flex:0 0 auto;margin-top:-16px}
  #mk-overlay .mk-guia{font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6;line-height:1.6;padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.07);border:1px solid rgba(232,184,75,.3);margin-bottom:13px;text-align:center}
  @media(max-width:560px){#mk-overlay .mk-wz-p .t{font-size:9px}#mk-overlay .mk-wz-l{width:10px}}
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
  /* Evita que el navegador pinte de blanco los campos (autorrelleno) */
  #mk-overlay input:-webkit-autofill,.mk-wiz-c input:-webkit-autofill,
  #mk-overlay input:-webkit-autofill:focus,.mk-wiz-c input:-webkit-autofill:focus{
    -webkit-text-fill-color:#eaecef!important;-webkit-box-shadow:0 0 0 1000px #0b0e12 inset!important;caret-color:#eaecef;transition:background-color 9999s ease-in-out 0s}
  #mk-overlay input,.mk-wiz-c input{color-scheme:dark}
  .mk-wiz-c label .op{text-transform:none;letter-spacing:0;color:#5f6a75}
  /* Botón desplegable de la ficha */
  .mk-wiz-c .fc-desp{width:100%;padding:12px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-family:var(--display,sans-serif);font-weight:700;font-size:13.5px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;gap:8px}
  .mk-wiz-c .fc-desp .ar{font-size:9px;transition:transform .2s}
  .mk-wiz-c .fc-desp.open .ar{transform:rotate(180deg)}
  .mk-wiz-c .fc-desp + .fc-pasos{margin-top:9px}
  .mk-wiz-c .fc-cta{display:block;width:100%;margin:16px auto 0;text-align:center;padding:14px;border-radius:12px;font-family:var(--display,sans-serif);font-weight:800;font-size:15px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a}
  .mk-wiz-c .fc-cta.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:var(--gold,#E8B84B);box-shadow:0 4px 0 rgba(0,0,0,.4)}
  /* Logo de la moneda */
  #mk-overlay .tj-moneda,.mk-wiz-c .tj-moneda{width:38px;height:38px;flex:0 0 auto;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0b0e12;border:1px solid #2b3139}
  .mk-wiz-c .tj-moneda.grande{width:50px;height:50px}
  .mk-wiz-c .fc-ct .ic{display:grid;place-items:center}
  #mk-overlay .mk-badge{display:inline-grid;place-items:center;min-width:17px;height:17px;padding:0 5px;border-radius:9px;background:var(--rojo,#f6465d);color:#fff;font-family:var(--mono,monospace);font-size:9.5px;font-weight:800;margin-left:5px;box-shadow:0 0 8px rgba(246,70,93,.6)}
  #mk-overlay .tj-estrellas{display:flex;align-items:center;justify-content:center;gap:7px;width:100%}
  #mk-overlay .tj-estrellas .st{color:var(--gold,#E8B84B);font-size:11px;letter-spacing:1px}
  #mk-overlay .tj-estrellas b{color:#eaecef;font-family:var(--display,sans-serif);font-size:12px}
  #mk-overlay .tj-estrellas .ops{color:#7d8794;font-size:10px}
  #mk-overlay .tj-pie{justify-content:center}
  #mk-overlay .op-motivo{margin-top:10px;padding:11px 13px;border-radius:11px;background:rgba(255,255,255,.03);border:1px solid #3a424c;font-family:var(--sans,sans-serif);font-size:12.5px;color:#eaecef;line-height:1.6}
  #mk-overlay .op-motivo span{display:block;font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;letter-spacing:.6px;margin-bottom:5px}
  .mk-wiz-c textarea{width:100%;box-sizing:border-box;background:#0b0e12;border:1px solid #2b3139;border-radius:11px;color:#eaecef;font-family:var(--sans,sans-serif);font-size:13.5px;padding:12px;line-height:1.5;resize:vertical}
  .mk-wiz-c textarea:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #mk-overlay .op-caja{background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid rgba(232,184,75,.35);border-radius:14px;padding:15px;margin-bottom:18px;text-align:center;box-shadow:0 4px 0 rgba(0,0,0,.3)}
  #mk-overlay .op-caja.vacia{border-color:#2b3139}
  #mk-overlay .op-caja-t{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.9px}
  #mk-overlay .op-caja-v{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin:7px 0 6px}
  #mk-overlay .op-caja-v span{font-family:var(--mono,monospace);font-size:11px;color:#8b96a3}
  #mk-overlay .op-caja-v b{font-family:var(--display,sans-serif);font-size:24px;color:var(--gold,#E8B84B);margin-right:4px}
  #mk-overlay .op-caja.vacia .op-caja-v b{color:#5f6a75}
  #mk-overlay .op-caja-d{font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;line-height:1.5}
  #mk-overlay .op-caja-b{margin-top:12px;width:100%;padding:12px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  #mk-overlay .op-caja-b:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  #mk-overlay .mk-lanza .lz-d{max-width:340px;margin-left:auto;margin-right:auto}
  /* ── Operaciones ── */
  #mk-overlay .op-sec{margin-bottom:20px}
  #mk-overlay .op-st{font-family:var(--display,sans-serif);font-weight:800;font-size:14px;color:#eaecef;margin-bottom:5px;display:flex;align-items:center;gap:8px}
  #mk-overlay .op-st span{font-family:var(--mono,monospace);font-size:10px;font-weight:400;color:#7d8794;background:rgba(255,255,255,.06);border:1px solid #2b3139;border-radius:20px;padding:2px 8px}
  #mk-overlay .op-nota{font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;margin-bottom:11px;line-height:1.5}
  #mk-overlay .op-card{background:linear-gradient(158deg,#1c222c,#0c1017);border:1px solid #2b3139;border-radius:16px;padding:15px;margin-bottom:10px;box-shadow:0 4px 0 rgba(0,0,0,.32)}
  #mk-overlay .op-card.act{border-color:rgba(232,184,75,.5);box-shadow:0 4px 0 rgba(0,0,0,.32),0 0 22px rgba(232,184,75,.09)}
  #mk-overlay .op-card.dis{border-color:rgba(246,70,93,.45)}
  #mk-overlay .op-card.ok{opacity:.72}
  #mk-overlay .op-cab{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:9px}
  #mk-overlay .op-id{font-family:var(--mono,monospace);font-size:10px;color:#6b7681}
  #mk-overlay .op-rol{font-family:var(--display,sans-serif);font-weight:800;font-size:12.5px;color:#eaecef;flex:1;min-width:0}
  #mk-overlay .op-est{font-family:var(--mono,monospace);font-size:9.5px;padding:3px 9px;border-radius:8px;border:1px solid #3a424c;color:#9aa4b0;background:rgba(255,255,255,.04)}
  #mk-overlay .op-est.act{color:var(--gold,#E8B84B);border-color:rgba(232,184,75,.45);background:rgba(232,184,75,.1)}
  #mk-overlay .op-est.dis{color:var(--rojo,#f6465d);border-color:rgba(246,70,93,.45);background:rgba(246,70,93,.1)}
  #mk-overlay .op-est.ok{color:var(--neon-lit,#2ee86a);border-color:rgba(46,232,106,.45);background:rgba(46,232,106,.1)}
  #mk-overlay .op-tit{font-family:var(--display,sans-serif);font-weight:800;font-size:15px;color:var(--gold,#E8B84B);line-height:1.3;margin-bottom:6px}
  #mk-overlay .op-card.ok .op-tit,#mk-overlay .op-card:not(.act):not(.dis) .op-tit{color:#eaecef}
  #mk-overlay .op-card.act .op-tit{color:var(--gold,#E8B84B)}
  #mk-overlay .op-exp{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6}
  #mk-overlay .op-exp b{color:var(--gold-soft,#C9A84B)}
  #mk-overlay .op-prog{margin-top:12px}
  #mk-overlay .op-prog-l{display:flex;justify-content:space-between;gap:9px;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;margin-bottom:6px;flex-wrap:wrap}
  #mk-overlay .op-ct{font-family:var(--mono,monospace);font-size:12px;color:#7fb0ff;background:rgba(127,176,255,.09);border:1px solid rgba(127,176,255,.3);border-radius:10px;padding:10px 12px;margin-bottom:9px;width:100%;word-break:break-word}
  #mk-overlay .op-arb{font-family:var(--mono,monospace);font-size:11px;color:var(--rojo,#f6465d);background:rgba(246,70,93,.09);border:1px solid rgba(246,70,93,.3);border-radius:10px;padding:9px 11px;margin-bottom:9px;width:100%}
  #mk-overlay .op-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:13px}
  #mk-overlay .op-b{flex:1;min-width:150px;min-height:44px;padding:12px 10px;border-radius:11px;font-family:var(--display,sans-serif);font-weight:800;font-size:12.5px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 3px 0 #8f6a1a}
  #mk-overlay .op-b:active{transform:translateY(2px);box-shadow:0 1px 0 #8f6a1a}
  #mk-overlay .op-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#b7bdc6;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  .mk-wiz-acts .mk-b.peligro{background:linear-gradient(180deg,#f08a95,#e35d6a 45%,#b8323f);border-color:#d14a58;color:#fff;box-shadow:0 4px 0 #8c2531;text-shadow:0 1px 0 rgba(0,0,0,.3)}
  @media(max-width:560px){#mk-overlay .op-b{min-width:100%}}
  /* ── Tarjetas en cuadrícula ── */
  #mk-overlay .tj-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
  #mk-overlay .tj{position:relative;border-radius:18px;padding:16px 15px 15px;display:flex;flex-direction:column;gap:0;overflow:hidden;
    background:linear-gradient(158deg,#1c222c 0%,#141922 45%,#0c1017 100%);
    border:1px solid #2b3139;
    box-shadow:0 6px 0 rgba(0,0,0,.35),0 12px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.06)}
  /* brillo diagonal sutil */
  #mk-overlay .tj::before{content:'';position:absolute;top:-40%;right:-30%;width:120%;height:90%;pointer-events:none;
    background:radial-gradient(ellipse at top right,rgba(232,184,75,.13),transparent 62%)}
  #mk-overlay .tj.compra::before{background:radial-gradient(ellipse at top right,rgba(52,217,123,.15),transparent 62%)}
  /* franja de color arriba */
  #mk-overlay .tj::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,transparent,var(--gold,#E8B84B),transparent);opacity:.55}
  #mk-overlay .tj.compra::after{background:linear-gradient(90deg,transparent,#34d97b,transparent)}

  #mk-overlay .tj-cab{display:flex;align-items:center;gap:10px;position:relative;z-index:1}
  #mk-overlay .tj-moneda{width:34px;height:34px;flex:0 0 auto;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#0b0e12;border:1px solid #2b3139;box-shadow:0 2px 6px rgba(0,0,0,.5)}
  #mk-overlay .tj-q{min-width:0;flex:1;overflow:hidden}
  #mk-overlay .tj-nom{font-family:var(--display,sans-serif);font-weight:700;font-size:13.5px;color:#eaecef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center;gap:5px}
  #mk-overlay .tj-ok{color:#4d9fff;font-size:10px;flex:0 0 auto}
  #mk-overlay .tj-red{font-family:var(--mono,monospace);font-size:9px;color:#6b7681;letter-spacing:.5px;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mk-overlay .tj-tag{flex:0 0 auto;font-family:var(--display,sans-serif);font-weight:800;font-size:9.5px;padding:5px 10px;border-radius:8px;white-space:nowrap;letter-spacing:.3px;box-shadow:0 2px 6px rgba(0,0,0,.5)}
  #mk-overlay .tj-tag.v{background:linear-gradient(180deg,#e35d6a,#b8323f);color:#fff;border:1px solid #d14a58}
  #mk-overlay .tj-tag.c{background:linear-gradient(180deg,#4fd992,#1f9e5f);color:#042415;border:1px solid #34b877}

  #mk-overlay .tj-cifra{display:flex;align-items:baseline;gap:5px;margin-top:13px;position:relative;z-index:1}
  #mk-overlay .tj-cifra{flex-wrap:wrap}
  #mk-overlay .tj-cifra b{font-family:var(--display,sans-serif);font-weight:800;font-size:clamp(19px,6.4vw,27px);color:var(--gold,#E8B84B);line-height:1;text-shadow:0 2px 5px rgba(0,0,0,.6)}
  #mk-overlay .tj.compra .tj-cifra b{color:#5fe3a1}
  #mk-overlay .tj-cifra span{font-family:var(--mono,monospace);font-size:11px;color:#8b96a3}
  #mk-overlay .tj-tasa{font-family:var(--mono,monospace);font-size:12px;color:#b7bdc6;margin-top:5px;position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mk-overlay .tj-tasa b{color:#eaecef;font-size:13px}
  #mk-overlay .tj-total{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-top:2px;position:relative;z-index:1}
  #mk-overlay .tj-total b{color:var(--gold-soft,#C9A84B)}
  #mk-overlay .tj-otras{font-family:var(--mono,monospace);font-size:9.5px;color:#6b7681;margin-top:5px;position:relative;z-index:1}
  #mk-overlay .tj-otras b{color:#9aa4b0}
  #mk-overlay .tj-pie{display:flex;gap:9px;align-items:center;margin:11px 0 12px;padding-top:10px;border-top:1px solid rgba(255,255,255,.06);font-family:var(--mono,monospace);font-size:10px;color:#7d8794;position:relative;z-index:1;min-height:12px}
  #mk-overlay .tj-pie .st{color:var(--gold,#E8B84B)}
  #mk-overlay .tj-pie .nuevo{color:#6b7681;border:1px solid #2b3139;border-radius:6px;padding:2px 7px}
  #mk-overlay .tj-btn{width:100%;margin-top:auto;min-height:44px;padding:12px;border-radius:11px;font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a,0 6px 14px rgba(0,0,0,.35);text-shadow:0 1px 0 rgba(255,255,255,.3);position:relative;z-index:1}
  #mk-overlay .tj-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #8f6a1a}
  #mk-overlay .tj-btn.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:var(--gold,#E8B84B);box-shadow:0 4px 0 rgba(0,0,0,.4);text-shadow:none}
  #mk-overlay .tj.compra .tj-btn{border-color:#34b877;background:linear-gradient(180deg,#8ff0bd,#34d97b 45%,#1f9e5f);color:#042415;box-shadow:0 4px 0 #158043,0 6px 14px rgba(0,0,0,.35)}
  /* Esqueletos mientras carga */
  #mk-overlay .tj-sk{height:150px;border-radius:16px;border:1px solid #2b3139;background:linear-gradient(90deg,rgba(255,255,255,.03) 25%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 75%);background-size:220% 100%;animation:tjSk 1.1s ease-in-out infinite}
  @keyframes tjSk{0%{background-position:120% 0}100%{background-position:-120% 0}}
  /* Ficha */
  #mk-overlay .fc-h,.mk-wiz-c .fc-h{display:flex;align-items:center;gap:13px;padding-bottom:14px;margin-bottom:14px;border-bottom:1px solid #2b3139;padding-right:38px}
  .mk-wiz-c .fc-nom{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:#eaecef}
  .mk-wiz-c .fc-sub{font-family:var(--mono,monospace);font-size:11px;color:#7d8794;margin-top:3px}
  .mk-wiz-c .fc-hero{text-align:center;padding:15px;border-radius:14px;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid #2b3139;margin-bottom:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}
  .mk-wiz-c .fc-hero span{display:block;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:1px}
  .mk-wiz-c .fc-hero b{display:block;font-family:var(--display,sans-serif);font-weight:800;font-size:27px;color:var(--gold,#E8B84B);margin-top:4px}
  .mk-wiz-c .fc-hero i{display:block;font-style:normal;font-family:var(--mono,monospace);font-size:9.5px;color:#6b7681;letter-spacing:.5px;margin-top:5px}
  .mk-wiz-c .fc-reser{margin-top:14px;padding:14px 15px;border-radius:12px;background:rgba(46,232,106,.09);border:1px solid rgba(46,232,106,.4);font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.6;text-align:center}
  .mk-wiz-c .fc-reser b{display:block;color:var(--neon-lit,#2ee86a);font-family:var(--display,sans-serif);font-size:15px;margin-bottom:5px}
  .mk-wiz-c .fc-reser b:not(:first-child){display:inline;font-size:inherit;color:var(--gold,#E8B84B);margin:0}
  .mk-wiz-c .fc-sec{margin-bottom:16px}
  .mk-wiz-c .fc-t{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  .mk-wiz-c .fc-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px}
  .mk-wiz-c .fc-chip{font-family:var(--mono,monospace);font-size:11px;color:#b7bdc6;background:rgba(255,255,255,.04);border:1px solid #2b3139;border-radius:8px;padding:6px 10px}
  .mk-wiz-c .fc-chip.oro{color:var(--gold,#E8B84B);background:rgba(232,184,75,.1);border-color:rgba(232,184,75,.3)}
  .mk-wiz-c .fc-chip.oro b{color:#eaecef}
  .mk-wiz-c .fc-pasos{display:flex;flex-direction:column;gap:7px}
  .mk-wiz-c .fc-p{display:flex;gap:10px;align-items:flex-start;font-family:var(--sans,sans-serif);font-size:12.5px;color:#8b96a3;line-height:1.5;background:rgba(255,255,255,.02);border:1px solid #2b3139;border-radius:10px;padding:10px 12px}
  .mk-wiz-c .fc-p b{color:var(--gold-soft,#C9A84B)}
  .mk-wiz-c .fc-p span{flex:0 0 auto;width:20px;height:20px;border-radius:6px;display:grid;place-items:center;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:11px}
  .mk-wiz-c .fc-cts{display:flex;flex-direction:column;gap:7px}
  .mk-wiz-c .fc-ct{display:flex;align-items:center;gap:10px;font-family:var(--mono,monospace);font-size:13px;color:#eaecef;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid #3a424c;border-radius:11px;padding:11px 13px}
  .mk-wiz-c .fc-ct .ic{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:rgba(232,184,75,.13);color:var(--gold,#E8B84B);font-size:13px}
  /* Aviso bonito (sustituye al texto blanco suelto) */
  #mk-overlay .mk-msg,.mk-wiz-c .mk-msg{font-family:var(--sans,sans-serif);font-size:12.5px;line-height:1.5;margin-top:12px;text-align:left;min-height:0;padding:0;border-radius:11px;transition:padding .15s}
  #mk-overlay .mk-msg:empty,.mk-wiz-c .mk-msg:empty{display:none}
  #mk-overlay .mk-msg.err,.mk-wiz-c .mk-msg.err{color:#ffd9dd;background:rgba(246,70,93,.14);border:1px solid rgba(246,70,93,.42);padding:11px 13px}
  #mk-overlay .mk-msg.ok,.mk-wiz-c .mk-msg.ok{color:#c9ffdc;background:rgba(46,232,106,.12);border:1px solid rgba(46,232,106,.42);padding:11px 13px}
  #mk-overlay .mk-msg.info,.mk-wiz-c .mk-msg.info{color:#cfd6de;background:rgba(255,255,255,.05);border:1px solid #3a424c;padding:11px 13px}
  @media(max-width:560px){
    #mk-overlay .tj-grid{grid-template-columns:1fr 1fr;gap:9px}
    #mk-overlay .tj{padding:13px 11px 12px;gap:8px}
    #mk-overlay .tj-tag{font-size:8.5px;padding:4px 7px;right:8px;top:8px}
    #mk-overlay .tj-top{margin-top:24px}
    #mk-overlay .tj-moneda{width:30px;height:30px}
    #mk-overlay .tj-nom{font-size:12.5px}
    #mk-overlay .tj-btn{font-size:11.5px;padding:10px 4px}
    #mk-overlay .tj-ava{width:30px;height:30px;font-size:13px}
  }
  /* ── Asistente de venta ── */
  .mk-wiz-bg{position:fixed;inset:0;z-index:9550;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,5,8,.85);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  .mk-wiz-c{width:100%;max-width:460px;max-height:90vh;overflow:auto;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:22px;box-shadow:0 34px 100px rgba(0,0,0,.75);position:relative;animation:mkIn .18s ease both}
  .mk-wiz-x{position:absolute;top:14px;right:14px;width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer;font-size:14px;display:grid;place-items:center}
  .mk-wiz-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;padding-right:38px}
  .mk-wiz-pasos{display:flex;gap:5px}
  .mk-wiz-d{width:26px;height:5px;border-radius:3px;background:#2b3139}
  .mk-wiz-d.ok{background:var(--gold-soft,#C9A84B)}
  .mk-wiz-d.now{background:linear-gradient(90deg,#f7db8d,var(--gold,#E8B84B));box-shadow:0 0 8px rgba(232,184,75,.5)}
  .mk-wiz-n{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.7px;white-space:nowrap}
  .mk-wiz-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;color:var(--gold,#E8B84B);line-height:1.25;margin-bottom:7px}
  .mk-wiz-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6;margin-bottom:16px}
  .mk-wiz-s b{color:var(--gold-soft,#C9A84B)}
  .mk-wiz-b label{display:block;font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;text-transform:uppercase;letter-spacing:.6px;margin:14px 0 6px}
  .mk-wiz-b label b{color:var(--gold,#E8B84B)}
  .mk-wiz-b input{width:100%;box-sizing:border-box;background:#0b0e12;border:1px solid #2b3139;border-radius:10px;color:#eaecef;font-family:var(--mono,monospace);font-size:15px;padding:13px}
  .mk-wiz-b input:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  .wz-ops{display:grid;grid-template-columns:1fr;gap:8px}
  .wz-ops.chicas{grid-template-columns:1fr 1fr}
  .wz-op{text-align:left;padding:13px 15px;border-radius:12px;border:1px solid #2b3139;background:linear-gradient(180deg,#1b2027,#0d1117);cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35);transition:filter .12s}
  .wz-op:hover{filter:brightness(1.15)}
  .wz-op b{display:block;font-family:var(--display,sans-serif);font-weight:800;font-size:15px;color:#eaecef}
  .wz-op span{display:block;font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-top:2px}
  .wz-op.on{border-color:#c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);box-shadow:0 3px 0 #8f6a1a}
  .wz-op.on b{color:#3a2800} .wz-op.on span{color:#6a4d10}
  .mk-wiz-acts{display:flex;gap:9px;margin-top:20px}
  .mk-wiz-acts .mk-b{flex:1;min-width:0;padding:13px;border-radius:11px;font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a}
  .mk-wiz-acts .mk-b.gris{flex:0 0 34%;background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:var(--gold,#E8B84B);box-shadow:0 4px 0 rgba(0,0,0,.4)}
  .mk-wiz-acts .mk-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8f6a1a}
  .mk-wiz-acts .mk-b:disabled{opacity:.5;cursor:not-allowed}
  .mk-wiz-c .mk-step-in{display:flex;gap:7px}
  .mk-wiz-c .mk-step-in input{flex:1;min-width:0;text-align:center;font-size:18px;font-weight:700}
  .mk-wiz-c .mk-mm{flex:0 0 auto;width:50px;border-radius:10px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-size:21px;font-weight:800;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  .mk-wiz-c .mk-sel{position:relative}
  .mk-wiz-c .mk-sel select{width:100%;box-sizing:border-box;-webkit-appearance:none;-moz-appearance:none;appearance:none;background:#0b0e12;border:1px solid #2b3139;border-radius:10px;color:#eaecef;font-family:var(--mono,monospace);font-size:14px;padding:13px;padding-right:44px;cursor:pointer}
  .mk-wiz-c .mk-sel select:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  .mk-wiz-c .mk-sel::after{content:'';position:absolute;right:16px;top:50%;width:8px;height:8px;border-right:2px solid var(--gold,#E8B84B);border-bottom:2px solid var(--gold,#E8B84B);transform:translateY(-70%) rotate(45deg);pointer-events:none}
  .mk-wiz-c .mk-sel::before{content:'';position:absolute;right:6px;top:6px;bottom:6px;width:32px;border-left:1px solid #2b3139;pointer-events:none}
  .mk-wiz-c .mk-hint{font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;line-height:1.55;margin-top:8px}
  .mk-wiz-c .mk-hint b{color:var(--gold-soft,#C9A84B)}
  .mk-wiz-c .mk-rp{padding:5px 10px;border-radius:7px;border:1px solid #3a424c;background:rgba(255,255,255,.05);color:var(--gold,#E8B84B);font-family:var(--mono,monospace);font-size:11px;cursor:pointer;margin-left:6px}
  .mk-wiz-c .wz-resumen{margin-top:14px;padding:13px 15px;border-radius:12px;background:rgba(232,184,75,.07);border:1px solid rgba(232,184,75,.3);font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.6}
  .mk-wiz-c .wz-resumen b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-lanza{text-align:center}
  #mk-overlay .mk-lanza .lz-t{font-family:var(--display,sans-serif);font-weight:800;font-size:18px;color:var(--gold,#E8B84B);margin-bottom:6px}
  #mk-overlay .mk-lanza .lz-d{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6;margin-bottom:15px}
  @media(max-width:560px){
    .mk-wiz-bg{padding:0;align-items:flex-end}
    .mk-wiz-c{max-width:100%;max-height:94vh;border-radius:20px 20px 0 0;padding:20px 16px}
    .mk-wiz-t{font-size:19px}
    .wz-op b{font-size:14px}
  }
  .mk-dlg-bg{position:fixed;inset:0;z-index:9600;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(3,5,8,.82);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
  .mk-dlg{width:100%;max-width:430px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:18px;padding:22px;box-shadow:0 30px 90px rgba(0,0,0,.7);animation:mkIn .18s ease both}
  .mk-dlg-t{font-family:var(--display,sans-serif);font-weight:800;font-size:18px;color:var(--gold,#E8B84B);margin-bottom:11px}
  .mk-dlg-d{font-family:var(--sans,sans-serif);font-size:13.5px;color:#b7bdc6;line-height:1.65}
  .mk-dlg-d b{color:var(--gold,#E8B84B)}
  .mk-dlg-b{display:flex;gap:9px;margin-top:18px}
  .mk-dlg-b .mk-b{flex:1;min-width:0;padding:12px;border-radius:11px;font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 3px 0 #8f6a1a}
  .mk-dlg-b .mk-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:var(--gold,#E8B84B);box-shadow:0 3px 0 rgba(0,0,0,.4)}
  #mk-overlay .mk-mapa{margin-top:10px;border-radius:12px;overflow:hidden;border:1px solid #2b3139;background:#0b0e12}
  #mk-overlay .mk-mapa-top{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;font-family:var(--mono,monospace);font-size:11px;color:#7d8794;text-transform:uppercase;letter-spacing:.6px}
  #mk-overlay .mk-mapa-top b{font-family:var(--display,sans-serif);font-size:18px;color:#7fb0ff;letter-spacing:0}
  #mk-overlay .mk-iframe{width:100%;height:190px;border:none;display:block;filter:grayscale(.35) brightness(.85) contrast(1.05)}
  #mk-overlay .mk-mapa-pie{padding:9px 13px;font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;display:flex;justify-content:space-between;gap:9px;flex-wrap:wrap}
  #mk-overlay .mk-mapa-pie a{color:#7fb0ff;text-decoration:none}
  #mk-overlay .mk-aviso{font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.6;padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.06);border:1px solid rgba(232,184,75,.28);margin-top:10px}
  #mk-overlay .mk-aviso b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-escala{margin-top:12px;padding:13px;border-radius:12px;background:#0b0e12;border:1px solid #2b3139}
  #mk-overlay .mk-escala-t{display:flex;justify-content:space-between;font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-bottom:8px}
  #mk-overlay .mk-escala-t b{color:var(--gold,#E8B84B)}
  #mk-overlay .mk-escala-bar{display:flex;gap:4px}
  #mk-overlay .mk-escala-p{flex:1;height:34px;border-radius:7px;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid #3a424c;display:grid;place-items:center;font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);font-weight:700}
  #mk-overlay .mk-paso{display:flex;gap:10px;padding:11px 12px;border-radius:11px;background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid #2b3139;margin-bottom:7px}
  #mk-overlay .mk-paso .n{flex:0 0 auto;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-family:var(--display,sans-serif);font-weight:800;font-size:12px;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800;box-shadow:0 2px 0 #8f6a1a}
  #mk-overlay .mk-paso .t b{font-family:var(--display,sans-serif);color:#eaecef;font-size:13.5px;display:block;margin-bottom:2px}
  #mk-overlay .mk-paso .t span{font-family:var(--sans,sans-serif);font-size:12.5px;color:#8b96a3;line-height:1.55}
  #mk-overlay .mk-paso .t span em{color:var(--gold,#E8B84B);font-style:normal;font-weight:600}
  @media(max-width:560px){
    #mk-overlay{padding:0}
    #mk-overlay .mk-card{max-width:100%;max-height:100vh;height:100vh;border-radius:0;border:none;padding:18px 14px}
    #mk-overlay .mk-title{font-size:20px}
    #mk-overlay .mk-2{grid-template-columns:1fr}
    #mk-overlay .mk-b{min-width:100%}
    #mk-overlay .mk-tab{font-size:11px;padding:11px 10px;min-height:44px}
    #mk-overlay .tx-l{display:none} #mk-overlay .tx-s{display:inline}
    #mk-overlay label{font-size:9.5px;letter-spacing:.4px}
    #mk-overlay .mk-cs{padding:8px 11px;font-size:11px}
    #mk-overlay .mk-mm{width:42px;font-size:18px}
    #mk-overlay .mk-hint{font-size:11px}
    #mk-overlay .mk-chip{font-size:10px;padding:4px 8px}
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
  if (s.includes('transfer amount exceeds balance') || s.includes('exceeds balance')) return 'No tienes suficiente saldo de ese token en tu wallet.';
  if (s.includes('comisioninsuficiente')) return 'Falta BNB para la comisión. Necesitas aprox. 0.002 BNB.';
  if (s.includes('tokennopermitido')) return 'Ese token todavía no está habilitado.';
  if (s.includes('tramosinvalidos')) return 'Las partes deben estar entre 2 y 10.';
  if (s.includes('textolargo')) return 'Algún texto es demasiado largo. Marca menos opciones.';
  if (s.includes('exceeds allowance') || s.includes('allowance')) return 'Falta aprobar el token. Intenta de nuevo.';
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
    <div class="mk-sub"><span class="tx-l">Compra y vende con caja fuerte</span><span class="tx-s">Compra y vende</span></div>
  </div>
  <div class="mk-tabs">
    <button class="mk-tab on" id="mk-t1">Ofertas</button>
    <button class="mk-tab" id="mk-t2">Vender</button>
    <button class="mk-tab" id="mk-t5">Comprar</button>
    <button class="mk-tab" id="mk-t3"><span class="tx-l">Operaciones</span><span class="tx-s">Ops</span></button>
    <button class="mk-tab" id="mk-t4"><span class="tx-l">Cómo funciona</span><span class="tx-s">Guía</span></button>
  </div>
  <div class="mk-pane on" id="mk-p1"><div class="mk-vacio">Cargando ofertas…</div></div>
  <div class="mk-pane" id="mk-p2"></div>
  <div class="mk-pane" id="mk-p5"></div>
  <div class="mk-pane" id="mk-p3"></div>
  <div class="mk-pane" id="mk-p6"></div>
  <div class="mk-pane" id="mk-p4">${comoFunciona()}</div>
  <div class="mk-msg info" id="mk-msg"></div>
  `;
  $('mk-x').onclick = cerrar;

  const tabs = [['mk-t1', 'mk-p1'], ['mk-t2', 'mk-p2'], ['mk-t5', 'mk-p5'], ['mk-t3', 'mk-p3'], ['mk-t4', 'mk-p4'], ['mk-t6', 'mk-p6']];
  tabs.forEach(([t, p], i) => {
    const btn = $(t);
    if (!btn) return;                      // la de Disputas solo existe para el owner
    btn.onclick = () => {
      tabs.forEach(([tt, pp], j) => {
        const b2 = $(tt), p2 = $(pp);
        if (b2) b2.classList.toggle('on', i === j);
        if (p2) p2.classList.toggle('on', i === j);
      });
      $('mk-card').scrollTop = 0; msg('');
      if (i === 0) listarOfertas();
      if (i === 1) panelVender();
      if (i === 2) panelComprar();
      if (i === 3) panelMisOps();
      if (i === 4) { const b = $('mk-ir-vender'); if (b) b.onclick = () => $('mk-t2').click(); }
      if (i === 5) panelDisputas();
    };
  });
  listarOfertas();
  // Pestaña de Disputas: solo para el owner
  (async () => {
    try {
      const cuenta = wallet.cuentaActual && wallet.cuentaActual();
      if (!cuenta) return;
      const dueno = await lee('owner');
      if (String(dueno).toLowerCase() !== String(cuenta).toLowerCase()) return;
      const cont = document.querySelector('#mk-overlay .mk-tabs');
      if (!cont || $('mk-t6')) return;
      const b = document.createElement('button');
      b.className = 'mk-tab'; b.id = 'mk-t6';
      b.innerHTML = `Disputas <span class="mk-badge" id="mk-nd" style="display:none">0</span>`;
      cont.appendChild(b);
      b.onclick = () => {
        document.querySelectorAll('#mk-overlay .mk-tab').forEach(x => x.classList.remove('on'));
        document.querySelectorAll('#mk-overlay .mk-pane').forEach(x => x.classList.remove('on'));
        b.classList.add('on'); $('mk-p6').classList.add('on'); $('mk-card').scrollTop = 0; msg('');
        panelDisputas();
      };
      contarDisputas();
    } catch (_) {}
  })();
}

/* ── Disputas (solo owner) ── */
async function buscarDisputas() {
  const total = Number(await lee('totalOrdenes'));
  const ids = []; for (let i = total; i >= 1; i--) ids.push(i);
  const ords = await Promise.all(ids.map(i => lee('ordenes', [i]).catch(() => null)));
  return ords.filter(o => o && Number(o.estado) === 4);
}
async function contarDisputas() {
  const el = $('mk-nd'); if (!el) return;
  el.style.display = 'none';                       // por defecto oculto
  try {
    const d = await buscarDisputas();
    if (d && d.length > 0) { el.textContent = String(d.length); el.style.display = 'inline-grid'; }
  } catch (_) { el.style.display = 'none'; }
}
async function panelDisputas() {
  const box = $('mk-p6'); if (!box) return;
  box.innerHTML = `<div class="tj-grid">${'<div class="tj-sk"></div>'.repeat(2)}</div>`;
  try {
    const ds = await buscarDisputas();
    if (ds.length === 0) { box.innerHTML = `<div class="mk-vacio">No hay disputas pendientes.<br>Todo tranquilo.</div>`; return; }
    const conNom = await Promise.all(ds.map(async (o) => {
      const [pv, pc] = await Promise.all([
        lee('perfiles', [o.vendedor]).catch(() => null),
        o.comprador && o.comprador !== '0x0000000000000000000000000000000000000000' ? lee('perfiles', [o.comprador]).catch(() => null) : null
      ]);
      return { o, pv, pc };
    }));
    box.innerHTML = `<div class="op-nota">Revisa el motivo y los comprobantes que te enviaron por el contacto antes de decidir. Si no resuelves en 48 horas, el sistema devuelve la cripto al vendedor solo.</div>` +
      conNom.map(({ o, pv, pc }) => {
        const sim = simbolo(o.token), monto = f18(o.monto), tramos = Number(o.tramos) || 1;
        return `<div class="op-card dis">
          <div class="op-cab"><span class="op-id">#${o.id}</span><span class="op-rol">${num(monto, 2)} ${sim} · ${Number(o.tramosHechos)}/${tramos} partes</span><span class="op-est dis">Disputa</span></div>
          <div class="op-exp"><b>Vendedor:</b> ${esc((pv && pv.nombre) || '—')} · ${esc((pv && pv.contacto) || 'sin contacto')}</div>
          <div class="op-exp"><b>Comprador:</b> ${esc((pc && pc.nombre) || '—')} · ${esc((pc && pc.contacto) || 'sin contacto')}</div>
          ${o.motivo ? `<div class="op-motivo"><span>Lo que dice quien abrió la disputa:</span>${esc(o.motivo)}</div>` : '<div class="mk-hint">No dejó explicación.</div>'}
          <div class="op-acts">
            <button class="op-b" data-res1="${o.id}">Razón al COMPRADOR</button>
            <button class="op-b gris" data-res0="${o.id}">Razón al VENDEDOR</button>
            <button class="op-b gris" data-anu="${o.id}">Anular · devolver todo</button>
          </div></div>`;
      }).join('');
    wireOps();
  } catch (e) { box.innerHTML = `<div class="mk-vacio">No se pudo cargar.</div>`; }
}

/* ── Cómo funciona ── */
function comoFunciona() {
  const pasos = [
    ['También puedes publicar que compras', 'Si no encuentras lo que buscas, ve a <em>Comprar</em> y publica tu anuncio: dices cuánto quieres y a cómo lo pagas, y los vendedores te escriben a ti. Sale en verde con la etiqueta <em>Compro</em>. No trabas cripto ni necesitas fianza.'],
    ['¿Qué es esto?', 'Un lugar para <em>vender y comprar cripto entre personas</em>, sin que ninguna tenga que confiar a ciegas en la otra. La plataforma no toca tu dinero: solo lo guarda en una caja fuerte automática mientras hacen el trato.'],
    ['El problema de siempre', 'En los grupos, la pelea es <em>¿quién manda primero?</em> Si mandas tú, te pueden dejar embarcado. Si manda el otro, igual. Aquí eso se acaba.'],
    ['La caja fuerte', 'El vendedor mete su cripto en el contrato. <em>Ya no la tiene él</em>, y tampoco la tenemos nosotros. El comprador lo ve con sus propios ojos y paga tranquilo.'],
    ['La entrega por partes', 'El dinero <em>no se entrega de golpe</em>. Si vendes 500 en 5 partes, van saliendo de 100 en 100. Recibes tu pago, confirmas, y sale la siguiente parte.'],
    ['La fianza del vendedor', 'Para vender hay que dejar una fianza. <em>Ese dinero es tuyo</em> y lo retiras cuando quieras. Solo sirve para responderle al comprador si un árbitro determina que hubo estafa.'],
    ['La reputación', 'Al terminar, ambos se califican con estrellas. Ese historial queda <em>en la blockchain, y nadie lo puede borrar ni falsificar</em>. Mira siempre las estrellas y las ventas antes de tratar con alguien.'],
    ['Si algo sale mal', 'Cualquiera puede abrir una disputa. Un árbitro revisa los comprobantes y decide. Como el dinero está trabado, <em>nadie puede desaparecer con él</em>.'],
    ['La distancia', 'Puedes ver a cuántos kilómetros está la otra persona. Al estafador esto <em>no le gusta nada</em>. Y si viven cerca, quizás puedan hacer el trato en persona.']
  ];
  return `
  <div class="mk-box"><div class="bt">Consejo de oro</div>
    <div style="font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6;line-height:1.65">
      Divide siempre tu venta en <b style="color:#E8B84B">la mayor cantidad de partes posible</b>. Es la mejor defensa que existe aquí, y es gratis.
    </div>
  </div>
  ${pasos.map((p, i) => `<div class="mk-paso"><span class="n">${i + 1}</span><span class="t"><b>${p[0]}</b><span>${p[1]}</span></span></div>`).join('')}
  <button class="mk-b" id="mk-ir-vender" style="margin-top:14px">Quiero vender</button>`;
}

/* ── Ofertas ── */
async function listarOfertas() {
  const box = $('mk-p1'); if (!box) return;
  box.innerHTML = `<div class="tj-grid">${'<div class="tj-sk"></div>'.repeat(4)}</div>`;
  try {
    const total = Number(await lee('totalOrdenes'));
    if (total === 0) { box.innerHTML = `<div class="mk-vacio">Todavía no hay ofertas publicadas.<br>Sé el primero: pasa a "Vender".</div>`; return; }
    const desde = total > 40 ? total - 40 : 0;
    const todos = [];
    for (let i = total; i > desde; i--) todos.push(i);
    const crudas = await Promise.all(todos.map(i => lee('ordenes', [i]).catch(() => null)));
    const ids = crudas.filter(o => o && Number(o.estado) === 0).map(o => o.id);
    if (ids.length === 0) { box.innerHTML = `<div class="mk-vacio">No hay publicaciones abiertas ahora mismo.</div>`; return; }
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
    const html = datos.filter(Boolean).map(d => tarjeta(d, cuenta)).join('');
    box.innerHTML = html ? `<div class="tj-grid">${html}</div>` : `<div class="mk-vacio">No hay publicaciones abiertas ahora mismo.</div>`;
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
  const nombre = perf && perf.nombre ? perf.nombre : 'Sin nombre';
  const mio = cuenta && String(cuenta).toLowerCase() === String(o.vendedor).toLowerCase();
  const compra = Number(o.tipo) === 1;
  const conRep = rep && Number(rep.votos) > 0;
  const ventas = rep ? Number(rep.ventasOk) : 0;

  // Precio principal + equivalente total
  const lista = String(o.moneda || '').split('·').filter(Boolean)
    .map(p => { const t = p.trim().split(/\s+/); return { m: t[0] || '', v: Number(t[1]) || 0 }; });
  const p1 = lista[0] || { m: '', v: 0 };
  const total = p1.v * monto;
  const otras = lista.slice(1);

  return `
  <div class="tj ${compra ? 'compra' : ''}" data-id="${o.id}">
    <div class="tj-cab">
      <div class="tj-moneda">${logoMoneda(o.token)}</div>
      <div class="tj-q">
        <div class="tj-nom">${esc(nombre)}${(conRep || ventas > 0) ? `<span class="tj-ok" title="Con historial">✓</span>` : ''}</div>
        <div class="tj-red">${sim} · BEP-20</div>
      </div>
      <span class="tj-tag ${compra ? 'c' : 'v'}">${compra ? 'Compro' : 'Vendo'}</span>
    </div>

    <div class="tj-cifra">
      <b>${corto(monto)}</b><span>${sim}</span>
    </div>
    ${p1.v > 0 ? `<div class="tj-tasa">a <b>${corto(p1.v)}</b> ${esc(p1.m)} c/u</div>` : ''}
    ${(p1.v > 0 && total > 0) ? `<div class="tj-total">≈ <b>${corto(total)} ${esc(p1.m)}</b> en total</div>` : ''}
    ${otras.length ? `<div class="tj-otras">También: ${otras.map(x => `<b>${num(x.v, x.v >= 100 ? 0 : 2)}</b> ${esc(x.m)}`).join(' · ')}</div>` : ''}

    <div class="tj-pie">
      ${(conRep || ventas > 0)
        ? `<div class="tj-estrellas">${conRep ? `<span class="st">${'★'.repeat(Math.round(Number(rep.estrellasX100) / 100))}${'☆'.repeat(5 - Math.round(Number(rep.estrellasX100) / 100))}</span><b>${(Number(rep.estrellasX100) / 100).toFixed(1)}</b>` : ''}${ventas > 0 ? `<span class="ops">${ventas} ${ventas === 1 ? 'venta' : 'ventas'}</span>` : ''}</div>`
        : '<span class="nuevo">Nuevo · sin historial</span>'}
    </div>

    <button class="tj-btn${mio ? ' gris' : ''}" data-ver="${o.id}">${mio ? 'Mi publicación' : (compra ? 'Quiero venderle' : 'Comprar')}</button>
  </div>`;
}

function wireTarjetas() {
  document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => verFicha(b.getAttribute('data-ver')));
}

/* ── Ficha completa (al tocar Comprar) ── */
async function verFicha(id) {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  const d = document.createElement('div');
  d.id = 'mk-ficha'; d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c"><button class="mk-wiz-x" id="fc-x">✕</button><div class="mk-vacio">Cargando…</div></div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  $('fc-x').onclick = cerrar;
  d.onclick = (e) => { if (e.target === d) cerrar(); };

  let o, perf, rep, ubic;
  try {
    o = await lee('ordenes', [id]);
    [perf, rep, ubic] = await Promise.all([
      lee('perfiles', [o.vendedor]).catch(() => null),
      lee('reputacionDe', [o.vendedor]).catch(() => null),
      lee('ubicacionDe', [o.vendedor]).catch(() => null)
    ]);
  } catch (_) { d.querySelector('.mk-wiz-c').innerHTML = `<button class="mk-wiz-x" id="fc-x2">✕</button><div class="mk-vacio">No se pudo cargar.</div>`; $('fc-x2').onclick = cerrar; return; }

  const compra = Number(o.tipo) === 1;
  const sim = simbolo(o.token);
  const monto = f18(o.monto);
  const tramos = Number(o.tramos) || 1;
  const nombre = (perf && perf.nombre) || 'Sin nombre';
  const conRep = rep && Number(rep.votos) > 0;
  const contactos = String((perf && perf.contacto) || '').split('·').map(x => x.trim()).filter(Boolean);
  const mio = cuenta && String(cuenta).toLowerCase() === String(o.vendedor).toLowerCase();
  const reservada = Number(o.estado) === 1;
  const miaReserva = reservada && cuenta && String(cuenta).toLowerCase() === String(o.comprador).toLowerCase();

  const iconoDe = (t) => {
    const l = t.toLowerCase();
    if (l.startsWith('telegram')) return ICOCT.Telegram;
    if (l.startsWith('whatsapp')) return ICOCT.WhatsApp;
    if (l.startsWith('tel')) return ICOCT['Teléfono'];
    return '•';
  };

  d.querySelector('.mk-wiz-c').innerHTML = `
    <button class="mk-wiz-x" id="fc-x3">✕</button>
    <div class="fc-h">
      <div class="tj-moneda grande">${logoMoneda(o.token)}</div>
      <div>
        <div class="fc-nom">${esc(nombre)}</div>
        ${(conRep || (rep && Number(rep.ventasOk) > 0) || (perf && perf.pais)) ? `<div class="fc-sub">${conRep ? `★ ${(Number(rep.estrellasX100) / 100).toFixed(1)} · ` : ''}${(rep && Number(rep.ventasOk) > 0) ? `${Number(rep.ventasOk)} ventas · ` : ''}${(perf && perf.pais) ? esc(perf.pais) : ''}</div>` : ''}
      </div>
    </div>

    <div class="fc-hero"><span>${compra ? 'Quiere comprar' : 'Está vendiendo'}</span><b>${num(monto, 2)} ${sim}</b><i>${sim} BEP-20 · Binance Smart Chain</i></div>

    <div class="fc-sec"><div class="fc-t">Acepta que le paguen</div>
      <div class="fc-chips">${String(o.moneda || '').split('·').filter(Boolean).map(p => {
        const t = p.trim().split(/\s+/);
        return `<span class="fc-chip oro"><b>${esc(t[1] || '')}</b> ${esc(t[0] || '')} por 1 ${sim}</span>`;
      }).join('')}</div>
      <div class="fc-chips">${String(o.metodo || '').split('·').filter(Boolean).map(p => `<span class="fc-chip">${esc(p.trim())}</span>`).join('')}</div>
    </div>

    ${compra ? '' : `<div class="fc-sec">
      <button class="fc-desp" id="fc-como">Cómo funciona esta compra <span class="ar">▼</span></button>
      <div class="fc-pasos" id="fc-pasos" style="display:none">
        <div class="fc-p"><span>1</span>Te pones en contacto con ${esc(nombre)} por donde prefiera.</div>
        <div class="fc-p"><span>2</span>Sus ${num(monto, 2)} ${sim} ya están <b>trabados aquí</b>: no puede llevárselos.</div>
        <div class="fc-p"><span>3</span>Le pagas la primera parte (${num(monto / tramos, 2)} ${sim} equivalente). Él confirma y se te libera.</div>
        <div class="fc-p"><span>4</span>Se repite hasta completar las ${tramos} partes. Si algo falla, solo arriesgas una parte.</div>
      </div></div>`}

    <div class="fc-sec"><div class="fc-t">Cómo contactarlo</div>
      ${contactos.length ? `<div class="fc-cts">${contactos.map(c => `<div class="fc-ct"><span class="ic">${iconoDe(c)}</span>${esc(c)}</div>`).join('')}</div>`
        : `<div class="mk-hint">No dejó datos de contacto.</div>`}
      ${(perf && perf.horario) ? `<div class="mk-hint">Horario: <b>${esc(perf.horario)}</b></div>` : ''}
    </div>

    <div class="fc-sec"><div class="fc-t">Dónde está</div>
      <div id="fc-dist">${(ubic && ubic.comparte) ? `<div class="mk-hint">Zona: <b>${esc(ubic.zona || 'no indicada')}</b></div><button class="mk-b gris" id="fc-vd" style="margin-top:9px">Ver distancia hasta mí</button>` : `<div class="mk-hint">Esta persona no comparte su ubicación. Puedes pedírsela por el contacto: <b>si se niega, tú decides si sigues</b>.</div>`}</div>
    </div>

    ${reservada ? `<div class="fc-reser">
        <b>${miaReserva ? 'Ya la reservaste' : 'Reservada por otra persona'}</b>
        ${miaReserva ? 'Contacta ahora a esta persona por cualquiera de las vías de arriba y acuerden el pago. Después continúa desde la pestaña <b>Operaciones</b>.' : 'Si no la arranca en 24 horas, volverá a estar disponible.'}
      </div>` : ((!compra && !mio) ? `<button class="mk-b fc-cta" id="fc-tomar">Reservar esta compra</button>
      <div class="mk-hint" style="text-align:center;margin-top:7px">Queda apartada para ti <b>24 horas</b>. Si no la arrancas, vuelve a estar disponible.</div>` : '')}
    ${mio ? `<button class="mk-b gris fc-cta" id="fc-cancel">Cancelar mi publicación</button>` : ''}
    <div class="mk-msg info" id="fc-msg"></div>`;
  $('fc-x3').onclick = cerrar;
  const como = $('fc-como');
  if (como) como.onclick = () => {
    const p = $('fc-pasos');
    const ab = p.style.display === 'none';
    p.style.display = ab ? 'flex' : 'none';
    como.classList.toggle('open', ab);
  };

  const fmsg = (t, c) => { const m = $('fc-msg'); if (m) { m.className = 'mk-msg ' + (c || 'info'); m.textContent = t; } };
  if ($('fc-vd')) $('fc-vd').onclick = () => distanciaEn('fc-dist', o.vendedor, ubic);
  if ($('fc-tomar')) $('fc-tomar').onclick = async () => {
    if (!cuenta) { fmsg('Conecta tu wallet primero.', 'err'); return; }
    // El contrato exige perfil (para que el vendedor sepa quién eres y cómo contactarte)
    let miPerf = null;
    try { miPerf = await lee('perfiles', [cuenta]); } catch (_) {}
    if (!miPerf || !miPerf.existe) { cerrar(); pedirPerfilRapido(() => verFicha(o.id)); return; }
    try {
      fmsg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.tomarOrden(o.id, ARBITRO)).wait();
      cerrar(); msg('¡Reservada para ti por 24 horas! Contacta a la persona y ve a "Operaciones".', 'ok'); listarOfertas();
    } catch (e) { fmsg(traducir(e), 'err'); }
  };
  if ($('fc-cancel')) $('fc-cancel').onclick = async () => {
    try {
      fmsg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.cancelarOrden(o.id)).wait();
      cerrar(); msg('Publicación cancelada.', 'ok'); listarOfertas();
    } catch (e) { fmsg(traducir(e), 'err'); }
  };
}

async function distanciaEn(contId, dir, u) {
  const cont = $(contId); if (!cont) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { cont.innerHTML = `<div class="mk-hint">Conecta tu wallet.</div>`; return; }
  let mia = leerUbic(cuenta);
  if (!mia) {
    try { mia = await pedirUbicacion(); guardarUbic(cuenta, mia.lat, mia.lon); }
    catch (_) { cont.innerHTML = `<div class="mk-hint">Necesitas dar permiso de ubicación para ver la distancia.</div>`; return; }
  }
  const suya = { lat: Number(u.lat1e3) / 1000, lon: Number(u.lon1e3) / 1000 };
  cont.innerHTML = mapaHTML(mia, suya, kmEntre(mia, suya), u.zona);
}

/* ── Perfil rápido (lo necesita quien reserva, para que puedan contactarlo) ── */
function pedirPerfilRapido(alTerminar) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg'; d.id = 'mk-perfrap';
  d.innerHTML = `<div class="mk-wiz-c">
    <button class="mk-wiz-x" id="pr-x">✕</button>
    <div class="mk-wiz-t">Antes de reservar</div>
    <div class="mk-wiz-s">Necesitamos saber quién eres y cómo contactarte. Se guarda una sola vez.</div>
    <div class="mk-wiz-b">
      <label>Tu nombre o alias</label><input id="pr-nom" maxlength="32" placeholder="Ej: Jesus">
      <label>Tu Telegram o WhatsApp</label><input id="pr-ct" maxlength="40" placeholder="@usuario o +53 5xxxxxxx">
    </div>
    <div class="mk-wiz-acts"><button class="mk-b" id="pr-ok">Guardar y continuar</button></div>
    <div class="mk-msg info" id="pr-msg"></div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  $('pr-x').onclick = cerrar;
  d.onclick = (e) => { if (e.target === d) cerrar(); };
  const pm = (t, c) => { const m = $('pr-msg'); if (m) { m.className = 'mk-msg ' + (c || 'info'); m.textContent = t; } };
  $('pr-ok').onclick = async () => {
    const nom = ($('pr-nom').value || '').trim();
    const ct = ($('pr-ct').value || '').trim();
    if (!nom) { pm('Pon tu nombre.', 'err'); return; }
    if (!ct) { pm('Pon una forma de contacto.', 'err'); return; }
    const via = ct.startsWith('@') ? 'Telegram' : 'WhatsApp';
    try {
      pm('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.guardarPerfil(nom, '', 'USD', `${via}: ${ct}`)).wait();
      cerrar(); if (alTerminar) alTerminar();
    } catch (e) { pm(traducir(e), 'err'); }
  };
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

  const [perf, fianza, fmin, ubic, dueno] = await Promise.all([
    lee('perfiles', [cuenta]).catch(() => null),
    lee('fianzaDe', [cuenta]).catch(() => 0n),
    lee('fianzaMinima').catch(() => 0n),
    lee('ubicacionDe', [cuenta]).catch(() => null),
    lee('owner').catch(() => null)
  ]);
  const tienePerfil = perf && perf.existe;
  const esOwner = dueno && String(dueno).toLowerCase() === String(cuenta).toLowerCase();
  const fOk = esOwner || fianza >= fmin;   // el owner está exento de fianza
  const listo = tienePerfil && fOk;

  const pasoActual = !tienePerfil ? 1 : (!fOk ? 2 : 3);
  const pasoHTML = (nro, txt, ok) =>
    `<div class="mk-wz-p ${ok ? 'ok' : (pasoActual === nro ? 'now' : '')}"><span class="n">${ok ? '✓' : nro}</span><span class="t">${txt}</span></div>`;

  box.innerHTML = `
  <div class="mk-wz">
    ${pasoHTML(1, 'Crea tu perfil', tienePerfil)}
    <div class="mk-wz-l"></div>
    ${pasoHTML(2, esOwner ? 'Fianza (no aplica)' : 'Deposita la fianza', fOk)}
    <div class="mk-wz-l"></div>
    ${pasoHTML(3, 'Publica tu oferta', false)}
  </div>
  ${listo ? '' : `<div class="mk-guia">${!tienePerfil ? 'Empieza creando tu perfil aquí abajo. Solo se hace una vez.' : 'Te falta la fianza. Deposítala aquí abajo y enseguida aparecerá el formulario para publicar tu oferta.'}</div>`}

  ${!tienePerfil ? `
  <div class="mk-box">
    <div class="bt">Paso 1 · Crea tu perfil</div>
    <div class="mk-2"><div><label>Tu nombre o alias</label><input id="mk-nom" maxlength="32" placeholder="Ej: Jesus"></div>
    <div><label>País</label><input id="mk-pais" maxlength="8" placeholder="CU"></div></div>
    <div class="mk-2"><div><label>Moneda habitual</label><select id="mk-mon">${MONEDAS.map(m => `<option>${m}</option>`).join('')}</select></div>
    <div><label>Contacto (Telegram)</label><input id="mk-cont" maxlength="64" placeholder="@usuario"></div></div>
    <button class="mk-b" id="mk-savep" style="margin-top:12px">Guardar perfil</button>
  </div>` : ''}

  ${tienePerfil && !fOk ? `
  <div class="mk-box">
    <div class="bt">Paso 2 · Deposita tu fianza</div>
    <div style="font-family:var(--mono,monospace);font-size:11.5px;color:#8b96a3;line-height:1.6;margin-bottom:10px">
      La fianza es <b style="color:#E8B84B">tuya</b> y la retiras cuando quieras. Solo respalda a tu comprador si un árbitro determina que hubo estafa.
    </div>
    <input id="mk-fianza" type="number" step="1" placeholder="${num(f18(fmin), 0)}">
    <button class="mk-b" id="mk-dep" style="margin-top:10px">Depositar fianza</button>
  </div>` : ''}

  ${listo ? `
  <div class="mk-box mk-lanza">
    <div class="lz-t">Todo listo para vender</div>
    <div class="lz-d">Unas preguntas cortas y tu oferta queda publicada.</div>
    <button class="mk-b" id="mk-abrir-wiz">Quiero vender</button>
  </div>` : ''}

`;

  if ($('mk-savep')) $('mk-savep').onclick = guardarPerfil;
  if ($('mk-dep')) $('mk-dep').onclick = depositarFianza;
  if ($('mk-abrir-wiz')) $('mk-abrir-wiz').onclick = () => abrirAsistente();
  if ($('mk-ubic-on')) $('mk-ubic-on').onclick = activarUbicacion;
  if ($('mk-ubic-off')) $('mk-ubic-off').onclick = quitarUbicacion;
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
  const cant = Number(String($('mk-cant').value || '').replace(',', '.')) || 0;
  const tramos = Number($('mk-tra').value);
  const monedas = [...document.querySelectorAll('#mk-monedas .mk-cs.on')].map(b => b.getAttribute('data-mon'));
  const metodos = [...document.querySelectorAll('#mk-metodos .mk-cs.on')].map(b => b.getAttribute('data-met'));

  if (!(cant > 0)) { msg('Escribe la cantidad que vas a vender.', 'err'); return; }
  if (monedas.length === 0) { msg('Marca al menos una moneda que aceptas.', 'err'); return; }
  if (metodos.length === 0) { msg('Marca al menos una forma de pago.', 'err'); return; }

  // Precio de cada moneda: "CUP 420 · USD 1.10"
  const partes = [];
  let primero = 0;
  for (const m of monedas) {
    const inp = document.querySelector(`.mk-precio[data-mon="${m}"]`);
    const v = Number(String((inp && inp.value) || '').replace(',', '.')) || 0;
    if (!(v > 0)) { msg(`Falta el precio para ${m}.`, 'err'); return; }
    if (primero === 0) primero = v;
    partes.push(`${m} ${v}`);
  }
  const moneda = partes.join(' · ').slice(0, 160);
  const metodo = metodos.join(' · ').slice(0, 160);

  try {
    const signer = await firmante();
    const cuenta = await signer.getAddress();
    const monto = ethers.parseUnits(String(cant), 18);
    if (monto % BigInt(tramos) !== 0n) { msg('Elige una cantidad que se divida exacta entre las partes.', 'err'); return; }
    const t = new ethers.Contract(tok, ERC20, signer);
    msg('Revisando permiso…', 'info');
    if ((await t.allowance(cuenta, MARKET)) < monto) {
      msg('Aprueba el token en tu wallet…', 'info');
      await (await t.approve(MARKET, monto)).wait();
    }
    const fee = await lee('comisionBnb');
    msg('Confirma la publicación…', 'info');
    const c = new ethers.Contract(MARKET, ABI, signer);
    await (await c.crearOrden(tok, monto, tramos, moneda, metodo, Math.round(primero * 100), { value: fee })).wait();
    msg('¡Oferta publicada! Ya la puede ver todo el mundo.', 'ok');
    setTimeout(() => { $('mk-t1').click(); listarOfertas(); }, 900);
  } catch (e) { msg(traducir(e), 'err'); }
}

/* ── Diálogo propio (para explicar antes/después de los permisos del navegador) ── */
function dialogo({ titulo, texto, ok = 'Continuar', cancelar = 'Ahora no', soloOk = false }) {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.className = 'mk-dlg-bg';
    d.innerHTML = `<div class="mk-dlg">
      <div class="mk-dlg-t">${titulo}</div>
      <div class="mk-dlg-d">${texto}</div>
      <div class="mk-dlg-b">
        ${soloOk ? '' : `<button class="mk-b gris" data-no>${cancelar}</button>`}
        <button class="mk-b" data-si>${ok}</button>
      </div>
    </div>`;
    document.body.appendChild(d);
    const cerrar = (v) => { d.remove(); res(v); };
    d.querySelector('[data-si]').onclick = () => cerrar(true);
    const no = d.querySelector('[data-no]'); if (no) no.onclick = () => cerrar(false);
    d.onclick = (e) => { if (e.target === d) cerrar(false); };
  });
}

/* ── Ubicación ── */
async function activarUbicacion() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { msg('Conecta tu wallet.', 'err'); return; }

  // 1) Explicamos ANTES, con nuestra propia ventana
  const sigue = await dialogo({
    titulo: 'Compartir tu ubicación',
    texto: `Ahora tu navegador te va a preguntar si permites la ubicación. Es una ventana suya, no nuestra.<br><br>
      Guardamos tu posición <b>redondeada a 1 km aprox.</b>: sirve para mostrar tu zona y la distancia, <b>nunca tu dirección exacta</b>.
      Puedes quitarla cuando quieras.<br><br>
      Cuando salga el aviso del navegador, toca <b>"Permitir"</b>.`,
    ok: 'Entendido, continuar'
  });
  if (!sigue) return;

  msg('Esperando el permiso del navegador…', 'info');
  let u;
  try { u = await pedirUbicacion(); }
  catch (err) {
    const motivo = String(err && err.message || '');
    if (motivo === 'sistema') {
      await dialogo({ soloOk: true, ok: 'Entendido',
        titulo: 'La ubicación está apagada en tu equipo',
        texto: `El permiso lo diste bien, pero <b>tu sistema tiene la ubicación desactivada</b>.<br><br>
          <b>En Windows:</b> Configuración → Privacidad y seguridad → Ubicación → enciéndela y permite que las aplicaciones de escritorio la usen.<br>
          <b>En Android:</b> Ajustes → Ubicación → activar.<br>
          <b>En iPhone:</b> Ajustes → Privacidad → Localización → activar.<br><br>
          Después vuelve aquí y toca otra vez "Compartir mi ubicación".` });
    } else {
      await dialogo({ soloOk: true, ok: 'Entendido',
        titulo: 'No se pudo obtener tu ubicación',
        texto: `No diste permiso, o el navegador lo tiene bloqueado para este sitio.<br><br>
          Para permitirlo: toca el <b>candado 🔒</b> al lado de la dirección web, busca <b>Ubicación</b> y ponlo en <b>Permitir</b>. Luego recarga la página.<br><br>
          Compartir tu ubicación es <b>opcional</b>: puedes seguir vendiendo sin ella, aunque genera menos confianza.` });
    }
    msg('');
    return;
  }
  guardarUbic(cuenta, u.lat, u.lon);
  // redondeo a 3 decimales (~1 km): nunca la posición exacta
  const lat = Math.round(u.lat * 1000), lon = Math.round(u.lon * 1000);
  let zona = '';
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${u.lat}&lon=${u.lon}&zoom=10`, { headers: { 'Accept-Language': 'es' } });
    const j = await r.json();
    const a = j.address || {};
    zona = [a.city || a.town || a.village || a.county || a.state, a.country].filter(Boolean).join(', ').slice(0, 40);
  } catch (_) {}
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    await (await c.compartirUbicacion(lat, lon, zona)).wait();
    msg('Ubicación compartida. Ahora genera más confianza.', 'ok'); panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

async function quitarUbicacion() {
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    await (await c.ocultarUbicacion()).wait();
    msg('Ya no compartes tu ubicación.', 'ok'); panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

/* ══════════ ASISTENTE DE VENTA (una pregunta por pantalla) ══════════ */
// Métodos de cobro. Cada uno decide qué monedas tienen sentido.
const COBROS = [
  { id: 'Transferencia', nom: 'Transferencia', desc: 'Banco, MLC, Clásica…', monedas: ['CUP', 'MLC', 'USD', 'EUR', 'MXN', 'COP'], pideDato: 'Nombre del banco o tarjeta (ej: MLC, Clásica, BPA)' },
  { id: 'Zelle',         nom: 'Zelle',         desc: 'Pago en dólares (EE. UU.)', monedas: ['USD'] },
  { id: 'PayPal',        nom: 'PayPal',        desc: 'Pago en dólares o euros', monedas: ['USD', 'EUR'] },
  { id: 'Saldo movil',   nom: 'Saldo móvil',   desc: 'Recarga al teléfono', monedas: ['CUP'] },
  { id: 'Efectivo',      nom: 'Efectivo',      desc: 'En mano, en persona', monedas: ['CUP', 'USD', 'EUR'] },
  { id: 'Otro',          nom: 'Otro',          desc: 'Tú escribes cuál', monedas: ['CUP', 'MLC', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'BRL', 'CLP', 'DOP', 'PEN', 'VES'], pideDato: '¿Cuál? Escríbelo' }
];
const NOMBRE_MONEDA = {
  CUP: 'Peso cubano', MLC: 'Moneda libremente convertible', USD: 'Dólar', EUR: 'Euro',
  MXN: 'Peso mexicano', COP: 'Peso colombiano', ARS: 'Peso argentino', BRL: 'Real brasileño',
  CLP: 'Peso chileno', DOP: 'Peso dominicano', PEN: 'Sol peruano', VES: 'Bolívar'
};

let W = null;   // datos que va armando el asistente

export function abrirAsistente() {
  W = { token: USDT, tokSel: null, sim: 'USDT', cant: 0, tramos: 5, cobros: [], datos: {}, monedas: [], precios: {}, contactos: {}, horario: '' };
  pintarPaso(1);
}
function cerrarWiz() { const e = $('mk-wiz'); if (e) e.remove(); }

function marco(paso, total, titulo, sub, cuerpo, { atras = true, seguir = 'Continuar', puedeSeguir = true } = {}) {
  cerrarWiz();
  const d = document.createElement('div');
  d.id = 'mk-wiz'; d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c">
    <button class="mk-wiz-x" id="wz-x">✕</button>
    <div class="mk-wiz-top">
      <div class="mk-wiz-pasos">${Array.from({ length: total }, (_, i) =>
        `<span class="mk-wiz-d ${i + 1 < paso ? 'ok' : (i + 1 === paso ? 'now' : '')}"></span>`).join('')}</div>
      <div class="mk-wiz-n">Paso ${paso} de ${total}</div>
    </div>
    <div class="mk-wiz-t">${titulo}</div>
    ${sub ? `<div class="mk-wiz-s">${sub}</div>` : ''}
    <div class="mk-wiz-b">${cuerpo}</div>
    <div class="mk-wiz-acts">
      ${atras ? `<button class="mk-b gris" id="wz-atras">Atrás</button>` : ''}
      <button class="mk-b" id="wz-ok" ${puedeSeguir ? '' : 'disabled'}>${seguir}</button>
    </div>
    <div class="mk-msg info" id="wz-msg"></div>
  </div>`;
  document.body.appendChild(d);
  $('wz-x').onclick = cerrarWiz;
  d.onclick = (e) => { if (e.target === d) cerrarWiz(); };
  return d;
}
function wmsg(t, c) { const m = $('wz-msg'); if (m) { m.className = 'mk-msg ' + (c || 'info'); m.textContent = t; } }

/* Paso 1 · Qué vendes */
function pintarPaso(p) {
  if (p === 1) {
    marco(1, 8, '¿Qué vas a vender?', 'Elige la moneda digital que tienes en tu wallet.',
      `<div class="wz-ops">
        <button class="wz-op ${W.tokSel === USDT ? 'on' : ''}" data-tok="${USDT}" data-sim="USDT"><b>USDT</b><span>Tether · la más usada</span></button>
        <button class="wz-op ${W.tokSel === USDC ? 'on' : ''}" data-tok="${USDC}" data-sim="USDC"><b>USDC</b><span>USD Coin</span></button>
      </div>`, { atras: false });
    document.querySelectorAll('[data-tok]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-tok]').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); W.tokSel = b.getAttribute('data-tok'); W.token = W.tokSel; W.sim = b.getAttribute('data-sim');
    });
    $('wz-ok').onclick = () => { if (!W.tokSel) { wmsg('Elige qué vas a vender.', 'err'); return; } pintarPaso(2); };
    return;
  }

  /* Paso 2 · Cuánto */
  if (p === 2) {
    marco(2, 8, `¿Cuánto ${W.sim} vas a vender?`, 'Escribe la cantidad total. Después la dividiremos en partes.',
      `<div class="mk-step-in">
        <button type="button" class="mk-mm" data-mm="-">−</button>
        <input id="wz-cant" type="text" inputmode="decimal" placeholder="0.00" value="${W.cant || ''}">
        <button type="button" class="mk-mm" data-mm="+">+</button>
      </div>
      <div class="mk-hint" id="wz-saldo">Consultando tu saldo…</div>`);
    const inp = $('wz-cant');
    document.querySelectorAll('[data-mm]').forEach(b => b.onclick = () => {
      let v = Number(String(inp.value || '').replace(',', '.')) || 0;
      v = b.getAttribute('data-mm') === '+' ? v + 10 : Math.max(0, v - 10);
      inp.value = String(Math.round(v * 100) / 100);
    });
    // saldo real, para no fallar al publicar
    (async () => {
      try {
        const cuenta = wallet.cuentaActual();
        const t = new ethers.Contract(W.token, ERC20, new ethers.JsonRpcProvider(RPCS[0], 56, { staticNetwork: true }));
        const bal = f18(await t.balanceOf(cuenta));
        W.saldo = bal;
        const el = $('wz-saldo');
        if (el) el.innerHTML = `Tienes <b>${num(bal, 2)} ${W.sim}</b> en tu wallet. <button type="button" class="mk-rp" id="wz-todo">Vender todo</button>`;
        const td = $('wz-todo'); if (td) td.onclick = () => { inp.value = String(Math.floor(bal * 100) / 100); };
      } catch (_) { const el = $('wz-saldo'); if (el) el.textContent = 'No se pudo leer tu saldo.'; }
    })();
    $('wz-ok').onclick = () => {
      const v = Number(String(inp.value || '').replace(',', '.')) || 0;
      if (!(v > 0)) { wmsg('Escribe cuánto vas a vender.', 'err'); return; }
      if (W.saldo !== undefined && v > W.saldo) { wmsg(`Solo tienes ${num(W.saldo, 2)} ${W.sim} en tu wallet.`, 'err'); return; }
      W.cant = v; pintarPaso(3);
    };
    $('wz-atras').onclick = () => pintarPaso(1);
    return;
  }

  /* Paso 3 · Partes */
  if (p === 3) {
    const ops = [10, 5, 4, 3, 2];
    marco(3, 8, 'Divide tu venta en partes',
      'Tu dinero <b>no se entrega de golpe</b>. Sale por partes: cobras una, confirmas, y se libera. Así, si alguien te intenta estafar, <b>solo alcanza una parte</b>.',
      `<div class="wz-ops chicas" id="wz-tramos">${ops.map(t =>
        `<button class="wz-op ${W.tramos === t ? 'on' : ''}" data-tr="${t}"><b>${t} partes</b><span>${t === 5 ? 'Recomendado' : (t === 10 ? 'Máxima seguridad' : (t === 2 ? 'Mínimo' : '&nbsp;'))}</span></button>`).join('')}</div>
      <div class="wz-resumen" id="wz-escala"></div>`);
    const pintar = () => {
      const por = W.cant / W.tramos;
      $('wz-escala').innerHTML = `Cada parte será de <b>${num(por, 2)} ${W.sim}</b>. Si algo saliera mal, lo máximo en riesgo es esa parte, no los ${num(W.cant, 2)}.`;
    };
    document.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-tr]').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); W.tramos = Number(b.getAttribute('data-tr')); pintar();
    });
    pintar();
    $('wz-ok').onclick = () => pintarPaso(4);
    $('wz-atras').onclick = () => pintarPaso(2);
    return;
  }

  /* Paso 4 · Cómo te pagan (el método manda) */
  if (p === 4) {
    marco(4, 8, '¿Cómo quieres que te paguen?', 'Marca todas las formas que aceptes. Puedes elegir varias.',
      `<div class="wz-ops" id="wz-cobros">${COBROS.map(c =>
        `<button class="wz-op ${W.cobros.includes(c.id) ? 'on' : ''}" data-co="${c.id}"><b>${c.nom}</b><span>${c.desc}</span></button>`).join('')}</div>
      <div id="wz-datos"></div>`);
    const pintarDatos = () => {
      const box = $('wz-datos');
      const conDato = COBROS.filter(c => W.cobros.includes(c.id) && c.pideDato);
      box.innerHTML = conDato.map(c => `<label>${c.nom}: ${c.pideDato}</label>
        <input class="wz-dato" data-co="${c.id}" maxlength="24" value="${esc(W.datos[c.id] || '')}" placeholder="${c.id === 'Transferencia' ? 'Ej: MLC, Clásica' : 'Ej: Binance Pay'}">`).join('');
      document.querySelectorAll('.wz-dato').forEach(i => i.oninput = () => { W.datos[i.getAttribute('data-co')] = i.value; });
    };
    document.querySelectorAll('[data-co]').forEach(b => b.onclick = () => {
      const id = b.getAttribute('data-co');
      b.classList.toggle('on');
      W.cobros = W.cobros.includes(id) ? W.cobros.filter(x => x !== id) : [...W.cobros, id];
      pintarDatos();
    });
    pintarDatos();
    $('wz-ok').onclick = () => {
      if (W.cobros.length === 0) { wmsg('Marca al menos una forma de pago.', 'err'); return; }
      // monedas posibles según los métodos elegidos
      const posibles = [...new Set(W.cobros.flatMap(id => (COBROS.find(c => c.id === id) || {}).monedas || []))];
      W.posibles = posibles;
      W.monedas = W.monedas.filter(m => posibles.includes(m));
      pintarPaso(5);
    };
    $('wz-atras').onclick = () => pintarPaso(3);
    return;
  }

  /* Paso 5 · En qué moneda */
  if (p === 5) {
    marco(5, 8, '¿En qué moneda te pagan?', 'Según lo que elegiste, estas son las que tienen sentido. Marca las que aceptes.',
      `<div class="wz-ops chicas" id="wz-monedas">${(W.posibles || []).map(m =>
        `<button class="wz-op ${W.monedas.includes(m) ? 'on' : ''}" data-mo="${m}"><b>${m}</b><span>${NOMBRE_MONEDA[m] || ''}</span></button>`).join('')}
        <button class="wz-op ${W.otraMon ? 'on' : ''}" id="wz-otra"><b>Otra</b><span>Escríbela tú</span></button></div>
      <div id="wz-otra-box"></div>`);
    const pintarOtra = () => {
      const b = $('wz-otra-box');
      b.innerHTML = $('wz-otra').classList.contains('on')
        ? `<label>¿Cuál moneda?</label><input id="wz-otra-in" maxlength="10" placeholder="Ej: CAD" value="${esc(W.otraMon || '')}">` : '';
      const i = $('wz-otra-in'); if (i) i.oninput = () => { W.otraMon = i.value.toUpperCase().trim(); };
    };
    $('wz-otra').onclick = () => { $('wz-otra').classList.toggle('on'); if (!$('wz-otra').classList.contains('on')) W.otraMon = ''; pintarOtra(); };
    pintarOtra();
    document.querySelectorAll('[data-mo]').forEach(b => b.onclick = () => {
      const m = b.getAttribute('data-mo');
      b.classList.toggle('on');
      W.monedas = W.monedas.includes(m) ? W.monedas.filter(x => x !== m) : [...W.monedas, m];
    });
    $('wz-ok').onclick = () => {
      if (W.otraMon && !W.monedas.includes(W.otraMon)) W.monedas = [...W.monedas.filter(m => (W.posibles || []).includes(m)), W.otraMon];
      if (W.monedas.length === 0) { wmsg('Marca al menos una moneda.', 'err'); return; }
      pintarPaso(6);
    };
    $('wz-atras').onclick = () => pintarPaso(4);
    return;
  }

  /* Paso 6 · Precio de cada moneda */
  if (p === 6) {
    marco(6, 8, '¿A cómo lo vendes?', 'Pon tu precio para cada moneda que aceptas.',
      W.monedas.map(m => `<label>¿Cuántos <b>${m}</b> por cada <b>1 ${W.sim}</b>?</label>
        <input class="wz-precio" data-mo="${m}" type="text" inputmode="decimal" placeholder="${['USD','MLC','EUR'].includes(m) ? 'Ej: 1.10' : 'Ej: 390'}" value="${W.precios[m] || ''}">
        <div class="mk-hint">${['USD','MLC','EUR'].includes(m) ? `Si lo vendes a la par pon <b>1.00</b>; si más caro, <b>1.10</b>, <b>1.20</b>…` : `Es la tasa de hoy.`}</div>`).join(''),
      );
    document.querySelectorAll('.wz-precio').forEach(i => i.oninput = () => { W.precios[i.getAttribute('data-mo')] = i.value; });
    $('wz-ok').onclick = () => {
      for (const m of W.monedas) {
        const v = Number(String(W.precios[m] || '').replace(',', '.')) || 0;
        if (!(v > 0)) { wmsg(`Falta el precio para ${m}.`, 'err'); return; }
      }
      pintarPaso(7);
    };
    $('wz-atras').onclick = () => pintarPaso(5);
    return;
  }

  /* Paso 7 · Cómo te contactan (OBLIGATORIO) */
  if (p === 7) {
    const VIAS = [
      { id: 'Telegram', lab: 'Usuario de Telegram', ph: '@tuusuario' },
      { id: 'WhatsApp', lab: 'Número de WhatsApp (opcional)', ph: '+53 5xxxxxxx' },
      { id: 'Teléfono', lab: 'Teléfono para llamadas (opcional)', ph: 'Suele ser el mismo de WhatsApp' }
    ];
    marco(7, 8, '¿Cómo quieren que te contacten?', 'Pon al menos una vía. Sin esto nadie puede cerrar el trato contigo.',
      VIAS.map(v => `<label>${v.lab}</label><input class="wz-ct" data-ct="${v.id}" maxlength="40" placeholder="${v.ph}" value="${esc(W.contactos[v.id] || '')}">`).join('') +
      `<label>¿En qué horario prefieres que te escriban? <span class="op">(opcional)</span></label>
       <div class="mk-sel wz-sel"><select id="wz-hora-sel">
         <option value="">Elige uno…</option>
         ${['A cualquier hora', 'Mañanas (9am a 1pm)', 'Tardes (1pm a 7pm)', 'Noches (7pm a 11pm)', '9am a 9pm'].map(h => `<option${W.horario === h ? ' selected' : ''}>${h}</option>`).join('')}
       </select></div>
       <input id="wz-hora" maxlength="40" placeholder="O escríbelo con tus palabras" value="${esc(W.horario || '')}" style="margin-top:8px">
       <label>Nota para quien te compre <span class="op">(opcional)</span></label>
       <input id="wz-nota" maxlength="60" placeholder="Ej: solo trato por Telegram, respondo rápido" value="${esc(W.nota || '')}">
       <div class="mk-hint">Una aclaración o sugerencia para la persona que te vaya a comprar.</div>`);
    const hs = $('wz-hora-sel'); if (hs) hs.onchange = () => { if (hs.value) { $('wz-hora').value = hs.value; W.horario = hs.value; } };
    const nt = $('wz-nota'); if (nt) nt.oninput = () => { W.nota = nt.value; };
    document.querySelectorAll('.wz-ct').forEach(i => i.oninput = () => { W.contactos[i.getAttribute('data-ct')] = i.value; });
    const h = $('wz-hora'); if (h) h.oninput = () => { W.horario = h.value; };
    $('wz-ok').onclick = () => {
      const hay = Object.values(W.contactos).filter(v => String(v || '').trim()).length;
      if (hay === 0) { wmsg('Pon al menos una forma de contacto.', 'err'); return; }
      pintarPaso(8);
    };
    $('wz-atras').onclick = () => pintarPaso(6);
    return;
  }

  /* Paso 8 · Ubicación (opcional) y publicar */
  if (p === 8) {
    marco(8, 8, 'Tu ubicación (opcional)', 'Compartirla genera confianza: quien vea tu oferta sabrá tu zona y a cuántos kilómetros está.',
      `<button class="fc-desp" id="wz-mas">¿Cómo funciona esto? <span class="ar">▼</span></button>
       <div id="wz-mas-box"></div>
       <div class="wz-ops" style="margin-top:12px">
         <button class="wz-op ${W.compartirU ? 'on' : ''}" id="wz-si-u"><b>Sí, compartir mi zona</b><span>Se guarda redondeada, sin tu dirección exacta</span></button>
         <button class="wz-op ${W.compartirU === false ? 'on' : ''}" id="wz-no-u"><b>No, ahora no</b><span>Puedes activarlo después</span></button>
       </div>`, { seguir: 'Publicar oferta' });
    $('wz-mas').onclick = () => {
      const b = $('wz-mas-box');
      $('wz-mas').classList.toggle('open', !b.innerHTML);
      b.innerHTML = b.innerHTML ? '' : `<div class="mk-hint" style="margin-top:10px">Guardamos tu posición <b>redondeada a 1 km aprox.</b>, nunca tu dirección exacta. Sirve para que la otra persona vea tu zona y la distancia. Es <b>opcional</b> y la puedes quitar cuando quieras. Quien no la comparte, suele generar más dudas.</div>`;
    };
    $('wz-si-u').onclick = () => { W.compartirU = true; $('wz-si-u').classList.add('on'); $('wz-no-u').classList.remove('on'); };
    $('wz-no-u').onclick = () => { W.compartirU = false; $('wz-no-u').classList.add('on'); $('wz-si-u').classList.remove('on'); };
    $('wz-ok').onclick = publicarWiz;
    $('wz-atras').onclick = () => pintarPaso(7);
    return;
  }
}

async function publicarWiz() {
  const moneda = W.monedas.map(m => `${m} ${Number(String(W.precios[m]).replace(',', '.'))}`).join(' · ').slice(0, 160);
  const metodo = W.cobros.map(id => {
    const d = (W.datos[id] || '').trim();
    return d ? `${id} (${d})` : id;
  }).join(' · ').slice(0, 160);
  const primero = Number(String(W.precios[W.monedas[0]]).replace(',', '.')) || 0;

  const btn = $('wz-ok'); if (btn) btn.disabled = true;
  try {
    const signer = await firmante();
    const cuenta = await signer.getAddress();
    const c0 = new ethers.Contract(MARKET, ABI, signer);

    // Guardar contactos (con su plataforma) y horario en el perfil
    const cts = Object.entries(W.contactos).filter(([, v]) => String(v || '').trim())
      .map(([k, v]) => `${k}: ${String(v).trim()}`).join(' · ').slice(0, 200);
    const p = await lee('perfiles', [cuenta]).catch(() => null);
    if (cts && (!p || p.contacto !== cts)) {
      wmsg('Guardando tus datos de contacto…', 'info');
      await (await c0.guardarPerfil(p && p.nombre ? p.nombre : 'Usuario', (p && p.pais) || '', (p && p.moneda) || W.monedas[0] || '', cts)).wait();
    }
    const hn = [W.horario, W.nota].filter(Boolean).join(' · ').slice(0, 40);
    if (hn && (!p || p.horario !== hn)) {
      try { wmsg('Guardando tus preferencias…', 'info'); await (await c0.guardarHorario(hn)).wait(); } catch (_) {}
    }
    const monto = ethers.parseUnits(String(W.cant), 18);
    if (monto % BigInt(W.tramos) !== 0n) { wmsg('Cambia un poco la cantidad: no se divide exacta entre las partes.', 'err'); btn.disabled = false; return; }

    const t = new ethers.Contract(W.token, ERC20, signer);
    const bal = await t.balanceOf(cuenta);
    if (bal < monto) { wmsg(`No te alcanza: tienes ${num(f18(bal), 2)} ${W.sim}.`, 'err'); btn.disabled = false; return; }

    wmsg('Revisando permiso del token…', 'info');
    if ((await t.allowance(cuenta, MARKET)) < monto) {
      wmsg('Aprueba el token en tu wallet…', 'info');
      await (await t.approve(MARKET, monto)).wait();
    }
    const fee = await lee('comisionBnb');
    wmsg('Confirma la publicación (1 USD en BNB)…', 'info');
    const c = new ethers.Contract(MARKET, ABI, signer);
    await (await c.crearOrden(W.token, monto, W.tramos, moneda, metodo, Math.round(primero * 100), { value: fee })).wait();
    // Ubicación, si la aceptó
    if (W.compartirU) {
      try {
        wmsg('Guardando tu zona…', 'info');
        const u = await pedirUbicacion();
        guardarUbic(cuenta, u.lat, u.lon);
        let zona = '';
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${u.lat}&lon=${u.lon}&zoom=10`, { headers: { 'Accept-Language': 'es' } });
          const j = await r.json(); const a = j.address || {};
          zona = [a.city || a.town || a.village || a.county || a.state, a.country].filter(Boolean).join(', ').slice(0, 40);
        } catch (_) {}
        await (await c0.compartirUbicacion(Math.round(u.lat * 1000), Math.round(u.lon * 1000), zona)).wait();
      } catch (_) {}
    }
    cerrarWiz();
    msg('¡Oferta publicada! Ya la puede ver todo el mundo.', 'ok');
    $('mk-t1').click(); listarOfertas();
  } catch (e) { wmsg(traducir(e), 'err'); if (btn) btn.disabled = false; }
}

/* ── Comprar: publicar un anuncio de compra ── */
async function panelComprar() {
  const box = $('mk-p5'); if (!box) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { box.innerHTML = `<div class="mk-vacio">Conecta tu wallet para publicar que quieres comprar.</div>`; return; }
  box.innerHTML = `
  <div class="mk-box mk-lanza">
    <div class="lz-t">Todo listo para comprar</div>
    <div class="lz-d">Unas preguntas cortas y tu anuncio queda publicado.</div>
    <button class="mk-b" id="mk-abrir-cwiz">Quiero comprar</button>
  </div>`;
  if ($('mk-abrir-cwiz')) $('mk-abrir-cwiz').onclick = () => abrirAsistenteCompra();
}

let C = null;
export function abrirAsistenteCompra() {
  C = { token: USDT, tokSel: null, sim: 'USDT', cant: 0, cobros: [], datos: {}, monedas: [], precios: {}, contactos: {} };
  pasoC(1);
}
function pasoC(p) {
  if (p === 1) {
    marco(1, 5, '¿Qué quieres comprar?', 'Elige la moneda digital que buscas.',
      `<div class="wz-ops">
        <button class="wz-op ${C.tokSel === USDT ? 'on' : ''}" data-ctok="${USDT}" data-csim="USDT"><b>USDT</b><span>Tether · la más usada</span></button>
        <button class="wz-op ${C.tokSel === USDC ? 'on' : ''}" data-ctok="${USDC}" data-csim="USDC"><b>USDC</b><span>USD Coin</span></button>
      </div>`, { atras: false });
    document.querySelectorAll('[data-ctok]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-ctok]').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); C.tokSel = b.getAttribute('data-ctok'); C.token = C.tokSel; C.sim = b.getAttribute('data-csim');
    });
    $('wz-ok').onclick = () => { if (!C.tokSel) { wmsg('Elige qué quieres comprar.', 'err'); return; } pasoC(2); };
    return;
  }
  if (p === 2) {
    marco(2, 5, `¿Cuánto ${C.sim} quieres comprar?`, 'La cantidad que buscas.',
      `<div class="mk-step-in">
        <button type="button" class="mk-mm" data-cmm="-">−</button>
        <input id="cz-cant" type="text" inputmode="decimal" placeholder="0.00" value="${C.cant || ''}">
        <button type="button" class="mk-mm" data-cmm="+">+</button>
      </div>`);
    const inp = $('cz-cant');
    document.querySelectorAll('[data-cmm]').forEach(b => b.onclick = () => {
      let v = Number(String(inp.value || '').replace(',', '.')) || 0;
      v = b.getAttribute('data-cmm') === '+' ? v + 10 : Math.max(0, v - 10);
      inp.value = String(Math.round(v * 100) / 100);
    });
    $('wz-ok').onclick = () => {
      const v = Number(String(inp.value || '').replace(',', '.')) || 0;
      if (!(v > 0)) { wmsg('Escribe cuánto quieres comprar.', 'err'); return; }
      C.cant = v; pasoC(3);
    };
    $('wz-atras').onclick = () => pasoC(1);
    return;
  }
  if (p === 3) {
    marco(3, 5, '¿Cómo vas a pagar?', 'Marca todas las formas con las que puedes pagar.',
      `<div class="wz-ops" id="cz-cobros">${COBROS.map(c =>
        `<button class="wz-op ${C.cobros.includes(c.id) ? 'on' : ''}" data-cco="${c.id}"><b>${c.nom}</b><span>${c.desc}</span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-cco]').forEach(b => b.onclick = () => {
      const id = b.getAttribute('data-cco'); b.classList.toggle('on');
      C.cobros = C.cobros.includes(id) ? C.cobros.filter(x => x !== id) : [...C.cobros, id];
    });
    $('wz-ok').onclick = () => {
      if (C.cobros.length === 0) { wmsg('Marca al menos una forma de pago.', 'err'); return; }
      C.posibles = [...new Set(C.cobros.flatMap(id => (COBROS.find(c => c.id === id) || {}).monedas || []))];
      C.monedas = C.monedas.filter(m => C.posibles.includes(m));
      pasoC(4);
    };
    $('wz-atras').onclick = () => pasoC(2);
    return;
  }
  if (p === 4) {
    marco(4, 5, '¿En qué moneda pagas y a cómo?', 'Marca la moneda y pon lo que estás dispuesto a pagar.',
      `<div class="wz-ops chicas" id="cz-monedas">${(C.posibles || []).map(m =>
        `<button class="wz-op ${C.monedas.includes(m) ? 'on' : ''}" data-cmo="${m}"><b>${m}</b><span>${NOMBRE_MONEDA[m] || ''}</span></button>`).join('')}
        <button class="wz-op ${C.otraMon ? 'on' : ''}" id="cz-otra"><b>Otra</b><span>Escríbela tú</span></button></div>
       <div id="cz-otra-box"></div>
       <div id="cz-precios"></div>`);
    const pintarOtraC = () => {
      const b = $('cz-otra-box');
      b.innerHTML = $('cz-otra').classList.contains('on')
        ? `<label>¿Cuál moneda?</label><input id="cz-otra-in" maxlength="10" placeholder="Ej: CAD" value="${esc(C.otraMon || '')}">` : '';
      const i = $('cz-otra-in');
      if (i) i.oninput = () => {
        const antes = C.otraMon;
        C.otraMon = i.value.toUpperCase().trim();
        C.monedas = C.monedas.filter(x => x !== antes);
        if (C.otraMon) C.monedas = [...C.monedas, C.otraMon];
        pintar();
      };
    };
    $('cz-otra').onclick = () => {
      $('cz-otra').classList.toggle('on');
      if (!$('cz-otra').classList.contains('on')) { C.monedas = C.monedas.filter(x => x !== C.otraMon); C.otraMon = ''; pintar(); }
      pintarOtraC();
    };
    const pintar = () => {
      $('cz-precios').innerHTML = C.monedas.map(m => `<label>¿Cuántos <b>${m}</b> pagas por cada <b>1 ${C.sim}</b>?</label>
        <input class="cz-precio" data-cmo="${m}" type="text" inputmode="decimal" placeholder="${['USD','MLC','EUR'].includes(m) ? 'Ej: 1.05' : 'Ej: 380'}" value="${C.precios[m] || ''}">`).join('');
      document.querySelectorAll('.cz-precio').forEach(i => i.oninput = () => { C.precios[i.getAttribute('data-cmo')] = i.value; });
    };
    document.querySelectorAll('[data-cmo]').forEach(b => b.onclick = () => {
      const m = b.getAttribute('data-cmo'); b.classList.toggle('on');
      C.monedas = C.monedas.includes(m) ? C.monedas.filter(x => x !== m) : [...C.monedas, m];
      pintar();
    });
    pintar(); pintarOtraC();
    $('wz-ok').onclick = () => {
      if (C.monedas.length === 0) { wmsg('Marca al menos una moneda.', 'err'); return; }
      for (const m of C.monedas) { if (!(Number(String(C.precios[m] || '').replace(',', '.')) > 0)) { wmsg(`Falta el precio para ${m}.`, 'err'); return; } }
      pasoC(5);
    };
    $('wz-atras').onclick = () => pasoC(3);
    return;
  }
  if (p === 5) {
    const VIAS = [{ id: 'Telegram', lab: 'Usuario de Telegram', ph: '@tuusuario' }, { id: 'WhatsApp', lab: 'WhatsApp (opcional)', ph: '+53 5xxxxxxx' }];
    marco(5, 5, '¿Cómo te contactan?', 'Para que los vendedores puedan escribirte.',
      VIAS.map(v => `<label>${v.lab}</label><input class="cz-ct" data-cct="${v.id}" maxlength="40" placeholder="${v.ph}" value="${esc(C.contactos[v.id] || '')}">`).join(''),
      { seguir: 'Publicar anuncio' });
    document.querySelectorAll('.cz-ct').forEach(i => i.oninput = () => { C.contactos[i.getAttribute('data-cct')] = i.value; });
    $('wz-ok').onclick = publicarCompra;
    $('wz-atras').onclick = () => pasoC(4);
    return;
  }
}

async function publicarCompra() {
  const hay = Object.values(C.contactos).filter(v => String(v || '').trim()).length;
  if (hay === 0) { wmsg('Pon al menos una forma de contacto.', 'err'); return; }
  const moneda = C.monedas.map(m => `${m} ${Number(String(C.precios[m]).replace(',', '.'))}`).join(' · ').slice(0, 160);
  const metodo = C.cobros.join(' · ').slice(0, 160);
  const primero = Number(String(C.precios[C.monedas[0]]).replace(',', '.')) || 0;
  const btn = $('wz-ok'); if (btn) btn.disabled = true;
  try {
    const signer = await firmante();
    const cuenta = await signer.getAddress();
    const c = new ethers.Contract(MARKET, ABI, signer);
    const cts = Object.entries(C.contactos).filter(([, v]) => String(v || '').trim()).map(([k, v]) => `${k}: ${String(v).trim()}`).join(' · ').slice(0, 200);
    const p = await lee('perfiles', [cuenta]).catch(() => null);
    if (!p || !p.existe || p.contacto !== cts) {
      wmsg('Guardando tus datos…', 'info');
      await (await c.guardarPerfil((p && p.nombre) || 'Comprador', (p && p.pais) || '', C.monedas[0] || 'USD', cts)).wait();
    }
    const fee = await lee('comisionBnb');
    wmsg('Confirma la publicación (1 USD en BNB)…', 'info');
    await (await c.crearAnuncioCompra(C.token, ethers.parseUnits(String(C.cant), 18), moneda, metodo, Math.round(primero * 100), { value: fee })).wait();
    cerrarWiz();
    msg('¡Anuncio publicado! Los vendedores ya pueden verte.', 'ok');
    $('mk-t1').click(); listarOfertas();
  } catch (e) { wmsg(traducir(e), 'err'); if (btn) btn.disabled = false; }
}

/* ── Mis operaciones ── */
async function panelMisOps() {
  const box = $('mk-p3'); if (!box) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { box.innerHTML = `<div class="mk-vacio">Conecta tu wallet para ver tus operaciones.</div>`; return; }
  box.innerHTML = `<div class="tj-grid">${'<div class="tj-sk"></div>'.repeat(2)}</div>`;
  try {
    const [ventas, compras, dueno] = await Promise.all([
      lee('misOrdenes', [cuenta]).catch(() => []),
      lee('misCompras', [cuenta]).catch(() => []),
      lee('owner').catch(() => null)
    ]);
    const esOwner = dueno && String(dueno).toLowerCase() === String(cuenta).toLowerCase();
    const ids = [...new Set([...ventas, ...compras].map(String))];
    if (ids.length === 0) {
      box.innerHTML = `<div class="mk-vacio">Todavía no tienes operaciones.<br>Publica una oferta o reserva una de otra persona.</div>`;
      return;
    }
    const ords = (await Promise.all(ids.map(async (id) => {
      const o = await lee('ordenes', [id]).catch(() => null);
      if (!o) return null;
      const otro = String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase() ? o.comprador : o.vendedor;
      let perfOtro = null;
      if (otro && otro !== '0x0000000000000000000000000000000000000000') {
        perfOtro = await lee('perfiles', [otro]).catch(() => null);
      }
      return { o, perfOtro };
    }))).filter(Boolean);
    ords.sort((a, b) => Number(b.o.id) - Number(a.o.id));

    // Agrupar: lo que necesita acción va primero
    const urg = [], curso = [], abiertas = [], fin_ = [];
    for (const d of ords) {
      const o = d.o, est = Number(o.estado);
      const soyV = String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase();
      const tocaMi = (est === 1 && ((soyV && o.tramoPagado) || (!soyV && !o.tramoPagado)))
        || (est === 2 && (soyV ? !o.califVendedor : !o.califComprador))
        || (est === 4 && esOwner);
      if (tocaMi) urg.push(d);
      else if (est === 1) curso.push(d);
      else if (est === 0) abiertas.push(d);
      else fin_.push(d);
    }
    const sec = (tit, arr, nota) => arr.length
      ? `<div class="op-sec"><div class="op-st">${tit} <span>${arr.length}</span></div>${nota ? `<div class="op-nota">${nota}</div>` : ''}${arr.map(d => opCard(d, cuenta, esOwner)).join('')}</div>` : '';
    // Cuánto tiene el contrato retenido que es tuyo
    let retenido = {};
    for (const { o } of ords) {
      const est = Number(o.estado);
      const soyV = String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase();
      if (soyV && Number(o.tipo) === 0 && (est === 0 || est === 1 || est === 4)) {
        const sim = simbolo(o.token);
        retenido[sim] = (retenido[sim] || 0) + (f18(o.monto) - f18(o.liberado));
      }
    }
    const hayRet = Object.entries(retenido).filter(([, v]) => v > 0);
    const cajaRet = hayRet.length
      ? `<div class="op-caja">
          <div class="op-caja-t">Tu dinero en la caja fuerte</div>
          <div class="op-caja-v">${hayRet.map(([k, v]) => `<span><b>${num(v, 2)}</b> ${k}</span>`).join('')}</div>
          <div class="op-caja-d">Es tuyo. Vuelve a tu wallet en cuanto canceles la publicación o termine la operación.</div>
          <button class="op-caja-b" id="op-retirar"><span class="tx-l">Retirar todos mis fondos</span><span class="tx-s">Retirar fondos</span></button>
        </div>`
      : `<div class="op-caja vacia"><div class="op-caja-t">Tu dinero en la caja fuerte</div><div class="op-caja-v"><span><b>0.00</b></span></div><div class="op-caja-d">Ahora mismo el contrato no retiene nada tuyo.</div></div>`;

    box.innerHTML = cajaRet +
      sec('Te toca a ti', urg, 'Estas operaciones están esperando algo tuyo. Atiéndelas primero.') +
      sec('En curso', curso, 'Estás esperando a la otra persona.') +
      sec('Publicadas', abiertas, 'Todavía nadie las ha tomado.') +
      sec('Terminadas', fin_, '');
    wireOps();
    const rt = $('op-retirar');
    if (rt) rt.onclick = () => confirmar({
      titulo: '¿Retirar todo lo que tienes en la caja fuerte?',
      texto: 'Se te devuelve <b>todo tu dinero</b> de una vez, incluida tu fianza.<br><br>A cambio: <b>todas tus publicaciones se cancelan al instante</b> y desaparecen del listado, igual que las reservas donde todavía nadie ha pagado.<br><br>Lo que ya esté a mitad de una operación (con un pago declarado) <b>no se toca</b>: eso hay que terminarlo o resolverlo por disputa.',
      ok: 'Sí, retirar todo', peligro: true
    }, async () => {
      try {
        msg('Confirma en tu wallet…', 'info');
        const c = new ethers.Contract(MARKET, ABI, await firmante());
        await (await c.retirarTodo()).wait();
        msg('Listo. Tus fondos volvieron a tu wallet.', 'ok');
        panelMisOps(); listarOfertas();
      } catch (e) { msg(traducir(e), 'err'); }
    });
  } catch (e) { box.innerHTML = `<div class="mk-vacio">No se pudo cargar. Revisa tu conexión.</div>`; }
}

function opCard({ o, perfOtro }, cuenta, esOwner) {
  const soyV = String(o.vendedor).toLowerCase() === String(cuenta).toLowerCase();
  const est = Number(o.estado);
  const sim = simbolo(o.token);
  const compraAnuncio = Number(o.tipo) === 1;
  const monto = f18(o.monto), tramos = Number(o.tramos) || 1, hechos = Number(o.tramosHechos);
  const porTramo = monto / tramos;
  const otroNom = (perfOtro && perfOtro.nombre) || 'la otra persona';
  const otroCt = (perfOtro && perfOtro.contacto) || '';

  // Qué está pasando y qué toca hacer, en cristiano
  let titulo = '', explica = '', acciones = '', color = '';
  if (est === 0) {
    titulo = compraAnuncio ? 'Tu anuncio de compra' : 'Tu oferta está publicada';
    explica = 'Todavía nadie la ha tomado. Puedes cancelarla y recuperar tu cripto cuando quieras.';
    acciones = `<button class="op-b gris" data-cancel2="${o.id}"><span class="tx-l">Cancelar y recuperar</span><span class="tx-s">Cancelar</span></button>`;
  } else if (est === 1) {
    color = 'act';
    if (soyV) {
      if (o.tramoPagado) {
        titulo = `${esc(otroNom)} dice que ya pagó la parte ${hechos + 1}`;
        explica = `<b>Comprueba en tu banco/Zelle que el dinero llegó de verdad.</b> Si llegó, libera esa parte y se le envían ${num(porTramo, 2)} ${sim}. Si no llegó, no liberes nada y abre una disputa.`;
        acciones = `<button class="op-b" data-lib="${o.id}"><span class="tx-l">Sí, ya me llegó · liberar ${num(porTramo, 2)} ${sim}</span><span class="tx-s">Ya me llegó · liberar</span></button>
                    <button class="op-b gris" data-canmut="${o.id}"><span class="tx-l">Cancelar pedido (de mutuo acuerdo)</span><span class="tx-s">Cancelar pedido</span></button>
                    <button class="op-b gris" data-disp="${o.id}"><span class="tx-l">No me llegó · abrir disputa</span><span class="tx-s">No llegó · disputa</span></button>`;
      } else {
        titulo = `${esc(otroNom)} reservó tu oferta`;
        const venceEn = (Number(o.tomadaEn) + 24 * 3600) * 1000;
        const vencida = Date.now() > venceEn;
        const hs = Math.max(0, Math.ceil((venceEn - Date.now()) / 3600000));
        explica = `Ahora te toca <b>contactarlo</b> y ponerte de acuerdo. Cuando te pague la parte ${hechos + 1}, él marcará el pago y tú lo confirmas aquí.` +
          (vencida ? ` <b>La reserva ya venció</b>: puedes devolver la oferta al listado.` : ` Si no arranca, en <b>${hs} h</b> podrás devolverla al listado.`);
        acciones = otroCt ? `<div class="op-ct">${esc(otroCt)}</div>` : '';
        acciones += vencida ? `<button class="op-b" data-liber="${o.id}"><span class="tx-l">Devolver mi oferta al listado</span><span class="tx-s">Devolver al listado</span></button>` : '';
        acciones += `<button class="op-b gris" data-aband="${o.id}"><span class="tx-l">Me arrepentí · cancelar pedido</span><span class="tx-s">Cancelar pedido</span></button>
                     <button class="op-b gris" data-disp="${o.id}"><span class="tx-l">Tengo un problema</span><span class="tx-s">Problema</span></button>`;
      }
    } else {
      if (o.tramoPagado) {
        titulo = 'Esperando a que confirme tu pago';
        explica = `Ya marcaste el pago de la parte ${hechos + 1}. Cuando ${esc(otroNom)} lo verifique, recibirás ${num(porTramo, 2)} ${sim} en tu wallet.`;
        acciones = `<button class="op-b gris" data-disp="${o.id}">Tengo un problema</button>`;
      } else {
        titulo = `Te toca pagar la parte ${hechos + 1}`;
        explica = `Contacta a ${esc(otroNom)}, págale lo acordado por esta parte y <b>solo entonces</b> marca abajo que ya pagaste. Recibirás ${num(porTramo, 2)} ${sim}.`;
        acciones = otroCt ? `<div class="op-ct">${esc(otroCt)}</div>` : '';
        acciones += `<button class="op-b" data-pag="${o.id}"><span class="tx-l">Ya le pagué la parte ${hechos + 1}</span><span class="tx-s">Ya pagué</span></button>
                     <button class="op-b gris" data-canmut="${o.id}"><span class="tx-l">Cancelar pedido (de mutuo acuerdo)</span><span class="tx-s">Cancelar pedido</span></button>
                     <button class="op-b gris" data-disp="${o.id}"><span class="tx-l">Tengo un problema</span><span class="tx-s">Problema</span></button>`;
      }
    }
  } else if (est === 2) {
    const falta = soyV ? !o.califVendedor : !o.califComprador;
    titulo = 'Operación completada';
    explica = falta ? `Todo salió bien. Solo falta que califiques a ${esc(otroNom)}: ayuda a los demás a saber en quién confiar.` : 'Completada y calificada. ¡Buen trato!';
    acciones = falta ? `<button class="op-b" data-cal="${o.id}">Calificar a ${esc(otroNom)}</button>` : '';
    color = falta ? 'act' : 'ok';
  } else if (est === 3) {
    titulo = 'Cancelada';
    explica = 'Esta operación se canceló. Si tenías cripto trabada, ya volvió a tu wallet.';
  } else if (est === 4) {
    titulo = 'En disputa';
    color = 'dis';
    explica = 'Un árbitro va a revisar el caso y decidirá quién tiene razón. Mientras tanto, la cripto sigue trabada y segura.';
    if (esOwner) {
      acciones = `<div class="op-arb">Eres el árbitro. Revisa los comprobantes antes de decidir.</div>
        <button class="op-b" data-res1="${o.id}">Razón al COMPRADOR</button>
        <button class="op-b gris" data-res0="${o.id}">Razón al VENDEDOR</button>
        <button class="op-b gris" data-anu="${o.id}">Anular · devolver todo</button>`;
    }
  }

  const pasos = Array.from({ length: tramos }, (_, i) =>
    `<div class="mk-step ${i < hechos ? 'ok' : (i === hechos && est === 1 ? 'now' : '')}"></div>`).join('');

  return `
  <div class="op-card ${color}">
    <div class="op-cab">
      <span class="op-id">#${o.id}</span>
      <span class="op-rol ${soyV ? 'v' : 'c'}">${compraAnuncio ? 'Anuncio' : (soyV ? 'Vendo' : 'Compro')} ${num(monto, 2)} ${sim}</span>
      <span class="op-est ${color}">${ESTADOS[est]}</span>
    </div>
    <div class="op-tit">${titulo}</div>
    <div class="op-exp">${explica}</div>
    ${(!compraAnuncio && est === 1) ? `<div class="op-prog">
      <div class="op-prog-l"><span>Parte ${Math.min(hechos + 1, tramos)} de ${tramos}</span><span>Entregado ${num(f18(o.liberado), 2)} de ${num(monto, 2)} ${sim}</span></div>
      <div class="mk-steps">${pasos}</div></div>` : ''}
    <div class="op-acts">${acciones}</div>
    <div id="mk-cal-${o.id}"></div>
  </div>`;
}

function wireOps() {
  const tx = async (fn, id, okMsg, args) => {
    try {
      msg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c[fn](...(args !== undefined ? [id, args] : [id]))).wait();
      msg(okMsg, 'ok'); panelMisOps();
    } catch (e) { msg(traducir(e), 'err'); }
  };
  document.querySelectorAll('[data-pag]').forEach(b => b.onclick = () => confirmar({
    titulo: '¿Ya le pagaste?',
    texto: 'Marca esto <b>solo si ya enviaste el dinero</b>. La otra persona lo va a verificar antes de soltarte la cripto. Marcarlo sin pagar puede costarte una disputa perdida y tu reputación.',
    ok: 'Sí, ya pagué'
  }, () => tx('marcarPagado', b.getAttribute('data-pag'), 'Pago marcado. Espera la confirmación.')));

  document.querySelectorAll('[data-lib]').forEach(b => b.onclick = () => confirmar({
    titulo: '¿Confirmas que te llegó?',
    texto: 'Al liberar, <b>la cripto sale de la caja fuerte y va al comprador</b>. Esto no se puede deshacer. Comprueba primero en tu banco que el dinero está de verdad.',
    ok: 'Sí, me llegó · liberar'
  }, () => tx('liberarTramo', b.getAttribute('data-lib'), 'Parte liberada.')));

  document.querySelectorAll('[data-disp]').forEach(b => b.onclick = () => pedirMotivo(b.getAttribute('data-disp')));

  document.querySelectorAll('[data-aband]').forEach(b => b.onclick = () => confirmar({
    titulo: '¿Abandonar esta venta?',
    texto: 'Te echas atrás antes de que empiece el pago. La operación <b>se cierra</b>, tu cripto <b>vuelve a tu wallet</b> y la publicación <b>desaparece del listado</b>.<br><br>Avisa a la otra persona por el contacto: si ya te mandó el dinero, no uses esto — usa la disputa.',
    ok: 'Sí, abandonar', peligro: true
  }, () => tx('abandonarVenta', b.getAttribute('data-aband'), 'Venta abandonada. Tu cripto volvió a tu wallet.')));

  document.querySelectorAll('[data-liber]').forEach(b => b.onclick = () => confirmar({
    titulo: 'Devolver tu oferta al listado',
    texto: 'La persona que la reservó no arrancó en 24 horas. Tu oferta <b>vuelve a estar visible</b> para todos y tu cripto sigue trabada y segura.',
    ok: 'Sí, devolverla'
  }, () => tx('liberarReserva', b.getAttribute('data-liber'), 'Tu oferta volvió al listado.')));

  document.querySelectorAll('[data-canmut]').forEach(b => b.onclick = () => confirmar({
    titulo: 'Cancelar de mutuo acuerdo',
    texto: 'Si los dos lo piden, la operación se cierra sin culpables y <b>la cripto que quede vuelve al vendedor</b>. Nadie pierde reputación.<br><br>Tu petición queda registrada; se cancela cuando la otra persona también lo pida.',
    ok: 'Sí, pedir cancelación'
  }, () => tx('pedirCancelar', b.getAttribute('data-canmut'), 'Pedido registrado. Falta que la otra persona lo pida también.')));

  document.querySelectorAll('[data-anu]').forEach(b => b.onclick = () => confirmar({
    titulo: 'Anular la disputa',
    texto: 'Se cierra sin culpables y <b>la cripto trabada vuelve al vendedor</b>. Úsalo cuando fue un malentendido.',
    ok: 'Anular', peligro: true
  }, () => tx('anularDisputa', b.getAttribute('data-anu'), 'Disputa anulada.')));

  document.querySelectorAll('[data-cancel2]').forEach(b => b.onclick = () => confirmar({
    titulo: '¿Cancelar tu publicación?',
    texto: 'Se retira del marketplace y <b>tu cripto vuelve a tu wallet</b> al momento.',
    ok: 'Sí, cancelar'
  }, () => tx('cancelarOrden', b.getAttribute('data-cancel2'), 'Cancelada. Tu cripto volvió a tu wallet.')));

  document.querySelectorAll('[data-res1]').forEach(b => b.onclick = () => confirmar({
    titulo: 'Dar la razón al comprador',
    texto: 'El comprador recibirá la parte en disputa, y si falta, se completa con la fianza del vendedor. El resto vuelve al vendedor.',
    ok: 'Confirmar', peligro: true
  }, () => tx('resolverDisputa', b.getAttribute('data-res1'), 'Disputa resuelta.', true)));

  document.querySelectorAll('[data-res0]').forEach(b => b.onclick = () => confirmar({
    titulo: 'Dar la razón al vendedor',
    texto: 'La cripto que queda trabada vuelve al vendedor y la operación se cierra.',
    ok: 'Confirmar', peligro: true
  }, () => tx('resolverDisputa', b.getAttribute('data-res0'), 'Disputa resuelta.', false)));

  document.querySelectorAll('[data-cal]').forEach(b => b.onclick = () => pedirEstrellas(b.getAttribute('data-cal')));
}

/* Disputa: pedimos que expliquen qué pasó */
function pedirMotivo(id) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c" style="max-width:420px">
    <div class="mk-wiz-t">¿Qué pasó?</div>
    <div class="mk-wiz-s">Cuéntalo en pocas palabras. Esto lo lee el árbitro para poder decidir, así que <b>sé concreto</b>: qué acordaron, qué pagaste o qué esperabas.</div>
    <div class="mk-wiz-b">
      <textarea id="dm-txt" maxlength="300" rows="4" placeholder="Ej: le pagué 120 CUP por Transferencia el día 8 a las 3pm y no me ha liberado la parte 1."></textarea>
      <div class="mk-hint">Al abrirla, <b>la operación se detiene</b> hasta que el árbitro decida (máximo 48 h). Si es un malentendido, intenta hablarlo primero por el contacto.</div>
    </div>
    <div class="mk-wiz-acts"><button class="mk-b gris" data-no>Volver</button><button class="mk-b peligro" data-si>Abrir disputa</button></div>
    <div class="mk-msg info" id="dm-msg"></div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('[data-no]').onclick = cerrar;
  d.onclick = (e) => { if (e.target === d) cerrar(); };
  d.querySelector('[data-si]').onclick = async () => {
    const t = ($('dm-txt').value || '').trim();
    const m = $('dm-msg');
    if (t.length < 10) { m.className = 'mk-msg err'; m.textContent = 'Explica un poco más, para que el árbitro entienda.'; return; }
    try {
      m.className = 'mk-msg info'; m.textContent = 'Confirma en tu wallet…';
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.abrirDisputa(id, t.slice(0, 300))).wait();
      cerrar(); msg('Disputa abierta. Se revisará en un máximo de 48 horas.', 'ok'); panelMisOps();
    } catch (e) { m.className = 'mk-msg err'; m.textContent = traducir(e); }
  };
}

/* Confirmación con explicación (nunca una acción grave a ciegas) */
function confirmar({ titulo, texto, ok = 'Continuar', peligro = false }, alAceptar) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c" style="max-width:400px">
    <div class="mk-wiz-t">${titulo}</div>
    <div class="mk-wiz-s">${texto}</div>
    <div class="mk-wiz-acts">
      <button class="mk-b gris" data-no>Volver</button>
      <button class="mk-b${peligro ? ' peligro' : ''}" data-si>${ok}</button>
    </div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('[data-no]').onclick = cerrar;
  d.querySelector('[data-si]').onclick = () => { cerrar(); alAceptar(); };
  d.onclick = (e) => { if (e.target === d) cerrar(); };
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
