// niveles.js — Smart Levels
//
// QUÉ HACE
//
// Analiza la estructura real del mercado y dibuja sobre la gráfica
// los niveles donde conviene comprar y vender. Nada más.
//
// El usuario no ve celdas, ni números que descifrar, ni el proceso.
// Ve una gráfica limpia con dos o tres líneas y un asistente que le
// dice qué está pasando y qué hacer.
//
// DE DÓNDE SALEN LOS NIVELES
//
// Todo se calcula con las velas reales de Binance. Nada inventado:
//
//   · Pivotes      — máximos y mínimos que el precio respetó
//   · Toques       — cuántas veces volvió a ese nivel sin romperlo
//   · Volumen      — cuánto se negoció ahí de verdad
//   · Tendencia    — la dirección real, medida por estructura
//   · Rango        — si el precio está lateral, se dice y punto
//
// Un nivel solo se dibuja si supera un filtro estricto. Si no hay
// nada claro, el asistente lo dice: "ahora mismo no hay entrada".
// Preferimos callar que inventar una señal.

const $ = (id) => document.getElementById(id);

/* ══════════════════════════════════════════════════════════════
   TRADUCCIÓN

   Los textos del asistente se escriben letra a letra, así que el
   traductor global no los alcanza: intercepta un texto a medias.
   Aquí se traducen ANTES de mostrarlos.
   ══════════════════════════════════════════════════════════════ */
let _tr = null;
try {
  import('./idioma.js?v=126').then((m) => { _tr = m; }).catch(() => {});
} catch (_) {}

const T = (txt) => {
  if (!_tr || !txt) return txt;
  try { return _tr.t(txt); } catch (_) { return txt; }
};
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
  { id: 'SUI',   s: 'SUIUSDT',   n: 'Sui',        cg: 'sui' },
  { id: 'NEAR',  s: 'NEARUSDT',  n: 'NEAR',       cg: 'near' },
  { id: 'LTC',   s: 'LTCUSDT',   n: 'Litecoin',   cg: 'litecoin' },
  { id: 'PEPE',  s: 'PEPEUSDT',  n: 'Pepe',       cg: 'pepe' },
  { id: 'WIF',   s: 'WIFUSDT',   n: 'dogwifhat',  cg: 'dogwifcoin' },
  { id: 'ATOM',  s: 'ATOMUSDT',  n: 'Cosmos',     cg: 'cosmos' },
  { id: 'AAVE',  s: 'AAVEUSDT',  n: 'Aave',       cg: 'aave' },
  { id: 'UNI',   s: 'UNIUSDT',   n: 'Uniswap',    cg: 'uniswap' },
  { id: 'INJ',   s: 'INJUSDT',   n: 'Injective',  cg: 'injective-protocol' },
  { id: 'APT',   s: 'APTUSDT',   n: 'Aptos',      cg: 'aptos' },
  { id: 'ARB',   s: 'ARBUSDT',   n: 'Arbitrum',   cg: 'arbitrum' },
  { id: 'OP',    s: 'OPUSDT',    n: 'Optimism',   cg: 'optimism' },
  { id: 'FIL',   s: 'FILUSDT',   n: 'Filecoin',   cg: 'filecoin' },
  { id: 'TIA',   s: 'TIAUSDT',   n: 'Celestia',   cg: 'celestia' },
  { id: 'SEI',   s: 'SEIUSDT',   n: 'Sei',        cg: 'sei-network' },
  { id: 'RENDER',s: 'RENDERUSDT',n: 'Render',     cg: 'render-token' },
  { id: 'TON',   s: 'TONUSDT',   n: 'Toncoin',    cg: 'the-open-network' },
  { id: 'ICP',   s: 'ICPUSDT',   n: 'Internet Computer', cg: 'internet-computer' },
  { id: 'ETC',   s: 'ETCUSDT',   n: 'Ethereum Classic',  cg: 'ethereum-classic' },
  { id: 'BCH',   s: 'BCHUSDT',   n: 'Bitcoin Cash', cg: 'bitcoin-cash' },
  { id: 'XLM',   s: 'XLMUSDT',   n: 'Stellar',    cg: 'stellar' },
  { id: 'HBAR',  s: 'HBARUSDT',  n: 'Hedera',     cg: 'hedera-hashgraph' },
  { id: 'ALGO',  s: 'ALGOUSDT',  n: 'Algorand',   cg: 'algorand' },
  { id: 'VET',   s: 'VETUSDT',   n: 'VeChain',    cg: 'vechain' },
  { id: 'FET',   s: 'FETUSDT',   n: 'Artificial Superintelligence', cg: 'fetch-ai' },
  { id: 'GALA',  s: 'GALAUSDT',  n: 'Gala',       cg: 'gala' },
  { id: 'SAND',  s: 'SANDUSDT',  n: 'The Sandbox', cg: 'the-sandbox' },
  { id: 'MANA',  s: 'MANAUSDT',  n: 'Decentraland', cg: 'decentraland' },
  { id: 'BONK',  s: 'BONKUSDT',  n: 'Bonk',       cg: 'bonk' },
  { id: 'FLOKI', s: 'FLOKIUSDT', n: 'Floki',      cg: 'floki' },
  { id: 'JUP',   s: 'JUPUSDT',   n: 'Jupiter',    cg: 'jupiter-exchange-solana' },
  { id: 'ENA',   s: 'ENAUSDT',   n: 'Ethena',     cg: 'ethena' },
  { id: 'ORDI',  s: 'ORDIUSDT',  n: 'ORDI',       cg: 'ordinals' },
  { id: 'STX',   s: 'STXUSDT',   n: 'Stacks',     cg: 'blockstack' },
  { id: 'EUR',   s: 'EURUSDT',   n: 'Euro',       cg: '', grupo: 'divisa' },
  { id: 'GBP',   s: 'GBPUSDT',   n: 'Libra',      cg: '', grupo: 'divisa' },
  { id: 'PAXG',  s: 'PAXGUSDT',  n: 'Oro (PAXG)', cg: 'pax-gold', grupo: 'materia' }
];

const TFS = [
  { id: '15m', n: '15m' },
  { id: '1h',  n: '1H' },
  { id: '4h',  n: '4H' },
  { id: '1d',  n: '1D' }
];

let _par = 'BTC';
let _tf = '1h';

const N = {
  velas: [],
  precio: 0,
  niveles: [],        // los que se dibujan
  tendencia: null,
  rango: null,        // si está lateral
  mensajes: [],       // lo que dice el asistente
  vista: { desde: 0, ancho: 90, zoomY: 1 },
  cargando: true,
  error: null
};

/* ══════════════════════════════════════════════════════════════
   LOS DATOS
   ══════════════════════════════════════════════════════════════ */
