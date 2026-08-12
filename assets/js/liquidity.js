// liquidity.js — Liquidity Pools 2.0
//
// Traducción a JavaScript del indicador Pine Script de Jesús.
// Detecta bloques de órdenes (order blocks) y reparte el volumen dentro
// de cada uno en rejillas, para ver DÓNDE se concentró la liquidez.
//
// COLORES ORIGINALES DEL INDICADOR (respetados tal cual):
//   #ff0000  volumen alto        (rojo)
//   #fbff00  volumen medio       (amarillo)
//   #15ff00  volumen bajo        (verde)
//   #0037ff  bloque bajista      (azul)

import * as ethers from './vendor/ethers-6.13.4.min.js?v=126';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ══════════════════════════════════════════════════════════════
   LOS COLORES DEL INDICADOR
   Salen del Pine Script original, con su transparencia:
     obHighVolumeColor   = color.new(#ff0000, 23)
     obMediumVolumeColor = color.new(#fbff00, 36)
     obLowVolumeColor    = color.new(#15ff00, 75)
     bearish             = color.new(#0037ff, 50)
   En Pine la transparencia va de 0 (opaco) a 100 (invisible),
   así que la opacidad CSS es (100 - t) / 100.
   ══════════════════════════════════════════════════════════════ */
const COL = {
  /* Las transparencias del Pine original, rebajadas un poco: en
     TradingView el gráfico es más grande y aguanta más carga de color.
     Aquí, con las velas debajo, hay que poder verlas. */
  alto:  { hex: '#ff0000', op: 0.46 },   // original 0.77
  medio: { hex: '#fbff00', op: 0.38 },   // original 0.64
  bajo:  { hex: '#15ff00', op: 0.20 },   // original 0.25
  bear:  { hex: '#0037ff', op: 0.50 }
};
const rgba = (c) => {
  const n = parseInt(c.hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${c.op})`;
};

/* Monedas disponibles, con su par en Binance. */
const PARES = [
  { id: 'BTC',   s: 'BTCUSDT',   n: 'Bitcoin' },
  { id: 'ETH',   s: 'ETHUSDT',   n: 'Ethereum' },
  { id: 'BNB',   s: 'BNBUSDT',   n: 'BNB' },
  { id: 'SOL',   s: 'SOLUSDT',   n: 'Solana' },
  { id: 'XRP',   s: 'XRPUSDT',   n: 'XRP' },
  { id: 'DOGE',  s: 'DOGEUSDT',  n: 'Dogecoin' },
  { id: 'ADA',   s: 'ADAUSDT',   n: 'Cardano' },
  { id: 'AVAX',  s: 'AVAXUSDT',  n: 'Avalanche' },
  { id: 'LINK',  s: 'LINKUSDT',  n: 'Chainlink' },
  { id: 'DOT',   s: 'DOTUSDT',   n: 'Polkadot' },
  { id: 'MATIC', s: 'MATICUSDT', n: 'Polygon' },
  { id: 'LTC',   s: 'LTCUSDT',   n: 'Litecoin' },
  { id: 'TRX',   s: 'TRXUSDT',   n: 'TRON' },
  { id: 'SHIB',  s: 'SHIBUSDT',  n: 'Shiba Inu' },
  { id: 'PEPE',  s: 'PEPEUSDT',  n: 'Pepe' },
  { id: 'NEAR',  s: 'NEARUSDT',  n: 'NEAR' },
  { id: 'APT',   s: 'APTUSDT',   n: 'Aptos' },
  { id: 'ARB',   s: 'ARBUSDT',   n: 'Arbitrum' },
  { id: 'OP',    s: 'OPUSDT',    n: 'Optimism' },
  { id: 'INJ',   s: 'INJUSDT',   n: 'Injective' },
  { id: 'SUI',   s: 'SUIUSDT',   n: 'Sui' },
  { id: 'ATOM',  s: 'ATOMUSDT',  n: 'Cosmos' },
  { id: 'FIL',   s: 'FILUSDT',   n: 'Filecoin' },
  { id: 'UNI',   s: 'UNIUSDT',   n: 'Uniswap' },
  { id: 'WIF',   s: 'WIFUSDT',   n: 'dogwifhat' },
  { id: 'TIA',   s: 'TIAUSDT',   n: 'Celestia' }
];
const TFS = [
  { id: '5m',  n: '5 minutos' },
  { id: '15m', n: '15 minutos' },
  { id: '30m', n: '30 minutos' },
  { id: '1h',  n: '1 hora' },
  { id: '2h',  n: '2 horas' },
  { id: '4h',  n: '4 horas' },
  { id: '12h', n: '12 horas' },
  { id: '1d',  n: '1 día' },
  { id: '1w',  n: '1 semana' }
];

let _par = 'BNB';
let _tf = '1h';

/* ══════════════════════════════════════════════════════════════
   ESTADO DE LA VISTA

   El gráfico no se dibuja entero: se dibuja una VENTANA sobre los
   datos. Arrastrar mueve esa ventana; el zoom la ensancha o la
   estrecha. Como el mapa de liquidaciones se pinta con las mismas
   coordenadas que las velas, queda pegado a ellas pase lo que pase.
   ══════════════════════════════════════════════════════════════ */
const V = {
  velas: [],          // todos los datos descargados
  mapa: null,         // el mapa ya calculado
  desde: 0,           // primera vela visible
  ancho: 150,         // cuántas velas caben
  yMin: 0, yMax: 0,   // rango de precio visible
  autoY: true,        // ¿la escala vertical se ajusta sola?
  apal: 'todos',      // filtro de apalancamiento
  intensidad: 1.0,        // el deslizador arranca a media escala
  verMapa: true,
  arrastrando: false,
  x0: 0, y0: 0,
  cruzX: -1, cruzY: -1,    // dónde está el puntero, para la cruz

  /* ── DIBUJO ──
     Las líneas se guardan en PRECIO y TIEMPO, no en píxeles. Así se
     quedan pegadas al gráfico cuando se hace zoom o se arrastra, que
     es lo que se espera de una herramienta de análisis. */
  herramienta: null,       // null | 'linea' | 'horizontal' | 'fibo'
  dibujos: [],
  enCurso: null
};

/* Los niveles de Fibonacci de siempre. */
const FIBO = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/* ══════════════════════════════════════════════════════════════
   EL MOTOR — MAPA DE LIQUIDACIONES

   Así es como funcionan estas herramientas de verdad (CoinGlass,
   TradingDifferent y las demás):

   1. Por cada vela se asume que se abrieron posiciones a ese precio.
      El tamaño se estima con el volumen de esa vela.

   2. Esas posiciones llevan apalancamiento. Se reparten según lo que
      se usa de verdad en el mercado: x10 y x25 son lo más común, x100
      es minoría pero deja los niveles más cercanos al precio.

   3. Se calcula dónde saltaría cada una:
        LARGO  → entrada × (1 − 1/apalancamiento)
        CORTO  → entrada × (1 + 1/apalancamiento)

   4. Todo eso se acumula en una rejilla de precio × tiempo. Cada celda
      suma cuánto dinero se liquidaría ahí.

   5. Las posiciones cuyo nivel ya fue tocado por el precio DESAPARECEN:
      ya se liquidaron. Eso es lo que hace que el mapa "se consuma" por
      donde pasa el precio, igual que en las herramientas de pago.

   IMPORTANTE: son estimaciones a partir de precio y volumen, no datos
   del motor de liquidación de ningún exchange. Nadie publica eso.
   ══════════════════════════════════════════════════════════════ */

/* Reparto de apalancamiento. Suma 1. */
const APALANCAMIENTOS = [
  { x: 10,  peso: 0.34 },
  { x: 25,  peso: 0.29 },
  { x: 50,  peso: 0.21 },
  { x: 100, peso: 0.16 }
];

const FILAS = 260;      // resolución vertical del mapa

/* El mapa se calcula UNA vez sobre todos los datos, guardando cada
   nivel por separado. Así, al mover o hacer zoom, no hay que volver a
   calcular nada: solo se vuelve a pintar lo que entra en pantalla. */
/* ══════════════════════════════════════════════════════════════
   DÓNDE ESTÁ LA LIQUIDEZ DE VERDAD

   La liquidez no está repartida por igual: se concentra en sitios
   concretos, y son estos:

   1. MÁXIMOS Y MÍNIMOS (swing highs/lows)
      Encima de un máximo visible están los stops de los cortos y las
      órdenes de quien espera la ruptura. Debajo de un mínimo, igual
      con los largos. Cuanto más obvio el nivel, mayor el montón.

   2. NIVELES TOCADOS VARIAS VECES
      Un techo probado tres veces acumula el triple de órdenes que uno
      tocado una sola vez. Ahí es donde se forman los muros.

   3. LA BASE DE LOS IMPULSOS
      Cuando arranca un movimiento fuerte, en su origen quedan órdenes
      sin ejecutar. El precio suele volver a buscarlas.

   4. VACÍOS DE LIQUIDEZ (velas de cuerpo grande)
      Una vela enorme deja un hueco que el mercado no negoció bien.
      Esos huecos actúan como imán: el precio vuelve a rellenarlos.

   5. LIQUIDACIONES POR APALANCAMIENTO
      Y encima de todo eso, los niveles donde saltan las posiciones
      apalancadas.
   ══════════════════════════════════════════════════════════════ */



/** Encuentra los máximos y mínimos relevantes del gráfico. */
function pivotes(velas, radio) {
  const altos = [], bajos = [];
  for (let i = radio; i < velas.length - radio; i++) {
    let esAlto = true, esBajo = true;
    for (let j = i - radio; j <= i + radio; j++) {
      if (j === i) continue;
      if (velas[j].h >= velas[i].h) esAlto = false;
      if (velas[j].l <= velas[i].l) esBajo = false;
      if (!esAlto && !esBajo) break;
    }
    if (esAlto) altos.push({ i, p: velas[i].h, t: velas[i].t });
    if (esBajo) bajos.push({ i, p: velas[i].l, t: velas[i].t });
  }
  return { altos, bajos };
}

function construirMapa(velas) {
  if (velas.length < 40) return null;

  const his = velas.map((v) => v.h), los = velas.map((v) => v.l);
  const pAlto = Math.max(...his), pBajo = Math.min(...los);
  const margen = (pAlto - pBajo) * 0.22;
  const yMax = pAlto + margen, yMin = Math.max(0, pBajo - margen);
  const alturaFila = (yMax - yMin) / FILAS;
  const filaDe = (p) => Math.floor((p - yMin) / alturaFila);
  const rango = pAlto - pBajo;

  const niveles = {};
  APALANCAMIENTOS.forEach(({ x }) => {
    niveles[x] = Array.from({ length: velas.length }, () => new Float32Array(FILAS));
  });

  /* ══════════════════════════════════════════════════════════════
     REFUERZO POR ESTRUCTURA

     No se dibuja nada aparte. Lo que se hace es un MULTIPLICADOR por
     altura: las filas que coinciden con máximos y mínimos donde el
     precio rebotó valen más. Así, cuando una liquidación cae ahí, sube
     a naranja o rojo, y el dibujo sigue saliendo de las velas.

     Cuantas más veces se tocó un nivel, más pesa: un techo probado
     tres veces acumula muchísimo más que uno tocado una vez.
     ══════════════════════════════════════════════════════════════ */
  const refuerzo = new Float32Array(FILAS).fill(1);
  const { altos, bajos } = pivotes(velas, 2);
  const tol = (pAlto - pBajo) * 0.005;

  [...altos, ...bajos].forEach((piv) => {
    const lista = altos.includes(piv) ? altos : bajos;
    const toques = lista.filter((o) => Math.abs(o.p - piv.p) <= tol).length;
    const f0 = filaDe(piv.p);
    // Se reparte en pocas filas, con caída suave
    for (let d = -3; d <= 3; d++) {
      const f = f0 + d;
      if (f < 0 || f >= FILAS) continue;
      const caida = Math.exp(-(d * d) / 4);
      refuerzo[f] = Math.max(refuerzo[f], 1 + Math.min(1.5, toques * 0.4) * caida);
    }
  });

  /* ── 5. LIQUIDACIONES POR APALANCAMIENTO ── */
  velas.forEach((v, ci) => {
    const medio = (v.h + v.l + v.c) / 3;
    const dinero = v.v * medio;
    if (!(dinero > 0)) return;
    const partLargo = v.c >= v.o ? 0.58 : 0.42;

    APALANCAMIENTOS.forEach(({ x, peso }) => {
      const base = dinero * peso;
      const rej = niveles[x];
      [[medio * (1 - 1 / x), base * partLargo],
       [medio * (1 + 1 / x), base * (1 - partLargo)]].forEach(([precio, monto]) => {
        const f = filaDe(precio);
        if (f < 0 || f >= FILAS) return;
        for (let cj = ci; cj < velas.length; cj++) {
          const w = velas[cj];
          if (precio <= w.h && precio >= w.l) break;
          rej[cj][f] += monto;
        }
      });
    });
  });

  return { niveles, velas, yMin, yMax, alturaFila, refuerzo };
}

/** Suma los niveles según el filtro de apalancamiento activo. */
/* ══════════════════════════════════════════════════════════════
   [CORREGIDO] Aquí estaba el fallo. Los pools estructurales generan
   cifras muchísimo mayores que las liquidaciones, así que al sumarlos
   directamente aplastaban todo lo demás: el mapa denso desaparecía y
   solo quedaban cuatro bandas sueltas.

   La solución: cada capa se normaliza POR SEPARADO a 0-1 y luego se
   mezclan. Así conviven las dos:
     · las liquidaciones dan el mapa de fondo, denso, que llena la
       pantalla (azules y verdes)
     · los pools estructurales suben por encima y son los que llegan
       a rojo, porque es donde de verdad está la liquidez
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   [CORREGIDO] Los pools estructurales se pintaban como rectángulos
   horizontales sueltos y eso rompía el aspecto. Las barras de liquidez
   se forman DESDE CADA VELA hacia la derecha, no como bloques.

   Vuelve el motor de liquidaciones, que daba el dibujo correcto. Lo
   que aportan ahora los máximos y mínimos es solo PESO: si un nivel de
   liquidación cae donde el precio rebotó varias veces, se refuerza y
   sube a rojo. El rojo sale donde debe, sin romper el dibujo.
   ══════════════════════════════════════════════════════════════ */
function columnaDe(mapa, c) {
  const out = new Float32Array(FILAS);
  const lista = V.apal === 'todos'
    ? APALANCAMIENTOS.map((a) => a.x)
    : [Number(V.apal)];
  lista.forEach((x) => {
    const col = mapa.niveles[x] && mapa.niveles[x][c];
    if (!col) return;
    for (let f = 0; f < FILAS; f++) out[f] += col[f];
  });
  return out;
}

/* ══════════════════════════════════════════════════════════════
   EN VIVO
   La última vela se refresca cada 10 segundos con datos reales de
   Binance. El mapa se recalcula y se vuelve a pintar sin mover la
   vista del usuario.
   ══════════════════════════════════════════════════════════════ */
let _vivo = null;
function arrancarVivo() {
  clearInterval(_vivo);
  _vivo = setInterval(async () => {
    if (!$('lq-caja') || V.arrastrando) return;
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      const nuevas = await traerVelas(par.s, _tf, 3);
      if (!nuevas.length) return;

      let cambio = false;
      nuevas.forEach((nv) => {
        const i = V.velas.findIndex((x) => x.t === nv.t);
        if (i >= 0) { V.velas[i] = nv; cambio = true; }
        else if (nv.t > V.velas[V.velas.length - 1].t) { V.velas.push(nv); cambio = true; }
      });
      if (!cambio) return;

      if (V.velas.length > 520) V.velas = V.velas.slice(-500);
      V.mapa = construirMapa(V.velas);
      dibujar();
    } catch (_) {}
  }, 4000);   // 4 s: en 5 minutos hay que ver el precio moverse
}

/* ══════════════════════════════════════════════════════════════
   DATOS — velas de Binance, que es pública y no pide clave
   ══════════════════════════════════════════════════════════════ */
async function traerVelas(simbolo, tf, n = 300) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('sin datos');
  const j = await r.json();
  return j.map((x) => ({
    t: Math.floor(x[0] / 1000),
    o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]),
    v: Number(x[5])
  }));
}

/* ══════════════════════════════════════════════════════════════
   ABRIR
   ══════════════════════════════════════════════════════════════ */
export async function abrirLiquidity() {
  estilos();
  const prev = $('lq-overlay'); if (prev) prev.remove();

  const d = document.createElement('div');
  d.id = 'lq-overlay';
  d.innerHTML = `<div class="lq-bg"></div>
    <div class="lq-c">
      <!-- Todo en una sola barra, como TradingView: el gráfico manda. -->
      <div class="lq-barra">
        <!-- Moneda y temporalidad como desplegables: con 26 monedas
             una fila de botones no cabe en ningún sitio. -->
        <button class="lq-sel" id="lq-sel-par">
          <b>${_par}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <button class="lq-sel" id="lq-sel-tf">
          <b>${(TFS.find((t) => t.id === _tf) || TFS[3]).n}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="lq-grupo" title="Filtrar por apalancamiento">
          ${['todos', '10', '25', '50', '100'].map((a) =>
            `<button class="lq-b ${a === V.apal ? 'on' : ''}" data-apal="${a}">${a === 'todos' ? 'Todo' : 'x' + a}</button>`).join('')}
        </div>
        <div class="lq-grupo lq-slider">
          <span>Intensidad</span>
          <input type="range" id="lq-int" min="30" max="220" value="100">
        </div>
        <div class="lq-der">
          <button class="lq-ayuda" id="lq-foto" title="Guardar imagen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="lq-ayuda" id="lq-ver" title="Mostrar u ocultar el mapa">◉</button>
          <button class="lq-ayuda" id="lq-fit" title="Reencuadrar">⤢</button>
          <button class="lq-ayuda" id="lq-ayuda" title="Cómo funciona">?</button>
          <button class="lq-x" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div class="lq-caja" id="lq-caja">
        <div class="lq-cargando">Calculando el mapa de liquidaciones…</div>
      </div>

      <div class="lq-escala">
        <span>menos liquidez</span>
        <i class="lq-gr"></i>
        <span>muros de liquidación</span>
      </div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    cerrarMenus();
    clearInterval(_vivo);
    const e = $('lq-overlay'); if (e) e.remove();
  };
  d.querySelector('.lq-bg').onclick = cerrar;
  d.querySelector('.lq-x').onclick = cerrar;

  $('lq-sel-par').onclick = (e) => { e.stopPropagation(); menuPares(); };
  $('lq-sel-tf').onclick  = (e) => { e.stopPropagation(); menuTfs(); };
  $('lq-ayuda').onclick = () => ayuda();

  // Filtro por apalancamiento: no recalcula nada, solo cambia qué suma.
  d.querySelectorAll('[data-apal]').forEach((b) => b.onclick = () => {
    V.apal = b.dataset.apal;
    d.querySelectorAll('[data-apal]').forEach((x) => x.classList.toggle('on', x.dataset.apal === V.apal));
    dibujar();
  });

  // Intensidad: realza las zonas débiles o deja solo las fuertes.
  $('lq-int').oninput = (e) => { V.intensidad = Number(e.target.value) / 100; dibujar(); };
  $('lq-int').value = Math.round(V.intensidad * 100);

  // Mostrar u ocultar el mapa, para ver las velas limpias.
  $('lq-ver').onclick = () => {
    V.verMapa = !V.verMapa;
    $('lq-ver').classList.toggle('apagado', !V.verMapa);
    dibujar();
  };

  $('lq-fit').onclick = () => encuadrar();

  $('lq-foto').onclick = () => guardarImagen();

  pintar();
  // Al girar el móvil o cambiar de tamaño, se vuelve a dibujar.
  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('lq-caja')) pintar(); }, 250);
  });
}

