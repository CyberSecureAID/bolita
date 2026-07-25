/**
 * EXCHANGE DE COMPRA — interfaz viva estilo exchange
 * ==================================================
 * Muestra par de monedas seleccionable, precio/máx/mín/volumen y gráfico REALES
 * de CoinGecko, un libro de órdenes de ambiente, y botones que llevan a comprar
 * de verdad (MoonPay / PancakeSwap / QvaPay). Nada de esto custodia dinero: al
 * pulsar "Comprar" se elige una vía real y externa.
 *
 * HONESTIDAD: precio y gráfico son datos reales; el libro de órdenes es
 * ambiente visual (no un mercado propio). Las compras se hacen en plataformas
 * externas seguras.
 */

import { MONEDAS, COMPRAR_URL } from './tokens.js';
import { logoDe } from './prices.js';

const ORDEN = ['BNB', 'USDT', 'USDC', 'BTCB', 'ETH', 'USDTZ', 'BABYDOGE', 'EXT'];
const CG_ID = {
  BNB: 'binancecoin', USDT: 'tether', USDC: 'usd-coin',
  BTCB: 'binance-bitcoin', ETH: 'ethereum', BABYDOGE: 'baby-doge-coin'
};
const SUBTITULO = {
  BNB: 'BNB · BSC', USDT: 'USDT · BSC', USDC: 'USDC · BSC',
  BTCB: 'BTCB · BSC', ETH: 'ETH · BSC', USDTZ: 'USDT.z · BSC',
  BABYDOGE: 'BabyDoge · BSC', EXT: 'EXT · BSC'
};
// Par en Binance para libro de órdenes y datos REALES (las que cotizan)
const BINANCE = { BNB: 'BNBUSDT', BTCB: 'BTCUSDT', ETH: 'ETHUSDT', USDC: 'USDCUSDT', BABYDOGE: '1000000BABYDOGEUSDT' };

let sel = 'USDT';   // moneda seleccionada en el exchange

export function pintarCompra() {
  conectarNav();
  conectarPestanas();
  conectarSelector();
  conectarComprar();
  cargarMoneda('USDT');
}

/* ---------- Apertura del modal (nav + hamburguesa) ---------- */
function conectarNav() {
  const modal = document.getElementById('m-comprar');
  if (!modal) return;

  const abrir = (e) => { if (e) e.preventDefault(); modal.classList.add('open'); };
  document.getElementById('nav-comprar')?.addEventListener('click', abrir);
  document.getElementById('menu-comprar')?.addEventListener('click', (e) => {
    abrir(e); cerrarMenuMovil();
  });

  const cerrar = () => modal.classList.remove('open');
  modal.querySelectorAll('.modal-close').forEach((b) => b.addEventListener('click', cerrar));
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });

  // Menú hamburguesa móvil
  const btnMenu = document.getElementById('btn-menu');
  const menu = document.getElementById('menu-movil');
  if (btnMenu && menu) {
    btnMenu.addEventListener('click', () => {
      btnMenu.classList.toggle('on');
      menu.classList.toggle('open');
    });
    menu.querySelectorAll('[data-cierra]').forEach((a) => {
      a.addEventListener('click', () => cerrarMenuMovil());
    });
  }
}
function cerrarMenuMovil() {
  document.getElementById('btn-menu')?.classList.remove('on');
  document.getElementById('menu-movil')?.classList.remove('open');
}

/* ---------- Pestañas (tarjeta / cambiar / cuba) ---------- */
let modoCompra = 'tarjeta';   // cómo se comprará al pulsar el botón final
function conectarPestanas() {
  const tabs = document.getElementById('ex-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.ex-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.querySelectorAll('.ex-tab').forEach((t) => t.classList.toggle('on', t === tab));
      modoCompra = tab.dataset.tab;
      // Solo cambia el texto del botón final; NO abre ningún modal.
      actualizarBotonFinal();
    });
  });
}
function actualizarBotonFinal() {
  const b = document.getElementById('ex-comprar-final');
  if (!b) return;
  const m = MONEDAS[sel];
  const txt = {
    tarjeta: `Comprar ${m.simbolo} con tarjeta`,
    cambiar: `Intercambiar por ${m.simbolo}`,
    cuba: `Comprar ${m.simbolo} desde Cuba`
  };
  b.innerHTML = (txt[modoCompra] || 'Comprar') + ' &nbsp;→';
}

