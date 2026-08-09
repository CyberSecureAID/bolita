// extras.js — Tres cosas que suman: instalar la app, compartir el resultado
// como imagen, y animar los números. Módulo independiente, sin librerías.

const $ = (id) => document.getElementById(id);
const num = (n, d = 2) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ══════════════ 1) INSTALAR LA APP ══════════════ */
let _instalador = null;
const CLAVE_NO = 'aurex-no-instalar';

export function iniciarInstalacion() {
  estilos();
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _instalador = e;
    mostrarBanner();
  });
  window.addEventListener('appinstalled', () => { ocultarBanner(); _instalador = null; });
}

function yaDijoQueNo() { try { return localStorage.getItem(CLAVE_NO) === '1'; } catch (_) { return false; } }
function ocultarBanner() { const b = $('inst-banner'); if (b) b.remove(); }

function mostrarBanner() {
  if (yaDijoQueNo() || $('inst-banner')) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;   // ya instalada
  const d = document.createElement('div');
  d.id = 'inst-banner';
  d.innerHTML = `
    <div class="inst-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M12 18h.01"/></svg></div>
    <div class="inst-tx"><b>Instala Aurex</b><span>Se abre al instante, con su icono y a pantalla completa.</span></div>
    <button class="inst-si" id="inst-si">Instalar</button>
    <button class="inst-no" id="inst-no" aria-label="Ahora no">✕</button>`;
  document.body.appendChild(d);
  $('inst-si').onclick = async () => {
    if (!_instalador) { ocultarBanner(); return; }
    _instalador.prompt();
    try { await _instalador.userChoice; } catch (_) {}
    _instalador = null; ocultarBanner();
  };
  $('inst-no').onclick = () => { try { localStorage.setItem(CLAVE_NO, '1'); } catch (_) {} ocultarBanner(); };
}

/* ══════════════ 2) COMPARTIR EL RESULTADO COMO IMAGEN ══════════════ */
/* Dibujamos la tarjeta a mano: sale más limpia y no pesa nada. */

function redondeado(x, r, w, h, rad) {
  x.beginPath();
  x.moveTo(rad, 0); x.lineTo(w - rad, 0); x.quadraticCurveTo(w, 0, w, rad);
  x.lineTo(w, h - rad); x.quadraticCurveTo(w, h, w - rad, h);
  x.lineTo(rad, h); x.quadraticCurveTo(0, h, 0, h - rad);
  x.lineTo(0, rad); x.quadraticCurveTo(0, 0, rad, 0); x.closePath();
}

/** Dibuja la tarjeta del bot y devuelve el canvas. */
export function tarjetaResultado({ par, tipo, ganancia, moneda, dias, vueltas, invertido, pct }) {
  const W = 1080, H = 1080, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  // Fondo
  const g = x.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#141a24'); g.addColorStop(0.5, '#0e1219'); g.addColorStop(1, '#0b0e11');
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // Halo dorado
  const halo = x.createRadialGradient(W * 0.8, H * 0.18, 10, W * 0.8, H * 0.18, W * 0.7);
  halo.addColorStop(0, 'rgba(232,184,75,.16)'); halo.addColorStop(1, 'transparent');
  x.fillStyle = halo; x.fillRect(0, 0, W, H);

  // Marco
  x.save(); x.translate(52, 52); redondeado(x, 0, W - 104, H - 104, 40);
  x.strokeStyle = 'rgba(232,184,75,.34)'; x.lineWidth = 2; x.stroke(); x.restore();

  const cx = W / 2;
  const positivo = Number(ganancia) >= 0;

  // Marca
  x.textAlign = 'center';
  x.fillStyle = '#E8B84B'; x.font = 'bold 46px system-ui, sans-serif';
  x.fillText('AUREX', cx, 160);
  x.fillStyle = '#6b7681'; x.font = '20px ui-monospace, monospace';
  x.fillText('BOTS EN TU PROPIA WALLET', cx, 196);

  // Par y tipo
  x.fillStyle = '#eaecef'; x.font = 'bold 68px system-ui, sans-serif';
  x.fillText(par || '', cx, 330);
  x.fillStyle = '#8b96a3'; x.font = '26px system-ui, sans-serif';
  x.fillText(tipo || '', cx, 374);

  // Ganancia
  x.fillStyle = '#7d8794'; x.font = '24px ui-monospace, monospace';
  x.fillText('GANANCIA', cx, 470);
  x.fillStyle = positivo ? '#2ee86a' : '#f6465d';
  x.font = 'bold 132px system-ui, sans-serif';
  x.fillText(`${positivo ? '+' : ''}${num(ganancia, 2)}`, cx, 590);
  x.fillStyle = '#8b96a3'; x.font = '30px ui-monospace, monospace';
  x.fillText(moneda || '', cx, 634);

  if (pct !== undefined && isFinite(pct)) {
    x.fillStyle = positivo ? 'rgba(46,232,106,.16)' : 'rgba(246,70,93,.16)';
    redondeado(x, 0, 0, 0, 0);
    const txt = `${positivo ? '+' : ''}${num(pct, 2)}%`;
    x.font = 'bold 34px system-ui, sans-serif';
    const w = x.measureText(txt).width + 56;
    x.save(); x.translate(cx - w / 2, 668); redondeado(x, 0, w, 60, 30);
    x.fillStyle = positivo ? 'rgba(46,232,106,.14)' : 'rgba(246,70,93,.14)'; x.fill();
    x.strokeStyle = positivo ? 'rgba(46,232,106,.45)' : 'rgba(246,70,93,.45)'; x.lineWidth = 2; x.stroke();
    x.restore();
    x.fillStyle = positivo ? '#2ee86a' : '#f6465d';
    x.fillText(txt, cx, 710);
  }

  // Tres datos
  const datos = [
    ['DÍAS ACTIVO', String(dias ?? '—')],
    ['VUELTAS', String(vueltas ?? '—')],
    ['INVERTIDO', invertido != null ? num(invertido, 2) : '—']
  ];
  const anchoCol = (W - 220) / 3;
  datos.forEach((d, i) => {
    const px = 110 + anchoCol * i + anchoCol / 2;
    x.fillStyle = '#6b7681'; x.font = '20px ui-monospace, monospace';
    x.fillText(d[0], px, 830);
    x.fillStyle = '#eaecef'; x.font = 'bold 44px system-ui, sans-serif';
    x.fillText(d[1], px, 884);
  });

  // Línea y pie
  x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 1;
  x.beginPath(); x.moveTo(140, 940); x.lineTo(W - 140, 940); x.stroke();
  x.fillStyle = '#8b96a3'; x.font = '26px system-ui, sans-serif';
  x.fillText('cybersecureaid.github.io/bot-algoritmico', cx, 990);
  x.fillStyle = '#5f6a75'; x.font = '19px ui-monospace, monospace';
  x.fillText('Sin custodia · sin KYC · tu dinero en tu wallet', cx, 1024);

  return c;
}

