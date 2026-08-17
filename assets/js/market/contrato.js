/* market/contrato.js — Lectura del contrato del Marketplace con rotación de
   RPCs (si un nodo falla, prueba el siguiente). Usado por todos los paneles.
   Extraído de market.js. */

import * as ethers from '../vendor/ethers-6.13.4.min.js?v=125';
import { MARKET, ABI, RPCS } from './config.js?v=1';

let _i = 0;
export async function lee(fn, args = []) {
  for (let k = 0; k < RPCS.length; k++) {
    try {
      const c = new ethers.Contract(MARKET, ABI, new ethers.JsonRpcProvider(RPCS[_i % RPCS.length], 56, { staticNetwork: true }));
      return await c[fn](...args);
    } catch (e) { _i++; await new Promise(r => setTimeout(r, 150)); }
  }
  throw new Error('rpc');
}
