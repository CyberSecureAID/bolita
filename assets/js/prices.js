/**
 * LOGOTIPOS Y PRECIOS DE LAS MONEDAS
 * ==================================
 *
 * DOS FUENTES DISTINTAS, cada una para lo que hace bien:
 *
 * 1. LOGOTIPOS → repositorio de assets de Trust Wallet (GitHub raw)
 *    Se piden por dirección de contrato, no hay clave ni límite de peticiones,
 *    y son los mismos iconos que usan las wallets. Más fiable que CoinGecko
 *    para esto, porque CoinGecko cambia las rutas de sus imágenes.
 *
 * 2. PRECIOS → API pública de CoinGecko
 *    Gratis y sin clave, pero CON LÍMITE de peticiones. Por eso:
 *      · se piden TODAS las monedas en UNA sola llamada
 *      · se guarda el resultado 5 minutos
 *      · si falla, la página sigue funcionando sin precios
 *
 * El precio es solo informativo: sirve para enseñar "≈ $12.40" al lado del
 * saldo. Nada del juego depende de él.
 */

/* ================================================================== */
/* Logotipos                                                           */
/* ================================================================== */

const TRUST = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain';

/** Direcciones tal y como las espera el repositorio (checksum). */
const LOGO_POR_ID = {
  BNB:  `${TRUST}/info/logo.png`,
  USDT: `${TRUST}/assets/0x55d398326f99059fF775485246999027B3197955/logo.png`,
  USDC: `${TRUST}/assets/0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d/logo.png`,
  BTCB: `${TRUST}/assets/0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c/logo.png`,
  ETH:  `${TRUST}/assets/0x2170Ed0880ac9A755fd29B2688956BD959F933F8/logo.png`,
  USDTZ: `${TRUST}/assets/0x55d398326f99059fF775485246999027B3197955/logo.png`,
  BABYDOGE: `${TRUST}/assets/0xc748673057861a797275CD8A068AbB95A902e8de/logo.png`,
  EXT: 'assets/img/ext-logo.webp'
};

export function logoDe(monedaId) {
  return LOGO_POR_ID[monedaId] ?? null;
}

/* ================================================================== */
/* Precios                                                             */
/* ================================================================== */

/** Identificadores de CoinGecko para cada moneda nuestra. */
const COINGECKO_ID = {
  BNB:  'binancecoin',
  USDT: 'tether',
  USDC: 'usd-coin',
  BTCB: 'binance-bitcoin',
  ETH:  'ethereum'
};

const CACHE_MS = 5 * 60 * 1000;
let cache = { at: 0, datos: null, enVuelo: null };

/**
 * Precios en dólares de todas las monedas, en UNA sola petición.
 * Devuelve {} si CoinGecko no responde: la página sigue igual, solo sin
 * el equivalente en dólares.
 *
 * @returns {Promise<Record<string, number>>}
 */
export async function precios() {
  const ahora = Date.now();

  if (cache.datos && ahora - cache.at < CACHE_MS) return cache.datos;
  if (cache.enVuelo) return cache.enVuelo;   // evita peticiones duplicadas

  const ids = Object.values(COINGECKO_ID).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;

  cache.enVuelo = (async () => {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 6000);

      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('respuesta ' + res.status);
      const json = await res.json();

      const salida = {};
      for (const [id, cgId] of Object.entries(COINGECKO_ID)) {
        const p = json?.[cgId]?.usd;
        if (typeof p === 'number') salida[id] = p;
      }

      cache = { at: Date.now(), datos: salida, enVuelo: null };
      return salida;
    } catch {
      // Sin conexión, límite alcanzado o CORS: seguimos sin precios.
      cache = { at: Date.now(), datos: cache.datos ?? {}, enVuelo: null };
      return cache.datos;
    }
  })();

  return cache.enVuelo;
}

/** "≈ $12.40" — o cadena vacía si no hay precio. */
export function enDolares(cantidad, monedaId, tabla) {
  const p = tabla?.[monedaId];
  if (typeof p !== 'number' || typeof cantidad !== 'number') return '';

  const v = cantidad * p;
  if (v === 0) return '$0.00';
  if (v < 0.01) return '<$0.01';

  return '$' + v.toLocaleString('es', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
