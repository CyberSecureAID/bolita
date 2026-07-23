/**
 * Conexion de wallet (EIP-1193 / EIP-6963).
 *
 * Funciona con MetaMask, Trust Wallet, Phantom en modo EVM, Rabby, OKX y
 * cualquier otra que inyecte `window.ethereum`. No usa librerias externas.
 *
 * De momento solo conecta y muestra la cuenta y la red: todavia no hay
 * contrato desplegado. Cuando lo haya, `enviarTransaccion` es el punto por
 * donde entra.
 */

const BSC = {
  chainIdHex: '0x38',
  chainId: 56,
  chainName: 'BNB Smart Chain',
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: ['https://bsc-dataseed.binance.org'],
  blockExplorerUrls: ['https://bscscan.com']
};

const estado = {
  proveedor: null,
  cuenta: null,
  chainId: null,
  oyentes: new Set()
};

/** Detecta wallets anunciadas por EIP-6963 y tambien la clasica window.ethereum. */
function detectarProveedor() {
  if (estado.proveedor) return estado.proveedor;

  const encontrados = [];
  window.addEventListener('eip6963:announceProvider', (e) => {
    encontrados.push(e.detail);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  if (encontrados.length > 0) return encontrados[0].provider;
  return window.ethereum ?? null;
}

export function hayWallet() {
  return Boolean(window.ethereum) || Boolean(estado.proveedor);
}

export function cuentaActual() {
  return estado.cuenta;
}

export function abreviar(dir) {
  if (!dir) return '';
  return dir.slice(0, 6) + '…' + dir.slice(-4);
}

export function alCambiar(callback) {
  estado.oyentes.add(callback);
  return () => estado.oyentes.delete(callback);
}

function avisar() {
  for (const cb of estado.oyentes) {
    try { cb({ cuenta: estado.cuenta, chainId: estado.chainId }); } catch { /* ignorar */ }
  }
}

/** Abre la wallet y pide permiso. Devuelve la cuenta o lanza error. */
export async function conectar() {
  const proveedor = detectarProveedor();

  if (!proveedor) {
    throw new Error('NO_WALLET');
  }

  estado.proveedor = proveedor;

  const cuentas = await proveedor.request({ method: 'eth_requestAccounts' });
  if (!cuentas || cuentas.length === 0) throw new Error('SIN_CUENTAS');

  estado.cuenta = cuentas[0];
  estado.chainId = await proveedor.request({ method: 'eth_chainId' });

  proveedor.on?.('accountsChanged', (nuevas) => {
    estado.cuenta = nuevas?.[0] ?? null;
    avisar();
  });

  proveedor.on?.('chainChanged', (id) => {
    estado.chainId = id;
    avisar();
  });

  avisar();
  return estado.cuenta;
}

export function desconectar() {
  estado.cuenta = null;
  avisar();
}

export function esRedCorrecta() {
  return estado.chainId === BSC.chainIdHex;
}

/** Pide cambiar a BNB Smart Chain, y la añade si la wallet no la tiene. */
export async function cambiarARedCorrecta() {
  if (!estado.proveedor) throw new Error('NO_WALLET');

  try {
    await estado.proveedor.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: BSC.chainIdHex }]
    });
  } catch (err) {
    // 4902 = la red no esta añadida en la wallet
    if (err?.code === 4902) {
      await estado.proveedor.request({
        method: 'wallet_addEthereumChain',
        params: [BSC]
      });
    } else {
      throw err;
    }
  }
}

/** Reconecta en silencio si el usuario ya habia dado permiso antes. */
export async function reconectarSiProcede() {
  const proveedor = detectarProveedor();
  if (!proveedor) return null;

  try {
    const cuentas = await proveedor.request({ method: 'eth_accounts' });
    if (cuentas?.length) {
      estado.proveedor = proveedor;
      estado.cuenta = cuentas[0];
      estado.chainId = await proveedor.request({ method: 'eth_chainId' });
      avisar();
      return estado.cuenta;
    }
  } catch { /* la wallet no responde */ }

  return null;
}
