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

// La librería vive en ESTE repositorio. Carga directa: sin CDN, sin esperas,
// sin nada externo que pueda quedarse colgado y dejar la app en 'Cargando…'.
import * as ethers from './vendor/ethers-6.13.4.min.js?v=72';

// ⚠️ IMPORTANTE: cambia esta dirección por la de tu PROXY de GridBotV2 recién desplegado.
// (La de abajo es el contrato V1 viejo; con el V2 ya no sirve.)
export const GRIDBOT = '0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B';
export const WBNB    = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-rpc.publicnode.com',
  'https://bsc-dataseed1.defibit.io'
];

const ABI = [
  'function resumen(address,address,address) view returns (tuple(address base,address quote,bool activa,uint256 niveles,uint256 armados,uint256 creadaEn,uint256 ultimaOpEn,uint256 comprasHechas,uint256 ventasHechas,uint256 ciclos,uint256 totalOps,uint256 posicionBase,uint256 costeQuote,uint256 volumenQuote,int256 gananciaQuote,uint256 gasSaldoWei,uint256 gasGastadoWei,uint256 ordenQuote,uint256 ordenBase,uint128 tpUnitOut,uint128 slUnitOut,uint16 slippageBps,uint32 cooldownSeg,uint24 feeTier,uint256 intervalo,uint32 comprasMax))',
  'function resumen(bytes32) view returns (tuple(address base,address quote,bool activa,uint256 niveles,uint256 armados,uint256 creadaEn,uint256 ultimaOpEn,uint256 comprasHechas,uint256 ventasHechas,uint256 ciclos,uint256 totalOps,uint256 posicionBase,uint256 costeQuote,uint256 volumenQuote,int256 gananciaQuote,uint256 gasSaldoWei,uint256 gasGastadoWei,uint256 ordenQuote,uint256 ordenBase,uint128 tpUnitOut,uint128 slUnitOut,uint16 slippageBps,uint32 cooldownSeg,uint24 feeTier,uint256 intervalo,uint32 comprasMax))',
  'function modoDe(bytes32) view returns (uint8,uint16)',
  'function cerrarAhora(bytes32)',
  'function cancelarRejilla(bytes32)',
  'function claveBot(address,address,address,uint256) pure returns (bytes32)',
  'function nivelesDe(bytes32) view returns (tuple(uint128 minOutCompra,uint128 minOutVenta,uint8 estado)[])',
  'function pathsDe(bytes32) view returns (address[] compra,address[] venta)',
  'function cotizar(uint256,address[]) view returns (uint256)',
  'function gasSaldo(address) view returns (uint256)',
  'function gasMinOp() view returns (uint256)',
  'function misRejillas(address) view returns (bytes32[])',
  'function activo(address usuario) view returns (bool)',
  'function precioSuscripcion() view returns (uint256)',
  'function suscribir() payable',
  'function crearRejilla((address base,address quote,address[] pathCompra,address[] pathVenta,uint256 ordenQuote,uint256 ordenBase,(uint128 minOutCompra,uint128 minOutVenta,uint8 estado)[] niveles,uint16 slippageBps,uint32 cooldownSeg,uint128 tpUnitOut,uint128 slUnitOut,uint24 feeTier,uint8 modo,uint16 objetivoBps,uint16 factorBps,uint256 compraInicialQuote,uint16 margenBps,uint256 botId,uint256 intervalo,uint32 comprasMax))',
  'function comprarDCA(bytes32)',
  'function activarRejilla(address,address,bool)',
  'function cancelarRejilla(address,address)',
  'function cerrarAhora(address,address)',
  'function setTPSL(address,address,uint128,uint128)',
  'function ajustarSlippage(address,address,uint16)',
  'function ajustarCooldown(address,address,uint32)',
  'function depositarGas() payable',
  'function retirarGas(uint256)',
  'function clave(address,address,address) view returns (bytes32)',
  'event Ejecutado(address indexed usuario, bytes32 indexed clave, uint256 indice, bool compra, uint256 entrada, uint256 salida)'
];

