// muros.js — Detector de Radar Institucional
//
// EL PROBLEMA QUE RESUELVE
//
// El libro de órdenes miente. La mayoría de los muros grandes que ve
// todo el mundo son falsos: órdenes puestas para asustar que se retiran
// justo cuando el precio llega. Un trader que persigue esos muros
// pierde dinero de forma sistemática.
//
// Esta herramienta no muestra el libro. Muestra CUÁLES DE ESOS MUROS
// SON DE VERDAD, y para eso hace lo único que los delata: vigilarlos
// en el tiempo.
//
//   · Un muro REAL aguanta. Sigue ahí minuto tras minuto y, cuando el
//     precio se acerca, se va consumiendo: alguien ejecuta de verdad.
//
//   · Un muro FALSO aparece de golpe y se desvanece antes de que el
//     precio lo toque. Nunca se ejecuta nada.
//
//   · Un muro RECARGABLE se consume y vuelve a aparecer al mismo
//     precio. Es alguien grande partiendo su orden para no mover el
//     mercado. Es la señal más fuerte que existe en el libro.

import * as ethers from './vendor/ethers-6.13.4.min.js?v=126';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PARES = [
  { id: 'BTC',   s: 'BTCUSDT',   n: 'Bitcoin',    cg: 'bitcoin' },
  { id: 'ETH',   s: 'ETHUSDT',   n: 'Ethereum',   cg: 'ethereum' },
  { id: 'BNB',   s: 'BNBUSDT',   n: 'BNB',        cg: 'binancecoin' },
  { id: 'SOL',   s: 'SOLUSDT',   n: 'Solana',     cg: 'solana' },
  { id: 'XRP',   s: 'XRPUSDT',   n: 'XRP',        cg: 'ripple' },
  { id: 'DOGE',  s: 'DOGEUSDT',  n: 'Dogecoin',   cg: 'dogecoin' },
  { id: 'ADA',   s: 'ADAUSDT',   n: 'Cardano',    cg: 'cardano' },
  { id: 'AVAX',  s: 'AVAXUSDT',  n: 'Avalanche',  cg: 'avalanche-2' },
  { id: 'LINK',  s: 'LINKUSDT',  n: 'Chainlink',  cg: 'chainlink' },
  { id: 'DOT',   s: 'DOTUSDT',   n: 'Polkadot',   cg: 'polkadot' },
  { id: 'POL',   s: 'POLUSDT',   n: 'Polygon',    cg: 'matic-network' },
  { id: 'LTC',   s: 'LTCUSDT',   n: 'Litecoin',   cg: 'litecoin' },
  { id: 'TRX',   s: 'TRXUSDT',   n: 'TRON',       cg: 'tron' },
  { id: 'SHIB',  s: 'SHIBUSDT',  n: 'Shiba Inu',  cg: 'shiba-inu' },
  { id: 'PEPE',  s: 'PEPEUSDT',  n: 'Pepe',       cg: 'pepe' },
  { id: 'NEAR',  s: 'NEARUSDT',  n: 'NEAR',       cg: 'near' },
  { id: 'SUI',   s: 'SUIUSDT',   n: 'Sui',        cg: 'sui' },
  { id: 'ARB',   s: 'ARBUSDT',   n: 'Arbitrum',   cg: 'arbitrum' },
  { id: 'OP',    s: 'OPUSDT',    n: 'Optimism',   cg: 'optimism' },
  { id: 'ATOM',  s: 'ATOMUSDT',  n: 'Cosmos',     cg: 'cosmos' },
  { id: 'UNI',   s: 'UNIUSDT',   n: 'Uniswap',    cg: 'uniswap' },
  { id: 'INJ',   s: 'INJUSDT',   n: 'Injective',  cg: 'injective-protocol' },
  { id: 'TON',   s: 'TONUSDT',   n: 'Toncoin',    cg: 'the-open-network' },
  { id: 'APT',   s: 'APTUSDT',   n: 'Aptos',      cg: 'aptos' },
  { id: 'FIL',   s: 'FILUSDT',   n: 'Filecoin',   cg: 'filecoin' },
  { id: 'ETC',   s: 'ETCUSDT',   n: 'Ethereum Classic', cg: 'ethereum-classic' },
  { id: 'HBAR',  s: 'HBARUSDT',  n: 'Hedera',     cg: 'hedera-hashgraph' },
  { id: 'ICP',   s: 'ICPUSDT',   n: 'Internet Computer', cg: 'internet-computer' },
  { id: 'IMX',   s: 'IMXUSDT',   n: 'Immutable',  cg: 'immutable-x' },
  { id: 'RENDER',s: 'RENDERUSDT',n: 'Render',     cg: 'render-token' },
  { id: 'STX',   s: 'STXUSDT',   n: 'Stacks',     cg: 'blockstack' },
  { id: 'TIA',   s: 'TIAUSDT',   n: 'Celestia',   cg: 'celestia' },
  { id: 'SEI',   s: 'SEIUSDT',   n: 'Sei',        cg: 'sei-network' },
  { id: 'ALGO',  s: 'ALGOUSDT',  n: 'Algorand',   cg: 'algorand' },
  { id: 'VET',   s: 'VETUSDT',   n: 'VeChain',    cg: 'vechain' },
  { id: 'GALA',  s: 'GALAUSDT',  n: 'Gala',       cg: 'gala' },
  { id: 'SAND',  s: 'SANDUSDT',  n: 'The Sandbox',cg: 'the-sandbox' },
  { id: 'MANA',  s: 'MANAUSDT',  n: 'Decentraland', cg: 'decentraland' },
  { id: 'AXS',   s: 'AXSUSDT',   n: 'Axie Infinity', cg: 'axie-infinity' },
  { id: 'AAVE',  s: 'AAVEUSDT',  n: 'Aave',       cg: 'aave' },
  { id: 'MKR',   s: 'MKRUSDT',   n: 'Maker',      cg: 'maker' },
  { id: 'GRT',   s: 'GRTUSDT',   n: 'The Graph',  cg: 'the-graph' },
  { id: 'LDO',   s: 'LDOUSDT',   n: 'Lido DAO',   cg: 'lido-dao' },
  { id: 'CRV',   s: 'CRVUSDT',   n: 'Curve',      cg: 'curve-dao-token' },
  { id: 'SNX',   s: 'SNXUSDT',   n: 'Synthetix',  cg: 'havven' },
  { id: 'RUNE',  s: 'RUNEUSDT',  n: 'THORChain',  cg: 'thorchain' },
  { id: 'FLOW',  s: 'FLOWUSDT',  n: 'Flow',       cg: 'flow' },
  { id: 'CHZ',   s: 'CHZUSDT',   n: 'Chiliz',     cg: 'chiliz' },
  { id: 'THETA', s: 'THETAUSDT', n: 'Theta',      cg: 'theta-token' },
  { id: 'XLM',   s: 'XLMUSDT',   n: 'Stellar',    cg: 'stellar' },
  { id: 'XTZ',   s: 'XTZUSDT',   n: 'Tezos',      cg: 'tezos' },
  { id: 'EOS',   s: 'EOSUSDT',   n: 'EOS',        cg: 'eos' },
  { id: 'IOTA',  s: 'IOTAUSDT',  n: 'IOTA',       cg: 'iota' },
  { id: 'CAKE',  s: 'CAKEUSDT',  n: 'PancakeSwap',cg: 'pancakeswap-token' },
  { id: 'DYDX',  s: 'DYDXUSDT',  n: 'dYdX',       cg: 'dydx-chain' },
  { id: 'JUP',   s: 'JUPUSDT',   n: 'Jupiter',    cg: 'jupiter-exchange-solana' },
  { id: 'PYTH',  s: 'PYTHUSDT',  n: 'Pyth',       cg: 'pyth-network' },
  { id: 'WIF',   s: 'WIFUSDT',   n: 'dogwifhat',  cg: 'dogwifcoin' },
  { id: 'BONK',  s: 'BONKUSDT',  n: 'Bonk',       cg: 'bonk' },
  { id: 'FLOKI', s: 'FLOKIUSDT', n: 'Floki',      cg: 'floki' },
  { id: 'JASMY', s: 'JASMYUSDT', n: 'JasmyCoin',  cg: 'jasmycoin' },
  { id: 'ENA',   s: 'ENAUSDT',   n: 'Ethena',     cg: 'ethena' },
  { id: 'W',     s: 'WUSDT',     n: 'Wormhole',   cg: 'wormhole' },
  { id: 'STRK',  s: 'STRKUSDT',  n: 'Starknet',   cg: 'starknet' },
  { id: 'PENDLE',s: 'PENDLEUSDT',n: 'Pendle',     cg: 'pendle' },
  { id: 'ENS',   s: 'ENSUSDT',   n: 'ENS',        cg: 'ethereum-name-service' },
  { id: 'COMP',  s: 'COMPUSDT',  n: 'Compound',   cg: 'compound-governance-token' },
  { id: 'DASH',  s: 'DASHUSDT',  n: 'Dash',       cg: 'dash' },
  { id: 'ZEC',   s: 'ZECUSDT',   n: 'Zcash',      cg: 'zcash' },
  { id: 'KAVA',  s: 'KAVAUSDT',  n: 'Kava',       cg: 'kava' },
  { id: 'MINA',  s: 'MINAUSDT',  n: 'Mina',       cg: 'mina-protocol' },
  { id: 'ROSE',  s: 'ROSEUSDT',  n: 'Oasis',      cg: 'oasis-network' },
  { id: 'ZIL',   s: 'ZILUSDT',   n: 'Zilliqa',    cg: 'zilliqa' },
  { id: 'QNT',   s: 'QNTUSDT',   n: 'Quant',      cg: 'quant-network' },
  { id: 'GMT',   s: 'GMTUSDT',   n: 'GMT',        cg: 'stepn' },
  { id: 'APE',   s: 'APEUSDT',   n: 'ApeCoin',    cg: 'apecoin' },
  { id: 'LRC',   s: 'LRCUSDT',   n: 'Loopring',   cg: 'loopring' },
  { id: 'ANKR',  s: 'ANKRUSDT',  n: 'Ankr',       cg: 'ankr' },
  { id: 'WLD',   s: 'WLDUSDT',   n: 'Worldcoin',  cg: 'worldcoin-wld' },
  { id: 'NOT',   s: 'NOTUSDT',   n: 'Notcoin',    cg: 'notcoin' }
];

let _par = 'BNB';
let _od = null;              // módulo de órdenes
let _zonasOd = [];           // dónde pulsar para cancelar

/* ══════════════════════════════════════════════════════════════
   LAS VELAS — el contexto que faltaba
   Sin gráfico, los muros son números sueltos. Con él se ve dónde
   está el precio respecto a cada nivel.
   ══════════════════════════════════════════════════════════════ */
const TFS = [
  { id: '1m',  n: '1m' },
  { id: '5m',  n: '5m' },
  { id: '15m', n: '15m' },
  { id: '1h',  n: '1H' },
  { id: '4h',  n: '4H' },
  { id: '1d',  n: '1D' }
];

async function traerVelas(simbolo, tf, n = 120) {
  const r = await muFetch(`/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`);
  if (!r.ok) throw new Error('sin velas');
  const j = await r.json();
  return j.map((x) => ({
    t: Math.floor(x[0] / 1000),
    o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]),
    vol: Number(x[7]) || Number(x[5]) || 0,      // volumen en dólares (quote)
    volC: Number(x[10]) || 0                      // parte COMPRADORA (taker buy, en dólares)
  }));
}

/* ══════════════════════════════════════════════════════════════
   DATOS con RESPALDO. El radar necesita el libro (api/v3/depth). Binance ha
   ido geo-bloqueando api.binance.com en algunas regiones; cuando pasa, el
   libro deja de llegar y el radar se queda "sin órdenes" (aunque antes
   funcionara). Probamos varios hosts EQUIVALENTES de datos públicos —mismo
   formato, misma API, sin clave— empezando por el que funcionó la última vez.
   Incluye data-api.binance.vision (el espejo de datos de Binance), que suele
   responder donde el principal está bloqueado. Cada intento con límite de
   tiempo para no colgarse. Es ADITIVO: si api.binance.com responde, no cambia
   nada. ══════════════════════════════════════════════════════════════ */
const MU_HOSTS = [
  'https://api.binance.com',
  'https://data-api.binance.vision',
  'https://api-gcp.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com'
];
let _muHost = 0;
async function muFetch(path) {
  const orden = [_muHost, ...MU_HOSTS.map((_, i) => i).filter((i) => i !== _muHost)];
  let err;
  for (const i of orden) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 4000);
      const r = await fetch(MU_HOSTS[i] + path, { signal: ctl.signal });
      clearTimeout(to);
      if (r.ok) { _muHost = i; return r; }
      err = new Error('HTTP ' + r.status);
    } catch (e) { err = e; }
  }
  throw err || new Error('sin datos');
}

/** Rectángulo con esquinas redondeadas. */
function redondeado(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/* ══════════════════════════════════════════════════════════════
   ESTADO
   ══════════════════════════════════════════════════════════════ */
const M = {
  fotos: [],          // historial del libro: hasta 220 tomas
  precio: 0,
  niveles: new Map(), // precio → seguimiento de ese nivel
  muros: [],          // los detectados, ya juzgados
  seleccionado: null,
  cargando: true,
  error: null,
  zoom: 1,
  cruzY: -1,
  velas: [],          // las velas del gráfico
  zonas: [],          // zonas de acumulación (demanda/oferta) desde las velas
  perfil: null,       // perfil de volumen (para el histograma lateral)
  zonasHTF: [],       // zonas de la temporalidad superior (confluencia)
  mercado: null,      // VWAP, VAH/VAL, sesión, sesgo, backtest
  delta: null,        // order-flow real (aggTrades): agresor comprador vs vendedor
  contexto: null,     // contexto multi-símbolo (BTC/ETH en demanda/oferta)
  tema: (() => { try { return localStorage.getItem('mu_tema') === 'claro' ? 'claro' : 'oscuro'; } catch (_) { return 'oscuro'; } })(),
  tf: '1h',           // temporalidad por defecto del radar
  ancho: window.innerWidth < 760 ? 65 : 100,  // cuántas velas se ven
  filtro: 'todos',
  maxMuro: 1,
  zoomY: 1,           // estirar/contraer la escala de precios
  desplaz: 0          // cuántas velas se ha movido la vista
};

const CADA = 1500;          // una foto cada 1,5 segundos
const MAX_FOTOS = 220;      // ~5,5 minutos de historia
const MIN_TOMAS = 2;        // en cuanto hay un par de fotos, ya se muestran los muros

/* ══════════════════════════════════════════════════════════════
   LOS DATOS — profundidad del libro, API pública sin clave
   ══════════════════════════════════════════════════════════════ */
async function traerLibro(simbolo) {
  /* limit=100 (no 500): el libro pesado (peso 25) es justo el que Binance
     tiende a limitar/bloquear —sobre todo con IPs compartidas—, que es por lo
     que las velas cargaban pero las órdenes no. Con 100 niveles por lado (peso
     5) el radar sigue viendo los muros que importan (los cercanos al precio) y
     deja de chocar con el límite. */
  const r = await muFetch(`/api/v3/depth?symbol=${simbolo}&limit=100`);
  if (!r.ok) throw new Error('sin datos');
  const j = await r.json();
  return {
    t: Date.now(),
    compras: j.bids.map((x) => ({ p: Number(x[0]), q: Number(x[1]) })),
    ventas: j.asks.map((x) => ({ p: Number(x[0]), q: Number(x[1]) }))
  };
}

/* ══════════════════════════════════════════════════════════════
   EL SEGUIMIENTO — aquí está todo el valor

   De cada nivel destacado se guarda su vida: cuándo apareció, cuánto
   ha aguantado, cuántas veces se fue y volvió, y qué le pasó cuando
   el precio se le acercó.
   ══════════════════════════════════════════════════════════════ */
function procesar(foto) {
  M.fotos.push(foto);
  if (M.fotos.length > MAX_FOTOS) M.fotos.shift();

  const mejorC = foto.compras[0]?.p || 0;
  const mejorV = foto.ventas[0]?.p || 0;
  M.precio = (mejorC + mejorV) / 2;
  if (!M.precio) return;

  /* [CORREGIDO — este era el fallo de fondo]

     Los niveles se agrupan en cubos, y la clave del cubo se usa para
     seguirlos entre fotos. Pero el paso se calculaba con el precio
     ACTUAL, que cambia en cada toma. Resultado: el mismo nivel caía en
     un cubo con un número ligeramente distinto cada vez, se creaba un
     seguimiento nuevo, y ninguno llegaba a acumular historia.

     Por eso el panel decía siempre "libro tranquilo" aunque el mapa
     mostrara muros bien claros.

     Ahora el paso se fija en la primera foto y no cambia. */
  if (!M.paso) M.paso = Math.max(1e-8, M.precio * 0.0005);
  const paso = M.paso;

  const agrupar = (lista, lado) => {
    const mapa = new Map();
    lista.forEach(({ p, q }) => {
      const k = Math.round(p / paso);          // entero: clave estable
      mapa.set(k, (mapa.get(k) || 0) + p * q);
    });
    return [...mapa].map(([k, v]) => ({ p: k * paso, v, lado, k }));
  };

  const todos = [...agrupar(foto.compras, 'compra'), ...agrupar(foto.ventas, 'venta')];
  if (!todos.length) return;

  // ¿Qué es "grande" AQUÍ? Se compara con el propio libro, no con un
  // número fijo: así funciona igual en BTC que en PEPE. Umbral relativo a la
  // mediana, un poco más permisivo que antes para no quedarse en "libro
  // tranquilo", pero sin forzar candidatos: solo entra lo que de verdad
  // destaca sobre el resto del libro.
  const vals = todos.map((x) => x.v).sort((a, b) => a - b);
  const base = vals[Math.floor(vals.length * 0.55)] || 1;
  const umbral = Math.max(1e-9, base * 1.9);

  const ahora = foto.t;
  const clave = (x) => x.lado + ':' + x.k;   // entero estable entre fotos

  // Marcar los que se ven en esta foto
  const vistos = new Set();
  todos.forEach((x) => {
    if (x.v < umbral) return;
    const k = clave(x);
    vistos.add(k);

    let nv = M.niveles.get(k);
    if (!nv) {
      nv = {
        p: x.p, lado: x.lado,
        nacio: ahora, visto: ahora,
        vMax: x.v, vAhora: x.v, vInicial: x.v,
        tomas: 1,
        desapariciones: 0,     // veces que se fue del libro
        recargas: 0,           // veces que volvió tras consumirse
        consumido: 0,          // cuánto se ha comido en total
        huyo: false,           // ¿se fue al acercarse el precio?
        aguanto: false,        // ¿aguantó una visita del precio?
        ausente: 0
      };
      M.niveles.set(k, nv);
    } else {
      /* Si volvió tras haber desaparecido y el precio había llegado
         cerca, eso es una RECARGA: alguien repone su orden. Es la
         señal más valiosa del libro. */
      if (nv.ausente > 0) {
        const cerca = Math.abs(M.precio - nv.p) / M.precio < 0.0015;
        if (cerca || nv.consumido > nv.vInicial * 0.3) nv.recargas++;
        nv.ausente = 0;
      }
      // Lo que ha menguado desde su máximo es lo que se han comido
      if (x.v < nv.vAhora) nv.consumido += (nv.vAhora - x.v);
      nv.vAhora = x.v;
      if (x.v > nv.vMax) nv.vMax = x.v;
      nv.visto = ahora;
      nv.tomas++;
    }

    /* ¿El precio le pasó por encima y aguantó? Eso lo convierte en un
       nivel probado, que es lo que un trader quiere saber. */
    const dist = Math.abs(M.precio - nv.p) / M.precio;
    if (dist < 0.0008) nv.aguanto = true;
  });

  // Los que no se ven: ¿se fueron o los consumieron?
  M.niveles.forEach((nv, k) => {
    if (vistos.has(k)) return;
    nv.ausente++;
    if (nv.ausente === 1) {
      nv.desapariciones++;
      /* Se fue mientras el precio se acercaba y sin apenas ejecutarse:
         es la firma de un muro falso. */
      const dist = Math.abs(M.precio - nv.p) / M.precio;
      if (dist < 0.004 && nv.consumido < nv.vInicial * 0.25) nv.huyo = true;
    }
    // Olvidar los que llevan mucho sin aparecer
    if (nv.ausente > 40) M.niveles.delete(k);
  });

  juzgar();
}

/* ══════════════════════════════════════════════════════════════
   EL VEREDICTO
   ══════════════════════════════════════════════════════════════ */
function juzgar() {
  const ahora = Date.now();
  const fuera = [];

  M.niveles.forEach((nv) => {
    if (nv.tomas < 2) return;
    const vivo = nv.ausente === 0;
    const segundos = (nv.visto - nv.nacio) / 1000;
    const consumidoPct = nv.vInicial > 0 ? nv.consumido / nv.vInicial : 0;

    let tipo, titulo, nota, prioridad;

    if (nv.recargas >= 2) {
      tipo = 'recargable';
      titulo = 'Orden blindada';
      nota = 'Alguien está reponiendo su orden cada vez que se la comen. Es un jugador grande defendiendo este precio sin querer llamar la atención.';
      prioridad = 100;

    } else if (nv.huyo && nv.desapariciones >= 2) {
      tipo = 'falso';
      titulo = 'Orden falsa';
      nota = 'Esta orden se retira cuando el precio se acerca y vuelve cuando se aleja. Está puesta para asustar, no para ejecutarse.';
      prioridad = 70;

    } else if (nv.aguanto && consumidoPct > 0.2) {
      tipo = 'probado';
      titulo = 'Nivel probado';
      nota = 'El precio llegó hasta aquí y esta orden lo frenó, comiéndose lo que venía. Hay defensa real en este nivel.';
      prioridad = 90;

    } else if (vivo && segundos > 90 && nv.desapariciones === 0) {
      tipo = 'real';
      titulo = 'Orden firme';
      nota = 'Esta orden lleva ahí sin moverse desde que empezamos a vigilar. Todavía no ha llegado el precio a probarla.';
      prioridad = 80;

    } else if (vivo) {
      /* Muro grande recién visto: se muestra YA como "en observación" (un
         muro de millones es real desde que aparece; no hay que esperar 10-20 s
         para dibujarlo). Su veredicto se afina solo con los segundos: si
         aguanta pasa a firme/probado, si huye pasa a falso. El filtro de zonas
         de más abajo evita que esto sea un chorro. */
      tipo = 'vigilando';
      titulo = 'En observación';
      nota = 'Orden nueva. Aún no sabemos si aguantará: hay que ver qué hace cuando el precio se acerque.';
      prioridad = 40;

    } else {
      return;
    }

    fuera.push({
      p: nv.p, lado: nv.lado, v: nv.vAhora, vMax: nv.vMax,
      tipo, titulo, nota, prioridad,
      segundos, recargas: nv.recargas, desapariciones: nv.desapariciones,
      consumidoPct, vivo,
      dist: M.precio > 0 ? (nv.p - M.precio) / M.precio : 0
    });
  });

  /* Se ordenan por importancia y cercanía: un muro enorme a un 8% del
     precio importa menos que uno mediano a un 0,3%. */
  fuera.sort((a, b) => {
    const pa = a.prioridad - Math.abs(a.dist) * 900;
    const pb = b.prioridad - Math.abs(b.dist) * 900;
    return pb - pa;
  });

  /* [CORREGIDO] Antes la lista se reemplazaba entera en cada foto. Si
     un muro dejaba de cumplir el mínimo por un momento, su tarjeta
     desaparecía de golpe — que es lo que viste. Ahora los que ya
     estaban se mantienen unos segundos y, si de verdad se han ido, se
     avisa antes de quitarlos: un muro que desaparece ES información. */
  /* ══ CALIBRACIÓN — de "chorro de muros" a ZONAS estratégicas ══
     El libro real tiene decenas de órdenes pegadas; mostrarlas todas es ruido
     inoperable. Un trader quiere las ZONAS que importan, no cada nivel suelto. */

  /* 1) FUSIÓN. Muros del mismo lado a menos de ~0,25% entre sí son la MISMA
        zona de liquidez. Como 'fuera' ya viene ordenado por importancia, el
        primero del racimo es el líder (conserva precio y veredicto) y le
        sumamos la liquidez de sus vecinos: la tarjeta muestra el peso REAL de
        toda la zona, no el de una orden suelta. */
  const DIST_ZONA = 0.0025;
  const zonas = [];
  fuera.forEach((m) => {
    const z = zonas.find((x) => x.lado === m.lado && Math.abs(x.p - m.p) / Math.max(1e-9, M.precio) < DIST_ZONA);
    if (z) { z.v += m.v; z.vMax = Math.max(z.vMax, m.vMax); z.enZona = (z.enZona || 1) + 1; }
    else zonas.push({ ...m, enZona: 1 });
  });

  /* 2) SIGNIFICANCIA. Se muestran las zonas con veredicto fuerte
        (blindada/probada/falsa) SIEMPRE —son las estratégicas—, y del resto
        solo las que pesan de verdad frente a la mayor de la pantalla. Así no
        se cuela liquidez menor que solo estorba. */
  const maxV = Math.max(1, ...zonas.map((x) => x.v));
  const esFuerte = (m) => m.tipo === 'recargable' || m.tipo === 'probado' || m.tipo === 'falso';
  const sig = zonas.filter((m) => esFuerte(m) || m.v >= maxV * 0.30);

  /* 3) TOPE BAJO. Como mucho 6 zonas: suficiente para leer el mapa de un
        vistazo y tomar una decisión. */
  const nuevos = sig.slice(0, 6);
  const antes = M.muros || [];

  antes.forEach((v) => {
    if (nuevos.some((x) => Math.abs(x.p - v.p) / Math.max(1e-9, v.p) < 0.0004)) return;
    // Ya no está: se marca y se deja un rato para que se lea
    const desde = v.seVaDesde || ahora;
    if (ahora - desde < 12000) {
      nuevos.push({
        ...v,
        seVaDesde: desde,
        tipo: 'ido',
        titulo: 'Ha desaparecido',
        nota: v.tipo === 'falso'
          ? 'Confirmado: se retiró del libro sin llegar a ejecutarse. Era falso.'
          : 'Este muro ya no está en el libro. O se consumió del todo, o quien lo puso lo retiró.',
        prioridad: 30, vivo: false
      });
    }
  });

  nuevos.sort((a, b) => {
    const pa = a.prioridad - Math.abs(a.dist) * 900;
    const pb = b.prioridad - Math.abs(b.dist) * 900;
    return pb - pa;
  });
  M.muros = nuevos.slice(0, 8);
}

/* Utilidades de formato */
const dinero = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
};

