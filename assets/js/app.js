/* En el móvil, los campos numéricos pintan unas flechitas que
   algunos navegadores no dejan quitar por CSS. Con type=text más
   inputmode=decimal sale el mismo teclado y ninguna flecha. */
const _tipoNumCC = () => (window.matchMedia('(max-width: 760px)').matches ? 'text' : 'number');

/**
 * LA BOLITA — interfaz
 *
 * FLUJO OBLIGATORIO. Cada paso desbloquea el siguiente:
 *
 *     1. Conectar wallet
 *     2. Elegir moneda  (solo las admitidas; se marcan las que tienes)
 *     3. Elegir juego
 *     4. Marcar números y apostar
 *
 * La banca es simulada. Cuando el contrato esté desplegado, se sustituyen las
 * funciones de `S.banca` por llamadas a roundSnapshot() y bet(); el resto de
 * la interfaz no cambia.
 */

import { MODOS, LISTA_MODOS, topeApuesta, disponible, repartir, margen } from './economics.js';
import { MONEDAS, LISTA_MONEDAS, formatear, partirSaldo, enUnidadPequena } from './tokens.js';
import { CHARADA, FAMILIAS, pad2, nombreDe } from './charada.js';
import { versoDelDia } from './versos.js';
import { proximaTirada, cuentaAtras, fechaHora, soloHora, hora12, fechaHora12 } from './draws.js';
import { resultadoOficial, leerPick3 } from './florida.js';
import { lanzarConfeti } from './confetti.js';
import { avisarTirada, activarNotif, notifActivas, notifConSonido } from './notificaciones.js';
import { pintarCompra } from './comprar.js';
import * as wallet from './wallet.js';
import { ICONOS, ponerIcono } from './icons.js';
import { logoDe, precios, enDolares } from './prices.js';
import * as CUP from './cup.js';
import * as contrato from './contrato.js';

const EXPOSICION_BPS = 2000;

/** Banca simulada, en unidades de cada moneda. */
const BANCA = { BNB: 5, USDT: 500, USDC: 500, BTCB: 0.05, ETH: 1.5 };

const S = {
  moneda: null,
  modo: null,
  saldos: {},
  seleccion: [],        // [{clave, valores:[], modo, fijado?}]
  ocupado: {},          // clave -> ya apostado por otros
  girando: false,
  filtro: null,
  ronda: 1,
  precios: {},
  ultimosNumeros: null,
  charadaAbierta: false,
  limitados: []
};

const $  = (id) => document.getElementById(id);
const $$ = (s) => [...document.querySelectorAll(s)];

const banca = () => (S.moneda ? BANCA[S.moneda.id] ?? 0 : 0);
const fmt = (n, opts) => (S.moneda ? formatear(n, S.moneda, opts) : '—');

/**
 * Mínimo de apuesta POR NÚMERO, en cripto de la moneda actual.
 * Parte de 7 CUP (MIN_CUP) y lo convierte a la cripto usando el precio.
 * Si no hay precio, cae al mínimo del contrato de esa moneda.
 */
function minPorNumeroCripto() {
  if (!S.moneda) return 0;
  const enCripto = CUP.cupAcripto(CUP.MIN_CUP, S.moneda.id, S.precios);
  if (enCripto && enCripto > 0) return enCripto;
  return S.moneda.minApuesta ?? 0;
}

/**
 * Lee el importe del input y lo devuelve SIEMPRE en cripto (unidades de la
 * moneda), sin importar si el usuario lo escribió en CUP o en cripto.
 * Todo el resto del código trabaja en cripto; esta es la única traducción.
 */
function totalEnCripto() {
  const escrito = parseFloat($('monto').value) || 0;
  if (escrito <= 0 || !S.moneda) return 0;
  if (CUP.verEnCUP()) {
    const cripto = CUP.cupAcripto(escrito, S.moneda.id, S.precios);
    // Si aún no hay precio, no se puede convertir: se toma como cripto directo
    // (raro; los precios cargan al inicio).
    return cripto === null ? escrito : cripto;
  }
  return escrito;
}

/**
 * Muestra una cantidad de cripto en la vista activa (CUP por defecto, o cripto).
 * Punto único para pintar importes/pagos/ganancias de forma coherente.
 */
function mostrarValor(cantidadCripto, moneda = S.moneda) {
  return CUP.mostrar(cantidadCripto, moneda, S.precios,
    (c, m) => (m ? formatear(c, m) : String(c)));
}

/* ================================================================== */
/* Avisos                                                              */
/* ================================================================== */

let cargando = 0;
function cargar(activo) {
  cargando = Math.max(0, cargando + (activo ? 1 : -1));
  $('loader').classList.toggle('on', cargando > 0);
}

let tToast = null;
function aviso(txt, err = false) {
  const t = $('toast');
  t.textContent = txt;
  t.className = 'toast show' + (err ? ' err' : '');
  clearTimeout(tToast);
  tToast = setTimeout(() => { t.className = 'toast'; }, 3400);
}

/* ================================================================== */
/* Paso 1 — wallet                                                     */
/* ================================================================== */

function pintarWallet() {
  const cuenta = wallet.cuentaActual();
  const btn = $('btn-wallet');
  const off = $('btn-off');
  const pill = $('net');

  if (cuenta) {
    const info = wallet.walletInfo?.();
    const icono = logoDeWallet(info);
    // En móvil, solo el logo de la wallet (más compacto). En escritorio,
    // el logo + un trozo de la dirección.
    if (icono) {
      btn.innerHTML =
        `<img class="bw-logo" src="${icono}" alt="${info?.name || 'wallet'}">` +
        `<span class="bw-addr">${wallet.abreviar(cuenta)}</span>`;
    } else {
      btn.textContent = wallet.abreviar(cuenta);
    }
    btn.classList.add('connected');
    off.classList.add('show');
    pill.classList.add('show');
    pill.classList.toggle('bad', !wallet.esRedCorrecta());
    $('net-txt').textContent = wallet.esRedCorrecta() ? 'BNB Chain' : 'Cambiar red';
  } else {
    btn.textContent = 'Conectar wallet';
    btn.classList.remove('connected');
    off.classList.remove('show');
    pill.classList.remove('show');
    S.saldos = {};   // se conserva lo elegido: solo se pierden los saldos
  }

  pintarTodo();
}

/**
 * Logo de la wallet conectada. Si vino por EIP-6963 trae su propio icono
 * (data-URI). Si no, usamos un logo conocido según la clave adivinada.
 */
function logoDeWallet(info) {
  if (!info) return null;
  if (info.icon) return info.icon;   // EIP-6963 trae el icono embebido

  const L = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/';
  const LOGOS = {
    metamask: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/SVG_MetaMask_Icon_Color.svg',
    trust: 'https://trustwallet.com/assets/images/media/assets/TWT.png',
    phantom: 'https://raw.githubusercontent.com/phantom/phantom-brand/main/phantom-icon-purple.svg',
    coinbase: L + 'ethereum/assets/0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984/logo.png'
  };
  return LOGOS[info.clave] || null;
}

