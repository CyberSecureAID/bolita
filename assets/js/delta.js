// delta.js — Volumen Delta
//
// Muestra, vela a vela, cuánto se compró y cuánto se vendió DE VERDAD.
//
// La diferencia con un indicador de volumen normal: el volumen corriente
// solo dice cuánto se movió, no de qué lado. Aquí se separa usando las
// operaciones reales de Binance: cada una lleva una marca que dice si
// quien tomó la iniciativa fue el comprador o el vendedor.
//
// Eso permite ver cosas que el precio esconde:
//   · Una vela que sube pero con delta negativo = subida sin fuerza
//   · Una vela que baja con delta positivo = alguien está acumulando
//   · Delta acumulado que se separa del precio = divergencia

import * as ethers from './vendor/ethers-6.13.4.min.js?v=126';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const PARES = [
  { id: 'BTC',   s: 'BTCUSDT',   n: 'Bitcoin',   cg: 'bitcoin' },
  { id: 'ETH',   s: 'ETHUSDT',   n: 'Ethereum',  cg: 'ethereum' },
  { id: 'BNB',   s: 'BNBUSDT',   n: 'BNB',       cg: 'binancecoin' },
  { id: 'SOL',   s: 'SOLUSDT',   n: 'Solana',    cg: 'solana' },
  { id: 'XRP',   s: 'XRPUSDT',   n: 'XRP',       cg: 'ripple' },
  { id: 'DOGE',  s: 'DOGEUSDT',  n: 'Dogecoin',  cg: 'dogecoin' },
  { id: 'ADA',   s: 'ADAUSDT',   n: 'Cardano',   cg: 'cardano' },
  { id: 'AVAX',  s: 'AVAXUSDT',  n: 'Avalanche', cg: 'avalanche-2' },
  { id: 'LINK',  s: 'LINKUSDT',  n: 'Chainlink', cg: 'chainlink' },
  { id: 'DOT',   s: 'DOTUSDT',   n: 'Polkadot',  cg: 'polkadot' },
  { id: 'MATIC', s: 'MATICUSDT', n: 'Polygon',   cg: 'matic-network' },
  { id: 'LTC',   s: 'LTCUSDT',   n: 'Litecoin',  cg: 'litecoin' },
  { id: 'TRX',   s: 'TRXUSDT',   n: 'TRON',      cg: 'tron' },
  { id: 'SHIB',  s: 'SHIBUSDT',  n: 'Shiba Inu', cg: 'shiba-inu' },
  { id: 'PEPE',  s: 'PEPEUSDT',  n: 'Pepe',      cg: 'pepe' },
  { id: 'NEAR',  s: 'NEARUSDT',  n: 'NEAR',      cg: 'near' },
  { id: 'SUI',   s: 'SUIUSDT',   n: 'Sui',       cg: 'sui' },
  { id: 'ARB',   s: 'ARBUSDT',   n: 'Arbitrum',  cg: 'arbitrum' },
  { id: 'OP',    s: 'OPUSDT',    n: 'Optimism',  cg: 'optimism' },
  { id: 'ATOM',  s: 'ATOMUSDT',  n: 'Cosmos',    cg: 'cosmos' },
  { id: 'UNI',   s: 'UNIUSDT',   n: 'Uniswap',   cg: 'uniswap' },
  { id: 'WIF',   s: 'WIFUSDT',   n: 'dogwifhat', cg: 'dogwifcoin' }
];

const TFS = [
  { id: '1m',  n: '1 minuto' },
  { id: '5m',  n: '5 minutos' },
  { id: '15m', n: '15 minutos' },
  { id: '30m', n: '30 minutos' },
  { id: '1h',  n: '1 hora' },
  { id: '4h',  n: '4 horas' },
  { id: '1d',  n: '1 día' }
];

let _par = 'BNB';
let _tf = '15m';

const D = {
  velas: [],
  desde: 0,
  ancho: 60,
  vista: 'delta',      // 'delta' | 'acumulado'
  arrastrando: false,
  x0: 0,
  cruzX: -1, cruzY: -1,
  marcas: []
};

/* ══════════════════════════════════════════════════════════════
   LOS DATOS

   Binance da en cada vela dos cifras muy útiles:
     · volumen total
     · volumen "taker buy": lo que compraron los que tomaron la
       iniciativa, es decir, quien cruzó el spread para entrar YA.

   Restando una de otra sale el volumen vendedor. Y la diferencia
   entre ambos es el DELTA: quién tuvo más prisa por operar.

   Esto viene calculado por Binance, no es una estimación.
   ══════════════════════════════════════════════════════════════ */
async function traerVelas(simbolo, tf, n = 300) {
  const url = `https://api.binance.com/api/v3/klines?symbol=${simbolo}&interval=${tf}&limit=${n}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('sin datos');
  const j = await r.json();

  return j.map((x) => {
    const vol = Number(x[5]);           // volumen total
    const compras = Number(x[9]);       // taker buy: los que compraron con prisa
    const ventas = Math.max(0, vol - compras);
    return {
      t: Math.floor(x[0] / 1000),
      o: Number(x[1]), h: Number(x[2]), l: Number(x[3]), c: Number(x[4]),
      v: vol,
      compras, ventas,
      delta: compras - ventas
    };
  });
}

/* ══════════════════════════════════════════════════════════════
   ABRIR
   ══════════════════════════════════════════════════════════════ */
export async function abrirDelta() {
  estilos();
  const prev = $('dl-overlay'); if (prev) prev.remove();

  const d = document.createElement('div');
  d.id = 'dl-overlay';
  d.innerHTML = `<div class="dl-bg"></div>
    <div class="dl-c">
      <div class="dl-barra">
        <button class="dl-sel" id="dl-sel-par">
          <b>${_par}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <button class="dl-sel" id="dl-sel-tf">
          <b>${(TFS.find((t) => t.id === _tf) || TFS[2]).n}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>

        <div class="dl-grupo dl-vistas">
          <button class="dl-b on" data-vista="delta">Por vela</button>
          <button class="dl-b" data-vista="acumulado">Acumulado</button>
        </div>

        <div class="dl-der">
          <button class="dl-ico" id="dl-foto" title="Guardar imagen">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="dl-ico" id="dl-ayuda" title="Cómo funciona">?</button>
          <button class="dl-ico" id="dl-x" aria-label="Cerrar">✕</button>
        </div>
      </div>

      <div class="dl-caja" id="dl-caja">
        <div class="dl-cargando">Cargando el flujo de órdenes…</div>
      </div>

      <div class="dl-pie" id="dl-pie"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_vivo);
    cerrarMenus();
    const e = $('dl-overlay'); if (e) e.remove();
  };
  d.querySelector('.dl-bg').onclick = cerrar;
  $('dl-x').onclick = cerrar;

  $('dl-sel-par').onclick = (e) => { e.stopPropagation(); menuPares(); };
  $('dl-sel-tf').onclick = (e) => { e.stopPropagation(); menuTfs(); };
  $('dl-ayuda').onclick = () => ayuda();
  $('dl-foto').onclick = () => guardarImagen();

  d.querySelectorAll('[data-vista]').forEach((b) => b.onclick = () => {
    D.vista = b.dataset.vista;
    d.querySelectorAll('[data-vista]').forEach((x) => x.classList.toggle('on', x.dataset.vista === D.vista));
    dibujar();
  });

  let _t = null;
  window.addEventListener('resize', () => {
    clearTimeout(_t);
    _t = setTimeout(() => { if ($('dl-caja')) dibujar(); }, 250);
  });

  cargar();
}

