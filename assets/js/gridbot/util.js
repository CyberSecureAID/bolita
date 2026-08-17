/* gridbot/util.js — Utilidades compartidas de la app de bots: formateo
   (num, fmtPrecioUSD), escape (escT), detección de móvil, traducción de
   errores a lenguaje llano (enCristiano) y el sistema de modales
   (busy/error). Extraído de gridbot-ui.js sin cambiar la lógica. */

import { MONEDAS } from '../tokens.js?v=125';
import { LOGOS } from './estado.js?v=1';

const $ = (id) => document.getElementById(id);

export const moneda = (id) => MONEDAS[id];
export function num(n, d = 4) { return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d }) : '—'; }

export const _movil = () => window.matchMedia('(max-width: 760px)').matches;
export const tipoNum = () => (_movil() ? 'text' : 'number');

export const escT = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function enCristiano(e) {
  const crudo = String(e?.shortMessage || e?.reason || e?.message || e || '');
  // Los fallos de WalletConnect los mostramos tal cual: hacen falta para
  // saber qué pasa, y el usuario puede contárnoslo.
  if (/^WC_/.test(crudo)) return crudo;
  const t = crudo.toLowerCase();
  if (t.includes('user rejected') || t.includes('denied') || t.includes('rechaz')) return 'Cancelaste la operación en tu wallet.';
  if (t.includes('insufficient funds')) return 'No te alcanza el BNB para pagar la comisión de red.';
  if (t.includes('transfer amount exceeds balance') || t.includes('exceeds balance')) return 'No tienes suficiente saldo de esa moneda.';
  if (t.includes('allowance') || t.includes('approve')) return 'Falta dar permiso a la moneda. Inténtalo otra vez.';
  if (t.includes('no_wallet')) return 'No encontramos ninguna wallet. Instala MetaMask o abre esta página desde tu wallet.';
  if (t.includes('sin_cuentas')) return 'Tu wallet no dio acceso a ninguna cuenta.';
  if (t.includes('nonce') || t.includes('replacement')) return 'Tienes otra operación en marcha. Espera a que termine.';
  if (t.includes('network') || t.includes('rpc') || t.includes('timeout') || t.includes('fetch')) return 'La red va lenta ahora mismo. Prueba de nuevo en un momento.';
  if (t.includes('chain') || t.includes('red incorrecta')) return 'Cambia tu wallet a la red BNB Smart Chain.';
  if (t.includes('gas required exceeds') || t.includes('gas limit')) return 'La operación no cabe. Prueba con una cantidad menor.';
  if (t.includes('revert')) return 'El sistema no aceptó la operación. Revisa los datos e inténtalo otra vez.';
  return 'No se pudo completar. Inténtalo de nuevo en un momento.';
}

export function fmtPrecioUSD(p) {
  if (p == null || !isFinite(p)) return '—';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 0.01) return '$' + p.toFixed(4);
  if (p >= 0.0001) return '$' + p.toFixed(6);
  return '$' + Number(p.toPrecision(2)).toString();
}

/* ── Sistema de modales (busy / error) ── */
export function limpiarBusy() { if (window._busyTimer) { clearInterval(window._busyTimer); window._busyTimer = null; } }
export function modalBusy(txt) {
  const m = $('colmena-modal'); if (!m) return;
  $('cm-body').innerHTML = `<div class="busy-wrap"><div class="busy-tx" id="busy-tx">${txt}</div><div class="busy-ring"><svg viewBox="0 0 44 44"><circle class="br-bg" cx="22" cy="22" r="19"/><circle class="br-fg" cx="22" cy="22" r="19"/></svg><span class="busy-num" id="busy-num">1</span></div></div>`;
  m.querySelector('.m-btns').style.display = 'none'; m.onclick = null; m.classList.add('show');
  limpiarBusy();
  let n = 1;
  window._busyTimer = setInterval(() => {
    const el = $('busy-num'); if (!el) { limpiarBusy(); return; }
    if (n < 99) n++; el.textContent = n;
  }, 2500);
}
export function modalBusyTexto(txt) { const el = $('busy-tx'); if (el) el.innerHTML = txt; }
window._onTxProcesando = function () { const el = document.getElementById('busy-tx'); if (el) el.innerHTML = 'Procesando en la red… <span style="opacity:.6">ya casi</span>'; };
export function modalError(txt) {
  const m = $('colmena-modal'); if (!m) return;
  limpiarBusy(); $('cm-title').textContent = 'No se pudo completar'; $('cm-body').textContent = txt;
  const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
  $('cm-cancel').style.display = 'none'; const ok = $('cm-ok');
  ok.textContent = 'Entendido'; ok.className = 'btn btn-linea'; ok.onclick = () => m.classList.remove('show');
}
export function modalClose() { limpiarBusy(); const m = $('colmena-modal'); if (m) m.classList.remove('show'); }

/* Icono de una moneda: letra de respaldo + logo (si CoinGecko lo cargó). */
export function icoInner(mo) {
  const letra = mo.icono || (mo.simbolo || '?')[0];
  const L = LOGOS[mo.id];
  return `<span class="ico-fb">${letra}</span>` + (L && L.img ? `<img src="${L.img}" alt="" onload="this.parentElement.classList.add('conlogo')" onerror="this.style.display='none'">` : '');
}
