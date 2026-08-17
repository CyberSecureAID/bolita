/* market/dialogos.js — Diálogos modales del Marketplace: confirmar acción,
   pedir motivo de disputa, calificar con estrellas y perfil rápido. Varios
   escriben en el contrato (disputa, rating, perfil). Extraído de market.js. */

import * as ethers from '../vendor/ethers-6.13.4.min.js?v=125';
import { firmante, traducir } from './util.js?v=1';
import { cerrar, msg } from './ui.js?v=1';
import { lee } from './contrato.js?v=1';
import { MARKET, ABI } from './config.js?v=1';

let _panelMisOps = () => {};
export function initDialogos({ panelMisOps }) { _panelMisOps = panelMisOps; }

const $ = (id) => document.getElementById(id);

export function pedirPerfilRapido(alTerminar) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg'; d.id = 'mk-perfrap';
  d.innerHTML = `<div class="mk-wiz-c">
    <button class="mk-wiz-x" id="pr-x">✕</button>
    <div class="mk-wiz-t">Antes de reservar</div>
    <div class="mk-wiz-s">Necesitamos saber quién eres y cómo contactarte. Se guarda una sola vez.</div>
    <div class="mk-wiz-b">
      <label>Tu nombre o alias</label><input id="pr-nom" maxlength="32" placeholder="Ej: Jesus">
      <label>Tu Telegram o WhatsApp</label><input id="pr-ct" maxlength="40" placeholder="@usuario o +53 5xxxxxxx">
    </div>
    <div class="mk-wiz-acts"><button class="mk-b" id="pr-ok">Guardar y continuar</button></div>
    <div class="mk-msg info" id="pr-msg"></div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  $('pr-x').onclick = cerrar;
  d.onclick = (e) => { if (e.target === d) cerrar(); };
  const pm = (t, c) => { const m = $('pr-msg'); if (m) { m.className = 'mk-msg ' + (c || 'info'); m.textContent = t; } };
  $('pr-ok').onclick = async () => {
    const nom = ($('pr-nom').value || '').trim();
    const ct = ($('pr-ct').value || '').trim();
    if (!nom) { pm('Pon tu nombre.', 'err'); return; }
    if (!ct) { pm('Pon una forma de contacto.', 'err'); return; }
    const via = ct.startsWith('@') ? 'Telegram' : 'WhatsApp';
    try {
      pm('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.guardarPerfil(nom, '', 'USD', `${via}: ${ct}`)).wait();
      cerrar(); if (alTerminar) alTerminar();
    } catch (e) { pm(traducir(e), 'err'); }
  };
}

export function pedirMotivo(id) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c" style="max-width:420px">
    <div class="mk-wiz-t">¿Qué pasó?</div>
    <div class="mk-wiz-s">Cuéntalo en pocas palabras. Esto lo lee el árbitro para poder decidir, así que <b>sé concreto</b>: qué acordaron, qué pagaste o qué esperabas.</div>
    <div class="mk-wiz-b">
      <textarea id="dm-txt" maxlength="300" rows="4" placeholder="Ej: le pagué 120 CUP por Transferencia el día 8 a las 3pm y no me ha liberado la parte 1."></textarea>
      <div class="mk-hint">Al abrirla, <b>la operación se detiene</b> hasta que el árbitro decida (máximo 48 h). Si es un malentendido, intenta hablarlo primero por el contacto.</div>
    </div>
    <div class="mk-wiz-acts"><button class="mk-b gris" data-no>Volver</button><button class="mk-b peligro" data-si>Abrir disputa</button></div>
    <div class="mk-msg info" id="dm-msg"></div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('[data-no]').onclick = cerrar;
  d.onclick = (e) => { if (e.target === d) cerrar(); };
  d.querySelector('[data-si]').onclick = async () => {
    const t = ($('dm-txt').value || '').trim();
    const m = $('dm-msg');
    if (t.length < 10) { m.className = 'mk-msg err'; m.textContent = 'Explica un poco más, para que el árbitro entienda.'; return; }
    try {
      m.className = 'mk-msg info'; m.textContent = 'Confirma en tu wallet…';
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.abrirDisputa(id, t.slice(0, 300))).wait();
      cerrar(); msg('Disputa abierta. Se revisará en un máximo de 48 horas.', 'ok'); _panelMisOps();
    } catch (e) { m.className = 'mk-msg err'; m.textContent = traducir(e); }
  };
}

/* Confirmación con explicación (nunca una acción grave a ciegas) */
export function confirmar({ titulo, texto, ok = 'Continuar', peligro = false }, alAceptar) {
  const d = document.createElement('div');
  d.className = 'mk-wiz-bg';
  d.innerHTML = `<div class="mk-wiz-c" style="max-width:400px">
    <div class="mk-wiz-t">${titulo}</div>
    <div class="mk-wiz-s">${texto}</div>
    <div class="mk-wiz-acts">
      <button class="mk-b gris" data-no>Volver</button>
      <button class="mk-b${peligro ? ' peligro' : ''}" data-si>${ok}</button>
    </div>
  </div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.querySelector('[data-no]').onclick = cerrar;
  d.querySelector('[data-si]').onclick = () => { cerrar(); alAceptar(); };
  d.onclick = (e) => { if (e.target === d) cerrar(); };
}

export function pedirEstrellas(id) {
  const cont = $('mk-cal-' + id); if (!cont) return;
  let sel = 0;
  cont.innerHTML = `<div class="mk-box" style="margin-top:11px"><div class="bt">¿Cómo te fue con esta persona?</div>
    <div class="mk-stars" id="mk-st-${id}">${[1,2,3,4,5].map(i => `<span class="mk-star" data-v="${i}">★</span>`).join('')}</div>
    <button class="mk-b" id="mk-envcal-${id}" disabled>Enviar calificación</button></div>`;
  const stars = cont.querySelectorAll('.mk-star');
  stars.forEach(s => s.onclick = () => {
    sel = Number(s.getAttribute('data-v'));
    stars.forEach(x => x.classList.toggle('on', Number(x.getAttribute('data-v')) <= sel));
    $('mk-envcal-' + id).disabled = false;
  });
  $('mk-envcal-' + id).onclick = async () => {
    try {
      msg('Confirma en tu wallet…', 'info');
      const c = new ethers.Contract(MARKET, ABI, await firmante());
      await (await c.calificar(id, sel)).wait();
      msg('¡Gracias! Calificación registrada.', 'ok'); _panelMisOps();
    } catch (e) { msg(traducir(e), 'err'); }
  };
}
