// extras.js — Tres cosas que suman: instalar la app, compartir el resultado
// como imagen, y animar los números. Módulo independiente, sin librerías.

const $ = (id) => document.getElementById(id);
const num = (n, d = 2) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ══════════════ 1) INSTALAR LA APP ══════════════ */
/* Nada de banners que tapan la pantalla: el usuario abre el panel cuando
   quiere, desde el botón "Instalar" del menú. */
let _instalador = null;

export function iniciarInstalacion() {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _instalador = e; marcarBoton(true); });
  window.addEventListener('appinstalled', () => { _instalador = null; marcarBoton(false); cerrarPanel(); });
  // Si ya está instalada, el botón sobra.
  if (yaInstalada()) marcarBoton(false);
}

function yaInstalada() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function marcarBoton(listo) {
  const b = $('c-instalar');
  if (!b) return;
  if (yaInstalada()) { b.style.display = 'none'; return; }
  b.classList.toggle('listo', !!listo);
}
function cerrarPanel() { const p = $('inst-panel'); if (p) p.remove(); }

/** Panel desplegable bajo el botón "Instalar". */
export function panelInstalar(ancla) {
  estilos();
  if ($('inst-panel')) { cerrarPanel(); return; }

  const puede = !!_instalador;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const movil = /android|iphone|ipad|ipod/i.test(navigator.userAgent);

  const d = document.createElement('div');
  d.id = 'inst-panel';
  d.innerHTML = `<div class="ip-bg"></div>
    <div class="ip-c">
      <div class="ip-top">
        <img class="ip-ico" src="assets/img/aurex-192.png" alt="">
        <div><b>Aurex</b><span>Bots de trading en tu wallet</span></div>
      </div>
      <button class="ip-b" id="ip-si">Instalar</button>
      <div class="ip-n" id="ip-nota">Se abre al instante, con su icono y a pantalla completa.</div>
      ${!movil ? `<div class="ip-sep"></div>
        <div class="ip-n">Y en tu teléfono: escanea este código.</div>
        <div class="ip-qr" id="ip-qr"></div>` : ''}
    </div>`;
  document.body.appendChild(d);

  const r = ancla ? ancla.getBoundingClientRect() : { bottom: 60, right: window.innerWidth - 14 };
  const c = d.querySelector('.ip-c');
  c.style.top = (r.bottom + 8) + 'px';
  c.style.right = Math.max(10, window.innerWidth - r.right) + 'px';

  d.querySelector('.ip-bg').onclick = cerrarPanel;
  const si = $('ip-si');
  if (si) si.onclick = async () => {
    if (_instalador) {
      _instalador.prompt();
      try { await _instalador.userChoice; } catch (_) {}
      _instalador = null; cerrarPanel();
      return;
    }
    // El navegador no nos deja instalarla desde aquí: explicamos cómo, solo entonces.
    const nota = $('ip-nota');
    if (!nota) return;
    nota.className = 'ip-pasos';
    nota.innerHTML = iOS
      ? `<div class="ip-p"><span>1</span>Toca <b>Compartir</b> en Safari</div>
         <div class="ip-p"><span>2</span>Elige <b>Añadir a pantalla de inicio</b></div>`
      : movil
        ? `<div class="ip-p"><span>1</span>Abre el menú <b>⋮</b> del navegador</div>
           <div class="ip-p"><span>2</span>Elige <b>Instalar aplicación</b></div>`
        : `<div class="ip-p"><span>1</span>Mira el icono de instalar en la barra de direcciones</div>
           <div class="ip-p"><span>2</span>Elige <b>Instalar Aurex</b></div>`;
    si.textContent = 'Ya está instalada o el navegador no lo permite';
    si.disabled = true;
  };

  const qr = $('ip-qr');
  if (qr) dibujarQR(qr);
}

