/**
 * CALENDARIO DE SORTEOS
 * =====================
 *
 * La bolita se rige por el Pick 3 de la LOTERÍA DE LA FLORIDA. Por eso TODO
 * se calcula en hora de Florida (America/New_York), NO en la del dispositivo
 * ni en la de Cuba.
 *
 *   ¿Por qué Florida y no Cuba? Florida y Cuba casi siempre van a la misma
 *   hora, pero cambian el horario de verano en fechas distintas y hay semanas
 *   con una hora de diferencia. El número sale en Florida, así que la hora
 *   buena es la de Florida. Así el reloj nunca se descuadra, mire quien mire
 *   y desde donde mire.
 *
 * Dos tiradas al día (hora de Florida):
 *
 *     MEDIODÍA .... sorteo 13:30  ·  cierre 13:00
 *     NOCHE ....... sorteo 21:45  ·  cierre 21:15
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  SEGURIDAD — LEER CON ATENCIÓN                                       │
 * │                                                                      │
 * │  Este archivo solo MUESTRA la cuenta atrás. NO impone el cierre.     │
 * │  El cierre de verdad lo tiene que imponer el CONTRATO con el reloj   │
 * │  de la cadena (block.timestamp), porque cualquier cosa que viva en   │
 * │  el navegador se puede saltar abriendo las herramientas del F12.     │
 * │                                                                      │
 * │  El contrato debe rechazar toda apuesta que llegue después del       │
 * │  cierre (30 min antes del sorteo de Florida). Aunque alguien hackee  │
 * │  la web entera y mande la apuesta directa al contrato, la cadena la  │
 * │  rechaza. La seguridad NO está en mostrar rápido, está en cerrar     │
 * │  temprano — y ese cierre vive en el contrato, no aquí.               │
 * └──────────────────────────────────────────────────────────────────────┘
 */

/** Zona horaria oficial del juego: la de la Florida Lottery. */
export const ZONA = 'America/New_York';

/**
 * Cada tirada declara la hora de su SORTEO en Florida. El cierre se calcula
 * restando CIERRE_MINUTOS.
 */
export const TIRADAS = [
  { id: 'dia',   nombre: 'Mediodía', sorteoH: 13, sorteoM: 30 },
  { id: 'noche', nombre: 'Noche',    sorteoH: 21, sorteoM: 45 }
];

/** Las apuestas se cierran 30 minutos antes del sorteo de Florida. */
export const CIERRE_MINUTOS = 30;

/* ================================================================== */
/* Utilidades de hora de Florida                                       */
/* ================================================================== */

/**
 * "Ahora" visto desde Florida: un Date cuyos getHours/getDate corresponden
 * a la hora de Florida, para poder operar cómodamente con setHours.
 */
function ahoraEnFlorida(base = new Date()) {
  return new Date(base.toLocaleString('en-US', { timeZone: ZONA }));
}

/** Desfase en ms entre la hora local del navegador y la de Florida. */
function desfaseFlorida(base = new Date()) {
  return base.getTime() - ahoraEnFlorida(base).getTime();
}

function conHora(base, hora, minuto) {
  const d = new Date(base);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

/* ================================================================== */
/* Próxima y última tirada                                             */
/* ================================================================== */

/**
 * Próxima tirada y sus tiempos, ya convertidos a instantes reales.
 *
 * @returns {{
 *   tirada:object, sorteo:Date, cierre:Date,
 *   abierta:boolean, faltaMs:number, faltaCierreMs:number
 * }}
 */
export function proximaTirada(ahora = new Date()) {
  const fl = ahoraEnFlorida(ahora);
  const desfase = desfaseFlorida(ahora);
  const candidatas = [];

  for (const offset of [0, 1]) {
    const base = new Date(fl);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const sorteoFl = conHora(base, t.sorteoH, t.sorteoM);
      const sorteo = new Date(sorteoFl.getTime() + desfase);   // instante real
      if (sorteo > ahora) candidatas.push({ tirada: t, sorteo });
    }
  }

  candidatas.sort((a, b) => a.sorteo - b.sorteo);
  const sig = candidatas[0];

  const cierre = new Date(sig.sorteo.getTime() - CIERRE_MINUTOS * 60000);

  return {
    tirada: sig.tirada,
    sorteo: sig.sorteo,
    cierre,
    abierta: cierre > ahora,
    faltaMs: sig.sorteo - ahora,
    faltaCierreMs: cierre - ahora
  };
}

/** La última tirada ya celebrada, para pedir su resultado. */
export function ultimaTirada(ahora = new Date()) {
  const fl = ahoraEnFlorida(ahora);
  const desfase = desfaseFlorida(ahora);
  const pasadas = [];

  for (const offset of [0, -1]) {
    const base = new Date(fl);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const sorteoFl = conHora(base, t.sorteoH, t.sorteoM);
      const sorteo = new Date(sorteoFl.getTime() + desfase);
      if (sorteo <= ahora) pasadas.push({ tirada: t, sorteo });
    }
  }

  pasadas.sort((a, b) => b.sorteo - a.sorteo);
  return pasadas[0] ?? null;
}

/* ================================================================== */
/* Formato                                                             */
/* ================================================================== */

/** "01:24:07" a partir de milisegundos. */
export function cuentaAtras(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return [h, m, seg].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Fecha y hora de un instante, EXPRESADAS en hora de Florida. */
export function fechaHora(fecha) {
  return fecha.toLocaleString('es', {
    timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', ' ·');
}

/** Solo la hora del sorteo, en hora de Florida: "13:30" */
export function soloHora(fecha) {
  return fecha.toLocaleTimeString('es', {
    timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false
  });
}
