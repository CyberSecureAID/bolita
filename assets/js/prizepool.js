// prizepool.js — Módulo Prize Pool (independiente). No toca la lógica de los bots.
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm';
import * as wallet from './wallet.js?v=31';

/* ───────── Config ───────── */
const PRIZEPOOL = '0x75094C2faE55E61B03B4AB0E86026AB11c309C6d';
const USDT      = '0x55d398326f99059fF775485246999027B3197955';   // BSC-USD (18 dec)
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://rpc.ankr.com/bsc'
];
const PP_ABI = [
  'function estadoActual() view returns (uint256 round,uint256 pool,uint256 players,uint256 minReq,uint256 endTime,uint256 entrada,uint256 ganadoresEstimados,uint8 state)',
  'function distribucionEstimada(uint256 pool,uint256 players) view returns (uint256[])',
  'function ultimosGanadores() view returns (uint256 round, tuple(address player,string name,string telegram,uint256 prize,uint8 rank)[])',
  'function necesitaGas() view returns (bool)',
  'function gasPerEntry() view returns (uint256)',
  'function entryTotal() view returns (uint256)',
  'function miReclamo(uint256 round,address who) view returns (uint256 amount,bool yaReclamado)',
  'function participar(string name,string telegram,address inviter) payable',
  'function reclamar(uint256 round)',
  'function cerrarRonda()'
];
const ERC20 = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

/* ───────── ethers helpers ───────── */
let _prov, _idx = 0;
function lector() { if (!_prov) _prov = new ethers.JsonRpcProvider(RPCS[0], 56, { staticNetwork: true }); return _prov; }
async function leePP(fn, args = []) {
  for (let k = 0; k < RPCS.length; k++) {
    try {
      const c = new ethers.Contract(PRIZEPOOL, PP_ABI, new ethers.JsonRpcProvider(RPCS[_idx % RPCS.length], 56, { staticNetwork: true }));
      return await c[fn](...args);
    } catch (e) { _idx++; await new Promise(r => setTimeout(r, 200)); }
  }
  throw new Error('rpc');
}
async function firmante() { const bp = new ethers.BrowserProvider(window.ethereum); return bp.getSigner(); }
const fmt = (v) => Number(ethers.formatUnits(v, 18));
const num = (n, d = 2) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

/* ───────── Filtro de groserías (web, gratis) ───────── */
const MALAS = ['pinga','maricon','maricón','singao','singa','comemierda','comierda','puta','puto','coño','cono','mierda','cabron','cabrón','culero','pendejo','verga','chocha','bollo','templar','mamahuevo','mamaguevo','maricona','jodido','fuck','shit','bitch','asshole','nigger','cunt','pussy','dick','cock','whore','nazi','hitler'];
function limpio(txt) {
  const t = (txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const w of MALAS) { if (t.includes(w)) return false; }
  return true;
}

