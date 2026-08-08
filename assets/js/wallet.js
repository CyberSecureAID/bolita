/**
 * WALLET
 * ======
 *
 * Conexión EIP-1193 / EIP-6963: MetaMask, Trust, Rabby, OKX, Phantom en modo
 * EVM y cualquier otra que inyecte proveedor. Sin librerías.
 *
 * Hace tres cosas:
 *   1. Conectar y DESCONECTAR a voluntad
 *   2. Leer el saldo de la moneda nativa y de cualquier token ERC-20
 *   3. Detectar cuáles de las monedas admitidas tiene el usuario
 *
 * La desconexión es local: las wallets no permiten que una web revoque su
 * propio permiso. Lo que se hace es olvidar la cuenta y dejar de escuchar,
 * que a efectos del usuario es exactamente desconectarse.
 */

import { RED, LISTA_MONEDAS, desdeBase } from './tokens.js';

const CLAVE_SALIDA = 'bolita.desconectado';

const est = {
  proveedor: null,
  cuenta: null,
  chainId: null,
  oyentes: new Set(),
  manejadores: null
};

/* ================================================================== */
/* Detección                                                           */
/* ================================================================== */

const proveedores6963 = [];
if (typeof window !== 'undefined') {
  window.addEventListener('eip6963:announceProvider', (e) => {
    if (!proveedores6963.some((p) => p.info?.uuid === e.detail.info?.uuid)) {
      proveedores6963.push(e.detail);
    }
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));
}

function detectar() {
  if (est.proveedor) return est.proveedor;
  if (proveedores6963.length > 0) return proveedores6963[0].provider;
  return window.ethereum ?? null;
}

export const hayWallet = () => Boolean(detectar());

/** Por qué no se puede conectar, para poder decírselo al usuario. */
export function diagnostico() {
  if (detectar()) return { ok: true };

  const ua = navigator.userAgent || '';
  const movil = /Android|iPhone|iPad|iPod/i.test(ua);

  return {
    ok: false,
    movil,
    motivo: movil
      ? 'En el móvil hay que abrir la página DENTRO del navegador de la wallet (MetaMask, Trust…), no en Chrome ni Safari.'
      : 'No se detectó ninguna wallet. Instala MetaMask, Rabby o Trust Wallet y recarga la página.'
  };
}
export const cuentaActual = () => est.cuenta;
export const chainActual = () => est.chainId;
export const esRedCorrecta = () => est.chainId === RED.chainIdHex;

/** Nombre e icono de la wallet conectada (para mostrar su logo). */
export function walletInfo() {
  return est.info ?? null;
}

/**
 * Si la wallet no llegó por EIP-6963, adivinar cuál es por las banderas que
 * inyecta en el proveedor (isMetaMask, isTrust, isPhantom, etc.).
 */
function adivinarInfo(prov) {
  if (!prov) return null;
  if (prov.isTrust || prov.isTrustWallet) return { name: 'Trust Wallet', clave: 'trust' };
  if (prov.isPhantom) return { name: 'Phantom', clave: 'phantom' };
  if (prov.isCoinbaseWallet) return { name: 'Coinbase Wallet', clave: 'coinbase' };
  if (prov.isBinance) return { name: 'Binance Wallet', clave: 'binance' };
  if (prov.isRabby) return { name: 'Rabby', clave: 'rabby' };
  if (prov.isMetaMask) return { name: 'MetaMask', clave: 'metamask' };
  return { name: 'Wallet', clave: 'generica' };
}

export function abreviar(dir) {
  return dir ? dir.slice(0, 6) + '…' + dir.slice(-4) : '';
}

export function alCambiar(cb) {
  est.oyentes.add(cb);
  return () => est.oyentes.delete(cb);
}

function avisar() {
  for (const cb of est.oyentes) {
    try { cb({ cuenta: est.cuenta, chainId: est.chainId }); } catch { /* nada */ }
  }
}

/* ================================================================== */
/* Conectar y desconectar                                              */
/* ================================================================== */

function engancharEventos(prov) {
  soltarEventos();

  const onCuentas = (nuevas) => {
    est.cuenta = nuevas?.[0] ?? null;
    if (!est.cuenta) localStorage.setItem(CLAVE_SALIDA, '1');
    avisar();
  };
  const onCadena = (id) => { est.chainId = id; avisar(); };

  prov.on?.('accountsChanged', onCuentas);
  prov.on?.('chainChanged', onCadena);
  est.manejadores = { prov, onCuentas, onCadena };
}

function soltarEventos() {
  if (!est.manejadores) return;
  const { prov, onCuentas, onCadena } = est.manejadores;
  prov.removeListener?.('accountsChanged', onCuentas);
  prov.removeListener?.('chainChanged', onCadena);
  est.manejadores = null;
}