async function traerVelas(simbolo, tf, n = 300) {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`);
  if (!r.ok) throw new Error('sin datos');
  const j = await r.json();
  return j.map((x) => ({
    t: x[0],
    o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]),
    v: Number(x[5])
  }));
}

/* ══════════════════════════════════════════════════════════════
   1. PIVOTES

   Un pivote es un máximo o mínimo que el precio respetó: una vela
   cuyo extremo supera al de las N velas de cada lado. Es la base de
   toda la estructura, y es cálculo puro sobre datos reales.
   ══════════════════════════════════════════════════════════════ */
function pivotes(velas, lado = 3) {
  /* [CORREGIDO] La comparación era estricta (`>=`), así que en una
     tendencia sostenida —donde cada máximo supera al anterior— NO
     salía ningún pivote. Cero pivotes = cero niveles = el mensaje
     de relleno "el precio está en el medio".

     Ahora un pivote es un giro LOCAL: el extremo de su ventana
     inmediata, comparando solo con los vecinos más cercanos. Es
     como lo lee un trader: un punto donde el precio se dio la
     vuelta, aunque después siguiera subiendo. */
  const altos = [], bajos = [];
  for (let i = lado; i < velas.length - lado; i++) {
    const v = velas[i];
    let esAlto = true, esBajo = true;
    for (let j = i - lado; j <= i + lado; j++) {
      if (j === i) continue;
      if (velas[j].h > v.h) esAlto = false;
      if (velas[j].l < v.l) esBajo = false;
    }
    /* Y tiene que ser un giro de verdad: el precio venía de un lado
       y se fue al otro, no un empate. */
    if (esAlto && velas[i - 1].h < v.h && velas[i + 1].h < v.h) {
      altos.push({ i, p: v.h, t: v.t });
    }
    if (esBajo && velas[i - 1].l > v.l && velas[i + 1].l > v.l) {
      bajos.push({ i, p: v.l, t: v.t });
    }
  }
  /* ══════════════════════════════════════════════════════════
     RESPALDO PARA TENDENCIAS FUERTES

     Cuando el precio sube (o baja) sin descanso, no hay máximos
     locales: cada vela supera a la anterior. Matemáticamente no
     puede haber pivotes, y el análisis se queda mudo.

     Un trader en ese caso mira otra cosa: los extremos por tramos.
     Se parte el histórico en bloques y se toma el máximo y el
     mínimo de cada uno. Son referencias reales, calculadas sobre
     las velas, no inventadas.
     ══════════════════════════════════════════════════════════ */
  if (altos.length < 2 || bajos.length < 2) {
    const bloques = 8;
    const paso = Math.max(6, Math.floor(velas.length / bloques));
    for (let ini = 0; ini + paso <= velas.length; ini += paso) {
      const tramo = velas.slice(ini, ini + paso);
      let iA = 0, iB = 0;
      tramo.forEach((v, k) => {
        if (v.h > tramo[iA].h) iA = k;
        if (v.l < tramo[iB].l) iB = k;
      });
      const gA = ini + iA, gB = ini + iB;
      if (!altos.some((x) => Math.abs(x.i - gA) < 3)) {
        altos.push({ i: gA, p: velas[gA].h, t: velas[gA].t, porTramo: true });
      }
      if (!bajos.some((x) => Math.abs(x.i - gB) < 3)) {
        bajos.push({ i: gB, p: velas[gB].l, t: velas[gB].t, porTramo: true });
      }
    }
    altos.sort((a, b) => a.i - b.i);
    bajos.sort((a, b) => a.i - b.i);
  }

  return { altos, bajos };
}

/* ══════════════════════════════════════════════════════════════
   2. LA TENDENCIA

   Se mide por estructura, no por indicadores: máximos y mínimos
   crecientes = alcista. Decrecientes = bajista. Mezclados = rango.
   Es como lee el mercado un trader de verdad.
   ══════════════════════════════════════════════════════════════ */
function tendencia(velas, piv) {
  const ua = piv.altos.slice(-3), ub = piv.bajos.slice(-3);
  /* Si no hay pivotes suficientes, se mira el movimiento neto: es
     mejor que devolver "indefinida" y quedarse sin lectura. */
  if (ua.length < 2 || ub.length < 2) {
    const n0 = Math.min(50, velas.length);
    const tr = velas.slice(-n0);
    const mv = ((tr[tr.length - 1].c - tr[0].c) / tr[0].c) * 100;
    if (mv > 1.5) return { dir: 'alcista', fuerza: Math.min(100, mv * 10), mov: mv };
    if (mv < -1.5) return { dir: 'bajista', fuerza: Math.min(100, -mv * 10), mov: mv };
    return { dir: 'lateral', fuerza: 0, mov: mv };
  }

  const altosSuben = ua[ua.length - 1].p > ua[ua.length - 2].p;
  const bajosSuben = ub[ub.length - 1].p > ub[ub.length - 2].p;
  const altosBajan = ua[ua.length - 1].p < ua[ua.length - 2].p;
  const bajosBajan = ub[ub.length - 1].p < ub[ub.length - 2].p;

  // Cuánto se ha movido en el tramo, para saber si es tendencia o ruido
  const n = Math.min(60, velas.length);
  const tramo = velas.slice(-n);
  const ini = tramo[0].c, fin = tramo[tramo.length - 1].c;
  const mov = ((fin - ini) / ini) * 100;

  if (altosSuben && bajosSuben) {
    return { dir: 'alcista', fuerza: Math.min(100, Math.abs(mov) * 12), mov };
  }
  if (altosBajan && bajosBajan) {
    return { dir: 'bajista', fuerza: Math.min(100, Math.abs(mov) * 12), mov };
  }
  return { dir: 'lateral', fuerza: 0, mov };
}

/* ══════════════════════════════════════════════════════════════
   3. ¿ESTÁ EN RANGO?

   Si el precio lleva mucho oscilando dentro de una banda estrecha,
   hay que decirlo: no es momento de buscar entradas de tendencia.
   ══════════════════════════════════════════════════════════════ */
function detectarRango(velas) {
  const n = Math.min(50, velas.length);
  const tramo = velas.slice(-n);
  const alto = Math.max(...tramo.map((v) => v.h));
  const bajo = Math.min(...tramo.map((v) => v.l));
  const amplitud = ((alto - bajo) / bajo) * 100;

  // Cuántas velas cerraron dentro del 70% central de la banda
  const margen = (alto - bajo) * 0.15;
  const dentro = tramo.filter((v) => v.c > bajo + margen && v.c < alto - margen).length;
  const pctDentro = (dentro / n) * 100;

  /* Es rango si la banda es estrecha para la volatilidad de esa
     moneda Y el precio se pasa la mayor parte del tiempo dentro. */
  const esRango = amplitud < 6 && pctDentro > 62;
  return esRango ? { alto, bajo, amplitud, pctDentro } : null;
}

/* ══════════════════════════════════════════════════════════════
   4. LOS NIVELES

   Se agrupan los pivotes cercanos: si el precio giró tres veces en
   la misma zona, ese nivel importa. Cada uno lleva su cuenta de
   toques y el volumen que se movió ahí, y solo pasan los que
   superan el filtro.
   ══════════════════════════════════════════════════════════════ */
function calcularNiveles(velas, piv, precio) {
  /* [CORREGIDO] Se usaban TODOS los pivotes de las 300 velas. En una
     tendencia sostenida, los antiguos quedan a un 30% del precio y
     el filtro de distancia los tiraba todos: por eso salía "sin
     soportes ni resistencias" y con ello el mensaje de relleno.

     Ahora se miran solo los pivotes de la parte reciente, que es lo
     que de verdad opera alguien. */
  const desde = Math.max(0, velas.length - 120);
  piv = {
    altos: piv.altos.filter((x) => x.i >= desde),
    bajos: piv.bajos.filter((x) => x.i >= desde)
  };

  const tolerancia = precio * 0.004;     // 0,4%: dos pivotes a esa distancia son el mismo nivel
  const grupos = [];

  const meter = (p, tipo) => {
    const g = grupos.find((x) => Math.abs(x.p - p.p) < tolerancia && x.tipo === tipo);
    if (g) {
      g.toques++;
      g.p = (g.p * (g.toques - 1) + p.p) / g.toques;   // media de los toques
      if (p.i > g.ultimo) g.ultimo = p.i;
    } else {
      grupos.push({ p: p.p, tipo, toques: 1, ultimo: p.i, primero: p.i });
    }
  };
  piv.bajos.forEach((p) => meter(p, 'soporte'));
  piv.altos.forEach((p) => meter(p, 'resistencia'));

  /* Volumen negociado cerca de cada nivel: un nivel con volumen
     tiene defensa real; uno sin volumen es casualidad. */
  const tramo = velas.slice(desde);
  const volTotal = tramo.reduce((a, v) => a + v.v, 0);
  grupos.forEach((g) => {
    let vol = 0;
    tramo.forEach((v) => {
      if (v.l <= g.p + tolerancia && v.h >= g.p - tolerancia) vol += v.v;
    });
    g.vol = vol;
    g.volPct = volTotal > 0 ? (vol / volTotal) * 100 : 0;
    g.dist = ((g.p - precio) / precio) * 100;
    g.frescura = velas.length > desde ? (g.ultimo - desde) / (velas.length - desde) : 0;

    /* La fuerza combina lo que de verdad importa:
         · cuántas veces aguantó
         · cuánto volumen tiene detrás
         · si es reciente o de hace mucho */
    g.fuerza = Math.min(100, Math.round(
      g.toques * 22 +
      Math.min(30, g.volPct * 2.2) +
      g.frescura * 24
    ));
  });

  /* EL FILTRO. Un nivel se dibuja solo si:
       · lo tocó al menos 2 veces (una es casualidad)
       · tiene fuerza suficiente
       · está a distancia operable (ni encima ni a un 15%) */
  /* [CORREGIDO] El filtro pedía 2 toques Y fuerza ≥45 a la vez, y
     casi nada pasaba: por eso salía siempre "el precio está en el
     medio", que es el mensaje de relleno.

     Ahora vale con una de las dos condiciones fuertes, y el rango
     de distancia es más amplio. Se sigue exigiendo calidad, pero
     sin dejar el mercado entero fuera. */
  const validos = grupos.filter((g) =>
    Math.abs(g.dist) > 0.08 && Math.abs(g.dist) < 18 &&
    (g.toques >= 3 || (g.toques >= 2 && g.fuerza >= 38) || g.fuerza >= 60)
  );

  /* Si aun así no pasa nada, se relaja al mínimo antes que mentir
     con un "no hay nada": mejor un nivel flojo bien etiquetado. */
  const lista = validos.length ? validos
    : grupos.filter((g) => g.toques >= 2 && Math.abs(g.dist) > 0.08);

  return lista
    .sort((a, b) => b.fuerza - a.fuerza)
    .slice(0, 6)
    .sort((a, b) => b.p - a.p);
}

/* ══════════════════════════════════════════════════════════════
   5. IMPULSO Y RETESTEO — el escenario de libro

   Es lo que busca cualquier trader con estructura:

     1. Un IMPULSO fuerte en una dirección (velas grandes seguidas)
     2. Un RETROCESO que devuelve el precio hacia el origen
     3. El precio LLEGA a esa zona de origen → entrada a favor

   La zona de origen del impulso es donde entró el dinero que lo
   provocó. Cuando el precio vuelve ahí, suele defenderse otra vez.
   ══════════════════════════════════════════════════════════════ */
/** ¿El impulso fue alcista? */
function alcista(imp) { return imp && imp.dir === 'alcista'; }

function detectarImpulso(velas) {
  if (velas.length < 30) return null;

  /* Se busca el tramo más fuerte de las últimas 60 velas: una
     secuencia de velas en la misma dirección con recorrido real. */
  const n = Math.min(60, velas.length);
  const tramo = velas.slice(-n);

  // Medida de referencia: el recorrido típico de una vela
  const rangos = tramo.map((v) => v.h - v.l).sort((a, b) => a - b);
  const rMed = rangos[Math.floor(rangos.length / 2)] || 1;

  let mejor = null;

  for (let i = 0; i < tramo.length - 5; i++) {
    for (let largo = 3; largo <= 10 && i + largo < tramo.length; largo++) {
      const sub = tramo.slice(i, i + largo);
      const ini = sub[0].o;
      const fin = sub[sub.length - 1].c;
      const mov = fin - ini;
      const pct = Math.abs(mov / ini) * 100;

      // Cuántas velas van en la dirección del movimiento
      const aFavor = sub.filter((v) => (mov > 0 ? v.c > v.o : v.c < v.o)).length;
      const pureza = aFavor / largo;

      /* Es impulso si: recorre bastante más que una vela normal,
         la mayoría de velas van a favor, y el movimiento es
         significativo en porcentaje. */
      /* [CORREGIDO] Pedía 70% de velas a favor Y un 1,2% de
         recorrido: un crash o un tramo alcista normal no pasaban.
         Ahora se admite desde 60% de pureza y 0,6% de recorrido,
         que sigue siendo un movimiento con intención. */
      const fuerza = Math.abs(mov) / (rMed * largo);
      if (pureza >= 0.6 && fuerza > 0.4 && pct > 0.6) {
        const puntos = pct * pureza * fuerza;
        if (!mejor || puntos > mejor.puntos) {
          mejor = {
            puntos, pct,
            dir: mov > 0 ? 'alcista' : 'bajista',
            iniIdx: velas.length - n + i,
            finIdx: velas.length - n + i + largo - 1,
            // La zona de origen: donde arrancó el impulso
            zonaAlta: Math.max(sub[0].o, sub[0].c, sub[0].h * 0.999),
            zonaBaja: Math.min(sub[0].o, sub[0].c, sub[0].l * 1.001),
            precioFin: fin,
            velas: largo
          };
        }
      }
    }
  }
  if (!mejor) return null;

  /* ¿Hubo retroceso después? Se mira lo que pasó desde que acabó. */
  const despues = velas.slice(mejor.finIdx + 1);
  if (!despues.length) return null;

  const precioAhora = velas[velas.length - 1].c;
  const zonaMedia = (mejor.zonaAlta + mejor.zonaBaja) / 2;
  const distZona = ((precioAhora - zonaMedia) / precioAhora) * 100;

  /* [CORREGIDO] Se usaba Math.abs, así que si el precio ATRAVESABA
     la zona de origen y seguía, el retroceso pasaba del 100%: salían
     esos "130% del impulso" que no significan nada.

     Un retroceso por encima del 100% quiere decir que la estructura
     se ha roto: el precio se comió el impulso entero. Ahí no hay
     entrada, y hay que decirlo en vez de inventar una. */
  const recorrido = Math.abs(mejor.precioFin - zonaMedia);
  let vuelta = 0;
  if (recorrido > 0) {
    /* Con signo: si el precio pasó de largo, sale mayor que 100. */
    const avance = alcista(mejor)
      ? (mejor.precioFin - precioAhora)      // alcista: retrocede bajando
      : (precioAhora - mejor.precioFin);     // bajista: retrocede subiendo
    vuelta = (avance / recorrido) * 100;
  }

  /* Si el impulso está agotado o invalidado, no sirve como señal. */
  mejor.invalidado = vuelta > 100;
  mejor.retroceso = Math.max(0, Math.min(100, vuelta));
  mejor.retrocesoReal = vuelta;
  mejor.distZona = distZona;
  mejor.zonaMedia = zonaMedia;
  /* Márgenes más realistas: el precio raramente clava el nivel */
  mejor.enZona = !mejor.invalidado && Math.abs(distZona) < 1.8;
  mejor.acercandose = !mejor.invalidado && Math.abs(distZona) < 5 && vuelta > 35 && vuelta <= 100;
  mejor.velasDesde = despues.length;

  /* Un impulso viejo ya no dice nada: si han pasado más velas que
     el propio impulso por tres, se descarta. */
  if (despues.length > mejor.velas * 4) return null;

  return mejor;
}

/* ══════════════════════════════════════════════════════════════
   6. LAS ESTRUCTURAS — lo que un trader profesional busca

   Cuatro patrones reconocidos en el análisis de estructura, cada
   uno calculado sobre las velas reales y DIBUJADO en la gráfica
   para que el usuario vea de qué se le habla.

     · BOS   (Break of Structure) — el precio cierra más allá del
             último máximo o mínimo: la tendencia continúa.
     · CHoCH (Change of Character) — el primer giro contra la
             tendencia: puede estar cambiando el ciclo.
     · Order Block — la última vela contraria antes del impulso.
             Ahí es donde entró el dinero institucional.
     · Barrido de liquidez — el precio se pasa de un extremo,
             recoge los stops y vuelve. Trampa clásica.

   REGLA: solo cuenta el CIERRE del cuerpo, no las mechas. Una
   mecha que atraviesa un nivel es un barrido, no una ruptura.
   ══════════════════════════════════════════════════════════════ */
function detectarEstructuras(velas, piv) {
  const out = [];
  if (velas.length < 30 || !piv.altos.length || !piv.bajos.length) return out;

  const ult = velas.length - 1;
  const reciente = (i) => ult - i <= 25;     // solo lo de ahora, no historia vieja

  /* ── BOS: ruptura de estructura ──
     El precio cierra por encima del último máximo relevante (alcista)
     o por debajo del último mínimo (bajista). */
  const ultAlto = piv.altos[piv.altos.length - 1];
  const ultBajo = piv.bajos[piv.bajos.length - 1];

  if (ultAlto) {
    for (let i = ultAlto.i + 1; i < velas.length; i++) {
      if (velas[i].c > ultAlto.p && reciente(i)) {
        out.push({
          tipo: 'bos', dir: 'alcista',
          nivel: ultAlto.p, iRef: ultAlto.i, iRot: i,
          nombre: 'Ruptura de estructura al alza',
          corto: 'BOS alcista'
        });
        break;
      }
    }
  }
  if (ultBajo) {
    for (let i = ultBajo.i + 1; i < velas.length; i++) {
      if (velas[i].c < ultBajo.p && reciente(i)) {
        out.push({
          tipo: 'bos', dir: 'bajista',
          nivel: ultBajo.p, iRef: ultBajo.i, iRot: i,
          nombre: 'Ruptura de estructura a la baja',
          corto: 'BOS bajista'
        });
        break;
      }
    }
  }

  /* ── CHoCH: cambio de carácter ──
     Veníamos haciendo mínimos crecientes y de pronto se pierde uno,
     o al revés. Es el primer aviso de que el ciclo puede girar. */
  const ba = piv.bajos.slice(-3), aa = piv.altos.slice(-3);
  if (ba.length >= 2 && ba[1].p > ba[0].p) {
    // veníamos al alza: ¿se ha perdido el último mínimo?
    const ref = ba[ba.length - 1];
    for (let i = ref.i + 1; i < velas.length; i++) {
      if (velas[i].c < ref.p && reciente(i)) {
        out.push({
          tipo: 'choch', dir: 'bajista',
          nivel: ref.p, iRef: ref.i, iRot: i,
          nombre: 'Cambio de carácter a bajista',
          corto: 'CHoCH bajista'
        });
        break;
      }
    }
  }
  if (aa.length >= 2 && aa[1].p < aa[0].p) {
    const ref = aa[aa.length - 1];
    for (let i = ref.i + 1; i < velas.length; i++) {
      if (velas[i].c > ref.p && reciente(i)) {
        out.push({
          tipo: 'choch', dir: 'alcista',
          nivel: ref.p, iRef: ref.i, iRot: i,
          nombre: 'Cambio de carácter a alcista',
          corto: 'CHoCH alcista'
        });
        break;
      }
    }
  }

  /* ── BARRIDO DE LIQUIDEZ ──
     La mecha atraviesa un extremo previo pero el cuerpo cierra de
     vuelta: han recogido los stops y han devuelto el precio. */
  const mirar = velas.slice(-14);
  const base = velas.length - 14;
  mirar.forEach((v, k) => {
    const i = base + k;
    if (i < 8) return;
    const previas = velas.slice(Math.max(0, i - 20), i);
    if (previas.length < 8) return;
    const maxPrev = Math.max(...previas.map((x) => x.h));
    const minPrev = Math.min(...previas.map((x) => x.l));

    if (v.h > maxPrev && v.c < maxPrev && (v.h - Math.max(v.o, v.c)) > (v.h - v.l) * 0.42) {
      out.push({
        tipo: 'barrido', dir: 'bajista',
        nivel: v.h, iRef: i, iRot: i,
        zonaA: v.h, zonaB: maxPrev,
        nombre: 'Barrido de liquidez arriba',
        corto: 'Barrido alcista'
      });
    }
    if (v.l < minPrev && v.c > minPrev && (Math.min(v.o, v.c) - v.l) > (v.h - v.l) * 0.42) {
      out.push({
        tipo: 'barrido', dir: 'alcista',
        nivel: v.l, iRef: i, iRot: i,
        zonaA: minPrev, zonaB: v.l,
        nombre: 'Barrido de liquidez abajo',
        corto: 'Barrido bajista'
      });
    }
  });

  /* ── ORDER BLOCK ──
     La última vela contraria antes de un impulso fuerte. Es donde
     cargaron las órdenes que provocaron el movimiento. */
  const rangos = velas.slice(-60).map((v) => v.h - v.l).sort((a, b) => a - b);
  const rMed = rangos[Math.floor(rangos.length / 2)] || 1;

  for (let i = velas.length - 3; i > Math.max(8, velas.length - 30); i--) {
    const v = velas[i];
    const cuerpo = Math.abs(v.c - v.o);
    if (cuerpo < rMed * 1.4) continue;          // no es impulso
    const alcista = v.c > v.o;

    // La vela contraria justo antes
    for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
      const p = velas[j];
      const contraria = alcista ? p.c < p.o : p.c > p.o;
      if (contraria) {
        /* Volumen real que se negoció dentro de la zona, separando
           velas alcistas de bajistas. Dato calculado, no estimado. */
        const zA = Math.max(p.o, p.c), zB = Math.min(p.o, p.c);
        let volAlc = 0, volBaj = 0;
        velas.forEach((v) => {
          if (v.l > zA || v.h < zB) return;      // no tocó la zona
          if (v.c >= v.o) volAlc += v.v; else volBaj += v.v;
        });

        out.push({
          tipo: 'ob', dir: alcista ? 'alcista' : 'bajista',
          nivel: (p.o + p.c) / 2,
          zonaA: zA, zonaB: zB,
          volAlc, volBaj,
          volTot: volAlc + volBaj,
          iRef: j, iRot: i,
          nombre: alcista ? 'Zona de demanda institucional' : 'Zona de oferta institucional',
          corto: alcista ? 'Order block alcista' : 'Order block bajista'
        });
        break;
      }
    }
    break;   // solo el más reciente
  }

  /* Solo lo reciente y sin duplicar: lo que pasa AHORA. */
  const vistos = new Set();
  return out.filter((e) => {
    const k = e.tipo + e.dir;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  }).slice(0, 4);
}

/* ══════════════════════════════════════════════════════════════
   7. LÍNEA DE TENDENCIA Y CANAL

   Se traza una recta por los mínimos (tendencia alcista) o por los
   máximos (bajista), usando mínimos cuadrados sobre los pivotes
   reales. Si el precio va lateral, se marcan las dos horizontales
   del rango.

   Fiabilidad medida por el sector: las líneas de tendencia rondan
   el 67% de acierto y los canales horizontales el 68%. Por eso se
   dibujan solo cuando el ajuste es bueno de verdad.
   ══════════════════════════════════════════════════════════════ */
function calcularTendencia(velas, piv, tend) {
  /* Ajuste por mínimos cuadrados: la recta que mejor pasa por los
     puntos. No es una estimación a ojo. */
  const recta = (pts) => {
    const n = pts.length;
    if (n < 3) return null;
    let sx = 0, sy = 0, sxy = 0, sxx = 0;
    pts.forEach((p) => { sx += p.i; sy += p.p; sxy += p.i * p.p; sxx += p.i * p.i; });
    const den = n * sxx - sx * sx;
    if (Math.abs(den) < 1e-9) return null;
    const m = (n * sxy - sx * sy) / den;
    const b = (sy - m * sx) / n;

    // Qué tan bien se ajustan los puntos a la recta (R²)
    const media = sy / n;
    let ssTot = 0, ssRes = 0;
    pts.forEach((p) => {
      const est = m * p.i + b;
      ssTot += Math.pow(p.p - media, 2);
      ssRes += Math.pow(p.p - est, 2);
    });
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
    return { m, b, r2, pts };
  };

  /* [CORREGIDO] Casi nunca se trazaba: exigía tendencia ya definida
     Y un ajuste altísimo. Ahora se prueban los dos lados siempre y
     se queda con el que mejor se ajuste, con un umbral razonable.
     Si de verdad no hay recta que valga, no se dibuja: pero eso
     ahora es la excepción, no la norma. */
  const probar = (pts, signo) => {
    if (pts.length < 3) return null;
    // Se prueba con 6, 5 y 4 puntos: la que mejor encaje
    let mejor = null;
    for (const cuantos of [6, 5, 4]) {
      const sub = pts.slice(-cuantos);
      if (sub.length < 3) continue;
      const r = recta(sub);
      if (!r) continue;
      if (signo > 0 && r.m <= 0) continue;
      if (signo < 0 && r.m >= 0) continue;
      if (r.r2 < 0.4) continue;                 // umbral realista
      if (!mejor || r.r2 > mejor.r2) mejor = r;
    }
    return mejor;
  };

  const alc = probar(piv.bajos, 1);
  const baj = probar(piv.altos, -1);

  /* Si hay tendencia declarada, manda ella. Si no, la que mejor
     ajuste tenga. */
  if (tend.dir === 'alcista' && alc) return { tipo: 'alcista', ...alc };
  if (tend.dir === 'bajista' && baj) return { tipo: 'bajista', ...baj };
  if (alc && baj) return alc.r2 >= baj.r2
    ? { tipo: 'alcista', ...alc } : { tipo: 'bajista', ...baj };
  if (alc) return { tipo: 'alcista', ...alc };
  if (baj) return { tipo: 'bajista', ...baj };
  return null;
}

/* ══════════════════════════════════════════════════════════════
   8. DOBLE SUELO Y DOBLE TECHO

   El patrón más fiable según los estudios: 88% de acierto el doble
   suelo cuando lo confirma el volumen. Dos mínimos casi iguales
   separados por un rebote.
   ══════════════════════════════════════════════════════════════ */
function detectarDobles(velas, piv, precio) {
  const out = [];
  const tol = precio * 0.008;          // dos extremos a menos del 0,8% son "iguales"
  const ult = velas.length - 1;

  const buscar = (lista, tipo) => {
    for (let i = lista.length - 1; i >= 1; i--) {
      const b = lista[i], a = lista[i - 1];
      if (ult - b.i > 30) break;                 // solo lo reciente
      if (Math.abs(b.p - a.p) > tol) continue;   // no son iguales
      if (b.i - a.i < 4) continue;               // demasiado juntos

      /* La línea del cuello: el extremo contrario entre los dos.
         El patrón se confirma cuando el precio la rompe. */
      const entre = velas.slice(a.i, b.i + 1);
      if (!entre.length) continue;
      const cuello = tipo === 'suelo'
        ? Math.max(...entre.map((v) => v.h))
        : Math.min(...entre.map((v) => v.l));

      const alturaPct = Math.abs(cuello - b.p) / precio * 100;
      if (alturaPct < 0.8) continue;             // demasiado plano

      out.push({
        tipo: tipo === 'suelo' ? 'dobleSuelo' : 'dobleTecho',
        p1: a, p2: b, cuello,
        nivel: (a.p + b.p) / 2,
        altura: Math.abs(cuello - b.p),
        objetivo: tipo === 'suelo' ? cuello + Math.abs(cuello - b.p) : cuello - Math.abs(cuello - b.p),
        confirmado: tipo === 'suelo' ? precio > cuello : precio < cuello,
        iRef: b.i
      });
      break;
    }
  };
  buscar(piv.bajos, 'suelo');
  buscar(piv.altos, 'techo');
  return out;
}

/* ══════════════════════════════════════════════════════════════
   VWAP ANCLADO CON BANDAS

   El precio medio ponderado por volumen desde un punto concreto.
   Las mesas institucionales lo usan como referencia de "precio
   justo": si están comprando por debajo del VWAP, van ganando.

   Las bandas de desviación marcan hasta dónde es razonable que se
   aleje. Fuera de ±2σ, el precio suele volver.

   Se ancla al inicio del último impulso, que es lo que hace un
   profesional: no al inicio de sesión sin más.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   PERFIL DE VOLUMEN

   Cuánto se negoció en cada nivel de precio. El nivel con más
   volumen (POC) es donde el mercado está de acuerdo, y el precio
   tiende a volver ahí. El área de valor recoge el 70% del volumen:
   fuera de ella, el precio está "caro" o "barato".

   En TradingView esto requiere plan de pago.
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   MAREA — el detector de cambio de ciclo

   Marca dónde la marea del mercado cambia de manos: de compradores a
   vendedores o al revés. NO es un SuperTrend. Un SuperTrend dispara en
   cada sacudida y arruina cuentas. Aquí una señal solo nace cuando
   varias cosas independientes coinciden, y la herramienta CALLA el
   resto del tiempo.

   CÓMO LEE EL MERCADO (nada de esto se dibuja: solo se usa para pensar)

   · HEIKIN ASHI, calculado dentro. Promedia cada vela con la anterior,
     así el ruido se cancela solo y quedan tramos limpios. Un cambio de
     color en Heikin Ashi es un cambio de ciclo de verdad, no un tirón.
   · ADX (índice direccional de Wilder). Dice si HAY tendencia o el
     precio va y viene. Por debajo de 20 es lateral de verdad: no hay
     ciclo que seguir y no se emite nada.
   · RACHAS de color. Dos o tres velas alternas son ruido; una racha
     larga es un ciclo. El giro solo cuenta si venía de un ciclo real.
   · CONFIRMACIÓN de la vela siguiente. La señal se dibuja en la vela
     del giro, pero solo nace cuando algo posterior la confirma dentro
     de una ventana. Así no repinta: una vez puesta, no se mueve.
   · VOLUMEN por encima de la media. Un giro que nadie respalda no vale.
   · RUPTURA DE ESTRUCTURA con margen de ¼ de ATR, para que un roce
     mínimo del nivel en pleno chop no cuente como ruptura.
   · ANCHO DE BANDA mínimo. Si el precio es una raya plana, aunque el
     ADX pegue un salto puntual, no hay recorrido y no se opera.

   FILTROS OBLIGATORIOS CONTRA FALSAS ALERTAS
   · LATERAL — sin fuerza de tendencia medible (ADX<20) o banda
     demasiado estrecha, no se emiten señales y se dice por qué.
   · FIN DE SEMANA — sábado y domingo el volumen cae y las rupturas se
     deshacen el lunes. No se opera y se avisa.
   · DESCANSO — tras una señal se exigen varias velas antes de admitir
     otra, para evitar el vaivén.

   Probado contra escenarios sintéticos (tendencia limpia, crash, pump,
   lateral, doble suelo, alta volatilidad): capta el giro de libro en su
   vela y calla en el lateral.
   ══════════════════════════════════════════════════════════════ */
const MAR = {
  UMBRAL_ADX: 20,    // por debajo: lateral, no hay ciclo
  MIN_CICLO: 3,      // velas HA del mismo color para que el tramo previo cuente
  DESCANSO: 5,       // velas mínimas entre dos señales (mata el vaivén)
  VENTANA_EST: 10,   // velas atrás para el máximo/mínimo de estructura
  VOL_MA: 20,        // media de volumen
  CONF: 10,          // velas de margen para que confirme la ruptura tras el giro
  MARGEN_ATR: 0.25,  // la ruptura debe superar el nivel por ¼ de ATR
  ANCHO_MIN: 2.0,    // banda mínima reciente (%) para que haya recorrido real
  BANDA_VELAS: 14    // ventana para medir el ancho de banda
};

/* Heikin Ashi interno. NO se muestra: solo se lee. */
function heikinAshi(velas) {
  const ha = [];
  for (let i = 0; i < velas.length; i++) {
    const v = velas[i];
    const cierre = (v.o + v.h + v.l + v.c) / 4;
    const apertura = i === 0 ? (v.o + v.c) / 2
                             : (ha[i - 1].o + ha[i - 1].c) / 2;
    ha.push({
      o: apertura, c: cierre,
      h: Math.max(v.h, apertura, cierre),
      l: Math.min(v.l, apertura, cierre),
      color: cierre >= apertura ? 1 : -1
    });
  }
  return ha;
}

/* ADX de Wilder. Devuelve una serie alineada con las velas (los
   primeros huecos son null). +DI/−DI se guardan para el panel. */
function adxSerie(velas, periodo = 14) {
  const n = velas.length;
  const out = new Array(n).fill(null);
  if (n < periodo * 2) return out;

  const trs = [], dmMas = [], dmMenos = [];
  for (let i = 1; i < n; i++) {
    const v = velas[i], p = velas[i - 1];
    const subeMax = v.h - p.h;
    const bajaMin = p.l - v.l;
    dmMas.push(subeMax > bajaMin && subeMax > 0 ? subeMax : 0);
    dmMenos.push(bajaMin > subeMax && bajaMin > 0 ? bajaMin : 0);
    trs.push(Math.max(v.h - v.l, Math.abs(v.h - p.c), Math.abs(v.l - p.c)));
  }

  let trS = trs.slice(0, periodo).reduce((a, b) => a + b, 0);
  let mS = dmMas.slice(0, periodo).reduce((a, b) => a + b, 0);
  let meS = dmMenos.slice(0, periodo).reduce((a, b) => a + b, 0);

  const dxs = [];
  for (let i = periodo; i < trs.length; i++) {
    trS = trS - trS / periodo + trs[i];
    mS = mS - mS / periodo + dmMas[i];
    meS = meS - meS / periodo + dmMenos[i];
    const diMas = trS > 0 ? (mS / trS) * 100 : 0;
    const diMenos = trS > 0 ? (meS / trS) * 100 : 0;
    const suma = diMas + diMenos;
    const dx = suma > 0 ? (Math.abs(diMas - diMenos) / suma) * 100 : 0;
    dxs.push({ i: i + 1, dx, diMas, diMenos });
  }
  if (dxs.length < periodo) return out;

  let adx = dxs.slice(0, periodo).reduce((a, b) => a + b.dx, 0) / periodo;
  const primero = dxs[periodo - 1];
  out[primero.i] = { adx, diMas: primero.diMas, diMenos: primero.diMenos };
  for (let k = periodo; k < dxs.length; k++) {
    adx = (adx * (periodo - 1) + dxs[k].dx) / periodo;
    out[dxs[k].i] = { adx, diMas: dxs[k].diMas, diMenos: dxs[k].diMenos };
  }
  return out;
}

function esFinde(t) {
  const d = new Date(t).getUTCDay();
  return d === 0 || d === 6;   // domingo o sábado (UTC)
}

/* El motor. Recibe las velas y el ATR ya calculado (N.atr). Devuelve
   las señales confirmadas y el estado en vivo del panel. */
function marea(velas, atr) {
  if (!velas || velas.length < 60) return null;
  if (!(atr > 0)) atr = calcularATR(velas);
  if (!(atr > 0)) return null;

  const ha = heikinAshi(velas);
  const adx = adxSerie(velas);
  const n = velas.length;

  const volMA = (i) => {
    const desde = Math.max(0, i - MAR.VOL_MA + 1);
    let s = 0, c = 0;
    for (let k = desde; k <= i; k++) { s += velas[k].v; c++; }
    return c ? s / c : 0;
  };
  const estructura = (i) => {
    const desde = Math.max(0, i - MAR.VENTANA_EST);
    let hi = -Infinity, lo = Infinity;
    for (let k = desde; k < i; k++) {
      if (velas[k].h > hi) hi = velas[k].h;
      if (velas[k].l < lo) lo = velas[k].l;
    }
    return { hi, lo };
  };
  const banda = (i) => {
    const desde = Math.max(0, i - MAR.BANDA_VELAS + 1);
    let hi = -Infinity, lo = Infinity;
    for (let k = desde; k <= i; k++) { if (velas[k].h > hi) hi = velas[k].h; if (velas[k].l < lo) lo = velas[k].l; }
    return velas[i].c > 0 ? ((hi - lo) / velas[i].c) * 100 : 0;
  };

  /* 1) Giros de color de Heikin Ashi y longitud del ciclo previo. */
  const giros = [];
  let colorPrev = ha[0].color, inicioRacha = 0;
  for (let i = 1; i < n; i++) {
    if (ha[i].color === colorPrev) continue;
    giros.push({ i, color: ha[i].color, rachaPrev: i - inicioRacha });
    inicioRacha = i;
    colorPrev = ha[i].color;
  }

  /* 2) Cada giro se evalúa: se dibuja en su vela, pero solo nace cuando
     la ruptura confirma dentro de la ventana (sin repintar). */
  const señales = [];
  const cerrada = (s) => s.valida;
  const margen = atr * MAR.MARGEN_ATR;
  giros.forEach((f) => {
    const i = f.i, color = f.color;
    const dir = color === 1 ? 'compra' : 'venta';
    const est = estructura(i);
    const v = velas[i];

    const cicloPrevio = f.rachaPrev >= MAR.MIN_CICLO;
    const confirmadaColor = i + 1 < n && ha[i + 1].color === color;

    let jConf = -1, volMax = v.v, adxConf = adx[i] ? adx[i].adx : 0;
    for (let j = i + 1; j <= Math.min(i + MAR.CONF, n - 1); j++) {
      if (ha[j].color !== color) break;              // amago: el color se deshizo
      if (velas[j].v > volMax) volMax = velas[j].v;
      const a = adx[j];
      const rompe = dir === 'compra' ? velas[j].c > est.hi + margen
                                     : velas[j].c < est.lo - margen;
      const fuerte = a && a.adx >= MAR.UMBRAL_ADX;
      const anchoOK = banda(j) >= MAR.ANCHO_MIN;
      if (a) adxConf = a.adx;
      if (rompe && fuerte && anchoOK) { jConf = j; break; }
    }

    const ruptura = jConf !== -1;
    const vm = volMA(Math.min(jConf !== -1 ? jConf : i + 1, n - 1));
    const volOK = vm > 0 && volMax >= vm;

    const finde = esFinde(v.t);
    const ultima = señales.filter(cerrada).slice(-1)[0];
    const pronto = ultima && (i - ultima.i) < MAR.DESCANSO;

    /* Nace si: giro confirmado por color (no repinta), ruptura con
       fuerza y recorrido reales, volumen de respaldo, fuera de fin de
       semana y del descanso. */
    const valida = confirmadaColor && ruptura && volOK && !finde && !pronto;

    const met = [cicloPrevio, true, ruptura, volOK, ruptura];
    señales.push({
      i, t: v.t, precio: v.c, dir, color,
      met, cumplidos: met.filter(Boolean).length,
      adx: adxConf, finde, pronto, lateral: !ruptura,
      rachaPrev: f.rachaPrev, valida
    });
  });

  const validas = señales.filter((s) => s.valida);
  const ultima = validas[validas.length - 1] || null;

  /* 3) Estado EN VIVO del panel de probabilidad. El porcentaje NO es una
     predicción: es cuántos requisitos de la señal están ya cumplidos. */
  const iU = n - 1;
  const aU = adx[iU] || { adx: 0, diMas: 0, diMenos: 0 };
  const colorAhora = ha[iU].color;
  const precio = velas[iU].c;
  let estHi = -Infinity, estLo = Infinity;
  for (let k = Math.max(0, iU - MAR.VENTANA_EST); k < iU; k++) {
    if (velas[k].h > estHi) estHi = velas[k].h;
    if (velas[k].l < estLo) estLo = velas[k].l;
  }
  const vmU = volMA(iU);
  const volU = vmU > 0 && velas[iU].v >= vmU;
  const anchoU = banda(iU);
  const fuerzaU = aU.adx >= MAR.UMBRAL_ADX && anchoU >= MAR.ANCHO_MIN;
  const diLong = aU.diMas >= aU.diMenos;
  const diShort = aU.diMenos >= aU.diMas;

  let runLen = 1;
  for (let k = iU - 1; k >= 0; k--) { if (ha[k].color === colorAhora) runLen++; else break; }
  let runPrev = 0;
  { let k = iU - runLen; if (k >= 0) { const cc = ha[k].color; for (; k >= 0 && ha[k].color === cc; k--) runPrev++; } }

  const long = {
    cicloPrevio: colorAhora === -1 ? runLen >= MAR.MIN_CICLO : runPrev >= MAR.MIN_CICLO,
    giroHA: colorAhora === 1,
    fuerza: fuerzaU && diLong,
    volumen: volU,
    ruptura: precio > estHi
  };
  const short = {
    cicloPrevio: colorAhora === 1 ? runLen >= MAR.MIN_CICLO : runPrev >= MAR.MIN_CICLO,
    giroHA: colorAhora === -1,
    fuerza: fuerzaU && diShort,
    volumen: volU,
    ruptura: precio < estLo
  };
  const pctDe = (o) => Math.round((Object.values(o).filter(Boolean).length / 5) * 100);
  const cumplidosDe = (o) => Object.values(o).filter(Boolean).length;
  const faltaLong = precio > estHi ? 0 : ((estHi - precio) / precio) * 100;
  const faltaShort = precio < estLo ? 0 : ((precio - estLo) / precio) * 100;
  const volRel = vmU > 0 ? velas[iU].v / vmU : 0;

  return {
    colorAhora, runLen, anchoAhora: anchoU,
    señales, validas, ultima,
    velasDesde: ultima ? (n - 1 - ultima.i) : null,
    lateral: !fuerzaU,
    /* Por qué está parada: 'adx' (sin tendencia) o 'banda' (sin
       recorrido ahora mismo). El ADX es rezagado, así que puede ser
       alto justo después de un tramo y la banda haberse cerrado: en ese
       caso el motivo real es la banda, no el ADX. */
    motivoLateral: aU.adx < MAR.UMBRAL_ADX ? 'adx' : (anchoU < MAR.ANCHO_MIN ? 'banda' : null),
    finde: esFinde(velas[iU].t),
    panel: {
      adx: aU.adx, diMas: aU.diMas, diMenos: aU.diMenos,
      volRel, runLen, color: colorAhora, ancho: anchoU,
      long:  { pct: pctDe(long),  cumplidos: cumplidosDe(long),  met: long,  falta: faltaLong,  nivel: estHi },
      short: { pct: pctDe(short), cumplidos: cumplidosDe(short), met: short, falta: faltaShort, nivel: estLo }
    }
  };
}


/* ══════════════════════════════════════════════════════════════
   9. ATR — la volatilidad real

   El recorrido medio de una vela. Sirve para poner el stop donde
   tenga sentido: si lo pones más cerca que el ruido normal del
   mercado, te barren sin que la idea falle.
   ══════════════════════════════════════════════════════════════ */
function calcularATR(velas, periodo = 14) {
  if (velas.length < periodo + 1) return 0;
  const trs = [];
  for (let i = 1; i < velas.length; i++) {
    const v = velas[i], p = velas[i - 1];
    trs.push(Math.max(
      v.h - v.l,
      Math.abs(v.h - p.c),
      Math.abs(v.l - p.c)
    ));
  }
  const ult = trs.slice(-periodo);
  return ult.reduce((a, b) => a + b, 0) / ult.length;
}

/* ══════════════════════════════════════════════════════════════
   10. FIBONACCI SOBRE EL IMPULSO

   Se traza sobre el último tramo con dirección clara. La zona
   0,618–0,786 es la que las mesas institucionales usan para
   recargar posición: el llamado golden pocket.

   Según los estudios: Fibonacci solo ronda el 55-65% de acierto,
   pero combinado con una zona institucional sube al 70-80%. Por
   eso solo se marca cuando coincide con estructura.
   ══════════════════════════════════════════════════════════════ */
const FIBS = [
  { r: 0,     et: '0' },
  { r: 0.382, et: '0.382' },
  { r: 0.5,   et: '0.5' },
  { r: 0.618, et: '0.618' },
  { r: 0.705, et: '0.705' },
  { r: 0.786, et: '0.786' },
  { r: 1,     et: '1' }
];


/* ══════════════════════════════════════════════════════════════
   11. EL PLAN DE OPERACIÓN COMPLETO

   Lo que pide un profesional y hasta ahora faltaba:
     · Entrada exacta
     · Stop con lógica estructural, no arbitrario
     · Objetivo 1, objetivo 2 y objetivo final
     · Zona de peligro: dónde la idea deja de valer
     · Relación riesgo/beneficio calculada
     · Cuánto arriesgar del capital
   ══════════════════════════════════════════════════════════════ */
function construirPlan(lado, entrada, stopBase, atr) {
  if (!(entrada > 0) || !(atr > 0)) return null;
  const largo = lado === 'compra';

  /* El stop respeta la estructura Y la volatilidad: nunca más
     cerca que 1,2 veces el ATR, o el ruido normal lo barre. */
  const minDist = atr * 1.2;
  let stop = stopBase;
  if (largo && entrada - stop < minDist) stop = entrada - minDist;
  if (!largo && stop - entrada < minDist) stop = entrada + minDist;

  const riesgo = Math.abs(entrada - stop);
  if (!(riesgo > 0)) return null;

  /* Objetivos escalonados: 1R para asegurar, 2R el principal,
     3R el que se deja correr. Es el estándar profesional. */
  const obj = [1, 2, 3].map((r) => ({
    r,
    p: largo ? entrada + riesgo * r : entrada - riesgo * r,
    pct: ((riesgo * r) / entrada) * 100
  }));

  return {
    lado, entrada, stop, riesgo,
    riesgoPct: (riesgo / entrada) * 100,
    obj,
    rr: 2,
    atr
  };
}

/* ══════════════════════════════════════════════════════════════
   12. LA LECTURA — qué decirle al usuario

   Aquí no se inventa nada: cada frase sale de un dato calculado.
   Y hay varias formas de decir lo mismo, para que no suene a
   máquina repitiendo la misma línea.
   ══════════════════════════════════════════════════════════════ */
function analizar() {
  const v = N.velas;
  if (v.length < 40) { N.mensajes = []; return; }

  const piv = pivotes(v);
  N.tendencia = tendencia(v, piv);
  N.rango = detectarRango(v);
  N.impulso = detectarImpulso(v);
  N.estructuras = detectarEstructuras(v, piv);
  N.linea = calcularTendencia(v, piv, N.tendencia);
  N.dobles = detectarDobles(v, piv, N.precio);
  N.atr = calcularATR(v);
  N.marea = marea(v, N.atr);
  N.precio = v[v.length - 1].c;
  N.niveles = calcularNiveles(v, piv, N.precio);

  /* [CORREGIDO] Si el mercado está en rango, el asistente dice "no
     entres" — así que dibujar seis niveles de compra sería
     contradictorio. En rango solo se marcan los bordes de la banda,
     que es lo único operable ahí. */
  if (N.rango) {
    N.niveles = N.niveles.filter((x) =>
      Math.abs(x.p - N.rango.alto) / N.precio < 0.008 ||
      Math.abs(x.p - N.rango.bajo) / N.precio < 0.008
    ).slice(0, 2);
  }

  const msgs = [];

  /* ══ EL ESCENARIO DE LIBRO: impulso + retesteo ══
     Va primero porque es el más operable. Un impulso fuerte deja
     una zona de origen; cuando el precio vuelve ahí, quien lo
     provocó suele defenderla otra vez. */
  const imp = N.impulso;
  if (imp && imp.invalidado) {
    /* El precio se comió el impulso entero: la estructura ya no
       vale. Decirlo es más útil que inventar una entrada. */
    msgs.push({
      tipo: 'aviso', p: N.precio, prioridad: 7,
      titulo: elegir(['Estructura rota', 'El impulso se agotó', 'Ya no hay setup aquí']),
      txt: elegir([
        `El precio se pasó de la zona que originó el último impulso ${imp.dir}. Cuando eso ocurre, la estructura deja de servir como referencia.`,
        `El movimiento ${imp.dir} se ha deshecho por completo. La zona de origen ya no aguanta.`,
        `El retroceso superó el punto de partida del impulso: esa estructura está invalidada.`
      ]),
      hacer: elegir([
        'Espere a que se forme una estructura nueva. Operar sobre una rota es lo que más caro sale.',
        'No hay referencia válida ahora mismo. Deje que el mercado construya un impulso nuevo.',
        'Cambie de marco temporal o de par: aquí ya no queda nada que operar.'
      ]),
      detalle: [
        `Impulso ${imp.dir} de ${imp.pct.toFixed(2)}%`,
        `Retroceso: ${Math.round(imp.retrocesoReal)}% (por encima del 100% = invalidado)`,
        `Zona de origen: ${fmt(imp.zonaBaja)} – ${fmt(imp.zonaAlta)}`,
        `Han pasado ${imp.velasDesde} velas desde que terminó`
      ]
    });
  } else if (imp && (imp.enZona || imp.acercandose)) {
    const alcista = imp.dir === 'alcista';
    const zA = imp.zonaAlta, zB = imp.zonaBaja;
    const stop = alcista ? zB * 0.993 : zA * 1.007;
    const objetivo = imp.precioFin;
    const riesgo = Math.abs(N.precio - stop);
    const premio = Math.abs(objetivo - N.precio);
    const rr = riesgo > 0 ? premio / riesgo : 0;

    msgs.push({
      tipo: alcista ? 'compra' : 'venta',
      p: imp.zonaMedia,
      prioridad: 10,
      titulo: imp.enZona
        ? elegir([
            alcista ? 'Retesteo en zona de compra' : 'Retesteo en zona de venta',
            alcista ? 'El precio volvió al origen alcista' : 'El precio volvió al origen bajista',
            'Retesteo del impulso'
          ])
        : elegir([
            'El precio se acerca a la zona',
            alcista ? 'Retroceso hacia el origen alcista' : 'Retroceso hacia el origen bajista',
            'Prepárese: retesteo en camino'
          ]),
      txt: imp.enZona
        ? elegir([
            `Hubo un impulso ${alcista ? 'alcista' : 'bajista'} del ${imp.pct.toFixed(1)}% en ${imp.velas} velas, y el precio ha vuelto a la zona donde nació (${fmt(zB)}–${fmt(zA)}). Está dentro de ella ahora mismo.`,
            `El precio ha retrocedido un ${Math.round(imp.retroceso)}% del impulso ${alcista ? 'alcista' : 'bajista'} y está tocando su zona de origen. Ahí es donde entró el dinero que lo movió.`,
            `Impulso ${alcista ? 'alcista' : 'bajista'} de ${imp.pct.toFixed(1)}% y retesteo completo: el precio está en ${fmt(zB)}–${fmt(zA)}, justo donde arrancó el movimiento.`
          ])
        : elegir([
            `Hubo un impulso ${alcista ? 'alcista' : 'bajista'} del ${imp.pct.toFixed(1)}% y el precio está retrocediendo hacia su origen. Queda un ${Math.abs(imp.distZona).toFixed(1)}% para llegar a ${fmt(zB)}–${fmt(zA)}.`,
            `El precio ha devuelto un ${Math.round(imp.retroceso)}% del impulso. La zona de origen está a un ${Math.abs(imp.distZona).toFixed(1)}%.`,
            `Retroceso en marcha hacia ${fmt(zB)}–${fmt(zA)}, la zona que originó el último impulso ${alcista ? 'alcista' : 'bajista'}.`
          ]),
      hacer: imp.enZona
        ? elegir([
            `${alcista ? 'Compra' : 'Venta'} en esta zona con stop ${alcista ? 'debajo de' : 'encima de'} ${fmt(stop)}. Objetivo el máximo del impulso: ${fmt(objetivo)}. Relación riesgo/beneficio ${rr.toFixed(1)}:1.`,
            `Entrada a favor del impulso. Stop en ${fmt(stop)}, objetivo ${fmt(objetivo)}. Si pierde la zona, la estructura se rompe y hay que salir.`,
            `Es la entrada que busca un trader de estructura: stop ajustado en ${fmt(stop)} y recorrido hasta ${fmt(objetivo)}. Riesgo/beneficio de ${rr.toFixed(1)} a 1.`
          ])
        : elegir([
            `Todavía no ha llegado. Ponga alerta en ${fmt(imp.zonaMedia)} y espere a que el precio entre en la zona antes de operar.`,
            `Prepare la entrada pero no la ejecute aún: espere a que toque ${fmt(zB)}–${fmt(zA)} y reaccione ahí.`,
            `Falta un ${Math.abs(imp.distZona).toFixed(1)}%. Entrar antes de tiempo es lo que estropea esta operación.`
          ]),
      detalle: [
        `Impulso ${alcista ? 'alcista' : 'bajista'} de ${imp.pct.toFixed(2)}% en ${imp.velas} velas`,
        `Zona de origen: ${fmt(zB)} – ${fmt(zA)}`,
        `Retroceso actual: ${Math.round(imp.retroceso)}% del movimiento`,
        `Stop sugerido: ${fmt(stop)}`,
        `Objetivo: ${fmt(objetivo)} · Riesgo/beneficio ${rr.toFixed(1)}:1`,
        `Han pasado ${imp.velasDesde} velas desde que terminó el impulso`,
        `Vigencia: mientras el precio no cierre ${alcista ? 'por debajo de' : 'por encima de'} ${fmt(stop)}`
      ]
    });
  }

  /* ══ MENSAJES DE ESTRUCTURA ══
     Cada patrón detectado tiene su lectura y su recomendación, con
     varias formas de decirlo. Todo sale de datos, nada inventado. */
  (N.estructuras || []).forEach((e) => {
    const alc = e.dir === 'alcista';

    if (e.tipo === 'bos') {
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: 8, marca: e,
        titulo: elegir([e.nombre, alc ? 'Estructura rota al alza' : 'Estructura rota a la baja',
                        alc ? 'Continuación alcista confirmada' : 'Continuación bajista confirmada']),
        txt: elegir([
          `El precio cerró ${alc ? 'por encima' : 'por debajo'} de ${fmt(e.nivel)}, rompiendo el último ${alc ? 'máximo' : 'mínimo'} de estructura. La tendencia ${alc ? 'alcista' : 'bajista'} continúa.`,
          `Ruptura confirmada en ${fmt(e.nivel)}: el cierre superó ese nivel, no fue solo una mecha. Eso valida la continuación.`,
          `${alc ? 'Los compradores' : 'Los vendedores'} rompieron ${fmt(e.nivel)} con cierre de cuerpo. La estructura sigue ${alc ? 'al alza' : 'a la baja'}.`
        ]),
        hacer: elegir([
          `Tras una ruptura, lo que funciona es esperar el retroceso a ${fmt(e.nivel)}: ese nivel roto suele convertirse en ${alc ? 'soporte' : 'resistencia'}.`,
          `No persiga el movimiento. Espere a que el precio vuelva a ${fmt(e.nivel)} y reaccione ahí: es la entrada con menos riesgo.`,
          `Opere a favor de la ruptura, pero en el retroceso. Entrar ahora es entrar en el peor precio del movimiento.`
        ]),
        detalle: [
          `Nivel roto: ${fmt(e.nivel)}`,
          `Ruptura confirmada por cierre de cuerpo, no por mecha`,
          `Tipo: ruptura de estructura (BOS) ${alc ? 'alcista' : 'bajista'}`,
          `Lo que suele pasar: el nivel roto pasa a ser ${alc ? 'soporte' : 'resistencia'}`,
          `Vigencia: hasta que el precio cierre de vuelta al otro lado`
        ]
      });
    }

    if (e.tipo === 'choch') {
      msgs.push({
        tipo: 'vigilar', p: e.nivel, prioridad: 9, marca: e,
        titulo: elegir([e.nombre, 'Posible giro del ciclo', 'El mercado cambia de carácter']),
        txt: elegir([
          `El precio cerró ${alc ? 'por encima' : 'por debajo'} de ${fmt(e.nivel)}, rompiendo la estructura anterior por primera vez en sentido contrario. Es el primer aviso de giro.`,
          `Cambio de carácter en ${fmt(e.nivel)}: se ha roto el patrón que traía el mercado. Puede estar girando.`,
          `Primera señal de agotamiento: ${fmt(e.nivel)} cedió y eso rompe la secuencia que venía cumpliéndose.`
        ]),
        hacer: elegir([
          `Un cambio de carácter es un aviso, no una entrada. Espere a que el precio retroceda a una zona ${alc ? 'de demanda' : 'de oferta'} y reaccione ahí.`,
          `No entre solo por esto. Marque el nivel y espere confirmación: la primera ruptura suele fallar sin retroceso.`,
          `Reduzca exposición en la dirección anterior. El ciclo puede estar cambiando, pero aún no está confirmado.`
        ]),
        detalle: [
          `Nivel de referencia: ${fmt(e.nivel)}`,
          `Tipo: cambio de carácter (CHoCH) ${alc ? 'alcista' : 'bajista'}`,
          `Es el PRIMER giro contra la tendencia, no una confirmación`,
          `Lo correcto: esperar retroceso a zona institucional antes de entrar`,
          `Se invalida si el precio recupera el lado anterior`
        ]
      });
    }

    if (e.tipo === 'ob') {
      const dist = ((e.nivel - N.precio) / N.precio) * 100;
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: Math.abs(dist) < 2 ? 9 : 6, marca: e,
        titulo: elegir([e.nombre, alc ? 'Zona donde compró el dinero grande' : 'Zona donde vendió el dinero grande',
                        alc ? 'Order block alcista' : 'Order block bajista']),
        txt: elegir([
          `Antes del último impulso hubo una vela ${alc ? 'bajista' : 'alcista'} en ${fmt(e.zonaB)}–${fmt(e.zonaA)}: ahí es donde se cargaron las órdenes que movieron el precio. Está a un ${Math.abs(dist).toFixed(1)}%.`,
          `La zona ${fmt(e.zonaB)}–${fmt(e.zonaA)} originó el impulso. Es donde entró el volumen institucional, y suele defenderse cuando el precio vuelve.`,
          `Zona institucional marcada en ${fmt(e.zonaB)}–${fmt(e.zonaA)}. El precio salió de ahí con fuerza, y por eso importa.`
        ]),
        hacer: Math.abs(dist) < 2
          ? elegir([
              `El precio está en la zona. Entrada ${alc ? 'larga' : 'corta'} con stop ${alc ? 'debajo de' : 'encima de'} ${fmt(alc ? e.zonaB * 0.994 : e.zonaA * 1.006)}.`,
              `Es el momento: reacción en zona institucional. Stop ajustado justo al otro lado del bloque.`,
              `Zona activa ahora mismo. Si el precio reacciona aquí, es la entrada; si la atraviesa con cierre, se invalida.`
            ])
          : elegir([
              `Ponga alerta en ${fmt(e.nivel)}. Cuando el precio llegue a la zona, ahí se decide.`,
              `Aún no ha llegado: falta un ${Math.abs(dist).toFixed(1)}%. Prepare la entrada pero no la ejecute.`,
              `Marque esta zona y espere. Entrar antes de que el precio la toque es adelantarse sin motivo.`
            ]),
        detalle: [
          `Zona: ${fmt(e.zonaB)} – ${fmt(e.zonaA)}`,
          `Es la última vela ${alc ? 'bajista' : 'alcista'} antes del impulso`,
          `Distancia al precio: ${Math.abs(dist).toFixed(2)}%`,
          `Se invalida si el precio cierra al otro lado de la zona`,
          `Concepto: order block, donde cargó el volumen institucional`
        ]
      });
    }

    if (e.tipo === 'barrido') {
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: 7, marca: e,
        titulo: elegir([e.nombre, 'Trampa de liquidez', alc ? 'Cazaron stops abajo' : 'Cazaron stops arriba']),
        txt: elegir([
          `El precio se pasó de ${fmt(e.nivel)} con la mecha pero cerró de vuelta. Han recogido los stops de quien estaba ${alc ? 'largo' : 'corto'} y han devuelto el precio.`,
          `Barrido en ${fmt(e.nivel)}: la mecha atravesó el extremo pero el cuerpo cerró dentro. Es una trampa clásica.`,
          `Movimiento falso en ${fmt(e.nivel)}. Se llevaron la liquidez que había ahí y el precio volvió.`
        ]),
        hacer: elegir([
          `Tras un barrido, el precio suele irse ${alc ? 'al alza' : 'a la baja'}. Entrada a favor con stop ${alc ? 'debajo de' : 'encima de'} ${fmt(e.nivel)}.`,
          `Opere en contra del barrido: quien puso los stops ahí ya está fuera. Stop al otro lado de la mecha.`,
          `Es de las señales más fiables cuando coincide con una zona institucional. Stop ajustado tras el extremo de la mecha.`
        ]),
        detalle: [
          `Extremo barrido: ${fmt(e.nivel)}`,
          `La mecha superó el nivel pero el cuerpo cerró de vuelta`,
          `Significa que se ejecutaron stops y el precio se devolvió`,
          `Stop sugerido: al otro lado del extremo de la mecha`,
          `Concepto: barrido de liquidez (liquidity sweep)`
        ]
      });
    }
  });

  /* ══ MAREA ══
     Solo habla si la herramienta está encendida y tiene algo real
     que contar. */
  if (N.verMarea && N.marea) {
    const MA = N.marea;

    if (MA.finde) {
      msgs.push({
        tipo: 'aviso', p: N.precio, prioridad: 6,
        titulo: elegir(['Fin de semana', 'Marea en calma', 'Mercado de fin de semana']),
        txt: elegir([
          'Sábado y domingo el volumen cae en picado y las señales de cambio de ciclo fallan mucho más. La herramienta no opera hoy.',
          'Es fin de semana: menos participantes, movimientos exagerados y rupturas que no aguantan el lunes.',
          'Marea solo trabaja de lunes a viernes. En fin de semana el mercado engaña.'
        ]),
        hacer: elegir([
          'Espere al lunes. Lo que se rompe en fin de semana suele deshacerse cuando vuelve el volumen real.',
          'No abra posiciones nuevas basándose en lo que pase hoy o mañana.',
          'Use estos días para preparar niveles, no para entrar.'
        ]),
        detalle: [
          'Marea opera de lunes a viernes',
          'En fin de semana el volumen baja entre un 40% y un 60%',
          'Las rupturas de fin de semana se revierten con frecuencia'
        ]
      });
    } else if (MA.lateral) {
      const porADX = MA.motivoLateral !== 'banda';
      msgs.push({
        tipo: 'aviso', p: N.precio, prioridad: 6,
        titulo: elegir(['Mercado lateral', 'Sin ciclo definido', 'Marea en espera']),
        txt: porADX
          ? elegir([
              `No hay fuerza de tendencia medible: el ADX está en ${MA.panel.adx.toFixed(0)}, por debajo de 20. El precio va y viene y cualquier giro es ruido.`,
              'El precio no tiene dirección clara. Aquí un cambio de color no significa nada.',
              'No hay ciclo que seguir: el precio está lateral y las señales aquí fallan.'
            ])
          : elegir([
              `El precio se ha quedado sin recorrido: la banda reciente es de solo ${MA.anchoAhora.toFixed(1)}%. Aunque venga de un tramo fuerte, ahora mismo está plano y no hay señal que valga.`,
              `Sin recorrido en las últimas velas (banda ${MA.anchoAhora.toFixed(1)}%). Marea espera a que el precio vuelva a moverse.`,
              'El movimiento se ha frenado. Hasta que no haya recorrido de nuevo, no se opera.'
            ]),
        hacer: elegir([
          'Espere a que el precio salga con volumen. Ahí sí habrá una señal que valga.',
          'En lateral, lo rentable es operar los bordes, no seguir la tendencia.',
          'Marea vuelve a hablar cuando haya un movimiento con recorrido.'
        ]),
        detalle: [
          `Fuerza de tendencia (ADX): ${MA.panel.adx.toFixed(0)} · se opera desde 20`,
          `Banda reciente: ${MA.anchoAhora.toFixed(2)}% · se opera desde 2%`,
          'Las señales de ciclo sin recorrido tienen el peor rendimiento'
        ]
      });
    } else if (MA.ultima && MA.velasDesde != null && MA.velasDesde < 25) {
      const sg = MA.ultima;
      const alc = sg.dir === 'compra';
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: sg.precio, prioridad: 10,
        iAncla: sg.i,
        titulo: elegir([
          alc ? 'Marea marcó LONG' : 'Marea marcó SHORT',
          alc ? 'La marea cambió a comprador' : 'La marea cambió a vendedor',
          'Cambio de ciclo confirmado'
        ]),
        txt: elegir([
          `El ciclo cambió de manos en ${fmt(sg.precio)}, hace ${MA.velasDesde} ${MA.velasDesde === 1 ? 'vela' : 'velas'}. El giro de Heikin Ashi se confirmó con ruptura de estructura, volumen y fuerza de tendencia real.`,
          `Hubo un giro confirmado en ${fmt(sg.precio)}: la marea del mercado se dio la vuelta y la vela siguiente lo confirmó, así que no repinta.`,
          `Marea detectó el cambio en ${fmt(sg.precio)}. No es un cruce cualquiera: pasó todos los filtros (fuerza, volumen y ruptura).`
        ]),
        hacer: alc
          ? elegir([
              'El lado comprador tomó el control. Busque entradas en los retrocesos, no persiga el precio aquí arriba.',
              'Opere a favor mientras la marea siga del lado comprador.',
              'Mantenga la dirección larga hasta que la marea vuelva a cambiar.'
            ])
          : elegir([
              'El lado vendedor tomó el control. Busque ventas en los rebotes, no persiga la caída.',
              'Opere a favor mientras la marea siga del lado vendedor.',
              'Mantenga la dirección corta hasta que la marea vuelva a cambiar.'
            ]),
        detalle: [
          `Señal en ${fmt(sg.precio)}`,
          `Fuerza de tendencia (ADX): ${sg.adx.toFixed(0)}`,
          `Confirmadores cumplidos: ${sg.cumplidos} de 5`,
          'Giro de Heikin Ashi confirmado por la vela siguiente (no repinta)',
          `Señales descartadas por los filtros: ${MA.señales.length - MA.validas.length}`
        ]
      });
    }
  }

  /* ══ LA LÍNEA DE TENDENCIA ══ */
  if (N.linea) {
    const alc = N.linea.tipo === 'alcista';
    const ajuste = Math.round(N.linea.r2 * 100);
    msgs.push({
      tipo: 'tendencia', p: N.linea.m * (v.length - 1) + N.linea.b, prioridad: 5,
      iAncla: N.linea.pts[Math.floor(N.linea.pts.length / 2)].i,
      titulo: elegir([
        alc ? 'Línea de tendencia alcista' : 'Línea de tendencia bajista',
        alc ? 'El precio sube apoyado' : 'El precio cae con techo',
        'Tendencia trazada'
      ]),
      txt: elegir([
        `He trazado la línea que une los últimos ${N.linea.pts.length} ${alc ? 'mínimos' : 'máximos'}. Se ajusta al ${ajuste}%, así que es una guía fiable mientras el precio la respete.`,
        `Los ${alc ? 'suelos' : 'techos'} van formando una recta con ${ajuste}% de ajuste. Esa línea es la referencia de la tendencia ${alc ? 'alcista' : 'bajista'}.`,
        `Línea de tendencia ${alc ? 'alcista' : 'bajista'} trazada sobre ${N.linea.pts.length} puntos, con un ajuste del ${ajuste}%.`
      ]),
      hacer: elegir([
        alc ? 'Mientras el precio no cierre por debajo de la línea, la tendencia sigue viva. Las compras en los toques a la línea son las de menos riesgo.'
            : 'Mientras el precio no cierre por encima de la línea, la caída sigue. Las ventas en los toques a la línea son las de menos riesgo.',
        alc ? 'Compre en los apoyos sobre la línea, no en mitad del tramo. Si la pierde con cierre, se acabó la tendencia.'
            : 'Venda en los rechazos contra la línea. Si la rompe con cierre, se acabó la caída.',
        'Use la línea como filtro: opere solo a favor mientras aguante, y salga si el precio la atraviesa con cuerpo.'
      ]),
      detalle: [
        `Trazada sobre ${N.linea.pts.length} pivotes reales`,
        `Ajuste estadístico (R²): ${ajuste}%`,
        `Las líneas de tendencia rondan el 67% de acierto según estudios del sector`,
        `Se invalida con un cierre al otro lado, no con una mecha`,
        `Dirección: ${alc ? 'alcista' : 'bajista'}`
      ]
    });
  }

  /* ══ DOBLE SUELO / DOBLE TECHO ══ */
  (N.dobles || []).forEach((d) => {
    const suelo = d.tipo === 'dobleSuelo';
    msgs.push({
      tipo: suelo ? 'compra' : 'venta', p: d.nivel, prioridad: d.confirmado ? 9 : 6,
      iAncla: d.p2.i,
      titulo: elegir([
        suelo ? 'Doble suelo' : 'Doble techo',
        suelo ? 'Suelo probado dos veces' : 'Techo rechazado dos veces',
        d.confirmado ? (suelo ? 'Doble suelo confirmado' : 'Doble techo confirmado') : (suelo ? 'Doble suelo en formación' : 'Doble techo en formación')
      ]),
      txt: elegir([
        `El precio hizo dos ${suelo ? 'mínimos' : 'máximos'} casi iguales en ${fmt(d.nivel)}. ${d.confirmado ? `Ya rompió el cuello en ${fmt(d.cuello)}, así que el patrón está confirmado.` : `Falta romper el cuello en ${fmt(d.cuello)} para confirmarlo.`}`,
        `Dos ${suelo ? 'suelos' : 'techos'} en ${fmt(d.nivel)} y un cuello en ${fmt(d.cuello)}. ${d.confirmado ? 'Confirmado.' : 'Aún sin confirmar.'}`,
        `Patrón de ${suelo ? 'doble suelo' : 'doble techo'} formado en ${fmt(d.nivel)}. ${d.confirmado ? 'El cuello ya cedió.' : 'Pendiente de que el cuello ceda.'}`
      ]),
      hacer: d.confirmado
        ? elegir([
            `Objetivo del patrón: ${fmt(d.objetivo)}, que es la altura proyectada desde el cuello. Stop ${suelo ? 'debajo de' : 'encima de'} ${fmt(d.nivel)}.`,
            `Entrada tras la confirmación, con objetivo en ${fmt(d.objetivo)} y stop al otro lado de ${fmt(d.nivel)}.`,
            `Patrón activo. Proyección hasta ${fmt(d.objetivo)}; invalidación si vuelve a ${fmt(d.nivel)}.`
          ])
        : elegir([
            `No entre todavía. El patrón solo vale cuando el precio cierra ${suelo ? 'por encima' : 'por debajo'} del cuello en ${fmt(d.cuello)}.`,
            `Espere el cierre más allá de ${fmt(d.cuello)}. Sin eso, no hay patrón: solo dos toques.`,
            `Marque ${fmt(d.cuello)} y espere. Adelantarse a la confirmación es el error más común con este patrón.`
          ]),
      detalle: [
        `Nivel del patrón: ${fmt(d.nivel)}`,
        `Línea de cuello: ${fmt(d.cuello)}`,
        `Objetivo proyectado: ${fmt(d.objetivo)}`,
        `Estado: ${d.confirmado ? 'confirmado por cierre' : 'pendiente de confirmación'}`,
        suelo ? 'El doble suelo tiene un 88% de acierto según estudios de 2026' : 'El doble techo tiene un 68% de acierto en estudios recientes',
        'Solo cuenta el cierre del cuerpo, no las mechas'
      ]
    });
  });

  const soportes = N.niveles.filter((x) => x.tipo === 'soporte' && x.p < N.precio);
  const resist = N.niveles.filter((x) => x.tipo === 'resistencia' && x.p > N.precio);
  const sCerca = soportes[0];
  const rCerca = resist[resist.length - 1];

  /* ── SITUACIÓN 1: el precio está en rango ──
     No hay entrada de tendencia. Se dice claramente. */
  if (N.rango) {
    msgs.push({
      tipo: 'aviso',
      p: N.precio,
      titulo: elegir(['Mercado lateral', 'Sin dirección clara', 'El precio está atrapado']),
      txt: elegir([
        `${_par} lleva ${Math.round(N.rango.pctDentro)}% del tiempo dentro de una banda del ${N.rango.amplitud.toFixed(1)}%. No hay tendencia que seguir.`,
        `El precio oscila entre ${fmt(N.rango.bajo)} y ${fmt(N.rango.alto)} sin decidirse. Amplitud de solo ${N.rango.amplitud.toFixed(1)}%.`,
        `Banda estrecha de ${N.rango.amplitud.toFixed(1)}%: el precio no se ha ido a ningún lado en las últimas ${Math.min(50, v.length)} velas.`
      ]),
      hacer: elegir([
        'En rango, las entradas de tendencia fallan. Espere a que rompa la banda, o busque otra moneda con dirección definida.',
        'No fuerce una entrada aquí. O espera la ruptura del rango, o cambia de par: hay mercados con más claridad ahora.',
        'Lo rentable en rango es comprar abajo y vender arriba de la banda, pero con poco recorrido. Si busca tendencia, este no es el par.'
      ]),
      detalle: [
        `Techo de la banda: ${fmt(N.rango.alto)}`,
        `Suelo de la banda: ${fmt(N.rango.bajo)}`,
        `El precio cerró dentro de la zona central en ${Math.round(N.rango.pctDentro)}% de las velas`,
        `Una banda por debajo del 6% se considera lateral para este marco temporal`
      ]
    });
  }

  /* ── SITUACIÓN 2: hay soporte cerca y tendencia a favor ── */
  if (sCerca && !N.rango) {
    const d = Math.abs(sCerca.dist);
    const alcista = N.tendencia.dir === 'alcista';
    const stop = sCerca.p * 0.994;

    /* Antes solo hablaba si el nivel estaba a menos del 2,5%: en la
       práctica casi nunca, y por eso salía el mensaje de relleno. */
    if (d < 6) {
      msgs.push({
        tipo: alcista ? 'compra' : 'vigilar',
        p: sCerca.p,
        nivel: sCerca,
        titulo: alcista
          ? elegir(['Zona de compra', 'Soporte a favor de tendencia', 'Entrada al alza'])
          : elegir(['Soporte cercano', 'Nivel que ya aguantó', 'Zona de reacción']),
        txt: elegir([
          `Soporte en ${fmt(sCerca.p)} que el precio respetó ${sCerca.toques} veces. Está a ${d.toFixed(2)}% por debajo.`,
          `El precio giró ${sCerca.toques} veces en ${fmt(sCerca.p)}. Ahora vuelve a acercarse: queda ${d.toFixed(2)}%.`,
          `${fmt(sCerca.p)} ha frenado la caída en ${sCerca.toques} ocasiones. El precio está a un ${d.toFixed(2)}%.`
        ]),
        hacer: alcista
          ? elegir([
              `Con la tendencia alcista y este soporte cerca, una entrada en ${fmt(sCerca.p)} tiene la estructura a favor. Stop por debajo de ${fmt(stop)}.`,
              `Compra en ${fmt(sCerca.p)} con stop en ${fmt(stop)}. La tendencia acompaña y el nivel tiene ${sCerca.toques} toques detrás.`,
              `Si el precio llega a ${fmt(sCerca.p)} y reacciona, es entrada. Proteja por debajo de ${fmt(stop)}${rCerca ? ` y busque salida hacia ${fmt(rCerca.p)}` : ''}.`
            ])
          : elegir([
              `La tendencia no acompaña, así que no es una compra clara. Si el precio pierde ${fmt(sCerca.p)}, se abre camino a la baja.`,
              `Ojo: el nivel es real pero la tendencia va en contra. Espere confirmación antes de comprar aquí.`,
              `Vigile ${fmt(sCerca.p)}. Si aguanta puede haber rebote, pero contra tendencia el riesgo es mayor.`
            ]),
        detalle: [
          `Toques confirmados: ${sCerca.toques}`,
          `Volumen negociado en la zona: ${sCerca.volPct.toFixed(1)}% del total`,
          `Fuerza del nivel: ${sCerca.fuerza}/100`,
          `Tendencia actual: ${nombreTend(N.tendencia.dir)}`,
          `Stop sugerido: ${fmt(stop)} (0,6% por debajo del nivel)`
        ]
      });
    }
  }

  /* ── SITUACIÓN 3: resistencia cerca ── */
  if (rCerca && !N.rango) {
    const d = Math.abs(rCerca.dist);
    const bajista = N.tendencia.dir === 'bajista';
    if (d < 6) {
      msgs.push({
        tipo: bajista ? 'venta' : 'vigilar',
        p: rCerca.p,
        nivel: rCerca,
        titulo: bajista
          ? elegir(['Zona de venta', 'Resistencia a favor de tendencia', 'Entrada a la baja'])
          : elegir(['Resistencia cercana', 'Techo que ya rechazó', 'Zona de rechazo']),
        txt: elegir([
          `Resistencia en ${fmt(rCerca.p)} que rechazó el precio ${rCerca.toques} veces. Está a ${d.toFixed(2)}%.`,
          `El precio se dio la vuelta ${rCerca.toques} veces en ${fmt(rCerca.p)}. Vuelve a acercarse.`,
          `${fmt(rCerca.p)} ha frenado ${rCerca.toques} subidas. Queda un ${d.toFixed(2)}% para llegar.`
        ]),
        hacer: bajista
          ? elegir([
              `Con tendencia bajista, vender en ${fmt(rCerca.p)} tiene la estructura a favor. Stop por encima de ${fmt(rCerca.p * 1.006)}.`,
              `Si el precio sube a ${fmt(rCerca.p)} y se frena, es entrada corta. Proteja arriba de ${fmt(rCerca.p * 1.006)}.`,
              `Zona de venta en ${fmt(rCerca.p)}. La tendencia acompaña y el nivel tiene ${rCerca.toques} rechazos.`
            ])
          : elegir([
              `Si va largo, plantéese recoger beneficios antes de ${fmt(rCerca.p)}. Ahí es donde el precio se ha frenado antes.`,
              `${fmt(rCerca.p)} es el obstáculo. Si lo rompe con volumen, se abre camino arriba; si no, espere rechazo.`,
              `No compre justo debajo de esta resistencia. Espere a que la rompa o a que rebote desde más abajo.`
            ]),
        detalle: [
          `Rechazos confirmados: ${rCerca.toques}`,
          `Volumen negociado en la zona: ${rCerca.volPct.toFixed(1)}% del total`,
          `Fuerza del nivel: ${rCerca.fuerza}/100`,
          `Tendencia actual: ${nombreTend(N.tendencia.dir)}`
        ]
      });
    }
  }

  /* ── SITUACIÓN 4: precio en tierra de nadie ── */
  /* [CORREGIDO] Este mensaje de relleno acababa siendo el principal
     aunque hubiera lecturas reales. Ahora solo se añade si de verdad
     no hay ninguna otra, y con prioridad mínima. */
  if (!msgs.length) {
    const haciaS = sCerca ? Math.abs(sCerca.dist) : null;
    const haciaR = rCerca ? Math.abs(rCerca.dist) : null;
    msgs.push({
      prioridad: 1,
      tipo: 'aviso',
      p: N.precio,
      titulo: elegir(['Sin entrada clara', 'El precio está en el medio', 'Nada que hacer ahora']),
      txt: elegir([
        `${_par} no está cerca de ningún nivel importante. ${haciaS ? `El soporte más próximo está a ${haciaS.toFixed(1)}%` : 'No hay soportes cercanos'}${haciaR ? ` y la resistencia a ${haciaR.toFixed(1)}%` : ''}.`,
        `El precio se mueve entre niveles, sin tocar ninguno. Entrar aquí es entrar a ciegas.`,
        `No hay confluencia ahora mismo: el precio está lejos de las zonas donde ha reaccionado antes.`
      ]),
      hacer: elegir([
        'Esperar. Las mejores entradas salen cuando el precio llega a un nivel probado, no en mitad del camino.',
        'Sin nivel cerca, no hay dónde poner el stop con lógica. Mejor esperar a que el precio se acerque a una zona.',
        'Paciencia: entrar sin referencia es lo que más dinero cuesta. Deje que el precio venga a un nivel.'
      ]),
      detalle: [
        haciaS ? `Soporte más cercano: ${fmt(sCerca.p)} (${haciaS.toFixed(2)}% abajo)` : 'Sin soportes en el rango analizado',
        haciaR ? `Resistencia más cercana: ${fmt(rCerca.p)} (${haciaR.toFixed(2)}% arriba)` : 'Sin resistencias en el rango analizado',
        `Tendencia: ${nombreTend(N.tendencia.dir)}`,
        `Niveles válidos detectados: ${N.niveles.length}`
      ]
    });
  }

  /* ── Aviso de tendencia, siempre que haya una clara ── */
  if (N.tendencia.dir !== 'lateral' && N.tendencia.dir !== 'indefinida' && !N.rango) {
    const alc = N.tendencia.dir === 'alcista';
    msgs.push({
      tipo: 'tendencia',
      p: N.precio,
      titulo: alc
        ? elegir(['Tendencia alcista', 'Estructura al alza', 'El mercado sube'])
        : elegir(['Tendencia bajista', 'Estructura a la baja', 'El mercado cae']),
      txt: elegir([
        alc ? `Máximos y mínimos crecientes en las últimas velas. Movimiento del ${N.tendencia.mov.toFixed(1)}% en el tramo.`
            : `Máximos y mínimos decrecientes. Movimiento del ${N.tendencia.mov.toFixed(1)}% en el tramo.`,
        alc ? `La estructura es alcista: cada retroceso ha hecho un suelo más alto que el anterior.`
            : `La estructura es bajista: cada rebote se ha quedado más bajo que el anterior.`,
        alc ? `El precio construye escalones al alza. Lleva un ${N.tendencia.mov.toFixed(1)}% en este tramo.`
            : `El precio construye escalones a la baja. Lleva un ${N.tendencia.mov.toFixed(1)}% en este tramo.`
      ]),
      hacer: alc
        ? elegir([
            'Operar a favor: buscar compras en los retrocesos hacia soporte, no vender contra la tendencia.',
            'Las compras en soportes tienen ventaja aquí. Vender en corto va contra la corriente.',
            'Priorice entradas largas en los pullbacks. La tendencia es su aliada mientras los suelos suban.'
          ])
        : elegir([
            'Operar a favor: buscar ventas en los rebotes hacia resistencia, no comprar contra la tendencia.',
            'Las ventas en resistencia tienen ventaja aquí. Comprar es ir contra la corriente.',
            'Priorice entradas cortas en los rebotes. La tendencia manda mientras los techos bajen.'
          ]),
      detalle: [
        `Dirección: ${nombreTend(N.tendencia.dir)}`,
        `Recorrido del tramo: ${N.tendencia.mov.toFixed(2)}%`,
        `Medida por estructura de máximos y mínimos, no por indicadores`,
        `Soportes válidos: ${soportes.length} · Resistencias: ${resist.length}`
      ]
    });
  }

  /* ══════════════════════════════════════════════════════════
     EL PLAN ÚNICO

     Antes salían tres análisis independientes contradiciéndose:
     uno decía compra, otro venta, otro espera. Eso no es una
     herramienta, es ruido.

     Ahora todo se pondera y sale UN plan. Cada señal vota según
     su peso, y el resultado manda. Las demás lecturas quedan como
     contexto de apoyo, no como veredictos rivales.
     ══════════════════════════════════════════════════════════ */
  msgs.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
  N.mensajes = unificar(msgs);
}

/* ══════════════════════════════════════════════════════════════
   UNIFICAR: de varias lecturas a un plan
   ══════════════════════════════════════════════════════════════ */
function unificar(msgs) {
  if (!msgs.length) return [];

  /* Cada señal vota. El peso sale de su prioridad, que ya refleja
     lo fiable que es el patrón según los estudios del sector. */
  let votoC = 0, votoV = 0, votoE = 0;
  msgs.forEach((m) => {
    const p = (m.prioridad || 5);
    if (m.tipo === 'compra') votoC += p;
    else if (m.tipo === 'venta') votoV += p;
    else votoE += p * 0.55;      // esperar pesa menos: no es una postura activa
  });

  const total = votoC + votoV + votoE || 1;
  let lado, conf;
  if (votoC > votoV && votoC > votoE) { lado = 'compra'; conf = votoC / total; }
  else if (votoV > votoC && votoV > votoE) { lado = 'venta'; conf = votoV / total; }
  else { lado = 'esperar'; conf = votoE / total; }

  /* ══════════════════════════════════════════════════════════
     [CORREGIDO] LA TENDENCIA MANDA

     Antes cualquier señal contraria bloqueaba el plan y salía
     "señales enfrentadas". Eso es absurdo: en una tendencia clara
     SIEMPRE hay algún nivel del otro lado, y eso no invalida nada.

     Ahora la tendencia decide el sesgo. Las señales que van a
     favor cuentan entero; las que van en contra cuentan la mitad,
     porque operar contra tendencia es peor negocio. Solo se
     declara empate si de verdad no hay estructura que mande.
     ══════════════════════════════════════════════════════════ */
  const dirT = N.tendencia ? N.tendencia.dir : 'lateral';
  if (dirT === 'alcista') { votoC *= 1.6; votoV *= 0.5; }
  else if (dirT === 'bajista') { votoV *= 1.6; votoC *= 0.5; }

  // Se recalcula con el sesgo aplicado
  /* Una señal de compra o venta pesa más que un "espera": esperar
     no es una postura, es la ausencia de una. */
  const tot2 = votoC + votoV + votoE || 1;
  if (votoC > votoV && votoC > 0) { lado = 'compra'; conf = votoC / tot2; }
  else if (votoV > votoC && votoV > 0) { lado = 'venta'; conf = votoV / tot2; }
  else { lado = 'esperar'; conf = votoE / tot2; }

  /* Empate solo si NO hay tendencia definida y los pesos están
     realmente parejos. Con tendencia clara nunca se declara empate:
     hay dirección, y hay que decirla. */
  const sinRumbo = dirT === 'lateral' || dirT === 'indefinida';
  const disputado = sinRumbo && votoC > 0 && votoV > 0 &&
                    Math.abs(votoC - votoV) < Math.max(votoC, votoV) * 0.2;
  if (disputado) { lado = 'esperar'; conf = 0.4; }

  N.plan = {
    lado, conf: Math.round(conf * 100), disputado,
    votoC: Math.round(votoC), votoV: Math.round(votoV), votoE: Math.round(votoE)
  };

  /* El mensaje principal: el de mayor prioridad del lado ganador.
     Si el plan es esperar por disputa, se construye uno propio. */
  let principal;
  if (disputado) {
    const arriba = msgs.filter((m) => m.tipo === 'venta')[0];
    const abajo = msgs.filter((m) => m.tipo === 'compra')[0];
    principal = {
      tipo: 'aviso', p: N.precio, prioridad: 99, esPlan: true,
      titulo: elegir(['Señales enfrentadas', 'El mercado no se decide', 'Sin dirección clara']),
      txt: elegir([
        `He encontrado argumentos para ambos lados: ${abajo ? abajo.titulo.toLowerCase() : 'compra'} por abajo y ${arriba ? arriba.titulo.toLowerCase() : 'venta'} por arriba. Cuando la estructura se contradice, lo probable es que el precio siga indeciso.`,
        `Hay señales enfrentadas en este marco temporal. Ni los compradores ni los vendedores tienen el control claro ahora mismo.`,
        `La lectura está dividida: ${Math.round(votoC)} de peso alcista frente a ${Math.round(votoV)} bajista. Demasiado parejo para operar con ventaja.`
      ]),
      hacer: elegir([
        'No opere este par ahora. Espere a que una de las dos fuerzas se imponga con un cierre claro, o cambie a otro marco temporal donde la lectura sea limpia.',
        'Cuando las señales se contradicen, lo rentable es no estar dentro. Vuelva cuando haya una dirección definida.',
        'Suba a un marco temporal mayor para ver quién manda de verdad, o busque otro par con estructura clara.'
      ]),
      detalle: [
        `Peso alcista: ${Math.round(votoC)}`,
        `Peso bajista: ${Math.round(votoV)}`,
        `Diferencia insuficiente para dar una dirección`,
        `Lecturas analizadas: ${msgs.length}`,
        `Recomendación: esperar definición o cambiar de par`
      ]
    };
  } else {
    /* Se busca el de mayor prioridad del lado ganador. Si el lado es
       "esperar", se prefiere cualquier lectura con contenido real
       antes que el relleno. */
    const delLado = msgs.filter((m) => m.tipo === lado)
      .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    const conFondo = msgs.filter((m) => (m.prioridad || 0) >= 5)
      .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    principal = delLado[0] || conFondo[0] || msgs[0];
    principal = { ...principal, esPlan: true, prioridad: 99 };

    /* El plan completo: entrada, stop y objetivos escalonados.
       Solo si hay una dirección clara y un nivel de referencia. */
    if ((lado === 'compra' || lado === 'venta') && principal.p > 0 && N.atr > 0) {
      const entrada = principal.p;
      /* El stop sale de la estructura: bajo el nivel si es compra,
         sobre él si es venta. Después se ajusta por volatilidad. */
      const base = lado === 'compra' ? entrada * 0.994 : entrada * 1.006;
      const plan = construirPlan(lado, entrada, base, N.atr);
      if (plan) {
        principal.plan = plan;
        principal.detalle = [
          `Entrada: ${fmt(plan.entrada)}`,
          `Stop: ${fmt(plan.stop)} (${plan.riesgoPct.toFixed(2)}% de riesgo)`,
          `Objetivo 1: ${fmt(plan.obj[0].p)} · asegura la operación`,
          `Objetivo 2: ${fmt(plan.obj[1].p)} · el principal, 2R`,
          `Objetivo 3: ${fmt(plan.obj[2].p)} · si el movimiento acompaña`,
          `Stop ajustado a 1,2 veces la volatilidad media (${fmt(N.atr)})`,
          ...(principal.detalle || [])
        ];
      }
    }
    /* Se le añade la confianza al detalle: el usuario ve cuánto
       respaldo tiene el plan. */
    principal.detalle = [
      `Confianza del plan: ${Math.round(conf * 100)}% del peso total`,
      ...(principal.detalle || [])
    ];
  }

  /* Las demás lecturas pasan a contexto: apoyan o matizan, pero ya
     no compiten como veredictos. */
  const apoyo = msgs
    .filter((m) => m !== principal && m.titulo !== principal.titulo)
    .slice(0, 2)
    .map((m) => ({ ...m, esApoyo: true, tipo: m.tipo === lado ? m.tipo : 'contexto' }));

  return [principal, ...apoyo];
}

/** Varias formas de decir lo mismo, para que no suene repetitivo.
 *  La elección es estable por par y hora: no cambia en cada refresco. */
let _semilla = 0;
function elegir(opciones) {
  const i = Math.abs(Math.floor(_semilla)) % opciones.length;
  _semilla += 0.37;
  return opciones[i];
}

const nombreTend = (d) => ({
  alcista: 'alcista', bajista: 'bajista',
  lateral: 'lateral', indefinida: 'sin definir'
}[d] || d);

const fmt = (p) => {
  if (!(p > 0)) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(1);
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(8);
};

/** Volumen en formato corto: 1.2M, 340K… */
const miles = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toFixed(0);
};

const hora = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
const fecha = (t) => new Date(t).toLocaleDateString('es', { day: '2-digit', month: 'short' });

/* ══════════════════════════════════════════════════════════════
   ABRIR

   Interfaz deliberadamente distinta a las otras dos: no hay panel
   lateral. La gráfica ocupa todo y el asistente habla encima de
   ella, con burbujas ancladas al precio del que hablan.
   ══════════════════════════════════════════════════════════════ */
export async function abrirNiveles() {
  estilos();
  const prev = $('nv-overlay'); if (prev) prev.remove();

  N.velas = []; N.cargando = true; N.error = null;
  N.vista = { desde: 0, ancho: window.innerWidth < 760 ? 55 : 90, zoomY: 1, offsetY: 0 };

  const d = document.createElement('div');
  d.id = 'nv-overlay';
  d.innerHTML = `<div class="nv-bg"></div>
    <div class="nv-c">
      <header class="nv-cab">
        <button class="nv-sel" id="nv-sel">
          <i class="nv-logo" data-cg="${esc((PARES.find((p) => p.id === _par) || {}).cg || '')}"></i>
          <b>${esc(_par)}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <div class="nv-tfs">
          ${TFS.map((t) => `<button class="nv-tf ${t.id === _tf ? 'on' : ''}" data-ntf="${t.id}">${t.n}</button>`).join('')}
        </div>

        <div class="nv-estado" id="nv-estado"></div>



        <div class="nv-der">
          <button class="nv-ico" id="nv-foto" title="Compartir">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="nv-ico nv-herr-btn" id="nv-herr" title="Herramientas">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <button class="nv-ico nv-comof" id="nv-ayuda">
            <span class="nv-cf-tx">Cómo funciona</span><span class="nv-cf-s">?</span>
          </button>
          <button class="nv-ico" id="nv-x" aria-label="Cerrar">✕</button>
        </div>
      </header>

      <!-- La banda de lecturas: aquí viven las píldoras 1, 2 y 3.
           El veredicto y el título salían aquí y eran redundantes:
           las propias tarjetas ya lo dicen. -->
      <div class="nv-veredicto" id="nv-veredicto">
        <div class="nv-caps" id="nv-caps"></div>
        <div class="nv-meta" id="nv-meta"></div>
      </div>

      <div class="nv-graf" id="nv-graf">
        <canvas class="nv-cv" id="nv-cv"></canvas>
        <div class="nv-burbujas" id="nv-burbujas"></div>
        <div class="nv-esperando" id="nv-esperando">
          <div class="nv-spin"></div>
          <b>Analizando la estructura del mercado</b>
          <span>Buscando los niveles donde el precio ha reaccionado de verdad.</span>
        </div>
        <img class="nv-marca" src="assets/img/cco-marca.webp" alt="">
      </div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_reloj);
    document.querySelectorAll('#nv-picker').forEach((x) => x.remove());
    const e = $('nv-overlay'); if (e) e.remove();
    /* Al cerrar se vuelve a la portada de Liquidity, no se sale. */
    try { if (window.__lqpVolver) window.__lqpVolver(); } catch (_) {}
  };
  d.querySelector('.nv-bg').onclick = cerrar;
  $('nv-x').onclick = cerrar;
  $('nv-ayuda').onclick = () => ayuda();
  $('nv-herr').onclick = (e) => { e.stopPropagation(); menuHerramientas(); };
  $('nv-foto').onclick = () => guardarImagen();
  $('nv-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  d.querySelectorAll('[data-ntf]').forEach((b) => b.onclick = () => {
    _tf = b.dataset.ntf;
    d.querySelectorAll('[data-ntf]').forEach((x) => x.classList.toggle('on', x.dataset.ntf === _tf));
    N.vista.desde = 0;
    try { if (_cerrarFichas) _cerrarFichas(); } catch (_) {}
    recargar();
  });

  ponerLogos();
  recargar();

  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('nv-cv')) { dibujar(); burbujas(); } }, 250);
  });
}

