// footprint.js — Order Flow Footprint
//
// QUÉ ES
//
// Una vela normal te da cuatro precios: apertura, máximo, mínimo y
// cierre. El resultado, pero no la pelea.
//
// El footprint abre la vela y enseña lo que pasó DENTRO: cuánto se
// compró y cuánto se vendió en CADA nivel de precio, separando quién
// fue agresivo.
//
//   450 × 1.200  →  se vendieron 450 y se compraron 1.200
//                   los compradores dominaron 3 a 1 en ese precio
//
// POR QUÉ VALE DINERO
//
// ATAS cobra 85 al mes por esto. Bookmap hasta 79. NinjaTrader 99.
// Y TradingView no lo ofrece: hace falta una plataforma aparte con
// su propio feed de datos.
//
// Nosotros lo construimos con las operaciones reales de Binance, que
// son públicas y gratuitas.
//
// QUÉ DETECTA
//
//   · Imbalance   — un lado domina 3:1 en un nivel. Tres seguidos
//                   marcan una zona donde entró dinero grande.
//   · Absorción   — mucho volumen y el precio no se mueve: hay
//                   alguien defendiendo ese precio.
//   · Agotamiento — el volumen se seca en el extremo de la vela:
//                   al movimiento se le acabó el combustible.
//   · POC         — el precio donde más se negoció. El mercado
//                   tiende a volver ahí.

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
  { id: 'SUI',   s: 'SUIUSDT',   n: 'Sui',        cg: 'sui' },
  { id: 'PEPE',  s: 'PEPEUSDT',  n: 'Pepe',       cg: 'pepe' },
  { id: 'WIF',   s: 'WIFUSDT',   n: 'dogwifhat',  cg: 'dogwifcoin' }
];

const TFS = [
  { id: '1m',  n: '1m',  ms: 60000 },
  { id: '3m',  n: '3m',  ms: 180000 },
  { id: '5m',  n: '5m',  ms: 300000 },
  { id: '15m', n: '15m', ms: 900000 }
];

let _par = 'BTC';
let _tf = '5m';

const F = {
  velas: [],          // cada una con su footprint dentro
  precio: 0,
  desde: 0,           // desplazamiento de la vista
  ancho: 14,          // cuántas velas se ven
  sel: null,          // vela seleccionada
  filtro: 'todas',
  cargando: true,
  error: null
};

/* ══════════════════════════════════════════════════════════════
   LOS DATOS

   `aggTrades` da cada operación con precio, cantidad y una marca
   que dice si el comprador fue el pasivo. De ahí sale quién atacó:

     m = true  → el comprador esperaba, atacó el VENDEDOR
     m = false → el vendedor esperaba, atacó el COMPRADOR

   Esto es exactamente lo que necesita un footprint. No es una
   estimación: es el registro real de cada operación.
   ══════════════════════════════════════════════════════════════ */
const API = 'https://api.binance.com';

async function traerOperaciones(simbolo, desde, hasta) {
  const url = `${API}/api/v3/aggTrades?symbol=${simbolo}&startTime=${desde}&endTime=${hasta}&limit=1000`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('sin operaciones');
  return r.json();
}

async function traerVelas(simbolo, tf, n) {
  const r = await fetch(`${API}/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`);
  if (!r.ok) throw new Error('sin velas');
  const j = await r.json();
  return j.map((x) => ({
    t: x[0],
    o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]),
    vol: Number(x[5]),
    cierra: x[6]
  }));
}

/* ══════════════════════════════════════════════════════════════
   CONSTRUIR EL FOOTPRINT

   Se agrupan las operaciones por nivel de precio y se separan según
   quién atacó. El resultado por nivel:

     { p: precio, compra: X, venta: Y }
   ══════════════════════════════════════════════════════════════ */
function construir(vela, ops, paso) {
  const niveles = new Map();

  ops.forEach((o) => {
    const p = Number(o.p);
    const q = Number(o.q);
    const k = Math.round(p / paso);          // clave entera, estable
    let n = niveles.get(k);
    if (!n) { n = { k, p: k * paso, compra: 0, venta: 0 }; niveles.set(k, n); }
    // o.m = true → el comprador era el pasivo → atacó el vendedor
    if (o.m) n.venta += q; else n.compra += q;
  });

  const lista = [...niveles.values()].sort((a, b) => b.p - a.p);
  if (!lista.length) return null;

  let totalC = 0, totalV = 0, maxVol = 0, poc = null;
  lista.forEach((n) => {
    n.total = n.compra + n.venta;
    totalC += n.compra; totalV += n.venta;
    if (n.total > maxVol) { maxVol = n.total; poc = n; }
  });

  return {
    niveles: lista,
    totalC, totalV,
    delta: totalC - totalV,
    maxVol,
    poc: poc ? poc.p : null,
    ops: ops.length
  };
}

/* ══════════════════════════════════════════════════════════════
   DETECTAR LO QUE IMPORTA

   Aquí está la diferencia entre enseñar números y decir dónde
   entrar. Cuatro patrones, cada uno con su lectura.
   ══════════════════════════════════════════════════════════════ */
