/**
 * MONEDAS ADMITIDAS
 * =================
 *
 * Cada moneda declara sus propios limites en SU PROPIA UNIDAD, no en dolares.
 * Asi los premios quedan en fracciones pequeñas: satoshis, milesimas de BNB,
 * unidades de TRX. Nadie cobra cifras enormes y la banca no se expone.
 *
 * Para añadir una moneda: añade una entrada aqui. El resto de la aplicacion
 * la recoge sola — los limites, el formato y la deteccion de saldo salen de
 * este archivo.
 *
 * `address: null` significa moneda nativa de la red (BNB en BSC).
 */

export const RED = {
  chainIdHex: '0x38',
  chainId: 56,
  nombre: 'BNB Smart Chain',
  rpc: 'https://bsc-dataseed.binance.org',
  explorador: 'https://bscscan.com',
  moneda: { nombre: 'BNB', simbolo: 'BNB', decimals: 18 }
};

export const MONEDAS = {
  BNB: {
    id: 'BNB',
    simbolo: 'BNB',
    nombre: 'BNB',
    address: null,              // nativa
    decimals: 18,
    icono: 'B',   // respaldo si no carga el logo remoto
    color: '#F0B90B',
    // Limites en unidades de la moneda
    minApuesta: 0.0002,         // ~$0.12
    maxPorJugada: 0.004,        // ~$2.40
    maxPorPersona: 0.01,        // ~$6 por sorteo
    maxPago: 0.03,              // ~$18 — techo de lo que puede cobrar UNA jugada
    // Como mostrarla
    decimalesVista: 5,
    unidadPequena: { nombre: 'gwei', factor: 1e9 }
  },

  USDT: {
    id: 'USDT',
    simbolo: 'USDT',
    nombre: 'Tether',
    address: '0x55d398326f99059fF775485246999027B3197955',
    decimals: 18,               // USDT en BSC usa 18, no 6
    icono: 'T',
    color: '#26A17B',
    minApuesta: 0.10,
    maxPorJugada: 2.00,
    maxPorPersona: 5.00,
    maxPago: 15.00,
    decimalesVista: 2,
    unidadPequena: { nombre: 'centavos', factor: 100 }
  },

  USDC: {
    id: 'USDC',
    simbolo: 'USDC',
    nombre: 'USD Coin',
    address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    decimals: 18,
    icono: 'C',
    color: '#2775CA',
    minApuesta: 0.10,
    maxPorJugada: 2.00,
    maxPorPersona: 5.00,
    maxPago: 15.00,
    decimalesVista: 2,
    unidadPequena: { nombre: 'centavos', factor: 100 }
  },

  BTCB: {
    id: 'BTCB',
    simbolo: 'BTCB',
    nombre: 'Bitcoin BEP20',
    address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
    decimals: 18,
    icono: 'B',
    color: '#F7931A',
    // En satoshis: minimo 200 sat, maximo 4.000 sat por jugada
    minApuesta: 0.000002,
    maxPorJugada: 0.00004,
    maxPorPersona: 0.0001,
    maxPago: 0.0002,            // 20.000 sat — techo por jugada
    decimalesVista: 8,
    unidadPequena: { nombre: 'sat', factor: 1e8 }
  },

  ETH: {
    id: 'ETH',
    simbolo: 'ETH',
    nombre: 'Ethereum BEP20',
    address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
    decimals: 18,
    icono: 'E',
    color: '#627EEA',
    minApuesta: 0.00005,
    maxPorJugada: 0.001,
    maxPorPersona: 0.0025,
    maxPago: 0.006,
    decimalesVista: 6,
    unidadPequena: { nombre: 'gwei', factor: 1e9 }
  }
};

export const LISTA_MONEDAS = Object.values(MONEDAS);

/**
 * Formatea una cantidad en la unidad de la moneda.
 * Recorta ceros a la derecha para que no se vea "0.00200000".
 */
export function formatear(cantidad, moneda, { conSimbolo = true } = {}) {
  if (cantidad === null || cantidad === undefined || isNaN(cantidad)) return '—';

  let txt;
  if (cantidad === 0) {
    txt = '0';
  } else if (cantidad < 1 / Math.pow(10, moneda.decimalesVista)) {
    txt = '<' + (1 / Math.pow(10, moneda.decimalesVista)).toFixed(moneda.decimalesVista);
  } else {
    txt = cantidad.toFixed(moneda.decimalesVista).replace(/\.?0+$/, '');
  }

  return conSimbolo ? `${txt} ${moneda.simbolo}` : txt;
}

/**
 * Version corta para el saldo grande del banner: separa la parte entera
 * de los decimales para poder darles tamaños distintos.
 */
export function partirSaldo(cantidad, moneda) {
  if (cantidad === null || cantidad === undefined || isNaN(cantidad)) {
    return { entero: '0', decimal: '', simbolo: moneda.simbolo };
  }
  const txt = cantidad.toFixed(moneda.decimalesVista).replace(/\.?0+$/, '');
  const [entero, decimal = ''] = txt.split('.');
  return { entero, decimal, simbolo: moneda.simbolo };
}

/** La misma cantidad expresada en su unidad pequeña: satoshis, gwei, centavos. */
export function enUnidadPequena(cantidad, moneda) {
  if (!moneda.unidadPequena) return null;
  const v = cantidad * moneda.unidadPequena.factor;
  const redondeado = v >= 100 ? Math.round(v) : Math.round(v * 10) / 10;
  return `${redondeado.toLocaleString('es')} ${moneda.unidadPequena.nombre}`;
}

/** Convierte de unidades base (wei) a decimal. */
export function desdeBase(valorHex, decimals) {
  const bruto = BigInt(valorHex);
  const divisor = 10n ** BigInt(decimals);
  const entera = bruto / divisor;
  const resto = bruto % divisor;
  const frac = resto.toString().padStart(decimals, '0');
  return parseFloat(`${entera}.${frac}`);
}
