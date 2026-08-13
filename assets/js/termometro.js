// termometro.js — Termómetro de Liquidación
//
// QUÉ RESUELVE
//
// Antes de cada caída violenta, el mercado deja huellas. No son
// secretas: Binance las publica gratis. Lo que nadie hace es leerlas
// juntas y decir qué significan.
//
//   · Funding rate       → quién paga por mantener su posición
//   · Interés abierto    → cuánto dinero apalancado hay dentro
//   · Ratio largos/cortos → hacia dónde está posicionada la masa
//   · Liquidaciones      → quién está siendo expulsado ahora
//
// Por separado son datos sueltos que no sirven de nada. Juntos son
// un sistema de alerta temprana: cuando el funding se dispara, el
// interés abierto está en máximos y el 85% está largo, el mercado
// está a punto de purgar.
//
// REGLA DE LA HERRAMIENTA: cada número que se muestra lleva su
// consecuencia. Si un dato no lleva a una decisión, no se enseña.

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

let _par = 'BTC';

const T = {
  funding: [],        // historial de funding
  oi: [],             // interés abierto
  ratio: [],          // largos vs cortos
  liq: [],            // liquidaciones recientes
  precio: 0,
  cambio24: 0,
  puntuacion: 0,      // 0 a 100: cuánto riesgo de purga
  lado: 'ninguno',    // qué lado va a sufrir
  cargando: true,
  error: null
};

/* ══════════════════════════════════════════════════════════════
   LOS DATOS — todo de la API pública de Binance, sin clave
   ══════════════════════════════════════════════════════════════ */
const API = 'https://fapi.binance.com';

async function pedir(ruta) {
  const r = await fetch(API + ruta);
  if (!r.ok) throw new Error('sin datos');
  return r.json();
}

async function cargarTodo(simbolo) {
  /* Se piden en paralelo pero cada uno tolera su propio fallo: si
     falta uno, la herramienta sigue con los demás en vez de quedarse
     en blanco. */
  const [fund, oi, ratio, marca, tick] = await Promise.all([
    pedir(`/fapi/v1/fundingRate?symbol=${simbolo}&limit=48`).catch(() => []),
    pedir(`/futures/data/openInterestHist?symbol=${simbolo}&period=1h&limit=48`).catch(() => []),
    pedir(`/futures/data/globalLongShortAccountRatio?symbol=${simbolo}&period=1h&limit=48`).catch(() => []),
    pedir(`/fapi/v1/premiumIndex?symbol=${simbolo}`).catch(() => null),
    pedir(`/fapi/v1/ticker/24hr?symbol=${simbolo}`).catch(() => null)
  ]);

  T.funding = fund.map((x) => ({ t: x.fundingTime, v: Number(x.fundingRate) }));
  T.oi = oi.map((x) => ({ t: x.timestamp, v: Number(x.sumOpenInterestValue) }));
  T.ratio = ratio.map((x) => ({
    t: x.timestamp,
    largos: Number(x.longAccount),
    cortos: Number(x.shortAccount)
  }));

  if (marca) {
    T.fundingAhora = Number(marca.lastFundingRate);
    T.proximo = Number(marca.nextFundingTime);
    T.precio = Number(marca.markPrice);
  }
  if (tick) T.cambio24 = Number(tick.priceChangePercent);

  calcular();
}

/* ══════════════════════════════════════════════════════════════
   EL CÁLCULO — de datos sueltos a un veredicto

   Cada factor suma riesgo. La puntuación final dice cuánta tensión
   acumulada hay, y el lado dice quién la va a pagar.
   ══════════════════════════════════════════════════════════════ */
