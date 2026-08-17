/* niveles/menus.js — Menús y ventanas de Smart Levels: guía de indicador,
   menú de alertas, ventana flotante (PiP), registrar indicador, logos de
   monedas y la ayuda '¿Cómo funciona?'. Extraído de niveles.js; menuAlertas
   y abrirWidget ahora reciben el par y la temporalidad por parámetro. */

import { N } from './estado.js?v=1';
import { T } from './i18n.js?v=1';
import { esc, fmt } from './util.js?v=1';
import { PARES } from './config.js?v=1';
import { avisoMarea, activarAlertasMarea, desactivarAlertas } from './alertas.js?v=1';

const $ = (id) => document.getElementById(id);

export function guiaIndicador(nombre, guia) {
  const prev = document.getElementById('nv-guia'); if (prev) prev.remove();
  const pars = String(guia || '').split('\n\n').map((p) => `<p>${esc(T(p))}</p>`).join('');
  const m = document.createElement('div');
  m.id = 'nv-guia';
  m.innerHTML = `
    <div class="nv-guia-bg"></div>
    <div class="nv-guia-card" role="dialog" aria-modal="true">
      <div class="nv-guia-head">
        <h3><span>${esc(T('Cómo funciona'))}</span>${esc(nombre)}</h3>
        <button class="nv-guia-x" aria-label="${esc(T('Cerrar'))}">✕</button>
      </div>
      <div class="nv-guia-body">${pars}</div>
    </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.nv-guia-bg').onclick = cerrar;
  m.querySelector('.nv-guia-x').onclick = cerrar;
}

export function menuAlertas(par, tf) {
  document.querySelectorAll('#nv-herr-menu, #nv-ind-modal').forEach((x) => x.remove());
  const prev = document.getElementById('nv-al-modal'); if (prev) { prev.remove(); return; }

  const dir = N.alertaDir || { long: true, short: true };
  const activa = !!N.alertas;
  const m = document.createElement('div');
  m.id = 'nv-al-modal';
  m.innerHTML = `
    <div class="nv-al-bg"></div>
    <div class="nv-al-card" role="dialog" aria-modal="true">
      <button class="nv-al-x" aria-label="${esc(T('Cerrar'))}">✕</button>
      <h3>${esc(T('Habilitar una alerta'))}</h3>
      <p class="nv-al-lead">${esc(T('Elige el indicador y con qué condiciones quieres que te avise.'))}</p>
      ${activa ? `<div class="nv-al-estado">${esc(T('Alertas activas'))}: <b>${esc(N.alertaPar || par)}</b> · ${dir.long && dir.short ? 'LONG + SHORT' : (dir.long ? 'LONG' : 'SHORT')} <button class="nv-al-off" type="button">${esc(T('Desactivar'))}</button></div>` : ''}
      <div class="nv-al-inds">
        <button class="nv-al-ind" data-ind="marea">
          <span class="nv-al-ic">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11c2.2 0 2.2-2.2 4.4-2.2S8.6 11 10.8 11 13 8.8 15.2 8.8 17.4 11 19.6 11 22 8.8 22 8.8"/><path d="M2 16c2.2 0 2.2-2.2 4.4-2.2S8.6 16 10.8 16 13 13.8 15.2 13.8 17.4 16 19.6 16 22 13.8 22 13.8"/></svg>'}</span>
          <b>Marea</b><em>${esc(T('señales de giro'))}</em>
        </button>
        <button class="nv-al-ind" data-ind="faro">
          <span class="nv-al-ic">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9.4" y="3.4" width="5.2" height="3.6" rx="1.1"/><path d="M12 1.6V3.2"/><path d="M16.6 5.2 19 4M7.4 5.2 5 4"/><path d="M10 7h4l1.1 13.4H8.9L10 7z"/><path d="M9.3 12.2h5.4"/></svg>'}</span>
          <b>Faro</b><em>${esc(T('alerta de precio'))}</em>
        </button>
      </div>
      <div class="nv-al-panel" data-panel="marea">
        <div class="nv-al-sub">${esc(T('¿Qué señales de Marea quieres recibir en'))} <b>${esc(par)}</b>?</div>
        <div class="nv-al-conds">
          <button class="nv-al-cond ${dir.long ? 'on' : ''}" data-cond="long"><span class="nv-al-dot" style="background:#2ee86a"></span>LONG</button>
          <button class="nv-al-cond ${dir.short ? 'on' : ''}" data-cond="short"><span class="nv-al-dot" style="background:#f6465d"></span>SHORT</button>
        </div>
        <button class="nv-al-go" type="button">${esc(T('Activar alertas'))}</button>
        <p class="nv-al-nota">${esc(T('Suena y notifica aunque estés en otra ventana, mientras la página siga abierta.'))}</p>
      </div>
      <div class="nv-al-panel" data-panel="faro" style="display:none">
        <div class="nv-al-faro">
          <p>${esc(T('Faro no tiene señales de entrada o salida (no lleva tachuelas de LONG/SHORT), así que sus alertas son de PRECIO, no de señal.'))}</p>
          <ol>
            <li>${esc(T('Haz clic derecho (o mantén pulsado en el móvil) sobre el precio donde quieras que te avise.'))}</li>
            <li>${esc(T('Elige "Establecer posición".'))}</li>
            <li>${esc(T('Selecciona la opción "Solo avísame".'))}</li>
            <li>${esc(T('Confirma: recibirás un aviso cuando el precio toque ese nivel, en la moneda actual.'))}</li>
          </ol>
          <button class="nv-al-go" type="button" data-cerrar="1">${esc(T('Entendido'))}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(m);

  const cerrar = () => m.remove();
  m.querySelector('.nv-al-bg').onclick = cerrar;
  m.querySelector('.nv-al-x').onclick = cerrar;
  const off = m.querySelector('.nv-al-off'); if (off) off.onclick = () => { desactivarAlertas(); cerrar(); };

  const pMarea = m.querySelector('[data-panel="marea"]');
  const pFaro = m.querySelector('[data-panel="faro"]');
  const inds = m.querySelectorAll('.nv-al-ind');
  const selInd = (cual) => {
    inds.forEach((b) => b.classList.toggle('sel', b.dataset.ind === cual));
    pMarea.style.display = cual === 'marea' ? '' : 'none';
    pFaro.style.display = cual === 'faro' ? '' : 'none';
  };
  inds.forEach((b) => b.onclick = () => selInd(b.dataset.ind));
  selInd('marea');   // por defecto, la más usada

  // condiciones LONG / SHORT
  const conds = m.querySelectorAll('.nv-al-cond');
  conds.forEach((c) => c.onclick = () => {
    // no permitir dejar las dos apagadas
    const otras = [...conds].filter((x) => x !== c);
    if (c.classList.contains('on') && otras.every((x) => !x.classList.contains('on'))) return;
    c.classList.toggle('on');
  });

  // activar
  m.querySelector('[data-panel="marea"] .nv-al-go').onclick = async () => {
    const long = m.querySelector('.nv-al-cond[data-cond="long"]').classList.contains('on');
    const short = m.querySelector('.nv-al-cond[data-cond="short"]').classList.contains('on');
    if (!long && !short) { avisoMarea('Elige al menos LONG o SHORT'); return; }
    const ok = await activarAlertasMarea(long, short, par, tf);
    if (ok) cerrar();
  };
  const fbtn = m.querySelector('[data-panel="faro"] .nv-al-go');
  if (fbtn) fbtn.onclick = cerrar;
}

