// perfil.js — Panel de perfil por wallet. Módulo independiente (no toca la lógica existente).
import * as gb from './gridbot.js?v=27';
import * as wallet from './wallet.js?v=27';

const $ = (id) => document.getElementById(id);
const num = (n, d = 2) => { const x = Number(n); if (!isFinite(x)) return '—'; return x.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const claveNombre = (c) => 'aurex-nombre:' + (c || '').toLowerCase();
const leerNombre = (c) => { try { return localStorage.getItem(claveNombre(c)) || ''; } catch (_) { return ''; } };
const guardarNombre = (c, v) => { try { v ? localStorage.setItem(claveNombre(c), v) : localStorage.removeItem(claveNombre(c)); } catch (_) {} };

function estilos() {
  if ($('perfil-css')) return;
  const s = document.createElement('style');
  s.id = 'perfil-css';
  s.textContent = `
  #perfil-overlay{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(4,6,9,.74);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);padding:16px}
  #perfil-overlay.show{display:flex}
  #perfil-overlay .pf-card{width:100%;max-width:430px;max-height:88vh;overflow:auto;background:linear-gradient(180deg,#171c24,#0d1117);border:1px solid var(--line,#2b3139);border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.65);padding:22px 22px 24px;position:relative;animation:pfIn .17s ease}
  @keyframes pfIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  #perfil-overlay .pf-x{position:absolute;top:15px;right:15px;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid var(--line,#2b3139);color:var(--ink-3,#7d8794);display:grid;place-items:center;cursor:pointer;font-size:15px}
  #perfil-overlay .pf-x:hover{color:var(--ink,#eaecef)}
  #perfil-overlay .pf-h{display:flex;align-items:center;gap:14px;margin-bottom:18px;padding-right:34px}
  #perfil-overlay .pf-ava{width:54px;height:54px;border-radius:16px;flex:0 0 auto;background:linear-gradient(155deg,#f7db8d,var(--gold,#E8B84B) 55%,#b98614);display:grid;place-items:center;color:#3a2800;box-shadow:0 4px 14px rgba(232,184,75,.25)}
  #perfil-overlay .pf-idcol{min-width:0;flex:1}
  #perfil-overlay .pf-name{display:flex;align-items:center;gap:7px;min-width:0}
  #perfil-overlay .pf-nombre{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--ink,#eaecef);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #perfil-overlay .pf-setname{font-family:var(--display,sans-serif);font-weight:700;font-size:15px;color:var(--gold,#E8B84B);background:none;border:none;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:6px}
  #perfil-overlay .pf-pen{width:26px;height:26px;flex:0 0 auto;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid var(--line,#2b3139);color:var(--ink-3,#7d8794);display:grid;place-items:center;cursor:pointer}
  #perfil-overlay .pf-pen:hover{color:var(--gold,#E8B84B);border-color:rgba(232,184,75,.4)}
  #perfil-overlay .pf-nameedit{display:flex;gap:6px;align-items:center;width:100%}
  #perfil-overlay .pf-inp{flex:1;min-width:0;background:rgba(0,0,0,.35);border:1px solid var(--gold-soft,#C9A84B);border-radius:8px;color:var(--ink,#eaecef);font-family:var(--display,sans-serif);font-size:15px;font-weight:700;padding:7px 10px;outline:none}
  #perfil-overlay .pf-savebtn{flex:0 0 auto;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 50%,#c79426);border:1px solid #c79426;color:#3a2800;font-family:var(--mono,monospace);font-weight:800;font-size:12px;padding:8px 12px;border-radius:8px;cursor:pointer}
  #perfil-overlay .pf-addr{font-family:var(--mono,monospace);font-size:12px;color:var(--ink-3,#7d8794);display:inline-flex;align-items:center;gap:6px;margin-top:4px;cursor:pointer;user-select:none}
  #perfil-overlay .pf-addr:hover{color:var(--gold,#E8B84B)}
  #perfil-overlay .pf-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:14px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-family:var(--mono,monospace);font-size:13px}
  #perfil-overlay .pf-row .k{color:var(--ink-3,#7d8794)}
  #perfil-overlay .pf-row .v{color:var(--ink,#eaecef);font-weight:700;text-align:right}
  #perfil-overlay .pf-pill{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:800}
  #perfil-overlay .pf-on{background:rgba(46,232,106,.16);color:var(--neon-lit,#2ee86a);border:1px solid rgba(46,232,106,.42)}
  #perfil-overlay .pf-on i{width:7px;height:7px;border-radius:50%;background:var(--neon-lit,#2ee86a);box-shadow:0 0 7px var(--neon-lit,#2ee86a)}
  #perfil-overlay .pf-off{background:rgba(246,70,93,.14);color:var(--rojo,#f6465d);border:1px solid rgba(246,70,93,.42)}
  #perfil-overlay .pf-soon{margin-top:16px;padding:14px 15px;border-radius:12px;background:rgba(255,255,255,.03);border:1px dashed var(--line,#2b3139)}
  #perfil-overlay .pf-soon .t{font-family:var(--mono,monospace);font-size:12px;color:var(--ink-2,#b7bdc6);font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px}
  #perfil-overlay .pf-soon .d{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#7d8794);margin-top:6px;line-height:1.55}
  #perfil-overlay .pf-badge{font-size:9.5px;padding:2px 9px;border-radius:10px;background:rgba(232,184,75,.15);color:var(--gold,#E8B84B);border:1px solid rgba(232,184,75,.32);font-weight:800;text-transform:uppercase;letter-spacing:.4px;flex:0 0 auto}
  #perfil-overlay .pf-link{display:inline-block;margin-top:15px;font-family:var(--mono,monospace);font-size:12px;color:var(--gold,#E8B84B);text-decoration:none;font-weight:700}
  #perfil-overlay .pf-link:hover{filter:brightness(1.12)}
  #perfil-overlay .pf-empty{font-family:var(--mono,monospace);font-size:13px;color:var(--ink-3,#7d8794);margin-top:16px;line-height:1.6}
  `;
  document.head.appendChild(s);
}

function overlay() {
  let o = $('perfil-overlay');
  if (o) return o;
  o = document.createElement('div');
  o.id = 'perfil-overlay';
  o.innerHTML = `<div class="pf-card" id="pf-card"></div>`;
  document.body.appendChild(o);
  o.addEventListener('click', (e) => { if (e.target === o) cerrar(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') cerrar(); });
  return o;
}
function cerrar() { const o = $('perfil-overlay'); if (o) o.classList.remove('show'); }

const iconoUser = () => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.7 3.4-5.5 7-5.5s6.3 1.8 7 5.5"/></svg>`;
const iconoPen = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
const iconoCopy = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

function pintarNombre(cuenta) {
  const cont = $('pf-name'); if (!cont) return;
  const nom = leerNombre(cuenta);
  cont.innerHTML = nom
    ? `<span class="pf-nombre">${esc(nom)}</span><button class="pf-pen" id="pf-pen" title="Editar nombre">${iconoPen()}</button>`
    : `<button class="pf-setname" id="pf-set">Ponle un nombre a tu cuenta ${iconoPen()}</button>`;
  const abrirEdit = () => {
    cont.innerHTML = `<div class="pf-nameedit"><input class="pf-inp" id="pf-inp" maxlength="24" value="${esc(nom)}" placeholder="Tu nombre o alias"><button class="pf-savebtn" id="pf-save">Guardar</button></div>`;
    const inp = $('pf-inp'); inp.focus(); inp.select();
    const guardar = () => { guardarNombre(cuenta, inp.value.trim().slice(0, 24)); pintarNombre(cuenta); };
    $('pf-save').onclick = guardar;
    inp.onkeydown = (e) => { if (e.key === 'Enter') guardar(); if (e.key === 'Escape') pintarNombre(cuenta); };
  };
  if ($('pf-pen')) $('pf-pen').onclick = abrirEdit;
  if ($('pf-set')) $('pf-set').onclick = abrirEdit;
}

function esqueleto(cuenta) {
  return `
  <button class="pf-x" id="pf-x" aria-label="Cerrar">✕</button>
  <div class="pf-h">
    <div class="pf-ava">${iconoUser()}</div>
    <div class="pf-idcol">
      <div class="pf-name" id="pf-name"></div>
      <div class="pf-addr" id="pf-addr" title="Copiar dirección">${wallet.abreviar(cuenta)} ${iconoCopy()}</div>
    </div>
  </div>
  <div class="pf-row"><span class="k">Suscripción</span><span class="v" id="pf-sub">…</span></div>
  <div class="pf-row"><span class="k">Cuota mensual</span><span class="v" id="pf-precio">…</span></div>
  <div class="pf-row"><span class="k">Bots activos</span><span class="v" id="pf-bots">…</span></div>
  <div class="pf-row"><span class="k">Bots creados (total)</span><span class="v" id="pf-tot">…</span></div>
  <div class="pf-row"><span class="k">Gas disponible</span><span class="v" id="pf-gas">…</span></div>
  <div class="pf-soon">
    <div class="t"><span>Renovación automática</span><span class="pf-badge">Pronto</span></div>
    <div class="d">Podrás activar el cobro automático de tu cuota mensual (con tu permiso) para no renovar a mano. En preparación.</div>
  </div>
  <a class="pf-link" href="https://bscscan.com/address/${cuenta}" target="_blank" rel="noopener">Ver mi wallet en BscScan ↗</a>`;
}

export async function abrirPerfil() {
  estilos();
  const o = overlay();
  const card = $('pf-card');
  const cuenta = (wallet.cuentaActual && wallet.cuentaActual()) || null;
  o.classList.add('show');

  if (!cuenta) {
    card.innerHTML = `<button class="pf-x" id="pf-x" aria-label="Cerrar">✕</button>
      <div class="pf-h"><div class="pf-ava">${iconoUser()}</div><div class="pf-idcol"><div class="pf-nombre">Tu perfil</div></div></div>
      <div class="pf-empty">Conecta tu wallet para ver tu perfil, tu suscripción y tu gas.</div>`;
    $('pf-x').onclick = cerrar;
    return;
  }

  card.innerHTML = esqueleto(cuenta);
  $('pf-x').onclick = cerrar;
  pintarNombre(cuenta);
  $('pf-addr').onclick = () => {
    try { navigator.clipboard && navigator.clipboard.writeText(cuenta); } catch (_) {}
    const el = $('pf-addr'); if (!el) return; const old = el.innerHTML; el.textContent = 'copiado ✓';
    setTimeout(() => { if ($('pf-addr')) $('pf-addr').innerHTML = old; }, 1200);
  };

  let activo = false, precio = 0n, gasWei = 0n, activos = 0, total = 0;
  try { activo = await gb.estaActivo(cuenta); } catch (_) {}
  try { precio = await gb.precioSub(); } catch (_) {}
  try { gasWei = await gb.gasSaldo(cuenta); } catch (_) {}
  try {
    const claves = await gb.misRejillas(cuenta);
    total = claves.length;
    for (const k of claves) { try { const R = await gb.resumenK(k); if (R && R.activa) activos++; } catch (_) {} }
  } catch (_) {}

  if ($('pf-sub')) $('pf-sub').innerHTML = activo ? `<span class="pf-pill pf-on"><i></i>Activa</span>` : `<span class="pf-pill pf-off">Inactiva</span>`;
  if ($('pf-precio')) $('pf-precio').textContent = precio > 0n ? `${num(Number(gb.fmtBNB(precio)), 5)} BNB ≈ $1` : '—';
  if ($('pf-bots')) $('pf-bots').textContent = String(activos);
  if ($('pf-tot')) $('pf-tot').textContent = String(total);
  if ($('pf-gas')) $('pf-gas').textContent = `${num(Number(gb.fmtBNB(gasWei)), 4)} BNB`;
}
