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
   EL CÁLCULO — traducido del Pine Script

   Un bloque BAJISTA nace cuando: la vela de referencia es alcista y
   TODAS las siguientes (hasta 'afinación') son bajistas.
   Un bloque ALCISTA es el caso contrario.

   Después, el volumen de ese tramo se reparte en 'rejillas' franjas
   horizontales, y cada franja se pinta según cuánto volumen le tocó.
   ══════════════════════════════════════════════════════════════ */
function detectarBloques(velas, afin, nRejillas) {
  const bloques = [];

  for (let k = afin; k < velas.length; k++) {
    // Se mira la ventana que termina en k
    let bear = true, bull = true;
    for (let i = 0; i < afin; i++) {
      const v = velas[k - afin + 1 + i];
      if (!v) { bear = bull = false; break; }
      const alcista = v.c > v.o;
      if (i === 0) {
        // La vela de referencia: alcista para bajista, bajista para alcista
        if (!alcista) bear = false;
        if (alcista) bull = false;
      } else {
        // Las siguientes deben ir todas en la misma dirección
        if (alcista) bear = false;
        if (!alcista) bull = false;
      }
    }
    if (!bear && !bull) continue;

    const ref = velas[k - afin + 1];
    if (!ref) continue;

    const top = ref.h, bot = ref.l;
    if (!(top > bot)) continue;

    // Reparto del volumen del tramo entre las franjas del bloque
    const franjas = new Array(nRejillas).fill(0);
    const alto = (top - bot) / nRejillas;
    for (let j = k - afin + 1; j <= k; j++) {
      const v = velas[j]; if (!v) continue;
      // El volumen de la vela se reparte entre las franjas que toca
      const desde = Math.max(0, Math.floor((Math.min(v.l, v.h) - bot) / alto));
      const hasta = Math.min(nRejillas - 1, Math.floor((v.h - bot) / alto));
      const n = Math.max(1, hasta - desde + 1);
      for (let f = desde; f <= hasta; f++) {
        if (f >= 0 && f < nRejillas) franjas[f] += v.v / n;
      }
    }

    const total = franjas.reduce((a, b) => a + b, 0);
    if (total <= 0) continue;

    bloques.push({
      top, bot,
      t0: ref.t,
      dir: bull ? 'bull' : 'bear',
      franjas,
      max: Math.max(...franjas),
      vivo: true
    });
  }

  return bloques;
}

/** ¿Sigue vivo el bloque, o el precio ya lo atravesó? */
function mitigar(bloques, velas) {
  bloques.forEach((b) => {
    for (const v of velas) {
      if (v.t <= b.t0) continue;
      // Se considera mitigado cuando el cierre atraviesa el bloque entero
      if (b.dir === 'bull' && v.c < b.bot) { b.vivo = false; b.tFin = v.t; break; }
      if (b.dir === 'bear' && v.c > b.top) { b.vivo = false; b.tFin = v.t; break; }
    }
  });
  return bloques.filter((b) => b.vivo);
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
      <div class="lq-top">
        <div class="lq-eyebrow">Liquidity Pools <b>2.0</b></div>
        <button class="lq-x" aria-label="Cerrar">✕</button>
      </div>
      <p class="lq-s">Dónde se acumuló el volumen · verde poco · amarillo medio · rojo mucho</p>

      <div class="lq-barra">
        <div class="lq-grupo" id="lq-pares">
          ${PARES.map((p) => `<button class="lq-b ${p.id === _par ? 'on' : ''}" data-par="${p.id}">${p.id}</button>`).join('')}
        </div>
        <div class="lq-grupo" id="lq-tfs">
          ${TFS.map((t) => `<button class="lq-b ${t.id === _tf ? 'on' : ''}" data-tf="${t.id}">${t.n}</button>`).join('')}
        </div>
      </div>

      <div class="lq-caja" id="lq-caja">
        <div class="lq-cargando">Calculando zonas de liquidez…</div>
      </div>

      <div class="lq-pie">
        <div class="lq-leyenda">
          <span><i style="background:${rgba(COL.alto)}"></i>Volumen alto</span>
          <span><i style="background:${rgba(COL.medio)}"></i>Medio</span>
          <span><i style="background:${rgba(COL.bajo)}"></i>Bajo</span>
        </div>
        <div class="lq-ajustes">
          <label>Afinación <input type="text" inputmode="numeric" id="lq-afin" value="${_afinacion}"></label>
          <label>Rejillas <input type="text" inputmode="numeric" id="lq-rej" value="${_rejillas}"></label>
          <button class="lq-aplicar" id="lq-aplicar">Aplicar</button>
        </div>
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
  $('lq-aplicar').onclick = () => {
    const a = Math.max(2, Math.min(20, Number($('lq-afin').value) || 5));
    const r = Math.max(3, Math.min(40, Number($('lq-rej').value) || 15));
    _afinacion = a; _rejillas = r;
    $('lq-afin').value = a; $('lq-rej').value = r;
    pintar();
  };

  pintar();
}