export async function abrirWidget(par, tf) {
  if (!('documentPictureInPicture' in window)) {
    avisoMarea('La ventana flotante está disponible en Chrome o Edge de escritorio');
    return;
  }
  if (_widgetVivo) return;
  try {
    // proporción horizontal ~16:9 (incluye la cabecera)
    const pip = await window.documentPictureInPicture.requestWindow({ width: 480, height: 292 });
    const doc = pip.document;
    doc.body.style.cssText = 'margin:0;background:#05070b;overflow:hidden;font-family:ui-monospace,monospace';

    // tarjeta redondeada con borde dorado; las esquinas de la ventana (que
    // el sistema fuerza rectangulares) quedan en negro y no se notan
    const card = doc.createElement('div');
    card.style.cssText = 'position:absolute;inset:8px;border-radius:16px;overflow:hidden;' +
      'background:#0b0f16;border:1px solid rgba(232,184,75,.35);' +
      'box-shadow:0 12px 34px rgba(0,0,0,.6);display:flex;flex-direction:column';
    doc.body.appendChild(card);

    const head = doc.createElement('div');
    head.style.cssText = 'flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;' +
      'padding:7px 12px;font:600 11px ui-monospace,monospace;color:#E8B84B;' +
      'border-bottom:1px solid rgba(232,184,75,.22)';
    head.innerHTML = '<span>◈ ' + esc(par) + ' · ' + esc(tf.toUpperCase()) + '</span>' +
      '<span id="wprice" style="color:#eaecef;font-weight:700"></span>';
    card.appendChild(head);

    const wrap = doc.createElement('div');
    wrap.style.cssText = 'position:relative;flex:1 1 auto;overflow:hidden';
    card.appendChild(wrap);
    const c = doc.createElement('canvas');
    c.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    wrap.appendChild(c);
    const cc = c.getContext('2d');

    _widgetVivo = true;
    const pintar = () => {
      if (!_widgetVivo) return;
      try {
        const w = wrap.clientWidth, h = wrap.clientHeight;
        const dpr = pip.devicePixelRatio || 1;
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
          c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
          cc.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
        cc.fillStyle = '#0b0f16'; cc.fillRect(0, 0, w, h);
        const src = $('nv-cv');
        if (src && src.width) {
          // MINIATURA proporcional (contain): la gráfica entera, a escala,
          // centrada; nunca un recorte
          const ar = src.width / src.height, arD = w / h;
          let dw = w, dh = h;
          if (ar > arD) dh = w / ar; else dw = h * ar;
          cc.imageSmoothingEnabled = true; cc.imageSmoothingQuality = 'high';
          cc.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh);
        }
        const pr = doc.getElementById('wprice'); if (pr) pr.textContent = fmt(N.precio || 0);
      } catch (_) {}
      (pip.requestAnimationFrame ? pip.requestAnimationFrame(pintar) : setTimeout(pintar, 120));
    };
    pintar();
    pip.addEventListener('pagehide', () => { _widgetVivo = false; });
    avisoMarea('Ventana flotante abierta · queda por encima de tus ventanas');
  } catch (_) {
    _widgetVivo = false;
    avisoMarea('No se pudo abrir la ventana flotante');
  }
}

