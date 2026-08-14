// orden.js — Poner órdenes desde el gráfico
//
// QUÉ HACE
//
// El usuario hace clic derecho (o mantiene pulsado en el móvil) en
// cualquier punto del gráfico y pone una orden a ese precio exacto.
//
//   · Por ENCIMA del precio actual → vender (roja)
//   · Por DEBAJO del precio actual → comprar (verde)
//
// DOS FORMAS DE OPERAR, a elección del usuario:
//
//   ORDEN REAL   — se crea en el contrato con un solo nivel. El
//                  keeper la vigila y la ejecuta sola al llegar el
//                  precio. Consume gas, pero no hay que estar
//                  delante.
//
//   AVISO        — se guarda en el navegador y avisa cuando el
//                  precio llega. No cuesta gas, pero hay que
//                  confirmar a mano.
//
// NO HACE FALTA TOCAR EL CONTRATO
//
// `crearRejilla` con un solo nivel ES una orden limit: espera un
// precio, ejecuta y el keeper la vigila. Se reutiliza lo que ya
// está desplegado y probado, sin riesgo de actualizar el proxy.

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CLAVE_AVISOS = 'cco-ordenes-aviso';

let _tr = null;
try { import('./idioma.js?v=126').then((m) => { _tr = m; }).catch(() => {}); } catch (_) {}
const T = (t) => { try { return _tr ? _tr.t(t) : t; } catch (_) { return t; } };

const fmt = (p) => {
  if (!(p > 0)) return '—';
  if (p >= 10000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  if (p >= 0.01) return p.toFixed(6);
  return p.toFixed(8);
};

/* ══════════════════════════════════════════════════════════════
   ENGANCHAR UN GRÁFICO

   Se llama desde cada herramienta pasándole su lienzo y una
   función que traduzca la posición del ratón a un precio.

     conectar({
       canvas,                  // el lienzo del gráfico
       precioEn: (y) => precio, // qué precio hay a esa altura
       precioActual: () => n,   // el precio de mercado ahora
       par: () => 'BTC',        // qué se está mirando
       simbolo: () => 'BTCUSDT'
     })
   ══════════════════════════════════════════════════════════════ */
export function conectar(cfg) {
  if (!cfg || !cfg.canvas) return;
  const cv = cfg.canvas;
  if (cv.dataset.ordenLista) return;
  cv.dataset.ordenLista = '1';
  estilos();

  /* En escritorio: clic derecho */
  cv.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    abrirMenu(e.clientX, e.clientY, cfg, e);
  });

  /* En el móvil no hay clic derecho: se mantiene pulsado medio
     segundo. Si el dedo se mueve, se cancela — es que estaba
     arrastrando el gráfico. */
  let temp = null, x0 = 0, y0 = 0, movido = false;
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { clearTimeout(temp); return; }
    const t = e.touches[0];
    x0 = t.clientX; y0 = t.clientY; movido = false;
    clearTimeout(temp);
    temp = setTimeout(() => {
      if (movido) return;
      try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
      abrirMenu(x0, y0, cfg, null);
    }, 500);
  }, { passive: true });

  cv.addEventListener('touchmove', (e) => {
    if (!e.touches.length) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - x0) > 9 || Math.abs(t.clientY - y0) > 9) {
      movido = true; clearTimeout(temp);
    }
  }, { passive: true });

  cv.addEventListener('touchend', () => clearTimeout(temp), { passive: true });
  cv.addEventListener('touchcancel', () => clearTimeout(temp), { passive: true });

  arrancarVigilante();
}

/* ══════════════════════════════════════════════════════════════
   EL MENÚ — primer paso
   ══════════════════════════════════════════════════════════════ */