function calcular() {
  let pts = 0;
  const senales = [];

  /* ── 1. FUNDING: quién paga por seguir dentro ──
     Positivo = los largos pagan a los cortos, o sea que hay exceso
     de gente apostando al alza. Por encima del 0,05% por periodo ya
     es caro; por encima del 0,1% es insostenible. */
  const f = T.fundingAhora || 0;
  const fPct = f * 100;
  const fAnual = f * 3 * 365 * 100;      // se cobra 3 veces al día

  if (Math.abs(fPct) > 0.1) {
    pts += 30;
    senales.push({
      peso: 'alto',
      lado: fPct > 0 ? 'largos' : 'cortos',
      titulo: fPct > 0 ? 'Los alcistas pagan una fortuna' : 'Los bajistas pagan una fortuna',
      txt: `El funding está en ${fPct.toFixed(3)}% cada 8 horas — un ${fAnual.toFixed(0)}% anual. ` +
           (fPct > 0
             ? 'Mantener una posición larga sale carísimo. Cuando el coste supera a las ganancias, los largos cierran de golpe.'
             : 'Mantener una posición corta sale carísimo. Cuando el coste supera a las ganancias, los cortos cierran de golpe.')
    });
  } else if (Math.abs(fPct) > 0.04) {
    pts += 15;
    senales.push({
      peso: 'medio',
      lado: fPct > 0 ? 'largos' : 'cortos',
      titulo: fPct > 0 ? 'Sesgo alcista caro' : 'Sesgo bajista caro',
      txt: `Funding en ${fPct.toFixed(3)}% (${fAnual.toFixed(0)}% anual). ` +
           'Hay desequilibrio, pero todavía sostenible.'
    });
  }

  /* ── 2. INTERÉS ABIERTO: cuánto dinero hay dentro ──
     Si está en máximo del periodo, hay mucha munición para una
     cascada. Si además sube mientras el precio no, es apalancamiento
     entrando sin convicción. */
  let oiPct = 0;
  if (T.oi.length > 10) {
    /* El histórico puede llegar en cualquier orden según el endpoint.
       Se ordena por tiempo antes de mirar cuál es el último. */
    T.oi.sort((a, b) => a.t - b.t);
    const ahora = T.oi[T.oi.length - 1].v;
    const vals = T.oi.map((x) => x.v);
    const max = Math.max(...vals), min = Math.min(...vals);
    oiPct = max > min ? ((ahora - min) / (max - min)) * 100 : 50;
    const hace24 = T.oi[Math.max(0, T.oi.length - 24)].v;
    const subidaOi = hace24 > 0 ? ((ahora - hace24) / hace24) * 100 : 0;

    if (oiPct > 85) {
      pts += 25;
      senales.push({
        peso: 'alto',
        lado: 'ambos',
        titulo: 'Récord de dinero apalancado',
        txt: `El interés abierto está en el ${oiPct.toFixed(0)}% de su máximo de 48 horas. ` +
             'Hay muchísimas posiciones abiertas: si el precio se mueve rápido, la cascada de liquidaciones será grande.'
      });
    } else if (subidaOi > 12) {
      pts += 15;
      senales.push({
        peso: 'medio',
        lado: 'ambos',
        titulo: 'Entrada rápida de apalancamiento',
        txt: `El interés abierto subió un ${subidaOi.toFixed(1)}% en 24 horas. ` +
             'Está entrando dinero apalancado deprisa, y eso suele preceder a movimientos bruscos.'
      });
    }
    T.oiPct = oiPct;
    T.subidaOi = subidaOi;
  }

  /* ── 3. RATIO LARGOS/CORTOS: dónde está la masa ──
     Cuando todos están del mismo lado, no queda nadie por entrar y
     el movimiento se agota. El mercado suele ir contra la mayoría. */
  let pctLargos = 50;
  if (T.ratio.length) {
    const r = T.ratio[T.ratio.length - 1];
    const tot = r.largos + r.cortos;
    pctLargos = tot > 0 ? (r.largos / tot) * 100 : 50;
    T.pctLargos = pctLargos;

    if (pctLargos > 78) {
      pts += 25;
      senales.push({
        peso: 'alto',
        lado: 'largos',
        titulo: 'Casi todos están largos',
        txt: `El ${pctLargos.toFixed(0)}% de las cuentas está apostando al alza. ` +
             'Cuando la mayoría está del mismo lado, ya no queda quien compre: el combustible para subir se acabó.'
      });
    } else if (pctLargos < 32) {
      pts += 25;
      senales.push({
        peso: 'alto',
        lado: 'cortos',
        titulo: 'Casi todos están cortos',
        txt: `Solo el ${pctLargos.toFixed(0)}% está largo. ` +
             'Con tanta gente apostando a la baja, un rebote los liquidaría en cadena hacia arriba.'
      });
    } else if (pctLargos > 68 || pctLargos < 40) {
      pts += 12;
      senales.push({
        peso: 'medio',
        lado: pctLargos > 60 ? 'largos' : 'cortos',
        titulo: 'Desequilibrio en el posicionamiento',
        txt: `${pctLargos.toFixed(0)}% largos frente a ${(100 - pctLargos).toFixed(0)}% cortos. ` +
             'Hay sesgo, pero aún no es extremo.'
      });
    }
  }

  /* ── 4. FUNDING + POSICIÓN: la combinación peligrosa ──
     Que todos estén largos Y pagando por estarlo es la firma exacta
     de una purga inminente. */
  if (fPct > 0.05 && pctLargos > 70) {
    pts += 20;
    senales.push({
      peso: 'alto',
      lado: 'largos',
      titulo: 'Combinación de purga',
      txt: 'La mayoría está larga Y pagando por mantenerse. Históricamente, esta es la señal más fiable ' +
           'de una limpieza de posiciones: basta una caída pequeña para encadenar liquidaciones.'
    });
  } else if (fPct < -0.05 && pctLargos < 35) {
    pts += 20;
    senales.push({
      peso: 'alto',
      lado: 'cortos',
      titulo: 'Combinación de rebote',
      txt: 'La mayoría está corta Y pagando por mantenerse. Un rebote pequeño encadenaría liquidaciones ' +
           'hacia arriba, empujando el precio con fuerza.'
    });
  }

  T.puntuacion = Math.min(100, pts);
  T.senales = senales.sort((a, b) => (a.peso === 'alto' ? -1 : 1));

  /* Qué lado va a sufrir: el que esté sobrecargado. */
  const largos = senales.filter((s) => s.lado === 'largos').length;
  const cortos = senales.filter((s) => s.lado === 'cortos').length;
  T.lado = largos > cortos ? 'largos' : cortos > largos ? 'cortos' : 'ninguno';
}

/* ══════════════════════════════════════════════════════════════
   EL VEREDICTO — una frase que lleve a una decisión
   ══════════════════════════════════════════════════════════════ */
function veredicto() {
  const p = T.puntuacion;
  const l = T.lado;

  if (p >= 70) {
    return {
      nivel: 'extremo',
      color: '#ff2d55',
      titulo: 'Riesgo extremo de purga',
      frase: l === 'largos'
        ? 'El mercado está sobrecargado de posiciones largas y pagando por ello. Una caída pequeña puede encadenar liquidaciones masivas.'
        : l === 'cortos'
        ? 'El mercado está sobrecargado de posiciones cortas. Un rebote pequeño puede encadenar liquidaciones hacia arriba.'
        : 'Hay una acumulación peligrosa de apalancamiento en ambos lados.',
      hacer: l === 'largos'
        ? 'Si va largo con apalancamiento, este es mal momento para añadir. Considere reducir o mover su stop más cerca.'
        : l === 'cortos'
        ? 'Si va corto con apalancamiento, este es mal momento para añadir. Un rebote le puede barrer.'
        : 'Reduzca apalancamiento hasta que la tensión baje.'
    };
  }
  if (p >= 45) {
    return {
      nivel: 'alto',
      color: '#ff9500',
      titulo: 'Tensión alta',
      frase: l === 'largos'
        ? 'Hay más posiciones largas de las que el mercado puede sostener cómodamente.'
        : l === 'cortos'
        ? 'Hay más posiciones cortas de las que el mercado puede sostener cómodamente.'
        : 'El apalancamiento está por encima de lo normal.',
      hacer: 'Opere con menos tamaño del habitual y vigile de cerca. La volatilidad suele llegar desde aquí.'
    };
  }
  if (p >= 22) {
    return {
      nivel: 'moderado',
      color: '#ffcc00',
      titulo: 'Tensión moderada',
      frase: 'Hay algo de desequilibrio, pero dentro de lo normal para este mercado.',
      hacer: 'Condiciones aceptables. Mantenga su gestión de riesgo habitual.'
    };
  }
  return {
    nivel: 'tranquilo',
    color: '#30d158',
    titulo: 'Mercado equilibrado',
    frase: 'El apalancamiento está repartido y nadie está pagando de más por mantenerse.',
    hacer: 'No hay tensión acumulada. Es el entorno más limpio para operar con su plan.'
  };
}