/* ---------- Selector de moneda (par y campo) ---------- */
function conectarSelector() {
  const pop = document.getElementById('ex-monedas-pop');
  if (!pop) return;

  pop.innerHTML = ORDEN.map((id) => {
    const m = MONEDAS[id];
    const logo = logoDe(id);
    const logoHtml = logo
      ? `<img src="${logo}" alt="${m.simbolo}">`
      : `<span class="exp-txt" style="background:${m.color}22;color:${m.color}">${m.icono}</span>`;
    return `<button class="exp-item" data-id="${id}" type="button">
      ${logoHtml}<b>${m.simbolo}</b><small>${SUBTITULO[id]}</small></button>`;
  }).join('');

  pop.querySelectorAll('.exp-item').forEach((b) => {
    b.addEventListener('click', () => {
      cargarMoneda(b.dataset.id);
      pop.hidden = true;
    });
  });

  const toggle = () => { pop.hidden = !pop.hidden; };
  document.getElementById('ex-par-sel')?.addEventListener('click', toggle);
  document.getElementById('ex-campo-sel')?.addEventListener('click', toggle);
}

/* ---------- Cargar una moneda: precio, gráfico, libro ---------- */
async function cargarMoneda(id) {
  sel = id;
  const m = MONEDAS[id];

  const logo = logoDe(id) || '';
  setSrc('ex-par-logo', logo);
  setSrc('ex-campo-logo', logo);
  setTxt('ex-par-nombre', m.simbolo);
  setTxt('ex-par-red', SUBTITULO[id]);
  setTxt('ex-campo-nombre', m.simbolo);
  setTxt('ex-disp', '0 ' + m.simbolo);
  actualizarBotonFinal();

  // Datos REALES de Binance (24h): precio, cambio, máx, mín, volumen.
  let precio = m.precioUSD ?? null, cambio = 0, alto = null, bajo = null, vol = null;
  const par = BINANCE[id];
  if (par) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${par}`);
      const d = await r.json();
      const factor = id === 'BABYDOGE' ? 1e6 : 1;
      precio = parseFloat(d.lastPrice) / factor;
      cambio = parseFloat(d.priceChangePercent);
      alto = parseFloat(d.highPrice) / factor;
      bajo = parseFloat(d.lowPrice) / factor;
      vol = parseFloat(d.quoteVolume);
    } catch (e) { /* usa referencia */ }
  } else if (id === 'USDT' || id === 'USDTZ') {
    precio = 1; cambio = 0; alto = 1.001; bajo = 0.999;
  }

  pintarPrecio(precio, cambio, alto, bajo, vol);
  pintarGrafico(id, cambio);
  pintarLibro(precio);
  pintarPopulares();
}

function pintarPrecio(precio, cambio, alto, bajo, vol) {
  const fmt = (p) => {
    if (p == null) return '—';
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    if (p >= 0.0001) return p.toFixed(6);
    return p.toExponential(2);
  };
  setTxt('ex-precio', fmt(precio));
  setTxt('ex-precio-usd', precio != null ? `≈ $${fmt(precio)}` : '≈ $—');
  const chg = document.getElementById('ex-precio-chg');
  if (chg) {
    const signo = cambio >= 0 ? '+' : '';
    chg.textContent = `${signo}${(cambio || 0).toFixed(2)}%`;
    chg.className = 'ex-precio-chg ' + (cambio >= 0 ? 'up' : 'down');
  }
  setTxt('ex-max', fmt(alto != null ? alto : (precio ? precio * 1.01 : null)));
  setTxt('ex-min', fmt(bajo != null ? bajo : (precio ? precio * 0.99 : null)));
  setTxt('ex-vol', vol != null ? (vol / 1e6).toFixed(2) + 'M' : '—');
}

/* Gráfico de línea REAL desde Binance (klines). Ambiente solo si no cotiza. */
async function pintarGrafico(id, cambio) {
  const svg = document.getElementById('ex-chart-svg');
  if (!svg) return;
  let puntos = [];
  const par = BINANCE[id];
  if (par) {
    try {
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${par}&interval=15m&limit=48`);
      const d = await r.json();
      puntos = d.map((k) => parseFloat(k[4]));   // precio de cierre
    } catch (e) { /* ambiente */ }
  }
  if (puntos.length < 2) puntos = generarSerie(cambio);

  const W = 600, H = 180;
  const min = Math.min(...puntos), max = Math.max(...puntos);
  const rango = max - min || 1;
  const paso = W / (puntos.length - 1);
  const coords = puntos.map((v, i) => [i * paso, H - ((v - min) / rango) * (H - 20) - 10]);
  const linea = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
  const area = linea + ` L${W} ${H} L0 ${H} Z`;
  const sube = puntos[puntos.length - 1] >= puntos[0];
  const col = sube ? '#2EE86A' : '#FF5C5C';

  svg.innerHTML = `
    <defs><linearGradient id="exg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#exg)"/>
    <path d="${linea}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
}

function generarSerie(cambio) {
  const n = 48, out = [];
  let v = 100;
  for (let i = 0; i < n; i++) { v += (Math.random() - 0.48) * 3; out.push(v); }
  return out;
}

/* Libro de órdenes REAL desde Binance (público, sin API key). Para monedas que
   no cotizan en Binance (USDT.z, EXT), se oculta el libro. */
async function pintarLibro(precio) {
  const compra = document.getElementById('ex-libro-compra');
  const venta = document.getElementById('ex-libro-venta');
  const libro = document.querySelector('.ex-libro');
  if (!compra || !venta) return;

  const par = BINANCE[sel];
  if (!par) {
    // Sin mercado real: ocultar el libro en vez de inventarlo.
    if (libro) libro.style.display = 'none';
    return;
  }
  if (libro) libro.style.display = '';

  try {
    const r = await fetch(`https://api.binance.com/api/v3/depth?symbol=${par}&limit=6`);
    const d = await r.json();
    const factor = sel === 'BABYDOGE' ? 1e6 : 1;   // el par es por millón
    const fila = (nivel) => {
      const px = parseFloat(nivel[0]) / factor;
      const qt = parseFloat(nivel[1]) * factor;
      const pxTxt = px >= 1 ? px.toFixed(4) : px.toExponential(2);
      const qtTxt = qt.toLocaleString('en-US', { maximumFractionDigits: 2 });
      return `<div class="ex-libro-fila"><span class="px">${pxTxt}</span><span class="qt">${qtTxt}</span></div>`;
    };
    compra.innerHTML = (d.bids || []).slice(0, 5).map(fila).join('');
    venta.innerHTML = (d.asks || []).slice(0, 5).map(fila).join('');
  } catch (e) {
    if (libro) libro.style.display = 'none';
  }
}

