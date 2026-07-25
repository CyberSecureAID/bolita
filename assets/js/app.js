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
import { proximaTirada, cuentaAtras, fechaHora } from './draws.js';
import { lanzarConfeti } from './confetti.js';
import * as wallet from './wallet.js';
import { ICONOS, ponerIcono } from './icons.js';
import { logoDe, precios, enDolares } from './prices.js';

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
    btn.textContent = wallet.abreviar(cuenta);
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
  $('monto').value = (min * 5).toFixed(m.decimalesVista).replace(/\.?0+$/, '');
  $('amt-sym').textContent = m.simbolo;

  pintarTodo();
  aviso(`Jugando en ${m.simbolo}`);
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
    b.className = 'mode' + (S.modo?.id === m.id ? ' on' : '');
    b.disabled = !activo;
    b.innerHTML = `
      <img src="${ARTE[m.id]}" alt="${m.nombre}" loading="lazy" width="800" height="410">
      <span class="mode-check">${ICONOS.check(16)}</span>
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
  if (!S.modo || !S.moneda) return;
  S.ocupado = {};
  const tope = topeApuesta(banca(), EXPOSICION_BPS, S.modo, S.moneda).valor;

  if (S.modo.id === 'parle') return;   // demasiadas combinaciones

  for (let i = 0; i < S.modo.rango; i++) {
    if (Math.random() < 0.45) {
      const clave = S.modo.rango === 10 ? String(i) : pad2(i);
      S.ocupado[clave] = Math.random() * tope * 0.7;
    }
  }
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

  const tp = topeApuesta(banca(), EXPOSICION_BPS, m, S.moneda);
  $('pb-info').innerHTML = S.seleccion.length
    ? `<b>${S.seleccion.length}</b> ${S.seleccion.length === 1 ? 'jugada' : 'jugadas'} · cupo por jugada <b>${fmt(tp.valor)}</b>`
    : `Cupo por jugada <b>${fmt(tp.valor)}</b> · paga hasta <b>${fmt(tp.valor * m.multiplicador)}</b>`;

  const tope = topeApuesta(banca(), EXPOSICION_BPS, m, S.moneda).valor;
  const marcados = new Set(S.seleccion.flatMap((s) => s.valores));
  const pendiente = S.pendienteParle ?? [];

  // Recalcular qué números están limitados (solo modos de resultado individual)
  S.limitados = [];

  for (let i = 0; i < m.rango; i++) {
    const clave = m.rango === 10 ? String(i) : pad2(i);
    const usado = ocupadoDe(clave);
    const pct = tope > 0 ? Math.min(100, (usado / tope) * 100) : 0;
    const limitado = m.id !== 'parle' && pct >= 99.5;

    if (limitado) S.limitados.push(i);

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

/** Sección de números limitados: vacía hasta que alguno se llena. */
function pintarLimitados() {
  const vacio = $('lim-vacio');
  const grid = $('limitados-grid');

  const hayModo = S.modo && S.modo.id !== 'parle';

  if (!hayModo || S.limitados.length === 0) {
    vacio.style.display = 'block';
    vacio.textContent = S.modo?.id === 'parle'
      ? 'El parlé son combinaciones de dos números: no se limita por número suelto.'
      : 'Ahora mismo no hay números limitados. Se puede jugar a todos.';
    grid.innerHTML = '';
    return;
  }

  vacio.style.display = 'none';
  grid.innerHTML = S.limitados.map((i) => {
    const et = S.modo.rango === 10 ? String(i) : pad2(i);
    return `<div class="lim-num" title="${nombreDe(i)} · cerrado">
      <span class="num-n">${et}</span>
    </div>`;
  }).join('');
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

  const total = parseFloat($('monto').value) || 0;
  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS
  );

  const porClave = Object.fromEntries(r.reparto.map((x) => [x.clave, x]));

  for (const s of S.seleccion) {
    const info = porClave[s.clave];
    const chip = document.createElement('div');
    chip.className = 'sel' + (s.fijado ? ' fijada' : '') + (info ? '' : ' fuera');
    chip.innerHTML = `
      <span class="sel-k">${s.clave}</span>
      <span class="sel-m">${info ? fmt(info.monto, { conSimbolo: false }) : 'sin cupo'}</span>
      ${info ? `<span class="sel-p">→ ${fmt(info.pago, { conSimbolo: false })}</span>` : ''}
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
  const actual = s.fijado ?? '';
  const txt = prompt(
    `Importe fijo para ${s.clave} en ${S.moneda.simbolo}\n` +
    `(vacío para que vuelva al reparto automático)\n` +
    `Mínimo ${fmt(S.moneda.minApuesta)}`,
    actual
  );
  if (txt === null) return;

  const v = parseFloat(txt);
  if (!txt.trim() || isNaN(v) || v <= 0) delete s.fijado;
  else s.fijado = v;

  pintarSeleccion();
  pintarBoleta();
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

  const total = parseFloat($('monto').value) || 0;
  $('i-jugadas').textContent = String(S.seleccion.length);

  if (S.seleccion.length === 0) {
    btn.disabled = true;
    btn.textContent = S.modo.id === 'parle' ? 'Marca un par de números' : 'Marca al menos un número';
    $('i-reparto').textContent = '—'; $('i-pago').textContent = '—';
    $('avisos').innerHTML = ''; return;
  }

  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS
  );

  $('i-reparto').textContent = r.reparto.length
    ? `${fmt(r.asignado)} en ${r.reparto.length}`
    : 'nada admitido';
  $('i-pago').textContent = r.pagoMaximo > 0
    ? fmt(r.pagoMaximo) + (enUnidadPequena(r.pagoMaximo, S.moneda) ? ` · ${enUnidadPequena(r.pagoMaximo, S.moneda)}` : '')
    : '—';

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
  if (total > S.moneda.maxPorPersona) {
    btn.disabled = true;
    btn.textContent = `Máximo por persona: ${fmt(S.moneda.maxPorPersona)}`; return;
  }

  btn.disabled = S.girando;
  btn.textContent = S.girando ? 'Sorteando…' : `Jugar ${fmt(r.asignado)}`;
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
  const peq = typeof saldo === 'number' ? enUnidadPequena(saldo, S.moneda) : '';
  $('ss-min').textContent = peq || `mín. ${fmt(S.moneda.minApuesta)}`;
}