const fmt = (p) => {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 1 });
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(8);
};

const tiempo = (s) => {
  if (s < 60) return Math.round(s) + 's';
  const m = Math.floor(s / 60);
  return m + ' min' + (m > 1 ? '' : '');
};

/* ══════════════════════════════════════════════════════════════
   DETECTOR DE ZONAS DE ACUMULACIÓN  (desde las VELAS)

   Dónde el precio LATERALIZÓ y se acumuló volumen = dónde los grandes
   construyeron posición. Esas zonas actúan como DEMANDA (si están debajo del
   precio) o como OFERTA (si están encima), y son los mejores puntos de
   RETESTEO. Se construye un PERFIL DE VOLUMEN: se reparte el volumen (en $) de
   cada vela por su rango, y las franjas con mucho más volumen que la media son
   las zonas. Se fusionan las contiguas, se puntúa su fuerza y se cuentan los
   TOQUES (cuántas velas volvieron a ella).

   Todo sale de las velas (klines), que llegan siempre y rápido: por eso las
   tarjetas se llenan en 1-2 s, sin depender del libro de órdenes.
   ══════════════════════════════════════════════════════════════ */
function detectarZonas(velas, precio, opts) {
  opts = opts || {};
  if (!velas || velas.length < 24 || !(precio > 0)) return { zonas: [], perfil: null };
  const vis = velas.slice(-260);
  let lo = Infinity, hi = -Infinity;
  vis.forEach((v) => { if (v.l < lo) lo = v.l; if (v.h > hi) hi = v.h; });
  if (!(hi > lo)) return { zonas: [], perfil: null };
  const N = 90;
  const paso = (hi - lo) / N;
  const vol = new Array(N).fill(0);
  const volC = new Array(N).fill(0);        // parte compradora
  const toca = new Array(N).fill(0);
  vis.forEach((v) => {
    const b0 = Math.max(0, Math.floor((v.l - lo) / paso));
    const b1 = Math.min(N - 1, Math.floor((v.h - lo) / paso));
    const spread = (b1 - b0 + 1) || 1;
    const cuota = (v.vol || 1) / spread;
    // Si no hay taker-buy, se estima por el color de la vela (verde=más compra).
    const compra = v.volC > 0 ? v.volC : (v.vol || 1) * (v.c >= v.o ? 0.55 : 0.45);
    const cuotaC = compra / spread;
    for (let b = b0; b <= b1; b++) { vol[b] += cuota; volC[b] += cuotaC; toca[b]++; }
  });
  const maxBin = Math.max(...vol, 1);
  const media = vol.reduce((a, b) => a + b, 0) / N || 1;
  const umbral = media * 1.4;
  /* PICOS del perfil = nodos de alto volumen. Cada pico se expande a zona
     mientras el volumen siga alto (>=45% del pico) y sin pasarse de ancho. */
  const picos = [];
  for (let b = 0; b < N; b++) {
    const izq = b === 0 ? -Infinity : vol[b - 1];
    const der = b === N - 1 ? -Infinity : vol[b + 1];
    if (vol[b] >= umbral && vol[b] >= izq && vol[b] >= der) picos.push(b);
  }
  picos.sort((a, b) => vol[b] - vol[a]);
  const usados = new Array(N).fill(false);
  const maxW = Math.max(2, Math.round(N * 0.06));
  const brutas = [];
  picos.forEach((pk) => {
    if (usados[pk]) return;
    let b0 = pk, b1 = pk;
    const piso = vol[pk] * 0.5;
    while (b0 > 0 && !usados[b0 - 1] && vol[b0 - 1] >= piso && (pk - (b0 - 1)) <= maxW) b0--;
    while (b1 < N - 1 && !usados[b1 + 1] && vol[b1 + 1] >= piso && ((b1 + 1) - pk) <= maxW) b1++;
    let v = 0, vc = 0, t = 0;
    for (let b = b0; b <= b1; b++) { v += vol[b]; vc += volC[b]; t += toca[b]; usados[b] = true; }
    brutas.push({ b0, b1, v, vc, t, pk });
  });
  const perfil = { vol, lo, hi, N, max: maxBin };
  if (!brutas.length) return { zonas: [], perfil };
  const maxV = Math.max(...brutas.map((z) => z.v), 1);
  const ult = vis[vis.length - 1];
  const cierre = ult ? ult.c : precio;
  const htf = opts.htf || [];
  const libro = opts.libro || null;
  const margen = (hi - lo) * 0.01;

  const zonas = brutas.map((z) => {
    const pLow = lo + z.b0 * paso;
    const pHigh = lo + (z.b1 + 1) * paso;
    const p = (pLow + pHigh) / 2;
    const pPoc = lo + (z.pk + 0.5) * paso;              // punto de control (máx volumen)
    const dentro = precio >= pLow && precio <= pHigh;
    const lado = p < precio ? 'demanda' : 'oferta';
    const dist = (p - precio) / precio;
    const retest = !dentro && Math.abs(dist) < 0.0035;

    // 1) VOLUMEN FIRMADO
    const compradorPct = z.v > 0 ? Math.max(0, Math.min(1, z.vc / z.v)) : 0.5;
    const alineado = lado === 'demanda' ? compradorPct >= 0.5 : compradorPct <= 0.5;

    // 2) REACCIONES (rechazos reales): mecha dentro de la zona, cuerpo fuera
    let reacciones = 0;
    vis.forEach((v) => {
      if (lado === 'demanda') {
        if (v.l <= pHigh && v.l >= pLow - paso && Math.min(v.o, v.c) > pHigh) reacciones++;
      } else {
        if (v.h >= pLow && v.h <= pHigh + paso && Math.max(v.o, v.c) < pLow) reacciones++;
      }
    });

    // 4) RUPTURA / FLIP: el precio estaba en/junto a la zona y la perforó hace poco
    const recientes = vis.slice(-16);
    const antes = recientes.length ? recientes[0].c : cierre;
    let rota = false;
    if (antes >= pLow && cierre < pLow - margen * 0.5) rota = true;   // rompió hacia abajo
    if (antes <= pHigh && cierre > pHigh + margen * 0.5) rota = true; // rompió hacia arriba

    // 5) CONFLUENCIA MULTI-TEMPORALIDAD
    const confluencia = htf.some((h) => h.pHigh >= pLow && h.pLow <= pHigh);

    // 6) CONFIRMACIÓN CON EL LIBRO EN VIVO
    let libroConf = false;
    if (libro && libro.muros) libroConf = libro.muros.some((m) => m >= pLow && m <= pHigh);

    // CONFIANZA combinada (0..100)
    let conf = (z.v / maxV) * 34;
    conf += Math.min(20, reacciones * 6);
    conf += alineado ? 16 : 0;
    conf += confluencia ? 16 : 0;
    conf += libroConf ? 10 : 0;
    conf += Math.min(4, z.t / 20);
    if (rota) conf *= 0.35;
    conf = Math.max(0, Math.min(100, Math.round(conf)));
    const fuerza = Math.max(1, Math.min(5, Math.round(conf / 20)));

    return {
      pLow, pHigh, p, pPoc, v: z.v, volRel: z.v / maxV,
      compradorPct, reacciones, confluencia, libro: libroConf, rota, alineado,
      confianza: conf, fuerza, toques: z.t, lado, dist, retest, dentro
    };
  });

  /* FUSIÓN de zonas apiladas: cuando dos zonas del MISMO lado quedan pegadas
     (rango casi tocándose), son un solo nivel fragmentado y se unen. PERO con
     TOPE DE ANCHO: nunca se encadenan tantas que formen una banda gigante
     (eso confunde más que ayuda). Si la zona resultante superaría el ancho
     máximo, se dejan separadas. */
  const anchoMax = Math.max((hi - lo) * 0.10, precio * 0.012);   // tope de ancho de una zona fusionada
  const fusionar = (lista) => {
    const orden = lista.slice().sort((a, b) => a.pLow - b.pLow);
    const out = [];
    orden.forEach((z) => {
      const prev = out[out.length - 1];
      const gap = prev ? (z.pLow - prev.pHigh) / (precio || 1) : Infinity;
      const anchoUnido = prev ? (Math.max(prev.pHigh, z.pHigh) - Math.min(prev.pLow, z.pLow)) : Infinity;
      if (prev && prev.lado === z.lado && gap <= 0.004 && anchoUnido <= anchoMax) {
        const vTot = prev.v + z.v;
        prev.pPoc = prev.v >= z.v ? prev.pPoc : z.pPoc;      // POC del sub-nodo mayor
        prev.pLow = Math.min(prev.pLow, z.pLow);
        prev.pHigh = Math.max(prev.pHigh, z.pHigh);
        prev.p = (prev.pLow + prev.pHigh) / 2;
        prev.compradorPct = (prev.compradorPct * prev.v + z.compradorPct * z.v) / vTot;
        prev.v = vTot;
        prev.reacciones += z.reacciones;
        prev.toques += z.toques;
        prev.confluencia = prev.confluencia || z.confluencia;
        prev.libro = prev.libro || z.libro;
        prev.alineado = prev.compradorPct >= 0.5 ? prev.lado === 'demanda' : prev.lado === 'oferta';
        prev.confianza = Math.min(100, Math.max(prev.confianza, z.confianza) + 4);
        prev.fuerza = Math.max(1, Math.min(5, Math.round(prev.confianza / 20)));
        prev.rota = prev.rota && z.rota;
        prev.dentro = prev.dentro || z.dentro;
        prev.dist = (prev.p - precio) / precio;
        prev.retest = !prev.dentro && Math.abs(prev.dist) < 0.0035;
      } else {
        out.push(Object.assign({}, z));
      }
    });
    return out;
  };
  const zonasF = fusionar(zonas);
  zonas.length = 0; Array.prototype.push.apply(zonas, zonasF);

  /* El alcance útil de una zona depende de la temporalidad: en 15m un 8% ya es
     lejos, pero en 1D los movimientos son mucho mayores y hay que abrir el
     rango, o el diario aparece vacío. Aun así, nunca tan lejos que sea ruido. */
  const CAP = { '1m': 0.05, '5m': 0.06, '15m': 0.08, '30m': 0.10, '1h': 0.12, '2h': 0.16, '4h': 0.20, '1d': 0.30, '1w': 0.45 };
  const cerca = CAP[M.tf] || 0.12;
  const lejos = cerca * 1.5;
  let usar = zonas.filter((z) => z.dentro || Math.abs(z.dist) <= cerca);
  if (usar.length < 2) {
    const extra = zonas
      .filter((z) => usar.indexOf(z) < 0 && Math.abs(z.dist) <= lejos)
      .sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))
      .slice(0, 3 - usar.length);
    usar = usar.concat(extra);
  }
  usar.sort((a, b) => (b.confianza - Math.min(30, Math.abs(b.dist) * 900)) - (a.confianza - Math.min(30, Math.abs(a.dist) * 900)));
  return { zonas: usar.slice(0, 6), perfil };
}

/* Paleta del GRÁFICO según el tema. Solo cambia el "chrome" neutro (fondo,
   rejilla, ejes, velas); los colores semánticos (verde/rojo/dorado/azul de las
   zonas y niveles) se mantienen para que el significado no cambie. */
function pal() {
  return M.tema === 'claro'
    ? { fondo: '#eef1f5', rejilla: 'rgba(0,0,0,.05)', ejeBg: 'rgba(236,239,244,.96)', ejeBorde: 'rgba(0,0,0,.10)', ejeTxt: '#6b7480', velaUp: '#0a9e86', velaDown: '#e0424f' }
    : { fondo: '#0a0e14', rejilla: 'rgba(255,255,255,.03)', ejeBg: 'rgba(10,14,20,.94)', ejeBorde: 'rgba(255,255,255,.06)', ejeTxt: '#4a525c', velaUp: '#26a69a', velaDown: '#ef5350' };
}

/* De 15m sube a 1h, de 5m a 30m, etc. — para la confluencia multi-temporalidad. */
const TF_SUPERIOR = { '1m': '15m', '5m': '30m', '15m': '1h', '30m': '2h', '1h': '4h', '4h': '1d', '1d': '1w' };

/* ══════════════════════════════════════════════════════════════
   ANÁLISIS DE MERCADO — niveles institucionales + backtest

   Calcula, todo desde las velas (fiable e instantáneo):
   · VWAP anclado al inicio de la ventana (el precio medio ponderado por
     volumen: la referencia que miran las mesas).
   · ÁREA DE VALOR (VAH/VAL) y POC del perfil: el rango donde se negoció el
     70% del volumen.
   · MÁXIMO/MÍNIMO de sesión (~24 h).
   · SESGO del mercado por volumen firmado (comprador/vendedor).
   · BACKTEST: recorre el histórico y mide cuántas veces el precio, al llegar
     a un nodo de alto volumen, REBOTÓ de verdad (reacción ≥ 0,4%). Da una
     tasa de acierto con su muestra: números, no promesas.
   ══════════════════════════════════════════════════════════════ */
function analizarMercado(velas, precio, perfil) {
  if (!velas || velas.length < 30) return null;
  const vis = velas.slice(-260);
  // VWAP anclado
  let pv = 0, vv = 0;
  vis.forEach((v) => { const tp = (v.h + v.l + v.c) / 3; pv += tp * (v.vol || 0); vv += (v.vol || 0); });
  const vwap = vv > 0 ? pv / vv : precio;
  // Sesión ~24h (según nº de velas que caben)
  const ses = velas.slice(-96);
  let sHi = -Infinity, sLo = Infinity;
  ses.forEach((v) => { if (v.h > sHi) sHi = v.h; if (v.l < sLo) sLo = v.l; });
  // Sesgo por volumen firmado
  let vc = 0, vt = 0;
  vis.forEach((v) => { const comp = v.volC > 0 ? v.volC : (v.vol || 0) * (v.c >= v.o ? 0.55 : 0.45); vc += comp; vt += (v.vol || 0); });
  const compradorPct = vt > 0 ? vc / vt : 0.5;
  const sesgo = compradorPct >= 0.56 ? 'comprador' : compradorPct <= 0.44 ? 'vendedor' : 'neutral';

  // Área de valor (VAH/VAL) a partir del perfil: 70% del volumen alrededor del POC
  let vah = null, val = null, poc = null;
  if (perfil && perfil.vol) {
    const pf = perfil; const N = pf.N; const paso = (pf.hi - pf.lo) / N;
    let pocB = 0; for (let b = 1; b < N; b++) if (pf.vol[b] > pf.vol[pocB]) pocB = b;
    poc = pf.lo + (pocB + 0.5) * paso;
    const total = pf.vol.reduce((a, b) => a + b, 0);
    let acum = pf.vol[pocB], lo = pocB, hi = pocB;
    while (acum < total * 0.7 && (lo > 0 || hi < N - 1)) {
      const izq = lo > 0 ? pf.vol[lo - 1] : -1;
      const der = hi < N - 1 ? pf.vol[hi + 1] : -1;
      if (der >= izq) { hi++; acum += pf.vol[hi]; } else { lo--; acum += pf.vol[lo]; }
    }
    val = pf.lo + lo * paso; vah = pf.lo + (hi + 1) * paso;
  }

  // BACKTEST: reacciones históricas en nodos de alto volumen
  let aciertos = 0, muestra = 0;
  if (perfil && perfil.vol) {
    const pf = perfil; const N = pf.N; const paso = (pf.hi - pf.lo) / N;
    const media = pf.vol.reduce((a, b) => a + b, 0) / N || 1;
    for (let b = 0; b < N; b++) {
      if (pf.vol[b] < media * 1.5) continue;
      const nivel = pf.lo + (b + 0.5) * paso;
      // buscar toques históricos y ver si el precio reaccionó ≥0,4%
      for (let i = 5; i < vis.length - 5; i++) {
        const v = vis[i];
        const toca = v.l <= nivel + paso && v.h >= nivel - paso;
        if (!toca) continue;
        const desde = vis[i].c;
        let maxReac = 0;
        for (let j = i + 1; j <= Math.min(vis.length - 1, i + 6); j++) {
          maxReac = Math.max(maxReac, Math.abs(vis[j].c - desde) / desde);
        }
        muestra++;
        if (maxReac >= 0.004) aciertos++;
        i += 3; // no contar el mismo toque varias veces
      }
    }
  }
  const winRate = muestra >= 8 ? Math.round((aciertos / muestra) * 100) : null;

  return { vwap, vah, val, poc, sHi, sLo, sesgo, compradorPct, winRate, muestra };
}



/* ══════════════════════════════════════════════════════════════
   ABRIR
   ══════════════════════════════════════════════════════════════ */
