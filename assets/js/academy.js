// academy.js — Aurex Academy: acceso de pago al grupo de formación.
// Módulo independiente. Lo único que necesita de fuera es la wallet.

import * as ethers from './vendor/ethers-6.13.4.min.js?v=124';
import * as wallet from './wallet.js?v=124';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Contrato de la academia (proxy: esta es la dirección que se usa siempre). */
const ACADEMY = '0x96b7c62771FcdB4F9210f9ee70bAe0eA5d7E9721';
const USDT    = '0x55d398326f99059fF775485246999027B3197955';
const RPC     = 'https://bsc-dataseed.binance.org';

const ABI = [
  'function planes(uint8) view returns (uint32 dias, uint32 precioUsd, bool activo)',
  'function costeEnBnb(uint8) view returns (uint256)',
  'function costeEnUsdt(uint8) view returns (uint256)',
  'function comprarConBnb(uint8 plan, string usuarioTelegram) payable',
  'function comprarConUsdt(uint8 plan, string usuarioTelegram)',
  'function estadoDe(string) view returns (uint64 hasta, uint256 quedan)',
  'function tieneAcceso(string) view returns (bool)',
  'function pausado() view returns (bool)'
];
const ABI_ERC20 = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

/* Enlace del grupo, para dárselo tras el pago. */
const GRUPO = 'https://t.me/CriptoCubaOficial';

let _prov = null;
const lector = () => (_prov ||= new ethers.JsonRpcProvider(RPC, 56, { staticNetwork: true }));
const leer = () => new ethers.Contract(ACADEMY, ABI, lector());
async function firmante() {
  const p = new ethers.BrowserProvider(window.ethereum);
  return p.getSigner();
}

/* Qué incluye cada plan. Lo de dentro es lo que de verdad vende esto. */
const PLANES = [
  { id: 0, nombre: 'Un mes',      etiqueta: 'para probar',   destacado: false },
  { id: 1, nombre: 'Tres meses',  etiqueta: 'el más elegido', destacado: true  },
  { id: 2, nombre: 'Un año',      etiqueta: 'el que sale a cuenta', destacado: false }
];

/* La wallet del dueño ve todo sin pagar. */
const OWNER = '0x97e01a1c430e0cc826aca6e9be643721e45bca7d';

/* Lo que se enseña en la portada: poco, y lo que de verdad diferencia.
   Detallar el temario aquí sería regalar el motivo para pagar. */
const CONTENIDO = [
  'Un plan de <b>gestión de riesgo</b> con software para aplicarlo',
  '<b>17 clases</b> de cero a cien, cada una con su examen',
  '<b>19 audiolibros</b> escogidos por un trader de más de 10 años',
  'Mi estrategia <b>Lógica Estructural Avanzada</b>, en tres fases',
  'Tutoriales de las herramientas que se usan de verdad',
  'Ejemplos reales de la estrategia sobre operaciones',
  'Acceso al grupo mientras dure tu plan'
];

/* ══════════════════════════════════════════════════════════════
   LA HOJA DE RUTA
   El orden importa: cada bloque se apoya en el anterior. Por eso
   se enseña como camino, no como lista de contenidos.
   ══════════════════════════════════════════════════════════════ */
