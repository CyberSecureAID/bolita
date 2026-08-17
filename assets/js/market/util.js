/* market/util.js — Helpers compartidos del Marketplace: firmante, escape,
   formateo de números y fechas, símbolo de token y traducción de errores
   a lenguaje llano. Extraído de market.js sin cambiar la lógica. */

import * as ethers from '../vendor/ethers-6.13.4.min.js?v=125';
import { TOKENS } from './config.js?v=1';

export async function firmante() { return new ethers.BrowserProvider(window.ethereum).getSigner(); }
export const esc = (s) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));
export const f18 = (v) => Number(ethers.formatUnits(v, 18));
export const num = (n, d = 2) => Number(n).toLocaleString('es', { minimumFractionDigits: d, maximumFractionDigits: d });
export const simbolo = (t) => TOKENS[String(t).toLowerCase()] || 'Token';

/** Números grandes en corto: 1.170.000 → 1,17 M · 2.300.000.000 → 2,3 MM */
export function corto(n) {
  const x = Number(n) || 0;
  if (x >= 1e9) return num(x / 1e9, 2) + ' MM';
  if (x >= 1e6) return num(x / 1e6, 2) + ' M';
  if (x >= 1e5) return num(x, 0);
  return num(x, x >= 1000 ? 0 : 2);
}

export function traducir(e) {
  const s = (e && (e.reason || e.shortMessage || e.message) || '').toLowerCase();
  if (s.includes('user rejected') || s.includes('denied')) return 'Cancelaste la operación.';
  if (s.includes('transfer amount exceeds balance') || s.includes('exceeds balance')) return 'No tienes suficiente saldo de ese token en tu wallet.';
  if (s.includes('comisioninsuficiente')) return 'Falta BNB para la comisión. Necesitas aprox. 0.002 BNB.';
  if (s.includes('tokennopermitido')) return 'Ese token todavía no está habilitado.';
  if (s.includes('tramosinvalidos')) return 'Las partes deben estar entre 2 y 10.';
  if (s.includes('textolargo')) return 'Algún texto es demasiado largo. Marca menos opciones.';
  if (s.includes('exceeds allowance') || s.includes('allowance')) return 'Falta aprobar el token. Intenta de nuevo.';
  if (s.includes('sinfianza')) return 'Necesitas depositar la fianza para poder vender.';
  if (s.includes('limitereputacion')) return 'Ese monto supera tu límite. Completa más ventas para subirlo.';
  if (s.includes('montoinvalido')) return 'El monto debe dividirse exacto entre los tramos.';
  if (s.includes('nombrevacio')) return 'Primero crea tu perfil.';
  if (s.includes('insufficient')) return 'Saldo insuficiente.';
  if (s.includes('tramonopagado')) return 'El comprador aún no marcó el pago.';
  if (s.includes('aunnovence')) return 'Todavía no se cumple el plazo.';
  return 'No se pudo completar. Intenta de nuevo.';
}

export const fechaExacta = (seg) => {
  const t = Number(seg) * 1000;
  return t && isFinite(t) ? new Date(t).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};