const ERC20 = [
  'function approve(address,uint256) returns (bool)',
  'function allowance(address,address) view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

/* PancakeSwap V2 Factory + par, para leer el precio spot de las reservas. */
const FACTORY = '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73';
const ROUTER_V2 = '0x10ED43C718714eb63d5aA57B78B54704E256024E'; // solo para precios/rutas de referencia; los swaps van por V3
const ROUTER_V2_ABI = ['function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256[])'];
const QUOTER_V3 = '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997';
const QUOTER_ABI = ['function quoteExactInputSingle((address tokenIn,address tokenOut,uint256 amountIn,uint24 fee,uint160 sqrtPriceLimitX96)) returns (uint256 amountOut,uint160 sqrtPriceX96After,uint32 initializedTicksCrossed,uint256 gasEstimate)'];
const FEE_TIERS = [500, 2500, 100, 10000];
// Prueba los pools V3 y devuelve el fee tier con mejor cotización (más profundo). 0 = no hay pool.
export async function mejorFeeTier(tokenIn, tokenOut, amountIn) {
  const q = new ethers.Contract(QUOTER_V3, QUOTER_ABI, lector());
  let best = 0, bestOut = 0n;
  for (const fee of FEE_TIERS) {
    try {
      const r = await q.quoteExactInputSingle.staticCall({ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0 });
      if (r[0] > bestOut) { bestOut = r[0]; best = fee; }
    } catch (_) {}
  }
  return best;
}
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
/* Lecturas resistentes: si un RPC falla o limita, rota al siguiente. */
let _rpcIdx = 0;
const _provCache = {};
function provRPC(i) { const u = RPCS[i % RPCS.length]; if (!_provCache[u]) _provCache[u] = new ethers.JsonRpcProvider(u, 56, { staticNetwork: true }); return _provCache[u]; }
async function leeGB(fnFirma, args) {
  let err;
  for (let k = 0; k < RPCS.length; k++) {
    try {
      const c = new ethers.Contract(GRIDBOT, ABI, provRPC(_rpcIdx));
      return await c[fnFirma](...args);
    } catch (e) { err = e; _rpcIdx = (_rpcIdx + 1) % RPCS.length; await new Promise((r) => setTimeout(r, 220)); }
  }
  throw err;
}
async function cEscribe() { return new ethers.Contract(GRIDBOT, ABI, await firmante()); }
/** Espera el recibo con nuestro RPC fiable; el de MetaMask a veces no lo devuelve. */
async function esperar(tx) {
  try { if (typeof window !== 'undefined' && window._onTxProcesando) window._onTxProcesando(); } catch (_) {}
  const hash = tx.hash;
  for (let intento = 0; intento < 6; intento++) {
    const rpc = RPCS[intento % RPCS.length];
    try {
      const prov = new ethers.JsonRpcProvider(rpc, 56, { staticNetwork: true });
      const rec = await prov.waitForTransaction(hash, 1, 20000);
      if (rec) { if (rec.status === 0) throw new Error('La transacción se envió pero no se completó en la red (revirtió). Revisa el saldo y el gas, e inténtalo de nuevo.'); return rec; }
    } catch (e) { if (e && /revirt/i.test(e.message || '')) throw e; }
    await new Promise((r) => setTimeout(r, 1500));   // pausa entre reintentos (nunca bucle apretado)
  }
  // último recurso: el proveedor de la propia wallet
  try { const rec = await tx.wait(); if (rec && rec.status === 0) throw new Error('La transacción no se completó en la red.'); return rec || null; }
  catch (e) { if (e && /revirt|no se completó/i.test(e.message || '')) throw e; return null; }
}

/** Dirección de un token; si es BNB nativo (address null), usa WBNB. */
export function dirDe(moneda) {
  return moneda.address ?? WBNB;
}

export function claveBot(usuario, base, quote, botId) {
  if (!botId || botId === 0n || botId === 0) return claveDe(usuario, base, quote);
  return ethers.solidityPackedKeccak256(['address', 'address', 'address', 'uint256'], [usuario, base, quote, BigInt(botId)]);
}
export function claveDe(usuario, base, quote) {
  return ethers.solidityPackedKeccak256(['address', 'address', 'address'], [usuario, base, quote]);
}

/* ================================================================== */
/* Lecturas                                                            */
/* ================================================================== */

export async function resumen(usuario, base, quote) { return leeGB('resumen(address,address,address)', [usuario, base, quote]); }
export async function nivelesDe(clave)              { return leeGB('nivelesDe', [clave]); }
export async function pathsDe(clave)                { return leeGB('pathsDe', [clave]); }
export async function misRejillas(usuario)          { return leeGB('misRejillas', [usuario]); }
export async function gasSaldo(usuario)             { return cLee().gasSaldo(usuario); }
export async function gasMinOp()                    { try { return await cLee().gasMinOp(); } catch { return 0n; } }
export async function cotizar(amountIn, path) {
  const r = new ethers.Contract(ROUTER_V2, ROUTER_V2_ABI, lector());
  const o = await r.getAmountsOut(amountIn, path);
  return o[o.length - 1];
}

/** Historial real de operaciones del bot (evento Ejecutado). Devuelve
 *  [{compra, precio, bloque, i}] en orden. Ventana de bloques acotada para RPCs. */
export async function operacionesDe(usuario, base, quote, decB, decQ, desdeBloques = 45000) {
  const c = cLee();
  let k; try { k = await c.clave(usuario, base, quote); } catch { k = claveDe(usuario, base, quote); }
  let latest = 0; try { latest = await lector().getBlockNumber(); } catch {}
  const from = latest > desdeBloques ? latest - desdeBloques : 0;
  let logs = [];
  try { logs = await c.queryFilter(c.filters.Ejecutado(usuario, k), from, latest || 'latest'); } catch { return []; }
  return logs.map((l) => {
    const a = l.args, compra = a.compra;
    const inH = Number(ethers.formatUnits(a.entrada, compra ? decQ : decB));
    const outH = Number(ethers.formatUnits(a.salida, compra ? decB : decQ));
    const precio = compra ? (outH > 0 ? inH / outH : NaN) : (inH > 0 ? outH / inH : NaN);
    return { compra, precio, bloque: l.blockNumber, i: Number(a.indice) };
  }).filter((x) => isFinite(x.precio) && x.precio > 0);
}

export async function allowance(tokenAddr, duenio) {
  const t = new ethers.Contract(tokenAddr, ERC20, lector());
  return t.allowance(duenio, GRIDBOT);
}
export async function balanceToken(tokenAddr, duenio) {
  const t = new ethers.Contract(tokenAddr, ERC20, lector());
  return t.balanceOf(duenio);
}
/** ¿Esta dirección es el WBNB (o sea, la moneda es BNB)? */
export function esBNB(tokenAddr) { return (tokenAddr || '').toLowerCase() === WBNB.toLowerCase(); }
/** Saldo NATIVO de BNB (no WBNB). */
export async function saldoNativoBNB(duenio) { return lector().getBalance(duenio); }
/** Saldo "real" para mostrar: nativo si es BNB, ERC20 si no. */
export async function saldoParaMostrar(tokenAddr, duenio) {
  return esBNB(tokenAddr) ? saldoNativoBNB(duenio) : balanceToken(tokenAddr, duenio);
}
/** Para Cash Out: si es BNB, cuenta NATIVO + WBNB juntos (todo lo que puedes vender). */
export async function saldoCashDisponible(tokenAddr, duenio) {
  if (esBNB(tokenAddr)) {
    const [nat, wr] = await Promise.all([saldoNativoBNB(duenio), balanceToken(WBNB, duenio)]);
    return nat + wr;
  }
  return balanceToken(tokenAddr, duenio);
}
/** Envuelve BNB nativo -> WBNB (para que el bot pueda venderlo). */
export async function envolverBNB(montoWei) {
  const abi = ['function deposit() payable'];
  const c = new ethers.Contract(WBNB, abi, await firmante());
  const tx = await c.deposit({ value: montoWei });
  return esperar(tx);
}
/** Desenvuelve WBNB -> BNB nativo (al suspender, devuelve el BNB tal cual). */
export async function desenvolverBNB(montoWei) {
  const abi = ['function withdraw(uint256) external'];
  const c = new ethers.Contract(WBNB, abi, await firmante());
  const tx = await c.withdraw(montoWei);
  return esperar(tx);
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
const FEE_VUELTA = 0.0015;  // comisión aproximada por vuelta en V3 (0.05%x2 + colchón)
const GAS_OP_USD = 0.012;   // ~coste de gas por operación en BSC (para no crear cuadrículas que el gas se coma)
export async function construirConfig(p) {
  const rutas = p.rutas || await resolverRutas(p.base, p.quote, p.decBase, p.decQuote);
  const { precio: Pnow } = await precioPar(p.base, p.quote, p.decBase, p.decQuote, rutas);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  // Blindaje anti-contradicción: si el usuario fijó "ganancia por cuadrícula",
  // el número de cuadrículas se DERIVA del rango para que la separación sea ese %.
  // Así no puede pedir 10% por cuadrícula Y 500 cuadrículas a la vez.
  let nivObjetivo = p.niveles;
  const margenPct = p.margenPct || 0;
  if (margenPct > 0 && p.margenModo !== 'rango') {
    const sp = margenPct + FEE_VUELTA;
    nivObjetivo = Math.max(2, Math.min(100, Math.round(Math.log(Number(p.pMax) / Number(p.pMin)) / Math.log(1 + sp))));
    // Blindaje gas: cada cuadrícula debe rendir más que el gas de su vuelta.
    // maxGrids = capital * margen / (2 * gasPorOperación)
    const maxPorGas = Math.max(2, Math.floor(Number(p.totalQuoteHumano) * margenPct / (2 * GAS_OP_USD)));
    if (nivObjetivo > maxPorGas) nivObjetivo = maxPorGas;
  }
  // SIEMPRE geométrico: todas las cuadrículas separadas al MISMO % (paso constante).
  const precios = preciosNiveles(Number(p.pMin), Number(p.pMax), nivObjetivo, 'geo');
  const nLevels = precios.length;
  const pasoPct = Math.pow(Number(p.pMax) / Number(p.pMin), 1 / (nLevels - 1)) - 1;

  // Capital por cuadrícula: igual en todas. El REPARTO entre comprar-ahora (ventas de
  // arriba) y reservar (compras de abajo) es PROPORCIONAL a cuántas cuadrículas caen a
  // cada lado de la entrada (lo decide dónde está Pnow), no 50/50.
  let ordenQuoteHumano = p.ordenQuoteHumano;
  let ordenBaseHumano  = p.ordenBaseHumano;
  if (p.totalQuoteHumano) {
    ordenQuoteHumano = Number(p.totalQuoteHumano) / nLevels;
    ordenBaseHumano  = (ordenQuoteHumano / Pnow) * 0.985; // pequeño colchón: el inventario cubre todas las ventas
  }
  if (!(ordenQuoteHumano > 0 && ordenBaseHumano > 0)) throw new Error('Falta el tamaño de orden');

  // Detecta el mejor pool V3 de este par (cada moneda vive en un fee tier distinto).
  const feeTier = await mejorFeeTier(p.quote, p.base, aBI(ordenQuoteHumano, p.decQuote));
  if (!feeTier) throw new Error('Esta moneda no tiene pool en PancakeSwap V3. Prueba con otra.');

  const niveles = precios.map((Pi) => ({
    minOutCompra: aBI(ordenQuoteHumano / Pi, p.decBase),   // dispara COMPRA cuando el precio baja a Pi
    minOutVenta:  aBI(ordenBaseHumano * Pi, p.decQuote),   // dispara VENTA cuando el precio sube a Pi
    estado: Pi < Pnow ? 1 : 2   // ABAJO de la entrada = compra limit · ARRIBA = venta (el contrato compra su inventario al crear)
  }));

  const nSell = precios.filter((Pi) => Pi >= Pnow).length;
  const nBuy  = nLevels - nSell;

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
    feeTier,   // pool V3 detectado automáticamente para este par
    modo: 0, objetivoBps: 0, factorBps: 0, compraInicialQuote: 0n,
    margenBps: Math.round((p.margenPct || 0) * 10000),
    _Pnow: Pnow, _pasoPct: pasoPct, _nSell: nSell, _nBuy: nBuy,
    _ordenQuoteHumano: ordenQuoteHumano, _ordenBaseHumano: ordenBaseHumano, _precios: precios
  };
}

/** Config del BOT ACUMULADOR: compra progresiva hacia abajo + venta total en ganancia. */
export async function construirConfigAcumulador(p) {
  const rutas = p.rutas || await resolverRutas(p.base, p.quote, p.decBase, p.decQuote);
  const { precio: Pnow } = await precioPar(p.base, p.quote, p.decBase, p.decQuote, rutas);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  const total = Number(p.totalQuoteHumano);
  const n = p.niveles;                 // niveles de compra (todos debajo de la entrada)
  const iniPct = p.iniPct;             // 0..1 comprado a mercado al abrir
  const factor = p.factorPct;          // 0.2 = +20% de volumen por nivel al bajar
  if (!(total > 0 && n >= 1)) throw new Error('Revisa capital y número de compras');

  const pTop = Pnow * 0.999;           // primer nivel apenas debajo de la entrada
  const pMin = Number(p.pMin);
  if (!(pMin > 0 && pMin < pTop)) throw new Error('El mínimo debe ser menor que el precio actual');

  const precios = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 1 : i / (n - 1);        // i=0 abajo (pMin) · i=n-1 arriba (pTop)
    precios.push(pMin * Math.pow(pTop / pMin, t));
  }

  const compraInicial = total * iniPct;
  const restante = total * (1 - iniPct);
  let sumPesos = 0;
  for (let d = 0; d < n; d++) sumPesos += (1 + factor * d);   // depth 0 arriba
  const ordenQuote = restante / sumPesos;                     // unidad base (nivel de arriba)

  const niveles = precios.map((Pi, i) => {
    const depth = n - 1 - i;                                  // arriba depth 0 · abajo depth n-1
    const montoC = ordenQuote * (1 + factor * depth);
    return { minOutCompra: aBI(montoC / Pi, p.decBase), minOutVenta: 0n, estado: 1 };
  });

  const feeTier = await mejorFeeTier(p.quote, p.base, aBI(ordenQuote, p.decQuote));
  if (!feeTier) throw new Error('Esta moneda no tiene pool en PancakeSwap V3. Prueba con otra.');

  let ordenBase = aBI(ordenQuote / Pnow, p.decBase); if (ordenBase <= 0n) ordenBase = 1n;

  return {
    base: p.base, quote: p.quote,
    pathCompra: rutas.compra, pathVenta: rutas.venta,
    ordenQuote: aBI(ordenQuote, p.decQuote), ordenBase,
    niveles,
    slippageBps: p.slippageBps || 0, cooldownSeg: p.cooldownSeg || 0,
    tpUnitOut: 0n, slUnitOut: 0n,
    feeTier,
    modo: 1,
    objetivoBps: Math.round(p.objetivoPct * 10000),
    factorBps: Math.round(factor * 10000),
    compraInicialQuote: aBI(compraInicial, p.decQuote), margenBps: 0,
    _Pnow: Pnow, _ordenQuote: ordenQuote, _compraInicial: compraInicial, _precios: precios,
    _promedioEstimado: (compraInicial + restante) / ((compraInicial / Pnow) + niveles.reduce((a, nv, i) => a + (ordenQuote * (1 + factor * (n - 1 - i))) / precios[i], 0))
  };
}