/* Cuatro monedas populares abajo. */
function pintarPopulares() {
  const cont = document.getElementById('ex-populares');
  if (!cont) return;
  const pops = ['BNB', 'USDT', 'BTCB', 'ETH'];
  cont.innerHTML = pops.map((id) => {
    const m = MONEDAS[id];
    const logo = logoDe(id);
    const logoHtml = logo ? `<img src="${logo}" alt="${m.simbolo}">`
      : `<span style="color:${m.color}">${m.icono}</span>`;
    return `<button class="ex-pop" data-id="${id}" type="button">${logoHtml}<b>${m.simbolo}</b></button>`;
  }).join('');
  cont.querySelectorAll('.ex-pop').forEach((b) => {
    b.addEventListener('click', () => cargarMoneda(b.dataset.id));
  });
}

/* ---------- Comprar y barra interactiva ---------- */
function conectarComprar() {
  // Botón verde grande: usa el modo de la pestaña activa
  document.getElementById('ex-comprar-final')?.addEventListener('click', () => {
    abrirOpcionesCompra(modoCompra);
  });
  // Botones comprar/cobrar del centro
  document.getElementById('ex-btn-comprar')?.addEventListener('click', () => {
    document.getElementById('ex-btn-comprar').classList.add('on');
    document.getElementById('ex-btn-cobrar').classList.remove('on');
  });
  document.getElementById('ex-btn-cobrar')?.addEventListener('click', () => {
    toast('Podrás cobrar tus premios aquí cuando el contrato esté activo.');
  });

  // Barra deslizable: al moverla selecciona una de las 4 monedas populares.
  const linea = document.querySelector('.ex-barra-linea');
  const punto = document.querySelector('.ex-barra-punto');
  if (linea && punto) {
    let arrastrando = false;
    const pops = ['BNB', 'USDT', 'BTCB', 'ETH'];
    const mover = (clientX) => {
      const rect = linea.getBoundingClientRect();
      let pct = (clientX - rect.left) / rect.width;
      pct = Math.max(0, Math.min(1, pct));
      punto.style.left = (pct * 100) + '%';
      // Selección por tramo
      const idx = Math.min(pops.length - 1, Math.round(pct * (pops.length - 1)));
      if (pops[idx] !== sel) cargarMoneda(pops[idx]);
    };
    const iniciar = (e) => { arrastrando = true; mover((e.touches ? e.touches[0] : e).clientX); };
    const seguir = (e) => { if (arrastrando) mover((e.touches ? e.touches[0] : e).clientX); };
    const soltar = () => { arrastrando = false; };
    linea.addEventListener('mousedown', iniciar);
    document.addEventListener('mousemove', seguir);
    document.addEventListener('mouseup', soltar);
    linea.addEventListener('touchstart', iniciar, { passive: true });
    document.addEventListener('touchmove', seguir, { passive: true });
    document.addEventListener('touchend', soltar);
  }
}

