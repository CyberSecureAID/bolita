/* market/guia.js — La guía "¿Cómo funciona?" del Marketplace: tarjetas paso
   a paso que explican el flujo con garantía (escrow). Extraído de market.js. */

import { num } from './util.js?v=1';
import { CF_PASOS } from './config.js?v=1';

const $ = (id) => document.getElementById(id);

export function comoFunciona() {
  return `<div id="cf-zona">${cfTarjeta(0)}</div>`;
}

function cfTarjeta(i) {
  const p = CF_PASOS[i];
  const ultimo = i === CF_PASOS.length - 1;
  return `
  <div class="cf-card">
    <div class="cf-num">${i + 1} de ${CF_PASOS.length}</div>
    <div class="cf-t">${p[0]}</div>
    <div class="cf-d">${p[1]}</div>
    <div class="cf-puntos">${CF_PASOS.map((_, k) => `<span class="${k === i ? 'on' : ''}"></span>`).join('')}</div>
    <div class="cf-acts">
      ${i > 0 ? `<button class="cf-b gris" id="cf-atras">Atrás</button>` : ''}
      ${ultimo
        ? `<button class="cf-b" id="mk-ir-vender">Quiero vender</button>`
        : `<button class="cf-b" id="cf-mas"><span class="tx-l">Saber más</span><span class="tx-s">Más</span></button>`}
    </div>
  </div>`;
}

/** Cambia de tarjeta sin recargar toda la pestaña. */
function cfPintar(i) {
  _cfPaso = Math.max(0, Math.min(CF_PASOS.length - 1, i));
  const z = document.getElementById('cf-zona');
  if (!z) return;
  z.innerHTML = cfTarjeta(_cfPaso);
  const mas = document.getElementById('cf-mas');
  if (mas) mas.onclick = () => cfPintar(_cfPaso + 1);
  const atr = document.getElementById('cf-atras');
  if (atr) atr.onclick = () => cfPintar(_cfPaso - 1);
  const vnd = document.getElementById('mk-ir-vender');
  if (vnd) vnd.onclick = () => { const t = document.getElementById('mk-t2'); if (t) t.click(); };
}