async function pintar() {
  const caja = $('lq-caja'); if (!caja) return;
  caja.innerHTML = `<div class="lq-cargando">Calculando zonas de liquidez…</div>`;
  try {
    const par = PARES.find((p) => p.id === _par) || PARES[0];
    const velas = await traerVelas(par.s, _tf, 500);
    if (velas.length < 30) throw new Error('vacío');

    V.velas = velas;
    V.tfLargo = (_tf === '1d' || _tf === '4h');
    V.mapa = construirMapa(velas);
    if (!V.mapa) throw new Error('pocos datos');

    encuadrar();
    arrancarVivo();
  } catch (_) {
    caja.innerHTML = `<div class="lq-vacio">No se pudieron cargar los datos.<br>Revisa tu conexión y vuelve a intentarlo.</div>`;
  }
}

/* ══════════════════════════════════════════════════════════════
   DIBUJO — el mapa de calor

   Gradiente de frío a caliente, como en las herramientas de pago:
   morado oscuro (poca liquidez) → azul → verde → amarillo → naranja
   → rojo → blanco (muros de liquidación).

   Se pinta en un canvas, no en SVG: son 33.000 celdas y el SVG no
   aguantaría eso sin ir a tirones.
   ══════════════════════════════════════════════════════════════ */

/** Paleta de calor. v va de 0 a 1. */
function calor(v) {
  if (v <= 0) return null;
  /* Curva 0,72 en vez de 0,42: antes casi todo saltaba a verde y
     amarillo y no había jerarquía. Ahora la base se queda en azul y
     solo lo que de verdad acumula llega a rojo. Es lo que hace legible
     el mapa: el ojo va directo a los muros. */
  /* Curva 0,52: con 0,62 el amarillo llegaba demasiado pronto y el
     rojo casi no aparecía. Ahora la mayoría se queda en azul y verde,
     y el rojo se reserva para los picos reales. */
  const p = Math.pow(v, 0.42);
  /* ══════════════════════════════════════════════════════════════
     PALETA — sacada píxel a píxel de la herramienta de referencia.

     Seis tonos PUROS y saturados, sin blanco ni morado ni naranja.
     El blanco no informaba de nada y encima ensuciaba el rojo, que es
     el color que de verdad tiene que gritar "aquí está el muro".

     El verde ocupa el tramo medio (es el dominante en su gráfico), el
     amarillo marca lo alto, y el rojo se reserva para lo máximo.
     ══════════════════════════════════════════════════════════════ */
  const paradas = [
    [0.00, [6, 30, 96]],      // azul profundo — poca liquidez
    [0.20, [34, 70, 167]],    // azul — base
    [0.38, [8, 150, 150]],    // turquesa
    [0.56, [8, 190, 12]],     // VERDE puro — el tono dominante
    [0.74, [140, 210, 8]],    // verde lima
    [0.86, [228, 229, 5]],    // AMARILLO puro — zona alta
    [0.92, [255, 120, 10]],   // naranja, transición corta
    [1.00, [255, 0, 0]]       // #FF0000 — ROJO ABSOLUTO: los muros
  ];
  for (let i = 1; i < paradas.length; i++) {
    if (p <= paradas[i][0]) {
      const [a, ca] = paradas[i - 1], [b, cb] = paradas[i];
      const t = (p - a) / Math.max(1e-9, b - a);
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * t),
        Math.round(ca[1] + (cb[1] - ca[1]) * t),
        Math.round(ca[2] + (cb[2] - ca[2]) * t)
      ];
    }
  }
  return paradas[paradas.length - 1][1];
}

