/**
 * LA COLMENA — interfaz del bot de rejilla (para principiantes)
 * ============================================================
 * Se dibuja sola dentro de <section id="bot">. Lenguaje sencillo, botones (i)
 * que explican todo, gráfica con las cuadrículas, e inversión total en una cifra.
 */

import * as gb from './gridbot.js';
import * as wallet from './wallet.js';
import { MONEDAS, LISTA_MONEDAS } from './tokens.js';

const $ = (id) => document.getElementById(id);
const OPERABLES = LISTA_MONEDAS;

/* Explicaciones en lenguaje de calle (botón "i"). */
const INFO = {
  par: 'Elige qué moneda quieres comprar y vender, y contra cuál (lo normal es una estable como USDT). El bot comprará barato y venderá caro entre esas dos, solo.',
  rango: 'El precio más bajo y el más alto donde quieres que el bot trabaje. Compra cuando el precio baja y vende cuando sube, siempre dentro de ese rango. Si el precio se sale, el bot espera a que vuelva. ¿No sabes qué poner? Dale a "Sugerir".',
  cuadriculas: 'En cuántos escalones parte el rango. Más cuadrículas = muchas operaciones pequeñas y seguidas (bueno si el precio se mueve mucho). Menos = operaciones más grandes y espaciadas.',
  inversion: 'Cuánto dinero quieres poner a trabajar. El bot lo reparte entre las cuadrículas para ir comprando por partes cuando el precio baja. Mientras más pongas, más gana… y más arriesgas.',
  proteccion: 'Cuánta diferencia de precio aceptas al operar. Si en el momento justo el precio salta más que esto, el bot no opera para no comprarte caro. Si no sabes, déjalo en 1%.',
  ritmo: 'Tiempo mínimo entre una operación y otra. Sirve para que el bot no opere demasiado seguido. Déjalo en 0 y operará cada vez que pueda.',
  reparto: 'Cómo separa los escalones. "Parejo": todos a la misma distancia. "Proporcional": separados por porcentaje, mejor para monedas que se mueven mucho.',
  tp: 'Opcional. Si el precio sube hasta este número, el bot vende todo y termina, dejándote la ganancia. Como decir "cuando llegue aquí, me retiro contento".',
  sl: 'Opcional. Si el precio baja hasta este número, el bot vende todo para no seguir perdiendo. Un freno de emergencia.',
  gas: 'La red cobra unos centavos por cada operación (eso es el "gas", no es nuestra comisión). Deja aquí ~2 USD en BNB y el bot se encarga solo. Es tuyo: lo retiras cuando quieras.',
  ganancia: 'Lo que ya ganaste de verdad, con la comisión y el gas descontados. No es humo: es dinero que ya está en tu wallet.'
};

/* Estado del formulario. */
const F = { baseId: 'BNB', quoteId: 'USDT', modo: 'arit', precio: null, rutas: null, avanzado: false };
const moneda = (id) => MONEDAS[id];
const CARET = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84B' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

