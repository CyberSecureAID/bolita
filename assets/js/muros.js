// muros.js — Detector de Muros Reales
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
  { id: 'MATIC', s: 'MATICUSDT', n: 'Polygon',    cg: 'matic-network' },
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
  { id: 'INJ',   s: 'INJUSDT',   n: 'Injective',  cg: 'injective-protocol' }
];

let _par = 'BNB';

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
  { id: '4h',  n: '4H' }
];

async function traerVelas(simbolo, tf, n = 120) {
  const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`);
  if (!r.ok) throw new Error('sin velas');
  const j = await r.json();
  return j.map((x) => ({
    t: Math.floor(x[0] / 1000),
    o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4])
  }));
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
  tf: '5m',           // temporalidad
  ancho: 70,          // cuántas velas se ven
  filtro: 'todos',
  maxMuro: 1
};

const CADA = 1500;          // una foto cada 1,5 segundos
const MAX_FOTOS = 220;      // ~5,5 minutos de historia
const MIN_TOMAS = 6;        // antes de juzgar, hay que mirar un rato

/* ══════════════════════════════════════════════════════════════
   LOS DATOS — profundidad del libro, API pública sin clave
   ══════════════════════════════════════════════════════════════ */
async function traerLibro(simbolo) {
  const r = await fetch(`https://api.binance.com/api/v3/depth?symbol=${simbolo}&limit=500`);
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
  // número fijo: así funciona igual en BTC que en PEPE.
  /* El umbral se calcula sobre el percentil 90, no la mediana. Con la
     mediana, en libros muy poblados el corte quedaba tan alto que ni
     los muros grandes lo pasaban. */
  /* [UNIFICADO] El umbral del panel era mucho más exigente que el del
     dibujo: se veían muros en el mapa pero el panel decía "libro
     tranquilo". Ahora usan la misma referencia. */
  const vals = todos.map((x) => x.v).sort((a, b) => a - b);
  const base = vals[Math.floor(vals.length * 0.55)] || 1;
  const umbral = base * 2.2;

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
    if (nv.tomas < 3) return;
    const vivo = nv.ausente === 0;
    const segundos = (nv.visto - nv.nacio) / 1000;
    const consumidoPct = nv.vInicial > 0 ? nv.consumido / nv.vInicial : 0;

    let tipo, titulo, nota, prioridad;

    if (nv.recargas >= 2) {
      tipo = 'recargable';
      titulo = 'Muro con recarga';
      nota = 'Alguien está reponiendo su orden cada vez que se la comen. Es un jugador grande defendiendo este precio sin querer llamar la atención.';
      prioridad = 100;

    } else if (nv.huyo && nv.desapariciones >= 2) {
      tipo = 'falso';
      titulo = 'Muro falso';
      nota = 'Esta orden se retira cuando el precio se acerca y vuelve cuando se aleja. Está puesta para asustar, no para ejecutarse.';
      prioridad = 70;

    } else if (nv.aguanto && consumidoPct > 0.2) {
      tipo = 'probado';
      titulo = 'Nivel probado';
      nota = 'El precio llegó hasta aquí y esta orden lo frenó, comiéndose lo que venía. Hay defensa real en este nivel.';
      prioridad = 90;

    } else if (vivo && segundos > 90 && nv.desapariciones === 0) {
      tipo = 'real';
      titulo = 'Muro firme';
      nota = 'Esta orden lleva ahí sin moverse desde que empezamos a vigilar. Todavía no ha llegado el precio a probarla.';
      prioridad = 80;

    } else if (vivo && segundos > 6) {
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
  const nuevos = fuera.slice(0, 10);
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
  M.muros = nuevos.slice(0, 12);
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

        <div class="mu-px">
          <span>Precio ahora</span>
          <b id="mu-px-v">—</b>
        </div>

        <div class="mu-vivo"><i></i><span id="mu-estado">Observando…</span></div>

        <div class="mu-der">
          <button class="mu-ico" id="mu-foto" title="Compartir imagen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="mu-ico" id="mu-ayuda" title="Cómo funciona">?</button>
          <button class="mu-ico" id="mu-x" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div class="mu-cuerpo">
        <div class="mu-graf" id="mu-graf">
          <canvas class="mu-cv" id="mu-cv"></canvas>
          <div class="mu-esperando" id="mu-esperando">
            <div class="mu-spin"></div>
            <b>Analizando el libro de órdenes</b>
            <span>Necesitamos unos segundos de observación para distinguir los muros reales de los falsos.</span>
            <div class="mu-progreso"><i id="mu-prog"></i></div>
          </div>
          <img class="mu-marca" src="assets/img/cco-marca.webp" alt="">
        </div>

        <aside class="mu-panel" id="mu-panel">
          <div class="mu-panel-t">Órdenes detectadas</div>
          <div class="mu-chips">
            <button class="mu-fchip on" data-filtro="todos">Todas</button>
            <button class="mu-fchip" data-filtro="fuertes">★ Fuertes</button>
            <button class="mu-fchip" data-filtro="compra">Soportes</button>
            <button class="mu-fchip" data-filtro="venta">Resistencias</button>
            <button class="mu-fchip" data-filtro="falsos">✕ Falsas</button>
          </div>
          <div class="mu-lista" id="mu-lista"></div>
        </aside>
      </div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_reloj); clearInterval(_relojVelas);
    document.querySelectorAll('#mu-picker').forEach((x) => x.remove());
    const e = $('mu-overlay'); if (e) e.remove();
  };
  d.querySelector('.mu-bg').onclick = cerrar;
  $('mu-x').onclick = cerrar;
  $('mu-ayuda').onclick = () => ayuda();
  $('mu-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  $('mu-foto').onclick = () => guardarImagen();

  d.querySelectorAll('[data-tf]').forEach((b) => b.onclick = () => {
    M.tf = b.dataset.tf;
    d.querySelectorAll('[data-tf]').forEach((x) => x.classList.toggle('on', x.dataset.tf === M.tf));
    cargarVelas();
  });
  d.querySelectorAll('[data-filtro]').forEach((b) => b.onclick = () => {
    M.filtro = b.dataset.filtro;
    d.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('on', x.dataset.filtro === M.filtro));
    pintarPanel();
  });

  ponerLogos();
  arrancar();
  cargarVelas();

  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('mu-cv')) dibujar(); }, 250);
  });
}

