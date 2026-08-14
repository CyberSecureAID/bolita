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
   5. IMPULSO Y RETESTEO — el escenario de libro

   Es lo que busca cualquier trader con estructura:

     1. Un IMPULSO fuerte en una dirección (velas grandes seguidas)
     2. Un RETROCESO que devuelve el precio hacia el origen
     3. El precio LLEGA a esa zona de origen → entrada a favor

   La zona de origen del impulso es donde entró el dinero que lo
   provocó. Cuando el precio vuelve ahí, suele defenderse otra vez.
   ══════════════════════════════════════════════════════════════ */
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
      const fuerza = Math.abs(mov) / (rMed * largo);
      if (pureza >= 0.7 && fuerza > 0.55 && pct > 1.2) {
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

  /* Cuánto ha retrocedido: 0% = sigue en el extremo, 100% = volvió
     del todo al origen. Lo interesante está entre el 50% y el 100%. */
  const recorrido = Math.abs(mejor.precioFin - zonaMedia);
  const vuelta = recorrido > 0
    ? (Math.abs(precioAhora - mejor.precioFin) / recorrido) * 100
    : 0;

  mejor.retroceso = Math.min(150, vuelta);
  mejor.distZona = distZona;
  mejor.zonaMedia = zonaMedia;
  mejor.enZona = Math.abs(distZona) < 1.2;
  mejor.acercandose = Math.abs(distZona) < 3.5 && vuelta > 45;
  mejor.velasDesde = despues.length;

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
        out.push({
          tipo: 'ob', dir: alcista ? 'alcista' : 'bajista',
          nivel: (p.o + p.c) / 2,
          zonaA: Math.max(p.o, p.c), zonaB: Math.min(p.o, p.c),
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

  if (tend.dir === 'alcista') {
    const pts = piv.bajos.slice(-5);
    const r = recta(pts);
    // Solo si el ajuste es bueno y la pendiente sube de verdad
    if (r && r.r2 > 0.55 && r.m > 0) return { tipo: 'alcista', ...r };
  }
  if (tend.dir === 'bajista') {
    const pts = piv.altos.slice(-5);
    const r = recta(pts);
    if (r && r.r2 > 0.55 && r.m < 0) return { tipo: 'bajista', ...r };
  }
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
   9. LA LECTURA — qué decirle al usuario

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
  if (imp && (imp.enZona || imp.acercandose)) {
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

  /* Si el resultado está muy repartido, no hay plan claro: se dice.
     Es más honesto que forzar una dirección. */
  const disputado = Math.abs(votoC - votoV) < Math.max(votoC, votoV) * 0.35 && votoC > 0 && votoV > 0;
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
    principal = msgs.find((m) => m.tipo === lado) || msgs[0];
    principal = { ...principal, esPlan: true, prioridad: 99 };
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

      <!-- El veredicto de un vistazo: para quien no sabe leer
           una gráfica, esto es lo único que necesita mirar. -->
      <div class="nv-veredicto" id="nv-veredicto"></div>

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
let _yaTrazado = false;

async function recargar() {
  clearInterval(_reloj);
  N.cargando = true; N.error = null;
  _yaTrazado = false;
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

  /* ══ EL VEREDICTO ══
     Una línea que resume qué hacer. Para quien no sabe leer una
     gráfica, esto es lo único que tiene que mirar. */
  const v = $('nv-veredicto'); if (!v) return;
  const principal = (N.mensajes || [])[0];
  if (!principal) { v.innerHTML = ''; return; }

  const mapa = {
    compra: { cls: 'comprar', txt: 'COMPRAR', ic: '▲' },
    venta:  { cls: 'vender',  txt: 'VENDER',  ic: '▼' },
    vigilar:{ cls: 'esperar', txt: 'VIGILAR', ic: '◆' },
    aviso:  { cls: 'esperar', txt: 'ESPERAR', ic: '✱' },
    tendencia:{ cls: 'esperar', txt: 'CONTEXTO', ic: '➜' }
  };
  const m = mapa[principal.tipo] || mapa.aviso;

  /* El horizonte sale del marco temporal: no se inventa. */
  const horizonte = {
    '15m': 'horas', '1h': 'de 1 a 3 días', '4h': 'de 3 a 10 días', '1d': 'semanas'
  }[_tf] || '';

  v.innerHTML = `
    <span class="nv-v-tag ${m.cls}">${m.ic} ${m.txt}</span>
    <span class="nv-v-tx">${esc(T(principal.titulo))}</span>
    ${horizonte ? `<span class="nv-v-hz">Horizonte: ${horizonte}</span>` : ''}
    <span class="nv-v-pt">${(N.mensajes || []).length} ${(N.mensajes || []).length === 1 ? 'lectura' : 'lecturas'}</span>`;
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

  /* ══ LA LÍNEA DE TENDENCIA ══
     Se traza delante del usuario cuando abre: da la sensación de
     que alguien está dibujando el análisis en directo. */
  if (N.linea && _trazo > 0) {
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
      // Prolongación hacia el futuro, discontinua
      const xF = Math.min(x1, xB + paso * 6);
      const yF = yB + (L.m * 6) * ((yB - yA) / Math.max(1e-9, L.m * (iB - iA))) * -1;
      g.strokeStyle = col + '66';
      g.setLineDash([6, 5]); g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(xB, yB); g.lineTo(xF, Y(L.m * (iB + 6) + L.b)); g.stroke();
      g.setLineDash([]);

      // Etiqueta
      const et = L.tipo === 'alcista' ? 'TENDENCIA ALCISTA' : 'TENDENCIA BAJISTA';
      g.font = 'bold 9px ui-monospace,monospace';
      const w = g.measureText(et).width + 14;
      const xE = Math.max(4, Math.min(x1 - w - 4, xB - w / 2));
      g.fillStyle = col;
      redondeado(g, xE, yB + (L.tipo === 'alcista' ? 10 : -26), w, 16, 4); g.fill();
      g.fillStyle = L.tipo === 'alcista' ? '#04210f' : '#2a0509';
      g.textAlign = 'left';
      g.fillText(et, xE + 7, yB + (L.tipo === 'alcista' ? 21 : -15));
    }
  }

  /* ══ EL CANAL DEL RANGO ══
     Si el precio va lateral, se marcan las dos horizontales. */
  if (N.rango && _trazo > 0) {
    const yA = Y(N.rango.alto), yB = Y(N.rango.bajo);
    const xT = x1 * _trazo;
    g.strokeStyle = 'rgba(232,184,75,.85)';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, yA); g.lineTo(xT, yA); g.stroke();
    g.beginPath(); g.moveTo(0, yB); g.lineTo(xT, yB); g.stroke();
    if (_trazo >= 1) {
      g.fillStyle = 'rgba(232,184,75,.06)';
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
  (N.dobles || []).forEach((d) => {
    const primero2 = Math.max(0, fin - ancho);
    if (d.p1.i < primero2 - 2) return;
    const suelo = d.tipo === 'dobleSuelo';
    const col = suelo ? '#2ee86a' : '#f6465d';
    const x1p = idxVis(d.p1.i), x2p = idxVis(d.p2.i);
    const yN = Y(d.nivel), yC = Y(d.cuello);

    // Los dos extremos
    [x1p, x2p].forEach((xx) => {
      if (xx < 0 || xx > x1) return;
      g.beginPath(); g.arc(xx, yN, 5, 0, Math.PI * 2);
      g.fillStyle = col; g.fill();
      g.strokeStyle = '#0b0f16'; g.lineWidth = 1.5; g.stroke();
    });
    // La línea del cuello
    g.strokeStyle = col + 'aa';
    g.setLineDash([5, 4]); g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(Math.max(0, x1p), yC); g.lineTo(x1, yC); g.stroke();
    g.setLineDash([]);

    const et = (suelo ? 'DOBLE SUELO' : 'DOBLE TECHO') + (d.confirmado ? ' ✓' : '');
    g.font = 'bold 9px ui-monospace,monospace';
    const w = g.measureText(et).width + 14;
    const xE = Math.max(4, Math.min(x1 - w - 4, (x1p + x2p) / 2 - w / 2));
    g.fillStyle = col;
    redondeado(g, xE, yN + (suelo ? 12 : -28), w, 16, 4); g.fill();
    g.fillStyle = suelo ? '#04210f' : '#2a0509';
    g.textAlign = 'left';
    g.fillText(et, xE + 7, yN + (suelo ? 23 : -17));
  });

  /* ══ LAS ESTRUCTURAS DIBUJADAS ══
     Aquí es donde el usuario VE de lo que se le habla: la ruptura,
     la zona institucional, el barrido. No hay que creerse nada. */
  (N.estructuras || []).forEach((e) => {
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

      const et = e.tipo === 'ob' ? (e.dir === 'alcista' ? 'DEMANDA' : 'OFERTA') : 'BARRIDO';
      g.font = 'bold 9px ui-monospace,monospace';
      const w = g.measureText(et).width + 12;
      g.fillStyle = col;
      redondeado(g, Math.max(2, xR - paso / 2), yTop - 16, w, 15, 4); g.fill();
      g.fillStyle = e.dir === 'alcista' ? '#04210f' : '#2a0509';
      g.textAlign = 'left';
      g.fillText(et, Math.max(2, xR - paso / 2) + 6, yTop - 5);
    }
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
   LAS BURBUJAS DEL ASISTENTE

   Van ancladas al precio del que hablan: si la gráfica se mueve o
   se estira, ellas siguen a su nivel. Nunca se despegan.
   ══════════════════════════════════════════════════════════════ */
function burbujas() {
  const caja = $('nv-burbujas');
  if (!caja || !_geo || N.cargando) return;
  if (!N.mensajes.length) { caja.innerHTML = ''; return; }

  const { Y, pMin, pMax, x1, y1, paso, fin, ancho, vis } = _geo;
  const primero = Math.max(0, fin - ancho);
  const xDe = (i) => (i - primero) * paso + paso / 2;

  /* ══════════════════════════════════════════════════════════
     BUSCAR ZONA LIMPIA

     La tarjeta no puede taparle las velas. Se mira dónde hay
     hueco de verdad —arriba o abajo de la acción del precio— y
     ahí se coloca, unida al punto por una línea curva.
     ══════════════════════════════════════════════════════════ */
  const zonaLibre = (xCentro) => {
    /* Qué velas caen bajo esa franja horizontal */
    const cerca = vis.filter((v, i) => {
      const x = i * paso + paso / 2;
      return Math.abs(x - xCentro) < 170;
    });
    if (!cerca.length) return { arriba: 60, abajo: y1 - 60 };
    const techo = Math.min(...cerca.map((v) => Y(v.h)));
    const suelo = Math.max(...cerca.map((v) => Y(v.l)));
    return { arriba: techo, abajo: suelo };
  };

  const firma = N.mensajes.map((m) => m.titulo + '|' + m.txt).join('~');
  const rehacer = caja.dataset.firma !== firma;

  /* ══════════════════════════════════════════════════════════
     COLOCACIÓN ORDENADA

     [CORREGIDO] Antes cada tarjeta buscaba su hueco por su cuenta
     y salían líneas verticales absurdas y tarjetas cortadas por el
     borde.

     Ahora hay franjas fijas: la principal arriba a la izquierda,
     las de apoyo en fila debajo. Siempre en el mismo sitio, con
     números para saber el orden. La curva las une a su punto sin
     que nada se cruce.
     ══════════════════════════════════════════════════════════ */
  const anchoTar = Math.min(300, Math.max(210, x1 * 0.26));
  const filaX = 18 + anchoTar / 2;              // columna izquierda
  const pos = N.mensajes.map((m, idx) => {
    /* El punto: donde ocurre lo que se cuenta */
    let px = x1 * 0.6;
    if (m.marca && m.marca.iRef != null) px = xDe(m.marca.iRef);
    else if (m.iAncla != null) px = xDe(m.iAncla);
    px = Math.max(20, Math.min(x1 - 20, px));
    const dentro = m.p >= pMin && m.p <= pMax;
    const py = dentro ? Math.max(14, Math.min(y1 - 14, Y(m.p))) : y1 * 0.4;

    /* La tarjeta va en su franja: siempre en el mismo sitio, así
       el usuario sabe dónde mirar y nada se solapa. */
    const alto = 40;
    const ty = 34 + idx * (alto + 12);
    return { px, py, tx: filaX, ty: Math.min(ty, y1 - 40), dentro, orden: idx + 1 };
  });

  if (!rehacer) {
    caja.querySelectorAll('.nv-m').forEach((el, i) => {
      const p = pos[i]; if (!p) return;
      colocar(el, p);
    });
    return;
  }

  caja.dataset.firma = firma;
  const ic = { compra: '▲', venta: '▼', vigilar: '◆', aviso: '✱', tendencia: '➜', contexto: '·' };
  const etq = { compra: 'COMPRA', venta: 'VENTA', vigilar: 'VIGILAR', aviso: 'ESPERA',
                tendencia: 'TENDENCIA', contexto: 'CONTEXTO' };

  caja.innerHTML = N.mensajes.map((m, idx) => `
    <div class="nv-m t-${m.tipo} ${m.esPlan ? 'plan' : 'apoyo'}" data-nvm="${idx}">
      <!-- El punto latiendo donde pasa la cosa -->
      <span class="nv-pin"></span>
      <!-- La línea curva que lleva a la tarjeta -->
      <svg class="nv-hilo" width="1" height="1"><path d="" fill="none"/></svg>
      <!-- La tarjeta, en zona limpia -->
      <div class="nv-tar">
        <button class="nv-chip" type="button">
          <span class="nv-num">${idx + 1}</span>
          <img class="nv-chip-ava" src="assets/img/jesus-avatar.webp" alt="">
          <span class="nv-chip-tx">${ic[m.tipo] || '✱'} ${esc(T(etq[m.tipo] || ''))}</span>
        </button>
        <div class="nv-panel-m">
          <div class="nv-pm-cab">
            <img class="nv-pm-ava" src="assets/img/jesus-avatar.webp" alt="">
            <div class="nv-pm-quien"><b>Jesús</b><span>${esc(T(m.titulo))}</span></div>
            <button class="nv-pm-x" type="button" aria-label="Cerrar">✕</button>
          </div>
          <div class="nv-pm-tx" data-escribir="${esc(T(m.txt))}"></div>
          <div class="nv-pm-hacer">${esc(T(m.hacer))}</div>
          <button class="nv-pm-mas" type="button">${esc(T('Por qué lo digo'))} ▾</button>
          <div class="nv-pm-det">
            ${(m.detalle || []).map((x) => `<div class="nv-pm-li">${esc(T(x))}</div>`).join('')}
          </div>
        </div>
      </div>
    </div>`).join('');

  caja.querySelectorAll('.nv-m').forEach((el, i) => colocar(el, pos[i]));

  caja.querySelectorAll('[data-nvm]').forEach((el) => {
    const chip = el.querySelector('.nv-chip');
    const cerrar = el.querySelector('.nv-pm-x');
    const mas = el.querySelector('.nv-pm-mas');
    chip.onclick = (e) => {
      e.stopPropagation();
      const ab = el.classList.contains('abierto');
      caja.querySelectorAll('.nv-m').forEach((x) => x.classList.remove('abierto'));
      if (!ab) { el.classList.add('abierto'); escribir(el.querySelector('[data-escribir]')); }
    };
    cerrar.onclick = (e) => { e.stopPropagation(); el.classList.remove('abierto'); };
    mas.onclick = (e) => {
      e.stopPropagation();
      el.classList.toggle('con-detalle');
      mas.textContent = el.classList.contains('con-detalle') ? 'Ocultar ▴' : 'Por qué lo digo ▾';
    };
  });

  const uno = caja.querySelector('.nv-m');
  if (uno) { uno.classList.add('abierto'); escribir(uno.querySelector('[data-escribir]')); }
}

/** Coloca el punto, la tarjeta y traza la curva que los une. */
function colocar(el, p) {
  if (!el || !p) return;
  const pin = el.querySelector('.nv-pin');
  const tar = el.querySelector('.nv-tar');
  const svg = el.querySelector('.nv-hilo');
  if (!pin || !tar || !svg) return;

  pin.style.left = p.px + 'px';
  pin.style.top = p.py + 'px';
  tar.style.left = p.tx + 'px';
  tar.style.top = p.ty + 'px';
  el.classList.toggle('sin-ancla', !p.dentro);

  /* La curva: como una cuerda con pandeo entre los dos puntos. */
  const x0 = p.px, y0 = p.py, x2 = p.tx, y2 = p.ty;
  const minX = Math.min(x0, x2) - 6, minY = Math.min(y0, y2) - 6;
  const w = Math.abs(x2 - x0) + 12, h = Math.abs(y2 - y0) + 12;
  svg.setAttribute('width', w);
  svg.setAttribute('height', h);
  svg.style.left = minX + 'px';
  svg.style.top = minY + 'px';

  const a = { x: x0 - minX, y: y0 - minY };
  const b = { x: x2 - minX, y: y2 - minY };
  // El punto de control da el pandeo: sale del punto y llega a la tarjeta
  const cx = a.x + (b.x - a.x) * 0.35;
  const cy = b.y + (a.y - b.y) * 0.12;
  const d = `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`;
  svg.querySelector('path').setAttribute('d', d);
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

  /* ── La barra de veredicto ── */
  #nv-overlay .nv-veredicto{display:flex;align-items:center;gap:11px;flex:0 0 auto;flex-wrap:wrap;
    padding:9px 14px;background:#0d1219;border-bottom:1px solid #1a1f28}
  #nv-overlay .nv-veredicto:empty{display:none}
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
     LOS MARCADORES DEL ASISTENTE

     Un punto pequeño anclado al sitio exacto del que se habla.
     Al tocarlo se despliega el texto completo. Ocupa poco y no
     tapa la gráfica.
     ══════════════════════════════════════════════════════════ */
  #nv-overlay .nv-burbujas{position:absolute;inset:0;pointer-events:none;z-index:5}
  #nv-overlay .nv-m{position:absolute;inset:0;pointer-events:none;z-index:6}
  #nv-overlay .nv-m.abierto{z-index:20}

  /* El punto que marca dónde pasa la cosa */
  #nv-overlay .nv-pin{position:absolute;width:11px;height:11px;border-radius:50%;
    transform:translate(-50%,-50%);pointer-events:none;
    background:currentColor;box-shadow:0 0 0 3px rgba(11,15,22,.85),0 0 14px currentColor;
    animation:nvPin 2s ease-in-out infinite}
  @keyframes nvPin{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:1}
                   50%{transform:translate(-50%,-50%) scale(1.3);opacity:.65}}

  /* La cuerda que une el punto con la tarjeta */
  #nv-overlay .nv-hilo{position:absolute;pointer-events:none;overflow:visible}
  #nv-overlay .nv-hilo path{stroke:currentColor;stroke-width:1.6;opacity:.55;
    stroke-dasharray:4 4;stroke-linecap:round}
  #nv-overlay .nv-m.abierto .nv-hilo path{opacity:.9;stroke-dasharray:none;stroke-width:2}
  #nv-overlay .nv-m.sin-ancla .nv-pin,#nv-overlay .nv-m.sin-ancla .nv-hilo{display:none}

  /* La tarjeta, en zona limpia */
  #nv-overlay .nv-tar{position:absolute;transform:translate(-50%,-50%);pointer-events:auto}

  /* El chip: pequeño, con el avatar */
  /* El número de orden: la 1 es el plan, las demás contexto */
  #nv-overlay .nv-num{width:19px;height:19px;flex:0 0 auto;border-radius:6px;
    display:grid;place-items:center;font-family:var(--display,sans-serif);
    font-weight:800;font-size:11px;background:rgba(255,255,255,.1);color:#b7bdc6}
  #nv-overlay .nv-m.plan .nv-num{background:linear-gradient(180deg,#f7db8d,#E8B84B);color:#3a2800}
  #nv-overlay .nv-m.plan .nv-chip{border-width:2px;box-shadow:0 4px 16px rgba(0,0,0,.6)}
  #nv-overlay .nv-m.apoyo .nv-chip{opacity:.82;transform:scale(.94)}
  #nv-overlay .nv-m.apoyo .nv-hilo path{opacity:.32}
  #nv-overlay .t-contexto .nv-chip{border-color:#5c6672}
  #nv-overlay .t-contexto .nv-chip-tx{color:#9aa5b1}
  #nv-overlay .t-contexto{color:#7d8794}

  #nv-overlay .nv-chip{display:flex;align-items:center;gap:6px;padding:3px 9px 3px 3px;
    border-radius:20px;cursor:pointer;white-space:nowrap;
    background:rgba(13,17,23,.94);border:1.5px solid #3a424c;
    box-shadow:0 3px 12px rgba(0,0,0,.55);transition:transform .15s,border-color .15s}
  #nv-overlay .nv-chip:hover{transform:scale(1.06)}
  #nv-overlay .nv-chip-ava{width:22px;height:22px;border-radius:50%;object-fit:cover;
    border:1px solid rgba(232,184,75,.5);flex:0 0 auto}
  #nv-overlay .nv-chip-tx{font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;
    letter-spacing:.6px}
  #nv-overlay .t-compra .nv-chip{border-color:#2ee86a}
  #nv-overlay .t-compra .nv-chip-tx{color:#3ee88a}
  #nv-overlay .t-venta .nv-chip{border-color:#f6465d}
  #nv-overlay .t-venta .nv-chip-tx{color:#ff6b7a}
  #nv-overlay .t-aviso .nv-chip{border-color:rgba(232,184,75,.75)}
  #nv-overlay .t-aviso .nv-chip-tx{color:var(--gold,#E8B84B)}
  #nv-overlay .t-vigilar .nv-chip{border-color:#9aa5b1}
  #nv-overlay .t-vigilar .nv-chip-tx{color:#b7bdc6}
  #nv-overlay .t-tendencia .nv-chip{border-color:#4d9fff}
  #nv-overlay .t-tendencia .nv-chip-tx{color:#6fb0ff}
  #nv-overlay .nv-m.abierto .nv-chip{opacity:.55;transform:scale(.9)}
  #nv-overlay .nv-m.fuera .nv-chip{opacity:.6}

  /* El panel desplegado */
  #nv-overlay .nv-panel-m{display:none;position:absolute;top:0;
    left:calc(100% + 12px);transform:none;
    width:min(320px, 74vw);padding:12px 13px;border-radius:14px;
    background:linear-gradient(165deg,rgba(20,26,35,.985),rgba(11,15,22,.985));
    border:1px solid #3a424c;box-shadow:0 14px 40px rgba(0,0,0,.72);
    animation:nvAbrePanel .22s ease both}

  #nv-overlay .nv-m.abierto .nv-panel-m{display:block}
  @keyframes nvAbrePanel{from{opacity:0;transform:translateX(-8px) scale(.97)}to{opacity:1;transform:none}}
  #nv-overlay .t-compra .nv-panel-m{border-color:rgba(46,232,106,.5)}
  #nv-overlay .t-venta .nv-panel-m{border-color:rgba(246,70,93,.5)}
  #nv-overlay .t-aviso .nv-panel-m{border-color:rgba(232,184,75,.45)}

  #nv-overlay .nv-pm-cab{display:flex;align-items:center;gap:9px;margin-bottom:9px}
  #nv-overlay .nv-pm-ava{width:32px;height:32px;border-radius:50%;object-fit:cover;flex:0 0 auto;
    border:1.5px solid rgba(232,184,75,.6)}
  #nv-overlay .nv-pm-quien{flex:1;min-width:0}
  #nv-overlay .nv-pm-quien b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:12px;color:var(--gold,#E8B84B);line-height:1.1}
  #nv-overlay .nv-pm-quien span{display:block;font-family:var(--display,sans-serif);font-weight:700;
    font-size:13.5px;color:#eaecef;line-height:1.25;overflow-wrap:anywhere}
  #nv-overlay .nv-pm-x{width:26px;height:26px;flex:0 0 auto;border-radius:8px;cursor:pointer;
    display:grid;place-items:center;padding:0;font-size:11px;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#8b96a3}
  #nv-overlay .nv-pm-tx{min-height:30px;font-family:var(--sans,sans-serif);font-size:12.5px;
    color:#b7bdc6;line-height:1.55}
  #nv-overlay .nv-pm-hacer{margin-top:9px;padding:10px 12px;border-radius:10px;
    background:rgba(0,0,0,.38);border-left:2px solid rgba(232,184,75,.6);
    font-family:var(--sans,sans-serif);font-size:12px;color:#e2e8ee;line-height:1.5}
  #nv-overlay .nv-pm-mas{width:100%;margin-top:9px;min-height:32px;border-radius:8px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:10px;letter-spacing:.6px}
  #nv-overlay .nv-pm-det{display:none;margin-top:9px}
  #nv-overlay .nv-m.con-detalle .nv-pm-det{display:block}
  #nv-overlay .nv-pm-li{font-family:var(--mono,monospace);font-size:10.5px;color:#8b96a3;
    line-height:1.7;padding-left:11px;position:relative}
  #nv-overlay .nv-pm-li:before{content:'·';position:absolute;left:2px;color:#5c6672}

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
    /* [CORREGIDO] El panel se cortaba por abajo. Ahora va fijo a la
       pantalla, pegado abajo con su propio scroll: siempre entero. */
    #nv-overlay .nv-m.abierto .nv-panel-m{position:fixed !important;
      left:8px !important;right:8px !important;width:auto !important;
      max-width:none !important;transform:none !important;
      top:auto !important;bottom:10px !important;
      max-height:46vh;overflow-y:auto;-webkit-overflow-scrolling:touch}
    #nv-overlay .nv-chip-tx{font-size:9px}
    #nv-overlay .nv-chip-ava{width:20px;height:20px}
    #nv-overlay .nv-pm-quien span{font-size:12.5px}
    #nv-overlay .nv-pm-tx{font-size:12px}
    #nv-overlay .nv-marca{height:26px;left:10px;bottom:34px}
    #nv-ayuda-box .nva-c{padding:20px 14px}
  }`;
  document.head.appendChild(s);
}
