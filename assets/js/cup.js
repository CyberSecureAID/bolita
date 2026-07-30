/**
 * PESO CUBANO (CUP) — capa VISUAL
 * ================================
 *
 * La Bolita es cubana: por defecto todo se muestra en pesos cubanos (CUP).
 * Pero por debajo NADA cambia: se apuesta, se gana y se retira en la MISMA
 * cripto que el jugador elige (USDT, BTCB, ETH...). El CUP es solo una lente
 * para ver los números en la moneda que la gente entiende.
 *
 * Cadena de conversión:   cripto  →  USD (precio real de mercado)  →  CUP
 *
 *   - cripto → USD: usa el precio de mercado (CoinGecko, ya en prices.js).
 *   - USD → CUP: usa la TASA de abajo (mercado informal cubano).
 *
 * La tasa se ajusta a mano cuando haga falta (una vez al mes basta). Si algún
 * día se quiere automática, se alimenta desde un worker y se cambia solo TASA().
 */

/* ================================================================== */
/* TASA — pesos cubanos por 1 dólar (mercado informal). AJUSTA AQUÍ.   */
/* ================================================================== */

export const CUP_POR_USD = 700;

/** Ruta del logo de la moneda (peso cubano) y su versión inline pequeña. */
export const CUP_LOGO = 'assets/img/cup-coin.webp';
/** Etiqueta HTML del icono pequeño (para poner junto a textos). */
export const CUP_ICONO = `<img src="${CUP_LOGO}" alt="CUP" class="cup-ic">`;
export const CUP_SIGLA = 'CUP';

/* ================================================================== */
/* Estado: ver en CUP (por defecto) o en cripto                        */
/* ================================================================== */

let _verEnCUP = true;
export function verEnCUP()      { return _verEnCUP; }
export function ponerVista(cup) { _verEnCUP = Boolean(cup); }
export function alternarVista() { _verEnCUP = !_verEnCUP; return _verEnCUP; }

/* ================================================================== */
/* Precios de referencia (respaldo si CoinGecko no responde)           */
/* ================================================================== */

/**
 * Precios USD aproximados por moneda. Solo se usan como RESPALDO cuando la
 * tabla en vivo (CoinGecko) no tiene el dato, para que la vista en CUP nunca
 * se quede sin funcionar. No son exactos; el precio real llega de CoinGecko.
 * Ajusta estos si cambian mucho.
 */
export const PRECIO_REF = {
  BNB: 600,
  USDT: 1,
  USDC: 1,
  BTCB: 95000,
  ETH: 3000,
  USDTZ: 1,          // USDT.z se referencia como ~1 USD
  BABYDOGE: 0.0000000003,
  EXT: 0.000031664,
};

/**
 * Devuelve el precio USD de una moneda: primero el de la tabla en vivo, y si
 * no está, el de referencia. Garantiza que la conversión a CUP siempre tenga
 * un número con el que trabajar.
 */
export function precioDe(monedaId, tablaPrecios) {
  const vivo = tablaPrecios?.[monedaId];
  if (typeof vivo === 'number' && vivo > 0) return vivo;
  return PRECIO_REF[monedaId] ?? null;
}


/**
 * Cuántos CUP vale una cantidad de cripto.
 * @param {number} cantidadCripto  en unidades de la moneda (no wei)
 * @param {string} monedaId        USDT, BTCB, ETH...
 * @param {object} tablaPrecios    la tabla de precios USD (de prices())
 * @returns {number|null} CUP, o null si no hay precio
 */
export function criptoAcup(cantidadCripto, monedaId, tablaPrecios) {
  const precioUSD = precioDe(monedaId, tablaPrecios);
  if (typeof precioUSD !== 'number' || typeof cantidadCripto !== 'number') return null;
  return cantidadCripto * precioUSD * CUP_POR_USD;
}

/**
 * Cuánta cripto equivale a una cantidad de CUP.
 * @returns {number|null} cantidad de cripto, o null si no hay precio
 */
export function cupAcripto(cantidadCUP, monedaId, tablaPrecios) {
  const precioUSD = precioDe(monedaId, tablaPrecios);
  if (typeof precioUSD !== 'number' || !precioUSD || typeof cantidadCUP !== 'number') return null;
  return cantidadCUP / (precioUSD * CUP_POR_USD);
}

/* ================================================================== */
/* Formato                                                             */
/* ================================================================== */

/** Formatea una cantidad de CUP: "1,400 CUP" (redondeo limpio, texto plano). */
export function fmtCUP(cantidadCUP, { conSigla = true } = {}) {
  if (typeof cantidadCUP !== 'number' || isNaN(cantidadCUP)) return '—';
  let txt;
  if (cantidadCUP === 0) txt = '0';
  else if (cantidadCUP < 1) txt = cantidadCUP.toLocaleString('es', { maximumFractionDigits: 2 });
  else if (cantidadCUP < 1000) txt = cantidadCUP.toLocaleString('es', { maximumFractionDigits: 1 });
  else txt = Math.round(cantidadCUP).toLocaleString('es');
  return conSigla ? `${txt} ${CUP_SIGLA}` : txt;
}

/**
 * Muestra una cantidad de cripto ya sea en CUP (si la vista es CUP y hay
 * precio) o en su propia moneda. Es el punto único que decide qué ve el
 * usuario. Recibe el formateador de cripto para no duplicar lógica.
 *
 * @param {number} cantidadCripto
 * @param {object} moneda           objeto moneda (con id)
 * @param {object} tablaPrecios
 * @param {function} fmtCripto      (cantidad, moneda) => string
 */
export function mostrar(cantidadCripto, moneda, tablaPrecios, fmtCripto) {
  if (_verEnCUP && moneda) {
    const cup = criptoAcup(cantidadCripto, moneda.id, tablaPrecios);
    if (cup !== null) return fmtCUP(cup);
  }
  // Sin precio o vista en cripto: mostrar en la moneda real.
  return fmtCripto ? fmtCripto(cantidadCripto, moneda) : String(cantidadCripto);
}

/* ================================================================== */
/* Mínimo de apuesta en CUP                                            */
/* ================================================================== */

/**
 * Mínimo visual de apuesta en CUP. 7 CUP = 0.01 USD (con tasa 700).
 * No sustituye al mínimo del contrato (que es diminuto); es el mínimo
 * "bonito" que ve el usuario para que no aparezcan fracciones raras.
 */
export const MIN_CUP = 7;
