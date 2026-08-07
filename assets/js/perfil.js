// perfil.js — Panel de cuenta por wallet. Módulo independiente (no toca la lógica existente).
import * as gb from './gridbot.js?v=39';
import * as wallet from './wallet.js?v=39';

const $ = (id) => document.getElementById(id);
const num = (n, d = 2) => { const x = Number(n); if (!isFinite(x)) return '—'; return x.toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d }); };
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
const claveNombre = (c) => 'aurex-nombre:' + (c || '').toLowerCase();
const leerNombre = (c) => { try { return localStorage.getItem(claveNombre(c)) || ''; } catch (_) { return ''; } };
const guardarNombre = (c, v) => { try { v ? localStorage.setItem(claveNombre(c), v) : localStorage.removeItem(claveNombre(c)); } catch (_) {} };

/* Rango por volumen operado (herramienta de progreso, puramente informativa) */
const RANGOS = [
  { n: 'Aprendiz',  min: 0,      col: '#8b96a3' },
  { n: 'Operador',  min: 100,    col: '#4d9fff' },
  { n: 'Veterano',  min: 1000,   col: '#b47cff' },
  { n: 'Maestro',   min: 10000,  col: '#E8B84B' },
  { n: 'Leyenda',   min: 100000, col: '#2ee86a' }
];
function rangoDe(vol) {
  let r = RANGOS[0], sig = RANGOS[1];
  for (let i = 0; i < RANGOS.length; i++) { if (vol >= RANGOS[i].min) { r = RANGOS[i]; sig = RANGOS[i + 1] || null; } }
  const pct = sig ? Math.min(100, Math.round((vol - r.min) / (sig.min - r.min) * 100)) : 100;
  return { r, sig, pct };
}
function desde(ts) {
  if (!ts) return '—';
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' });
}

