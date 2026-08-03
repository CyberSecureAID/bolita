/**
 * LA COLMENA — app del bot de rejilla (página propia, pantalla completa)
 * =====================================================================
 * Se dibuja dentro de <div id="colmena-app"> de colmena.html. Lenguaje simple,
 * botones (i), gráfica viva con las cuadrículas, e inversión total en una cifra.
 */

import * as gb from './gridbot.js';
import * as wallet from './wallet.js';
import { MONEDAS, LISTA_MONEDAS } from './tokens.js';

const $ = (id) => document.getElementById(id);
const APP = 'colmena-app';
// Lo que se OPERA (base). Las estables no pueden ser base.
const BASES  = ['BNB', 'BTCB', 'ETH', 'BABYDOGE'];
// Contra qué se mide (quote): estables.
const QUOTES = ['USDT', 'USDC'];

const INFO = {
  par: 'Elige qué moneda quieres comprar y vender, y contra cuál (lo normal es una estable como USDT). El bot comprará barato y venderá caro entre esas dos, solo.',
  rango: 'El precio más bajo y el más alto donde quieres que el bot trabaje. Para que funcione, el precio de ahora debe quedar DENTRO del rango. ¿No sabes qué poner? Dale a "Sugerir".',
  cuadriculas: 'En cuántos escalones parte el rango. Más cuadrículas = muchas operaciones pequeñas y seguidas. Menos = operaciones más grandes y espaciadas.',
  inversion: 'Cuánto dinero pones a trabajar. El bot lo reparte entre las cuadrículas para ir comprando por partes cuando el precio baja.',
  proteccion: 'Cuánta diferencia de precio aceptas al operar. Si el precio salta más que esto justo al operar, el bot no opera para no comprarte caro. Si no sabes, deja 1%.',
  ritmo: 'Tiempo mínimo entre una operación y otra. Déjalo en 0 y operará cada vez que pueda.',
  reparto: '"Parejo": escalones a la misma distancia. "Proporcional": separados por porcentaje, mejor para monedas que se mueven mucho.',
  tp: 'Opcional. Si el precio sube hasta aquí, el bot vende todo y termina, dejándote la ganancia.',
  sl: 'Opcional. Si el precio baja hasta aquí, el bot vende todo para no seguir perdiendo. Un freno de emergencia.',
  gas: 'La red cobra unos centavos por cada operación (el "gas", no es nuestra comisión). Deja aquí ~2 USD en BNB y el bot se encarga solo. Es tuyo: lo retiras cuando quieras.',
  ganancia: 'Lo que ya ganaste de verdad, con la comisión y el gas descontados. Es dinero que ya está en tu wallet.',
  porcuad: 'Lo que ganas cada vez que el bot completa una vuelta (compra abajo y vende arriba), ya con la comisión descontada.'
};

const F = { baseId: 'BNB', quoteId: 'USDT', modo: 'arit', precio: null, rutas: null, avanzado: false };
const moneda = (id) => MONEDAS[id];
const FEE_CICLO = 0.002; // 0.10% por operación × 2 (compra + venta)
const CARET = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84B' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