let _reloj = null;
let _yaTrazado = false;
let _planFijo = null;
let _cerrarFichas = null;    // para cerrar órdenes abiertas al cambiar de par
let _od = null;              // módulo de órdenes
let _zonasOd = [];           // dónde se puede pulsar para cancelar
let _soloOperables = false;  // filtro del selector de monedas
let _operables = null;       // las que tienen contrato en BNB Chain

async function recargar() {
  clearInterval(_reloj);
  N.cargando = true; N.error = null;
  _yaTrazado = false;
  _planFijo = null;      // al cambiar de par o marco, se replantea
  const esp = $('nv-esperando'); if (esp) esp.style.display = '';
  const bs = $('nv-burbujas'); if (bs) bs.innerHTML = '';

  const tick = async () => {
    if (!$('nv-cv')) { clearInterval(_reloj); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      N.velas = await traerVelas(par.s, _tf, 300);
      /* La semilla se fija por par y hora: así las frases no bailan
         en cada refresco, pero cambian con el tiempo. */
      _semilla = (_par.charCodeAt(0) + new Date().getHours()) * 1.7;
      analizar();

      /* [CORREGIDO] El plan cambiaba de dirección entre refrescos y
         eso deja al usuario tirado a medio trade. Ahora una vez
         fijado, se mantiene mientras la tendencia no cambie de
         verdad: es lo que haría cualquier analista serio. */
      const dirAhora = N.tendencia ? N.tendencia.dir : 'lateral';
      if (_planFijo && _planFijo.dir === dirAhora && N.plan &&
          N.plan.lado !== _planFijo.lado && N.plan.lado !== 'esperar') {
        // Se ignora el cambio: la tendencia no ha girado
        N.mensajes = _planFijo.mensajes || N.mensajes;
        N.plan = _planFijo.plan || N.plan;
      } else if (N.plan && N.plan.lado !== 'esperar') {
        _planFijo = { dir: dirAhora, lado: N.plan.lado, plan: N.plan, mensajes: N.mensajes };
      }

      N.cargando = false; N.error = null;
      pintarEstado();
      /* La primera vez se traza el análisis delante del usuario.
         En los refrescos siguientes ya no, para no molestar. */
      if (!_yaTrazado) { _yaTrazado = true; animarTrazo(); }
      else { _trazo = 1; dibujar(); burbujas(); }
    } catch (_) {
      if (N.cargando) {
        N.error = 'No se pudieron cargar los datos del mercado.';
        N.cargando = false;
        dibujar();
      }
    }
  };
  await tick();
  _reloj = setInterval(tick, 30000);
}