function estilos() {
  if ($('perfil-css')) return;
  const s = document.createElement('style');
  s.id = 'perfil-css';
  s.textContent = `
  #perfil-overlay{position:fixed;inset:0;z-index:9000;display:none;align-items:center;justify-content:center;background:rgba(3,5,8,.78);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);padding:18px}
  #perfil-overlay.show{display:flex}
  #perfil-overlay *{box-sizing:border-box}
  #perfil-overlay .pf-card{width:100%;max-width:720px;max-height:92vh;overflow:auto;background:linear-gradient(180deg,#12161c,#0b0e12);border:1px solid #2b3139;border-radius:20px;box-shadow:0 40px 120px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.04);padding:24px;position:relative;animation:pfIn .18s ease both}
  @keyframes pfIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  #perfil-overlay .pf-x{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#7d8794;display:grid;place-items:center;cursor:pointer;font-size:15px;z-index:2}
  #perfil-overlay .pf-x:hover{color:#eaecef}

  /* Cabecera */
  #perfil-overlay .pf-h{display:flex;align-items:center;gap:15px;padding-right:40px;padding-bottom:18px;margin-bottom:18px;border-bottom:1px solid #2b3139}
  #perfil-overlay .pf-ava{width:58px;height:58px;border-radius:16px;flex:0 0 auto;background:linear-gradient(160deg,#f7db8d,var(--gold,#E8B84B) 52%,#b98614);display:grid;place-items:center;color:#3a2800;box-shadow:0 5px 0 #8f6a1a,0 10px 22px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.5)}
  #perfil-overlay .pf-idcol{min-width:0;flex:1}
  #perfil-overlay .pf-name{display:flex;align-items:center;gap:8px;min-width:0}
  #perfil-overlay .pf-nombre{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;color:#eaecef;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #perfil-overlay .pf-setname{font-family:var(--display,sans-serif);font-weight:700;font-size:16px;color:var(--gold,#E8B84B);background:none;border:none;cursor:pointer;padding:0;display:inline-flex;align-items:center;gap:6px}
  #perfil-overlay .pf-pen{width:26px;height:26px;flex:0 0 auto;border-radius:7px;background:rgba(255,255,255,.05);border:1px solid #2b3139;color:#7d8794;display:grid;place-items:center;cursor:pointer}
  #perfil-overlay .pf-pen:hover{color:var(--gold,#E8B84B);border-color:rgba(232,184,75,.4)}
  #perfil-overlay .pf-nameedit{display:flex;gap:6px;align-items:center;width:100%}
  #perfil-overlay .pf-inp{flex:1;min-width:0;background:#0b0e12;border:1px solid var(--gold-soft,#C9A84B);border-radius:9px;color:#eaecef;font-family:var(--display,sans-serif);font-size:15px;font-weight:700;padding:8px 11px;outline:none}
  #perfil-overlay .pf-savebtn{flex:0 0 auto;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 50%,#c79426);border:1px solid #c79426;color:#3a2800;font-family:var(--mono,monospace);font-weight:800;font-size:12px;padding:9px 13px;border-radius:9px;cursor:pointer}
  #perfil-overlay .pf-addr{font-family:var(--mono,monospace);font-size:12px;color:#7d8794;display:inline-flex;align-items:center;gap:6px;margin-top:5px;cursor:pointer;user-select:none}
  #perfil-overlay .pf-addr:hover{color:var(--gold,#E8B84B)}
  #perfil-overlay .pf-hr{flex:0 0 auto;text-align:right}
  #perfil-overlay .pf-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 13px;border-radius:20px;font-family:var(--mono,monospace);font-size:12px;font-weight:800}
  #perfil-overlay .pf-on{background:rgba(46,232,106,.14);color:var(--neon-lit,#2ee86a);border:1px solid rgba(46,232,106,.42)}
  #perfil-overlay .pf-on i{width:7px;height:7px;border-radius:50%;background:var(--neon-lit,#2ee86a);box-shadow:0 0 7px var(--neon-lit,#2ee86a)}
  #perfil-overlay .pf-off{background:rgba(246,70,93,.13);color:var(--rojo,#f6465d);border:1px solid rgba(246,70,93,.42)}

  /* Rango */
  #perfil-overlay .pf-rank{background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid #2b3139;border-radius:14px;padding:14px 16px;margin-bottom:16px;box-shadow:0 4px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)}
  #perfil-overlay .pf-rank .rt{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-family:var(--mono,monospace);font-size:11px;color:#7d8794;text-transform:uppercase;letter-spacing:.6px}
  #perfil-overlay .pf-rank .rn{font-family:var(--display,sans-serif);font-weight:800;font-size:17px;letter-spacing:.3px}
  #perfil-overlay .pf-rank .rbar{height:9px;border-radius:6px;background:#0b0e12;border:1px solid #2b3139;overflow:hidden;margin-top:9px;box-shadow:inset 0 1px 3px rgba(0,0,0,.6)}
  #perfil-overlay .pf-rank .rbar>i{display:block;height:100%;border-radius:5px;transition:width .5s ease}
  #perfil-overlay .pf-rank .rs{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-top:7px}

  /* KPIs */
  #perfil-overlay .pf-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}
  #perfil-overlay .pf-kpi{background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid #2b3139;border-radius:13px;padding:14px 10px;text-align:center;box-shadow:0 4px 0 rgba(0,0,0,.32),inset 0 1px 0 rgba(255,255,255,.04)}
  #perfil-overlay .pf-kpi .kl{font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;letter-spacing:.5px}
  #perfil-overlay .pf-kpi .kv{font-family:var(--display,sans-serif);font-weight:800;font-size:20px;color:#eaecef;margin-top:5px;line-height:1.1;word-break:break-word}
  #perfil-overlay .pf-kpi .kv small{font-size:11px;color:#7d8794;font-weight:400}
  #perfil-overlay .pf-kpi .kv.pos{color:var(--neon-lit,#2ee86a)} #perfil-overlay .pf-kpi .kv.neg{color:var(--rojo,#f6465d)}
  #perfil-overlay .pf-kpi .kv.oro{color:var(--gold,#E8B84B)}

  /* Secciones */
  #perfil-overlay .pf-sec{margin-bottom:16px}
  #perfil-overlay .pf-sect{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.9px;margin-bottom:8px}
  #perfil-overlay .pf-box{background:rgba(255,255,255,.02);border:1px solid #2b3139;border-radius:13px;padding:4px 14px}
  #perfil-overlay .pf-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.055);font-family:var(--mono,monospace);font-size:12.5px}
  #perfil-overlay .pf-row:last-child{border-bottom:none}
  #perfil-overlay .pf-row .k{color:#7d8794}
  #perfil-overlay .pf-row .v{color:#eaecef;font-weight:700;text-align:right}
  #perfil-overlay .pf-row .v.oro{color:var(--gold,#E8B84B)}

  #perfil-overlay .pf-acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:4px}
  #perfil-overlay .pf-act{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:12px;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid #3a424c;color:var(--gold,#E8B84B);font-family:var(--display,sans-serif);font-weight:700;font-size:13px;cursor:pointer;text-decoration:none;box-shadow:0 3px 0 rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)}
  #perfil-overlay .pf-act:hover{filter:brightness(1.12)}
  #perfil-overlay .pf-act:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  #perfil-overlay .pf-soon{margin-top:14px;padding:14px 15px;border-radius:12px;background:rgba(255,255,255,.03);border:1px dashed #2b3139}
  #perfil-overlay .pf-soon .t{font-family:var(--mono,monospace);font-size:12px;color:#b7bdc6;font-weight:700;display:flex;justify-content:space-between;align-items:center;gap:8px}
  #perfil-overlay .pf-soon .d{font-family:var(--mono,monospace);font-size:11px;color:#7d8794;margin-top:6px;line-height:1.55}
  #perfil-overlay .pf-badge{font-size:9.5px;padding:2px 9px;border-radius:10px;background:rgba(232,184,75,.15);color:var(--gold,#E8B84B);border:1px solid rgba(232,184,75,.32);font-weight:800;text-transform:uppercase;letter-spacing:.4px;flex:0 0 auto}
  #perfil-overlay .pf-empty{font-family:var(--mono,monospace);font-size:13px;color:#7d8794;margin-top:16px;line-height:1.6;text-align:center;padding:24px 0}
  #perfil-overlay .pf-note{font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-align:center;margin-top:14px;line-height:1.5}

  @media(max-width:560px){
    #perfil-overlay{padding:0}
    #perfil-overlay .pf-card{max-width:100%;max-height:100vh;height:100vh;border-radius:0;border:none;padding:18px 14px}
    #perfil-overlay .pf-h{gap:12px;padding-right:38px}
    #perfil-overlay .pf-ava{width:48px;height:48px;border-radius:14px}
    #perfil-overlay .pf-nombre{font-size:18px}
    #perfil-overlay .pf-hr{display:none}
    #perfil-overlay .pf-kpis{grid-template-columns:1fr 1fr;gap:8px}
    #perfil-overlay .pf-kpi{padding:12px 8px}
    #perfil-overlay .pf-kpi .kv{font-size:17px}
    #perfil-overlay .pf-acts{grid-template-columns:1fr}
  }
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

const iconoUser = () => `<svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>`;
const iconoPen = () => `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
const iconoCopy = () => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>`;

function pintarNombre(cuenta) {
  const cont = $('pf-name'); if (!cont) return;
  const nom = leerNombre(cuenta);
  cont.innerHTML = nom
    ? `<span class="pf-nombre">${esc(nom)}</span><button class="pf-pen" id="pf-pen" title="Editar nombre">${iconoPen()}</button>`
    : `<button class="pf-setname" id="pf-set">Ponle un nombre a tu cuenta ${iconoPen()}</button>`;
  const editar = () => {
    cont.innerHTML = `<div class="pf-nameedit"><input class="pf-inp" id="pf-inp" maxlength="24" value="${esc(nom)}" placeholder="Tu nombre o alias"><button class="pf-savebtn" id="pf-save">Guardar</button></div>`;
    const inp = $('pf-inp'); inp.focus(); inp.select();
    const ok = () => { guardarNombre(cuenta, inp.value.trim()); pintarNombre(cuenta); };
    $('pf-save').onclick = ok;
    inp.onkeydown = (e) => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') pintarNombre(cuenta); };
  };
  if ($('pf-pen')) $('pf-pen').onclick = editar;
  if ($('pf-set')) $('pf-set').onclick = editar;
}

export async function abrirPerfil() {
  estilos();
  const o = overlay(); const card = $('pf-card');
  o.classList.add('show');

  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) {
    card.innerHTML = `<button class="pf-x" id="pf-x" aria-label="Cerrar">✕</button>
      <div class="pf-h"><div class="pf-ava">${iconoUser()}</div><div class="pf-idcol"><div class="pf-nombre">Tu cuenta</div></div></div>
      <div class="pf-empty">Conecta tu wallet para ver tu panel:<br>suscripción, rendimiento, bots y gas.</div>`;
    $('pf-x').onclick = cerrar; return;
  }

  card.innerHTML = `
  <button class="pf-x" id="pf-x" aria-label="Cerrar">✕</button>
  <div class="pf-h">
    <div class="pf-ava">${iconoUser()}</div>
    <div class="pf-idcol">
      <div class="pf-name" id="pf-name"></div>
      <div class="pf-addr" id="pf-addr" title="Copiar dirección">${wallet.abreviar(cuenta)} ${iconoCopy()}</div>
    </div>
    <div class="pf-hr" id="pf-sub">…</div>
  </div>

  <div class="pf-rank" id="pf-rankbox">
    <div class="rt"><span>Rango</span><span id="pf-rvol">—</span></div>
    <div class="rn" id="pf-rname">—</div>
    <div class="rbar"><i id="pf-rbar" style="width:0%"></i></div>
    <div class="rs" id="pf-rnext">Calculando…</div>
  </div>

  <div class="pf-kpis">
    <div class="pf-kpi"><div class="kl">Resultado</div><div class="kv" id="pf-pnl">…</div></div>
    <div class="pf-kpi"><div class="kl">Volumen</div><div class="kv" id="pf-vol">…</div></div>
    <div class="pf-kpi"><div class="kl">Operaciones</div><div class="kv" id="pf-ops">…</div></div>
    <div class="pf-kpi"><div class="kl">Bots activos</div><div class="kv oro" id="pf-bots">…</div></div>
  </div>

  <div class="pf-sec">
    <div class="pf-sect">Suscripción y gas</div>
    <div class="pf-box">
      <div class="pf-row"><span class="k">Cuota mensual</span><span class="v" id="pf-precio">…</span></div>
      <div class="pf-row"><span class="k">Gas disponible</span><span class="v oro" id="pf-gas">…</span></div>
      <div class="pf-row"><span class="k">Gas gastado (total)</span><span class="v" id="pf-gasg">…</span></div>
    </div>
  </div>

  <div class="pf-sec">
    <div class="pf-sect">Actividad</div>
    <div class="pf-box">
      <div class="pf-row"><span class="k">Bots creados (total)</span><span class="v" id="pf-tot">…</span></div>
      <div class="pf-row"><span class="k">Ciclos completados</span><span class="v" id="pf-ciclos">…</span></div>
      <div class="pf-row"><span class="k">Compras / ventas</span><span class="v" id="pf-cv">…</span></div>
      <div class="pf-row"><span class="k">Miembro desde</span><span class="v" id="pf-desde">…</span></div>
    </div>
  </div>

  <div class="pf-acts">
    <a class="pf-act" href="https://bscscan.com/address/${cuenta}" target="_blank" rel="noopener">Ver en BscScan ↗</a>
    <button class="pf-act" id="pf-reload">Actualizar datos</button>
  </div>

  <div class="pf-soon">
    <div class="t"><span>Renovación automática</span><span class="pf-badge">Pronto</span></div>
    <div class="d">Podrás dejar la suscripción en piloto automático y olvidarte de renovar cada mes.</div>
  </div>
  <div class="pf-note">Los datos se leen directamente de la blockchain. Tu nombre se guarda solo en este dispositivo.</div>`;

  $('pf-x').onclick = cerrar;
  pintarNombre(cuenta);
  const addr = $('pf-addr');
  if (addr) addr.onclick = async () => {
    try { await navigator.clipboard.writeText(cuenta); const t = addr.innerHTML; addr.innerHTML = '¡Copiada!'; setTimeout(() => { addr.innerHTML = t; }, 1100); } catch (_) {}
  };
  if ($('pf-reload')) $('pf-reload').onclick = () => abrirPerfil();

  cargarDatos(cuenta);
}

async function cargarDatos(cuenta) {
  let activo = false, precio = 0n, gasWei = 0n;
  try { activo = await gb.estaActivo(cuenta); } catch (_) {}
  try { precio = await gb.precioSub(); } catch (_) {}
  try { gasWei = await gb.gasSaldo(cuenta); } catch (_) {}

  if ($('pf-sub')) $('pf-sub').innerHTML = activo
    ? `<span class="pf-pill pf-on"><i></i>Activa</span>`
    : `<span class="pf-pill pf-off">Inactiva</span>`;
  if ($('pf-precio')) $('pf-precio').textContent = precio > 0n ? `${num(Number(gb.fmtBNB(precio)), 5)} BNB ≈ $1` : '—';
  if ($('pf-gas')) $('pf-gas').textContent = `${num(Number(gb.fmtBNB(gasWei)), 4)} BNB`;

  // Agregado de todos los bots del usuario
  let total = 0, activos = 0, ops = 0, ciclos = 0, compras = 0, ventas = 0;
  let pnl = 0, vol = 0, gasGas = 0, creadaMin = 0;
  const decCache = {};
  try {
    const claves = await gb.misRejillas(cuenta);
    total = claves.length;
    for (const k of claves) {
      let R; try { R = await gb.resumenK(k); } catch (_) { continue; }
      if (!R) continue;
      if (R.activa) activos++;
      ops += Number(R.totalOps || 0);
      ciclos += Number(R.ciclos || 0);
      compras += Number(R.comprasHechas || 0);
      ventas += Number(R.ventasHechas || 0);
      gasGas += Number(gb.fmtBNB(R.gasGastadoWei || 0n));
      const c = Number(R.creadaEn || 0);
      if (c > 0 && (creadaMin === 0 || c < creadaMin)) creadaMin = c;
      // decimales del token quote (cacheado)
      const q = String(R.quote || '').toLowerCase();
      let dec = decCache[q];
      if (dec === undefined) { try { dec = (await gb.infoToken(R.quote)).decimals; } catch (_) { dec = 18; } decCache[q] = dec; }
      try { pnl += Number(gb.fmt(R.gananciaQuote || 0n, dec)); } catch (_) {}
      try { vol += Number(gb.fmt(R.volumenQuote || 0n, dec)); } catch (_) {}
    }
  } catch (_) {}

  const elP = $('pf-pnl');
  if (elP) {
    elP.textContent = (pnl >= 0 ? '+' : '') + num(pnl, 2);
    elP.className = 'kv ' + (pnl > 0 ? 'pos' : pnl < 0 ? 'neg' : '');
  }
  if ($('pf-vol')) $('pf-vol').innerHTML = `${num(vol, vol >= 1000 ? 0 : 2)}`;
  if ($('pf-ops')) $('pf-ops').textContent = String(ops);
  if ($('pf-bots')) $('pf-bots').textContent = `${activos}`;
  if ($('pf-tot')) $('pf-tot').textContent = String(total);
  if ($('pf-ciclos')) $('pf-ciclos').textContent = String(ciclos);
  if ($('pf-cv')) $('pf-cv').textContent = `${compras} / ${ventas}`;
  if ($('pf-desde')) $('pf-desde').textContent = desde(creadaMin);
  if ($('pf-gasg')) $('pf-gasg').textContent = `${num(gasGas, 4)} BNB`;

  // Rango por volumen
  const { r, sig, pct } = rangoDe(vol);
  if ($('pf-rname')) { $('pf-rname').textContent = r.n; $('pf-rname').style.color = r.col; }
  if ($('pf-rvol')) $('pf-rvol').textContent = `${num(vol, 0)} operado`;
  if ($('pf-rbar')) { $('pf-rbar').style.width = pct + '%'; $('pf-rbar').style.background = `linear-gradient(90deg,${r.col}55,${r.col})`; }
  if ($('pf-rnext')) $('pf-rnext').textContent = sig ? `Faltan ${num(Math.max(0, sig.min - vol), 0)} de volumen para ${sig.n}` : 'Rango máximo alcanzado';
}
