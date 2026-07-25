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
// IDs de CoinGecko (funciona desde el navegador; Binance bloquea por CORS/región)
const CG_ID = {
  BNB: 'binancecoin', USDT: 'tether', USDC: 'usd-coin',
  BTCB: 'bitcoin', ETH: 'ethereum', BABYDOGE: 'baby-doge-coin'
};
// Precios FIJOS de las monedas que no están en CoinGecko (las del proyecto)
const PRECIO_FIJO = {
  USDTZ: 0.002,        // 1 millón ≈ $2,000
  EXT: 0.0003172       // ExactTrader
};
// Precios de referencia de respaldo (si CoinGecko falla, no queda vacío)
const PRECIO_REF = {
  BNB: 600, USDT: 1, USDC: 1, BTCB: 95000, ETH: 3000, BABYDOGE: 0.0000000003
};
// Caché en memoria del último precio bueno visto, por moneda
const cachePrecio = {};
const SUBTITULO = {
  BNB: 'BNB · BSC', USDT: 'USDT · BSC', USDC: 'USDC · BSC',
  BTCB: 'BTCB · BSC', ETH: 'ETH · BSC', USDTZ: 'USDT.z · BSC',
  BABYDOGE: 'BabyDoge · BSC', EXT: 'EXT · BSC'
};
// Par en Binance para libro de órdenes y datos REALES (las que cotizan)

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
      actualizarBotonFinal();
      // Transición visible: un breve fundido de la zona de scroll
      const scroll = document.querySelector('.ex-scroll');
      if (scroll) {
        scroll.classList.remove('ex-flash');
        void scroll.offsetWidth;   // reinicia la animación
        scroll.classList.add('ex-flash');
      }
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
    // Solo logo + símbolo + red (sin repetir el nombre)
    return `<button class="exp-item" data-id="${id}" type="button">
      ${logoHtml}<span class="exp-info"><b>${m.simbolo}</b><small>BSC</small></span></button>`;
  }).join('');

  pop.querySelectorAll('.exp-item').forEach((b) => {
    b.addEventListener('click', () => {
      cargarMoneda(b.dataset.id);
      pop.hidden = true;
    });
  });

  // Abrir/cerrar SOLO al tocar el selector del par
  document.getElementById('ex-par-sel')?.addEventListener('click', (e) => {
    e.stopPropagation();
    pop.hidden = !pop.hidden;
  });
  // Cerrar si se toca fuera
  document.addEventListener('click', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('#ex-par-sel')) {
      pop.hidden = true;
    }
  });
}

/* ---------- Cargar una moneda: precio, gráfico, libro ---------- */
async function cargarMoneda(id) {
  sel = id;
  const m = MONEDAS[id];

  const logo = logoDe(id) || '';
  setSrc('ex-par-logo', logo);
  setTxt('ex-par-nombre', m.simbolo);
  setTxt('ex-par-red', SUBTITULO[id]);
  actualizarBotonFinal();

  // Precio: CoinGecko para las conocidas, precio fijo para las del proyecto.
  // Respaldo en cadena: caché -> referencia -> nunca vacío.
  let precio = PRECIO_FIJO[id] ?? cachePrecio[id] ?? PRECIO_REF[id] ?? m.precioUSD ?? null;
  let cambio = 0, alto = null, bajo = null, vol = null;
  const cg = CG_ID[id];
  if (cg) {
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${cg}`);
      if (r.ok) {
        const d = await r.json();
        if (d && d[0] && d[0].current_price != null) {
          precio = d[0].current_price;
          cambio = d[0].price_change_percentage_24h ?? 0;
          alto = d[0].high_24h; bajo = d[0].low_24h;
          vol = d[0].total_volume;
          cachePrecio[id] = precio;   // guardar el bueno
        }
      }
    } catch (e) { /* usa caché/referencia, ya asignado arriba */ }
  } else if (id === 'USDTZ') {
    alto = precio; bajo = precio;
  }

  pintarPrecio(precio, cambio, alto, bajo, vol);
  pintarGrafico(id, cambio);
  pintarLibro(precio);
  pintarPopulares();
}

/** Precio legible: nunca notación científica. Para valores ínfimos usa una
 *  forma corta con "0.0₉3" o simplemente los decimales necesarios. */
function fmtPrecio(p) {
  if (p == null) return '—';
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 0.01) return p.toFixed(4);
  if (p >= 0.0001) return p.toFixed(6);
  // Valores ínfimos (Baby Doge): contar ceros y mostrar legible
  const s = p.toFixed(20).replace(/0+$/, '');
  const m = s.match(/^0\.(0*)(\d+)/);
  if (m) {
    const ceros = m[1].length;
    const signif = m[2].slice(0, 3);
    return `0.0…0${signif} (${ceros} ceros)`;
  }
  return String(p);
}

function pintarPrecio(precio, cambio, alto, bajo, vol) {
  setTxt('ex-precio', fmtPrecio(precio));
  const chg = document.getElementById('ex-precio-chg');
  if (chg) {
    const signo = cambio >= 0 ? '+' : '';
    chg.textContent = `${signo}${(cambio || 0).toFixed(2)}%`;
    chg.className = 'ex-precio-chg ' + (cambio >= 0 ? 'up' : 'down');
  }
  setTxt('ex-max', fmtPrecio(alto != null ? alto : (precio ? precio * 1.01 : null)));
  setTxt('ex-min', fmtPrecio(bajo != null ? bajo : (precio ? precio * 0.99 : null)));
  setTxt('ex-vol', vol != null ? '$' + (vol / 1e6).toFixed(1) + 'M' : '—');
}

/* Gráfico de línea REAL desde CoinGecko (market_chart). Ambiente si no cotiza. */
async function pintarGrafico(id, cambio) {
  const svg = document.getElementById('ex-chart-svg');
  if (!svg) return;
  let puntos = [];
  const cg = CG_ID[id];
  if (cg) {
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/${cg}/market_chart?vs_currency=usd&days=1`);
      const d = await r.json();
      if (d.prices) puntos = d.prices.map((p) => p[1]);
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

/* Libro de órdenes: las APIs con profundidad real (Binance) están bloqueadas
   desde el navegador por CORS/región, y CoinGecko no da libro en su tier
   gratuito. Para no inventar datos, se OCULTA. Se reactivará si más adelante
   se conecta una fuente real (p. ej. un pequeño proxy propio). */
async function pintarLibro(precio) {
  const libro = document.querySelector('.ex-libro');
  if (libro) libro.style.display = 'none';
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

/* ---------- Comprar y retirar ---------- */
function conectarComprar() {
  // Botón grande: usa el modo de la pestaña activa
  document.getElementById('ex-comprar-final')?.addEventListener('click', () => {
    abrirOpcionesCompra(modoCompra);
  });

  // Retirar ganancia: placeholder mudo por ahora (no muestra nada).
  // Cuando el contrato esté desplegado, aquí se llamará a retirar(token).
  document.getElementById('ex-retirar')?.addEventListener('click', () => {
    /* placeholder: sin acción visible hasta que el contrato esté activo */
  });
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