function pintarEstado() {
  const e = $('nv-estado');
  const t = N.tendencia || { dir: 'indefinida' };
  if (e) {
    const cls = t.dir === 'alcista' ? 'sube' : t.dir === 'bajista' ? 'baja' : 'lat';
    const txt = N.rango ? 'En rango' : nombreTend(t.dir);
    e.innerHTML = `<span class="nv-pill ${cls}">${esc(txt.charAt(0).toUpperCase() + txt.slice(1))}</span>
      <span class="nv-precio">${fmt(N.precio)}</span>`;
  }

  /* Solo el horizonte y el número de lecturas: lo demás lo dicen
     ya las propias tarjetas, y repetirlo era ruido. */
  const meta = $('nv-meta'); if (!meta) return;
  const cuantas = (N.mensajes || []).length;
  if (!cuantas) { meta.innerHTML = ''; return; }

  const horizonte = {
    '15m': 'horas', '1h': 'de 1 a 3 días', '4h': 'de 3 a 10 días', '1d': 'semanas'
  }[_tf] || '';

  meta.innerHTML = `
    ${horizonte ? `<span class="nv-v-hz">${esc(T('Horizonte'))}: ${esc(T(horizonte))}</span>` : ''}
    <span class="nv-v-pt">${cuantas} ${cuantas === 1 ? esc(T('lectura')) : esc(T('lecturas'))}</span>`;
}

/* ══════════════════════════════════════════════════════════════
   LA GRÁFICA

   Velas limpias y los niveles dibujados con su etiqueta. Nada más.
   El usuario ve dónde comprar y dónde vender, sin descifrar nada.

   Se guardan las coordenadas de cada nivel para que las burbujas
   del asistente queden ancladas: si la gráfica se mueve, ellas se
   mueven con ella.
   ══════════════════════════════════════════════════════════════ */
let _geo = null;
let _trazo = 0;         // 0 a 1: cuánto se ha dibujado la tendencia
let _animId = null;

/** Traza la línea de tendencia delante del usuario. */
function animarTrazo() {
  cancelAnimationFrame(_animId);
  _trazo = 0;
  const ini = performance.now();
  const dura = 1100;
  const paso = (t) => {
    const p = Math.min(1, (t - ini) / dura);
    // Suave al final, como si la mano frenara
    _trazo = 1 - Math.pow(1 - p, 3);
    dibujar();
    if (p < 1) _animId = requestAnimationFrame(paso);
    else { _trazo = 1; dibujar(); burbujas(); }
  };
  _animId = requestAnimationFrame(paso);
}