/**
 * BANNER — estado de la tirada.
 * Funciona desde el primer segundo, con wallet o sin ella.
 */
function pintarReloj() {
  const p = proximaTirada();

  ponerIcono($('db-ic'), p.tirada.id === 'dia' ? 'sol' : 'luna', 17);
  $('db-label').textContent = p.abierta
    ? `Cierran apuestas · ${p.tirada.nombre}`
    : `Sorteando · ${p.tirada.nombre}`;

  const t = cuentaAtras(p.abierta ? p.faltaCierreMs : p.faltaMs).split(':');
  $('hc-h').textContent = t[0];
  $('hc-m').textContent = t[1];
  $('hc-s').textContent = t[2];

  $('hero-when').textContent = fechaHora(p.cuando);
}

/** La sección de última tirada se retiró del DOM; se conserva por si vuelve. */
function pintarUltima() { /* sin elemento en la página actual */ }

/* ================================================================== */
/* Sorteo                                                              */
/* ================================================================== */

function crearBolas(numeros = null) {
  const host = $('balls');
  host.innerHTML = '';
  // Números de muestra para ver cómo quedan hasta que haya sorteo real
  const demo = numeros ?? [7, 28, 54, 3, 91];
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('div');
    b.className = 'bola' + (i === 0 ? ' es-fijo' : '');
    b.innerHTML = `<span class="bola-n">${pad2(demo[i])}</span>`;
    host.appendChild(b);
  }
}