const RUTA = [
  {
    n: '01',
    t: 'Plan de gestión de riesgo',
    d: 'Antes de operar un solo dólar. Cómo repartir tu dinero, cuánto arriesgar por operación y cuándo parar.',
    x: 'Incluye un <b>software</b> para aplicarlo sin cuentas a mano.',
    nota: 'Este plan está hecho a medida de nuestra estrategia. No es un plan genérico de internet.',
    items: ['Vídeo explicado paso a paso', 'Software de gestión incluido']
  },
  {
    n: '02',
    t: 'Formación de cero a cien',
    d: '17 clases en vídeo que empiezan por qué es una criptomoneda y terminan en apalancamiento, spread y mercados de futuros.',
    x: '<b>Cada clase tiene su examen</b> de 20 preguntas.',
    nota: 'Regla de la casa: <b>80 puntos o no pasas.</b> Si fallas, el software te explica por qué era verdadero o falso, estudias y repites. Nadie avanza sin entender.',
    items: ['17 clases en vídeo', '20 preguntas por clase', 'Repaso guiado de lo que fallaste']
  },
  {
    n: '03',
    t: 'La biblioteca',
    d: '19 audiolibros escogidos uno a uno. No los escribí yo: los elegí por lo que me sirvieron a mí.',
    x: 'Empieza con una <b>masterclass de economía</b> de 3 horas: 10 títulos sobre la verdad del dinero y el Bitcoin.',
    nota: 'Muchos de estos títulos se venden. Aquí van dentro, y en el orden en que conviene escucharlos.',
    items: ['19 audiolibros seleccionados', 'Masterclass de economía, 3 h', 'Examen para pasar al siguiente']
  },
  {
    n: '04',
    t: 'Las herramientas',
    d: 'Tutoriales de las plataformas que se usan de verdad. Desde abrir la cuenta hasta leer un gráfico sin perderte.',
    x: 'Incluye <b>cómo identificar la dirección del mercado</b> en menos de tres minutos.',
    items: ['Tutoriales de TradingView', 'Leer la dirección del mercado']
  },
  {
    n: '05',
    t: 'La estrategia, en imágenes',
    d: 'Las tres fases aplicadas sobre operaciones reales, con capturas y una guía que explica qué mirar en cada una.',
    items: ['Ejemplos de las tres fases', 'Guía de contexto']
  },
  {
    n: '06',
    t: 'Lógica Estructural Avanzada',
    d: 'Mi estrategia completa. Aquí es donde todo lo anterior encaja.',
    x: 'Tres fases y un <b>repaso especial</b> en medio.',
    fases: [
      { f: 'Fase 1', t: 'Determina la tendencia', d: 'Saber hacia dónde va el mercado antes de tocar nada.' },
      { f: 'Repaso', t: 'Los cimientos', d: 'Vela japonesa, gráfico contra línea, tipos de tendencia y cómo detectar que cambia. Con su software: 80 puntos para seguir.' },
      { f: 'Fase 2', t: 'Zona Swing', d: 'Dónde entrar y por qué ahí y no en otro sitio.' },
      { f: 'Fase 3', t: 'Movimiento en rango', d: 'Cómo se comporta el precio dentro de un rango y cuándo continúa.' }
    ]
  }
];

