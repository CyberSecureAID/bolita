/* sw.js — Hace que Aurex abra aunque la conexión esté mala o caída.
 *
 * QUÉ HACE Y QUÉ NO
 *   · Guarda una copia de la app (pantalla, código, imágenes) en el teléfono.
 *     Así abre al instante y funciona aunque la red vaya fatal.
 *   · NUNCA guarda datos de la blockchain, precios ni saldos: eso se pide
 *     siempre fresco. Nadie va a ver un saldo viejo por culpa de esto.
 *   · Si hay versión nueva, se descarga sola y se aplica al recargar.
 */

const VERSION = 'aurex-v82';
const APP = [
  './',
  './index.html',
  './manifest-aurex.webmanifest',
  './assets/js/gridbot-ui.js?v=82',
  './assets/js/gridbot.js?v=82',
  './assets/js/wallet.js?v=82',
  './assets/js/tokens.js?v=82',
  './assets/js/perfil.js?v=82',
  './assets/js/prizepool.js?v=82',
  './assets/js/tutorial.js?v=82',
  './assets/js/market.js?v=82',
  './assets/js/avisos.js?v=82',
  './assets/js/grafica.js?v=82',
  './assets/js/vendor/ethers-6.13.4.min.js?v=82',
  './assets/js/vendor/lightweight-charts.mjs?v=82'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    // Uno a uno: si falta alguno, no tumba la instalación entera.
    await Promise.all(APP.map((u) => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

/* Nada de esto se guarda: siempre tiene que venir fresco. */
const NUNCA_GUARDAR = [
  'api.binance.com', 'bsc-dataseed', 'rpc.ankr', 'publicnode', '1rpc.io',
  'defibit.io', 'ninicoin.io', 'coingecko', 'nominatim', 'workers.dev',
  'bscscan', 'pancakeswap'
];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (NUNCA_GUARDAR.some((d) => url.hostname.includes(d))) return;   // va directo a la red
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // La página: primero la red (para traer novedades), y si falla, la copia guardada.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const r = await fetch(req);
        const c = await caches.open(VERSION);
        c.put('./index.html', r.clone()).catch(() => {});
        return r;
      } catch (_) {
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // El resto (código, imágenes): primero la copia guardada, y de fondo se actualiza.
  e.respondWith((async () => {
    const guardada = await caches.match(req);
    const red = fetch(req).then((r) => {
      if (r && r.ok && r.type === 'basic') {
        caches.open(VERSION).then((c) => c.put(req, r.clone())).catch(() => {});
      }
      return r;
    }).catch(() => null);
    return guardada || (await red) || Response.error();
  })());
});