async function pulsarConectar() {
  if (wallet.cuentaActual()) {
    if (!wallet.esRedCorrecta()) {
      try { await wallet.cambiarARedCorrecta(); }
      catch { aviso('No se pudo cambiar de red', true); }
    }
    return;
  }
  const diag = wallet.diagnostico();
  if (!diag.ok) { aviso(diag.motivo, true); return; }

  try {
    await wallet.conectar();
    aviso('Wallet conectada');
    cargarSaldos();
  } catch (e) {
    aviso(e.message === 'NO_WALLET' ? wallet.diagnostico().motivo : 'Conexión cancelada', true);
  }
}

async function pulsarDesconectar() {
  await wallet.desconectar();
  aviso('Wallet desconectada');
}

async function cargarSaldos() {
  if (!wallet.cuentaActual()) return;
  cargar(true);
  try {
    S.saldos = await wallet.saldosTodas();
    pintarMonedas();
    pintarSaldo();
  } finally {
    cargar(false);
  }
}

/** Precios de CoinGecko. Si falla, la página sigue igual sin el equivalente. */
async function cargarPrecios() {
  cargar(true);
  try {
    S.precios = await precios();
    pintarSaldo();
  } finally {
    cargar(false);
  }
}

/* ================================================================== */
/* Mis apuestas de la tirada actual (leídas del contrato)              */
/* ================================================================== */

const NOMBRE_MODO = { 0: 'Terminal', 1: 'Número', 2: 'Parlé' };

/** Lee del contrato las apuestas del jugador en la tirada actual y las pinta. */
async function refrescarMisApuestas() {
  const sec = $('mis-apuestas');
  if (!sec) return;

  const cuenta = wallet.cuentaActual();
  if (!cuenta || !wallet.esRedCorrecta()) { sec.hidden = true; return; }

  const prox = proximaTirada(new Date());
  const idTirada = contrato.idTiradaDe(prox.sorteo, prox.tirada.id);

  let apuestas = [];
  try { apuestas = await contrato.misApuestas(cuenta, idTirada); }
  catch { apuestas = []; }

  pintarMisApuestas(apuestas, prox);
}

function pintarMisApuestas(apuestas, prox) {
  const sec = $('mis-apuestas');
  const lista = $('ma-lista');
  const vacio = $('ma-vacio');
  const sub = $('ma-sub');
  if (!sec || !lista) return;

  sec.hidden = false;

  const turno = prox?.tirada?.nombre ? `Tirada de ${prox.tirada.nombre}` : 'Tirada actual';
  if (sub) sub.textContent = `${turno} · esperando el sorteo`;

  if (!apuestas.length) {
    lista.innerHTML = '';
    if (vacio) vacio.hidden = false;
    return;
  }
  if (vacio) vacio.hidden = true;

  lista.innerHTML = apuestas.map((a) => {
    const mon = a.tokenId ? MONEDAS[a.tokenId] : null;
    const nums = a.modo === 2
      ? `<span class="ma-n">${pad2(a.numeroA)}</span><span class="ma-n">${pad2(a.numeroB)}</span>`
      : `<span class="ma-n">${a.modo === 0 ? a.numeroA : pad2(a.numeroA)}</span>`;
    const imp = mon ? mostrarValor(a.importe, mon) : a.importe;
    const prem = mon ? mostrarValor(a.premio, mon) : a.premio;
    return `
      <div class="ma-row">
        <span class="ma-modo">${NOMBRE_MODO[a.modo] ?? '—'}</span>
        <div class="ma-mid">
          <div class="ma-nums">${nums}</div>
          <span class="ma-imp">Apostaste ${imp}</span>
        </div>
        <span class="ma-premio">${prem}<small>SI ACIERTAS</small></span>
      </div>`;
  }).join('');
}

/* ================================================================== */

// Saldos ganados por moneda (lo que el contrato debe al jugador), en decimal.
S.ganancias = {};

/**
 * Lee del contrato cuánto tiene ganado el jugador en cada moneda y repinta
 * el panel. Silencioso: si la wallet no está o la red es otra, oculta el panel
 * sin molestar.
 */
async function refrescarGanancias() {
  const cuenta = wallet.cuentaActual();
  const wrap = $('win-wrap');
  if (!wrap) return;

  if (!cuenta || !wallet.esRedCorrecta()) {
    S.ganancias = {};
    wrap.hidden = true;
    return;
  }

  try {
    S.ganancias = await contrato.saldosRetirables(cuenta);
  } catch {
    S.ganancias = {};
  }
  pintarGanancias();
}

/** Pinta las filas del panel. Oculta todo el panel si no hay nada que cobrar. */
function pintarGanancias() {
  const wrap = $('win-wrap');
  const lista = $('win-list');
  if (!wrap || !lista) return;

  // Monedas con saldo ganado > 0, de mayor a menor.
  const conSaldo = LISTA_MONEDAS
    .map((m) => ({ m, monto: S.ganancias[m.id] ?? 0 }))
    .filter((x) => x.monto > 0)
    .sort((a, b) => b.monto - a.monto);

  if (conSaldo.length === 0) {
    wrap.hidden = true;
    lista.innerHTML = '';
    return;
  }

  wrap.hidden = false;
  lista.innerHTML = '';

  for (const { m, monto } of conSaldo) {
    const logo = logoDe(m.id);
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'win-row';
    row.dataset.moneda = m.id;

    const montoTxt = mostrarValor(monto, m);

    row.innerHTML =
      (logo
        ? `<img class="wr-logo" src="${logo}" alt="${m.simbolo}" onerror="this.style.display='none'">`
        : `<span class="wr-logo" style="display:grid;place-items:center;color:${m.color}">${m.icono}</span>`) +
      `<span class="wr-mid">
         <span class="wr-sim">${m.simbolo}</span>
         <span class="wr-sub">Ganado · listo para cobrar</span>
       </span>
       <span class="wr-monto">${montoTxt}</span>
       <span class="wr-cta">Cobrar</span>`;

    row.addEventListener('click', () => cobrarGanancia(m, row));
    lista.appendChild(row);
  }
}

/** Cobra (retira) el saldo ganado de una moneda tocando su fila. */
async function cobrarGanancia(moneda, row) {
  const cuenta = wallet.cuentaActual();
  if (!cuenta) { pulsarConectar(); return; }

  if (!wallet.esRedCorrecta()) {
    try { await wallet.cambiarARedCorrecta(); }
    catch { aviso('Cambia a BNB Chain para cobrar', true); return; }
  }

  if (row.classList.contains('cobrando')) return;   // evitar doble toque
  row.classList.add('cobrando');
  row.disabled = true;
  const cta = row.querySelector('.wr-cta');
  const ctaPrev = cta ? cta.textContent : '';
  if (cta) cta.textContent = 'Cobrando…';

  cargar(true);
  try {
    const hash = await contrato.retirar(cuenta, moneda);
    aviso('Cobro enviado, esperando confirmación…');
    await contrato.esperarRecibo(hash);
    aviso(`¡Cobrado! ${formatear(S.ganancias[moneda.id] ?? 0, moneda)}`);
    lanzarConfeti();
    await refrescarGanancias();   // el saldo de esa moneda ya debe ser 0
  } catch (e) {
    const msg = e?.message === 'TX_FALLIDA'
      ? 'La transacción fue rechazada por el contrato'
      : e?.code === 4001 || /reject/i.test(e?.message || '')
      ? 'Cancelaste el cobro'
      : 'No se pudo completar el cobro. Intenta de nuevo.';
    aviso(msg, true);
    row.classList.remove('cobrando');
    row.disabled = false;
    if (cta) cta.textContent = ctaPrev;
  } finally {
    cargar(false);
  }
}