/* QR de la web, para instalarla en el teléfono desde el ordenador. */
async function dibujarQR(cont) {
  const url = location.origin + location.pathname.replace(/[^/]*$/, '');
  const pinta = () => {
    try {
      const q = window.qrcode(0, 'M');
      q.addData(url); q.make();
      cont.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
    } catch (_) { cont.innerHTML = `<div class="ip-nqr">${url}</div>`; }
  };
  if (window.qrcode) return pinta();
  const sc = document.createElement('script');
  sc.src = 'assets/js/vendor/qrcode.js?v=85';
  sc.onload = pinta;
  sc.onerror = () => { cont.innerHTML = `<div class="ip-nqr">${url}</div>`; };
  document.head.appendChild(sc);
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

  const movil = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
  if (movil && navigator.canShare && navigator.canShare({ files: [archivo] })) {
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

/* ══════════════ HISTORIAL EN EXCEL ══════════════
   Un archivo CSV que abre Excel, Google Sheets o cualquier hoja de cálculo,
   con todas las operaciones que ha cerrado el bot. */

function csvSeguro(v) {
  const t = String(v ?? '');
  return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

/** Descarga el historial de operaciones del bot. */
export function descargarHistorial({ par, tipo, operaciones, moneda, base, creado }) {
  const ops = operaciones || [];
  const lineas = [];

  lineas.push('Aurex Finance - Historial del bot');
  lineas.push('Par;' + csvSeguro(par));
  lineas.push('Estrategia;' + csvSeguro(tipo));
  lineas.push('Generado;' + new Date().toLocaleString('es'));
  if (creado) lineas.push('Bot creado;' + csvSeguro(creado));
  lineas.push('Operaciones cerradas;' + ops.length);
  lineas.push('');

  lineas.push(['#', 'Tipo', 'Precio (' + (moneda || '') + ')', 'Cantidad (' + (base || '') + ')', 'Total (' + (moneda || '') + ')', 'Bloque'].join(';'));

  if (ops.length === 0) {
    lineas.push('');
    lineas.push('Este bot todavia no ha cerrado ninguna operacion.');
    lineas.push('Cuando el precio alcance una de tus cuadriculas, aparecera aqui.');
  } else {
    ops.forEach((o, i) => {
      const cant = Number(o.cantidad ?? 0);
      const precio = Number(o.precio ?? 0);
      lineas.push([
        i + 1,
        o.compra ? 'Compra' : 'Venta',
        precio.toFixed(8).replace('.', ','),
        cant ? cant.toFixed(8).replace('.', ',') : '',
        cant ? (cant * precio).toFixed(4).replace('.', ',') : '',
        o.bloque ?? ''
      ].join(';'));
    });
  }

  // El BOM hace que Excel respete las tildes.
  const texto = '\uFEFF' + lineas.join('\r\n');
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `aurex-historial-${String(par || 'bot').replace('/', '-')}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return ops.length;
}

/** Aviso antes de descargar, para que nadie se sorprenda. */
export function avisoHistorial(alAceptar) {
  estilos();
  const d = document.createElement('div');
  d.id = 'hist-av';
  d.innerHTML = `<div class="ha-bg"></div>
    <div class="ha-c">
      <div class="ha-t">Descargar tu historial</div>
      <div class="ha-s">Se guarda una hoja de cálculo con <b>todas las operaciones que el bot ha cerrado</b>: compras, ventas, precios y cantidades.<br><br>Si aún no ha cerrado ninguna, el archivo se descargará vacío, indicándolo.</div>
      <div class="ha-acts"><button class="ha-b gris" data-no>Volver</button><button class="ha-b" data-si>Descargar</button></div>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('.ha-bg').onclick = cerrar;
  d.querySelector('[data-no]').onclick = cerrar;
  d.querySelector('[data-si]').onclick = () => { cerrar(); alAceptar(); };
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
  #colmena-app .c-loteria.listo{color:var(--gold)}
  #inst-panel{position:fixed;inset:0;z-index:9700}
  #inst-panel .ip-bg{position:absolute;inset:0}
  #inst-panel .ip-c{position:absolute;width:288px;max-width:calc(100vw - 20px);background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:16px;padding:16px;box-shadow:0 22px 60px rgba(0,0,0,.75);animation:ipIn .16s ease both}
  @keyframes ipIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  #inst-panel .ip-top{display:flex;align-items:center;gap:11px;margin-bottom:14px}
  #inst-panel .ip-ico{width:44px;height:44px;border-radius:12px;flex:0 0 auto;background:#0b0e11}
  #inst-panel .ip-top b{display:block;font-family:var(--display,sans-serif);font-weight:800;font-size:16px;color:#eaecef}
  #inst-panel .ip-top span{display:block;font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;margin-top:1px}
  #inst-panel .ip-b{width:100%;padding:13px;border-radius:12px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a;min-height:46px}
  #inst-panel .ip-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8f6a1a}
  #inst-panel .ip-b:disabled{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#7d8794;box-shadow:none;font-size:11.5px;cursor:default}
  #inst-panel .ip-n{font-family:var(--sans,sans-serif);font-size:11.5px;color:#7d8794;line-height:1.5;margin-top:10px;text-align:center}
  #inst-panel .ip-pasos{display:flex;flex-direction:column;gap:8px}
  #inst-panel .ip-p{display:flex;align-items:center;gap:9px;font-family:var(--sans,sans-serif);font-size:12.5px;color:#b7bdc6;line-height:1.4}
  #inst-panel .ip-p b{color:var(--gold,#E8B84B)}
  #inst-panel .ip-p span{flex:0 0 auto;width:22px;height:22px;border-radius:7px;display:grid;place-items:center;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:11px}
  #inst-panel .ip-sep{height:1px;background:rgba(255,255,255,.08);margin:14px 0 10px}
  #inst-panel .ip-qr{background:#fff;border-radius:12px;padding:9px;margin-top:10px}
  #inst-panel .ip-qr svg{width:100%;height:auto;display:block}
  #inst-panel .ip-nqr{color:#333;font-size:9.5px;word-break:break-all;padding:8px}
  .btn-compartir{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:10px 15px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold,#E8B84B);font-family:var(--display,sans-serif);font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);min-height:40px}
  .btn-compartir:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  #hist-av{position:fixed;inset:0;z-index:9850;display:flex;align-items:center;justify-content:center;padding:18px}
  #hist-av .ha-bg{position:absolute;inset:0;background:rgba(3,5,8,.84);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px)}
  #hist-av .ha-c{position:relative;width:100%;max-width:380px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:18px;padding:22px}
  #hist-av .ha-t{font-family:var(--display,sans-serif);font-weight:800;font-size:19px;color:var(--gold,#E8B84B);text-align:center}
  #hist-av .ha-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6;margin:10px 0 18px}
  #hist-av .ha-s b{color:#eaecef}
  #hist-av .ha-acts{display:flex;gap:9px}
  #hist-av .ha-b{flex:1;padding:13px;border-radius:11px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:13.5px;cursor:pointer;box-shadow:0 3px 0 #8f6a1a;min-height:46px}
  #hist-av .ha-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#b7bdc6;box-shadow:0 3px 0 rgba(0,0,0,.4)}`;
  document.head.appendChild(s);
}