function analizar(vela) {
  const f = vela.fp;
  if (!f || !f.niveles.length) return;

  const marcas = [];
  const RATIO = 3;              // 3:1 es el estándar del sector

  /* ── 1. IMBALANCE ──
     Un lado domina 3 a 1 en un nivel. Suelto no dice mucho; tres
     seguidos en la misma dirección marcan dinero institucional. */
  let rachaC = 0, rachaV = 0, inicioC = null, inicioV = null;

  f.niveles.forEach((n, i) => {
    n.imbC = n.venta > 0 ? n.compra / n.venta >= RATIO : n.compra > 0;
    n.imbV = n.compra > 0 ? n.venta / n.compra >= RATIO : n.venta > 0;
    // Solo cuentan si hay volumen apreciable, si no es ruido
    const relevante = n.total >= f.maxVol * 0.12;
    n.imbC = n.imbC && relevante;
    n.imbV = n.imbV && relevante;

    if (n.imbC) { if (rachaC === 0) inicioC = n; rachaC++; } else {
      if (rachaC >= 3) marcas.push(zona('compra', inicioC, f.niveles[i - 1], rachaC));
      rachaC = 0;
    }
    if (n.imbV) { if (rachaV === 0) inicioV = n; rachaV++; } else {
      if (rachaV >= 3) marcas.push(zona('venta', inicioV, f.niveles[i - 1], rachaV));
      rachaV = 0;
    }
  });
  if (rachaC >= 3) marcas.push(zona('compra', inicioC, f.niveles[f.niveles.length - 1], rachaC));
  if (rachaV >= 3) marcas.push(zona('venta', inicioV, f.niveles[f.niveles.length - 1], rachaV));

  /* ── 2. ABSORCIÓN ──
     Mucho volumen en la vela pero el precio apenas se movió. Alguien
     se está comiendo todo lo que le echan sin dejar que avance. */
  const rango = (vela.h - vela.l) / vela.c;
  const cuerpo = Math.abs(vela.c - vela.o) / vela.c;
  if (f.ops > 40 && rango > 0 && cuerpo < rango * 0.28) {
    marcas.push({
      tipo: 'absorcion',
      lado: f.delta > 0 ? 'venta' : 'compra',   // quien absorbe es el contrario
      p: vela.c,
      titulo: 'Absorción',
      txt: f.delta > 0
        ? 'Compraron con fuerza y el precio no subió: hay alguien vendiendo contra ellos.'
        : 'Vendieron con fuerza y el precio no bajó: hay alguien comprando todo lo que sueltan.'
    });
  }

  /* ── 3. AGOTAMIENTO ──
     En el extremo de la vela el volumen se seca. Al que empujaba se
     le acabó la gasolina justo donde más lejos llegó. */
  const arriba = f.niveles[0];
  const abajo = f.niveles[f.niveles.length - 1];
  if (f.niveles.length > 4) {
    const medio = f.maxVol;
    if (vela.c > vela.o && arriba.total < medio * 0.16) {
      marcas.push({
        tipo: 'agotamiento', lado: 'venta', p: arriba.p,
        titulo: 'Agotamiento comprador',
        txt: 'La subida llegó hasta aquí con muy poco volumen. A los compradores se les acabó la fuerza.'
      });
    }
    if (vela.c < vela.o && abajo.total < medio * 0.16) {
      marcas.push({
        tipo: 'agotamiento', lado: 'compra', p: abajo.p,
        titulo: 'Agotamiento vendedor',
        txt: 'La caída llegó hasta aquí con muy poco volumen. A los vendedores se les acabó la fuerza.'
      });
    }
  }

  vela.marcas = marcas;
}

function zona(lado, desde, hasta, n) {
  return {
    tipo: 'imbalance',
    lado,
    p: (desde.p + hasta.p) / 2,
    pMax: Math.max(desde.p, hasta.p),
    pMin: Math.min(desde.p, hasta.p),
    niveles: n,
    titulo: lado === 'compra' ? `Zona de compra agresiva` : `Zona de venta agresiva`,
    txt: lado === 'compra'
      ? `${n} niveles seguidos con los compradores dominando 3 a 1. Si el precio vuelve aquí, es zona de apoyo.`
      : `${n} niveles seguidos con los vendedores dominando 3 a 1. Si el precio vuelve aquí, es zona de rechazo.`
  };
}

/* ══════════════════════════════════════════════════════════════
   CARGAR TODO
   ══════════════════════════════════════════════════════════════ */
async function cargar(simbolo, tf, cuantas) {
  const info = TFS.find((x) => x.id === tf) || TFS[2];
  const velas = await traerVelas(simbolo, tf, cuantas);
  if (!velas.length) throw new Error('vacío');

  /* El paso entre niveles: se busca que salgan entre 8 y 22 filas
     por vela, que es lo legible. Si son muy pocas no dice nada, y
     si son muchas no se ve. */
  const rangos = velas.map((v) => v.h - v.l).filter((x) => x > 0).sort((a, b) => a - b);
  const rMed = rangos[Math.floor(rangos.length / 2)] || velas[0].c * 0.002;
  const paso = redondear(rMed / 12);

  /* Las operaciones se piden por vela. Solo de las visibles, que
     pedir 100 velas de tirón sería lentísimo. */
  for (const v of velas) {
    try {
      const ops = await traerOperaciones(simbolo, v.t, v.cierra);
      v.fp = construir(v, ops, paso);
      if (v.fp) analizar(v);
    } catch (_) {
      v.fp = null;
    }
  }

  F.paso = paso;
  F.velas = velas;
  F.precio = velas[velas.length - 1].c;
}

/** Redondea el paso a una cifra "bonita": 1, 2, 5, 10, 20, 50… */
function redondear(x) {
  if (!(x > 0)) return 0.01;
  const exp = Math.floor(Math.log10(x));
  const base = Math.pow(10, exp);
  const m = x / base;
  const escogido = m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10;
  return escogido * base;
}

/* Utilidades de formato */
const num = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  if (a >= 100) return v.toFixed(0);
  if (a >= 1) return v.toFixed(1);
  return v.toFixed(2);
};

const fmt = (p) => {
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(1);
  if (p >= 1) return p.toFixed(3);
  if (p >= 0.01) return p.toFixed(5);
  return p.toFixed(8);
};

const hora = (t) => new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/* ══════════════════════════════════════════════════════════════
   ABRIR
   ══════════════════════════════════════════════════════════════ */