/* ══════════════════════════════════════════════════════════════
   EL RELOJ — una foto cada 1,5 s
   ══════════════════════════════════════════════════════════════ */
let _reloj = null, _relojVelas = null;
let _fallos = 0;

/** Las velas se refrescan cada 12 s: el precio no cambia tan rápido
 *  como el libro, y no hace falta pedirlas cada segundo y medio. */
async function cargarVelas() {
  clearInterval(_relojVelas);
  const traer = async () => {
    if (!$('mu-cv')) { clearInterval(_relojVelas); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      M.velas = await traerVelas(par.s, M.tf, 120);
      dibujar();
    } catch (_) {}
  };
  await traer();
  _relojVelas = setInterval(traer, 12000);
}

function arrancar() {
  clearInterval(_reloj);
  _fallos = 0;
  const tomar = async () => {
    if (!$('mu-cv')) { clearInterval(_reloj); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      const foto = await traerLibro(par.s);
      procesar(foto);
      _fallos = 0;
      M.cargando = M.fotos.length < MIN_TOMAS;
      M.error = null;
      M.maxMuro = Math.max(1, ...M.muros.map((x) => x.v));
      const px = $('mu-px-v');
      if (px) px.textContent = fmt(M.precio);
      dibujar();
      pintarPanel();
    } catch (_) {
      /* Un fallo suelto no rompe nada: se sigue con lo que hay. Solo
         tras varios seguidos se avisa, porque entonces sí pasa algo. */
      _fallos++;
      if (_fallos >= 4) {
        M.error = 'Sin conexión con el mercado. Reintentando…';
        pintarPanel();
      }
    }
  };
  tomar();
  _reloj = setInterval(tomar, CADA);
}

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

  if (!cv.dataset.listo) { engancharGestos(cv); cv.dataset.listo = '1'; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0a0e14';
  g.fillRect(0, 0, W, H);

  const esp = $('mu-esperando');
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
  const xVelas = x1 * 0.70;      // el 30% derecho, para las etiquetas

  const vis = M.velas.slice(-Math.min(M.velas.length, M.ancho || 70));
  if (!vis.length) return;

  /* El rango abarca velas Y muros: si un muro queda fuera de pantalla,
     el usuario no puede usarlo. */
  let pAlto = Math.max(...vis.map((v) => v.h));
  let pBajo = Math.min(...vis.map((v) => v.l));
  M.muros.forEach((m) => { if (m.p > pAlto) pAlto = m.p; if (m.p < pBajo) pBajo = m.p; });
  const pad = (pAlto - pBajo) * 0.07 || 1;
  const pMax = pAlto + pad, pMin = pBajo - pad;
  const Y = (p) => y1 - y1 * ((p - pMin) / Math.max(1e-12, pMax - pMin));

  /* ── Rejilla ── */
  g.strokeStyle = 'rgba(255,255,255,.03)';
  g.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = (y1 / 6) * i;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
  }

  /* ══════════════════════════════════════════════════════════
     LOS MUROS — cada uno con su línea y su importe

     Esto es lo que convierte el gráfico en herramienta: ver la
     cantidad escrita al nivel exacto donde está puesta.
     ══════════════════════════════════════════════════════════ */
  M.muros.forEach((m) => {
    if (m.p < pMin || m.p > pMax) return;
    const y = Y(m.p);
    const c = COLORES[m.tipo];
    const sel = M.seleccionado === m.p;

    // La banda: su grosor dice cuánto dinero hay
    const alto = Math.max(4, Math.min(18, (m.v / (M.maxMuro || m.v)) * 18));
    g.fillStyle = c.linea + (sel ? '33' : '1a');
    g.fillRect(0, y - alto / 2, x1, alto);

    g.strokeStyle = c.linea;
    g.lineWidth = sel ? 2.2 : 1.4;
    if (m.tipo === 'falso' || m.tipo === 'vigilando' || m.tipo === 'ido') g.setLineDash([7, 5]);
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
    g.setLineDash([]);

    // La etiqueta con el importe
    const et = dinero(m.v);
    g.font = 'bold 11px ui-monospace,monospace';
    const wCaja = g.measureText(et).width + 32;
    g.fillStyle = c.linea;
    redondeado(g, xVelas + 12, y - 10, wCaja, 20, 5); g.fill();
    g.fillStyle = c.texto;
    g.font = 'bold 10px system-ui,sans-serif';
    g.textAlign = 'center';
    g.fillText(c.icono, xVelas + 23, y + 3.5);
    g.font = 'bold 11px ui-monospace,monospace';
    g.textAlign = 'left';
    g.fillText(et, xVelas + 33, y + 4);
  });

  /* ── LAS VELAS ── */
  const paso = xVelas / vis.length;
  const cuerpo = Math.max(1.6, paso * 0.6);
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const col = v.c >= v.o ? '#26a69a' : '#ef5350';
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(1, paso * 0.12);
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1.4, yB - yA));
  });

  /* ── El precio actual ── */
  const yP = Y(M.precio);
  g.strokeStyle = 'rgba(232,184,75,.9)';
  g.setLineDash([6, 4]); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(0, yP); g.lineTo(x1, yP); g.stroke();
  g.setLineDash([]);

  /* ── La escala, con los niveles marcados ── */
  g.fillStyle = 'rgba(10,14,20,.94)';
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();

  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 6; i++) {
    const p = pMin + (pMax - pMin) * (i / 6);
    const y = Y(p);
    if (Math.abs(y - yP) < 15) continue;
    if (M.muros.some((m) => Math.abs(Y(m.p) - y) < 15)) continue;
    g.fillStyle = '#4a525c';
    g.fillText(fmt(p), x1 + 7, y + 3.5);
  }
  M.muros.forEach((m) => {
    if (m.p < pMin || m.p > pMax) return;
    const y = Y(m.p), c = COLORES[m.tipo];
    g.fillStyle = c.linea;
    redondeado(g, x1 + 2, y - 9, mDer - 5, 18, 4); g.fill();
    g.fillStyle = c.texto;
    g.font = 'bold 10px ui-monospace,monospace';
    g.fillText(fmt(m.p), x1 + 7, y + 3.5);
  });
  g.fillStyle = '#E8B84B';
  redondeado(g, x1 + 2, yP - 11, mDer - 5, 22, 5); g.fill();
  g.fillStyle = '#2a1c00';
  g.font = 'bold 12px ui-monospace,monospace';
  g.fillText(fmt(M.precio), x1 + 7, yP + 4);

  /* ── Las horas ── */
  g.fillStyle = 'rgba(10,14,20,.94)';
  g.fillRect(0, y1, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = '#4a525c';
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
}