function abrirMenu(cx, cy, cfg, ev) {
  cerrarTodo();
  const cv = cfg.canvas;
  const r = cv.getBoundingClientRect();
  const y = cy - r.top;
  const precio = cfg.precioEn(y);
  const actual = cfg.precioActual();
  if (!(precio > 0) || !(actual > 0)) return;

  /* Encima del precio actual = vender. Debajo = comprar. */
  const vender = precio > actual;
  const dist = ((precio - actual) / actual) * 100;

  const d = document.createElement('div');
  d.className = 'od-menu ' + (vender ? 'vender' : 'comprar');
  d.innerHTML = `
    <div class="od-m-cab">
      <span class="od-m-ic">${vender ? '▼' : '▲'}</span>
      <div>
        <b>${esc(T(vender ? 'Vender aquí' : 'Comprar aquí'))}</b>
        <span>${fmt(precio)}</span>
      </div>
    </div>
    <div class="od-m-dist">${dist >= 0 ? '+' : ''}${dist.toFixed(2)}% ${esc(T('desde el precio actual'))}</div>
    <button class="od-m-b" type="button">${esc(T('Establecer posición'))}</button>`;
  document.body.appendChild(d);
  colocar(d, cx, cy);

  d.querySelector('.od-m-b').onclick = (e) => {
    e.stopPropagation();
    d.remove();
    abrirFicha(cx, cy, cfg, precio, vender);
  };
  d.addEventListener('click', (e) => e.stopPropagation());
  setTimeout(() => document.addEventListener('click', cerrarTodo, { once: true }), 10);
}

/* ══════════════════════════════════════════════════════════════
   LA FICHA — cantidad, modo y confirmación
   ══════════════════════════════════════════════════════════════ */