function dibujar() {
  const cv = $('nv-cv'); const zona = $('nv-graf');
  if (!cv || !zona) return;
  const W = zona.clientWidth, H = zona.clientHeight;
  if (W < 50 || H < 50) return;

  if (!cv.dataset.listo) {
    gestos(cv);
    cv.dataset.listo = '1';
    /* Órdenes desde el gráfico: clic derecho o toque largo. */
    import('./orden.js?v=126').then((od) => {
      od.conectar({
        canvas: cv,
        precioEn: (y) => {
          if (!_geo) return 0;
          const { pMin, pMax, y1 } = _geo;
          return pMin + (pMax - pMin) * ((y1 - y) / y1);
        },
        precioActual: () => N.precio,
        par: () => _par,
        simbolo: () => (PARES.find((p) => p.id === _par) || {}).s || '',
        repintar: () => dibujar()
      });
      _od = od;
      _cerrarFichas = od.cerrarFichas;
      od.clicCancelar(cv, () => _zonasOd, () => dibujar());
      dibujar();
    }).catch(() => {});
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0b0f16';
  g.fillRect(0, 0, W, H);

  /* [NUEVA REGLA] Las etiquetas se guardan aquí y se pintan AL
     FINAL, por encima de todas las líneas. Antes cualquier línea
     trazada después las tapaba y el texto era ilegible. */
  const etiquetas = [];
  /* Las TACHUELAS (LONG/SHORT de Marea) van en su propia cola y se
     pintan al final del todo, por encima de cualquier línea. */
  const tachuelas = [];

  const esp = $('nv-esperando');
  if (N.error) {
    if (esp) {
      esp.style.display = '';
      esp.innerHTML = `<b>${esc(N.error)}</b><span>Revisa tu conexión y vuelve a intentarlo.</span>
        <button class="nv-btn" id="nv-retry">Reintentar</button>`;
      const b = $('nv-retry'); if (b) b.onclick = () => recargar();
    }
    return;
  }
  if (N.cargando || !N.velas.length) { if (esp) esp.style.display = ''; return; }
  if (esp) esp.style.display = 'none';

  const mDer = 84, mAba = 26;
  const x1 = W - mDer, y1 = H - mAba;

  /* [CORREGIDO] Las velas llegaban pegadas al borde derecho y no se
     podían despegar. Ahora se reserva un hueco a la derecha, como en
     TradingView, y el desplazamiento puede ser negativo para empujar
     el gráfico más allá de la última vela. */
  const total = N.velas.length;
  const ancho = Math.max(20, Math.min(total, N.vista.ancho));
  const desp = Math.max(-Math.floor(ancho * 0.6),
                        Math.min(N.vista.desde, Math.max(0, total - 20)));
  N.vista.desde = desp;
  const fin = total - desp;
  const vis = N.velas.slice(Math.max(0, fin - ancho), Math.min(total, fin));
  if (!vis.length) return;

  /* Cuántas posiciones vacías quedan a la derecha (hueco de respiro) */
  const huecoDer = Math.max(0, ancho - vis.length + (desp < 0 ? -desp : 0));

  /* Rango vertical: velas y niveles, con el zoom del usuario */
  let alto = -Infinity, bajo = Infinity;
  vis.forEach((v) => { if (v.h > alto) alto = v.h; if (v.l < bajo) bajo = v.l; });
  N.niveles.forEach((n) => {
    if (n.p > alto * 1.03 || n.p < bajo * 0.97) return;   // fuera de vista, no fuerza el rango
    if (n.p > alto) alto = n.p;
    if (n.p < bajo) bajo = n.p;
  });
  /* El arrastre vertical desplaza el centro del rango, para poder
     recolocar el gráfico donde el usuario quiera. */
  const rangoBase = (alto - bajo) || 1;
  const despY = ((N.vista.offsetY || 0) / Math.max(1, y1)) * rangoBase;
  const centro = (alto + bajo) / 2 + despY;
  const semi = (rangoBase / 2) * (N.vista.zoomY || 1);
  const pad = semi * 0.1 || 1;
  const pMax = centro + semi + pad, pMin = centro - semi - pad;
  const Y = (p) => y1 - y1 * ((p - pMin) / Math.max(1e-12, pMax - pMin));



  /* ── Rejilla suave ── */
  g.strokeStyle = 'rgba(255,255,255,.028)';
  g.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = (y1 / 6) * i;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
  }

  /* ══ LOS NIVELES ══
     Lo primero que se dibuja, para que las velas queden encima. */
  if (!N.limpia) N.niveles.forEach((n) => {
    if (n.p < pMin || n.p > pMax) return;
    const y = Y(n.p);
    /* [CORREGIDO] El tipo se decide por la POSICIÓN respecto al
       precio, no por cómo nació el pivote. Un soporte que quedó por
       encima del precio ya no es soporte: es resistencia. Poner
       "COMPRA" por encima del precio no tiene sentido. */
    const esS = n.p < N.precio;
    const col = esS ? '#2ee86a' : '#f6465d';
    const op = 0.22 + (n.fuerza / 100) * 0.5;

    // La banda: su grosor crece con la fuerza del nivel
    const grosor = 3 + (n.fuerza / 100) * 9;
    g.fillStyle = col + Math.round(op * 40).toString(16).padStart(2, '0');
    g.fillRect(0, y - grosor / 2, x1, grosor);

    // La línea
    g.strokeStyle = col;
    g.globalAlpha = 0.3 + (n.fuerza / 100) * 0.6;
    g.lineWidth = n.fuerza > 70 ? 2 : 1.4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
    g.globalAlpha = 1;

    /* La etiqueta: dice qué hacer, no qué es. Esto es lo que
       convierte la línea en una decisión. */
    /* La etiqueta va ENCIMA de la línea, no cruzada por ella. */
    /* [MEJORADO] Las etiquetas se confundían con el rojo de las
       velas. Ahora llevan sombra y borde claro: se despegan del
       fondo sin recurrir a neones. */
    const txt = (esS ? 'COMPRA ' : 'VENDE ') + fmt(n.p) + '  ·  ' + n.toques + (n.toques === 1 ? ' toque' : ' toques');
    g.font = 'bold 11.5px ui-monospace,monospace';
    const w = g.measureText(txt).width + 24;
    const yEt = y - 16;
    const alt = 23;
    /* A la cola: se pinta al final, por encima de toda línea. */
    etiquetas.push({
      txt, x: 10, y: yEt - alt / 2, w, h: alt, r: 7,
      fondo: col, tinta: esS ? '#04210f' : '#2a0509',
      borde: 'rgba(232,184,75,.9)',
      font: 'bold 11.5px ui-monospace,monospace', pad: 12
    });
  });

  /* ══ LAS VELAS ══ */
  const paso = x1 / ancho;
  const cuerpo = Math.max(1.4, paso * 0.66);
  _geo = { W, H, x1, y1, pMax, pMin, Y, vis, ancho, paso, fin };
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const sube = v.c >= v.o;
    const col = sube ? '#26a69a' : '#ef5350';
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(1, paso * 0.11);
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1.2, yB - yA));
  });

  const idxVis = (i) => {
    const pri = Math.max(0, fin - ancho);
    return (i - pri) * paso + paso / 2;
  };

  /* ══ CONTROL DE ETIQUETAS ══
     [CORREGIDO] Las etiquetas se pisaban unas a otras. Ahora cada
     una se registra y, si choca, se desplaza hasta encontrar hueco.
     Si no lo hay, no se dibuja: mejor menos y legible. */
  const ocupado = [];
  const hueco = (x, y, w, h) => {
    for (let intento = 0; intento < 5; intento++) {
      const choca = ocupado.some((o) =>
        x < o.x + o.w + 6 && x + w + 6 > o.x && y < o.y + o.h + 4 && y + h + 4 > o.y);
      if (!choca) { ocupado.push({ x, y, w, h }); return { x, y }; }
      y += h + 6;
      if (y > y1 - h - 4) return null;
    }
    return null;
  };

  /* ══ LA LÍNEA DE TENDENCIA ══
     Se traza delante del usuario cuando abre: da la sensación de
     que alguien está dibujando el análisis en directo. */
  if (N.linea && _trazo > 0 && !N.limpia) {
    const L = N.linea;
    const iA = L.pts[0].i, iB = Math.max(L.pts[L.pts.length - 1].i, fin - 1);
    const xA = idxVis(iA), xB = idxVis(iB);
    const yA = Y(L.m * iA + L.b), yB = Y(L.m * iB + L.b);
    // El trazo avanza de 0 a 1
    const xT = xA + (xB - xA) * _trazo;
    const yT = yA + (yB - yA) * _trazo;
    const col = L.tipo === 'alcista' ? '#2ee86a' : '#f6465d';

    g.strokeStyle = col;
    g.lineWidth = 2.2;
    g.globalAlpha = 0.9;
    g.setLineDash([]);
    g.beginPath(); g.moveTo(xA, yA); g.lineTo(xT, yT); g.stroke();
    g.globalAlpha = 1;

    // La punta que va dibujando
    if (_trazo < 1) {
      g.beginPath(); g.arc(xT, yT, 4, 0, Math.PI * 2);
      g.fillStyle = col; g.fill();
    } else {
      /* Los dos extremos con su punto, para que se vea acabada */
      [[xA, yA], [xB, yB]].forEach(([xx, yy]) => {
        g.beginPath(); g.arc(xx, yy, 4.5, 0, Math.PI * 2);
        g.fillStyle = col; g.fill();
        g.strokeStyle = '#0b0f16'; g.lineWidth = 1.6; g.stroke();
      });
      // Prolongación hacia el futuro, discontinua
      /* La prolongación se corta si se sale de la vista: antes se
         iba al infinito y arrastraba la etiqueta fuera de pantalla. */
      const iF = iB + 3;
      const yFut = Y(L.m * iF + L.b);
      if (yFut > -20 && yFut < y1 + 20) {
        g.strokeStyle = col + '66';
        g.setLineDash([6, 5]); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(xB, yB); g.lineTo(Math.min(x1, idxVis(iF)), yFut); g.stroke();
        g.setLineDash([]);
      }

      // Etiqueta
      const et = L.tipo === 'alcista' ? 'TENDENCIA ALCISTA' : 'TENDENCIA BAJISTA';
      g.font = 'bold 9px ui-monospace,monospace';
      const w = g.measureText(et).width + 14;
      const xE = Math.max(4, Math.min(x1 - w - 4, xB - w / 2));
      const yE = Math.max(20, Math.min(y1 - 24, yB + (L.tipo === 'alcista' ? 10 : -26)));
      g.fillStyle = col;
      redondeado(g, xE, yE, w, 16, 4); g.fill();
      g.fillStyle = L.tipo === 'alcista' ? '#04210f' : '#2a0509';
      g.textAlign = 'left';
      g.fillText(et, xE + 7, yE + 11);
    }
  }

  /* ══ MAREA ══
     El detector de cambio de ciclo. Ya NO dibuja ningún canal ni
     ninguna línea que siga al precio: eso era un SuperTrend disfrazado.
     Solo deja las TACHUELAS del giro (a la cola, para que queden por
     encima de todo). El estado (lado, lateral, finde) lo cuenta el
     panel de confluencia, así que aquí no se repite ninguna etiqueta. */
  if (N.marea && N.verMarea) {
    const MA = N.marea;
    const primG = Math.max(0, fin - ancho);

    /* Las señales confirmadas: se guardan en la cola de tachuelas para
       pintarse al final, por encima de cualquier línea. La tachuela se
       coloca en la vela EXACTA del giro. */
    MA.validas.forEach((sg) => {
      if (sg.i < primG) return;
      const x = idxVis(sg.i);
      if (x < 10 || x > x1 - 10) return;
      tachuelas.push({ x, y: Y(sg.precio), alc: sg.dir === 'compra' });
    });
  }

  /* ══ EL CANAL DEL RANGO ══
     Si el precio va lateral, se marcan las dos horizontales. */
  if (N.rango && _trazo > 0 && !N.limpia) {
    const yA = Y(N.rango.alto), yB = Y(N.rango.bajo);
    const xT = x1 * _trazo;
    g.strokeStyle = 'rgba(232,184,75,.85)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, yA); g.lineTo(xT, yA); g.stroke();
    g.beginPath(); g.moveTo(0, yB); g.lineTo(xT, yB); g.stroke();
    if (_trazo >= 1) {
      /* La banda tapaba las velas. Solo un borde suave. */
      g.fillStyle = 'rgba(232,184,75,.02)';
      g.fillRect(0, yA, x1, yB - yA);
      ['TECHO DEL RANGO', 'SUELO DEL RANGO'].forEach((et, k) => {
        const y = k === 0 ? yA : yB;
        g.font = 'bold 9px ui-monospace,monospace';
        const w = g.measureText(et).width + 14;
        g.fillStyle = '#E8B84B';
        redondeado(g, x1 - w - 8, y + (k === 0 ? -20 : 6), w, 15, 4); g.fill();
        g.fillStyle = '#2a1c00';
        g.textAlign = 'left';
        g.fillText(et, x1 - w - 1, y + (k === 0 ? -9 : 17));
      });
    }
  }

  /* ══ DOBLE SUELO / DOBLE TECHO ══ */
  if (!N.limpia) (N.dobles || []).forEach((d) => {
    const primero2 = Math.max(0, fin - ancho);
    if (d.p1.i < primero2 - 2) return;
    const suelo = d.tipo === 'dobleSuelo';
    const col = suelo ? '#2ee86a' : '#f6465d';
    const x1p = idxVis(d.p1.i), x2p = idxVis(d.p2.i);
    const yN = Y(d.nivel), yC = Y(d.cuello);

    /* [CORREGIDO] La línea se estiraba hasta el borde derecho y
       quedaba fea. Un doble techo lo forman DOS picos: la línea
       nace en el izquierdo y muere en el derecho. Nada más. */
    g.strokeStyle = col + 'cc';
    g.setLineDash([5, 4]); g.lineWidth = 1.6;
    /* [CORREGIDO] La línea quedaba desfasada porque idxVis apunta al
       CENTRO de la vela. Se extiende medio paso a cada lado para que
       toque los dos picos de verdad. */
    const xIz = Math.max(0, x1p - paso / 2);
    const xDe = Math.min(x1, x2p + paso / 2);
    g.beginPath();
    g.moveTo(xIz, yC);
    g.lineTo(xDe, yC);
    g.stroke();
    g.setLineDash([]);

    /* Y la línea que une los dos extremos, para que se vea el patrón */
    g.strokeStyle = col + '77';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(xIz, yN);
    g.lineTo(xDe, yN);
    g.stroke();

    const et = (suelo ? 'DOBLE SUELO' : 'DOBLE TECHO') + (d.confirmado ? ' ✓' : '');
    g.font = 'bold 9px ui-monospace,monospace';
    const w = g.measureText(et).width + 14;
    // Anclada al primer extremo del patrón, no al centro
    const h2 = hueco(Math.max(4, Math.min(x1 - w - 4, x1p - w / 2)),
                     yN + (suelo ? 12 : -28), w, 16);
    if (h2) {
      g.fillStyle = col;
      redondeado(g, h2.x, h2.y, w, 16, 4); g.fill();
      g.fillStyle = suelo ? '#04210f' : '#2a0509';
      g.textAlign = 'left';
      g.fillText(et, h2.x + 7, h2.y + 11);
    }
  });

  /* ══ LAS ESTRUCTURAS DIBUJADAS ══
     Aquí es donde el usuario VE de lo que se le habla: la ruptura,
     la zona institucional, el barrido. No hay que creerse nada. */
  if (!N.limpia) (N.estructuras || []).forEach((e) => {
    const primero = Math.max(0, fin - ancho);
    if (e.iRef < primero - 2 || e.iRef > fin) return;
    const col = e.dir === 'alcista' ? '#2ee86a' : '#f6465d';
    const xR = idxVis(e.iRef), xT = idxVis(e.iRot);

    if (e.tipo === 'bos' || e.tipo === 'choch') {
      /* La línea del nivel roto, desde donde nació hasta donde
         se rompió, y una marca en el punto de ruptura. */
      const y = Y(e.nivel);
      if (y < -20 || y > y1 + 20) return;
      g.strokeStyle = col;
      g.setLineDash(e.tipo === 'choch' ? [7, 4] : []);
      g.lineWidth = 1.8;
      g.globalAlpha = 0.85;
      g.beginPath(); g.moveTo(Math.max(0, xR), y); g.lineTo(Math.min(x1, xT + paso), y); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;

      // Flecha en el punto de ruptura
      const yRot = Y(velaEn(e.iRot) ? velaEn(e.iRot).c : e.nivel);
      g.fillStyle = col;
      g.beginPath();
      const sube = e.dir === 'alcista';
      g.moveTo(xT, y + (sube ? -9 : 9));
      g.lineTo(xT - 5, y + (sube ? 1 : -1));
      g.lineTo(xT + 5, y + (sube ? 1 : -1));
      g.closePath(); g.fill();

      // La etiqueta
      const et = e.tipo === 'bos' ? 'BOS' : 'CHoCH';
      g.font = 'bold 9px ui-monospace,monospace';
      const w = g.measureText(et).width + 12;
      g.fillStyle = col;
      redondeado(g, xT - w / 2, y + (sube ? -26 : 14), w, 15, 4); g.fill();
      g.fillStyle = sube ? '#04210f' : '#2a0509';
      g.textAlign = 'center';
      g.fillText(et, xT, y + (sube ? -15 : 25));
      g.textAlign = 'left';
    }

    if (e.tipo === 'ob' || e.tipo === 'barrido') {
      /* La zona: un rectángulo que se extiende hacia la derecha,
         porque sigue vigente hasta que el precio la visite. */
      const yA = Y(e.zonaA), yB = Y(e.zonaB);
      if (yB < -30 || yA > y1 + 30) return;
      const alto = Math.max(4, Math.abs(yB - yA));
      const yTop = Math.min(yA, yB);

      g.fillStyle = col + '26';
      g.fillRect(Math.max(0, xR - paso / 2), yTop, x1 - Math.max(0, xR - paso / 2), alto);
      g.strokeStyle = col + '99';
      g.setLineDash([5, 4]); g.lineWidth = 1;
      g.strokeRect(Math.max(0, xR - paso / 2), yTop, x1 - Math.max(0, xR - paso / 2), alto);
      g.setLineDash([]);

      /* [CORREGIDO] La etiqueta buscaba hueco por su cuenta y
         acababa en sitios distintos cada vez: parecía que bailaba.

         Ahora va SIEMPRE pegada dentro de su rectángulo, arriba a
         la izquierda de la zona. Si la zona es muy fina, se pone
         justo encima. Nombres cortos, que los largos no cabían. */
      const et = e.tipo === 'ob'
        ? (e.dir === 'alcista' ? 'DEMANDA INSTITUCIONAL' : 'OFERTA INSTITUCIONAL')
        : (e.dir === 'alcista' ? 'STOPS BARRIDOS ABAJO' : 'STOPS BARRIDOS ARRIBA');
      g.font = 'bold 9px ui-monospace,monospace';
      const w = g.measureText(et).width + 13;
      const xEt = Math.max(3, Math.min(x1 - w - 4, Math.max(0, xR - paso / 2) + 4));
      /* Dentro si cabe, encima si no: posición fija, sin saltos. */
      const yEt2 = alto >= 22 ? yTop + 3 : yTop - 17;

      etiquetas.push({
        txt: et, x: xEt, y: yEt2, w, h: 16, r: 5,
        fondo: col, tinta: e.dir === 'alcista' ? '#04210f' : '#2a0509',
        borde: 'rgba(232,184,75,.85)',
        font: 'bold 9px ui-monospace,monospace', pad: 7
      });

      /* El volumen negociado dentro, a la DERECHA de la zona para
         no taparle las velas. Dice quién mandó ahí dentro. */
      if (e.volTot > 0 && alto > 14) {
        const pctC = (e.volAlc / e.volTot) * 100;
        const txtV = `${miles(e.volTot)}  ${pctC.toFixed(0)}%↑ ${(100 - pctC).toFixed(0)}%↓`;
        g.font = '9px ui-monospace,monospace';
        const wv = g.measureText(txtV).width + 12;
        const xv = x1 - wv - 6;
        g.fillStyle = 'rgba(11,15,22,.88)';
        redondeado(g, xv, yTop + alto / 2 - 8, wv, 16, 4); g.fill();
        g.strokeStyle = col + '77'; g.lineWidth = 1;
        redondeado(g, xv, yTop + alto / 2 - 8, wv, 16, 4); g.stroke();
        g.fillStyle = pctC >= 50 ? '#3ee88a' : '#ff6b7a';
        g.textAlign = 'left';
        g.fillText(txtV, xv + 6, yTop + alto / 2 + 3.5);
      }
    }
  });

  /* ══ LA SOGUITA ══
     Solo cuando el usuario pulsa "Señálame dónde está". Sale de
     arriba (donde está su cápsula) y baja curvándose hasta el
     punto exacto, con la punta marcada. */
  if (!N.limpia && N.senalado != null && N.mensajes[N.senalado]) {
    const m = N.mensajes[N.senalado];
    if (m.p >= pMin && m.p <= pMax) {
      const y = Y(m.p);
      const col = m.tipo === 'compra' ? '#2ee86a' : m.tipo === 'venta' ? '#f6465d' : '#E8B84B';

      /* Dónde ocurre: si la señal viene de una estructura, en su
         vela; si no, hacia el centro. */
      let xFin = x1 * 0.55;
      if (m.marca && m.marca.iRef != null) xFin = idxVis(m.marca.iRef);
      else if (m.iAncla != null) xFin = idxVis(m.iAncla);
      xFin = Math.max(30, Math.min(x1 - 20, xFin));

      /* [CORREGIDO] La soguita salía de un punto inventado y se
         cortaba con la banda. Ahora arranca de la píldora real:
         se mide dónde está y se traza desde ahí. */
      let xIni = x1 * 0.5, yIni = 2;
      try {
        const pil = document.querySelector(`.nv-cap[data-nvm="${N.senalado}"] .nv-cap-b`);
        const zonaG = $('nv-graf');
        if (pil && zonaG) {
          const rp = pil.getBoundingClientRect();
          const rg = zonaG.getBoundingClientRect();
          xIni = Math.max(10, Math.min(x1 - 10, rp.left + rp.width / 2 - rg.left));
          yIni = Math.max(0, rp.bottom - rg.top);   // justo bajo la píldora
        }
      } catch (_) {}

      // La cuerda con pandeo
      g.strokeStyle = col;
      g.lineWidth = 1.8;
      g.globalAlpha = 0.85;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(xIni, yIni);
      g.quadraticCurveTo(xIni + (xFin - xIni) * 0.15, y - (y - yIni) * 0.22, xFin, y);
      g.stroke();
      g.setLineDash([]);
      g.globalAlpha = 1;

      // La banda del nivel y su línea
      g.fillStyle = col + '1c';
      g.fillRect(0, y - 8, x1, 16);
      g.strokeStyle = col;
      g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();

      // La punta, en el punto exacto
      g.beginPath(); g.arc(xFin, y, 6, 0, Math.PI * 2);
      g.fillStyle = col; g.fill();
      g.strokeStyle = '#0b0f16'; g.lineWidth = 2; g.stroke();

      const et = (N.senalado + 1) + ' · ' + fmt(m.p);
      g.font = 'bold 11px ui-monospace,monospace';
      const w = g.measureText(et).width + 20;
      g.fillStyle = col;
      redondeado(g, 12, y - 11, w, 22, 6); g.fill();
      g.fillStyle = m.tipo === 'compra' ? '#04210f' : m.tipo === 'venta' ? '#2a0509' : '#2a1c00';
      g.textAlign = 'left';
      g.fillText(et, 22, y + 4);
    }
  }

  /* Tus órdenes y alertas, con el estilo común de las tres. */
  if (_od) {
    _zonasOd = _od.pintar(g, {
      x1, Y, pMin, pMax,
      simbolo: (PARES.find((p) => p.id === _par) || {}).s || ''
    });
  }

  /* ── El precio actual ── */
  const yP = Y(N.precio);
  g.strokeStyle = 'rgba(232,184,75,.8)';
  g.setLineDash([5, 4]); g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(0, yP); g.lineTo(x1, yP); g.stroke();
  g.setLineDash([]);

  /* ── La escala de precios ── */
  g.fillStyle = 'rgba(11,15,22,.96)';
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();

  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 6; i++) {
    const p = pMin + (pMax - pMin) * (i / 6);
    const y = Y(p);
    if (Math.abs(y - yP) < 14) continue;
    /* Con "Gráfica limpia" no hay etiquetas de nivel, así que tampoco
       hay que dejarles hueco: los números normales de la escala se
       pintan también donde antes iba un nivel. */
    if (!N.limpia && N.niveles.some((n) => Math.abs(Y(n.p) - y) < 14)) continue;
    g.fillStyle = '#4a525c';
    g.fillText(fmt(p), x1 + 7, y + 3.5);
  }
  /* Los niveles también marcan la escala (las "tachuelas" del eje).
     [CORREGIDO] Antes se pintaban SIEMPRE y quedaban encendidas con
     "Gráfica limpia": esas eran las etiquetas rojas/verdes que no se
     apagaban. Ahora respetan N.limpia como todo lo demás del análisis. */
  if (!N.limpia) N.niveles.forEach((n) => {
    if (n.p < pMin || n.p > pMax) return;
    const y = Y(n.p);
    const col = n.tipo === 'soporte' ? '#2ee86a' : '#f6465d';
    g.fillStyle = col;
    redondeado(g, x1 + 2, y - 9, mDer - 5, 18, 4); g.fill();
    g.fillStyle = n.tipo === 'soporte' ? '#04210f' : '#2a0509';
    g.font = 'bold 10px ui-monospace,monospace';
    g.fillText(fmt(n.p), x1 + 6, y + 3.5);
  });
  g.fillStyle = '#E8B84B';
  redondeado(g, x1 + 2, yP - 10, mDer - 5, 20, 4); g.fill();
  g.fillStyle = '#2a1c00';
  g.font = 'bold 11px ui-monospace,monospace';
  g.fillText(fmt(N.precio), x1 + 6, yP + 4);

  /* ══ LA CRUZ DEL CURSOR ══
     Como en TradingView: sigue al ratón y muestra el precio a la
     derecha y la hora abajo. */
  if (N.cruz && N.cruz.x >= 0 && N.cruz.x < x1 && N.cruz.y >= 0 && N.cruz.y < y1) {
    const cx = N.cruz.x, cy = N.cruz.y;
    g.strokeStyle = 'rgba(255,255,255,.22)';
    g.setLineDash([4, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, y1); g.stroke();
    g.beginPath(); g.moveTo(0, cy); g.lineTo(x1, cy); g.stroke();
    g.setLineDash([]);

    // El precio a esa altura
    const pC = pMin + (pMax - pMin) * ((y1 - cy) / y1);
    g.fillStyle = '#2b3139';
    redondeado(g, x1 + 2, cy - 10, mDer - 5, 20, 4); g.fill();
    g.fillStyle = '#eaecef';
    g.font = 'bold 11px ui-monospace,monospace';
    g.textAlign = 'left';
    g.fillText(fmt(pC), x1 + 7, cy + 4);

    // La hora de esa columna
    const iV = Math.floor(cx / paso);
    const vC = vis[iV];
    if (vC) {
      const et = (_tf === '4h' || _tf === '1d') ? fecha(vC.t) + ' ' + hora(vC.t) : hora(vC.t);
      g.font = '10px ui-monospace,monospace';
      const w = g.measureText(et).width + 14;
      g.fillStyle = '#2b3139';
      redondeado(g, Math.max(2, Math.min(x1 - w - 2, cx - w / 2)), y1 + 3, w, 18, 4); g.fill();
      g.fillStyle = '#eaecef';
      g.textAlign = 'center';
      g.fillText(et, Math.max(w / 2 + 2, Math.min(x1 - w / 2 - 2, cx)), y1 + 16);
      g.textAlign = 'left';
    }
  }

  /* ══ LAS ETIQUETAS, AL FINAL ══
     Se pintan aquí para que ninguna línea las tape. */
  etiquetas.forEach((et) => {
    g.save();
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8; g.shadowOffsetY = 2;
    g.fillStyle = et.fondo;
    redondeado(g, et.x, et.y, et.w, et.h, et.r || 6); g.fill();
    g.restore();
    if (et.borde) {
      g.strokeStyle = et.borde; g.lineWidth = 1.3;
      redondeado(g, et.x, et.y, et.w, et.h, et.r || 6); g.stroke();
    }
    g.fillStyle = et.tinta;
    g.font = et.font || 'bold 10px ui-monospace,monospace';
    g.textAlign = 'left';
    g.fillText(et.txt, et.x + (et.pad || 10), et.y + et.h / 2 + 3.6);
  });

  /* ══ LAS TACHUELAS, POR ENCIMA DE TODO ══
     Se pintan las últimas, después incluso de las etiquetas, para que
     nunca las tape una línea. El dibujo es el de siempre:
       · LONG  — verde, texto NEGRO, pico ARRIBA, DEBAJO de la vela
       · SHORT — rojo #FF0000, texto AMARILLO, pico ABAJO, ENCIMA
       · un punto pequeño en la vela exacta del giro */
  tachuelas.forEach(({ x, y, alc }) => {
    const txt = alc ? 'LONG' : 'SHORT';
    g.font = 'bold 12px ui-monospace,monospace';
    const w = g.measureText(txt).width + 22;
    const h = 24;
    const pico = 7;
    const yCaja = alc ? y + 16 : y - 16 - h;
    const xCaja = Math.max(2, Math.min(x1 - w - 2, x - w / 2));

    g.save();
    g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 10; g.shadowOffsetY = 2;
    g.fillStyle = alc ? '#2ee86a' : '#FF0000';
    redondeado(g, xCaja, yCaja, w, h, 6); g.fill();
    g.beginPath();
    if (alc) {
      g.moveTo(x, yCaja - pico);
      g.lineTo(x - pico, yCaja + 1);
      g.lineTo(x + pico, yCaja + 1);
    } else {
      g.moveTo(x, yCaja + h + pico);
      g.lineTo(x - pico, yCaja + h - 1);
      g.lineTo(x + pico, yCaja + h - 1);
    }
    g.closePath(); g.fill();
    g.restore();

    g.fillStyle = alc ? '#000000' : '#FFD400';
    g.textAlign = 'center';
    g.fillText(txt, xCaja + w / 2, yCaja + h / 2 + 4.5);
    g.textAlign = 'left';

    g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2);
    g.fillStyle = alc ? '#2ee86a' : '#FF0000'; g.fill();
    g.strokeStyle = '#0b0f16'; g.lineWidth = 1.5; g.stroke();
  });

  /* ══ EL PANEL DE PROBABILIDAD DE MAREA ══
     Esquina superior derecha, dentro de la gráfica. Dice cuántos
     requisitos de cada señal están ya cumplidos (NO es una predicción)
     y cuánto le falta al precio para dispararla. */
  if (N.marea && N.verMarea && !N.cargando) {
    panelMarea(g, N.marea, x1, W);
  }

  /* ── Las fechas ── */
  g.fillStyle = 'rgba(11,15,22,.96)';
  g.fillRect(0, y1, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = '#4a525c';
  g.textAlign = 'center';
  const cada = Math.max(1, Math.floor(vis.length / 7));
  const largo = _tf === '4h' || _tf === '1d';
  vis.forEach((v, i) => {
    if (i % cada) return;
    const x = i * paso + paso / 2;
    if (x > x1 - 24) return;
    g.fillText(largo ? fecha(v.t) : hora(v.t), x, y1 + 16);
  });
  g.textAlign = 'left';
}