/* ================================================================== */
/* Escrituras (el usuario firma)                                       */
/* ================================================================== */

/** Aprueba al GridBot para gastar un token, por un MONTO LIMITADO (no ilimitado).
 *  `montoBI` es la cantidad en unidades del token (BigInt). Un permiso finito evita
 *  que la wallet muestre el aviso rojo de "permiso ilimitado". */
export async function aprobarToken(tokenAddr, montoBI) {
  const s = await firmante();
  const t = new ethers.Contract(tokenAddr, ERC20, s);
  const monto = (typeof montoBI === 'bigint') ? montoBI : ethers.MaxUint256;
  const tx = await t.approve(GRIDBOT, monto, { gasLimit: 120000n });
  return esperar(tx);
}

/** Revoca el permiso: pone el allowance del token a 0 para el GridBot. */
export async function revocarToken(tokenAddr) {
  const s = await firmante();
  const t = new ethers.Contract(tokenAddr, ERC20, s);
  const tx = await t.approve(GRIDBOT, 0n, { gasLimit: 120000n });
  return esperar(tx);
}

export async function estaActivo(cuenta) {
  try { return await cLee().activo(cuenta); } catch (_) { return false; }
}
export async function precioSub() {
  try { return await cLee().precioSuscripcion(); } catch (_) { return 0n; }
}
export async function suscribir() {
  const precio = await cLee().precioSuscripcion();
  const bot = await cEscribe();
  const tx = await bot.suscribir({ value: precio, gasLimit: 220000n });
  return esperar(tx);
}