export async function conectar() {
  const prov = detectar();
  if (!prov) throw new Error('NO_WALLET');

  est.proveedor = prov;

  // Guardar la info del proveedor (nombre e icono) si vino por EIP-6963
  const encontrado = proveedores6963.find((p) => p.provider === prov);
  est.info = encontrado?.info ?? adivinarInfo(prov);

  const cuentas = await prov.request({ method: 'eth_requestAccounts' });
  if (!cuentas?.length) throw new Error('SIN_CUENTAS');

  est.cuenta = cuentas[0];
  est.chainId = await prov.request({ method: 'eth_chainId' });

  engancharEventos(prov);
  localStorage.removeItem(CLAVE_SALIDA);   // vuelve a reconectar sola
  avisar();

  return est.cuenta;
}

/**
 * Desconecta. Olvida la cuenta, suelta los eventos y borra la sesión, para
 * que al recargar no vuelva a entrar sola.
 *
 * Si la wallet admite revocar permisos (MetaMask lo hace), se le pide también,
 * pero no se depende de ello: da igual si lo rechaza.
 */
export async function desconectar() {
  const prov = est.proveedor;

  if (prov?.request) {
    try {
      await prov.request({
        method: 'wallet_revokePermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch { /* la wallet no lo admite: seguimos igual */ }
  }

  soltarEventos();
  est.cuenta = null;
  est.chainId = null;
  est.proveedor = null;
  localStorage.setItem(CLAVE_SALIDA, '1');  // no reconectar sola
  avisar();
}

/**
 * Reconecta sola si la wallet ya tiene permiso concedido, SALVO que el
 * usuario se haya desconectado a mano. Así vuelve el comportamiento de
 * antes sin romper el botón de desconectar.
 */
/** Pide algo a la wallet, pero se rinde a los 3,5 s.
 *  Hay extensiones rotas cuyas peticiones no responden NUNCA (ni bien ni mal).
 *  Sin este límite, la página se quedaría cargando para siempre. */
function pedirConLimite(prov, args, ms = 3500) {
  return Promise.race([
    prov.request(args),
    new Promise((_, rej) => setTimeout(() => rej(new Error('wallet no responde')), ms))
  ]);
}

export async function reconectarSiProcede() {
  if (localStorage.getItem(CLAVE_SALIDA) === '1') return null;

  const prov = detectar();
  if (!prov) return null;

  try {
    const cuentas = await pedirConLimite(prov, { method: 'eth_accounts' });
    if (cuentas?.length) {
      est.proveedor = prov;
      est.cuenta = cuentas[0];
      est.chainId = await pedirConLimite(prov, { method: 'eth_chainId' });
      engancharEventos(prov);
      avisar();
      return est.cuenta;
    }
  } catch { /* nada */ }

  return null;
}

export async function cambiarARedCorrecta() {
  const prov = est.proveedor ?? detectar();
  if (!prov) throw new Error('NO_WALLET');

  try {
    await prov.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: RED.chainIdHex }]
    });
  } catch (err) {
    if (err?.code === 4902) {
      await prov.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: RED.chainIdHex,
          chainName: RED.nombre,
          nativeCurrency: RED.moneda,
          rpcUrls: [RED.rpc],
          blockExplorerUrls: [RED.explorador]
        }]
      });
    } else throw err;
  }
}

/* ================================================================== */
/* Saldos                                                              */
/* ================================================================== */

/** Selector de balanceOf(address) = 0x70a08231 */
const SEL_BALANCE = '0x70a08231';

async function llamar(metodo, params) {
  const prov = est.proveedor ?? detectar();
  if (!prov) throw new Error('NO_WALLET');
  return prov.request({ method: metodo, params });
}

/** Saldo de una moneda concreta, ya en unidades decimales. */
export async function saldoDe(moneda, cuenta = est.cuenta) {
  if (!cuenta) return null;

  try {
    if (moneda.address === null) {
      const hex = await llamar('eth_getBalance', [cuenta, 'latest']);
      return desdeBase(hex, moneda.decimals);
    }

    const data = SEL_BALANCE + cuenta.slice(2).toLowerCase().padStart(64, '0');
    const hex = await llamar('eth_call', [{ to: moneda.address, data }, 'latest']);

    if (!hex || hex === '0x') return 0;
    return desdeBase(hex, moneda.decimals);
  } catch {
    return null;
  }
}

/**
 * Lee el saldo de TODAS las monedas admitidas.
 * Con esto la interfaz puede marcar cuáles tiene el usuario de verdad.
 *
 * @returns {Promise<Record<string, number|null>>}
 */
export async function saldosTodas(cuenta = est.cuenta) {
  if (!cuenta) return {};

  const pares = await Promise.all(
    LISTA_MONEDAS.map(async (m) => [m.id, await saldoDe(m, cuenta)])
  );

  return Object.fromEntries(pares);
}