async function jugar() {
  if (!wallet.cuentaActual()) { pulsarConectar(); return; }

  const total = parseFloat($('monto').value) || 0;
  const r = repartir(
    S.seleccion.map((s) => ({ ...s, yaApostado: ocupadoDe(s.clave) })),
    total, S.moneda, banca(), EXPOSICION_BPS
  );
  if (r.reparto.length === 0) return;

  const mias = r.reparto.map((x) => ({ ...x, valores: S.seleccion.find((s) => s.clave === x.clave).valores }));
  S.girando = true;
  pintarRejilla(); pintarBoleta();

  crearBolas();
  const bolas = $$('.bola');
  bolas.forEach((b) => b.classList.add('spin'));
  $('draw-name').textContent = '';
  $('draw-name').className = 'do-name';

  const spin = setInterval(() => bolas.forEach((b) => {
    const sp = b.querySelector('.bola-n') || b;
    sp.textContent = pad2(Math.floor(Math.random() * 100));
  }), 70);
  await new Promise((r2) => setTimeout(r2, 1500));
  clearInterval(spin);

  const salidos = [];
  while (salidos.length < 5) {
    const n = Math.floor(Math.random() * 100);
    if (!salidos.includes(n)) salidos.push(n);
  }

  for (let i = 0; i < 5; i++) {
    await new Promise((r2) => setTimeout(r2, 360));
    bolas[i].classList.remove('spin');
    (bolas[i].querySelector('.bola-n') || bolas[i]).textContent = pad2(salidos[i]);
    if (i === 0) bolas[i].classList.add('first');
  }

  const fijo = salidos[0];
  let cobrado = 0;

  for (const j of mias) {
    let acierta = false;
    if (j.modo.id === 'terminal') {
      acierta = (fijo % 10) === j.valores[0];
      if (acierta) bolas[0].classList.add('hit');
    } else if (j.modo.id === 'fijo') {
      const p = salidos.indexOf(j.valores[0]);
      acierta = p >= 0;
      if (acierta) bolas[p].classList.add('hit');
    } else {
      const ps = j.valores.map((v) => salidos.indexOf(v));
      acierta = ps.every((p) => p >= 0);
      if (acierta) ps.forEach((p) => bolas[p].classList.add('hit'));
    }
    if (acierta) cobrado += j.pago;
  }

  S.ultimosNumeros = salidos;
  S.ultimaEtiqueta = fechaHora(new Date());
  pintarUltima();

  $('draw-name').textContent = `${pad2(fijo)} · ${nombreDe(fijo)}`;

  if (cobrado > 0) {
    BANCA[S.moneda.id] -= (cobrado - r.asignado);
    $('draw-name').className = 'do-name win';
    $('draw-name').textContent = `¡Cobras ${fmt(cobrado)}!`;
    lanzarConfeti();
    aviso(`Ganaste ${fmt(cobrado)}`);
  } else {
    BANCA[S.moneda.id] += r.asignado;
    $('draw-name').className = 'do-name';
    $('draw-name').textContent = `${pad2(fijo)} · ${nombreDe(fijo)}`;
  }

  S.ronda += 1;
  S.seleccion = [];
  S.pendienteParle = [];
  S.girando = false;
  simularOcupado();
  pintarTodo();
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
    const t = topeApuesta(banca(), EXPOSICION_BPS, m, S.moneda);
    return `<tr><td>${m.nombre} · ${m.multiplicador}×</td><td>${fmt(t.valor)} → ${fmt(t.valor * m.multiplicador)}</td></tr>`;
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
  const min = S.moneda.minApuesta;
  for (const k of [5, 10, 25]) {
    const v = min * k;
    if (v > S.moneda.maxPorPersona) continue;
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

  wallet.alCambiar(() => { pintarWallet(); cargarSaldos(); });
  wallet.reconectarSiProcede().then(() => { pintarWallet(); cargarSaldos(); });

  pintarTodo();
}

init();
