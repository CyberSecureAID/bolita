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
  { id: 'BTC',  s: 'BTCUSDT',  n: 'Bitcoin' },
  { id: 'ETH',  s: 'ETHUSDT',  n: 'Ethereum' },
  { id: 'BNB',  s: 'BNBUSDT',  n: 'BNB' },
  { id: 'SOL',  s: 'SOLUSDT',  n: 'Solana' },
  { id: 'XRP',  s: 'XRPUSDT',  n: 'XRP' },
  { id: 'DOGE', s: 'DOGEUSDT', n: 'Dogecoin' }
];
const TFS = [
  { id: '15m', n: '15m' }, { id: '1h', n: '1H' },
  { id: '4h',  n: '4H'  }, { id: '1d', n: '1D' }
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
  intensidad: 1,      // realce del mapa
  verMapa: true,
  arrastrando: false,
  x0: 0, y0: 0,
  cruzX: -1, cruzY: -1     // dónde está el puntero, para la cruz
};

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
function construirMapa(velas) {
  if (velas.length < 30) return null;

  const his = velas.map((v) => v.h), los = velas.map((v) => v.l);
  const pAlto = Math.max(...his), pBajo = Math.min(...los);
  const margen = (pAlto - pBajo) * 0.30;
  const yMax = pAlto + margen, yMin = Math.max(0, pBajo - margen);
  const alturaFila = (yMax - yMin) / FILAS;
  const filaDe = (p) => Math.floor((p - yMin) / alturaFila);

  /* niveles[apalancamiento] = array de columnas, cada una con FILAS.
     Guardar por apalancamiento permite el filtro x10 / x25 / x50 / x100
     sin recalcular nada. */
  const niveles = {};
  APALANCAMIENTOS.forEach(({ x }) => {
    niveles[x] = Array.from({ length: velas.length }, () => new Float32Array(FILAS));
  });

  velas.forEach((v, ci) => {
    const medio = (v.h + v.l + v.c) / 3;
    const dinero = v.v * medio;
    if (!(dinero > 0)) return;

    const sube = v.c >= v.o;
    const partLargo = sube ? 0.58 : 0.42;

    APALANCAMIENTOS.forEach(({ x, peso }) => {
      const base = dinero * peso;
      const rej = niveles[x];

      [[medio * (1 - 1 / x), base * partLargo],
       [medio * (1 + 1 / x), base * (1 - partLargo)]].forEach(([precio, monto]) => {
        const f = filaDe(precio);
        if (f < 0 || f >= FILAS) return;

        // Vive hasta que el precio toca su nivel: ahí se liquida.
        for (let cj = ci; cj < velas.length; cj++) {
          const w = velas[cj];
          if (precio <= w.h && precio >= w.l) break;
          rej[cj][f] += monto;
        }
      });
    });
  });

  return { niveles, velas, yMin, yMax, alturaFila };
}