/* ================================================================== */
/* Estilos                                                             */
/* ================================================================== */
function inyectarEstilo() {
  if ($('bot-css')) return;
  const s = document.createElement('style'); s.id = 'bot-css';
  s.textContent = `
  #bot .wrap{max-width:1120px;margin:0 auto;padding:0 6px}
  #bot .lead{font-family:var(--sans);color:var(--ink-2);font-size:15px;margin:0 0 20px;max-width:640px}
  #bot .lead b{color:var(--gold)}
  #bot .cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:18px;align-items:start}
  #bot .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:16px;padding:20px}
  #bot .card h3{font-family:var(--display);color:var(--gold);margin:0 0 4px;font-size:17px}
  #bot .card .sub{font-family:var(--sans);color:var(--ink-3);font-size:12px;margin:0 0 16px}
  #bot .lab{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--ink-2);margin:16px 0 6px;text-transform:uppercase;letter-spacing:.6px}
  #bot .i-btn{width:16px;height:16px;border-radius:50%;border:1px solid var(--gold-soft);background:transparent;color:var(--gold-soft);
    font-family:var(--display);font-size:10px;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto}
  #bot .i-btn:hover{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  #bot input,#bot select{width:100%;box-sizing:border-box;background:#03110C;color:var(--ink);border:1px solid var(--line);
    border-radius:11px;padding:13px 14px;font-family:var(--mono);font-size:15px}
  #bot select{-webkit-appearance:none;appearance:none;padding-right:40px;
    background-image:url("${CARET}");background-repeat:no-repeat;background-position:right 14px center;background-size:12px}
  #bot input:focus,#bot select:focus{outline:none;border-color:var(--gold)}
  #bot .fila{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #bot .btn{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:14px;margin-top:14px;
    font-family:var(--display);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s}
  #bot .btn:hover{filter:brightness(1.1)} #bot .btn:disabled{opacity:.5;cursor:not-allowed}
  #bot .btn-oro{background:var(--gold);color:#1a1200}
  #bot .btn-verde{background:var(--neon);color:#03210f}
  #bot .btn-linea{background:transparent;border:1px solid var(--line);color:var(--ink)}
  #bot .btn-rojo{background:transparent;border:1px solid var(--rojo);color:var(--rojo)}
  #bot .btn-sm{margin-top:0;padding:10px;font-size:13px}
  #bot .link{background:none;border:none;color:var(--gold-soft);font-family:var(--mono);font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:14px}
  #bot .sug{background:none;border:1px solid var(--gold-soft);color:var(--gold);border-radius:8px;padding:6px 10px;font-family:var(--mono);font-size:11px;cursor:pointer}
  #bot .seg{display:flex;gap:6px}
  #bot .seg button{flex:1;padding:11px;border:1px solid var(--line);background:transparent;color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #bot .seg button.on{background:var(--gold);color:#1a1200;border-color:var(--gold);font-weight:700}
  #bot .avz{border-top:1px solid var(--line-soft);margin-top:18px;padding-top:6px}
  #bot .chart-card{padding:14px}
  #bot .chart{width:100%;height:auto;display:block;border-radius:12px;background:#020C08;border:1px solid var(--line-soft)}
  #bot .prev{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  #bot .prev .p{background:#04140E;border:1px solid var(--line-soft);border-radius:10px;padding:10px;text-align:center}
  #bot .prev .p b{display:block;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #bot .prev .p span{font-family:var(--display);font-size:16px;color:var(--ink)}
  #bot .gas{display:flex;align-items:center;justify-content:space-between;gap:10px;background:#04140E;border:1px solid var(--line-soft);border-radius:10px;padding:12px;margin-top:12px}
  #bot .gas .v{font-family:var(--display);color:var(--gold);font-size:18px}
  #bot .gas-row{display:flex;gap:8px;margin-top:8px}
  #bot .gas-row input{flex:1}
  #bot .gas-row .btn{width:auto;margin-top:0;white-space:nowrap;padding:12px 14px}
  #bot .aviso{font-family:var(--mono);font-size:12px;padding:11px;border-radius:9px;margin-top:12px}
  #bot .aviso.info{background:rgba(46,232,106,.08);color:var(--neon-lit);border:1px solid var(--neon-dim)}
  #bot .aviso.err{background:rgba(255,107,107,.08);color:var(--rojo);border:1px solid var(--rojo)}
  #bot .conectar{text-align:center;padding:50px 20px}
  #bot .colmenas{margin-top:22px}
  #bot .rej{border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:14px;background:#04140E}
  #bot .rej-top{display:flex;justify-content:space-between;align-items:center}
  #bot .rej-par{font-family:var(--display);color:var(--gold);font-size:16px}
  #bot .pill{font-family:var(--mono);font-size:10px;padding:4px 9px;border-radius:20px}
  #bot .pill.on{background:rgba(46,232,106,.15);color:var(--neon-lit)} #bot .pill.off{background:rgba(100,133,122,.15);color:var(--ink-3)}
  #bot .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
  #bot .stat{background:#020D09;border:1px solid var(--line-soft);border-radius:9px;padding:9px}
  #bot .stat b{display:block;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #bot .stat span{font-family:var(--display);font-size:15px;color:var(--ink)}
  #bot .stat span.pos{color:var(--neon-lit)} #bot .stat span.neg{color:var(--rojo)}
  #bot .rej-btns{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:12px}
  #bot .rej-btns .btn{margin-top:0;font-size:12px;padding:10px}
  #bot .rej-msg .aviso{margin-top:8px}
  #bot-pop{position:absolute;z-index:9999;max-width:280px;background:#0B2419;border:1px solid var(--gold-soft);border-radius:10px;
    padding:12px 14px;font-family:var(--sans);font-size:13px;color:var(--ink);box-shadow:0 10px 30px rgba(0,0,0,.5);display:none;line-height:1.5}
  body.solo-bot #jugar,body.solo-bot #bombo,body.solo-bot #mis-apuestas,body.solo-bot #charada,body.solo-bot #info,
  body.solo-bot .win-wrap,body.solo-bot .verso-card,body.solo-bot .foot,body.solo-bot .drum-extra{display:none !important}
  body.solo-bot #bot-sec{min-height:calc(100vh - 70px);padding-top:16px}
  @media(max-width:820px){#bot .cols{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
  const pop = document.createElement('div'); pop.id = 'bot-pop'; document.body.appendChild(pop);
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.i-btn') && e.target.id !== 'bot-pop') $('bot-pop').style.display = 'none';
  });
}

/* ================================================================== */
/* Utilidades                                                          */
/* ================================================================== */
function nfmt(n, d = 4) {
  if (!isFinite(n)) return '—';
  if (n !== 0 && Math.abs(n) < 0.0001) return n.toExponential(2);
  return n.toLocaleString('en-US', { maximumFractionDigits: d });
}
function dias(seg) { const s = Number(seg); return s ? Math.max(0, Math.floor((Date.now()/1000 - s)/86400)).toString() : '0'; }
function aviso(el, tipo, msg) { if (el) el.innerHTML = `<div class="aviso ${tipo}">${msg}</div>`; }
function iBtn(k) { return `<button class="i-btn" data-info="${k}" type="button">i</button>`; }

function abrirPop(btn) {
  const pop = $('bot-pop'); pop.textContent = INFO[btn.dataset.info] || '';
  const r = btn.getBoundingClientRect();
  pop.style.display = 'block';
  pop.style.left = Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - 300) + 'px';
  pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
}

/* ================================================================== */
/* Gráfica de la rejilla                                               */
/* ================================================================== */
function graficaSVG() {
  const W = 560, H = 300, padL = 66, padR = 16, padT = 14, padB = 14;
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value);
  const n = parseInt($('f-niv')?.value, 10);
  const precio = F.precio;
  if (!(pMin > 0 && pMax > pMin && n >= 2)) {
    return `<svg class="chart" viewBox="0 0 ${W} ${H}"><text x="${W/2}" y="${H/2}" fill="#64857A" font-family="IBM Plex Mono" font-size="13" text-anchor="middle">Pon un rango para ver la rejilla</text></svg>`;
  }
  const y = (p) => padT + (H - padT - padB) * (1 - (p - pMin) / (pMax - pMin));
  const modo = F.modo;
  const lineas = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const Pi = modo === 'geo' ? pMin * Math.pow(pMax / pMin, t) : pMin + (pMax - pMin) * t;
    const yy = y(Pi).toFixed(1);
    const compra = precio ? Pi < precio : true;
    const col = compra ? 'var(--neon)' : 'var(--gold)';
    lineas.push(`<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="${col}" stroke-width="1.4" opacity=".75"/>`);
  }
  let precioLinea = '';
  if (precio && precio >= pMin && precio <= pMax) {
    const yp = y(precio).toFixed(1);
    precioLinea = `<line x1="${padL}" y1="${yp}" x2="${W-padR}" y2="${yp}" stroke="#E4F5EF" stroke-width="2" stroke-dasharray="5 4"/>
      <text x="${W-padR}" y="${(y(precio)-6).toFixed(1)}" fill="#E4F5EF" font-family="IBM Plex Mono" font-size="11" text-anchor="end">precio ahora ${nfmt(precio,6)}</text>`;
  }
  const ejes = `
    <text x="8" y="${padT+10}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${nfmt(pMax,6)}</text>
    <text x="8" y="${H-padB}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${nfmt(pMin,6)}</text>
    <text x="${padL}" y="${H-2}" fill="#4DFF7A" font-family="IBM Plex Mono" font-size="9">● compra</text>
    <text x="${padL+70}" y="${H-2}" fill="#E8B84B" font-family="IBM Plex Mono" font-size="9">● venta</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${lineas.join('')}${precioLinea}${ejes}</svg>`;
}

/* ================================================================== */
/* Render                                                              */
/* ================================================================== */
function render() {
  const host = $('bot'); if (!host) return;
  inyectarEstilo();

  if (!wallet.cuentaActual()) {
    host.innerHTML = `<div class="wrap"><div class="card conectar">
      <h3>La Colmena</h3>
      <p class="lead" style="margin:12px auto">Pon tu dinero a trabajar solo: el bot <b>compra barato y vende caro</b> por ti, día y noche, mientras duermes. Tú guardas tus monedas; nosotros no tocamos tu dinero.</p>
      <button class="btn btn-oro" id="bot-conectar" style="max-width:280px;margin:0 auto">Conectar wallet</button>
    </div></div>`;
    $('bot-conectar').onclick = () => wallet.conectar().catch(() => {});
    return;
  }

  const opts = OPERABLES.map((m) => m.id);
  const sel = (val, exc) => opts.filter((id) => id !== exc)
    .map((id) => `<option value="${id}" ${id === val ? 'selected' : ''}>${moneda(id).simbolo}</option>`).join('');

  host.innerHTML = `<div class="wrap">
    <p class="lead">Elige una moneda, dime <b>cuánto quieres invertir</b> y el bot hace el resto: compra cuando baja, vende cuando sube, solo. Toca la <b>(i)</b> de cada cosa si no sabes qué es.</p>
    <div class="cols">
      <div class="card">
        <h3>Arma tu colmena</h3>
        <p class="sub">Todo lo básico está aquí. Lo demás, en "Opciones avanzadas".</p>

        <div class="lab">Moneda ${iBtn('par')}</div>
        <div class="fila">
          <select id="f-base">${sel(F.baseId, F.quoteId)}</select>
          <select id="f-quote">${sel(F.quoteId, F.baseId)}</select>
        </div>

        <div class="lab">Rango de precio ${iBtn('rango')}
          <button class="sug" id="f-sug" type="button" style="margin-left:auto">Sugerir</button></div>
        <div class="fila">
          <input id="f-min" type="number" step="any" placeholder="precio bajo">
          <input id="f-max" type="number" step="any" placeholder="precio alto">
        </div>

        <div class="fila">
          <div><div class="lab">Cuadrículas ${iBtn('cuadriculas')}</div><input id="f-niv" type="number" min="2" max="100" value="20"></div>
          <div><div class="lab">Inversión (${moneda(F.quoteId).simbolo}) ${iBtn('inversion')}</div><input id="f-total" type="number" step="any" placeholder="0.00"></div>
        </div>

        <button class="link" id="f-toggleavz">${F.avanzado ? '− Ocultar' : '+ Opciones avanzadas'}</button>
        <div class="avz" id="f-avz" style="${F.avanzado ? '' : 'display:none'}">
          <div class="lab">Reparto ${iBtn('reparto')}</div>
          <div class="seg" id="f-modo">
            <button data-modo="arit" class="${F.modo==='arit'?'on':''}">Parejo</button>
            <button data-modo="geo" class="${F.modo==='geo'?'on':''}">Proporcional</button>
          </div>
          <div class="fila">
            <div><div class="lab">Protección precio % ${iBtn('proteccion')}</div><input id="f-slip" type="number" step="any" value="1"></div>
            <div><div class="lab">Ritmo mín (s) ${iBtn('ritmo')}</div><input id="f-cd" type="number" step="1" value="0"></div>
          </div>
          <div class="fila">
            <div><div class="lab">Cerrar con ganancia ${iBtn('tp')}</div><input id="f-tp" type="number" step="any" placeholder="off"></div>
            <div><div class="lab">Protegerme de caídas ${iBtn('sl')}</div><input id="f-sl" type="number" step="any" placeholder="off"></div>
          </div>
        </div>

        <div id="bot-aprob"></div>
        <button class="btn btn-verde" id="f-crear">Encender la colmena</button>
        <div id="bot-msg"></div>
      </div>

      <div>
        <div class="card chart-card">
          <div id="bot-chart">${graficaSVG()}</div>
          <div class="prev" id="bot-prev">
            <div class="p"><b>Precio ahora</b><span id="pv-precio">—</span></div>
            <div class="p"><b>Compra en</b><span id="pv-compras">—</span></div>
            <div class="p"><b>Por compra</b><span id="pv-orden">—</span></div>
          </div>
          <div class="gas">
            <div><div class="lab" style="margin:0">Gas del bot ${iBtn('gas')}</div><div class="v" id="bot-gas">…</div></div>
          </div>
          <div class="gas-row">
            <input id="f-gas" type="number" step="any" placeholder="0.02 BNB">
            <button class="btn btn-oro btn-sm" id="f-gasdep">Recargar</button>
          </div>
          <button class="btn btn-linea btn-sm" id="f-gasret">Retirar mi gas</button>
          <div id="bot-gasmsg"></div>
        </div>
      </div>
    </div>

    <div class="colmenas card">
      <h3>Mis colmenas</h3>
      <div id="bot-rejillas"><p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Cargando…</p></div>
    </div>
  </div>`;

  // eventos
  $('f-base').onchange = (e) => { F.baseId = e.target.value; F.precio = null; F.rutas = null; render(); cargarPrecio(); };
  $('f-quote').onchange = (e) => { F.quoteId = e.target.value; F.precio = null; F.rutas = null; render(); cargarPrecio(); };
  $('f-toggleavz').onclick = () => { F.avanzado = !F.avanzado; render(); };
  host.querySelectorAll('#f-modo button').forEach((b) => b.onclick = () => {
    host.querySelectorAll('#f-modo button').forEach((x) => x.classList.remove('on'));
    b.classList.add('on'); F.modo = b.dataset.modo; actualizarVista();
  });
  ['f-min','f-max','f-niv','f-total'].forEach((id) => { const e = $(id); if (e) e.oninput = actualizarVista; });
  $('f-sug').onclick = sugerirRango;
  $('f-crear').onclick = onCrear;
  $('f-gasdep').onclick = onDepositarGas;
  $('f-gasret').onclick = onRetirarGas;
  host.querySelectorAll('.i-btn').forEach((b) => b.onclick = (e) => { e.stopPropagation(); abrirPop(b); });

  cargarPrecio();
  refrescarGas();
  refrescarAprobaciones();
  refrescarRejillas();
}

/* ================================================================== */
/* Precio + vista viva                                                 */
/* ================================================================== */
async function cargarPrecio() {
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  try {
    const r = await gb.precioPar(gb.dirDe(base), gb.dirDe(quote), base.decimals, quote.decimals);
    F.precio = r.precio; F.rutas = r.rutas;
  } catch { F.precio = null; }
  actualizarVista();
}

function actualizarVista() {
  const ch = $('bot-chart'); if (ch) ch.innerHTML = graficaSVG();
  if ($('pv-precio')) $('pv-precio').textContent = F.precio ? nfmt(F.precio, 6) : '—';
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value);
  const n = parseInt($('f-niv')?.value, 10), total = parseFloat($('f-total')?.value);
  if (F.precio && pMin > 0 && pMax > pMin && n >= 2) {
    let nBuy = 0;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const Pi = F.modo === 'geo' ? pMin * Math.pow(pMax/pMin, t) : pMin + (pMax - pMin) * t;
      if (Pi < F.precio) nBuy++;
    }
    if ($('pv-compras')) $('pv-compras').textContent = `${nBuy} niveles`;
    if ($('pv-orden')) $('pv-orden').textContent = (total > 0 && nBuy > 0)
      ? nfmt(total / nBuy, 2) + ' ' + moneda(F.quoteId).simbolo : '—';
  } else {
    if ($('pv-compras')) $('pv-compras').textContent = '—';
    if ($('pv-orden')) $('pv-orden').textContent = '—';
  }
}

function sugerirRango() {
  if (!F.precio) { aviso($('bot-msg'), 'err', 'Espera un segundo a que cargue el precio y vuelve a intentar.'); return; }
  $('f-min').value = (F.precio * 0.9).toPrecision(6);
  $('f-max').value = (F.precio * 1.1).toPrecision(6);
  if (!$('f-niv').value) $('f-niv').value = 20;
  actualizarVista();
}

/* ================================================================== */
/* Aprobaciones                                                        */
/* ================================================================== */
async function refrescarAprobaciones() {
  const cuenta = wallet.cuentaActual(); const cont = $('bot-aprob'); if (!cuenta || !cont) return;
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const bA = gb.dirDe(base), qA = gb.dirDe(quote);
  try {
    const [aB, aQ] = await Promise.all([gb.allowance(bA, cuenta), gb.allowance(qA, cuenta)]);
    let html = '';
    if (aQ < 1n) html += `<button class="btn btn-linea" id="ap-quote">Permitir ${quote.simbolo} (una vez)</button>`;
    if (aB < 1n) html += `<button class="btn btn-linea" id="ap-base">Permitir ${base.simbolo} (una vez)</button>`;
    cont.innerHTML = html;
    if ($('ap-base')) $('ap-base').onclick = () => aprobar(bA, base.simbolo);
    if ($('ap-quote')) $('ap-quote').onclick = () => aprobar(qA, quote.simbolo);
  } catch {}
}
async function aprobar(addr, sim) {
  const m = $('bot-msg'); aviso(m, 'info', `Dando permiso para ${sim}… confirma en tu wallet.`);
  try { await gb.aprobarToken(addr); aviso(m, 'info', `${sim} permitido.`); refrescarAprobaciones(); }
  catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Gas                                                                 */
/* ================================================================== */
async function refrescarGas() {
  const cuenta = wallet.cuentaActual(); const el = $('bot-gas'); if (!cuenta || !el) return;
  try { const s = await gb.gasSaldo(cuenta); el.textContent = `${Number(gb.fmtBNB(s)).toFixed(5)} BNB`; } catch { el.textContent = '—'; }
}
async function onDepositarGas() {
  const v = parseFloat($('f-gas').value); const m = $('bot-gasmsg');
  if (!(v > 0)) { aviso(m, 'err', 'Escribe cuánto BNB quieres poner.'); return; }
  aviso(m, 'info', 'Recargando… confirma en tu wallet.');
  try { await gb.depositarGas(v); aviso(m, 'info', 'Gas recargado.'); refrescarGas(); }
  catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}
async function onRetirarGas() {
  const cuenta = wallet.cuentaActual(); const m = $('bot-gasmsg');
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
  const m = $('bot-msg');
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    pMin: parseFloat($('f-min').value), pMax: parseFloat($('f-max').value),
    niveles: parseInt($('f-niv').value, 10), modo: F.modo,
    totalQuoteHumano: parseFloat($('f-total').value),
    slippageBps: Math.round((parseFloat($('f-slip')?.value) || 1) * 100),
    cooldownSeg: parseInt($('f-cd')?.value, 10) || 0,
    tpPrecio: parseFloat($('f-tp')?.value) || 0, slPrecio: parseFloat($('f-sl')?.value) || 0,
    rutas: F.rutas
  };
  if (!(p.pMin > 0 && p.pMax > p.pMin)) { aviso(m, 'err', 'Revisa el rango: el precio alto debe ser mayor que el bajo. Prueba "Sugerir".'); return; }
  if (!(p.niveles >= 2)) { aviso(m, 'err', 'Pon al menos 2 cuadrículas.'); return; }
  if (!(p.totalQuoteHumano > 0)) { aviso(m, 'err', '¿Cuánto quieres invertir?'); return; }

  aviso(m, 'info', 'Preparando tu colmena con el precio real…');
  try {
    const config = await gb.construirConfig(p);
    aviso(m, 'info', 'Encendiendo… confirma en tu wallet.');
    await gb.crearRejilla(config);
    recordarPar(wallet.cuentaActual(), config.base, config.quote, {
      decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo
    });
    aviso(m, 'info', '¡Colmena encendida! El bot ya la está vigilando. Asegúrate de tener gas cargado.');
    refrescarRejillas();
  } catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Panel                                                               */
/* ================================================================== */
function recordarPar(cuenta, base, quote, extra) {
  const k = gb.claveDe(cuenta, base, quote);
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  m[k] = { base, quote, ...(extra || {}) };
  localStorage.setItem('bot-pares', JSON.stringify(m));
}
function simboloDe(addr) {
  if (addr.toLowerCase() === gb.WBNB.toLowerCase()) return 'BNB';
  const m = LISTA_MONEDAS.find((x) => (x.address || '').toLowerCase() === addr.toLowerCase());
  return m ? m.simbolo : addr.slice(0, 6);
}
async function refrescarRejillas() {
  const cuenta = wallet.cuentaActual(); const cont = $('bot-rejillas'); if (!cuenta || !cont) return;
  try {
    const claves = await gb.misRejillas(cuenta);
    if (!claves.length) { cont.innerHTML = `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Aún no tienes colmenas. Arma la primera arriba.</p>`; return; }
    const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
    const out = [];
    for (const clave of claves) {
      const par = m[clave]; if (!par) continue;
      try { out.push(tarjeta(par, await gb.resumen(cuenta, par.base, par.quote))); } catch {}
    }
    cont.innerHTML = out.length ? out.join('') : `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Sin colmenas para mostrar en este dispositivo.</p>`;
    enganchar(cuenta);
  } catch (e) { cont.innerHTML = `<div class="aviso err">No se pudieron cargar: ${e?.shortMessage || e?.message || e}</div>`; }
}
function tarjeta(par, R) {
  const decQ = par.decQuote ?? 18;
  const simB = par.simBase ?? simboloDe(par.base), simQ = par.simQuote ?? simboloDe(par.quote);
  const gan = R.gananciaQuote, neg = gan < 0n;
  const ganN = Number(gb.fmt(neg ? -gan : gan, decQ));
  const ganTxt = (neg ? '−' : '+') + nfmt(ganN, 4) + ' ' + simQ;
  return `<div class="rej" data-b="${par.base}" data-q="${par.quote}">
    <div class="rej-top">
      <span class="rej-par">${simB} / ${simQ}</span>
      <span class="pill ${R.activa ? 'on' : 'off'}">${R.activa ? 'Trabajando' : 'Pausada'}</span>
    </div>
    <div class="stats">
      <div class="stat"><b>Ganancia real ${iBtn('ganancia')}</b><span class="${neg ? 'neg' : 'pos'}">${ganTxt}</span></div>
      <div class="stat"><b>Ventas hechas</b><span>${R.ciclos}</span></div>
      <div class="stat"><b>Operaciones</b><span>${R.totalOps}</span></div>
      <div class="stat"><b>Cuadrículas</b><span>${R.niveles}</span></div>
      <div class="stat"><b>Días activa</b><span>${dias(R.creadaEn)}</span></div>
      <div class="stat"><b>Gas</b><span>${Number(gb.fmtBNB(R.gasSaldoWei)).toFixed(4)}</span></div>
    </div>
    <div class="rej-btns">
      <button class="btn btn-linea" data-acc="toggle">${R.activa ? 'Pausar' : 'Reanudar'}</button>
      <button class="btn btn-oro" data-acc="cerrar">Vender y cerrar</button>
      <button class="btn btn-rojo" data-acc="cancelar">Apagar</button>
    </div>
    <div class="rej-msg"></div>`;
}
function enganchar(cuenta) {
  document.querySelectorAll('#bot .rej').forEach((el) => {
    const b = el.dataset.b, q = el.dataset.q, m = el.querySelector('.rej-msg');
    el.querySelectorAll('.i-btn').forEach((btn) => btn.onclick = (e) => { e.stopPropagation(); abrirPop(btn); });
    el.querySelectorAll('[data-acc]').forEach((btn) => btn.onclick = async () => {
      try {
        if (btn.dataset.acc === 'toggle') { const R = await gb.resumen(cuenta, b, q); aviso(m, 'info', 'Confirma en tu wallet…'); await gb.activarRejilla(b, q, !R.activa); }
        else if (btn.dataset.acc === 'cerrar') { aviso(m, 'info', 'Vendiendo todo a estable… confirma.'); await gb.cerrarAhora(b, q); }
        else if (btn.dataset.acc === 'cancelar') { aviso(m, 'info', 'Apagando… confirma.'); await gb.cancelarRejilla(b, q); }
        refrescarRejillas();
      } catch (e) { aviso(m, 'err', e?.shortMessage || e?.message || e); }
    });
  });
}

/* ================================================================== */
/* Vista limpia + arranque                                             */
/* ================================================================== */
function wireVistaLimpia() {
  document.querySelectorAll('a[href="#bot"]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault(); document.body.classList.add('solo-bot'); window.scrollTo(0, 0); render();
    $('menu-movil')?.classList.remove('open'); $('btn-menu')?.classList.remove('on');
  }));
  document.querySelectorAll('.nav-links a:not([href="#bot"]), .menu-movil a:not([href="#bot"]), a.brand')
    .forEach((a) => a.addEventListener('click', () => document.body.classList.remove('solo-bot')));
}
function arrancar() {
  if (!$('bot')) return;
  render(); wireVistaLimpia();
  wallet.alCambiar(() => render());
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