export async function abrirFootprint() {
  estilos();
  const prev = $('fp-overlay'); if (prev) prev.remove();

  F.velas = []; F.cargando = true; F.error = null; F.sel = null;
  F.desde = 0;
  F.ancho = window.innerWidth < 760 ? 6 : 14;

  const d = document.createElement('div');
  d.id = 'fp-overlay';
  d.innerHTML = `<div class="fp-bg"></div>
    <div class="fp-c">
      <header class="fp-cab">
        <button class="fp-sel" id="fp-sel">
          <i class="fp-logo" data-cg="${esc((PARES.find((p) => p.id === _par) || {}).cg || '')}"></i>
          <b>${esc(_par)}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <div class="fp-tfs">
          ${TFS.map((t) => `<button class="fp-tf ${t.id === _tf ? 'on' : ''}" data-ftf="${t.id}">${t.n}</button>`).join('')}
        </div>

        <div class="fp-px">
          <span>Precio</span><b id="fp-px-v">—</b>
        </div>

        <div class="fp-der">
          <button class="fp-ico" id="fp-foto" title="Compartir">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="fp-ico fp-comof" id="fp-ayuda">
            <span class="fp-cf-tx">Cómo funciona</span><span class="fp-cf-s">?</span>
          </button>
          <button class="fp-ico" id="fp-x" aria-label="Cerrar">✕</button>
        </div>
      </header>

      <div class="fp-graf" id="fp-graf">
        <canvas class="fp-cv" id="fp-cv"></canvas>
        <div class="fp-esperando" id="fp-esperando">
          <div class="fp-spin"></div>
          <b>Leyendo cada operación del mercado</b>
          <span>Reconstruyendo qué se compró y qué se vendió en cada nivel de precio.</span>
        </div>
        <img class="fp-marca" src="assets/img/cco-marca.webp" alt="">
      </div>

      <aside class="fp-panel">
        <div class="fp-filtros">
          <button class="fp-fb on" data-ffil="todas">Todas</button>
          <button class="fp-fb verde" data-ffil="compra">Compra</button>
          <button class="fp-fb rojo" data-ffil="venta">Venta</button>
        </div>
        <div class="fp-lista" id="fp-lista"></div>
      </aside>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_reloj);
    document.querySelectorAll('#fp-picker').forEach((x) => x.remove());
    const e = $('fp-overlay'); if (e) e.remove();
  };
  d.querySelector('.fp-bg').onclick = cerrar;
  $('fp-x').onclick = cerrar;
  $('fp-ayuda').onclick = () => ayuda();
  $('fp-foto').onclick = () => guardarImagen();
  $('fp-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  d.querySelectorAll('[data-ftf]').forEach((b) => b.onclick = () => {
    _tf = b.dataset.ftf;
    d.querySelectorAll('[data-ftf]').forEach((x) => x.classList.toggle('on', x.dataset.ftf === _tf));
    recargar();
  });
  d.querySelectorAll('[data-ffil]').forEach((b) => b.onclick = () => {
    F.filtro = F.filtro === b.dataset.ffil ? 'todas' : b.dataset.ffil;
    d.querySelectorAll('[data-ffil]').forEach((x) => x.classList.toggle('on', x.dataset.ffil === F.filtro));
    pintarPanel();
    dibujar();
  });

  ponerLogos();
  recargar();

  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('fp-cv')) dibujar(); }, 250);
  });
}

let _reloj = null;

async function recargar() {
  clearInterval(_reloj);
  F.cargando = true; F.error = null;
  const esp = $('fp-esperando');
  if (esp) esp.style.display = '';

  const tick = async () => {
    if (!$('fp-cv')) { clearInterval(_reloj); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      // Se cargan unas pocas más de las visibles, para poder desplazarse
      await cargar(par.s, _tf, Math.min(40, F.ancho + 12));
      F.cargando = false; F.error = null;
      const px = $('fp-px-v');
      if (px) px.textContent = fmt(F.precio);
      dibujar();
      pintarPanel();
    } catch (_) {
      if (F.cargando) {
        F.error = 'No se pudieron cargar las operaciones.';
        F.cargando = false;
        dibujar();
        pintarPanel();
      }
    }
  };
  await tick();
  /* Cada 20 s: reconstruir el footprint es pesado y las velas de 1m
     tampoco cambian tan deprisa. */
  _reloj = setInterval(tick, 20000);
}

/* ══════════════════════════════════════════════════════════════
   EL DIBUJO

   Cada vela es una escalera de celdas. En cada celda, dos números:
   lo que se vendió a la izquierda y lo que se compró a la derecha.

   Los desequilibrios 3:1 se resaltan con fondo de color, que es lo
   que el ojo busca. Todo lo demás queda apagado para no estorbar.
   ══════════════════════════════════════════════════════════════ */
function dibujar() {
  const cv = $('fp-cv'); const zona = $('fp-graf');
  if (!cv || !zona) return;
  const W = zona.clientWidth, H = zona.clientHeight;
  if (W < 50 || H < 50) return;

  if (!cv.dataset.listo) { gestos(cv); cv.dataset.listo = '1'; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = '#0a0e14';
  g.fillRect(0, 0, W, H);

  const esp = $('fp-esperando');
  if (F.error) {
    if (esp) {
      esp.style.display = '';
      esp.innerHTML = `<b>${esc(F.error)}</b><span>Revisa tu conexión y vuelve a intentarlo.</span>
        <button class="fp-btn" id="fp-retry">Reintentar</button>`;
      const b = $('fp-retry'); if (b) b.onclick = () => recargar();
    }
    return;
  }
  if (F.cargando || !F.velas.length) { if (esp) esp.style.display = ''; return; }
  if (esp) esp.style.display = 'none';

  const mDer = 78, mAba = 26;
  const x1 = W - mDer, y1 = H - mAba;

  const total = F.velas.length;
  const ancho = Math.min(total, F.ancho);
  const desp = Math.min(F.desde, Math.max(0, total - ancho));
  const fin = total - desp;
  const vis = F.velas.slice(Math.max(0, fin - ancho), fin);
  if (!vis.length) return;

  /* Rango vertical: todas las velas visibles con su margen */
  /* El rango abarca las velas Y sus celdas: si el footprint cae
     fuera de la vista, el usuario no ve lo que importa. */
  let alto = -Infinity, bajo = Infinity;
  vis.forEach((v) => {
    if (v.h > alto) alto = v.h;
    if (v.l < bajo) bajo = v.l;
    if (v.fp && v.fp.niveles.length) {
      const pa = v.fp.niveles[0].p;
      const pb = v.fp.niveles[v.fp.niveles.length - 1].p;
      if (pa > alto) alto = pa;
      if (pb < bajo) bajo = pb;
    }
  });
  const pad = (alto - bajo) * 0.05 || F.paso;
  const pMax = alto + pad, pMin = bajo - pad;
  const Y = (p) => y1 - y1 * ((p - pMin) / Math.max(1e-12, pMax - pMin));

  const anchoV = x1 / vis.length;
  const altoFila = Math.max(9, Math.abs(Y(pMin + F.paso) - Y(pMin)));
  const chico = altoFila < 13;

  /* ── Rejilla ── */
  g.strokeStyle = 'rgba(255,255,255,.03)';
  for (let i = 1; i < 5; i++) {
    const y = (y1 / 5) * i;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
  }

  /* ── LAS VELAS CON SU FOOTPRINT ── */
  vis.forEach((v, i) => {
    const x0 = i * anchoV;
    const cx = x0 + anchoV / 2;
    const sel = F.sel === v.t;

    // La mecha, de fondo
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx, Y(v.h)); g.lineTo(cx, Y(v.l)); g.stroke();

    if (!v.fp || !v.fp.niveles.length) return;

    const mitad = anchoV / 2;
    const margen = Math.max(2, anchoV * 0.04);

    v.fp.niveles.forEach((n) => {
      const y = Y(n.p);
      if (y < -altoFila || y > y1 + altoFila) return;
      const yTop = y - altoFila / 2 + 0.5;
      const hFila = altoFila - 1;

      const rel = n.total / Math.max(1e-9, v.fp.maxVol);

      /* Fondo de la celda: cuanto más volumen, más visible. Y si hay
         desequilibrio 3:1, se tiñe del color del lado ganador. */
      if (n.imbV) {
        g.fillStyle = `rgba(246,70,93,${0.18 + rel * 0.42})`;
        g.fillRect(x0 + margen, yTop, mitad - margen, hFila);
      } else {
        g.fillStyle = `rgba(246,70,93,${0.05 + rel * 0.1})`;
        g.fillRect(x0 + margen, yTop, mitad - margen, hFila);
      }
      if (n.imbC) {
        g.fillStyle = `rgba(46,232,106,${0.18 + rel * 0.42})`;
        g.fillRect(x0 + mitad, yTop, mitad - margen, hFila);
      } else {
        g.fillStyle = `rgba(46,232,106,${0.05 + rel * 0.1})`;
        g.fillRect(x0 + mitad, yTop, mitad - margen, hFila);
      }

      // El POC: el precio más negociado de la vela
      if (v.fp.poc === n.p) {
        g.strokeStyle = 'rgba(232,184,75,.85)';
        g.lineWidth = 1.4;
        g.strokeRect(x0 + margen, yTop, anchoV - margen * 2, hFila);
      }

      // Los números, si caben
      if (!chico && anchoV > 74) {
        g.font = `${Math.min(10, altoFila - 3)}px ui-monospace,monospace`;
        g.textAlign = 'right';
        g.fillStyle = n.imbV ? '#ffd0d5' : 'rgba(255,255,255,.42)';
        g.fillText(num(n.venta), x0 + mitad - 5, y + 3.2);
        g.textAlign = 'left';
        g.fillStyle = n.imbC ? '#c9ffdf' : 'rgba(255,255,255,.42)';
        g.fillText(num(n.compra), x0 + mitad + 5, y + 3.2);
      }
    });

    /* El borde de la vela, para separarlas */
    g.strokeStyle = sel ? 'rgba(232,184,75,.9)' : 'rgba(255,255,255,.09)';
    g.lineWidth = sel ? 2 : 1;
    g.strokeRect(x0 + margen, Y(v.h), anchoV - margen * 2, Y(v.l) - Y(v.h));

    /* El delta de la vela, abajo: quién ganó la pelea */
    const dPos = v.fp.delta >= 0;
    g.font = 'bold 10px ui-monospace,monospace';
    g.textAlign = 'center';
    g.fillStyle = dPos ? '#2ee86a' : '#f6465d';
    g.fillText((dPos ? '+' : '') + num(v.fp.delta), cx, y1 - 5);
    g.textAlign = 'left';
  });

  /* ── LAS ZONAS DETECTADAS ──
     Se marcan sobre el gráfico: son los niveles donde entrar. */
  vis.forEach((v, i) => {
    if (!v.marcas) return;
    const x0 = i * anchoV;
    v.marcas.forEach((m) => {
      if (F.filtro !== 'todas' && m.lado !== F.filtro) return;
      if (m.tipo !== 'imbalance') return;
      const yA = Y(m.pMax), yB = Y(m.pMin);
      const col = m.lado === 'compra' ? '#2ee86a' : '#f6465d';
      // La zona se extiende a la derecha: sigue vigente hasta que el precio vuelva
      g.fillStyle = col + '14';
      g.fillRect(x0, yA - altoFila / 2, x1 - x0, (yB - yA) + altoFila);
      g.strokeStyle = col + '66';
      g.setLineDash([4, 4]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, yA - altoFila / 2); g.lineTo(x1, yA - altoFila / 2); g.stroke();
      g.beginPath(); g.moveTo(x0, yB + altoFila / 2); g.lineTo(x1, yB + altoFila / 2); g.stroke();
      g.setLineDash([]);
    });
  });

  /* ── El precio actual ── */
  const yP = Y(F.precio);
  g.strokeStyle = 'rgba(232,184,75,.9)';
  g.setLineDash([6, 4]); g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(0, yP); g.lineTo(x1, yP); g.stroke();
  g.setLineDash([]);

  /* ── La escala ── */
  g.fillStyle = 'rgba(10,14,20,.95)';
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = 'rgba(255,255,255,.06)';
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();

  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 6; i++) {
    const p = pMin + (pMax - pMin) * (i / 6);
    const y = Y(p);
    if (Math.abs(y - yP) < 14) continue;
    g.fillStyle = '#4a525c';
    g.fillText(fmt(p), x1 + 7, y + 3.5);
  }
  g.fillStyle = '#E8B84B';
  redondeado(g, x1 + 2, yP - 10, mDer - 5, 20, 4); g.fill();
  g.fillStyle = '#2a1c00';
  g.font = 'bold 11px ui-monospace,monospace';
  g.fillText(fmt(F.precio), x1 + 7, yP + 4);

  /* ── Las horas ── */
  g.fillStyle = 'rgba(10,14,20,.95)';
  g.fillRect(0, y1, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = '#4a525c';
  g.textAlign = 'center';
  vis.forEach((v, i) => {
    const x = i * anchoV + anchoV / 2;
    if (anchoV < 46 && i % 2) return;
    g.fillText(hora(v.t), x, y1 + 16);
  });
  g.textAlign = 'left';
}

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
   EL PANEL — dónde entrar, en lenguaje claro
   ══════════════════════════════════════════════════════════════ */
function pintarPanel() {
  const lista = $('fp-lista'); if (!lista) return;

  if (F.cargando) { lista.innerHTML = `<div class="fp-esperar">Analizando el flujo…</div>`; return; }

  /* Se recogen las señales de las velas visibles, la más reciente
     arriba: es la que importa ahora. */
  const total = F.velas.length;
  const ancho = Math.min(total, F.ancho);
  const desp = Math.min(F.desde, Math.max(0, total - ancho));
  const fin = total - desp;
  const vis = F.velas.slice(Math.max(0, fin - ancho), fin);

  let todas = [];
  vis.forEach((v) => {
    (v.marcas || []).forEach((m) => todas.push({ ...m, t: v.t, precioVela: v.c }));
  });
  todas.reverse();
  if (F.filtro !== 'todas') todas = todas.filter((m) => m.lado === F.filtro);

  if (!todas.length) {
    lista.innerHTML = `<div class="fp-esperar">
      <b>Sin señales claras</b>
      Ninguna vela visible muestra desequilibrios ni absorción. Amplía la vista o cambia de temporalidad.
    </div>`;
    return;
  }

  const icono = { imbalance: '▐', absorcion: '◉', agotamiento: '◌' };

  lista.innerHTML = todas.slice(0, 14).map((m) => {
    const verde = m.lado === 'compra';
    const dist = F.precio > 0 ? ((m.p - F.precio) / F.precio) * 100 : 0;
    const arriba = m.p > F.precio;

    /* La línea que convierte la señal en una decisión */
    let hacer;
    if (m.tipo === 'imbalance') {
      hacer = verde
        ? `Zona de apoyo en ${fmt(m.pMin)}–${fmt(m.pMax)}. Si el precio vuelve ahí y aguanta, es punto de entrada al alza.`
        : `Zona de rechazo en ${fmt(m.pMin)}–${fmt(m.pMax)}. Si el precio vuelve ahí y se frena, es punto de entrada a la baja.`;
    } else if (m.tipo === 'absorcion') {
      hacer = verde
        ? 'Alguien está comprando todo lo que sueltan. Vigile un giro al alza desde aquí.'
        : 'Alguien está vendiendo contra la subida. Vigile un giro a la baja desde aquí.';
    } else {
      hacer = verde
        ? 'A los vendedores se les acabó la fuerza. El suelo puede estar cerca.'
        : 'A los compradores se les acabó la fuerza. El techo puede estar cerca.';
    }

    return `
    <button class="fp-card ${verde ? 'verde' : 'rojo'} t-${m.tipo}" data-fvt="${m.t}">
      <div class="fp-l1">
        <span class="fp-ic">${icono[m.tipo] || '▐'}</span>
        <b>${esc(m.titulo)}</b>
        <span class="fp-h">${hora(m.t)}</span>
      </div>
      <div class="fp-l2">
        <span class="fp-nivel">${m.tipo === 'imbalance' ? fmt(m.pMin) + ' – ' + fmt(m.pMax) : fmt(m.p)}</span>
        <span class="fp-dist">${Math.abs(dist).toFixed(2)}% ${arriba ? '↑' : '↓'}</span>
      </div>
      <div class="fp-txt">${esc(m.txt)}</div>
      <div class="fp-hacer">${esc(hacer)}</div>
    </button>`;
  }).join('');

  lista.querySelectorAll('[data-fvt]').forEach((b) => b.onclick = () => {
    const t = Number(b.dataset.fvt);
    F.sel = F.sel === t ? null : t;
    dibujar();
  });
}

/* ══════════════════════════════════════════════════════════════
   GESTOS
   ══════════════════════════════════════════════════════════════ */
function gestos(cv) {
  const zoom = (f) => {
    F.ancho = Math.max(3, Math.min(30, Math.round(F.ancho * f)));
    dibujar(); pintarPanel();
  };
  cv.addEventListener('wheel', (e) => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.25 : 0.8); }, { passive: false });
  cv.addEventListener('dblclick', () => {
    F.ancho = window.innerWidth < 760 ? 6 : 14; F.desde = 0;
    dibujar(); pintarPanel();
  });

  let ax = 0, arr = false;
  const mover = (x) => {
    const paso = (cv.clientWidth - 78) / F.ancho;
    const d = Math.round((x - ax) / Math.max(1, paso));
    if (d !== 0) {
      F.desde = Math.max(0, Math.min(Math.max(0, F.velas.length - 3), F.desde + d));
      ax = x; dibujar(); pintarPanel();
    }
  };
  cv.addEventListener('mousedown', (e) => { arr = true; ax = e.clientX; cv.style.cursor = 'grabbing'; });
  window.addEventListener('mousemove', (e) => { if (arr) mover(e.clientX); });
  window.addEventListener('mouseup', () => { arr = false; cv.style.cursor = 'grab'; });

  let d0 = 0, tx = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { tx = e.touches[0].clientX; arr = true; }
    else if (e.touches.length === 2) {
      arr = false;
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && arr) { e.preventDefault(); ax = tx; mover(e.touches[0].clientX); tx = e.touches[0].clientX; }
    else if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(d - d0) > 10) { zoom(d0 / d); d0 = d; }
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { arr = false; d0 = 0; });
  cv.style.cursor = 'grab';
}

/* ══════════════════════════════════════════════════════════════
   SELECTOR DE MONEDA
   ══════════════════════════════════════════════════════════════ */
function menuPares() {
  const prev = document.getElementById('fp-picker');
  if (prev) { prev.remove(); return; }
  const anc = $('fp-sel');
  const m = document.createElement('div');
  m.id = 'fp-picker';
  m.innerHTML = `<input class="fp-buscar" id="fp-buscar" placeholder="Buscar…" autocomplete="off">
    <div class="fp-lista-mon">
      ${PARES.map((p) => `
        <button class="fp-op ${p.id === _par ? 'on' : ''}" data-fp="${p.id}"
                data-busca="${esc((p.id + ' ' + p.n).toLowerCase())}">
          <i class="fp-logo" data-cg="${esc(p.cg)}"></i>
          <b>${esc(p.id)}</b><span>${esc(p.n)}</span>
        </button>`).join('')}
    </div>`;
  document.body.appendChild(m);
  const r = anc.getBoundingClientRect();
  const w = m.offsetWidth || 232;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';
  setTimeout(ponerLogos, 30);

  m.addEventListener('click', (e) => e.stopPropagation());
  $('fp-buscar').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    m.querySelectorAll('[data-fp]').forEach((x) => {
      x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
    });
  };
  setTimeout(() => { try { $('fp-buscar').focus(); } catch (_) {} }, 60);

  m.querySelectorAll('[data-fp]').forEach((b) => b.onclick = () => {
    _par = b.dataset.fp;
    const bb = anc.querySelector('b'); if (bb) bb.textContent = _par;
    const lg = anc.querySelector('.fp-logo');
    if (lg) { lg.dataset.cg = (PARES.find((x) => x.id === _par) || {}).cg || ''; lg.classList.remove('con'); lg.style.backgroundImage = ''; }
    m.remove();
    F.desde = 0; F.sel = null;
    ponerLogos();
    recargar();
  });
  setTimeout(() => document.addEventListener('click', () => {
    const x = document.getElementById('fp-picker'); if (x) x.remove();
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
  document.querySelectorAll('.fp-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA
   ══════════════════════════════════════════════════════════════ */
const PASOS_FP = [
  {
    t: 'La vela te miente por omisión',
    d: 'Una vela normal te da cuatro precios: apertura, máximo, mínimo y cierre. Te dice <b>el resultado</b>, pero no la pelea que hubo dentro.',
    x: 'El footprint abre la vela y le enseña qué pasó en cada nivel de precio.'
  },
  {
    t: 'Qué significan los dos números',
    d: 'En cada celda hay dos cifras. La de la <b>izquierda en rojo</b> es lo que se vendió con agresividad. La de la <b>derecha en verde</b>, lo que se compró.',
    x: 'Si ve 450 × 1.200, significa que en ese precio los compradores dominaron casi 3 a 1.'
  },
  {
    t: 'Imbalance: dónde entró el dinero',
    d: 'Cuando un lado supera al otro <b>3 a 1</b> en un nivel, eso es un desequilibrio. La celda se enciende con color.',
    x: 'Tres seguidos en la misma dirección marcan una zona donde entró dinero grande. Esa zona es su nivel de entrada.'
  },
  {
    t: 'Cómo se opera un imbalance',
    d: 'La zona queda marcada en el gráfico y <b>se extiende hacia la derecha</b>: sigue siendo válida mientras el precio no vuelva a ella.',
    x: 'Cuando el precio regresa a una zona verde y aguanta, es entrada al alza. A una roja y se frena, entrada a la baja.'
  },
  {
    t: 'Absorción: alguien está defendiendo',
    d: 'Mucho volumen dentro de la vela y el precio <b>apenas se movió</b>. Alguien se está comiendo todo lo que le echan.',
    x: 'Suele marcar el final de un movimiento: cuando los agresivos se cansan, el precio se va hacia el que absorbió.'
  },
  {
    t: 'Agotamiento: se acabó la gasolina',
    d: 'En el extremo de la vela, el volumen <b>se seca</b>. El movimiento llegó hasta ahí con las últimas fuerzas.',
    x: 'Es la señal de que el impulso está terminando. No es una entrada por sí sola, pero avisa de que el giro está cerca.'
  },
  {
    t: 'El POC y el delta',
    d: 'El recuadro dorado marca el <b>precio donde más se negoció</b> en esa vela: el mercado suele volver ahí. Abajo, el <b>delta</b> dice quién ganó la pelea.',
    x: 'Delta verde con vela roja, o al revés, es una divergencia: el precio va en contra de quien de verdad empujaba.'
  },
  {
    t: 'Lo que esto cuesta fuera',
    d: 'ATAS cobra 85 al mes por el footprint. Bookmap hasta 79. NinjaTrader 99. Y <b>TradingView no lo ofrece</b>: hace falta otra plataforma con su propio feed de datos.',
    x: 'Aquí entra en el paquete completo, con datos reales de cada operación de Binance.'
  },
  {
    t: 'Úselo con las otras dos',
    d: 'Liquidity Pools dice <b>hacia dónde</b> quiere ir el precio. Institutional Radar dice <b>qué lo frena</b>. El footprint dice <b>dónde entrar exactamente</b>.',
    x: 'Una zona de imbalance justo delante de un muro real del Radar es la confluencia más fuerte que va a encontrar.'
  }
];

let _pasoFp = 0;

function ayuda() {
  _pasoFp = 0;
  const d = document.createElement('div');
  d.id = 'fp-ayuda-box';
  d.innerHTML = `<div class="fp-bg"></div>
    <div class="fpa-c">
      <button class="fpa-x" id="fpa-x" aria-label="Cerrar">✕</button>
      <div class="fpa-eyebrow">Order Flow Footprint</div>
      <div id="fpa-cuerpo"></div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.fp-bg').onclick = q;
  $('fpa-x').onclick = q;
  pasoFp();
}

