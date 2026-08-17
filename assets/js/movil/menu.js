/* movil/menu.js — Menú "Todos los servicios". Garantiza que NADA de la web
   quede oculto en el móvil: aquí está cada sección accesible. */

import { IC } from './iconos.js?v=1';

const GRUPOS = [
  { sub: 'Operar', items: [
    { k: 'bots', ic: 'bot', t: 'Bots' },
    { k: 'swap', ic: 'swap', t: 'Swap' },
    { k: 'market', ic: 'market', t: 'Marketplace' },
    { k: 'niveles', ic: 'chart', t: 'Smart Levels' },
  ]},
  { sub: 'Gráficas de análisis', items: [
    { k: 'liquidity', ic: 'pool', t: 'Liquidity Pools' },
    { k: 'muros', ic: 'candles', t: 'Radar Institucional' },
    { k: 'niveles', ic: 'chart', t: 'Smart Levels' },
  ]},
  { sub: 'Más', items: [
    { k: 'tools', ic: 'tools', t: 'Herramientas' },
    { k: 'academy', ic: 'book', t: 'Academia' },
    { k: 'prize', ic: 'trophy', t: 'Prize Pool' },
    { k: 'perfil', ic: 'user', t: 'Perfil' },
    { k: 'idioma', ic: 'transfer', t: 'Idioma' },
    { k: 'instalar', ic: 'arrowDown', t: 'Instalar app' },
    { k: 'soporte', ic: 'support', t: 'Soporte' },
  ]},
];

export function abrirMenu(api) {
  let m = document.getElementById('mv-menu');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'mv-menu';
  m.innerHTML = `
    <div class="mv-menu-bg"></div>
    <div class="mv-menu-card">
      <div class="mv-menu-h"><b>Todos los servicios</b><button aria-label="Cerrar">✕</button></div>
      ${GRUPOS.map((g) => `
        <div class="mv-menu-sub">${g.sub}</div>
        <div class="mv-menu-grid">
          ${g.items.map((it) => `
            <button class="mv-mg-i" data-k="${it.k}">
              <span class="mv-mg-box">${IC[it.ic] || ''}</span>
              <span>${it.t}</span>
            </button>`).join('')}
        </div>`).join('')}
    </div>`;
  document.body.appendChild(m);
  const cerrar = () => m.remove();
  m.querySelector('.mv-menu-bg').onclick = cerrar;
  m.querySelector('.mv-menu-h button').onclick = cerrar;
  m.querySelectorAll('.mv-mg-i').forEach((b) => { b.onclick = () => { cerrar(); api.abrir(b.getAttribute('data-k')); }; });
}
