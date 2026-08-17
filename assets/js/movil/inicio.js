/* movil/inicio.js — Pantalla 1 (Inicio). Organiza lo que ya existe:
   perfil, balance real (con cambio de moneda y ocultar/mostrar), buscador,
   soporte (chatbot), accesos rápidos, servicios y prize pool. */

import { IC } from './iconos.js?v=1';

const $ = (id) => document.getElementById(id);
const LS = { ojo: 'mv-ojo', denom: 'mv-denom' };

/* Accesos rápidos → secciones REALES. La academia va destacada. */
const QUICK = [
  { k: 'market',    ic: 'market', t: 'Comprar' },
  { k: 'bots',      ic: 'bot',    t: 'Bots', tag: 'HOT' },
  { k: 'swap',      ic: 'swap',   t: 'Swap' },
  { k: 'niveles',   ic: 'chart',  t: 'Smart Levels' },
  { k: 'liquidity', ic: 'pool',   t: 'Liquidity' },
  { k: 'academy',   ic: 'book',   t: 'Academia', tag: 'TOP' },
  { k: 'tools',     ic: 'tools',  t: 'Herramientas' },
  { k: 'prize',     ic: 'trophy', t: 'Prize Pool' },
];

/* Franja de servicios (rota). Incluye TODOS los servicios, con la academia destacada. */
const PROMOS = [
  { ic: 'book',   t: 'Academia CriptoCuba', s: 'Aprende a operar y multiplica tu ventaja', go: 'academy' },
  { ic: 'trophy', t: 'Prize Pool comunitario', s: 'Participa y gana del fondo común', go: 'prize' },
  { ic: 'bot',    t: 'Bots que operan por ti', s: 'Compran abajo y venden arriba, en tu wallet', go: 'bots' },
  { ic: 'swap',   t: 'Intercambia cualquier cripto', s: 'Swap directo, sin KYC, no custodial', go: 'swap' },
  { ic: 'pool',   t: 'Liquidity Pools', s: 'Analiza profundidad y liquidez del mercado', go: 'liquidity' },
  { ic: 'chart',  t: 'Smart Levels', s: 'Análisis técnico y operaciones al toque', go: 'niveles' },
];

/* Dos tarjetas rotativas: los bots, con nombres claros. */
const BOTCARDS = [
  { kick: 'Bot Acumulador', ic: 'stack',    h: 'Acumula en cada caída', p: 'Compra por tramos cuando el precio baja y arma posición sin que estés pendiente.' },
  { kick: 'Bot DCA',        ic: 'calendar', h: 'Invierte a intervalos', p: 'Compra cantidades fijas cada cierto tiempo para promediar tu precio de entrada.' },
  { kick: 'Bot Grid',       ic: 'grid',     h: 'Gana en el rango',      p: 'Coloca una rejilla de compras y ventas y captura cada oscilación del mercado.' },
  { kick: 'Bot Cash Out',   ic: 'coins',    h: 'Toma beneficios solo',  p: 'Va retirando ganancias de forma escalonada a medida que el precio sube.' },
];

let _ojo = leer(LS.ojo) === '1';        // true = oculto
let _denom = leer(LS.denom) || 'USDT';

function leer(k) { try { return localStorage.getItem(k); } catch (_) { return null; } }
function guardar(k, v) { try { localStorage.setItem(k, v); } catch (_) {} }

