/* movil/inicio.js — Pantalla 1 (Inicio) de la experiencia móvil.
   Organiza lo que ya existe: perfil, balance, swap, gráfica avanzada (Smart
   Levels), accesos rápidos a las secciones reales, promos y prize pool.
   No inventa datos: el balance y el estado de conexión vienen del `api`. */

import { IC } from './iconos.js?v=1';

const $ = (id) => document.getElementById(id);

/* Accesos rápidos → todos apuntan a secciones REALES ya existentes */
const QUICK = [
  { k: 'market', ic: 'market', t: 'Comprar' },
  { k: 'bots', ic: 'bot', t: 'Bots', tag: 'HOT' },
  { k: 'swap', ic: 'swap', t: 'Swap' },
  { k: 'niveles', ic: 'chart', t: 'Smart Levels' },
  { k: 'liquidity', ic: 'pool', t: 'Liquidity' },
  { k: 'tools', ic: 'tools', t: 'Herramientas' },
  { k: 'prize', ic: 'trophy', t: 'Prize Pool' },
  { k: 'academy', ic: 'book', t: 'Academia' },
];

/* Promos/curiosidades que rotan en la franja (texto nuestro, sin placeholders vacíos) */
const PROMOS = [
  { ic: 'trophy', t: 'Prize Pool comunitario', s: 'Participa y gana del fondo común', go: 'prize' },
  { ic: 'bot', t: 'Bots que operan por ti', s: 'Compran abajo y venden arriba, en tu wallet', go: 'bots' },
  { ic: 'swap', t: 'Intercambia cualquier cripto', s: 'Swap directo, sin KYC, no custodial', go: 'swap' },
  { ic: 'chart', t: 'Smart Levels', s: 'Análisis técnico y operaciones al toque', go: 'niveles' },
];

/* Dos tarjetas rotativas: curiosidades de los bots */
const BOTCARDS = [
  { kick: 'Bot Acumulador', ic: 'stack', h: 'Acumula en cada caída', p: 'Compra por tramos cuando el precio baja y arma posición sin que estés pendiente.' },
  { kick: 'Bot DCA', ic: 'calendar', h: 'Invierte a intervalos', p: 'Compra cantidades fijas cada cierto tiempo para promediar tu precio de entrada.' },
  { kick: 'Bot Grid', ic: 'grid', h: 'Gana en el rango', p: 'Coloca una rejilla de compras y ventas y captura cada oscilación del mercado.' },
  { kick: 'Bot Cash Out', ic: 'coins', h: 'Asegura ganancias', p: 'Va tomando beneficios de forma escalonada a medida que el precio sube.' },
];