export function registrarIndicador() {
  const prev = document.getElementById('nv-reg-modal'); if (prev) { prev.remove(); return; }
  const TG = 'https://t.me/JesusDevTrader';
  const m = document.createElement('div');
  m.id = 'nv-reg-modal';
  m.innerHTML = `
    <div class="nv-reg-bg"></div>
    <div class="nv-reg-card" role="dialog" aria-modal="true">
      <button class="nv-reg-x" aria-label="${esc(T('Cerrar'))}">✕</button>
      <div class="nv-reg-ico">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 16l4.5-5 3 3L16 7"/><circle cx="19" cy="6" r="3"/><path d="M19 4.7v2.6M17.7 6h2.6"/></svg>
      </div>
      <h3>${esc(T('Registra tu indicador'))}</h3>
      <p class="nv-reg-lead">${esc(T('¿Creaste un indicador de TradingView o una estrategia de análisis que funciona? Preséntala y podríamos mostrarla directamente en esta gráfica, a disposición de todos nuestros usuarios.'))}</p>
      <div class="nv-reg-pasos">
        <div class="nv-reg-paso"><span>1</span><div><b>${esc(T('Nos escribes'))}</b><em>${esc(T('Cuéntanos qué hace tu indicador o estrategia rentable y cómo lo diseñaste. Sirve tanto si viene de TradingView como si es tuyo propio.'))}</em></div></div>
        <div class="nv-reg-paso"><span>2</span><div><b>${esc(T('Revisión manual'))}</b><em>${esc(T('Abrimos un período de revisión y comprobamos, a mano, que funciona de verdad. No se integra nada automáticamente: primero pasa nuestro filtro.'))}</em></div></div>
        <div class="nv-reg-paso"><span>3</span><div><b>${esc(T('Se integra y ganas comisión'))}</b><em>${esc(T('Si cumple, lo integramos en la sección de indicadores del sistema. Nos das una wallet y te pagamos una comisión por tu indicador, según un acuerdo económico justo: beneficio para ambos y un precio asequible para los clientes. Pago en BNB o USDT.'))}</em></div></div>
      </div>
      <a class="nv-reg-cta" href="${TG}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M9.8 15.6 9.6 20c.4 0 .6-.2.8-.4l1.9-1.8 3.9 2.9c.7.4 1.2.2 1.4-.7l2.6-12.2c.3-1.2-.4-1.7-1.2-1.4L3.6 10.9c-1.2.5-1.1 1.1-.2 1.4l3.9 1.2 9.1-5.7c.4-.3.8-.1.5.2z"/></svg>
        ${esc(T('Escríbenos por Telegram'))}
      </a>
      <p class="nv-reg-pie">${esc(T('Ampliamos el catálogo con herramientas verificadas y damos a sus creadores una vía para comercializarlas.'))}</p>
    </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.nv-reg-bg').onclick = cerrar;
  m.querySelector('.nv-reg-x').onclick = cerrar;
}

const CLAVE_LOGOS = 'aurex-logos';
let _logos = null;
export async function ponerLogos() {
  if (!_logos) {
    try {
      const g = JSON.parse(localStorage.getItem(CLAVE_LOGOS) || 'null');
      if (g && Date.now() - g.cuando < 86400000) _logos = g.datos;
    } catch (_) {}
  }
  if (!_logos) {
    try {
      const ids = PARES.map((p) => p.cg).join(',');
      const r = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&per_page=250`);
      const j = await r.json();
      _logos = {};
      j.forEach((x) => { _logos[x.id] = x.image; });
      try { localStorage.setItem(CLAVE_LOGOS, JSON.stringify({ cuando: Date.now(), datos: _logos })); } catch (_) {}
    } catch (_) { _logos = {}; }
  }
  document.querySelectorAll('.nv-logo[data-cg]').forEach((el) => {
    const url = _logos && _logos[el.dataset.cg];
    if (url) { el.style.backgroundImage = `url(${url})`; el.classList.add('con'); }
  });
}

