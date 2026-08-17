/* market/ubicacion.js — Geolocalización del Marketplace: guardar/leer la
   ubicación local, pedirla al navegador, distancia entre puntos, y
   compartir/ocultar la ubicación en el contrato. Usado por los paneles y
   los asistentes. Extraído de market.js. */

import * as ethers from '../vendor/ethers-6.13.4.min.js?v=125';
import * as wallet from '../wallet.js?v=125';
import { firmante, traducir } from './util.js?v=1';
import { msg, dialogo } from './ui.js?v=1';
import { MARKET, ABI } from './config.js?v=1';

let _panelVender = () => {};
export function initUbicacion({ panelVender }) { _panelVender = panelVender; }

const $ = (id) => document.getElementById(id);

const claveUbic = (a) => 'aurex-ubic:' + String(a).toLowerCase();
export function guardarUbic(a, lat, lon) { try { localStorage.setItem(claveUbic(a), JSON.stringify({ lat, lon, t: Date.now() })); } catch (_) {} }
export function leerUbic(a) { try { return JSON.parse(localStorage.getItem(claveUbic(a)) || 'null'); } catch (_) { return null; } }
export function kmEntre(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}
export function pedirUbicacion() {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error('sin geo'));
    navigator.geolocation.getCurrentPosition(
      (p) => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => rej(new Error(e && e.code === 2 ? 'sistema' : 'denegado')),
      { timeout: 12000, maximumAge: 600000 });
  });
}

export async function distanciaEn(contId, dir, u) {
  const cont = $(contId); if (!cont) return;
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { cont.innerHTML = `<div class="mk-hint">Conecta tu wallet.</div>`; return; }
  let mia = leerUbic(cuenta);
  if (!mia) {
    try { mia = await pedirUbicacion(); guardarUbic(cuenta, mia.lat, mia.lon); }
    catch (_) { cont.innerHTML = `<div class="mk-hint">Necesitas dar permiso de ubicación para ver la distancia.</div>`; return; }
  }
  const suya = { lat: Number(u.lat1e3) / 1000, lon: Number(u.lon1e3) / 1000 };
  cont.innerHTML = mapaHTML(mia, suya, kmEntre(mia, suya), u.zona);
}

export async function activarUbicacion() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) { msg('Conecta tu wallet.', 'err'); return; }

  // 1) Explicamos ANTES, con nuestra propia ventana
  const sigue = await dialogo({
    titulo: 'Compartir tu ubicación',
    texto: `Ahora tu navegador te va a preguntar si permites la ubicación. Es una ventana suya, no nuestra.<br><br>
      Guardamos tu posición <b>redondeada a 1 km aprox.</b>: sirve para mostrar tu zona y la distancia, <b>nunca tu dirección exacta</b>.
      Puedes quitarla cuando quieras.<br><br>
      Cuando salga el aviso del navegador, toca <b>"Permitir"</b>.`,
    ok: 'Entendido, continuar'
  });
  if (!sigue) return;

  msg('Esperando el permiso del navegador…', 'info');
  let u;
  try { u = await pedirUbicacion(); }
  catch (err) {
    const motivo = String(err && err.message || '');
    if (motivo === 'sistema') {
      await dialogo({ soloOk: true, ok: 'Entendido',
        titulo: 'La ubicación está apagada en tu equipo',
        texto: `El permiso lo diste bien, pero <b>tu sistema tiene la ubicación desactivada</b>.<br><br>
          <b>En Windows:</b> Configuración → Privacidad y seguridad → Ubicación → enciéndela y permite que las aplicaciones de escritorio la usen.<br>
          <b>En Android:</b> Ajustes → Ubicación → activar.<br>
          <b>En iPhone:</b> Ajustes → Privacidad → Localización → activar.<br><br>
          Después vuelve aquí y toca otra vez "Compartir mi ubicación".` });
    } else {
      await dialogo({ soloOk: true, ok: 'Entendido',
        titulo: 'No se pudo obtener tu ubicación',
        texto: `No diste permiso, o el navegador lo tiene bloqueado para este sitio.<br><br>
          Para permitirlo: toca el <b>candado 🔒</b> al lado de la dirección web, busca <b>Ubicación</b> y ponlo en <b>Permitir</b>. Luego recarga la página.<br><br>
          Compartir tu ubicación es <b>opcional</b>: puedes seguir vendiendo sin ella, aunque genera menos confianza.` });
    }
    msg('');
    return;
  }
  guardarUbic(cuenta, u.lat, u.lon);
  // redondeo a 3 decimales (~1 km): nunca la posición exacta
  const lat = Math.round(u.lat * 1000), lon = Math.round(u.lon * 1000);
  let zona = '';
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${u.lat}&lon=${u.lon}&zoom=10`, { headers: { 'Accept-Language': 'es' } });
    const j = await r.json();
    const a = j.address || {};
    zona = [a.city || a.town || a.village || a.county || a.state, a.country].filter(Boolean).join(', ').slice(0, 40);
  } catch (_) {}
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    await (await c.compartirUbicacion(lat, lon, zona)).wait();
    msg('Ubicación compartida. Ahora genera más confianza.', 'ok'); _panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

export async function quitarUbicacion() {
  try {
    msg('Confirma en tu wallet…', 'info');
    const c = new ethers.Contract(MARKET, ABI, await firmante());
    await (await c.ocultarUbicacion()).wait();
    msg('Ya no compartes tu ubicación.', 'ok'); _panelVender();
  } catch (e) { msg(traducir(e), 'err'); }
}

export async function compartirUbicacion() {
  const cuenta = wallet.cuentaActual && wallet.cuentaActual();
  if (!cuenta) return false;
  try { const u = await pedirUbicacion(); guardarUbic(cuenta, u.lat, u.lon); return true; } catch (_) { return false; }
}