function pasoFp() {
  const c = $('fpa-cuerpo'); if (!c) return;
  const p = PASOS_FP[_pasoFp];
  const ultimo = _pasoFp === PASOS_FP.length - 1;
  c.innerHTML = `
    <div class="fpa-card">
      <div class="fpa-n">${_pasoFp + 1} <em>de ${PASOS_FP.length}</em></div>
      <div class="fpa-t">${p.t}</div>
      <div class="fpa-d">${p.d}</div>
      <div class="fpa-x2">${p.x}</div>
    </div>
    <div class="fpa-puntos">
      ${PASOS_FP.map((_, i) => `<i class="${i === _pasoFp ? 'on' : ''}" data-pfp="${i}"></i>`).join('')}
    </div>
    <div class="fpa-acts">
      ${_pasoFp > 0 ? '<button class="fpa-atras" id="fpa-atras">Atrás</button>' : ''}
      <button class="fpa-b" id="fpa-sig">${ultimo ? 'Entendido' : 'Saber más'}</button>
    </div>`;
  $('fpa-sig').onclick = () => {
    if (ultimo) { document.getElementById('fp-ayuda-box')?.remove(); return; }
    _pasoFp++; pasoFp();
  };
  const at = $('fpa-atras');
  if (at) at.onclick = () => { _pasoFp = Math.max(0, _pasoFp - 1); pasoFp(); };
  c.querySelectorAll('[data-pfp]').forEach((b) => b.onclick = () => { _pasoFp = Number(b.dataset.pfp); pasoFp(); });
}