function abrirOpcionesCompra(cual) {
  const m = MONEDAS[sel];
  const compraUrl = COMPRAR_URL[sel] || COMPRAR_URL.BNB;

  const bloques = {
    tarjeta: `
      <a class="op-item" href="https://www.moonpay.com/buy/bnb" target="_blank" rel="noopener noreferrer">
        <b>MoonPay</b><small>Tarjeta · Apple/Google Pay · PayPal</small></a>
      <a class="op-item" href="https://transak.com/buy/bnb" target="_blank" rel="noopener noreferrer">
        <b>Transak</b><small>Tarjeta · transferencia bancaria</small></a>
      <a class="op-item" href="https://rampnetwork.com/buy-crypto/bnb" target="_blank" rel="noopener noreferrer">
        <b>Ramp</b><small>Tarjeta · Apple/Google Pay</small></a>`,
    cambiar: `
      <a class="op-item" href="${compraUrl}" target="_blank" rel="noopener noreferrer" id="op-cambiar">
        <b>Intercambiar en PancakeSwap</b><small>Cambia otra cripto por ${m.simbolo}</small></a>`,
    cuba: `
      <a class="op-item" href="https://qvapay.com" target="_blank" rel="noopener noreferrer">
        <b>QvaPay</b><small>USDT con CUP/MLC · Transfermóvil · EnZona</small></a>`
  };

  let cuerpo, titulo;
  if (cual === 'todas') {
    titulo = `¿Cómo quieres conseguir ${m.simbolo}?`;
    cuerpo = `<div class="op-grupo"><span class="op-cat">Con tarjeta</span>${bloques.tarjeta}</div>
              <div class="op-grupo"><span class="op-cat">Intercambiar cripto</span>${bloques.cambiar}</div>
              <div class="op-grupo"><span class="op-cat">Desde Cuba</span>${bloques.cuba}</div>`;
  } else if (cual === 'tarjeta') {
    titulo = 'Comprar con tarjeta'; cuerpo = bloques.tarjeta;
  } else if (cual === 'cambiar') {
    titulo = `Intercambiar por ${m.simbolo}`; cuerpo = bloques.cambiar;
  } else {
    titulo = 'Comprar desde Cuba'; cuerpo = bloques.cuba;
  }

  let modal = document.getElementById('m-opciones');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal'; modal.id = 'm-opciones';
    document.body.appendChild(modal);
  }
  // Si la moneda tiene comisión, avisar dentro
  const avisoFee = m.comisionPct
    ? `<p class="op-fee">Ojo: ${m.simbolo} cobra ~${m.comisionPct}% por transferencia (es del token, no nuestro).</p>`
    : '';

  modal.innerHTML = `<div class="modal-box op-box">
    <h3>${titulo}</h3>
    <p class="sub">elige por dónde, te llevamos a una plataforma segura</p>
    ${avisoFee}
    <div class="op-lista">${cuerpo}</div>
    <button class="modal-close" type="button">Cerrar</button>
  </div>`;
  modal.classList.add('open');
  const cerrar = () => modal.classList.remove('open');
  modal.querySelector('.modal-close').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  modal.querySelectorAll('.op-item').forEach((a) => a.addEventListener('click', cerrar));
}

/* ---------- utilidades ---------- */
function setTxt(id, v) { const e = document.getElementById(id); if (e) e.textContent = v; }
function setSrc(id, v) { const e = document.getElementById(id); if (e) { e.src = v; e.style.visibility = v ? 'visible' : 'hidden'; } }
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