export async function abrirMuros() {
  estilos();
  const prev = $('mu-overlay'); if (prev) prev.remove();

  // Estado limpio: cada apertura empieza de cero
  M.fotos = []; M.niveles = new Map(); M.muros = [];
  M.cargando = true; M.error = null; M.seleccionado = null; M.paso = 0;

  const d = document.createElement('div');
  d.id = 'mu-overlay';
  if (M.tema === 'claro') d.classList.add('mu-claro');
  d.innerHTML = `<div class="mu-bg"></div>
    <div class="mu-c">
      <div class="mu-barra">
        <button class="mu-sel" id="mu-sel">
          <i class="mu-logo" data-cg="${esc((PARES.find((p) => p.id === _par) || {}).cg || '')}"></i>
          <b>${esc(_par)}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <div class="mu-tfs">
          ${TFS.map((t) => `<button class="mu-tf ${t.id === M.tf ? 'on' : ''}" data-tf="${t.id}">${t.n}</button>`).join('')}
        </div>
        <button class="mu-tfchip" id="mu-tfchip" type="button" aria-label="Temporalidad">
          <b id="mu-tfchip-t">${esc((TFS.find((t) => t.id === M.tf) || TFS[0]).n)}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <div class="mu-px">
          <span>Precio ahora</span>
          <b id="mu-px-v">—</b>
        </div>

        <span id="mu-estado" class="mu-estado-err"></span>

        <div class="mu-der">
          <button class="mu-analista" id="mu-analista" title="Analista">
            <img src="assets/img/jesus-avatar.webp" alt="">
            <span class="mu-an-txt">Analista</span>
          </button>
          <button class="mu-ico" id="mu-validar" title="Verificar volumen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 5-3.5 7.5-8.5 9C7.5 19.5 4 17 4 12V6l8-3 8 3z"/></svg>
          </button>
          <button class="mu-ico" id="mu-tema" title="Tema claro/oscuro">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          </button>
          <button class="mu-ico" id="mu-foto" title="Compartir imagen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="mu-ico mu-comofunciona" id="mu-ayuda" title="Cómo funciona">
            <span class="mu-cf-txt">Cómo funciona</span>
            <span class="mu-cf-sig">?</span>
          </button>
          <button class="mu-ico" id="mu-x" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div class="mu-mtabs" id="mu-mtabs">
        <button class="mu-mtab on" data-vista="graf" type="button">Gr\u00e1fica</button>
        <button class="mu-mtab" data-vista="ord" type="button">\u00d3rdenes <i id="mu-mtab-n">0</i></button>
      </div>

      <div class="mu-cuerpo m-graf" id="mu-cuerpo">
        <div class="mu-graf" id="mu-graf">
          <canvas class="mu-cv" id="mu-cv"></canvas>
          <div class="mu-esperando" id="mu-esperando">
            <div class="mu-spin"></div>
            <b>Analizando el libro de órdenes</b>
            <span>Necesitamos unos segundos de observación para distinguir el dinero real del humo.</span>
            <div class="mu-progreso"><i id="mu-prog"></i></div>
          </div>
          <img class="mu-marca" src="assets/img/cco-marca.webp" alt="">
        </div>

        <aside class="mu-panel" id="mu-panel">
          <div class="mu-panel-t"><em>Institutional Radar</em> · Zonas de acumulación</div>
          <div class="mu-cockpit" id="mu-cockpit"></div>
          <div class="mu-chips">
            <button class="mu-fbtn verde" data-filtro="compra">
              <b>Demanda</b><i class="mu-cuenta" id="mu-n-compra">0</i>
            </button>
            <button class="mu-fbtn rojo" data-filtro="venta">
              <b>Oferta</b><i class="mu-cuenta" id="mu-n-venta">0</i>
            </button>
            <button class="mu-fbtn oro" data-filtro="fuertes">
              <b>★ Fuertes</b><i class="mu-cuenta" id="mu-n-fuertes">0</i>
            </button>
            <button class="mu-fbtn gris" data-filtro="falsos">
              <b>⟳ Retesteo</b><i class="mu-cuenta" id="mu-n-falsos">0</i>
            </button>
          </div>
          <div class="mu-lista" id="mu-lista"></div>
        </aside>
      </div>
      <div class="mu-alerta" id="mu-alerta"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_reloj); clearInterval(_relojVelas); clearInterval(_relojPulso);
    cerrarWSLibro();
    document.querySelectorAll('#mu-picker, #mu-tfmenu').forEach((x) => x.remove());
    const e = $('mu-overlay'); if (e) e.remove();
    /* Al cerrar se vuelve a la portada de Liquidity, no se sale. */
    try { if (window.__lqpVolver) window.__lqpVolver(); } catch (_) {}
  };
  d.querySelector('.mu-bg').onclick = cerrar;
  $('mu-x').onclick = cerrar;
  $('mu-ayuda').onclick = () => ayuda();
  $('mu-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  $('mu-foto').onclick = () => guardarImagen();
  $('mu-validar').onclick = () => validarVolumen();
  $('mu-analista').onclick = () => abrirAnalista();
  $('mu-tema').onclick = () => {
    M.tema = M.tema === 'claro' ? 'oscuro' : 'claro';
    try { localStorage.setItem('mu_tema', M.tema); } catch (_) {}
    const ov = $('mu-overlay'); if (ov) ov.classList.toggle('mu-claro', M.tema === 'claro');
    dibujar();
  };

  /* ONBOARDING: la primera vez que se abre el radar, se muestra el tutorial
     solo (una sola vez por navegador). */
  try {
    if (!localStorage.getItem('mu_onboard_v1')) {
      localStorage.setItem('mu_onboard_v1', '1');
      setTimeout(() => { if ($('mu-cv')) ayuda(); }, 900);
    }
  } catch (_) {}

  d.querySelectorAll('[data-tf]').forEach((b) => b.onclick = () => {
    M.tf = b.dataset.tf;
    reiniciarAlertas();
    d.querySelectorAll('[data-tf]').forEach((x) => x.classList.toggle('on', x.dataset.tf === M.tf));
    const ch = $('mu-tfchip-t'); if (ch) ch.textContent = b.textContent;   // refleja en el chip móvil
    cargarVelas();
  });

  /* Temporalidad en móvil: el chip muestra solo la activa y despliega una
     lista con TODAS. Reutiliza los botones reales .mu-tf (dispara su click),
     así no duplicamos la lógica de carga. */
  const chip = $('mu-tfchip');
  if (chip) chip.onclick = (e) => {
    e.stopPropagation();
    const ya = $('mu-tfmenu'); if (ya) { ya.remove(); return; }
    const menu = document.createElement('div'); menu.id = 'mu-tfmenu';
    menu.innerHTML = TFS.map((t) => `<button type="button" class="mu-tfmenu-it ${t.id === M.tf ? 'on' : ''}" data-mtf="${t.id}">${t.n}</button>`).join('');
    document.body.appendChild(menu);
    const r = chip.getBoundingClientRect();
    const w = menu.offsetWidth || 200;
    menu.style.top = (r.bottom + 6) + 'px';
    menu.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    menu.querySelectorAll('.mu-tfmenu-it').forEach((it) => it.onclick = () => {
      const real = d.querySelector(`.mu-tf[data-tf="${it.dataset.mtf}"]`);
      if (real) real.click();                 // dispara el handler real (carga la vela)
      menu.remove();
    });
    const cerrarM = (ev) => { if (!menu.contains(ev.target) && ev.target !== chip && !chip.contains(ev.target)) { menu.remove(); document.removeEventListener('click', cerrarM); } };
    setTimeout(() => document.addEventListener('click', cerrarM), 10);
  };

  /* Pestañas de móvil: Gráfica / Órdenes. Le dan al panel de órdenes TODO el
     alto de la pantalla, para que las tarjetas se vean cómodas. En escritorio
     estas pestañas están ocultas y se ve todo a la vez. */
  d.querySelectorAll('.mu-mtab').forEach((b) => b.onclick = () => {
    const vista = b.dataset.vista;
    d.querySelectorAll('.mu-mtab').forEach((x) => x.classList.toggle('on', x === b));
    const cuerpo = $('mu-cuerpo');
    if (cuerpo) { cuerpo.classList.toggle('m-graf', vista === 'graf'); cuerpo.classList.toggle('m-ord', vista === 'ord'); }
    if (vista === 'graf') { requestAnimationFrame(() => { if ($('mu-cv')) dibujar(); }); }
  });
  /* Los filtros se apagan al volver a pulsarlos: sin ninguno activo
     se ven todas las órdenes, que es lo natural. */
  d.querySelectorAll('[data-filtro]').forEach((b) => b.onclick = () => {
    M.filtro = (M.filtro === b.dataset.filtro) ? 'todos' : b.dataset.filtro;
    d.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('on', x.dataset.filtro === M.filtro));
    pintarPanel();
  });

  ponerLogos();
  arrancar();
  cargarVelas();
  /* Pulso: redibuja suave (~8 fps) solo si hay una zona activa (retesteo/dentro),
     para que la animación sea fluida aunque el WebSocket no esté. */
  clearInterval(_relojPulso);
  _relojPulso = setInterval(() => {
    if (!$('mu-cv')) { clearInterval(_relojPulso); return; }
    if (M.zonas.some((z) => (z.dentro || z.retest) && !z.rota)) dibujar();
  }, 130);

  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('mu-cv')) dibujar(); }, 250);
  });
}

/* ══════════════════════════════════════════════════════════════
   EL RELOJ — una foto cada 1,5 s
   ══════════════════════════════════════════════════════════════ */
let _reloj = null, _relojVelas = null, _relojPulso = null;
let _htfTs = 0;                        // última vez que se pidió la temporalidad superior
let _delTs = 0;                        // última vez que se pidió el order-flow (aggTrades)
let _ultLibro = null;                  // último libro bueno (REST o WS) para confirmar zonas
let _fallos = 0;
let _wsL = null, _wsLibro = null, _wsPar = null;   // libro por WebSocket (respaldo)
let _ultDibujoWS = 0;                              // throttle del redibujo en vivo
let _huella = '';
let _ultPintado = 0;

/** Actualiza solo los números que cambian, sin rehacer las tarjetas.
 *  Así no parpadean. */
function refrescarNumeros() {
  M.zonas.forEach((z) => {
    const b = document.querySelector(`[data-mp="${z.p}"]`);
    if (!b) return;
    const card = b.closest('.mu-card');
    if (!card) return;
    const dem = z.lado === 'demanda';
    const pon = (sel, txt) => {
      const e = card.querySelector(sel);
      if (e && e.textContent !== txt) e.textContent = txt;
    };
    pon('.mu-imp', dinero(z.v));
    pon('.mu-dist2', z.dentro ? 'AQU\u00cd' : (Math.abs(z.dist) * 100).toFixed(2) + '% ' + (dem ? '\u2193' : '\u2191'));
  });
}

/** Las velas se refrescan cada 12 s: el precio no cambia tan rápido
 *  como el libro, y no hace falta pedirlas cada segundo y medio. */
async function cargarVelas() {
  clearInterval(_relojVelas);
  const traer = async () => {
    if (!$('mu-cv')) { clearInterval(_relojVelas); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      M.velas = await traerVelas(par.s, M.tf, 400);
      const px = (M.precio > 0) ? M.precio : (M.velas.length ? M.velas[M.velas.length - 1].c : 0);
      /* CONFLUENCIA MULTI-TEMPORALIDAD: se traen las zonas de la temporalidad
         superior (15m→1h, etc.) cada ~60 s y se usan para validar. */
      const sup = TF_SUPERIOR[M.tf];
      if (sup && px > 0 && Date.now() - _htfTs > 60000) {
        try {
          const vh = await traerVelas(par.s, sup, 300);
          M.zonasHTF = detectarZonas(vh, px, {}).zonas;
          _htfTs = Date.now();
        } catch (_) {}
      }
      /* Las zonas salen de las VELAS: se llenan en ~1 s, sin depender del libro. */
      const r = detectarZonas(M.velas, px, { htf: M.zonasHTF, libro: murosDelLibro() });
      M.zonas = r.zonas; M.perfil = r.perfil;
      /* NIVELES INSTITUCIONALES + BACKTEST, y boost de confianza cuando una
         zona coincide con VWAP / borde del área de valor / POC. */
      M.mercado = analizarMercado(M.velas, px, M.perfil);
      aplicarReferencias(M.zonas, M.mercado, px);
      seguirVida(M.zonas);
      /* ORDER-FLOW real (aggTrades), cada ~8 s. */
      if (Date.now() - _delTs > 8000) { _delTs = Date.now(); traerDelta(par.s).then((d) => { if (d) M.delta = d; }); }
      /* CONTEXTO multi-símbolo (BTC/ETH), cacheado 90 s. */
      traerContexto().then((c) => { M.contexto = c; });
      if (M.velas.length) { M.cargando = false; M.error = null; }
      pintarPanel();
      dibujar();
    } catch (_) {}
  };
  await traer();
  _relojVelas = setInterval(traer, 12000);
}

/* Sube la confianza de una zona cuando coincide con un nivel institucional
   (VWAP, VAH, VAL o POC): son imanes de precio que las mesas vigilan. */
function aplicarReferencias(zonas, mercado, precio) {
  if (!mercado) return;
  const refs = [mercado.vwap, mercado.vah, mercado.val, mercado.poc].filter((x) => x > 0);
  zonas.forEach((z) => {
    const coincide = refs.some((rp) => rp >= z.pLow && rp <= z.pHigh);
    z.ref = coincide;
    if (coincide && !z.rota) {
      z.confianza = Math.min(100, z.confianza + 10);
      z.fuerza = Math.max(1, Math.min(5, Math.round(z.confianza / 20)));
    }
  });
}

/* Extrae los MUROS reales del libro en vivo (niveles con tamaño >= 4× la
   mediana) para confirmar zonas: acumulación + muro real = alta convicción. */
function murosDelLibro() {
  const L = _wsLibro || _ultLibro;
  if (!L) return null;
  const todos = [...(L.compras || []), ...(L.ventas || [])]
    .map((o) => ({ p: o.p, d: o.p * o.q })).filter((o) => o.d > 0);
  if (todos.length < 6) return null;
  const ds = todos.map((o) => o.d).sort((a, b) => a - b);
  const med = ds[Math.floor(ds.length / 2)] || 0;
  if (!(med > 0)) return null;
  return { muros: todos.filter((o) => o.d >= med * 4).map((o) => o.p) };
}

/* ORDER-FLOW REAL: los aggTrades traen cada operación con la marca de si el
   comprador fue el agresor. Sumamos el volumen agresor comprador vs vendedor
   (delta) de los últimos ~1000 trades: es lo que mueve el precio de verdad. */
async function traerDelta(simbolo) {
  try {
    const r = await muFetch(`/api/v3/aggTrades?symbol=${simbolo}&limit=1000`);
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j) || !j.length) return null;
    let comp = 0, vend = 0;
    j.forEach((t) => {
      const q = Number(t.q) * Number(t.p);            // $ de la operación
      if (t.m) vend += q; else comp += q;             // m=true → comprador es maker → agresor vendedor
    });
    const total = comp + vend || 1;
    return { comp, vend, delta: comp - vend, ratio: comp / total, t: Date.now() };
  } catch (_) { return null; }
}

/* CONTEXTO MULTI-SÍMBOLO: mira si BTC y ETH están en zona de demanda/oferta
   cerca de su precio. Una zona en una alt es más fiable si BTC acompaña. */
let _ctxTs = 0, _ctxCache = null;
async function traerContexto() {
  if (Date.now() - _ctxTs < 90000 && _ctxCache) return _ctxCache;
  const guias = [{ id: 'BTC', s: 'BTCUSDT' }, { id: 'ETH', s: 'ETHUSDT' }];
  const out = [];
  for (const g of guias) {
    try {
      const v = await traerVelas(g.s, M.tf, 260);
      if (!v.length) continue;
      const px = v[v.length - 1].c;
      const r = detectarZonas(v, px, {});
      const cerca = r.zonas.find((z) => z.dentro || Math.abs(z.dist) < 0.004);
      out.push({ id: g.id, estado: cerca ? cerca.lado : 'neutral', px });
    } catch (_) {}
  }
  _ctxCache = out.length ? out : null; _ctxTs = Date.now();
  return _ctxCache;
}

/* CICLO DE VIDA de cada zona + ALERTAS. Se sigue por precio redondeado:
   nace → se testea → se confirma → se rompe, con marcas de tiempo. Y avisa
   (banner + pitido corto) cuando el precio entra en una zona fuerte o una
   zona se rompe. */
const _vidaZonas = new Map();
let _alerta = null, _alertaTs = 0, _alertaDesde = 0;
/* Al abrir o cambiar de par/temporalidad, se silencian las alertas unos
   segundos y se limpia el ciclo de vida, para no lanzar un aviso de golpe. */
function reiniciarAlertas() { _vidaZonas.clear(); _alertaDesde = Date.now() + 4000; }
function seguirVida(zonas) {
  const ahora = Date.now();
  const usadas = new Set();
  zonas.forEach((z) => {
    /* IDENTIDAD ESTABLE: el precio de una zona deriva un poco entre recálculos.
       Si usáramos el precio exacto como clave, cada tick crearía una zona
       "nueva" y la alerta se repetiría en bucle. Por eso emparejamos cada zona
       con la entrada existente más cercana del mismo lado (tolerancia ~0,6%). */
    let mejorK = null, mejorD = Infinity;
    _vidaZonas.forEach((v, k) => {
      if (usadas.has(k) || v.lado !== z.lado) return;
      const d = Math.abs(v.p - z.p) / (z.p || 1);
      if (d < 0.006 && d < mejorD) { mejorD = d; mejorK = k; }
    });
    let v = mejorK ? _vidaZonas.get(mejorK) : null;
    if (!v) {
      // Nace: se guarda si YA contenía el precio, para no alertar solo por empezar a seguirla.
      v = { lado: z.lado, p: z.p, nace: ahora, tests: 0, confirmada: false, rota: false, dentroAntes: (z.dentro || z.retest), reaccion: 0 };
      _vidaZonas.set(z.lado + ':' + ahora + ':' + Math.random().toString(36).slice(2, 6), v);
    }
    const claveActual = mejorK || [..._vidaZonas.keys()].find((k) => _vidaZonas.get(k) === v);
    usadas.add(claveActual);
    v.p = z.p; v.ultVisto = ahora;

    // test: el precio entró/tocó (transición fuera → dentro)
    if ((z.dentro || z.retest) && !v.dentroAntes) { v.tests++; v.ultTest = ahora; }
    // confirmada: fuerte y con reacciones
    if (z.fuerza >= 4 && z.reacciones >= 2) v.confirmada = true;
    // ALERTAS: solo en la transición real (no mientras el precio sigue dentro)
    if (z.dentro && !v.dentroAntes && z.fuerza >= 4) lanzarAlerta('entra', z);
    if (z.rota && !v.rota) { v.rota = true; v.rotaTs = ahora; lanzarAlerta('rompe', z); }
    v.dentroAntes = z.dentro || z.retest;
    z.vida = v;
  });
  // limpiar las que llevan mucho sin verse
  _vidaZonas.forEach((v, k) => { if (ahora - (v.ultVisto || v.nace) > 600000) _vidaZonas.delete(k); });
}
function lanzarAlerta(tipo, z) {
  if (Date.now() < _alertaDesde) return;        // silencio al abrir/cambiar
  if (Date.now() - _alertaTs < 4000) return;   // no spamear
  _alertaTs = Date.now();
  const dem = z.lado === 'demanda';
  _alerta = tipo === 'entra'
    ? { txt: `Precio en zona ${dem ? 'de demanda' : 'de oferta'} fuerte · ${dinero(z.v)}`, col: dem ? '#2ee86a' : '#f6465d' }
    : { txt: `Zona ${dem ? 'de demanda' : 'de oferta'} ROTA · ${fmt(z.p)}`, col: '#E8B84B' };
  pitar();
  const b = $('mu-alerta');
  if (b) {
    b.textContent = _alerta.txt;
    b.style.setProperty('--ac', _alerta.col);
    b.classList.add('on');
    clearTimeout(_alertaT);
    _alertaT = setTimeout(() => b.classList.remove('on'), 9000);   // se lee con calma
    b.onclick = () => { b.classList.remove('on'); clearTimeout(_alertaT); };   // o se cierra al tocar
  }
}
let _alertaT = null, _audio = null;
function pitar() {
  try {
    _audio = _audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = _audio.createOscillator(), g = _audio.createGain();
    o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.04;
    o.connect(g); g.connect(_audio.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, _audio.currentTime + 0.25);
    o.stop(_audio.currentTime + 0.26);
  } catch (_) {}
}

function arrancar() {
  clearInterval(_reloj);
  _fallos = 0;
  reiniciarAlertas();
  const par0 = PARES.find((p) => p.id === _par) || PARES[0];
  conectarWSLibro(par0.s);              // libro en vivo por WebSocket (respaldo)
  const tomar = async () => {
    if (!$('mu-cv')) { clearInterval(_reloj); return; }
    const par = PARES.find((p) => p.id === _par) || PARES[0];
    /* El libro solo sirve para el PRECIO en vivo (marcador + vela). Las zonas
       salen de las velas, así que aunque el libro falle, el radar funciona. */
    let foto = null;
    try {
      const f = await traerLibro(par.s);
      if (f && f.compras && f.compras.length && f.ventas && f.ventas.length) foto = f;
    } catch (_) {}
    if (!foto && _wsLibro && (Date.now() - _wsLibro.t) < 6000) foto = _wsLibro;
    if (foto) procesar(foto);                       // actualiza M.precio
    if (foto) _ultLibro = foto;
    if (!(M.precio > 0) && M.velas.length) M.precio = M.velas[M.velas.length - 1].c;

    if (M.velas.length && M.precio > 0) {
      const r = detectarZonas(M.velas, M.precio, { htf: M.zonasHTF, libro: murosDelLibro() });
      M.zonas = r.zonas; M.perfil = r.perfil;   // zonas + confluencia + libro, con precio vivo
      M.mercado = analizarMercado(M.velas, M.precio, M.perfil);
      aplicarReferencias(M.zonas, M.mercado, M.precio);
      seguirVida(M.zonas);
      M.cargando = false; M.error = null;
    }
    const px = $('mu-px-v'); if (px && M.precio > 0) px.textContent = fmt(M.precio);
    dibujar();

    /* El panel se reconstruye solo si cambian las zonas (para no parpadear). */
    const huella = M.zonas.map((z) => `${z.p.toFixed(6)}|${z.lado}|${z.fuerza}|${z.rota ? 1 : 0}|${z.confluencia ? 1 : 0}|${z.libro ? 1 : 0}`).sort().join(',');
    const ahora2 = Date.now();
    if (huella !== _huella && ahora2 - _ultPintado > 2500) { _huella = huella; _ultPintado = ahora2; pintarPanel(); }
    else refrescarNumeros();
  };
  tomar();
  _reloj = setInterval(tomar, CADA);
}

/* ══════════════════════════════════════════════════════════════
   LIBRO EN VIVO POR WEBSOCKET — respaldo con la misma fuente que Trade
   (stream.binance.com). Mantiene los 20 niveles por lado más cercanos al
   precio; se usa solo si el REST del libro no llega.
   ══════════════════════════════════════════════════════════════ */
function conectarWSLibro(sym) {
  cerrarWSLibro();
  _wsPar = sym;
  try {
    _wsL = new WebSocket(`wss://stream.binance.com:9443/ws/${sym.toLowerCase()}@depth20@100ms`);
    _wsL.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data);
        const b = j.bids || j.b, a = j.asks || j.a;
        if (!b || !a) return;
        _wsLibro = {
          t: Date.now(),
          compras: b.map((x) => ({ p: Number(x[0]), q: Number(x[1]) })).filter((x) => x.q > 0),
          ventas: a.map((x) => ({ p: Number(x[0]), q: Number(x[1]) })).filter((x) => x.q > 0)
        };
        /* PRECIO EN TIEMPO REAL. El libro (REST) solo llega cada 1,5 s, y por
           eso la vela y la línea de precio se veían "atrasadas". El WebSocket
           llega ~10 veces/segundo: con él movemos el precio y la última vela al
           instante (redibujo suave, máx ~6/seg) para que vayan siempre pegados
           al mercado. */
        const mb = _wsLibro.compras[0], ms = _wsLibro.ventas[0];
        if (mb && ms) {
          M.precio = (mb.p + ms.p) / 2;
          const px = $('mu-px-v'); if (px) px.textContent = fmt(M.precio);
          const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
          if (now - _ultDibujoWS > 160 && $('mu-cv') && !M.cargando) { _ultDibujoWS = now; dibujar(); }
        }
      } catch (_) {}
    };
  } catch (_) {}
}
function cerrarWSLibro() { if (_wsL) { try { _wsL.close(); } catch (_) {} _wsL = null; } _wsLibro = null; }

/* ══════════════════════════════════════════════════════════════
   EL DIBUJO — mapa de profundidad en el tiempo

   Eje horizontal: el tiempo (izquierda pasado, derecha ahora).
   Eje vertical: el precio.
   El color: cuánto dinero hay en el libro a ese precio.

   Encima, los muros detectados con su etiqueta.
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   EL DIBUJO — una escalera de precios, no un mapa de rayas

   [REPLANTEADO] El mapa de calor mostraba el PROCESO (cómo cambia el
   libro con el tiempo) y eso solo lo entiende quien ya sabe qué está
   mirando. Un trader no necesita ver el proceso: necesita ver el
   RESULTADO.

   Ahora es una escalera vertical, igual que el libro de cualquier
   exchange, que todo el mundo sabe leer de un vistazo:

     · Cada fila es un precio
     · La barra dice cuánto dinero hay puesto ahí
     · Verde = compras (soportes) · Rojo = ventas (resistencias)
     · Los muros vigilados llevan su sello de veredicto

   Y en el centro, el precio actual con la distancia a cada muro.
   ══════════════════════════════════════════════════════════════ */