export function pintarInicio(host, api) {
  const con = api.estaConectado();
  const b = api.balance();          // { total, moneda } o null
  const total = b ? b.total : null;
  const sym = (b && b.moneda) || 'USDT';

  host.innerHTML = `
    <div class="mv-top">
      <button class="mv-ava" id="mv-ava" aria-label="Perfil">${IC.user}</button>
      <button class="mv-search" id="mv-search" aria-label="Buscar">${IC.search}<span>Busca servicios, ofertas, monedas…</span></button>
      <button class="mv-ico-btn" id="mv-support" aria-label="Soporte">${IC.support}</button>
      <button class="mv-ico-btn" id="mv-alerts" aria-label="Alertas">${IC.bell}<i class="mv-dot" id="mv-alert-n" style="display:none">0</i></button>
    </div>

    <div class="mv-bal-lbl">Balance total (${sym}) ${IC.eye}</div>
    <div class="mv-bal" id="mv-bal">${total == null ? '—' : fmt(total)}</div>
    <div class="mv-bal-sub">${total == null ? 'Conecta tu wallet para ver tu saldo' : '≈ $' + fmt(total)}</div>

    <div class="mv-cta">
      <button class="mv-primary" id="mv-add">Agregar fondos</button>
      <button class="mv-second" id="mv-trade">Operar</button>
    </div>

    <div class="mv-quick" id="mv-quick">
      ${QUICK.map((q, i) => `
        <div class="mv-qi" data-k="${q.k}">
          <div class="mv-qbox">${IC[q.ic] || ''}${q.tag ? `<span class="mv-qtag">${q.tag}</span>` : ''}</div>
          <span>${q.t}</span>
        </div>`).join('')}
    </div>
    <div class="mv-dots"><i class="on"></i><i></i></div>

    ${con ? '' : `
    <div class="mv-connect">
      <p><b>Exchange no custodial.</b> Tú controlas tus fondos siempre. Conecta tu wallet para operar, crear bots e intercambiar.</p>
      <button id="mv-connect-btn">Conectar wallet</button>
    </div>`}

    <div class="mv-strip" id="mv-strip">
      <span class="mv-strip-count" id="mv-strip-count"></span>
      <div class="mv-strip-ic" id="mv-strip-ic">${IC.trophy}</div>
      <div class="mv-strip-tx"><b id="mv-strip-t">—</b><small id="mv-strip-s">—</small></div>
      <button class="mv-strip-go" id="mv-strip-go">Ver</button>
    </div>
    <div class="mv-viewall" id="mv-viewall">Ver todos los servicios <b>→</b></div>

    <div class="mv-two">
      <div class="mv-tcard" id="mv-tc-0"></div>
      <div class="mv-tcard" id="mv-tc-1"></div>
    </div>
    <div class="mv-tdots" style="position:static;transform:none;justify-content:center;margin-top:10px" id="mv-tdots"></div>

    <div class="mv-sec-h"><b>Prize Pool</b><span id="mv-prize-more">Ver →</span></div>
    <div class="mv-strip" id="mv-prize-strip">
      <div class="mv-strip-ic">${IC.trophy}</div>
      <div class="mv-strip-tx"><b>Fondo comunitario</b><small>Participa y gana del pozo acumulado</small></div>
      <button class="mv-strip-go" id="mv-prize-go">Entrar</button>
    </div>
  `;

  // ── Wiring a funciones reales ──
  $('mv-ava').onclick = () => api.abrir('perfil');
  $('mv-search').onclick = () => api.abrir('buscar');
  $('mv-support').onclick = () => api.abrir('soporte');
  $('mv-alerts').onclick = () => api.abrir('alertas');
  $('mv-add').onclick = () => api.abrir('swap');
  $('mv-trade').onclick = () => api.abrir('niveles');
  const cb = $('mv-connect-btn'); if (cb) cb.onclick = () => api.conectar();
  host.querySelectorAll('.mv-qi').forEach((el) => { el.onclick = () => api.abrir(el.getAttribute('data-k')); });
  $('mv-prize-go').onclick = $('mv-prize-more').onclick = () => api.abrir('prize');
  $('mv-viewall').onclick = () => api.abrir('menu');

  // ── Franja de promos rotativa ──
  let pi = 0;
  const pintarPromo = () => {
    const p = PROMOS[pi % PROMOS.length];
    $('mv-strip-ic').innerHTML = IC[p.ic] || IC.trophy;
    $('mv-strip-t').textContent = p.t; $('mv-strip-s').textContent = p.s;
    $('mv-strip-go').onclick = () => api.abrir(p.go);
    $('mv-strip').onclick = (e) => { if (e.target.id !== 'mv-strip-go') api.abrir(p.go); };
    const c = $('mv-strip-count'); if (c) c.textContent = ((pi % PROMOS.length) + 1) + '/' + PROMOS.length;
  };
  pintarPromo();
  const tPromo = setInterval(() => { pi++; pintarPromo(); }, 4500);

  // ── Dos tarjetas rotativas (de dos en dos) ──
  let ti = 0;
  const pintarCards = () => {
    for (let j = 0; j < 2; j++) {
      const c = BOTCARDS[(ti * 2 + j) % BOTCARDS.length];
      const el = $('mv-tc-' + j); if (!el) continue;
      el.innerHTML = `<div class="mv-tc-kick">${c.kick}</div><div class="mv-tc-ic">${IC[c.ic] || IC.bot}</div><h4>${c.h}</h4><p>${c.p}</p>`;
      el.onclick = () => api.abrir('bots');
    }
    const dots = $('mv-tdots'); const pares = Math.ceil(BOTCARDS.length / 2);
    dots.innerHTML = Array.from({ length: pares }, (_, k) => `<i class="${k === ti % pares ? 'on' : ''}"></i>`).join('');
  };
  pintarCards();
  const tCards = setInterval(() => { ti++; pintarCards(); }, 6000);

  // ── Alertas (badge) ──
  const n = api.alertas ? api.alertas() : 0;
  if (n > 0) { const el = $('mv-alert-n'); el.style.display = ''; el.textContent = n > 99 ? '99+' : String(n); }

  // limpieza al salir de la pantalla
  host._limpiar = () => { clearInterval(tPromo); clearInterval(tCards); };
}

function fmt(v) {
  const n = Number(v);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