/** Abre el menú de compartir del teléfono (o descarga si no lo hay). */
export async function compartirResultado(datos) {
  estilos();
  const c = tarjetaResultado(datos);
  const blob = await new Promise((r) => c.toBlob(r, 'image/png', 0.95));
  if (!blob) return false;
  const archivo = new File([blob], 'aurex.png', { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: 'Mi bot en Aurex',
        text: `${datos.par} · ${Number(datos.ganancia) >= 0 ? '+' : ''}${num(datos.ganancia, 2)} ${datos.moneda}`
      });
      return true;
    } catch (_) { return false; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aurex-${(datos.par || 'bot').replace('/', '-')}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return true;
}

/* ══════════════ 3) NÚMEROS QUE SUBEN CONTANDO ══════════════ */
export function contar(el, hasta, { dec = 2, ms = 900, prefijo = '', sufijo = '' } = {}) {
  if (!el) return;
  const fin = Number(hasta);
  if (!isFinite(fin)) return;
  const ini = Number(String(el.textContent || '').replace(/[^\d.-]/g, '')) || 0;
  if (Math.abs(fin - ini) < Math.pow(10, -dec)) return;
  const t0 = performance.now();
  const suave = (t) => 1 - Math.pow(1 - t, 3);
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    const v = ini + (fin - ini) * suave(k);
    el.textContent = prefijo + num(v, dec) + sufijo;
    if (k < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

/** Anima todos los elementos con data-contar cuando aparecen en pantalla. */
export function animarVisibles(raiz) {
  const els = [...(raiz || document).querySelectorAll('[data-contar]')].filter((e) => !e.dataset.hecho);
  if (els.length === 0) return;
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      const el = e.target; el.dataset.hecho = '1';
      contar(el, el.dataset.contar, {
        dec: Number(el.dataset.dec ?? 2),
        prefijo: el.dataset.prefijo || '',
        sufijo: el.dataset.sufijo || ''
      });
      io.unobserve(el);
    }
  }, { threshold: 0.4 });
  els.forEach((e) => io.observe(e));
}

/* ── Estilos ── */
function estilos() {
  if ($('extras-css')) return;
  const s = document.createElement('style'); s.id = 'extras-css';
  s.textContent = `
  #inst-banner{position:fixed;left:14px;right:14px;bottom:14px;z-index:9700;display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:16px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);box-shadow:0 18px 50px rgba(0,0,0,.7);animation:instIn .25s ease both;max-width:460px;margin:0 auto}
  @keyframes instIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
  #inst-banner .inst-ico{flex:0 0 auto;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(232,184,75,.13);border:1px solid rgba(232,184,75,.35);color:var(--gold,#E8B84B)}
  #inst-banner .inst-tx{flex:1;min-width:0}
  #inst-banner .inst-tx b{display:block;font-family:var(--display,sans-serif);font-weight:800;font-size:14.5px;color:#eaecef}
  #inst-banner .inst-tx span{display:block;font-family:var(--sans,sans-serif);font-size:11.5px;color:#8b96a3;line-height:1.4;margin-top:2px}
  #inst-banner .inst-si{flex:0 0 auto;padding:11px 18px;border-radius:11px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 3px 0 #8f6a1a;min-height:44px}
  #inst-banner .inst-no{flex:0 0 auto;width:32px;height:32px;border-radius:9px;border:1px solid #2b3139;background:transparent;color:#7d8794;cursor:pointer;font-size:13px}
  .btn-compartir{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 15px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);min-height:40px}
  .btn-compartir:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  @media(max-width:560px){#inst-banner .inst-tx span{display:none}}`;
  document.head.appendChild(s);
}
