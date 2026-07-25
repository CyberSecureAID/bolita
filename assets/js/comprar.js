/**
 * COMPRAR CRIPTO — ventana tipo exchange
 * ======================================
 * Interfaz con pestañas (tarjeta / cambiar / Cuba). En "cambiar" muestra las
 * monedas en grid ordenado con su enlace. Para monedas con comisión (Baby Doge)
 * muestra un aviso honesto antes de salir a comprar.
 */

import { MONEDAS, COMPRAR_URL } from './tokens.js';
import { logoDe } from './prices.js';

const ORDEN = ['BNB', 'USDT', 'USDC', 'BTCB', 'ETH', 'USDTZ', 'BABYDOGE', 'EXT'];

// Descripción corta por moneda (la RED o el tipo, no el nombre repetido)
const SUBTITULO = {
  BNB: 'Nativa · BSC',
  USDT: 'Estable · BSC',
  USDC: 'Estable · BSC',
  BTCB: 'Bitcoin · BSC',
  ETH: 'Ethereum · BSC',
  USDTZ: 'Estable · BSC',
  BABYDOGE: 'Meme · BSC',
  EXT: 'Token · BSC'
};

export function pintarCompra() {
  const cont = document.getElementById('monedas-compra');
  if (cont) {
    cont.innerHTML = ORDEN.map((id) => {
      const m = MONEDAS[id];
      if (!m) return '';
      const url = COMPRAR_URL[id] || '#';
      const logo = logoDe(id);
      const logoHtml = logo
        ? `<img class="exm-logo" src="${logo}" alt="${m.simbolo}" loading="lazy">`
        : `<span class="exm-logo exm-logo-txt" style="background:${m.color}22;color:${m.color}">${m.icono}</span>`;

      const fee = m.comisionPct
        ? `<span class="exm-fee">${m.comisionPct}%</span>`
        : '';

      return `
        <a class="exm-card" href="${url}" target="_blank" rel="noopener noreferrer" data-id="${id}">
          ${logoHtml}
          <span class="exm-nombre">${m.simbolo}</span>
          <span class="exm-sub">${SUBTITULO[id] || 'BSC'}</span>
          ${fee}
          <span class="exm-go">Comprar</span>
        </a>`;
    }).join('');

    cont.querySelectorAll('.exm-card').forEach((card) => {
      const m = MONEDAS[card.dataset.id];
      if (m && m.comisionPct) {
        card.addEventListener('click', (e) => {
          e.preventDefault();
          abrirAvisoComision(m, card.href);
        });
      }
    });
  }

  conectarModalCompra();
  conectarPestanas();
}

function conectarModalCompra() {
  const navBtn = document.getElementById('nav-comprar');
  const modal = document.getElementById('m-comprar');
  if (!navBtn || !modal) return;

  navBtn.addEventListener('click', (e) => {
    e.preventDefault();
    modal.classList.add('open');
  });
  const cerrar = () => modal.classList.remove('open');
  modal.querySelectorAll('.modal-close').forEach((b) => b.addEventListener('click', cerrar));
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}

function conectarPestanas() {
  const tabs = document.getElementById('ex-tabs');
  const modal = document.getElementById('m-comprar');
  if (!tabs || !modal) return;

  tabs.querySelectorAll('.ex-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const destino = tab.dataset.tab;
      tabs.querySelectorAll('.ex-tab').forEach((t) => t.classList.toggle('on', t === tab));
      modal.querySelectorAll('.ex-panel').forEach((p) => {
        p.classList.toggle('on', p.dataset.panel === destino);
      });
    });
  });
}

export function abrirAvisoComision(moneda, url) {
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
        No es una comisión nuestra. No cobramos por esto ni recibimos nada de
        esa comisión. Te lo avisamos para que lo sepas de antemano.
      </p>
      <p>
        En la práctica: al jugar o enviar ${moneda.simbolo}, llegará un
        ${moneda.comisionPct}% menos de lo que mandes, y lo mismo al cobrar. Si
        prefieres evitarlo, juega con otra moneda sin comisión, como USDT o BNB.
      </p>
      <div class="comision-btns">
        <button class="modal-close" type="button">Entendido</button>
        <a class="comision-ir" href="${url}" target="_blank" rel="noopener noreferrer">Conseguir ${moneda.simbolo} igual &#8599;</a>
      </div>
    </div>`;

  modal.classList.add('open');
  const cerrar = () => modal.classList.remove('open');
  modal.querySelector('.modal-close').addEventListener('click', cerrar);
  modal.querySelector('.comision-ir').addEventListener('click', cerrar);
  modal.addEventListener('click', (e) => { if (e.target === modal) cerrar(); });
}
