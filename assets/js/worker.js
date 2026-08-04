/**
 * BOLITA — WORKER DEL OWNER  (apertura y resolución automática)
 * ============================================================
 *
 * Este Worker de Cloudflare hace, SOLO y sin intervención humana, las dos
 * tareas del owner que la web no puede hacer:
 *
 *   1. ABRIR la tirada del próximo sorteo (antes de que cierre).
 *   2. RESOLVER la tirada ya celebrada, con los números reales de Florida
 *      leídos del Worker `bolita-florida`.
 *
 * Se dispara solo con un cron (ver wrangler.toml). No expone la llave: la
 * llave del owner vive en un "secret" cifrado de Cloudflare (OWNER_PRIVATE_KEY),
 * nunca en este código ni en la web.
 *
 * ── SEGURIDAD ──────────────────────────────────────────────────────────
 * Quien controle este Worker controla la resolución. Por eso:
 *   - La llave va SIEMPRE como secret (wrangler secret put OWNER_PRIVATE_KEY).
 *   - Usa una wallet de owner dedicada, con solo el gas necesario (BNB).
 *   - No publiques la URL del Worker ni le pongas rutas abiertas.
 * ───────────────────────────────────────────────────────────────────────
 *
 * Requiere la librería `ethers` (v6). Con Wrangler + npm se empaqueta sola:
 *   npm i ethers
 */

import { ethers } from 'ethers';

/* ================================================================== */
/* Configuración fija                                                  */
/* ================================================================== */

const CONTRATO   = '0x964a68D3A2dB18c723581410C49aa8789048E1B9';
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://bsc-rpc.publicnode.com',
  'https://1rpc.io/bnb'
];
const FLORIDA_URL = 'https://bolita-florida.yamicelanvivesqui.workers.dev';
const ZONA       = 'America/New_York';

// Sorteos de Florida (hora local de Florida). Cierre = 30 min antes.
const SORTEOS = [
  { turno: 'dia',   sufijo: 1, h: 13, m: 30 },
  { turno: 'noche', sufijo: 2, h: 21, m: 45 }
];
const CIERRE_MIN = 30;

// Solo las funciones que este Worker necesita del contrato.
const ABI = [
  'function abrirTirada(uint256 id, uint64 cierre) external',
  'function resolverTirada(uint256 id, uint8 fijo, uint8 corrido1, uint8 corrido2) external',
  'function tiradas(uint256) view returns (bool existe, bool resuelta, uint64 cierre, uint8 fijo, uint8 terminal, uint8 corrido1, uint8 corrido2, bool cancelada)'
];

/* ================================================================== */
/* Utilidades de fecha en hora de Florida                              */
/* ================================================================== */

/** Partes de fecha (Y,M,D,h,m) de un instante, en hora de Florida. */
function partesFlorida(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).formatToParts(date);
  const g = (t) => f.find((p) => p.type === t).value;
  return { y: +g('year'), mo: +g('month'), d: +g('day'), h: +g('hour'), mi: +g('minute') };
}

/** id de tirada: AAAAMMDD * 10 + sufijo (1 mediodía, 2 noche), hora Florida. */
function idTirada(y, mo, d, sufijo) {
  return Number(`${y}${String(mo).padStart(2,'0')}${String(d).padStart(2,'0')}`) * 10 + sufijo;
}

/**
 * Instante UTC (segundos) del sorteo (o de un h:m dado) para una fecha de
 * Florida. Calcula el offset real de la zona ese día (maneja horario de verano).
 */
function tsFlorida(y, mo, d, h, m) {
  // Construimos un Date "como si" fuera UTC y medimos el desfase real de la zona.
  const comoUTC = Date.UTC(y, mo - 1, d, h, m, 0);
  const enZona = new Date(comoUTC).toLocaleString('en-US', { timeZone: ZONA });
  const desfase = comoUTC - new Date(enZona).getTime();
  return Math.floor((comoUTC + desfase) / 1000);
}

/* ================================================================== */
/* Lectura de Florida                                                  */
/* ================================================================== */

/** fijo y corridos con la MISMA lógica que florida.js de la web. */
function leer(pick3, pick4) {
  const dd = (a, b) => Number(`${a}${b}`);
  const fijo = dd(pick3[1], pick3[2]);                 // dos últimos del Pick 3
  const corridos = (pick4 && pick4.length >= 4)
    ? [dd(pick4[0], pick4[1]), dd(pick4[2], pick4[3])]  // dos pares del Pick 4
    : [dd(pick3[0], pick3[1])];
  return { fijo, corrido1: corridos[0], corrido2: corridos[1] ?? corridos[0] };
}

/** Devuelve el draw de Florida para un turno ('dia'|'noche') y fecha MM/DD/AAAA. */
async function drawDeFlorida(turno, fechaUS) {
  const res = await fetch(FLORIDA_URL, { cf: { cacheTtl: 0 } });
  const j = await res.json();
  if (!j?.ok || !Array.isArray(j.draws)) return null;

  const timeBuscado = turno === 'noche' ? 'evening' : 'midday';
  const d = j.draws.find((x) => x.time === timeBuscado && x.date === fechaUS);
  if (!d || !Array.isArray(d.pick3)) return null;
  return leer(d.pick3, d.pick4);
}