/** Config del BOT CASH OUT (modo 2): vende una cantidad que YA tienes, al objetivo. */
export async function construirConfigDCA(p) {
  const rutas = p.rutas || await resolverRutas(p.base, p.quote, p.decBase, p.decQuote);
  const { precio: Pnow } = await precioPar(p.base, p.quote, p.decBase, p.decQuote, rutas);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  const montoQuote = Number(p.montoQuote);          // $ (quote) por compra
  if (!(montoQuote > 0)) throw new Error('Indica cuánto comprar en cada compra');
  const intervalo = Math.floor(Number(p.intervalo));// segundos entre compras
  if (!(intervalo > 0)) throw new Error('Indica cada cuánto comprar');
  const comprasMax = Math.floor(Number(p.comprasMax) || 0);   // 0 = infinito

  const feeTier = await mejorFeeTier(p.quote, p.base, aBI(montoQuote, p.decQuote));
  if (!feeTier) throw new Error('Esta moneda no tiene pool en PancakeSwap V3. Prueba con otra.');

  let ordenQuote = aBI(montoQuote, p.decQuote); if (ordenQuote <= 0n) ordenQuote = 1n;

  return {
    base: p.base, quote: p.quote,
    pathCompra: rutas.compra, pathVenta: rutas.venta,
    ordenQuote, ordenBase: 0n,
    // El modo 3 (DCA) compra por TIEMPO, no por niveles: no usa ninguno. Pero el contrato
    // exige niveles.length > 0. Metemos un nivel "fantasma" inerte (el keeper del DCA usa
    // comprarDCA, nunca ejecutar, así que este nivel jamás se toca).
    niveles: [{ minOutCompra: 0n, minOutVenta: 0n, estado: 0 }],
    slippageBps: p.slippageBps || 0, cooldownSeg: 0,
    tpUnitOut: 0n, slUnitOut: 0n,
    feeTier,
    modo: 3,
    objetivoBps: 0, factorBps: 0,
    compraInicialQuote: 0n,
    margenBps: 0,
    intervalo, comprasMax,
    _Pnow: Pnow, _montoQuote: montoQuote, _intervalo: intervalo, _comprasMax: comprasMax
  };
}

