// ethers-carga.js — Carga ethers probando VARIOS CDN.
// Si uno se cae (como pasó con jsDelivr), sigue con el siguiente y la página no muere.
const FUENTES = [
  'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm',
  'https://esm.sh/ethers@6.13.4',
  'https://unpkg.com/ethers@6.13.4/dist/ethers.min.js?module',
  'https://cdn.skypack.dev/ethers@6.13.4'
];

let _cache = null;

async function conTiempo(url, ms = 7000) {
  // import() no admite timeout: lo hacemos con una carrera
  return Promise.race([
    import(/* @vite-ignore */ url),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}

async function cargar() {
  let ultimo = null;
  for (const url of FUENTES) {
    try {
      const mod = await conTiempo(url);
      const e = mod.ethers || mod.default || mod;
      if (e && (e.Contract || e.JsonRpcProvider)) {
        if (url !== FUENTES[0]) console.warn('[Aurex] ethers cargado desde respaldo:', url);
        return e;
      }
      ultimo = new Error('módulo inválido');
    } catch (err) { ultimo = err; }
  }
  throw ultimo || new Error('No se pudo cargar ethers desde ningún CDN');
}

/** Devuelve ethers, probando los CDN en orden. Se carga una sola vez. */
export function getEthers() {
  if (!_cache) _cache = cargar();
  return _cache;
}

export const ethersListo = getEthers();