/* ================================================================== */
/* Estilos                                                             */
/* ================================================================== */
function inyectarEstilo() {
  if ($('colmena-css')) return;
  const s = document.createElement('style'); s.id = 'colmena-css';
  s.textContent = `
  #colmena-app{font-family:var(--sans);color:var(--ink)}
  #colmena-app .c-hdr{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:14px 22px;background:rgba(3,11,8,.82);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  #colmena-app .c-brand{font-family:var(--display);font-weight:700;font-size:20px;color:var(--gold);text-decoration:none;letter-spacing:.3px}
  #colmena-app .c-hdr-r{display:flex;align-items:center;gap:12px}
  #colmena-app .c-volver{font-family:var(--mono);font-size:12px;color:var(--ink-3);text-decoration:none}
  #colmena-app .c-volver:hover{color:var(--gold)}
  #colmena-app .dir{font-family:var(--mono);font-size:12px;color:var(--neon-lit);background:rgba(46,232,106,.1);border:1px solid var(--neon-dim);border-radius:100px;padding:8px 14px}
  #colmena-app .hdr-off{width:34px;height:34px;border-radius:50%;background:transparent;border:1px solid var(--line);color:var(--ink-3);cursor:pointer;display:inline-grid;place-items:center;padding:0;line-height:0}
  #colmena-app .hdr-off svg{display:block}
  #colmena-app .hdr-off:hover{border-color:var(--rojo);color:var(--rojo)}
  #colmena-app .hdr-btn{margin:0;width:auto;padding:10px 18px}
  #colmena-app .wrap{max-width:1180px;margin:0 auto;padding:26px 22px 60px}
  #colmena-app .lead{font-size:15px;color:var(--ink-2);margin:0 0 22px;max-width:660px}
  #colmena-app .lead b{color:var(--gold)}
  #colmena-app .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch}
  #colmena-app .cols>div{display:flex;flex-direction:column}
  #colmena-app .cols>div>.card{flex:1}
  #colmena-app .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:18px;padding:22px}
  #colmena-app .card h3{font-family:var(--display);color:var(--gold);margin:0 0 4px;font-size:18px}
  #colmena-app .card .sub{color:var(--ink-3);font-size:12.5px;margin:0 0 16px}
  #colmena-app .lab{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--ink-2);margin:16px 0 6px;text-transform:uppercase;letter-spacing:.6px}
  #colmena-app .i-btn{width:16px;height:16px;border-radius:50%;border:1px solid var(--gold-soft);background:transparent;color:var(--gold-soft);font-family:var(--display);font-size:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
  #colmena-app .i-btn:hover{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  #colmena-app input,#colmena-app select{width:100%;box-sizing:border-box;background:#03110C;color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:13px 14px;font-family:var(--mono);font-size:15px}
  #colmena-app select{-webkit-appearance:none;appearance:none;padding-right:40px;background-image:url("${CARET}");background-repeat:no-repeat;background-position:right 14px center;background-size:12px}
  #colmena-app input:focus,#colmena-app select:focus{outline:none;border-color:var(--gold)}
  #colmena-app .fila{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #colmena-app .btn{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:14px;font-family:var(--display);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s}
  #colmena-app .btn:hover{filter:brightness(1.1)} #colmena-app .btn:disabled{opacity:.5;cursor:not-allowed}
  #colmena-app .btn-oro{background:var(--gold);color:#1a1200}
  #colmena-app .btn-verde{background:var(--neon);color:#03210f}
  #colmena-app .btn-linea{background:transparent;border:1px solid var(--line);color:var(--ink)}
  #colmena-app .btn-rojo{background:transparent;border:1px solid var(--rojo);color:var(--rojo)}
  #colmena-app .mt{margin-top:14px} #colmena-app .mt8{margin-top:8px}
  #colmena-app .link{background:none;border:none;color:var(--gold-soft);font-family:var(--mono);font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:16px}
  #colmena-app .sug{background:none;border:1px solid var(--gold-soft);color:var(--gold);border-radius:8px;padding:6px 10px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-left:auto}
  #colmena-app .seg{display:flex;gap:6px}
  #colmena-app .seg button{flex:1;padding:11px;border:1px solid var(--line);background:transparent;color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #colmena-app .seg button.on{background:var(--gold);color:#1a1200;border-color:var(--gold);font-weight:700}
  #colmena-app .avz{border-top:1px solid var(--line-soft);margin-top:18px;padding-top:4px}
  #colmena-app .chart{width:100%;height:auto;display:block;border-radius:14px;background:#020C08;border:1px solid var(--line-soft)}
  #colmena-app .hint{font-family:var(--mono);font-size:11px;color:var(--gold-soft);margin-top:8px}
  #colmena-app .prev{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
  #colmena-app .p{background:#04140E;border:1px solid var(--line-soft);border-radius:11px;padding:11px;text-align:center}
  #colmena-app .p b{display:flex;align-items:center;justify-content:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #colmena-app .p span{font-family:var(--display);font-size:16px;color:var(--ink);display:block;margin-top:3px}
  #colmena-app .p span.pos{color:var(--neon-lit)}
  #colmena-app .gasbox{background:#04140E;border:1px solid var(--line-soft);border-radius:12px;padding:14px;margin-top:16px}
  #colmena-app .gasbox .top{display:flex;align-items:center;justify-content:space-between}
  #colmena-app .gasbox .v{font-family:var(--display);color:var(--gold);font-size:20px}
  #colmena-app .gas-row{display:flex;gap:8px;margin-top:12px}
  #colmena-app .gas-row input{flex:1}
  #colmena-app .gas-row .btn{width:auto;white-space:nowrap;padding:13px 16px}
  #colmena-app .btn-gasret{margin-top:10px;padding:11px;font-size:13px}
  #colmena-app .aviso{font-family:var(--mono);font-size:12px;padding:11px;border-radius:9px;margin-top:12px}
  #colmena-app .aviso.info{background:rgba(46,232,106,.08);color:var(--neon-lit);border:1px solid var(--neon-dim)}
  #colmena-app .aviso.err{background:rgba(255,107,107,.08);color:var(--rojo);border:1px solid var(--rojo)}
  #colmena-app .aviso.warn{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid var(--gold-soft)}
  #colmena-app .hero{text-align:center;padding:70px 20px}
  #colmena-app .hero h1{font-family:var(--display);color:var(--gold);font-size:34px;margin:0 0 12px}
  #colmena-app .colmenas{margin-top:24px;position:relative;overflow:hidden;
    background:linear-gradient(180deg,rgba(3,11,8,.82),rgba(3,11,8,.9)),url('assets/img/fondo-bots.webp') center/cover no-repeat;
    border:1px solid var(--line);box-shadow:inset 0 0 90px rgba(46,232,106,.07),0 24px 60px rgba(0,0,0,.45)}
  #colmena-app .colmenas h3{position:relative;text-shadow:0 2px 12px rgba(0,0,0,.6)}
  #colmena-app .rej{border:1px solid rgba(46,232,106,.18);border-radius:16px;padding:18px;margin-top:16px;
    background:rgba(4,20,14,.55);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);
    box-shadow:0 10px 34px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)}
  #colmena-app .rej-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  #colmena-app .rej-par{font-family:var(--display);color:var(--gold);font-size:17px}
  #colmena-app .pill{font-family:var(--mono);font-size:10px;padding:4px 9px;border-radius:20px}
  #colmena-app .pill.on{background:rgba(46,232,106,.15);color:var(--neon-lit)} #colmena-app .pill.off{background:rgba(100,133,122,.15);color:var(--ink-3)}
  @keyframes cpulse{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}
  #colmena-app .pill.on .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--neon-lit);margin-right:6px;animation:cpulse 1.2s ease-in-out infinite;vertical-align:middle}
  #colmena-app .ganmsg{background:rgba(46,232,106,.06);border:1px solid var(--neon-dim);border-radius:10px;padding:10px 12px;font-size:12.5px;color:var(--neon-lit);margin:12px 0}
  #colmena-app .rej-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;align-items:start}
  #colmena-app .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  #colmena-app .stat{background:#020D09;border:1px solid var(--line-soft);border-radius:10px;padding:9px}
  #colmena-app .stat b{display:flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #colmena-app .stat span{font-family:var(--display);font-size:15px;color:var(--ink)}
  #colmena-app .stat span.pos{color:var(--neon-lit)} #colmena-app .stat span.neg{color:var(--rojo)}
  #colmena-app .rej-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
  #colmena-app .rej-btns .btn{font-size:12px;padding:10px}
  #colmena-app .leg{display:flex;gap:12px;flex-wrap:wrap;font-family:var(--mono);font-size:10px;color:var(--ink-3);margin-top:8px}
  #colmena-pop{position:absolute;z-index:9999;max-width:280px;background:#0B2419;border:1px solid var(--gold-soft);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--ink);box-shadow:0 10px 30px rgba(0,0,0,.5);display:none;line-height:1.5}
  @media(max-width:860px){#colmena-app .cols{grid-template-columns:1fr}#colmena-app .rej-grid{grid-template-columns:1fr}#colmena-app .prev{grid-template-columns:repeat(2,1fr)}}
  `;
  document.head.appendChild(s);
  const pop = document.createElement('div'); pop.id = 'colmena-pop'; document.body.appendChild(pop);
  document.addEventListener('click', (e) => { if (!e.target.closest('.i-btn') && e.target.id !== 'colmena-pop') pop.style.display = 'none'; });
}