export async function construirConfigCashOut(p) {
  const rutas = p.rutas || await resolverRutas(p.base, p.quote, p.decBase, p.decQuote);
  const { precio: Pnow } = await precioPar(p.base, p.quote, p.decBase, p.decQuote, rutas);
  if (!(Pnow > 0)) throw new Error('No se pudo leer el precio del par');

  const cantidad = Number(p.cantidadBase);          // cantidad de la cripto a vender (humano)
  if (!(cantidad > 0)) throw new Error('Indica cuánto quieres vender');
  const targetPrice = Number(p.targetPrice);        // precio objetivo (humano)
  if (!(targetPrice > Pnow)) throw new Error('El objetivo debe estar por encima del precio actual');

  const valorActual = cantidad * Pnow;              // valor de referencia (quote) para calcular la ganancia
  const proceeds = cantidad * targetPrice;          // lo que recibirá al vender (quote)

  const feeTier = await mejorFeeTier(p.base, p.quote, aBI(cantidad, p.decBase));
  if (!feeTier) throw new Error('Esta moneda no tiene pool en PancakeSwap V3. Prueba con otra.');

  // Un solo nivel de VENTA al precio objetivo.
  const niveles = [{ minOutCompra: 0n, minOutVenta: aBI(proceeds, p.decQuote), estado: 2 }];

  let ordenBase = aBI(cantidad, p.decBase); if (ordenBase <= 0n) ordenBase = 1n;
  let ordenQuote = aBI(valorActual, p.decQuote); if (ordenQuote <= 0n) ordenQuote = 1n;

  return {
    base: p.base, quote: p.quote,
    pathCompra: rutas.compra, pathVenta: rutas.venta,
    ordenQuote, ordenBase,
    niveles,
    slippageBps: p.slippageBps || 0, cooldownSeg: 0,
    tpUnitOut: 0n, slUnitOut: 0n,
    feeTier,
    modo: 2,
    objetivoBps: 0, factorBps: 0,
    compraInicialQuote: aBI(valorActual, p.decQuote),   // valor declarado (para la ganancia)
    margenBps: 0,
    _Pnow: Pnow, _valorActual: valorActual, _proceeds: proceeds, _ganancia: proceeds - valorActual, _targetPrice: targetPrice
  };
}