/** Ajusta la escala vertical a lo que se ve, si está en automático. */
function ajustarY() {
  if (!V.autoY || !V.velas.length) return;
  const vis = V.velas.slice(V.desde, V.desde + V.ancho);
  if (!vis.length) return;
  const alto = Math.max(...vis.map((v) => v.h));
  const bajo = Math.min(...vis.map((v) => v.l));
  const m = (alto - bajo) * 0.28 || 1;
  V.yMax = alto + m;
  V.yMin = Math.max(0, bajo - m);
}

function dibujar() {
  const caja = $('lq-caja'); if (!caja || !V.mapa) return;

  const W = caja.clientWidth || 900;
  const H = caja.clientHeight || 500;
  if (W < 50 || H < 50) return;

  let cv = caja.querySelector('.lq-cv');
  if (!cv) {
    caja.innerHTML = `<canvas class="lq-cv"></canvas>
      <div class="lq-info" id="lq-info"></div>
      <div class="lq-marca">CriptoCuba Oficial</div>`;
    cv = caja.querySelector('.lq-cv');
    engancharGestos(cv);
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mDer = 62, mAba = 20;
  const x1 = W - mDer;                 // donde empieza la escala
  /* Las velas al 78%: el perfil de la derecha se ha quitado (estaba
     invertido y no aportaba), así que el gráfico recupera ese sitio.
     Queda un margen para ver hacia dónde apuntan los muros. */
  const xVelas = x1 * 0.78;
  const y1 = H - mAba;

  ajustarY();
  const { yMin, yMax } = V;
  const Y = (p) => y1 - y1 * ((p - yMin) / Math.max(1e-12, yMax - yMin));

  g.fillStyle = '#0a0d12';
  g.fillRect(0, 0, W, H);

  const desde = Math.max(0, Math.floor(V.desde));
  const hasta = Math.min(V.mapa.velas.length, desde + V.ancho);
  const vis = V.mapa.velas.slice(desde, hasta);
  if (!vis.length) return;

  const paso = xVelas / V.ancho;
  const altoFila = y1 / FILAS;

  /* ── EL MAPA DE CALOR ── */
  if (V.verMapa) {
    /* Los valores ya vienen normalizados de 0 a 1 desde columnaDe(),
       con cada capa en su escala. No hay que volver a normalizar. */
    /* El máximo de lo VISIBLE, no el global. Con el global, al hacer
       zoom sobre una zona tranquila todo quedaba del mismo color. */
    const cols = [];
    let max = 0;
    for (let c = desde; c < hasta; c++) {
      const col = columnaDe(V.mapa, c);
      cols.push(col);
      for (const v of col) if (v > max) max = v;
    }
    if (max > 0) {
      const fMin = Math.max(0, Math.floor((yMin - V.mapa.yMin) / V.mapa.alturaFila));
      const fMax = Math.min(FILAS, Math.ceil((yMax - V.mapa.yMin) / V.mapa.alturaFila));

      /* ══════════════════════════════════════════════════════════
         CELDAS, NO BARRAS

         Antes se pintaban franjas que cruzaban toda la pantalla y
         quedaba una masa de color sin lectura. Ahora cada celda es un
         cuadrito con su hueco alrededor, como en las herramientas de
         referencia: se ve la rejilla y cada zona se distingue.

         Y el mapa TERMINA donde terminan las velas. Solo la última
         columna se prolonga un poco: son las zonas que siguen vivas.
         ══════════════════════════════════════════════════════════ */
      const hueco = paso > 6 ? 1 : 0.35;        // separación entre celdas
      const huecoV = altoFila > 5 ? 0.9 : 0.25;

      cols.forEach((col, i) => {
        const x = i * paso;
        /* El mapa TERMINA donde terminan las velas. Antes la última
           columna se estiraba hasta la escala y se comía la zona del
           perfil de liquidez, que es lo que dejaba el gráfico saturado
           por la derecha. */
        const ancho = Math.max(1, paso - hueco);

        for (let f = fMin; f < fMax; f++) {
          const v = col[f];
          if (v <= 0) continue;
          /* El refuerzo se aplica AQUÍ, sobre el valor ya normalizado.
             Aplicarlo antes disparaba el máximo global y aplastaba la
             escala: todo salía del mismo color. */
          const ref = (V.mapa.refuerzo && V.mapa.refuerzo[f]) || 1;
          const rel = Math.min(1, (v / max) * V.intensidad * ref);
          // Por debajo de este umbral no se pinta: deja respirar el
          // gráfico y hace que destaquen las zonas que importan.
          if (rel < 0.02) continue;
          const rgb = calor(rel);
          if (!rgb) continue;
          const pF = V.mapa.yMin + f * V.mapa.alturaFila;
          const y = Y(pF + V.mapa.alturaFila);
          const h = Math.max(1, Y(pF) - y - huecoV);
          g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
          g.fillRect(x, y, ancho, h);
        }
      });
    }
  }

  /* ── LAS VELAS, con los colores de siempre ── */
  const VERDE = '#26a69a', ROJO = '#ef5350';
  const cuerpo = Math.max(1, paso * 0.68);
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const col = v.c >= v.o ? VERDE : ROJO;
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(0.8, paso * 0.12);
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1.2, yB - yA));
  });

  /* ── LA LÍNEA DEL PRECIO, de borde a borde ── */
  const ult = V.mapa.velas[V.mapa.velas.length - 1];
  const yU = Y(ult.c);
  if (yU > 0 && yU < y1) {
    g.strokeStyle = 'rgba(232,184,75,.8)';
    g.setLineDash([5, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, yU); g.lineTo(x1, yU); g.stroke();
    g.setLineDash([]);
  }

  /* ── LA ESCALA DE PRECIOS ── */
  g.fillStyle = '#0b0e12';
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();
  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 8; i++) {
    const p = yMin + (yMax - yMin) * (i / 8);
    const y = Y(p);
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = '#6b7681';
    g.fillText(fmt(p), x1 + 6, y + 3.5);
  }
  if (yU > 0 && yU < y1) {
    g.fillStyle = '#E8B84B';
    g.fillRect(x1 + 1, yU - 9, mDer - 3, 18);
    g.fillStyle = '#3a2800';
    g.font = 'bold 11px ui-monospace,monospace';
    g.fillText(fmt(ult.c), x1 + 6, yU + 4);
  }

  /* ── LAS FECHAS, abajo ── */
  g.fillStyle = '#0b0e12';
  g.fillRect(0, y1, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = '#6b7681';
  const cada = Math.max(1, Math.floor(vis.length / 6));
  vis.forEach((v, i) => {
    if (i % cada !== 0) return;
    const x = i * paso + paso / 2;
    if (x > xVelas) return;
    const d = new Date(v.t * 1000);
    const et = V.tfLargo
      ? d.toLocaleDateString('es', { day: '2-digit', month: 'short' })
      : d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    g.textAlign = 'center';
    g.fillText(et, x, y1 + 13);
  });
  g.textAlign = 'left';

  /* ══════════════════════════════════════════════════════════════
     LOS DIBUJOS DEL USUARIO

     Se guardan en precio y tiempo, así que al hacer zoom o arrastrar
     se mueven CON el gráfico. Es lo que distingue una herramienta de
     análisis de un simple dibujo encima.
     ══════════════════════════════════════════════════════════════ */
  const Xt = (t) => {
    const i = V.mapa.velas.findIndex((v) => v.t >= t);
    const idx = i < 0 ? V.mapa.velas.length - 1 : i;
    return (idx - desde) * paso + paso / 2;
  };

  const pintarDibujo = (d, enCurso) => {
    const op = enCurso ? 0.65 : 1;
    if (d.tipo === 'horizontal') {
      const y = Y(d.p1);
      if (y < -20 || y > y1 + 20) return;
      g.strokeStyle = `rgba(77,159,255,${op})`;
      g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
      g.fillStyle = '#4d9fff';
      g.fillRect(x1 + 1, y - 8, mDer - 3, 16);
      g.fillStyle = '#04121f';
      g.font = 'bold 10px ui-monospace,monospace';
      g.textAlign = 'left';
      g.fillText(fmt(d.p1), x1 + 6, y + 3.5);
      return;
    }

    const xa = Xt(d.t1), xb = Xt(d.t2);
    const ya = Y(d.p1), yb = Y(d.p2);

    if (d.tipo === 'linea') {
      g.strokeStyle = `rgba(77,159,255,${op})`;
      g.lineWidth = 1.6;
      g.beginPath(); g.moveTo(xa, ya); g.lineTo(xb, yb); g.stroke();
      if (!enCurso) {
        g.fillStyle = '#4d9fff';
        [[xa, ya], [xb, yb]].forEach(([px, py]) => {
          g.beginPath(); g.arc(px, py, 3.5, 0, Math.PI * 2); g.fill();
        });
      }
      return;
    }

    if (d.tipo === 'fibo') {
      const alto = d.p2 - d.p1;
      const izq = Math.min(xa, xb), der = Math.max(xa, xb);
      const cols = ['#787b86', '#f23645', '#ff9800', '#4caf50', '#089981', '#00bcd4', '#787b86'];
      FIBO.forEach((niv, i) => {
        const p = d.p1 + alto * niv;
        const y = Y(p);
        if (y < -20 || y > y1 + 20) return;
        g.strokeStyle = cols[i] + (enCurso ? '99' : 'dd');
        g.lineWidth = (niv === 0.618 || niv === 0.5) ? 1.6 : 1;
        g.beginPath(); g.moveTo(izq, y); g.lineTo(Math.max(der, x1), y); g.stroke();
        g.fillStyle = cols[i];
        g.font = '9px ui-monospace,monospace';
        g.textAlign = 'left';
        g.fillText(`${(niv * 100).toFixed(1)}%  ${fmt(p)}`, izq + 5, y - 3);
      });
    }
  };

  V.dibujos.forEach((d) => pintarDibujo(d, false));
  if (V.enCurso) pintarDibujo(V.enCurso, true);

  /* ══════════════════════════════════════════════════════════════
     LA CRUZ — precio y hora bajo el puntero
     ══════════════════════════════════════════════════════════════ */
  if (V.cruzX >= 0 && V.cruzX < x1 && V.cruzY >= 0 && V.cruzY < y1) {
    g.strokeStyle = 'rgba(255,255,255,.28)';
    g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath();
    g.moveTo(V.cruzX, 0); g.lineTo(V.cruzX, y1);
    g.moveTo(0, V.cruzY); g.lineTo(x1, V.cruzY);
    g.stroke();
    g.setLineDash([]);

    // El precio, en la escala
    const pCruz = yMin + (yMax - yMin) * ((y1 - V.cruzY) / y1);
    g.fillStyle = '#2b3139';
    g.fillRect(x1 + 1, V.cruzY - 9, mDer - 3, 18);
    g.fillStyle = '#eaecef';
    g.font = 'bold 10px ui-monospace,monospace';
    g.textAlign = 'left';
    g.fillText(fmt(pCruz), x1 + 6, V.cruzY + 4);

    // La hora, abajo
    const iv = Math.floor(V.cruzX / paso);
    if (iv >= 0 && iv < vis.length) {
      const d = new Date(vis[iv].t * 1000);
      const et = d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + ' ' +
                 d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
      g.font = '9px ui-monospace,monospace';
      const w = g.measureText(et).width + 14;
      g.fillStyle = '#2b3139';
      g.fillRect(Math.min(x1 - w, Math.max(0, V.cruzX - w / 2)), y1 + 2, w, 16);
      g.fillStyle = '#eaecef';
      g.textAlign = 'center';
      g.fillText(et, Math.min(x1 - w / 2, Math.max(w / 2, V.cruzX)), y1 + 13);
      g.textAlign = 'left';
    }
  }

  const info = $('lq-info');
  if (info) info.textContent = `${_par} · ${_tf} · ${V.apal === 'todos' ? 'todo apalancamiento' : 'x' + V.apal}`;
}

