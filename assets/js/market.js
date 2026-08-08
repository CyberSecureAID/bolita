// market.js — Marketplace P2P (caja fuerte + tramos + reputación). Módulo independiente.
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm';
import * as wallet from './wallet.js?v=52';

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
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador))',
  'function perfiles(address) view returns (tuple(string nombre,string pais,string moneda,string contacto,bool existe,uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint64 sumaEstrellas,uint32 numVotos,uint64 desde))',
  'function reputacionDe(address) view returns (uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint256 estrellasX100,uint32 votos,uint64 desde)',
  'function ordenesAbiertas(uint256,uint256) view returns (uint256[])',
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
  'function ocultarUbicacion()',
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
  #mk-overlay .mk-cs{padding:9px 13px;border-radius:9px;border:1px solid #2b3139;background:linear-gradient(180deg,#1b2027,#0d1117);color:#b7bdc6;font-family:var(--mono,monospace);font-size:12px;cursor:pointer;font-weight:700}
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
  .mk-wiz-c .mk-hint{font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;line-height:1.55;margin-top:8px}
  .mk-wiz-c .mk-hint b{color:var(--gold-soft,#C9A84B)}
  .mk-wiz-c .mk-rp{padding:5px 10px;border-radius:7px;border:1px solid #3a424c;background:rgba(255,255,255,.05);color:var(--gold,#E8B84B);font-family:var(--mono,monospace);font-size:11px;cursor:pointer;margin-left:6px}
  .mk-wiz-c .mk-escala{margin-top:14px;padding:13px;border-radius:12px;background:#0b0e12;border:1px solid #2b3139}
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
    #mk-overlay .mk-tab{font-size:11px;padding:9px 3px}
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
    <div class="mk-sub">Compra y vende con caja fuerte y entrega por tramos</div>
  </div>
  <div class="mk-tabs">
    <button class="mk-tab on" id="mk-t1">Ofertas</button>
    <button class="mk-tab" id="mk-t2">Vender</button>
    <button class="mk-tab" id="mk-t3">Operaciones</button>
    <button class="mk-tab" id="mk-t4"><span class="tx-l">Cómo funciona</span><span class="tx-s">Guía</span></button>
  </div>
  <div class="mk-pane on" id="mk-p1"><div class="mk-vacio">Cargando ofertas…</div></div>
  <div class="mk-pane" id="mk-p2"></div>
  <div class="mk-pane" id="mk-p3"></div>
  <div class="mk-pane" id="mk-p4">${comoFunciona()}</div>
  <div class="mk-msg info" id="mk-msg"></div>
  <div class="mk-nota">Tu cripto queda trabada en el contrato hasta que confirmes cada tramo. Aurex no custodia fondos ni interviene en el pago en efectivo.</div>`;
  $('mk-x').onclick = cerrar;

  const tabs = [['mk-t1', 'mk-p1'], ['mk-t2', 'mk-p2'], ['mk-t3', 'mk-p3'], ['mk-t4', 'mk-p4']];
  tabs.forEach(([t, p], i) => {
    $(t).onclick = () => {
      tabs.forEach(([tt, pp], j) => { $(tt).classList.toggle('on', i === j); $(pp).classList.toggle('on', i === j); });
      $('mk-card').scrollTop = 0; msg('');
      if (i === 0) listarOfertas();
      if (i === 1) panelVender();
      if (i === 2) panelMisOps();
      if (i === 3) { const b = $('mk-ir-vender'); if (b) b.onclick = () => $('mk-t2').click(); }
    };
  });
  listarOfertas();
}

/* ── Cómo funciona ── */
function comoFunciona() {
  const pasos = [
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
      ${String(o.moneda || '').split('·').filter(Boolean).map(p => {
        const t = p.trim().split(/\s+/);
        return `<span class="mk-chip pr"><b>${esc(t[1] || '')}</b> ${esc(t[0] || '')}</span>`;
      }).join('')}
    </div>
    <div class="mk-chips">
      ${String(o.metodo || '').split('·').filter(Boolean).map(p => `<span class="mk-chip">${esc(p.trim())}</span>`).join('')}
      <span class="mk-chip">En <b>${o.tramos}</b> partes de <b>${num(porTramo, 2)}</b></span>
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
  cont.innerHTML = `<div class="mk-dist">Consultando…</div>`;

  // 1) ¿La otra persona permitió compartir su ubicación?
  let u;
  try { u = await lee('ubicacionDe', [dir]); } catch (_) { u = null; }
  if (!u || !u.comparte) {
    cont.innerHTML = `<div class="mk-dist">Esta persona <b>no ha activado</b> compartir su ubicación.<br>
      Para verla, ella debe activarlo en su perfil (pestaña "Vender"). Puedes pedírselo por el contacto:
      <b>si se niega, tú decides si sigues adelante</b>.</div>`;
    return;
  }
  const suya = { lat: Number(u.lat1e3) / 1000, lon: Number(u.lon1e3) / 1000 };

  // 2) Mi ubicación (para calcular la distancia; se queda en mi dispositivo)
  let mia = leerUbic(cuenta);
  if (!mia) {
    try { mia = await pedirUbicacion(); guardarUbic(cuenta, mia.lat, mia.lon); }
    catch (_) {
      cont.innerHTML = `<div class="mk-dist">Esta persona está en <b>${esc(u.zona || 'zona no indicada')}</b>.<br>Da permiso de ubicación para ver a cuántos kilómetros estás.</div>`;
      return;
    }
  }
  const km = kmEntre(mia, suya);
  cont.innerHTML = mapaHTML(mia, suya, km, u.zona);
}

/// Mapa con OpenStreetMap (gratis, sin clave). Marca ambos puntos y la distancia.
function mapaHTML(a, b, km, zona) {
  const minLat = Math.min(a.lat, b.lat), maxLat = Math.max(a.lat, b.lat);
  const minLon = Math.min(a.lon, b.lon), maxLon = Math.max(a.lon, b.lon);
  const mLat = Math.max(0.05, (maxLat - minLat) * 0.35), mLon = Math.max(0.05, (maxLon - minLon) * 0.35);
  const bbox = [minLon - mLon, minLat - mLat, maxLon + mLon, maxLat + mLat].join(',');
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${a.lat},${a.lon}`;
  const ver = `https://www.openstreetmap.org/directions?from=${a.lat},${a.lon}&to=${b.lat},${b.lon}`;
  return `<div class="mk-mapa">
    <div class="mk-mapa-top"><span>${zona ? esc(zona) : 'Distancia entre ustedes'}</span><b>${km} km</b></div>
    <iframe class="mk-iframe" src="${url}" loading="lazy" referrerpolicy="no-referrer"></iframe>
    <div class="mk-mapa-pie">${km < 30 ? 'Están cerca: podrían verse en persona.' : 'Están lejos: hagan el trato solo por los tramos.'}
      <a href="${ver}" target="_blank" rel="noopener">Ver ruta ↗</a></div>
  </div>`;
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
    <div class="lz-d">Te vamos a hacer unas preguntas cortas, una por una. En menos de un minuto tu oferta está publicada.</div>
    <button class="mk-b" id="mk-abrir-wiz">Quiero vender</button>
  </div>` : ''}

  ${tienePerfil ? `
  <div class="mk-box">
    <div class="bt">Tu ubicación (opcional)</div>
    <div style="font-family:var(--sans,sans-serif);font-size:12.5px;color:#8b96a3;line-height:1.6;margin-bottom:11px">
      Si la compartes, quien mire tu oferta verá <b style="color:#E8B84B">tu zona y a cuántos kilómetros está de ti</b>. Genera confianza: el que no la comparte, siempre da más dudas.
      Se guarda <b style="color:#E8B84B">redondeada a ~1 km</b>, nunca tu dirección exacta, y la puedes quitar cuando quieras.
    </div>
    <div class="mk-row"><span class="k">Estado</span><span class="v">${ubic && ubic.comparte ? `<span class="mk-est a">Compartida</span> ${esc(ubic.zona || '')}` : '<span class="mk-est">No compartida</span>'}</span></div>
    <div class="mk-acts" style="margin-top:11px">
      <button class="mk-b" id="mk-ubic-on">${ubic && ubic.comparte ? 'Actualizar mi ubicación' : 'Compartir mi ubicación'}</button>
      ${ubic && ubic.comparte ? '<button class="mk-b gris" id="mk-ubic-off">Dejar de compartir</button>' : ''}
    </div>
  </div>` : ''}`;

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
      Guardamos tu posición <b>redondeada a ~1 km</b>: sirve para mostrar tu zona y la distancia, <b>nunca tu dirección exacta</b>.
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
  W = { token: USDT, sim: 'USDT', cant: 0, tramos: 5, cobros: [], datos: {}, monedas: [], precios: {} };
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
    marco(1, 6, '¿Qué vas a vender?', 'Elige la moneda digital que tienes en tu wallet.',
      `<div class="wz-ops">
        <button class="wz-op ${W.token === USDT ? 'on' : ''}" data-tok="${USDT}" data-sim="USDT"><b>USDT</b><span>Tether · la más usada</span></button>
        <button class="wz-op ${W.token === USDC ? 'on' : ''}" data-tok="${USDC}" data-sim="USDC"><b>USDC</b><span>USD Coin</span></button>
      </div>`, { atras: false });
    document.querySelectorAll('[data-tok]').forEach(b => b.onclick = () => {
      document.querySelectorAll('[data-tok]').forEach(x => x.classList.remove('on'));
      b.classList.add('on'); W.token = b.getAttribute('data-tok'); W.sim = b.getAttribute('data-sim');
    });
    $('wz-ok').onclick = () => pintarPaso(2);
    return;
  }

  /* Paso 2 · Cuánto */
  if (p === 2) {
    marco(2, 6, `¿Cuánto ${W.sim} vas a vender?`, 'Escribe la cantidad total. Después la dividiremos en partes.',
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
    marco(3, 6, 'Divide tu venta en partes',
      'Tu dinero <b>no se entrega de golpe</b>. Sale por partes: cobras una, confirmas, y se libera. Así, si alguien te intenta estafar, <b>solo alcanza una parte</b>.',
      `<div class="wz-ops chicas" id="wz-tramos">${ops.map(t =>
        `<button class="wz-op ${W.tramos === t ? 'on' : ''}" data-tr="${t}"><b>${t} partes</b><span>${t === 5 ? 'Recomendado' : (t === 10 ? 'Máxima seguridad' : (t === 2 ? 'Mínimo' : '&nbsp;'))}</span></button>`).join('')}</div>
      <div class="mk-escala" id="wz-escala"></div>`);
    const pintar = () => {
      const por = W.cant / W.tramos;
      $('wz-escala').innerHTML = `<div class="mk-escala-t"><span>Se entrega en <b>${W.tramos}</b> partes</span><span>Cada parte: <b>${num(por, 2)} ${W.sim}</b></span></div>
        <div class="mk-escala-bar">${Array.from({ length: W.tramos }, (_, i) => `<div class="mk-escala-p">${i + 1}</div>`).join('')}</div>
        <div class="mk-hint" style="margin-top:9px"><b>Máximo en riesgo: ${num(por, 2)} ${W.sim}</b>, no ${num(W.cant, 2)}.</div>`;
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
    marco(4, 6, '¿Cómo quieres que te paguen?', 'Marca todas las formas que aceptes. Puedes elegir varias.',
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
    marco(5, 6, '¿En qué moneda te pagan?', 'Según lo que elegiste, estas son las que tienen sentido. Marca las que aceptes.',
      `<div class="wz-ops chicas" id="wz-monedas">${(W.posibles || []).map(m =>
        `<button class="wz-op ${W.monedas.includes(m) ? 'on' : ''}" data-mo="${m}"><b>${m}</b><span>${NOMBRE_MONEDA[m] || ''}</span></button>`).join('')}</div>`);
    document.querySelectorAll('[data-mo]').forEach(b => b.onclick = () => {
      const m = b.getAttribute('data-mo');
      b.classList.toggle('on');
      W.monedas = W.monedas.includes(m) ? W.monedas.filter(x => x !== m) : [...W.monedas, m];
    });
    $('wz-ok').onclick = () => {
      if (W.monedas.length === 0) { wmsg('Marca al menos una moneda.', 'err'); return; }
      pintarPaso(6);
    };
    $('wz-atras').onclick = () => pintarPaso(4);
    return;
  }

  /* Paso 6 · Precio de cada moneda */
  if (p === 6) {
    marco(6, 6, '¿A cómo lo vendes?', 'Pon tu precio para cada moneda que aceptas.',
      W.monedas.map(m => `<label>¿Cuántos <b>${m}</b> por cada <b>1 ${W.sim}</b>?</label>
        <input class="wz-precio" data-mo="${m}" type="text" inputmode="decimal" placeholder="${['USD','MLC','EUR'].includes(m) ? 'Ej: 1.10' : 'Ej: 390'}" value="${W.precios[m] || ''}">
        <div class="mk-hint">${['USD','MLC','EUR'].includes(m) ? `Si lo vendes a la par pon <b>1.00</b>; si más caro, <b>1.10</b>, <b>1.20</b>…` : `Es la tasa de hoy.`}</div>`).join(''),
      { seguir: 'Publicar oferta' });
    document.querySelectorAll('.wz-precio').forEach(i => i.oninput = () => { W.precios[i.getAttribute('data-mo')] = i.value; });
    $('wz-ok').onclick = publicarWiz;
    $('wz-atras').onclick = () => pintarPaso(5);
    return;
  }
}

async function publicarWiz() {
  for (const m of W.monedas) {
    const v = Number(String(W.precios[m] || '').replace(',', '.')) || 0;
    if (!(v > 0)) { wmsg(`Falta el precio para ${m}.`, 'err'); return; }
  }
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
    cerrarWiz();
    msg('¡Oferta publicada! Ya la puede ver todo el mundo.', 'ok');
    $('mk-t1').click(); listarOfertas();
  } catch (e) { wmsg(traducir(e), 'err'); if (btn) btn.disabled = false; }
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