/* ───────── Estilos ───────── */
function estilos() {
  if ($('pp-css')) return;
  const s = document.createElement('style'); s.id = 'pp-css';
  s.textContent = `
  #pp-overlay{position:fixed;inset:0;z-index:9100;display:none;align-items:center;justify-content:center;background:rgba(4,6,9,.74);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);padding:16px}
  #pp-overlay.show{display:flex}
  #pp-overlay .pp-card{width:100%;max-width:440px;max-height:90vh;overflow:auto;background:linear-gradient(180deg,#1a1710,#0d1117);border:1px solid var(--gold-soft,#C9A84B);border-radius:20px;box-shadow:0 30px 90px rgba(0,0,0,.65);padding:22px;position:relative;animation:ppIn .17s ease both}
  @keyframes ppIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  #pp-overlay .pp-x{position:absolute;top:15px;right:15px;width:34px;height:34px;border-radius:10px;background:rgba(255,255,255,.05);border:1px solid var(--line,#2b3139);color:var(--ink-3,#7d8794);display:grid;place-items:center;cursor:pointer;font-size:15px}
  #pp-overlay .pp-x:hover{color:var(--ink,#eaecef)}
  #pp-overlay .pp-h{display:flex;align-items:center;gap:11px;margin-bottom:16px;padding-right:34px}
  #pp-overlay .pp-tro{font-size:28px;line-height:1}
  #pp-overlay .pp-tt{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;color:var(--gold,#E8B84B)}
  #pp-overlay .pp-sub{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#7d8794)}
  #pp-overlay .pp-fondo{text-align:center;background:radial-gradient(120% 100% at 50% 0,rgba(232,184,75,.12),transparent 70%);border:1px solid rgba(232,184,75,.25);border-radius:16px;padding:16px;margin-bottom:14px}
  #pp-overlay .pp-fondo .l{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#7d8794);text-transform:uppercase;letter-spacing:.6px}
  #pp-overlay .pp-fondo .v{font-family:var(--display,sans-serif);font-weight:800;font-size:34px;color:var(--gold,#E8B84B);margin-top:4px;text-shadow:0 2px 14px rgba(232,184,75,.3)}
  #pp-overlay .pp-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 2px;border-bottom:1px solid rgba(255,255,255,.06);font-family:var(--mono,monospace);font-size:13px}
  #pp-overlay .pp-row .k{color:var(--ink-3,#7d8794)}
  #pp-overlay .pp-row .v{color:var(--ink,#eaecef);font-weight:700;text-align:right}
  #pp-overlay .pp-bar{height:9px;border-radius:6px;background:rgba(255,255,255,.06);overflow:hidden;margin:10px 0 4px}
  #pp-overlay .pp-bar>i{display:block;height:100%;background:linear-gradient(90deg,#f7db8d,var(--gold,#E8B84B));border-radius:6px;transition:width .4s}
  #pp-overlay .pp-prog-lab{display:flex;justify-content:space-between;font-family:var(--mono,monospace);font-size:11px;color:var(--ink-2,#b7bdc6)}
  #pp-overlay .pp-timer{text-align:center;font-family:var(--mono,monospace);font-size:15px;color:var(--ink,#eaecef);font-weight:700;letter-spacing:1px;margin:12px 0 2px}
  #pp-overlay .pp-timer .u{color:var(--ink-3,#7d8794);font-size:10px;font-weight:400}
  #pp-overlay .pp-dist{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-2,#b7bdc6);line-height:1.7;margin-top:6px}
  #pp-overlay .pp-dist b{color:var(--gold,#E8B84B)}
  #pp-overlay .pp-btn{width:100%;box-sizing:border-box;margin-top:16px;padding:14px;border-radius:12px;font-family:var(--display,sans-serif);font-weight:800;font-size:16px;cursor:pointer;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a,0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.5);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #pp-overlay .pp-btn:active{transform:translateY(3px);box-shadow:0 1px 0 #8f6a1a}
  #pp-overlay .pp-btn:disabled{opacity:.55;cursor:not-allowed}
  #pp-overlay .pp-form{margin-top:14px;display:none}
  #pp-overlay .pp-form.on{display:block}
  #pp-overlay .pp-form input{width:100%;box-sizing:border-box;background:rgba(0,0,0,.35);border:1px solid var(--line,#2b3139);border-radius:10px;color:var(--ink,#eaecef);font-family:var(--mono,monospace);font-size:14px;padding:12px;margin-bottom:9px}
  #pp-overlay .pp-form input:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  #pp-overlay .pp-msg{font-family:var(--mono,monospace);font-size:11.5px;line-height:1.5;margin-top:10px;text-align:center;min-height:16px}
  #pp-overlay .pp-msg.err{color:var(--rojo,#f6465d)}
  #pp-overlay .pp-msg.ok{color:var(--neon-lit,#2ee86a)}
  #pp-overlay .pp-msg.info{color:var(--ink-3,#7d8794)}
  #pp-overlay .pp-win{margin-top:18px}
  #pp-overlay .pp-win .t{font-family:var(--mono,monospace);font-size:11px;color:var(--ink-3,#7d8794);text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
  #pp-overlay .pp-w{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid var(--line-soft,rgba(255,255,255,.055));font-family:var(--mono,monospace);font-size:12px;margin-bottom:6px}
  #pp-overlay .pp-w .medal{font-size:15px;flex:0 0 auto}
  #pp-overlay .pp-w .nm{color:var(--ink,#eaecef);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
  #pp-overlay .pp-w .tg{color:#7fb0ff;font-size:11px}
  #pp-overlay .pp-w .pz{color:var(--gold,#E8B84B);font-weight:800;flex:0 0 auto}
  #pp-overlay .pp-claim{margin-top:12px;padding:12px;border-radius:12px;background:rgba(46,232,106,.08);border:1px solid rgba(46,232,106,.35);font-family:var(--mono,monospace);font-size:12px;color:var(--neon-lit,#2ee86a);text-align:center}
  #pp-overlay .pp-claim button{margin-top:8px;width:100%;padding:11px;border-radius:10px;border:1px solid rgba(46,232,106,.5);background:rgba(46,232,106,.14);color:var(--neon-lit,#2ee86a);font-family:var(--mono,monospace);font-weight:800;cursor:pointer}
  #pp-overlay .pp-note{font-family:var(--mono,monospace);font-size:10px;color:var(--ink-3,#7d8794);text-align:center;margin-top:12px;line-height:1.5}
  #pp-overlay .pp-empty{font-family:var(--mono,monospace);font-size:13px;color:var(--ink-3,#7d8794);text-align:center;padding:24px 0;line-height:1.6}
  `;
  document.head.appendChild(s);
}