function abrirFicha(cx, cy, cfg, precio, vender) {
  cerrarTodo();
  const par = cfg.par ? cfg.par() : '';
  const actual = cfg.precioActual();
  const dist = ((precio - actual) / actual) * 100;

  const d = document.createElement('div');
  d.className = 'od-ficha ' + (vender ? 'vender' : 'comprar');
  d.innerHTML = `
    <button class="od-x" type="button" aria-label="Cerrar">✕</button>

    <div class="od-cab">
      <span class="od-ic">${vender ? '▼' : '▲'}</span>
      <div class="od-tit">
        <b>${esc(T(vender ? 'Orden de venta' : 'Orden de compra'))}</b>
        <span>${esc(par)} · ${fmt(precio)}</span>
      </div>

      <!-- El porcentaje es el dato que decide: va grande y en verde,
           porque tanto el descuento al comprar como la ganancia al
           vender son buenas noticias. -->
      <div class="od-pct-grande">
        <b>${dist >= 0 ? '+' : ''}${dist.toFixed(1)}%</b>
        <span>${esc(T(vender ? 'de ganancia' : 'de descuento'))}</span>
      </div>
    </div>

    <div class="od-dist">
      ${esc(T('Precio ahora'))}: ${fmt(actual)}
      <span class="od-saldo">${esc(T('Leyendo tu saldo…'))}</span>
    </div>

    <!-- Cuánto -->
    <div class="od-campo">
      <label>${esc(T(vender ? 'Cantidad a vender' : 'Cantidad a comprar'))}</label>
      <div class="od-inp-fila">
        <input class="od-inp" id="od-cant" type="text" inputmode="decimal"
               placeholder="0.00" autocomplete="off">
        <span class="od-unidad">${esc(vender ? par : 'USDT')}</span>
      </div>
      <input class="od-rango" id="od-rango" type="range" min="0" max="100" value="0" step="1">
      <div class="od-pcts">
        ${[25, 50, 75, 100].map((p) => `<button class="od-pct" type="button" data-pct="${p}">${p}%</button>`).join('')}
      </div>
    </div>

    <!-- Cómo se ejecuta -->
    <div class="od-campo">
      <label>${esc(T('Cómo quieres que funcione'))}</label>
      <div class="od-modos">
        <button class="od-modo on" type="button" data-modo="real">
          <b>${esc(T('Orden automática'))}</b>
          <span>${esc(T('Se ejecuta sola al llegar el precio. Consume gas.'))}</span>
        </button>
        <button class="od-modo" type="button" data-modo="aviso">
          <b>${esc(T('Solo avisarme'))}</b>
          <span>${esc(T('Te avisa y confirmas tú. No cuesta gas.'))}</span>
        </button>
      </div>
    </div>

    <!-- Protección: solo tiene sentido al comprar. Si vendes, ya
         estás saliendo: no hay nada que proteger. -->
    ${!vender ? `<div class="od-campo od-opcional">
      <button class="od-toggle" id="od-sl-t" type="button">
        <span>${esc(T('Añadir stop de protección'))}</span>
        <i>${esc(T('opcional'))}</i>
      </button>
      <div class="od-sl" id="od-sl">
        <div class="od-inp-fila">
          <input class="od-inp" id="od-slp" type="text" inputmode="decimal"
                 placeholder="${fmt(vender ? precio * 1.03 : precio * 0.97)}" autocomplete="off">
          <span class="od-unidad">USDT</span>
        </div>
        <div class="od-nota">${esc(T('Opcional. Si tras comprar el precio cae hasta aquí, se vende para limitar la pérdida.'))}</div>
      </div>
    </div>` : ''}

    <div class="od-resumen" id="od-res"></div>

    <button class="od-confirmar" id="od-ok" type="button" disabled>
      ${esc(T(vender ? 'Poner orden de venta' : 'Poner orden de compra'))}
    </button>
    <div class="od-aviso">${esc(T('Opera bajo tu propio riesgo. Nada garantiza que el precio llegue.'))}</div>`;

  document.body.appendChild(d);
  colocar(d, cx, cy, true);
  d.addEventListener('click', (e) => e.stopPropagation());

  const inp = $('od-cant'), rango = $('od-rango'), ok = $('od-ok'), res = $('od-res');
  let modo = 'real';
  let saldo = 0;
  let _tokens = null;

  /* ══════════════════════════════════════════════════════════
     EL SALDO REAL

     Se lee de la wallet a través de `tokens.js`, que ya tiene el
     mapa de direcciones y decimales de las 31 monedas.

     Para vender hace falta la moneda; para comprar, USDT. Si no
     hay saldo, se dice claramente en vez de dejar la ficha muerta.
     ══════════════════════════════════════════════════════════ */
  (async () => {
    try {
      const tk = await import('./tokens.js?v=126');
      const gb = await import('./gridbot.js?v=126');
      const w = await import('./wallet.js?v=126');
      const cuenta = (w.cuenta && w.cuenta()) || (w.getCuenta && w.getCuenta()) || null;

      const simb = vender ? par : 'USDT';
      const mon = tk.MONEDAS[simb] || Object.values(tk.MONEDAS).find((m) => m.simbolo === simb);
      _tokens = { mon, monQuote: tk.MONEDAS.USDT };

      if (!cuenta) { sinSaldo(T('Conecta tu wallet para poder operar.')); return; }
      if (!mon || !mon.address) {
        sinSaldo(T('Esta moneda no está disponible en BNB Chain todavía.'));
        return;
      }

      const bruto = await gb.saldoParaMostrar(mon.address, cuenta);
      saldo = Number(bruto) || 0;

      if (!(saldo > 0)) {
        sinSaldo(vender
          ? `${T('Para vender')} ${par} ${T('primero tienes que comprarlo. No tienes saldo en tu wallet.')}`
          : `${T('Necesitas USDT en BNB Chain para comprar.')} ${T('Tu saldo es 0.')}`);
        return;
      }

      const et = d.querySelector('.od-saldo');
      if (et) et.innerHTML = `${esc(T('Disponible'))}: <b>${saldo < 1 ? saldo.toFixed(6) : saldo.toFixed(2)} ${esc(simb)}</b>`;
    } catch (er) {
      sinSaldo(T('No se pudo leer tu saldo. Revisa la conexión de tu wallet.'));
    }
  })();

  /** Cuando no hay con qué operar, se dice y se bloquea. */
  function sinSaldo(motivo) {
    const et = d.querySelector('.od-saldo');
    if (et) { et.className = 'od-saldo alerta'; et.textContent = motivo; }
    ok.disabled = true;
    ok.classList.add('bloqueado');
  }

  const refrescar = () => {
    const cant = parseFloat(String(inp.value).replace(',', '.')) || 0;
    /* Un aviso no mueve dinero: no hace falta saldo para ponerlo. */
    ok.disabled = modo === 'aviso' ? false : (!(cant > 0) || ok.classList.contains('bloqueado'));
    if (cant > 0) {
      const total = vender ? cant * precio : cant / precio;
      res.innerHTML = `
        <div class="od-r-fila"><span>${esc(T('Precio de la orden'))}</span><b>${fmt(precio)}</b></div>
        <div class="od-r-fila"><span>${esc(T(vender ? 'Recibirás' : 'Comprarás'))}</span><b>${
          vender ? fmt(total) + ' USDT' : total.toFixed(6) + ' ' + esc(par)}</b></div>
        <div class="od-r-fila"><span>${esc(T('Se ejecuta'))}</span><b>${
          esc(T(modo === 'real' ? 'automáticamente' : 'con tu confirmación'))}</b></div>`;
      res.classList.add('lleno');
    } else { res.innerHTML = ''; res.classList.remove('lleno'); }
  };

  inp.addEventListener('input', () => {
    // Solo números y un punto decimal
    inp.value = inp.value.replace(/[^0-9.,]/g, '').replace(',', '.');
    refrescar();
  });
  rango.addEventListener('input', () => {
    if (saldo > 0) { inp.value = (saldo * (rango.value / 100)).toFixed(6); refrescar(); }
  });
  d.querySelectorAll('[data-pct]').forEach((b) => b.onclick = () => {
    rango.value = b.dataset.pct;
    if (saldo > 0) { inp.value = (saldo * (b.dataset.pct / 100)).toFixed(6); refrescar(); }
    d.querySelectorAll('[data-pct]').forEach((x) => x.classList.toggle('on', x === b));
  });
  d.querySelectorAll('[data-modo]').forEach((b) => b.onclick = () => {
    modo = b.dataset.modo;
    d.querySelectorAll('[data-modo]').forEach((x) => x.classList.toggle('on', x === b));
    /* El botón dice lo que va a pasar: no es lo mismo poner una
       orden que activar un aviso. */
    ok.textContent = modo === 'aviso'
      ? T('Activar aviso')
      : T(vender ? 'Poner orden de venta' : 'Poner orden de compra');
    ok.classList.toggle('aviso', modo === 'aviso');
    refrescar();
  });
  $('od-sl-t').onclick = () => d.querySelector('.od-opcional').classList.toggle('abierto');
  d.querySelector('.od-x').onclick = cerrarTodo;

  ok.onclick = async () => {
    const cant = parseFloat(String(inp.value).replace(',', '.')) || 0;
    if (!(cant > 0)) return;
    const sl = parseFloat(String($('od-slp').value).replace(',', '.')) || 0;
    ok.disabled = true;
    ok.textContent = T('Confirma en tu wallet…');
    try {
      if (modo === 'aviso') {
        guardarAviso({
          par, simbolo: cfg.simbolo ? cfg.simbolo() : '', precio, cant, vender,
          sl, cuando: Date.now()
        });
        exito(d, T('Aviso puesto'), T('Te avisaremos cuando el precio llegue a') + ' ' + fmt(precio));
      } else {
        await ponerOrdenReal({ cfg, precio, cant, vender, sl });
        exito(d, T('Orden puesta'), T('Se ejecutará sola cuando el precio llegue a') + ' ' + fmt(precio));
      }
      if (cfg.alPoner) cfg.alPoner({ precio, cant, vender, modo });
    } catch (er) {
      ok.disabled = false;
      ok.textContent = T(vender ? 'Poner orden de venta' : 'Poner orden de compra');
      const m = String(er && er.message || er);
      fallo(d, /user rejected|denied/i.test(m)
        ? T('Cancelaste la firma.')
        : T('No se pudo poner la orden.'));
    }
  };

  setTimeout(() => { try { inp.focus(); } catch (_) {} }, 80);
}