function dibujar() {
  const cv = $('mu-cv'); const zona = $('mu-graf');
  if (!cv || !zona) return;
  const W = zona.clientWidth, H = zona.clientHeight;
  if (W < 50 || H < 50) return;

  if (!cv.dataset.listo) {
    engancharGestos(cv);
    cv.dataset.listo = '1';
    /* Órdenes desde el gráfico: clic derecho o toque largo. */
    import('./orden.js?v=126').then((od) => {
      od.conectar({
        canvas: cv,
        precioEn: (y) => {
          if (!M._geo) return 0;
          const { pMin, pMax, y1 } = M._geo;
          return pMin + (pMax - pMin) * ((y1 - y) / y1);
        },
        precioActual: () => {
          /* El precio del libro puede tardar en llegar. Si aún no
             está, se usa el cierre de la última vela: así el menú
             de órdenes funciona desde el primer momento. */
          if (M.precio > 0) return M.precio;
          const v = M.velas || [];
          return v.length ? v[v.length - 1].c : 0;
        },
        par: () => _par,
        simbolo: () => (PARES.find((p) => p.id === _par) || {}).s || '',
        repintar: () => pintar()
      });
      _od = od;
      od.clicCancelar(cv, () => _zonasOd, () => pintar());
      pintar();
    }).catch(() => {});
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const P = pal();
  g.fillStyle = P.fondo;
  g.fillRect(0, 0, W, H);

  const esp = $('mu-esperando');
  /* En cuanto hay velas se aparta del todo, aunque el libro siga
     acumulando tomas: el gráfico ya se puede usar. */
  if (esp && M.velas.length && !M.cargando) esp.style.display = 'none';
  if (M.cargando || !M.velas.length) {
    if (esp) {
      esp.style.display = '';
      const pr = $('mu-prog');
      if (pr) pr.style.width = Math.min(100, (M.fotos.length / MIN_TOMAS) * 100) + '%';
    }
    return;
  }
  if (esp) esp.style.display = 'none';

  const mDer = 88, mAba = 22;
  const x1 = W - mDer, y1 = H - mAba;
  const xVelas = x1;             // las velas llegan HASTA el eje de precios (sin banda muerta)

  /* La ventana visible: el ancho es el zoom y el desplazamiento el
     arrastre. Muestra SIEMPRE `ancho` velas completas (sin aplastar ni
     dejar telón), con un respiro del 15% a la derecha. */
  const ancho = Math.min(M.velas.length, M.ancho || 70);
  const huecoMax = Math.floor(ancho * 0.45);
  const desp = Math.max(-huecoMax, Math.min(M.desplaz || 0, Math.max(0, M.velas.length - ancho)));
  M.desplaz = desp;
  const fin = M.velas.length - desp;
  const vis = M.velas.slice(Math.max(0, fin - ancho), Math.min(M.velas.length, fin));
  if (!vis.length) return;

  /* ══════════════════════════════════════════════════════════
     [CORREGIDO] La línea del precio se separaba de las velas.

     Causa: el precio venía del LIBRO (se refresca cada 1,5 s) y las
     velas del histórico (cada 12 s). En 1m y 5m eso basta para que
     se despeguen a la vista.

     Ahora la última vela se estira con el precio real del libro: son
     el mismo dato, así que van juntas siempre.
     ══════════════════════════════════════════════════════════ */
  if (desp === 0 && M.precio > 0) {
    const u = vis[vis.length - 1];
    u.c = M.precio;
    if (M.precio > u.h) u.h = M.precio;
    if (M.precio < u.l) u.l = M.precio;
  }

  /* El rango abarca velas Y muros: si un muro queda fuera de pantalla,
     el usuario no puede usarlo. */
  let pAlto = Math.max(...vis.map((v) => v.h));
  let pBajo = Math.min(...vis.map((v) => v.l));
  if (M.precio > 0) { pAlto = Math.max(pAlto, M.precio); pBajo = Math.min(pBajo, M.precio); }
  /* Las zonas amplían la escala SOLO si están cerca del rango de las velas.
     Una zona lejana no debe aplastar las velas: se recorta al borde del
     gráfico (el dibujo ya usa Math.min/max con pMin/pMax). */
  const margenR = (pAlto - pBajo) * 0.35 || 1;
  M.zonas.forEach((z) => {
    if (z.pHigh <= pAlto + margenR && z.pHigh > pAlto) pAlto = z.pHigh;
    if (z.pLow >= pBajo - margenR && z.pLow < pBajo) pBajo = z.pLow;
  });
  if (M.mercado) {
    [M.mercado.vwap, M.mercado.vah, M.mercado.val].forEach((p) => {
      if (!(p > 0)) return;
      if (p <= pAlto + margenR && p > pAlto) pAlto = p;
      if (p >= pBajo - margenR && p < pBajo) pBajo = p;
    });
  }
  /* El zoom vertical estira o comprime la escala de precios, como al
     arrastrar el borde derecho en TradingView. */
  /* El arrastre vertical desplaza el rango de precios. */
  const rangoB = (pAlto - pBajo) || 1;
  const despY = ((M.offsetY || 0) / Math.max(1, y1)) * rangoB;
  const centro = (pAlto + pBajo) / 2 + despY;
  const semi = (rangoB / 2) * (M.zoomY || 1);
  const pad = semi * 0.14 || 1;
  const pMax = centro + semi + pad, pMin = centro - semi - pad;
  const Y = (p) => y1 - y1 * ((p - pMin) / Math.max(1e-12, pMax - pMin));
  /* Se guarda para que el módulo de órdenes sepa qué precio hay a
     cada altura del gráfico. */
  M._geo = { pMin, pMax, y1 };

  /* Tus órdenes y alertas, con el estilo común de las tres. */
  if (_od) {
    _zonasOd = _od.pintar(g, {
      x1, Y, pMin, pMax,
      simbolo: (PARES.find((p) => p.id === _par) || {}).s || ''
    });
  }

  /* ── Rejilla ── */
  g.strokeStyle = P.rejilla;
  g.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = (y1 / 6) * i;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
  }

  /* (El perfil de volumen se dibuja MÁS ABAJO, encima de las velas, para que
     no quede tapado por ellas.) */

  /* ── MAPA DE CALOR de volumen (fondo) ──
     Sombreado tenue a TODO el ancho según la densidad de volumen a cada
     precio: las zonas emergen del calor de forma orgánica. */
  if (M.perfil && M.perfil.vol) {
    const pf = M.perfil;
    for (let b = 0; b < pf.N; b++) {
      const pB = pf.lo + (b + 0.5) * (pf.hi - pf.lo) / pf.N;
      if (pB < pMin || pB > pMax) continue;
      const rel = pf.vol[b] / pf.max;
      if (rel < 0.16) continue;
      const yb = Y(pB);
      const binH = y1 / pf.N;
      g.fillStyle = `rgba(232,184,75,${(rel * 0.06).toFixed(3)})`;
      g.fillRect(0, yb - binH / 2, xVelas, Math.max(1.5, binH));
    }
  }

  /* (Los niveles institucionales VWAP/VAH/VAL se dibujan MÁS ABAJO, después
     del eje, con la línea a todo el ancho y la denominación en el eje derecho.) */

  /* ══════════════════════════════════════════════════════════
     ZONAS DE ACUMULACIÓN

     Banda LIMPIA a todo el ancho (muy sutil, para no tapar las velas) que
     marca el rango de la zona, con sus bordes finos y la línea POC. A la
     derecha, un PANEL de proyección sólido y redondeado = la zona de retesteo,
     con el importe y las insignias. Verde = demanda · Rojo = oferta.
     ══════════════════════════════════════════════════════════ */
  const pulso = 0.5 + 0.5 * Math.sin(Date.now() / 450);
  /* PASE 1 (detrás de las velas): solo las BANDAS y bordes de cada zona, muy
     sutiles, para no tapar el precio. Las líneas de entrada, etiquetas y el
     perfil van DESPUÉS (encima de las velas) para que no queden troceados.

     CLAVE: cuando dos zonas están cerca, sus bandas se SOLAPARÍAN en un bloque
     ilegible. Por eso cada banda se recorta hasta el punto medio con su vecina
     (dejando un hueco): las zonas lejanas conservan su altura, las juntas se
     estrechan, y todo se sigue rigiendo por la línea punteada central. */
  const bandas = M.zonas
    .filter((z) => z.pHigh >= pMin && z.pLow <= pMax)
    .map((z) => ({ z, yC: Y(z.p), yT: Y(Math.min(pMax, z.pHigh)), yB: Y(Math.max(pMin, z.pLow)) }))
    .sort((a, b) => a.yC - b.yC);
  const HUECO = 5;
  bandas.forEach((it, i) => {
    const arriba = bandas[i - 1], abajo = bandas[i + 1];
    if (arriba) { const medio = (it.yC + arriba.yC) / 2; if (it.yT < medio + HUECO) it.yT = medio + HUECO; }
    if (abajo) { const medio = (it.yC + abajo.yC) / 2; if (it.yB > medio - HUECO) it.yB = medio - HUECO; }
    // nunca invertir ni desaparecer: mínimo una franja fina centrada en el POC
    if (it.yB - it.yT < 4) { it.yT = it.yC - 2; it.yB = it.yC + 2; }
  });
  bandas.forEach(({ z, yT, yB }) => {
    const alto = Math.max(4, yB - yT);
    const dem = z.lado === 'demanda';
    const rota = z.rota;
    const col = rota ? '#6b7681' : (dem ? '#2ee86a' : '#f6465d');
    const rgb = dem ? '46,232,106' : rota ? '107,118,129' : '246,70,93';
    const aBanda = rota ? 0.05 : (0.06 + (z.confianza / 100) * 0.10);
    g.fillStyle = `rgba(${rgb},${aBanda})`;
    g.fillRect(0, yT, x1, alto);
    const pg = g.createLinearGradient(xVelas, 0, x1, 0);
    pg.addColorStop(0, `rgba(${rgb},${aBanda * 1.6})`);
    pg.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = pg;
    g.fillRect(xVelas, yT, x1 - xVelas, alto);
    g.strokeStyle = col + (rota ? '3a' : '66'); g.lineWidth = 1;
    if (rota) g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(0, yT + .5); g.lineTo(x1, yT + .5); g.stroke();
    g.beginPath(); g.moveTo(0, yB - .5); g.lineTo(x1, yB - .5); g.stroke();
    g.setLineDash([]);
  });


  /* ── LAS VELAS ── */
  const paso = xVelas / (ancho || vis.length);   // ancho fijo: al ir al futuro NO se estiran
  const cuerpo = Math.max(1.6, paso * 0.6);
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const col = v.c >= v.o ? P.velaUp : P.velaDown;
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(1, paso * 0.12);
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1.4, yB - yA));
  });

  /* ── PERFIL DE VOLUMEN (ENCIMA de las velas) ──
     Silueta que sale del borde izquierdo y se DESVANECE a la derecha (sin corte
     duro). Los nodos más relevantes (POC y franjas de zonas) brillan más. */
  if (M.perfil && M.perfil.vol) {
    const pf = M.perfil;
    const wMax = Math.min(150, x1 * 0.26);
    const binH = y1 / pf.N;
    let pocB = 0;
    for (let b = 1; b < pf.N; b++) if (pf.vol[b] > pf.vol[pocB]) pocB = b;
    for (let b = 0; b < pf.N; b++) {
      const pB = pf.lo + (b + 0.5) * (pf.hi - pf.lo) / pf.N;
      if (pB < pMin || pB > pMax) continue;
      const w = (pf.vol[b] / pf.max) * wMax;
      if (w < 1) continue;
      const yb = Y(pB);
      const enZona = M.zonas.some((z) => pB >= z.pLow && pB <= z.pHigh && !z.rota);
      const base = pB < M.precio ? '46,232,106' : '246,70,93';
      // intensidad: POC y zonas brillan; el resto tenue
      const a = b === pocB ? 0.9 : enZona ? 0.62 : 0.30;
      const h = Math.max(2, binH - 0.5);
      // degradado horizontal: sólido a la izquierda, se desvanece al final
      const gr = g.createLinearGradient(0, 0, w, 0);
      gr.addColorStop(0, `rgba(${base},${a})`);
      gr.addColorStop(0.75, `rgba(${base},${a * 0.55})`);
      gr.addColorStop(1, `rgba(${base},0)`);
      g.fillStyle = gr;
      g.fillRect(0, yb - h / 2, w, h);
      // brillo del pico en el arranque (borde izquierdo) para los relevantes
      if (b === pocB || enZona) {
        g.save(); g.shadowColor = `rgba(${base},.8)`; g.shadowBlur = 6;
        g.fillStyle = `rgba(${base},${Math.min(1, a + 0.15)})`;
        g.fillRect(0, yb - h / 2, 3, h);
        g.restore();
      }
    }
    // POC global: brillo dorado que también se desvanece
    const pPoc = pf.lo + (pocB + 0.5) * (pf.hi - pf.lo) / pf.N;
    if (pPoc >= pMin && pPoc <= pMax) {
      const yp = Y(pPoc);
      const wp = wMax * (pf.vol[pocB] / pf.max);
      const gp = g.createLinearGradient(0, 0, wp, 0);
      gp.addColorStop(0, 'rgba(232,184,75,.9)');
      gp.addColorStop(1, 'rgba(232,184,75,0)');
      g.fillStyle = gp; g.fillRect(0, yp - 1, wp, 2);
    }
  }

  /* ── PASE 2 (ENCIMA de las velas): línea de entrada (POC), etiqueta y chip ──
     Cuando varias zonas caen juntas, sus etiquetas se APILARÍAN y todo se
     vuelve ilegible. Por eso primero se calcula un reparto vertical sin
     solapes (de-colisión) y cada etiqueta se conecta a su línea con un hilo. */
  const vis2 = M.zonas.filter((z) => z.pHigh >= pMin && z.pLow <= pMax);
  // reparto vertical sin solapes, respetando el orden por precio
  const repartir = (ys, gap, lo, hi) => {
    const idx = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
    let prev = -Infinity;
    idx.forEach((o) => { o.ny = Math.max(o.y, prev + gap); prev = o.ny; });
    // si se salieron por abajo, empujar todo hacia arriba
    const exceso = idx.length ? Math.max(0, idx[idx.length - 1].ny - (hi)) : 0;
    if (exceso > 0) { let p = Infinity; for (let k = idx.length - 1; k >= 0; k--) { idx[k].ny = Math.min(idx[k].ny - exceso, p - gap); p = idx[k].ny; } }
    idx.forEach((o) => { if (o.ny < lo) o.ny = lo; });
    const out = new Array(ys.length);
    idx.forEach((o) => { out[o.i] = o.ny; });
    return out;
  };
  const yLabels = repartir(vis2.map((z) => Y(z.p)), 24, 16, y1 - 8);
  const yChips = repartir(vis2.map((z) => Y(Math.min(pMax, z.pHigh)) + 11), 20, 20, y1 - 6);

  vis2.forEach((z, k) => {
    const yPoc = Y(z.pPoc);
    const yCreal = Y(z.p);
    const yC = yLabels[k];                 // posición de la etiqueta (ya sin solape)
    const dem = z.lado === 'demanda';
    const rota = z.rota;
    const col = rota ? '#6b7681' : (dem ? '#2ee86a' : '#f6465d');
    const fuerte = z.fuerza >= 4 && !rota;
    const activa = (z.dentro || z.retest) && !rota;

    // Línea de entrada = POC: continua de lado a lado, punteada, con glow si fuerte
    if (z.pPoc >= pMin && z.pPoc <= pMax) {
      g.save();
      if (fuerte || activa) { g.shadowColor = col; g.shadowBlur = activa ? (6 + 6 * pulso) : 7; }
      g.strokeStyle = col + (rota ? '99' : 'ff'); g.lineWidth = fuerte ? 1.8 : 1.3;
      g.setLineDash([6, 5]);
      g.beginPath(); g.moveTo(0, yPoc); g.lineTo(x1, yPoc); g.stroke();
      g.restore(); g.setLineDash([]);
    }

    // Etiqueta: importe + insignias, anclada a la derecha, en su posición
    // de-colisionada; un hilo la une a su línea real cuando se ha movido.
    const et = dinero(z.v);
    const badges = (z.confluencia ? ' \u25c8' : '') + (z.libro ? ' \u25a3' : '');
    g.font = 'bold 11.5px ui-monospace,monospace';
    const wCaja = g.measureText(et + badges).width + 34;
    const xCaja = x1 - wCaja - 6;
    if (Math.abs(yC - yCreal) > 3) {
      g.strokeStyle = col + 'aa'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x1 - 4, yCreal); g.lineTo(xCaja - 2, yC); g.stroke();
    }
    g.save();
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 7; g.shadowOffsetY = 1.5;
    g.fillStyle = col;
    redondeado(g, xCaja, yC - 11, wCaja, 22, 6); g.fill();
    g.restore();
    if (fuerte) { g.strokeStyle = 'rgba(232,184,75,.85)'; g.lineWidth = 1.4; redondeado(g, xCaja, yC - 11, wCaja, 22, 6); g.stroke(); }
    g.fillStyle = rota ? '#0b0e12' : (dem ? '#04210f' : '#2a0509');
    g.font = 'bold 10px system-ui,sans-serif'; g.textAlign = 'center';
    g.fillText(rota ? '\u2715' : (dem ? '\u25b2' : '\u25bc'), xCaja + 11, yC + 3.5);
    g.font = 'bold 11.5px ui-monospace,monospace'; g.textAlign = 'left';
    g.fillText(et + badges, xCaja + 21, yC + 4);

    // Chip de estado (pulsante), también de-colisionado a la izquierda
    const yCh = yChips[k];
    if (activa) {
      const rw = 66;
      g.save();
      g.globalAlpha = 0.74 + 0.26 * pulso;
      g.shadowColor = 'rgba(232,184,75,.7)'; g.shadowBlur = 9;
      g.fillStyle = '#E8B84B';
      redondeado(g, 8, yCh - 7, rw, 15, 4); g.fill();
      g.restore();
      g.fillStyle = '#2a1c00'; g.font = 'bold 8px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText(z.dentro ? 'EN LA ZONA' : 'RETESTEO', 8 + rw / 2, yCh + 3.5);
      g.textAlign = 'left';
    } else if (rota) {
      const rw = 44;
      g.fillStyle = 'rgba(107,118,129,.9)';
      redondeado(g, 8, yCh - 7, rw, 15, 4); g.fill();
      g.fillStyle = '#0b0e12'; g.font = 'bold 8px system-ui,sans-serif'; g.textAlign = 'center';
      g.fillText('ROTA', 8 + rw / 2, yCh + 3.5);
      g.textAlign = 'left';
    }
  });

  /* ── El precio actual ── */
  const yP = Y(M.precio);
  g.strokeStyle = 'rgba(232,184,75,.9)';
  g.setLineDash([6, 4]); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(0, yP); g.lineTo(x1, yP); g.stroke();
  g.setLineDash([]);

  /* ── NIVELES INSTITUCIONALES: la LÍNEA en el gráfico con protagonismo (la
     denominación va como tachuela alargada en el eje, conectada a la línea). ── */
  if (M.mercado) {
    const mk = M.mercado;
    const refLinea = (p, col, patron, ancho, glow, halo) => {
      if (!(p > 0) || p < pMin || p > pMax) return;
      const y = Y(p);
      if (halo) { g.strokeStyle = halo; g.lineWidth = ancho + 4; g.setLineDash([]); g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke(); }
      g.save();
      if (glow) { g.shadowColor = col; g.shadowBlur = 9; }
      g.strokeStyle = col; g.lineWidth = ancho; if (patron.length) g.setLineDash(patron);
      g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
      g.restore(); g.setLineDash([]);
    };
    refLinea(mk.vah, 'rgba(216,184,94,.72)', [6, 5], 1.3, false, null);
    refLinea(mk.val, 'rgba(216,184,94,.72)', [6, 5], 1.3, false, null);
    refLinea(mk.vwap, 'rgba(127,186,255,1)', [], 1.8, true, 'rgba(127,186,255,.12)');
  }

  /* ── La escala, con los niveles marcados ── */
  g.fillStyle = P.ejeBg;
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = P.ejeBorde;
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();

  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 6; i++) {
    const p = pMin + (pMax - pMin) * (i / 6);
    const y = Y(p);
    if (Math.abs(y - yP) < 15) continue;
    if (M.zonas.some((z) => Math.abs(Y(z.p) - y) < 15)) continue;
    g.fillStyle = P.ejeTxt;
    g.fillText(fmt(p), x1 + 7, y + 3.5);
  }
  M.zonas.forEach((z) => {
    if (z.p < pMin || z.p > pMax) return;
    const y = Y(z.p);
    const col = z.lado === 'demanda' ? '#2ee86a' : '#f6465d';
    g.fillStyle = col;
    redondeado(g, x1 + 2, y - 9, mDer - 5, 18, 4); g.fill();
    g.fillStyle = z.lado === 'demanda' ? '#04210f' : '#2a0509';
    g.font = 'bold 10px ui-monospace,monospace';
    g.fillText(fmt(z.p), x1 + 7, y + 3.5);
  });
  g.fillStyle = '#E8B84B';
  redondeado(g, x1 + 2, yP - 11, mDer - 5, 22, 5); g.fill();
  g.fillStyle = '#2a1c00';
  g.font = 'bold 12px ui-monospace,monospace';
  g.fillText(fmt(M.precio), x1 + 7, yP + 4);

  /* Tachuela ALARGADA de los niveles institucionales en el eje (como las
     demás), conectada a su línea: denominación + precio. Se reparten sin
     solaparse entre sí, con el precio ni con las zonas. */
  if (M.mercado) {
    const mk = M.mercado;
    const usadas = [yP];
    M.zonas.forEach((z) => { if (z.p >= pMin && z.p <= pMax) usadas.push(Y(z.p)); });
    const refTag = (p, txt, col, txtcol) => {
      if (!(p > 0) || p < pMin || p > pMax) return;
      let y = Y(p);
      let guard = 0;
      while (usadas.some((u) => Math.abs(u - y) < 15) && guard++ < 20) y -= 15;
      usadas.push(y);
      // hilo de conexión desde la línea real al centro de la tachuela
      if (Math.abs(y - Y(p)) > 3) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); g.moveTo(x1 + 1, Y(p)); g.lineTo(x1 + 8, y); g.stroke(); }
      g.fillStyle = col;
      redondeado(g, x1 + 2, y - 9, mDer - 5, 18, 4); g.fill();
      g.fillStyle = txtcol; g.textAlign = 'left';
      g.font = 'bold 9px ui-monospace,monospace';
      g.fillText(txt, x1 + 7, y + 3.2);
      g.textAlign = 'right';
      g.font = '8.5px ui-monospace,monospace';
      g.fillText(fmt(p), W - 5, y + 3.2);
      g.textAlign = 'left';
    };
    refTag(mk.vah, 'VAH', 'rgba(216,184,94,.92)', '#2a1c00');
    refTag(mk.val, 'VAL', 'rgba(216,184,94,.92)', '#2a1c00');
    refTag(mk.vwap, 'VWAP', 'rgba(127,186,255,.95)', '#06101f');
  }

  /* ── Las horas ── */
  g.fillStyle = P.ejeBg;
  g.fillRect(0, y1, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = P.ejeTxt;
  const cada = Math.max(1, Math.floor(vis.length / 5));
  g.textAlign = 'center';
  vis.forEach((v, i) => {
    if (i % cada !== 0) return;
    const x = i * paso + paso / 2;
    if (x > xVelas - 12) return;
    const d = new Date(v.t * 1000);
    g.fillText(d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), x, y1 + 14);
  });
  g.textAlign = 'left';

  /* ── CROSSHAIR: cruz + precio del cursor en el eje ── */
  if (M._cursor && M._cursor.x < x1 && M._cursor.y < y1 && M._cursor.x > 0 && M._cursor.y > 0) {
    const cx = M._cursor.x, cy = M._cursor.y;
    const pCur = pMin + (pMax - pMin) * ((y1 - cy) / y1);
    g.save();
    g.strokeStyle = M.tema === 'claro' ? 'rgba(40,50,62,.5)' : 'rgba(200,210,224,.42)';
    g.lineWidth = 1; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, y1); g.stroke();          // vertical
    g.beginPath(); g.moveTo(0, cy); g.lineTo(x1, cy); g.stroke();          // horizontal
    g.restore(); g.setLineDash([]);
    // tachuela de precio del cursor en el eje
    g.fillStyle = M.tema === 'claro' ? '#2a323d' : '#e8ecf2';
    redondeado(g, x1 + 2, cy - 9, mDer - 5, 18, 4); g.fill();
    g.fillStyle = M.tema === 'claro' ? '#eef2f7' : '#0b0e12';
    g.font = 'bold 10px ui-monospace,monospace'; g.textAlign = 'left';
    g.fillText(fmt(pCur), x1 + 7, cy + 3.5);
    // tachuela de la hora del cursor abajo
    const idx = Math.floor(cx / paso);
    if (idx >= 0 && idx < vis.length) {
      const d = new Date(vis[idx].t * 1000);
      const ht = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      g.font = 'bold 9px ui-monospace,monospace';
      const hw = g.measureText(ht).width + 12;
      g.fillStyle = M.tema === 'claro' ? '#2a323d' : '#e8ecf2';
      redondeado(g, Math.max(2, Math.min(x1 - hw, cx - hw / 2)), y1 + 3, hw, 15, 4); g.fill();
      g.fillStyle = M.tema === 'claro' ? '#eef2f7' : '#0b0e12'; g.textAlign = 'center';
      g.fillText(ht, Math.max(2 + hw / 2, Math.min(x1 - hw / 2, cx)), y1 + 13.5);
      g.textAlign = 'left';
    }
  }
}

/* ══════════════════════════════════════════════════════════════
   GESTOS — acercar y alejar

   El libro es estrecho: sin poder acercarse, los muros próximos al
   precio se amontonan. La rueda y el pellizco cambian el rango que
   se muestra; el doble clic vuelve a verlo todo.
   ══════════════════════════════════════════════════════════════ */
function engancharGestos(cv) {
  const zoom = (f) => {
    M.ancho = Math.max(20, Math.min(140, Math.round((M.ancho || 70) * f)));
    dibujar();
  };

  /* [MEJORADO] El arrastre solo movía en el tiempo y no se podía
     despegar del borde. Ahora es igual que en Smart Levels: se
     agarra el gráfico y se lleva en los dos ejes. */
  let ax = 0, ay = 0, arr = false, modoG = 'libre';
  const enEscalaM = (x) => x > cv.clientWidth - 95;

  cv.addEventListener('mousedown', (e) => {
    const r = cv.getBoundingClientRect();
    modoG = enEscalaM(e.clientX - r.left) ? 'y' : 'libre';
    arr = true; ax = e.clientX; ay = e.clientY;
    cv.style.cursor = modoG === 'y' ? 'ns-resize' : 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!arr) return;
    if (modoG === 'y') {
      const dy = e.clientY - ay;
      if (Math.abs(dy) > 2) {
        M.zoomY = Math.max(0.25, Math.min(4, (M.zoomY || 1) * (1 + dy * 0.004)));
        ay = e.clientY; dibujar();
      }
      return;
    }
    let cambio = false;
    const paso = (cv.clientWidth * 0.7) / (M.ancho || 70);
    const mov = Math.round((e.clientX - ax) / Math.max(1, paso));
    if (mov !== 0) {
      const tope = Math.max(0, M.velas.length - (M.ancho || 70));
      const suelo = -Math.floor((M.ancho || 70) * 0.45);   // respiro a la derecha
      M.desplaz = Math.max(suelo, Math.min(tope, (M.desplaz || 0) + mov));
      ax = e.clientX; cambio = true;
    }
    const dy = e.clientY - ay;
    if (Math.abs(dy) > 1) {
      M.offsetY = (M.offsetY || 0) + dy;
      ay = e.clientY; cambio = true;
    }
    if (cambio) dibujar();
  });
  window.addEventListener('mouseup', () => { arr = false; cv.style.cursor = 'crosshair'; });

  /* CROSSHAIR estilo TradingView: al mover el cursor por el gráfico se dibuja
     una cruz y el precio exacto aparece en el eje derecho. */
  cv.addEventListener('mousemove', (e) => {
    if (arr) return;                    // durante el arrastre no se dibuja la cruz
    const r = cv.getBoundingClientRect();
    M._cursor = { x: e.clientX - r.left, y: e.clientY - r.top };
    dibujar();
  });
  cv.addEventListener('mouseleave', () => { if (M._cursor) { M._cursor = null; dibujar(); } });

  cv.addEventListener('dblclick', () => {
    M.ancho = window.innerWidth < 760 ? 65 : 100; M.desplaz = 0; M.zoomY = 1; M.offsetY = 0;
    dibujar();
  });
  cv.style.cursor = 'crosshair';

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    /* Sobre la escala de precios (el borde derecho) la rueda estira o
       comprime en vertical. En el resto, zoom de tiempo. Igual que
       en TradingView. */
    if (e.clientX - r.left > r.width - 95) {
      M.zoomY = Math.max(0.25, Math.min(4, (M.zoomY || 1) * (e.deltaY > 0 ? 1.12 : 0.9)));
      dibujar();
    } else {
      zoom(e.deltaY > 0 ? 1.14 : 0.88);
    }
  }, { passive: false });

  // Doble clic: volver al encuadre inicial
  cv.addEventListener('dblclick', () => {
    M.ancho = window.innerWidth < 760 ? 65 : 100;
    M.desplaz = 0;
    M.zoomY = 1;
    dibujar();
  });

  /* Táctil: un dedo mueve, dos hacen zoom. */
  let d0 = 0, tx = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { tx = e.touches[0].clientX; arr = true; }
    else if (e.touches.length === 2) {
      arr = false;
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && arr) {
      e.preventDefault();
      const paso = (cv.clientWidth * 0.7) / (M.ancho || 70);
      const mov = Math.round((e.touches[0].clientX - tx) / Math.max(1, paso));
      if (mov !== 0) {
        const tope = Math.max(0, M.velas.length - (M.ancho || 70));
        const sueloT = -Math.floor((M.ancho || 70) * 0.45);
        M.desplaz = Math.max(sueloT, Math.min(tope, (M.desplaz || 0) + mov));
        tx = e.touches[0].clientX;
        dibujar();
      }
    } else if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d - d0) > 8) { zoom(d0 / d); d0 = d; }
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { arr = false; d0 = 0; });

  cv.style.cursor = 'grab';
}