function velaEn(i) { return N.velas[i] || null; }

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
   EL PANEL DE MAREA — tablero de confluencia

   Va dentro de la gráfica, arriba a la derecha. No es una raya de
   colores: es un instrumento. Reúne en un sitio la lectura de los
   indicadores internos (Heikin Ashi, ADX/DI, volumen, estructura y
   ciclo) y enseña cuántos coinciden ahora mismo — la CONFLUENCIA — más
   cuánto le falta al precio para disparar cada señal.

   El anillo y los porcentajes NO son una predicción: son cuántos de
   los cinco confirmadores se cumplen. Se dice así en el pie.
   ══════════════════════════════════════════════════════════════ */
function panelMarea(g, MA, x1, W) {
  const P = MA.panel;
  const oro = '#E8B84B', oroSuave = 'rgba(232,184,75,.55)';
  const verde = '#2ee86a', rojo = '#FF0000';
  const apagado = '#39414b';

  const PW = Math.min(218, Math.max(150, x1 - 16));
  const px = Math.max(8, x1 - PW - 10);
  const py = 12;
  const pad = 13;
  const cx0 = px + pad;                 // margen izquierdo del contenido
  const anchoInt = PW - pad * 2;

  // Dirección dominante (la de más confluencia) y su estado
  const dom = P.long.pct >= P.short.pct ? 'long' : 'short';
  const D = dom === 'long' ? P.long : P.short;
  const colDom = dom === 'long' ? verde : rojo;
  const activo = !MA.finde && !MA.lateral;

  // Chip de estado
  let chip, chipCol, chipTinta;
  if (MA.finde) { chip = 'FIN DE SEMANA'; chipCol = '#8b96a3'; chipTinta = '#0b0f16'; }
  else if (MA.lateral) { chip = MA.motivoLateral === 'banda' ? 'SIN RECORRIDO' : 'LATERAL'; chipCol = '#C9A84B'; chipTinta = '#2a1c00'; }
  else if (P.color === 1) { chip = 'LADO COMPRADOR'; chipCol = verde; chipTinta = '#04210f'; }
  else { chip = 'LADO VENDEDOR'; chipCol = rojo; chipTinta = '#FFD400'; }

  // Alto dinámico
  const yHead = py + pad + 4;
  const yRing = yHead + 20;
  const RING = 30;                      // radio del anillo
  const ringB = yRing + RING * 2 + 16;  // fin del bloque de confluencia
  const yBars = ringB + 4;
  const PH = (yBars - py) + 2 * 40 + 22;   // 40 por barra (pct+barra+falta) + zona de pie

  // ── Fondo: negro con un degradado sutil y borde dorado ──
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 18; g.shadowOffsetY = 5;
  const grad = g.createLinearGradient(0, py, 0, py + PH);
  grad.addColorStop(0, 'rgba(22,27,34,.96)');
  grad.addColorStop(1, 'rgba(11,14,20,.96)');
  g.fillStyle = grad;
  redondeado(g, px, py, PW, PH, 13); g.fill();
  g.restore();
  g.strokeStyle = oroSuave; g.lineWidth = 1.2;
  redondeado(g, px, py, PW, PH, 13); g.stroke();

  // Marcas de esquina tipo instrumento (look "caro")
  g.strokeStyle = oro; g.lineWidth = 1.4;
  const mc = 9, off = 6;
  const esquina = (ex, ey, dx, dy) => {
    g.beginPath();
    g.moveTo(ex + dx * off, ey + dy * off + dy * mc);
    g.lineTo(ex + dx * off, ey + dy * off);
    g.lineTo(ex + dx * off + dx * mc, ey + dy * off);
    g.stroke();
  };
  esquina(px, py, 1, 1); esquina(px + PW, py, -1, 1);
  esquina(px, py + PH, 1, -1); esquina(px + PW, py + PH, -1, -1);

  // ── Cabecera: marca + chip de estado ──
  g.textAlign = 'left';
  g.font = 'bold 11px ui-monospace,monospace';
  g.fillStyle = oro;
  g.fillText('◈ MAREA', cx0, yHead);
  // chip a la derecha
  g.font = 'bold 8px ui-monospace,monospace';
  const cw = g.measureText(chip).width + 12;
  const chx = px + PW - pad - cw, chy = yHead - 10;
  g.fillStyle = chipCol;
  redondeado(g, chx, chy, cw, 15, 4); g.fill();
  g.fillStyle = chipTinta;
  g.fillText(chip, chx + 6, chy + 10.5);

  // Línea divisoria fina
  g.strokeStyle = 'rgba(232,184,75,.22)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx0, yHead + 8); g.lineTo(px + PW - pad, yHead + 8); g.stroke();

  // ── Anillo de CONFLUENCIA (5 segmentos) ──
  const cx = cx0 + RING + 2;
  const cy = yRing + RING;
  const score = D.cumplidos;            // 0..5 de la dirección dominante
  const seg = (Math.PI * 2) / 5;
  const gap = 0.16;
  for (let i = 0; i < 5; i++) {
    const a0 = -Math.PI / 2 + i * seg + gap / 2;
    const a1 = -Math.PI / 2 + (i + 1) * seg - gap / 2;
    g.beginPath();
    g.arc(cx, cy, RING - 4, a0, a1);
    g.lineWidth = 6; g.lineCap = 'round';
    const encendido = activo && i < score;
    g.strokeStyle = encendido ? colDom : 'rgba(255,255,255,.09)';
    if (encendido) { g.shadowColor = colDom; g.shadowBlur = 8; } else { g.shadowBlur = 0; }
    g.stroke();
  }
  g.shadowBlur = 0; g.lineCap = 'butt';
  // Centro del anillo: N/5 y la palabra
  g.textAlign = 'center';
  if (activo) {
    g.fillStyle = '#eaecef';
    g.font = 'bold 19px ui-monospace,monospace';
    g.fillText(String(score), cx, cy + 2);
    g.fillStyle = '#7d8794';
    g.font = '8px ui-monospace,monospace';
    g.fillText('de 5', cx, cy + 14);
  } else {
    g.fillStyle = '#5a636e';
    g.font = 'bold 15px ui-monospace,monospace';
    g.fillText('—', cx, cy + 3);
  }
  // Etiqueta bajo el anillo
  g.font = 'bold 8px ui-monospace,monospace';
  g.fillStyle = activo ? colDom : '#6b7480';
  g.fillText(activo ? (dom === 'long' ? 'CONFLUENCIA ▲' : 'CONFLUENCIA ▼') : 'EN PAUSA', cx, cy + RING + 8);

  // ── Sensores de los indicadores internos ──
  const sx = cx + RING + 12;
  const sw = px + PW - pad - sx;
  const met = D.met;
  const sensores = [
    { et: 'HA',  ok: met.giroHA,     val: (P.color === 1 ? 'verde' : 'roja') + ' ×' + P.runLen },
    { et: 'ADX', ok: met.fuerza,     val: P.adx.toFixed(0) + (P.diMas >= P.diMenos ? ' ▲' : ' ▼') },
    { et: 'VOL', ok: met.volumen,    val: (P.volRel > 0 ? P.volRel.toFixed(1) : '0.0') + '×' },
    { et: 'EST', ok: met.ruptura,    val: met.ruptura ? 'rota' : 'intacta' },
    { et: 'CIC', ok: met.cicloPrevio, val: 'ciclo ×' + P.runLen }
  ];
  const sh = ((RING * 2) - 2) / 5;      // reparte la altura del anillo
  g.textAlign = 'left';
  sensores.forEach((s, i) => {
    const yy = yRing + i * sh + sh / 2;
    // lucecita
    const on = activo && s.ok;
    g.beginPath(); g.arc(sx + 4, yy, 3.2, 0, Math.PI * 2);
    if (on) { g.fillStyle = oro; g.shadowColor = oro; g.shadowBlur = 7; }
    else { g.fillStyle = apagado; g.shadowBlur = 0; }
    g.fill(); g.shadowBlur = 0;
    // etiqueta
    g.font = 'bold 8.5px ui-monospace,monospace';
    g.fillStyle = on ? '#eaecef' : '#6b7480';
    g.fillText(s.et, sx + 12, yy + 3);
    // valor a la derecha
    g.textAlign = 'right';
    g.fillStyle = on ? '#aeb6bf' : '#5a636e';
    g.font = '8.5px ui-monospace,monospace';
    g.fillText(s.val, px + PW - pad, yy + 3);
    g.textAlign = 'left';
  });

  // ── Barras LONG / SHORT ──
  let y = yBars;
  const fila = (etq, dato, color, alc) => {
    g.font = 'bold 10px ui-monospace,monospace';
    g.fillStyle = color;
    g.fillText(etq, cx0, y + 9);
    g.textAlign = 'right';
    g.fillStyle = activo ? '#eaecef' : '#6b7480';
    g.fillText(dato.pct + '%', px + PW - pad, y + 9);
    g.textAlign = 'left';
    y += 14;
    // barra con degradado
    const bh = 6;
    g.fillStyle = 'rgba(255,255,255,.07)';
    redondeado(g, cx0, y, anchoInt, bh, 3); g.fill();
    const rell = Math.max(0, Math.min(1, dato.pct / 100)) * anchoInt;
    if (rell > 2 && activo) {
      const gb = g.createLinearGradient(cx0, 0, cx0 + rell, 0);
      gb.addColorStop(0, alc ? 'rgba(46,232,106,.55)' : 'rgba(255,60,80,.55)');
      gb.addColorStop(1, color);
      g.fillStyle = gb;
      redondeado(g, cx0, y, rell, bh, 3); g.fill();
    } else if (rell > 2) {
      g.fillStyle = 'rgba(255,255,255,.14)';
      redondeado(g, cx0, y, rell, bh, 3); g.fill();
    }
    y += bh + 5;
    // cuánto falta
    g.font = '8.5px ui-monospace,monospace';
    g.fillStyle = '#7d8794';
    let txt;
    if (MA.finde) txt = 'en pausa hasta el lunes';
    else if (dato.falta <= 0) txt = alc ? 'nivel ya superado' : 'nivel ya perdido';
    else txt = `${alc ? 'supera' : 'pierde'} ${fmt(dato.nivel)} (${alc ? '+' : '−'}${dato.falta.toFixed(2)}%)`;
    g.fillText(txt, cx0, y + 6);
    y += 15;
  };
  fila('LONG', P.long, verde, true);
  fila('SHORT', P.short, rojo, false);

  // ── Pie ──
  g.font = '7px ui-monospace,monospace';
  g.fillStyle = '#4a525c';
  g.fillText('confluencia de requisitos, no predicción', cx0, py + PH - 9);
}

/* ══════════════════════════════════════════════════════════════
   LAS BURBUJAS DEL ASISTENTE

   Van ancladas al precio del que hablan: si la gráfica se mueve o
   se estira, ellas siguen a su nivel. Nunca se despegan.
   ══════════════════════════════════════════════════════════════ */
function burbujas() {
  const caja = $('nv-caps');
  if (!caja || !_geo || N.cargando) return;
  if (!N.mensajes.length) { caja.innerHTML = ''; return; }

  /* ══════════════════════════════════════════════════════════
     LAS CÁPSULAS

     [REPLANTEADO] Se quitaron los puntos latiendo y las cuerdas:
     ensuciaban la gráfica y con el zoom se volvían locos.

     Ahora las cápsulas van arriba a la derecha, que es donde no
     hay velas (el mercado avanza de izquierda a derecha). Se
     tocan, se despliegan hacia abajo, y solo si el usuario pulsa
     "Señálame dónde está" aparece la línea al nivel.
     ══════════════════════════════════════════════════════════ */
  /* [CORREGIDO] La firma incluía los números con decimales, así que
     cualquier micromovimiento del precio la cambiaba y las tarjetas
     se rehacían y reanimaban cada 30 segundos con el mismo mensaje.

     Ahora los números se redondean para la firma: solo se rehace
     cuando el mensaje cambia de verdad. */
  const firma = N.mensajes
    .map((m) => m.tipo + '|' + m.titulo + '|' + String(m.txt).replace(/[\d.,]+/g, '#'))
    .join('~');
  if (caja.dataset.firma === firma) {
    /* Mismo mensaje: solo se refrescan las cifras, sin reanimar. */
    N.mensajes.forEach((m, i) => {
      const el = caja.querySelector(`[data-nvm="${i}"] .nv-pm-tx`);
      if (el && el.dataset.hecho) el.textContent = T(m.txt);
      const h = caja.querySelector(`[data-nvm="${i}"] .nv-pm-hacer`);
      if (h) h.textContent = T(m.hacer);
    });
    return;
  }
  caja.dataset.firma = firma;

  const ic = { compra: '▲', venta: '▼', vigilar: '◆', aviso: '✱', tendencia: '➜', contexto: '·' };
  const etq = { compra: 'COMPRA', venta: 'VENTA', vigilar: 'VIGILAR', aviso: 'ESPERA',
                tendencia: 'TENDENCIA', contexto: 'CONTEXTO' };

  caja.innerHTML = `${N.mensajes.map((m, idx) => `
    <div class="nv-cap t-${m.tipo} ${m.esPlan ? 'plan' : ''} avisa" data-nvm="${idx}">
      <button class="nv-cap-b" type="button">
        <span class="nv-num">${idx + 1}</span>
        <img class="nv-cap-ava" src="assets/img/jesus-avatar.webp" alt="">
        <span class="nv-cap-tx">${ic[m.tipo] || '✱'} ${esc(T(etq[m.tipo] || ''))}</span>
        <span class="nv-cap-fl">▾</span>
      </button>

      <div class="nv-cap-panel">
        <div class="nv-pm-cab">
          <img class="nv-pm-ava" src="assets/img/jesus-avatar.webp" alt="">
          <div class="nv-pm-quien"><b>Jesús</b><span>${esc(T(m.titulo))}</span></div>
        </div>
        <div class="nv-pm-tx" data-escribir="${esc(T(m.txt))}"></div>
        <div class="nv-pm-hacer">${esc(T(m.hacer))}</div>

        ${m.plan ? planHTML(m.plan) : ''}

        <div class="nv-acts">
          <button class="nv-pm-mas" type="button">${esc(T('Por qué lo digo'))} ▾</button>
          ${m.p ? `<button class="nv-senala" type="button">${esc(T('Señálame dónde está'))}</button>` : ''}
        </div>

        <!-- Herramientas que el usuario puede pedir -->
        <div class="nv-pm-det">
          ${(m.detalle || []).map((x) => `<div class="nv-pm-li">${esc(T(x))}</div>`).join('')}
        </div>
      </div>
    </div>`).join('')}`;

  caja.querySelectorAll('[data-nvm]').forEach((el, idx) => {
    const b = el.querySelector('.nv-cap-b');
    const mas = el.querySelector('.nv-pm-mas');
    const sen = el.querySelector('.nv-senala');

    b.onclick = (e) => {
      e.stopPropagation();
      el.classList.remove('avisa');      // ya la miró: deja de avisar
      const ab = el.classList.contains('abierto');
      caja.querySelectorAll('.nv-cap').forEach((x) => x.classList.remove('abierto'));
      if (!ab) { el.classList.add('abierto'); escribir(el.querySelector('[data-escribir]')); }
    };
    mas.onclick = (e) => {
      e.stopPropagation();
      el.classList.toggle('con-detalle');
      mas.textContent = el.classList.contains('con-detalle')
        ? T('Ocultar') + ' ▴' : T('Por qué lo digo') + ' ▾';
    };
    const vw = el.querySelector('[data-vwap]');
    if (vw) vw.onclick = (e) => {
      e.stopPropagation();
      N.verVWAP = !N.verVWAP;
      vw.classList.toggle('on', N.verVWAP);
      if (N.verVWAP) el.classList.remove('abierto');
      dibujar();
    };
    const pf = el.querySelector('[data-perfil]');
    if (pf) pf.onclick = (e) => {
      e.stopPropagation();
      N.verPerfil = !N.verPerfil;
      pf.classList.toggle('on', N.verPerfil);
      if (N.verPerfil) el.classList.remove('abierto');
      dibujar();
    };

    const fib = el.querySelector('[data-fib]');
    if (fib) fib.onclick = (e) => {
      e.stopPropagation();
      N.verFibo = !N.verFibo;
      fib.classList.toggle('on', N.verFibo);
      if (N.verFibo) { el.classList.remove('abierto'); animarFibo(); }
      else dibujar();
    };

    if (sen) sen.onclick = (e) => {
      e.stopPropagation();
      /* Se cierra la cápsula y se marca el nivel en la gráfica */
      el.classList.remove('abierto');
      N.senalado = N.senalado === idx ? null : idx;
      dibujar();
    };
  });

  /* [CORREGIDO] Ninguna se abre sola: molestaba y tapaba la gráfica
     nada más entrar. La flecha parpadea para avisar de que hay algo
     que leer, y el usuario decide cuándo. */
}

/** Traza el Fibonacci delante del usuario, como la tendencia. */
function animarFibo() {
  cancelAnimationFrame(_animId);
  const desde = 0.35;
  _trazo = desde;
  const ini = performance.now();
  const dura = 900;
  const paso = (t) => {
    const p = Math.min(1, (t - ini) / dura);
    _trazo = desde + (1 - desde) * (1 - Math.pow(1 - p, 3));
    dibujar();
    if (p < 1) _animId = requestAnimationFrame(paso);
    else { _trazo = 1; dibujar(); }
  };
  _animId = requestAnimationFrame(paso);
}

/** Escribe el texto letra a letra, como si lo tecleara. */
function escribir(el) {
  if (!el || el.dataset.hecho) return;
  const txt = el.dataset.escribir || '';
  el.dataset.hecho = '1';
  let n = 0;
  const t = setInterval(() => {
    n += 2;
    el.textContent = txt.slice(0, n);
    if (n >= txt.length) { el.textContent = txt; clearInterval(t); }
  }, 13);
}

