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
const CLAVE_PREF = 'aurex-wallet';

/* ══════════════ WalletConnect ══════════════
   Sirve cuando NO hay wallet dentro del navegador: la app instalada en el
   teléfono, o un ordenador sin extensión. El usuario aprueba en su wallet
   (que se abre encima) o escanea un QR, y vuelve aquí con la sesión lista.
   La librería pesa, así que se carga SOLO al pulsar conectar.            */
const WC_PROJECT_ID = 'd71edd60ffa5f29b2c6e1b366797bc2f';
let _wcProv = null, _wcCargando = null;

function cargarWC() {
  if (window['@walletconnect/ethereum-provider']) return Promise.resolve(true);
  if (_wcCargando) return _wcCargando;
  _wcCargando = new Promise((res) => {
    // La librería espera variables que en el navegador no existen.
    window.global = window.global || window;
    window.process = window.process || { env: {}, version: '', nextTick: (f) => setTimeout(f, 0) };
    window.Buffer = window.Buffer || undefined;
    const sc = document.createElement('script');
    // Ruta absoluta desde la raíz del sitio: funciona igual en la app instalada.
    sc.src = new URL('vendor/walletconnect.umd.js?v=84', new URL('./', import.meta.url)).href;
    sc.async = true;
    sc.onload = () => res(!!window['@walletconnect/ethereum-provider']);
    sc.onerror = () => res(false);
    document.head.appendChild(sc);
    setTimeout(() => res(!!window['@walletconnect/ethereum-provider']), 25000);   // conexiones lentas
  });
  return _wcCargando;
}

/** ¿Merece la pena ofrecer WalletConnect? (no hay wallet dentro del navegador) */
export function necesitaWalletConnect() {
  return !window.ethereum && proveedores6963.length === 0;
}

/** Conecta por WalletConnect. Abre la wallet del móvil o muestra un QR. */
export async function conectarWalletConnect() {
  if (!(await cargarWC())) {
    throw new Error('WC_CARGA: no se pudo descargar la pieza de conexión (850 KB). Revisa tu conexión e inténtalo otra vez.');
  }
  const ns = window['@walletconnect/ethereum-provider'];
  const EthereumProvider = ns && (ns.EthereumProvider || ns.default);
  if (!EthereumProvider) throw new Error('WC_LIB: la pieza de conexión no se cargó bien. Recarga la app.');

  if (!_wcProv) {
    try {
      _wcProv = await EthereumProvider.init({
      projectId: WC_PROJECT_ID,
      chains: [56],                       // BNB Smart Chain
      optionalChains: [56],
      showQrModal: true,                  // QR en ordenador, enlace directo en móvil
      rpcMap: { 56: 'https://bsc-dataseed.binance.org' },
      metadata: {
        name: 'Aurex Finance',
        description: 'Bots que compran barato y venden caro por ti, en tu propia wallet.',
        url: location.origin + location.pathname.replace(/[^/]*$/, ''),
        icons: [location.origin + location.pathname.replace(/[^/]*$/, '') + 'assets/img/apple-touch-icon.png']
      }
      });
    } catch (e) {
      throw new Error('WC_INIT: ' + (e?.message || e));
    }
  }

  try { await _wcProv.connect(); }
  catch (e) {
    const m = String(e?.message || e || '');
    if (/reject|denied|cancel|closed/i.test(m)) throw new Error('Cancelaste la conexión.');
    throw new Error('WC_CONN: ' + m);
  }
  const cuentas = _wcProv.accounts || [];
  if (!cuentas.length) throw new Error('SIN_CUENTAS');

  est.proveedor = _wcProv;
  est.cuenta = cuentas[0];
  est.chainId = '0x38';
  est.info = { name: 'WalletConnect', icon: '' };
  engancharEventos(_wcProv);
  guardarPref('walletconnect');
  try { localStorage.removeItem(CLAVE_SALIDA); } catch (_) {}
  avisar();
  return est.cuenta;
}
const idDe = (d) => String(d?.info?.rdns || d?.info?.uuid || d?.info?.name || '').toLowerCase();
const prefGuardada = () => { try { return localStorage.getItem(CLAVE_PREF) || ''; } catch (_) { return ''; } };
const guardarPref = (id) => { try { id ? localStorage.setItem(CLAVE_PREF, id) : localStorage.removeItem(CLAVE_PREF); } catch (_) {} };
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

  // Si el usuario eligió una wallet a mano, esa manda.
  const pref = prefGuardada();
  if (pref) {
    const elegida = proveedores6963.find((d) => idDe(d) === pref);
    if (elegida?.provider) return elegida.provider;
  }

  // Preferimos MetaMask de verdad. Las wallets integradas del navegador
  // (p. ej. la de Brave) se anuncian aunque no estén configuradas y no responden.
  const esBrave = (p) => !!(p && (p.isBraveWallet || p.isBrave));
  const esMM = (p) => !!(p && p.isMetaMask && !esBrave(p));

  const mm = proveedores6963.find((d) => esMM(d.provider)
    || String(d?.info?.rdns || '').toLowerCase() === 'io.metamask');
  if (mm?.provider) return mm.provider;

  const eth = window.ethereum;
  if (eth?.providers?.length) {
    const m = eth.providers.find(esMM);
    if (m) return m;
  }
  if (esMM(eth)) return eth;

  const otra = proveedores6963.find((d) => !esBrave(d.provider));
  if (otra?.provider) return otra.provider;
  if (proveedores6963.length > 0) return proveedores6963[0].provider;
  return eth ?? null;
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




/** Wallets que el navegador ofrece (con su logo oficial, que envía la propia wallet). */
export function walletsDisponibles() {
  return proveedores6963.map((d) => ({
    id: idDe(d),
    nombre: d?.info?.name || 'Wallet',
    icono: d?.info?.icon || '',
    activa: est.proveedor === d.provider
  }));
}

/** Conecta con la wallet que el usuario eligió y la recuerda para la próxima. */
export async function conectarCon(id) {
  const d = proveedores6963.find((x) => idDe(x) === String(id).toLowerCase());
  if (!d) throw new Error('NO_WALLET');
  guardarPref(idDe(d));
  est.proveedor = d.provider;
  est.info = d.info;
  est.cuenta = null;
  return conectar();
}

/** Vuelve a la elección automática. */
export function olvidarWallet() { guardarPref(''); }

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
export async function reconectarSiProcede() {
  if (localStorage.getItem(CLAVE_SALIDA) === '1') return null;

  const prov = detectar();
  if (!prov) return null;

  try {
    const cuentas = await prov.request({ method: 'eth_accounts' });
    if (cuentas?.length) {
      est.proveedor = prov;
      est.cuenta = cuentas[0];
      est.chainId = await prov.request({ method: 'eth_chainId' });
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