async function cargar() {
  const caja = $('dl-caja'); if (!caja) return;
  caja.innerHTML = `<div class="dl-cargando">Cargando el flujo de órdenes…</div>`;
  try {
    const par = PARES.find((p) => p.id === _par) || PARES[0];
    const velas = await traerVelas(par.s, _tf, 300);
    if (velas.length < 10) throw new Error('vacío');

    D.velas = velas;
    D.marcas = detectar(velas);
    D.ancho = Math.min(velas.length, window.innerWidth < 700 ? 40 : 70);
    D.desde = Math.max(0, velas.length - D.ancho);
    caja.innerHTML = '';
    dibujar();
    arrancarVivo();
  } catch (_) {
    caja.innerHTML = `<div class="dl-vacio">No se pudieron cargar los datos.<br>Revisa tu conexión.</div>`;
  }
}

let _vivo = null;
function arrancarVivo() {
  clearInterval(_vivo);
  _vivo = setInterval(async () => {
    if (!$('dl-caja') || D.arrastrando) return;
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      const nuevas = await traerVelas(par.s, _tf, 3);
      let cambio = false;
      nuevas.forEach((nv) => {
        const i = D.velas.findIndex((x) => x.t === nv.t);
        if (i >= 0) { D.velas[i] = nv; cambio = true; }
        else if (nv.t > D.velas[D.velas.length - 1].t) { D.velas.push(nv); cambio = true; }
      });
      if (cambio) {
        if (D.velas.length > 320) D.velas = D.velas.slice(-300);
        D.marcas = detectar(D.velas);
        dibujar();
      }
    } catch (_) {}
  }, 4000);
}

/* ══════════════════════════════════════════════════════════════
   EL DETECTOR — esto es lo que no está gratis

   Un delta a secas es un histograma de colores: cualquiera lo tiene.
   Lo que vale dinero es que la herramienta te SEÑALE los momentos
   donde el flujo de órdenes revela algo, y esos son cuatro:

   1. ABSORCIÓN — mucho volumen agresivo y el precio no se mueve.
      Significa que alguien grande está absorbiendo con órdenes
      pasivas: está defendiendo ese nivel. Es la señal más fuerte
      del análisis de flujo, y la que un gráfico normal esconde.

   2. AGOTAMIENTO — un pico de delta enorme al final de un tramo,
      seguido de nada. El último en entrar ya entró.

   3. DIVERGENCIA — precio hace máximo nuevo y el delta acumulado
      no lo acompaña. El movimiento no tiene fuerza real detrás.

   4. TRAMPA — ruptura de un extremo con delta en contra: los que
      persiguieron el movimiento están atrapados.
   ══════════════════════════════════════════════════════════════ */

function detectar(velas) {
  const marcas = [];
  if (velas.length < 25) return marcas;

  // Referencias: qué es "mucho" en este gráfico concreto
  const vols = velas.map((v) => v.v).slice().sort((a, b) => a - b);
  const volAlto = vols[Math.floor(vols.length * 0.85)];
  const rangos = velas.map((v) => (v.h - v.l) / v.c).slice().sort((a, b) => a - b);
  const rangoBajo = rangos[Math.floor(rangos.length * 0.35)];
  const deltas = velas.map((v) => Math.abs(v.delta)).slice().sort((a, b) => a - b);
  const deltaAlto = deltas[Math.floor(deltas.length * 0.92)];

  // Delta acumulado, para las divergencias
  let acum = 0;
  const cvd = velas.map((v) => { acum += v.delta; return acum; });

  velas.forEach((v, i) => {
    if (i < 12) return;
    const rango = (v.h - v.l) / v.c;

    /* 1 · ABSORCIÓN
       Volumen alto + delta fuerte + el precio casi no se movió.
       Alguien está comiéndose todas las órdenes a ese precio. */
    if (v.v >= volAlto && Math.abs(v.delta) >= deltaAlto * 0.6 && rango <= rangoBajo) {
      marcas.push({
        i, tipo: 'absorcion',
        alcista: v.delta < 0,      // vendedores absorbidos → gira al alza
        titulo: v.delta < 0 ? 'Absorción de venta' : 'Absorción de compra',
        texto: v.delta < 0
          ? 'Vendieron con fuerza y el precio no bajó: alguien está comprando todo lo que sueltan.'
          : 'Compraron con fuerza y el precio no subió: alguien está vendiendo contra ellos.'
      });
      return;
    }

    /* 2 · AGOTAMIENTO
       Pico de delta desproporcionado tras un tramo largo en la misma
       dirección. Cuando todos entran a la vez, ya no queda nadie. */
    if (Math.abs(v.delta) >= deltaAlto) {
      const tramo = velas.slice(Math.max(0, i - 8), i);
      const mismaDir = tramo.filter((x) => (x.c > x.o) === (v.delta > 0)).length;
      if (mismaDir >= 6) {
        marcas.push({
          i, tipo: 'agotamiento',
          alcista: v.delta < 0,
          titulo: v.delta > 0 ? 'Agotamiento comprador' : 'Agotamiento vendedor',
          texto: 'Entrada masiva al final de un tramo largo. Los últimos en llegar suelen ser los que se quedan atrapados.'
        });
        return;
      }
    }

    /* 3 · DIVERGENCIA
       El precio hace un extremo nuevo pero el delta acumulado no. */
    const ventana = 14;
    if (i >= ventana) {
      const prev = velas.slice(i - ventana, i);
      const maxPrev = Math.max(...prev.map((x) => x.h));
      const minPrev = Math.min(...prev.map((x) => x.l));
      const cvdPrev = cvd.slice(i - ventana, i);

      if (v.h > maxPrev && cvd[i] < Math.max(...cvdPrev)) {
        marcas.push({
          i, tipo: 'divergencia', alcista: false,
          titulo: 'Divergencia bajista',
          texto: 'Precio en máximos nuevos, pero el flujo comprador no acompaña. La subida está perdiendo apoyo.'
        });
        return;
      }
      if (v.l < minPrev && cvd[i] > Math.min(...cvdPrev)) {
        marcas.push({
          i, tipo: 'divergencia', alcista: true,
          titulo: 'Divergencia alcista',
          texto: 'Precio en mínimos nuevos, pero el flujo vendedor se está agotando. Alguien está recogiendo.'
        });
      }
    }
  });

  // Sin marcas pegadas: quedarse con la primera de cada racha
  const limpias = [];
  marcas.forEach((m) => {
    if (!limpias.some((x) => Math.abs(x.i - m.i) < 4)) limpias.push(m);
  });
  return limpias;
}

