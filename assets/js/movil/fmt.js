/* movil/fmt.js — Formato uniforme, compacto y legible para toda la app móvil. */

/* Logos conocidos (para que USDT, BNB, BabyDoge… siempre tengan icono, igual
   que en la web). Para el resto se usa la cache de CoinGecko. */
export const LOGOS = {
  USDT: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  USDC: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  BUSD: 'https://assets.coingecko.com/coins/images/9576/small/BUSD.png',
  DAI: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
  BNB: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
  WBNB: 'https://assets.coingecko.com/coins/images/12591/small/binance-coin-logo.png',
  BABYDOGE: 'https://assets.coingecko.com/coins/images/16125/small/babydoge.jpg',
  ETH: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  BTC: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
  EUR: 'https://flagcdn.com/w80/eu.png',
  GBP: 'https://flagcdn.com/w80/gb.png',
  PAXG: 'https://assets.coingecko.com/coins/images/9519/small/paxgold.png',
};
export function logoDe(id, cg, cache) {
  const k = String(id || '').toUpperCase().replace(/\s+/g, '');
  if (LOGOS[k]) return LOGOS[k];
  if (cg && cache && cache[cg] && cache[cg].img) return cache[cg].img;
  return '';
}

/* Valor monetario en USD: 2 decimales; muy pequeños como "<$0.01". */
export function money(v) {
  v = Number(v);
  if (!isFinite(v)) return '$0.00';
  if (v === 0) return '$0.00';
  if (v > 0 && v < 0.01) return '<$0.01';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Igual que money pero sin el símbolo $ (para "≈ 11.03"). */
export function money0(v) { return money(v).replace('$', ''); }

/* Cantidad de tokens: compacta. Grandes → B/M/K; normales → 2 dec; muy
   pequeñas → hasta 4-6 dígitos significativos sin colas interminables. */
export function cantidad(v) {
  v = Number(v);
  if (!isFinite(v) || v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'B';
  if (a >= 1e6) return (v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'M';
  if (a >= 1e3) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (a >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a >= 0.01) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/* Precio de mercado (para listas/gráficas): compacto según magnitud. */
export function precio(p) {
  p = Number(p);
  if (!isFinite(p)) return '';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 0.01) return p.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 8 });
}
