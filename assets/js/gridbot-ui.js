/**
 * GRIDBOT UI — sección "Bot de rejilla" de la web
 * ================================================
 * Se dibuja sola dentro de <section id="bot">. Usa gridbot.js (contrato) y
 * wallet.js (conexión) del propio sitio. Hereda el tema con las variables CSS.
 *
 * v1: conectar → configurar rejilla → aprobar → cargar gas → crear → panel.
 */

import * as gb from './gridbot.js';
import * as wallet from './wallet.js';
import { MONEDAS, LISTA_MONEDAS } from './tokens.js';

const $ = (id) => document.getElementById(id);

/* Monedas que se pueden operar en el bot (todas menos las que no tienen par
   líquido real; el usuario igual puede elegir cualquiera). BNB opera como WBNB. */
const OPERABLES = LISTA_MONEDAS;

/* ================================================================== */
/* Estilos (heredan los tokens del sitio)                              */
/* ================================================================== */

function inyectarEstilo() {
  if ($('bot-css')) return;
  const s = document.createElement('style');
  s.id = 'bot-css';
  s.textContent = `
  #bot .bot-wrap{max-width:900px;margin:0 auto;padding:0 4px}
  #bot .bot-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  #bot .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));
    border:1px solid var(--line);border-radius:var(--r);padding:18px}
  #bot .card h3{font-family:var(--display);color:var(--gold);margin:0 0 12px;font-size:16px;letter-spacing:.3px}
  #bot label{display:block;font-family:var(--mono);font-size:11px;color:var(--ink-2);margin:10px 0 4px;text-transform:uppercase;letter-spacing:.5px}
  #bot input,#bot select{width:100%;box-sizing:border-box;background:#03110C;color:var(--ink);
    border:1px solid var(--line);border-radius:10px;padding:11px 12px;font-family:var(--mono);font-size:14px}
  #bot input:focus,#bot select:focus{outline:none;border-color:var(--gold)}
  #bot .fila{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #bot .btn{width:100%;box-sizing:border-box;border:none;border-radius:10px;padding:12px;margin-top:12px;
    font-family:var(--display);font-weight:700;font-size:14px;cursor:pointer;transition:filter .2s}
  #bot .btn:hover{filter:brightness(1.1)}
  #bot .btn:disabled{opacity:.5;cursor:not-allowed}
  #bot .btn-oro{background:var(--gold);color:#1a1200}
  #bot .btn-verde{background:var(--neon);color:#03210f}
  #bot .btn-linea{background:transparent;border:1px solid var(--line);color:var(--ink)}
  #bot .btn-rojo{background:transparent;border:1px solid var(--rojo);color:var(--rojo)}
  #bot .seg{display:flex;gap:6px;margin-top:4px}
  #bot .seg button{flex:1;padding:9px;border:1px solid var(--line);background:transparent;color:var(--ink-2);
    border-radius:8px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #bot .seg button.on{background:var(--gold);color:#1a1200;border-color:var(--gold);font-weight:700}
  #bot .aviso{font-family:var(--mono);font-size:12px;padding:10px;border-radius:8px;margin-top:10px}
  #bot .aviso.info{background:rgba(46,232,106,.08);color:var(--neon-lit);border:1px solid var(--neon-dim)}
  #bot .aviso.err{background:rgba(255,107,107,.08);color:var(--rojo);border:1px solid var(--rojo)}
  #bot .rej{border:1px solid var(--line);border-radius:12px;padding:14px;margin-top:12px;background:#04140E}
  #bot .rej-top{display:flex;justify-content:space-between;align-items:center}
  #bot .rej-par{font-family:var(--display);color:var(--gold);font-size:15px}
  #bot .pill{font-family:var(--mono);font-size:10px;padding:3px 8px;border-radius:20px}
  #bot .pill.on{background:rgba(46,232,106,.15);color:var(--neon-lit)}
  #bot .pill.off{background:rgba(100,133,122,.15);color:var(--ink-3)}
  #bot .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  #bot .stat{background:#020D09;border:1px solid var(--line-soft);border-radius:8px;padding:8px}
  #bot .stat b{display:block;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #bot .stat span{font-family:var(--display);font-size:15px;color:var(--ink)}
  #bot .stat span.pos{color:var(--neon-lit)} #bot .stat span.neg{color:var(--rojo)}
  #bot .rej-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
  #bot .rej-btns .btn{margin-top:0;font-size:12px;padding:9px}
  #bot .gas-row{display:flex;gap:8px;align-items:end}
  #bot .gas-row input{flex:1}
  #bot .gas-row .btn{width:auto;margin-top:0;white-space:nowrap;padding:11px 14px}
  #bot .conectar{text-align:center;padding:40px 20px}
  @media(max-width:720px){#bot .bot-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

/* ================================================================== */
/* Utilidades de formato                                               */
/* ================================================================== */

function corto(bi, dec, cifras = 4) {
  try {
    const n = Number(gb.fmt(bi, dec));
    if (n === 0) return '0';
    if (n < 0.0001) return n.toExponential(2);
    return n.toLocaleString('en-US', { maximumFractionDigits: cifras });
  } catch { return '—'; }
}
function dias(desdeSeg) {
  const s = Number(desdeSeg);
  if (!s) return '0';
  return Math.max(0, Math.floor((Date.now() / 1000 - s) / 86400)).toString();
}
function aviso(el, tipo, msg) { el.innerHTML = `<div class="aviso ${tipo}">${msg}</div>`; }

/* ================================================================== */
/* Estado del formulario                                               */
/* ================================================================== */

const F = { baseId: 'BNB', quoteId: 'USDT', modo: 'arit' };

function moneda(id) { return MONEDAS[id]; }

/* ================================================================== */
/* Render principal                                                    */
/* ================================================================== */

function render() {
  const host = $('bot');
  if (!host) return;
  inyectarEstilo();

  const cuenta = wallet.cuentaActual();
  if (!cuenta) {
    host.innerHTML = `<div class="bot-wrap"><div class="card conectar">
      <h3>Bot de rejilla</h3>
      <p style="color:var(--ink-2);font-family:var(--sans)">Conecta tu wallet para operar. Tu dinero queda en tu wallet: el bot solo tiene permiso para intercambiar tu par y devolverte el resultado.</p>
      <button class="btn btn-oro" id="bot-conectar">Conectar wallet</button>
    </div></div>`;
    $('bot-conectar').onclick = async () => { try { await wallet.conectar(); } catch (e) {} };
    return;
  }

  const opts = OPERABLES.map((m) => m.id);
  const sel = (val, exclude) => opts
    .filter((id) => id !== exclude)
    .map((id) => `<option value="${id}" ${id === val ? 'selected' : ''}>${moneda(id).simbolo}</option>`)
    .join('');

  host.innerHTML = `<div class="bot-wrap">
    <div class="bot-grid">
      <div class="card">
        <h3>Nueva rejilla</h3>
        <div class="fila">
          <div><label>Operas (base)</label><select id="f-base">${sel(F.baseId, F.quoteId)}</select></div>
          <div><label>Contra (estable)</label><select id="f-quote">${sel(F.quoteId, F.baseId)}</select></div>
        </div>
        <div class="fila">
          <div><label>Precio mínimo</label><input id="f-min" type="number" step="any" placeholder="0.0"></div>
          <div><label>Precio máximo</label><input id="f-max" type="number" step="any" placeholder="0.0"></div>
        </div>
        <div class="fila">
          <div><label>Cuadrículas</label><input id="f-niv" type="number" step="1" min="2" max="100" value="20"></div>
          <div><label>Reparto</label>
            <div class="seg"><button data-modo="arit" class="on">Lineal</button><button data-modo="geo">Geométrico</button></div>
          </div>
        </div>
        <div class="fila">
          <div><label>Por compra (estable)</label><input id="f-oq" type="number" step="any" placeholder="0.0"></div>
          <div><label>Por venta (base)</label><input id="f-ob" type="number" step="any" placeholder="0.0"></div>
        </div>
        <div class="fila">
          <div><label>Slippage máx %</label><input id="f-slip" type="number" step="any" value="1"></div>
          <div><label>Espera entre ops (s)</label><input id="f-cd" type="number" step="1" value="0"></div>
        </div>
        <div class="fila">
          <div><label>Take-Profit (precio, opcional)</label><input id="f-tp" type="number" step="any" placeholder="off"></div>
          <div><label>Stop-Loss (precio, opcional)</label><input id="f-sl" type="number" step="any" placeholder="off"></div>
        </div>
        <div id="bot-aprob"></div>
        <button class="btn btn-verde" id="f-crear">Crear rejilla</button>
        <div id="bot-msg"></div>
      </div>

      <div class="card">
        <h3>Gas del bot</h3>
        <p style="color:var(--ink-2);font-family:var(--sans);font-size:13px">El bot paga el gas de tus operaciones desde este tanque de BNB. Es tuyo y lo retiras cuando quieras.</p>
        <label>Saldo de gas</label>
        <div id="bot-gas" style="font-family:var(--display);color:var(--gold);font-size:20px">…</div>
        <label>Recargar BNB</label>
        <div class="gas-row">
          <input id="f-gas" type="number" step="any" placeholder="0.02">
          <button class="btn btn-oro" id="f-gasdep">Recargar</button>
        </div>
        <button class="btn btn-linea" id="f-gasret">Retirar todo el gas</button>
        <div id="bot-gasmsg"></div>

        <h3 style="margin-top:20px">Mis rejillas</h3>
        <div id="bot-rejillas"><p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Cargando…</p></div>
      </div>
    </div>
  </div>`;

  // eventos formulario
  $('f-base').onchange = (e) => { F.baseId = e.target.value; render(); };
  $('f-quote').onchange = (e) => { F.quoteId = e.target.value; render(); };
  host.querySelectorAll('.seg button').forEach((b) => b.onclick = () => {
    host.querySelectorAll('.seg button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); F.modo = b.dataset.modo;
  });
  $('f-crear').onclick = onCrear;
  $('f-gasdep').onclick = onDepositarGas;
  $('f-gasret').onclick = onRetirarGas;

  refrescarGas();
  refrescarAprobaciones();
  refrescarRejillas();
}

/* ================================================================== */
/* Aprobaciones                                                        */
/* ================================================================== */

async function refrescarAprobaciones() {
  const cuenta = wallet.cuentaActual(); if (!cuenta) return;
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const baseAddr = gb.dirDe(base), quoteAddr = gb.dirDe(quote);
  const cont = $('bot-aprob'); if (!cont) return;

  try {
    const [aB, aQ] = await Promise.all([
      gb.allowance(baseAddr, cuenta), gb.allowance(quoteAddr, cuenta)
    ]);
    const min = 1n; // basta con que haya allowance > 0 (aprobamos al máximo)
    let html = '';
    if (aB < min) html += `<button class="btn btn-linea" id="ap-base">Aprobar ${base.simbolo}</button>`;
    if (aQ < min) html += `<button class="btn btn-linea" id="ap-quote">Aprobar ${quote.simbolo}</button>`;
    cont.innerHTML = html;
    if ($('ap-base'))  $('ap-base').onclick  = () => aprobar(baseAddr, base.simbolo);
    if ($('ap-quote')) $('ap-quote').onclick = () => aprobar(quoteAddr, quote.simbolo);
  } catch (e) { /* silencioso */ }
}

async function aprobar(addr, simbolo) {
  const msg = $('bot-msg');
  aviso(msg, 'info', `Aprobando ${simbolo}… confirma en tu wallet.`);
  try { await gb.aprobarToken(addr); aviso(msg, 'info', `${simbolo} aprobado.`); refrescarAprobaciones(); }
  catch (e) { aviso(msg, 'err', 'No se pudo aprobar: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Gas                                                                 */
/* ================================================================== */

async function refrescarGas() {
  const cuenta = wallet.cuentaActual(); const el = $('bot-gas'); if (!cuenta || !el) return;
  try { const s = await gb.gasSaldo(cuenta); el.textContent = `${Number(gb.fmtBNB(s)).toFixed(5)} BNB`; }
  catch { el.textContent = '—'; }
}

async function onDepositarGas() {
  const v = parseFloat($('f-gas').value); const msg = $('bot-gasmsg');
  if (!(v > 0)) { aviso(msg, 'err', 'Pon una cantidad de BNB.'); return; }
  aviso(msg, 'info', 'Recargando gas… confirma en tu wallet.');
  try { await gb.depositarGas(v); aviso(msg, 'info', 'Gas recargado.'); refrescarGas(); }
  catch (e) { aviso(msg, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

async function onRetirarGas() {
  const cuenta = wallet.cuentaActual(); const msg = $('bot-gasmsg');
  try {
    const s = await gb.gasSaldo(cuenta);
    if (s <= 0n) { aviso(msg, 'err', 'No tienes gas para retirar.'); return; }
    aviso(msg, 'info', 'Retirando… confirma en tu wallet.');
    await gb.retirarGas(gb.fmtBNB(s)); aviso(msg, 'info', 'Gas retirado.'); refrescarGas();
  } catch (e) { aviso(msg, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Crear rejilla                                                       */
/* ================================================================== */

async function onCrear() {
  const msg = $('bot-msg');
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote),
    decBase: base.decimals, decQuote: quote.decimals,
    pMin: parseFloat($('f-min').value), pMax: parseFloat($('f-max').value),
    niveles: parseInt($('f-niv').value, 10),
    modo: F.modo,
    ordenQuoteHumano: parseFloat($('f-oq').value),
    ordenBaseHumano: parseFloat($('f-ob').value),
    slippageBps: Math.round((parseFloat($('f-slip').value) || 0) * 100),
    cooldownSeg: parseInt($('f-cd').value, 10) || 0,
    tpPrecio: parseFloat($('f-tp').value) || 0,
    slPrecio: parseFloat($('f-sl').value) || 0
  };
  if (!(p.pMin > 0 && p.pMax > p.pMin)) { aviso(msg, 'err', 'Revisa el rango: máximo debe ser mayor que mínimo.'); return; }
  if (!(p.niveles >= 2)) { aviso(msg, 'err', 'Pon al menos 2 cuadrículas.'); return; }
  if (!(p.ordenQuoteHumano > 0 && p.ordenBaseHumano > 0)) { aviso(msg, 'err', 'Pon el tamaño por compra y por venta.'); return; }

  aviso(msg, 'info', 'Calculando la rejilla con el precio real…');
  try {
    const config = await gb.construirConfig(p);
    aviso(msg, 'info', `Precio actual ~${config._Pnow.toLocaleString('en-US',{maximumFractionDigits:6})}. Creando rejilla… confirma en tu wallet.`);
    await gb.crearRejilla(config);
    recordarPar(wallet.cuentaActual(), config.base, config.quote, {
      decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo
    });
    aviso(msg, 'info', '¡Rejilla creada! El bot ya la está vigilando.');
    refrescarRejillas();
  } catch (e) {
    aviso(msg, 'err', 'No se pudo crear: ' + (e?.shortMessage || e?.message || e));
  }
}

/* ================================================================== */
/* Panel: mis rejillas                                                 */
/* ================================================================== */

async function refrescarRejillas() {
  const cuenta = wallet.cuentaActual(); const cont = $('bot-rejillas'); if (!cuenta || !cont) return;
  try {
    const claves = await gb.misRejillas(cuenta);
    if (!claves.length) { cont.innerHTML = `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Aún no tienes rejillas.</p>`; return; }
    cont.innerHTML = await pintarPorClaves(cuenta, claves);
    engancharBotonesRejilla(cuenta);
  } catch (e) {
    cont.innerHTML = `<div class="aviso err">No se pudieron cargar: ${e?.shortMessage || e?.message || e}</div>`;
  }
}

/* Guardamos el par (base,quote) por clave al crear, para poder mostrarlo luego. */
function recordarPar(cuenta, base, quote, extra) {
  const k = gb.claveDe(cuenta, base, quote);
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  m[k] = { base, quote, ...(extra || {}) };
  localStorage.setItem('bot-pares', JSON.stringify(m));
}

async function pintarPorClaves(cuenta, claves) {
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  const out = [];
  for (const clave of claves) {
    const par = m[clave];
    if (!par) continue; // sin par recordado (creada en otro dispositivo): se omite en v1
    try {
      const R = await gb.resumen(cuenta, par.base, par.quote);
      out.push(tarjetaRejilla(par, R));
    } catch (_) {}
  }
  return out.length ? out.join('') : `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Sin rejillas para mostrar en este dispositivo.</p>`;
}

function simboloDe(addr) {
  const w = gb.WBNB.toLowerCase();
  if (addr.toLowerCase() === w) return 'BNB';
  const m = LISTA_MONEDAS.find((x) => (x.address || '').toLowerCase() === addr.toLowerCase());
  return m ? m.simbolo : addr.slice(0, 6);
}

function tarjetaRejilla(par, R) {
  const decQ = par.decQuote ?? 18;
  const simB = par.simBase ?? simboloDe(par.base);
  const simQ = par.simQuote ?? simboloDe(par.quote);
  const gan = R.gananciaQuote;
  const ganN = Number(gb.fmt(gan < 0n ? -gan : gan, decQ));
  const ganCls = gan < 0n ? 'neg' : 'pos';
  const ganTxt = (gan < 0n ? '-' : '+') + ganN.toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' ' + simQ;
  const b = par.base, q = par.quote;
  return `<div class="rej" data-b="${b}" data-q="${q}">
    <div class="rej-top">
      <span class="rej-par">${simB} / ${simQ}</span>
      <span class="pill ${R.activa ? 'on' : 'off'}">${R.activa ? 'Activa' : 'Pausada'}</span>
    </div>
    <div class="stats">
      <div class="stat"><b>Ganancia</b><span class="${ganCls}">${ganTxt}</span></div>
      <div class="stat"><b>Ciclos</b><span>${R.ciclos}</span></div>
      <div class="stat"><b>Ops</b><span>${R.totalOps}</span></div>
      <div class="stat"><b>Cuadrículas</b><span>${R.niveles}</span></div>
      <div class="stat"><b>Activa (días)</b><span>${dias(R.creadaEn)}</span></div>
      <div class="stat"><b>Gas</b><span>${Number(gb.fmtBNB(R.gasSaldoWei)).toFixed(4)}</span></div>
    </div>
    <div class="rej-btns">
      <button class="btn btn-linea" data-acc="toggle">${R.activa ? 'Pausar' : 'Activar'}</button>
      <button class="btn btn-oro" data-acc="cerrar">Cerrar a estable</button>
      <button class="btn btn-rojo" data-acc="cancelar">Cancelar</button>
    </div>
    <div class="rej-msg"></div>
  </div>`;
}

function engancharBotonesRejilla(cuenta) {
  document.querySelectorAll('#bot .rej').forEach((el) => {
    const b = el.dataset.b, q = el.dataset.q;
    const msg = el.querySelector('.rej-msg');
    el.querySelectorAll('[data-acc]').forEach((btn) => btn.onclick = async () => {
      const acc = btn.dataset.acc;
      try {
        if (acc === 'toggle') {
          const R = await gb.resumen(cuenta, b, q);
          aviso(msg, 'info', 'Confirma en tu wallet…');
          await gb.activarRejilla(b, q, !R.activa);
        } else if (acc === 'cerrar') {
          aviso(msg, 'info', 'Cerrando y vendiendo a estable… confirma en tu wallet.');
          await gb.cerrarAhora(b, q);
        } else if (acc === 'cancelar') {
          aviso(msg, 'info', 'Cancelando… confirma en tu wallet.');
          await gb.cancelarRejilla(b, q);
        }
        refrescarRejillas();
      } catch (e) { aviso(msg, 'err', e?.shortMessage || e?.message || e); }
    });
  });
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */

function arrancar() {
  if (!$('bot')) return;
  render();
  wallet.alCambiar(() => render());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', arrancar);
} else {
  arrancar();
}