/* ══════════════════════════════════════════════════════════════
   GESTOS — arrastrar y zoom

   El mapa NO se recalcula al mover: se vuelve a pintar con las
   coordenadas nuevas. Por eso queda pegado a las velas siempre.
   ══════════════════════════════════════════════════════════════ */
function engancharGestos(cv) {
  const total = () => V.mapa ? V.mapa.velas.length : 0;

  const mover = (dx, dy) => {
    const W = cv.clientWidth || 900;
    const paso = (W * 0.70) / V.ancho;
    const velasMovidas = dx / Math.max(0.5, paso);
    /* [CORREGIDO] El tope de "total - 20" cortaba el gráfico al llegar
       a la derecha. Ahora se puede seguir hasta dejar las velas atrás,
       que es lo normal en cualquier gráfico de trading: así se ve el
       espacio de proyección hacia delante. */
    const topeDer = total() - Math.round(V.ancho * 0.25);
    V.desde = Math.max(-V.ancho * 0.15, Math.min(topeDer, V.desde - velasMovidas));
    if (dy !== 0) {
      // Mover en vertical desactiva el ajuste automático
      V.autoY = false;
      const H = cv.clientHeight || 500;
      const rango = V.yMax - V.yMin;
      const d = (dy / H) * rango;
      V.yMin += d; V.yMax += d;
    }
    dibujar();
  };

  const zoom = (factor, centroX) => {
    const W = cv.clientWidth || 900;
    const rel = Math.max(0, Math.min(1, centroX / (W * 0.70)));
    const anclaje = V.desde + V.ancho * rel;
    V.ancho = Math.max(25, Math.min(total(), Math.round(V.ancho * factor)));
    const topeDer = total() - Math.round(V.ancho * 0.25);
    V.desde = Math.max(-V.ancho * 0.15, Math.min(topeDer, anclaje - V.ancho * rel));
    V.autoY = true;
    dibujar();
  };

  /* Traduce un punto de la pantalla a precio y tiempo. Guardar así
     los dibujos es lo que hace que se peguen al gráfico. */
  const aDatos = (px, py) => {
    const W = cv.clientWidth || 900, H = cv.clientHeight || 500;
    const x1 = W - 62, y1 = H - 20;
    const paso = (x1 * 0.70) / V.ancho;
    const i = Math.max(0, Math.min(V.mapa.velas.length - 1,
      Math.round(V.desde + px / Math.max(0.5, paso))));
    return {
      t: V.mapa.velas[i].t,
      p: V.yMin + (V.yMax - V.yMin) * ((y1 - py) / y1)
    };
  };

  // ── Ratón ──
  cv.addEventListener('mousedown', (e) => {
    const r = cv.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    // Si hay una herramienta activa, se dibuja en vez de arrastrar.
    if (V.herramienta) {
      const d = aDatos(px, py);
      if (V.herramienta === 'horizontal') {
        V.dibujos.push({ tipo: 'horizontal', p1: d.p });
        V.herramienta = null;
        marcarHerramienta();
        dibujar();
        return;
      }
      V.enCurso = { tipo: V.herramienta, t1: d.t, p1: d.p, t2: d.t, p2: d.p };
      return;
    }

    V.arrastrando = true; V.x0 = e.clientX; V.y0 = e.clientY;
    cv.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (V.enCurso) {
      const r = cv.getBoundingClientRect();
      const d = aDatos(e.clientX - r.left, e.clientY - r.top);
      V.enCurso.t2 = d.t; V.enCurso.p2 = d.p;
      dibujar();
      return;
    }
    if (!V.arrastrando) return;
    mover(e.clientX - V.x0, e.clientY - V.y0);
    V.x0 = e.clientX; V.y0 = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    if (V.enCurso) {
      // Un clic sin arrastrar no cuenta como línea
      const movido = V.enCurso.t1 !== V.enCurso.t2 || V.enCurso.p1 !== V.enCurso.p2;
      if (movido) V.dibujos.push(V.enCurso);
      V.enCurso = null;
      V.herramienta = null;
      marcarHerramienta();
      dibujar();
      return;
    }
    V.arrastrando = false;
    cv.style.cursor = V.herramienta ? 'crosshair' : 'grab';
  });
  // La cruz sigue al puntero. Se redibuja solo si de verdad se movió.
  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    const nx = Math.round(e.clientX - r.left), ny = Math.round(e.clientY - r.top);
    if (nx === V.cruzX && ny === V.cruzY) return;
    V.cruzX = nx; V.cruzY = ny;
    if (!V.arrastrando) dibujar();
  });
  cv.addEventListener('mouseleave', () => { V.cruzX = -1; V.cruzY = -1; dibujar(); });

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    zoom(e.deltaY > 0 ? 1.14 : 0.88, e.clientX - r.left);
  }, { passive: false });

  // ── Táctil: un dedo mueve, dos dedos hacen zoom ──
  let d0 = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      V.arrastrando = true;
      V.x0 = e.touches[0].clientX; V.y0 = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      V.arrastrando = false;
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                      e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });

  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && V.arrastrando) {
      e.preventDefault();
      mover(e.touches[0].clientX - V.x0, e.touches[0].clientY - V.y0);
      V.x0 = e.touches[0].clientX; V.y0 = e.touches[0].clientY;
    } else if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX,
                           e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d - d0) > 6) {
        const r = cv.getBoundingClientRect();
        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
        zoom(d0 / d, cx);
        d0 = d;
      }
    }
  }, { passive: false });

  cv.addEventListener('touchend', () => { V.arrastrando = false; d0 = 0; });

  // Doble toque o doble clic: volver al encuadre inicial
  cv.addEventListener('dblclick', () => encuadrar());
  cv.style.cursor = 'grab';
}