/* Utilidades */
const dinero = (v) => {
  const a = Math.abs(v);
  if (a >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (a >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M';
  if (a >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'K';
  return '$' + v.toFixed(0);
};

const fmt = (p) => {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return p.toFixed(7);
};

const cuando = (ms) => {
  const s = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

/* ══════════════════════════════════════════════════════════════
   ABRIR

   El diseño es deliberadamente distinto a las otras dos: aquí no
   hay gráfico de velas. La pieza central es un medidor circular
   con la puntuación, porque lo que importa no es el precio sino
   la tensión acumulada.
   ══════════════════════════════════════════════════════════════ */
export async function abrirTermometro() {
  estilos();
  const prev = $('tm-overlay'); if (prev) prev.remove();

  T.cargando = true; T.error = null;
  T.senales = []; T.puntuacion = 0;

  const d = document.createElement('div');
  d.id = 'tm-overlay';
  d.innerHTML = `<div class="tm-bg"></div>
    <div class="tm-c">
      <header class="tm-cab">
        <button class="tm-sel" id="tm-sel">
          <i class="tm-logo" data-cg="${esc((PARES.find((p) => p.id === _par) || {}).cg || '')}"></i>
          <b>${esc(_par)}</b>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="tm-tit">Liquidation Pressure</div>
        <div class="tm-der">
          <button class="tm-ico" id="tm-foto" title="Compartir">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l2-2h4l2 2h3a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="3.5"/></svg>
          </button>
          <button class="tm-ico tm-comof" id="tm-ayuda">
            <span class="tm-cf-tx">Cómo funciona</span><span class="tm-cf-s">?</span>
          </button>
          <button class="tm-ico" id="tm-x" aria-label="Cerrar">✕</button>
        </div>
      </header>

      <div class="tm-cuerpo" id="tm-cuerpo">
        <div class="tm-cargando">
          <div class="tm-spin"></div>
          <b>Midiendo la presión del mercado</b>
          <span>Leyendo funding, interés abierto y posicionamiento de todo el mercado.</span>
        </div>
      </div>

      <img class="tm-marca" src="assets/img/cco-marca.webp" alt="">
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => {
    clearInterval(_reloj);
    document.querySelectorAll('#tm-picker').forEach((x) => x.remove());
    const e = $('tm-overlay'); if (e) e.remove();
  };
  d.querySelector('.tm-bg').onclick = cerrar;
  $('tm-x').onclick = cerrar;
  $('tm-ayuda').onclick = () => ayuda();
  $('tm-foto').onclick = () => guardarImagen();
  $('tm-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  ponerLogos();
  arrancar();
}

let _reloj = null;
function arrancar() {
  clearInterval(_reloj);
  const tick = async () => {
    if (!$('tm-cuerpo')) { clearInterval(_reloj); return; }
    try {
      const par = PARES.find((p) => p.id === _par) || PARES[0];
      await cargarTodo(par.s);
      T.cargando = false; T.error = null;
      pintar();
    } catch (_) {
      if (T.cargando) {
        T.error = 'No se pudieron cargar los datos del mercado.';
        pintar();
      }
    }
  };
  tick();
  // Estos datos cambian por horas, no por segundos: cada 45 s sobra
  _reloj = setInterval(tick, 45000);
}

/* ══════════════════════════════════════════════════════════════
   PINTAR

   Tres bloques:
     1. El medidor: cuánta tensión hay, de un vistazo
     2. El veredicto: qué significa y qué hacer
     3. Las señales: por qué lo decimos, una por una
   ══════════════════════════════════════════════════════════════ */
function pintar() {
  const c = $('tm-cuerpo'); if (!c) return;

  if (T.error) {
    c.innerHTML = `<div class="tm-vacio">
      <b>${esc(T.error)}</b>
      <span>Revisa tu conexión y vuelve a intentarlo.</span>
      <button class="tm-btn" id="tm-retry">Reintentar</button>
    </div>`;
    const b = $('tm-retry'); if (b) b.onclick = () => { T.cargando = true; pintar(); arrancar(); };
    return;
  }
  if (T.cargando) return;

  const v = veredicto();
  const p = T.puntuacion;
  // El arco va de -220° a 40°: 260 grados de recorrido
  const ang = -220 + (p / 100) * 260;
  const largo = 2 * Math.PI * 88 * (260 / 360);
  const relleno = largo * (p / 100);

  c.innerHTML = `
    <!-- ══ EL MEDIDOR ══ -->
    <section class="tm-medidor">
      <svg viewBox="0 0 240 190" class="tm-svg">
        <defs>
          <linearGradient id="tmGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stop-color="#30d158"/>
            <stop offset="40%" stop-color="#ffcc00"/>
            <stop offset="70%" stop-color="#ff9500"/>
            <stop offset="100%" stop-color="#ff2d55"/>
          </linearGradient>
          <filter id="tmGlow"><feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        <!-- pista -->
        <circle cx="120" cy="120" r="88" fill="none" stroke="rgba(255,255,255,.06)"
          stroke-width="16" stroke-linecap="round"
          stroke-dasharray="${largo} 999" transform="rotate(-220 120 120)"/>
        <!-- relleno -->
        <circle cx="120" cy="120" r="88" fill="none" stroke="url(#tmGrad)"
          stroke-width="16" stroke-linecap="round" filter="url(#tmGlow)"
          stroke-dasharray="${relleno} 999" transform="rotate(-220 120 120)"
          class="tm-arco"/>
        <!-- aguja -->
        <g transform="translate(120,120) rotate(${ang + 90})">
          <line x1="0" y1="0" x2="0" y2="-70" stroke="${v.color}" stroke-width="3" stroke-linecap="round"/>
          <circle cx="0" cy="0" r="7" fill="#0b0e12" stroke="${v.color}" stroke-width="2.5"/>
        </g>
      </svg>

      <div class="tm-num" style="color:${v.color}">
        <b>${p}</b><i>/100</i>
      </div>
      <div class="tm-nivel" style="color:${v.color}">${esc(v.titulo)}</div>
    </section>

    <!-- ══ EL VEREDICTO ══ -->
    <section class="tm-veredicto n-${v.nivel}">
      <div class="tm-vt">${esc(v.frase)}</div>
      <div class="tm-vh"><b>Qué hacer</b>${esc(v.hacer)}</div>
    </section>

    <!-- ══ LOS CUATRO DATOS ══ -->
    <section class="tm-datos">
      ${caja('Funding', (T.fundingAhora * 100).toFixed(3) + '%',
             T.fundingAhora > 0 ? 'Los largos pagan' : T.fundingAhora < 0 ? 'Los cortos pagan' : 'Neutro',
             T.fundingAhora > 0.0005 ? 'mal' : T.fundingAhora < -0.0005 ? 'mal' : 'bien')}
      ${caja('Posicionamiento', (T.pctLargos || 50).toFixed(0) + '% largos',
             ((100 - (T.pctLargos || 50)).toFixed(0)) + '% cortos',
             (T.pctLargos > 75 || T.pctLargos < 35) ? 'mal' : 'bien')}
      ${caja('Apalancamiento', (T.oiPct || 0).toFixed(0) + '%',
             'de su máximo de 48h',
             T.oiPct > 85 ? 'mal' : T.oiPct > 65 ? 'medio' : 'bien')}
      ${caja('Próximo cobro', T.proximo ? cuando(T.proximo) : '—',
             'se paga el funding',
             'neutro')}
    </section>

    <!-- ══ LAS SEÑALES ══ -->
    ${T.senales && T.senales.length ? `
    <section class="tm-senales">
      <div class="tm-st">Por qué lo decimos</div>
      ${T.senales.map((s) => `
        <div class="tm-senal ${s.peso}">
          <div class="tm-sh">
            <span class="tm-sp">${s.peso === 'alto' ? '● ● ●' : '● ● ○'}</span>
            <b>${esc(s.titulo)}</b>
          </div>
          <div class="tm-sd">${esc(s.txt)}</div>
        </div>`).join('')}
    </section>` : `
    <section class="tm-senales">
      <div class="tm-limpio">
        <b>Sin señales de tensión</b>
        Ninguno de los cuatro indicadores está en zona de riesgo ahora mismo.
      </div>
    </section>`}

    <div class="tm-pie">
      Datos del mercado de futuros de Binance · se actualizan cada 45 segundos
    </div>`;
}

function caja(tit, valor, sub, estado) {
  return `<div class="tm-caja e-${estado}">
    <div class="tm-ct">${esc(tit)}</div>
    <div class="tm-cv">${esc(valor)}</div>
    <div class="tm-cs">${esc(sub)}</div>
  </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SELECTOR DE MONEDA
   ══════════════════════════════════════════════════════════════ */
function menuPares() {
  const prev = document.getElementById('tm-picker');
  if (prev) { prev.remove(); return; }
  const anc = $('tm-sel');
  const m = document.createElement('div');
  m.id = 'tm-picker';
  m.innerHTML = `<input class="tm-buscar" id="tm-buscar" placeholder="Buscar…" autocomplete="off">
    <div class="tm-lista">
      ${PARES.map((p) => `
        <button class="tm-op ${p.id === _par ? 'on' : ''}" data-tp="${p.id}"
                data-busca="${esc((p.id + ' ' + p.n).toLowerCase())}">
          <i class="tm-logo" data-cg="${esc(p.cg)}"></i>
          <b>${esc(p.id)}</b><span>${esc(p.n)}</span>
          ${p.id === _par ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="m20 6-11 11-5-5"/></svg>' : ''}
        </button>`).join('')}
    </div>`;
  document.body.appendChild(m);

  const r = anc.getBoundingClientRect();
  const w = m.offsetWidth || 232;
  m.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left)) + 'px';
  m.style.top = (r.bottom + 6) + 'px';
  setTimeout(ponerLogos, 30);

  m.addEventListener('click', (e) => e.stopPropagation());
  $('tm-buscar').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    m.querySelectorAll('[data-tp]').forEach((x) => {
      x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
    });
  };
  setTimeout(() => { try { $('tm-buscar').focus(); } catch (_) {} }, 60);

  m.querySelectorAll('[data-tp]').forEach((b) => b.onclick = () => {
    _par = b.dataset.tp;
    const bb = anc.querySelector('b'); if (bb) bb.textContent = _par;
    const lg = anc.querySelector('.tm-logo');
    if (lg) { lg.dataset.cg = (PARES.find((x) => x.id === _par) || {}).cg || ''; lg.classList.remove('con'); lg.style.backgroundImage = ''; }
    m.remove();
    T.cargando = true;
    const c = $('tm-cuerpo');
    if (c) c.innerHTML = `<div class="tm-cargando"><div class="tm-spin"></div><b>Midiendo la presión del mercado</b></div>`;
    ponerLogos();
    arrancar();
  });
  setTimeout(() => document.addEventListener('click', () => {
    const x = document.getElementById('tm-picker'); if (x) x.remove();
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
  document.querySelectorAll('.tm-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

/* ══════════════════════════════════════════════════════════════
   LA GUÍA — paso a paso
   ══════════════════════════════════════════════════════════════ */
const PASOS_TM = [
  {
    t: 'El mercado avisa antes de caer',
    d: 'Antes de cada movimiento violento hay señales. No son secretas: <b>Binance las publica gratis</b>. Lo que nadie hace es leerlas juntas y decirle qué significan.',
    x: 'Esta herramienta lo hace por usted y le da un número: cuánta tensión hay acumulada ahora mismo.'
  },
  {
    t: 'Qué es el funding',
    d: 'En los futuros perpetuos, cada 8 horas un lado paga al otro. Si hay más gente apostando al alza, <b>los largos pagan a los cortos</b>.',
    x: 'Cuando ese pago se dispara, mantener la posición sale tan caro que la gente cierra de golpe. Ahí empieza la caída.'
  },
  {
    t: 'Qué es el interés abierto',
    d: 'Es cuánto dinero apalancado hay dentro del mercado. Cuando está en máximos, <b>hay mucha munición para una cascada</b>.',
    x: 'Mucho apalancamiento no significa que vaya a caer. Significa que si cae, caerá más rápido y más lejos.'
  },
  {
    t: 'Qué es el posicionamiento',
    d: 'El porcentaje de cuentas que está largo frente a corto. Cuando el <b>80% está del mismo lado</b>, ya no queda nadie por entrar.',
    x: 'El mercado suele moverse contra la mayoría, precisamente porque la mayoría ya está dentro.'
  },
  {
    t: 'La combinación peligrosa',
    d: 'Los tres por separado son datos. Juntos son una alerta: <b>mayoría larga + pagando funding + interés abierto en máximos</b> es la firma exacta de una purga.',
    x: 'Esa combinación aparece antes de casi todas las caídas del 5% o más. Es lo que mide la puntuación.'
  },
  {
    t: 'Cómo leer el número',
    d: '<b>0 a 22</b> — mercado equilibrado, es el mejor entorno para operar.<br><b>22 a 45</b> — tensión moderada, gestión normal.<br><b>45 a 70</b> — tensión alta, opere con menos tamaño.<br><b>70 a 100</b> — riesgo extremo de purga.',
    x: 'El número no dice hacia dónde va el precio. Dice cuánto puede doler si se mueve.'
  },
  {
    t: 'Qué hacer con esto',
    d: 'No es una señal de compra. Es <b>gestión de riesgo</b>: le dice cuándo el mercado está frágil y cuándo está sano.',
    x: 'Con la puntuación alta, baje apalancamiento y acerque su stop. Con la puntuación baja, opere su plan con normalidad.'
  },
  {
    t: 'Combínelo con las otras dos',
    d: 'Liquidity Pools dice <b>dónde</b> está el dinero atrapado. Institutional Radar dice <b>qué</b> lo está frenando ahora. Este dice <b>cuándo</b> el mercado está a punto de reventar.',
    x: 'Puntuación alta más un muro de liquidez cerca es la combinación más clara que va a encontrar.'
  }
];

let _pasoTm = 0;

function ayuda() {
  _pasoTm = 0;
  const d = document.createElement('div');
  d.id = 'tm-ayuda-box';
  d.innerHTML = `<div class="tm-bg"></div>
    <div class="tma-c">
      <button class="tma-x" id="tma-x" aria-label="Cerrar">✕</button>
      <div class="tma-eyebrow">Liquidation Pressure</div>
      <div id="tma-cuerpo"></div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.tm-bg').onclick = q;
  $('tma-x').onclick = q;
  pasoTm();
}

function pasoTm() {
  const c = $('tma-cuerpo'); if (!c) return;
  const p = PASOS_TM[_pasoTm];
  const ultimo = _pasoTm === PASOS_TM.length - 1;
  c.innerHTML = `
    <div class="tma-card">
      <div class="tma-n">${_pasoTm + 1} <em>de ${PASOS_TM.length}</em></div>
      <div class="tma-t">${p.t}</div>
      <div class="tma-d">${p.d}</div>
      <div class="tma-x2">${p.x}</div>
    </div>
    <div class="tma-puntos">
      ${PASOS_TM.map((_, i) => `<i class="${i === _pasoTm ? 'on' : ''}" data-ptm="${i}"></i>`).join('')}
    </div>
    <div class="tma-acts">
      ${_pasoTm > 0 ? '<button class="tma-atras" id="tma-atras">Atrás</button>' : ''}
      <button class="tma-b" id="tma-sig">${ultimo ? 'Entendido' : 'Saber más'}</button>
    </div>`;
  $('tma-sig').onclick = () => {
    if (ultimo) { document.getElementById('tm-ayuda-box')?.remove(); return; }
    _pasoTm++; pasoTm();
  };
  const at = $('tma-atras');
  if (at) at.onclick = () => { _pasoTm = Math.max(0, _pasoTm - 1); pasoTm(); };
  c.querySelectorAll('[data-ptm]').forEach((b) => b.onclick = () => { _pasoTm = Number(b.dataset.ptm); pasoTm(); });
}

/* ══════════════════════════════════════════════════════════════
   COMPARTIR
   ══════════════════════════════════════════════════════════════ */
function guardarImagen() {
  const zona = document.querySelector('.tm-c');
  if (!zona) return;
  try {
    const v = veredicto();
    const W = 1200, H = 720;
    const cv = document.createElement('canvas');
    cv.width = W * 2; cv.height = H * 2;
    const g = cv.getContext('2d');
    g.scale(2, 2);

    g.fillStyle = '#0a0e14'; g.fillRect(0, 0, W, H);

    // El medidor
    const cx = W / 2, cy = 280, R = 130;
    g.lineWidth = 26; g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,255,255,.07)';
    g.beginPath(); g.arc(cx, cy, R, Math.PI * 0.78, Math.PI * 2.22); g.stroke();
    const grad = g.createLinearGradient(cx - R, cy, cx + R, cy);
    grad.addColorStop(0, '#30d158'); grad.addColorStop(0.45, '#ffcc00');
    grad.addColorStop(0.75, '#ff9500'); grad.addColorStop(1, '#ff2d55');
    g.strokeStyle = grad;
    g.beginPath();
    g.arc(cx, cy, R, Math.PI * 0.78, Math.PI * 0.78 + (Math.PI * 1.44) * (T.puntuacion / 100));
    g.stroke();

    g.fillStyle = v.color;
    g.font = '800 84px system-ui,sans-serif';
    g.textAlign = 'center';
    g.fillText(String(T.puntuacion), cx, cy + 18);
    g.font = '700 24px system-ui,sans-serif';
    g.fillText(v.titulo, cx, cy + 58);

    // El veredicto
    g.fillStyle = '#c8cfd8';
    g.font = '20px system-ui,sans-serif';
    envolver(g, v.frase, cx, 470, W - 180, 30);

    // La franja de marca
    const yB = H - 78;
    g.fillStyle = '#0b0e12'; g.fillRect(0, yB, W, 78);
    g.fillStyle = 'rgba(232,184,75,.35)'; g.fillRect(0, yB, W, 2);

    const textos = (x) => {
      g.textAlign = 'left';
      g.fillStyle = '#E8B84B';
      g.font = '800 19px system-ui,sans-serif';
      g.fillText('Liquidation Pressure', x, yB + 34);
      g.font = '700 14px ui-monospace,monospace';
      g.fillStyle = '#C9A84B';
      g.fillText('CriptoCubaOficial.com', x, yB + 56);
      g.textAlign = 'right';
      g.fillStyle = '#8b96a3';
      g.font = '700 15px ui-monospace,monospace';
      g.fillText(_par, W - 20, yB + 34);
      g.font = '11px ui-monospace,monospace';
      g.fillStyle = '#6b7681';
      g.fillText(new Date().toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }), W - 20, yB + 56);
      g.textAlign = 'left';
    };

    const bajar = () => cv.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `criptocuba-presion-${_par}-${Date.now()}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, 'image/png');

    const logo = new Image();
    let hecho = false;
    const una = (w) => { if (hecho) return; hecho = true; textos(w ? 20 + w + 18 : 20); bajar(); };
    logo.onload = () => {
      try {
        const alto = 52, ancho = Math.round(logo.width * (alto / logo.height));
        g.drawImage(logo, 20, yB + 13, ancho, alto);
        una(ancho);
      } catch (_) { una(0); }
    };
    logo.onerror = () => una(0);
    setTimeout(() => una(0), 1500);
    logo.src = 'assets/img/cco-marca.png';
  } catch (_) {}
}

/** Parte un texto en líneas que quepan. */
function envolver(g, txt, x, y, ancho, alto) {
  const palabras = String(txt).split(' ');
  let linea = '', yy = y;
  palabras.forEach((p) => {
    const prueba = linea + p + ' ';
    if (g.measureText(prueba).width > ancho && linea) {
      g.fillText(linea.trim(), x, yy);
      linea = p + ' '; yy += alto;
    } else linea = prueba;
  });
  if (linea.trim()) g.fillText(linea.trim(), x, yy);
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('tm-css')) return;
  const s = document.createElement('style'); s.id = 'tm-css';
  s.textContent = `
  #tm-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #tm-overlay .tm-bg{position:absolute;inset:0;background:rgba(3,5,8,.95)}
  #tm-overlay .tm-c{position:relative;width:100%;height:100vh;height:100dvh;
    display:flex;flex-direction:column;background:#0a0e14;overflow:hidden}

  /* ── Cabecera ── */
  #tm-overlay .tm-cab{display:flex;align-items:center;gap:12px;flex:0 0 auto;position:relative;
    padding:10px 12px;background:#0b0e12;border-bottom:1px solid #1c2128}
  #tm-overlay .tm-sel{display:inline-flex;align-items:center;gap:9px;flex:0 0 auto;min-height:36px;
    padding:0 12px;border-radius:10px;background:#12161c;border:1px solid #2b3139;color:#eaecef;
    cursor:pointer;font-family:var(--mono,monospace);font-size:12.5px}
  #tm-overlay .tm-sel:hover{border-color:var(--gold-soft,#C9A84B)}
  #tm-overlay .tm-sel svg{width:13px;height:13px;opacity:.6}
  .tm-logo{width:20px;height:20px;border-radius:50%;flex:0 0 auto;display:block;
    background:rgba(255,255,255,.06) center/cover no-repeat;border:1px solid #2b3139}
  .tm-logo.con{background-color:transparent;border-color:transparent}
  #tm-overlay .tm-tit{font-family:var(--mono,monospace);font-size:10.5px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #tm-overlay .tm-der{margin-left:auto;display:flex;gap:6px;flex:0 0 auto}
  #tm-overlay .tm-ico{width:36px;height:36px;min-height:36px;flex:0 0 auto;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;
    background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:14px;font-weight:700}
  #tm-overlay .tm-ico:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}
  #tm-overlay .tm-comof{width:auto;padding:0 14px;border-color:rgba(232,184,75,.4);color:var(--gold,#E8B84B)}
  #tm-overlay .tm-cf-tx{font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;white-space:nowrap}
  #tm-overlay .tm-cf-s{display:none}

  /* ── Cuerpo con desplazamiento ── */
  #tm-overlay .tm-cuerpo{flex:1;min-height:0;overflow-y:auto;padding:18px 16px 30px;
    max-width:760px;width:100%;margin:0 auto}
  #tm-overlay .tm-cargando,#tm-overlay .tm-vacio{display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:12px;min-height:60vh;text-align:center}
  #tm-overlay .tm-spin{width:38px;height:38px;border-radius:50%;
    border:2.5px solid rgba(232,184,75,.16);border-top-color:var(--gold,#E8B84B);
    animation:tmGira .85s linear infinite}
  @keyframes tmGira{to{transform:rotate(360deg)}}
  #tm-overlay .tm-cargando b,#tm-overlay .tm-vacio b{font-family:var(--display,sans-serif);
    font-weight:800;font-size:17px;color:#eaecef}
  #tm-overlay .tm-cargando span,#tm-overlay .tm-vacio span{font-family:var(--sans,sans-serif);
    font-size:13px;color:#7d8794;max-width:34ch;line-height:1.6}
  #tm-overlay .tm-btn{min-height:44px;padding:0 22px;border-radius:11px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;margin-top:6px}

  /* ── El medidor ── */
  #tm-overlay .tm-medidor{position:relative;text-align:center;margin-bottom:6px}
  #tm-overlay .tm-svg{width:100%;max-width:330px;height:auto;display:block;margin:0 auto}
  #tm-overlay .tm-arco{transition:stroke-dasharray .8s cubic-bezier(.34,1.3,.64,1)}
  #tm-overlay .tm-num{position:absolute;left:0;right:0;top:38%;pointer-events:none}
  #tm-overlay .tm-num b{font-family:var(--display,sans-serif);font-weight:800;font-size:64px;line-height:1}
  #tm-overlay .tm-num i{font-style:normal;font-family:var(--mono,monospace);font-size:15px;opacity:.55}
  #tm-overlay .tm-nivel{margin-top:-14px;font-family:var(--display,sans-serif);
    font-weight:800;font-size:19px;letter-spacing:.2px}

  /* ── El veredicto ── */
  #tm-overlay .tm-veredicto{margin:18px 0;padding:18px 20px;border-radius:16px;
    background:rgba(255,255,255,.03);border:1px solid #232a33}
  #tm-overlay .tm-veredicto.n-extremo{background:linear-gradient(150deg,rgba(255,45,85,.14),rgba(255,255,255,.015));
    border-color:rgba(255,45,85,.38)}
  #tm-overlay .tm-veredicto.n-alto{background:linear-gradient(150deg,rgba(255,149,0,.12),rgba(255,255,255,.015));
    border-color:rgba(255,149,0,.34)}
  #tm-overlay .tm-veredicto.n-moderado{background:linear-gradient(150deg,rgba(255,204,0,.09),rgba(255,255,255,.015));
    border-color:rgba(255,204,0,.28)}
  #tm-overlay .tm-veredicto.n-tranquilo{background:linear-gradient(150deg,rgba(48,209,88,.1),rgba(255,255,255,.015));
    border-color:rgba(48,209,88,.3)}
  #tm-overlay .tm-vt{font-family:var(--sans,sans-serif);font-size:15px;color:#eaecef;
    line-height:1.6;margin-bottom:14px}
  #tm-overlay .tm-vh{padding:13px 15px;border-radius:11px;background:rgba(0,0,0,.28);
    font-family:var(--sans,sans-serif);font-size:13.5px;color:#b7bdc6;line-height:1.6}
  #tm-overlay .tm-vh b{display:block;font-family:var(--mono,monospace);font-size:9.5px;
    color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:1.4px;margin-bottom:5px}

  /* ── Los cuatro datos ── */
  #tm-overlay .tm-datos{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:20px}
  #tm-overlay .tm-caja{padding:13px 11px;border-radius:13px;text-align:center;
    background:rgba(255,255,255,.03);border:1px solid #232a33}
  #tm-overlay .tm-caja.e-mal{border-color:rgba(255,45,85,.35);background:rgba(255,45,85,.07)}
  #tm-overlay .tm-caja.e-medio{border-color:rgba(255,149,0,.3);background:rgba(255,149,0,.06)}
  #tm-overlay .tm-caja.e-bien{border-color:rgba(48,209,88,.26);background:rgba(48,209,88,.05)}
  #tm-overlay .tm-ct{font-family:var(--mono,monospace);font-size:8.5px;color:#5c6672;
    text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
  #tm-overlay .tm-cv{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;
    color:#eaecef;line-height:1.1;margin-bottom:4px}
  #tm-overlay .tm-cs{font-family:var(--sans,sans-serif);font-size:10.5px;color:#7d8794;line-height:1.3}

  /* ── Las señales ── */
  #tm-overlay .tm-st{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:1.6px;margin-bottom:11px}
  #tm-overlay .tm-senal{margin-bottom:9px;padding:14px 16px;border-radius:13px;
    background:rgba(255,255,255,.028);border:1px solid #232a33;border-left-width:3px}
  #tm-overlay .tm-senal.alto{border-left-color:#ff2d55}
  #tm-overlay .tm-senal.medio{border-left-color:#ff9500}
  #tm-overlay .tm-sh{display:flex;align-items:center;gap:9px;margin-bottom:6px}
  #tm-overlay .tm-sp{font-size:7px;letter-spacing:1.5px;color:#ff2d55}
  #tm-overlay .medio .tm-sp{color:#ff9500}
  #tm-overlay .tm-sh b{font-family:var(--display,sans-serif);font-weight:800;font-size:14.5px;color:#eaecef}
  #tm-overlay .tm-sd{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6}
  #tm-overlay .tm-limpio{padding:18px;border-radius:13px;text-align:center;
    background:rgba(48,209,88,.06);border:1px solid rgba(48,209,88,.24);
    font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6}
  #tm-overlay .tm-limpio b{display:block;font-family:var(--display,sans-serif);
    font-size:15px;color:#30d158;margin-bottom:5px}
  #tm-overlay .tm-pie{margin-top:20px;text-align:center;font-family:var(--mono,monospace);
    font-size:9.5px;color:#4a525c;letter-spacing:.4px}
  #tm-overlay .tm-marca{position:absolute;left:14px;bottom:12px;height:26px;width:auto;
    opacity:.4;pointer-events:none}

  /* ── Selector ── */
  #tm-picker{position:fixed;z-index:9790;min-width:232px;max-height:340px;overflow:hidden;
    display:flex;flex-direction:column;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:13px;padding:6px;
    box-shadow:0 16px 44px rgba(0,0,0,.72)}
  #tm-picker .tm-buscar{width:100%;box-sizing:border-box;padding:9px 11px;margin-bottom:6px;
    border-radius:9px;border:1px solid #2b3139;background:#0b0e12;color:#eaecef;
    font-family:var(--sans,sans-serif);font-size:13px;min-height:38px}
  #tm-picker .tm-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #tm-picker .tm-lista{overflow-y:auto;display:flex;flex-direction:column;gap:2px}
  #tm-picker .tm-op{display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;
    border-radius:9px;background:transparent;border:none;color:#b7bdc6;cursor:pointer;
    text-align:left;min-height:42px}
  #tm-picker .tm-op:hover{background:rgba(255,255,255,.05)}
  #tm-picker .tm-op.on{background:rgba(232,184,75,.1);color:var(--gold,#E8B84B)}
  #tm-picker .tm-op b{font-family:var(--mono,monospace);font-size:12px;font-weight:700;min-width:46px}
  #tm-picker .tm-op span{flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #tm-picker .tm-op svg{width:14px;height:14px;flex:0 0 auto;color:var(--gold,#E8B84B)}

  /* ── Ayuda ── */
  #tm-ayuda-box{position:fixed;inset:0;z-index:9770;display:flex;align-items:center;justify-content:center;padding:16px}
  #tm-ayuda-box .tm-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #tm-ayuda-box .tma-c{position:relative;width:100%;max-width:540px;max-height:calc(100vh - 32px);
    overflow-y:auto;background:linear-gradient(180deg,#161b22,#0b0e12);
    border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:24px 20px}
  #tm-ayuda-box .tma-x{position:absolute;top:14px;right:14px;width:36px;height:36px;border-radius:10px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:15px;z-index:5;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6}
  #tm-ayuda-box .tma-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:2px;text-align:center;margin-bottom:18px}
  #tm-ayuda-box .tma-card{padding:24px 20px;border-radius:16px;text-align:center;margin-bottom:18px;
    background:linear-gradient(165deg,rgba(232,184,75,.08),rgba(255,255,255,.015));
    border:1px solid rgba(232,184,75,.26)}
  #tm-ayuda-box .tma-n{font-family:var(--mono,monospace);font-size:11px;color:var(--gold,#E8B84B);
    font-weight:700;margin-bottom:10px}
  #tm-ayuda-box .tma-n em{font-style:normal;color:#5c6672;font-weight:400}
  #tm-ayuda-box .tma-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;
    color:#eaecef;margin-bottom:12px;line-height:1.25}
  #tm-ayuda-box .tma-d{font-family:var(--sans,sans-serif);font-size:14px;color:#b7bdc6;
    line-height:1.7;margin-bottom:14px}
  #tm-ayuda-box .tma-d b{color:var(--gold,#E8B84B);font-weight:700}
  #tm-ayuda-box .tma-x2{padding:12px 14px;border-radius:11px;background:rgba(255,255,255,.035);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);
    font-size:12.5px;color:#8b96a3;line-height:1.55;text-align:left}
  #tm-ayuda-box .tma-puntos{display:flex;gap:5px;justify-content:center;margin-bottom:18px}
  #tm-ayuda-box .tma-puntos i{width:7px;height:7px;border-radius:50%;background:#2b3139;cursor:pointer;
    transition:background .18s,transform .18s}
  #tm-ayuda-box .tma-puntos i.on{background:var(--gold,#E8B84B);transform:scale(1.35)}
  #tm-ayuda-box .tma-acts{display:flex;gap:9px}
  #tm-ayuda-box .tma-atras{flex:0 0 auto;min-height:48px;padding:0 20px;border-radius:12px;
    background:transparent;border:1px solid #2b3139;color:#8b96a3;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:700;font-size:13px}
  #tm-ayuda-box .tma-b{flex:1;min-height:48px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;
    box-shadow:0 4px 0 #8f6a1a}

  @media(max-width:640px){
    #tm-overlay .tm-cab{padding:9px 10px;gap:8px}
    #tm-overlay .tm-tit{display:none}
    #tm-overlay .tm-comof{width:36px;padding:0}
    #tm-overlay .tm-cf-tx{display:none}
    #tm-overlay .tm-cf-s{display:block}
    #tm-overlay .tm-cuerpo{padding:14px 11px 26px}
    #tm-overlay .tm-num b{font-size:52px}
    #tm-overlay .tm-nivel{font-size:16px;margin-top:-18px}
    #tm-overlay .tm-datos{grid-template-columns:repeat(2,1fr)}
    #tm-overlay .tm-vt{font-size:14px}
    #tm-overlay .tm-marca{height:20px;left:10px;bottom:8px}
    #tm-ayuda-box .tma-c{padding:20px 14px}
  }`;
  document.head.appendChild(s);
}