/* ───────── Overlay ───────── */
let _timer = null;
function overlay() {
  let o = $('pp-overlay');
  if (o) return o;
  o = document.createElement('div'); o.id = 'pp-overlay';
  o.innerHTML = `<div class="pp-card" id="pp-card"></div>`;
  document.body.appendChild(o);
  o.addEventListener('click', e => { if (e.target === o) cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  return o;
}
function cerrar() { const o = $('pp-overlay'); if (o) o.classList.remove('show'); if (_timer) { clearInterval(_timer); _timer = null; } }

function cuentaAtras(endTime) {
  const el = $('pp-timer'); if (!el) return;
  const tick = () => {
    const left = Number(endTime) - Math.floor(Date.now() / 1000);
    if (left <= 0) { el.innerHTML = 'Ciclo terminado — esperando cierre'; if (_timer) clearInterval(_timer); return; }
    const d = Math.floor(left / 86400), h = Math.floor((left % 86400) / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;
    el.innerHTML = `${d}<span class="u">d</span> ${String(h).padStart(2,'0')}<span class="u">h</span> ${String(m).padStart(2,'0')}<span class="u">m</span> ${String(s).padStart(2,'0')}<span class="u">s</span>`;
  };
  tick(); if (_timer) clearInterval(_timer); _timer = setInterval(tick, 1000);
}

/* ───────── Abrir + cargar datos reales ───────── */
export async function abrirPrizePool() {
  estilos();
  const o = overlay(); const card = $('pp-card');
  o.classList.add('show');
  card.innerHTML = `<button class="pp-x" id="pp-x">✕</button><div class="pp-empty">Cargando Prize Pool…</div>`;
  $('pp-x').onclick = cerrar;

  let st;
  try { st = await leePP('estadoActual'); }
  catch (e) {
    card.innerHTML = `<button class="pp-x" id="pp-x">✕</button><div class="pp-empty">No se pudo cargar el Prize Pool ahora mismo. Revisa tu conexión y vuelve a intentar.</div>`;
    $('pp-x').onclick = cerrar; return;
  }

  const round = Number(st.round), pool = fmt(st.pool), players = Number(st.players);
  const minReq = Number(st.minReq), endTime = st.endTime, entrada = fmt(st.entrada), W = Number(st.ganadoresEstimados);
  const pct = minReq > 0 ? Math.min(100, Math.round(players / minReq * 100)) : 0;

  // distribución estimada (top 3 para no saturar)
  let distTxt = '—';
  try {
    const d = await leePP('distribucionEstimada', [st.pool, st.players]);
    if (d && d.length) {
      const top = d.slice(0, 3).map((x, i) => `<b>${i + 1}º</b> ${num(fmt(x), 2)}`);
      distTxt = top.join(' · ') + (d.length > 3 ? ` · +${d.length - 3} más` : '');
    }
  } catch (_) {}

  card.innerHTML = render(round, pool, players, minReq, pct, entrada, W, distTxt);
  $('pp-x').onclick = cerrar;
  cuentaAtras(endTime);
  wireParticipar();
  cargarGanadores();
  cargarReclamo();
}

function render(round, pool, players, minReq, pct, entrada, W, distTxt) {
  return `
  <button class="pp-x" id="pp-x">✕</button>
  <div class="pp-h">
    <div class="pp-tro">🏆</div>
    <div><div class="pp-tt">Prize Pool</div><div class="pp-sub">Ronda #${round} · fondo comunitario</div></div>
  </div>

  <div class="pp-fondo"><div class="l">Fondo total de premios</div><div class="v">${num(pool, 2)} <span style="font-size:18px">USDT</span></div></div>

  <div class="pp-prog-lab"><span>Participantes</span><span>${players} / ${minReq} mín. ${players >= minReq ? '✓' : ''}</span></div>
  <div class="pp-bar"><i style="width:${pct}%"></i></div>
  <div class="pp-timer" id="pp-timer">—</div>

  <div class="pp-row"><span class="k">Valor de participación</span><span class="v">${num(entrada, 2)} USDT</span></div>
  <div class="pp-row"><span class="k">Ganadores de esta ronda</span><span class="v">${W}</span></div>
  <div class="pp-row" style="border-bottom:none"><span class="k">Distribución estimada</span><span class="v" style="max-width:60%"></span></div>
  <div class="pp-dist">${distTxt}</div>

  <button class="pp-btn" id="pp-go">Participar · ${num(entrada, 2)} USDT</button>
  <div class="pp-form" id="pp-form">
    <input id="pp-name" maxlength="40" placeholder="Tu nombre">
    <input id="pp-tg" maxlength="40" placeholder="Tu usuario de Telegram (opcional)">
    <button class="pp-btn" id="pp-confirm" style="margin-top:4px">Confirmar participación</button>
  </div>
  <div class="pp-msg info" id="pp-msg"></div>

  <div id="pp-claim-box"></div>
  <div class="pp-win" id="pp-win"></div>
  <div class="pp-note">Al participar aceptas que tu nombre y Telegram queden registrados on-chain y se muestren si ganas. Juego de azar comunitario; participa con responsabilidad.</div>`;
}

/* ───────── Participar ───────── */
function wireParticipar() {
  const go = $('pp-go'), form = $('pp-form');
  if (go) go.onclick = () => { form.classList.toggle('on'); if (form.classList.contains('on')) $('pp-name').focus(); };
  const cf = $('pp-confirm');
  if (cf) cf.onclick = participar;
}

function msg(t, cls) { const m = $('pp-msg'); if (m) { m.className = 'pp-msg ' + (cls || 'info'); m.textContent = t; } }

async function participar() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { msg('Conecta tu wallet primero.', 'err'); return; }
  const name = ($('pp-name').value || '').trim();
  const tg = ($('pp-tg').value || '').trim();
  if (!name) { msg('Pon tu nombre.', 'err'); return; }
  if (!limpio(name) || !limpio(tg)) { msg('Ese nombre/usuario no está permitido. Usa uno apropiado.', 'err'); return; }

  const btn = $('pp-confirm'); btn.disabled = true;
  try {
    const signer = await firmante();
    const usdt = new ethers.Contract(USDT, ERC20, signer);
    const pp = new ethers.Contract(PRIZEPOOL, PP_ABI, signer);
    const total = await leePP('entryTotal');

    // 1) Aprobar USDT si hace falta
    msg('Revisando permiso de USDT…', 'info');
    const alw = await usdt.allowance(cuenta, PRIZEPOOL);
    if (alw < total) {
      msg('Aprueba el gasto de USDT en tu wallet…', 'info');
      const txa = await usdt.approve(PRIZEPOOL, total);
      await txa.wait();
    }

    // 2) Adjuntar un poquito de BNB para el gas SOLO si hace falta
    let value = 0n;
    try {
      const need = await leePP('necesitaGas');
      if (need) value = await leePP('gasPerEntry');
    } catch (_) {}

    msg('Confirma la participación en tu wallet…', 'info');
    const tx = await pp.participar(name, tg, ethers.ZeroAddress, { value });
    await tx.wait();
    msg('¡Listo! Ya estás participando. Mucha suerte 🍀', 'ok');
    setTimeout(() => abrirPrizePool(), 1500); // refresca datos
  } catch (e) {
    msg(traducir(e), 'err');
  } finally { btn.disabled = false; }
}

function traducir(e) {
  const s = (e && (e.reason || e.shortMessage || e.message) || '').toLowerCase();
  if (s.includes('user rejected') || s.includes('denied')) return 'Cancelaste la operación.';
  if (s.includes('insufficient')) return 'Saldo insuficiente (USDT o BNB para el gas).';
  if (s.includes('rondanoabierta') || s.includes('rondaencurso')) return 'La ronda no está abierta ahora mismo.';
  return 'No se pudo completar. Intenta de nuevo.';
}

/* ───────── Ganadores de la última ronda ───────── */
async function cargarGanadores() {
  const box = $('pp-win'); if (!box) return;
  try {
    const [rnd, ws] = await leePP('ultimosGanadores');
    if (!ws || ws.length === 0) { box.innerHTML = ''; return; }
    const medal = (r) => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🎖️';
    let html = `<div class="t">Últimos ganadores · ronda #${Number(rnd)}</div>`;
    ws.forEach(w => {
      const tg = w.telegram && w.telegram.length ? `<span class="tg">@${esc(w.telegram.replace(/^@/, ''))}</span>` : '';
      html += `<div class="pp-w"><span class="medal">${medal(Number(w.rank))}</span><span class="nm">${esc(w.name)} ${tg}</span><span class="pz">${num(fmt(w.prize), 2)} USDT</span></div>`;
    });
    box.innerHTML = html;
  } catch (_) { box.innerHTML = ''; }
}

/* ───────── Reclamo (premio o reembolso) ───────── */
async function cargarReclamo() {
  const box = $('pp-claim-box'); if (!box) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { box.innerHTML = ''; return; }
  try {
    const [rnd] = await leePP('ultimosGanadores');
    if (!rnd) return;
    const [amount, ya] = await leePP('miReclamo', [rnd, cuenta]);
    if (amount > 0n && !ya) {
      box.innerHTML = `<div class="pp-claim">Tienes <b>${num(fmt(amount), 2)} USDT</b> para reclamar de la ronda #${Number(rnd)}.<button id="pp-claim-btn">Reclamar ahora</button></div>`;
      $('pp-claim-btn').onclick = async () => {
        try {
          const signer = await firmante();
          const pp = new ethers.Contract(PRIZEPOOL, PP_ABI, signer);
          const tx = await pp.reclamar(rnd); await tx.wait();
          msg('¡Reclamado! Revisa tu wallet.', 'ok'); cargarReclamo();
        } catch (e) { msg(traducir(e), 'err'); }
      };
    } else { box.innerHTML = ''; }
  } catch (_) { box.innerHTML = ''; }
}