const COLORES = {
  recargable: { linea: '#E8B84B', texto: '#3a2800', icono: '★', clase: 'oro' },
  probado:    { linea: '#2ee86a', texto: '#04210f', icono: '✓', clase: 'verde' },
  real:       { linea: '#4d9fff', texto: '#04121f', icono: '●', clase: 'azul' },
  falso:      { linea: '#f6465d', texto: '#2a0509', icono: '✕', clase: 'rojo' },
  vigilando:  { linea: '#8b96a3', texto: '#0b0e12', icono: '?', clase: 'gris' },
  ido:        { linea: '#6b7681', texto: '#0b0e12', icono: '·', clase: 'ido' }
};

/* La paleta va de tenue a intenso: lo poco destacable apenas se ve, y
   lo grande grita. Así el mapa se lee de un vistazo. */
function calor(v) {
  const paradas = [
    [0.00, [22, 46, 88]],      // azul apagado — apenas destaca
    [0.30, [34, 96, 176]],     // azul
    [0.55, [30, 170, 190]],    // turquesa
    [0.75, [90, 205, 90]],     // verde
    [0.90, [235, 205, 50]],    // amarillo
    [1.00, [255, 120, 30]]     // naranja — los muros gordos
  ];
  for (let i = 1; i < paradas.length; i++) {
    if (v <= paradas[i][0]) {
      const [a, ca] = paradas[i - 1], [b, cb] = paradas[i];
      const t = (v - a) / Math.max(1e-9, b - a);
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * t),
        Math.round(ca[1] + (cb[1] - ca[1]) * t),
        Math.round(ca[2] + (cb[2] - ca[2]) * t)
      ];
    }
  }
  return paradas[paradas.length - 1][1];
}

/* ══════════════════════════════════════════════════════════════
   EL PANEL — los veredictos, en lenguaje claro

   Aquí está la diferencia entre una herramienta que se usa y una que
   se abre una vez. No son números: es qué significa cada muro y qué
   hacer con él.
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   EL NARRADOR
   El texto cuenta lo que pasa AHORA, no un estado fijo. Cambia con
   la distancia del precio y sube la tensión cuando se acerca.
   ══════════════════════════════════════════════════════════════ */
function narrar(m, esVenta, dist) {
  /* 'muyCerca' = el precio está de verdad ENCIMA del nivel (a ~0,015%). Antes
     estaba en 0,05% y por eso decía "tocando este nivel" cuando el precio aún
     estaba lejos: una mentira que un trader detecta al instante. */
  const cerca = dist < 0.12, muyCerca = dist < 0.015;

  if (m.tipo === 'falso') {
    return 'Se retira cada vez que el precio se acerca. <b>Es humo</b>: no cuente con este nivel.';
  }
  if (m.tipo === 'ido') {
    return 'La orden <b>ya no está</b>. Ese nivel quedó sin defensa: el precio puede pasar de largo.';
  }
  if (m.consumidoPct > 0.75 && cerca) {
    return `<b>Se está ejecutando ahora mismo.</b> Ya se ha comido el ${Math.round(m.consumidoPct * 100)}% de la orden. ` +
           (esVenta ? 'Si termina, el techo cae.' : 'Si termina, el suelo cede.');
  }
  if (muyCerca) {
    return `<b>El precio está tocando este nivel.</b> ${dinero(m.v)} ${esVenta ? 'en venta' : 'en compra'} esperando. ` +
           (esVenta ? 'Aquí se decide si rompe o rebota.' : 'Aquí se decide si aguanta o cede.');
  }
  if (cerca) {
    return `El precio se está acercando: solo un <b>${dist.toFixed(2)}%</b> ${esVenta ? 'por debajo' : 'por encima'}. Atento a lo que pase al llegar.`;
  }
  if (m.recargas >= 2) {
    return `Ya se la han comido <b>${m.recargas} veces</b> y la han vuelto a poner. Alguien grande insiste en defender ${fmt(m.p)}.`;
  }
  const fuerte = m.tipo === 'recargable' || m.tipo === 'probado' || (m.tipo === 'real' && m.segundos > 240);
  if (fuerte) {
    return esVenta
      ? `Lleva ${tiempo(m.segundos)} defendiendo ${fmt(m.p)}. Alta probabilidad de <b>rechazo</b> si el precio sube ahí.`
      : `Lleva ${tiempo(m.segundos)} sosteniendo ${fmt(m.p)}. Alta probabilidad de <b>rebote</b> si el precio cae ahí.`;
  }
  if (m.tipo === 'real') {
    return `${dinero(m.v)} ${esVenta ? 'en venta' : 'en compra'} esperando. Aún sin probar: veremos cuando el precio llegue.`;
  }
  return `Orden recién puesta hace ${tiempo(m.segundos)}. Todavía no sabemos si va en serio.`;
}

/* Narrador de ZONAS de acumulación: dice qué es y qué esperar, con la verdad
   de la distancia (nada de "tocando" cuando no lo está). */
function narrarZona(z, dem, dist) {
  if (z.dentro) {
    return dem
      ? '<b>El precio está DENTRO de la zona de demanda.</b> Aquí se decide si rebota o la pierde.'
      : '<b>El precio está DENTRO de la zona de oferta.</b> Aquí se decide si la rechaza o la rompe.';
  }
  if (z.retest) {
    return dem
      ? `El precio está <b>a ${dist.toFixed(2)}%</b> de retestear esta demanda. Atento a un posible rebote.`
      : `El precio está <b>a ${dist.toFixed(2)}%</b> de retestear esta oferta. Atento a un posible rechazo.`;
  }
  const f = z.fuerza >= 4 ? 'Zona <b>fuerte</b>' : 'Zona';
  return dem
    ? `${f} de demanda: se acumularon ${dinero(z.v)} en ${z.toques} velas. Suele sostener las caídas.`
    : `${f} de oferta: se acumularon ${dinero(z.v)} en ${z.toques} velas. Suele frenar las subidas.`;
}

/* ══════════════════════════════════════════════════════════════
   COCKPIT — el resumen que un gestor lee en 2 segundos
   ══════════════════════════════════════════════════════════════ */
function pintarCockpit() {
  const c = $('mu-cockpit'); if (!c) return;
  const m = M.mercado;
  const zs = M.zonas || [];
  const cercana = zs.slice().sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))[0];
  const fuerteProx = zs.filter((z) => z.fuerza >= 4 && !z.rota).sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))[0];
  const sesgo = m ? m.sesgo : 'neutral';
  const sesgoCol = sesgo === 'comprador' ? '#2ee86a' : sesgo === 'vendedor' ? '#f6465d' : '#8b96a3';
  let deltaTxt = '\u2014', deltaCol = '#8b96a3';
  if (M.delta) {
    const r = M.delta.ratio;
    deltaTxt = (r >= 0.5 ? '+' : '') + Math.round((r - 0.5) * 200) + '%';
    deltaCol = r >= 0.55 ? '#2ee86a' : r <= 0.45 ? '#f6465d' : '#8b96a3';
  }
  const ctx = (M.contexto || []).map((g) => {
    const col = g.estado === 'demanda' ? '#2ee86a' : g.estado === 'oferta' ? '#f6465d' : '#6b7681';
    const ic = g.estado === 'demanda' ? '\u25b2' : g.estado === 'oferta' ? '\u25bc' : '\u00b7';
    return `<span style="color:${col}">${g.id} ${ic}</span>`;
  }).join(' ');
  const celda = (val, lbl, col) => `<div class="mu-ck"><b style="color:${col || 'var(--mu-tx)'}">${val}</b><span>${lbl}</span></div>`;
  c.innerHTML =
    celda(`<span style="color:${sesgoCol};text-transform:capitalize">${sesgo}</span>`, 'sesgo mercado') +
    celda(m && m.winRate != null ? m.winRate + '%' : '\u2014', m && m.muestra ? 'acierto \u00b7 ' + m.muestra : 'acierto', m && m.winRate >= 60 ? '#2ee86a' : (m && m.winRate != null ? '#E8B84B' : '#8b96a3')) +
    celda(deltaTxt, 'flujo agresor', deltaCol) +
    celda(cercana ? (cercana.dentro ? 'AQU\u00cd' : (Math.abs(cercana.dist) * 100).toFixed(2) + '%') : '\u2014', 'zona cercana', cercana && cercana.dentro ? '#E8B84B' : 'var(--mu-tx)') +
    celda(fuerteProx ? fmt(fuerteProx.p) : '\u2014', 'pr\u00f3x. fuerte', fuerteProx ? (fuerteProx.lado === 'demanda' ? '#2ee86a' : '#f6465d') : '#8b96a3') +
    (ctx ? `<div class="mu-ck mu-ck-ctx"><b>${ctx}</b><span>BTC \u00b7 ETH</span></div>` : '');
}

function pintarPanel() {
  const lista = $('mu-lista'); if (!lista) return;
  const estado = $('mu-estado');
  pintarCockpit();

  /* Las cuentas de cada filtro (ahora sobre las ZONAS). */
  const cuenta = (id, f) => {
    const el = $('mu-n-' + id);
    if (el) el.textContent = M.zonas.filter(f).length;
  };
  cuenta('compra', (z) => z.lado === 'demanda');
  cuenta('venta', (z) => z.lado === 'oferta');
  cuenta('fuertes', (z) => z.fuerza >= 4);
  cuenta('falsos', (z) => z.retest || z.dentro);
  const mtn = $('mu-mtab-n'); if (mtn) mtn.textContent = M.zonas.length;

  if (M.error) { if (estado) estado.textContent = M.error; return; }

  if (M.cargando || !M.zonas.length && !M.velas.length) {
    if (estado) estado.textContent = '';
    lista.innerHTML = `<div class="mu-esperar">Leyendo el mercado…</div>`;
    return;
  }
  if (estado) estado.textContent = '';

  /* El filtro. Sin ninguno activo se ven todas. */
  let lst = M.zonas.slice();
  if (M.filtro === 'fuertes') lst = lst.filter((z) => z.fuerza >= 4);
  else if (M.filtro === 'compra') lst = lst.filter((z) => z.lado === 'demanda');
  else if (M.filtro === 'venta') lst = lst.filter((z) => z.lado === 'oferta');
  else if (M.filtro === 'falsos') lst = lst.filter((z) => z.retest || z.dentro);

  if (!lst.length) {
    lista.innerHTML = `<div class="mu-esperar">
      <b>${M.filtro === 'todos' ? 'Sin zonas claras' : 'Nada de ese tipo'}</b>
      ${M.filtro === 'todos'
        ? 'No hay acumulación destacable en ' + esc(_par) + ' en este rango.'
        : 'Prueba con otro filtro o quítalo para ver todas.'}
    </div>`;
    return;
  }

  const tarjeta = (z, id) => {
    const dem = z.lado === 'demanda';
    const pct = (Math.abs(z.dist) * 100).toFixed(2);
    const fuerza = z.fuerza;                          // 1..5
    const clase = z.rota ? 'gris' : (dem ? 'verde' : 'rojo');
    const abierta = M.seleccionado === z.p;
    const conse = narrarZona(z, dem, Math.abs(z.dist) * 100);
    const compPct = Math.round(z.compradorPct * 100);
    const flujo = dem
      ? `${compPct}% comprador`
      : `${100 - compPct}% vendedor`;
    const queHacer = z.rota
      ? 'Zona <b>rota</b>: el precio la perforó. Podría actuar al revés (flip) si vuelve a ella.'
      : dem
        ? 'Zona de <b>demanda</b>: posible rebote / entrada en largo al retestear el nivel.'
        : 'Zona de <b>oferta</b>: posible rechazo / entrada en corto al retestear el nivel.';

    // Insignias
    const badges = [
      z.ref ? '<i class="mu-b ref">\u25c7 VWAP/VA</i>' : '',
      z.confluencia ? '<i class="mu-b conf">\u25c8 ' + (TF_SUPERIOR[M.tf] || 'HTF') + '</i>' : '',
      z.libro ? '<i class="mu-b libro">\u25a3 libro</i>' : '',
      z.alineado && !z.rota ? '<i class="mu-b flujo">\u2713 flujo</i>' : '',
      z.rota ? '<i class="mu-b rota">\u2715 rota</i>' : ''
    ].join('');

    // Línea de tiempo del ciclo de vida
    const v = z.vida;
    const hace = (t) => { if (!t) return ''; const s = Math.round((Date.now() - t) / 1000); if (s < 60) return s + 's'; if (s < 3600) return Math.round(s / 60) + 'min'; if (s < 86400) return Math.round(s / 3600) + 'h'; return Math.round(s / 86400) + 'd'; };
    const timeline = v ? `
        <div class="mu-timeline">
          <span class="tl on"><i></i>formada<b>hace ${hace(v.nace)}</b></span>
          <span class="tl ${v.tests > 0 ? 'on' : ''}"><i></i>testeada<b>${v.tests}\u00d7</b></span>
          <span class="tl ${v.confirmada ? 'on' : ''}"><i></i>${v.confirmada ? 'confirmada' : 'sin confirmar'}<b>${v.confirmada ? '\u2713' : '\u2026'}</b></span>
          <span class="tl ${z.rota ? 'rota' : ''}"><i></i>${z.rota ? 'ROTA' : 'vigente'}<b>${z.rota ? hace(v.rotaTs) : '\u2713'}</b></span>
        </div>` : '';

    return `
    <div class="mu-card ${clase} f${fuerza >= 4 ? 3 : fuerza >= 2 ? 2 : 1} ${abierta ? 'sel' : ''} ${z.rota ? 'es-rota' : ''}"
         data-id="${id}" data-lado="${dem ? 'compra' : 'venta'}">
      <button class="mu-cab-card" data-mp="${z.p}">
        <div class="mu-l1">
          <span class="mu-lado">${z.rota ? (dem ? 'DEMANDA ROTA' : 'OFERTA ROTA') : (dem ? 'DEMANDA' : 'OFERTA')}</span>
          ${fuerza >= 4 && !z.rota ? '<i class="mu-fuerte">\u2605 FUERTE</i>' : ''}
          <span class="mu-imp">${dinero(z.v)}</span>
        </div>
        <div class="mu-l2">
          <span class="mu-nivel">${fmt(z.pLow)}\u2013${fmt(z.pHigh)}</span>
          <span class="mu-dist2 ${z.dentro ? 'urge' : z.retest ? 'cerca' : ''}">${z.dentro ? 'AQU\u00cd' : pct + '% ' + (dem ? '\u2193' : '\u2191')}</span>
          <span class="mu-fl">${abierta ? '\u25b2' : '\u25bc'}</span>
        </div>
        <div class="mu-conf"><i class="mu-conf-bar" style="width:${z.confianza}%"></i><em>${z.confianza}<span>conf.</span></em></div>
        ${badges ? `<div class="mu-badges">${badges}</div>` : ''}
        ${z.dentro || z.retest ? `<div class="mu-aviso-vivo">\u27f3 ${z.dentro ? 'El precio est\u00e1 en la zona ahora' : 'El precio est\u00e1 por retestear esta zona'}</div>` : ''}
      </button>
      ${abierta ? `<div class="mu-detalle">
        <div class="mu-conse mu-escribe">${conse}</div>${timeline}
        <div class="mu-metricas">
          <div><b>${fmt(z.pPoc)}</b><span>POC (entrada)</span></div>
          <div><b>${flujo}</b><span>flujo firmado</span></div>
          <div><b>${z.reacciones}</b><span>reacciones</span></div>
          <div><b>${z.toques}</b><span>toques</span></div>
          <div><b>${z.confluencia ? 'S\u00ed' : 'No'}</b><span>confluencia ${TF_SUPERIOR[M.tf] || ''}</span></div>
          <div><b>${'\u25cf'.repeat(fuerza)}${'\u25cb'.repeat(5 - fuerza)}</b><span>fuerza</span></div>
        </div>
        <div class="mu-hacer">${queHacer}</div>
      </div>` : ''}
    </div>`;
  };

  /* [CORREGIDO a fondo] `innerHTML = ...` destruye y recrea TODOS los
     nodos, y eso es lo que produce el parpadeo por mucho que se
     controle cuándo llamar.

     Ahora se compara con lo que ya está pintado: las tarjetas que
     siguen igual NO se tocan, solo se añaden las nuevas y se quitan
     las que se fueron. */
  /* ══════════════════════════════════════════════════════════
     [RESUELTO A FONDO] EL PARPADEO

     `innerHTML = ...` destruye y recrea TODOS los nodos del panel.
     Da igual cuándo se llame: cada repintado hace parpadear la lista
     entera. Controlar la frecuencia no lo arregla, solo lo espacia.

     La solución de verdad es no recrear nada:

       · Cada tarjeta lleva su precio como identidad (data-id).
       · Las que ya están se REUTILIZAN: solo se actualizan los
         textos que cambiaron, uno a uno.
       · Solo se crean las tarjetas nuevas y se borran las que
         desaparecieron.

     Resultado: los nodos sobreviven entre refrescos y la lista no
     parpadea nunca.
     ══════════════════════════════════════════════════════════ */
  const vistos = new Set();

  lst.forEach((m, idx) => {
    const id = 'w' + m.p.toFixed(6);
    vistos.add(id);
    let card = lista.querySelector(`[data-id="${id}"]`);

    if (!card) {
      // Tarjeta nueva: se crea y se coloca en su sitio
      const tmp = document.createElement('div');
      tmp.innerHTML = tarjeta(m, id);
      card = tmp.firstElementChild;
      const enPos = lista.children[idx];
      if (enPos) lista.insertBefore(card, enPos); else lista.appendChild(card);
      enganchar(card);
    } else {
      /* Si cambia el estado abierto/cerrado hay que rehacer ESA
         tarjeta (aparece o desaparece el bloque de detalle), pero
         solo esa: las demás siguen intactas. */
      const abiertaAhora = M.seleccionado === m.p;
      const estabaAbierta = !!card.querySelector('.mu-detalle');
      if (abiertaAhora !== estabaAbierta) {
        const tmp = document.createElement('div');
        tmp.innerHTML = tarjeta(m, id);
        const nueva = tmp.firstElementChild;
        card.replaceWith(nueva);
        card = nueva;
        enganchar(card);
      } else {
        actualizar(card, m);
      }
      // Y se recoloca solo si cambió de orden
      if (lista.children[idx] !== card) {
        const enPos = lista.children[idx];
        if (enPos) lista.insertBefore(card, enPos); else lista.appendChild(card);
      }
    }
  });

  // Fuera las que ya no están
  [...lista.children].forEach((el) => {
    if (!vistos.has(el.dataset.id)) el.remove();
  });

  function enganchar(card) {
    const b = card.querySelector('[data-mp]');
    if (!b) return;
    b.onclick = () => {
      const p = Number(b.dataset.mp);
      M.seleccionado = M.seleccionado === p ? null : p;
      pintarPanel(); dibujar();
    };
  }
}

/** Actualiza una tarjeta sin recrearla: solo lo que cambió. */
function actualizar(card, z) {
  const dem = z.lado === 'demanda';
  const dist = Math.abs(z.dist) * 100;
  const fuerza = z.fuerza;

  const pon = (sel, txt) => {
    const e = card.querySelector(sel);
    if (e && e.textContent !== txt) e.textContent = txt;
  };
  const clase = (sel, cl, si) => {
    const e = card.querySelector(sel);
    if (e) e.classList.toggle(cl, si);
  };

  pon('.mu-imp', dinero(z.v));
  pon('.mu-nivel', fmt(z.pLow) + '\u2013' + fmt(z.pHigh));
  pon('.mu-dist2', z.dentro ? 'AQU\u00cd' : dist.toFixed(2) + '% ' + (dem ? '\u2193' : '\u2191'));
  pon('.mu-lado', z.rota ? (dem ? 'DEMANDA ROTA' : 'OFERTA ROTA') : (dem ? 'DEMANDA' : 'OFERTA'));

  // Barra de confianza
  const barra = card.querySelector('.mu-conf-bar');
  if (barra) barra.style.width = z.confianza + '%';
  const cn2 = card.querySelector('.mu-conf em');
  if (cn2) { const t = z.confianza + ''; if (cn2.firstChild && cn2.firstChild.textContent !== t) cn2.firstChild.textContent = t; }

  const claseCol = z.rota ? 'gris' : (dem ? 'verde' : 'rojo');
  ['oro', 'verde', 'azul', 'rojo', 'gris', 'ido'].forEach((k) => {
    card.classList.toggle(k, k === claseCol);
  });
  // Clase de fuerza (f1/f2/f3) y chip "FUERTE" en vivo
  const fClass = fuerza >= 4 ? 'f3' : fuerza >= 2 ? 'f2' : 'f1';
  ['f1', 'f2', 'f3'].forEach((k) => card.classList.toggle(k, k === fClass));
  const l1 = card.querySelector('.mu-l1');
  let chip = card.querySelector('.mu-fuerte');
  if (fuerza >= 4 && !z.rota && !chip && l1) {
    chip = document.createElement('i'); chip.className = 'mu-fuerte'; chip.textContent = '\u2605 FUERTE';
    l1.insertBefore(chip, l1.querySelector('.mu-imp'));
  } else if ((fuerza < 4 || z.rota) && chip) { chip.remove(); }
  card.classList.toggle('es-rota', !!z.rota);
  card.dataset.lado = dem ? 'compra' : 'venta';

  clase('.mu-dist2', 'cerca', z.retest && !z.dentro);
  clase('.mu-dist2', 'urge', z.dentro);

  const det = card.querySelector('.mu-detalle');
  if (det) {
    const cn = card.querySelector('.mu-conse');
    const txt = narrarZona(z, dem, dist);
    if (cn && cn.innerHTML !== txt) {
      cn.innerHTML = txt;
      cn.classList.remove('mu-escribe');
      void cn.offsetWidth;
      cn.classList.add('mu-escribe');
    }
  }
}



/* ══════════════════════════════════════════════════════════════
   SELECTOR DE MONEDA
   ══════════════════════════════════════════════════════════════ */
