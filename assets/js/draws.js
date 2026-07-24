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
 * Todo se calcula en la hora local del dispositivo. Cuando el contrato esté
 * desplegado, la hora buena será la de la cadena (block.timestamp, en UTC) y
 * esto solo sirve para mostrar la cuenta atrás.
 */

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
  const candidatas = [];

  for (const offset of [0, 1]) {          // hoy y mañana
    const base = new Date(ahora);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const cuando = conHora(base, t.hora, t.minuto);
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
  const pasadas = [];

  for (const offset of [0, -1]) {
    const base = new Date(ahora);
    base.setDate(base.getDate() + offset);

    for (const t of TIRADAS) {
      const cuando = conHora(base, t.hora, t.minuto);
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
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const yy = fecha.getFullYear();
  const hh = String(fecha.getHours()).padStart(2, '0');
  const mi = String(fecha.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yy} · ${hh}:${mi}`;
}

/** Solo la hora: "22:00" */
export function soloHora(fecha) {
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}
