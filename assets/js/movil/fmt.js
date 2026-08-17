/* movil/fmt.js — Formato uniforme, compacto y legible para toda la app móvil. */

/* Valor monetario en USD: 2 decimales; muy pequeños como "<$0.01". */
export function money(v) {
  v = Number(v);
  if (!isFinite(v)) return '$0.00';
  if (v === 0) return '$0.00';
  if (v > 0 && v < 0.01) return '<$0.01';
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* Igual que money pero sin el símbolo $ (para "≈ 11.03"). */
export function money0(v) { return money(v).replace('$', ''); }

/* Cantidad de tokens: compacta. Grandes → B/M/K; normales → 2 dec; muy
   pequeñas → hasta 4-6 dígitos significativos sin colas interminables. */
export function cantidad(v) {
  v = Number(v);
  if (!isFinite(v) || v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'B';
  if (a >= 1e6) return (v / 1e6).toLocaleString('en-US', { maximumFractionDigits: 2 }) + 'M';
  if (a >= 1e3) return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (a >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a >= 0.01) return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString('en-US', { maximumFractionDigits: 6 });
}

/* Precio de mercado (para listas/gráficas): compacto según magnitud. */
export function precio(p) {
  p = Number(p);
  if (!isFinite(p)) return '';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 0.01) return p.toLocaleString('en-US', { maximumFractionDigits: 4 });
  return p.toLocaleString('en-US', { maximumFractionDigits: 8 });
}