/* ══════════════════════════════════════════════════════════════
   PONER LA ORDEN EN EL CONTRATO

   Una rejilla de UN SOLO NIVEL es exactamente una orden limit: el
   keeper la vigila y la ejecuta al llegar el precio. Se reutiliza
   lo que ya está desplegado.
   ══════════════════════════════════════════════════════════════ */
async function ponerOrdenReal({ cfg, precio, cant, vender, sl }) {
  const gb = await import('./gridbot.js?v=126');
  const tk = await import('./tokens.js?v=126');

  /* Las direcciones salen de `tokens.js`, que ya tiene el mapa de
     las 31 monedas con su dirección y decimales en BNB Chain. */
  const par = cfg.par ? cfg.par() : '';
  const base = tk.MONEDAS[par] || Object.values(tk.MONEDAS).find((m) => m.simbolo === par);
  const quote = tk.MONEDAS.USDT;

  if (!base || !base.address) {
    throw new Error(T('Esta moneda no está disponible en BNB Chain todavía.'));
  }

  const info = {
    base: base.address,
    quote: quote.address,
    pathCompra: [quote.address, base.address],
    pathVenta: [base.address, quote.address]
  };
  const dec = base.decimals ?? 18;
  const decQ = quote.decimals ?? 18;
  const unidad = (v, d) => BigInt(Math.round(v * Math.pow(10, Math.min(d, 12)))) *
                           (10n ** BigInt(Math.max(0, d - 12)));

  /* Un solo nivel, con el mínimo de salida calculado al precio que
     pidió el usuario. Eso es lo que hace que sea una orden limit:
     no se ejecuta a peor precio. */
  const nivel = vender
    ? { minOutCompra: 0n, minOutVenta: unidad(cant * precio * 0.995, decQ), estado: 1 }
    : { minOutCompra: unidad((cant / precio) * 0.995, dec), minOutVenta: 0n, estado: 1 };

  return gb.crearRejilla({
    base: info.base, quote: info.quote,
    pathCompra: info.pathCompra,
    pathVenta: info.pathVenta,
    ordenQuote: vender ? 0n : unidad(cant, decQ),
    ordenBase: vender ? unidad(cant, dec) : 0n,
    niveles: [nivel],
    slippageBps: 50,
    cooldownSeg: 0,
    tpUnitOut: 0n,
    slUnitOut: sl > 0 ? unidad(sl, decQ) : 0n,
    feeTier: 500,
    modo: 0,
    objetivoBps: 0, factorBps: 0,
    compraInicialQuote: 0n,
    margenBps: 0,
    botId: 0n,
    intervalo: 0n,
    comprasMax: 1
  });
}