export async function crearRejilla(config) {
  const c = {
    base: config.base, quote: config.quote,
    pathCompra: config.pathCompra, pathVenta: config.pathVenta,
    ordenQuote: config.ordenQuote, ordenBase: config.ordenBase,
    niveles: config.niveles,
    slippageBps: config.slippageBps, cooldownSeg: config.cooldownSeg,
    tpUnitOut: config.tpUnitOut, slUnitOut: config.slUnitOut,
    feeTier: config.feeTier ?? 500,
    modo: config.modo ?? 0,
    objetivoBps: config.objetivoBps ?? 0,
    factorBps: config.factorBps ?? 0,
    compraInicialQuote: config.compraInicialQuote ?? 0n,
    margenBps: config.margenBps ?? 0,
    botId: config.botId ?? 0,
    intervalo: config.intervalo ?? 0,
    comprasMax: config.comprasMax ?? 0
  };
  const bot = await cEscribe();
  const tx = await bot.crearRejilla(c, { gasLimit: 3000000n });
  return esperar(tx);
}

export async function cerrarAhora(base, quote) {
  const bot = await cEscribe(); const tx = await bot.cerrarAhora(base, quote, { gasLimit: 900000n }); return esperar(tx);
}
export async function resumenK(clave) { return leeGB('resumen(bytes32)', [clave]); }
export async function cerrarAhoraK(clave) {
  const bot = await cEscribe(); const tx = await bot['cerrarAhora(bytes32)'](clave, { gasLimit: 900000n }); return esperar(tx);
}
export async function cancelarRejillaK(clave) {
  const bot = await cEscribe(); const tx = await bot['cancelarRejilla(bytes32)'](clave, { gasLimit: 900000n }); return esperar(tx);
}
export async function cancelarRejilla(base, quote) {
  const bot = await cEscribe(); const tx = await bot.cancelarRejilla(base, quote, { gasLimit: 900000n }); return esperar(tx);
}
export async function activarRejilla(base, quote, activa) {
  const bot = await cEscribe(); const tx = await bot.activarRejilla(base, quote, activa, { gasLimit: 300000n }); return esperar(tx);
}
export async function setTPSL(base, quote, tpUnitOut, slUnitOut) {
  const bot = await cEscribe(); const tx = await bot.setTPSL(base, quote, tpUnitOut, slUnitOut); return esperar(tx);
}
export async function ajustarSlippage(base, quote, bps) {
  const bot = await cEscribe(); const tx = await bot.ajustarSlippage(base, quote, bps); return esperar(tx);
}
export async function ajustarCooldown(base, quote, seg) {
  const bot = await cEscribe(); const tx = await bot.ajustarCooldown(base, quote, seg); return esperar(tx);
}