/** El plan de operación, en tabla: entrada, stop y objetivos. */
function planHTML(p) {
  if (!p) return '';
  const largo = p.lado === 'compra';
  return `
  <div class="nv-plan">
    <div class="nv-plan-t">${esc(T('Plan de operación'))}</div>
    <div class="nv-plan-fila entrada">
      <span>${esc(T('Entrada'))}</span><b>${fmt(p.entrada)}</b>
    </div>
    <div class="nv-plan-fila stop">
      <span>${esc(T('Stop'))}</span><b>${fmt(p.stop)}</b>
      <i>−${p.riesgoPct.toFixed(2)}%</i>
    </div>
    ${p.obj.map((o, i) => `
    <div class="nv-plan-fila obj">
      <span>${esc(T('Objetivo'))} ${i + 1} <em>${o.r}R</em></span><b>${fmt(o.p)}</b>
      <i>+${o.pct.toFixed(2)}%</i>
    </div>`).join('')}
    <div class="nv-plan-pie">
      ${esc(T('Riesgo/beneficio'))} <b>1:${p.rr}</b> ·
      ${esc(T('Volatilidad media'))} <b>${fmt(p.atr)}</b>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   GESTOS — como en TradingView

   · Arrastrar el gráfico mueve en el tiempo
   · Rueda sobre el gráfico: acerca y aleja
   · Rueda sobre la escala derecha: estira y comprime en vertical
   · Arrastrar la escala derecha: lo mismo, con el dedo
   · Doble clic: vuelve al encuadre inicial
   ══════════════════════════════════════════════════════════════ */
function gestos(cv) {
  /* [CORREGIDO] El arrastre iba en cámara lenta porque redibujaba
     TODO en cada píxel de movimiento. Ahora se agrupa por
     fotograma: el navegador dibuja cuando puede, no cuando se lo
     pedimos. Es lo que hace TradingView. */
  let pendiente = false;
  const refrescar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      dibujar();
      burbujas();
    });
  };

  const zoomX = (f) => {
    N.vista.ancho = Math.max(20, Math.min(300, Math.round(N.vista.ancho * f)));
    refrescar();
  };
  const zoomY = (f) => {
    N.vista.zoomY = Math.max(0.2, Math.min(5, (N.vista.zoomY || 1) * f));
    refrescar();
  };
  const enEscala = (x) => x > cv.clientWidth - 90;

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    if (enEscala(e.clientX - r.left)) zoomY(e.deltaY > 0 ? 1.12 : 0.9);
    else zoomX(e.deltaY > 0 ? 1.15 : 0.87);
  }, { passive: false });

  /* La cruz sigue al cursor */
  cv.addEventListener('mousemove', (e) => {
    if (arr) return;
    const r = cv.getBoundingClientRect();
    N.cruz = { x: Math.round(e.clientX - r.left), y: Math.round(e.clientY - r.top) };
    dibujar();
  });
  cv.addEventListener('mouseleave', () => { N.cruz = null; dibujar(); });

  cv.addEventListener('dblclick', () => {
    N.vista.ancho = window.innerWidth < 760 ? 55 : 90;
    N.vista.desde = 0;
    N.vista.zoomY = 1;
    N.vista.offsetY = 0;
    refrescar();
  });

  /* Arrastre: en el gráfico mueve el tiempo, en la escala estira */
  /* [CORREGIDO] Antes solo se movía en el tiempo. Ahora el arrastre
     mueve en AMBOS ejes, como en TradingView: agarras el gráfico y lo
     llevas donde quieras. */
  let ax = 0, ay = 0, arr = false, modo = 'x';
  cv.addEventListener('mousedown', (e) => {
    const r = cv.getBoundingClientRect();
    modo = enEscala(e.clientX - r.left) ? 'y' : 'libre';
    arr = true; ax = e.clientX; ay = e.clientY;
    cv.style.cursor = modo === 'y' ? 'ns-resize' : 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!arr) return;
    if (modo === 'y') {
      // Sobre la escala: estirar o comprimir
      const dy = e.clientY - ay;
      if (Math.abs(dy) > 2) { zoomY(1 + dy * 0.004); ay = e.clientY; }
      return;
    }
    let cambio = false;
    // Horizontal: recorrer el tiempo
    const paso = (cv.clientWidth - 84) / N.vista.ancho;
    const d = Math.round((e.clientX - ax) / Math.max(1, paso));
    if (d !== 0) {
      const tope = Math.max(0, N.velas.length - 20);
      const suelo = -Math.floor(N.vista.ancho * 0.6);   // hueco a la derecha
      N.vista.desde = Math.max(suelo, Math.min(tope, N.vista.desde + d));
      ax = e.clientX; cambio = true;
    }
    // Vertical: desplazar el rango de precios
    const dy = e.clientY - ay;
    if (Math.abs(dy) > 1) {
      N.vista.offsetY = (N.vista.offsetY || 0) + dy;
      ay = e.clientY; cambio = true;
    }
    if (cambio) refrescar();
  });
  window.addEventListener('mouseup', () => { arr = false; cv.style.cursor = 'crosshair'; });

  /* Táctil: un dedo mueve, dos hacen zoom en ambos ejes */
  let d0 = 0, dy0 = 0, tx = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { tx = e.touches[0].clientX; arr = true; modo = 'x'; }
    else if (e.touches.length === 2) {
      arr = false;
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      dy0 = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && arr) {
      e.preventDefault();
      const paso = (cv.clientWidth - 84) / N.vista.ancho;
      const d = Math.round((e.touches[0].clientX - tx) / Math.max(1, paso));
      if (d !== 0) {
        const tope = Math.max(0, N.velas.length - 20);
        const suelo = -Math.floor(N.vista.ancho * 0.6);
        N.vista.desde = Math.max(suelo, Math.min(tope, N.vista.desde + d));
        tx = e.touches[0].clientX; refrescar();
      }
    } else if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const dy = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
      // Si el pellizco es más vertical que horizontal, estira la escala
      if (dy > dy0 * 1.3 || dy0 > dy * 1.3) { zoomY(dy0 / Math.max(1, dy)); dy0 = dy; }
      else if (Math.abs(d - d0) > 8) { zoomX(d0 / d); }
      d0 = d;
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { arr = false; d0 = 0; });
  cv.style.cursor = 'crosshair';
}

/* ══════════════════════════════════════════════════════════════
   MENÚ DE HERRAMIENTAS
   ══════════════════════════════════════════════════════════════ */
function menuHerramientas() {
  const prev = document.getElementById('nv-herr-menu');
  if (prev) { prev.remove(); return; }

  /* Data-driven: añadir una herramienta nueva es meter una entrada
     aquí. Cada fila ocupa una sola línea; la descripción vive plegada
     y solo se abre si el usuario toca el "?". Así caben muchas
     herramientas sin que el menú crezca sin control. */
  const HERRAS = [
    { h: 'marea', on: !!N.verMarea, nombre: 'Marea', tag: 'cambio de ciclo',
      desc: 'Marca dónde la marea del mercado cambia de manos, de compradores a vendedores. Solo avisa cuando el giro pasa varios filtros a la vez; el resto del tiempo calla.' },
    { h: 'limpia', on: !!N.limpia, nombre: 'Gráfica limpia', tag: '',
      desc: 'Apaga todo el análisis automático (niveles, estructuras, tendencia y sus etiquetas) para dejar ver solo lo que tú elijas.' }
  ];

  const filas = HERRAS.map((t) => `
    <div class="nv-hm-fila">
      <div class="nv-hm-b ${t.on ? 'on' : ''}" data-h="${t.h}" role="button" tabindex="0">
        <span class="nv-hm-luz"></span>
        <div class="nv-hm-tx"><b>${esc(T(t.nombre))}</b>${t.tag ? ` <em>${esc(T(t.tag))}</em>` : ''}</div>
        <button class="nv-hm-q" data-q="${t.h}" type="button" aria-label="${esc(T('Qué hace'))}">?</button>
      </div>
      <div class="nv-hm-desc" data-d="${t.h}">${esc(T(t.desc))}</div>
    </div>`).join('');

  const m = document.createElement('div');
  m.id = 'nv-herr-menu';
  m.innerHTML = `
    <div class="nv-hm-t">${esc(T('Herramientas profesionales'))}</div>
    ${filas}
    <div class="nv-hm-pie">${esc(T('Toca una herramienta para encenderla · el "?" explica qué hace'))}</div>`;
  document.body.appendChild(m);

  const r = $('nv-herr').getBoundingClientRect();
  const w = m.offsetWidth || 300;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + 'px';
  m.style.top = (r.bottom + 8) + 'px';

  m.addEventListener('click', (e) => {
    e.stopPropagation();
    // 1) El "?" abre o cierra la descripción de esa herramienta
    const q = e.target.closest('[data-q]');
    if (q) {
      const d = m.querySelector(`.nv-hm-desc[data-d="${q.dataset.q}"]`);
      if (d) d.classList.toggle('abierta');
      return;
    }
    // 2) La fila enciende o apaga la herramienta
    const b = e.target.closest('[data-h]');
    if (!b) return;
    const cual = b.dataset.h;
    if (cual === 'marea') N.verMarea = !N.verMarea;
    else if (cual === 'limpia') N.limpia = !N.limpia;
    b.classList.toggle('on');
    dibujar(); burbujas();
  });

  setTimeout(() => document.addEventListener('click', () => {
    const x = document.getElementById('nv-herr-menu'); if (x) x.remove();
  }, { once: true }), 10);
}

/* ══════════════════════════════════════════════════════════════
   SELECTOR DE MONEDA
   ══════════════════════════════════════════════════════════════ */
function menuPares() {
  const prev = document.getElementById('nv-picker');
  if (prev) { prev.remove(); return; }
  const anc = $('nv-sel');
  const m = document.createElement('div');
  m.id = 'nv-picker';
  m.innerHTML = `<input class="nv-buscar" id="nv-buscar" placeholder="Buscar…" autocomplete="off">
    <!-- Filtro: solo las que se pueden comprar y vender desde aquí -->
    <button class="nv-filtro ${_soloOperables ? 'on' : ''}" id="nv-filtro" type="button">
      <span class="nv-fl-ic">${_soloOperables ? '✓' : '○'}</span>
      ${esc(T('Solo las que puedo operar'))}
    </button>
    <div class="nv-lista-mon">
      ${['cripto', 'divisa', 'materia'].map((gr) => {
        const lista = PARES.filter((p) => (p.grupo || 'cripto') === gr);
        if (!lista.length) return '';
        const tit = { cripto: 'Criptomonedas', divisa: 'Divisas', materia: 'Materias primas' }[gr];
        return `<div class="nv-grupo">${esc(T(tit))}</div>` + lista.map((p) => `
          <button class="nv-op ${p.id === _par ? 'on' : ''}" data-np="${p.id}"
                  data-busca="${esc((p.id + ' ' + p.n).toLowerCase())}">
            <i class="nv-logo" data-cg="${esc(p.cg)}"></i>
            <b>${esc(p.id)}</b><span>${esc(p.n)}</span>
          </button>`).join('');
      }).join('')}
    </div>`;
  document.body.appendChild(m);
  const r = anc.getBoundingClientRect();
  const w = m.offsetWidth || 232;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';
  setTimeout(ponerLogos, 30);

  m.addEventListener('click', (e) => e.stopPropagation());
  $('nv-buscar').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    m.querySelectorAll('[data-np]').forEach((x) => {
      x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
    });
    // Ocultar los títulos de grupos que se quedan sin resultados
    m.querySelectorAll('.nv-grupo').forEach((g) => {
      let hay = false, sig = g.nextElementSibling;
      while (sig && !sig.classList.contains('nv-grupo')) {
        if (sig.style.display !== 'none') { hay = true; break; }
        sig = sig.nextElementSibling;
      }
      g.style.display = hay ? '' : 'none';
    });
  };
  /* El filtro deja solo las monedas con contrato en BNB Chain:
     las demás se pueden analizar, pero no operar desde el gráfico. */
  const aplicarFiltro = async () => {
    if (!_operables) {
      try {
        const tk = await import('./tokens.js?v=125');
        _operables = new Set(Object.values(tk.MONEDAS).map((x) => x.simbolo));
      } catch (_) { _operables = new Set(); }
    }
    m.querySelectorAll('[data-np]').forEach((x) => {
      const puede = _operables.has(x.dataset.np);
      x.classList.toggle('no-operable', !puede);
      if (_soloOperables && !puede) x.style.display = 'none';
      else if (!x.dataset.busca || !$('nv-buscar').value) x.style.display = '';
    });
    m.querySelectorAll('.nv-grupo').forEach((g) => {
      let hay = false, sig = g.nextElementSibling;
      while (sig && !sig.classList.contains('nv-grupo')) {
        if (sig.style.display !== 'none') { hay = true; break; }
        sig = sig.nextElementSibling;
      }
      g.style.display = hay ? '' : 'none';
    });
  };

  $('nv-filtro').onclick = (e) => {
    e.stopPropagation();
    _soloOperables = !_soloOperables;
    const b = $('nv-filtro');
    b.classList.toggle('on', _soloOperables);
    b.querySelector('.nv-fl-ic').textContent = _soloOperables ? '✓' : '○';
    if (!_soloOperables) m.querySelectorAll('[data-np]').forEach((x) => { x.style.display = ''; });
    aplicarFiltro();
  };
  aplicarFiltro();

  setTimeout(() => { try { $('nv-buscar').focus(); } catch (_) {} }, 60);

  m.querySelectorAll('[data-np]').forEach((b) => b.onclick = () => {
    _par = b.dataset.np;
    const bb = anc.querySelector('b'); if (bb) bb.textContent = _par;
    const lg = anc.querySelector('.nv-logo');
    if (lg) { lg.dataset.cg = (PARES.find((x) => x.id === _par) || {}).cg || ''; lg.classList.remove('con'); lg.style.backgroundImage = ''; }
    m.remove();
    /* Una ficha de otra moneda no puede quedarse abierta. */
    try { if (_cerrarFichas) _cerrarFichas(); } catch (_) {}
    N.vista.desde = 0; N.vista.zoomY = 1;
    ponerLogos();
    recargar();
  });
  setTimeout(() => document.addEventListener('click', () => {
    const x = document.getElementById('nv-picker'); if (x) x.remove();
  }, { once: true }), 10);
}

const CLAVE_LOGOS = 'aurex-logos';
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
  document.querySelectorAll('.nv-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA
   ══════════════════════════════════════════════════════════════ */
const PASOS_NV = [
  {
    t: 'Dónde comprar y dónde vender',
    d: 'Esta herramienta hace una sola cosa: analiza la estructura del mercado y <b>dibuja los niveles</b> donde el precio ha reaccionado de verdad.',
    x: 'Sin celdas que descifrar ni indicadores que interpretar. Verde es compra, rojo es venta.'
  },
  {
    t: 'De dónde salen los niveles',
    d: 'De los <b>pivotes reales</b>: los puntos donde el precio giró. Si volvió a la misma zona dos, tres o cuatro veces sin romperla, ese nivel importa.',
    x: 'Todo se calcula con las velas de Binance. No hay estimaciones ni datos inventados.'
  },
  {
    t: 'Por qué unos niveles y otros no',
    d: 'Un nivel solo se dibuja si supera el filtro: <b>al menos 2 toques confirmados</b>, volumen real negociado en la zona y fuerza suficiente.',
    x: 'Preferimos enseñar tres niveles buenos que veinte que no sirven. La línea gruesa indica más fuerza.'
  },
  {
    t: 'El asistente le habla',
    d: 'Las burbujas que salen sobre la gráfica le dicen qué está pasando <b>en ese momento</b> y qué hacer con ello. Tóquelas para ver el porqué.',
    x: 'Cada burbuja está anclada a su precio: si mueve la gráfica, la burbuja sigue a su nivel.'
  },
  {
    t: 'Cuando no hay entrada, se lo decimos',
    d: 'Si el mercado está lateral o el precio está lejos de todo, el asistente <b>lo dice claramente</b> en vez de inventar una señal.',
    x: 'Saber cuándo NO entrar vale tanto como saber cuándo hacerlo. Ahí es donde se pierde el dinero.'
  },
  {
    t: 'La tendencia manda',
    d: 'Se mide por <b>estructura</b>, como lo hace un trader: máximos y mínimos crecientes es alcista; decrecientes es bajista. No usamos indicadores.',
    x: 'Un soporte con la tendencia a favor vale mucho más que uno en contra. El asistente lo tiene en cuenta.'
  },
  {
    t: 'Cómo mover la gráfica',
    d: 'Arrastre para recorrer el tiempo. Rueda para acercar. Rueda o arrastre <b>sobre la escala de precios</b> para estirar en vertical. Doble clic reencuadra.',
    x: 'En el móvil: un dedo mueve, dos dedos acercan o estiran según cómo los separe.'
  },
  {
    t: 'Úselo con las otras dos',
    d: 'Liquidity Pools dice <b>hacia dónde</b> va el precio. Institutional Radar dice <b>qué lo frena ahora</b>. Smart Levels dice <b>dónde entrar</b>.',
    x: 'Un nivel de compra que coincide con un muro real del Radar es la confluencia más fuerte que va a encontrar.'
  },
  {
    t: 'Una última cosa',
    d: 'Esto es <b>análisis, no una promesa</b>. Los niveles son zonas donde el precio ha reaccionado antes, y por eso es probable que vuelva a hacerlo.',
    x: 'Ningún análisis garantiza nada. Use siempre stop y no arriesgue más de lo que puede permitirse perder.'
  }
];

let _pasoNv = 0;

function ayuda() {
  _pasoNv = 0;
  const d = document.createElement('div');
  d.id = 'nv-ayuda-box';
  d.innerHTML = `<div class="nv-bg"></div>
    <div class="nva-c">
      <button class="nva-x" id="nva-x" aria-label="Cerrar">✕</button>
      <div class="nva-eyebrow">Smart Levels</div>
      <div id="nva-cuerpo"></div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.nv-bg').onclick = q;
  $('nva-x').onclick = q;
  pasoNv();
}

function pasoNv() {
  const c = $('nva-cuerpo'); if (!c) return;
  const p = PASOS_NV[_pasoNv];
  const ultimo = _pasoNv === PASOS_NV.length - 1;
  c.innerHTML = `
    <div class="nva-card">
      <div class="nva-n">${_pasoNv + 1} <em>de ${PASOS_NV.length}</em></div>
      <div class="nva-t">${p.t}</div>
      <div class="nva-d">${p.d}</div>
      <div class="nva-x2">${p.x}</div>
    </div>
    <div class="nva-puntos">
      ${PASOS_NV.map((_, i) => `<i class="${i === _pasoNv ? 'on' : ''}" data-pnv="${i}"></i>`).join('')}
    </div>
    <div class="nva-acts">
      ${_pasoNv > 0 ? '<button class="nva-atras" id="nva-atras">Atrás</button>' : ''}
      <button class="nva-b" id="nva-sig">${ultimo ? 'Entendido' : 'Saber más'}</button>
    </div>`;
  $('nva-sig').onclick = () => {
    if (ultimo) { document.getElementById('nv-ayuda-box')?.remove(); return; }
    _pasoNv++; pasoNv();
  };
  const at = $('nva-atras');
  if (at) at.onclick = () => { _pasoNv = Math.max(0, _pasoNv - 1); pasoNv(); };
  c.querySelectorAll('[data-pnv]').forEach((b) => b.onclick = () => { _pasoNv = Number(b.dataset.pnv); pasoNv(); });
}

