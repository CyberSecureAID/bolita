/**
 * GRIDBOT — capa de contrato + matemática de rejilla (para la web)
 * ================================================================
 *
 * Habla con el contrato GridBot desplegado en BSC. Usa `ethers` (desde CDN, sin
 * build) SOLO en esta parte, porque `crearRejilla` lleva una estructura con
 * arrays anidados y codificarla a mano es donde se cuelan errores.
 *
 * NO custodia nada: el usuario firma cada acción con su wallet. El capital vive
 * en su wallet; el bot solo tiene el permiso (allowance) para operar el par.
 *
 * Lo que vive en la wallet del usuario: su capital de trading.
 * Lo único que deja en el contrato: un tanque de BNB para gas (retirable).
 */

import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.13.4/+esm';

export const GRIDBOT = '0x86641CD8518c12346790E82808988A554F9F480C';
export const WBNB    = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.defibit.io'
];

const ABI = [
  'function resumen(address,address,address) view returns (tuple(address base,address quote,bool activa,uint256 niveles,uint256 armados,uint256 creadaEn,uint256 ultimaOpEn,uint256 comprasHechas,uint256 ventasHechas,uint256 ciclos,uint256 totalOps,uint256 posicionBase,uint256 costeQuote,uint256 volumenQuote,int256 gananciaQuote,uint256 gasSaldoWei,uint256 gasGastadoWei,uint256 ordenQuote,uint256 ordenBase,uint128 tpUnitOut,uint128 slUnitOut,uint16 slippageBps,uint32 cooldownSeg))',
  'function nivelesDe(bytes32) view returns (tuple(uint128 minOutCompra,uint128 minOutVenta,uint8 estado)[])',
  'function pathsDe(bytes32) view returns (address[] compra,address[] venta)',
  'function cotizar(uint256,address[]) view returns (uint256)',
  'function gasSaldo(address) view returns (uint256)',
  'function gasMinOp() view returns (uint256)',
  'function misRejillas(address) view returns (bytes32[])',
  'function crearRejilla((address base,address quote,address[] pathCompra,address[] pathVenta,uint256 ordenQuote,uint256 ordenBase,(uint128 minOutCompra,uint128 minOutVenta,uint8 estado)[] niveles,uint16 slippageBps,uint32 cooldownSeg,uint128 tpUnitOut,uint128 slUnitOut))',
  'function activarRejilla(address,address,bool)',
  'function cancelarRejilla(address,address)',
  'function cerrarAhora(address,address)',
  'function setTPSL(address,address,uint128,uint128)',
  'function ajustarSlippage(address,address,uint16)',
  'function ajustarCooldown(address,address,uint32)',
  'function depositarGas() payable',
  'function retirarGas(uint256)'
];

const ERC20 = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

/* ================================================================== */
/* Proveedores y contratos                                             */
/* ================================================================== */

let _rpc = null;
function lector() {
  if (!_rpc) _rpc = new ethers.JsonRpcProvider(RPCS[0], 56, { staticNetwork: true });
  return _rpc;
}

/** Proveedor inyectado (MetaMask u otro). */
function inyectado() {
  if (typeof window !== 'undefined' && window.ethereum) return window.ethereum;
  throw new Error('No hay wallet');
}

async function firmante() {
  const bp = new ethers.BrowserProvider(inyectado());
  return bp.getSigner();
}

function cLee()  { return new ethers.Contract(GRIDBOT, ABI, lector()); }
async function cEscribe() { return new ethers.Contract(GRIDBOT, ABI, await firmante()); }

/** Dirección de un token; si es BNB nativo (address null), usa WBNB. */
export function dirDe(moneda) {
  return moneda.address ?? WBNB;
}

export function claveDe(usuario, base, quote) {
  return ethers.solidityPackedKeccak256(['address', 'address', 'address'], [usuario, base, quote]);
}

/* ================================================================== */
/* Lecturas                                                            */
/* ================================================================== */

export async function resumen(usuario, base, quote) { return cLee().resumen(usuario, base, quote); }
export async function nivelesDe(clave)              { return cLee().nivelesDe(clave); }
export async function pathsDe(clave)                { return cLee().pathsDe(clave); }
export async function misRejillas(usuario)          { return cLee().misRejillas(usuario); }
export async function gasSaldo(usuario)             { return cLee().gasSaldo(usuario); }
export async function gasMinOp()                    { try { return await cLee().gasMinOp(); } catch { return 0n; } }
export async function cotizar(amountIn, path)       { return cLee().cotizar(amountIn, path); }

export async function allowance(tokenAddr, duenio) {
  const t = new ethers.Contract(tokenAddr, ERC20, lector());
  return t.allowance(duenio, GRIDBOT);
}
export async function balanceToken(tokenAddr, duenio) {
  const t = new ethers.Contract(tokenAddr, ERC20, lector());
  return t.balanceOf(duenio);
}

/* ================================================================== */
/* Rutas de swap (directa o vía WBNB)                                  */
/* ================================================================== */

async function unaRuta(entra, sale, montoPrueba) {
  const directa = [entra, sale];
  try { if ((await cotizar(montoPrueba, directa)) > 0n) return directa; } catch (_) {}
  const w = WBNB.toLowerCase();
  if (entra.toLowerCase() === w || sale.toLowerCase() === w) return directa;
  return [entra, WBNB, sale];
}

/** Devuelve {compra: [quote..base], venta: [base..quote]}. */
export async function resolverRutas(base, quote, ordenQuote, ordenBase) {
  const compra = await unaRuta(quote, base, ordenQuote);
  const venta  = await unaRuta(base, quote, ordenBase);
  return { compra, venta };
}

/* ================================================================== */
/* Matemática de la rejilla                                            */
/* ================================================================== */