/** Recarga el tanque de gas (BNB) del usuario. */
export async function depositarGas(bnbHumano) {
  const bot = await cEscribe();
  const tx = await bot.depositarGas({ value: ethers.parseEther(String(bnbHumano)), gasLimit: 160000n });
  return esperar(tx);
}
export async function retirarGas(bnbHumano) {
  const bot = await cEscribe();
  const tx = await bot.retirarGas(ethers.parseEther(String(bnbHumano)), { gasLimit: 200000n });
  return esperar(tx);
}

/* ================================================================== */
/* Utilidades de formato para la UI                                    */
/* ================================================================== */

export const fmt = ethers.formatUnits;
export const parse = ethers.parseUnits;
export const fmtBNB = ethers.formatEther;
export const checksum = ethers.getAddress;

/* ================================================================== */
/* SWAP — contrato independiente de intercambio (tarifa fija al owner) */
/* ================================================================== */
export const SWAP = '0xa15794D9c313F3E2726ED1D45A1B6CC72BFA2a0c';
const SWAP_ABI = [
  'function tarifaSwap() view returns (uint256)',
  'function owner() view returns (address)',
  'function swap(address tokenIn,address tokenOut,uint256 amountIn,uint256 minOut,uint24 fee) payable returns (uint256)'
];
const NATIVO = '0x0000000000000000000000000000000000000000';

/** ¿Es BNB nativo para el swap? (null o address(0)). */
export function esNativoSwap(addr) { return !addr || addr.toLowerCase() === NATIVO; }

/** Tarifa fija del swap (en wei de BNB). */
export async function tarifaSwap() {
  const c = new ethers.Contract(SWAP, SWAP_ABI, lector());
  try { return await c.tarifaSwap(); } catch { return 0n; }
}

