/**
 * La Bolita — interfaz.
 *
 * Usa la misma matematica que el contrato (economics.js) con una banca
 * simulada en memoria. Cuando el contrato este desplegado, solo hay que
 * sustituir las funciones de `banca` por llamadas a roundSnapshot() y bet();
 * el resto de la interfaz no cambia.
 */

import { MODOS, maxStake, disponible, seAcepta, margen } from './economics.js';
import { CHARADA, FAMILIAS, pad2, nombreDe, numerosDeTerminal } from './charada.js';
import { versoDelDia } from './versos.js';
import { lanzarConfeti } from './confetti.js';
import * as wallet from './wallet.js';

/* ================================================================== */
/* Estado                                                              */
/* ================================================================== */

const CONFIG = {
  banca: 100,
  exposureBps: 2000,
  minApuesta: 0.05,
  maxPorPersona: 2
};

const S = {
  banca: CONFIG.banca,
  ronda: 1,
  modo: MODOS.terminal,
  elegidos: [],                      // digitos o numeros segun el modo
  ocupado: {                         // lo ya apostado por todos, por resultado
    terminal: new Array(10).fill(0),
    fijo: new Array(100).fill(0),
    parle: {}                        // clave "a-b" -> monto
  },
  girando: false,
  filtro: null
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const money = (n) => '$' + n.toFixed(2);

/** Clave de una jugada, para consultar su cupo. */
function claveJugada(elegidos, modo) {
  if (modo.id === 'parle') return [...elegidos].sort((a, b) => a - b).join('-');
  return String(elegidos[0]);
}

/** Cuanto se lleva ya apostado a la jugada seleccionada. */
function ocupadoDe(elegidos, modo) {
  if (elegidos.length < modo.seleccion) return 0;
  if (modo.id === 'parle') return S.ocupado.parle[claveJugada(elegidos, modo)] ?? 0;
  return S.ocupado[modo.id][elegidos[0]] ?? 0;
}

/* ================================================================== */
/* Avisos                                                              */
/* ================================================================== */

let toastTimer = null;
function aviso(texto, esError = false) {
  const t = $('toast');
  t.textContent = texto;
  t.className = 'toast show' + (esError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ================================================================== */
/* Wallet                                                             */
/* ================================================================== */

function pintarWallet({ cuenta } = {}) {
  const btn = $('btn-wallet');
  const pill = $('net');

  if (cuenta) {
    btn.textContent = wallet.abreviar(cuenta);
    btn.classList.add('connected');
    pill.classList.add('show');

    if (wallet.esRedCorrecta()) {
      pill.classList.remove('bad');
      $('net-txt').textContent = 'BNB Chain';
    } else {
      pill.classList.add('bad');
      $('net-txt').textContent = 'Red incorrecta';
    }
  } else {
    btn.textContent = 'Conectar wallet';
    btn.classList.remove('connected');
    pill.classList.remove('show');
  }
}

async function pulsarWallet() {
  if (wallet.cuentaActual()) {
    if (!wallet.esRedCorrecta()) {
      try {
        await wallet.cambiarARedCorrecta();
      } catch {
        aviso('No se pudo cambiar de red', true);
      }
      return;
    }
    aviso('Wallet conectada: ' + wallet.abreviar(wallet.cuentaActual()));
    return;
  }

  try {
    const cuenta = await wallet.conectar();
    aviso('Conectada ' + wallet.abreviar(cuenta));
  } catch (err) {
    if (err.message === 'NO_WALLET') {
      aviso('No se detectó ninguna wallet. Instala MetaMask o Trust Wallet.', true);
    } else {
      aviso('Conexión cancelada', true);
    }
  }
}

/* ================================================================== */
/* Modos                                                               */
/* ================================================================== */

function pintarModos() {
  const host = $('modes');
  host.innerHTML = '';

  for (const m of Object.values(MODOS)) {
    const cupo = maxStake(S.banca, CONFIG.exposureBps, m.multiplicador);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mode' + (S.modo.id === m.id ? ' on' : '');
    b.innerHTML = `
      <div class="top-row">
        <span class="name">${m.nombre}</span>
        <span class="mult">${m.multiplicador}×</span>
      </div>
      <div class="desc">${m.descripcion}</div>
      <div class="cap">cupo por jugada · ${money(cupo)}</div>
    `;
    b.addEventListener('click', () => cambiarModo(m));
    host.appendChild(b);
  }
}

function cambiarModo(m) {
  if (S.girando) return;
  S.modo = m;
  S.elegidos = [];
  pintarModos();
  pintarRejilla();
  pintarBoleta();
}

/* ================================================================== */
/* Rejilla de números                                                  */
/* ================================================================== */

function pintarRejilla() {
  const m = S.modo;
  const grid = $('grid');
  grid.className = 'grid-nums ' + (m.rango === 10 ? 'g5' : 'g10');
  grid.innerHTML = '';

  $('picker-title').textContent =
    m.id === 'terminal' ? 'Escoge tu terminal'
    : m.id === 'fijo'   ? 'Escoge tu número'
    : 'Escoge dos números';

  $('picker-hint').textContent =
    m.seleccion === 2
      ? `${S.elegidos.length} de 2 elegidos`
      : m.id === 'terminal' ? 'del 0 al 9' : 'del 00 al 99';

  const cupo = maxStake(S.banca, CONFIG.exposureBps, m.multiplicador);

  for (let i = 0; i < m.rango; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'num' + (m.rango === 10 ? ' big' : '') + (S.elegidos.includes(i) ? ' on' : '');

    const etiqueta = m.rango === 10 ? String(i) : pad2(i);
    b.innerHTML = `<span>${etiqueta}</span>`;

    // Barra de cupo solo cuando el resultado es individual
    if (m.id !== 'parle') {
      const usado = S.ocupado[m.id][i] ?? 0;
      const pct = cupo > 0 ? Math.min(100, (usado / cupo) * 100) : 0;
      const cls = pct >= 99.5 ? 'full' : pct >= 60 ? 'warm' : '';
      const bar = document.createElement('span');
      bar.className = 'bar';
      bar.innerHTML = `<i class="${cls}" style="width:${pct}%"></i>`;
      b.appendChild(bar);

      if (pct >= 99.5) b.disabled = true;
      b.title = `${etiqueta} · ${nombreDe(m.id === 'terminal' ? i : i)} · quedan ${money(Math.max(0, cupo - usado))}`;
    } else {
      b.title = `${etiqueta} · ${nombreDe(i)}`;
    }

    if (S.girando) b.disabled = true;
    b.addEventListener('click', () => elegir(i));
    grid.appendChild(b);
  }
}

function elegir(n) {
  if (S.girando) return;
  const m = S.modo;

  if (S.elegidos.includes(n)) {
    S.elegidos = S.elegidos.filter((x) => x !== n);
  } else if (m.seleccion === 1) {
    S.elegidos = [n];
  } else {
    if (S.elegidos.length >= m.seleccion) S.elegidos.shift();
    S.elegidos.push(n);
  }

  pintarRejilla();
  pintarBoleta();
}

/* ================================================================== */
/* Boleta                                                              */
/* ================================================================== */

function pintarBoleta() {
  const m = S.modo;
  const monto = parseFloat($('monto').value) || 0;
  const premio = monto * m.multiplicador;

  $('premio').textContent = money(premio);
  $('s-premio').textContent = money(premio);

  $('s-jugada').textContent = S.elegidos.length === 0
    ? '—'
    : (m.rango === 10 ? S.elegidos.join(' ') : S.elegidos.map(pad2).join(' · '));

  const btn = $('btn-play');

  if (S.girando) {
    btn.disabled = true;
    btn.textContent = 'Sorteando…';
    return;
  }

  if (S.elegidos.length < m.seleccion) {
    btn.disabled = true;
    btn.textContent = m.seleccion === 2 ? 'Escoge dos números' : 'Escoge tu número';
    return;
  }

  if (monto < CONFIG.minApuesta) {
    btn.disabled = true;
    btn.textContent = `Mínimo ${money(CONFIG.minApuesta)}`;
    return;
  }

  const check = seAcepta(
    S.banca, CONFIG.exposureBps, m.multiplicador, ocupadoDe(S.elegidos, m), monto
  );

  if (!check.aceptada) {
    btn.disabled = true;
    btn.textContent = check.disponible <= 0.001
      ? 'Cupo lleno — juega otro'
      : `Cupo: máximo ${money(check.disponible)}`;
    return;
  }

  btn.disabled = false;
  btn.textContent = `Jugar ${money(monto)}`;
}

/* ================================================================== */
/* Sorteo                                                              */
/* ================================================================== */

/** Rellena parte de los cupos, para que la demostración no se vea vacía. */
function simularOtros() {
  const m = S.modo;
  if (m.id === 'parle') return;

  const cupo = maxStake(S.banca, CONFIG.exposureBps, m.multiplicador);
  for (let i = 0; i < m.rango; i++) {
    if (Math.random() < 0.45) {
      const hueco = Math.max(0, cupo - S.ocupado[m.id][i]);
      if (hueco > 0.02) S.ocupado[m.id][i] += Math.random() * hueco * 0.65;
    }
  }
}

function crearBolas(cantidad) {
  const host = $('balls');
  host.innerHTML = '';
  const etiquetas = ['fijo', '2°', '3°', '4°', '5°'];

  for (let i = 0; i < cantidad; i++) {
    const wrap = document.createElement('div');
    wrap.className = 'bola-wrap';
    wrap.innerHTML = `
      <div class="bola" data-i="${i}">--</div>
      <div class="bola-label">${etiquetas[i]}</div>
    `;
    host.appendChild(wrap);
  }
}

async function jugar() {
  const m = S.modo;
  const monto = parseFloat($('monto').value) || 0;
  if (S.elegidos.length < m.seleccion) return;

  const check = seAcepta(
    S.banca, CONFIG.exposureBps, m.multiplicador, ocupadoDe(S.elegidos, m), monto
  );
  if (!check.aceptada) return;

  // Registrar la apuesta
  if (m.id === 'parle') {
    const k = claveJugada(S.elegidos, m);
    S.ocupado.parle[k] = (S.ocupado.parle[k] ?? 0) + monto;
  } else {
    S.ocupado[m.id][S.elegidos[0]] += monto;
  }

  const misNumeros = [...S.elegidos];
  S.girando = true;
  pintarRejilla();
  pintarBoleta();
  simularOtros();

  // --- Animación del bombo ---
  crearBolas(5);
  const bolas = $$('.bola');
  bolas.forEach((b) => b.classList.add('spin'));
  $('draw-name').textContent = 'girando el bombo';
  $('draw-msg').textContent = 'Sacando los cinco números…';
  $('draw-msg').className = 'msg';

  const spin = setInterval(() => {
    bolas.forEach((b) => { b.textContent = pad2(Math.floor(Math.random() * 100)); });
  }, 70);

  await new Promise((r) => setTimeout(r, 1600));
  clearInterval(spin);

  // --- El sorteo. En producción esto sale del contrato. ---
  const salidos = [];
  while (salidos.length < 5) {
    const n = Math.floor(Math.random() * 100);
    if (!salidos.includes(n)) salidos.push(n);
  }

  // Revelar una a una
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setTimeout(r, 380));
    bolas[i].classList.remove('spin');
    bolas[i].textContent = pad2(salidos[i]);
    if (i === 0) bolas[i].classList.add('first');
  }

  // --- ¿Acertó? ---
  const fijo = salidos[0];
  let acierta = false;

  if (m.id === 'terminal') {
    acierta = (fijo % 10) === misNumeros[0];
    if (acierta) bolas[0].classList.add('hit');
  } else if (m.id === 'fijo') {
    const pos = salidos.indexOf(misNumeros[0]);
    acierta = pos >= 0;
    if (acierta) bolas[pos].classList.add('hit');
  } else {
    const posiciones = misNumeros.map((n) => salidos.indexOf(n));
    acierta = posiciones.every((p) => p >= 0);
    if (acierta) posiciones.forEach((p) => bolas[p].classList.add('hit'));
  }

  $('draw-name').textContent = `${pad2(fijo)} · ${nombreDe(fijo)}`;

  if (acierta) {
    const premio = monto * m.multiplicador;
    S.banca -= (premio - monto);
    $('draw-msg').className = 'msg win';
    $('draw-msg').textContent = `¡Salió! Cobras ${money(premio)}`;
    lanzarConfeti();
    aviso(`Ganaste ${money(premio)}`);
  } else {
    S.banca += monto;
    $('draw-msg').className = 'msg lose';
    $('draw-msg').textContent =
      m.id === 'terminal'
        ? `El fijo terminó en ${fijo % 10}. Esta vez no.`
        : 'Esta vez no salió lo tuyo.';
  }

  // --- Nueva ronda ---
  S.ronda += 1;
  S.ocupado.terminal = new Array(10).fill(0);
  S.ocupado.fijo = new Array(100).fill(0);
  S.ocupado.parle = {};
  S.elegidos = [];
  S.girando = false;

  pintarCabecera();
  pintarModos();
  pintarRejilla();
  pintarBoleta();
  pintarModalEconomia();
}

/* ================================================================== */
/* Charada                                                             */
/* ================================================================== */

function pintarFiltros() {
  const host = $('filtros');
  host.innerHTML = '';

  const todos = document.createElement('button');
  todos.type = 'button';
  todos.className = 'filtro' + (S.filtro === null ? ' on' : '');
  todos.textContent = 'Todos';
  todos.addEventListener('click', () => { S.filtro = null; pintarFiltros(); pintarCharada(); });
  host.appendChild(todos);

  for (const [id, f] of Object.entries(FAMILIAS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtro' + (S.filtro === id ? ' on' : '');
    b.textContent = f.etiqueta;
    b.addEventListener('click', () => { S.filtro = id; pintarFiltros(); pintarCharada(); });
    host.appendChild(b);
  }
}

function pintarCharada() {
  const host = $('charada-grid');
  host.innerHTML = '';

  for (const item of CHARADA) {
    const div = document.createElement('div');
    const oculto = S.filtro && item.familia !== S.filtro;
    div.className = 'ch-item' + (oculto ? ' dim' : '');
    div.innerHTML = `<span class="n">${pad2(item.n)}</span><span class="nm">${item.nombre}</span>`;
    div.style.cursor = 'pointer';
    div.addEventListener('click', () => {
      if (S.girando) return;
      if (S.modo.id === 'terminal') cambiarModo(MODOS.fijo);
      elegir(item.n);
      document.getElementById('jugar').scrollIntoView({ behavior: 'smooth' });
    });
    host.appendChild(div);
  }
}

/* ================================================================== */
/* Cabecera y modales                                                  */
/* ================================================================== */

function pintarCabecera() {
  $('s-banca').textContent = money(S.banca);
  $('s-ronda').textContent = '#' + S.ronda;
}

function pintarModalEconomia() {
  $('e-cap-t').textContent = money(maxStake(S.banca, CONFIG.exposureBps, MODOS.terminal.multiplicador));
  $('e-cap-f').textContent = money(maxStake(S.banca, CONFIG.exposureBps, MODOS.fijo.multiplicador));
  $('e-cap-p').textContent = money(maxStake(S.banca, CONFIG.exposureBps, MODOS.parle.multiplicador));
}

function conectarModales() {
  $$('[data-modal]').forEach((b) => {
    b.addEventListener('click', () => {
      $('m-' + b.dataset.modal).classList.add('open');
    });
  });

  $$('.modal-close').forEach((b) => {
    b.addEventListener('click', () => b.closest('.modal').classList.remove('open'));
  });

  $$('.modal').forEach((m) => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.open').forEach((m) => m.classList.remove('open'));
  });
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */

function init() {
  // Verso del día. Se deriva SOLO de la fecha: no sabe nada del sorteo.
  const v = versoDelDia();
  $('verso-txt').textContent = `«${v.texto}»`;
  $('verso-fecha').textContent = `${v.fecha} · el verso no tiene relación con el número que sale`;

  pintarCabecera();
  pintarModos();
  pintarRejilla();
  pintarBoleta();
  pintarFiltros();
  pintarCharada();
  pintarModalEconomia();
  conectarModales();
  crearBolas(5);

  $('monto').addEventListener('input', pintarBoleta);
  $('btn-play').addEventListener('click', jugar);
  $('btn-wallet').addEventListener('click', pulsarWallet);
  $('net').addEventListener('click', () => {
    if (!wallet.esRedCorrecta()) wallet.cambiarARedCorrecta().catch(() => {});
  });

  $$('.chip').forEach((c) => {
    c.addEventListener('click', () => { $('monto').value = c.dataset.amt; pintarBoleta(); });
  });

  wallet.alCambiar(pintarWallet);
  wallet.reconectarSiProcede().then(() => pintarWallet({ cuenta: wallet.cuentaActual() }));

  simularOtros();
  pintarRejilla();

  console.info(
    '[Bolita] Margen por modo:',
    Object.values(MODOS).map((m) => `${m.nombre} ${margen(m).toFixed(0)}%`).join(' · ')
  );
}

init();
