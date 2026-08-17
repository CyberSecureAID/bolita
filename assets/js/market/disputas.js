/* market/disputas.js — Panel de disputas para el árbitro: busca las órdenes
   en disputa, las lista con motivo y contactos, y da los botones para dar la
   razón a una parte o anular. Cablea las acciones con wireOps. Extraído de
   market.js. */

import { esc, f18, num, simbolo } from './util.js?v=1';
import { lee } from './contrato.js?v=1';
import { wireOps } from './operaciones.js?v=1';

const $ = (id) => document.getElementById(id);

async function buscarDisputas() {
  const total = Number(await lee('totalOrdenes'));
  const ids = []; for (let i = total; i >= 1; i--) ids.push(i);
  const ords = await Promise.all(ids.map(i => lee('ordenes', [i]).catch(() => null)));
  return ords.filter(o => o && Number(o.estado) === 4);
}
export async function contarDisputas() {
  const el = $('mk-nd');
  if (el) el.style.display = 'none';
  try {
    const d = await buscarDisputas();
    const n = (d && d.length) || 0;
    if (el && n > 0) { el.textContent = String(n); el.style.display = 'inline-grid'; }
    // El menú también lo señala: es donde vive ahora la sección.
    avisarDisputas(n);
  } catch (_) { if (el) el.style.display = 'none'; }
}
export async function panelDisputas() {
  const box = $('mk-p6'); if (!box) return;
  box.innerHTML = `<div class="tj-grid">${'<div class="tj-sk"></div>'.repeat(2)}</div>`;
  try {
    const ds = await buscarDisputas();
    if (ds.length === 0) { box.innerHTML = `<div class="mk-vacio">No hay disputas pendientes.<br>Todo tranquilo.</div>`; return; }
    const conNom = await Promise.all(ds.map(async (o) => {
      const [pv, pc] = await Promise.all([
        lee('perfiles', [o.vendedor]).catch(() => null),
        o.comprador && o.comprador !== '0x0000000000000000000000000000000000000000' ? lee('perfiles', [o.comprador]).catch(() => null) : null
      ]);
      return { o, pv, pc };
    }));
    box.innerHTML = `<div class="op-nota">Revisa el motivo y los comprobantes que te enviaron por el contacto antes de decidir. Si no resuelves en 48 horas, el sistema devuelve la cripto al vendedor solo.</div>` +
      conNom.map(({ o, pv, pc }) => {
        const sim = simbolo(o.token), monto = f18(o.monto), tramos = Number(o.tramos) || 1;
        return `<div class="op-card dis">
          <div class="op-cab"><span class="op-id">#${o.id}</span><span class="op-rol">${num(monto, 2)} ${sim} · ${Number(o.tramosHechos)}/${tramos} partes</span><span class="op-est dis">Disputa</span></div>
          <div class="op-exp"><b>Vendedor:</b> ${esc((pv && pv.nombre) || '—')} · ${esc((pv && pv.contacto) || 'sin contacto')}</div>
          <div class="op-exp"><b>Comprador:</b> ${esc((pc && pc.nombre) || '—')} · ${esc((pc && pc.contacto) || 'sin contacto')}</div>
          ${o.motivo ? `<div class="op-motivo"><span>Lo que dice quien abrió la disputa:</span>${esc(o.motivo)}</div>` : '<div class="mk-hint">No dejó explicación.</div>'}
          <div class="op-acts">
            <button class="op-b" data-res1="${o.id}">Razón al COMPRADOR</button>
            <button class="op-b gris" data-res0="${o.id}">Razón al VENDEDOR</button>
            <button class="op-b gris" data-anu="${o.id}">Anular · devolver todo</button>
          </div></div>`;
      }).join('');
    wireOps();
  } catch (e) { box.innerHTML = `<div class="mk-vacio">No se pudo cargar.</div>`; }
}

export function avisarDisputas(n) {
  const p2 = $('mk-menu-pt2');
  if (p2) { p2.textContent = n > 0 ? String(n) : ''; p2.classList.toggle('hay', n > 0); }
  const p = $('mk-menu-pt');
  if (p && n > 0) p.classList.add('on');
}