async function pintar() {
  const caja = $('lq-caja'); if (!caja) return;
  caja.innerHTML = `<div class="lq-cargando">Calculando zonas de liquidez…</div>`;
  try {
    const par = PARES.find((p) => p.id === _par) || PARES[0];
    const velas = await traerVelas(par.s, _tf);
    if (!velas.length) throw new Error('vacío');

    let bloques = detectarBloques(velas, _afinacion, _rejillas);
    bloques = mitigar(bloques, velas);
    // Solo los más recientes: la gráfica se satura enseguida
    bloques = bloques.slice(-8);

    caja.innerHTML = dibujar(velas, bloques);
  } catch (_) {
    caja.innerHTML = `<div class="lq-vacio">No se pudieron cargar los datos.<br>Revisa tu conexión y vuelve a intentarlo.</div>`;
  }
}

/* ══════════════════════════════════════════════════════════════
   DIBUJO — velas y bloques con sus rejillas de volumen
   ══════════════════════════════════════════════════════════════ */
function dibujar(velas, bloques) {
  const W = 1000, H = 560;
  const mIzq = 8, mDer = 74, mArr = 14, mAba = 26;
  const x0 = mIzq, x1 = W - mDer, y0 = mArr, y1 = H - mAba;

  const vis = velas.slice(-130);
  const precios = vis.flatMap((v) => [v.h, v.l]);
  bloques.forEach((b) => { precios.push(b.top, b.bot); });
  let pMin = Math.min(...precios), pMax = Math.max(...precios);
  const pad = (pMax - pMin) * 0.06 || 1;
  pMin -= pad; pMax += pad;

  const tMin = vis[0].t, tMax = vis[vis.length - 1].t;
  const X = (t) => x0 + (x1 - x0) * ((t - tMin) / Math.max(1, tMax - tMin));
  const Y = (p) => y1 - (y1 - y0) * ((p - pMin) / Math.max(1e-12, pMax - pMin));

  /* Las zonas se dibujan PRIMERO para que las velas queden encima.
     Al revés tapaban el precio, que es lo que hay que ver. */
  const partes = [];

  // ── Los bloques, con sus rejillas de volumen ──
  bloques.forEach((b) => {
    const bx = X(b.t0);
    const ancho = x1 - bx;
    if (ancho <= 2) return;
    const alto = (Y(b.bot) - Y(b.top)) / b.franjas.length;

    b.franjas.forEach((vol, i) => {
      const rel = b.max > 0 ? vol / b.max : 0;
      /* Tres tramos, como el original. Los cortes en 0,80 y 0,45 en vez
         de 0,66 y 0,33: así el rojo marca de verdad los máximos y no
         inunda el gráfico. Lo importante es distinguir DÓNDE está la
         concentración, no que todo se vea rojo. */
      const c = rel > 0.80 ? COL.alto : rel > 0.45 ? COL.medio : COL.bajo;
      const y = Y(b.top) + alto * i;
      // El ancho de cada franja marca cuánto volumen tuvo
      const w = Math.max(2, ancho * (0.25 + rel * 0.75));
      partes.push(`<rect x="${bx.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(1, alto - 0.5).toFixed(1)}" fill="${rgba(c)}"/>`);
    });

    // El marco del bloque
    const cb = b.dir === 'bear' ? COL.bear.hex : COL.alto.hex;
    partes.push(`<rect x="${bx.toFixed(1)}" y="${Y(b.top).toFixed(1)}" width="${ancho.toFixed(1)}" height="${(Y(b.bot) - Y(b.top)).toFixed(1)}" fill="none" stroke="${cb}" stroke-width="2" opacity=".85"/>`);
  });

  // ── Las velas ──
  const paso = (x1 - x0) / vis.length;
  const cuerpo = Math.max(1.4, paso * 0.62);
  vis.forEach((v) => {
    const x = X(v.t);
    const sube = v.c >= v.o;
    const col = sube ? '#4DFF7A' : '#f6465d';
    partes.push(`<line x1="${x.toFixed(1)}" y1="${Y(v.h).toFixed(1)}" x2="${x.toFixed(1)}" y2="${Y(v.l).toFixed(1)}" stroke="${col}" stroke-width="1" opacity=".75"/>`);
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    partes.push(`<rect x="${(x - cuerpo / 2).toFixed(1)}" y="${yA.toFixed(1)}" width="${cuerpo.toFixed(1)}" height="${Math.max(1, yB - yA).toFixed(1)}" fill="${col}" opacity=".9"/>`);
  });

  // ── El precio de ahora ──
  const ult = vis[vis.length - 1];
  const yU = Y(ult.c);
  partes.push(`<line x1="${x0}" y1="${yU.toFixed(1)}" x2="${x1}" y2="${yU.toFixed(1)}" stroke="#E8B84B" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/>`);
  partes.push(`<rect x="${x1 + 2}" y="${(yU - 10).toFixed(1)}" width="${mDer - 6}" height="20" rx="4" fill="#E8B84B"/>`);
  partes.push(`<text x="${x1 + 6}" y="${(yU + 4).toFixed(1)}" font-family="monospace" font-size="11" font-weight="700" fill="#3a2800">${fmt(ult.c)}</text>`);

  // ── La escala de precios ──
  for (let i = 0; i <= 4; i++) {
    const p = pMin + (pMax - pMin) * (i / 4);
    const y = Y(p);
    partes.push(`<line x1="${x0}" y1="${y.toFixed(1)}" x2="${x1}" y2="${y.toFixed(1)}" stroke="#2b3139" stroke-width=".5" opacity=".5"/>`);
    partes.push(`<text x="${x1 + 6}" y="${(y + 3.5).toFixed(1)}" font-family="monospace" font-size="10" fill="#6b7681">${fmt(p)}</text>`);
  }

  const n = bloques.length;
  return `<svg viewBox="0 0 ${W} ${H}" class="lq-svg" preserveAspectRatio="xMidYMid meet">${partes.join('')}</svg>
    <div class="lq-info">${n} zona${n === 1 ? '' : 's'} de liquidez activa${n === 1 ? '' : 's'} · ${esc(_par)} · ${esc(_tf)}</div>`;
}

