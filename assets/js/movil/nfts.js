/* movil/nfts.js — Lee NFTs (ERC-721) y actividad de tokens de la wallet
   directamente de la blockchain con el RPC que la app ya usa. Sin APIs de pago.
   Método: escanea eventos Transfer hacia/desde la dirección, verifica propiedad
   (ownerOf) y resuelve metadata (tokenURI). */

import * as ethers from '../vendor/ethers-6.13.4.min.js?v=125';

const RPCS = ['https://bsc-dataseed.binance.org', 'https://bsc-rpc.publicnode.com', 'https://bsc-dataseed1.defibit.io'];
const TRANSFER = ethers.id('Transfer(address,address,uint256)');
const GW = (u) => (u || '').replace('ipfs://ipfs/', 'https://ipfs.io/ipfs/').replace('ipfs://', 'https://ipfs.io/ipfs/');
const ERC721_ABI = [
  'function ownerOf(uint256) view returns (address)',
  'function tokenURI(uint256) view returns (string)',
  'function name() view returns (string)',
];

function prov() {
  try { if (typeof window !== 'undefined' && window.ethereum) return new ethers.BrowserProvider(window.ethereum); } catch (_) {}
  return new ethers.JsonRpcProvider(RPCS[0], 56, { staticNetwork: true });
}

async function getLogsSeguro(p, filtro) {
  // Intenta rango completo (nodos con índice por topic). Si falla, por tramos.
  try { return await p.getLogs(Object.assign({ fromBlock: 0, toBlock: 'latest' }, filtro)); } catch (_) {}
  const out = [];
  try {
    const latest = await p.getBlockNumber();
    const paso = 200000; let end = latest;
    for (let i = 0; i < 25 && end > 0 && out.length < 800; i++) {
      const from = Math.max(0, end - paso);
      try { const part = await p.getLogs(Object.assign({ fromBlock: from, toBlock: end }, filtro)); out.push(...part); } catch (_) {}
      end = from - 1;
    }
  } catch (_) {}
  return out;
}

/* Devuelve [{addr, id, name, image}] de los NFTs que la wallet posee ahora. */
export async function leerNFTs(cuenta, onProgreso) {
  const p = prov();
  const toTopic = ethers.zeroPadValue(cuenta, 32);
  const logs = await getLogsSeguro(p, { topics: [TRANSFER, null, toTopic] });
  // ERC-721: el tokenId va indexado → 4 topics. ERC-20: 3 topics (value en data).
  const cand = new Map();
  for (const l of logs) { if (l.topics.length === 4) { const id = BigInt(l.topics[3]).toString(); cand.set(l.address.toLowerCase() + ':' + id, { addr: l.address, id }); } }
  const lista = [...cand.values()].slice(0, 60);
  const owned = [];
  for (const { addr, id } of lista) {
    try {
      const c = new ethers.Contract(addr, ERC721_ABI, p);
      const owner = await c.ownerOf(id).catch(() => null);
      if (!owner || owner.toLowerCase() !== cuenta.toLowerCase()) continue;   // ya no lo tiene
      let meta = {}, nm = '';
      try { const uri = GW(await c.tokenURI(id)); if (uri) { const r = await fetch(uri); if (r.ok) meta = await r.json(); } } catch (_) {}
      try { nm = await c.name(); } catch (_) {}
      owned.push({ addr, id, name: (meta && meta.name) || (nm ? `${nm} #${id}` : `NFT #${id}`), image: GW(meta && (meta.image || meta.image_url)) });
      if (onProgreso) onProgreso(owned.slice());
    } catch (_) {}
    if (owned.length >= 24) break;
  }
  return owned;
}

/* Actividad reciente de tokens (entradas/salidas) de la wallet. */
export async function leerActividad(cuenta) {
  const p = prov();
  const meTopic = ethers.zeroPadValue(cuenta, 32);
  const [entradas, salidas] = await Promise.all([
    getLogsSeguro(p, { topics: [TRANSFER, null, meTopic] }),
    getLogsSeguro(p, { topics: [TRANSFER, meTopic] }),
  ]);
  const ev = [];
  for (const l of entradas) ev.push({ dir: 'in', addr: l.address, bloque: l.blockNumber, erc721: l.topics.length === 4, tokenId: l.topics.length === 4 ? BigInt(l.topics[3]).toString() : null });
  for (const l of salidas) ev.push({ dir: 'out', addr: l.address, bloque: l.blockNumber, erc721: l.topics.length === 4, tokenId: l.topics.length === 4 ? BigInt(l.topics[3]).toString() : null });
  ev.sort((a, b) => b.bloque - a.bloque);
  return ev.slice(0, 30);
}
