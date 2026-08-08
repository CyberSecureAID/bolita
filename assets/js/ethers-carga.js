// ethers-carga.js — Carga la librería ethers.
//
// PRINCIPIO: la app NO debe depender de servidores de terceros.
// La librería vive DENTRO de este repositorio (assets/js/vendor/), así que si la
// página carga, ethers carga. No hay CDN que se pueda caer y tumbarnos.
// Los CDN quedan solo como último recurso, por si el archivo local faltara.

const LOCAL = new URL('./vendor/ethers-6.13.4.min.js', import.meta.url).href;
const RESPALDOS = [
  'https://esm.sh/ethers@6.13.4',
  'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm',
  'https://unpkg.com/ethers@6.13.4/dist/ethers.min.js'
];

let _cache = null;

function valido(mod) {
  const e = mod && (mod.ethers || mod.default || mod);
  return (e && (e.Contract || e.JsonRpcProvider)) ? e : null;
}

async function conTiempo(url, ms) {
  return Promise.race([
    import(/* @vite-ignore */ url),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + url)), ms))
  ]);
}

async function cargar() {
  // 1) Copia local (lo normal). Va por la misma conexión que sirvió la página.
  try {
    const e = valido(await conTiempo(LOCAL, 15000));
    if (e) return e;
  } catch (err) {
    console.warn('[Aurex] no se pudo usar la copia local de ethers:', err && err.message);
  }
  // 2) Solo si la copia local falla, probamos fuera.
  for (const url of RESPALDOS) {
    try {
      const e = valido(await conTiempo(url, 7000));
      if (e) { console.warn('[Aurex] ethers cargado desde respaldo externo:', url); return e; }
    } catch (_) {}
  }
  throw new Error('No se pudo cargar ethers');
}

/** Devuelve ethers. Se carga una sola vez y se reutiliza. */
export function getEthers() {
  if (!_cache) _cache = cargar();
  return _cache;
}

export const ethersListo = getEthers();