/* ══════════════════════════════════════════════════════════════
   GESTOS — acercar y alejar

   El libro es estrecho: sin poder acercarse, los muros próximos al
   precio se amontonan. La rueda y el pellizco cambian el rango que
   se muestra; el doble clic vuelve a verlo todo.
   ══════════════════════════════════════════════════════════════ */
function engancharGestos(cv) {
  const zoom = (f) => {
    M.zoom = Math.max(0.12, Math.min(1, M.zoom * f));
    dibujar();
  };

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoom(e.deltaY > 0 ? 1.16 : 0.86);
  }, { passive: false });

  cv.addEventListener('dblclick', () => { M.zoom = 1; dibujar(); });

  // La cruz sigue al ratón para leer precios
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    const ny = Math.round(e.clientY - r.top);
    if (ny !== M.cruzY) { M.cruzY = ny; dibujar(); }
  });
  cv.addEventListener('mouseleave', () => { M.cruzY = -1; dibujar(); });

  // Táctil: pellizco para acercar
  let d0 = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d - d0) > 8) { zoom(d0 / d); d0 = d; }
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { d0 = 0; });
  cv.style.cursor = 'crosshair';
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
function pintarPanel() {
  const lista = $('mu-lista'); if (!lista) return;
  const estado = $('mu-estado');

  if (M.error) { if (estado) estado.textContent = M.error; return; }

  if (M.cargando) {
    if (estado) estado.textContent = `Observando… ${M.fotos.length} de ${MIN_TOMAS}`;
    lista.innerHTML = `<div class="mu-esperar">
      Analizando el comportamiento de cada nivel.<br>
      En unos segundos sabrás cuáles son de verdad.
    </div>`;
    return;
  }

  if (estado) {
    const mins = Math.round(M.fotos.length * CADA / 1000 / 60);
    estado.textContent = `En directo · ${mins >= 1 ? mins + ' min observando' : 'observando'}`;
  }

  if (!M.muros.length) {
    lista.innerHTML = `<div class="mu-esperar">
      <b>Libro tranquilo</b>
      Ahora mismo nadie está poniendo órdenes grandes en ${esc(_par)}.
      Cuando aparezca dinero de verdad, lo verás aquí.
    </div>`;
    return;
  }

  /* La línea de "qué hacer": lo que convierte el dato en decisión. */
  const consejo = (m) => {
    const arriba = m.p > M.precio;
    if (m.tipo === 'recargable') {
      return arriba
        ? 'Si va largo, plantéese recoger beneficios antes de este precio.'
        : 'Buen sitio para poner su stop justo por debajo.';
    }
    if (m.tipo === 'probado') {
      return arriba
        ? 'Ya rechazó al precio una vez. Espere confirmación antes de apostar a que lo rompa.'
        : 'Ya aguantó al precio una vez. Zona donde el rebote es más probable.';
    }
    if (m.tipo === 'real') {
      return 'Vigílelo cuando el precio se acerque: ahí sabremos si va en serio.';
    }
    if (m.tipo === 'falso') {
      return 'No lo use como referencia. Va a desaparecer cuando el precio llegue.';
    }
    if (m.tipo === 'ido') {
      return 'Si su plan dependía de este nivel, revíselo.';
    }
    return 'Déle unos minutos más para tener veredicto.';
  };

  const tarjeta = (m) => {
    const c = COLORES[m.tipo];
    const pct = (Math.abs(m.dist) * 100).toFixed(2);
    const esVenta = m.p > M.precio;
    const accion = esVenta ? 'VENDIENDO' : 'COMPRANDO';

    /* La fuerza sube con el tiempo y las recargas: cuanto más aguanta
       una orden, más peso tiene. La tarjeta lo refleja visualmente. */
    let fuerza = 0;
    if (m.tipo === 'recargable' || m.tipo === 'probado') fuerza = 3;
    else if (m.tipo === 'real') fuerza = m.segundos > 240 ? 3 : 2;
    else if (m.tipo === 'vigilando') fuerza = 1;

    const puntos = fuerza > 0
      ? `<span class="mu-fuerza">${'●'.repeat(fuerza)}<i>${'●'.repeat(3 - fuerza)}</i></span>`
      : '';

    /* La consecuencia: qué le pasa al precio si llega aquí. Es la
       frase por la que alguien paga por esta herramienta. */
    let conse;
    if (m.tipo === 'falso') {
      conse = esVenta
        ? 'Esta pared es humo. Si el precio sube hasta aquí, <b>no espere que lo frene</b>.'
        : 'Este suelo es humo. Si el precio baja hasta aquí, <b>no espere que lo sostenga</b>.';
    } else if (m.tipo === 'ido') {
      conse = 'Esta orden <b>ya no está</b> en el mercado. El nivel quedó sin defensa.';
    } else if (fuerza >= 3) {
      conse = esVenta
        ? `Si el precio llega a ${fmt(m.p)}, hay <b>alta probabilidad de rechazo</b>. Alguien grande defiende ese techo.`
        : `Si el precio baja a ${fmt(m.p)}, hay <b>alta probabilidad de rebote</b>. Alguien grande sostiene ese suelo.`;
    } else if (fuerza === 2) {
      conse = esVenta
        ? `Hay resistencia real en ${fmt(m.p)}. El precio puede frenarse ahí.`
        : `Hay soporte real en ${fmt(m.p)}. El precio puede rebotar ahí.`;
    } else {
      conse = 'Orden recién puesta. Todavía no sabemos si va en serio.';
    }

    return `
    <button class="mu-card ${c.clase} f${fuerza} ${M.seleccionado === m.p ? 'sel' : ''}" data-mp="${m.p}" data-lado="${esVenta ? 'venta' : 'compra'}">
      <div class="mu-titular">
        <span class="mu-accion">${accion}</span>
        <span class="mu-monto">${dinero(m.v)}</span>
      </div>
      <div class="mu-en">en <b>${fmt(m.p)}</b> · a ${pct}% del precio</div>

      <div class="mu-veredicto">
        <span class="mu-chip">${c.icono} ${esc(m.titulo)}</span>
        ${puntos}
      </div>

      <div class="mu-conse">${conse}</div>

      <div class="mu-datos">
        <span><b>${tiempo(m.segundos)}</b>aguantando</span>
        ${m.recargas > 0 ? `<span><b>${m.recargas}×</b>repuesta</span>` : ''}
        ${m.consumidoPct > 0.15 ? `<span><b>${Math.round(Math.min(100, m.consumidoPct * 100))}%</b>ejecutado</span>` : ''}
      </div>

      <div class="mu-hacer">${consejo(m)}</div>
    </button>`;
  };

  /* El filtro: un trader quiere ver solo lo que le sirve ahora. */
  let lst = M.muros.slice();
  if (M.filtro === 'fuertes') lst = lst.filter((m) => m.tipo === 'recargable' || m.tipo === 'probado');
  else if (M.filtro === 'compra') lst = lst.filter((m) => m.p <= M.precio);
  else if (M.filtro === 'venta') lst = lst.filter((m) => m.p > M.precio);
  else if (M.filtro === 'falsos') lst = lst.filter((m) => m.tipo === 'falso' || m.tipo === 'ido');

  if (!lst.length) {
    lista.innerHTML = `<div class="mu-esperar"><b>Nada que mostrar</b>No hay órdenes de ese tipo ahora mismo.</div>`;
    return;
  }

  const arriba = lst.filter((m) => m.p > M.precio);
  const abajo = lst.filter((m) => m.p <= M.precio);

  lista.innerHTML =
    (arriba.length ? `<div class="mu-grupo rojo">Resistencias · frenan las subidas</div>` + arriba.map(tarjeta).join('') : '') +
    (abajo.length ? `<div class="mu-grupo verde">Soportes · frenan las bajadas</div>` + abajo.map(tarjeta).join('') : '');

  lista.querySelectorAll('[data-mp]').forEach((b) => b.onclick = () => {
    const p = Number(b.dataset.mp);
    M.seleccionado = M.seleccionado === p ? null : p;
    pintarPanel();
    dibujar();
  });
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
  document.querySelectorAll('.mu-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA
   ══════════════════════════════════════════════════════════════ */
function ayuda() {
  const d = document.createElement('div');
  d.id = 'mu-ayuda-box';
  d.innerHTML = `<div class="mu-bg"></div>
    <div class="mua-c">
      <button class="mua-x" id="mua-x" aria-label="Cerrar">✕</button>

      <div class="mua-tabs">
        <button class="mua-tab on" data-mtab="usar">Cómo operar con esto</button>
        <button class="mua-tab" data-mtab="leer">Qué significa cada muro</button>
      </div>

      <div class="mua-pane on" id="mup-usar">
        <div class="mua-intro">
          El libro de órdenes <b>miente</b>. La mayoría de los muros grandes que
          ves en cualquier exchange son falsos: órdenes puestas para asustar
          que se retiran justo cuando el precio llega.
          <br><br>
          Esta herramienta hace lo único que los delata: <b>vigilarlos en el
          tiempo</b> y decirte cuáles son de verdad.
        </div>

        <div class="mua-p">
          <b>1 · Fíate solo de lo que ha aguantado</b>
          Un muro que lleva minutos firme y que ya se ha comido parte del flujo
          tiene dinero real detrás. Uno que apareció hace 20 segundos, no.
          <i>Qué hacer: usa los niveles ★ y ✓ para colocar stops y objetivos. Los ? déjalos madurar.</i>
        </div>

        <div class="mua-p">
          <b>2 · La recarga es la señal más fuerte del mercado</b>
          Cuando un muro se consume y <b>vuelve a aparecer al mismo precio</b>,
          eso es alguien grande reponiendo su orden para no mover el mercado.
          Casi nadie ve esto, y es justo donde el precio suele girar.
          <i>Qué hacer: un nivel con recargas es el mejor sitio para poner tu stop justo detrás.</i>
        </div>

        <div class="mua-p">
          <b>3 · No persigas los muros rojos</b>
          Si marcamos un muro como falso es porque lo hemos visto huir cuando el
          precio se acercaba. Operar contra él es perder dinero:
          <b>va a desaparecer</b>.
          <i>Qué hacer: si tu plan dependía de ese nivel, cámbialo. Ese soporte no existe.</i>
        </div>

        <div class="mua-p">
          <b>4 · Mira el desequilibrio</b>
          Si hay tres muros reales debajo y ninguno arriba, el camino de menor
          resistencia es hacia arriba: no hay nada que frene al precio en esa
          dirección.
          <i>Qué hacer: opera a favor del lado vacío, no contra el lado defendido.</i>
        </div>

        <div class="mua-p">
          <b>5 · Combínalo con Liquidity Pools</b>
          El mapa de liquidaciones dice <b>hacia dónde</b> quiere ir el precio.
          Esta herramienta dice <b>qué lo está frenando ahora mismo</b>. Un muro
          falso justo delante de un imán de liquidez es de las señales más
          claras que vas a encontrar.
        </div>

        <div class="mua-aviso">
          Esto es <b>información, no una señal</b>. Te decimos qué es real y qué
          no lo es. La decisión de entrar o salir sigue siendo tuya.
        </div>
      </div>

      <div class="mua-pane" id="mup-leer">
        <div class="mua-p">
          <b>Los cinco veredictos</b>
          <span class="mua-col"><i style="background:#E8B84B;color:#3a2800">★</i><b>Muro con recarga</b> — se consume y vuelve. Alguien grande repone. El más fiable.</span>
          <span class="mua-col"><i style="background:#2ee86a;color:#04210f">✓</i><b>Nivel probado</b> — el precio ya lo visitó y aguantó.</span>
          <span class="mua-col"><i style="background:#4d9fff;color:#04121f">●</i><b>Muro firme</b> — lleva mucho sin moverse, pero sin probar.</span>
          <span class="mua-col"><i style="background:#f6465d;color:#2a0509">✕</i><b>Muro falso</b> — huye cuando el precio se acerca.</span>
          <span class="mua-col"><i style="background:#8b96a3;color:#0b0e12">?</i><b>En observación</b> — muy reciente, sin historia.</span>
        </div>

        <div class="mua-p">
          <b>Cómo lo sabemos</b>
          Tomamos una foto del libro <b>cada segundo y medio</b> y seguimos la
          vida de cada nivel: cuánto lleva ahí, cuántas veces ha desaparecido,
          si se ha consumido, y qué hizo cuando el precio se le acercó.
          Ningún gráfico normal guarda esa historia.
        </div>

        <div class="mua-p">
          <b>El mapa de fondo</b>
          Cada columna es una foto del libro; a la derecha, ahora. El color
          indica cuánto dinero hay a cada precio: azul poco, verde bastante,
          amarillo mucho. Así se ve cómo se mueven las órdenes con el tiempo.
        </div>

        <div class="mua-aviso">
          Los datos vienen del <b>libro real de Binance</b>. No hay estimaciones
          aquí: lo que ves es lo que hay puesto en el mercado.
        </div>
      </div>

      <button class="mua-b" id="mua-cerrar">Entendido</button>
    </div>`;
  document.body.appendChild(d);

  const q = () => d.remove();
  d.querySelector('.mu-bg').onclick = q;
  $('mua-x').onclick = q;
  $('mua-cerrar').onclick = q;
  d.querySelectorAll('[data-mtab]').forEach((b) => b.onclick = () => {
    d.querySelectorAll('.mua-tab').forEach((x) => x.classList.toggle('on', x === b));
    d.querySelectorAll('.mua-pane').forEach((p) => p.classList.remove('on'));
    const p = $('mup-' + b.dataset.mtab);
    if (p) p.classList.add('on');
    d.querySelector('.mua-c').scrollTop = 0;
  });
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('mu-css')) return;
  const s = document.createElement('style'); s.id = 'mu-css';
  s.textContent = `
  #mu-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
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
  #mu-overlay .mu-vivo{display:flex;align-items:center;gap:7px;min-width:0;
    font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;
    text-transform:uppercase;letter-spacing:.7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #mu-overlay .mu-vivo i{width:7px;height:7px;border-radius:50%;background:#2ee86a;flex:0 0 auto;
    animation:muLat 1.8s ease-in-out infinite}
  @keyframes muLat{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(46,232,106,.5)}50%{opacity:.55;box-shadow:0 0 0 5px rgba(46,232,106,0)}}
  /* Temporalidad y precio en la barra */
  #mu-overlay .mu-tfs{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #mu-overlay .mu-tf{min-height:30px;padding:0 11px;border-radius:7px;border:none;background:transparent;
    color:#7d8794;font-family:var(--mono,monospace);font-size:11px;font-weight:700;cursor:pointer}
  #mu-overlay .mu-tf.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
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
    display:flex;gap:6px;background:#0b0e12;padding-left:8px}
  #mu-overlay .mu-ico{width:36px;height:36px;min-height:36px;flex:0 0 auto;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;
    background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #mu-overlay .mu-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}

  /* ── Cuerpo: gráfico + panel ── */
  #mu-overlay .mu-cuerpo{flex:1;min-height:0;display:flex}
  #mu-overlay .mu-graf{flex:1;min-width:0;position:relative;background:#080b10}
  #mu-overlay .mu-cv{display:block}
  /* El logo, corrido a la derecha: en la izquierda tapaba la columna
     de precios. */
  #mu-overlay .mu-marca{position:absolute;left:190px;bottom:14px;height:28px;width:auto;
    opacity:.45;pointer-events:none;filter:drop-shadow(0 2px 6px rgba(0,0,0,.9))}

  /* Pantalla de espera */
  #mu-overlay .mu-esperando{position:absolute;inset:0;display:flex;flex-direction:column;
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
  #mu-overlay .mu-panel-t{flex:0 0 auto;padding:12px 16px 4px;font-family:var(--mono,monospace);
    font-size:10px;color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:1.6px;
    border-bottom:1px solid #1c2128}
  #mu-overlay .mu-lista{flex:1;overflow-y:auto;padding:10px}
  #mu-overlay .mu-grupo{font-family:var(--mono,monospace);font-size:9.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.2px;margin:12px 4px 8px}
  #mu-overlay .mu-grupo:first-child{margin-top:2px}
  #mu-overlay .mu-esperar{padding:22px 16px;text-align:center;font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#7d8794;line-height:1.7}
  #mu-overlay .mu-esperar b{display:block;font-family:var(--display,sans-serif);
    font-size:14px;color:#b7bdc6;margin-bottom:5px}

  #mu-overlay .mu-card{display:block;width:100%;text-align:left;margin-bottom:9px;padding:13px 14px;
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
  #mu-ayuda-box{position:fixed;inset:0;z-index:9770;display:flex;align-items:center;justify-content:center;padding:16px}
  #mu-ayuda-box .mu-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #mu-ayuda-box .mua-c{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 32px);
    overflow-y:auto;background:linear-gradient(180deg,#161b22,#0b0e12);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #mu-ayuda-box .mua-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
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
  #mu-ayuda-box .mua-b{width:100%;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;
    box-shadow:0 4px 0 #8f6a1a}

  /* ── Móvil: el panel pasa abajo ── */
  @media(max-width:860px){
    #mu-overlay .mu-cuerpo{flex-direction:column}
    #mu-overlay .mu-graf{flex:0 0 auto;height:46vh;min-height:230px}
    #mu-overlay .mu-panel{width:100%;flex:1;min-height:0;border-left:none;border-top:1px solid #1c2128}
    #mu-overlay .mu-barra{padding:8px 92px 8px 10px;gap:9px}
    #mu-overlay .mu-vivo span{display:none}
    #mu-overlay .mu-marca{height:24px;left:10px;bottom:26px}
    #mu-overlay .mu-precio{font-size:19px}
    #mu-ayuda-box .mua-c{padding:20px 14px}
    #mu-ayuda-box .mua-tabs{margin-right:46px;flex-direction:column}
  }`;
  document.head.appendChild(s);
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
      g.fillText('Muros Reales · Libro de Órdenes', x, yB + 34 * e2);
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
      a.href = url; a.download = `criptocuba-muros-${_par}-${Date.now()}.png`;
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
