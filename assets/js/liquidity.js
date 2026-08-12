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
let _afinacion = 5;
let _rejillas = 15;

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

const FILAS = 150;      // resolución vertical del mapa
const COLS  = 220;      // resolución horizontal

function construirMapa(velas) {
  const vis = velas.slice(-COLS);
  if (vis.length < 20) return null;

  // Rango de precio: el visible más un margen, porque las liquidaciones
  // quedan por fuera de donde se movió el precio.
  const his = vis.map((v) => v.h), los = vis.map((v) => v.l);
  const pAlto = Math.max(...his), pBajo = Math.min(...los);
  const margen = (pAlto - pBajo) * 0.22;
  const yMax = pAlto + margen, yMin = Math.max(0, pBajo - margen);
  const alturaFila = (yMax - yMin) / FILAS;

  // Rejilla: [columna][fila] = dinero acumulado
  const rej = Array.from({ length: vis.length }, () => new Float64Array(FILAS));

  const filaDe = (p) => Math.floor((p - yMin) / alturaFila);

  vis.forEach((v, ci) => {
    const medio = (v.h + v.l + v.c) / 3;
    const dinero = v.v * medio;          // volumen en moneda × precio
    if (!(dinero > 0)) return;

    // Se reparte entre largos y cortos según hacia dónde fue la vela.
    // Si sube, entraron más largos; si baja, más cortos.
    const sube = v.c >= v.o;
    const partLargo = sube ? 0.58 : 0.42;

    APALANCAMIENTOS.forEach(({ x, peso }) => {
      const base = dinero * peso;

      // LARGO: se liquida por debajo
      const pL = medio * (1 - 1 / x);
      // CORTO: se liquida por encima
      const pC = medio * (1 + 1 / x);

      [[pL, base * partLargo], [pC, base * (1 - partLargo)]].forEach(([precio, monto]) => {
        const f = filaDe(precio);
        if (f < 0 || f >= FILAS) return;

        /* Esa posición vive desde que se abrió HASTA que el precio toca
           su nivel. En cuanto lo toca, se liquida y desaparece: por eso
           el mapa se "come" las zonas por donde pasó el precio. */
        for (let cj = ci; cj < vis.length; cj++) {
          const w = vis[cj];
          if (precio <= w.h && precio >= w.l) break;   // tocada → fuera
          rej[cj][f] += monto;
        }
      });
    });
  });

  // Máximo, para normalizar el color
  let max = 0;
  for (const col of rej) for (const v of col) if (v > max) max = v;

  return { rej, vis, yMin, yMax, alturaFila, max };
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
        <div class="lq-der">
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

  const cerrar = () => { const e = $('lq-overlay'); if (e) e.remove(); };
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
    const velas = await traerVelas(par.s, _tf);
    if (!velas.length) throw new Error('vacío');

    const mapa = construirMapa(velas);
    if (!mapa) throw new Error('pocos datos');
    dibujar(mapa);
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
  const p = Math.pow(v, 0.42);          // curva: realza lo medio-bajo
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

function dibujar(mapa) {
  const caja = $('lq-caja'); if (!caja || !mapa) return;
  const { rej, vis, yMin, yMax, max } = mapa;

  const W = caja.clientWidth || 900;
  const H = caja.clientHeight || 500;
  const mDer = 68, mAba = 22;
  const x1 = W - mDer, y1 = H - mAba;

  caja.innerHTML = `<canvas class="lq-cv" width="${Math.round(W * 2)}" height="${Math.round(H * 2)}" style="width:${W}px;height:${H}px"></canvas>
    <div class="lq-info" id="lq-info"></div>`;
  const cv = caja.querySelector('.lq-cv');
  const g = cv.getContext('2d');
  g.scale(2, 2);

  g.fillStyle = '#07090c';
  g.fillRect(0, 0, W, H);

  const Y = (p) => y1 - y1 * ((p - yMin) / Math.max(1e-12, yMax - yMin));
  const anchoCol = x1 / rej.length;
  const altoFila = y1 / FILAS;

  /* ── El mapa de calor ── */
  for (let c = 0; c < rej.length; c++) {
    const col = rej[c];
    for (let f = 0; f < FILAS; f++) {
      const v = col[f];
      if (v <= 0) continue;
      const rgb = calor(v / max);
      if (!rgb) continue;
      g.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      const y = y1 - (f + 1) * altoFila;
      g.fillRect(c * anchoCol, y, anchoCol + 0.6, altoFila + 0.6);
    }
  }

  /* ── Las velas, finas y por encima ── */
  const paso = x1 / vis.length;
  const cuerpo = Math.max(1, paso * 0.55);
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const sube = v.c >= v.o;
    g.strokeStyle = sube ? 'rgba(200,255,215,.85)' : 'rgba(255,190,190,.85)';
    g.fillStyle = g.strokeStyle;
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1, yB - yA));
  });

  /* ── La línea del precio, de borde a borde ── */
  const ult = vis[vis.length - 1];
  const yU = Y(ult.c);
  g.strokeStyle = '#E8B84B';
  g.setLineDash([5, 4]);
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, yU); g.lineTo(x1, yU); g.stroke();
  g.setLineDash([]);

  /* ── La escala de precios, a la derecha del todo ── */
  g.fillStyle = 'rgba(7,9,12,.92)';
  g.fillRect(x1, 0, mDer, H);
  g.font = '10px monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 7; i++) {
    const p = yMin + (yMax - yMin) * (i / 7);
    const y = Y(p);
    g.strokeStyle = 'rgba(255,255,255,.06)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = '#6b7681';
    g.fillText(fmt(p), x1 + 6, y + 3.5);
  }

  // El precio de ahora, destacado
  g.fillStyle = '#E8B84B';
  const etiqueta = fmt(ult.c);
  g.fillRect(x1 + 2, yU - 9, mDer - 5, 18);
  g.fillStyle = '#3a2800';
  g.font = 'bold 11px monospace';
  g.fillText(etiqueta, x1 + 6, yU + 4);

  const info = $('lq-info');
  if (info) info.textContent = `${_par} · ${_tf} · ${vis.length} velas`;
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
    padding:8px 84px 8px 10px;background:#0b0e12;border-bottom:1px solid #1c2128;
    overflow-x:auto;scrollbar-width:none}
  #lq-overlay .lq-barra::-webkit-scrollbar{display:none}
  #lq-overlay .lq-grupo{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #lq-overlay .lq-b{min-height:32px;padding:0 12px;border-radius:7px;border:none;background:transparent;color:#7d8794;
    font-family:var(--mono,monospace);font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  #lq-overlay .lq-b.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #lq-overlay .lq-b:not(.on):hover{background:rgba(255,255,255,.05);color:#b7bdc6}
  #lq-overlay .lq-der{position:absolute;right:8px;top:50%;transform:translateY(-50%);
    display:flex;gap:6px;z-index:6;background:#0b0e12;padding-left:6px}
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
    #lq-overlay .lq-barra{padding-right:82px}
    #lq-overlay .lq-escala{padding:6px 10px;gap:7px}
    #lq-overlay .lq-escala span{font-size:8px}
    #lq-ayuda-box .lqa-c{padding:20px 15px}
  }`;
  document.head.appendChild(s);
}