/* ══════════════════════════════════════════════════════════════
   COMPARTIR
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const cv = $('fp-cv'); if (!cv) return;
  const marca = document.querySelector('.fp-marca');
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
      g.fillText('Order Flow Footprint', x, yB + 34 * e2);
      g.font = `700 ${14 * e2}px ui-monospace,monospace`;
      g.fillStyle = '#C9A84B';
      g.fillText('CriptoCubaOficial.com', x, yB + 56 * e2);
      g.textAlign = 'right';
      g.fillStyle = '#8b96a3';
      g.font = `700 ${14 * e2}px ui-monospace,monospace`;
      g.fillText(`${_par} · ${_tf}`, out.width - 20 * e2, yB + 34 * e2);
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
      a.href = url; a.download = `criptocuba-footprint-${_par}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');

    const logo = new Image();
    let hecho = false;
    const una = (w) => { if (hecho) return; hecho = true; textos(w ? 20 * e2 + w + 18 * e2 : 20 * e2); bajar(); };
    logo.onload = () => {
      try {
        const alto = 52 * e2, ancho = Math.round(logo.width * (alto / logo.height));
        g.drawImage(logo, 20 * e2, yB + (barra - alto) / 2, ancho, alto);
        una(ancho);
      } catch (_) { una(0); }
    };
    logo.onerror = () => una(0);
    setTimeout(() => una(0), 1500);
    logo.src = 'assets/img/cco-marca.png';
  } catch (_) { devolver(); }
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('fp-css')) return;
  const s = document.createElement('style'); s.id = 'fp-css';
  s.textContent = `
  #fp-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #fp-overlay .fp-bg{position:absolute;inset:0;background:rgba(3,5,8,.95)}
  #fp-overlay .fp-c{position:relative;width:100%;height:100vh;height:100dvh;
    display:grid;grid-template-rows:auto 1fr;grid-template-columns:1fr 330px;
    grid-template-areas:"cab cab" "graf panel";background:#0a0e14}

  #fp-overlay .fp-cab{grid-area:cab;display:flex;align-items:center;gap:11px;
    padding:9px 12px;background:#0b0e12;border-bottom:1px solid #1c2128;overflow-x:auto;scrollbar-width:none}
  #fp-overlay .fp-cab::-webkit-scrollbar{display:none}
  #fp-overlay .fp-sel{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;min-height:36px;
    padding:0 12px;border-radius:10px;background:#12161c;border:1px solid #2b3139;color:#eaecef;
    cursor:pointer;font-family:var(--mono,monospace);font-size:12.5px}
  #fp-overlay .fp-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #fp-overlay .fp-sel svg{width:13px;height:13px;opacity:.6}
  .fp-logo{width:20px;height:20px;border-radius:50%;flex:0 0 auto;display:block;
    background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid #2b3139}
  .fp-logo.con{background-color:transparent;border-color:transparent}
  #fp-overlay .fp-tfs{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #fp-overlay .fp-tf{min-height:30px;padding:0 12px;border-radius:7px;border:none;background:transparent;
    color:#7d8794;font-family:var(--mono,monospace);font-size:11px;font-weight:700;cursor:pointer}
  #fp-overlay .fp-tf.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #fp-overlay .fp-px{display:flex;flex-direction:column;gap:1px;flex:0 0 auto}
  #fp-overlay .fp-px span{font-family:var(--mono,monospace);font-size:8.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1.1px}
  #fp-overlay .fp-px b{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;
    color:var(--gold,#E8B84B);line-height:1}
  #fp-overlay .fp-der{margin-left:auto;display:flex;gap:6px;flex:0 0 auto}
  #fp-overlay .fp-ico{width:36px;height:36px;min-height:36px;flex:0 0 auto;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;
    background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #fp-overlay .fp-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #fp-overlay .fp-comof{width:auto;padding:0 14px;border-color:rgba(232,184,75,.4);color:var(--gold,#E8B84B)}
  #fp-overlay .fp-cf-tx{font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;white-space:nowrap}
  #fp-overlay .fp-cf-s{display:none}

  #fp-overlay .fp-graf{grid-area:graf;position:relative;min-width:0;background:#0a0e14}
  #fp-overlay .fp-cv{display:block}
  #fp-overlay .fp-marca{position:absolute;left:12px;bottom:32px;height:26px;width:auto;
    opacity:.4;pointer-events:none}
  #fp-overlay .fp-esperando{position:absolute;inset:0;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:12px;text-align:center;padding:30px;
    background:rgba(10,14,20,.96)}
  #fp-overlay .fp-spin{width:38px;height:38px;border-radius:50%;
    border:2.5px solid rgba(232,184,75,.16);border-top-color:var(--gold,#E8B84B);
    animation:fpGira .85s linear infinite}
  @keyframes fpGira{to{transform:rotate(360deg)}}
  #fp-overlay .fp-esperando b{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;color:#eaecef}
  #fp-overlay .fp-esperando span{font-family:var(--sans,sans-serif);font-size:13px;color:#7d8794;
    max-width:36ch;line-height:1.6}
  #fp-overlay .fp-btn{min-height:44px;padding:0 22px;border-radius:11px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;margin-top:6px}

  #fp-overlay .fp-panel{grid-area:panel;display:flex;flex-direction:column;min-height:0;
    background:#0b0e12;border-left:1px solid #1c2128}
  #fp-overlay .fp-filtros{display:flex;gap:5px;padding:11px 12px;border-bottom:1px solid #1c2128}
  #fp-overlay .fp-fb{flex:1;min-height:36px;border-radius:9px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #232a33;color:#7d8794;
    font-family:var(--display,sans-serif);font-weight:700;font-size:12px}
  #fp-overlay .fp-fb.verde{border-color:rgba(46,232,106,.26);color:#3ee88a}
  #fp-overlay .fp-fb.rojo{border-color:rgba(246,70,93,.26);color:#ff6b7a}
  #fp-overlay .fp-fb.on{border-width:2px;font-weight:800}
  #fp-overlay .fp-fb.on:not(.verde):not(.rojo){background:rgba(232,184,75,.16);border-color:#E8B84B;color:#E8B84B}
  #fp-overlay .fp-fb.verde.on{background:linear-gradient(180deg,#4dffa0,#1fc96e);color:#04210f;border-color:#2ee86a}
  #fp-overlay .fp-fb.rojo.on{background:linear-gradient(180deg,#ff8a95,#e03546);color:#2a0509;border-color:#f6465d}
  #fp-overlay .fp-lista{flex:1;overflow-y:auto;padding:10px}
  #fp-overlay .fp-esperar{padding:24px 16px;text-align:center;font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#7d8794;line-height:1.7}
  #fp-overlay .fp-esperar b{display:block;font-family:var(--display,sans-serif);
    font-size:14px;color:#b7bdc6;margin-bottom:5px}

  #fp-overlay .fp-card{display:block;width:100%;text-align:left;margin-bottom:8px;padding:12px 13px;
    border-radius:12px;cursor:pointer;background:rgba(255,255,255,.028);
    border:1px solid #232a33;border-left-width:3px}
  #fp-overlay .fp-card.verde{border-left-color:#2ee86a}
  #fp-overlay .fp-card.rojo{border-left-color:#f6465d}
  #fp-overlay .fp-card:hover{background:rgba(255,255,255,.05)}
  #fp-overlay .fp-card.t-imbalance.verde{background:linear-gradient(150deg,rgba(12,90,50,.32),rgba(255,255,255,.012))}
  #fp-overlay .fp-card.t-imbalance.rojo{background:linear-gradient(150deg,rgba(120,20,32,.32),rgba(255,255,255,.012))}
  #fp-overlay .fp-l1{display:flex;align-items:center;gap:8px;margin-bottom:6px}
  #fp-overlay .fp-ic{font-size:12px}
  #fp-overlay .verde .fp-ic{color:#2ee86a}
  #fp-overlay .rojo .fp-ic{color:#f6465d}
  #fp-overlay .fp-l1 b{flex:1;font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;color:#eaecef}
  #fp-overlay .fp-h{font-family:var(--mono,monospace);font-size:9.5px;color:#5c6672}
  #fp-overlay .fp-l2{display:flex;align-items:center;gap:8px;margin-bottom:7px}
  #fp-overlay .fp-nivel{font-family:var(--mono,monospace);font-weight:700;font-size:13px;color:var(--gold,#E8B84B)}
  #fp-overlay .fp-dist{font-family:var(--mono,monospace);font-size:10px;padding:2px 7px;border-radius:6px;
    background:rgba(255,255,255,.06);color:#b7bdc6}
  #fp-overlay .fp-txt{font-family:var(--sans,sans-serif);font-size:12px;color:#8b96a3;
    line-height:1.55;margin-bottom:8px}
  #fp-overlay .fp-hacer{padding:9px 11px;border-radius:9px;background:rgba(0,0,0,.3);
    font-family:var(--sans,sans-serif);font-size:11.5px;color:#c8cfd8;line-height:1.5;
    border-left:2px solid rgba(232,184,75,.5)}

  #fp-picker{position:fixed;z-index:9790;min-width:232px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:13px;padding:6px;
    box-shadow:0 16px 44px rgba(0,0,0,.72)}
  #fp-picker .fp-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;
    border-radius:9px;border:1px solid #2b3139;background:#0b0e12;color:#eaecef;
    font-family:var(--sans,sans-serif);font-size:13px;min-height:38px}
  #fp-picker .fp-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #fp-picker .fp-lista-mon{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  #fp-picker .fp-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;
    border-radius:9px;background:transparent;border:none;color:#b7bdc6;cursor:pointer;
    text-align:left;min-height:42px}
  #fp-picker .fp-op:hover{background:rgba(255,255,255,.05)}
  #fp-picker .fp-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  #fp-picker .fp-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:46px}
  #fp-picker .fp-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  #fp-ayuda-box{position:fixed;inset:0;z-index:9770;display:flex;align-items:center;justify-content:center;padding:16px}
  #fp-ayuda-box .fp-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #fp-ayuda-box .fpa-c{position:relative;width:100%;max-width:540px;max-height:calc(100vh - 32px);
    overflow-y:auto;background:linear-gradient(180deg,#161b22,#0b0e12);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #fp-ayuda-box .fpa-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
  #fp-ayuda-box .fpa-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:18px}
  #fp-ayuda-box .fpa-card{padding:24px 20px;border-radius:16px;text-align:center;margin-bottom:18px;
    background:linear-gradient(165deg,rgba(232,184,75,.08),rgba(255,255,255,.015));
    border:1px solid rgba(232,184,75,.26)}
  #fp-ayuda-box .fpa-n{font-family:var(--mono,monospace);font-size:11px;color:var(--gold,#E8B84B);
    font-weight:700;margin-bottom:10px}
  #fp-ayuda-box .fpa-n em{font-style:normal;color:#5c6672;font-weight:400}
  #fp-ayuda-box .fpa-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;
    color:#eaecef;margin-bottom:12px;line-height:1.25}
  #fp-ayuda-box .fpa-d{font-family:var(--sans,sans-serif);font-size:14px;color:#b7bdc6;
    line-height:1.7;margin-bottom:14px}
  #fp-ayuda-box .fpa-d b{color:var(--gold,#E8B84B);font-weight:700}
  #fp-ayuda-box .fpa-x2{padding:12px 14px;border-radius:11px;background:rgba(255,255,255,.035);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#8b96a3;line-height:1.55;text-align:left}
  #fp-ayuda-box .fpa-puntos{display:flex;gap:5px;justify-content:center;margin-bottom:18px;flex-wrap:wrap}
  #fp-ayuda-box .fpa-puntos i{width:7px;height:7px;border-radius:50%;background:#2b3139;cursor:pointer}
  #fp-ayuda-box .fpa-puntos i.on{background:var(--gold,#E8B84B);transform:scale(1.35)}
  #fp-ayuda-box .fpa-acts{display:flex;gap:9px}
  #fp-ayuda-box .fpa-atras{flex:0 0 auto;min-height:48px;padding:0 20px;border-radius:12px;
    background:transparent;border:1px solid #2b3139;color:#8b96a3;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:13px}
  #fp-ayuda-box .fpa-b{flex:1;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;
    box-shadow:0 4px 0 #8f6a1a}

  @media(max-width:900px){
    #fp-overlay .fp-c{grid-template-columns:1fr;grid-template-rows:auto 52vh 1fr;
      grid-template-areas:"cab" "graf" "panel"}
    #fp-overlay .fp-panel{border-left:none;border-top:1px solid #1c2128}
    #fp-overlay .fp-cab{padding:8px 10px;gap:8px}
    #fp-overlay .fp-comof{width:36px;padding:0}
    #fp-overlay .fp-cf-tx{display:none}
    #fp-overlay .fp-cf-s{display:block}
    #fp-overlay .fp-px span{display:none}
    #fp-overlay .fp-marca{height:20px;left:10px;bottom:28px}
    #fp-ayuda-box .fpa-c{padding:20px 14px}
  }`;
  document.head.appendChild(s);
}