/** Suma los niveles según el filtro de apalancamiento activo. */
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
  }, 10000);
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
        <div class="lq-grupo">
          ${PARES.map((p) => `<button class="lq-b ${p.id === _par ? 'on' : ''}" data-par="${p.id}">${p.id}</button>`).join('')}
        </div>
        <div class="lq-grupo">
          ${TFS.map((t) => `<button class="lq-b ${t.id === _tf ? 'on' : ''}" data-tf="${t.id}">${t.n}</button>`).join('')}
        </div>
        <div class="lq-grupo" title="Filtrar por apalancamiento">
          ${['todos', '10', '25', '50', '100'].map((a) =>
            `<button class="lq-b ${a === V.apal ? 'on' : ''}" data-apal="${a}">${a === 'todos' ? 'Todo' : 'x' + a}</button>`).join('')}
        </div>
        <div class="lq-grupo lq-slider">
          <span>Intensidad</span>
          <input type="range" id="lq-int" min="50" max="300" value="100">
        </div>
        <div class="lq-der">
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
    clearInterval(_vivo);
    const e = $('lq-overlay'); if (e) e.remove();
  };
  d.querySelector('.lq-bg').onclick = cerrar;
  d.querySelector('.lq-x').onclick = cerrar;

  d.querySelectorAll('[data-par]').forEach((b) => b.onclick = () => {
    _par = b.dataset.par;
    d.querySelectorAll('[data-par]').forEach((x) => x.classList.toggle('on', x.dataset.par === _par));
    pintar();
  });
  d.querySelectorAll('[data-tf]').forEach((b) => b.onclick = () => {
    _tf = b.dataset.tf;
    d.querySelectorAll('[data-tf]').forEach((x) => x.classList.toggle('on', x.dataset.tf === _tf));
    pintar();
  });
  $('lq-ayuda').onclick = () => ayuda();

  // Filtro por apalancamiento: no recalcula nada, solo cambia qué suma.
  d.querySelectorAll('[data-apal]').forEach((b) => b.onclick = () => {
    V.apal = b.dataset.apal;
    d.querySelectorAll('[data-apal]').forEach((x) => x.classList.toggle('on', x.dataset.apal === V.apal));
    dibujar();
  });

  // Intensidad: realza las zonas débiles o deja solo las fuertes.
  $('lq-int').oninput = (e) => { V.intensidad = Number(e.target.value) / 100; dibujar(); };

  // Mostrar u ocultar el mapa, para ver las velas limpias.
  $('lq-ver').onclick = () => {
    V.verMapa = !V.verMapa;
    $('lq-ver').classList.toggle('apagado', !V.verMapa);
    dibujar();
  };

  $('lq-fit').onclick = () => encuadrar();

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
  const p = Math.pow(v, 0.72);
  const paradas = [
    [0.00, [26, 12, 58]],    // morado muy oscuro
    [0.18, [40, 30, 130]],   // azul profundo
    [0.34, [20, 90, 190]],   // azul
    [0.50, [20, 165, 150]],  // verde azulado
    [0.64, [90, 200, 70]],   // verde
    [0.76, [225, 200, 40]],  // amarillo
    [0.86, [240, 140, 30]],  // naranja
    [0.94, [235, 55, 45]],   // rojo
    [1.00, [255, 235, 220]]  // blanco: el muro
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
  const xVelas = x1 * 0.70;            // las velas ocupan el 70%
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
    // Máximo de lo VISIBLE: así el color siempre aprovecha todo el rango
    let max = 0;
    const cols = [];
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
          const rel = Math.min(1, (v / max) * V.intensidad);
          // Por debajo de este umbral no se pinta: deja respirar el
          // gráfico y hace que destaquen las zonas que importan.
          if (rel < 0.045) continue;
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

  /* ══════════════════════════════════════════════════════════════
     PERFIL DE LIQUIDEZ — en el margen derecho

     Suma toda la liquidez que hay a cada precio, sin importar cuándo
     se acumuló. Dice de un vistazo dónde están los muros grandes.
     ══════════════════════════════════════════════════════════════ */
  if (V.verMapa && V.mapa) {
    const perfil = new Float64Array(FILAS);
    for (let c = desde; c < hasta; c++) {
      const col = columnaDe(V.mapa, c);
      for (let f = 0; f < FILAS; f++) perfil[f] += col[f];
    }
    let pMax = 0;
    for (const v of perfil) if (v > pMax) pMax = v;

    if (pMax > 0) {
      const xP = xVelas + 10;
      const anchoP = (x1 - xP) * 0.88;
      const fMin2 = Math.max(0, Math.floor((yMin - V.mapa.yMin) / V.mapa.alturaFila));
      const fMax2 = Math.min(FILAS, Math.ceil((yMax - V.mapa.yMin) / V.mapa.alturaFila));

      for (let f = fMin2; f < fMax2; f++) {
        const v = perfil[f];
        if (v <= 0) continue;
        const rel = v / pMax;
        if (rel < 0.02) continue;
        const rgb = calor(rel);
        if (!rgb) continue;
        const pF = V.mapa.yMin + f * V.mapa.alturaFila;
        const y = Y(pF + V.mapa.alturaFila);
        const h = Math.max(1, Y(pF) - y - 0.6);
        g.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.82)`;
        g.fillRect(xP, y, Math.max(1, anchoP * rel), h);
      }
      // Separador entre el gráfico y el perfil
      g.strokeStyle = 'rgba(255,255,255,.07)';
      g.beginPath(); g.moveTo(xVelas + 2.5, 0); g.lineTo(xVelas + 2.5, y1); g.stroke();
    }
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
    V.desde = Math.max(0, Math.min(total() - 20, V.desde - velasMovidas));
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
    V.desde = Math.max(0, Math.min(total() - 20, anclaje - V.ancho * rel));
    V.autoY = true;
    dibujar();
  };

  // ── Ratón ──
  cv.addEventListener('mousedown', (e) => {
    V.arrastrando = true; V.x0 = e.clientX; V.y0 = e.clientY;
    cv.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!V.arrastrando) return;
    mover(e.clientX - V.x0, e.clientY - V.y0);
    V.x0 = e.clientX; V.y0 = e.clientY;
  });
  window.addEventListener('mouseup', () => {
    V.arrastrando = false; cv.style.cursor = 'grab';
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
        <span class="lqa-col"><i style="background:rgb(40,30,130)"></i>Azul oscuro — poca cosa</span>
        <span class="lqa-col"><i style="background:rgb(90,200,70)"></i>Verde — acumulación media</span>
        <span class="lqa-col"><i style="background:rgb(225,200,40)"></i>Amarillo — zona interesante</span>
        <span class="lqa-col"><i style="background:rgb(235,55,45)"></i>Rojo — mucha liquidez</span>
        <span class="lqa-col"><i style="background:rgb(255,235,220)"></i>Blanco — muro de liquidación</span>
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
    padding:8px 152px 8px 10px;background:#0b0e12;border-bottom:1px solid #1c2128;
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
  #lq-overlay .lq-gr{flex:1;height:8px;border-radius:20px;
    background:linear-gradient(90deg,rgb(26,12,58),rgb(40,30,130),rgb(20,90,190),rgb(20,165,150),rgb(90,200,70),rgb(225,200,40),rgb(240,140,30),rgb(235,55,45),rgb(255,235,220))}

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
    #lq-overlay .lq-barra{padding-right:150px}
    #lq-overlay .lq-marca{font-size:11px;bottom:24px}
    #lq-overlay .lq-escala{padding:6px 10px;gap:7px}
    #lq-overlay .lq-escala span{font-size:8px}
    #lq-ayuda-box .lqa-c{padding:20px 15px}
  }`;
  document.head.appendChild(s);
}
