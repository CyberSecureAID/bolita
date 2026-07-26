/**
 * CONTRATO — Puente entre la web y el smart contract de La Bolita
 * ===============================================================
 *
 * Un solo lugar donde vive la dirección del contrato y las llamadas que la
 * web necesita. No usa librerías: arma el calldata a mano (igual que wallet.js)
 * y habla por el mismo proveedor EIP-1193 que ya tienes conectado.
 *
 * Qué expone:
 *   LECTURA  (no gasta gas):
 *     - saldoDe(jugador, token)   -> saldo retirable del jugador en esa moneda
 *     - monedaActiva(token)       -> ¿está activa para jugar?
 *   ESCRITURA (firma + gas):
 *     - retirar(token)            -> cobra el saldo ganado de esa moneda
 *     - apostar(...)              -> (se usará en la próxima entrega)
 *     - approve(token, cantidad)  -> permiso ERC-20 antes de apostar con token
 *
 * La dirección y la red se validan aquí para no mandar transacciones a la
 * cadena equivocada.
 */

import { RED, MONEDAS, desdeBase } from './tokens.js';

/** Contrato de La Bolita en BNB Smart Chain (mainnet). */
export const DIRECCION_CONTRATO = '0x663517598011A6a00fA1e2ab7276BFfDEED92706';

/* ================================================================== */
/* Selectores de función (primeros 4 bytes de keccak256 de la firma).  */
/* Precalculados para no depender de ninguna librería de hashing.      */
/* ================================================================== */

const SEL = {
  // saldoDe(address,address)
  saldoDe:      '0x611f7f0e',
  // retirar(address)
  retirar:      '0xab228c19',
  // apostar(uint256,address,uint8,uint8,uint8,uint256)
  apostar:      '0xfaf38dce',
  // monedas(address) -> struct (leemos activa desde el primer word)
  monedas:      '0x72359d87',
  // approve(address,uint256)  [estándar ERC-20, en el contrato del token]
  approve:      '0x095ea7b3'
};

/* ================================================================== */
/* Utilidades de codificación ABI (mínimas, sin librerías)             */
/* ================================================================== */

/** Dirección -> 32 bytes hex (sin 0x). */
function encAddr(dir) {
  return dir.toLowerCase().replace(/^0x/, '').padStart(64, '0');
}

/** Entero (BigInt/number/string) -> 32 bytes hex (sin 0x). */
function encUint(v) {
  return BigInt(v).toString(16).padStart(64, '0');
}

/**
 * Convierte una cantidad decimal de la moneda a unidades base (wei) como BigInt.
 * Trabaja SOLO con strings para no perder precisión con dinero (los flotantes
 * de JS convierten mal cifras como 1.427 -> 1.4270000000000000046).
 */
export function aBase(cantidad, decimals) {
  // Normaliza a string sin notación científica.
  let s = typeof cantidad === 'string' ? cantidad.trim() : String(cantidad);

  // Si viniera en notación científica (p. ej. 1e-7), expándela.
  if (/e/i.test(s)) s = Number(s).toFixed(Math.max(decimals, 20));

  const neg = s.startsWith('-');
  if (neg) s = s.slice(1);

  let [ent = '0', frac = ''] = s.split('.');
  ent = ent.replace(/\D/g, '') || '0';
  frac = frac.replace(/\D/g, '');

  // Recorta o rellena la parte fraccionaria a exactamente `decimals` dígitos.
  frac = frac.slice(0, decimals).padEnd(decimals, '0');

  const base = BigInt(ent + frac);
  return neg ? -base : base;
}

/* ================================================================== */
/* Acceso al proveedor (el mismo que usa wallet.js)                    */
/* ================================================================== */

function proveedor() {
  if (typeof window === 'undefined') return null;
  return window.ethereum ?? null;
}

/** Lectura cruda (eth_call) contra un contrato. Devuelve el hex de retorno. */
async function leer(to, data) {
  const prov = proveedor();
  if (!prov) throw new Error('NO_WALLET');
  return prov.request({
    method: 'eth_call',
    params: [{ to, data }, 'latest']
  });
}

/** Envío de transacción (eth_sendTransaction). Devuelve el hash. */
async function enviar({ from, to, data, value }) {
  const prov = proveedor();
  if (!prov) throw new Error('NO_WALLET');
  const tx = { from, to, data };
  if (value !== undefined) tx.value = '0x' + BigInt(value).toString(16);
  return prov.request({ method: 'eth_sendTransaction', params: [tx] });
}

/**
 * Espera a que una transacción se mine y devuelve el recibo.
 * Sondea cada 3 s hasta 90 s. Lanza si falla o si se agota el tiempo.
 */