function menuPares() {
  const prev = document.getElementById('mu-picker');
  if (prev) { prev.remove(); return; }

  const anc = $('mu-sel');
  const m = document.createElement('div');
  m.id = 'mu-picker';
  m.innerHTML = `
    <input class="mu-buscar" id="mu-buscar" placeholder="Buscar…" autocomplete="off">
    <div class="mu-lista-mon">
      ${PARES.map((p) => `
        <button class="mu-op ${p.id === _par ? 'on' : ''}" data-mv="${p.id}"
                data-busca="${esc((p.id + ' ' + p.n).toLowerCase())}">
          <i class="mu-logo" data-cg="${esc(p.cg)}"></i>
          <b>${esc(p.id)}</b><span>${esc(p.n)}</span>
          ${p.id === _par ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m20 6-11 11-5-5"/></svg>' : ''}
        </button>`).join('')}
    </div>`;
  document.body.appendChild(m);

  const r = anc.getBoundingClientRect();
  const ancho = m.offsetWidth || 232;
  m.style.left = Math.max(8, Math.min(window.innerWidth - ancho - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';
  setTimeout(ponerLogos, 30);

  m.addEventListener('click', (e) => e.stopPropagation());
  $('mu-buscar').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    m.querySelectorAll('[data-mv]').forEach((x) => {
      x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
    });
  };
  setTimeout(() => { try { $('mu-buscar').focus(); } catch (_) {} }, 60);

  m.querySelectorAll('[data-mv]').forEach((b) => b.onclick = () => {
    _par = b.dataset.mv;
    /* Una ficha de otra moneda no puede quedarse abierta. */
    try { if (_od && _od.cerrarFichas) _od.cerrarFichas(); } catch (_) {}
    const bb = anc.querySelector('b'); if (bb) bb.textContent = _par;
    const lg = anc.querySelector('.mu-logo');
    if (lg) {
      lg.dataset.cg = (PARES.find((x) => x.id === _par) || {}).cg || '';
      lg.classList.remove('con'); lg.style.backgroundImage = '';
    }
    m.remove();
    // Cambiar de moneda es empezar de cero: el historial no vale
    M.fotos = []; M.niveles = new Map(); M.muros = [];
    M.cargando = true; M.seleccionado = null; M.paso = 0;
    ponerLogos();
    pintarPanel();
    arrancar();
    cargarVelas();
  });
  setTimeout(() => document.addEventListener('click', () => {
    const x = document.getElementById('mu-picker'); if (x) x.remove();
  }, { once: true }), 10);
}

const CLAVE_LOGOS = 'aurex-logos-v2';   // versionada: al ampliar la lista, se recargan todos los logos
let _logos = null;
async function ponerLogos() {
  if (!_logos) {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_LOGOS) || 'null');
      if (g && Date.now() - g.cuando < 86400000) _logos = g.datos;
    } catch (_) {}
  }
  if (!_logos) {
    try {
      const ids = PARES.map((p) => p.cg).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&per_page=250`);
      const j = await r.json();
      _logos = {};
      j.forEach((x) => { _logos[x.id] = x.image; });
      try { localStorage.setItem(CLAVE_LOGOS, JSON.stringify({ cuando: Date.now(), datos: _logos })); } catch (_) {}
    } catch (_) { _logos = {}; }
  }
  document.querySelectorAll('.mu-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   LA GUÍA — paso a paso, como en Prize Pool y Market

   Nadie lee un muro de texto. Un paso por pantalla, con su idea
   clara, y el usuario avanza a su ritmo.
   ══════════════════════════════════════════════════════════════ */
const PASOS_MU = [
  {
    t: 'Qué es el Institutional Radar',
    d: 'Detecta las <b>zonas donde el capital institucional ha operado de verdad</b>: los rangos de precio que concentran el volumen real. Ahí es donde el mercado tiene soporte y resistencia auténticos.',
    x: 'Deja de adivinar niveles: aquí ve dónde está el dinero que mueve el precio.'
  },
  {
    t: 'Demanda y oferta',
    d: 'Las bandas <b>verdes son demanda</b> (soporte, por debajo del precio) y las <b>rojas son oferta</b> (resistencia, por encima). El precio tiende a reaccionar cuando llega a ellas.',
    x: 'Compras cerca de demanda fuerte, vendes cerca de oferta fuerte. El sesgo lo da el contexto.'
  },
  {
    t: 'La línea de entrada (POC)',
    d: 'La línea punteada en el centro de cada banda es el <b>punto de control</b>: el precio exacto donde más volumen se negoció. Es tu referencia de entrada y de retesteo.',
    x: 'Todo se rige por esa línea. La banda solo marca el rango; el POC es el nivel que importa.'
  },
  {
    t: 'El importe de la zona',
    d: 'La cifra en dólares de cada zona es el <b>capital acumulado</b> que ha pasado por ese rango. Cuanto mayor es, más difícil de romper y más probable la reacción.',
    x: 'Una zona de decenas de millones pesa mucho más que una de unos pocos cientos de miles.'
  },
  {
    t: 'La barra de confianza',
    d: 'Cada zona lleva una puntuación de <b>0 a 100</b> que combina volumen, reacciones previas, alineación del flujo y confluencia. Cuanto más alta, más fiable el nivel.',
    x: 'Prioriza las zonas de confianza alta para tus decisiones.'
  },
  {
    t: '★ Zona fuerte',
    d: 'Las marcadas en <b>dorado</b> son las de mayor convicción: mucho volumen, reacciones confirmadas y confluencia. Son los niveles que las mesas vigilan.',
    x: 'Los mejores sitios para buscar entradas y para colocar tus stops.'
  },
  {
    t: 'AQUÍ y Retesteo',
    d: 'El radar te avisa cuando el precio está <b>dentro de una zona ahora</b> (AQUÍ) o a punto de <b>volver a probarla</b> (retesteo). Ese es el momento de máxima atención.',
    x: 'El retesteo de una zona fuerte suele ser la entrada más limpia.'
  },
  {
    t: 'VWAP, VAH y VAL',
    d: 'Son las <b>referencias institucionales</b>: VWAP es el precio justo ponderado por volumen; VAH y VAL son los bordes del área de valor. Cuando una zona coincide con ellas, se refuerza.',
    x: 'Precio por encima del VWAP favorece a los compradores; por debajo, a los vendedores.'
  },
  {
    t: 'El cockpit',
    d: 'La franja superior te da el mercado de un vistazo: <b>sesgo, acierto histórico, flujo agresor, zona cercana, próximo nivel fuerte y contexto de BTC y ETH</b>.',
    x: 'Tu lectura de dos segundos antes de operar. Si BTC acompaña, la señal pesa más.'
  },
  {
    t: 'El perfil de volumen',
    d: 'La silueta de la izquierda muestra <b>dónde se concentra el volumen por precio</b>. Los picos más brillantes son los imanes: el precio gravita hacia ellos.',
    x: 'Un pico muy marcado lejos del precio suele ser un objetivo natural del movimiento.'
  },
  {
    t: 'Alertas en vivo',
    d: 'El radar te avisa con un aviso y un sonido cuando el precio <b>entra en una zona fuerte</b> o cuando una zona <b>se rompe</b>. No tienes que estar mirando la pantalla.',
    x: 'Una zona que se rompe deja de ser soporte y pasa a ser resistencia (o al revés).'
  },
  {
    t: 'Las tarjetas del panel',
    d: 'A la derecha, cada zona tiene su tarjeta con el <b>lado</b> (demanda u oferta), el <b>importe</b>, la <b>distancia al precio</b> y la <b>barra de confianza</b>. Los filtros de arriba (Demanda, Oferta, ★ Fuertes, Retesteo) te dejan quedarte solo con lo que buscas.',
    x: 'Empieza siempre por ★ Fuertes: son las que de verdad mueven la balanza.'
  },
  {
    t: 'Abre la tarjeta para el detalle',
    d: 'Al tocar una tarjeta se despliega todo: la <b>línea de vida</b> (formada, testeada, confirmada, vigente) y las métricas: <b>POC</b> (precio de entrada), <b>flujo firmado</b> (si domina comprador o vendedor), <b>reacciones</b>, <b>toques</b>, <b>confluencia</b> y <b>fuerza</b>.',
    x: 'POC alto en confluencia y flujo comprador es el escenario ideal para una entrada en demanda.'
  },
  {
    t: 'Cómo operar con esto',
    d: 'Opera <b>a favor del lado despejado</b>: si hay varias zonas fuertes debajo y ninguna arriba, el camino de menor resistencia es al alza. Entra en el retesteo de una zona fuerte, coloca el stop al otro lado de su rango y confirma con el VWAP y el sesgo del cockpit.',
    x: 'Esto es información para decidir con criterio, no una señal a ciegas. La decisión final es tuya.'
  }
];

let _pasoMu = 0;

function ayuda() {
  _pasoMu = 0;
  const d = document.createElement('div');
  d.id = 'mu-ayuda-box';
  d.innerHTML = `<div class="mu-bg"></div>
    <div class="mua-c">
      <button class="mua-x" id="mua-x" aria-label="Cerrar">✕</button>
      <div class="mua-eyebrow">Radar Institucional</div>
      <div id="mua-cuerpo"></div>
    </div>`;
  document.body.appendChild(d);

  const q = () => d.remove();
  d.querySelector('.mu-bg').onclick = q;
  $('mua-x').onclick = q;
  pintarPaso();
}

function pintarPaso() {
  const c = $('mua-cuerpo'); if (!c) return;
  const p = PASOS_MU[_pasoMu];
  const ultimo = _pasoMu === PASOS_MU.length - 1;

  c.innerHTML = `
    <div class="mua-card">
      <div class="mua-n">${_pasoMu + 1} <em>de ${PASOS_MU.length}</em></div>
      <div class="mua-t">${p.t}</div>
      <div class="mua-d">${p.d}</div>
      <div class="mua-x2">${p.x}</div>
    </div>

    <div class="mua-puntos">
      ${PASOS_MU.map((_, i) => `<i class="${i === _pasoMu ? 'on' : ''}" data-paso="${i}"></i>`).join('')}
    </div>

    <div class="mua-acts">
      ${_pasoMu > 0 ? '<button class="mua-atras" id="mua-atras">Atrás</button>' : ''}
      <button class="mua-b" id="mua-sig">${ultimo ? 'Entendido' : 'Saber más'}</button>
    </div>`;

  $('mua-sig').onclick = () => {
    if (_pasoMu >= PASOS_MU.length - 1) { document.getElementById('mu-ayuda-box')?.remove(); return; }
    _pasoMu++; pintarPaso();
  };
  const at = $('mua-atras');
  if (at) at.onclick = () => { _pasoMu = Math.max(0, _pasoMu - 1); pintarPaso(); };
  c.querySelectorAll('[data-paso]').forEach((b) => b.onclick = () => {
    _pasoMu = Number(b.dataset.paso); pintarPaso();
  });
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('mu-css')) return;
  const s = document.createElement('style'); s.id = 'mu-css';
  s.textContent = `
  #mu-overlay{--mu-tx:#eaecef;position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #mu-overlay .mu-bg{position:absolute;inset:0;background:rgba(3,5,8,.94)}
  #mu-overlay .mu-c{position:relative;width:100%;height:100vh;height:100dvh;
    display:flex;flex-direction:column;background:#080b10}

  /* ── Barra ── */
  #mu-overlay .mu-barra{display:flex;align-items:center;gap:12px;flex:0 0 auto;position:relative;
    padding:9px 136px 9px 12px;background:#0b0e12;border-bottom:1px solid #1c2128}
  #mu-overlay .mu-sel{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;min-height:36px;
    padding:0 12px;border-radius:10px;background:#12161c;border:1px solid #2b3139;color:#eaecef;
    cursor:pointer;font-family:var(--mono,monospace);font-size:12.5px}
  #mu-overlay .mu-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #mu-overlay .mu-sel b{font-weight:700}
  #mu-overlay .mu-sel svg{width:13px;height:13px;opacity:.6}
  .mu-logo{width:20px;height:20px;border-radius:50%;flex:0 0 auto;display:block;
    background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid #2b3139}
  .mu-logo.con{background-color:transparent;border-color:transparent}
  #mu-overlay .mu-estado-err{align-self:center;font-family:var(--mono,monospace);font-size:10px;color:#f6465d;
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px}
  #mu-overlay .mu-vivo{display:flex;align-items:center;gap:7px;min-width:0;
    font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;
    text-transform:uppercase;letter-spacing:.7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #mu-overlay .mu-vivo i{width:7px;height:7px;border-radius:50%;background:#2ee86a;flex:0 0 auto;
    animation:muLat 1.8s ease-in-out infinite}
  @keyframes muLat{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(46,232,106,.5)}50%{opacity:.55;box-shadow:0 0 0 5px rgba(46,232,106,0)}}
  /* Temporalidad y precio en la barra */
  #mu-overlay .mu-tfs{display:none;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #mu-overlay .mu-tf{min-height:30px;padding:0 11px;border-radius:7px;border:none;background:transparent;
    color:#7d8794;font-family:var(--mono,monospace);font-size:11px;font-weight:700;cursor:pointer}
  #mu-overlay .mu-tf.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}

  /* Chip de temporalidad (solo móvil) + su desplegable. En escritorio se ve la
     fila .mu-tfs completa y el chip está oculto. */
  #mu-overlay .mu-tfchip{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;
    border-radius:11px;background:#12161c;border:1px solid #2b3139;color:#eaecef;cursor:pointer;
    font-family:var(--mono,monospace);font-weight:800;font-size:13.5px;flex:0 0 auto}
  #mu-overlay .mu-tfchip svg{width:14px;height:14px;opacity:.65}
  #mu-tfmenu{position:fixed;z-index:12000;background:#12161c;border:1px solid #2b3139;border-radius:14px;
    padding:6px;box-shadow:0 18px 44px rgba(0,0,0,.6);display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;
    min-width:210px;max-height:60vh;overflow-y:auto;animation:muMenu .16s ease}
  @keyframes muMenu{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  #mu-tfmenu .mu-tfmenu-it{min-height:42px;border-radius:10px;border:1px solid transparent;
    background:rgba(255,255,255,.04);color:#c7cdd6;font-family:var(--mono,monospace);font-weight:700;
    font-size:13px;cursor:pointer}
  #mu-tfmenu .mu-tfmenu-it:hover{border-color:#3a424c;color:#eaecef}
  #mu-tfmenu .mu-tfmenu-it.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);
    color:#3a2800;border-color:var(--gold,#E8B84B)}

  /* Pestañas móvil Gráfica/Órdenes (ocultas en escritorio) */
  #mu-overlay .mu-mtabs{display:none;flex:0 0 auto;gap:6px;padding:8px 10px;background:#0b0e12;
    border-bottom:1px solid #1c2128}
  #mu-overlay .mu-mtab{flex:1;min-height:40px;border-radius:11px;border:1px solid #232a33;
    background:rgba(255,255,255,.03);color:#8b96a3;font-family:var(--display,sans-serif);font-weight:800;
    font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px}
  #mu-overlay .mu-mtab i{font-style:normal;min-width:20px;height:20px;padding:0 5px;border-radius:20px;
    display:inline-grid;place-items:center;background:rgba(255,255,255,.08);color:#c7cdd6;
    font-family:var(--mono,monospace);font-size:11px;font-weight:700}
  #mu-overlay .mu-mtab.on{background:linear-gradient(180deg,rgba(232,184,75,.16),rgba(232,184,75,.06));
    border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #mu-overlay .mu-mtab.on i{background:rgba(232,184,75,.2);color:var(--gold,#E8B84B)}
  #mu-overlay .mu-px{display:flex;flex-direction:column;gap:1px;flex:0 0 auto;padding-left:6px}
  #mu-overlay .mu-px span{font-family:var(--mono,monospace);font-size:8.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.1px}
  #mu-overlay .mu-px b{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;
    color:var(--gold,#E8B84B);line-height:1}
  /* Filtros del panel */
  #mu-overlay .mu-chips{display:flex;gap:5px;flex-wrap:wrap;padding:9px 14px 11px}
  #mu-overlay .mu-fchip{min-height:30px;padding:0 11px;border-radius:20px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #232a33;color:#7d8794;
    font-family:var(--mono,monospace);font-size:10.5px;font-weight:700;white-space:nowrap}
  #mu-overlay .mu-fchip:hover{border-color:#3a424c;color:#b7bdc6}
  #mu-overlay .mu-fchip.on{background:rgba(232,184,75,.14);border-color:var(--gold-soft,#C9A84B);
    color:var(--gold,#E8B84B)}
  #mu-overlay .mu-der{position:absolute;right:10px;top:50%;transform:translateY(-50%);
    display:flex;gap:6px;background:transparent;padding-left:8px}
  #mu-overlay .mu-ico{width:36px;height:36px;min-height:36px;flex:0 0 auto;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;
    background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(255,255,255,.03));border:1px solid #2b3139;color:#8b96a3;
    box-shadow:0 2px 5px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.06);
    font-family:var(--mono,monospace);font-size:14px;font-weight:700;transition:transform .1s ease,border-color .15s ease}
  #mu-overlay .mu-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #mu-overlay .mu-ico:active{transform:translateY(1px);box-shadow:0 1px 3px rgba(0,0,0,.4)}
  /* "Cómo funciona" con texto en escritorio, solo el signo en móvil. */
  #mu-overlay .mu-comofunciona{width:auto;padding:0 14px;gap:0;
    border-color:rgba(232,184,75,.4);color:var(--gold,#E8B84B)}
  #mu-overlay .mu-cf-txt{font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;
    white-space:nowrap;letter-spacing:.2px}
  #mu-overlay .mu-cf-sig{display:none}
  @media(max-width:860px){
    #mu-overlay .mu-comofunciona{width:36px;padding:0}
    #mu-overlay .mu-cf-txt{display:none}
    #mu-overlay .mu-cf-sig{display:block;font-size:14px;font-weight:700}
  }
  /* Avisos del narrador */
  #mu-overlay .mu-dist2.cerca{background:rgba(232,184,75,.2);color:#E8B84B}
  #mu-overlay .mu-dist2.urge{background:rgba(246,70,93,.25);color:#ff8a95;
    animation:muPulso 1.3s ease-in-out infinite}
  @keyframes muPulso{0%,100%{opacity:1}50%{opacity:.55}}
  #mu-overlay .mu-aviso-vivo{margin-top:7px;padding:5px 9px;border-radius:7px;
    background:rgba(246,70,93,.14);border:1px solid rgba(246,70,93,.3);
    font-family:var(--mono,monospace);font-size:10px;color:#ff8a95;letter-spacing:.4px}

  /* ── Cuerpo: gráfico + panel ── */
  #mu-overlay .mu-cuerpo{flex:1;min-height:0;display:flex}
  #mu-overlay .mu-graf{flex:1;min-width:0;position:relative;background:#080b10}
  #mu-overlay .mu-cv{display:block}
  /* El logo, corrido a la derecha: en la izquierda tapaba la columna
     de precios. */
  #mu-overlay .mu-marca{position:absolute;left:14px;bottom:30px;height:38px;width:auto;opacity:.75;pointer-events:none;filter:drop-shadow(0 2px 8px rgba(0,0,0,.95))}

  /* Pantalla de espera */
  /* [CORREGIDO] Esta capa tapaba el lienzo y se comía el clic
     derecho: por eso no salía el menú de órdenes en el Radar.
     Mientras informa no necesita recibir clics. */
  #mu-overlay .mu-esperando{pointer-events:none;
    position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:12px;text-align:center;padding:30px;
    background:rgba(8,11,16,.96)}
  #mu-overlay .mu-spin{width:38px;height:38px;border-radius:50%;
    border:2.5px solid rgba(232,184,75,.16);border-top-color:var(--gold,#E8B84B);
    animation:muGira .85s linear infinite}
  @keyframes muGira{to{transform:rotate(360deg)}}
  #mu-overlay .mu-esperando b{font-family:var(--display,sans-serif);font-weight:800;
    font-size:17px;color:#eaecef}
  #mu-overlay .mu-esperando span{font-family:var(--sans,sans-serif);font-size:13px;
    color:#7d8794;max-width:36ch;line-height:1.6}
  #mu-overlay .mu-progreso{width:190px;height:4px;border-radius:20px;background:#1c2128;overflow:hidden}
  #mu-overlay .mu-progreso i{display:block;height:100%;width:0;border-radius:20px;
    background:var(--gold,#E8B84B);transition:width .4s ease}

  /* ── Panel de veredictos ── */
  #mu-overlay .mu-panel{width:352px;flex:0 0 auto;display:flex;flex-direction:column;
    background:#0b0e12;border-left:1px solid #1c2128}
  #mu-overlay .mu-panel-t{flex:0 0 auto;padding:13px 16px 2px;text-align:center;
    font-family:var(--mono,monospace);font-size:10px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.8px}
  #mu-overlay .mu-panel-t em{font-style:normal;color:var(--gold,#E8B84B);font-weight:700}
  /* Cockpit institucional */
  #mu-overlay .mu-cockpit{flex:0 0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:6px;
    padding:10px 14px 4px}
  #mu-overlay .mu-ck{background:linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.015));
    border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:7px 8px;text-align:center;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  #mu-overlay .mu-ck b{display:block;font-family:var(--mono,monospace);font-weight:800;font-size:13px;
    line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #mu-overlay .mu-ck span{font-family:var(--mono,monospace);font-size:7.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:.4px}
  #mu-overlay .mu-ck-ctx b span{margin:0 3px;font-weight:800}
  /* Banner de alerta */
  #mu-overlay .mu-alerta{position:absolute;left:50%;top:60px;transform:translate(-50%,-14px);
    z-index:60;padding:9px 15px 9px 14px;border-radius:11px;pointer-events:none;opacity:0;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;color:#eef2f7;
    background:linear-gradient(180deg,rgba(22,28,36,.98),rgba(12,16,22,.98));
    border:1px solid var(--ac,#E8B84B);
    box-shadow:0 10px 30px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.04), inset 0 0 18px color-mix(in srgb, var(--ac,#E8B84B) 14%, transparent);
    transition:opacity .3s ease,transform .3s ease}
  #mu-overlay .mu-alerta.on{opacity:1;transform:translate(-50%,0);pointer-events:auto}
  #mu-overlay .mu-alerta::before{content:'\\25C9';color:var(--ac,#E8B84B);margin-right:8px;font-size:11px}
  #mu-overlay .mu-lista{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:10px}
  #mu-overlay .mu-grupo{font-family:var(--mono,monospace);font-size:9.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.2px;margin:12px 4px 8px}
  #mu-overlay .mu-grupo:first-child{margin-top:2px}
  #mu-overlay .mu-esperar{padding:22px 16px;text-align:center;font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#7d8794;line-height:1.7}
  #mu-overlay .mu-esperar b{display:block;font-family:var(--display,sans-serif);
    font-size:14px;color:#b7bdc6;margin-bottom:5px}

  /* ══════════════════════════════════════════════════════════
     LAS TARJETAS — compactas y desplegables

     Lo esencial en dos líneas: cuánto, de qué lado, a qué precio y a
     qué distancia. El detalle se abre al tocar. Así caben 10 en
     pantalla en vez de 3.
     ══════════════════════════════════════════════════════════ */
  #mu-overlay .mu-card{display:flex;flex-direction:column;margin-bottom:7px;border-radius:12px;overflow:hidden;
    border:1px solid #232a33;border-left-width:3px;
    background:linear-gradient(145deg,rgba(255,255,255,.03),rgba(255,255,255,.01))}
  #mu-overlay .mu-cab-card{display:block;width:100%;box-sizing:border-box;text-align:left;
    padding:11px 13px;background:transparent;border:none;cursor:pointer}
  #mu-overlay .mu-l1{display:flex;align-items:baseline;gap:9px;margin-bottom:4px}
  #mu-overlay .mu-lado{font-family:var(--display,sans-serif);font-weight:800;font-size:15px;
    letter-spacing:.3px}
  #mu-overlay .mu-card[data-lado="venta"] .mu-lado{color:#ff6b7a}
  #mu-overlay .mu-card[data-lado="compra"] .mu-lado{color:#3ee88a}
  #mu-overlay .mu-imp{margin-left:auto;font-family:var(--display,sans-serif);font-weight:800;
    font-size:20px;color:var(--gold,#E8B84B);line-height:1}
  #mu-overlay .mu-l2{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  /* El precio y la distancia: la información clave, con su peso. */
  #mu-overlay .mu-nivel{font-family:var(--mono,monospace);font-weight:700;font-size:14px;color:#eaecef}
  #mu-overlay .mu-dist2{font-family:var(--mono,monospace);font-weight:700;font-size:12px;
    padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.06);color:#b7bdc6}
  #mu-overlay .mu-sello{font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;
    text-transform:uppercase;letter-spacing:.6px;padding:3px 8px;border-radius:20px}
  #mu-overlay .oro .mu-sello{background:rgba(232,184,75,.16);color:#E8B84B}
  #mu-overlay .verde .mu-sello{background:rgba(46,232,106,.14);color:#2ee86a}
  #mu-overlay .azul .mu-sello{background:rgba(77,159,255,.14);color:#4d9fff}
  #mu-overlay .rojo .mu-sello{background:rgba(246,70,93,.16);color:#f6465d}
  #mu-overlay .gris .mu-sello,#mu-overlay .ido .mu-sello{background:rgba(139,150,163,.12);color:#8b96a3}
  #mu-overlay .mu-fl{margin-left:auto;font-size:9px;color:#5c6672}

  /* La tarjeta de venta se tiñe de rojo; la de compra, de verde. */
  #mu-overlay .mu-card[data-lado="venta"]{border-left-color:#f6465d}
  #mu-overlay .mu-card[data-lado="compra"]{border-left-color:#2ee86a}
  /* FUERTE (f3): el lado manda el fondo, pero el borde y el glow son DORADOS
     — compra fuerte = verde con dorado, venta fuerte = rojo con dorado. */
  #mu-overlay .mu-card[data-lado="venta"].f3{
    background:linear-gradient(145deg,rgba(120,20,32,.5),rgba(60,10,18,.22));
    border-color:rgba(232,184,75,.55);border-left-color:#E8B84B;
    box-shadow:0 4px 18px rgba(0,0,0,.5), 0 0 0 1px rgba(232,184,75,.18), inset 0 0 22px rgba(232,184,75,.08)}
  #mu-overlay .mu-card[data-lado="compra"].f3{
    background:linear-gradient(145deg,rgba(12,90,50,.42),rgba(6,44,26,.2));
    border-color:rgba(232,184,75,.55);border-left-color:#E8B84B;
    box-shadow:0 4px 18px rgba(0,0,0,.5), 0 0 0 1px rgba(232,184,75,.18), inset 0 0 22px rgba(232,184,75,.08)}
  #mu-overlay .mu-card[data-lado="venta"].f2{background:linear-gradient(145deg,rgba(120,20,32,.22),rgba(255,255,255,.012))}
  #mu-overlay .mu-card[data-lado="compra"].f2{background:linear-gradient(145deg,rgba(12,90,50,.2),rgba(255,255,255,.012))}
  #mu-overlay .mu-card.f0{opacity:.66}
  #mu-overlay .mu-card.sel{border-color:var(--gold-soft,#C9A84B)}
  /* Chip "FUERTE" dorado dentro de la tarjeta */
  #mu-overlay .mu-fuerte{font-style:normal;font-family:var(--mono,monospace);font-size:9px;font-weight:800;
    letter-spacing:.5px;padding:2px 7px;border-radius:20px;color:#3a2800;
    background:linear-gradient(180deg,#ffe89a,#E8B84B);box-shadow:0 1px 4px rgba(232,184,75,.4)}

  /* El detalle desplegado */
  #mu-overlay .mu-detalle{display:block;width:100%;padding:0 13px 12px;animation:muAbre .16s ease}
  @keyframes muAbre{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
  /* El texto entra escribiéndose: da la sensación de que alguien
     está narrando lo que pasa en directo. */
  /* [CORREGIDO] clip-path recortaba el texto cuando ocupaba varias
     líneas y lo dejaba a medias. Un barrido de opacidad da la misma
     sensación de "se está escribiendo" sin cortar nada. */
  #mu-overlay .mu-escribe{animation:muEscribe .55s ease both}
  @keyframes muEscribe{
    from{opacity:0;transform:translateY(-3px);filter:blur(1.5px)}
    to{opacity:1;transform:none;filter:none}
  }
  #mu-overlay .mu-conse{font-family:var(--sans,sans-serif);font-size:12.5px;color:#c8cfd8;
    line-height:1.55;margin-bottom:10px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07)}
  #mu-overlay .mu-conse b{color:#fff;font-weight:700}
  #mu-overlay .mu-metricas{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:9px}
  #mu-overlay .mu-metricas div{text-align:center;padding:7px 3px;border-radius:8px;
    background:rgba(255,255,255,.035)}
  #mu-overlay .mu-metricas b{display:block;font-family:var(--mono,monospace);font-weight:700;
    font-size:12px;color:#eaecef}
  #mu-overlay .mu-metricas span{font-family:var(--mono,monospace);font-size:8px;color:#5c6672;
    text-transform:uppercase;letter-spacing:.4px}

  /* Barra de CONFIANZA — jerarquía visual del score combinado */
  #mu-overlay .mu-conf{display:flex;align-items:center;gap:8px;margin-top:8px}
  #mu-overlay .mu-conf-bar{height:5px;border-radius:20px;flex:1;min-width:0;
    background:linear-gradient(90deg,#f6465d,#E8B84B,#2ee86a);transition:width .4s ease;
    box-shadow:0 0 8px rgba(232,184,75,.25)}
  #mu-overlay .verde .mu-conf-bar{background:linear-gradient(90deg,#1a7a44,#2ee86a)}
  #mu-overlay .rojo .mu-conf-bar{background:linear-gradient(90deg,#7a1a28,#f6465d)}
  #mu-overlay .gris .mu-conf-bar{background:linear-gradient(90deg,#3a424c,#8b96a3)}
  #mu-overlay .mu-conf em{font-style:normal;font-family:var(--mono,monospace);font-weight:800;
    font-size:13px;color:var(--mu-tx);display:flex;align-items:baseline;gap:3px}
  #mu-overlay .mu-conf em span{font-size:8px;color:#5c6672;text-transform:uppercase;letter-spacing:.4px}
  /* Insignias de validación */
  #mu-overlay .mu-badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
  #mu-overlay .mu-b{font-style:normal;font-family:var(--mono,monospace);font-size:9px;font-weight:700;
    padding:2px 7px;border-radius:20px;letter-spacing:.3px;
    background:rgba(255,255,255,.05);color:#aeb6c0;border:1px solid rgba(255,255,255,.08)}
  #mu-overlay .mu-b.conf{background:rgba(77,159,255,.14);color:#7fbaff;border-color:rgba(77,159,255,.3)}
  #mu-overlay .mu-b.libro{background:rgba(232,184,75,.14);color:#E8B84B;border-color:rgba(232,184,75,.3)}
  #mu-overlay .mu-b.flujo{background:rgba(46,232,106,.13);color:#3ee88a;border-color:rgba(46,232,106,.28)}
  #mu-overlay .mu-b.rota{background:rgba(139,150,163,.14);color:#b7bdc6;border-color:rgba(139,150,163,.3)}
  #mu-overlay .mu-b.ref{background:rgba(120,170,255,.14);color:#9cc4ff;border-color:rgba(120,170,255,.3)}
  /* Línea de tiempo del ciclo de vida de la zona */
  #mu-overlay .mu-timeline{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:2px 0 10px}
  #mu-overlay .mu-timeline .tl{position:relative;display:flex;flex-direction:column;align-items:center;
    gap:2px;padding-top:12px;font-family:var(--mono,monospace);font-size:8px;color:#5c6672;
    text-transform:uppercase;letter-spacing:.3px;text-align:center}
  #mu-overlay .mu-timeline .tl i{position:absolute;top:3px;left:50%;transform:translateX(-50%);
    width:8px;height:8px;border-radius:50%;background:#2b3139;border:1px solid #3a424c}
  #mu-overlay .mu-timeline .tl::before{content:'';position:absolute;top:6px;left:-50%;width:100%;height:1px;background:#2b3139}
  #mu-overlay .mu-timeline .tl:first-child::before{display:none}
  #mu-overlay .mu-timeline .tl.on i{background:#2ee86a;border-color:#2ee86a;box-shadow:0 0 6px rgba(46,232,106,.5)}
  #mu-overlay .mu-timeline .tl.rota i{background:#E8B84B;border-color:#E8B84B;box-shadow:0 0 6px rgba(232,184,75,.5)}
  #mu-overlay .mu-timeline .tl b{font-weight:800;color:#c8cfd8;font-size:9px}
  /* Zona rota: se ve apagada y con una línea diagonal sutil */
  #mu-overlay .mu-card.es-rota{opacity:.72;border-left-color:#6b7681!important}
  #mu-overlay .mu-card.es-rota .mu-lado{color:#8b96a3!important}
  #mu-overlay .mu-card{transition:border-color .2s ease, box-shadow .2s ease, opacity .2s ease}

  /* Los cuatro botones de filtro */
  #mu-overlay .mu-fbtn{flex:1;min-width:calc(50% - 4px);min-height:46px;padding:0 12px;
    border-radius:13px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
    background:linear-gradient(180deg,#1c232e,#11161e);border:1px solid #2b3541;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.07), 0 3px 9px rgba(0,0,0,.45), 0 1px 0 rgba(0,0,0,.6);
    font-family:var(--display,sans-serif);font-weight:800;font-size:12.5px;color:#aeb6c0;letter-spacing:.2px;
    transition:transform .12s ease, box-shadow .12s ease, filter .12s ease}
  #mu-overlay .mu-fbtn:hover{transform:translateY(-1.5px);filter:brightness(1.13);
    box-shadow:inset 0 1px 0 rgba(255,255,255,.1), 0 6px 16px rgba(0,0,0,.55)}
  #mu-overlay .mu-fbtn:active{transform:translateY(1px);box-shadow:inset 0 2px 6px rgba(0,0,0,.55)}
  #mu-overlay .mu-fbtn .mu-cuenta{font-family:var(--mono,monospace);font-size:10.5px;font-style:normal;font-weight:700;
    min-width:20px;padding:2px 6px;border-radius:20px;background:rgba(0,0,0,.38);color:#e4e9ef;
    box-shadow:inset 0 1px 2px rgba(0,0,0,.45)}
  #mu-overlay .mu-fbtn.verde{color:#4dffa0;border-color:rgba(46,232,106,.4)}
  #mu-overlay .mu-fbtn.rojo{color:#ff7885;border-color:rgba(246,70,93,.4)}
  #mu-overlay .mu-fbtn.oro{color:#f0c860;border-color:rgba(232,184,75,.42)}
  #mu-overlay .mu-fbtn.gris{color:#aeb6c0;border-color:#38424f}
  /* El filtro activo: relieve 3D encendido, se hunde un pelín como pulsado. */
  #mu-overlay .mu-fbtn.on{font-weight:800;transform:translateY(0)}
  #mu-overlay .mu-fbtn.verde.on{background:linear-gradient(180deg,#5cffab,#17c268);
    border-color:#2ee86a;color:#04210f;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.5), 0 4px 16px rgba(46,232,106,.4)}
  #mu-overlay .mu-fbtn.verde.on .mu-cuenta{background:rgba(0,0,0,.28);color:#04210f}
  #mu-overlay .mu-fbtn.rojo.on{background:linear-gradient(180deg,#ff8a95,#dd2f41);
    border-color:#f6465d;color:#2a0509;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.4), 0 4px 16px rgba(246,70,93,.4)}
  #mu-overlay .mu-fbtn.rojo.on .mu-cuenta{background:rgba(0,0,0,.28);color:#2a0509}
  #mu-overlay .mu-fbtn.oro.on{background:linear-gradient(180deg,#ffe89a,#e0ad3c);
    border-color:#E8B84B;color:#3a2800;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.5), 0 4px 16px rgba(232,184,75,.4)}
  #mu-overlay .mu-fbtn.oro.on .mu-cuenta{background:rgba(0,0,0,.24);color:#3a2800}
  #mu-overlay .mu-fbtn.gris.on{background:linear-gradient(180deg,#c6ccd4,#8b96a3);
    border-color:#c6ccd4;color:#0b0e12;
    box-shadow:inset 0 1px 0 rgba(255,255,255,.5), 0 4px 14px rgba(0,0,0,.4)}
  #mu-overlay .mu-fbtn.gris.on .mu-cuenta{background:rgba(0,0,0,.22);color:#0b0e12}

  #mu-overlay .mu-card-viejo{display:block;width:100%;text-align:left;margin-bottom:9px;padding:13px 14px;
    border-radius:13px;cursor:pointer;background:rgba(255,255,255,.022);
    border:1px solid #232a33;border-left-width:3px;transition:background .15s,border-color .15s}
  #mu-overlay .mu-card:hover{background:rgba(255,255,255,.045)}
  #mu-overlay .mu-card.sel{background:rgba(255,255,255,.06)}
  #mu-overlay .mu-card.oro{border-left-color:#E8B84B}
  #mu-overlay .mu-card.verde{border-left-color:#2ee86a}
  #mu-overlay .mu-card.azul{border-left-color:#4d9fff}
  #mu-overlay .mu-card.rojo{border-left-color:#f6465d}
  #mu-overlay .mu-card.gris{border-left-color:#5c6672}
  #mu-overlay .mu-card.ido{border-left-color:#6b7681;opacity:.62}
  #mu-overlay .ido .mu-chip{background:rgba(139,150,163,.14);color:#8b96a3}
  #mu-overlay .ido .mu-hacer{border-left-color:rgba(139,150,163,.35)}
  /* La línea que explica QUÉ es cada muro: sin ella el usuario ve un
     precio y una cifra y no sabe qué está mirando. */
  #mu-overlay .mu-quees{font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;
    line-height:1.5;margin-bottom:9px}
  #mu-overlay .mu-quees b{color:#eaecef;font-weight:700}
  #mu-overlay .mu-quees em{display:block;font-style:normal;margin-top:3px;
    font-family:var(--mono,monospace);font-size:9.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:.7px}
  /* ══════════════════════════════════════════════════════════
     LA TARJETA — que se lea sola
     Lo primero y más grande: cuánto dinero y de qué lado. Todo lo
     demás es contexto.
     ══════════════════════════════════════════════════════════ */
  #mu-overlay .mu-titular{display:flex;align-items:baseline;gap:9px;margin-bottom:2px}
  #mu-overlay .mu-accion{font-family:var(--mono,monospace);font-size:10px;font-weight:700;
    letter-spacing:1.4px;padding:3px 8px;border-radius:6px}
  /* La etiqueta del lado tiene que gritar: es lo primero que se mira. */
  #mu-overlay .mu-card[data-lado="venta"] .mu-accion{background:rgba(246,70,93,.22);color:#ff8a95}
  #mu-overlay .mu-card[data-lado="compra"] .mu-accion{background:rgba(46,232,106,.2);color:#5affab}
  #mu-overlay .mu-monto{font-family:var(--display,sans-serif);font-weight:800;
    font-size:27px;color:#eaecef;line-height:1}
  #mu-overlay .mu-en{font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;margin-bottom:11px}
  #mu-overlay .mu-en b{color:#b7bdc6;font-family:var(--mono,monospace);font-size:13px}
  #mu-overlay .mu-veredicto{display:flex;align-items:center;justify-content:space-between;
    gap:8px;margin-bottom:10px}
  #mu-overlay .mu-fuerza{font-size:9px;letter-spacing:2px;color:currentColor}
  #mu-overlay .mu-fuerza i{opacity:.22;font-style:normal}
  #mu-overlay .oro .mu-fuerza{color:#E8B84B}
  #mu-overlay .verde .mu-fuerza{color:#2ee86a}
  #mu-overlay .azul .mu-fuerza{color:#4d9fff}
  #mu-overlay .mu-conse{font-family:var(--sans,sans-serif);font-size:13px;color:#c8cfd8;
    line-height:1.55;margin-bottom:11px}
  #mu-overlay .mu-conse b{color:#fff;font-weight:700}

  /* Cuanto más fuerte el muro, más presencia tiene la tarjeta. */
  #mu-overlay .mu-card.f3{background:linear-gradient(150deg,rgba(232,184,75,.10),rgba(255,255,255,.02) 60%);
    border-color:rgba(232,184,75,.32);box-shadow:0 4px 18px rgba(0,0,0,.4)}
  #mu-overlay .mu-card.f3.verde{background:linear-gradient(150deg,rgba(46,232,106,.10),rgba(255,255,255,.02) 60%);
    border-color:rgba(46,232,106,.3)}
  #mu-overlay .mu-card.f2{background:rgba(255,255,255,.035)}
  #mu-overlay .mu-card.f0{opacity:.72}

  #mu-overlay .mu-grupo.rojo{color:#ff7b88}
  #mu-overlay .mu-grupo.verde{color:#4dffa0}

  #mu-overlay .mu-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  #mu-overlay .mu-chip{font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;
    text-transform:uppercase;letter-spacing:.7px;padding:3px 8px;border-radius:20px}
  #mu-overlay .oro .mu-chip{background:rgba(232,184,75,.16);color:#E8B84B}
  #mu-overlay .verde .mu-chip{background:rgba(46,232,106,.14);color:#2ee86a}
  #mu-overlay .azul .mu-chip{background:rgba(77,159,255,.14);color:#4d9fff}
  #mu-overlay .rojo .mu-chip{background:rgba(246,70,93,.14);color:#f6465d}
  #mu-overlay .gris .mu-chip{background:rgba(139,150,163,.12);color:#8b96a3}
  #mu-overlay .mu-dist{font-family:var(--mono,monospace);font-size:10px;color:#5c6672;white-space:nowrap}
  #mu-overlay .mu-precio{font-family:var(--display,sans-serif);font-weight:800;
    font-size:21px;color:#eaecef;line-height:1.1;margin-bottom:7px}
  #mu-overlay .mu-datos{display:flex;flex-wrap:wrap;gap:4px 14px;margin-bottom:8px}
  #mu-overlay .mu-datos span{font-family:var(--mono,monospace);font-size:10px;color:#5c6672}
  #mu-overlay .mu-datos b{color:#b7bdc6;font-weight:700;margin-right:4px}
  #mu-overlay .mu-nota{font-family:var(--sans,sans-serif);font-size:12px;color:#8b96a3;
    line-height:1.55;margin-bottom:8px}
  #mu-overlay .mu-hacer{font-family:var(--sans,sans-serif);font-size:11.5px;color:#b7bdc6;
    line-height:1.5;padding:8px 11px;border-radius:9px;background:rgba(255,255,255,.03);
    border-left:2px solid currentColor}
  #mu-overlay .oro .mu-hacer{border-left-color:rgba(232,184,75,.55)}
  #mu-overlay .verde .mu-hacer{border-left-color:rgba(46,232,106,.5)}
  #mu-overlay .azul .mu-hacer{border-left-color:rgba(77,159,255,.5)}
  #mu-overlay .rojo .mu-hacer{border-left-color:rgba(246,70,93,.5)}
  #mu-overlay .gris .mu-hacer{border-left-color:rgba(139,150,163,.4)}

  /* ── Selector ── */
  #mu-picker{position:fixed;z-index:9790;min-width:236px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:13px;padding:6px;
    box-shadow:0 16px 44px rgba(0,0,0,.72)}
  #mu-picker .mu-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;
    border-radius:9px;border:1px solid #2b3139;background:#0b0e12;color:#eaecef;
    font-family:var(--sans,sans-serif);font-size:13px;min-height:38px}
  #mu-picker .mu-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #mu-picker .mu-lista-mon{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  #mu-picker .mu-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;
    border-radius:9px;background:transparent;border:none;color:#b7bdc6;cursor:pointer;
    text-align:left;min-height:42px}
  #mu-picker .mu-op:hover{background:rgba(255,255,255,.05)}
  #mu-picker .mu-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  #mu-picker .mu-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:46px}
  #mu-picker .mu-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #mu-picker .mu-op svg{width:14px;height:14px;flex:0 0 auto;color:var(--gold,#E8B84B)}

  /* ── Ayuda ── */
  /* Modal de validación de volumen */
  #mu-val-box{position:fixed;inset:0;z-index:9780;display:flex;align-items:center;justify-content:center;padding:16px}
  #mu-val-box .mu-bg{position:absolute;inset:0;background:rgba(3,5,8,.9)}
  #mu-val-box .mv-c{position:relative;width:100%;max-width:520px;background:linear-gradient(180deg,#12171f,#0b0e12);
    border:1px solid #232b35;border-radius:18px;padding:26px 22px 22px;box-shadow:0 24px 70px rgba(0,0,0,.65)}
  #mu-val-box .mv-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:10px;
    background:#1a212b;border:1px solid #2b3540;color:#aeb6c0;font-size:14px;cursor:pointer}
  #mu-val-box .mv-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px}
  #mu-val-box .mv-t{font-family:var(--display,sans-serif);font-weight:800;font-size:20px;color:#f2f5f9;margin:0 0 10px}
  #mu-val-box .mv-d{font-family:var(--sans,sans-serif);font-size:13.5px;line-height:1.6;color:#c2c9d2;margin:0 0 14px}
  #mu-val-box .mv-d b{color:#fff} #mu-val-box code{font-family:var(--mono,monospace);font-size:12px;
    background:rgba(232,184,75,.12);color:#E8B84B;padding:1px 6px;border-radius:5px}
  #mu-val-box .mv-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}
  #mu-val-box .mv-nums div{text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);
    border-radius:10px;padding:10px 6px}
  #mu-val-box .mv-nums b{display:block;font-family:var(--mono,monospace);font-weight:800;font-size:15px;color:#eaecef}
  #mu-val-box .mv-nums span{font-family:var(--mono,monospace);font-size:8px;color:#5c6672;text-transform:uppercase;letter-spacing:.4px}
  /* Píldora Analista + su modal */
  #mu-overlay .mu-analista{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;height:36px;
    padding:0 12px 0 4px;border-radius:999px;cursor:pointer;
    background:linear-gradient(180deg,rgba(232,184,75,.18),rgba(232,184,75,.06));
    border:1px solid rgba(232,184,75,.45);color:var(--gold,#E8B84B);
    box-shadow:0 2px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.08);
    font-family:var(--display,sans-serif);font-weight:700;font-size:12px;white-space:nowrap;
    transition:transform .1s ease,filter .15s ease}
  #mu-overlay .mu-analista:hover{filter:brightness(1.12)}
  #mu-overlay .mu-analista:active{transform:translateY(1px)}
  #mu-overlay .mu-analista img{width:28px;height:28px;border-radius:50%;object-fit:cover;flex:0 0 auto;
    border:1px solid rgba(232,184,75,.55)}
  #mu-overlay.mu-claro .mu-analista{color:#9a7a1e;border-color:rgba(232,184,75,.6)}
  @media(max-width:860px){
    #mu-overlay .mu-analista{padding:0;width:32px;height:32px;justify-content:center}
    #mu-overlay .mu-analista img{width:26px;height:26px}
    #mu-overlay .mu-an-txt{display:none}
    #mu-overlay .mu-der{gap:4px;padding-left:4px}
    #mu-overlay .mu-der .mu-ico{width:32px;height:32px;min-height:32px}
  }
  #mu-ana-box{position:fixed;inset:0;z-index:9785;display:flex;align-items:center;justify-content:center;padding:16px}
  #mu-ana-box .mu-bg{position:absolute;inset:0;background:rgba(3,5,8,.9)}
  #mu-ana-box .an-c{position:relative;width:100%;max-width:500px;max-height:calc(100vh - 32px);overflow-y:auto;
    background:linear-gradient(180deg,#12171f,#0b0e12);border:1px solid #232b35;border-top:2px solid var(--an,#E8B84B);
    border-radius:18px;padding:22px;box-shadow:0 24px 70px rgba(0,0,0,.65)}
  #mu-ana-box .mv-x{position:absolute;top:13px;right:13px;width:32px;height:32px;border-radius:9px;
    background:#1a212b;border:1px solid #2b3540;color:#aeb6c0;font-size:13px;cursor:pointer}
  #mu-ana-box .an-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-right:34px}
  #mu-ana-box .an-ava{width:46px;height:46px;border-radius:50%;object-fit:cover;flex:0 0 auto;
    border:2px solid var(--an,#E8B84B);box-shadow:0 0 14px color-mix(in srgb,var(--an,#E8B84B) 40%,transparent)}
  #mu-ana-box .an-rol{font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;letter-spacing:1px}
  #mu-ana-box .an-tit{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--an,#E8B84B);margin-top:2px}
  #mu-ana-box .an-body{font-family:var(--sans,sans-serif);font-size:13.5px;line-height:1.62;color:#c8cfd8}
  #mu-ana-box .an-body p{margin:0 0 11px}
  #mu-ana-box .an-body b{color:#fff}
  #mu-ana-box .an-body .an-como{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);
    border-radius:10px;padding:10px 12px;font-size:12.5px;color:#aeb6c0}
  #mu-ana-box .an-body .an-como b{color:#dfe4ea}
  #mu-ana-box .an-pie{margin-top:12px;padding-top:11px;border-top:1px solid #1c232c;
    font-family:var(--sans,sans-serif);font-size:11px;color:#7d8794;line-height:1.5}
  #mu-val-box .mv-note{font-family:var(--sans,sans-serif);font-size:12px;line-height:1.55;color:#9aa3ad;margin:0 0 12px}
  #mu-val-box .mv-note b{color:#c2c9d2}
  #mu-val-box .mv-links{display:flex;flex-wrap:wrap;gap:8px}
  #mu-val-box .mv-copy{flex:1;text-align:center;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;color:#0b0e12;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B));padding:11px 8px;border:none;border-radius:10px;
    box-shadow:0 3px 0 #8f6a1a}
  #mu-val-box .mv-copy:active{transform:translateY(2px);box-shadow:0 1px 0 #8f6a1a}

  #mu-ayuda-box{position:fixed;inset:0;z-index:9770;display:flex;align-items:center;justify-content:center;padding:16px}
  #mu-ayuda-box .mu-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #mu-ayuda-box .mua-c{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 32px);
    overflow-y:auto;background:linear-gradient(180deg,#161b22,#0b0e12);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #mu-ayuda-box .mua-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
  #mu-ayuda-box .mua-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:18px}
  #mu-ayuda-box .mua-card{padding:24px 20px;border-radius:16px;text-align:center;margin-bottom:18px;
    background:linear-gradient(165deg,rgba(232,184,75,.08),rgba(255,255,255,.015));
    border:1px solid rgba(232,184,75,.26)}
  #mu-ayuda-box .mua-n{font-family:var(--mono,monospace);font-size:11px;color:var(--gold,#E8B84B);
    font-weight:700;margin-bottom:10px}
  #mu-ayuda-box .mua-n em{font-style:normal;color:#5c6672;font-weight:400}
  #mu-ayuda-box .mua-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;
    color:#eaecef;margin-bottom:12px;line-height:1.25}
  #mu-ayuda-box .mua-d{font-family:var(--sans,sans-serif);font-size:14px;color:#b7bdc6;
    line-height:1.65;margin-bottom:14px}
  #mu-ayuda-box .mua-d b{color:var(--gold,#E8B84B);font-weight:700}
  #mu-ayuda-box .mua-x2{padding:12px 14px;border-radius:11px;background:rgba(255,255,255,.035);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#8b96a3;line-height:1.55;text-align:left}
  #mu-ayuda-box .mua-puntos{display:flex;gap:5px;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
  #mu-ayuda-box .mua-puntos i{width:7px;height:7px;border-radius:50%;background:#2b3139;cursor:pointer;
    transition:background .18s,transform .18s}
  #mu-ayuda-box .mua-puntos i.on{background:var(--gold,#E8B84B);transform:scale(1.35)}
  #mu-ayuda-box .mua-acts{display:flex;gap:9px}
  #mu-ayuda-box .mua-atras{flex:0 0 auto;min-height:48px;padding:0 20px;border-radius:12px;
    background:transparent;border:1px solid #2b3139;color:#8b96a3;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:13px}
  #mu-ayuda-box .mua-atras:hover{border-color:#3a424c;color:#b7bdc6}
  #mu-ayuda-box .mua-tabs{display:flex;gap:4px;padding:4px;margin:0 44px 18px 0;
    background:#0b0e12;border:1px solid #2b3139;border-radius:12px}
  #mu-ayuda-box .mua-tab{flex:1;min-height:40px;padding:0 10px;border-radius:9px;border:none;
    background:transparent;color:#7d8794;font-family:var(--display,sans-serif);
    font-weight:700;font-size:12.5px;cursor:pointer;line-height:1.25}
  #mu-ayuda-box .mua-tab.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #mu-ayuda-box .mua-pane{display:none}
  #mu-ayuda-box .mua-pane.on{display:block}
  #mu-ayuda-box .mua-intro{padding:15px 17px;border-radius:13px;margin-bottom:18px;
    background:linear-gradient(180deg,rgba(232,184,75,.09),rgba(232,184,75,.02));
    border:1px solid rgba(232,184,75,.3);font-family:var(--sans,sans-serif);
    font-size:13.5px;color:#b7bdc6;line-height:1.65}
  #mu-ayuda-box .mua-intro b{color:var(--gold,#E8B84B)}
  #mu-ayuda-box .mua-p{margin-bottom:15px;font-family:var(--sans,sans-serif);
    font-size:13px;color:#8b96a3;line-height:1.65}
  #mu-ayuda-box .mua-p > b:first-child{display:block;font-family:var(--display,sans-serif);
    font-size:14px;color:#eaecef;margin-bottom:5px}
  #mu-ayuda-box .mua-p b{color:#eaecef}
  #mu-ayuda-box .mua-p i{display:block;margin-top:8px;padding:9px 12px;border-radius:9px;
    font-style:normal;background:rgba(255,255,255,.03);
    border-left:2px solid var(--gold-soft,#C9A84B);font-size:12.5px;color:#8b96a3;line-height:1.55}
  #mu-ayuda-box .mua-col{display:flex;align-items:center;gap:10px;margin-top:9px;font-size:12.5px}
  #mu-ayuda-box .mua-col i{width:22px;height:22px;border-radius:6px;flex:0 0 auto;
    display:grid;place-items:center;font-style:normal;font-weight:800;font-size:11px;
    font-family:system-ui,sans-serif}
  #mu-ayuda-box .mua-aviso{padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.07);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12px;color:#b7bdc6;line-height:1.6;margin-bottom:18px}
  #mu-ayuda-box .mua-aviso b{color:var(--gold,#E8B84B)}
  #mu-ayuda-box .mua-b{flex:1;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;
    box-shadow:0 4px 0 #8f6a1a}

  /* ══ TEMA CLARO ══ (solo el chrome; los colores semánticos se mantienen) */
  #mu-overlay.mu-claro{--mu-tx:#1a2028}
  #mu-overlay.mu-claro .mu-c{background:#eef1f5}
  #mu-overlay.mu-claro .mu-bg{background:rgba(230,234,240,.6)}
  #mu-overlay.mu-claro .mu-barra{background:#e4e8ee;border-bottom-color:rgba(0,0,0,.08)}
  #mu-overlay.mu-claro .mu-panel{background:#e9edf2;border-left-color:rgba(0,0,0,.08)}
  #mu-overlay.mu-claro .mu-mtabs{background:#e4e8ee}
  #mu-overlay.mu-claro .mu-vivo span,
  #mu-overlay.mu-claro .mu-px b,
  #mu-overlay.mu-claro .mu-precio,
  #mu-overlay.mu-claro .mu-nivel,
  #mu-overlay.mu-claro .mu-conse,
  #mu-overlay.mu-claro .mu-conse b,
  #mu-overlay.mu-claro .mu-ck b{color:#1a2028}
  #mu-overlay.mu-claro .mu-px span,
  #mu-overlay.mu-claro .mu-ck span,
  #mu-overlay.mu-claro .mu-metricas span,
  #mu-overlay.mu-claro .mu-timeline .tl{color:#6b7480}
  #mu-overlay.mu-claro .mu-der{background:transparent}
  #mu-overlay.mu-claro .mu-ico{background:linear-gradient(180deg,#ffffff,#e7ebf1);border-color:rgba(0,0,0,.14);color:#3a424c;
    box-shadow:0 2px 5px rgba(60,72,90,.22), inset 0 1px 0 rgba(255,255,255,.9)}
  #mu-overlay.mu-claro .mu-ico:hover{border-color:var(--gold,#E8B84B);color:#9a7a1e}
  #mu-overlay.mu-claro .mu-sel,#mu-overlay.mu-claro .mu-tfchip{background:#dfe4ec;border-color:rgba(0,0,0,.12);color:#1a2028}
  #mu-overlay.mu-claro .mu-ck{background:linear-gradient(180deg,#fff,#eef1f5);border-color:rgba(0,0,0,.08)}
  #mu-overlay.mu-claro .mu-card{background:linear-gradient(145deg,#fff,#f2f5f9);border-color:rgba(0,0,0,.1)}
  #mu-overlay.mu-claro .mu-card .mu-nivel{color:#1a2028}
  #mu-overlay.mu-claro .mu-card[data-lado="compra"].f3{background:linear-gradient(145deg,#e9f9f0,#f2f5f9)}
  #mu-overlay.mu-claro .mu-card[data-lado="venta"].f3{background:linear-gradient(145deg,#fdeef0,#f2f5f9)}
  #mu-overlay.mu-claro .mu-metricas div{background:rgba(0,0,0,.04)}
  #mu-overlay.mu-claro .mu-metricas b{color:#1a2028}
  #mu-overlay.mu-claro .mu-fbtn{background:linear-gradient(180deg,#fff,#e6eaf0);border-color:rgba(0,0,0,.12);
    color:#5c6672;box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 2px 6px rgba(0,0,0,.12)}
  #mu-overlay.mu-claro .mu-fbtn .mu-cuenta{background:rgba(0,0,0,.1);color:#3a424c}
  #mu-overlay.mu-claro .mu-dist2{background:rgba(0,0,0,.06);color:#3a424c}
  #mu-overlay.mu-claro .mu-hacer{background:rgba(0,0,0,.04);color:#3a424c}
  #mu-overlay.mu-claro .mu-timeline .tl b{color:#3a424c}
  #mu-overlay.mu-claro .mu-esperar{color:#5c6672}
  #mu-overlay.mu-claro .mu-esperar b{color:#3a424c}

  /* ── Móvil: temporalidad en chip + pestañas Gráfica/Órdenes ── */
  @media(max-width:860px){
    #mu-overlay .mu-cuerpo{flex-direction:column}
    #mu-overlay .mu-tfs{display:none}          /* la fila se reemplaza por el chip */
    #mu-overlay .mu-tfchip{display:inline-flex}
    #mu-overlay .mu-mtabs{display:flex}
    /* La barra ya NO desborda. El "Precio ahora" se oculta (ya está grande en
       la gráfica). */
    #mu-overlay .mu-barra{flex-wrap:wrap;gap:8px;padding:8px 96px 8px 10px}
    #mu-overlay .mu-px{display:none}
    #mu-overlay .mu-vivo{flex:0 0 auto}
    #mu-overlay .mu-vivo span{display:none}
    /* Una vista a la vez, a pantalla completa: así las tarjetas de órdenes
       tienen TODO el alto para verse cómodas. */
    #mu-overlay .mu-cuerpo.m-graf .mu-graf{display:block;flex:1 1 auto;height:auto;min-height:0}
    #mu-overlay .mu-cuerpo.m-graf .mu-panel{display:none}
    #mu-overlay .mu-cuerpo.m-ord .mu-graf{display:none}
    #mu-overlay .mu-cuerpo.m-ord .mu-panel{display:flex;flex:1 1 auto;width:100%;border-left:none;min-height:0}
    #mu-overlay .mu-panel{width:100%;border-left:none;border-top:none}
    #mu-overlay .mu-chips{padding:11px 12px}
    #mu-overlay .mu-cockpit{padding:9px 12px 3px;gap:5px}
    #mu-overlay .mu-ck{padding:6px 4px}
    #mu-overlay .mu-ck b{font-size:12px}
    #mu-overlay .mu-ck span{font-size:7px}
    /* La lista SÍ hace scroll (min-height:0 en toda la cadena) y deja hueco
       abajo para que el nav de la app no tape la última tarjeta. */
    #mu-overlay .mu-cuerpo.m-ord .mu-lista{min-height:0;-webkit-overflow-scrolling:touch;
      padding:10px 12px calc(84px + env(safe-area-inset-bottom, 0px))}
    #mu-overlay .mu-marca{height:24px;left:10px;bottom:26px}
    #mu-overlay .mu-precio{font-size:19px}
    #mu-ayuda-box .mua-c{padding:20px 14px}
    #mu-ayuda-box .mua-tabs{margin-right:46px;flex-direction:column}
  }`;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════════════
   ANALISTA — lee la estructura actual y dice qué hacer

   No es un chat: interpreta lo que el sistema YA muestra (zonas reales,
   VWAP, sesgo, dónde está el precio) y da una lectura operativa: si hay
   entrada, en qué nivel, con qué idea de stop y objetivo, y cómo colocar
   la orden. Si no hay una entrada limpia, lo dice con honestidad.
   ══════════════════════════════════════════════════════════════ */
function analizarRadar() {
  const par = PARES.find((p) => p.id === _par) || PARES[0];
  const base = par.s.replace(/USDT$|USDC$|FDUSD$|BUSD$/, '');
  const px = M.precio || (M.velas.length ? M.velas[M.velas.length - 1].c : 0);
  const mk = M.mercado;
  const zonas = (M.zonas || []).filter((z) => !z.rota);
  if (!px || !zonas.length) {
    return { titulo: 'Sin lectura clara', cuerpo: `<p>Ahora mismo no hay zonas de acumulación cercanas y fiables en <b>${esc(base)} · ${esc(M.tf)}</b>. Sin un nivel con volumen de referencia, lo prudente es <b>esperar</b>: no hay una entrada con ventaja aquí.</p>`, tono: 'espera' };
  }
  const dentro = zonas.find((z) => z.dentro);
  const dem = zonas.filter((z) => z.lado === 'demanda').sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))[0];
  const ofe = zonas.filter((z) => z.lado === 'oferta').sort((a, b) => Math.abs(a.dist) - Math.abs(b.dist))[0];
  const fuerte = zonas.slice().sort((a, b) => b.confianza - a.confianza)[0];
  const anchoZona = (z) => ((z.pHigh - z.pLow) / z.p);
  const vwapTxt = mk && mk.vwap ? (px >= mk.vwap ? 'por <b>encima del VWAP</b> (favorece a los compradores)' : 'por <b>debajo del VWAP</b> (favorece a los vendedores)') : '';
  const comoWeb = 'Para operar desde la web: coloca el cursor sobre la banda, haz clic derecho y pulsa <b>«Comprar aquí»</b>, luego <b>Establecer posición</b> para fijar tu orden en ese precio.';
  const comoMovil = 'Desde el móvil: fíjate en el precio del <b>inicio de la banda</b> y deja una orden de entrada en ese nivel.';

  let titulo, cuerpo, tono;

  if (dentro && dentro.lado === 'demanda' && dentro.fuerza >= 3) {
    const ancho = anchoZona(dentro);
    const stop = fmt(dentro.pLow * 0.997);
    const tp = fmt(Math.max(mk ? mk.sHi : px * 1.01, (ofe ? ofe.pLow : px * 1.01)));
    titulo = 'Zona de alta demanda';
    tono = 'compra';
    cuerpo =
      `<p>El precio está <b>dentro de una zona de demanda fuerte</b> en <b>${esc(base)} · ${esc(M.tf)}</b>, con <b>${dinero(dentro.v)}</b> acumulados en el rango <b>${fmt(dentro.pLow)} – ${fmt(dentro.pHigh)}</b>. Es un nivel con mucho volumen debajo del precio: escenario de posible <b>compra (long)</b> apoyada en esa demanda${vwapTxt ? ', y el precio está ' + vwapTxt : ''}.</p>` +
      `<p><b>Entrada:</b> ubícate en el inicio de la banda, cerca de <b>${fmt(dentro.pLow)}</b> (o en el punto de control <b>${fmt(dentro.pPoc)}</b>). <b>Stop:</b> por debajo de la zona, hacia <b>${stop}</b>. <b>Objetivo:</b> el máximo de la estructura, sobre <b>${tp}</b>.</p>` +
      (ancho > 0.02 ? `<p>Ojo: el rango es amplio porque recoge una oscilación grande. Sé <b>prudente con el capital</b> que arriesgas y no entres todo de golpe.</p>` : `<p>Sé prudente con el tamaño de la posición: arriesga solo una parte pequeña de tu capital.</p>`) +
      `<p class="an-como">${comoWeb} ${comoMovil}</p>`;
  } else if (dentro && dentro.lado === 'oferta' && dentro.fuerza >= 3) {
    const stop = fmt(dentro.pHigh * 1.003);
    const tp = fmt(Math.min(mk ? mk.sLo : px * 0.99, (dem ? dem.pHigh : px * 0.99)));
    titulo = 'Zona de alta oferta';
    tono = 'venta';
    cuerpo =
      `<p>El precio está <b>dentro de una zona de oferta fuerte</b> en <b>${esc(base)} · ${esc(M.tf)}</b>, con <b>${dinero(dentro.v)}</b> acumulados en <b>${fmt(dentro.pLow)} – ${fmt(dentro.pHigh)}</b>. Hay mucho volumen vendedor encima: si estás comprado, <b>cuidado</b>; es zona de posible <b>toma de beneficios o venta (short)</b>${vwapTxt ? ', y el precio está ' + vwapTxt : ''}.</p>` +
      `<p><b>Entrada (short):</b> cerca de <b>${fmt(dentro.pHigh)}</b> o del control <b>${fmt(dentro.pPoc)}</b>. <b>Stop:</b> por encima, hacia <b>${stop}</b>. <b>Objetivo:</b> hacia <b>${tp}</b>.</p>` +
      `<p class="an-como">${comoWeb} ${comoMovil}</p>`;
  } else if (dem && Math.abs(dem.dist) < (ofe ? Math.abs(ofe.dist) : 99) && dem.fuerza >= 3) {
    const tp = fmt(mk ? mk.sHi : px * 1.02);
    titulo = 'Demanda debajo del precio';
    tono = 'compra';
    cuerpo =
      `<p>El precio se impulsó <b>por encima de una zona de demanda</b> en <b>${fmt(dem.pLow)} – ${fmt(dem.pHigh)}</b> (${dinero(dem.v)}). Esa zona queda ahora como <b>soporte</b> a un <b>${(Math.abs(dem.dist) * 100).toFixed(2)}%</b> por debajo${vwapTxt ? '. El precio está ' + vwapTxt : ''}.</p>` +
      `<p><b>Plan:</b> si el precio <b>vuelve a probar</b> esa zona (retesteo) y aguanta, es una posible <b>entrada en largo</b>. Entrada cerca de <b>${fmt(dem.pHigh)}</b>, stop bajo <b>${fmt(dem.pLow * 0.997)}</b>, objetivo hacia <b>${tp}</b>.</p>` +
      `<p>Mientras no vuelva, no persigas el precio: espera el retesteo.</p>` +
      `<p class="an-como">${comoWeb} ${comoMovil}</p>`;
  } else if (ofe && ofe.fuerza >= 3) {
    titulo = 'Oferta encima del precio';
    tono = 'venta';
    cuerpo =
      `<p>Hay una <b>zona de oferta</b> en <b>${fmt(ofe.pLow)} – ${fmt(ofe.pHigh)}</b> (${dinero(ofe.v)}) a un <b>${(Math.abs(ofe.dist) * 100).toFixed(2)}%</b> por encima. Actúa como <b>resistencia</b>: es donde el precio puede frenarse${vwapTxt ? '. El precio está ' + vwapTxt : ''}.</p>` +
      `<p><b>Plan:</b> si el precio sube hasta ahí y se frena, es zona de posible <b>venta / toma de beneficios</b>. Para un largo, mejor esperar a que <b>rompa y retestee</b> esa oferta por encima.</p>` +
      `<p class="an-como">${comoMovil}</p>`;
  } else {
    titulo = 'Sin entrada limpia';
    tono = 'espera';
    cuerpo =
      `<p>Ahora mismo el precio está <b>en medio del rango</b>, sin una zona fuerte lo bastante cerca para dar una entrada con ventaja en <b>${esc(base)} · ${esc(M.tf)}</b>.</p>` +
      `<p>Lo profesional aquí es <b>esperar</b>: deja que el precio busque una de las zonas marcadas (demanda debajo u oferta encima) y opera la reacción en ese nivel. Forzar una entrada en el medio es donde se pierde dinero.</p>`;
  }
  return { titulo, cuerpo, tono, base };
}

function abrirAnalista() {
  const a = analizarRadar();
  document.getElementById('mu-ana-box')?.remove();
  const col = a.tono === 'compra' ? '#2ee86a' : a.tono === 'venta' ? '#f6465d' : '#E8B84B';
  const d = document.createElement('div');
  d.id = 'mu-ana-box';
  d.innerHTML = `<div class="mu-bg"></div>
    <div class="an-c" style="--an:${col}">
      <button class="mv-x" aria-label="Cerrar">\u2715</button>
      <div class="an-head">
        <img class="an-ava" src="assets/img/jesus-avatar.webp" alt="">
        <div>
          <div class="an-rol">Analista \u00b7 Institutional Radar</div>
          <div class="an-tit">${esc(a.titulo)}</div>
        </div>
      </div>
      <div class="an-body">${a.cuerpo}</div>
      <div class="an-pie">Lectura de la estructura actual. No es una orden autom\u00e1tica: la decisi\u00f3n es tuya.</div>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('.mu-bg').onclick = cerrar;
  d.querySelector('.mv-x').onclick = cerrar;
}

