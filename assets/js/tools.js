// tools.js — Herramientas de CriptoCuba. Módulo independiente.
//
// Se carga solo cuando alguien abre el menú de herramientas, así que no
// pesa nada para quien no las usa.
//
// DENTRO:
//   · Colector de polvo — junta los restos de monedas y los pasa a una sola
//   · Alertas de precio — avisa cuando una moneda llega a un precio

import * as ethers from './vendor/ethers-6.13.4.min.js?v=125';
import * as wallet from './wallet.js?v=125';
import * as gb from './gridbot.js?v=125';
import { MONEDAS } from './tokens.js?v=125';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* En el móvil los campos numéricos pintan unas flechitas que no hay
   forma de quitar en algunos navegadores. Con type=text + inputmode
   sale el mismo teclado numérico y ninguna flecha. */
const esMovil = () => window.matchMedia('(max-width: 760px)').matches;
const num = (v, d = 2) => Number(v).toLocaleString('es', { maximumFractionDigits: d });

/* ══════════════════ MENÚ DE HERRAMIENTAS ══════════════════ */

const HERRAMIENTAS = [
  {
    id: 'polvo',
    t: 'Colector de polvo',
    d: 'Junta los restos de monedas que te van quedando y los pasa todos a una sola.',
    ico: '<path d="M3 7h18M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/>',
    listo: true
  },
  {
    id: 'alertas',
    t: 'Alertas de precio',
    d: 'Te avisa cuando una moneda llega al precio que marques.',
    ico: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    listo: true
  }
];

export function abrirTools() {
  estilos();
  const prev = $('tl-overlay'); if (prev) prev.remove();

  const d = document.createElement('div');
  d.id = 'tl-overlay';
  d.innerHTML = `<div class="tl-bg"></div>
    <div class="tl-c">
      <div class="tl-top">
        <div class="tl-eyebrow">Herramientas</div>
        <button class="tl-x" aria-label="Cerrar">✕</button>
      </div>
      <p class="tl-s">Cosas útiles para el día a día con tus bots.</p>

      <div class="tl-lista">
        ${HERRAMIENTAS.map((h) => `
          <button class="tl-item" data-tool="${h.id}">
            <span class="tl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${h.ico}</svg></span>
            <span class="tl-tx"><b>${h.t}</b><em>${h.d}</em></span>
            <svg class="tl-go" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>`).join('')}
      </div>

      <div class="tl-msg" id="tl-msg"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => { const e = $('tl-overlay'); if (e) e.remove(); };
  d.querySelector('.tl-bg').onclick = cerrar;
  d.querySelector('.tl-x').onclick = cerrar;

  d.querySelectorAll('[data-tool]').forEach((b) => b.onclick = () => {
    if (b.dataset.tool === 'polvo') abrirPolvo();
    if (b.dataset.tool === 'alertas') abrirAlertas();
  });
}

function decir(txt, clase = '') {
  const e = $('tl-msg'); if (!e) return;
  e.className = 'tl-msg ' + clase;
  e.innerHTML = txt;
  if (txt) setTimeout(() => { if (e.innerHTML === txt) { e.innerHTML = ''; e.className = 'tl-msg'; } }, 11000);
}

/* ══════════════════════════════════════════════════════════════
   COLECTOR DE POLVO
   Operando con bots siempre quedan restos: 0,40 de una moneda, 1,20 de
   otra. Por separado no valen la pena (el gas se come el cambio), pero
   juntos sí. Esta herramienta los reúne y los pasa a una sola moneda.
   ══════════════════════════════════════════════════════════════ */

const ABI20 = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

/* Por debajo de esto no compensa: el gas costaría más que la moneda. */
const MINIMO_USD = 0.30;

let _saldos = [];
let _destino = 'USDT';

async function abrirPolvo() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { decir('Conecta tu wallet primero, arriba a la derecha.', 'mal'); return; }

  const prev = $('pv-overlay'); if (prev) prev.remove();
  const d = document.createElement('div');
  d.id = 'pv-overlay';
  d.innerHTML = `<div class="pv-bg"></div>
    <div class="pv-c">
      <div class="tl-top">
        <div class="tl-eyebrow">Colector de polvo</div>
        <button class="pv-x" aria-label="Cerrar">✕</button>
      </div>
      <p class="tl-s">Estos son los restos que tienes repartidos. Elige a qué moneda quieres pasarlos todos.</p>
      <div id="pv-cuerpo">
        <div class="pv-cargando">
          <div class="pv-spin"></div>
          <div class="pv-carga-t">Revisando tu wallet</div>
          <div class="pv-carga-s" id="pv-avance">Buscando monedas con saldo…</div>
        </div>
      </div>
      <div class="tl-msg" id="pv-msg"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => { const e = $('pv-overlay'); if (e) e.remove(); };
  d.querySelector('.pv-bg').onclick = cerrar;
  d.querySelector('.pv-x').onclick = cerrar;

  cargarSaldos(cuenta);
}

function decirP(txt, clase = '') {
  const e = $('pv-msg'); if (!e) return;
  e.className = 'tl-msg ' + clase; e.innerHTML = txt;
  if (txt) setTimeout(() => { if (e.innerHTML === txt) { e.innerHTML = ''; e.className = 'tl-msg'; } }, 12000);
}