/* ══════════════════ ABRIR ══════════════════ */
export async function abrirAcademy() {
  estilos();
  const prev = $('ac-overlay'); if (prev) prev.remove();

  const d = document.createElement('div');
  d.id = 'ac-overlay';
  d.innerHTML = `<div class="ac-bg"></div>
    <div class="ac-c">
      <button class="ac-x" aria-label="Cerrar">✕</button>

      <div class="ac-cab">
        <div class="ac-eyebrow">Aurex Academy</div>
        <h2 class="ac-t">De cero a operar con criterio</h2>
        <p class="ac-s">Una ruta ordenada, con exámenes que hay que aprobar para avanzar. No es una carpeta de vídeos sueltos.</p>
      </div>

      <div class="ac-que">
        <div class="ac-que-t">Qué llevas dentro</div>
        <ul class="ac-lista">${CONTENIDO.map((x) => `<li>${x}</li>`).join('')}</ul>
      </div>

      <div class="ac-planes" id="ac-planes"><div class="ac-cargando">Consultando precios…</div></div>

      <div class="ac-ruta-zona" id="ac-ruta-zona"></div>

      <div class="ac-msg" id="ac-msg"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => { const e = $('ac-overlay'); if (e) e.remove(); };
  d.querySelector('.ac-bg').onclick = cerrar;
  d.querySelector('.ac-x').onclick = cerrar;

  pintarPlanes();
  pintarRuta();
}

/* ══════════════════ ¿PUEDE VER LA RUTA? ══════════════════ */
const CLAVE_USER = 'aurex-academy-user';

function esOwner() {
  const c = wallet.cuentaActual && wallet.cuentaActual();
  return c && String(c).toLowerCase() === OWNER;
}

async function tieneAcceso(usuario) {
  try { return await leer().tieneAcceso(String(usuario).replace(/^@/, '').toLowerCase()); }
  catch (_) { return false; }
}

async function pintarRuta() {
  const box = $('ac-ruta-zona'); if (!box) return;

  // El dueño entra siempre, sin comprobar nada.
  if (esOwner()) { rutaAbierta(box, true); return; }

  // ¿Ya se identificó antes en este navegador?
  let guardado = '';
  try { guardado = localStorage.getItem(CLAVE_USER) || ''; } catch (_) {}
  if (guardado && await tieneAcceso(guardado)) { rutaAbierta(box, false, guardado); return; }

  rutaCerrada(box);
}

/* Cerrada: se ve que hay algo, pero borroso. Eso vende más que ocultarlo. */
function rutaCerrada(box) {
  box.innerHTML = `
    <div class="ac-sec-t">La hoja de ruta</div>
    <p class="ac-sec-s">El orden exacto en que hay que estudiarlo. Cada bloque se apoya en el anterior.</p>

    <div class="ac-ruta-cerrada">
      <div class="ac-ruta-borrosa">${ruteroHTML()}</div>
      <div class="ac-candado">
        <div class="ac-candado-i"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <div class="ac-candado-t">Solo para miembros</div>
        <div class="ac-candado-s">Elige un plan arriba y tendrás la ruta completa, con todo lo que hay en cada paso.</div>
        <div class="ac-candado-ya">
          <span>¿Ya eres miembro?</span>
          <div class="ac-ya-in"><span>@</span><input id="ac-ya-user" placeholder="tu usuario de Telegram" autocomplete="off" spellcheck="false"></div>
          <button class="ac-ya-b" id="ac-ya-b">Entrar</button>
          <div class="ac-ya-err" id="ac-ya-err"></div>
        </div>
      </div>
    </div>`;

  const comprobar = async () => {
    const u = ($('ac-ya-user').value || '').trim().replace(/^@/, '').toLowerCase();
    const err = $('ac-ya-err');
    if (u.length < 5) { err.textContent = 'Escribe tu usuario de Telegram.'; return; }
    err.textContent = 'Comprobando…';
    if (await tieneAcceso(u)) {
      try { localStorage.setItem(CLAVE_USER, u); } catch (_) {}
      rutaAbierta($('ac-ruta-zona'), false, u);
    } else {
      err.textContent = 'No me consta que ese usuario tenga acceso activo.';
    }
  };
  $('ac-ya-b').onclick = comprobar;
  $('ac-ya-user').onkeydown = (e) => { if (e.key === 'Enter') comprobar(); };
}

/* Abierta: la ruta completa. */
function rutaAbierta(box, owner, usuario) {
  box.innerHTML = `
    <div class="ac-sec-t">La hoja de ruta</div>
    <p class="ac-sec-s">Este es el orden. Cada bloque se apoya en el anterior, así que sáltate uno y el siguiente te costará el doble.</p>
    <div class="ac-abierto">${owner ? 'Entras como dueño' : `Miembro · @${esc(usuario || '')}`}</div>
    ${ruteroHTML()}
    <a class="ac-grupo-b" href="${GRUPO}" target="_blank" rel="noopener">Ir al grupo y empezar</a>`;
}

/* El HTML de la ruta. Se usa igual borroso que nítido: si fueran dos
   versiones distintas, se descuadrarían al cambiar una. */
function ruteroHTML() {
  return `<div class="ac-ruta">${RUTA.map((p) => `
    <div class="ac-paso">
      <div class="ac-paso-n">${p.n}</div>
      <div class="ac-paso-c">
        <div class="ac-paso-t">${p.t}</div>
        <div class="ac-paso-d">${p.d}</div>
        ${p.x ? `<div class="ac-paso-x">${p.x}</div>` : ''}
        ${p.items ? `<div class="ac-chips">${p.items.map((i) => `<span>${i}</span>`).join('')}</div>` : ''}
        ${p.fases ? `<div class="ac-fases">${p.fases.map((f) => `
          <div class="ac-fase">
            <span class="ac-fase-n">${f.f}</span>
            <div><b>${f.t}</b><em>${f.d}</em></div>
          </div>`).join('')}</div>` : ''}
        ${p.nota ? `<div class="ac-paso-nota">${p.nota}</div>` : ''}
      </div>
    </div>`).join('')}</div>`;
}

function decir(txt, clase = '') {
  const e = $('ac-msg'); if (!e) return;
  e.className = 'ac-msg ' + clase;
  e.innerHTML = txt;
  if (txt) setTimeout(() => { if (e.innerHTML === txt) { e.innerHTML = ''; e.className = 'ac-msg'; } }, 12000);
}

/* ══════════════════ PLANES ══════════════════ */
async function pintarPlanes() {
  const box = $('ac-planes'); if (!box) return;
  try {
    const c = leer();
    const datos = await Promise.all(PLANES.map(async (p) => {
      const info = await c.planes(p.id);
      let bnb = 0n;
      try { bnb = await c.costeEnBnb(p.id); } catch (_) {}
      return { ...p, dias: Number(info.dias), usd: Number(info.precioUsd) / 100, activo: info.activo, bnb };
    }));

    const mensual = datos[0]?.usd || 10;
    box.innerHTML = datos.filter((p) => p.activo).map((p) => {
      const porMes = p.usd / (p.dias / 30);
      const ahorro = p.dias > 30 ? Math.round((1 - porMes / mensual) * 100) : 0;
      return `<button class="ac-plan ${p.destacado ? 'top' : ''}" data-plan="${p.id}">
        ${p.destacado ? '<span class="ac-badge">el más elegido</span>' : ''}
        <div class="ac-plan-n">${p.nombre}</div>
        <div class="ac-plan-p"><b>${p.usd}</b><span>USD</span></div>
        <div class="ac-plan-d">${p.dias} días de acceso</div>
        ${ahorro > 0
          ? `<div class="ac-plan-ah">Sale a ${porMes.toFixed(2)} al mes · ahorras un ${ahorro}%</div>`
          : `<div class="ac-plan-ah neutro">${p.etiqueta}</div>`}
        <span class="ac-plan-b">Elegir</span>
      </button>`;
    }).join('');

    box.querySelectorAll('[data-plan]').forEach((b) => b.onclick = () => pedirDatos(Number(b.dataset.plan), datos));
  } catch (e) {
    box.innerHTML = `<div class="ac-cargando">No pudimos consultar los precios ahora mismo.<br>Revisa tu conexión y vuelve a abrir.</div>`;
  }
}

/* ══════════════════ USUARIO Y PAGO ══════════════════ */
function pedirDatos(planId, datos) {
  const p = datos.find((x) => x.id === planId); if (!p) return;
  const prev = $('ac-pago'); if (prev) prev.remove();

  const d = document.createElement('div');
  d.id = 'ac-pago';
  d.innerHTML = `<div class="ap-bg"></div>
    <div class="ap-c">
      <button class="ap-x" aria-label="Volver">✕</button>
      <div class="ap-t">${p.nombre} · ${p.usd} USD</div>
      <div class="ap-s">Tendrás acceso al grupo durante <b>${p.dias} días</b>.</div>

      <label class="ap-lab">Tu usuario de Telegram
        <div class="ap-in"><span>@</span><input id="ap-user" placeholder="tuusuario" autocomplete="off" spellcheck="false"></div>
        <span class="ap-pista">Sin la arroba. Lo encuentras en Telegram → Ajustes → Nombre de usuario.<br><b>Es el que usaremos para dejarte entrar</b>, así que revísalo bien.</span>
      </label>

      <div class="ap-err" id="ap-err"></div>

      <div class="ap-como">¿Con qué quieres pagar?</div>
      <div class="ap-pagos">
        <button class="ap-b" data-pago="usdt">
          <b>USDT</b><span>${p.usd}.00</span>
        </button>
        <button class="ap-b" data-pago="bnb">
          <b>BNB</b><span>${p.bnb > 0n ? Number(ethers.formatEther(p.bnb)).toFixed(5) : '—'}</span>
        </button>
      </div>
      <div class="ap-n">El pago va directo al contrato. Si pagas en BNB y el precio se mueve, lo que sobre se te devuelve en el acto.</div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => { const e = $('ac-pago'); if (e) e.remove(); };
  d.querySelector('.ap-bg').onclick = cerrar;
  d.querySelector('.ap-x').onclick = cerrar;

  const validar = () => {
    const u = ($('ap-user').value || '').trim().replace(/^@/, '');
    const err = $('ap-err');
    if (u.length < 5) { err.textContent = 'El usuario de Telegram tiene al menos 5 caracteres.'; return null; }
    if (!/^[a-zA-Z0-9_]+$/.test(u)) { err.textContent = 'Solo letras, números y guion bajo. Sin espacios ni signos.'; return null; }
    err.textContent = '';
    return u.toLowerCase();
  };

  d.querySelectorAll('[data-pago]').forEach((b) => b.onclick = () => {
    const u = validar(); if (!u) return;
    cerrar();
    pagar(p, u, b.dataset.pago);
  });
}