/* ================================================================== */
/* Tareas                                                              */
/* ================================================================== */

/** Devuelve el primer RPC que responde (si uno se cae, prueba el siguiente). */
async function getProvider() {
  for (const url of RPCS) {
    try {
      const p = new ethers.JsonRpcProvider(url, 56, { staticNetwork: true });
      await p.getBlockNumber();
      return p;
    } catch (_) { /* prueba el siguiente */ }
  }
  throw new Error('ningún RPC disponible');
}

async function contratoConFirma(env) {
  const provider = await getProvider();
  const wallet = new ethers.Wallet(env.OWNER_PRIVATE_KEY, provider);
  return new ethers.Contract(CONTRATO, ABI, wallet);
}

/**
 * ABRIR: para cada sorteo de HOY cuyo cierre aún no pasó, si no existe la
 * tirada, la abre con su cierre correcto.
 */
async function abrirPendientes(env, log) {
  const c = await contratoConFirma(env);
  const { y, mo, d } = partesFlorida();
  const ahora = Math.floor(Date.now() / 1000);

  for (const s of SORTEOS) {
    const id = idTirada(y, mo, d, s.sufijo);
    const tsSorteo = tsFlorida(y, mo, d, s.h, s.m);
    const cierre = tsSorteo - CIERRE_MIN * 60;

    if (ahora >= cierre) { log.push(`abrir ${id}: ya cerró, salto`); continue; }

    const t = await c.tiradas(id);
    if (t.existe) { log.push(`abrir ${id}: ya existe, salto`); continue; }

    const tx = await c.abrirTirada(id, cierre);
    await tx.wait();
    log.push(`abrir ${id}: ABIERTA (cierre ${cierre}) tx ${tx.hash}`);
  }
}

/**
 * RESOLVER: para cada sorteo cuya hora ya pasó (hoy), si la tirada existe,
 * no está resuelta ni cancelada, y Florida ya publicó, la resuelve.
 */
/** Resuelve UNA tirada (turno s, fecha dada) si procede. No lanza si ya está lista. */
async function resolverUno(c, fecha, s, log) {
  const { y, mo, d } = fecha;
  const id = idTirada(y, mo, d, s.sufijo);
  const ahora = Math.floor(Date.now() / 1000);
  const tsSorteo = tsFlorida(y, mo, d, s.h, s.m);
  if (ahora < tsSorteo) { log.push(`resolver ${id}: aún no es la hora`); return; }

  const t = await c.tiradas(id);
  if (!t.existe)   { log.push(`resolver ${id}: no existe, salto`); return; }
  if (t.resuelta)  { log.push(`resolver ${id}: ya resuelta, salto`); return; }
  if (t.cancelada) { log.push(`resolver ${id}: cancelada, salto`); return; }

  const fechaUS = `${String(mo).padStart(2,'0')}/${String(d).padStart(2,'0')}/${y}`;
  const nums = await drawDeFlorida(s.turno, fechaUS);
  if (!nums) { log.push(`resolver ${id}: Florida aún no publicó, reintento luego`); return; }

  const tx = await c.resolverTirada(id, nums.fijo, nums.corrido1, nums.corrido2);
  await tx.wait();
  log.push(`resolver ${id}: RESUELTA fijo ${nums.fijo} corridos ${nums.corrido1}/${nums.corrido2} tx ${tx.hash}`);
}

async function resolverPendientes(env, log) {
  const c = await contratoConFirma(env);
  const hoy = partesFlorida();
  const ayer = partesFlorida(new Date(Date.now() - 24 * 3600 * 1000));

  // Hoy: ambos sorteos. Ayer: solo la noche (por si publicó tarde o el worker
  // estuvo caído y ya cruzó medianoche de Florida).
  for (const s of SORTEOS) await resolverUno(c, hoy, s, log);
  const noche = SORTEOS.find((s) => s.turno === 'noche');
  if (noche) await resolverUno(c, ayer, noche, log);
}

/* ================================================================== */
/* Entradas: cron (scheduled) y un GET manual protegido               */
/* ================================================================== */

export default {
  // Se dispara con el cron de wrangler.toml
  async scheduled(event, env, ctx) {
    const log = [];
    try {
      await abrirPendientes(env, log);
      await resolverPendientes(env, log);
    } catch (e) {
      log.push('ERROR: ' + (e?.message || e));
    }
    console.log(log.join('\n'));
  },

  // Disparo manual opcional para diagnóstico. Protegido con un token secreto:
  //   https://tu-worker.workers.dev/run?key=TU_ADMIN_TOKEN
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== '/run') {
      return new Response('ok', { status: 200 });
    }
    if (!env.ADMIN_TOKEN || url.searchParams.get('key') !== env.ADMIN_TOKEN) {
      return new Response('no autorizado', { status: 401 });
    }
    const log = [];
    try {
      await abrirPendientes(env, log);
      await resolverPendientes(env, log);
    } catch (e) {
      log.push('ERROR: ' + (e?.message || e));
    }
    return new Response(log.join('\n') || 'sin cambios', {
      status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' }
    });
  }
};