/* ══════════════════════════════════════════════════════════════
   DESPLEGABLES
   Con 26 monedas y 9 temporalidades, las filas de botones no caben.
   Un desplegable con buscador es más rápido y ocupa nada.
   ══════════════════════════════════════════════════════════════ */
function cerrarMenus() {
  document.querySelectorAll('.lq-menu').forEach((x) => x.remove());
}

function abrirMenu(anclaje, html, alSeleccionar, conBuscador) {
  cerrarMenus();
  const r = anclaje.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'lq-menu';
  m.innerHTML = (conBuscador
    ? `<input class="lq-buscar" id="lq-buscar" placeholder="Buscar…" autocomplete="off">`
    : '') + `<div class="lq-menu-lista">${html}</div>`;
  document.body.appendChild(m);

  // Se coloca bajo el botón, pero sin salirse de la pantalla
  const ancho = m.offsetWidth || 220;
  m.style.left = Math.max(8, Math.min(window.innerWidth - ancho - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';
  const alto = m.offsetHeight;
  if (r.bottom + 6 + alto > window.innerHeight - 8) {
    m.style.maxHeight = (window.innerHeight - r.bottom - 18) + 'px';
  }

  m.addEventListener('click', (e) => e.stopPropagation());
  m.querySelectorAll('[data-val]').forEach((b) => b.onclick = () => {
    alSeleccionar(b.dataset.val);
    cerrarMenus();
  });

  const bus = m.querySelector('#lq-buscar');
  if (bus) {
    bus.oninput = () => {
      const q = bus.value.toLowerCase().trim();
      m.querySelectorAll('[data-val]').forEach((x) => {
        x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
      });
    };
    setTimeout(() => { try { bus.focus(); } catch (_) {} }, 60);
  }
  setTimeout(() => document.addEventListener('click', cerrarMenus, { once: true }), 10);
}

function menuPares() {
  const html = PARES.map((p) => `
    <button data-val="${p.id}" data-busca="${(p.id + ' ' + p.n).toLowerCase()}"
            class="lq-op ${p.id === _par ? 'on' : ''}">
      <b>${p.id}</b><span>${esc(p.n)}</span>
      ${p.id === _par ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m20 6-11 11-5-5"/></svg>' : ''}
    </button>`).join('');
  abrirMenu($('lq-sel-par'), html, (v) => {
    _par = v;
    const b = $('lq-sel-par').querySelector('b');
    if (b) b.textContent = v;
    V.dibujos = [];          // los dibujos son de la moneda anterior
    pintar();
  }, true);
}

function menuTfs() {
  const html = TFS.map((t) => `
    <button data-val="${t.id}" data-busca="${t.n.toLowerCase()}"
            class="lq-op ${t.id === _tf ? 'on' : ''}">
      <b>${t.id}</b><span>${esc(t.n)}</span>
      ${t.id === _tf ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m20 6-11 11-5-5"/></svg>' : ''}
    </button>`).join('');
  abrirMenu($('lq-sel-tf'), html, (v) => {
    _tf = v;
    const b = $('lq-sel-tf').querySelector('b');
    if (b) b.textContent = (TFS.find((t) => t.id === v) || {}).n || v;
    V.dibujos = [];
    pintar();
  }, false);
}

/* ══════════════════════════════════════════════════════════════
   GUARDAR IMAGEN

   Se copia el gráfico a un lienzo nuevo y se le añade NUESTRA marca:
   el nombre y el par abajo. Así, cuando alguien comparte su análisis,
   va firmado. Es publicidad que se reparte sola.
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const cv = document.querySelector('.lq-cv');
  if (!cv) return;
  try {
    const out = document.createElement('canvas');
    const barra = 46;
    out.width = cv.width;
    out.height = cv.height + barra * (cv.width / cv.clientWidth);
    const g = out.getContext('2d');
    const esc = cv.width / cv.clientWidth;

    g.fillStyle = '#0a0d12';
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, 0, 0);

    // La franja de la marca
    const yB = cv.height;
    g.fillStyle = '#0b0e12';
    g.fillRect(0, yB, out.width, barra * esc);
    g.fillStyle = 'rgba(232,184,75,.25)';
    g.fillRect(0, yB, out.width, 1.5 * esc);

    g.fillStyle = '#E8B84B';
    g.font = `800 ${17 * esc}px system-ui,sans-serif`;
    g.textAlign = 'left';
    g.fillText('CRIPTO CUBA OFICIAL', 16 * esc, yB + 21 * esc);

    g.fillStyle = '#6b7681';
    g.font = `${11 * esc}px ui-monospace,monospace`;
    g.fillText('criptocubaoficial.com  ·  Mapa de Liquidaciones', 16 * esc, yB + 36 * esc);

    g.textAlign = 'right';
    g.fillStyle = '#8b96a3';
    g.font = `700 ${13 * esc}px ui-monospace,monospace`;
    const fecha = new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    g.fillText(`${_par} · ${_tf}`, out.width - 16 * esc, yB + 21 * esc);
    g.font = `${10 * esc}px ui-monospace,monospace`;
    g.fillStyle = '#6b7681';
    g.fillText(fecha, out.width - 16 * esc, yB + 36 * esc);

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `criptocuba-${_par}-${_tf}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  } catch (_) {}
}

/** Refleja en los botones qué herramienta está activa. */
function marcarHerramienta() {
  document.querySelectorAll('[data-tool-lq]').forEach((b) => {
    b.classList.toggle('on', b.dataset.toolLq === V.herramienta);
  });
  const cv = document.querySelector('.lq-cv');
  if (cv) cv.style.cursor = V.herramienta ? 'crosshair' : 'grab';
}

/** Deja la vista en su posición natural: lo último, a la derecha. */
function encuadrar() {
  const n = V.mapa ? V.mapa.velas.length : 0;
  V.ancho = Math.min(n, window.innerWidth < 700 ? 90 : 150);
  V.desde = Math.max(0, n - V.ancho);
  V.autoY = true;
  dibujar();
}

const fmt = (p) => {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
};

/** Qué significa cada cosa. */
function ayuda() {
  const d = document.createElement('div');
  d.id = 'lq-ayuda-box';
  d.innerHTML = `<div class="lq-bg"></div>
    <div class="lqa-c">
      <div class="lqa-t">Cómo se lee este mapa</div>

      <div class="lqa-p">
        <b>Qué estás viendo</b>
        Los precios donde hay <b>posiciones apalancadas esperando a ser liquidadas</b>. Cuanto más brillante la zona, más dinero se cerraría a la fuerza si el precio llega ahí.
      </div>

      <div class="lqa-p">
        <b>Por qué importa</b>
        Esas zonas actúan como <b>imanes</b>. Cuando el precio se acerca, las liquidaciones se disparan en cadena y lo empujan aún más rápido en esa dirección.
      </div>

      <div class="lqa-p">
        <b>Los colores</b>
        <span class="lqa-col"><i style="background:rgb(34,70,167)"></i>Azul — poca liquidez</span>
        <span class="lqa-col"><i style="background:rgb(8,190,12)"></i>Verde — acumulación media</span>
        <span class="lqa-col"><i style="background:rgb(228,229,5)"></i>Amarillo — zona importante</span>
        <span class="lqa-col"><i style="background:rgb(252,54,71)"></i>Rojo — <b>muro de liquidación</b></span>
        
      </div>

      <div class="lqa-p">
        <b>Por qué desaparecen zonas</b>
        Cuando el precio toca un nivel, esas posiciones <b>ya se liquidaron</b>: dejan de existir. Por eso el mapa se va "consumiendo" por donde pasa el precio.
      </div>

      <div class="lqa-aviso">
        Son <b>estimaciones</b> a partir de precio y volumen, no datos internos de ningún exchange. Nadie publica eso. Úsalo como contexto, no como certeza.
      </div>

      <button class="lqa-b" id="lqa-cerrar">Entendido</button>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.lq-bg').onclick = q;
  $('lqa-cerrar').onclick = q;
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('lq-css')) return;
  const s = document.createElement('style'); s.id = 'lq-css';
  s.textContent = `
  #lq-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center;padding:0}
  #lq-overlay .lq-bg{position:absolute;inset:0;background:rgba(3,5,8,.94)}
  #lq-overlay .lq-c{position:relative;width:100%;height:100vh;height:100dvh;display:flex;flex-direction:column;
    background:#07090c;padding:0}

  /* Una sola barra arriba: monedas, temporalidad y botones. El resto
     es gráfico, que es a lo que viene el usuario. */
  /* La barra: los selectores se deslizan, pero cerrar y ayuda quedan
     SIEMPRE a la vista. Si se van con el scroll, no puedes salir. */
  #lq-overlay .lq-barra{display:flex;align-items:center;gap:8px;flex:0 0 auto;position:relative;
    padding:8px 190px 8px 10px;background:#0b0e12;border-bottom:1px solid #1c2128;
    overflow-x:auto;scrollbar-width:none}
  #lq-overlay .lq-barra::-webkit-scrollbar{display:none}
  #lq-overlay .lq-grupo{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #lq-overlay .lq-b{min-height:32px;padding:0 12px;border-radius:7px;border:none;background:transparent;color:#7d8794;
    font-family:var(--mono,monospace);font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  #lq-overlay .lq-b.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #lq-overlay .lq-b:not(.on):hover{background:rgba(255,255,255,.05);color:#b7bdc6}
  #lq-overlay .lq-der{position:absolute;right:8px;top:50%;transform:translateY(-50%);
    display:flex;gap:5px;z-index:6;background:#0b0e12;padding-left:8px}
  #lq-overlay .lq-ayuda.apagado{opacity:.4}
  /* Selectores desplegables */
  #lq-overlay .lq-sel{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;
    min-height:34px;padding:0 11px;border-radius:9px;background:#12161c;border:1px solid #2b3139;
    color:#eaecef;cursor:pointer;font-family:var(--mono,monospace);font-size:12px;white-space:nowrap}
  #lq-overlay .lq-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #lq-overlay .lq-sel b{font-weight:700}
  #lq-overlay .lq-sel svg{width:13px;height:13px;opacity:.6}
  .lq-menu{position:fixed;z-index:9780;min-width:212px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;
    background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid var(--gold-soft,#C9A84B);
    border-radius:13px;padding:6px;box-shadow:0 16px 44px rgba(0,0,0,.7)}
  .lq-menu-lista{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  .lq-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;border-radius:9px;
    border:1px solid #2b3139;background:#0b0e12;color:#eaecef;
    font-family:var(--sans,sans-serif);font-size:13px;min-height:38px}
  .lq-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  .lq-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:9px;
    background:transparent;border:none;color:#b7bdc6;cursor:pointer;text-align:left;min-height:40px}
  .lq-op:hover{background:rgba(255,255,255,.05)}
  .lq-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  .lq-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:44px}
  .lq-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .lq-op.on span{color:#b7bdc6}
  .lq-op svg{width:14px;height:14px;flex:0 0 auto;color:var(--gold,#E8B84B)}
  /* Botones de herramienta: solo el icono, cuadrados. */
  #lq-overlay .lq-ico{width:32px;padding:0;display:grid;place-items:center}
  #lq-overlay .lq-ico svg{width:15px;height:15px}
  #lq-overlay .lq-ico.on{background:linear-gradient(180deg,#8fc4ff,#4d9fff 55%,#2b7fe0);color:#04121f}
  /* El deslizador de intensidad */
  #lq-overlay .lq-slider{align-items:center;gap:8px;padding:3px 10px 3px 8px}
  #lq-overlay .lq-slider span{font-family:var(--mono,monospace);font-size:9px;color:#6b7681;
    text-transform:uppercase;letter-spacing:.5px;white-space:nowrap}
  #lq-overlay .lq-slider input{-webkit-appearance:none;appearance:none;width:74px;height:4px;
    border-radius:20px;background:#2b3139;outline:none}
  #lq-overlay .lq-slider input::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;
    border-radius:50%;background:var(--gold,#E8B84B);cursor:pointer;border:none}
  #lq-overlay .lq-slider input::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:var(--gold,#E8B84B);cursor:pointer;border:none}
  /* La marca de agua: nuestra, en la esquina, discreta */
  #lq-overlay .lq-marca{position:absolute;left:10px;bottom:26px;pointer-events:none;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;
    color:rgba(232,184,75,.22);letter-spacing:.5px;user-select:none}
  #lq-overlay .lq-ayuda,#lq-overlay .lq-x{width:34px;height:34px;min-height:34px;flex:0 0 auto;border-radius:9px;display:grid;place-items:center;
    padding:0;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #lq-overlay .lq-ayuda:hover,#lq-overlay .lq-x:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}

  /* El gráfico se lo come todo. */
  #lq-overlay .lq-caja{flex:1;min-height:0;position:relative;background:#07090c;
    display:flex;align-items:center;justify-content:center;overflow:hidden}
  #lq-overlay .lq-cv{display:block}
  #lq-overlay .lq-info{position:absolute;left:9px;top:8px;font-family:var(--mono,monospace);font-size:10px;
    color:#6b7681;background:rgba(7,9,12,.75);padding:3px 8px;border-radius:20px;pointer-events:none}
  #lq-overlay .lq-cargando,#lq-overlay .lq-vacio{font-family:var(--mono,monospace);font-size:12px;
    color:#7d8794;text-align:center;padding:30px;line-height:1.7}

  /* La escala de color, fina y abajo. */
  #lq-overlay .lq-escala{flex:0 0 auto;display:flex;align-items:center;gap:9px;
    padding:7px 12px;background:#0b0e12;border-top:1px solid #1c2128}
  #lq-overlay .lq-escala span{font-family:var(--mono,monospace);font-size:9px;color:#6b7681;
    text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
  /* La escala refleja la paleta real del mapa. */
  #lq-overlay .lq-gr{flex:1;height:8px;border-radius:20px;
    background:linear-gradient(90deg,rgb(6,30,96),rgb(34,70,167),rgb(8,150,150),rgb(8,190,12),rgb(140,210,8),rgb(228,229,5),rgb(250,150,20),rgb(252,54,71))}

  /* Ayuda */
  #lq-ayuda-box{position:fixed;inset:0;z-index:9760;display:flex;align-items:center;justify-content:center;padding:16px}
  #lq-ayuda-box .lq-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #lq-ayuda-box .lqa-c{position:relative;width:100%;max-width:440px;max-height:calc(100vh - 32px);overflow-y:auto;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #lq-ayuda-box .lqa-t{font-family:var(--display,sans-serif);font-weight:800;font-size:20px;color:var(--gold,#E8B84B);
    text-align:center;margin-bottom:18px}
  #lq-ayuda-box .lqa-p{margin-bottom:15px;font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.65}
  #lq-ayuda-box .lqa-p > b:first-child{display:block;font-family:var(--display,sans-serif);font-size:14px;
    color:#eaecef;margin-bottom:5px}
  #lq-ayuda-box .lqa-p b{color:#eaecef}
  #lq-ayuda-box .lqa-col{display:flex;align-items:center;gap:9px;margin-top:7px;font-size:12.5px}
  #lq-ayuda-box .lqa-col i{width:16px;height:11px;border-radius:3px;flex:0 0 auto}
  #lq-ayuda-box .lqa-aviso{padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.07);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12px;color:#b7bdc6;line-height:1.6;margin-bottom:18px}
  #lq-ayuda-box .lqa-aviso b{color:var(--gold,#E8B84B)}
  #lq-ayuda-box .lqa-b{width:100%;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a}

  @media(max-width:760px){
    #lq-overlay .lq-barra{padding:7px 8px;gap:6px}
    #lq-overlay .lq-b{padding:0 10px;font-size:11px;min-height:34px}
    #lq-overlay .lq-barra{padding-right:186px}
    #lq-overlay .lq-marca{font-size:11px;bottom:24px}
    #lq-overlay .lq-escala{padding:6px 10px;gap:7px}
    #lq-overlay .lq-escala span{font-size:8px}
    #lq-ayuda-box .lqa-c{padding:20px 15px}
  }`;
  document.head.appendChild(s);
}