/* ══════════════════════════════════════════════════════════════
   DIBUJO

   Arriba, las velas. Abajo, las barras de delta: verde cuando
   mandaron los compradores, rojo cuando mandaron los vendedores.
   Y sobre las barras, una línea con el delta acumulado.
   ══════════════════════════════════════════════════════════════ */
function dibujar() {
  const caja = $('dl-caja'); if (!caja || !D.velas.length) return;

  const W = caja.clientWidth || 900;
  const H = caja.clientHeight || 500;
  if (W < 50 || H < 50) return;

  let cv = caja.querySelector('.dl-cv');
  if (!cv) {
    caja.innerHTML = `<canvas class="dl-cv"></canvas>
      <div class="dl-info" id="dl-info"></div>
      <div class="dl-marca">CriptoCuba Oficial</div>`;
    cv = caja.querySelector('.dl-cv');
    engancharGestos(cv);
  }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(W * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  const mDer = 66, mAba = 20;
  const x1 = W - mDer;
  const yFin = H - mAba;
  // Dos zonas: velas arriba (58%), delta abajo (42%)
  const hVelas = Math.round(yFin * 0.56);
  const hDelta = yFin - hVelas - 14;
  const yDelta0 = hVelas + 14;

  g.fillStyle = '#0a0d12';
  g.fillRect(0, 0, W, H);

  const desde = Math.max(0, Math.floor(D.desde));
  const hasta = Math.min(D.velas.length, desde + D.ancho);
  const vis = D.velas.slice(desde, hasta);
  if (!vis.length) return;

  const paso = x1 / D.ancho;
  const cuerpo = Math.max(1.6, paso * 0.62);

  /* ── Escala de precio ── */
  const alto = Math.max(...vis.map((v) => v.h));
  const bajo = Math.min(...vis.map((v) => v.l));
  const m = (alto - bajo) * 0.10 || 1;
  const pMax = alto + m, pMin = bajo - m;
  const Y = (p) => hVelas - hVelas * ((p - pMin) / Math.max(1e-12, pMax - pMin));

  const VERDE = '#26a69a', ROJO = '#ef5350';

  /* ── Las velas ── */
  vis.forEach((v, i) => {
    const x = i * paso + paso / 2;
    const col = v.c >= v.o ? VERDE : ROJO;
    g.strokeStyle = col; g.fillStyle = col;
    g.lineWidth = Math.max(0.9, paso * 0.11);
    g.beginPath(); g.moveTo(x, Y(v.h)); g.lineTo(x, Y(v.l)); g.stroke();
    const yA = Y(Math.max(v.o, v.c)), yB = Y(Math.min(v.o, v.c));
    g.fillRect(x - cuerpo / 2, yA, cuerpo, Math.max(1.4, yB - yA));
  });

  /* ══════════════════════════════════════════════════════════
     LAS SEÑALES sobre el gráfico
     Cada una con su forma y color: lo que hace útil la herramienta
     no es el histograma, es que te señale DÓNDE mirar.
     ══════════════════════════════════════════════════════════ */
  const visibles = D.marcas.filter((mk) => mk.i >= desde && mk.i < hasta);
  visibles.forEach((mk) => {
    const v = D.velas[mk.i];
    const x = (mk.i - desde) * paso + paso / 2;
    const arriba = !mk.alcista;
    const y = arriba ? Y(v.h) - 14 : Y(v.l) + 14;
    const col = mk.tipo === 'absorcion' ? '#E8B84B'
              : mk.tipo === 'agotamiento' ? '#c77dff'
              : mk.alcista ? VERDE : ROJO;

    // El triángulo
    g.fillStyle = col;
    g.beginPath();
    if (arriba) { g.moveTo(x, y + 7); g.lineTo(x - 5.5, y - 2); g.lineTo(x + 5.5, y - 2); }
    else { g.moveTo(x, y - 7); g.lineTo(x - 5.5, y + 2); g.lineTo(x + 5.5, y + 2); }
    g.closePath(); g.fill();

    // La letra: A absorción, X agotamiento, D divergencia
    g.font = 'bold 8px ui-monospace,monospace';
    g.fillStyle = col;
    g.textAlign = 'center';
    const letra = mk.tipo === 'absorcion' ? 'A' : mk.tipo === 'agotamiento' ? 'X' : 'D';
    g.fillText(letra, x, arriba ? y - 6 : y + 13);
    g.textAlign = 'left';
  });

  /* ── Separador ── */
  g.strokeStyle = 'rgba(255,255,255,.08)';
  g.beginPath(); g.moveTo(0, hVelas + 7); g.lineTo(x1, hVelas + 7); g.stroke();

  /* ── EL DELTA ── */
  if (D.vista === 'delta') {
    // Barras: cada una es el saldo de esa vela
    const maxD = Math.max(...vis.map((v) => Math.abs(v.delta))) || 1;
    const centro = yDelta0 + hDelta / 2;

    // Línea del cero
    g.strokeStyle = 'rgba(255,255,255,.14)';
    g.beginPath(); g.moveTo(0, centro); g.lineTo(x1, centro); g.stroke();

    vis.forEach((v, i) => {
      const x = i * paso + paso / 2;
      const h = (Math.abs(v.delta) / maxD) * (hDelta / 2 - 4);
      const positivo = v.delta >= 0;
      g.fillStyle = positivo ? 'rgba(38,166,154,.9)' : 'rgba(239,83,80,.9)';
      if (positivo) g.fillRect(x - cuerpo / 2, centro - h, cuerpo, h);
      else g.fillRect(x - cuerpo / 2, centro, cuerpo, h);
    });

    // Etiquetas
    g.font = '9px ui-monospace,monospace';
    g.fillStyle = 'rgba(38,166,154,.75)';
    g.textAlign = 'left';
    g.fillText('COMPRA', 8, yDelta0 + 12);
    g.fillStyle = 'rgba(239,83,80,.75)';
    g.fillText('VENTA', 8, yDelta0 + hDelta - 4);

  } else {
    /* Delta acumulado: la suma corrida. Cuando esta línea sube y el
       precio no, hay compras que aún no se reflejan. Y al revés. */
    let acum = 0;
    const serie = vis.map((v) => { acum += v.delta; return acum; });
    const aMax = Math.max(...serie), aMin = Math.min(...serie);
    const rango = Math.max(1e-9, aMax - aMin);
    const YA = (a) => yDelta0 + hDelta - hDelta * ((a - aMin) / rango);

    // El cero, si está a la vista
    if (aMin < 0 && aMax > 0) {
      g.strokeStyle = 'rgba(255,255,255,.14)';
      g.setLineDash([3, 4]);
      g.beginPath(); g.moveTo(0, YA(0)); g.lineTo(x1, YA(0)); g.stroke();
      g.setLineDash([]);
    }

    // Relleno bajo la línea
    g.beginPath();
    g.moveTo(paso / 2, YA(serie[0]));
    serie.forEach((a, i) => g.lineTo(i * paso + paso / 2, YA(a)));
    g.lineTo((serie.length - 1) * paso + paso / 2, yDelta0 + hDelta);
    g.lineTo(paso / 2, yDelta0 + hDelta);
    g.closePath();
    const sube = serie[serie.length - 1] >= serie[0];
    g.fillStyle = sube ? 'rgba(38,166,154,.14)' : 'rgba(239,83,80,.14)';
    g.fill();

    // La línea
    g.strokeStyle = sube ? VERDE : ROJO;
    g.lineWidth = 2;
    g.beginPath();
    serie.forEach((a, i) => {
      const x = i * paso + paso / 2;
      if (i === 0) g.moveTo(x, YA(a)); else g.lineTo(x, YA(a));
    });
    g.stroke();

    g.font = '9px ui-monospace,monospace';
    g.fillStyle = 'rgba(255,255,255,.4)';
    g.textAlign = 'left';
    g.fillText('DELTA ACUMULADO', 8, yDelta0 + 12);
  }

  /* ── Escala de precios ── */
  g.fillStyle = '#0b0e12';
  g.fillRect(x1, 0, mDer, H);
  g.strokeStyle = 'rgba(255,255,255,.07)';
  g.beginPath(); g.moveTo(x1 + .5, 0); g.lineTo(x1 + .5, H); g.stroke();
  g.font = '10px ui-monospace,monospace';
  g.textAlign = 'left';
  for (let i = 0; i <= 5; i++) {
    const p = pMin + (pMax - pMin) * (i / 5);
    const y = Y(p);
    g.strokeStyle = 'rgba(255,255,255,.05)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
    g.fillStyle = '#6b7681';
    g.fillText(fmt(p), x1 + 6, y + 3.5);
  }

  const ult = D.velas[D.velas.length - 1];
  const yU = Y(ult.c);
  if (yU > 0 && yU < hVelas) {
    g.strokeStyle = 'rgba(232,184,75,.75)';
    g.setLineDash([5, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, yU); g.lineTo(x1, yU); g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#E8B84B';
    g.fillRect(x1 + 1, yU - 9, mDer - 3, 18);
    g.fillStyle = '#3a2800';
    g.font = 'bold 11px ui-monospace,monospace';
    g.fillText(fmt(ult.c), x1 + 6, yU + 4);
  }

  /* ── Fechas ── */
  g.fillStyle = '#0b0e12';
  g.fillRect(0, yFin, W, mAba);
  g.font = '9px ui-monospace,monospace';
  g.fillStyle = '#6b7681';
  const cada = Math.max(1, Math.floor(vis.length / 6));
  g.textAlign = 'center';
  vis.forEach((v, i) => {
    if (i % cada !== 0) return;
    const x = i * paso + paso / 2;
    if (x > x1 - 20) return;
    const dd = new Date(v.t * 1000);
    const largo = (_tf === '1d' || _tf === '4h');
    g.fillText(largo
      ? dd.toLocaleDateString('es', { day: '2-digit', month: 'short' })
      : dd.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), x, yFin + 13);
  });
  g.textAlign = 'left';

  /* ── La cruz ── */
  if (D.cruzX >= 0 && D.cruzX < x1) {
    g.strokeStyle = 'rgba(255,255,255,.25)';
    g.setLineDash([3, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(D.cruzX, 0); g.lineTo(D.cruzX, yFin); g.stroke();
    g.setLineDash([]);
  }

  pintarPie(vis);
  const info = $('dl-info');
  if (info) info.textContent = `${_par} · ${_tf}`;
}

/** El resumen de abajo: lo que hay que mirar de un vistazo. */
function pintarPie(vis) {
  const pie = $('dl-pie'); if (!pie) return;
  const ult = vis[vis.length - 1];
  if (!ult) return;

  const totalC = vis.reduce((a, v) => a + v.compras, 0);
  const totalV = vis.reduce((a, v) => a + v.ventas, 0);
  const total = totalC + totalV;
  const pctC = total > 0 ? (totalC / total * 100) : 50;
  const acum = vis.reduce((a, v) => a + v.delta, 0);

  // ¿La última vela va en contra de su propio delta?
  const subio = ult.c >= ult.o;
  const deltaPos = ult.delta >= 0;
  const divergencia = subio !== deltaPos;

  pie.innerHTML = `
    <div class="dl-dato">
      <span>Presión en pantalla</span>
      <div class="dl-barra-p">
        <i style="width:${pctC.toFixed(1)}%"></i>
      </div>
      <b class="${pctC >= 50 ? 'verde' : 'rojo'}">${pctC.toFixed(0)}% compra</b>
    </div>
    <div class="dl-dato">
      <span>Delta acumulado</span>
      <b class="${acum >= 0 ? 'verde' : 'rojo'}">${acum >= 0 ? '+' : ''}${miles(acum)}</b>
    </div>
    <div class="dl-dato">
      <span>Última vela</span>
      <b class="${ult.delta >= 0 ? 'verde' : 'rojo'}">${ult.delta >= 0 ? '+' : ''}${miles(ult.delta)}</b>
    </div>
    ${ultimaMarca()}`;
}

/** La señal más reciente, explicada. Es lo que el usuario mira primero. */
function ultimaMarca() {
  if (!D.marcas.length) {
    return `<div class="dl-alerta neutra">
      <b>Sin señales</b>
      El flujo va acorde al precio. Nada destacable ahora mismo.
    </div>`;
  }
  const mk = D.marcas[D.marcas.length - 1];
  const v = D.velas[mk.i];
  const cuando = new Date(v.t * 1000).toLocaleString('es',
    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  const clase = mk.tipo === 'absorcion' ? 'oro' : mk.tipo === 'agotamiento' ? 'morada' : (mk.alcista ? 'verde' : 'roja');
  const cuantas = D.marcas.length;

  return `<div class="dl-alerta ${clase}">
    <b>${esc(mk.titulo)} <em>· ${cuando}</em></b>
    ${esc(mk.texto)}
    ${cuantas > 1 ? `<u>${cuantas} señales en el tramo cargado</u>` : ''}
  </div>`;
}

const miles = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (a >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(1);
};

const fmt = (p) => {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(6);
};

/* ══════════════════════════════════════════════════════════════
   GESTOS
   ══════════════════════════════════════════════════════════════ */
function engancharGestos(cv) {
  const total = () => D.velas.length;

  const mover = (dx) => {
    const W = cv.clientWidth || 900;
    const paso = (W - 66) / D.ancho;
    D.desde = Math.max(0, Math.min(total() - 10, D.desde - dx / Math.max(0.5, paso)));
    dibujar();
  };
  const zoom = (f) => {
    D.ancho = Math.max(15, Math.min(total(), Math.round(D.ancho * f)));
    D.desde = Math.max(0, Math.min(total() - 10, total() - D.ancho));
    dibujar();
  };

  cv.addEventListener('mousedown', (e) => {
    D.arrastrando = true; D.x0 = e.clientX; cv.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (D.arrastrando) { mover(e.clientX - D.x0); D.x0 = e.clientX; return; }
    const r = cv.getBoundingClientRect();
    const nx = Math.round(e.clientX - r.left);
    if (nx !== D.cruzX) { D.cruzX = nx; dibujar(); }
  });
  window.addEventListener('mouseup', () => { D.arrastrando = false; cv.style.cursor = 'grab'; });
  cv.addEventListener('mouseleave', () => { D.cruzX = -1; dibujar(); });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 0.87);
  }, { passive: false });

  let d0 = 0;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) { D.arrastrando = true; D.x0 = e.touches[0].clientX; }
    else if (e.touches.length === 2) {
      D.arrastrando = false;
      d0 = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && D.arrastrando) {
      e.preventDefault();
      mover(e.touches[0].clientX - D.x0); D.x0 = e.touches[0].clientX;
    } else if (e.touches.length === 2 && d0 > 0) {
      e.preventDefault();
      const dd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      if (Math.abs(dd - d0) > 6) { zoom(d0 / dd); d0 = dd; }
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { D.arrastrando = false; d0 = 0; });
  cv.style.cursor = 'grab';
}

