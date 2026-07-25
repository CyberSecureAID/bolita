/**
 * COMPRAR CRIPTO
 * ==============
 * Pinta las tarjetas de compra de cada moneda que aceptamos, con su enlace a
 * una plataforma segura. Para monedas con comisión (Baby Doge), muestra un
 * aviso honesto y elegante explicando que la comisión es del token, no nuestra.
 */

import { MONEDAS, COMPRAR_URL } from './tokens.js';
import { logoDe } from './prices.js';

const ORDEN = ['BNB', 'USDT', 'USDC', 'BTCB', 'ETH', 'USDTZ', 'BABYDOGE', 'EXT'];

export function pintarCompra() {
  const cont = document.getElementById('monedas-compra');
  if (!cont) return;

  cont.innerHTML = ORDEN.map((id) => {
    const m = MONEDAS[id];
    if (!m) return '';
    const url = COMPRAR_URL[id] || '#';
    const logo = logoDe(id);
    const logoHtml = logo
      ? `<img class="mc-logo" src="${logo}" alt="${m.simbolo}" loading="lazy">`
      : `<span class="mc-logo mc-logo-txt" style="background:${m.color}22;color:${m.color}">${m.icono}</span>`;

    const aviso = m.comisionPct
      ? `<span class="mc-fee">${m.comisionPct}% comisión</span>`
      : '';

    return `
      <a class="mc-card" href="${url}" target="_blank" rel="noopener noreferrer" data-id="${id}">
        ${logoHtml}
        <span class="mc-txt">
          <span class="mc-nombre">${m.simbolo}</span>
          <span class="mc-sub">${m.nombre}</span>
        </span>
        ${aviso}
        <span class="mc-flecha">↗</span>
      </a>`;
  }).join('');

  // Aviso de comisión: al pulsar una moneda con comisión, mostrar el modal
  // antes de salir a comprar.
  cont.querySelectorAll('.mc-card').forEach((card) => {
    const id = card.dataset.id;
    const m = MONEDAS[id];
    if (m && m.comisionPct) {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        abrirAvisoComision(m, card.href);
      });
    }
  });

  // El enlace "Comprar cripto" del menú abre la ventana emergente.
  const navBtn = document.getElementById('nav-comprar');
  const modal = document.getElementById('m-comprar');
  if (navBtn && modal) {
    navBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('open');
    });
    const cerrar = () => modal.classList.remove('open');
    modal.querySelector('.modal-close')?.addEventListener('click', cerrar);
    modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
  }
}

/**
 * Modal elegante (no rojo, no feo) que explica la comisión del token antes de
 * ir a comprarlo o jugarlo. Honesto y tranquilizador.
 */
export function abrirAvisoComision(moneda, url) {
  // Reusar uno si existe
  let modal = document.getElementById('m-comision');
  if (!modal) {
    modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'm-comision';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-box comision-box">
      <div class="comision-ic">🪙</div>
      <h3>${moneda.simbolo} tiene una comisión propia</h3>
      <p class="sub">un detalle del token, no nuestro</p>
      <p>
        <strong>${moneda.nombre}</strong> cobra alrededor de un
        <strong>${moneda.comisionPct}%</strong> en cada envío. Esto viene de
        cómo fue creada la moneda: una parte se reparte entre quienes la tienen
        y otra va a su liquidez.
      </p>
      <p class="comision-clave">
        No es una comisión nuestra. Nosotros no cobramos por esto ni recibimos
        nada de esa comisión. Te lo avisamos para que lo sepas de antemano y
        nadie piense que hay algo raro.
      </p>
      <p>
        En la práctica: si juegas o envías ${moneda.simbolo}, llegará un
        ${moneda.comisionPct}% menos de lo que mandes, y al cobrar un premio
        pasará lo mismo. Si prefieres evitarlo, puedes jugar con otra moneda
        sin comisión, como USDT o BNB.
      </p>
      <div class="comision-btns">
        <button class="modal-close" type="button">Entendido</button>
        <a class="comision-ir" href="${url}" target="_blank" rel="noopener noreferrer">Conseguir ${moneda.simbolo} igualmente ↗</a>
      </div>
    </div>`;

  modal.classList.add('open');

  const cerrar = () => modal.classList.remove('open');
  modal.querySelector('.modal-close').addEventListener('click', cerrar);
  modal.querySelector('.comision-ir').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}