/* ================================================================== */
/* Utilidades                                                          */
/* ================================================================== */
function precioFmt(n) {
  if (n === null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a >= 0.01) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (a >= 0.0001) return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  const dec = Math.min(18, -Math.floor(Math.log10(a)) + 3);
  return n.toFixed(dec).replace(/0+$/, '').replace(/\.$/, '');
}
function num(n, d = 4) { return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d }) : '—'; }
function dias(seg) { const s = Number(seg); return s ? Math.max(0, Math.floor((Date.now()/1000 - s)/86400)).toString() : '0'; }
function aviso(el, tipo, msg) { if (el) el.innerHTML = `<div class="aviso ${tipo}">${msg}</div>`; }
function iBtn(k) { return `<button class="i-btn" data-info="${k}" type="button">i</button>`; }
function abrirPop(btn) {
  const pop = $('colmena-pop'); pop.textContent = INFO[btn.dataset.info] || '';
  const r = btn.getBoundingClientRect(); pop.style.display = 'block';
  pop.style.left = Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - 300) + 'px';
  pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
}
function wirePops(root) { (root || document).querySelectorAll('.i-btn').forEach((b) => b.onclick = (e) => { e.stopPropagation(); abrirPop(b); }); }

/* ================================================================== */
/* Gráficas                                                            */
/* ================================================================== */
function nivelesPreview(pMin, pMax, n, modo) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    out.push(modo === 'geo' ? pMin * Math.pow(pMax / pMin, t) : pMin + (pMax - pMin) * t);
  }
  return out;
}
/** Dibuja una rejilla. `precios` = array de {p, tipo} donde tipo: 'compra'|'venta'|'off'. */
function dibujar(precios, precio, pMin, pMax) {
  const W = 560, H = 320, padL = 70, padR = 16, padT = 16, padB = 26;
  if (!(pMin > 0 && pMax > pMin)) return svgVacio(W, H, 'Pon un rango para ver la rejilla');
  const y = (p) => padT + (H - padT - padB) * (1 - (p - pMin) / (pMax - pMin));
  const partes = [];
  // zonas
  if (precio && precio >= pMin && precio <= pMax) {
    const yp = y(precio);
    partes.push(`<rect x="${padL}" y="${yp}" width="${W-padR-padL}" height="${(H-padB-yp).toFixed(1)}" fill="#2EE86A" opacity=".05"/>`);
    partes.push(`<rect x="${padL}" y="${padT}" width="${W-padR-padL}" height="${(yp-padT).toFixed(1)}" fill="#FF6B6B" opacity=".05"/>`);
  }
  for (const nv of precios) {
    if (nv.p < pMin || nv.p > pMax) continue;
    const yy = y(nv.p).toFixed(1);
    const col = nv.tipo === 'compra' ? 'var(--neon)' : nv.tipo === 'venta' ? 'var(--rojo)' : 'var(--ink-3)';
    const op = nv.tipo === 'off' ? '.35' : '.8';
    partes.push(`<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="${col}" stroke-width="1.4" opacity="${op}"/>`);
  }
  // precio (aunque esté fuera del rango, lo pegamos al borde)
  const dentro = precio && precio >= pMin && precio <= pMax;
  const yp = precio ? (precio > pMax ? padT : precio < pMin ? H - padB : y(precio)) : null;
  if (precio) {
    partes.push(`<line x1="${padL}" y1="${yp.toFixed(1)}" x2="${W-padR}" y2="${yp.toFixed(1)}" stroke="#E4F5EF" stroke-width="2" stroke-dasharray="5 4"/>`);
    partes.push(`<circle cx="${padL}" cy="${yp.toFixed(1)}" r="4" fill="#E4F5EF"><animate attributeName="r" values="3;7;3" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle>`);
    partes.push(`<text x="${W-padR}" y="${(yp - 6).toFixed(1)}" fill="#E4F5EF" font-family="IBM Plex Mono" font-size="11" text-anchor="end">precio ahora ${precioFmt(precio)}${dentro ? '' : ' (fuera)'}</text>`);
  }
  partes.push(`<text x="8" y="${padT+9}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${precioFmt(pMax)}</text>`);
  partes.push(`<text x="8" y="${H-padB+4}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${precioFmt(pMin)}</text>`);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${partes.join('')}</svg>`;
}
function svgVacio(W, H, txt) {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><text x="${W/2}" y="${H/2}" fill="#64857A" font-family="IBM Plex Mono" font-size="13" text-anchor="middle">${txt}</text></svg>`;
}
function graficaPreview() {
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value), n = parseInt($('f-niv')?.value, 10);
  if (!(pMin > 0 && pMax > pMin && n >= 2)) return svgVacio(560, 320, 'Pon un rango para ver la rejilla');
  const ps = nivelesPreview(pMin, pMax, n, F.modo).map((p) => ({ p, tipo: F.precio ? (p < F.precio ? 'compra' : 'venta') : 'compra' }));
  return dibujar(ps, F.precio, pMin, pMax);
}