async function pagar(plan, usuario, moneda) {
  try {
    const cuenta = wallet.cuentaActual && wallet.cuentaActual();
    if (!cuenta) { decir('Conecta tu wallet primero, arriba a la derecha.', 'mal'); return; }

    const s = await firmante();
    const c = new ethers.Contract(ACADEMY, ABI, s);

    if (moneda === 'usdt') {
      const coste = await leer().costeEnUsdt(plan.id);
      const t = new ethers.Contract(USDT, ABI_ERC20, s);

      const saldo = await t.balanceOf(cuenta);
      if (saldo < coste) {
        decir(`No te alcanza el USDT: hacen falta ${plan.usd}.00 y tienes ${Number(ethers.formatUnits(saldo, 18)).toFixed(2)}.`, 'mal');
        return;
      }

      const permiso = await t.allowance(cuenta, ACADEMY);
      if (permiso < coste) {
        decir('<b>Paso 1 de 2 — Permiso.</b><br>Autorizas el cobro exacto de este plan. Confirma en tu wallet.', 'info');
        const tx1 = await t.approve(ACADEMY, coste);
        await tx1.wait();
      }
      decir('<b>Paso 2 de 2 — Pago.</b><br>Confirma en tu wallet.', 'info');
      const tx = await c.comprarConUsdt(plan.id, usuario);
      await tx.wait();
    } else {
      const coste = await leer().costeEnBnb(plan.id);
      const saldo = await lector().getBalance(cuenta);
      if (saldo < coste) {
        decir(`No te alcanza el BNB: hacen falta ${Number(ethers.formatEther(coste)).toFixed(5)} y tienes ${Number(ethers.formatEther(saldo)).toFixed(5)}.`, 'mal');
        return;
      }
      decir('Confirma el pago en tu wallet.', 'info');
      const tx = await c.comprarConBnb(plan.id, usuario, { value: coste });
      await tx.wait();
    }

    exito(usuario, plan);
  } catch (e) {
    const m = String(e?.shortMessage || e?.reason || e?.message || e);
    decir(/reject|denied|cancel/i.test(m) ? 'Cancelaste el pago.' : 'No se pudo completar: ' + esc(m.slice(0, 120)), 'mal');
  }
}