/* ══════════════════════════════════════════════════════════════
   COMPARTIR
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const cv = $('nv-cv'); if (!cv) return;

  /* ══════════════════════════════════════════════════════════
     LA IMAGEN PARA COMPARTIR

     [MEJORADO] Antes solo salía el lienzo del gráfico. Ahora se
     compone la pieza completa: cabecera con el par y el precio,
     las píldoras del análisis, la gráfica y la franja de marca.

     Es la publicidad de la herramienta: quien la reciba tiene que
     ver qué es y de dónde salió.
     ══════════════════════════════════════════════════════════ */
  const marca = document.querySelector('.nv-marca');
  const antes = marca ? marca.style.display : null;
  if (marca) marca.style.display = 'none';
  const devolver = () => { if (marca) marca.style.display = antes || ''; };

  try {
    const e2 = cv.width / cv.clientWidth;
    const W = cv.width;
    const hCab = 66 * e2;          // cabecera
    const hAna = N.mensajes && N.mensajes.length ? 78 * e2 : 0;
    const hPie = 82 * e2;          // franja de marca
    const out = document.createElement('canvas');
    out.width = W;
    out.height = hCab + cv.height + hAna + hPie;
    const g = out.getContext('2d');

    g.fillStyle = '#0b0f16';
    g.fillRect(0, 0, out.width, out.height);

    /* ── Cabecera: par, marco y precio ── */
    g.fillStyle = '#0a0d13';
    g.fillRect(0, 0, W, hCab);
    g.fillStyle = 'rgba(255,255,255,.06)';
    g.fillRect(0, hCab - 1, W, 1);

    g.textAlign = 'left';
    g.fillStyle = '#eaecef';
    g.font = `800 ${23 * e2}px system-ui,sans-serif`;
    g.fillText(_par, 20 * e2, 40 * e2);

    const anchoPar = g.measureText(_par).width;
    g.font = `700 ${13 * e2}px ui-monospace,monospace`;
    g.fillStyle = '#7d8794';
    g.fillText(_tf.toUpperCase(), 20 * e2 + anchoPar + 12 * e2, 40 * e2);

    // La tendencia
    const t = N.tendencia || { dir: 'lateral' };
    const colT = t.dir === 'alcista' ? '#3ee88a' : t.dir === 'bajista' ? '#ff6b7a' : '#9aa5b1';
    const etT = (N.rango ? 'EN RANGO' : nombreTend(t.dir).toUpperCase());
    g.font = `700 ${11 * e2}px ui-monospace,monospace`;
    const wT = g.measureText(etT).width + 20 * e2;
    const xT2 = 20 * e2 + anchoPar + 60 * e2;
    g.fillStyle = colT + '28';
    redondeado(g, xT2, 22 * e2, wT, 22 * e2, 6 * e2); g.fill();
    g.fillStyle = colT;
    g.fillText(etT, xT2 + 10 * e2, 37 * e2);

    // El precio, a la derecha
    g.textAlign = 'right';
    g.fillStyle = '#E8B84B';
    g.font = `800 ${23 * e2}px system-ui,sans-serif`;
    g.fillText(fmt(N.precio), W - 20 * e2, 40 * e2);

    /* ── El gráfico ── */
    g.drawImage(cv, 0, hCab);

    /* ── Las lecturas del análisis ── */
    if (hAna > 0) {
      const yA = hCab + cv.height;
      g.fillStyle = '#0d1219';
      g.fillRect(0, yA, W, hAna);
      g.fillStyle = 'rgba(255,255,255,.06)';
      g.fillRect(0, yA, W, 1);

      g.textAlign = 'left';
      g.fillStyle = '#5c6672';
      g.font = `${10 * e2}px ui-monospace,monospace`;
      g.fillText('ANÁLISIS', 20 * e2, yA + 20 * e2);

      let x = 20 * e2;
      N.mensajes.slice(0, 3).forEach((m, i) => {
        const et = { compra: 'COMPRA', venta: 'VENTA', vigilar: 'VIGILAR',
                     aviso: 'ESPERA', tendencia: 'TENDENCIA', contexto: 'CONTEXTO' }[m.tipo] || '';
        const c = m.tipo === 'compra' ? '#2ee86a' : m.tipo === 'venta' ? '#f6465d' : '#E8B84B';
        const txt = `${i + 1}  ${et}  ·  ${m.titulo}`;
        g.font = `700 ${12 * e2}px system-ui,sans-serif`;
        const w = g.measureText(txt).width + 26 * e2;
        if (x + w > W - 20 * e2) return;
        g.fillStyle = c + '22';
        redondeado(g, x, yA + 32 * e2, w, 30 * e2, 8 * e2); g.fill();
        g.strokeStyle = c + '77'; g.lineWidth = 1.5 * e2;
        redondeado(g, x, yA + 32 * e2, w, 30 * e2, 8 * e2); g.stroke();
        g.fillStyle = c;
        g.fillText(txt, x + 13 * e2, yA + 52 * e2);
        x += w + 10 * e2;
      });
    }

    /* ── La franja de marca ── */
    const yB = hCab + cv.height + hAna;
    g.fillStyle = '#0b0e12';
    g.fillRect(0, yB, W, hPie);
    g.fillStyle = 'rgba(232,184,75,.4)';
    g.fillRect(0, yB, W, 2 * e2);

    const textos = (wLogo) => {
      const x0 = wLogo ? 20 * e2 + wLogo + 18 * e2 : 20 * e2;
      g.textAlign = 'left';
      g.fillStyle = '#E8B84B';
      g.font = `800 ${20 * e2}px system-ui,sans-serif`;
      g.fillText('Smart Levels', x0, yB + 36 * e2);
      g.font = `700 ${14 * e2}px ui-monospace,monospace`;
      g.fillStyle = '#C9A84B';
      g.fillText('CriptoCubaOficial.com', x0, yB + 58 * e2);

      g.textAlign = 'right';
      g.fillStyle = '#6b7681';
      g.font = `${11 * e2}px ui-monospace,monospace`;
      g.fillText('Análisis automático · no es asesoramiento financiero', W - 20 * e2, yB + 36 * e2);
      g.fillText(new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        W - 20 * e2, yB + 58 * e2);
      g.textAlign = 'left';
    };

    const bajar = () => out.toBlob((blob) => {
      devolver();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `criptocuba-analisis-${_par}-${_tf}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');

    const logo = new Image();
    let hecho = false;
    const una = (w) => { if (hecho) return; hecho = true; textos(w); bajar(); };
    logo.onload = () => {
      try {
        const alto = 54 * e2;
        const ancho = Math.round(logo.width * (alto / logo.height));
        g.drawImage(logo, 20 * e2, yB + (hPie - alto) / 2, ancho, alto);
        una(ancho);
      } catch (_) { una(0); }
    };
    logo.onerror = () => una(0);
    setTimeout(() => una(0), 1600);
    logo.src = 'assets/img/cco-marca.png';
  } catch (_) { devolver(); }
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('nv-css')) return;
  const s = document.createElement('style'); s.id = 'nv-css';
  s.textContent = `
  #nv-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #nv-overlay .nv-bg{position:absolute;inset:0;background:rgba(3,5,8,.95)}
  #nv-overlay .nv-c{position:relative;width:100%;height:100vh;height:100dvh;
    display:flex;flex-direction:column;background:#0b0f16}

  /* ── Cabecera ── */
  /* [CORREGIDO] La barra recortaba los paneles con overflow. Ahora
     no recorta y queda por encima de la gráfica. */
  #nv-overlay .nv-cab{display:flex;align-items:center;gap:11px;flex:0 0 auto;
    padding:9px 12px;background:#0a0d13;border-bottom:1px solid #1a1f28;
    position:relative;z-index:30;overflow:visible}
  #nv-overlay .nv-cab::-webkit-scrollbar{display:none}
  #nv-overlay .nv-sel{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;min-height:36px;
    padding:0 12px;border-radius:10px;background:#141922;border:1px solid #2b3139;color:#eaecef;
    cursor:pointer;font-family:var(--mono,monospace);font-size:12.5px}
  #nv-overlay .nv-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #nv-overlay .nv-sel svg{width:13px;height:13px;opacity:.6}
  .nv-logo{width:20px;height:20px;border-radius:50%;flex:0 0 auto;display:block;
    background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid #2b3139}
  .nv-logo.con{background-color:transparent;border-color:transparent}
  #nv-overlay .nv-tfs{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#141922;border-radius:9px}
  #nv-overlay .nv-tf{min-height:30px;padding:0 13px;border-radius:7px;border:none;background:transparent;
    color:#7d8794;font-family:var(--mono,monospace);font-size:11px;font-weight:700;cursor:pointer}
  #nv-overlay .nv-tf.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #nv-overlay .nv-estado{display:flex;align-items:center;gap:10px;flex:0 0 auto}
  #nv-overlay .nv-pill{padding:4px 11px;border-radius:20px;font-family:var(--mono,monospace);
    font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px}
  #nv-overlay .nv-pill.sube{background:rgba(46,232,106,.16);color:#3ee88a}
  #nv-overlay .nv-pill.baja{background:rgba(246,70,93,.16);color:#ff6b7a}
  #nv-overlay .nv-pill.lat{background:rgba(139,150,163,.14);color:#9aa5b1}
  #nv-overlay .nv-precio{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;
    color:var(--gold,#E8B84B)}
  #nv-overlay .nv-der{margin-left:auto;display:flex;gap:6px;flex:0 0 auto}
  #nv-overlay .nv-ico{width:36px;height:36px;min-height:36px;flex:0 0 auto;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;
    background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #nv-overlay .nv-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #nv-overlay .nv-comof{width:auto;padding:0 14px;border-color:rgba(232,184,75,.4);color:var(--gold,#E8B84B)}
  #nv-overlay .nv-cf-tx{font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;white-space:nowrap}
  #nv-overlay .nv-cf-s{display:none}

  /* ── La barra de veredicto ── */
  #nv-overlay .nv-veredicto{display:flex;align-items:center;gap:10px;flex:0 0 auto;
    padding:8px 12px;background:#0d1219;border-bottom:1px solid #1a1f28;
    position:relative;z-index:28;overflow:visible;min-height:44px}
  #nv-overlay .nv-meta{margin-left:auto;display:flex;gap:7px;flex:0 0 auto}
  #nv-overlay .nv-v-tag{font-family:var(--mono,monospace);font-size:11px;font-weight:800;
    letter-spacing:1.2px;padding:5px 12px;border-radius:8px}
  #nv-overlay .nv-v-tag.comprar{background:linear-gradient(180deg,#4dffa0,#1fc96e);color:#04210f}
  #nv-overlay .nv-v-tag.vender{background:linear-gradient(180deg,#ff8a95,#e03546);color:#2a0509}
  #nv-overlay .nv-v-tag.esperar{background:rgba(232,184,75,.18);color:var(--gold,#E8B84B);
    border:1px solid rgba(232,184,75,.4)}
  #nv-overlay .nv-v-tx{flex:1;min-width:0;font-family:var(--display,sans-serif);font-weight:700;
    font-size:14px;color:#eaecef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #nv-overlay .nv-v-hz,#nv-overlay .nv-v-pt{font-family:var(--mono,monospace);font-size:9.5px;
    color:#5c6672;white-space:nowrap;padding:3px 9px;border-radius:20px;background:rgba(255,255,255,.04)}

  /* ── La gráfica ocupa todo ── */
  #nv-overlay .nv-graf{flex:1;min-height:0;position:relative;background:#0b0f16}
  #nv-overlay .nv-cv{display:block}

  /* El logo: se tiene que ver que somos nosotros */
  #nv-overlay .nv-marca{position:absolute;left:16px;bottom:40px;height:42px;width:auto;
    opacity:.85;pointer-events:none;filter:drop-shadow(0 2px 9px rgba(0,0,0,.95))}

  #nv-overlay .nv-esperando{position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:12px;text-align:center;padding:30px;
    background:rgba(11,15,22,.96);z-index:9}
  #nv-overlay .nv-spin{width:38px;height:38px;border-radius:50%;
    border:2.5px solid rgba(232,184,75,.16);border-top-color:var(--gold,#E8B84B);
    animation:nvGira .85s linear infinite}
  @keyframes nvGira{to{transform:rotate(360deg)}}
  #nv-overlay .nv-esperando b{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;color:#eaecef}
  #nv-overlay .nv-esperando span{font-family:var(--sans,sans-serif);font-size:13px;color:#7d8794;
    max-width:36ch;line-height:1.6}
  #nv-overlay .nv-btn{min-height:44px;padding:0 22px;border-radius:11px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;margin-top:6px}

  /* ══════════════════════════════════════════════════════════
     LAS CÁPSULAS · arriba a la derecha, donde no hay velas
     ══════════════════════════════════════════════════════════ */
  #nv-overlay .nv-burbujas{display:none}
  /* Las cápsulas viven en la barra superior, en horizontal */
  #nv-overlay .nv-caps{display:flex;align-items:center;gap:6px;flex:0 0 auto}
  #nv-overlay .nv-cap{position:relative}

  #nv-overlay .nv-cap-b{display:flex;align-items:center;gap:7px;padding:4px 10px 4px 4px;
    border-radius:20px;cursor:pointer;white-space:nowrap;
    background:rgba(13,17,23,.95);border:1.5px solid #3a424c;
    box-shadow:0 3px 14px rgba(0,0,0,.6);transition:transform .15s}
  #nv-overlay .nv-cap-b:hover{transform:scale(1.04)}
  /* Parpadeo discreto: "tengo algo que decirte" */
  #nv-overlay .nv-cap.avisa .nv-cap-b{animation:nvAvisa 2.6s ease-in-out infinite}
  @keyframes nvAvisa{0%,100%{box-shadow:0 3px 14px rgba(0,0,0,.6)}
                     50%{box-shadow:0 3px 14px rgba(0,0,0,.6),0 0 0 4px rgba(232,184,75,.16)}}
  #nv-overlay .nv-cap.abierto .nv-cap-b{animation:none}
  #nv-overlay .nv-num{width:19px;height:19px;flex:0 0 auto;border-radius:6px;
    display:grid;place-items:center;font-family:var(--display,sans-serif);
    font-weight:800;font-size:11px;background:rgba(255,255,255,.1);color:#b7bdc6}
  #nv-overlay .nv-cap.plan .nv-num{background:linear-gradient(180deg,#f7db8d,#E8B84B);color:#3a2800}
  #nv-overlay .nv-cap.plan .nv-cap-b{border-width:2px}
  #nv-overlay .nv-cap-ava{width:22px;height:22px;border-radius:50%;object-fit:cover;flex:0 0 auto;
    border:1px solid rgba(232,184,75,.5)}
  #nv-overlay .nv-cap-tx{font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;letter-spacing:.6px}
  /* La flecha late como una lucecita: dice "aquí hay algo, tócame" */
  #nv-overlay .nv-cap-fl{font-size:11px;transition:transform .2s;
    animation:nvFlecha 1.8s ease-in-out infinite}
  @keyframes nvFlecha{
    0%,100%{opacity:.35;transform:translateY(0)}
    50%{opacity:1;transform:translateY(1.5px)}}
  #nv-overlay .nv-cap.abierto .nv-cap-fl{transform:rotate(180deg);animation:none;opacity:.6}
  #nv-overlay .t-compra .nv-cap-fl{color:#3ee88a}
  #nv-overlay .t-venta .nv-cap-fl{color:#ff6b7a}
  #nv-overlay .t-aviso .nv-cap-fl{color:var(--gold,#E8B84B)}
  #nv-overlay .t-vigilar .nv-cap-fl,#nv-overlay .t-contexto .nv-cap-fl{color:#9aa5b1}
  #nv-overlay .t-tendencia .nv-cap-fl{color:#6fb0ff}
  #nv-overlay .t-compra .nv-cap-b{border-color:#2ee86a}
  #nv-overlay .t-compra .nv-cap-tx{color:#3ee88a}
  #nv-overlay .t-venta .nv-cap-b{border-color:#f6465d}
  #nv-overlay .t-venta .nv-cap-tx{color:#ff6b7a}
  #nv-overlay .t-aviso .nv-cap-b{border-color:rgba(232,184,75,.75)}
  #nv-overlay .t-aviso .nv-cap-tx{color:var(--gold,#E8B84B)}
  #nv-overlay .t-vigilar .nv-cap-b,#nv-overlay .t-contexto .nv-cap-b{border-color:#5c6672}
  #nv-overlay .t-vigilar .nv-cap-tx,#nv-overlay .t-contexto .nv-cap-tx{color:#9aa5b1}
  #nv-overlay .t-tendencia .nv-cap-b{border-color:#4d9fff}
  #nv-overlay .t-tendencia .nv-cap-tx{color:#6fb0ff}

  /* El panel cuelga de su cápsula, sobre la gráfica */
  #nv-overlay .nv-cap-panel{display:none;position:absolute;top:calc(100% + 9px);left:0;
    z-index:40;width:min(330px, calc(100vw - 24px));
    padding:13px;border-radius:14px;text-align:left;
    background:linear-gradient(165deg,rgba(20,26,35,.985),rgba(11,15,22,.985));
    border:1px solid #3a424c;box-shadow:0 14px 40px rgba(0,0,0,.72);
    max-height:min(62vh, 460px);overflow-y:auto;animation:nvAbrePanel .22s ease both}
  #nv-overlay .nv-cap.abierto .nv-cap-panel{display:block}
  @keyframes nvAbrePanel{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  #nv-overlay .t-compra .nv-cap-panel{border-color:rgba(46,232,106,.45)}
  #nv-overlay .t-venta .nv-cap-panel{border-color:rgba(246,70,93,.45)}
  #nv-overlay .t-aviso .nv-cap-panel{border-color:rgba(232,184,75,.4)}

  #nv-overlay .nv-pm-cab{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  #nv-overlay .nv-pm-ava{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:0 0 auto;
    border:1.5px solid rgba(232,184,75,.6)}
  #nv-overlay .nv-pm-quien{flex:1;min-width:0}
  #nv-overlay .nv-pm-quien b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:12px;color:var(--gold,#E8B84B);line-height:1.1}
  #nv-overlay .nv-pm-quien span{display:block;font-family:var(--display,sans-serif);font-weight:700;
    font-size:13.5px;color:#eaecef;line-height:1.25;overflow-wrap:anywhere}
  #nv-overlay .nv-pm-tx{min-height:30px;font-family:var(--sans,sans-serif);font-size:12.5px;
    color:#b7bdc6;line-height:1.55}
  #nv-overlay .nv-pm-hacer{margin-top:9px;padding:10px 12px;border-radius:10px;
    background:rgba(0,0,0,.38);border-left:2px solid rgba(232,184,75,.6);
    font-family:var(--sans,sans-serif);font-size:12px;color:#e2e8ee;line-height:1.5}

  /* La tabla del plan de operación */
  #nv-overlay .nv-plan{margin-top:10px;padding:11px;border-radius:11px;
    background:rgba(255,255,255,.035);border:1px solid #2b3139}
  #nv-overlay .nv-plan-t{font-family:var(--mono,monospace);font-size:9px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:1.3px;margin-bottom:8px}
  #nv-overlay .nv-plan-fila{display:flex;align-items:center;gap:8px;padding:5px 0;
    border-bottom:1px solid rgba(255,255,255,.05)}
  #nv-overlay .nv-plan-fila:last-of-type{border-bottom:none}
  #nv-overlay .nv-plan-fila span{flex:1;font-family:var(--sans,sans-serif);font-size:11.5px;color:#8b96a3}
  #nv-overlay .nv-plan-fila span em{font-style:normal;font-family:var(--mono,monospace);
    font-size:9px;color:#5c6672;margin-left:3px}
  #nv-overlay .nv-plan-fila b{font-family:var(--mono,monospace);font-size:12.5px;color:#eaecef}
  #nv-overlay .nv-plan-fila i{font-style:normal;font-family:var(--mono,monospace);font-size:10px;
    min-width:52px;text-align:right}
  #nv-overlay .nv-plan-fila.entrada b{color:var(--gold,#E8B84B)}
  #nv-overlay .nv-plan-fila.stop b,#nv-overlay .nv-plan-fila.stop i{color:#ff6b7a}
  #nv-overlay .nv-plan-fila.obj b,#nv-overlay .nv-plan-fila.obj i{color:#3ee88a}
  #nv-overlay .nv-plan-pie{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);
    font-family:var(--mono,monospace);font-size:9.5px;color:#5c6672}
  #nv-overlay .nv-plan-pie b{color:#b7bdc6}

  #nv-overlay .nv-acts{display:flex;gap:6px;margin-top:9px}
  #nv-overlay .nv-pm-mas,#nv-overlay .nv-senala{flex:1;min-height:34px;border-radius:8px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:9.5px;letter-spacing:.5px;padding:0 8px}
  #nv-overlay .nv-senala{background:rgba(232,184,75,.12);border-color:rgba(232,184,75,.4);
    color:var(--gold,#E8B84B);font-weight:700}
  #nv-overlay .nv-herr{margin-top:9px;padding-top:9px;border-top:1px solid rgba(255,255,255,.07)}
  #nv-overlay .nv-herr-t{font-family:var(--mono,monospace);font-size:8.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px}
  #nv-overlay .nv-herr-rej{display:flex;flex-direction:column;gap:5px}
  #nv-overlay .nv-herr-b{width:100%;padding:8px 11px;border-radius:9px;cursor:pointer;
    text-align:left;background:rgba(255,255,255,.04);border:1px solid #2b3139}
  #nv-overlay .nv-herr-b b{display:block;font-family:var(--display,sans-serif);
    font-weight:700;font-size:12px;color:#eaecef;margin-bottom:1px}
  #nv-overlay .nv-herr-b span{display:block;font-family:var(--sans,sans-serif);
    font-size:10px;color:#7d8794;line-height:1.3}
  #nv-overlay .nv-herr-b.on{background:rgba(232,184,75,.14);border-color:var(--gold,#E8B84B)}
  #nv-overlay .nv-herr-b.on b{color:var(--gold,#E8B84B)}

  #nv-overlay .nv-pm-det{display:none;margin-top:9px}
  #nv-overlay .nv-cap.con-detalle .nv-pm-det{display:block}
  #nv-overlay .nv-pm-li{font-family:var(--mono,monospace);font-size:10.5px;color:#8b96a3;
    line-height:1.7;padding-left:11px;position:relative}
  #nv-overlay .nv-pm-li:before{content:'·';position:absolute;left:2px;color:#5c6672}

  /* ── Panel de herramientas ── */
  #nv-overlay .nv-herr-btn.activa{border-color:var(--gold,#E8B84B);color:var(--gold,#E8B84B)}
  #nv-herr-panel{position:fixed;z-index:9795;width:292px;padding:8px;
    background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:14px;
    box-shadow:0 16px 44px rgba(0,0,0,.75)}
  #nv-herr-panel .nv-hp-t{font-family:var(--mono,monospace);font-size:9px;
    color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:1.4px;
    padding:6px 8px 8px}
  #nv-herr-panel .nv-hp-b{display:flex;align-items:flex-start;gap:10px;width:100%;
    padding:10px 11px;margin-bottom:4px;border-radius:10px;cursor:pointer;text-align:left;
    background:rgba(255,255,255,.035);border:1px solid #2b3139}
  #nv-herr-panel .nv-hp-b:hover:not(:disabled){border-color:var(--gold-soft,#C9A84B)}
  #nv-herr-panel .nv-hp-b.on{background:rgba(232,184,75,.14);border-color:var(--gold,#E8B84B)}
  #nv-herr-panel .nv-hp-b.no-hay{opacity:.45;cursor:not-allowed}
  #nv-herr-panel .nv-hp-luz{width:9px;height:9px;border-radius:50%;flex:0 0 auto;margin-top:4px;
    background:#3a424c;border:1px solid #4a525c;transition:background .18s}
  #nv-herr-panel .nv-hp-b.on .nv-hp-luz{background:var(--gold,#E8B84B);
    border-color:var(--gold,#E8B84B);box-shadow:0 0 8px rgba(232,184,75,.6)}
  #nv-herr-panel .nv-hp-tx{flex:1;min-width:0}
  #nv-herr-panel .nv-hp-tx b{display:block;font-family:var(--display,sans-serif);
    font-weight:700;font-size:13px;color:#eaecef;margin-bottom:2px}
  #nv-herr-panel .nv-hp-b.on .nv-hp-tx b{color:var(--gold,#E8B84B)}
  #nv-herr-panel .nv-hp-tx span{display:block;font-family:var(--sans,sans-serif);
    font-size:10.5px;color:#7d8794;line-height:1.4}
  #nv-herr-panel .nv-hp-pie{padding:6px 8px 2px;font-family:var(--mono,monospace);
    font-size:9px;color:#4a525c;text-align:center}
  @media(max-width:560px){
    #nv-herr-panel{left:8px !important;right:8px !important;width:auto !important}
  }

  /* ── Menú de herramientas ── */
  #nv-herr-menu{position:fixed;z-index:9795;box-sizing:border-box;width:min(300px, calc(100vw - 16px));padding:8px;
    background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:14px;
    box-shadow:0 16px 44px rgba(0,0,0,.75)}
  #nv-herr-menu .nv-hm-t{font-family:var(--mono,monospace);font-size:9px;
    color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:1.4px;padding:4px 8px 8px}
  /* Cada herramienta es una fila; la separación entre filas es real */
  #nv-herr-menu .nv-hm-fila{margin-bottom:7px}
  #nv-herr-menu .nv-hm-fila:last-of-type{margin-bottom:0}
  /* La fila: una sola línea, estrecha */
  #nv-herr-menu .nv-hm-b{display:flex;align-items:center;gap:10px;width:100%;
    padding:9px 10px;border-radius:10px;cursor:pointer;text-align:left;
    background:rgba(255,255,255,.035);border:1px solid #2b3139;
    transition:border-color .15s,background .15s}
  #nv-herr-menu .nv-hm-b:hover{border-color:var(--gold-soft,#C9A84B)}
  #nv-herr-menu .nv-hm-b.on{background:rgba(232,184,75,.14);border-color:var(--gold,#E8B84B)}
  /* La lucecita del interruptor: apagada gris, encendida dorada */
  #nv-herr-menu .nv-hm-luz{width:10px;height:10px;border-radius:50%;flex:0 0 auto;
    background:#3a424c;border:1px solid #4a525c;transition:background .18s,box-shadow .18s}
  #nv-herr-menu .nv-hm-b.on .nv-hm-luz{background:var(--gold,#E8B84B);
    border-color:var(--gold,#E8B84B);box-shadow:0 0 9px rgba(232,184,75,.65)}
  /* Nombre + etiqueta, en la misma línea, sin desbordar */
  #nv-herr-menu .nv-hm-tx{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;
    text-overflow:ellipsis}
  #nv-herr-menu .nv-hm-tx b{font-family:var(--display,sans-serif);
    font-weight:700;font-size:13px;color:#eaecef}
  #nv-herr-menu .nv-hm-b.on .nv-hm-tx b{color:var(--gold,#E8B84B)}
  #nv-herr-menu .nv-hm-tx em{font-style:normal;font-family:var(--mono,monospace);
    font-size:8.5px;color:var(--gold,#E8B84B);margin-left:6px;
    padding:1px 5px;border-radius:4px;background:rgba(232,184,75,.16)}
  /* El "?" que despliega la descripción a demanda */
  #nv-herr-menu .nv-hm-q{flex:0 0 auto;width:19px;height:19px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    font-family:var(--mono,monospace);font-size:11px;font-weight:700;line-height:1;
    color:var(--gold,#E8B84B);background:transparent;
    border:1px solid var(--gold-soft,#C9A84B);padding:0;transition:background .15s}
  #nv-herr-menu .nv-hm-q:hover{background:rgba(232,184,75,.18)}
  /* La descripción: plegada por defecto, no ocupa espacio permanente */
  #nv-herr-menu .nv-hm-desc{max-height:0;overflow:hidden;opacity:0;
    font-family:var(--sans,sans-serif);font-size:10.5px;color:#7d8794;line-height:1.45;
    transition:max-height .22s ease,opacity .18s,padding .22s}
  #nv-herr-menu .nv-hm-desc.abierta{max-height:120px;opacity:1;padding:7px 10px 3px}
  #nv-herr-menu .nv-hm-pie{padding:9px 8px 3px;font-family:var(--mono,monospace);
    font-size:8.5px;color:#4a525c;text-align:center;line-height:1.4}

  /* ── Selector ── */
  #nv-picker{position:fixed;z-index:9790;min-width:232px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:13px;padding:6px;
    box-shadow:0 16px 44px rgba(0,0,0,.72)}
  #nv-picker .nv-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;
    border-radius:9px;border:1px solid #2b3139;background:#0b0e12;color:#eaecef;
    font-family:var(--sans,sans-serif);font-size:13px;min-height:38px}
  #nv-picker .nv-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #nv-picker .nv-lista-mon{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  #nv-picker .nv-filtro{display:flex;align-items:center;gap:8px;width:100%;min-height:36px;
    padding:0 11px;margin-bottom:6px;border-radius:9px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--sans,sans-serif);font-size:12px;text-align:left}
  #nv-picker .nv-filtro:hover{border-color:var(--gold-soft,#C9A84B)}
  #nv-picker .nv-filtro.on{background:rgba(232,184,75,.14);border-color:var(--gold,#E8B84B);
    color:var(--gold,#E8B84B);font-weight:600}
  #nv-picker .nv-fl-ic{font-size:12px;flex:0 0 auto}
  #nv-picker .nv-op.no-operable b{color:#5c6672}
  #nv-picker .nv-op.no-operable:after{content:'solo análisis';margin-left:auto;
    font-family:var(--mono,monospace);font-size:8px;color:#4a525c;flex:0 0 auto}

  #nv-picker .nv-grupo{font-family:var(--mono,monospace);font-size:8.5px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:1.3px;padding:9px 11px 4px;position:sticky;top:0;
    background:linear-gradient(180deg,#1b2027,#1b2027 70%,transparent)}
  #nv-picker .nv-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;
    border-radius:9px;background:transparent;border:none;color:#b7bdc6;cursor:pointer;
    text-align:left;min-height:42px}
  #nv-picker .nv-op:hover{background:rgba(255,255,255,.05)}
  #nv-picker .nv-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  #nv-picker .nv-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:46px}
  #nv-picker .nv-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  /* ── Ayuda ── */
  #nv-ayuda-box{position:fixed;inset:0;z-index:9770;display:flex;align-items:center;justify-content:center;padding:16px}
  #nv-ayuda-box .nv-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #nv-ayuda-box .nva-c{position:relative;width:100%;max-width:540px;max-height:calc(100vh - 32px);
    overflow-y:auto;background:linear-gradient(180deg,#161b22,#0b0e12);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #nv-ayuda-box .nva-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
  #nv-ayuda-box .nva-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:18px}
  #nv-ayuda-box .nva-card{padding:24px 20px;border-radius:16px;text-align:center;margin-bottom:18px;
    background:linear-gradient(165deg,rgba(232,184,75,.08),rgba(255,255,255,.015));
    border:1px solid rgba(232,184,75,.26)}
  #nv-ayuda-box .nva-n{font-family:var(--mono,monospace);font-size:11px;color:var(--gold,#E8B84B);
    font-weight:700;margin-bottom:10px}
  #nv-ayuda-box .nva-n em{font-style:normal;color:#5c6672;font-weight:400}
  #nv-ayuda-box .nva-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;
    color:#eaecef;margin-bottom:12px;line-height:1.25}
  #nv-ayuda-box .nva-d{font-family:var(--sans,sans-serif);font-size:14px;color:#b7bdc6;
    line-height:1.7;margin-bottom:14px}
  #nv-ayuda-box .nva-d b{color:var(--gold,#E8B84B);font-weight:700}
  #nv-ayuda-box .nva-x2{padding:12px 14px;border-radius:11px;background:rgba(255,255,255,.035);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#8b96a3;line-height:1.55;text-align:left}
  #nv-ayuda-box .nva-puntos{display:flex;gap:5px;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
  #nv-ayuda-box .nva-puntos i{width:7px;height:7px;border-radius:50%;background:#2b3139;cursor:pointer}
  #nv-ayuda-box .nva-puntos i.on{background:var(--gold,#E8B84B);transform:scale(1.35)}
  #nv-ayuda-box .nva-acts{display:flex;gap:9px}
  #nv-ayuda-box .nva-atras{flex:0 0 auto;min-height:48px;padding:0 20px;border-radius:12px;
    background:transparent;border:1px solid #2b3139;color:#8b96a3;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:13px}
  #nv-ayuda-box .nva-b{flex:1;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;
    box-shadow:0 4px 0 #8f6a1a}

  /* Pantallas muy estrechas: todo más compacto para que el plan
     quepa sin pelear con el scroll. */
  @media(max-width:360px){
    #nv-overlay .nv-cap-panel{max-height:min(68dvh, 480px);padding:11px}
    #nv-overlay .nv-plan{padding:8px;margin-top:8px}
    #nv-overlay .nv-plan-fila{padding:3px 0}
    #nv-overlay .nv-pm-ava{width:28px;height:28px}
  }

  @media(max-width:760px){
    #nv-overlay .nv-cab{padding:8px 10px;gap:8px}
    #nv-overlay .nv-comof{width:36px;padding:0}
    #nv-overlay .nv-cf-tx{display:none}
    #nv-overlay .nv-cf-s{display:block}
    #nv-overlay .nv-precio{font-size:15px}
    /* ══ MÓVIL ══
       Las cápsulas se reducen a un círculo con su número y un punto
       rojo latiendo, para que se vea que hay que tocarlas. */
    #nv-overlay .nv-cap-b{width:34px;height:34px;padding:0;border-radius:50%;
      justify-content:center;position:relative}
    #nv-overlay .nv-cap-ava,#nv-overlay .nv-cap-tx{display:none}
    /* La flecha se convierte en el punto que late */
    #nv-overlay .nv-cap-fl{position:absolute;bottom:-1px;right:-1px;font-size:8px}
    /* Los números 2 y 3 salían en negro sobre fondo oscuro */
    #nv-overlay .nv-num{width:auto;height:auto;background:none !important;
      font-size:14px;color:#eaecef !important}
    #nv-overlay .nv-cap.plan .nv-num{color:var(--gold,#E8B84B) !important}
    #nv-overlay .t-compra .nv-num{color:#3ee88a !important}
    #nv-overlay .t-venta .nv-num{color:#ff6b7a !important}
    #nv-overlay .nv-cap-b:after{content:'';position:absolute;top:1px;right:1px;
      width:8px;height:8px;border-radius:50%;background:#ff3b30;
      border:1.5px solid #0b0f16;animation:nvLate 1.9s ease-in-out infinite}
    @keyframes nvLate{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.45;transform:scale(.82)}}
    #nv-overlay .nv-cap.abierto .nv-cap-b:after{display:none}
    /* El panel, a pantalla casi completa */
    /* [CORREGIDO] El panel se cortaba: el max-height en vh no cuenta
       la barra del navegador móvil. Se ancla arriba Y abajo, así
       ocupa exactamente lo que hay disponible. */
    /* [RESUELTO] El panel cabía, pero la tabla del plan quedaba
       por debajo del borde y había que adivinar que existía.

       Ahora el panel se dimensiona con dvh (que sí cuenta la barra
       del navegador móvil), lleva un degradado abajo que avisa de
       que hay más contenido, y desplazamiento suave. */
    #nv-overlay .nv-cap-panel{position:fixed;top:auto;bottom:10px;
      left:8px;right:8px;width:auto;height:auto;
      max-height:min(62dvh, 460px);overflow-y:auto;
      overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
      scroll-behavior:smooth;padding-bottom:22px;
      box-shadow:0 -8px 40px rgba(0,0,0,.8)}
    /* La pista visual de que hay más abajo */
    #nv-overlay .nv-cap.abierto:after{content:'';position:fixed;
      left:9px;right:9px;bottom:11px;height:26px;border-radius:0 0 13px 13px;
      pointer-events:none;z-index:41;
      background:linear-gradient(180deg,transparent,rgba(11,15,22,.96))}
    #nv-overlay .nv-acts{flex-direction:column}
    /* El plan, compacto: cabe entero sin tanto desplazamiento */
    #nv-overlay .nv-plan{padding:9px}
    #nv-overlay .nv-plan-fila{padding:4px 0}
    #nv-overlay .nv-plan-fila span{font-size:11px}
    #nv-overlay .nv-plan-fila b{font-size:12px}
    #nv-overlay .nv-pm-tx{font-size:12px}
    #nv-overlay .nv-pm-hacer{padding:9px 11px;font-size:11.5px}
    /* La barra superior, ordenada en dos filas */
    /* Una sola fila compacta: la banda ancha robaba gráfica */
    #nv-overlay .nv-cab{flex-wrap:nowrap;padding:7px 9px;gap:7px;
      overflow-x:auto;scrollbar-width:none}
    #nv-overlay .nv-cab::-webkit-scrollbar{display:none}
    #nv-overlay .nv-estado{flex:0 0 auto}
    #nv-overlay .nv-pill{padding:3px 8px;font-size:9px}
    #nv-overlay .nv-der{flex:0 0 auto;margin-left:auto}
    #nv-overlay .nv-ico{width:32px;height:32px;min-height:32px}
    /* [CORREGIDO] Las píldoras se cortaban. Ahora tienen su banda
       propia con desplazamiento lateral. */
    #nv-overlay .nv-veredicto{padding:7px 10px;min-height:40px;gap:7px}
    #nv-overlay .nv-caps{flex:1;min-width:0;overflow-x:auto;scrollbar-width:none;
      padding-bottom:1px}
    #nv-overlay .nv-caps::-webkit-scrollbar{display:none}
    #nv-overlay .nv-meta{flex:0 0 auto}
    #nv-overlay .nv-v-hz{display:none}
    #nv-overlay .nv-marca{height:28px;left:10px;bottom:34px}
    #nv-overlay .nv-chip-tx{font-size:9px}
    #nv-overlay .nv-chip-ava{width:20px;height:20px}
    #nv-overlay .nv-pm-quien span{font-size:12.5px}
    #nv-overlay .nv-pm-tx{font-size:12px}
    #nv-overlay .nv-marca{height:26px;left:10px;bottom:34px}
    #nv-ayuda-box .nva-c{padding:20px 14px}
  }`;
  document.head.appendChild(s);
}