export function pintarInicio(host, api) {
  const con = api.estaConectado();

  host.innerHTML = `
    <div class="mv-top">
      <button class="mv-ava" id="mv-ava" aria-label="Perfil">${IC.user}<i class="mv-ava-dot ${con ? 'on' : ''}"></i></button>
      <div class="mv-search" id="mv-search"><span class="mv-search-ic">${IC.search}</span><span class="mv-search-ph">Busca servicios, ofertas, monedas…</span></div>
      <button class="mv-ico-btn" id="mv-support" aria-label="Soporte">${IC.support}</button>
      <button class="mv-ico-btn" id="mv-alerts" aria-label="Alertas">${IC.bell}</button>
    </div>

    <div class="mv-bal-top">
      <span class="mv-bal-lbl">Balance total ${IC.eye}</span>
      <button class="mv-denom" id="mv-denom">${_denom} ${chev()}</button>
    </div>
    <div class="mv-bal" id="mv-bal">—</div>
    <div class="mv-bal-sub" id="mv-bal-sub">${con ? '' : 'Conecta tu wallet para ver tu saldo'}</div>

    <div class="mv-cta">
      <button class="mv-primary" id="mv-add">Agregar fondos</button>
      <button class="mv-second" id="mv-trade">Operar</button>
    </div>

    <div class="mv-quick" id="mv-quick">
      ${QUICK.map((q) => `
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
      <div class="mv-strip-ic" id="mv-strip-ic">${IC.book}</div>
      <div class="mv-strip-tx"><b id="mv-strip-t">—</b><small id="mv-strip-s">—</small></div>
      <button class="mv-strip-go" id="mv-strip-go">Ver</button>
    </div>
    <div class="mv-viewall" id="mv-viewall">Ver todos los servicios <b>→</b></div>

    <div class="mv-two">
      <div class="mv-tcard" id="mv-tc-0"></div>
      <div class="mv-tcard" id="mv-tc-1"></div>
    </div>
    <div class="mv-tdots" id="mv-tdots"></div>

    <div class="mv-sec-h"><b>Prize Pool</b><span id="mv-prize-more">Ver →</span></div>
    <div class="mv-strip" id="mv-prize-strip">
      <div class="mv-strip-ic">${IC.trophy}</div>
      <div class="mv-strip-tx"><b>Fondo comunitario</b><small>Participa y gana del pozo acumulado</small></div>
      <button class="mv-strip-go" id="mv-prize-go">Entrar</button>
    </div>
  `;

  // ── Wiring ──
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

  // ── Balance: ojito + cambio de moneda ──
  const pintarBal = () => {
    const b = api.balance();
    const bal = $('mv-bal'), sub = $('mv-bal-sub'), den = $('mv-denom');
    if (den) den.firstChild ? (den.innerHTML = `${_denom} ${chev()}`) : null;
    if (!b || !b.conectado) { bal.textContent = con ? '—' : '—'; return; }
    const val = valorEn(b, _denom);
    if (_ojo) { bal.textContent = '••••••'; sub.textContent = ''; }
    else {
      bal.innerHTML = fmtDenom(val, _denom) + ` <small>${_denom}</small>`;
      sub.textContent = '≈ $' + fmt(b.totalUSD);
    }
  };
  host.querySelector('.mv-bal-lbl').onclick = () => { _ojo = !_ojo; guardar(LS.ojo, _ojo ? '1' : '0'); pintarBal(); };
  $('mv-denom').onclick = (e) => { e.stopPropagation(); menuDenom(api, pintarBal); };
  pintarBal();

  // ── Franja rotativa ──
  let pi = 0;
  const pintarPromo = () => {
    const p = PROMOS[pi % PROMOS.length];
    $('mv-strip-ic').innerHTML = IC[p.ic] || IC.book;
    $('mv-strip-t').textContent = p.t; $('mv-strip-s').textContent = p.s;
    $('mv-strip-go').onclick = (e) => { e.stopPropagation(); api.abrir(p.go); };
    $('mv-strip').onclick = () => api.abrir(p.go);
    const c = $('mv-strip-count'); if (c) c.textContent = ((pi % PROMOS.length) + 1) + '/' + PROMOS.length;
  };
  pintarPromo();
  const tPromo = setInterval(() => { pi++; pintarPromo(); }, 4500);

  // ── Dos tarjetas (rotan de dos en dos) ──
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

  host._limpiar = () => { clearInterval(tPromo); clearInterval(tCards); };
  host._pintarBal = pintarBal;   // para refrescar al llegar el balance
}

/* Menú para cambiar la moneda del balance (solo las que el usuario tiene). */
function menuDenom(api, cb) {
  const b = api.balance();
  const opts = ['USDT'];
  if (b && b.activos) b.activos.forEach((a) => { if (!opts.includes(a.id)) opts.push(a.id); });
  let m = document.getElementById('mv-denom-menu'); if (m) m.remove();
  m = document.createElement('div'); m.id = 'mv-denom-menu';
  m.innerHTML = `<div class="mv-dm-bg"></div><div class="mv-dm-card">
    <div class="mv-dm-h">Ver balance en</div>
    ${opts.map((o) => `<button data-o="${o}" class="${o === _denom ? 'on' : ''}">${o}</button>`).join('')}
  </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.mv-dm-bg').onclick = cerrar;
  m.querySelectorAll('[data-o]').forEach((b2) => b2.onclick = () => { _denom = b2.getAttribute('data-o'); guardar('mv-denom', _denom); cerrar(); cb(); });
}

function valorEn(b, denom) {
  if (denom === 'USDT' || denom === 'USDC') return b.totalUSD;
  const p = b.precios && b.precios[denom];
  return p ? b.totalUSD / p : b.totalUSD;
}
function fmtDenom(v, denom) {
  v = Number(v) || 0;
  const dec = (denom === 'USDT' || denom === 'USDC') ? 2 : (v >= 1 ? 4 : 6);
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}
function fmt(v) { const n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'; }
function chev() { return '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" style="vertical-align:middle"><path d="M6 9l6 6 6-6"/></svg>'; }