export async function esperarRecibo(hash, { intentos = 30, esperaMs = 3000 } = {}) {
  const prov = proveedor();
  if (!prov) throw new Error('NO_WALLET');

  for (let i = 0; i < intentos; i++) {
    const r = await prov.request({
      method: 'eth_getTransactionReceipt',
      params: [hash]
    });
    if (r) {
      // status 0x1 = éxito, 0x0 = revert
      if (r.status === '0x0') throw new Error('TX_FALLIDA');
      return r;
    }
    await new Promise((res) => setTimeout(res, esperaMs));
  }
  throw new Error('TX_SIN_CONFIRMAR');
}

/* ================================================================== */
/* Dirección de token para el ABI                                      */
/* ================================================================== */

/** El contrato usa address(0) para la moneda nativa (BNB). */
const CERO = '0x0000000000000000000000000000000000000000';
function dirToken(moneda) {
  return moneda.address === null ? CERO : moneda.address;
}

/* ================================================================== */
/* LECTURA                                                             */
/* ================================================================== */

/**
 * Saldo retirable del jugador en una moneda (lo que ganó y aún no ha cobrado).
 * Devuelve un número ya en unidades decimales de la moneda.
 */
export async function saldoRetirable(jugador, moneda) {
  const data = SEL.saldoDe + encAddr(jugador) + encAddr(dirToken(moneda));
  const hex = await leer(DIRECCION_CONTRATO, data);
  if (!hex || hex === '0x') return 0;
  return desdeBase(hex, moneda.decimals);
}

/**
 * Lee el saldo retirable de TODAS las monedas admitidas de una vez.
 * @returns {Promise<Record<string, number>>} id de moneda -> saldo decimal
 */
export async function saldosRetirables(jugador) {
  const ids = Object.keys(MONEDAS);
  const pares = await Promise.all(
    ids.map(async (id) => {
      try { return [id, await saldoRetirable(jugador, MONEDAS[id])]; }
      catch { return [id, 0]; }
    })
  );
  return Object.fromEntries(pares);
}

/* ================================================================== */
/* ESCRITURA                                                           */
/* ================================================================== */

/**
 * Retira (cobra) el saldo ganado de una moneda. El contrato pone el saldo a 0
 * ANTES de enviar, así que no hay doble cobro. El jugador paga su propio gas.
 * @returns {Promise<string>} hash de la transacción
 */
export async function retirar(jugador, moneda) {
  const data = SEL.retirar + encAddr(dirToken(moneda));
  return enviar({ from: jugador, to: DIRECCION_CONTRATO, data });
}

/**
 * Permiso ERC-20: autoriza al contrato de la Bolita a tomar `cantidadBase`
 * unidades del token. Solo para monedas con dirección (no BNB nativo).
 * Se ejecuta en el contrato DEL TOKEN, no en el de la Bolita.
 * @returns {Promise<string>} hash
 */
export async function approve(jugador, moneda, cantidadBase) {
  if (moneda.address === null) throw new Error('BNB_NO_NECESITA_APPROVE');
  const data = SEL.approve + encAddr(DIRECCION_CONTRATO) + encUint(cantidadBase);
  return enviar({ from: jugador, to: moneda.address, data });
}

/**
 * Coloca una apuesta. (Preparado para la próxima entrega — el flujo completo
 * approve→apostar se cablea en app.js cuando conectemos el juego real.)
 *
 * modo: 0=Terminal, 1=Número, 2=Parlé
 * Para BNB nativo, el importe viaja en `value`; para tokens, en importeToken.
 * @returns {Promise<string>} hash
 */
export async function apostar(jugador, {
  idTirada, moneda, modo, numeroA, numeroB, cantidadBase
}) {
  const esNativa = moneda.address === null;
  const data =
    SEL.apostar +
    encUint(idTirada) +
    encAddr(dirToken(moneda)) +
    encUint(modo) +
    encUint(numeroA) +
    encUint(numeroB) +
    encUint(esNativa ? 0 : cantidadBase);

  return enviar({
    from: jugador,
    to: DIRECCION_CONTRATO,
    data,
    value: esNativa ? cantidadBase : undefined
  });
}

/* ================================================================== */
/* Guardas de red                                                      */
/* ================================================================== */

/** ¿El proveedor está en BNB Smart Chain? */
export async function enRedCorrecta() {
  const prov = proveedor();
  if (!prov) return false;
  try {
    const id = await prov.request({ method: 'eth_chainId' });
    return id === RED.chainIdHex;
  } catch {
    return false;
  }
}