async function cargarSaldos(cuenta) {
  const box = $('pv-cuerpo'); if (!box) return;
  const prov = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org', 56, { staticNetwork: true });

  // Precios en dólares, para saber qué es polvo y qué no
  let precios = {};
  try {
    const ids = Object.values(MONEDAS).map((m) => m.cg).filter(Boolean);
    const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${[...new Set(ids)].join(',')}&vs_currencies=usd`);
    precios = await r.json();
  } catch (_) {}

  /* Los saldos, en lotes de 5. De una en una tardaba una eternidad (28
     viajes encadenados); todas a la vez, el servidor rechaza la mitad. */
  const lista = Object.entries(MONEDAS);
  const encontrados = [];

  for (let i = 0; i < lista.length; i += 5) {
    const res = await Promise.all(lista.slice(i, i + 5).map(async ([id, m]) => {
      try {
        let saldo = 0n;
        if (!m.address || m.address === '0x0000000000000000000000000000000000000000') {
          saldo = await prov.getBalance(cuenta);
        } else {
          saldo = await new ethers.Contract(m.address, ABI20, prov).balanceOf(cuenta);
        }
        if (saldo === 0n) return null;
        const cant = Number(ethers.formatUnits(saldo, m.decimals ?? 18));
        const precio = (precios[m.cg] && precios[m.cg].usd) || 0;
        return { id, m, saldo, cant, usd: cant * precio, precio };
      } catch (_) { return null; }
    }));
    res.forEach((x) => { if (x) encontrados.push(x); });
    // Se va pintando lo que ya hay: el usuario ve avance, no una pantalla muerta.
    const av = $('pv-avance');
    if (av) av.textContent = `Revisando… ${Math.min(i + 5, lista.length)} de ${lista.length} monedas`;
  }

  encontrados.sort((a, b) => b.usd - a.usd);
  _saldos = encontrados;

  const polvo = encontrados.filter((x) => x.usd >= MINIMO_USD);
  const migajas = encontrados.filter((x) => x.usd > 0 && x.usd < MINIMO_USD);

  if (encontrados.length === 0) {
    box.innerHTML = `<div class="tl-vacio">No encontramos monedas en tu wallet en esta red.</div>`;
    return;
  }

  box.innerHTML = `
    <div class="pv-destino">
      <span>Pasarlo todo a</span>
      <div class="pv-opts">
        <button class="pv-opt on" data-dest="USDT">USDT</button>
        <button class="pv-opt" data-dest="BNB">BNB</button>
      </div>
    </div>

    <div class="pv-lista">
      ${polvo.map((x, i) => `
        <label class="pv-fila">
          <input type="checkbox" class="pv-chk" data-i="${i}" ${x.id === _destino ? 'disabled' : 'checked'}>
          <span class="pv-mon">
            <b>${esc(x.m.simbolo)}</b>
            <em>${num(x.cant, 6)}</em>
          </span>
          <span class="pv-usd">${x.usd > 0 ? '$' + num(x.usd, 2) : '—'}</span>
        </label>`).join('')}
    </div>

    ${migajas.length ? `<div class="pv-migajas">
      <b>${migajas.length} moneda${migajas.length > 1 ? 's' : ''} por debajo de $${MINIMO_USD}</b>
      No las incluimos: el gas costaría más que lo que valen. Aquí están por si acaso:
      <span>${migajas.map((x) => esc(x.m.simbolo) + ' ' + num(x.cant, 4)).join(' · ')}</span>
    </div>` : ''}

    <div class="pv-total" id="pv-total"></div>

    <button class="pv-b" id="pv-juntar">Juntar lo marcado</button>

    <div class="pv-nota">
      Se hace <b>un intercambio por moneda</b>, así que firmarás varias veces. Cada uno cuesta su gas: por eso solo compensa con restos que valgan algo.
    </div>`;

  const recalcular = () => {
    let n = 0, usd = 0;
    box.querySelectorAll('.pv-chk:checked').forEach((c) => {
      const x = polvo[Number(c.dataset.i)];
      if (x) { n++; usd += x.usd; }
    });
    const t = $('pv-total');
    if (t) t.innerHTML = n === 0
      ? `<span class="vacio">No has marcado nada</span>`
      : `Vas a juntar <b>${n} moneda${n > 1 ? 's' : ''}</b> por un valor de <b>$${num(usd, 2)}</b>`;
    const b = $('pv-juntar');
    if (b) b.disabled = n === 0;
  };
  box.querySelectorAll('.pv-chk').forEach((c) => c.onchange = recalcular);
  recalcular();

  /* Cambiar de destino NO recarga los saldos (eso tardaba y parecía que
     se rompía). Solo se marca la moneda destino como no seleccionable. */
  box.querySelectorAll('[data-dest]').forEach((b) => b.onclick = () => {
    _destino = b.dataset.dest;
    box.querySelectorAll('.pv-opt').forEach((x) => x.classList.toggle('on', x.dataset.dest === _destino));
    box.querySelectorAll('.pv-chk').forEach((c) => {
      const x = polvo[Number(c.dataset.i)];
      const esDestino = x && x.id === _destino;
      c.disabled = esDestino;
      if (esDestino) c.checked = false;
      c.closest('.pv-fila').classList.toggle('destino', !!esDestino);
    });
    recalcular();
  });

  $('pv-juntar').onclick = () => {
    const elegidos = [];
    box.querySelectorAll('.pv-chk:checked').forEach((c) => {
      const x = polvo[Number(c.dataset.i)];
      if (x) elegidos.push(x);
    });
    confirmarJuntar(elegidos, cuenta);
  };
}

function confirmarJuntar(elegidos, cuenta) {
  const total = elegidos.reduce((s, x) => s + x.usd, 0);
  const d = document.createElement('div');
  d.id = 'pv-conf';
  d.innerHTML = `<div class="pv-bg"></div>
    <div class="pvc-c">
      <div class="pvc-t">Juntar ${elegidos.length} moneda${elegidos.length > 1 ? 's' : ''}</div>
      <div class="pvc-s">Se cambiarán todas a <b>${_destino}</b>, por un valor aproximado de <b>$${num(total, 2)}</b>.</div>
      <div class="pvc-lista">${elegidos.map((x) => `<span>${esc(x.m.simbolo)} <i>${num(x.cant, 6)}</i></span>`).join('')}</div>
      <div class="pvc-aviso">
        Firmarás <b>${elegidos.length} intercambio${elegidos.length > 1 ? 's' : ''}</b>, uno por moneda. Si alguno falla, los demás siguen: no se pierde nada.
        <i>El precio final puede variar un poco mientras se ejecuta. Es normal en cualquier intercambio.</i>
      </div>
      <div class="pvc-acts">
        <button class="pv-b gris" data-no>Cancelar</button>
        <button class="pv-b" data-si>Empezar</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.pv-bg').onclick = q;
  d.querySelector('[data-no]').onclick = q;
  d.querySelector('[data-si]').onclick = () => { q(); juntar(elegidos, cuenta); };
}

async function juntar(elegidos, cuenta) {
  const b = $('pv-juntar');
  if (b) b.disabled = true;
  let hechos = 0;
  const fallos = [];

  for (let i = 0; i < elegidos.length; i++) {
    const x = elegidos[i];
    decirP(`Cambiando <b>${esc(x.m.simbolo)}</b> (${i + 1} de ${elegidos.length})… firma en tu wallet`, 'info');
    try {
      const destino = MONEDAS[_destino];
      // Primero se pide precio, luego se ejecuta. Igual que el swap normal.
      const cot = await gb.cotizarSwap({
        inAddr: x.m.address, outAddr: destino.address,
        amountInBI: x.saldo, slippageBps: 150      // margen amplio: son cantidades pequeñas
      });
      if (!cot || !cot.minOut) throw new Error('sin mercado');

      // Si no es la moneda nativa, hay que dar permiso primero.
      if (!gb.esNativoSwap(x.m.address)) {
        const permiso = await gb.allowanceSwap(x.m.address, cuenta);
        if (permiso < x.saldo) await gb.aprobarSwap(x.m.address, x.saldo);
      }
      await gb.ejecutarSwap({
        inAddr: x.m.address, outAddr: destino.address,
        amountInBI: x.saldo, minOut: cot.minOut, fee: cot.fee
      });
      hechos++;
    } catch (e) {
      const m = String(e?.shortMessage || e?.reason || e?.message || e);
      if (/reject|denied|cancel/i.test(m)) { decirP('Cancelaste. Lo hecho hasta ahora se mantiene.', ''); break; }
      fallos.push(esc(x.m.simbolo));
    }
  }

  decirP(
    fallos.length === 0
      ? `Listo: <b>${hechos}</b> moneda${hechos !== 1 ? 's' : ''} convertida${hechos !== 1 ? 's' : ''} a ${_destino}.`
      : `Convertidas ${hechos}. No se pudo con: ${fallos.join(', ')}.<br>Puede que no tengan mercado suficiente.`,
    fallos.length ? 'mal' : 'ok'
  );
  if (b) b.disabled = false;
  setTimeout(() => cargarSaldos(cuenta), 2500);
}

/* ══════════════════════════════════════════════════════════════
   ALERTAS DE PRECIO
   Guardadas en el navegador. Sin servidor de por medio: mientras la
   pestaña esté abierta (o la app instalada), comprueba y avisa.
   ══════════════════════════════════════════════════════════════ */

const CLAVE_ALERTAS = 'aurex-alertas';
const leerAlertas = () => { try { return JSON.parse(localStorage.getItem(CLAVE_ALERTAS) || '[]'); } catch (_) { return []; } };
const guardarAlertas = (a) => { try { localStorage.setItem(CLAVE_ALERTAS, JSON.stringify(a)); } catch (_) {} };

async function abrirAlertas() {
  const prev = $('al-overlay'); if (prev) prev.remove();
  const d = document.createElement('div');
  d.id = 'al-overlay';
  d.innerHTML = `<div class="pv-bg"></div>
    <div class="pv-c">
      <div class="tl-top">
        <div class="tl-eyebrow">Alertas de precio</div>
        <button class="pv-x" aria-label="Cerrar">✕</button>
      </div>
      <p class="tl-s">Te avisamos cuando una moneda llegue al precio que marques.</p>
      <div id="al-cuerpo"></div>
      <div class="tl-msg" id="pv-msg"></div>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => { const e = $('al-overlay'); if (e) e.remove(); };
  d.querySelector('.pv-bg').onclick = cerrar;
  d.querySelector('.pv-x').onclick = cerrar;
  pintarAlertas();
}

let _alMoneda = 'BNB';
let _alDir = 'sube';

function pintarAlertas() {
  const box = $('al-cuerpo'); if (!box) return;
  const alertas = leerAlertas();
  /* Solo monedas cuyo precio SE MUEVE. Poner una alerta a USDT o USDC
     no tiene sentido: valen un dólar y ahí se quedan. */
  const ESTABLES = ['USDT', 'USDC', 'USDTZ', 'BUSD', 'DAI', 'TUSD', 'FDUSD'];
  const monedas = Object.entries(MONEDAS)
    .filter(([id, m]) => m.cg && !ESTABLES.includes(id));

  box.innerHTML = `
    <div class="al-paso"><span>1</span>Elige la moneda</div>
    <button class="al-selector" id="al-abrir">
      <span class="al-mon-i" data-logo="${esc((MONEDAS[_alMoneda] || {}).cg || '')}" data-dir="${esc((MONEDAS[_alMoneda] || {}).address || '')}" data-ini="${esc(((MONEDAS[_alMoneda] || {}).simbolo || '?')[0])}" style="border-color:${(MONEDAS[_alMoneda] || {}).color}55;--c:${(MONEDAS[_alMoneda] || {}).color}"></span>
      <span class="al-sel-tx"><b>${esc((MONEDAS[_alMoneda] || {}).simbolo || '')}</b><em>${esc((MONEDAS[_alMoneda] || {}).nombre || '')}</em></span>
      <svg class="al-sel-v" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
    </button>

    <div class="al-paso"><span>2</span>Avísame cuando el precio…</div>
    <div class="al-dirs">
      <button class="al-dir ${_alDir === 'sube' ? 'on' : ''}" data-dir="sube">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        suba a
      </button>
      <button class="al-dir ${_alDir === 'baja' ? 'on' : ''}" data-dir="baja">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
        baje a
      </button>
    </div>

    <div class="al-paso"><span>3</span>El precio</div>
    <div class="al-precio">
      <span class="al-dolar">$</span>
      <input id="al-precio" class="al-in" type="text" placeholder="0.00" inputmode="decimal" autocomplete="off">
      <div class="al-pasos">
        <button class="al-paso-b" id="al-mas" type="button" aria-label="Subir"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7-7 7 7"/></svg></button>
        <button class="al-paso-b" id="al-menos" type="button" aria-label="Bajar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M19 9l-7 7-7-7"/></svg></button>
      </div>
    </div>
    <div class="al-ahora" id="al-ahora"></div>

    <button class="pv-b" id="al-add">Crear alerta</button>

    ${alertas.length ? `
      <div class="al-titulo">Tus alertas</div>
      <div class="al-lista">${alertas.map((a, i) => {
        const mm = MONEDAS[a.id] || {};
        return `<div class="al-fila ${a.saltada ? 'saltada' : ''}">
          <span class="al-mon-i chico" data-logo="${esc(a.cg || '')}" data-dir="${esc(mm.address || '')}" data-ini="${esc(a.sim[0])}" style="border-color:${(mm.color || '#888')}55;--c:${mm.color || '#888'}"></span>
          <span class="al-tx"><b>${esc(a.sim)}</b> ${a.dir === 'sube' ? 'suba a' : 'baje a'} <b>$${num(a.precio, 6)}</b></span>
          ${a.saltada ? '<span class="al-ya">avisada</span>' : ''}
          <button class="al-del" data-del="${i}" aria-label="Borrar">✕</button>
        </div>`;
      }).join('')}</div>` : ''}

    <div class="pv-nota">
      Las alertas viven <b>en este navegador</b>, no en un servidor. Funcionan mientras tengas CriptoCuba abierto o instalado como app.
    </div>`;

  ponerLogos();

  /* Desplegable de monedas, con la misma dinámica que en los bots:
     una barra que abre una lista, no 26 botones ocupando la pantalla. */
  $('al-abrir').onclick = () => {
    const d = document.createElement('div');
    d.id = 'al-picker';
    d.innerHTML = `<div class="alp-bg"></div>
      <div class="alp-c">
        <div class="alp-cab">
          <span>Elige la moneda</span>
          <button class="alp-x" aria-label="Cerrar">✕</button>
        </div>
        <input class="alp-buscar" id="alp-q" placeholder="Buscar…" autocomplete="off">
        <div class="alp-lista" id="alp-lista">
          ${monedas.map(([id, m]) => `
            <button class="alp-item ${id === _alMoneda ? 'on' : ''}" data-pick="${id}" data-busca="${esc((m.simbolo + ' ' + m.nombre).toLowerCase())}">
              <span class="al-mon-i" data-logo="${esc(m.cg)}" data-dir="${esc(m.address || '')}" data-ini="${esc(m.simbolo[0])}" style="border-color:${m.color}55;--c:${m.color}"></span>
              <span class="alp-tx"><b>${esc(m.simbolo)}</b><em>${esc(m.nombre)}</em></span>
              ${id === _alMoneda ? '<svg class="alp-ok" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg>' : ''}
            </button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(d);
    // Los logos, DESPUÉS de que el desplegable esté en la página.
    setTimeout(ponerLogos, 30);
    const q = () => d.remove();
    d.querySelector('.alp-bg').onclick = q;
    d.querySelector('.alp-x').onclick = q;
    $('alp-q').oninput = (e) => {
      const t = e.target.value.toLowerCase().trim();
      d.querySelectorAll('.alp-item').forEach((x) => {
        x.style.display = !t || x.dataset.busca.includes(t) ? '' : 'none';
      });
    };
    d.querySelectorAll('[data-pick]').forEach((b) => b.onclick = () => {
      _alMoneda = b.dataset.pick;
      q();
      pintarAlertas();
    });
    setTimeout(() => { try { $('alp-q').focus(); } catch (_) {} }, 100);
  };

  // Precio de ahora, para que sepa dónde está antes de elegir
  const verPrecio = async () => {
    const el = $('al-ahora'); if (!el) return;
    const m = MONEDAS[_alMoneda];
    el.textContent = 'consultando…';
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${m.cg}&vs_currencies=usd`);
      const j = await r.json();
      const p = j[m.cg] && j[m.cg].usd;
      el.innerHTML = p ? `${esc(m.simbolo)} está ahora en <b>$${num(p, 6)}</b>` : '';
    } catch (_) { el.textContent = ''; }
  };
  verPrecio();


  box.querySelectorAll('[data-dir]').forEach((b) => b.onclick = () => {
    _alDir = b.dataset.dir;
    box.querySelectorAll('.al-dir').forEach((x) => x.classList.toggle('on', x.dataset.dir === _alDir));
  });

  /* Los botones de subir y bajar el precio: el paso se adapta al valor,
     que no es lo mismo ajustar 0,08 que 68.000. */
  const _paso = (v) => {
    const a = Math.abs(v);
    if (a >= 10000) return 100;
    if (a >= 1000) return 10;
    if (a >= 100) return 1;
    if (a >= 10) return 0.1;
    if (a >= 1) return 0.01;
    if (a >= 0.01) return 0.001;
    return 0.00001;
  };
  const _mover = (signo) => {
    const el = $('al-precio');
    const v = Number(String(el.value).replace(',', '.')) || 0;
    const p = _paso(v);
    const nuevo = Math.max(0, v + signo * p);
    el.value = nuevo.toFixed(String(p).split('.')[1]?.length || 0);
  };
  $('al-mas').onclick = () => _mover(1);
  $('al-menos').onclick = () => _mover(-1);

  $('al-add').onclick = async () => {
    const precio = Number($('al-precio').value);
    if (!isFinite(precio) || precio <= 0) { decirP('Escribe un precio válido.', 'mal'); return; }
    const m = MONEDAS[_alMoneda];
    const a = leerAlertas();
    a.push({ id: _alMoneda, sim: m.simbolo, cg: m.cg, dir: _alDir, precio, saltada: false, creada: Date.now() });
    guardarAlertas(a);
    try { if (window.Notification && Notification.permission === 'default') await Notification.requestPermission(); } catch (_) {}
    decirP(`Listo: te avisamos cuando ${esc(m.simbolo)} ${_alDir === 'sube' ? 'suba a' : 'baje a'} $${num(precio, 6)}.`, 'ok');
    pintarAlertas();
    vigilar();
  };

  box.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => {
    const a = leerAlertas();
    a.splice(Number(b.dataset.del), 1);
    guardarAlertas(a);
    pintarAlertas();
  });
}