/** Permiso del token hacia el contrato de SWAP (distinto al del bot). */
export async function allowanceSwap(tokenAddr, duenio) {
  const t = new ethers.Contract(tokenAddr, ERC20, lector());
  return t.allowance(duenio, SWAP);
}
/** Aprueba el token para el contrato de SWAP con un límite concreto (revocable).
 *  Se aprueba un monto finito (no ilimitado) para evitar el aviso de la wallet. */
export async function aprobarSwap(tokenAddr, montoBI) {
  const t = new ethers.Contract(tokenAddr, ERC20, await firmante());
  const monto = (montoBI && montoBI > 0n) ? montoBI : ethers.parseUnits('200', 18);
  const tx = await t.approve(SWAP, monto, { gasLimit: 120000n });
  return esperar(tx);
}
/** Revoca el permiso del token para el SWAP (allowance a 0). */
export async function revocarSwap(tokenAddr) {
  const t = new ethers.Contract(tokenAddr, ERC20, await firmante());
  const tx = await t.approve(SWAP, 0n, { gasLimit: 120000n });
  return esperar(tx);
}

/** Cotiza el swap por V3 (elige el mejor feeTier). null si no hay pool.
 *  inAddr/outAddr: null o address(0) = BNB nativo (se cotiza con WBNB). */
export async function cotizarSwap({ inAddr, outAddr, amountInBI, slippageBps = 50 }) {
  if (!(amountInBI > 0n)) return null;
  const qIn  = esNativoSwap(inAddr)  ? WBNB : inAddr;
  const qOut = esNativoSwap(outAddr) ? WBNB : outAddr;
  if (qIn.toLowerCase() === qOut.toLowerCase()) return null;
  const q = new ethers.Contract(QUOTER_V3, QUOTER_ABI, lector());
  let best = 0, bestOut = 0n;
  for (const fee of FEE_TIERS) {
    try {
      const r = await q.quoteExactInputSingle.staticCall({ tokenIn: qIn, tokenOut: qOut, amountIn: amountInBI, fee, sqrtPriceLimitX96: 0 });
      if (r[0] > bestOut) { bestOut = r[0]; best = fee; }
    } catch (_) {}
  }
  if (!best || bestOut === 0n) return null;
  const minOut = bestOut - (bestOut * BigInt(slippageBps) / 10000n);
  return { amountOut: bestOut, minOut, fee: best };
}

/** Ejecuta el swap. inAddr/outAddr: null o address(0) = BNB nativo.
 *  El contrato cobra la tarifa fija en BNB al owner y hace el intercambio. */
export async function ejecutarSwap({ inAddr, outAddr, amountInBI, minOut, fee }) {
  const c = new ethers.Contract(SWAP, SWAP_ABI, await firmante());
  const tarifa = await tarifaSwap();
  const tokenIn  = esNativoSwap(inAddr)  ? NATIVO : inAddr;
  const tokenOut = esNativoSwap(outAddr) ? NATIVO : outAddr;
  const value = esNativoSwap(inAddr) ? (tarifa + amountInBI) : tarifa;
  const tx = await c.swap(tokenIn, tokenOut, amountInBI, minOut, fee, { value, gasLimit: 700000n });
  return esperar(tx);
}

/* ================================================================== */
/* Importar cualquier token por dirección (estilo PancakeSwap)         */
/* ================================================================== */
const ERC20_META = [
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function decimals() view returns (uint8)'
];
/** ¿Es una dirección EVM válida? (tolerante a mayúsculas/minúsculas) */
const RE_ADDR = /^0x[0-9a-fA-F]{40}$/;
export function esDireccion(s) { return RE_ADDR.test((s || '').trim()); }
/** Lee symbol/name/decimals de un token ERC20 en BSC. Lanza si no es válido. */
export async function infoToken(addr) {
  const a = ethers.getAddress(addr.trim().toLowerCase());
  const t = new ethers.Contract(a, ERC20_META, lector());
  const [sym, dec] = await Promise.all([t.symbol(), t.decimals()]);
  let nom = sym; try { nom = await t.name(); } catch (_) {}
  return { address: a, simbolo: String(sym), nombre: String(nom), decimals: Number(dec) };
}

/** Modo/tipo de un bot: 0=Grid, 1=Acumulador, 2=Cash Out, 3=DCA. */
export async function modoDe(clave) { return leeGB('modoDe(bytes32)', [clave]); }