/* ══════════════════════════════════════════════════════════════
   LOS AVISOS — sin gas, se guardan en el navegador
   ══════════════════════════════════════════════════════════════ */
function leerAvisos() {
  try { return JSON.parse(localStorage.getItem(CLAVE_AVISOS) || '[]'); } catch (_) { return []; }
}
function guardarAviso(a) {
  try {
    const l = leerAvisos();
    l.push({ ...a, id: Date.now() + '-' + Math.random().toString(36).slice(2, 7) });
    localStorage.setItem(CLAVE_AVISOS, JSON.stringify(l.slice(-40)));
  } catch (_) {}
}
export function quitarAviso(id) {
  try {
    localStorage.setItem(CLAVE_AVISOS, JSON.stringify(leerAvisos().filter((x) => x.id !== id)));
  } catch (_) {}
}
export const avisos = () => leerAvisos();

let _vigila = null;
function arrancarVigilante() {
  if (_vigila) return;
  _vigila = setInterval(async () => {
    const lista = leerAvisos();
    if (!lista.length) return;
    /* Se agrupan por símbolo para pedir un solo precio de cada uno */
    const simbolos = [...new Set(lista.map((x) => x.simbolo).filter(Boolean))];
    for (const s of simbolos) {
      try {
        const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${s}`);
        if (!r.ok) continue;
        const j = await r.json();
        const p = Number(j.price);
        lista.filter((x) => x.simbolo === s).forEach((a) => {
          const llegado = a.vender ? p >= a.precio : p <= a.precio;
          if (llegado) { sonar(a, p); quitarAviso(a.id); }
        });
      } catch (_) {}
    }
  }, 30000);
}

function sonar(a, precioAhora) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`${a.par} ${a.vender ? '▼' : '▲'} ${fmt(a.precio)}`, {
        body: T('El precio ha llegado a tu nivel. Abre CriptoCuba para confirmar la orden.'),
        icon: 'assets/img/aurex-192.png'
      });
    }
  } catch (_) {}

  const t = document.createElement('div');
  t.className = 'od-toast ' + (a.vender ? 'vender' : 'comprar');
  t.innerHTML = `
    <span class="od-t-ic">${a.vender ? '▼' : '▲'}</span>
    <div>
      <b>${esc(a.par)} ${esc(T('llegó a'))} ${fmt(a.precio)}</b>
      <span>${esc(T('Tu aviso se ha cumplido. Precio ahora:'))} ${fmt(precioAhora)}</span>
    </div>
    <button type="button" class="od-t-x">✕</button>`;
  document.body.appendChild(t);
  t.querySelector('.od-t-x').onclick = () => t.remove();
  setTimeout(() => { if (t.parentNode) t.remove(); }, 15000);
}

/* ══════════════════════════════════════════════════════════════
   UTILIDADES
   ══════════════════════════════════════════════════════════════ */
function colocar(el, cx, cy, grande) {
  const w = el.offsetWidth || (grande ? 320 : 210);
  const h = el.offsetHeight || (grande ? 420 : 130);
  const m = 10;
  let x = cx + 8, y = cy + 8;
  if (x + w > window.innerWidth - m) x = Math.max(m, cx - w - 8);
  if (y + h > window.innerHeight - m) y = Math.max(m, window.innerHeight - h - m);
  el.style.left = Math.max(m, x) + 'px';
  el.style.top = Math.max(m, y) + 'px';
}

function cerrarTodo() {
  document.querySelectorAll('.od-menu, .od-ficha').forEach((x) => x.remove());
}

function exito(d, titulo, texto) {
  d.innerHTML = `<div class="od-fin ok">
    <div class="od-fin-ic">✓</div>
    <b>${esc(titulo)}</b>
    <span>${esc(texto)}</span>
    <button class="od-confirmar" type="button">${esc(T('Entendido'))}</button>
  </div>`;
  d.querySelector('button').onclick = cerrarTodo;
  setTimeout(cerrarTodo, 6000);
}

function fallo(d, texto) {
  const prev = d.querySelector('.od-error');
  if (prev) prev.remove();
  const e = document.createElement('div');
  e.className = 'od-error';
  e.textContent = texto;
  const ok = d.querySelector('.od-confirmar');
  if (ok) ok.parentNode.insertBefore(e, ok);
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
   ══════════════════════════════════════════════════════════════ */
function estilos() {
  if ($('od-css')) return;
  const s = document.createElement('style'); s.id = 'od-css';
  s.textContent = `
  .od-menu,.od-ficha{position:fixed;z-index:9860;
    background:linear-gradient(165deg,rgba(22,28,38,.99),rgba(11,15,22,.99));
    border:1.5px solid #3a424c;border-radius:14px;
    box-shadow:0 18px 50px rgba(0,0,0,.8);animation:odEntra .18s ease both}
  @keyframes odEntra{from{opacity:0;transform:scale(.95) translateY(-6px)}to{opacity:1;transform:none}}
  .od-menu.comprar,.od-ficha.comprar{border-color:rgba(46,232,106,.55)}
  .od-menu.vender,.od-ficha.vender{border-color:rgba(246,70,93,.55)}

  /* El menú del clic derecho */
  .od-menu{width:214px;padding:11px}
  .od-m-cab{display:flex;align-items:center;gap:9px;margin-bottom:7px}
  .od-m-ic{font-size:14px}
  .od-menu.comprar .od-m-ic{color:#2ee86a}
  .od-menu.vender .od-m-ic{color:#f6465d}
  .od-m-cab b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:13px;color:#eaecef;line-height:1.2}
  .od-m-cab span{display:block;font-family:var(--mono,monospace);font-size:13px;
    color:var(--gold,#E8B84B);font-weight:700}
  .od-m-dist{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;margin-bottom:9px}
  .od-m-b{width:100%;min-height:38px;border-radius:9px;cursor:pointer;
    font-family:var(--display,sans-serif);font-weight:800;font-size:12.5px;border:none}
  .od-menu.comprar .od-m-b{background:linear-gradient(180deg,#4dffa0,#1fc96e);color:#04210f}
  .od-menu.vender .od-m-b{background:linear-gradient(180deg,#ff8a95,#e03546);color:#2a0509}

  /* La ficha */
  .od-ficha{width:min(330px, calc(100vw - 20px));max-height:calc(100vh - 24px);
    overflow-y:auto;padding:15px}
  .od-x{position:absolute;top:11px;right:11px;width:28px;height:28px;border-radius:8px;
    display:grid;place-items:center;padding:0;cursor:pointer;font-size:12px;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#8b96a3}
  .od-cab{display:flex;align-items:center;gap:10px;margin-bottom:6px;padding-right:32px}
  .od-ic{font-size:17px}
  .od-ficha.comprar .od-ic{color:#2ee86a}
  .od-ficha.vender .od-ic{color:#f6465d}
  .od-tit b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:15px;color:#eaecef;line-height:1.2}
  .od-tit span{display:block;font-family:var(--mono,monospace);font-size:13px;
    color:var(--gold,#E8B84B);font-weight:700;margin-top:1px}
  /* El porcentaje: el dato que decide, bien visible */
  .od-pct-grande{margin-left:auto;text-align:right;flex:0 0 auto}
  .od-pct-grande b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:23px;line-height:1;color:#2ee86a}
  .od-pct-grande span{display:block;font-family:var(--sans,sans-serif);font-size:10px;
    color:#3ee88a;margin-top:2px}
  .od-dist{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;margin-bottom:13px}
  .od-saldo{display:block;margin-top:5px;font-family:var(--mono,monospace);font-size:10.5px;color:#8b96a3}
  .od-saldo b{color:#eaecef}
  .od-saldo.alerta{padding:8px 10px;margin-top:7px;border-radius:8px;
    background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.3);
    font-family:var(--sans,sans-serif);font-size:11px;color:var(--gold,#E8B84B);line-height:1.45}

  .od-campo{margin-bottom:13px}
  .od-campo label{display:block;font-family:var(--mono,monospace);font-size:9px;
    color:#5c6672;text-transform:uppercase;letter-spacing:1.1px;margin-bottom:6px}
  .od-inp-fila{display:flex;align-items:center;gap:8px;padding:0 11px;border-radius:10px;
    background:#0b0e12;border:1px solid #2b3139}
  .od-inp-fila:focus-within{border-color:var(--gold-soft,#C9A84B)}
  .od-inp{flex:1;min-width:0;background:transparent;border:none;outline:none;
    color:#eaecef;font-family:var(--mono,monospace);font-size:15px;font-weight:700;
    padding:11px 0;min-height:44px}
  /* Sin las flechitas de incremento */
  .od-inp::-webkit-outer-spin-button,.od-inp::-webkit-inner-spin-button{
    -webkit-appearance:none;margin:0}
  .od-inp[type=number]{-moz-appearance:textfield}
  .od-unidad{font-family:var(--mono,monospace);font-size:11px;color:#7d8794;flex:0 0 auto}

  .od-rango{width:100%;margin:13px 0 14px;height:4px;border-radius:3px;
    -webkit-appearance:none;appearance:none;background:#2b3139;cursor:pointer}
  .od-rango::-webkit-slider-thumb{-webkit-appearance:none;width:17px;height:17px;
    border-radius:50%;background:var(--gold,#E8B84B);cursor:pointer;
    box-shadow:0 2px 6px rgba(0,0,0,.5)}
  .od-rango::-moz-range-thumb{width:17px;height:17px;border:none;border-radius:50%;
    background:var(--gold,#E8B84B);cursor:pointer}
  .od-pcts{display:flex;gap:5px}
  .od-pct{flex:1;min-height:30px;border-radius:7px;cursor:pointer;
    background:rgba(255,255,255,.04);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--mono,monospace);font-size:10px;font-weight:700}
  .od-pct.on,.od-pct:hover{border-color:var(--gold-soft,#C9A84B);color:var(--gold,#E8B84B)}

  .od-modos{display:flex;flex-direction:column;gap:6px}
  .od-modo{text-align:left;padding:10px 12px;border-radius:10px;cursor:pointer;
    background:rgba(255,255,255,.03);border:1px solid #2b3139}
  .od-modo.on{background:rgba(232,184,75,.1);border-color:var(--gold,#E8B84B)}
  .od-modo b{display:block;font-family:var(--display,sans-serif);font-weight:700;
    font-size:12.5px;color:#eaecef;margin-bottom:2px}
  .od-modo.on b{color:var(--gold,#E8B84B)}
  .od-modo span{display:block;font-family:var(--sans,sans-serif);font-size:10.5px;
    color:#7d8794;line-height:1.4}

  .od-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;
    min-height:38px;padding:0 12px;border-radius:9px;cursor:pointer;
    background:rgba(255,255,255,.03);border:1px solid #2b3139;color:#b7bdc6;
    font-family:var(--sans,sans-serif);font-size:12px}
  .od-toggle i{font-style:normal;font-family:var(--mono,monospace);font-size:9px;color:#5c6672}
  .od-sl{display:none;margin-top:8px}
  .od-opcional.abierto .od-sl{display:block}
  .od-nota{margin-top:6px;font-family:var(--sans,sans-serif);font-size:10.5px;
    color:#7d8794;line-height:1.45}

  .od-resumen{display:none;margin-bottom:12px;padding:11px;border-radius:10px;
    background:rgba(0,0,0,.35);border:1px solid #232a33}
  .od-resumen.lleno{display:block}
  .od-r-fila{display:flex;justify-content:space-between;gap:9px;padding:3px 0}
  .od-r-fila span{font-family:var(--sans,sans-serif);font-size:11.5px;color:#8b96a3}
  .od-r-fila b{font-family:var(--mono,monospace);font-size:12px;color:#eaecef}

  .od-confirmar{width:100%;min-height:46px;border-radius:11px;cursor:pointer;border:none;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px}
  .od-ficha.comprar .od-confirmar{background:linear-gradient(180deg,#4dffa0,#1fc96e);
    color:#04210f;box-shadow:0 4px 0 #157a44}
  .od-ficha.vender .od-confirmar{background:linear-gradient(180deg,#ff8a95,#e03546);
    color:#2a0509;box-shadow:0 4px 0 #8f1f2b}
  .od-confirmar.aviso{background:linear-gradient(180deg,#f7db8d,#E8B84B 50%,#c79426) !important;
    color:#3a2800 !important;box-shadow:0 4px 0 #8f6a1a !important}
  .od-confirmar:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
  .od-aviso{margin-top:9px;text-align:center;font-family:var(--sans,sans-serif);
    font-size:10px;color:#5c6672;line-height:1.4}
  .od-error{margin-bottom:9px;padding:9px 11px;border-radius:9px;
    background:rgba(246,70,93,.12);border:1px solid rgba(246,70,93,.35);
    font-family:var(--sans,sans-serif);font-size:11.5px;color:#ff6b7a}

  .od-fin{text-align:center;padding:14px 4px}
  .od-fin-ic{width:52px;height:52px;margin:0 auto 12px;border-radius:50%;
    display:grid;place-items:center;font-size:25px;
    background:rgba(46,232,106,.15);color:#2ee86a;border:2px solid rgba(46,232,106,.5)}
  .od-fin b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:16px;color:#eaecef;margin-bottom:6px}
  .od-fin span{display:block;font-family:var(--sans,sans-serif);font-size:12px;
    color:#8b96a3;line-height:1.5;margin-bottom:14px}

  /* El aviso cuando el precio llega */
  .od-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:20px;z-index:9880;
    display:flex;align-items:center;gap:11px;max-width:calc(100vw - 24px);
    padding:12px 14px;border-radius:13px;
    background:linear-gradient(165deg,rgba(22,28,38,.99),rgba(11,15,22,.99));
    border:1.5px solid #3a424c;box-shadow:0 14px 44px rgba(0,0,0,.8);
    animation:odSube .3s ease both}
  @keyframes odSube{from{opacity:0;transform:translateX(-50%) translateY(14px)}
                    to{opacity:1;transform:translateX(-50%)}}
  .od-toast.comprar{border-color:rgba(46,232,106,.55)}
  .od-toast.vender{border-color:rgba(246,70,93,.55)}
  .od-t-ic{font-size:16px;flex:0 0 auto}
  .od-toast.comprar .od-t-ic{color:#2ee86a}
  .od-toast.vender .od-t-ic{color:#f6465d}
  .od-toast b{display:block;font-family:var(--display,sans-serif);font-weight:800;
    font-size:13px;color:#eaecef}
  .od-toast span{display:block;font-family:var(--sans,sans-serif);font-size:11px;color:#8b96a3}
  .od-t-x{width:26px;height:26px;flex:0 0 auto;border-radius:7px;cursor:pointer;
    display:grid;place-items:center;padding:0;font-size:11px;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#8b96a3}

  @media(max-width:560px){
    /* En el móvil la ficha va abajo, a lo ancho */
    .od-ficha{position:fixed !important;left:8px !important;right:8px !important;
      top:auto !important;bottom:10px !important;width:auto !important;
      max-height:min(78dvh, 620px)}
    .od-menu{width:196px}
  }`;
  document.head.appendChild(s);
}
