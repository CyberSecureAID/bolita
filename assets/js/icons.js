/**
 * ICONOS
 * ======
 *
 * SVG en línea, sin librerías ni fuentes de iconos. Sustituyen a los emojis:
 * los emojis cambian de dibujo según el sistema operativo, no se pueden pintar
 * del color de la marca y le quitan seriedad a una página que mueve dinero.
 *
 * Todos heredan el color del texto (`currentColor`) y el tamaño se controla
 * con CSS, así que sirven en cualquier sitio sin tocarlos.
 */

const svg = (contenido, { size = 20, fill = false } = {}) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" ` +
  `fill="${fill ? 'currentColor' : 'none'}" stroke="${fill ? 'none' : 'currentColor'}" ` +
  `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${contenido}</svg>`;

export const ICONOS = {
  /** Desconectar — símbolo universal de encendido */
  power: (s) => svg('<path d="M12 3v9"/><path d="M18.4 6.6a9 9 0 1 1-12.8 0"/>', { size: s }),

  /** Modelo económico — gráfico de barras */
  grafico: (s) => svg('<path d="M3 21h18"/><rect x="5" y="12" width="3.5" height="6" rx="1"/><rect x="10.2" y="7" width="3.5" height="11" rx="1"/><rect x="15.5" y="3.5" width="3.5" height="14.5" rx="1"/>', { size: s }),

  /** Reglas — documento con líneas */
  reglas: (s) => svg('<path d="M6 2.5h8.5L19 7v14.5H6z"/><path d="M14 2.5V7h5"/><path d="M9 12h7M9 15.5h7M9 8.5h2.5"/>', { size: s }),

  /** Tabla de pagos — monedas apiladas */
  pagos: (s) => svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v5c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 11v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>', { size: s }),

  /** Tirada de mediodía */
  sol: (s) => svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>', { size: s }),

  /** Tirada de noche */
  luna: (s) => svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>', { size: s }),

  /** Reloj de la cuenta atrás */
  reloj: (s) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 2"/>', { size: s }),

  /** Wallet */
  wallet: (s) => svg('<path d="M3 8.5A2.5 2.5 0 0 1 5.5 6H18v2.5"/><rect x="3" y="8.5" width="18" height="11.5" rx="2.5"/><circle cx="16.5" cy="14.2" r="1.3" fill="currentColor" stroke="none"/>', { size: s }),

  /** Desplegar la charada */
  chevron: (s) => svg('<path d="M6 9.5l6 6 6-6"/>', { size: s }),

  /** Marca de verificado */
  check: (s) => svg('<path d="M4.5 12.5l5 5 10-11"/>', { size: s }),

  /** Quitar una selección */
  cerrar: (s) => svg('<path d="M6 6l12 12M18 6L6 18"/>', { size: s }),

  /** Fijar importe a mano */
  lapiz: (s) => svg('<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z"/><path d="M13.5 6.5l4 4"/>', { size: s }),

  /** Bola del bombo */
  bola: (s) => svg('<circle cx="12" cy="12" r="8.5"/><path d="M8.2 7.4a6 6 0 0 1 3-1.6" opacity=".6"/>', { size: s })
};

/** Inserta un icono dentro de un elemento. */
export function ponerIcono(el, nombre, size = 20) {
  if (!el || !ICONOS[nombre]) return;
  el.innerHTML = ICONOS[nombre](size);
}