/* ══════════════════════════════════════════════════════════════
   DESPLEGABLES
   ══════════════════════════════════════════════════════════════ */
function cerrarMenus() {
  document.querySelectorAll('.dl-menu').forEach((x) => x.remove());
}

function abrirMenu(anclaje, html, alElegir, conBuscador) {
  cerrarMenus();
  const r = anclaje.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'dl-menu';
  m.innerHTML = (conBuscador ? `<input class="dl-buscar" id="dl-buscar" placeholder="Buscar…" autocomplete="off">` : '')
    + `<div class="dl-menu-lista">${html}</div>`;
  document.body.appendChild(m);

  const ancho = m.offsetWidth || 220;
  m.style.left = Math.max(8, Math.min(window.innerWidth - ancho - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';

  m.addEventListener('click', (e) => e.stopPropagation());
  m.querySelectorAll('[data-val]').forEach((b) => b.onclick = () => { alElegir(b.dataset.val); cerrarMenus(); });

  const bus = m.querySelector('#dl-buscar');
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
    <button data-val="${p.id}" data-busca="${(p.id + ' ' + p.n).toLowerCase()}" class="dl-op ${p.id === _par ? 'on' : ''}">
      <i class="dl-logo" data-cg="${esc(p.cg)}"></i><b>${p.id}</b><span>${esc(p.n)}</span>
    </button>`).join('');
  setTimeout(ponerLogos, 40);
  abrirMenu($('dl-sel-par'), html, (v) => {
    _par = v;
    const b = $('dl-sel-par').querySelector('b'); if (b) b.textContent = v;
    cargar();
  }, true);
}

function menuTfs() {
  const html = TFS.map((t) => `
    <button data-val="${t.id}" data-busca="${t.n.toLowerCase()}" class="dl-op ${t.id === _tf ? 'on' : ''}">
      <b>${t.id}</b><span>${esc(t.n)}</span>
    </button>`).join('');
  abrirMenu($('dl-sel-tf'), html, (v) => {
    _tf = v;
    const b = $('dl-sel-tf').querySelector('b');
    if (b) b.textContent = (TFS.find((t) => t.id === v) || {}).n || v;
    cargar();
  }, false);
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
  document.querySelectorAll('.dl-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   GUARDAR IMAGEN
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const cv = document.querySelector('.dl-cv');
  if (!cv) return;
  try {
    const out = document.createElement('canvas');
    const esc2 = cv.width / cv.clientWidth;
    const barra = 46 * esc2;
    out.width = cv.width;
    out.height = cv.height + barra;
    const g = out.getContext('2d');

    g.fillStyle = '#0a0d12';
    g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, 0, 0);

    const yB = cv.height;
    g.fillStyle = '#0b0e12';
    g.fillRect(0, yB, out.width, barra);
    g.fillStyle = 'rgba(232,184,75,.25)';
    g.fillRect(0, yB, out.width, 1.5 * esc2);

    g.fillStyle = '#E8B84B';
    g.font = `800 ${17 * esc2}px system-ui,sans-serif`;
    g.textAlign = 'left';
    g.fillText('CRIPTO CUBA OFICIAL', 16 * esc2, yB + 21 * esc2);
    g.fillStyle = '#6b7681';
    g.font = `${11 * esc2}px ui-monospace,monospace`;
    g.fillText('criptocubaoficial.com  ·  Volumen Delta', 16 * esc2, yB + 36 * esc2);

    g.textAlign = 'right';
    g.fillStyle = '#8b96a3';
    g.font = `700 ${13 * esc2}px ui-monospace,monospace`;
    g.fillText(`${_par} · ${_tf}`, out.width - 16 * esc2, yB + 21 * esc2);
    g.font = `${10 * esc2}px ui-monospace,monospace`;
    g.fillStyle = '#6b7681';
    g.fillText(new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
               out.width - 16 * esc2, yB + 36 * esc2);

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `criptocuba-delta-${_par}-${_tf}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');
  } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA
   ══════════════════════════════════════════════════════════════ */
function ayuda() {
  const d = document.createElement('div');
  d.id = 'dl-ayuda-box';
  d.innerHTML = `<div class="dl-bg"></div>
    <div class="dla-c">
      <button class="dla-x" id="dla-x" aria-label="Cerrar">✕</button>

      <div class="dla-tabs">
        <button class="dla-tab on" data-dtab="operar">Cómo operar con esto</button>
        <button class="dla-tab" data-dtab="leer">Qué es el delta</button>
      </div>

      <div class="dla-pane on" id="dp-operar">
        <div class="dla-intro">
          Esto no es un indicador de volumen. Es un <b>detector de huellas
          institucionales</b>: te marca los momentos exactos donde un jugador
          grande está actuando y el gráfico normal no lo enseña.
        </div>

        <div class="dla-p">
          <b>Las tres señales que busca</b>
          <span class="dla-col"><i style="background:#E8B84B"></i><b>A — Absorción.</b> La más valiosa.</span>
          <span class="dla-col"><i style="background:#c77dff"></i><b>X — Agotamiento.</b> El final de un tramo.</span>
          <span class="dla-col"><i style="background:#26a69a"></i><b>D — Divergencia.</b> Movimiento sin apoyo.</span>
        </div>

        <div class="dla-p">
          <b>1 · La absorción es lo que nadie te enseña</b>
          Cuando ves una <b>A dorada</b>, ha pasado esto: alguien lanzó una
          avalancha de órdenes en una dirección y <b>el precio no se movió</b>.
          Eso solo ocurre cuando un participante grande está absorbiendo cada
          orden con posiciones pasivas. Está defendiendo ese nivel.
          <i>Qué hacer: la absorción marca dónde hay alguien grande al otro lado. Suele aparecer justo antes de un giro, porque cuando los agresivos se agotan, el precio se va hacia el que absorbió.</i>
        </div>

        <div class="dla-p">
          <b>2 · La divergencia avisa antes que el precio</b>
          Cuando el precio sube pero el delta es negativo, esa subida
          <b>la están sosteniendo órdenes pasivas, no compradores con prisa</b>.
          Suele durar poco. Y al revés: precio que baja con delta positivo
          significa que alguien está recogiendo mientras el resto vende.
          <i>Qué hacer: cuando veas el aviso de divergencia abajo, desconfía del movimiento en curso.</i>
        </div>

        <div class="dla-p">
          <b>3 · El delta acumulado marca la tendencia real</b>
          Cambia a la vista <b>Acumulado</b>. Si esa línea sube de forma
          constante mientras el precio va de lado, hay acumulación silenciosa:
          alguien está construyendo posición sin mover el precio.
          <i>Qué hacer: esa línea suele girar antes que el precio. Vigílala cuando el mercado esté plano.</i>
        </div>

        <div class="dla-p">
          <b>4 · El agotamiento marca el clímax</b>
          Una barra de delta mucho mayor que las demás es un momento de
          pánico o euforia. <b>Ahí suele estar el final del movimiento</b>,
          no el principio: cuando todos entran a la vez, ya no queda nadie
          por entrar.
          <i>Qué hacer: si aparece una barra desproporcionada tras un tramo largo, el movimiento está madurando.</i>
        </div>

        <div class="dla-p">
          <b>5 · La presión en pantalla te da el contexto</b>
          El indicador de abajo resume quién manda en todo lo que estás
          viendo. Por encima del 60% de compra, el tramo es claramente
          comprador; por debajo del 40%, vendedor. Entre medias, indecisión.
          <i>Qué hacer: úsalo para no operar contra la corriente dominante del tramo.</i>
        </div>

        <div class="dla-p">
          <b>6 · Combínalo con Liquidity Pools</b>
          El mapa de liquidez te dice <b>dónde</b> hay dinero esperando. El
          delta te dice <b>si están yendo a por él</b>. Un muro rojo con delta
          creciendo hacia él es la combinación más clara que vas a encontrar.
        </div>

        <div class="dla-aviso">
          Esto es <b>información, no una señal</b>. El delta muestra la fuerza
          detrás del precio, no lo que va a pasar después.
        </div>
      </div>

      <div class="dla-pane" id="dp-leer">
        <div class="dla-p">
          <b>Qué es el delta</b>
          En cada operación hay alguien que espera y alguien que tiene prisa.
          Quien tiene prisa cruza el precio para entrar ya, y eso es lo que
          de verdad mueve el mercado.
          <b>Delta = volumen con prisa comprador − volumen con prisa vendedor.</b>
        </div>

        <div class="dla-p">
          <b>De dónde salen los datos</b>
          Binance publica, en cada vela, cuánto volumen vino de compradores
          agresivos. Restándolo del total sale el vendedor.
          <b>No es una estimación: es el dato real del exchange.</b>
        </div>

        <div class="dla-p">
          <b>Las dos vistas</b>
          <span class="dla-col"><i style="background:#26a69a"></i><b>Por vela</b> — el saldo de cada vela, una a una</span>
          <span class="dla-col"><i style="background:#E8B84B"></i><b>Acumulado</b> — la suma corrida, para ver la tendencia de fondo</span>
        </div>

        <div class="dla-p">
          <b>Los colores</b>
          <span class="dla-col"><i style="background:#26a69a"></i>Verde — mandaron los compradores</span>
          <span class="dla-col"><i style="background:#ef5350"></i>Rojo — mandaron los vendedores</span>
        </div>
      </div>

      <button class="dla-b" id="dla-cerrar">Entendido</button>
    </div>`;
  document.body.appendChild(d);

  const q = () => d.remove();
  d.querySelector('.dl-bg').onclick = q;
  $('dla-x').onclick = q;
  $('dla-cerrar').onclick = q;

  d.querySelectorAll('[data-dtab]').forEach((b) => b.onclick = () => {
    d.querySelectorAll('.dla-tab').forEach((x) => x.classList.toggle('on', x === b));
    d.querySelectorAll('.dla-pane').forEach((p) => p.classList.remove('on'));
    const p = $('dp-' + b.dataset.dtab);
    if (p) p.classList.add('on');
    d.querySelector('.dla-c').scrollTop = 0;
  });
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('dl-css')) return;
  const s = document.createElement('style'); s.id = 'dl-css';
  s.textContent = `
  #dl-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #dl-overlay .dl-bg{position:absolute;inset:0;background:rgba(3,5,8,.94)}
  #dl-overlay .dl-c{position:relative;width:100%;height:100vh;height:100dvh;display:flex;flex-direction:column;background:#07090c}

  #dl-overlay .dl-barra{display:flex;align-items:center;gap:8px;flex:0 0 auto;position:relative;
    padding:8px 130px 8px 10px;background:#0b0e12;border-bottom:1px solid #1c2128;overflow-x:auto;scrollbar-width:none}
  #dl-overlay .dl-barra::-webkit-scrollbar{display:none}
  #dl-overlay .dl-sel{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;min-height:34px;padding:0 11px;
    border-radius:9px;background:#12161c;border:1px solid #2b3139;color:#eaecef;cursor:pointer;
    font-family:var(--mono,monospace);font-size:12px;white-space:nowrap}
  #dl-overlay .dl-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #dl-overlay .dl-sel svg{width:13px;height:13px;opacity:.6}
  #dl-overlay .dl-grupo{display:flex;gap:2px;flex:0 0 auto;padding:3px;background:#12161c;border-radius:9px}
  #dl-overlay .dl-b{min-height:32px;padding:0 13px;border-radius:7px;border:none;background:transparent;color:#7d8794;
    font-family:var(--mono,monospace);font-size:11.5px;font-weight:700;cursor:pointer;white-space:nowrap}
  #dl-overlay .dl-b.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #dl-overlay .dl-der{position:absolute;right:8px;top:50%;transform:translateY(-50%);
    display:flex;gap:5px;z-index:6;background:#0b0e12;padding-left:8px}
  #dl-overlay .dl-ico{width:34px;height:34px;min-height:34px;flex:0 0 auto;border-radius:9px;display:grid;place-items:center;
    padding:0;cursor:pointer;background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #dl-overlay .dl-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}

  #dl-overlay .dl-caja{flex:1;min-height:0;position:relative;background:#07090c;
    display:flex;align-items:center;justify-content:center;overflow:hidden}
  #dl-overlay .dl-cv{display:block}
  #dl-overlay .dl-info{position:absolute;left:9px;top:8px;font-family:var(--mono,monospace);font-size:10px;
    color:#6b7681;background:rgba(7,9,12,.75);padding:3px 8px;border-radius:20px;pointer-events:none}
  #dl-overlay .dl-marca{position:absolute;left:10px;bottom:26px;pointer-events:none;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;color:rgba(232,184,75,.2);user-select:none}
  #dl-overlay .dl-cargando,#dl-overlay .dl-vacio{font-family:var(--mono,monospace);font-size:12px;
    color:#7d8794;text-align:center;padding:30px;line-height:1.7}

  #dl-overlay .dl-pie{flex:0 0 auto;display:flex;align-items:center;gap:18px;flex-wrap:wrap;
    padding:10px 14px;background:#0b0e12;border-top:1px solid #1c2128}
  #dl-overlay .dl-dato{display:flex;align-items:center;gap:8px}
  #dl-overlay .dl-dato span{font-family:var(--mono,monospace);font-size:9.5px;color:#6b7681;
    text-transform:uppercase;letter-spacing:.6px;white-space:nowrap}
  #dl-overlay .dl-dato b{font-family:var(--display,sans-serif);font-weight:800;font-size:14px}
  #dl-overlay .dl-dato b.verde{color:#26a69a}
  #dl-overlay .dl-dato b.rojo{color:#ef5350}
  #dl-overlay .dl-barra-p{width:110px;height:7px;border-radius:20px;background:#ef5350;overflow:hidden}
  #dl-overlay .dl-barra-p i{display:block;height:100%;background:#26a69a}
  #dl-overlay .dl-alerta{margin-left:auto;padding:7px 12px;border-radius:9px;
    background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.32);
    font-family:var(--sans,sans-serif);font-size:11.5px;color:#b7bdc6;line-height:1.4}
  #dl-overlay .dl-alerta b{display:block;color:var(--gold,#E8B84B);
    font-family:var(--display,sans-serif);font-size:12.5px;margin-bottom:2px}
  #dl-overlay .dl-alerta b em{font-style:normal;font-weight:400;font-size:9.5px;
    color:#6b7681;font-family:var(--mono,monospace)}
  #dl-overlay .dl-alerta u{display:block;margin-top:4px;text-decoration:none;
    font-family:var(--mono,monospace);font-size:9.5px;color:#6b7681}
  #dl-overlay .dl-alerta.oro{background:rgba(232,184,75,.12);border-color:rgba(232,184,75,.4)}
  #dl-overlay .dl-alerta.morada{background:rgba(199,125,255,.1);border-color:rgba(199,125,255,.35)}
  #dl-overlay .dl-alerta.morada b{color:#c77dff}
  #dl-overlay .dl-alerta.verde{background:rgba(38,166,154,.1);border-color:rgba(38,166,154,.35)}
  #dl-overlay .dl-alerta.verde b{color:#26a69a}
  #dl-overlay .dl-alerta.roja{background:rgba(239,83,80,.1);border-color:rgba(239,83,80,.35)}
  #dl-overlay .dl-alerta.roja b{color:#ef5350}
  #dl-overlay .dl-alerta.neutra{background:rgba(255,255,255,.03);border-color:#2b3139}
  #dl-overlay .dl-alerta.neutra b{color:#8b96a3}

  .dl-menu{position:fixed;z-index:9780;min-width:212px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:13px;padding:6px;box-shadow:0 16px 44px rgba(0,0,0,.7)}
  .dl-menu-lista{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  .dl-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;border-radius:9px;
    border:1px solid #2b3139;background:#0b0e12;color:#eaecef;font-size:13px;min-height:38px}
  .dl-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  .dl-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;border-radius:9px;
    background:transparent;border:none;color:#b7bdc6;cursor:pointer;text-align:left;min-height:40px}
  .dl-op:hover{background:rgba(255,255,255,.05)}
  .dl-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  .dl-logo{width:22px;height:22px;border-radius:50%;flex:0 0 auto;
    background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid #2b3139}
  .dl-logo.con{background-color:transparent;border-color:transparent}
  .dl-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:44px}
  .dl-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

  #dl-ayuda-box{position:fixed;inset:0;z-index:9760;display:flex;align-items:center;justify-content:center;padding:16px}
  #dl-ayuda-box .dl-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #dl-ayuda-box .dla-c{position:relative;width:100%;max-width:540px;max-height:calc(100vh - 32px);overflow-y:auto;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);
    border-radius:20px;padding:24px 20px}
  #dl-ayuda-box .dla-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
  #dl-ayuda-box .dla-tabs{display:flex;gap:4px;padding:4px;margin:0 42px 18px 0;
    background:#0b0e12;border:1px solid #2b3139;border-radius:12px}
  #dl-ayuda-box .dla-tab{flex:1;min-height:40px;padding:0 10px;border-radius:9px;border:none;background:transparent;
    color:#7d8794;font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer;line-height:1.25}
  #dl-ayuda-box .dla-tab.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #dl-ayuda-box .dla-pane{display:none}
  #dl-ayuda-box .dla-pane.on{display:block}
  #dl-ayuda-box .dla-intro{padding:14px 16px;border-radius:13px;margin-bottom:18px;
    background:linear-gradient(180deg,rgba(232,184,75,.09),rgba(232,184,75,.02));
    border:1px solid rgba(232,184,75,.3);font-family:var(--sans,sans-serif);
    font-size:13.5px;color:#b7bdc6;line-height:1.65}
  #dl-ayuda-box .dla-intro b{color:var(--gold,#E8B84B)}
  #dl-ayuda-box .dla-p{margin-bottom:15px;font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.65}
  #dl-ayuda-box .dla-p > b:first-child{display:block;font-family:var(--display,sans-serif);
    font-size:14px;color:#eaecef;margin-bottom:5px}
  #dl-ayuda-box .dla-p b{color:#eaecef}
  #dl-ayuda-box .dla-p i{display:block;margin-top:8px;padding:9px 12px;border-radius:9px;font-style:normal;
    background:rgba(255,255,255,.03);border-left:2px solid var(--gold-soft,#C9A84B);
    font-size:12.5px;color:#8b96a3;line-height:1.55}
  #dl-ayuda-box .dla-col{display:flex;align-items:center;gap:9px;margin-top:7px;font-size:12.5px}
  #dl-ayuda-box .dla-col i{width:16px;height:11px;border-radius:3px;flex:0 0 auto;
    margin:0;padding:0;background-color:currentColor;border:none;display:block}
  #dl-ayuda-box .dla-aviso{padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.07);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12px;color:#b7bdc6;line-height:1.6;margin-bottom:18px}
  #dl-ayuda-box .dla-aviso b{color:var(--gold,#E8B84B)}
  #dl-ayuda-box .dla-b{width:100%;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a}

  @media(max-width:760px){
    #dl-overlay .dl-barra{padding:7px 8px;padding-right:128px;gap:6px}
    #dl-overlay .dl-b{padding:0 10px;font-size:11px;min-height:32px}
    #dl-overlay .dl-vistas{order:9}
    #dl-overlay .dl-pie{gap:11px;padding:9px 10px}
    #dl-overlay .dl-dato span{font-size:8.5px}
    #dl-overlay .dl-dato b{font-size:13px}
    #dl-overlay .dl-barra-p{width:72px}
    #dl-overlay .dl-alerta{margin-left:0;width:100%;font-size:11px}
    #dl-ayuda-box .dla-c{padding:20px 14px}
    #dl-ayuda-box .dla-tabs{margin-right:44px;flex-direction:column}
    #dl-ayuda-box .dla-intro{font-size:12.5px;padding:12px 13px}
  }`;
  document.head.appendChild(s);
}
