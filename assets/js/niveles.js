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
  { id: 'ATOM',  s: 'ATOMUSDT',  n: 'Cosmos',     cg: 'cosmos' }
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
  const altos = [], bajos = [];
  for (let i = lado; i < velas.length - lado; i++) {
    let esAlto = true, esBajo = true;
    for (let j = i - lado; j <= i + lado; j++) {
      if (j === i) continue;
      if (velas[j].h >= velas[i].h) esAlto = false;
      if (velas[j].l <= velas[i].l) esBajo = false;
    }
    if (esAlto) altos.push({ i, p: velas[i].h, t: velas[i].t });
    if (esBajo) bajos.push({ i, p: velas[i].l, t: velas[i].t });
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
  if (ua.length < 2 || ub.length < 2) return { dir: 'indefinida', fuerza: 0 };

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
  const volTotal = velas.reduce((a, v) => a + v.v, 0);
  grupos.forEach((g) => {
    let vol = 0;
    velas.forEach((v) => {
      if (v.l <= g.p + tolerancia && v.h >= g.p - tolerancia) vol += v.v;
    });
    g.vol = vol;
    g.volPct = volTotal > 0 ? (vol / volTotal) * 100 : 0;
    g.dist = ((g.p - precio) / precio) * 100;
    g.frescura = velas.length > 0 ? g.ultimo / velas.length : 0;

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
  return grupos
    .filter((g) => g.toques >= 2 && g.fuerza >= 45 && Math.abs(g.dist) > 0.15 && Math.abs(g.dist) < 12)
    .sort((a, b) => b.fuerza - a.fuerza)
    .slice(0, 6)
    .sort((a, b) => b.p - a.p);
}

/* ══════════════════════════════════════════════════════════════
   5. LA LECTURA — qué decirle al usuario

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

    if (d < 2.5) {
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
    if (d < 2.5) {
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
  if (!msgs.length) {
    const haciaS = sCerca ? Math.abs(sCerca.dist) : null;
    const haciaR = rCerca ? Math.abs(rCerca.dist) : null;
    msgs.push({
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

  N.mensajes = msgs;
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
          <button class="nv-ico nv-comof" id="nv-ayuda">
            <span class="nv-cf-tx">Cómo funciona</span><span class="nv-cf-s">?</span>
          </button>
          <button class="nv-ico" id="nv-x" aria-label="Cerrar">✕</button>
        </div>
      </header>

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
  };
  d.querySelector('.nv-bg').onclick = cerrar;
  $('nv-x').onclick = cerrar;
  $('nv-ayuda').onclick = () => ayuda();
  $('nv-foto').onclick = () => guardarImagen();
  $('nv-sel').onclick = (e) => { e.stopPropagation(); menuPares(); };

  d.querySelectorAll('[data-ntf]').forEach((b) => b.onclick = () => {
    _tf = b.dataset.ntf;
    d.querySelectorAll('[data-ntf]').forEach((x) => x.classList.toggle('on', x.dataset.ntf === _tf));
    N.vista.desde = 0;
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

async function recargar() {
  clearInterval(_reloj);
  N.cargando = true; N.error = null;
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
      N.cargando = false; N.error = null;
      dibujar();
      burbujas();
      pintarEstado();
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
  const e = $('nv-estado'); if (!e) return;
  const t = N.tendencia || { dir: 'indefinida' };
  const cls = t.dir === 'alcista' ? 'sube' : t.dir === 'bajista' ? 'baja' : 'lat';
  const txt = N.rango ? 'En rango' : nombreTend(t.dir);
  e.innerHTML = `<span class="nv-pill ${cls}">${esc(txt.charAt(0).toUpperCase() + txt.slice(1))}</span>
    <span class="nv-precio">${fmt(N.precio)}</span>`;
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

function dibujar() {
  const cv = $('nv-cv'); const zona = $('nv-graf');
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
  g.fillStyle = '#0b0f16';
  g.fillRect(0, 0, W, H);

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

  const total = N.velas.length;
  const ancho = Math.max(20, Math.min(total, N.vista.ancho));
  const desp = Math.min(N.vista.desde, Math.max(0, total - ancho));
  const fin = total - desp;
  const vis = N.velas.slice(Math.max(0, fin - ancho), fin);
  if (!vis.length) return;

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

  _geo = { W, H, x1, y1, pMax, pMin, Y, vis, ancho };

  /* ── Rejilla suave ── */
  g.strokeStyle = 'rgba(255,255,255,.028)';
  g.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const y = (y1 / 6) * i;
    g.beginPath(); g.moveTo(0, y); g.lineTo(x1, y); g.stroke();
  }

  /* ══ LOS NIVELES ══
     Lo primero que se dibuja, para que las velas queden encima. */
  N.niveles.forEach((n) => {
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
    const txt = (esS ? 'COMPRA ' : 'VENDE ') + fmt(n.p) + '  ·  ' + n.toques + (n.toques === 1 ? ' toque' : ' toques');
    g.font = 'bold 11px ui-monospace,monospace';
    const w = g.measureText(txt).width + 20;
    const yEt = y - 15;                      // desplazada arriba
    g.fillStyle = col;
    redondeado(g, 10, yEt - 10, w, 20, 6); g.fill();
    g.fillStyle = esS ? '#04210f' : '#2a0509';
    g.textAlign = 'left';
    g.fillText(txt, 20, yEt + 4);
  });

  /* ══ LAS VELAS ══ */
  const paso = x1 / vis.length;
  const cuerpo = Math.max(1.4, paso * 0.66);
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
    if (N.niveles.some((n) => Math.abs(Y(n.p) - y) < 14)) continue;
    g.fillStyle = '#4a525c';
    g.fillText(fmt(p), x1 + 7, y + 3.5);
  }
  // Los niveles también marcan la escala
  N.niveles.forEach((n) => {
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
   LAS BURBUJAS DEL ASISTENTE

   Van ancladas al precio del que hablan: si la gráfica se mueve o
   se estira, ellas siguen a su nivel. Nunca se despegan.
   ══════════════════════════════════════════════════════════════ */
function burbujas() {
  const caja = $('nv-burbujas');
  if (!caja || !_geo || N.cargando) return;
  if (!N.mensajes.length) { caja.innerHTML = ''; return; }

  const { Y, pMin, pMax, x1, y1 } = _geo;

  /* La firma dice si hay que rehacer el HTML. Si solo cambió la
     posición, se mueven las burbujas sin recrearlas: así no
     parpadean ni se reinicia la escritura del texto. */
  const firma = N.mensajes.map((m) => m.titulo + '|' + m.txt).join('~');
  const rehacer = caja.dataset.firma !== firma;

  const puestas = [];
  const posiciones = N.mensajes.map((m) => {
    let y = (m.p >= pMin && m.p <= pMax) ? Y(m.p) : y1 * 0.35;
    let intentos = 0;
    while (puestas.some((p) => Math.abs(p - y) < 130) && intentos < 8) {
      y += 136; intentos++;
      if (y > y1 - 110) y = 60 + intentos * 22;
    }
    y = Math.max(50, Math.min(y1 - 110, y));
    puestas.push(y);
    return { y, ancla: (m.p >= pMin && m.p <= pMax) ? Y(m.p) : null };
  });

  if (!rehacer) {
    // Solo recolocar: las burbujas siguen a su nivel sin parpadear
    caja.querySelectorAll('.nv-b').forEach((el, i) => {
      const pos = posiciones[i];
      if (!pos) return;
      el.style.top = pos.y + 'px';
      const cola = el.querySelector('.nv-cola');
      const guia = el.querySelector('.nv-guia');
      if (cola && pos.ancla != null) {
        cola.style.setProperty('--dy', (pos.ancla - pos.y) + 'px');
      }
      if (guia && pos.ancla != null) {
        const dy = pos.ancla - pos.y - 26;
        guia.style.height = Math.abs(dy) + 'px';
        guia.style.top = (dy > 0 ? 26 : 26 + dy) + 'px';
      }
    });
    return;
  }

  caja.dataset.firma = firma;
  const icono = { compra: '▲', venta: '▼', vigilar: '◆', aviso: '✱', tendencia: '➜' };

  caja.innerHTML = N.mensajes.map((m, idx) => {
    const pos = posiciones[idx];
    const anclada = pos.ancla != null;
    const dy = anclada ? pos.ancla - pos.y - 26 : 0;

    return `
    <div class="nv-b t-${m.tipo}" style="top:${pos.y}px" data-nvb="${idx}">
      ${anclada ? `<span class="nv-guia" style="height:${Math.abs(dy)}px;top:${dy > 0 ? 26 : 26 + dy}px"></span>
                   <span class="nv-punto" style="top:${26 + dy}px"></span>` : ''}
      <span class="nv-cola"></span>

      <div class="nv-b-cab">
        <img class="nv-ava" src="assets/img/jesus-avatar.webp" alt="">
        <div class="nv-quien">
          <b>Jesús</b>
          <span>${esc(m.titulo)}</span>
        </div>
        <span class="nv-b-fl">▾</span>
      </div>

      <div class="nv-b-tx" data-escribir="${esc(m.txt)}"></div>
      <div class="nv-b-hacer">${esc(m.hacer)}</div>
      <div class="nv-b-det">
        <div class="nv-b-det-t">Por qué lo digo</div>
        ${(m.detalle || []).map((x) => `<div class="nv-b-li">${esc(x)}</div>`).join('')}
      </div>
    </div>`;
  }).join('');

  /* El texto se escribe, como si lo estuviera tecleando. */
  caja.querySelectorAll('[data-escribir]').forEach((el, i) => {
    const txt = el.dataset.escribir;
    let n = 0;
    setTimeout(() => {
      const t = setInterval(() => {
        n += 2;
        el.textContent = txt.slice(0, n);
        if (n >= txt.length) { el.textContent = txt; clearInterval(t); }
      }, 14);
    }, 220 * i);
  });

  caja.querySelectorAll('[data-nvb]').forEach((b) => {
    b.querySelector('.nv-b-cab').onclick = (e) => {
      e.stopPropagation();
      b.classList.toggle('abierta');
      /* Si al abrirse se sale por abajo, se sube para que quepa. */
      setTimeout(() => {
        const r = b.getBoundingClientRect();
        const lim = (_geo && _geo.y1) || window.innerHeight;
        const cajaR = caja.getBoundingClientRect();
        if (r.bottom > cajaR.top + lim - 10) {
          const exceso = r.bottom - (cajaR.top + lim - 10);
          const actual = parseFloat(b.style.top) || 0;
          b.style.top = Math.max(50, actual - exceso) + 'px';
        }
      }, 30);
    };
  });
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
  const refrescar = () => { dibujar(); burbujas(); };

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
      N.vista.desde = Math.max(0, Math.min(Math.max(0, N.velas.length - 20), N.vista.desde + d));
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
        N.vista.desde = Math.max(0, Math.min(Math.max(0, N.velas.length - 20), N.vista.desde + d));
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
   SELECTOR DE MONEDA
   ══════════════════════════════════════════════════════════════ */
function menuPares() {
  const prev = document.getElementById('nv-picker');
  if (prev) { prev.remove(); return; }
  const anc = $('nv-sel');
  const m = document.createElement('div');
  m.id = 'nv-picker';
  m.innerHTML = `<input class="nv-buscar" id="nv-buscar" placeholder="Buscar…" autocomplete="off">
    <div class="nv-lista-mon">
      ${PARES.map((p) => `
        <button class="nv-op ${p.id === _par ? 'on' : ''}" data-np="${p.id}"
                data-busca="${esc((p.id + ' ' + p.n).toLowerCase())}">
          <i class="nv-logo" data-cg="${esc(p.cg)}"></i>
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
  $('nv-buscar').oninput = (e) => {
    const q = e.target.value.toLowerCase().trim();
    m.querySelectorAll('[data-np]').forEach((x) => {
      x.style.display = !q || x.dataset.busca.includes(q) ? '' : 'none';
    });
  };
  setTimeout(() => { try { $('nv-buscar').focus(); } catch (_) {} }, 60);

  m.querySelectorAll('[data-np]').forEach((b) => b.onclick = () => {
    _par = b.dataset.np;
    const bb = anc.querySelector('b'); if (bb) bb.textContent = _par;
    const lg = anc.querySelector('.nv-logo');
    if (lg) { lg.dataset.cg = (PARES.find((x) => x.id === _par) || {}).cg || ''; lg.classList.remove('con'); lg.style.backgroundImage = ''; }
    m.remove();
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
  const marca = document.querySelector('.nv-marca');
  const antes = marca ? marca.style.display : null;
  if (marca) marca.style.display = 'none';
  const devolver = () => { if (marca) marca.style.display = antes || ''; };

  try {
    const e2 = cv.width / cv.clientWidth;
    const barra = 78 * e2;
    const out = document.createElement('canvas');
    out.width = cv.width; out.height = cv.height + barra;
    const g = out.getContext('2d');
    g.fillStyle = '#0b0f16'; g.fillRect(0, 0, out.width, out.height);
    g.drawImage(cv, 0, 0);

    const yB = cv.height;
    g.fillStyle = '#0b0e12'; g.fillRect(0, yB, out.width, barra);
    g.fillStyle = 'rgba(232,184,75,.35)'; g.fillRect(0, yB, out.width, 2 * e2);

    const textos = (x) => {
      g.textAlign = 'left';
      g.fillStyle = '#E8B84B';
      g.font = `800 ${19 * e2}px system-ui,sans-serif`;
      g.fillText('Smart Levels', x, yB + 34 * e2);
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
      a.href = url; a.download = `criptocuba-niveles-${_par}-${Date.now()}.png`;
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
  if ($('nv-css')) return;
  const s = document.createElement('style'); s.id = 'nv-css';
  s.textContent = `
  #nv-overlay{position:fixed;inset:0;z-index:9740;display:flex;align-items:center;justify-content:center}
  #nv-overlay .nv-bg{position:absolute;inset:0;background:rgba(3,5,8,.95)}
  #nv-overlay .nv-c{position:relative;width:100%;height:100vh;height:100dvh;
    display:flex;flex-direction:column;background:#0b0f16}

  /* ── Cabecera ── */
  #nv-overlay .nv-cab{display:flex;align-items:center;gap:11px;flex:0 0 auto;
    padding:9px 12px;background:#0a0d13;border-bottom:1px solid #1a1f28;
    overflow-x:auto;scrollbar-width:none}
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

  /* ── La gráfica ocupa todo ── */
  #nv-overlay .nv-graf{flex:1;min-height:0;position:relative;background:#0b0f16}
  #nv-overlay .nv-cv{display:block}

  /* El logo: se tiene que ver que somos nosotros */
  #nv-overlay .nv-marca{position:absolute;left:16px;bottom:40px;height:34px;width:auto;
    opacity:.82;pointer-events:none;filter:drop-shadow(0 2px 9px rgba(0,0,0,.95))}

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
     LAS BURBUJAS DEL ASISTENTE
     Van sobre la gráfica, ancladas a su precio. Con su colita,
     como un bocadillo de conversación.
     ══════════════════════════════════════════════════════════ */
  #nv-overlay .nv-burbujas{position:absolute;inset:0;pointer-events:none;z-index:5}
  #nv-overlay .nv-b{position:absolute;right:100px;width:min(352px, calc(100% - 130px));
    max-height:calc(100% - 70px);overflow-y:auto;overscroll-behavior:contain;
    pointer-events:auto;border-radius:15px;padding:13px 15px;cursor:default;
    background:linear-gradient(165deg,rgba(22,28,38,.97),rgba(13,17,23,.97));
    border:1px solid #2b3139;backdrop-filter:blur(10px);
    box-shadow:0 10px 32px rgba(0,0,0,.6);animation:nvEntra .35s ease both}
  @keyframes nvEntra{from{opacity:0;transform:translateX(14px) scale(.97)}to{opacity:1;transform:none}}
  #nv-overlay .nv-b.t-compra{border-color:rgba(46,232,106,.5);
    background:linear-gradient(165deg,rgba(10,56,32,.97),rgba(13,17,23,.97))}
  #nv-overlay .nv-b.t-venta{border-color:rgba(246,70,93,.5);
    background:linear-gradient(165deg,rgba(66,14,22,.97),rgba(13,17,23,.97))}
  #nv-overlay .nv-b.t-aviso{border-color:rgba(232,184,75,.45)}
  #nv-overlay .nv-b.t-tendencia{border-color:rgba(77,159,255,.42)}

  /* La colita que apunta al nivel */
  #nv-overlay .nv-cola{position:absolute;left:-9px;top:22px;width:0;height:0;
    border-top:8px solid transparent;border-bottom:8px solid transparent;
    border-right:9px solid #2b3139;z-index:2}
  #nv-overlay .t-compra .nv-cola{border-right-color:rgba(46,232,106,.5)}
  #nv-overlay .t-venta .nv-cola{border-right-color:rgba(246,70,93,.5)}
  #nv-overlay .t-aviso .nv-cola{border-right-color:rgba(232,184,75,.45)}

  /* La cabecera con el avatar: es Jesús quien habla */
  #nv-overlay .nv-b-cab{display:flex;align-items:center;gap:10px;cursor:pointer}
  #nv-overlay .nv-ava{width:34px;height:34px;border-radius:50%;flex:0 0 auto;object-fit:cover;
    border:1.5px solid rgba(232,184,75,.6);background:#141922}
  #nv-overlay .nv-quien{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
  #nv-overlay .nv-quien b{font-family:var(--display,sans-serif);font-weight:800;font-size:13px;
    color:var(--gold,#E8B84B);line-height:1.1}
  #nv-overlay .nv-quien span{font-family:var(--display,sans-serif);font-weight:700;font-size:14px;
    color:#eaecef;line-height:1.2;overflow-wrap:anywhere}

  /* La guía que apunta al nivel del que habla */
  #nv-overlay .nv-guia{position:absolute;left:-1px;width:2px;
    background:linear-gradient(180deg,transparent,currentColor,transparent);opacity:.5}
  #nv-overlay .nv-punto{position:absolute;left:-5px;width:10px;height:10px;border-radius:50%;
    background:currentColor;box-shadow:0 0 0 3px rgba(0,0,0,.5);animation:nvLate 1.8s ease-in-out infinite}
  @keyframes nvLate{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.25);opacity:.6}}
  #nv-overlay .t-compra{color:#2ee86a}
  #nv-overlay .t-venta{color:#f6465d}
  #nv-overlay .t-aviso{color:#E8B84B}
  #nv-overlay .t-tendencia{color:#4d9fff}
  #nv-overlay .t-vigilar{color:#9aa5b1}
  #nv-overlay .nv-b-fl{font-size:10px;color:#5c6672;transition:transform .2s}
  #nv-overlay .nv-b.abierta .nv-b-fl{transform:rotate(180deg)}
  #nv-overlay .nv-b-tx{min-height:34px;margin-top:8px;font-family:var(--sans,sans-serif);font-size:12.5px;
    color:#b7bdc6;line-height:1.55}
  #nv-overlay .nv-b-hacer{margin-top:9px;padding:10px 12px;border-radius:10px;
    background:rgba(0,0,0,.32);border-left:2px solid rgba(232,184,75,.6);
    font-family:var(--sans,sans-serif);font-size:12px;color:#e2e8ee;line-height:1.5}
  #nv-overlay .nv-b-det{display:none;margin-top:10px;padding-top:10px;
    border-top:1px solid rgba(255,255,255,.08)}
  #nv-overlay .nv-b.abierta .nv-b-det{display:block;animation:nvAbre .2s ease both}
  @keyframes nvAbre{from{opacity:0}to{opacity:1}}
  #nv-overlay .nv-b-det-t{font-family:var(--mono,monospace);font-size:9px;color:var(--gold,#E8B84B);
    text-transform:uppercase;letter-spacing:1.3px;margin-bottom:7px}
  #nv-overlay .nv-b-li{font-family:var(--mono,monospace);font-size:11px;color:#8b96a3;
    line-height:1.7;padding-left:12px;position:relative}
  #nv-overlay .nv-b-li:before{content:'·';position:absolute;left:2px;color:#5c6672}

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

  @media(max-width:760px){
    #nv-overlay .nv-cab{padding:8px 10px;gap:8px}
    #nv-overlay .nv-comof{width:36px;padding:0}
    #nv-overlay .nv-cf-tx{display:none}
    #nv-overlay .nv-cf-s{display:block}
    #nv-overlay .nv-precio{font-size:15px}
    #nv-overlay .nv-b{right:auto;left:10px;width:calc(100% - 100px);padding:11px 13px}
    #nv-overlay .nv-cola{left:auto;right:-9px;border-right:none;
      border-left:9px solid #2b3139}
    #nv-overlay .t-compra .nv-cola{border-left-color:rgba(46,232,106,.5)}
    #nv-overlay .t-venta .nv-cola{border-left-color:rgba(246,70,93,.5)}
    #nv-overlay .t-aviso .nv-cola{border-left-color:rgba(232,184,75,.45)}
    #nv-overlay .nv-b-cab b{font-size:13px}
    #nv-overlay .nv-b-tx{font-size:11.5px}
    #nv-overlay .nv-marca{height:26px;left:10px;bottom:34px}
    #nv-ayuda-box .nva-c{padding:20px 14px}
  }`;
  document.head.appendChild(s);
}