/* ================================================================== */
/* Paso 2 — moneda                                                     */
/* ================================================================== */

function pintarMonedas() {
  const host = $('monedas');
  const bloque = $('bloque-moneda');
  const conectado = Boolean(wallet.cuentaActual());

  // Se puede mirar y elegir sin wallet. La wallet hace falta para APOSTAR.
  bloque.dataset.estado = S.moneda ? 'hecho' : 'activo';
  $('hint-moneda').textContent = conectado
    ? 'Se marcan las que tienes en tu wallet'
    : 'Conecta tu wallet para ver tus saldos';

  host.innerHTML = '';

  for (const m of LISTA_MONEDAS) {
    const saldo = S.saldos[m.id];
    const tiene = typeof saldo === 'number' && saldo > 0;

    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'moneda'
      + (S.moneda?.id === m.id ? ' on' : '')
      + (tiene ? ' tiene' : '');
    const logo = logoDe(m.id);
    b.innerHTML = `
      <span class="mo-ic" style="--c:${m.color}">${
        logo ? `<img src="${logo}" alt="" width="22" height="22" loading="lazy">` : m.simbolo[0]
      }</span>
      <span class="mo-txt">
        <b>${m.simbolo}</b>
        <i>${typeof saldo === 'number' ? formatear(saldo, m, { conSimbolo: false }) : '—'}</i>
      </span>
      ${tiene ? `<span class="mo-tick">${ICONOS.check(13)}</span>` : ''}
    `;
    b.addEventListener('click', () => elegirMoneda(m));
    host.appendChild(b);
  }
}

function elegirMoneda(m) {
  if (S.girando) return;
  S.moneda = m;
  S.modo = null;
  S.seleccion = [];
  S.ocupado = {};

  const min = m.minApuesta;
  $('monto').step = min;
  $('monto').min = min;
  actualizarVistaImporte();   // pone símbolo (CUP/cripto) y valor inicial

  pintarTodo();
  aviso(`Jugando en ${m.simbolo}`);
}

/**
 * Ajusta el input de importe y su símbolo según la vista activa (CUP o cripto).
 * En CUP: símbolo 💰 y un valor inicial redondo (ej. 700 CUP = ~1 USD).
 * En cripto: símbolo de la moneda y un valor en sus unidades.
 */
function actualizarVistaImporte() {
  const m = S.moneda;
  if (!m) return;
  const amt = document.querySelector('.amt');
  if (CUP.verEnCUP()) {
    if (amt) amt.classList.remove('cripto');   // muestra la moneda CUP
    $('amt-sym').textContent = CUP.CUP_SIGLA;
    $('monto').step = 1;
    $('monto').min = CUP.MIN_CUP;
    // valor inicial sugerido: 700 CUP (~1 USD), si el campo está vacío o en 0
    const actual = parseFloat($('monto').value) || 0;
    if (actual <= 0) $('monto').value = 700;
  } else {
    if (amt) amt.classList.add('cripto');      // oculta la moneda CUP
    $('amt-sym').textContent = m.simbolo;
    $('monto').step = m.minApuesta;
    $('monto').min = m.minApuesta;
    const actual = parseFloat($('monto').value) || 0;
    if (actual <= 0) {
      $('monto').value = (m.minApuesta * 5).toFixed(m.decimalesVista).replace(/\.?0+$/, '');
    }
  }
}

/* ================================================================== */
/* Paso 3 — modo                                                       */
/* ================================================================== */

function pintarModos() {
  const host = $('modes');
  const bloque = $('bloque-modo');
  const activo = Boolean(S.moneda);

  bloque.dataset.estado = S.modo ? 'hecho' : (activo ? 'activo' : 'espera');
  $('hint-modo').textContent = activo ? 'Cada uno paga distinto' : 'Elige antes una moneda';

  host.innerHTML = '';

  // Cada modo tiene su tarjeta ilustrada en assets/img/
  const ARTE = {
    terminal: 'assets/img/modo-terminales.webp',
    fijo:     'assets/img/modo-numero.webp',
    parle:    'assets/img/modo-parle.webp'
  };

  for (const m of LISTA_MODOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mode' + (S.modo?.id === m.id ? ' on' : '')
      + (m.id === 'terminal' ? ' es-terminales' : '');
    b.disabled = !activo;
    b.innerHTML = `
      <img src="${ARTE[m.id]}" alt="${m.nombre}" loading="lazy" width="800" height="410">
    `;
    b.addEventListener('click', () => elegirModo(m));
    host.appendChild(b);
  }
}

function elegirModo(m) {
  if (S.girando) return;
  if (!S.moneda) { aviso('Elige primero una moneda'); return; }
  S.modo = m;
  S.seleccion = [];
  simularOcupado();
  pintarTodo();
}

/* ================================================================== */
/* Paso 4 — marcar y apostar                                           */
/* ================================================================== */

function claveDe(valores, modo) {
  return modo.id === 'parle'
    ? [...valores].sort((a, b) => a - b).map(pad2).join('-')
    : (modo.rango === 10 ? String(valores[0]) : pad2(valores[0]));
}

/** Cupo ya ocupado por otros jugadores en esa jugada. */
function ocupadoDe(clave) { return S.ocupado[clave] ?? 0; }

function simularOcupado() {
  // Con apuestas reales no hay "ocupado" simulado: nadie se limita.
  S.ocupado = {};
}

function pintarRejilla() {
  const bloque = $('bloque-jugada');
  const activo = Boolean(S.modo && S.moneda);
  bloque.dataset.estado = activo ? 'activo' : 'espera';

  const grid = $('grid');
  grid.innerHTML = '';

  if (!activo) {
    $('picker-title').textContent = 'Selecciona tus números';
    $('picker-hint').textContent = 'Elige antes un juego';
    return;
  }

  const m = S.modo;
  grid.className = 'grid-nums ' + (m.rango === 10 ? 'g5' : 'g10');

  $('picker-title').textContent =
    m.id === 'terminal' ? 'Selecciona tus terminales'
    : m.id === 'fijo'   ? 'Selecciona tus números'
    : 'Selecciona tus parlés';

  $('picker-hint').textContent = m.id === 'parle'
    ? 'De dos en dos · puedes marcar varios pares'
    : 'Puedes marcar varios';

  $('pb-info').innerHTML = S.seleccion.length
    ? `<b>${S.seleccion.length}</b> ${S.seleccion.length === 1 ? 'jugada seleccionada' : 'jugadas seleccionadas'}`
    : `Marca los números que quieras jugar`;

  const marcados = new Set(S.seleccion.flatMap((s) => s.valores));
  const pendiente = S.pendienteParle ?? [];

  // Los números limitados reales vendrán del contrato (numeroLimitado por
  // moneda) cuando esté desplegado. Por ahora no marcamos ninguno como lleno:
  // se apuesta libremente.
  S.limitados = [];

  for (let i = 0; i < m.rango; i++) {
    const clave = m.rango === 10 ? String(i) : pad2(i);
    const limitado = false;

    const b = document.createElement('button');
    b.type = 'button';
    const esPend = pendiente.includes(i);
    b.className = 'num' + (m.rango === 10 ? ' big' : '')
      + (marcados.has(i) ? ' on' : '') + (esPend ? ' pend' : '')
      + (limitado ? ' limitado' : '');

    b.innerHTML = `<span class="num-n">${m.rango === 10 ? i : pad2(i)}</span>`;

    if (limitado) {
      b.disabled = true;
      b.title = `${clave} · ${nombreDe(i)} · LIMITADO`;
    } else {
      b.title = `${clave} · ${nombreDe(i)}`;
    }

    if (S.girando) b.disabled = true;
    b.addEventListener('click', () => marcar(i));
    grid.appendChild(b);
  }

  pintarLimitados();
}

