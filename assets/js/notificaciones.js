/**
 * NOTIFICACIONES
 * ==============
 *
 * Avisos suaves cuando sale una tirada nueva. Dos capas:
 *
 *   1. Un aviso BONITO dentro de la propia página (una tarjeta que baja desde
 *      arriba, con efecto cristal). Siempre funciona, no pide permiso.
 *
 *   2. Si el usuario lo activa, una notificación del SISTEMA (la del móvil o
 *      el navegador). Esta sí pide permiso una vez.
 *
 * Pensado para cuando la página se convierta en app (PWA) para Android/iPhone:
 * la notificación del sistema usará el Service Worker si existe, y si no, cae
 * a la Notification API normal. El usuario manda: hay un interruptor para
 * encender o apagar, y su elección se recuerda.
 *
 * Sonido: por defecto NINGUNO. Si el usuario quiere, un "pin" muy suave. Nunca
 * suena sin permiso ni de forma molesta.
 */

const LS_ACTIVO = 'bolita.notif.activo';
const LS_SONIDO = 'bolita.notif.sonido';

let capaCreada = false;

/* ================================================================== */
/* Estado (recordado entre visitas)                                    */
/* ================================================================== */

export function notifActivas() {
  return localStorage.getItem(LS_ACTIVO) === '1';
}
export function notifConSonido() {
  return localStorage.getItem(LS_SONIDO) === '1';
}

/**
 * Enciende o apaga las notificaciones. Al encender por primera vez pide
 * permiso del sistema. Devuelve el estado final (true = activas).
 */
export async function activarNotif(activar, { sonido = null } = {}) {
  if (sonido !== null) {
    localStorage.setItem(LS_SONIDO, sonido ? '1' : '0');
  }

  if (!activar) {
    localStorage.setItem(LS_ACTIVO, '0');
    return false;
  }

  // Pedir permiso del sistema (si el navegador lo soporta)
  let permitido = true;
  if ('Notification' in window) {
    if (Notification.permission === 'default') {
      try { permitido = (await Notification.requestPermission()) === 'granted'; }
      catch { permitido = false; }
    } else {
      permitido = Notification.permission === 'granted';
    }
  }

  // Aunque el sistema deniegue, dejamos activo el aviso interno de la página.
  localStorage.setItem(LS_ACTIVO, '1');
  return true;
}

/* ================================================================== */
/* Lanzar un aviso                                                     */
/* ================================================================== */

/**
 * Muestra un aviso de tirada nueva. Siempre enseña la tarjeta interna; si el
 * usuario activó las del sistema y dio permiso, además dispara la del sistema.
 *
 * @param {{titulo:string, texto:string, fijo?:string}} datos
 */
export function avisarTirada({ titulo, texto, fijo = '' }) {
  if (!notifActivas()) return;

  mostrarCapa({ titulo, texto, fijo });

  if (notifConSonido()) pin();

  // Notificación del sistema (móvil/navegador)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const opciones = {
        body: texto,
        icon: 'assets/img/favicon.webp',
        badge: 'assets/img/favicon-32.png',
        silent: !notifConSonido(),
        tag: 'bolita-tirada'          // reemplaza la anterior, no acumula
      };
      // Si hay Service Worker (PWA), usarlo; si no, la API normal.
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.ready.then((reg) =>
          reg.showNotification(titulo, opciones)
        ).catch(() => new Notification(titulo, opciones));
      } else {
        new Notification(titulo, opciones);
      }
    } catch { /* si falla, ya quedó el aviso interno */ }
  }
}

/* ================================================================== */
/* Capa visual dentro de la página                                     */
/* ================================================================== */

function crearCapa() {
  if (capaCreada) return;
  const cont = document.createElement('div');
  cont.className = 'notif-capa';
  cont.id = 'notif-capa';
  document.body.appendChild(cont);
  capaCreada = true;
}

function mostrarCapa({ titulo, texto, fijo }) {
  crearCapa();
  const cont = document.getElementById('notif-capa');

  const card = document.createElement('div');
  card.className = 'notif';
  card.innerHTML = `
    ${fijo ? `<div class="notif-fijo"><span>${fijo}</span></div>` : ''}
    <div class="notif-txt">
      <div class="notif-t">${titulo}</div>
      <div class="notif-b">${texto}</div>
    </div>
    <button class="notif-x" aria-label="Cerrar">&times;</button>
  `;
  cont.appendChild(card);

  requestAnimationFrame(() => card.classList.add('entra'));

  const cerrar = () => {
    card.classList.remove('entra');
    card.classList.add('sale');
    setTimeout(() => card.remove(), 400);
  };
  card.querySelector('.notif-x').addEventListener('click', cerrar);
  setTimeout(cerrar, 7000);
}

/* ================================================================== */
/* Sonido "pin" suave (opcional)                                       */
/* ================================================================== */

function pin() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.42);
    o.onended = () => ctx.close();
  } catch { /* sin sonido si el navegador no deja */ }
}