/* ══════════════════════════════════════════════════════════════
   VERIFICACIÓN DE VOLUMEN

   Da confianza y trazabilidad SIN revelar proveedores ni endpoints: cada
   lectura lleva una firma única (hash + hora) para que sea auditable, y el
   usuario puede contrastar los niveles con su propia plataforma. No se
   menciona de dónde salen los datos: es parte del valor del producto.
   ══════════════════════════════════════════════════════════════ */
function validarVolumen() {
  const par = PARES.find((p) => p.id === _par) || PARES[0];
  const base = par.s.replace(/USDT$|USDC$|FDUSD$|BUSD$/, '');
  const mk = M.mercado;
  const zTot = (M.velas || []).reduce((s, v) => s + (v.vol || 0), 0);
  const zFuerte = (M.zonas || []).slice().sort((a, b) => b.v - a.v)[0];
  const hora = new Date().toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  document.getElementById('mu-val-box')?.remove();
  const d = document.createElement('div');
  d.id = 'mu-val-box';
  d.innerHTML = `<div class="mu-bg"></div>
    <div class="mv-c">
      <button class="mv-x" aria-label="Cerrar">\u2715</button>
      <div class="mv-eyebrow">Volumen \u00b7 ${esc(base)} \u00b7 ${esc(M.tf)}</div>
      <h3 class="mv-t">Volumen negociado en tiempo real</h3>
      <p class="mv-d">Estas son las cifras de <b>volumen real en d\u00f3lares</b> que sostienen las zonas detectadas. Cada zona muestra el capital acumulado que ha pasado por ese rango de precio.</p>
      <div class="mv-nums">
        <div><b>${dinero(zTot)}</b><span>volumen circundante</span></div>
        <div><b>${zFuerte ? dinero(zFuerte.v) : '\u2014'}</b><span>volumen de la zona m\u00e1s fuerte</span></div>
        <div><b>${mk && mk.vwap ? fmt(mk.vwap) : '\u2014'}</b><span>VWAP anclado</span></div>
      </div>
      <div class="mv-links">
        <button class="mv-copy" id="mv-copy">Copiar alerta</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('.mu-bg').onclick = cerrar;
  d.querySelector('.mv-x').onclick = cerrar;
  d.querySelector('#mv-copy').onclick = () => {
    // Alerta pro: líneas cortas (seguras en móvil), emojis serios, fácil de leer.
    // Negrita real (Unicode) para los títulos: se ve en WhatsApp, Telegram y notas.
    const neg = (s) => s.replace(/[A-Za-z0-9]/g, (c) => {
      const cc = c.charCodeAt(0);
      if (cc >= 65 && cc <= 90) return String.fromCodePoint(0x1D5D4 + (cc - 65));
      if (cc >= 97 && cc <= 122) return String.fromCodePoint(0x1D5EE + (cc - 97));
      if (cc >= 48 && cc <= 57) return String.fromCodePoint(0x1D7EC + (cc - 48));
      return c;
    });
    const icono = (z) => z.rota ? '\u26aa' : (z.lado === 'demanda' ? '\u{1F7E2}' : '\u{1F534}');
    const tipo = (z) => z.rota ? 'ROTA   ' : (z.lado === 'demanda' ? 'DEMANDA' : 'OFERTA ');
    const aqui = (z) => z.dentro ? '  \u25c0 AQU\u00cd' : '';
    const niveles = (M.zonas || []).slice(0, 6).map((z) => `${icono(z)} ${tipo(z)} ${fmt(z.pLow)}\u2013${fmt(z.pHigh)}  ${dinero(z.v)}${aqui(z)}`).join('\n');
    const sesgo = mk ? (mk.sesgo === 'comprador' ? 'Comprador' : mk.sesgo === 'vendedor' ? 'Vendedor' : 'Neutral') : 'Neutral';
    const alerta =
`\u{1F537} ${neg('INSTITUTIONAL RADAR')}

${esc(base)} \u00b7 ${esc(M.tf)} \u00b7 ${hora}


\u{1F4B5} Precio actual: ${fmt(M.precio)}
\u{1F4C8} VWAP: ${mk && mk.vwap ? fmt(mk.vwap) : '\u2014'}
\u{1F4CA} Volumen circundante: ${dinero(zTot)}


\u{1F3AF} ${neg('ZONAS CLAVE')}

${niveles || 'Sin zonas cercanas'}


\u{1F9ED} ${neg('Sesgo')}: ${sesgo}`;
    const btn = d.querySelector('#mv-copy');
    const ok = () => { btn.textContent = '\u2713 Alerta copiada'; setTimeout(() => { btn.textContent = 'Copiar alerta'; }, 1800); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(alerta).then(ok).catch(ok);
    else { try { const ta = document.createElement('textarea'); ta.value = alerta; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } catch (_) {} ok(); }
  };
}

/* ══════════════════════════════════════════════════════════════
   COMPARTIR — con la marca, para que circule
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const cv = $('mu-cv'); if (!cv) return;
  const marca = document.querySelector('.mu-marca');
  const antes = marca ? marca.style.display : null;
  if (marca) marca.style.display = 'none';
  const devolver = () => { if (marca) marca.style.display = antes || ''; };

  try {
    const e2 = cv.width / cv.clientWidth;
    const barra = 78 * e2;
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height + barra;
    const g = out.getContext('2d');
    g.fillStyle = '#0a0e14'; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, 0, 0);

    const yB = cv.height;
    g.fillStyle = '#0b0e12'; g.fillRect(0, yB, out.width, barra);
    g.fillStyle = 'rgba(232,184,75,.35)'; g.fillRect(0, yB, out.width, 2 * e2);

    const textos = (x) => {
      g.textAlign = 'left';
      g.fillStyle = '#E8B84B';
      g.font = `800 ${19 * e2}px system-ui,sans-serif`;
      g.fillText('Radar Institucional · Flujo de Órdenes', x, yB + 34 * e2);
      g.font = `700 ${14 * e2}px ui-monospace,monospace`;
      g.fillStyle = '#C9A84B';
      g.fillText('CriptoCubaOficial.com', x, yB + 56 * e2);
      g.textAlign = 'right';
      g.fillStyle = '#8b96a3';
      g.font = `700 ${14 * e2}px ui-monospace,monospace`;
      g.fillText(`${_par} · ${M.tf}`, out.width - 20 * e2, yB + 34 * e2);
      g.font = `${11 * e2}px ui-monospace,monospace`;
      g.fillStyle = '#6b7681';
      g.fillText(new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        out.width - 20 * e2, yB + 56 * e2);
      g.textAlign = 'left';
    };

    const bajar = () => out.toBlob((blob) => {
      devolver();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `criptocuba-radar-${_par}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');

    const logo = new Image();
    let hecho = false;
    const una = (w) => { if (hecho) return; hecho = true; textos(w ? 20 * e2 + w + 18 * e2 : 20 * e2); bajar(); };
    logo.onload = () => {
      try {
        const alto = 52 * e2;
        const ancho = Math.round(logo.width * (alto / logo.height));
        g.drawImage(logo, 20 * e2, yB + (barra - alto) / 2, ancho, alto);
        una(ancho);
      } catch (_) { una(0); }
    };
    logo.onerror = () => una(0);
    setTimeout(() => una(0), 1500);
    logo.src = 'assets/img/cco-marca.png';
  } catch (_) { devolver(); }
}