const fmt = (p) => {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
};

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('lq-css')) return;
  const s = document.createElement('style'); s.id = 'lq-css';
  s.textContent = `
  #lq-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center;padding:0}
  #lq-overlay .lq-bg{position:absolute;inset:0;background:rgba(3,5,8,.94);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #lq-overlay .lq-c{position:relative;width:100%;height:100vh;height:100dvh;display:flex;flex-direction:column;
    background:linear-gradient(180deg,#141922,#0b0e12);padding:14px 14px 10px}
  #lq-overlay .lq-top{position:relative;display:flex;align-items:center;justify-content:center;min-height:38px;margin-bottom:8px}
  #lq-overlay .lq-eyebrow{font-family:var(--mono,monospace);font-size:11px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px}
  #lq-overlay .lq-eyebrow b{color:#eaecef}
  #lq-overlay .lq-x{position:absolute;top:0;right:0;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;
    padding:0;cursor:pointer;font-size:15px;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;z-index:5}
  #lq-overlay .lq-x:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #lq-overlay .lq-s{font-family:var(--mono,monospace);font-size:11.5px;color:var(--gold-soft,#C9A84B);
    text-align:center;margin:0 0 12px;line-height:1.5}
  #lq-overlay .lq-barra{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-bottom:10px}
  #lq-overlay .lq-grupo{display:flex;gap:4px;padding:4px;background:#0b0e12;border:1px solid #2b3139;border-radius:11px}
  #lq-overlay .lq-b{min-height:36px;padding:0 13px;border-radius:8px;border:none;background:transparent;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  #lq-overlay .lq-b.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #lq-overlay .lq-b:not(.on):hover{background:rgba(255,255,255,.05);color:#b7bdc6}
  #lq-overlay .lq-caja{flex:1;min-height:0;border-radius:14px;overflow:hidden;background:#0b0e12;
    border:1px solid #2b3139;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative}
  #lq-overlay .lq-svg{width:100%;height:100%;display:block}
  #lq-overlay .lq-info{position:absolute;left:10px;top:8px;font-family:var(--mono,monospace);font-size:10px;
    color:#6b7681;background:rgba(11,14,18,.8);padding:4px 9px;border-radius:20px}
  #lq-overlay .lq-cargando,#lq-overlay .lq-vacio{font-family:var(--mono,monospace);font-size:12px;
    color:#7d8794;text-align:center;padding:30px;line-height:1.7}
  #lq-overlay .lq-pie{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:9px}
  #lq-overlay .lq-leyenda{display:flex;gap:13px;flex-wrap:wrap}
  #lq-overlay .lq-leyenda span{display:inline-flex;align-items:center;gap:6px;
    font-family:var(--mono,monospace);font-size:10px;color:#7d8794}
  #lq-overlay .lq-leyenda i{width:11px;height:11px;border-radius:3px;flex:0 0 auto}
  #lq-overlay .lq-ajustes{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  #lq-overlay .lq-ajustes label{display:inline-flex;align-items:center;gap:6px;
    font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.5px}
  #lq-overlay .lq-ajustes input{width:52px;min-height:34px;padding:6px 8px;border-radius:8px;border:1px solid #2b3139;
    background:#0b0e12;color:#eaecef;font-family:var(--mono,monospace);font-size:12px;text-align:center}
  #lq-overlay .lq-ajustes input:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #lq-overlay .lq-aplicar{min-height:34px;padding:0 15px;border-radius:9px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:11.5px;cursor:pointer}

  @media(max-width:760px){
    #lq-overlay .lq-c{padding:10px 9px 8px}
    #lq-overlay .lq-s{font-size:10.5px;margin-bottom:9px}
    #lq-overlay .lq-barra{gap:6px;margin-bottom:8px}
    #lq-overlay .lq-grupo{padding:3px;gap:3px;overflow-x:auto;scrollbar-width:none;max-width:100%}
    #lq-overlay .lq-grupo::-webkit-scrollbar{display:none}
    #lq-overlay .lq-b{padding:0 11px;font-size:11px;min-height:34px;flex:0 0 auto}
    #lq-overlay .lq-pie{flex-direction:column;align-items:stretch;gap:8px}
    #lq-overlay .lq-leyenda{justify-content:center;gap:11px}
    #lq-overlay .lq-ajustes{justify-content:center}
  }`;
  document.head.appendChild(s);
}