const PASOS_NV = [
  {
    t: 'Un centro completo, no solo gráficas',
    d: 'Smart Levels es un entorno de <b>análisis, visualización y operación</b> en un mismo lugar: estudias el mercado en tiempo real, dibujas, mides y <b>operas directo desde la gráfica</b>.',
    x: 'Todo con velas reales del mercado. Verde es comprar, rojo es vender.'
  },
  {
    t: 'Compra y vende desde la gráfica',
    d: 'Haz <b>clic derecho</b> (o mantén pulsado en móvil) sobre el precio y elige <b>Comprar aquí</b> o <b>Vender aquí</b> en la zona que quieras. Ves el % de beneficio y de riesgo antes de confirmar.',
    x: 'Es no custodial: operas desde tu propia wallet, sin cuenta ni intermediarios.'
  },
  {
    t: 'Alertas de precio',
    d: 'Coloca <b>alertas</b> en los niveles que te importan y recibe aviso cuando el precio llegue, sin tener que estar mirando la pantalla.',
    x: 'Combínalas con los indicadores para no perderte una entrada.'
  },
  {
    t: 'Representa posiciones en tiempo real',
    d: 'Con las herramientas de <b>posición larga y corta</b> pintas tu entrada, tu objetivo y tu stop, y ves en vivo el <b>beneficio, el riesgo y la relación R:R</b> mientras el precio se mueve.',
    x: 'Ajústalas arrastrando: sube el objetivo, baja el stop, amplía a los lados.'
  },
  {
    t: 'Indicadores premium',
    d: 'Desde <b>Indicators</b> activas indicadores creados por nosotros, como <b>Marea</b>, que te dice hacia qué lado está el mercado y <b>cuánto falta</b> para que salte una alerta de long o de short.',
    x: 'El recuadro de la esquina se recoge tocándolo para que no estorbe.'
  },
  {
    t: 'Herramientas modernas de dibujo',
    d: 'Líneas, Fibonacci, regla, texto, marcadores, rectángulos… con una dinámica ágil que en varios aspectos <b>supera a plataformas como TradingView</b>. Traza, edita y mueve todo con el cursor.',
    x: 'La barra se oculta sola; acerca el cursor al borde izquierdo para desplegarla.'
  },
  {
    t: 'Cambia de moneda y de tiempo',
    d: 'Arriba a la izquierda cambias de <b>criptomoneda</b> y eliges la <b>temporalidad</b> (15m, 1H, 4H, 1D). Arrastra para recorrer el tiempo y usa la rueda para acercar.',
    x: 'Esto es análisis, no una promesa. Usa siempre stop y no arriesgues más de lo que puedas perder.'
  }
];

