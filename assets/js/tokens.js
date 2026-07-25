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
  },

  USDTZ: {
    id: 'USDTZ',
    simbolo: 'USDT.z',
    nombre: 'USDT.z',
    address: '0x4BE35Ec329343d7d9F548d42B0F8c17FFfe07db4',
    decimals: 18,
    icono: 'Z',
    color: '#26A17B',
    minApuesta: 0.10,
    maxPorJugada: 2.00,
    maxPorPersona: 5.00,
    maxPago: 15.00,
    decimalesVista: 2,
    unidadPequena: { nombre: 'centavos', factor: 100 }
  },

  BABYDOGE: {
    id: 'BABYDOGE',
    simbolo: 'BabyDoge',
    nombre: 'Baby Doge Coin',
    address: '0xc748673057861a797275CD8A068AbB95A902e8de',
    decimals: 9,
    icono: '🐶',
    color: '#F4B733',
    comisionPct: 10,            // Baby Doge cobra ~10% por transferencia
    precioUSD: 0.0000000003,    // ~0.3 mil-millonésimas de dólar (referencia)
    minApuesta: 30000000,       // ~$0.01
    maxPorJugada: 3000000000,
    maxPorPersona: 7000000000,
    maxPago: 24000000000,
    decimalesVista: 0,
    unidadPequena: { nombre: '', factor: 1 }
  },

  EXT: {
    id: 'EXT',
    simbolo: 'EXT',
    nombre: 'ExactTrader',
    address: '0xd86b5cd7cFC28a1e4Fd6b39F133bF64EF24c5246',
    decimals: 18,
    icono: 'X',
    color: '#8B5CF6',
    precioUSD: 0.000031664,     // precio de referencia
    minApuesta: 100000,
    maxPorJugada: 2000000,
    maxPorPersona: 5000000,
    maxPago: 16000000,
    decimalesVista: 0,
    unidadPequena: { nombre: '', factor: 1 }
  }
};

// Enlaces para comprar cada moneda (plataformas seguras y reconocidas).
export const COMPRAR_URL = {
  BNB:      'https://www.moonpay.com/buy/bnb',
  USDT:     'https://pancakeswap.finance/swap?outputCurrency=0x55d398326f99059fF775485246999027B3197955',
  USDC:     'https://pancakeswap.finance/swap?outputCurrency=0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  BTCB:     'https://pancakeswap.finance/swap?outputCurrency=0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  ETH:      'https://pancakeswap.finance/swap?outputCurrency=0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  USDTZ:    'https://pancakeswap.finance/swap?outputCurrency=0x4BE35Ec329343d7d9F548d42B0F8c17FFfe07db4',
  BABYDOGE: 'https://pancakeswap.finance/swap?outputCurrency=0xc748673057861a797275CD8A068AbB95A902e8de',
  EXT:      'https://smartdefi.com/token/bsc/0xd86b5cd7cFC28a1e4Fd6b39F133bF64EF24c5246/(chart//secondary:swap)'
};

export const LISTA_MONEDAS = Object.values(MONEDAS);

/**
 * Formatea una cantidad en la unidad de la moneda.
 * Recorta ceros a la derecha para que no se vea "0.00200000".
 */
/**
 * Formatea cifras GRANDES de forma compacta para que no se desborden:
 *   1 234        -> "1,234"
 *   45 300       -> "45.3 K"
 *   1 500 000    -> "1.5 M"
 *   33 200 000000 -> "33.2 B"  (miles de millones)
 *   2 500 000000000 -> "2.5 T" (billones)
 * Ideal para Baby Doge y tokens de precio ínfimo donde con pocos dólares se
 * compran miles de millones de unidades.
 */
export function compacto(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + ' T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' M';
  if (abs >= 1e4)  return (n / 1e3).toFixed(1).replace(/\.?0+$/, '') + ' K';
  // Por debajo de 10.000, con separador de miles
  return Math.round(n).toLocaleString('en-US');
}

export function formatear(cantidad, moneda, { conSimbolo = true } = {}) {
  if (cantidad === null || cantidad === undefined || isNaN(cantidad)) return '—';

  let txt;
  if (cantidad === 0) {
    txt = '0';
  } else if (cantidad >= 10000) {
    // Cifras grandes: forma compacta (Baby Doge, EXT...) para no desbordar.
    txt = compacto(cantidad);
  } else if (cantidad < 1 / Math.pow(10, moneda.decimalesVista)) {
    txt = cantidad.toFixed(8).replace(/\.?0+$/, '');
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
  // Cifras grandes: forma compacta, todo en la parte "entera" (sin decimales
  // sueltos que descuadren), para que no se desborde el saldo.
  if (cantidad >= 10000) {
    return { entero: compacto(cantidad), decimal: '', simbolo: moneda.simbolo };
  }
  const dec = cantidad > 0 && cantidad < 1 / Math.pow(10, moneda.decimalesVista)
    ? 8 : moneda.decimalesVista;
  const txt = cantidad.toFixed(dec).replace(/\.?0+$/, '');
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