/** La sección de números limitados se retiró (ya no hay límites). No-op. */
function pintarLimitados() {
  const vacio = $('lim-vacio');
  const grid = $('limitados-grid');
  if (vacio) vacio.style.display = 'none';
  if (grid) grid.innerHTML = '';
}

function marcar(n) {
  if (S.girando || !S.modo) return;
  const m = S.modo;

  if (m.id === 'parle') {
    S.pendienteParle = S.pendienteParle ?? [];

    // Si el número ya forma parte de un parlé confirmado, al tocarlo se
    // elimina ese parlé (deseleccionar). El doble toque para formar pares
    // se mantiene intacto.
    const enParle = S.seleccion.find((x) => x.valores.includes(n));
    if (enParle && S.pendienteParle.length === 0) {
      S.seleccion = S.seleccion.filter((x) => x.clave !== enParle.clave);
    } else {
      const i = S.pendienteParle.indexOf(n);
      if (i >= 0) S.pendienteParle.splice(i, 1);
      else S.pendienteParle.push(n);

      if (S.pendienteParle.length === 2) {
        const valores = [...S.pendienteParle];
        const clave = claveDe(valores, m);
        if (!S.seleccion.some((s) => s.clave === clave)) {
          S.seleccion.push({ clave, valores, modo: m });
        }
        S.pendienteParle = [];
      }
    }
  } else {
    const clave = claveDe([n], m);
    const i = S.seleccion.findIndex((s) => s.clave === clave);
    if (i >= 0) S.seleccion.splice(i, 1);
    else S.seleccion.push({ clave, valores: [n], modo: m });
  }

  pintarRejilla();
  pintarSeleccion();
  pintarBoleta();
}


function pintarSeleccion() {
  const host = $('seleccion');
  host.innerHTML = '';
  if (S.seleccion.length === 0) return;

  const total = totalEnCripto();
  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS, minPorNumeroCripto()
  );

  const porClave = Object.fromEntries(r.reparto.map((x) => [x.clave, x]));

  for (const s of S.seleccion) {
    const info = porClave[s.clave];
    const chip = document.createElement('div');
    chip.className = 'sel' + (s.fijado ? ' fijada' : '') + (info ? '' : ' fuera');
    chip.innerHTML = `
      <span class="sel-k">${s.clave}</span>
      <span class="sel-m">${info ? mostrarValor(info.monto) : '—'}</span>
      ${info ? `<span class="sel-p">→ ${mostrarValor(info.pago)}</span>` : ''}
      <button class="sel-fix" title="Fijar importe">${ICONOS.lapiz(11)}</button>
      <button class="sel-x" title="Quitar">${ICONOS.cerrar(11)}</button>
    `;
    chip.querySelector('.sel-x').addEventListener('click', () => {
      S.seleccion = S.seleccion.filter((x) => x.clave !== s.clave);
      pintarRejilla(); pintarSeleccion(); pintarBoleta();
    });
    chip.querySelector('.sel-fix').addEventListener('click', () => fijarImporte(s));
    host.appendChild(chip);
  }

  if (S.seleccion.length > 1) {
    const limpiar = document.createElement('button');
    limpiar.className = 'sel-clear';
    limpiar.textContent = 'Quitar todas';
    limpiar.addEventListener('click', () => {
      S.seleccion = []; S.pendienteParle = [];
      pintarRejilla(); pintarSeleccion(); pintarBoleta();
    });
    host.appendChild(limpiar);
  }
}

