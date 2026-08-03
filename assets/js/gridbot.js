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

/* PancakeSwap V2 Factory + par, para leer el precio spot de las reservas. */
const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const FAC_ABI = ['function getPair(address,address) view returns (address)'];
const PAIR_ABI = ['function getReserves() view returns (uint112,uint112,uint32)', 'function token0() view returns (address)'];

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

/** Devuelve {compra: [quote..base], venta: [base..quote]} usando sondas de 1 unidad. */
export async function resolverRutas(base, quote, decBase, decQuote) {
  const compra = await unaRuta(quote, base, ethers.parseUnits('1', decQuote));
  const venta  = await unaRuta(base, quote, ethers.parseUnits('1', decBase));
  return { compra, venta };
}

/** Precio spot directo desde las reservas de un pool (sin impacto). */
async function precioDirecto(inTok, outTok, decIn, decOut) {
  const fac = new ethers.Contract(FACTORY, FAC_ABI, lector());
  const pair = await fac.getPair(inTok, outTok);
  if (!pair || pair === ethers.ZeroAddress) return null;
  const pc = new ethers.Contract(pair, PAIR_ABI, lector());
  const [r0, r1] = await pc.getReserves();
  const t0 = (await pc.token0()).toLowerCase();
  const [rIn, rOut] = t0 === inTok.toLowerCase() ? [r0, r1] : [r1, r0];
  if (rIn === 0n) return null;
  const inH = Number(ethers.formatUnits(rIn, decIn));
  const outH = Number(ethers.formatUnits(rOut, decOut));
  return inH > 0 ? outH / inH : null;
}

/** Precio spot del par (quote por 1 base): directo o vía WBNB. Sin impacto. */
export async function precioSpot(base, quote, decBase, decQuote) {
  const d = await precioDirecto(base, quote, decBase, decQuote);
  if (d && isFinite(d) && d > 0) return d;
  const bw = await precioDirecto(base, WBNB, decBase, 18);
  const wq = await precioDirecto(WBNB, quote, 18, decQuote);
  return (bw && wq) ? bw * wq : null;
}

/** Precio actual del par (spot por reservas; respaldo por cotización). */
export async function precioPar(base, quote, decBase, decQuote, rutas) {
  const r = rutas || await resolverRutas(base, quote, decBase, decQuote);
  let precio = null;
  try { precio = await precioSpot(base, quote, decBase, decQuote); } catch (_) {}
  if (!(precio > 0)) {
    try { const q = await cotizar(ethers.parseUnits('1', decBase), r.venta); precio = Number(ethers.formatUnits(q, decQuote)); } catch (_) {}
  }
  return { precio, rutas: r };
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

/** Convierte un número humano a unidades del token (recorta decimales). */
function aBI(numeroHumano, dec) {
  const s = Number(numeroHumano);
  if (!isFinite(s) || s <= 0) return 0n;
  return ethers.parseUnits(s.toFixed(Math.min(dec, 18)), dec);
}

/**
 * Construye el ConfigIn listo para crearRejilla.
 * Acepta `totalQuoteHumano` (inversión total; el bot la reparte) o bien
 * `ordenQuoteHumano`/`ordenBaseHumano` explícitos.
 * @param p.base,p.quote,p.decBase,p.decQuote,p.pMin,p.pMax,p.niveles,p.modo
 * @param p.slippageBps,p.cooldownSeg,p.tpPrecio,p.slPrecio,p.rutas
 */
export async function construirConfig(p) {
  const rutas = p.rutas || await resolverRutas(p.base, p.quote, p.decBase, p.decQuote);
  const { precio: Pnow } = await precioPar(p.base, p.quote, p.decBase, p.decQuote, rutas);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  const precios = preciosNiveles(Number(p.pMin), Number(p.pMax), p.niveles, p.modo || 'arit');

  let ordenQuoteHumano = p.ordenQuoteHumano;
  let ordenBaseHumano  = p.ordenBaseHumano;
  if (p.totalQuoteHumano) {
    const nBuy = Math.max(1, precios.filter((Pi) => Pi < Pnow).length);
    ordenQuoteHumano = Number(p.totalQuoteHumano) / nBuy;
    ordenBaseHumano  = ordenQuoteHumano / Pnow;
  }
  if (!(ordenQuoteHumano > 0 && ordenBaseHumano > 0)) throw new Error('Falta el tamaño de orden');

  const niveles = precios.map((Pi) => ({
    minOutCompra: aBI(ordenQuoteHumano / Pi, p.decBase),
    minOutVenta:  aBI(ordenBaseHumano * Pi, p.decQuote),
    estado: Pi < Pnow ? 1 : 0   // arma compras bajo el precio; las ventas se arman al comprar
  }));

  const tpUnitOut = p.tpPrecio > 0 ? aBI(ordenBaseHumano * Number(p.tpPrecio), p.decQuote) : 0n;
  const slUnitOut = p.slPrecio > 0 ? aBI(ordenBaseHumano * Number(p.slPrecio), p.decQuote) : 0n;

  return {
    base: p.base, quote: p.quote,
    pathCompra: rutas.compra, pathVenta: rutas.venta,
    ordenQuote: aBI(ordenQuoteHumano, p.decQuote),
    ordenBase:  aBI(ordenBaseHumano, p.decBase),
    niveles,
    slippageBps: p.slippageBps || 0,
    cooldownSeg: p.cooldownSeg || 0,
    tpUnitOut, slUnitOut,
    _Pnow: Pnow, _ordenQuoteHumano: ordenQuoteHumano, _ordenBaseHumano: ordenBaseHumano, _precios: precios
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
  const c = {
    base: config.base, quote: config.quote,
    pathCompra: config.pathCompra, pathVenta: config.pathVenta,
    ordenQuote: config.ordenQuote, ordenBase: config.ordenBase,
    niveles: config.niveles,
    slippageBps: config.slippageBps, cooldownSeg: config.cooldownSeg,
    tpUnitOut: config.tpUnitOut, slUnitOut: config.slUnitOut
  };
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