/* ── LOGOS DE LAS MONEDAS ──────────────────────────────────────
   Los trae CoinGecko, que es la misma fuente que ya usamos para los
   precios. Se guardan en el navegador un día: así no se piden otra vez
   en cada visita. Si alguno no llega, queda el círculo con su color y
   no se rompe nada. */
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
      const ids = [...new Set(Object.values(MONEDAS).map((m) => m.cg).filter(Boolean))];
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&per_page=250`);
      const j = await r.json();
      _logos = {};
      j.forEach((x) => { _logos[x.id] = x.image; });
      try { localStorage.setItem(CLAVE_LOGOS, JSON.stringify({ cuando: Date.now(), datos: _logos })); } catch (_) {}
    } catch (_) { _logos = {}; }
  }
  /* Si CoinGecko no responde (pasa a menudo), se usa el repositorio de
     iconos de TrustWallet, que sirve la imagen por DIRECCIÓN del token.
     Y si tampoco, queda la inicial de la moneda con su color: nunca un
     círculo vacío. */
  document.querySelectorAll('[data-logo]').forEach((el) => {
    const id = el.dataset.logo;
    const url = (_logos && _logos[id]) || null;
    const dir = el.dataset.dir;

    const poner = (u) => {
      const img = new Image();
      img.onload = () => { el.style.backgroundImage = `url(${u})`; el.classList.add('con-logo'); };
      img.onerror = () => { el.classList.add('sin-logo'); };
      img.src = u;
    };

    if (url) { poner(url); return; }
    if (dir && dir.length === 42) {
      poner(`https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${ethers.getAddress(dir)}/logo.png`);
      return;
    }
    el.classList.add('sin-logo');
  });
}

/* Comprueba los precios cada minuto y avisa cuando toca. */
let _timer = null;
export function vigilar() {
  if (_timer) return;
  const comprobar = async () => {
    const a = leerAlertas().filter((x) => !x.saltada);
    if (a.length === 0) return;
    try {
      const ids = [...new Set(a.map((x) => x.cg))].join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      const p = await r.json();
      const todas = leerAlertas();
      let cambio = false;
      todas.forEach((x) => {
        if (x.saltada) return;
        const ahora = p[x.cg] && p[x.cg].usd;
        if (!ahora) return;
        const toca = x.dir === 'sube' ? ahora >= x.precio : ahora <= x.precio;
        if (toca) {
          x.saltada = true; cambio = true;
          avisar(`${x.sim} ${x.dir === 'sube' ? 'subió a' : 'bajó a'} $${num(ahora, 6)}`);
        }
      });
      if (cambio) guardarAlertas(todas);
    } catch (_) {}
  };
  comprobar();
  _timer = setInterval(comprobar, 60000);
}

function avisar(texto) {
  try {
    if (Notification && Notification.permission === 'granted') {
      new Notification('CriptoCuba · alerta de precio', { body: texto, icon: 'assets/img/cco-192.png' });
      return;
    }
  } catch (_) {}
  // Sin permiso: aviso dentro de la propia página
  const d = document.createElement('div');
  d.className = 'al-toast';
  d.innerHTML = `<b>Alerta de precio</b>${esc(texto)}`;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 9000);
}

/* ══════════════════ ESTILOS ══════════════════ */
function estilos() {
  if ($('tl-css')) return;
  const s = document.createElement('style'); s.id = 'tl-css';
  s.textContent = `
  #tl-overlay,#pv-overlay,#al-overlay,#pv-conf{position:fixed;inset:0;z-index:9700;display:flex;align-items:center;justify-content:center;padding:16px}
  #pv-overlay,#al-overlay{z-index:9710}
  #pv-conf{z-index:9720}
  #tl-overlay .tl-bg,#pv-overlay .pv-bg,#al-overlay .pv-bg,#pv-conf .pv-bg{position:absolute;inset:0;background:rgba(3,5,8,.9);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px)}
  #tl-overlay .tl-c,#pv-overlay .pv-c,#al-overlay .pv-c{position:relative;width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow-y:auto;
    background:linear-gradient(180deg,#141922,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:22px 20px}
  #tl-overlay .tl-top,#pv-overlay .tl-top,#al-overlay .tl-top{position:relative;display:flex;align-items:center;justify-content:center;min-height:36px;margin-bottom:10px}
  #tl-overlay .tl-eyebrow,#pv-overlay .tl-eyebrow,#al-overlay .tl-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:2px}
  #tl-overlay .tl-x,#pv-overlay .pv-x,#al-overlay .pv-x{position:absolute;top:0;right:0;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;padding:0;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer;font-size:15px}
  #tl-overlay .tl-s,#pv-overlay .tl-s,#al-overlay .tl-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;text-align:center;line-height:1.6;margin:0 0 20px}
  #tl-overlay .tl-lista{display:flex;flex-direction:column;gap:9px}
  #tl-overlay .tl-item{display:flex;align-items:center;gap:14px;padding:16px;border-radius:15px;text-align:left;
    background:rgba(255,255,255,.03);border:1px solid #2b3139;color:#eaecef;cursor:pointer;transition:border-color .15s ease,transform .15s ease}
  #tl-overlay .tl-item:hover{border-color:var(--gold-soft,#C9A84B);transform:translateY(-1px)}
  #tl-overlay .tl-ico{flex:0 0 auto;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;
    background:rgba(232,184,75,.11);border:1px solid rgba(232,184,75,.3);color:var(--gold,#E8B84B)}
  #tl-overlay .tl-ico svg{width:20px;height:20px}
  #tl-overlay .tl-tx{flex:1;min-width:0}
  #tl-overlay .tl-tx b{display:block;font-family:var(--display,sans-serif);font-size:15px}
  #tl-overlay .tl-tx em{display:block;font-style:normal;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;margin-top:4px;line-height:1.5}
  #tl-overlay .tl-go{width:17px;height:17px;flex:0 0 auto;color:#6b7681}
  .tl-cargando,.tl-vacio{font-family:var(--mono,monospace);font-size:12px;color:#7d8794;text-align:center;padding:30px 10px;line-height:1.7}
  .tl-msg{font-family:var(--mono,monospace);font-size:12px;text-align:center;margin-top:14px;min-height:17px;line-height:1.6}
  .tl-msg.ok{color:var(--neon-lit,#2ee86a)} .tl-msg.mal{color:var(--rojo,#f6465d)} .tl-msg.info{color:var(--gold,#E8B84B)}

  #pv-overlay .pv-cargando{text-align:center;padding:38px 16px}
  #pv-overlay .pv-spin{width:34px;height:34px;margin:0 auto 16px;border-radius:50%;
    border:2.5px solid rgba(232,184,75,.18);border-top-color:var(--gold,#E8B84B);animation:pvGira .8s linear infinite}
  @keyframes pvGira{to{transform:rotate(360deg)}}
  #pv-overlay .pv-carga-t{font-family:var(--display,sans-serif);font-weight:800;font-size:15px;color:#eaecef}
  #pv-overlay .pv-carga-s{font-family:var(--mono,monospace);font-size:11.5px;color:#7d8794;margin-top:6px}
  #pv-overlay .pv-fila.destino{opacity:.45}
  @media(prefers-reduced-motion:reduce){#pv-overlay .pv-spin{animation:none}}
  #pv-overlay .pv-destino{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;
    padding:13px 15px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid #2b3139;margin-bottom:13px}
  #pv-overlay .pv-destino > span{font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6}
  #pv-overlay .pv-opts{display:flex;gap:6px}
  #pv-overlay .pv-opt{padding:9px 18px;border-radius:10px;border:1px solid #3a424c;background:transparent;color:#8b96a3;
    font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer;min-height:40px}
  #pv-overlay .pv-opt.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);border-color:#c79426;color:#3a2800}
  #pv-overlay .pv-lista{display:flex;flex-direction:column;gap:6px;margin-bottom:12px}
  #pv-overlay .pv-fila{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;
    background:rgba(255,255,255,.025);border:1px solid #2b3139;cursor:pointer}
  #pv-overlay .pv-chk{width:19px;height:19px;flex:0 0 auto;accent-color:var(--gold,#E8B84B);cursor:pointer}
  #pv-overlay .pv-chk:disabled{opacity:.3}
  #pv-overlay .pv-mon{flex:1;min-width:0}
  #pv-overlay .pv-mon b{display:block;font-family:var(--display,sans-serif);font-size:14px;color:#eaecef}
  #pv-overlay .pv-mon em{display:block;font-style:normal;font-family:var(--mono,monospace);font-size:11px;color:#7d8794;margin-top:2px}
  #pv-overlay .pv-usd{flex:0 0 auto;font-family:var(--mono,monospace);font-size:13px;color:var(--neon-lit,#2ee86a)}
  #pv-overlay .pv-migajas{padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.02);border:1px dashed #3a424c;
    font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;line-height:1.55;margin-bottom:12px}
  #pv-overlay .pv-migajas b{display:block;color:#b7bdc6;margin-bottom:3px}
  #pv-overlay .pv-migajas span{display:block;margin-top:7px;font-family:var(--mono,monospace);font-size:11px;color:#6b7681;word-break:break-word}
  #pv-overlay .pv-total{text-align:center;font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6;margin-bottom:13px}
  #pv-overlay .pv-total b{color:var(--gold,#E8B84B)}
  #pv-overlay .pv-total .vacio{color:#6b7681}
  .pv-b{width:100%;min-height:48px;padding:13px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a}
  .pv-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#b7bdc6;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  .pv-b:disabled{opacity:.4;cursor:default;box-shadow:none}
  .pv-b:active:not(:disabled){transform:translateY(2px)}
  .pv-nota{font-family:var(--sans,sans-serif);font-size:11.5px;color:#6b7681;line-height:1.55;margin-top:13px}
  .pv-nota b{color:#8b96a3}

  #pv-conf .pvc-c{position:relative;width:100%;max-width:400px;max-height:calc(100vh - 32px);overflow-y:auto;text-align:center;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:26px 20px}
  #pv-conf .pvc-t{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--gold,#E8B84B)}
  #pv-conf .pvc-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;margin:8px 0 14px;line-height:1.6}
  #pv-conf .pvc-s b{color:#eaecef}
  #pv-conf .pvc-lista{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin-bottom:14px}
  #pv-conf .pvc-lista span{padding:6px 11px;border-radius:9px;background:rgba(255,255,255,.04);border:1px solid #2b3139;
    font-family:var(--mono,monospace);font-size:11px;color:#b7bdc6}
  #pv-conf .pvc-lista i{font-style:normal;color:#6b7681}
  #pv-conf .pvc-aviso{text-align:left;padding:12px 14px;border-radius:11px;background:rgba(232,184,75,.07);
    border:1px solid rgba(232,184,75,.25);font-family:var(--sans,sans-serif);font-size:12px;color:#b7bdc6;line-height:1.55;margin-bottom:16px}
  #pv-conf .pvc-aviso b{color:var(--gold,#E8B84B)}
  #pv-conf .pvc-aviso i{display:block;font-style:normal;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.07);font-size:11.5px;color:#7d8794}
  #pv-conf .pvc-acts{display:flex;flex-direction:column;gap:8px}

  #al-overlay .al-paso{display:flex;align-items:center;gap:9px;font-family:var(--mono,monospace);font-size:10px;
    color:#7d8794;text-transform:uppercase;letter-spacing:1px;margin:18px 0 10px}
  #al-overlay .al-paso:first-child{margin-top:0}
  #al-overlay .al-paso span{width:20px;height:20px;border-radius:6px;display:grid;place-items:center;flex:0 0 auto;
    background:rgba(232,184,75,.14);color:var(--gold,#E8B84B);font-size:10px;font-weight:700}
  /* La barra que abre el desplegable */
  #al-overlay .al-selector{display:flex;align-items:center;gap:12px;width:100%;padding:13px 15px;border-radius:13px;
    background:rgba(255,255,255,.03);border:1px solid #2b3139;color:#eaecef;cursor:pointer;min-height:60px;
    transition:border-color .15s ease}
  #al-overlay .al-selector:hover{border-color:var(--gold-soft,#C9A84B)}
  #al-overlay .al-sel-tx{flex:1;min-width:0;text-align:left}
  #al-overlay .al-sel-tx b{display:block;font-family:var(--display,sans-serif);font-size:15px}
  #al-overlay .al-sel-tx em{display:block;font-style:normal;font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;margin-top:2px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #al-overlay .al-sel-v{width:18px;height:18px;flex:0 0 auto;color:#6b7681}

  /* El desplegable */
  #al-picker{position:fixed;inset:0;z-index:9730;display:flex;align-items:center;justify-content:center;padding:16px}
  #al-picker .alp-bg{position:absolute;inset:0;background:rgba(3,5,8,.9);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #al-picker .alp-c{position:relative;width:100%;max-width:400px;max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:18px;padding:16px;overflow:hidden}
  #al-picker .alp-cab{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
  #al-picker .alp-cab span{font-family:var(--display,sans-serif);font-weight:800;font-size:16px;color:#eaecef}
  #al-picker .alp-x{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;padding:0;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer}
  #al-picker .alp-buscar{width:100%;box-sizing:border-box;padding:12px 14px;border-radius:11px;border:1px solid #2b3139;
    background:#0b0e12;color:#eaecef;font-family:var(--sans,sans-serif);font-size:14px;margin-bottom:10px;min-height:46px}
  #al-picker .alp-buscar:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #al-picker .alp-lista{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:5px;margin:0 -4px;padding:0 4px}
  #al-picker .alp-item{display:flex;align-items:center;gap:12px;width:100%;padding:11px 13px;border-radius:12px;
    background:transparent;border:1px solid transparent;color:#eaecef;cursor:pointer;min-height:56px;text-align:left}
  #al-picker .alp-item:hover{background:rgba(255,255,255,.04)}
  #al-picker .alp-item.on{background:rgba(232,184,75,.1);border-color:rgba(232,184,75,.35)}
  #al-picker .alp-tx{flex:1;min-width:0}
  #al-picker .alp-tx b{display:block;font-family:var(--display,sans-serif);font-size:14px}
  #al-picker .alp-tx em{display:block;font-style:normal;font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;margin-top:2px;
    overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #al-picker .alp-ok{width:17px;height:17px;flex:0 0 auto;color:var(--gold,#E8B84B)}
  #al-overlay .al-mon-i{width:30px;height:30px;border-radius:50%;flex:0 0 auto;border:1px solid;
    background:rgba(255,255,255,.05) center/cover no-repeat}
  #al-overlay .al-mon-i.con-logo{background-color:transparent;background-size:cover}
  /* Respaldo: la inicial con el color de la moneda. Nunca un hueco. */
  #al-overlay .al-mon-i.sin-logo:after,#al-picker .al-mon-i.sin-logo:after{
    content:attr(data-ini);display:grid;place-items:center;width:100%;height:100%;
    color:var(--c,#8b96a3);font-family:var(--display,sans-serif);font-weight:800;font-size:13px}
  #al-picker .al-mon-i{width:30px;height:30px;border-radius:50%;flex:0 0 auto;border:1px solid;
    background:rgba(255,255,255,.05) center/cover no-repeat}
  #al-picker .al-mon-i.con-logo{background-color:transparent}
  #al-overlay .al-mon-i.chico{width:26px;height:26px;font-size:11px}
  #al-overlay .al-mon-s{font-family:var(--mono,monospace);font-size:10.5px;color:#b7bdc6;
    max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #al-overlay .al-mon.on .al-mon-s{color:var(--gold,#E8B84B)}
  #al-overlay .al-dirs{display:flex;gap:8px}
  #al-overlay .al-dir{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;
    padding:0 14px;border-radius:12px;background:rgba(255,255,255,.025);border:1px solid #2b3139;color:#8b96a3;
    font-family:var(--display,sans-serif);font-weight:700;font-size:13px;cursor:pointer}
  #al-overlay .al-dir svg{width:16px;height:16px}
  /* Verde sube, rojo baja: es el lenguaje de cualquier gráfico. */
  #al-overlay .al-dir[data-dir="sube"].on{border-color:var(--neon-lit,#2ee86a);background:rgba(46,232,106,.12);color:var(--neon-lit,#2ee86a)}
  #al-overlay .al-dir[data-dir="baja"].on{border-color:var(--rojo,#f6465d);background:rgba(246,70,93,.12);color:var(--rojo,#f6465d)}
  #al-overlay .al-dir[data-dir="sube"]:not(.on):hover{border-color:rgba(46,232,106,.45);color:#8fdcab}
  #al-overlay .al-dir[data-dir="baja"]:not(.on):hover{border-color:rgba(246,70,93,.45);color:#e79aa5}
  #al-overlay .al-precio{display:flex;align-items:center;border-radius:12px;border:1px solid #2b3139;background:#0b0e12;overflow:hidden}
  #al-overlay .al-precio:focus-within{border-color:var(--gold-soft,#C9A84B)}
  #al-overlay .al-dolar{padding:0 4px 0 15px;font-family:var(--display,sans-serif);font-size:19px;color:#6b7681}
  #al-overlay .al-in{flex:1;min-width:0;padding:14px 14px 14px 3px;border:none;background:transparent;color:#eaecef;
    font-family:var(--display,sans-serif);font-size:19px;font-weight:700;min-height:52px}
  #al-overlay .al-in:focus{outline:none}
  /* Flechitas del precio: en el escritorio se quedan (van bien y ayudan
     a ajustar), en el móvil fuera (el dedo nunca acierta). */
  /* Las flechitas del campo de precio: FUERA, también en el escritorio.
     Salían sin estilo, con el gris del sistema, y desentonaban con todo.
     En su lugar hay dos botones propios, que sí encajan. */
  #al-overlay .al-in::-webkit-inner-spin-button,
  #al-overlay .al-in::-webkit-outer-spin-button,
  #al-overlay input[type="number"]::-webkit-inner-spin-button,
  #al-overlay input[type="number"]::-webkit-outer-spin-button{
    -webkit-appearance:none !important;appearance:none !important;
    margin:0 !important;display:none !important;width:0 !important}
  #al-overlay .al-in,#al-overlay input[type="number"]{-moz-appearance:textfield !important}
  /* Los nuestros: discretos y con el estilo de la casa. */
  #al-overlay .al-pasos{display:flex;flex-direction:column;border-left:1px solid #2b3139;flex:0 0 auto}
  #al-overlay .al-paso-b{width:38px;flex:1;display:grid;place-items:center;padding:0;cursor:pointer;
    background:transparent;border:none;color:#6b7681;transition:color .15s ease,background .15s ease}
  #al-overlay .al-paso-b:hover{color:var(--gold,#E8B84B);background:rgba(232,184,75,.07)}
  #al-overlay .al-paso-b:first-child{border-bottom:1px solid #2b3139}
  #al-overlay .al-paso-b svg{width:13px;height:13px}
  #al-overlay .al-ahora{font-family:var(--mono,monospace);font-size:11.5px;color:#7d8794;text-align:center;margin:9px 0 14px;min-height:16px}
  #al-overlay .al-ahora b{color:var(--gold,#E8B84B)}
  #al-overlay .al-titulo{font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;
    letter-spacing:1.1px;margin:22px 0 10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.07)}
  #al-overlay .al-lista{display:flex;flex-direction:column;gap:6px}
  #al-overlay .al-fila{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:12px;
    background:rgba(255,255,255,.025);border:1px solid #2b3139}
  #al-overlay .al-fila.saltada{opacity:.55}
  #al-overlay .al-tx{flex:1;font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6}
  #al-overlay .al-tx b{color:#eaecef}
  #al-overlay .al-ya{font-family:var(--mono,monospace);font-size:10px;color:var(--neon-lit,#2ee86a);
    padding:3px 9px;border-radius:20px;background:rgba(46,232,106,.12)}
  #al-overlay .al-del{width:34px;height:34px;flex:0 0 auto;border-radius:9px;padding:0;display:grid;place-items:center;
    background:transparent;border:1px solid #3a424c;color:#7d8794;cursor:pointer}
  .al-toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;max-width:calc(100vw - 32px);
    padding:14px 20px;border-radius:14px;background:linear-gradient(180deg,#1b2027,#0d1117);
    border:1px solid var(--gold-soft,#C9A84B);box-shadow:0 10px 30px rgba(0,0,0,.6);
    font-family:var(--sans,sans-serif);font-size:13px;color:#eaecef}
  .al-toast b{display:block;font-family:var(--display,sans-serif);color:var(--gold,#E8B84B);font-size:12px;margin-bottom:3px}

  @media(max-width:560px){
    #tl-overlay,#pv-overlay,#al-overlay,#pv-conf{padding:9px}
    #tl-overlay .tl-c,#pv-overlay .pv-c,#al-overlay .pv-c{padding:18px 14px;border-radius:17px}
    #tl-overlay .tl-item{padding:14px;gap:12px}
    #tl-overlay .tl-ico{width:38px;height:38px}
    #tl-overlay .tl-tx b{font-size:14px}
    #tl-overlay .tl-tx em{font-size:11.5px}
    #pv-overlay .pv-destino{flex-direction:column;align-items:stretch;gap:9px}
    #pv-overlay .pv-opts .pv-opt{flex:1}
    #al-overlay .al-campos{flex-direction:column}
  }
  @media(prefers-reduced-motion:reduce){#tl-overlay .tl-item{transition:none}}`;
  document.head.appendChild(s);
}
