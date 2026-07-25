/**
 * RESULTADO OFICIAL — Pick 3 de la Lotería de la Florida
 * ======================================================
 *
 * La bolita cubana se rige por el Pick 3 de Florida. De esos tres dígitos se
 * derivan todas las lecturas tradicionales:
 *
 *     Pick 3 = 4 4 6   (ejemplo)
 *
 *     FIJO      → los DOS últimos dígitos ............... 46
 *     CORRIDOS  → los otros pares que se forman ......... 44 · 46
 *     PARLÉS    → las combinaciones de dos ............... 44·46, etc.
 *     CANDADO   → los tres números juntos ............... 44 · 46 · (Pick4)
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  DE DÓNDE SALE EL NÚMERO — y por qué hace falta un "puente"          │
 * │                                                                      │
 * │  El navegador NO puede leer flalottery.com directamente: lo impide  │
 * │  la política CORS del propio navegador, por seguridad. Y GitHub     │
 * │  Pages no ejecuta código de servidor.                               │
 * │                                                                      │
 * │  Por eso este módulo pide el resultado a TU puente (un Cloudflare   │
 * │  Worker gratuito) que sí lee Florida y devuelve un JSON limpio.     │
 * │  El código del Worker se entrega aparte, con instrucciones.         │
 * │                                                                      │
 * │  Mientras no configures el Worker, este módulo devuelve null sin    │
 * │  romper nada: la página funciona igual, solo sin resultado oficial. │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * SEGURIDAD: este módulo solo LEE y MUESTRA. No decide nada de dinero. El
 * cierre de apuestas y los pagos los impone el contrato con el reloj de la
 * cadena, nunca la web (ver draws.js).
 */

/**
 * URL de tu puente. Cámbiala por la de tu Worker cuando lo tengas:
 *   https://bolita-florida.TUUSUARIO.workers.dev
 * Déjala vacía para que la página funcione sin resultado oficial todavía.
 */
export const PUENTE_URL = '';

const CACHE_MS = 60 * 1000;   // no repreguntar más de una vez por minuto
let cache = { at: 0, datos: null, enVuelo: null };

/**
 * Lee el resultado oficial más reciente (y las últimas tiradas si el puente
 * las da). Nunca lanza: si algo falla, devuelve null y la página sigue igual.
 *
 * @returns {Promise<null | {
 *   ultima: Resultado,
 *   historial: Resultado[]
 * }>}
 */
export async function resultadoOficial() {
  if (!PUENTE_URL) return null;                       // aún sin configurar

  const ahora = Date.now();
  if (cache.datos && ahora - cache.at < CACHE_MS) return cache.datos;
  if (cache.enVuelo) return cache.enVuelo;

  cache.enVuelo = (async () => {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(PUENTE_URL, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('puente ' + res.status);

      const json = await res.json();
      const datos = normalizar(json);
      cache = { at: Date.now(), datos, enVuelo: null };
      return datos;
    } catch {
      cache = { at: Date.now(), datos: cache.datos, enVuelo: null };
      return cache.datos;
    }
  })();

  return cache.enVuelo;
}

/**
 * Convierte lo que devuelva el puente en nuestra forma. Se espera algo como:
 *   { draws: [ { date, time, pick3:[4,4,6], pick4:[1,2,3,4] }, ... ] }
 * pero es tolerante: si faltan campos, rellena lo que puede.
 */
function normalizar(json) {
  const draws = Array.isArray(json?.draws) ? json.draws : [];
  const historial = draws
    .map((d) => leerTirada(d))
    .filter(Boolean);

  return { ultima: historial[0] ?? null, historial };
}

/**
 * Deriva TODAS las lecturas de la bolita a partir de un Pick 3 (y Pick 4 si
 * viene). Este es el corazón: convierte 3 dígitos en fijo, corridos, parlés
 * y candado, como se lee de toda la vida.
 *
 * @typedef {Object} Resultado
 * @property {string} fecha
 * @property {'dia'|'noche'} turno
 * @property {number[]} pick3
 * @property {string} fijo          los dos últimos dígitos, "46"
 * @property {string[]} corridos    los otros pares, ["44","46"]
 * @property {string[]} parles      pares de dos, ["46·31", ...]
 * @property {string[]} candado     los tres principales, ["46","31","59"]
 */
function leerTirada(d) {
  const p3 = Array.isArray(d?.pick3) ? d.pick3.map(Number) : null;
  if (!p3 || p3.length < 3 || p3.some(isNaN)) return null;

  const p4 = Array.isArray(d?.pick4) ? d.pick4.map(Number) : null;
  const dd = (a, b) => `${a}${b}`;

  // FIJO: los DOS últimos dígitos del Pick 3.  446 -> 46
  const fijo = dd(p3[1], p3[2]);

  // CORRIDOS: del Pick 4, sus dos pares.  3159 -> 31 y 59
  // Si no viniera el Pick 4, se derivan del propio Pick 3 como respaldo.
  const corridos = p4 && p4.length >= 4
    ? [dd(p4[0], p4[1]), dd(p4[2], p4[3])]
    : [dd(p3[0], p3[1])];

  // CANDADO: el fijo más los corridos, los tres números principales.
  const candado = [fijo, ...corridos];

  // PARLÉS: todas las parejas posibles entre los principales.
  const parles = [];
  for (let i = 0; i < candado.length; i++) {
    for (let j = i + 1; j < candado.length; j++) {
      parles.push(`${candado[i]}·${candado[j]}`);
    }
  }

  return {
    fecha: d.date ?? '',
    turno: d.time === 'midday' || d.turno === 'dia' ? 'dia' : 'noche',
    pick3: p3,
    pick4: p4,
    fijo,
    corridos,
    parles,
    candado
  };
}

/**
 * Para pruebas y para ver el diseño sin puente: deriva las lecturas de un
 * Pick 3 dado a mano. No pide nada a la red.
 */
export function leerPick3(a, b, c, opts = {}) {
  const { fecha = '', turno = 'dia', pick4 = null } = opts;
  return leerTirada({ pick3: [a, b, c], pick4, date: fecha, turno });
}