let _pasoNv = 0;

export function ayuda() {
  _pasoNv = 0;
  const d = document.createElement('div');
  d.id = 'nv-ayuda-box';
  d.innerHTML = `<div class="nv-bg"></div>
    <div class="nva-c">
      <button class="nva-x" id="nva-x" aria-label="Cerrar">✕</button>
      <div class="nva-eyebrow">Smart Levels</div>
      <div id="nva-cuerpo"></div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.nv-bg').onclick = q;
  $('nva-x').onclick = q;
  pasoNv();
}

function pasoNv() {
  const c = $('nva-cuerpo'); if (!c) return;
  const p = PASOS_NV[_pasoNv];
  const ultimo = _pasoNv === PASOS_NV.length - 1;
  c.innerHTML = `
    <div class="nva-card">
      <div class="nva-n">${_pasoNv + 1} <em>de ${PASOS_NV.length}</em></div>
      <div class="nva-t">${p.t}</div>
      <div class="nva-d">${p.d}</div>
      <div class="nva-x2">${p.x}</div>
    </div>
    <div class="nva-puntos">
      ${PASOS_NV.map((_, i) => `<i class="${i === _pasoNv ? 'on' : ''}" data-pnv="${i}"></i>`).join('')}
    </div>
    <div class="nva-acts">
      ${_pasoNv > 0 ? '<button class="nva-atras" id="nva-atras">Atrás</button>' : ''}
      <button class="nva-b" id="nva-sig">${ultimo ? 'Entendido' : 'Saber más'}</button>
    </div>`;
  $('nva-sig').onclick = () => {
    if (ultimo) { document.getElementById('nv-ayuda-box')?.remove(); return; }
    _pasoNv++; pasoNv();
  };
  const at = $('nva-atras');
  if (at) at.onclick = () => { _pasoNv = Math.max(0, _pasoNv - 1); pasoNv(); };
  c.querySelectorAll('[data-pnv]').forEach((b) => b.onclick = () => { _pasoNv = Number(b.dataset.pnv); pasoNv(); });
}