/** Precio de cada nivel según el modo (aritmético o geométrico). */
function preciosNiveles(pMin, pMax, n, modo) {
  const out = [];
  if (n === 1) return [pMin];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(modo === 'geo' ? pMin * Math.pow(pMax / pMin, t) : pMin + (pMax - pMin) * t);
  }
  return out;
}

/** Escala un BigInt por un ratio decimal, con 9 cifras de precisión. */
function porRatio(valor, ratio) {
  const r = BigInt(Math.max(0, Math.round(ratio * 1e9)));
  return (valor * r) / 1_000_000_000n;
}

/**
 * Construye el ConfigIn listo para crearRejilla.
 * @param p.base,p.quote      direcciones de los tokens (usar WBNB para BNB)
 * @param p.decBase,p.decQuote decimales
 * @param p.pMin,p.pMax        rango de precio (quote por 1 base, en humano)
 * @param p.niveles           nº de cuadrículas
 * @param p.modo              'arit' | 'geo'
 * @param p.ordenQuoteHumano  quote por compra
 * @param p.ordenBaseHumano   base por venta
 * @param p.slippageBps       (0 = usa el máximo del contrato)
 * @param p.cooldownSeg       (0 = sin límite)
 * @param p.tpPrecio,p.slPrecio  Take-Profit / Stop-Loss en precio (0 = off)
 */
export async function construirConfig(p) {
  const ordenQuote = ethers.parseUnits(String(p.ordenQuoteHumano), p.decQuote);
  const ordenBase  = ethers.parseUnits(String(p.ordenBaseHumano),  p.decBase);

  const rutas = p.rutas || await resolverRutas(p.base, p.quote, ordenQuote, ordenBase);

  // Referencias actuales del mercado (según Pancake, vía el contrato).
  const bOutNow = await cotizar(ordenQuote, rutas.compra); // base que rinde ordenQuote
  const qOutNow = await cotizar(ordenBase,  rutas.venta);  // quote que rinde ordenBase
  const Pnow = Number(ethers.formatUnits(qOutNow, p.decQuote)) / Number(p.ordenBaseHumano);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  const precios = preciosNiveles(Number(p.pMin), Number(p.pMax), p.niveles, p.modo || 'arit');

  const niveles = precios.map((Pi) => {
    const minOutCompra = porRatio(bOutNow, Pnow / Pi); // más base cuando el precio baja
    const minOutVenta  = porRatio(qOutNow, Pi / Pnow); // más quote cuando el precio sube
    const estado = Pi < Pnow ? 1 : (Pi > Pnow ? 2 : 0); // compra abajo, venta arriba
    return { minOutCompra, minOutVenta, estado };
  });

  const tpUnitOut = p.tpPrecio > 0 ? porRatio(qOutNow, Number(p.tpPrecio) / Pnow) : 0n;
  const slUnitOut = p.slPrecio > 0 ? porRatio(qOutNow, Number(p.slPrecio) / Pnow) : 0n;

  return {
    base: p.base, quote: p.quote,
    pathCompra: rutas.compra, pathVenta: rutas.venta,
    ordenQuote, ordenBase,
    niveles,
    slippageBps: p.slippageBps || 0,
    cooldownSeg: p.cooldownSeg || 0,
    tpUnitOut, slUnitOut,
    _Pnow: Pnow // referencia para la UI (no va al contrato)
  };
}

/* ================================================================== */
/* Escrituras (el usuario firma)                                       */
/* ================================================================== */

/** Aprueba al GridBot para gastar un token (allowance amplio, una sola vez). */
export async function aprobarToken(tokenAddr) {
  const s = await firmante();
  const t = new ethers.Contract(tokenAddr, ERC20, s);
  const tx = await t.approve(GRIDBOT, ethers.MaxUint256);
  return tx.wait();
}

export async function crearRejilla(config) {
  const { _Pnow, ...c } = config; // quita el campo auxiliar
  const bot = await cEscribe();
  const tx = await bot.crearRejilla(c);
  return tx.wait();
}

export async function cerrarAhora(base, quote) {
  const bot = await cEscribe(); const tx = await bot.cerrarAhora(base, quote); return tx.wait();
}
export async function cancelarRejilla(base, quote) {
  const bot = await cEscribe(); const tx = await bot.cancelarRejilla(base, quote); return tx.wait();
}
export async function activarRejilla(base, quote, activa) {
  const bot = await cEscribe(); const tx = await bot.activarRejilla(base, quote, activa); return tx.wait();
}
export async function setTPSL(base, quote, tpUnitOut, slUnitOut) {
  const bot = await cEscribe(); const tx = await bot.setTPSL(base, quote, tpUnitOut, slUnitOut); return tx.wait();
}
export async function ajustarSlippage(base, quote, bps) {
  const bot = await cEscribe(); const tx = await bot.ajustarSlippage(base, quote, bps); return tx.wait();
}
export async function ajustarCooldown(base, quote, seg) {
  const bot = await cEscribe(); const tx = await bot.ajustarCooldown(base, quote, seg); return tx.wait();
}

/** Recarga el tanque de gas (BNB) del usuario. */
export async function depositarGas(bnbHumano) {
  const bot = await cEscribe();
  const tx = await bot.depositarGas({ value: ethers.parseEther(String(bnbHumano)) });
  return tx.wait();
}
export async function retirarGas(bnbHumano) {
  const bot = await cEscribe();
  const tx = await bot.retirarGas(ethers.parseEther(String(bnbHumano)));
  return tx.wait();
}

/* ================================================================== */
/* Utilidades de formato para la UI                                    */
/* ================================================================== */

export const fmt = ethers.formatUnits;
export const parse = ethers.parseUnits;
export const fmtBNB = ethers.formatEther;
