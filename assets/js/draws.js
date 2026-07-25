/**
 * CALENDARIO DE SORTEOS
 * =====================
 *
 * Dos tiradas al día:
 *
 *     MEDIODÍA .... 12:00
 *     NOCHE ....... 22:00
 *
 * Las apuestas de una tirada se cierran unos minutos antes de la hora, para
 * que nadie pueda apostar con el resultado ya encaminado. Ese margen es el
 * `CIERRE_MINUTOS`.
 *
 * TODO se calcula en HORA DE CUBA (America/Havana), no en la del dispositivo.
 * Así el jugador ve el horario cubano esté donde esté. Cuando el contrato esté
 * desplegado, la hora buena será la de la cadena (block.timestamp, en UTC) y
 * esto solo sirve para mostrar la cuenta atrás.
 */

/** Zona horaria oficial del juego. */
export const ZONA = 'America/Havana';

/**
 * "Ahora" pero visto desde La Habana: devuelve un Date cuyos getHours/getDate
 * corresponden a la hora cubana, para poder operar con setHours cómodamente.
 */
function ahoraEnCuba(base = new Date()) {
  const str = base.toLocaleString('en-US', { timeZone: ZONA });
  return new Date(str);
}

/** Diferencia en ms entre la hora local del navegador y la de Cuba. */
function desfaseCuba(base = new Date()) {
  return base.getTime() - ahoraEnCuba(base).getTime();
}

export const TIRADAS = [
  { id: 'dia',   nombre: 'Mediodía', hora: 12, minuto: 0, icono: '☀️' },
  { id: 'noche', nombre: 'Noche',    hora: 22, minuto: 0, icono: '🌙' }
];

/** Minutos antes de la hora en que se cierran las apuestas. */
export const CIERRE_MINUTOS = 10;

function conHora(base, hora, minuto) {
  const d = new Date(base);
  d.setHours(hora, minuto, 0, 0);
  return d;
}

/**
 * Devuelve la próxima tirada y sus tiempos.
 *
 * @returns {{
 *   tirada: object, cuando: Date, cierre: Date,
 *   abierta: boolean, faltaMs: number, faltaCierreMs: number
 * }}
 */
export function proximaTirada(ahora = new Date()) {
  const cuba = ahoraEnCuba(ahora);      // "ahora" en hora cubana
  const desfase = desfaseCuba(ahora);   // para volver a tiempo real
  const candidatas = [];

  for (const offset of [0, 1]) {          // hoy y mañana
    const base = new Date(cuba);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const cuandoCuba = conHora(base, t.hora, t.minuto);
      // Convertir de "hora cubana" a instante real para la cuenta atrás
      const cuando = new Date(cuandoCuba.getTime() + desfase);
      if (cuando > ahora) candidatas.push({ tirada: t, cuando });
    }
  }

  candidatas.sort((a, b) => a.cuando - b.cuando);
  const siguiente = candidatas[0];

  const cierre = new Date(siguiente.cuando.getTime() - CIERRE_MINUTOS * 60000);
  const faltaMs = siguiente.cuando - ahora;
  const faltaCierreMs = cierre - ahora;

  return {
    tirada: siguiente.tirada,
    cuando: siguiente.cuando,
    cierre,
    abierta: faltaCierreMs > 0,
    faltaMs,
    faltaCierreMs
  };
}

/** La tirada que acaba de celebrarse, para mostrar el último resultado. */
export function ultimaTirada(ahora = new Date()) {
  const cuba = ahoraEnCuba(ahora);
  const desfase = desfaseCuba(ahora);
  const pasadas = [];

  for (const offset of [0, -1]) {
    const base = new Date(cuba);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const cuandoCuba = conHora(base, t.hora, t.minuto);
      const cuando = new Date(cuandoCuba.getTime() + desfase);
      if (cuando <= ahora) pasadas.push({ tirada: t, cuando });
    }
  }

  pasadas.sort((a, b) => b.cuando - a.cuando);
  return pasadas[0] ?? null;
}

/** "01:24:07" a partir de milisegundos. */
export function cuentaAtras(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  return [h, m, seg].map((n) => String(n).padStart(2, '0')).join(':');
}

/** "23/07/2026 · 22:00" */
export function fechaHora(fecha) {
  return fecha.toLocaleString('es', {
    timeZone: ZONA, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', ' ·');
}

/** Solo la hora: "22:00" */
export function soloHora(fecha) {
  return fecha.toLocaleTimeString('es', {
    timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false
  });
}