function fijarImporte(s) {
  // s.fijado se guarda SIEMPRE en cripto (es la unidad que usa repartir()).
  // Pero el usuario, en vista CUP, escribe y lee en pesos. Aquí se traduce en
  // los dos sentidos para que el importe fijado a mano se respete tal cual.
  const enCUP = CUP.verEnCUP();
  const unidad = enCUP ? CUP.CUP_SIGLA : S.moneda.simbolo;
  let actual = '';
  if (typeof s.fijado === 'number' && s.fijado > 0) {
    if (enCUP) {
      const enCup = CUP.criptoAcup(s.fijado, S.moneda.id, S.precios);
      actual = enCup === null ? s.fijado : Math.round(enCup * 100) / 100;
    } else {
      actual = s.fijado;
    }
  }
  let modal = document.getElementById('m-importe');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'm-importe';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div class="modal-box importe-box">
      <h3>Importe para ${s.clave}</h3>
      <p class="sub">en ${unidad} · déjalo vacío para volver al reparto automático</p>
      <input type="${_tipoNumCC()}" inputmode="decimal" step="any" min="0" class="importe-input" id="importe-input" placeholder="0.00" value="${actual}">
      <div class="importe-btns">
        <button class="modal-close" type="button">Cancelar</button>
        <button class="importe-ok" id="importe-ok" type="button">Aplicar</button>
      </div>
    </div>`;
  modal.classList.add('open');

  const input = modal.querySelector('#importe-input');
  input.focus();

  const aplicar = () => {
    const txt = input.value;
    const v = parseFloat(txt);
    if (!String(txt).trim() || isNaN(v) || v <= 0) {
      delete s.fijado;
    } else if (enCUP) {
      // El usuario escribió en CUP: pasar a cripto antes de fijar, para que
      // repartir() lo compare en la misma unidad que el total.
      const cripto = CUP.cupAcripto(v, S.moneda.id, S.precios);
      s.fijado = (cripto === null || !(cripto > 0)) ? v : cripto;
    } else {
      s.fijado = v;
    }
    modal.classList.remove('open');
    pintarSeleccion();
    pintarBoleta();
  };
  const cerrar = () => modal.classList.remove('open');

  modal.querySelector('#importe-ok').addEventListener('click', aplicar);
  modal.querySelector('.modal-close').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') aplicar(); });
}

function pintarBoleta() {
  const btn = $('btn-play');
  const conectado = Boolean(wallet.cuentaActual());

  btn.classList.toggle('gate', !conectado);

  if (!S.moneda) {
    btn.disabled = true; btn.textContent = 'Elige una moneda';
    $('i-jugadas').textContent = '0'; $('i-reparto').textContent = '—'; $('i-pago').textContent = '—';
    $('avisos').innerHTML = ''; return;
  }
  if (!S.modo) { btn.disabled = true; btn.textContent = 'Elige un juego'; return; }

  const total = totalEnCripto();

  if (S.seleccion.length === 0) {
    $('i-jugadas').textContent = '0';
    btn.disabled = true;
    btn.textContent = S.modo.id === 'parle' ? 'Marca un par de números' : 'Marca al menos un número';
    $('i-reparto').textContent = '—'; $('i-pago').textContent = '—';
    $('avisos').innerHTML = ''; return;
  }

  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS, minPorNumeroCripto()
  );

  // "Jugadas" muestra los NÚMEROS REALES (un terminal = 10 números), no casillas.
  $('i-jugadas').textContent = String(r.numerosReales);

  $('i-reparto').textContent = r.numerosReales > 0
    ? `${mostrarValor(r.asignado)} en ${r.numerosReales} ${r.numerosReales === 1 ? 'número' : 'números'}`
    : 'nada admitido';
  $('i-pago').textContent = r.pagoMaximo > 0
    ? mostrarValor(r.pagoMaximo)
    : '—';

  // PAGO EN VIVO: pregunta al contrato el premio REAL (topado por la banca de
  // esa moneda) por el monto de UNA jugada. No limita nada: solo muestra la
  // cifra transparente. Si la banca no alcanza para el multiplicador pleno,
  // el contrato devuelve menos y aquí se refleja. Es asíncrono: primero se ve
  // el estimado de arriba y en un instante se ajusta al valor real.
  // El pago mostrado (r.pagoMaximo) ya se calcula bien en la web: es la apuesta
  // POR NÚMERO (apuestaUnit) por el multiplicador del modo. Ej. terminal: 7 CUP
  // por número x 90 = 630 CUP. Coincide con lo que el contrato paga al resolver
  // (que internamente divide el terminal /10). No consultamos el pago en vivo
  // aquí porque la función view del contrato no aplica esa división y confundiría
  // el número; el tope por banca lo garantiza el propio contrato al apostar.

  $('avisos').innerHTML = r.avisos.length
    ? r.avisos.map((a) => `<div class="av">${a}</div>`).join('')
    : '';

  // La wallet solo hace falta AQUÍ. Hasta este punto se puede mirar todo.
  if (!conectado) {
    btn.disabled = false;
    btn.textContent = 'Conecta tu wallet para jugar';
    return;
  }

  const saldo = S.saldos[S.moneda.id];
  if (typeof saldo === 'number' && r.asignado > saldo) {
    btn.disabled = true; btn.textContent = 'Saldo insuficiente'; return;
  }
  if (r.reparto.length === 0) {
    btn.disabled = true; btn.textContent = 'Sube el importe o quita jugadas'; return;
  }

  // AVISO DE MÍNIMO POR NÚMERO. Si el importe repartido entre todos los números
  // reales deja menos del mínimo por número, no se deja apostar y se explica.
  if (r.bajoMinimo) {
    const minTxt = CUP.verEnCUP()
      ? `${CUP.MIN_CUP} ${CUP.CUP_SIGLA}`
      : formatear(minPorNumeroCripto(), S.moneda);
    // Cuánto tendría que apostar en total para cumplir el mínimo por número.
    const totalMinCripto = minPorNumeroCripto() * r.numerosReales;
    const totalMinTxt = mostrarValor(totalMinCripto);
    $('avisos').innerHTML =
      `<div class="av av-warn">El mínimo es <b>${minTxt} por número</b>. ` +
      `Estás jugando <b>${r.numerosReales} números</b>, así que debes apostar ` +
      `al menos <b>${totalMinTxt}</b> en total. Sube el importe o marca menos números.</div>`;
    btn.disabled = true;
    btn.textContent = `Mínimo ${totalMinTxt}`;
    return;
  }

  btn.disabled = S.girando;
  btn.textContent = S.girando ? 'Sorteando…' : `Jugar ${mostrarValor(r.asignado)}`;
}

/* ================================================================== */
/* Banner                                                              */
/* ================================================================== */

/**
 * BARRA DE SALDO
 * Vive junto a la selección de moneda, no en el banner: así el banner no
 * depende de que tengas wallet ni de que hayas elegido moneda todavía.
 */
function pintarSaldo() {
  const strip = $('saldo-strip');
  const conectado = Boolean(wallet.cuentaActual());

  if (!conectado || !S.moneda) { strip.classList.remove('show'); return; }
  strip.classList.add('show');

  const saldo = S.saldos[S.moneda.id];
  const p = partirSaldo(saldo ?? 0, S.moneda);

  const logo = logoDe(S.moneda.id);
  const img = $('ss-logo');
  if (logo) { img.src = logo; img.alt = S.moneda.simbolo; img.style.display = ''; }
  else img.style.display = 'none';

  $('ss-int').textContent = p.entero;
  $('ss-dec').textContent = p.decimal ? '.' + p.decimal : '';
  $('ss-sym').textContent = p.simbolo;

  $('ss-usd').textContent = enDolares(saldo, S.moneda.id, S.precios);
  $('ss-min').textContent = '';   // sin el precio de la moneda, sobraba
}

/**
 * BANNER — estado de la tirada.
 * Funciona desde el primer segundo, con wallet o sin ella.
 */
function pintarReloj() {
  const p = proximaTirada();

  ponerIcono($('db-ic'), p.tirada.id === 'dia' ? 'sol' : 'luna', 17);

  // Etiqueta clara: qué pasa y a qué HORA REAL (formato 12h con a.m./p.m.)
  $('db-label').textContent = p.abierta
    ? `Cierran ${hora12(p.cierre)} · ${p.tirada.nombre}`
    : `Sorteo ${hora12(p.sorteo)} · ${p.tirada.nombre}`;

  // La cuenta atrás es el TIEMPO QUE FALTA (no una hora)
  const t = cuentaAtras(p.abierta ? p.faltaCierreMs : p.faltaMs).split(':');
  $('hc-h').textContent = t[0];
  $('hc-m').textContent = t[1];
  $('hc-s').textContent = t[2];

  // A la derecha, la fecha y hora del sorteo en 12h
  $('hero-when').textContent = fechaHora12(p.sorteo);
}

/** La sección de última tirada se retiró del DOM; se conserva por si vuelve. */
function pintarUltima() { /* sin elemento en la página actual */ }

/* ================================================================== */
/* Sorteo                                                              */
/* ================================================================== */

function crearBolas(numeros = null) {
  const host = $('balls');
  host.innerHTML = '';
  // Muestra tipo fijo (3 dígitos, el primero tenue) hasta que haya
  // resultado oficial. Ej: 4 · 46
  const demo = numeros ?? [4, 4, 6];
  const tag = $('drum-tag');
  if (tag) tag.textContent = 'Fijo';
  host.innerHTML = `
    <div class="bola tenue"><span class="bola-n">${demo[0]}</span></div>
    <div class="bola es-fijo"><span class="bola-n">${demo[1]}</span></div>
    <div class="bola es-fijo"><span class="bola-n">${demo[2]}</span></div>`;
}

async function jugar() {
  if (!wallet.cuentaActual()) { pulsarConectar(); return; }
  if (S.girando) return;

  const cuenta = wallet.cuentaActual();

  if (!wallet.esRedCorrecta()) {
    try { await wallet.cambiarARedCorrecta(); }
    catch { aviso('Cambia a BNB Chain para apostar', true); return; }
  }

  const total = totalEnCripto();
  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS, minPorNumeroCripto()
  );
  if (r.reparto.length === 0) return;

  // Seguridad: no dejar apostar si cae por debajo del mínimo por número.
  if (r.bajoMinimo) {
    aviso(`El mínimo es ${CUP.MIN_CUP} ${CUP.CUP_SIGLA} por número. Sube el importe o marca menos números.`, true);
    return;
  }

  // Cada entrada del reparto lleva su monto ya calculado; le añadimos los
  // números reales de la jugada para mandarlos al contrato.
  const jugadas = r.reparto
    .map((x) => ({ ...x, valores: S.seleccion.find((s) => s.clave === x.clave)?.valores }))
    .filter((x) => x.valores && x.monto > 0);

  if (jugadas.length === 0) return;

  // ---- idTirada automático: fecha + turno del próximo sorteo de Florida ----
  const prox = proximaTirada(new Date());
  const idTirada = contrato.idTiradaDe(prox.sorteo, prox.tirada.id);

  // La tirada tiene que estar ABIERTA en el contrato. Si no lo está, avisamos
  // con claridad en vez de mandar una apuesta que el contrato rechazaría.
  let abierta = false;
  cargar(true);
  try { abierta = await contrato.sePuedeApostar(idTirada); }
  catch { abierta = false; }
  finally { cargar(false); }

  if (!abierta) {
    aviso('La tirada de este sorteo aún no está abierta. Prueba en unos minutos.', true);
    return;
  }

  S.girando = true;
  pintarRejilla(); pintarBoleta();

  // ---- approve (solo una vez, si la moneda es token y no basta el permiso) --
  const esToken = S.moneda.address !== null;
  let enviadas = 0;
  let fallidas = 0;

  try {
    if (esToken) {
      // Autoriza el total de esta ronda de una sola vez.
      const totalBase = contrato.aBase(
        jugadas.reduce((a, j) => a + j.monto, 0).toFixed(S.moneda.decimals),
        S.moneda.decimals
      );
      aviso('Autoriza el gasto en tu wallet…');
      cargar(true);
      try {
        const hAppr = await contrato.approve(cuenta, S.moneda, totalBase);
        await contrato.esperarRecibo(hAppr);
      } finally { cargar(false); }
    }

    // ---- una transacción de apuesta por jugada ----
    for (const j of jugadas) {
      const modo = j.modo.id;
      const cod = contrato.codigoModo(modo);

      // numeroA / numeroB según el modo:
      //   terminal -> un dígito 0-9 en A, B=0
      //   fijo     -> un número 0-99 en A, B=0
      //   parlé    -> dos números 0-99 en A y B
      let numeroA, numeroB;
      if (modo === 'parle') {
        const [a, b] = j.valores;
        numeroA = a; numeroB = b;
      } else {
        numeroA = j.valores[0]; numeroB = 0;
      }

      const cantidadBase = contrato.aBase(
        Number(j.monto).toFixed(S.moneda.decimals), S.moneda.decimals
      );

      aviso(`Confirma la apuesta ${enviadas + fallidas + 1} de ${jugadas.length}…`);
      cargar(true);
      try {
        const hash = await contrato.apostar(cuenta, {
          idTirada, moneda: S.moneda, modo: cod, numeroA, numeroB, cantidadBase
        });
        await contrato.esperarRecibo(hash);
        enviadas++;
      } catch (e) {
        fallidas++;
        if (e?.code === 4001 || /reject|denied/i.test(e?.message || '')) {
          aviso('Cancelaste la apuesta', true);
          break;   // si canceló una firma, no seguimos pidiéndole las demás
        }
      } finally { cargar(false); }
    }

    if (enviadas > 0) {
      lanzarConfeti();
      aviso(
        enviadas === 1
          ? '¡Apuesta registrada! Espera el sorteo de Florida.'
          : `¡${enviadas} apuestas registradas! Espera el sorteo de Florida.`
      );
    } else if (fallidas > 0) {
      aviso('No se registró ninguna apuesta.', true);
    }
  } catch (e) {
    const msg = e?.message === 'TX_FALLIDA'
      ? 'El contrato rechazó la operación'
      : 'No se pudo completar la apuesta. Intenta de nuevo.';
    aviso(msg, true);
  } finally {
    S.girando = false;
    S.seleccion = [];
    S.pendienteParle = [];
    pintarTodo();
    // Por si alguna apuesta ya generó saldo pendiente (p. ej. reembolsos):
    refrescarGanancias();
    refrescarMisApuestas();   // mostrar de inmediato lo que acaba de apostar
  }
}

/* ================================================================== */
/* Charada y modales                                                   */
/* ================================================================== */

function conectarCharada() {
  const btn = $('charada-toggle');
  const panel = $('charada-panel');
  ponerIcono($('ct-ic'), 'chevron', 17);

  btn.addEventListener('click', () => {
    S.charadaAbierta = !S.charadaAbierta;
    btn.setAttribute('aria-expanded', String(S.charadaAbierta));
    panel.classList.toggle('open', S.charadaAbierta);
    btn.querySelector('span').textContent =
      S.charadaAbierta ? 'Ocultar los números' : 'Ver los cien números';
  });
}

function pintarFiltros() {
  const host = $('filtros');
  host.innerHTML = '';
  const mk = (id, txt) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro' + (S.filtro === id ? ' on' : '');
    b.textContent = txt;
    b.addEventListener('click', () => { S.filtro = id; pintarFiltros(); pintarCharada(); });
    host.appendChild(b);
  };
  mk(null, 'Todos');
  for (const [id, f] of Object.entries(FAMILIAS)) mk(id, f.etiqueta);
}

function pintarCharada() {
  const host = $('charada-grid');
  host.innerHTML = '';
  for (const it of CHARADA) {
    const d = document.createElement('div');
    d.className = 'ch-item' + (S.filtro && it.familia !== S.filtro ? ' dim' : '');
    d.innerHTML = `<span class="n">${pad2(it.n)}</span><span class="nm">${it.nombre}</span>`;
    if (S.modo && S.modo.rango === 100) {
      d.style.cursor = 'pointer';
      d.addEventListener('click', () => {
        marcar(it.n);
        $('jugar').scrollIntoView({ behavior: 'smooth' });
      });
    }
    host.appendChild(d);
  }
}

function pintarTablas() {
  if (!S.moneda) return;
  const t1 = $('tabla-topes'), t2 = $('tabla-pagos');
  const filas = LISTA_MODOS.map((m) => {
    return `<tr><td>${m.nombre}</td><td>${m.multiplicador}× lo apostado</td></tr>`;
  }).join('');
  t1.innerHTML = filas;
  t2.innerHTML = LISTA_MODOS.map((m) =>
    `<tr><td><strong>${m.nombre}</strong><br><span style="font-size:12px">${m.descripcion}</span></td>
     <td style="font-size:20px;color:var(--gold)">${m.multiplicador}×</td></tr>`).join('');
  $('pagos-sub').textContent = `en ${S.moneda.simbolo} · margen ${margen(MODOS.terminal).toFixed(0)}%`;
}

function conectarModales() {
  $$('[data-modal]').forEach((b) => {
    if (b.dataset.ic) ponerIcono(b.querySelector('.ic'), b.dataset.ic, 17);
  });
  $$('[data-modal]').forEach((b) => b.addEventListener('click', () => {
    pintarTablas();
    $('m-' + b.dataset.modal).classList.add('open');
  }));
  $$('.modal-close').forEach((b) => b.addEventListener('click', () => b.closest('.modal').classList.remove('open')));
  $$('.modal').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.open').forEach((m) => m.classList.remove('open'));
  });
}

/* ================================================================== */
/* Pintado global                                                      */
/* ================================================================== */

function pintarPasos() {
  const hechos = [
    Boolean(wallet.cuentaActual()),
    Boolean(S.moneda),
    Boolean(S.modo),
    S.seleccion.length > 0
  ];
  const actual = hechos.findIndex((h) => !h);

  $$('.paso').forEach((li, i) => {
    li.className = 'paso' + (hechos[i] ? ' hecho' : i === actual ? ' activo' : '');
  });
}

function pintarQuick() {
  const host = $('quick');
  host.innerHTML = '';
  if (!S.moneda) return;

  if (CUP.verEnCUP()) {
    // Montos rápidos redondos en pesos cubanos
    for (const v of [100, 500, 1000]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'q';
      b.textContent = CUP.fmtCUP(v, { conSigla: false });
      b.addEventListener('click', () => {
        $('monto').value = v;
        pintarSeleccion(); pintarBoleta();
      });
      host.appendChild(b);
    }
    return;
  }

  const min = S.moneda.minApuesta;
  for (const k of [5, 10, 25]) {
    const v = min * k;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'q';
    b.textContent = formatear(v, S.moneda, { conSimbolo: false });
    b.addEventListener('click', () => {
      $('monto').value = v.toFixed(S.moneda.decimalesVista).replace(/\.?0+$/, '');
      pintarSeleccion(); pintarBoleta();
    });
    host.appendChild(b);
  }
}

function pintarTodo() {
  pintarPasos();
  pintarMonedas();
  pintarModos();
  pintarRejilla();
  pintarSeleccion();
  pintarQuick();
  pintarBoleta();
  pintarSaldo();
  pintarLimitados();
  pintarCharada();
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */

function init() {
  const v = versoDelDia();
  $('verso-t').textContent = `«${v.texto}»`;
  $('verso-fecha').textContent = v.fecha;
  $('verso-hora').textContent = 'emitido a las 06:00';

  ponerIcono($('btn-off'), 'power', 17);

  crearBolas();
  pintarFiltros();
  conectarCharada();
  pintarCompra();
  conectarModales();
  pintarReloj();
  pintarUltima();
  setInterval(pintarReloj, 1000);

  cargarPrecios();
  setInterval(cargarPrecios, 5 * 60 * 1000);

  $('btn-wallet').addEventListener('click', pulsarConectar);
  $('btn-off').addEventListener('click', pulsarDesconectar);
  $('net').addEventListener('click', () => {
    if (!wallet.esRedCorrecta()) wallet.cambiarARedCorrecta().catch(() => {});
  });
  $('monto').addEventListener('input', () => { pintarSeleccion(); pintarBoleta(); });

  // Toggle CUP / cripto
  const vt = $('vista-toggle');
  if (vt) {
    vt.addEventListener('click', (e) => {
      const btn = e.target.closest('.vt-btn');
      if (!btn) return;
      const quiereCUP = btn.dataset.vista === 'cup';
      if (quiereCUP === CUP.verEnCUP()) return;   // sin cambio
      // Convertir el valor escrito para que el número tenga sentido en la nueva vista
      const escrito = parseFloat($('monto').value) || 0;
      CUP.ponerVista(quiereCUP);
      // actualizar botones activos
      vt.querySelectorAll('.vt-btn').forEach((b) =>
        b.classList.toggle('activo', b.dataset.vista === btn.dataset.vista));
      // recalcular el valor mostrado en la nueva unidad
      if (S.moneda && escrito > 0 && S.precios) {
        if (quiereCUP) {
          const cup = CUP.criptoAcup(escrito, S.moneda.id, S.precios);
          if (cup !== null) $('monto').value = Math.round(cup);
        } else {
          const cripto = CUP.cupAcripto(escrito, S.moneda.id, S.precios);
          if (cripto !== null) $('monto').value = cripto.toFixed(S.moneda.decimalesVista).replace(/\.?0+$/, '');
        }
      }
      actualizarVistaImporte();
      pintarQuick();
      pintarSeleccion();
      pintarBoleta();
    });
  }

  $('pb-limpiar').addEventListener('click', () => {
    S.seleccion = []; S.pendienteParle = [];
    pintarRejilla(); pintarSeleccion(); pintarBoleta();
  });

  $('pb-azar').addEventListener('click', () => {
    if (!S.modo || S.girando) return;
    S.seleccion = []; S.pendienteParle = [];
    const cuantas = S.modo.id === 'parle' ? 2 : 3;
    const usados = new Set();
    for (let k = 0; k < cuantas; k++) {
      if (S.modo.id === 'parle') {
        const par = [];
        while (par.length < 2) {
          const n = Math.floor(Math.random() * 100);
          if (!par.includes(n)) par.push(n);
        }
        const clave = claveDe(par, S.modo);
        if (!S.seleccion.some((x) => x.clave === clave)) {
          S.seleccion.push({ clave, valores: par, modo: S.modo });
        }
      } else {
        let n, intentos = 0;
        do { n = Math.floor(Math.random() * S.modo.rango); intentos++; }
        while (usados.has(n) && intentos < 40);
        usados.add(n);
        const clave = claveDe([n], S.modo);
        if (!S.seleccion.some((x) => x.clave === clave)) {
          S.seleccion.push({ clave, valores: [n], modo: S.modo });
        }
      }
    }
    pintarRejilla(); pintarSeleccion(); pintarBoleta();
  });
  $('btn-play').addEventListener('click', jugar);

  wallet.alCambiar(() => { pintarWallet(); cargarSaldos(); refrescarGanancias(); refrescarMisApuestas(); });
  wallet.reconectarSiProcede().then(() => { pintarWallet(); cargarSaldos(); refrescarGanancias(); refrescarMisApuestas(); });

  pintarTodo();
}

init();

/* ================================================================== */
/* Resultados oficiales de Florida en los bombos apilados             */
/* ================================================================== */

// Guarda las lecturas de mediodía y noche del día
const oficial = { dia: null, noche: null, turnoVista: 'noche', historial: [], ultimaFirma: null };

/**
 * Pinta un bombo de "fijo": tres dígitos del Pick 3, el primero transparente.
 * Ej: Pick3 446 -> muestra 4(tenue)46
 */
function pintarFijo(r) {
  const host = $('balls');
  const tag = $('drum-tag');
  if (tag) tag.textContent = 'Fijo';

  if (!r) { crearBolas(); return; }

  const [d0, d1, d2] = r.pick3;
  // Tres bolas: la primera (primer dígito del Pick 3) va tenue; las dos
  // siguientes forman el fijo y van a plena luz.
  host.innerHTML = `
    <div class="bola tenue"><span class="bola-n">${d0}</span></div>
    <div class="bola es-fijo"><span class="bola-n">${d1}</span></div>
    <div class="bola es-fijo"><span class="bola-n">${d2}</span></div>`;
  $('draw-name').textContent = '';
}

/** Bolas pequeñas con una lista de pares ("31","59"...). */
function pintarBolasPeq(hostId, pares) {
  const host = $(hostId);
  if (!host) return;
  host.innerHTML = pares.map((p) =>
    `<div class="bola"><span class="bola-n">${p}</span></div>`
  ).join('');
}

/** Rellena todos los bombos con la lectura de un turno. */
function pintarResultado(r) {
  pintarFijo(r);

  const corr = $('drum-corridos');
  const parl = $('drum-parles');
  const cand = $('drum-candado');
  const nota = $('oficial-nota');

  if (!r) {
    [corr, parl, cand, nota].forEach((e) => e && (e.hidden = true));
    return;
  }

  pintarBolasPeq('balls-corridos', r.corridos);
  corr.hidden = false;

  $('parles-grid').innerHTML = r.parles.map((p) => {
    const [a, b] = p.split('·');
    return `<span class="parle-par">
      <span class="bola"><span class="bola-n">${a}</span></span>
      <span class="parle-sep">·</span>
      <span class="bola"><span class="bola-n">${b}</span></span>
    </span>`;
  }).join('');
  parl.hidden = false;

  pintarBolasPeq('balls-candado', r.candado);
  cand.hidden = false;

  if (r.fecha) {
    nota.textContent = `Tirada oficial · ${r.turno === 'dia' ? 'Mediodía' : 'Noche'} · ${r.fecha}`;
    nota.hidden = false;
  }
}

/** Cambia entre mediodía y noche. */
function verTurno(turno) {
  oficial.turnoVista = turno;
  $$('.turno-btn').forEach((b) => b.classList.toggle('on', b.dataset.turno === turno));
  pintarResultado(oficial[turno]);
}

/**
 * Pide el resultado oficial al puente y actualiza los bombos. Si no hay
 * puente configurado o falla, deja los bombos de muestra sin romper nada.
 *
 * Cuando detecta una tirada NUEVA (que no habíamos mostrado antes), lanza
 * el confeti y la notificación.
 */
async function cargarOficial(esArranque = false) {
  let datos = null;
  try { datos = await resultadoOficial(); } catch { datos = null; }

  if (!datos || !datos.historial?.length) {
    $('turnos').hidden = true;
    return;
  }

  // Tomar la última de cada turno
  oficial.dia = datos.historial.find((r) => r.turno === 'dia') ?? null;
  oficial.noche = datos.historial.find((r) => r.turno === 'noche') ?? null;
  oficial.historial = datos.historial;

  // ¿Hay una tirada nueva desde la última vez que miramos?
  const reciente = datos.historial[0];
  const firma = reciente ? `${reciente.fecha}|${reciente.turno}|${reciente.fijo}` : '';
  if (reciente && firma !== oficial.ultimaFirma) {
    const eraConocida = oficial.ultimaFirma !== null;
    oficial.ultimaFirma = firma;

    // Solo celebrar si NO es el primer vistazo (para no lanzar confeti
    // cada vez que entras a la página con un resultado ya viejo).
    if (eraConocida && !esArranque) {
      celebrarTirada(reciente);
    }
  }

  // Mostrar el selector solo si hay al menos un turno
  const hayDia = Boolean(oficial.dia);
  const hayNoche = Boolean(oficial.noche);
  $('turnos').hidden = !(hayDia && hayNoche);

  $$('.turno-btn').forEach((b) => {
    const t = b.dataset.turno;
    b.disabled = t === 'dia' ? !hayDia : !hayNoche;
  });

  // Ver por defecto el turno más reciente disponible
  const inicial = hayNoche ? 'noche' : 'dia';
  verTurno(inicial);

  pintarUltimasTiradas();
}

/** Confeti + notificación cuando sale una tirada nueva. */
function celebrarTirada(r) {
  lanzarConfeti();

  const turno = r.turno === 'dia' ? 'Mediodía' : 'Noche';
  avisarTirada({
    titulo: `¡Salió la tirada de la ${turno}!`,
    texto: `Fijo ${r.fijo} · Corridos ${r.corridos.join(' · ')}`,
    fijo: r.fijo
  });
}

/** Rellena el modal de últimas tiradas, si el puente dio historial. */
function pintarUltimasTiradas() {
  const cont = $('ult-lista');
  if (!cont) return;

  const hist = oficial.historial ?? [];
  if (hist.length === 0) {
    cont.innerHTML = '<p class="ult-vacio">Todavía no hay resultados oficiales.</p>';
    return;
  }

  cont.innerHTML = hist.slice(0, 6).map((r) => {
    const turno = r.turno === 'dia' ? 'Mediodía' : 'Noche';
    return `
      <div class="ult-fila">
        <div class="ult-cab">
          <span class="ult-turno">${turno}</span>
          <span class="ult-fecha">${r.fecha}</span>
        </div>
        <div class="ult-nums">
          <span class="ult-fijo">${r.fijo}</span>
          <span class="ult-corr">${r.corridos.join(' · ')}</span>
        </div>
      </div>`;
  }).join('');
}

/* ================================================================== */
/* Arranque de resultados oficiales + notificaciones                   */
/* ================================================================== */

// Botones de turno (mediodía / noche)
$$('.turno-btn').forEach((b) =>
  b.addEventListener('click', () => { if (!b.disabled) verTurno(b.dataset.turno); })
);

// Interruptor de notificaciones
function pintarSwitch() {
  const sw = $('nt-switch');
  if (!sw) return;
  const on = notifActivas();
  sw.classList.toggle('on', on);
  sw.setAttribute('aria-checked', on ? 'true' : 'false');
}
(() => {
  const sw = $('nt-switch');
  if (!sw) return;
  pintarSwitch();
  sw.addEventListener('click', async () => {
    const nuevo = !notifActivas();
    await activarNotif(nuevo, { sonido: nuevo ? true : null });
    pintarSwitch();
    if (nuevo) {
      avisarTirada({
        titulo: 'Avisos activados',
        texto: 'Te avisaré en cuanto salga cada tirada.',
        fijo: '★'
      });
    }
  });
})();

// Cargar al arrancar y refrescar cada minuto por si sale una tirada nueva
cargarOficial(true);
setInterval(() => cargarOficial(false), 60000);