/* ================================================================== */
/* Encabezado                                                          */
/* ================================================================== */
function headerHTML() {
  const cuenta = wallet.cuentaActual();
  let right;
  if (!cuenta) right = `<button class="btn btn-oro hdr-btn" id="c-conectar">Conectar wallet</button>`;
  else if (!wallet.esRedCorrecta()) right = `<button class="btn btn-rojo hdr-btn" id="c-red">Cambiar a BNB Chain</button>`;
  else right = `<span class="dir">${wallet.abreviar(cuenta)}</span><button class="hdr-off" id="c-off" title="Desconectar" aria-label="Desconectar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  return `<header class="c-hdr">
    <a class="c-brand" href="index.html">Bot Algorítmico</a>
    <div class="c-hdr-r"><a class="c-volver" href="index.html">← La Bolita</a>${right}</div>
  </header>`;
}
function wireHeader() {
  if ($('c-conectar')) $('c-conectar').onclick = () => wallet.conectar().catch(() => {});
  if ($('c-red')) $('c-red').onclick = () => wallet.cambiarARedCorrecta().catch(() => {});
  if ($('c-off')) $('c-off').onclick = () => wallet.desconectar().catch(() => {});
}

/* ================================================================== */
/* Render                                                              */
/* ================================================================== */
function render() {
  const host = $(APP); if (!host) return;
  inyectarEstilo();
  const cuenta = wallet.cuentaActual();

  if (!cuenta) {
    host.innerHTML = headerHTML() + `<div class="wrap"><div class="card hero">
      <h1>Pon tu dinero a trabajar</h1>
      <p class="lead" style="margin:0 auto 22px">El bot <b>compra barato y vende caro</b> por ti, día y noche, mientras duermes. Sin cuenta en ningún exchange, sin papeleo. Tú guardas tus monedas: nosotros nunca las tocamos.</p>
      <button class="btn btn-oro" id="c-conectar2" style="max-width:300px;margin:0 auto">Conectar wallet</button>
    </div></div>`;
    wireHeader();
    $('c-conectar2').onclick = () => wallet.conectar().catch(() => {});
    return;
  }

  const optHTML = (ids, val) => ids.map((id) => `<option value="${id}" ${id === val ? 'selected' : ''}>${moneda(id).simbolo}</option>`).join('');

  host.innerHTML = headerHTML() + `<div class="wrap">
    <div class="cols">
      <div class="card">
        <h3>Arma tu bot</h3>
        <p class="sub">Elige moneda, di cuánto inviertes y enciende. Toca la (i) si no sabes qué es algo.</p>
        <div class="lab">Moneda ${iBtn('par')}</div>
        <div class="fila"><select id="f-base">${optHTML(BASES, F.baseId)}</select><select id="f-quote">${optHTML(QUOTES, F.quoteId)}</select></div>
        <div class="lab">Rango de precio ${iBtn('rango')}<button class="sug" id="f-sug" type="button">Sugerir</button></div>
        <div class="fila"><input id="f-min" type="number" step="any" placeholder="precio bajo"><input id="f-max" type="number" step="any" placeholder="precio alto"></div>
        <div class="fila">
          <div><div class="lab">Cuadrículas ${iBtn('cuadriculas')}</div><input id="f-niv" type="number" min="2" max="100" value="20"></div>
          <div><div class="lab">Invierto (${moneda(F.quoteId).simbolo}) ${iBtn('inversion')}</div><input id="f-total" type="number" step="any" placeholder="0.00"></div>
        </div>
        <button class="link" id="f-toggleavz">${F.avanzado ? '− Ocultar avanzado' : '+ Opciones avanzadas'}</button>
        <div class="avz" id="f-avz" style="${F.avanzado ? '' : 'display:none'}">
          <div class="lab">Reparto ${iBtn('reparto')}</div>
          <div class="seg" id="f-modo"><button data-modo="arit" class="${F.modo==='arit'?'on':''}">Parejo</button><button data-modo="geo" class="${F.modo==='geo'?'on':''}">Proporcional</button></div>
          <div class="fila">
            <div><div class="lab">Protección precio % ${iBtn('proteccion')}</div><input id="f-slip" type="number" step="any" value="1"></div>
            <div><div class="lab">Ritmo mín (s) ${iBtn('ritmo')}</div><input id="f-cd" type="number" step="1" value="0"></div>
          </div>
          <div class="fila">
            <div><div class="lab">Cerrar con ganancia ${iBtn('tp')}</div><input id="f-tp" type="number" step="any" placeholder="off"></div>
            <div><div class="lab">Protegerme de caídas ${iBtn('sl')}</div><input id="f-sl" type="number" step="any" placeholder="off"></div>
          </div>
        </div>
        <button class="btn btn-verde mt" id="f-crear">Encender el bot</button>
        <div id="c-msg"></div>
      </div>
      <div>
        <div class="card">
          <div id="c-chart">${graficaPreview()}</div>
          <div id="c-hint"></div>
          <div class="prev">
            <div class="p"><b>Precio</b><span id="pv-precio">—</span></div>
            <div class="p"><b>Compra en</b><span id="pv-compras">—</span></div>
            <div class="p"><b>Por compra</b><span id="pv-orden">—</span></div>
            <div class="p"><b>Por vuelta ${iBtn('porcuad')}</b><span id="pv-gan" class="pos">—</span></div>
          </div>
          <div class="gasbox">
            <div class="top"><div class="lab" style="margin:0">Gas del bot ${iBtn('gas')}</div><div class="v" id="c-gas">…</div></div>
            <div class="gas-row"><input id="f-gas" type="number" step="any" placeholder="0.01 BNB"><button class="btn btn-oro" id="f-gasdep">Recargar</button></div>
            <button class="btn btn-linea btn-gasret" id="f-gasret" style="width:100%">Retirar mi gas</button>
            <div id="c-gasmsg"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="colmenas card"><h3>Mis bots</h3><div id="c-rejillas"><p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Cargando…</p></div></div>
  </div>`;

  wireHeader();
  $('f-base').onchange = (e) => { F.baseId = e.target.value; F.precio = null; F.rutas = null; render(); cargarPrecio(); };
  $('f-quote').onchange = (e) => { F.quoteId = e.target.value; F.precio = null; F.rutas = null; render(); cargarPrecio(); };
  $('f-toggleavz').onclick = () => { F.avanzado = !F.avanzado; render(); };
  host.querySelectorAll('#f-modo button').forEach((b) => b.onclick = () => { host.querySelectorAll('#f-modo button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); F.modo = b.dataset.modo; actualizarVista(); });
  ['f-min','f-max','f-niv','f-total'].forEach((id) => { const e = $(id); if (e) e.oninput = actualizarVista; });
  $('f-sug').onclick = sugerirRango;
  $('f-crear').onclick = onCrear;
  $('f-gasdep').onclick = onDepositarGas;
  $('f-gasret').onclick = onRetirarGas;
  wirePops(host);

  cargarPrecio(); refrescarGas(); refrescarRejillas();
}

/* ================================================================== */
/* Precio + vista viva                                                 */
/* ================================================================== */
async function cargarPrecio() {
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  try { const r = await gb.precioPar(gb.dirDe(base), gb.dirDe(quote), base.decimals, quote.decimals); F.precio = r.precio; F.rutas = r.rutas; }
  catch { F.precio = null; }
  actualizarVista();
}
function actualizarVista() {
  if ($('c-chart')) $('c-chart').innerHTML = graficaPreview();
  if ($('pv-precio')) $('pv-precio').textContent = precioFmt(F.precio);
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value);
  const n = parseInt($('f-niv')?.value, 10), total = parseFloat($('f-total')?.value);
  const hint = $('c-hint');
  if (hint) hint.innerHTML = (F.precio && pMin > 0 && pMax > pMin && (F.precio < pMin || F.precio > pMax))
    ? `<div class="hint">⚠ El precio de ahora (${precioFmt(F.precio)}) está fuera de tu rango. Ajusta el rango o dale a "Sugerir" para que el bot pueda operar.</div>` : '';
  if (F.precio && pMin > 0 && pMax > pMin && n >= 2) {
    const ps = nivelesPreview(pMin, pMax, n, F.modo);
    const nBuy = ps.filter((p) => p < F.precio).length || 1;
    if ($('pv-compras')) $('pv-compras').textContent = `${ps.filter((p) => p < F.precio).length} niveles`;
    const ordenQuote = total > 0 ? total / nBuy : 0;
    if ($('pv-orden')) $('pv-orden').textContent = ordenQuote ? num(ordenQuote, 2) : '—';
    const stepPct = F.modo === 'geo' ? Math.pow(pMax / pMin, 1 / (n - 1)) - 1 : ((pMax - pMin) / (n - 1)) / F.precio;
    const net = ordenQuote * (stepPct - FEE_CICLO);
    if ($('pv-gan')) $('pv-gan').textContent = ordenQuote ? (net > 0 ? num(net, 3) : '≈0') : '—';
  } else {
    ['pv-compras','pv-orden','pv-gan'].forEach((id) => { if ($(id)) $(id).textContent = '—'; });
  }
}
function sugerirRango() {
  if (!F.precio) { aviso($('c-msg'), 'err', 'Espera un segundo a que cargue el precio y vuelve a intentar.'); return; }
  // Rango amplio (±30%) y bastantes cuadrículas: pensado para que aguante semanas
  // de movimiento sin quedar fuera de rango, con separación cómoda sobre las comisiones.
  $('f-min').value = Number((F.precio * 0.70).toPrecision(6));
  $('f-max').value = Number((F.precio * 1.30).toPrecision(6));
  $('f-niv').value = 30;
  actualizarVista();
}

/* ================================================================== */
/* Permisos (limitados, dentro de "Encender")                          */
/* ================================================================== */
// Convierte un número humano a unidades del token (recorta decimales para parseUnits).
function mBI(human, dec) { return gb.parse(Number(human).toFixed(Math.min(dec, 8)), dec); }

/* ================================================================== */
/* Gas                                                                 */
/* ================================================================== */
async function refrescarGas() {
  const cuenta = wallet.cuentaActual(); const el = $('c-gas'); if (!cuenta || !el) return;
  try { const s = await gb.gasSaldo(cuenta); el.textContent = `${Number(gb.fmtBNB(s)).toFixed(5)} BNB`; } catch { el.textContent = '—'; }
}
async function onDepositarGas() {
  const v = parseFloat($('f-gas').value); const m = $('c-gasmsg');
  if (!(v > 0)) { aviso(m, 'err', 'Escribe cuánto BNB quieres poner.'); return; }
  aviso(m, 'info', 'Recargando… confirma en tu wallet.');
  try { await gb.depositarGas(v); aviso(m, 'info', 'Gas recargado.'); refrescarGas(); }
  catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}
async function onRetirarGas() {
  const cuenta = wallet.cuentaActual(); const m = $('c-gasmsg');
  try {
    const s = await gb.gasSaldo(cuenta);
    if (s <= 0n) { aviso(m, 'err', 'No tienes gas para retirar.'); return; }
    aviso(m, 'info', 'Retirando… confirma en tu wallet.');
    await gb.retirarGas(gb.fmtBNB(s)); aviso(m, 'info', 'Gas retirado.'); refrescarGas();
  } catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Crear                                                               */
/* ================================================================== */
async function onCrear() {
  const m = $('c-msg'); const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const cuenta = wallet.cuentaActual();
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    pMin: parseFloat($('f-min').value), pMax: parseFloat($('f-max').value),
    niveles: parseInt($('f-niv').value, 10), modo: F.modo, totalQuoteHumano: parseFloat($('f-total').value),
    slippageBps: Math.round((parseFloat($('f-slip')?.value) || 1) * 100),
    cooldownSeg: parseInt($('f-cd')?.value, 10) || 0,
    tpPrecio: parseFloat($('f-tp')?.value) || 0, slPrecio: parseFloat($('f-sl')?.value) || 0, rutas: F.rutas
  };
  if (!(p.pMin > 0 && p.pMax > p.pMin)) { aviso(m, 'err', 'Revisa el rango: el precio alto debe ser mayor que el bajo. Prueba "Sugerir".'); return; }
  if (!(p.niveles >= 2)) { aviso(m, 'err', 'Pon al menos 2 cuadrículas.'); return; }
  if (!(p.totalQuoteHumano > 0)) { aviso(m, 'err', '¿Cuánto quieres invertir?'); return; }
  if (F.precio && (F.precio < p.pMin || F.precio > p.pMax)) { aviso(m, 'warn', 'Ojo: el precio de ahora está fuera del rango; el bot esperará a que entre. Si quieres que empiece ya, ajusta el rango o dale a "Sugerir".'); }
  aviso(m, 'info', 'Preparando tu bot con el precio real…');
  try {
    const config = await gb.construirConfig(p);
    const price = config._Pnow || F.precio || 1;
    const total = p.totalQuoteHumano;
    // Permisos LIMITADOS (finitos, para varios ciclos) — NUNCA ilimitados.
    const topeQuote = total * 20, topeBase = (total / price) * 20;
    const quoteNeed = mBI(topeQuote, quote.decimals), baseNeed = mBI(topeBase, base.decimals);
    const [aQ, aB] = await Promise.all([gb.allowance(p.quote, cuenta), gb.allowance(p.base, cuenta)]);
    if (aQ < quoteNeed) { aviso(m, 'info', `Permiso para ${quote.simbolo} (hasta ${num(topeQuote, 2)})… confirma en tu wallet.`); await gb.aprobarToken(p.quote, quoteNeed); }
    if (aB < baseNeed) { aviso(m, 'info', `Permiso para ${base.simbolo}… confirma en tu wallet.`); await gb.aprobarToken(p.base, baseNeed); }
    aviso(m, 'info', 'Encendiendo… confirma en tu wallet.');
    await gb.crearRejilla(config);
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo });
    aviso(m, 'info', '¡Bot encendido! Ya lo estoy vigilando. Revisa que tengas gas cargado.');
    refrescarRejillas();
  } catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Panel                                                               */
/* ================================================================== */
function recordarPar(cuenta, base, quote, extra) {
  const k = gb.claveDe(cuenta, base, quote);
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  m[k] = { base, quote, ...(extra || {}) }; localStorage.setItem('bot-pares', JSON.stringify(m));
}
function simboloDe(addr) {
  if (addr.toLowerCase() === gb.WBNB.toLowerCase()) return 'BNB';
  const m = LISTA_MONEDAS.find((x) => (x.address || '').toLowerCase() === addr.toLowerCase());
  return m ? m.simbolo : addr.slice(0, 6);
}
async function refrescarRejillas() {
  const cuenta = wallet.cuentaActual(); const cont = $('c-rejillas'); if (!cuenta || !cont) return;
  try {
    const claves = await gb.misRejillas(cuenta);
    if (!claves.length) { cont.innerHTML = `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Aún no tienes bots. Arma el primero arriba.</p>`; return; }
    const store = JSON.parse(localStorage.getItem('bot-pares') || '{}');
    const cards = [];
    for (const clave of claves) {
      const par = store[clave]; if (!par) continue;
      try { cards.push(await tarjeta(cuenta, clave, par)); } catch {}
    }
    cont.innerHTML = cards.length ? cards.join('') : `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Sin bots para mostrar en este dispositivo.</p>`;
    enganchar(cuenta);
  } catch (e) { cont.innerHTML = `<div class="aviso err">No se pudieron cargar: ${e?.shortMessage || e?.message || e}</div>`; }
}
async function tarjeta(cuenta, clave, par) {
  const R = await gb.resumen(cuenta, par.base, par.quote);
  const decQ = par.decQuote ?? 18, decB = par.decBase ?? 18;
  const simB = par.simBase ?? simboloDe(par.base), simQ = par.simQuote ?? simboloDe(par.quote);
  const gan = R.gananciaQuote, neg = gan < 0n;
  const ganTxt = (neg ? '−' : '+') + num(Number(gb.fmt(neg ? -gan : gan, decQ)), 4) + ' ' + simQ;
  // gráfica viva: recuperar precio de cada nivel desde minOutVenta / ordenBase
  let chart = svgVacio(560, 320, 'sin datos'); let precioAhora = null;
  try {
    const niveles = await gb.nivelesDe(clave);
    const ordenBaseH = Number(gb.fmt(R.ordenBase, decB)) || 1;
    const ps = niveles.map((nv) => {
      const p = Number(gb.fmt(nv.minOutVenta, decQ)) / ordenBaseH;
      const est = Number(nv.estado);
      return { p, tipo: est === 1 ? 'compra' : est === 2 ? 'venta' : 'off' };
    }).filter((x) => isFinite(x.p) && x.p > 0);
    try { const pr = await gb.precioPar(par.base, par.quote, decB, decQ); precioAhora = pr.precio; } catch {}
    const min = Math.min(...ps.map((x) => x.p)), max = Math.max(...ps.map((x) => x.p));
    chart = dibujar(ps, precioAhora, min, max);
  } catch {}
  return `<div class="rej" data-b="${par.base}" data-q="${par.quote}" data-sq="${simQ}" data-sb="${simB}">
    <div class="rej-top"><span class="rej-par">${simB} / ${simQ}</span><span class="pill ${R.activa ? 'on' : 'off'}">${R.activa ? '<span class="dot"></span>Trabajando' : 'Pausada'}</span></div>
    <div class="rej-grid">
      <div>${chart}<div class="leg"><span style="color:var(--neon-lit)">● esperando comprar</span><span style="color:var(--rojo)">● comprado, esperando vender</span><span>● en espera</span></div></div>
      <div>
        <div class="ganmsg">💰 Tus ganancias caen solas en tu wallet cada vez que el bot vende. No hay nada que retirar.</div>
        <div class="stats">
          <div class="stat"><b>Ganancia real ${iBtn('ganancia')}</b><span class="${neg ? 'neg' : 'pos'}">${ganTxt}</span></div>
          <div class="stat"><b>Ventas hechas</b><span>${R.ciclos}</span></div>
          <div class="stat"><b>Operaciones</b><span>${R.totalOps}</span></div>
          <div class="stat"><b>Cuadrículas</b><span>${R.niveles}</span></div>
          <div class="stat"><b>Días activo</b><span>${dias(R.creadaEn)}</span></div>
          <div class="stat"><b>Gas</b><span>${Number(gb.fmtBNB(R.gasSaldoWei)).toFixed(4)}</span></div>
        </div>
        <div class="rej-btns">
          <button class="btn btn-linea" data-acc="toggle">${R.activa ? 'Pausar' : 'Reanudar'}</button>
          <button class="btn btn-oro" data-acc="terminar">Terminar y vender</button>
          <button class="btn btn-rojo" data-acc="desconectar">Desconectar</button>
        </div>
        <div class="rej-msg"></div>
      </div>
    </div>`;
}
function enganchar(cuenta) {
  document.querySelectorAll(`#${APP} .rej`).forEach((el) => {
    const b = el.dataset.b, q = el.dataset.q, sq = el.dataset.sq, m = el.querySelector('.rej-msg');
    wirePops(el);
    el.querySelectorAll('[data-acc]').forEach((btn) => btn.onclick = async () => {
      const acc = btn.dataset.acc;
      try {
        if (acc === 'toggle') {
          const R = await gb.resumen(cuenta, b, q); aviso(m, 'info', 'Confirma en tu wallet…'); await gb.activarRejilla(b, q, !R.activa);
        } else if (acc === 'terminar') {
          if (!confirm('Se venderá todo a estable y se detendrá este bot. El dinero queda en tu wallet. ¿Continuar?')) return;
          aviso(m, 'info', 'Vendiendo a estable… confirma en tu wallet.'); await gb.cerrarAhora(b, q);
          aviso(m, 'info', 'Deteniendo el bot… confirma.'); await gb.cancelarRejilla(b, q);
        } else if (acc === 'desconectar') {
          if (!confirm(`Esto quita el permiso que le diste al bot sobre tu ${sq} (y la otra moneda del par) y lo desconecta. El bot no podrá operar hasta que lo actives de nuevo. ¿Continuar?`)) return;
          aviso(m, 'info', `Quitando permiso de ${sq}… confirma.`); await gb.revocarToken(q);
          aviso(m, 'info', 'Quitando el otro permiso… confirma.'); await gb.revocarToken(b);
        }
        refrescarRejillas();
      } catch (e) { aviso(m, 'err', e?.shortMessage || e?.message || e); }
    });
  });
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */
async function arrancar() {
  if (!$(APP)) return;
  render();
  wallet.alCambiar(() => render());
  try { await wallet.reconectarSiProcede(); } catch {}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