/* ══════════════════ DESPUÉS DE PAGAR ══════════════════ */
async function exito(usuario, plan) {
  let hasta = '';
  try {
    const st = await leer().estadoDe(usuario);
    hasta = new Date(Number(st.hasta) * 1000).toLocaleDateString('es', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch (_) {}

  const d = document.createElement('div');
  d.id = 'ac-ok';
  d.innerHTML = `<div class="ao-bg"></div>
    <div class="ao-c">
      <div class="ao-ico"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m20 6-11 11-5-5"/></svg></div>
      <div class="ao-t">Ya está</div>
      <div class="ao-s"><b>@${esc(usuario)}</b> tiene acceso al grupo${hasta ? ` hasta el <b>${hasta}</b>` : ''}.</div>

      <div class="ao-pasos">
        <div class="ao-p"><span>1</span>Entra al grupo con el botón de abajo</div>
        <div class="ao-p"><span>2</span>Pide unirte con <b>esa misma cuenta</b> de Telegram</div>
        <div class="ao-p"><span>3</span>Se te acepta solo, en menos de un minuto</div>
      </div>

      <a class="ao-b" href="${GRUPO}" target="_blank" rel="noopener">Entrar al grupo</a>
      <button class="ao-b gris" id="ao-cerrar">Cerrar</button>
      <div class="ao-n">Si te acercas al final, renueva desde aquí: <b>los días que te queden se suman</b>, no se pierden.</div>
    </div>`;
  document.body.appendChild(d);
  const q = () => { d.remove(); const o = $('ac-overlay'); if (o) o.remove(); };
  d.querySelector('.ao-bg').onclick = q;
  $('ao-cerrar').onclick = q;
}

/* ══════════════════ CONSULTAR MI ACCESO ══════════════════ */
export async function miAcceso(usuario) {
  try {
    const st = await leer().estadoDe(String(usuario).replace(/^@/, '').toLowerCase());
    return { hasta: Number(st.hasta), quedan: Number(st.quedan) };
  } catch (_) { return null; }
}

/* ══════════════════ ESTILOS ══════════════════ */
function estilos() {
  if ($('ac-css')) return;
  const s = document.createElement('style'); s.id = 'ac-css';
  s.textContent = `
  #ac-overlay{position:fixed;inset:0;z-index:9800;display:flex;align-items:center;justify-content:center;padding:18px}
  #ac-overlay .ac-bg{position:absolute;inset:0;background:rgba(3,5,8,.9);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  #ac-overlay .ac-c{position:relative;width:100%;max-width:840px;max-height:calc(100vh - 36px);overflow-y:auto;
    background:linear-gradient(180deg,#141922,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:22px;padding:32px 30px}
  #ac-overlay .ac-x{position:absolute;top:16px;right:16px;width:36px;height:36px;border-radius:11px;display:grid;place-items:center;padding:0;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer;font-size:15px}
  #ac-overlay .ac-cab{text-align:center;margin-bottom:26px}
  #ac-overlay .ac-eyebrow{font-family:var(--mono,monospace);font-size:10px;color:var(--gold,#E8B84B);text-transform:uppercase;letter-spacing:2.2px}
  #ac-overlay .ac-t{font-family:var(--display,sans-serif);font-weight:800;font-size:30px;color:#eaecef;margin:9px 0 10px;line-height:1.15}
  #ac-overlay .ac-s{font-family:var(--sans,sans-serif);font-size:14px;color:#8b96a3;line-height:1.6;max-width:52ch;margin:0 auto}
  #ac-overlay .ac-que{padding:20px;border-radius:16px;background:rgba(255,255,255,.03);border:1px solid #2b3139}
  #ac-overlay .ac-que-t{font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;letter-spacing:1.1px;margin-bottom:14px}
  #ac-overlay .ac-lista{list-style:none;margin:0;padding:0}
  #ac-overlay .ac-lista li{position:relative;padding-left:24px;margin-bottom:12px;font-family:var(--sans,sans-serif);font-size:13px;color:#b7bdc6;line-height:1.55}
  #ac-overlay .ac-lista li:last-child{margin-bottom:0}
  #ac-overlay .ac-lista li b{color:#eaecef}
  #ac-overlay .ac-lista li:before{content:'';position:absolute;left:0;top:6px;width:13px;height:8px;border-left:2px solid var(--gold,#E8B84B);border-bottom:2px solid var(--gold,#E8B84B);transform:rotate(-45deg)}
  /* TRES COLUMNAS. Cada plan en vertical, como se comparan los precios
     en cualquier sitio: de un vistazo se ve qué da cada uno. */
  #ac-overlay .ac-planes{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:24px 0 8px;align-items:stretch}
  #ac-overlay .ac-plan{position:relative;display:flex;flex-direction:column;text-align:center;padding:26px 18px 20px;
    border-radius:18px;border:1px solid #2b3139;background:linear-gradient(180deg,#1a212b,#0e1218);
    cursor:pointer;color:var(--ink,#eaecef);transition:border-color .16s ease,transform .16s ease}
  #ac-overlay .ac-plan:hover{border-color:var(--gold-soft,#C9A84B);transform:translateY(-2px)}
  #ac-overlay .ac-plan.top{border-color:var(--gold,#E8B84B);background:linear-gradient(180deg,rgba(232,184,75,.13),rgba(232,184,75,.03))}
  #ac-overlay .ac-badge{position:absolute;top:-9px;left:50%;transform:translateX(-50%);white-space:nowrap;padding:3px 11px;border-radius:20px;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800;
    font-family:var(--mono,monospace);font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.7px}
  #ac-overlay .ac-plan-n{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;color:#eaecef}
  #ac-overlay .ac-plan-p{display:flex;align-items:baseline;justify-content:center;gap:6px;margin:10px 0 4px}
  #ac-overlay .ac-plan-p b{font-family:var(--display,sans-serif);font-size:38px;color:var(--gold,#E8B84B);line-height:1}
  #ac-overlay .ac-plan-p span{font-family:var(--mono,monospace);font-size:12px;color:#7d8794}
  #ac-overlay .ac-plan-d{font-family:var(--mono,monospace);font-size:11px;color:#7d8794}
  #ac-overlay .ac-plan-ah{margin-top:9px;flex:1;font-family:var(--sans,sans-serif);font-size:12px;color:var(--neon-lit,#2ee86a)}
  #ac-overlay .ac-plan-ah.neutro{color:#7d8794}
  #ac-overlay .ac-plan-b{display:block;margin-top:16px;padding:9px 20px;border-radius:11px;
    border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px}
  #ac-overlay .ac-cargando{font-family:var(--mono,monospace);font-size:12px;color:#7d8794;text-align:center;padding:40px 10px;line-height:1.7}
  #ac-overlay .ac-msg{font-family:var(--mono,monospace);font-size:12px;text-align:center;margin-top:18px;min-height:18px;line-height:1.6}
  #ac-overlay .ac-msg.ok{color:var(--neon-lit,#2ee86a)}
  #ac-overlay .ac-msg.mal{color:var(--rojo,#f6465d)}
  #ac-overlay .ac-msg.info{color:var(--gold,#E8B84B)}

  #ac-pago{position:fixed;inset:0;z-index:9810;display:flex;align-items:center;justify-content:center;padding:18px}
  #ac-pago .ap-bg{position:absolute;inset:0;background:rgba(3,5,8,.92)}
  #ac-pago .ap-c{position:relative;width:100%;max-width:400px;max-height:calc(100vh - 36px);overflow-y:auto;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;padding:26px 22px}
  #ac-pago .ap-x{position:absolute;top:13px;right:13px;width:32px;height:32px;border-radius:10px;display:grid;place-items:center;padding:0;
    background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer}
  #ac-pago .ap-t{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--gold,#E8B84B);padding-right:36px}
  #ac-pago .ap-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;margin:7px 0 20px}
  #ac-pago .ap-s b{color:#eaecef}
  #ac-pago .ap-lab{display:block;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.8px}
  #ac-pago .ap-in{display:flex;align-items:center;margin-top:7px;border-radius:12px;border:1px solid #2b3139;background:#0b0e12;overflow:hidden}
  #ac-pago .ap-in span{padding:0 3px 0 13px;font-family:var(--mono,monospace);font-size:16px;color:#6b7681}
  #ac-pago .ap-in input{flex:1;min-width:0;padding:13px 13px 13px 2px;border:none;background:transparent;color:#eaecef;
    font-family:var(--mono,monospace);font-size:15px;text-transform:none;letter-spacing:0}
  #ac-pago .ap-in input:focus{outline:none}
  #ac-pago .ap-in:focus-within{border-color:var(--gold-soft,#C9A84B)}
  #ac-pago .ap-pista{display:block;margin-top:7px;font-family:var(--sans,sans-serif);font-size:11.5px;color:#6b7681;
    text-transform:none;letter-spacing:0;line-height:1.5}
  #ac-pago .ap-pista b{color:var(--gold,#E8B84B)}
  #ac-pago .ap-err{font-family:var(--sans,sans-serif);font-size:12px;color:var(--rojo,#f6465d);min-height:17px;margin:9px 0 4px}
  #ac-pago .ap-como{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.8px;margin-bottom:9px}
  #ac-pago .ap-pagos{display:flex;gap:9px}
  #ac-pago .ap-b{flex:1;padding:15px 11px;border-radius:13px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);
    color:#eaecef;cursor:pointer;min-height:64px;transition:border-color .15s ease}
  #ac-pago .ap-b:hover{border-color:var(--gold-soft,#C9A84B)}
  #ac-pago .ap-b b{display:block;font-family:var(--display,sans-serif);font-size:15px}
  #ac-pago .ap-b span{display:block;font-family:var(--mono,monospace);font-size:12px;color:var(--gold,#E8B84B);margin-top:3px}
  #ac-pago .ap-n{font-family:var(--sans,sans-serif);font-size:11px;color:#6b7681;line-height:1.5;margin-top:14px}

  #ac-ok{position:fixed;inset:0;z-index:9820;display:flex;align-items:center;justify-content:center;padding:18px}
  #ac-ok .ao-bg{position:absolute;inset:0;background:rgba(3,5,8,.93)}
  #ac-ok .ao-c{position:relative;width:100%;max-width:390px;max-height:calc(100vh - 36px);overflow-y:auto;text-align:center;
    background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--neon-lit,#2ee86a);border-radius:20px;padding:30px 22px 22px}
  #ac-ok .ao-ico{width:62px;height:62px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;
    background:rgba(46,232,106,.13);border:1px solid rgba(46,232,106,.45);color:var(--neon-lit,#2ee86a)}
  #ac-ok .ao-t{font-family:var(--display,sans-serif);font-weight:800;font-size:24px;color:var(--neon-lit,#2ee86a)}
  #ac-ok .ao-s{font-family:var(--sans,sans-serif);font-size:13.5px;color:#8b96a3;margin:8px 0 20px;line-height:1.6}
  #ac-ok .ao-s b{color:#eaecef}
  #ac-ok .ao-pasos{text-align:left;margin-bottom:20px}
  #ac-ok .ao-p{display:flex;gap:11px;align-items:flex-start;margin-bottom:10px;font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.5}
  #ac-ok .ao-p b{color:#eaecef}
  #ac-ok .ao-p span{flex:0 0 auto;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;
    background:rgba(46,232,106,.16);border:1px solid rgba(46,232,106,.4);color:var(--neon-lit,#2ee86a);
    font-family:var(--display,sans-serif);font-weight:800;font-size:11px}
  #ac-ok .ao-b{display:block;width:100%;padding:14px;border-radius:12px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;text-decoration:none;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a;margin-bottom:9px}
  #ac-ok .ao-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#b7bdc6;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  #ac-ok .ao-n{font-family:var(--sans,sans-serif);font-size:11px;color:#6b7681;line-height:1.5;margin-top:12px}
  #ac-ok .ao-n b{color:var(--ink-3,#7d8794)}

  /* ── LA HOJA DE RUTA ── */
  #ac-overlay .ac-sec-t{font-family:var(--display,sans-serif);font-weight:800;font-size:22px;color:#eaecef;margin:34px 0 6px;text-align:center}
  #ac-overlay .ac-sec-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;text-align:center;margin:0 auto 20px;max-width:54ch;line-height:1.6}
  #ac-overlay .ac-ruta{display:flex;flex-direction:column;gap:11px}
  #ac-overlay .ac-paso{display:flex;gap:16px;padding:18px;border-radius:15px;background:rgba(255,255,255,.025);border:1px solid #2b3139}
  #ac-overlay .ac-paso-n{flex:0 0 auto;width:38px;height:38px;border-radius:11px;display:grid;place-items:center;
    background:rgba(232,184,75,.12);border:1px solid rgba(232,184,75,.32);color:var(--gold,#E8B84B);
    font-family:var(--display,sans-serif);font-weight:800;font-size:14px}
  #ac-overlay .ac-paso-c{flex:1;min-width:0}
  #ac-overlay .ac-paso-t{font-family:var(--display,sans-serif);font-weight:800;font-size:16.5px;color:#eaecef}
  #ac-overlay .ac-paso-d{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6;margin-top:5px}
  #ac-overlay .ac-paso-x{font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.55;margin-top:7px}
  #ac-overlay .ac-paso-x b{color:var(--gold,#E8B84B)}
  #ac-overlay .ac-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px}
  #ac-overlay .ac-chips span{padding:5px 11px;border-radius:20px;background:rgba(255,255,255,.04);border:1px solid #3a424c;
    font-family:var(--mono,monospace);font-size:10.5px;color:#8b96a3}
  #ac-overlay .ac-paso-nota{margin-top:12px;padding:10px 12px;border-radius:10px;background:rgba(232,184,75,.07);
    border-left:2px solid var(--gold-soft,#C9A84B);font-family:var(--sans,sans-serif);font-size:12px;color:#b7bdc6;line-height:1.55}
  #ac-overlay .ac-paso-nota b{color:var(--gold,#E8B84B)}
  #ac-overlay .ac-fases{margin-top:13px;display:flex;flex-direction:column;gap:8px}
  #ac-overlay .ac-fase{display:flex;gap:11px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03)}
  #ac-overlay .ac-fase-n{flex:0 0 auto;padding:3px 9px;border-radius:6px;background:rgba(232,184,75,.14);color:var(--gold,#E8B84B);
    font-family:var(--mono,monospace);font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-top:1px}
  #ac-overlay .ac-fase b{display:block;font-family:var(--display,sans-serif);font-size:13.5px;color:#eaecef}
  #ac-overlay .ac-fase em{display:block;font-style:normal;font-family:var(--sans,sans-serif);font-size:12px;color:#7d8794;margin-top:3px;line-height:1.5}

  /* Cerrada: se intuye lo que hay, pero no se lee. */
  #ac-overlay .ac-ruta-cerrada{position:relative;border-radius:18px;overflow:hidden}
  #ac-overlay .ac-ruta-borrosa{filter:blur(7px);opacity:.4;pointer-events:none;user-select:none;max-height:430px;overflow:hidden}
  #ac-overlay .ac-candado{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
    text-align:center;padding:26px 22px;background:linear-gradient(180deg,rgba(11,14,18,.55),rgba(11,14,18,.9))}
  #ac-overlay .ac-candado-i{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;margin-bottom:13px;
    background:rgba(232,184,75,.12);border:1px solid rgba(232,184,75,.4);color:var(--gold,#E8B84B)}
  #ac-overlay .ac-candado-t{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:#eaecef}
  #ac-overlay .ac-candado-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;margin:8px 0 20px;max-width:40ch;line-height:1.6}
  #ac-overlay .ac-candado-ya{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;
    padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid #3a424c;max-width:100%}
  #ac-overlay .ac-candado-ya > span{font-family:var(--sans,sans-serif);font-size:12.5px;color:#7d8794;width:100%}
  #ac-overlay .ac-ya-in{display:flex;align-items:center;border-radius:10px;border:1px solid #2b3139;background:#0b0e12;overflow:hidden}
  #ac-overlay .ac-ya-in span{padding:0 2px 0 11px;font-family:var(--mono,monospace);font-size:14px;color:#6b7681}
  #ac-overlay .ac-ya-in input{width:190px;max-width:46vw;padding:11px 11px 11px 2px;border:none;background:transparent;color:#eaecef;
    font-family:var(--mono,monospace);font-size:13.5px}
  #ac-overlay .ac-ya-in input:focus{outline:none}
  #ac-overlay .ac-ya-b{padding:11px 19px;border-radius:10px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;
    font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer;min-height:42px}
  #ac-overlay .ac-ya-err{width:100%;font-family:var(--sans,sans-serif);font-size:11.5px;color:var(--gold,#E8B84B);min-height:15px}
  #ac-overlay .ac-abierto{display:inline-block;padding:6px 14px;border-radius:20px;margin:0 auto 18px;
    background:rgba(46,232,106,.1);border:1px solid rgba(46,232,106,.35);color:var(--neon-lit,#2ee86a);
    font-family:var(--mono,monospace);font-size:11px}
  #ac-overlay .ac-ruta-zona{text-align:center}
  #ac-overlay .ac-ruta-zona .ac-ruta{text-align:left}
  #ac-overlay .ac-grupo-b{display:inline-block;margin-top:20px;padding:14px 30px;border-radius:13px;border:1px solid #c79426;
    background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;text-decoration:none;
    font-family:var(--display,sans-serif);font-weight:800;font-size:14.5px;box-shadow:0 4px 0 #8f6a1a}

  @media(max-width:860px){
    #ac-overlay .ac-planes{grid-template-columns:1fr;gap:11px}
    #ac-overlay .ac-plan{text-align:left;padding:20px 18px}
    #ac-overlay .ac-plan-p{justify-content:flex-start}
    #ac-overlay .ac-badge{left:auto;right:16px;transform:none}
    #ac-overlay .ac-c{padding:26px 18px}
    #ac-overlay .ac-t{font-size:25px}
  }
  @media(max-width:560px){
    #ac-overlay{padding:10px}
    #ac-overlay .ac-c{padding:22px 15px;border-radius:18px}
    #ac-overlay .ac-t{font-size:22px}
    #ac-overlay .ac-s{font-size:13px}
    #ac-overlay .ac-plan-p b{font-size:29px}
    #ac-pago .ap-pagos{flex-direction:column}
  }
  @media(prefers-reduced-motion:reduce){#ac-overlay .ac-plan{transition:none}}`;
  document.head.appendChild(s);
}
