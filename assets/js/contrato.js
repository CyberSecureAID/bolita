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
export const DIRECCION_CONTRATO = '0x964a68D3A2dB18c723581410C49aa8789048E1B9';

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
  // tiradas(uint256) -> struct de la tirada
  tiradas:      '0xad1aab5f',
  // calcularPremio(address,uint8,uint256) -> premio real topado por banca
  calcularPremio: '0xe180ff41',
  // apuestasDe(uint256,uint256) -> una apuesta por índice
  apuestasDe:   '0x5949591f',
  // totalApuestas(uint256) -> cuántas apuestas hay en la tirada
  totalApuestas: '0x459e0618',
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

/**
 * Premio REAL que pagaría el contrato por una apuesta, ya topado por la banca
 * disponible de esa moneda. Es lo que la web muestra para ser transparente: si
 * hay poca banca, el premio (y el multiplicador efectivo) baja solo. Nunca
 * limita la apuesta, solo informa.
 * @returns {Promise<number>} premio en unidades decimales de la moneda
 */
export async function calcularPremio(moneda, modoCod, importeDecimal) {
  const importeBase = aBase(
    Number(importeDecimal).toFixed(moneda.decimals), moneda.decimals
  );
  if (importeBase <= 0n) return 0;
  const data = SEL.calcularPremio + encAddr(dirToken(moneda)) + encUint(modoCod) + encUint(importeBase);
  const hex = await leer(DIRECCION_CONTRATO, data);
  if (!hex || hex === '0x') return 0;
  return desdeBase(hex, moneda.decimals);
}

/**
 * Lee las apuestas que un jugador hizo en una tirada. Recorre la lista de la
 * tirada y se queda con las de esa wallet. Devuelve datos ya legibles para
 * mostrar: modo, números, importe y premio potencial (todo en decimal).
 *
 * @returns {Promise<Array<{modo,numeroA,numeroB,importe,premio,token,tokenId}>>}
 */
export async function misApuestas(jugador, idTirada) {
  // 1) cuántas apuestas hay en la tirada
  const totHex = await leer(DIRECCION_CONTRATO, SEL.totalApuestas + encUint(idTirada));
  const total = (!totHex || totHex === '0x') ? 0 : Number(BigInt(totHex));
  if (total === 0) return [];

  const jugadorLc = jugador.toLowerCase();
  const mias = [];

  // 2) recorrer y filtrar por jugador
  for (let i = 0; i < total; i++) {
    const data = SEL.apuestasDe + encUint(idTirada) + encUint(i);
    let hex;
    try { hex = await leer(DIRECCION_CONTRATO, data); } catch { continue; }
    if (!hex || hex === '0x') continue;

    const w = hex.replace(/^0x/, '').match(/.{64}/g) || [];
    // Orden del struct Apuesta:
    // 0 jugador, 1 token, 2 importe, 3 premio, 4 reserva, 5 modo, 6 numeroA,
    // 7 numeroB, 8 liquidada
    const dirJugador = '0x' + w[0].slice(24);
    if (dirJugador.toLowerCase() !== jugadorLc) continue;

    const tokenDir = '0x' + w[1].slice(24);
    const mon = monedaPorDireccion(tokenDir);
    const dec = mon ? mon.decimals : 18;

    mias.push({
      tokenId: mon ? mon.id : null,
      token: tokenDir,
      importe: desdeBase('0x' + w[2], dec),
      premio:  desdeBase('0x' + w[3], dec),
      modo:    Number(BigInt('0x' + w[5])),   // 0 term, 1 número, 2 parlé
      numeroA: Number(BigInt('0x' + w[6])),
      numeroB: Number(BigInt('0x' + w[7])),
      liquidada: BigInt('0x' + w[8]) !== 0n
    });
  }
  return mias;
}

/** Busca una moneda de tokens.js por su dirección (address(0) = BNB). */
function monedaPorDireccion(dir) {
  const d = dir.toLowerCase();
  if (d === CERO) return MONEDAS.BNB;
  return Object.values(MONEDAS).find(
    (m) => m.address && m.address.toLowerCase() === d
  ) || null;
}

/* ================================================================== */
/* Identidad de la tirada y mapeo de modos                             */
/* ================================================================== */

/**
 * Deriva el idTirada numérico a partir del sorteo (Date en instante real) y
 * el turno ('dia' | 'noche'). Regla FIJA y automática:
 *
 *   id = AAAAMMDD * 10 + (dia:1 | noche:2)   en hora de Florida.
 *
 * Ejemplo: sorteo del 26/07/2026 mediodía -> 202607261
 *          sorteo del 26/07/2026 noche    -> 202607262
 *
 * La web y el owner usan ESTA MISMA regla, así nunca se descuadran: el owner
 * abre `abrirTirada(id, cierre)` con el id que esta función produce, y la web
 * apuesta contra ese mismo id sin intervención manual.
 */
export function idTiradaDe(sorteo, turno) {
  // Fecha en hora de Florida (el sorteo es de la Florida Lottery).
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  const partes = fmt.formatToParts(sorteo);
  const y = partes.find((p) => p.type === 'year').value;
  const m = partes.find((p) => p.type === 'month').value;
  const d = partes.find((p) => p.type === 'day').value;
  const base = Number(`${y}${m}${d}`);
  const sufijo = turno === 'noche' ? 2 : 1;
  return base * 10 + sufijo;
}

/** Modo de la web -> código del contrato (0=Terminal, 1=Número/fijo, 2=Parlé). */
export function codigoModo(modoId) {
  if (modoId === 'terminal') return 0;
  if (modoId === 'fijo') return 1;
  if (modoId === 'parle') return 2;
  throw new Error('MODO_DESCONOCIDO: ' + modoId);
}

/**
 * Lee del contrato el estado de una tirada. Devuelve un objeto con lo que
 * necesita la web para decidir si se puede apostar.
 *   tiradas(uint256) -> (existe, resuelta, cierre, fijo, terminal, corrido1,
 *                        corrido2, cancelada)
 */
export async function estadoTirada(id) {
  const data = SEL.tiradas + encUint(id);
  const hex = await leer(DIRECCION_CONTRATO, data);
  if (!hex || hex === '0x') return null;

  const words = hex.replace(/^0x/, '').match(/.{64}/g) || [];
  const bool = (w) => BigInt('0x' + w) !== 0n;
  const num = (w) => Number(BigInt('0x' + w));

  return {
    existe: bool(words[0]),
    resuelta: bool(words[1]),
    cierre: num(words[2]),      // timestamp unix
    fijo: num(words[3]),
    terminal: num(words[4]),
    corrido1: num(words[5]),
    corrido2: num(words[6]),
    cancelada: bool(words[7])
  };
}

/**
 * ¿Se puede apostar YA en esta tirada? True solo si existe, no está resuelta
 * ni cancelada, y aún no llegó su hora de cierre.
 */
export async function sePuedeApostar(id) {
  const t = await estadoTirada(id);
  if (!t || !t.existe || t.resuelta || t.cancelada) return false;
  const ahora = Math.floor(Date.now() / 1000);
  return t.cierre === 0 || ahora < t.cierre;
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
