// admin.js — Panel administrativo OCULTO. Módulo independiente.
//
// CÓMO SE ABRE
//   5 clics seguidos en la esquina inferior izquierda de la página.
//   No hay botón, ni enlace, ni pista visual. Si quien lo hace NO es owner de
//   los contratos, no pasa absolutamente nada: ni se abre, ni avisa, ni deja
//   rastro. Un curioso no sabrá nunca que existe.
//
// SEGURIDAD
//   · La comprobación de owner se hace LEYENDO LOS CONTRATOS, no la web.
//   · Toda acción se firma con la wallet. Sin firma no pasa nada.
//   · Antes de cada acción sensible sale una confirmación que explica qué hace.

import * as ethers from './vendor/ethers-6.13.4.min.js?v=106';
import * as wallet from './wallet.js?v=106';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── Contratos del ecosistema ────────────────────────────────────────────── */
const CONTRATOS = {
  bots:   { dir: '0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B', nombre: 'Bots (GridBot)',  proxy: true },
  market: { dir: '0x1131c4760Da083aaFCf20d6848Af93A8a2edFb18', nombre: 'Marketplace',      proxy: true },
  prize:  { dir: '0x595CD563F236DAEba21219D60AEF656a750A8132', nombre: 'Prize Pool',       proxy: true },
  swap:   { dir: '0xa15794D9c313F3E2726ED1D45A1B6CC72BFA2a0c', nombre: 'Swap',             proxy: false }
};
const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-rpc.publicnode.com'
];
const KEEPER = 'https://bolita-keeper-bot.yamicelanvivesqui.workers.dev';

/* Contrato de la lotería (la antigua "bolita"), que sigue vivo en el repo. */
const LOTERIA = '0x964a68D3A2dB18c723581410C49aa8789048E1B9';
const ABI_LOTERIA = [
  'function saldoDe(address jugador, address token) view returns (uint256)',
  'function retirar(address token)',
  // El dinero del dueño NO es el saldo de jugador: vive en "banca" (lo que
  // depositó para pagar premios) y en "beneficios" (su comisión acumulada).
  'function monedas(address) view returns (bool activa,bool esNativa,bool conComision,uint8 decimales,uint256 minApuesta,uint256 banca,uint256 reservado,uint256 topePremioBps,uint256 beneficios,address feedPrecio,bool cuentaVolumen,bool esEstableUSD)',
  'function owner() view returns (address)',
  'function ownerSecundario() view returns (address)',
  'function destinoBeneficios() view returns (address)'
];
/* Nombres posibles de las funciones de retirada: probamos en orden hasta que
   una funcione, porque el contrato desplegado puede usar cualquiera. */
const FIRMAS_BANCA = [
  'function retirarBanca(address token, uint256 cantidad)',
  'function retirarBanca(address token)',
  'function sacarBanca(address token, uint256 cantidad)',
  'function withdrawBankroll(address token, uint256 cantidad)',
  'function withdrawBankroll(uint256 cantidad)'
];
const FIRMAS_BENEF = [
  'function retirarBeneficios(address token, uint256 cantidad)',
  'function retirarBeneficios(address token)',
  'function sacarBeneficios(address token)',
  'function withdrawFees(address token)'
];
/* Las 8 monedas REALES de la lotería, sacadas de tokens.js (no inventadas). */
const MONEDAS_LOTERIA = [
  { id: 'BNB',      nom: 'BNB',       sim: 'BNB',      dir: null,                                          dec: 18 },
  { id: 'USDT',     nom: 'Tether',    sim: 'USDT',     dir: '0x55d398326f99059fF775485246999027B3197955',  dec: 18 },
  { id: 'USDC',     nom: 'USD Coin',  sim: 'USDC',     dir: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',  dec: 18 },
  { id: 'BTCB',     nom: 'Bitcoin',   sim: 'BTCB',     dir: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',  dec: 18 },
  { id: 'ETH',      nom: 'Ethereum',  sim: 'ETH',      dir: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',  dec: 18 },
  { id: 'USDTZ',    nom: 'USDT.z',    sim: 'USDT.z',   dir: '0x4BE35Ec329343d7d9F548d42B0F8c17FFfe07db4',  dec: 18 },
  { id: 'BABYDOGE', nom: 'Baby Doge', sim: 'BabyDoge', dir: '0xc748673057861a797275CD8A068AbB95A902e8de',  dec: 9  },
  { id: 'EXT',      nom: 'EXT',       sim: 'EXT',      dir: '0xd86b5cd7cFC28a1e4Fd6b39F133bF64EF24c5246',  dec: 18 }
];

/* ABI mínimo común a todos (Ownable) */
const ABI_OWNER = [
  'function owner() view returns (address)',
  'function transferOwnership(address newOwner)',
  'function paused() view returns (bool)',
  'function pause()',
  'function unpause()'
];
const ABI_MARKET = [
  ...ABI_OWNER,
  'function totalOrdenes() view returns (uint256)',
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador,uint8 tipo,string motivo,uint64 disputaEn,bool cancelaV,bool cancelaC))',
  'function resolverDisputa(uint256,bool)',
  'function anularDisputa(uint256)',
  'function setArbitro(address,bool)',
  'function setToken(address,bool)',
  'function setFianzaMinima(uint256)',
  'function setComision(uint256,uint256)',
  'function setPlazos(uint64,uint64,uint64,uint64)',
  'function fianzaMinima() view returns (uint256)'
];
const ABI_PRIZE = [
  ...ABI_OWNER,
  'function currentRound() view returns (uint256)',
  'function rounds(uint256) view returns (tuple(uint8 state,uint64 startTime,uint64 endTime,uint64 drawRequestedAt,uint256 pool,uint256 tickets))',
  'function saldoGas() view returns (uint256,uint256,uint256)',
  'function gasFaltante() view returns (uint256)',
  'function setFeeWallet(address)',
  'function setBloqueoSalida(uint256)',
  'function setGasFunding(uint256,uint256)',
  'function sweepBnb(address,uint256)',
  'function forzarReembolso(uint256)',
  'function cerrarRonda()'
];
const ABI_BOTS = [
  ...ABI_OWNER,
  'function precioSub() view returns (uint256)',
  'function gasMinOp() view returns (uint256)'
];

/* ── Lectura (sin wallet, por RPC público) ───────────────────────────────── */
let _prov = null;
function lector() {
  if (!_prov) _prov = new ethers.JsonRpcProvider(RPCS[0], 56, { staticNetwork: true });
  return _prov;
}
const leerC = (dir, abi) => new ethers.Contract(dir, abi, lector());
async function firmante() {
  const p = new ethers.BrowserProvider(wallet.proveedorActual ? wallet.proveedorActual() : window.ethereum);
  return p.getSigner();
}
const escribirC = async (dir, abi) => new ethers.Contract(dir, abi, await firmante());

/* ── ¿Esta wallet manda en algún contrato? ───────────────────────────────── */
async function permisos(cuenta) {
  if (!cuenta) return null;
  const yo = String(cuenta).toLowerCase();
  const res = {};
  await Promise.all(Object.entries(CONTRATOS).map(async ([k, c]) => {
    try {
      const o = await leerC(c.dir, ABI_OWNER).owner();
      res[k] = { owner: o, mio: String(o).toLowerCase() === yo };
    } catch (_) { res[k] = { owner: null, mio: false }; }
  }));
  res.alguno = Object.values(res).some((x) => x && x.mio);
  return res;
}

/* ══════════════════ ACTIVACIÓN OCULTA ══════════════════ */
let _clics = 0, _tClics = null, _abriendo = false;

export function iniciarPanelOculto() {
  const zona = document.createElement('div');
  zona.id = 'adm-zona';
  zona.setAttribute('aria-hidden', 'true');
  document.body.appendChild(zona);

  const golpe = async () => {
    _clics++;
    clearTimeout(_tClics);
    _tClics = setTimeout(() => { _clics = 0; }, 2500);   // hay que darlos seguidos
    if (_clics < 5 || _abriendo) return;
    _clics = 0;
    _abriendo = true;
    try {
      const cuenta = wallet.cuentaActual && wallet.cuentaActual();
      if (!cuenta) return;                       // sin wallet: silencio absoluto
      const p = await permisos(cuenta);
      if (!p || !p.alguno) return;               // no es owner: no pasa nada
      abrirPanel(cuenta, p);
    } catch (_) { /* silencio */ } finally { _abriendo = false; }
  };
  zona.addEventListener('click', golpe);
  zona.addEventListener('touchend', (e) => { e.preventDefault(); golpe(); }, { passive: false });
  estilos();
}

/* ══════════════════ EL PANEL ══════════════════ */
function abrirPanel(cuenta, perm) {
  const prev = $('adm-panel'); if (prev) prev.remove();
  const d = document.createElement('div');
  d.id = 'adm-panel';
  d.innerHTML = `<div class="ad-bg"></div>
    <div class="ad-c">
      <div class="ad-cab">
        <div>
          <div class="ad-t">Panel de control</div>
          <div class="ad-s">${wallet.abreviar(cuenta)} · acceso verificado en cadena</div>
        </div>
        <button class="ad-x" aria-label="Cerrar">✕</button>
      </div>

      <div class="ad-tabs">
        <button class="ad-tab on" data-p="resumen">Resumen</button>
        <button class="ad-tab" data-p="disputas">Disputas</button>
        <button class="ad-tab" data-p="prize">Prize Pool</button>
        <button class="ad-tab" data-p="ajustes">Ajustes</button>
        <button class="ad-tab" data-p="loteria">Lotería</button>
        <button class="ad-tab" data-p="poder">Propiedad</button>
      </div>

      <div class="ad-pane on" id="ad-resumen"><div class="ad-cargando">Leyendo la cadena…</div></div>
      <div class="ad-pane" id="ad-disputas"></div>
      <div class="ad-pane" id="ad-prize"></div>
      <div class="ad-pane" id="ad-ajustes"></div>
      <div class="ad-pane" id="ad-loteria"></div>
      <div class="ad-pane" id="ad-poder"></div>

      <div class="ad-msg" id="ad-msg"></div>
    </div>`;
  document.body.appendChild(d);

  const cerrar = () => { const e = $('adm-panel'); if (e) e.remove(); };
  d.querySelector('.ad-bg').onclick = cerrar;
  d.querySelector('.ad-x').onclick = cerrar;

  d.querySelectorAll('.ad-tab').forEach((b) => b.onclick = () => {
    d.querySelectorAll('.ad-tab').forEach((x) => x.classList.remove('on'));
    d.querySelectorAll('.ad-pane').forEach((x) => x.classList.remove('on'));
    b.classList.add('on');
    const pane = $('ad-' + b.dataset.p);
    if (pane) pane.classList.add('on');
    if (b.dataset.p === 'disputas') pintarDisputas(perm);
    if (b.dataset.p === 'prize') pintarPrize(perm);
    if (b.dataset.p === 'ajustes') pintarAjustes(perm);
    if (b.dataset.p === 'loteria') pintarLoteria(cuenta);
    if (b.dataset.p === 'poder') pintarPoder(cuenta, perm);
  });

  pintarResumen(cuenta, perm);
}

function decir(txt, clase = '') {
  const e = $('ad-msg'); if (!e) return;
  e.className = 'ad-msg ' + clase;
  e.textContent = txt;
  if (txt) setTimeout(() => { if (e.textContent === txt) { e.textContent = ''; e.className = 'ad-msg'; } }, 9000);
}

/** Confirmación obligatoria antes de cualquier acción que cambie algo. */
function confirmar({ titulo, texto, ok = 'Confirmar', peligro = false }, alAceptar) {
  const d = document.createElement('div');
  d.className = 'ad-conf';
  d.innerHTML = `<div class="ad-conf-bg"></div>
    <div class="ad-conf-c">
      <div class="ad-conf-t">${titulo}</div>
      <div class="ad-conf-s">${texto}</div>
      <div class="ad-conf-acts">
        <button class="ad-b gris" data-no>Cancelar</button>
        <button class="ad-b ${peligro ? 'rojo' : ''}" data-si>${ok}</button>
      </div>
      <div class="ad-conf-n">Tendrás que firmar con tu wallet.</div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.ad-conf-bg').onclick = q;
  d.querySelector('[data-no]').onclick = q;
  d.querySelector('[data-si]').onclick = () => { q(); alAceptar(); };
}

async function firmar(fn, exito) {
  try {
    decir('Confirma en tu wallet…', 'info');
    const tx = await fn();
    await tx.wait();
    decir(exito, 'ok');
    return true;
  } catch (e) {
    decir('No se pudo: ' + (e?.shortMessage || e?.reason || e?.message || e), 'mal');
    return false;
  }
}

/* ── RESUMEN ── */
async function pintarResumen(cuenta, perm) {
  const box = $('ad-resumen'); if (!box) return;
  const f = (v, d = 4) => Number(ethers.formatUnits(v, 18)).toLocaleString('es', { maximumFractionDigits: d });

  let market = {}, prize = {}, bots = {}, keeper = null;
  try {
    const m = leerC(CONTRATOS.market.dir, ABI_MARKET);
    market.total = Number(await m.totalOrdenes());
    market.pausado = await m.paused().catch(() => false);
  } catch (_) {}
  try {
    const p = leerC(CONTRATOS.prize.dir, ABI_PRIZE);
    prize.ronda = Number(await p.currentRound());
    const r = await p.rounds(prize.ronda);
    prize.estado = Number(r.state); prize.pozo = r.pool; prize.tickets = Number(r.tickets);
    const g = await p.saldoGas();
    prize.gas = g[0] + g[1];
    prize.pausado = await p.paused().catch(() => false);
  } catch (_) {}
  try {
    const b = leerC(CONTRATOS.bots.dir, ABI_BOTS);
    bots.sub = await b.precioSub();
    bots.gasMin = await b.gasMinOp().catch(() => 0n);
  } catch (_) {}
  try {
    const r = await fetch(KEEPER + '/estado', { cache: 'no-store' });
    keeper = await r.text();
  } catch (_) { keeper = null; }

  const ESTADOS_R = ['Abierta', 'Sorteando', 'Cerrada', 'Reembolsada'];
  box.innerHTML = `
    <div class="ad-grid">
      <div class="ad-kpi"><span>Publicaciones en Market</span><b>${market.total ?? '—'}</b></div>
      <div class="ad-kpi"><span>Ronda del Prize Pool</span><b>#${prize.ronda ?? '—'}</b></div>
      <div class="ad-kpi"><span>Pozo actual</span><b>${prize.pozo != null ? f(prize.pozo, 2) : '—'} <i>USDT</i></b></div>
      <div class="ad-kpi"><span>Participantes</span><b>${prize.tickets ?? '—'}</b></div>
      <div class="ad-kpi ${prize.gas != null && prize.gas < 2000000000000000n ? 'alerta' : ''}"><span>Gas del sorteo</span><b>${prize.gas != null ? f(prize.gas, 5) : '—'} <i>BNB</i></b></div>
      <div class="ad-kpi"><span>Cuota mensual</span><b>${bots.sub != null ? f(bots.sub, 5) : '—'} <i>BNB</i></b></div>
    </div>

    <div class="ad-sec">Contratos</div>
    ${Object.entries(CONTRATOS).map(([k, c]) => `
      <div class="ad-fila">
        <div class="ad-fila-tx"><b>${c.nombre}</b><span>${c.proxy ? 'actualizable (proxy)' : 'fijo'} · ${perm[k]?.mio ? 'mandas tú' : 'otro owner'}</span></div>
        <a class="ad-link" href="https://bscscan.com/address/${c.dir}" target="_blank" rel="noopener">ver ↗</a>
      </div>`).join('')}

    <div class="ad-sec">Estado del keeper</div>
    <pre class="ad-pre">${keeper ? esc(keeper.slice(0, 700)) : 'No se pudo consultar el keeper.'}</pre>
    ${(market.pausado || prize.pausado) ? `<div class="ad-alerta">⚠ Hay contratos en pausa: ${market.pausado ? 'Marketplace ' : ''}${prize.pausado ? 'Prize Pool' : ''}</div>` : ''}`;
}

/* ── DISPUTAS ── */
async function pintarDisputas(perm) {
  const box = $('ad-disputas'); if (!box) return;
  box.innerHTML = `<div class="ad-cargando">Buscando disputas…</div>`;
  if (!perm.market?.mio) { box.innerHTML = `<div class="ad-vacio">No mandas en el Marketplace.</div>`; return; }
  try {
    const m = leerC(CONTRATOS.market.dir, ABI_MARKET);
    const total = Number(await m.totalOrdenes());
    const ids = []; for (let i = total; i >= 1; i--) ids.push(i);
    const ords = await Promise.all(ids.map((i) => m.ordenes(i).catch(() => null)));
    const dis = ords.filter((o) => o && Number(o.estado) === 4);
    if (dis.length === 0) { box.innerHTML = `<div class="ad-vacio">No hay disputas abiertas. Todo tranquilo.</div>`; return; }
    box.innerHTML = dis.map((o) => `
      <div class="ad-caso">
        <div class="ad-caso-cab"><b>Orden #${o.id}</b><span>${Number(ethers.formatUnits(o.monto, 18)).toFixed(2)} · ${Number(o.tramosHechos)}/${Number(o.tramos)} partes</span></div>
        <div class="ad-caso-p"><i>Vendedor</i>${wallet.abreviar(o.vendedor)}</div>
        <div class="ad-caso-p"><i>Comprador</i>${o.comprador && o.comprador !== ethers.ZeroAddress ? wallet.abreviar(o.comprador) : '—'}</div>
        ${o.motivo ? `<div class="ad-motivo"><i>Lo que dice quien abrió la disputa</i>${esc(o.motivo)}</div>` : '<div class="ad-caso-p"><i>Sin explicación</i></div>'}
        <div class="ad-acts">
          <button class="ad-b" data-dc="${o.id}">Razón al comprador</button>
          <button class="ad-b gris" data-dv="${o.id}">Razón al vendedor</button>
          <button class="ad-b gris" data-da="${o.id}">Anular</button>
        </div>
      </div>`).join('');

    const accion = (sel, titulo, texto, fn) => box.querySelectorAll(sel).forEach((b) => b.onclick = () => {
      const id = b.getAttribute(sel.replace(/[\[\]]/g, ''));
      confirmar({ titulo, texto, peligro: true }, async () => {
        const c = await escribirC(CONTRATOS.market.dir, ABI_MARKET);
        if (await firmar(() => fn(c, id), 'Disputa resuelta.')) pintarDisputas(perm);
      });
    });
    accion('[data-dc]', 'Dar la razón al comprador', 'El comprador recibirá la parte en disputa. Si falta dinero, se completa con la fianza del vendedor. El resto vuelve al vendedor.', (c, id) => c.resolverDisputa(id, true));
    accion('[data-dv]', 'Dar la razón al vendedor', 'La cripto que quede trabada vuelve al vendedor y la operación se cierra.', (c, id) => c.resolverDisputa(id, false));
    accion('[data-da]', 'Anular la disputa', 'Se cierra sin culpables: la cripto vuelve al vendedor. Úsalo cuando fue un malentendido.', (c, id) => c.anularDisputa(id));
  } catch (e) {
    box.innerHTML = `<div class="ad-vacio">No se pudo leer: ${esc(e?.message || e)}</div>`;
  }
}

/* ── PRIZE POOL ── */
async function pintarPrize(perm) {
  const box = $('ad-prize'); if (!box) return;
  if (!perm.prize?.mio) { box.innerHTML = `<div class="ad-vacio">No mandas en el Prize Pool.</div>`; return; }
  box.innerHTML = `<div class="ad-cargando">Leyendo la ronda…</div>`;
  try {
    const p = leerC(CONTRATOS.prize.dir, ABI_PRIZE);
    const ronda = Number(await p.currentRound());
    const r = await p.rounds(ronda);
    const g = await p.saldoGas();
    const falta = await p.gasFaltante().catch(() => 0n);
    const est = ['Abierta', 'Sorteando', 'Cerrada', 'Reembolsada'][Number(r.state)] || '—';
    const cierra = new Date(Number(r.endTime) * 1000).toLocaleString('es');
    box.innerHTML = `
      <div class="ad-grid">
        <div class="ad-kpi"><span>Ronda</span><b>#${ronda}</b></div>
        <div class="ad-kpi"><span>Estado</span><b>${est}</b></div>
        <div class="ad-kpi"><span>Pozo</span><b>${Number(ethers.formatUnits(r.pool, 18)).toFixed(2)} <i>USDT</i></b></div>
        <div class="ad-kpi"><span>Participaciones</span><b>${Number(r.tickets)}</b></div>
      </div>
      <div class="ad-nota">Cierra el <b>${cierra}</b>. Gas disponible: <b>${Number(ethers.formatUnits(g[0] + g[1], 18)).toFixed(5)} BNB</b>${falta > 0n ? ` · <span style="color:var(--rojo)">faltan ${Number(ethers.formatUnits(falta, 18)).toFixed(5)} BNB para sortear</span>` : ' · suficiente'}</div>

      <div class="ad-sec">Acciones</div>
      <div class="ad-acts col">
        <button class="ad-b" id="ap-cerrar">Cerrar la ronda y sortear ahora</button>
        <button class="ad-b gris" id="ap-reemb">Forzar reembolso de esta ronda</button>
        <button class="ad-b gris" id="ap-gas">Cambiar el gas automático</button>
        <button class="ad-b gris" id="ap-sweep">Sacar BNB sobrante del contrato</button>
      </div>`;

    $('ap-cerrar').onclick = () => confirmar({
      titulo: 'Cerrar la ronda ahora',
      texto: 'Se cierra antes de tiempo y se pide el número aleatorio para sortear. Si no hay participantes suficientes, se reembolsará a todos.',
      peligro: true
    }, async () => {
      const c = await escribirC(CONTRATOS.prize.dir, ABI_PRIZE);
      if (await firmar(() => c.cerrarRonda(), 'Ronda cerrada. El sorteo está en marcha.')) pintarPrize(perm);
    });

    $('ap-reemb').onclick = () => confirmar({
      titulo: 'Forzar reembolso',
      texto: 'Se devuelve su dinero a <b>todos los participantes</b> de esta ronda y no habrá ganadores. Úsalo solo si algo fue mal.',
      peligro: true
    }, async () => {
      const c = await escribirC(CONTRATOS.prize.dir, ABI_PRIZE);
      if (await firmar(() => c.forzarReembolso(ronda), 'Reembolso hecho.')) pintarPrize(perm);
    });

    $('ap-gas').onclick = () => pedirDatos('Gas automático', [
      { id: 'obj', lab: 'BNB que se mantiene en la wallet de gas', val: '0.02' },
      { id: 'por', lab: 'BNB que aporta cada participante', val: '0.0005' }
    ], async (v) => {
      const c = await escribirC(CONTRATOS.prize.dir, ABI_PRIZE);
      firmar(() => c.setGasFunding(ethers.parseEther(v.obj), ethers.parseEther(v.por)), 'Gas automático actualizado.');
    });

    $('ap-sweep').onclick = () => pedirDatos('Sacar BNB del contrato', [
      { id: 'a', lab: 'Wallet que lo recibe', val: wallet.cuentaActual() || '' },
      { id: 'cuanto', lab: 'Cuánto BNB (0 = todo)', val: '0' }
    ], async (v) => {
      const c = await escribirC(CONTRATOS.prize.dir, ABI_PRIZE);
      firmar(() => c.sweepBnb(v.a, ethers.parseEther(v.cuanto || '0')), 'BNB enviado.');
    });
  } catch (e) {
    box.innerHTML = `<div class="ad-vacio">No se pudo leer: ${esc(e?.message || e)}</div>`;
  }
}

/* ── AJUSTES ── */
async function pintarAjustes(perm) {
  const box = $('ad-ajustes'); if (!box) return;
  box.innerHTML = `
    <div class="ad-sec">Marketplace</div>
    <div class="ad-acts col">
      <button class="ad-b gris" id="aa-arb" ${perm.market?.mio ? '' : 'disabled'}>Añadir o quitar un árbitro</button>
      <button class="ad-b gris" id="aa-tok" ${perm.market?.mio ? '' : 'disabled'}>Permitir o bloquear una moneda</button>
      <button class="ad-b gris" id="aa-fia" ${perm.market?.mio ? '' : 'disabled'}>Cambiar la fianza mínima</button>
      <button class="ad-b gris" id="aa-com" ${perm.market?.mio ? '' : 'disabled'}>Cambiar la comisión por publicar</button>
      <button class="ad-b gris" id="aa-pla" ${perm.market?.mio ? '' : 'disabled'}>Cambiar los plazos</button>
    </div>

    <div class="ad-sec">Parar en caso de emergencia</div>
    <div class="ad-nota">Si algo va mal, puedes <b>congelar</b> un contrato: nadie podrá crear nada nuevo, pero el dinero de la gente sigue seguro y se puede retirar.</div>
    <div class="ad-acts col">
      <button class="ad-b rojo" id="aa-pm" ${perm.market?.mio ? '' : 'disabled'}>Congelar / reanudar Marketplace</button>
      <button class="ad-b rojo" id="aa-pp" ${perm.prize?.mio ? '' : 'disabled'}>Congelar / reanudar Prize Pool</button>
    </div>`;

  const M = () => escribirC(CONTRATOS.market.dir, ABI_MARKET);

  $('aa-arb').onclick = () => pedirDatos('Árbitro del Marketplace', [
    { id: 'dir', lab: 'Wallet del árbitro', val: '' },
    { id: 'ok', lab: 'Escribe SI para darle permiso, NO para quitárselo', val: 'SI' }
  ], async (v) => firmar(async () => (await M()).setArbitro(v.dir, /^si$/i.test(v.ok)), 'Árbitro actualizado.'));

  $('aa-tok').onclick = () => pedirDatos('Moneda del Marketplace', [
    { id: 'dir', lab: 'Dirección de la moneda', val: '' },
    { id: 'ok', lab: 'Escribe SI para permitirla, NO para bloquearla', val: 'SI' }
  ], async (v) => firmar(async () => (await M()).setToken(v.dir, /^si$/i.test(v.ok)), 'Moneda actualizada.'));

  $('aa-fia').onclick = () => pedirDatos('Fianza mínima', [
    { id: 'v', lab: 'USDT que debe depositar un vendedor', val: '20' }
  ], async (v) => firmar(async () => (await M()).setFianzaMinima(ethers.parseUnits(v.v, 18)), 'Fianza actualizada.'));

  $('aa-com').onclick = () => pedirDatos('Comisión por publicar', [
    { id: 'c', lab: 'Céntimos de dólar (100 = 1 USD)', val: '100' },
    { id: 't', lab: 'Tope en BNB', val: '0.01' }
  ], async (v) => firmar(async () => (await M()).setComision(v.c, ethers.parseEther(v.t)), 'Comisión actualizada.'));

  $('aa-pla').onclick = () => pedirDatos('Plazos del Marketplace (en minutos)', [
    { id: 'pago', lab: 'Para pagar', val: '60' },
    { id: 'conf', lab: 'Para confirmar', val: '120' },
    { id: 'res', lab: 'Reserva de una oferta', val: '1440' },
    { id: 'dis', lab: 'Para resolver una disputa', val: '2880' }
  ], async (v) => firmar(async () => (await M()).setPlazos(+v.pago * 60, +v.conf * 60, +v.res * 60, +v.dis * 60), 'Plazos actualizados.'));

  const congelar = async (dir, abi, nombre) => {
    const c = leerC(dir, ABI_OWNER);
    const p = await c.paused().catch(() => false);
    confirmar({
      titulo: p ? `Reanudar ${nombre}` : `Congelar ${nombre}`,
      texto: p
        ? 'Todo vuelve a funcionar con normalidad.'
        : `Nadie podrá crear operaciones nuevas en ${nombre}. <b>El dinero de la gente sigue seguro</b> y se puede retirar. Úsalo solo ante un problema grave.`,
      peligro: !p
    }, async () => {
      const w = await escribirC(dir, abi);
      firmar(() => (p ? w.unpause() : w.pause()), p ? 'Reanudado.' : 'Congelado.');
    });
  };
  $('aa-pm').onclick = () => congelar(CONTRATOS.market.dir, ABI_MARKET, 'el Marketplace');
  $('aa-pp').onclick = () => congelar(CONTRATOS.prize.dir, ABI_PRIZE, 'el Prize Pool');
}

/* ── LOTERÍA: recuperar el dinero que quedó dentro ── */
let _lot = [];
async function pintarLoteria(cuenta) {
  const box = $('ad-loteria'); if (!box) return;
  box.innerHTML = `<div class="ad-cargando">Leyendo el contrato de la lotería…</div>`;
  const CERO = '0x0000000000000000000000000000000000000000';
  try {
    const c = leerC(LOTERIA, ABI_LOTERIA);
    let jefe = null, jefe2 = null;
    try { jefe = await c.owner(); } catch (_) {}
    try { jefe2 = await c.ownerSecundario(); } catch (_) {}
    const mio = jefe && String(jefe).toLowerCase() === String(cuenta).toLowerCase();
    const mio2 = jefe2 && String(jefe2).toLowerCase() === String(cuenta).toLowerCase();

    _lot = [];
    const filas = [];
    for (const m of MONEDAS_LOTERIA) {
      const dir = m.dir || CERO;
      let banca = 0n, reservado = 0n, benef = 0n, saldo = 0n;
      try {
        const d = await c.monedas(dir);
        banca = d.banca; reservado = d.reservado; benef = d.beneficios;
      } catch (_) {}
      try { saldo = await c.saldoDe(cuenta, dir); } catch (_) {}
      const libre = banca > reservado ? banca - reservado : 0n;
      if (libre > 0n || benef > 0n || saldo > 0n) _lot.push({ m, dir, libre, benef, saldo });
      const f = (v) => Number(ethers.formatUnits(v, m.dec)).toLocaleString('es', { maximumFractionDigits: 6 });
      filas.push(`<div class="ad-mon">
        <div class="ad-mon-cab"><b>${m.nom}</b><span>${m.sim}</span></div>
        <div class="ad-mon-nums">
          <span><i>banca libre</i>${f(libre)}</span>
          <span><i>beneficios</i>${f(benef)}</span>
          ${reservado > 0n ? `<span><i>comprometido</i>${f(reservado)}</span>` : ''}
        </div>
      </div>`);
    }

    box.innerHTML = `
      <div class="ad-nota">
        Tu dinero en la lotería está en dos sitios: la <b>banca</b> (lo que depositaste para pagar premios)
        y los <b>beneficios</b> (tu comisión acumulada). El botón "retirar" de antes era para <b>jugadores</b>
        que han ganado: por eso daba error.
      </div>
      <div class="ad-fila">
        <div class="ad-fila-tx"><b>Dueño del contrato</b><span>${jefe ? wallet.abreviar(jefe) : '—'}${mio ? ' · eres tú' : ''}</span></div>
      </div>
      ${jefe2 && jefe2 !== CERO ? `<div class="ad-fila"><div class="ad-fila-tx"><b>Dueño de respaldo</b><span>${wallet.abreviar(jefe2)}${mio2 ? ' · eres tú' : ''}</span></div></div>` : ''}
      ${(!mio && !mio2) ? `<div class="ad-alerta">Esta wallet no manda en la lotería. Conéctate con la que la desplegó.</div>` : ''}

      <div class="ad-sec">Qué hay en cada moneda</div>
      ${filas.join('')}

      <div class="ad-acts col">
        <button class="ad-b" id="al-banca" ${(mio || mio2) ? '' : 'disabled'}>Retirar toda la banca libre</button>
        <button class="ad-b gris" id="al-benef" ${(mio || mio2) ? '' : 'disabled'}>Retirar todos los beneficios</button>
        <button class="ad-b gris" id="al-diag">Ver qué funciones tiene el contrato</button>
        <a class="ad-link btn" href="https://bscscan.com/address/${LOTERIA}" target="_blank" rel="noopener" style="text-align:center">ver el contrato ↗</a>
      </div>
      <div id="al-diag-out"></div>`;

    /* Prueba varias firmas hasta que una funcione. */
    const intentar = async (firmas, dir, cantidad) => {
      for (const f of firmas) {
        try {
          const w = await escribirC(LOTERIA, [f]);
          const nom = f.match(/function (\w+)/)[1];
          const nArgs = (f.match(/\(([^)]*)\)/)[1] || '').split(',').filter(Boolean).length;
          const args = nArgs === 2 ? [dir, cantidad] : (nArgs === 1 ? [/address/.test(f.split('(')[1]) ? dir : cantidad] : []);
          const tx = await w[nom](...args);
          await tx.wait();
          return { ok: true, nom };
        } catch (e) {
          const m = String(e?.shortMessage || e?.message || e);
          // Si la función no existe, probamos la siguiente. Si existe pero
          // rechaza, ese es el motivo real y lo devolvemos.
          if (!/no matching|unknown function|call revert exception|missing revert|function selector/i.test(m) && /revert/i.test(m)) {
            return { ok: false, motivo: m.slice(0, 90) };
          }
        }
      }
      return { ok: false, motivo: 'ninguna función de retirada respondió' };
    };

    const correr = async (btn, firmas, campo, titulo) => {
      const lista = _lot.filter((x) => x[campo] > 0n);
      if (lista.length === 0) { decir('No hay nada que retirar por ahí.', ''); return; }
      confirmar({
        titulo,
        texto: `Se firmará <b>una transacción por moneda</b> (${lista.length} en total). El dinero llega a tu wallet.`,
        ok: 'Retirar'
      }, async () => {
        btn.disabled = true;
        let ok = 0; const mal = [];
        for (let i = 0; i < lista.length; i++) {
          const x = lista[i];
          decir(`${x.m.sim} (${i + 1}/${lista.length})… firma en tu wallet`, 'info');
          const r = await intentar(firmas, x.dir, x[campo]);
          if (r.ok) ok++; else mal.push(`${x.m.sim}: ${r.motivo}`);
        }
        decir(mal.length === 0 ? `Listo: ${ok} moneda(s) en tu wallet.` : `Retiradas: ${ok}\n${mal.join('\n')}`, mal.length ? 'mal' : 'ok');
        btn.disabled = false;
        pintarLoteria(cuenta);
      });
    };

    if ($('al-banca')) $('al-banca').onclick = () => correr($('al-banca'), FIRMAS_BANCA, 'libre', 'Retirar la banca');
    if ($('al-benef')) $('al-benef').onclick = () => correr($('al-benef'), FIRMAS_BENEF, 'benef', 'Retirar los beneficios');
    // Lee del explorador las funciones REALES del contrato. Así sabemos
    // exactamente cómo sacar el dinero, sin adivinar.
    const bd = $('al-diag');
    if (bd) bd.onclick = async () => {
      const out = $('al-diag-out');
      out.innerHTML = `<div class="ad-cargando">Leyendo el contrato en el explorador…</div>`;
      try {
        // Si es un PROXY, las funciones de verdad viven en otro contrato.
        // Leemos la ranura estándar donde el proxy guarda esa dirección.
        let objetivo = LOTERIA, nota = '';
        const RANURAS = [
          '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc', // EIP-1967
          '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3'  // OpenZeppelin antiguo
        ];
        for (const slot of RANURAS) {
          try {
            const v = await lector().getStorage(LOTERIA, slot);
            const dir = '0x' + String(v).slice(-40);
            if (/^0x[0-9a-f]{40}$/i.test(dir) && dir !== '0x0000000000000000000000000000000000000000') {
              objetivo = ethers.getAddress(dir);
              nota = `<div class="ad-nota">Es un <b>proxy</b>. Las funciones de verdad están en <b>${objetivo}</b>.</div>`;
              break;
            }
          } catch (_) {}
        }
        const r = await fetch(`https://api.bscscan.com/api?module=contract&action=getabi&address=${objetivo}`);
        const j = await r.json();
        if (j.status !== '1') { out.innerHTML = `<div class="ad-vacio">${nota}No se pudo leer la lista de funciones (¿sin verificar o el explorador ocupado?).<br>Ábrelo en BscScan y mira la pestaña <b>Write Contract</b>.</div>`; return; }
        const abi = JSON.parse(j.result);
        const escribe = abi.filter((x) => x.type === 'function' && x.stateMutability !== 'view' && x.stateMutability !== 'pure');
        const pinta = (x) => `<div class="ad-fn"><span><b>${esc(x.name)}</b>(${(x.inputs || []).map((i) => esc(i.type) + ' ' + esc(i.name || '')).join(', ')})</span><button class="ad-mini" data-fn="${esc(x.name)}">ejecutar</button></div>`;
        const saca = escribe.filter((x) => /retir|withdraw|rescue|sweep|claim|banca|bankroll|fond|owner/i.test(x.name));
        // Cada una se puede lanzar desde aquí, rellenando sus datos.
        setTimeout(() => out.querySelectorAll('[data-fn]').forEach((b) => b.onclick = () => {
          const fn = abi.find((x) => x.name === b.dataset.fn && x.type === 'function');
          if (!fn) return;
          const campos = (fn.inputs || []).map((i, k) => ({ id: 'p' + k, lab: `${i.name || 'dato ' + (k + 1)} (${i.type})`, val: /address/.test(i.type) ? (wallet.cuentaActual() || '') : '' }));
          pedirDatos(fn.name, campos.length ? campos : [{ id: 'nada', lab: 'Sin datos: pulsa Continuar', val: '' }], async (v) => {
            try {
              const frag = `function ${fn.name}(${(fn.inputs || []).map((i) => i.type + ' ' + (i.name || '')).join(',')})`;
              const c = await escribirC(objetivo === LOTERIA ? LOTERIA : LOTERIA, [frag]);
              const args = (fn.inputs || []).map((i, k) => {
                const raw = v['p' + k] || '';
                if (/^uint/.test(i.type)) return raw.includes('.') ? ethers.parseUnits(raw, 18) : BigInt(raw || '0');
                if (i.type === 'bool') return /^(si|true|1)$/i.test(raw);
                return raw;
              });
              firmar(() => c[fn.name](...args), 'Hecho. Revisa tu wallet.');
            } catch (e) { decir('No se pudo: ' + (e?.shortMessage || e?.message || e), 'mal'); }
          });
        }), 60);
        window._abiLoteria = abi;
        out.innerHTML = `
          ${nota}
          <div class="ad-sec">Funciones que sacan dinero</div>
          ${saca.length ? saca.map(pinta).join('') : '<div class="ad-vacio">Ninguna con nombre reconocible.</div>'}
          <div class="ad-sec">Todas las que modifican algo (${escribe.length})</div>
          ${escribe.map(pinta).join('')}`;
      } catch (e) {
        out.innerHTML = `<div class="ad-vacio">No se pudo consultar: ${esc(e?.message || e)}</div>`;
      }
    };

    const btn = $('al-todo');
    if (btn) btn.onclick = () => confirmar({
      titulo: 'Retirar todo de la lotería',
      texto: `Se firma <b>una transacción por moneda</b> (${_saldosLot.length} en total) y el dinero llega a tu wallet.`,
      ok: 'Retirar'
    }, async () => {
      btn.disabled = true;
      const w = await escribirC(LOTERIA, ABI_LOTERIA);
      // Si no hay saldo apuntado, probamos con TODAS: así vemos qué dice el
      // contrato en cada moneda en vez de quedarnos sin saber nada.
      const lista = _saldosLot.length ? _saldosLot : MONEDAS_LOTERIA.map((m) => ({ m, v: 0n }));
      let ok = 0; const mal = [];
      for (let i = 0; i < lista.length; i++) {
        const { m, v } = lista[i];
        decir(`Probando ${m.sim} (${i + 1}/${lista.length})… firma o rechaza en tu wallet`, 'info');
        try { const tx = await w.retirar(m.dir || CERO); await tx.wait(); ok++; }
        catch (e) { mal.push(`${m.sim}: ${(e?.shortMessage || e?.reason || e?.message || e).toString().slice(0, 40)}`); }
      }
      decir(mal.length === 0 ? `Listo: ${ok} moneda(s) en tu wallet.` : `Retiradas: ${ok}\n${mal.join('\n')}`, mal.length ? 'mal' : 'ok');
      btn.disabled = false;
      pintarLoteria(cuenta);
    });
  } catch (e) {
    box.innerHTML = `<div class="ad-vacio">No se pudo leer: ${esc(e?.message || e)}</div>`;
  }
}

/* ── PROPIEDAD ── */
async function pintarPoder(cuenta, perm) {
  const box = $('ad-poder'); if (!box) return;
  box.innerHTML = `
    <div class="ad-nota grande">
      Aquí se decide <b>quién manda</b> en cada contrato. El owner es quien puede resolver disputas,
      cambiar ajustes y cobrar las comisiones. Cámbialo solo si sabes muy bien lo que haces:
      <b>si lo pasas a una wallet equivocada, se pierde el control para siempre</b>.
    </div>

    <div class="ad-sec">Quién manda ahora</div>
    ${Object.entries(CONTRATOS).map(([k, c]) => `
      <div class="ad-fila">
        <div class="ad-fila-tx"><b>${c.nombre}</b><span>${perm[k]?.owner ? wallet.abreviar(perm[k].owner) : '—'}${perm[k]?.mio ? ' · eres tú' : ''}</span></div>
        <button class="ad-link btn" data-tr="${k}" ${perm[k]?.mio ? '' : 'disabled'}>traspasar</button>
      </div>`).join('')}

    <div class="ad-sec">Wallets de respaldo</div>
    <div class="ad-nota">
      Ahora mismo cada contrato tiene <b>un solo dueño</b>. Si perdieras esa wallet, perderías el control.
      Para tener wallets de reserva (una segunda y una tercera que puedan tomar el mando si la primera cae)
      hace falta <b>añadir esa función a los contratos</b>. Es un cambio que sí se puede hacer, porque son
      actualizables, pero necesita tocar el código y volver a publicarlo.
    </div>
    <div class="ad-acts col">
      <button class="ad-b gris" id="ap-multi">Cómo activar las wallets de respaldo</button>
    </div>`;

  box.querySelectorAll('[data-tr]').forEach((b) => b.onclick = () => {
    const k = b.dataset.tr, c = CONTRATOS[k];
    pedirDatos(`Traspasar ${c.nombre}`, [
      { id: 'dir', lab: 'Wallet que pasará a mandar', val: '' },
      { id: 'seg', lab: 'Escribe TRASPASAR para confirmar', val: '' }
    ], async (v) => {
      if (v.seg !== 'TRASPASAR') { decir('Escribe TRASPASAR para confirmar.', 'mal'); return; }
      if (!/^0x[0-9a-fA-F]{40}$/.test(v.dir)) { decir('Esa dirección no es válida.', 'mal'); return; }
      confirmar({
        titulo: `¿Traspasar ${c.nombre}?`,
        texto: `Pasarás el control a <b>${esc(v.dir)}</b>.<br><br><b>Esto no se puede deshacer desde aquí.</b> Solo la wallet nueva podrá devolvértelo. Si la dirección está mal, pierdes el contrato para siempre.`,
        ok: 'Sí, traspasar', peligro: true
      }, async () => {
        const w = await escribirC(c.dir, ABI_OWNER);
        firmar(() => w.transferOwnership(v.dir), 'Control traspasado.');
      });
    });
  });

  $('ap-multi').onclick = () => confirmar({
    titulo: 'Wallets de respaldo',
    texto: `Para tener una segunda y una tercera wallet que puedan tomar el mando, hay que añadir esa función a cada contrato y publicarla (los tres principales son actualizables, así que no se pierde nada).<br><br>Funcionaría así: las comisiones van siempre a la <b>wallet 1</b>. Si la suspendes, pasan a la <b>2</b>, y así. Cualquiera de las tres puede añadir o suspender a las demás.<br><br>Cuando quieras, lo preparamos.`,
    ok: 'Entendido'
  }, () => {});
}

/* ── Formulario genérico para pedir datos ── */
function pedirDatos(titulo, campos, alAceptar) {
  const d = document.createElement('div');
  d.className = 'ad-conf';
  d.innerHTML = `<div class="ad-conf-bg"></div>
    <div class="ad-conf-c">
      <div class="ad-conf-t">${titulo}</div>
      ${campos.map((c) => `<label class="ad-lab">${c.lab}<input class="ad-in" data-k="${c.id}" value="${esc(c.val)}"></label>`).join('')}
      <div class="ad-conf-acts">
        <button class="ad-b gris" data-no>Cancelar</button>
        <button class="ad-b" data-si>Continuar</button>
      </div>
    </div>`;
  document.body.appendChild(d);
  const q = () => d.remove();
  d.querySelector('.ad-conf-bg').onclick = q;
  d.querySelector('[data-no]').onclick = q;
  d.querySelector('[data-si]').onclick = () => {
    const v = {};
    d.querySelectorAll('.ad-in').forEach((i) => { v[i.dataset.k] = i.value.trim(); });
    q(); alAceptar(v);
  };
}

/* ── Estilos ── */
function estilos() {
  if ($('adm-css')) return;
  const s = document.createElement('style'); s.id = 'adm-css';
  s.textContent = `
  /* La zona secreta: invisible, sin cursor distinto, sin ninguna pista */
  #adm-zona{position:fixed;left:0;bottom:0;width:54px;height:54px;z-index:9999;background:transparent}
  #adm-panel{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px}
  #adm-panel .ad-bg{position:absolute;inset:0;background:rgba(2,4,6,.93);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
  #adm-panel .ad-c{position:relative;width:100%;max-width:640px;max-height:calc(100vh - 32px);overflow-y:auto;background:linear-gradient(180deg,#12161c,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:18px;padding:20px}
  #adm-panel .ad-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:16px}
  #adm-panel .ad-t{font-family:var(--display,sans-serif);font-weight:800;font-size:21px;color:var(--gold,#E8B84B)}
  #adm-panel .ad-s{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794;margin-top:3px}
  #adm-panel .ad-x{width:34px;height:34px;flex:0 0 auto;border-radius:10px;display:grid;place-items:center;padding:0;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer}
  #adm-panel .ad-tabs{display:flex;gap:5px;overflow-x:auto;background:#0b0e12;border:1px solid #2b3139;border-radius:11px;padding:4px;margin-bottom:14px;scrollbar-width:none}
  #adm-panel .ad-tabs::-webkit-scrollbar{display:none}
  #adm-panel .ad-tab{flex:1 0 auto;min-height:38px;padding:0 12px;border:none;border-radius:8px;background:transparent;color:#b7bdc6;font-family:var(--display,sans-serif);font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}
  #adm-panel .ad-tab.on{background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 55%,#c79426);color:#3a2800}
  #adm-panel .ad-pane{display:none}
  #adm-panel .ad-pane.on{display:block}
  #adm-panel .ad-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:9px;margin-bottom:6px}
  #adm-panel .ad-kpi{padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid #2b3139}
  #adm-panel .ad-kpi.alerta{border-color:rgba(246,70,93,.45);background:rgba(246,70,93,.07)}
  #adm-panel .ad-kpi span{display:block;font-family:var(--mono,monospace);font-size:9px;color:#6b7681;text-transform:uppercase;letter-spacing:.7px}
  #adm-panel .ad-kpi b{display:block;font-family:var(--display,sans-serif);font-size:19px;color:#eaecef;margin-top:3px}
  #adm-panel .ad-kpi i{font-style:normal;font-size:11px;color:#7d8794}
  #adm-panel .ad-sec{font-family:var(--mono,monospace);font-size:9.5px;color:#7d8794;text-transform:uppercase;letter-spacing:.9px;margin:18px 0 8px}
  #adm-panel .ad-fila{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:11px;background:rgba(255,255,255,.02);border:1px solid #2b3139;margin-bottom:7px}
  #adm-panel .ad-fila-tx b{display:block;font-family:var(--display,sans-serif);font-size:13.5px;color:#eaecef}
  #adm-panel .ad-fila-tx span{display:block;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;margin-top:2px}
  #adm-panel .ad-link{flex:0 0 auto;font-family:var(--mono,monospace);font-size:10.5px;color:var(--gold,#E8B84B);text-decoration:none;padding:7px 11px;border-radius:8px;border:1px solid #3a424c;background:transparent;cursor:pointer}
  #adm-panel .ad-link[disabled]{opacity:.35;cursor:default}
  #adm-panel .ad-pre{font-family:var(--mono,monospace);font-size:10px;color:#8b96a3;background:#0b0e12;border:1px solid #2b3139;border-radius:10px;padding:11px;white-space:pre-wrap;word-break:break-word;max-height:210px;overflow-y:auto;line-height:1.5}
  #adm-panel .ad-nota{font-family:var(--sans,sans-serif);font-size:12px;color:#8b96a3;line-height:1.6;padding:11px 13px;border-radius:11px;background:rgba(255,255,255,.03);border:1px dashed #3a424c;margin-bottom:10px}
  #adm-panel .ad-nota.grande{font-size:12.5px}
  #adm-panel .ad-nota b{color:#eaecef}
  #adm-panel .ad-alerta{margin-top:12px;padding:11px 13px;border-radius:11px;background:rgba(246,70,93,.1);border:1px solid rgba(246,70,93,.4);color:#ffb3bd;font-family:var(--sans,sans-serif);font-size:12.5px}
  #adm-panel .ad-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  #adm-panel .ad-acts.col{flex-direction:column}
  #adm-panel .ad-b{flex:1;min-width:130px;min-height:44px;padding:11px 13px;border-radius:11px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:12.5px;cursor:pointer;box-shadow:0 3px 0 #8f6a1a}
  #adm-panel .ad-b.gris,.ad-conf .ad-b.gris{background:linear-gradient(180deg,#1b2027,#0d1117);border-color:#3a424c;color:#b7bdc6;box-shadow:0 3px 0 rgba(0,0,0,.4)}
  #adm-panel .ad-b.rojo,.ad-conf .ad-b.rojo{background:linear-gradient(180deg,#f08a95,#e35d6a 45%,#b8323f);border-color:#d14a58;color:#fff;box-shadow:0 3px 0 #8c2531}
  #adm-panel .ad-b:disabled{opacity:.35;cursor:default;box-shadow:none}
  #adm-panel .ad-b:active{transform:translateY(2px)}
  #adm-panel .ad-caso{padding:13px;border-radius:13px;background:linear-gradient(180deg,#1b2027,#0d1117);border:1px solid rgba(246,70,93,.35);margin-bottom:10px}
  #adm-panel .ad-caso-cab{display:flex;justify-content:space-between;gap:9px;font-family:var(--display,sans-serif);font-size:13.5px;color:#eaecef;margin-bottom:8px}
  #adm-panel .ad-caso-cab span{font-family:var(--mono,monospace);font-size:10.5px;color:#7d8794}
  #adm-panel .ad-caso-p{font-family:var(--sans,sans-serif);font-size:12px;color:#b7bdc6;margin-bottom:4px}
  #adm-panel .ad-caso-p i,#adm-panel .ad-motivo i{font-style:normal;font-family:var(--mono,monospace);font-size:9px;color:#6b7681;text-transform:uppercase;letter-spacing:.6px;margin-right:7px}
  #adm-panel .ad-motivo{margin:8px 0;padding:10px 12px;border-radius:10px;background:rgba(255,255,255,.03);border:1px solid #3a424c;font-family:var(--sans,sans-serif);font-size:12.5px;color:#eaecef;line-height:1.55}
  #adm-panel .ad-motivo i{display:block;margin-bottom:4px}
  #adm-panel .ad-mon{padding:11px 13px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid #2b3139;margin-bottom:7px}
  #adm-panel .ad-mon-cab{display:flex;align-items:baseline;gap:8px}
  #adm-panel .ad-mon-cab b{font-family:var(--display,sans-serif);font-size:14px;color:#eaecef}
  #adm-panel .ad-mon-cab span{font-family:var(--mono,monospace);font-size:10px;color:#6b7681}
  #adm-panel .ad-mon-nums{display:flex;gap:16px;flex-wrap:wrap;margin-top:7px}
  #adm-panel .ad-mon-nums span{font-family:var(--mono,monospace);font-size:12.5px;color:var(--neon-lit,#2ee86a)}
  #adm-panel .ad-mon-nums i{display:block;font-style:normal;font-size:8.5px;color:#6b7681;text-transform:uppercase;letter-spacing:.6px}
  #adm-panel .ad-fn{display:flex;align-items:center;justify-content:space-between;gap:9px;font-family:var(--mono,monospace);font-size:11px;color:#8b96a3;padding:7px 10px;border-radius:8px;background:rgba(255,255,255,.03);border:1px solid #2b3139;margin-bottom:5px;word-break:break-word}
  #adm-panel .ad-mini{flex:0 0 auto;padding:5px 10px;border-radius:7px;border:1px solid #3a424c;background:transparent;color:var(--gold,#E8B84B);font-family:var(--mono,monospace);font-size:10px;cursor:pointer}
  #adm-panel .ad-mini:hover{border-color:var(--gold-soft,#C9A84B)}
  #adm-panel .ad-fn b{color:var(--gold,#E8B84B)}
  #adm-panel .ad-saldo{font-family:var(--mono,monospace);font-size:12.5px;color:#6b7681;flex:0 0 auto}
  #adm-panel .ad-saldo.hay{color:var(--neon-lit,#2ee86a);font-weight:700}
  #adm-panel .ad-cargando,#adm-panel .ad-vacio{font-family:var(--mono,monospace);font-size:11.5px;color:#7d8794;text-align:center;padding:26px 10px;line-height:1.6}
  #adm-panel .ad-msg{font-family:var(--mono,monospace);font-size:11.5px;text-align:center;margin-top:14px;min-height:16px;line-height:1.5;white-space:pre-wrap}
  #adm-panel .ad-msg.ok{color:var(--neon-lit,#2ee86a)}
  #adm-panel .ad-msg.mal{color:var(--rojo,#f6465d)}
  #adm-panel .ad-msg.info{color:var(--gold,#E8B84B)}
  .ad-conf{position:fixed;inset:0;z-index:10010;display:flex;align-items:center;justify-content:center;padding:18px}
  .ad-conf .ad-conf-bg{position:absolute;inset:0;background:rgba(2,4,6,.9)}
  .ad-conf .ad-conf-c{position:relative;width:100%;max-width:400px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft,#C9A84B);border-radius:18px;padding:22px}
  .ad-conf .ad-conf-t{font-family:var(--display,sans-serif);font-weight:800;font-size:18px;color:var(--gold,#E8B84B);text-align:center}
  .ad-conf .ad-conf-s{font-family:var(--sans,sans-serif);font-size:13px;color:#8b96a3;line-height:1.6;margin:11px 0 18px}
  .ad-conf .ad-conf-s b{color:#eaecef}
  .ad-conf .ad-conf-acts{display:flex;gap:9px}
  .ad-conf .ad-b{flex:1;min-height:46px;padding:12px;border-radius:11px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold,#E8B84B) 45%,#c79426);color:#3a2800;font-family:var(--display,sans-serif);font-weight:800;font-size:13px;cursor:pointer}
  .ad-conf .ad-conf-n{font-family:var(--mono,monospace);font-size:9.5px;color:#6b7681;text-align:center;margin-top:11px}
  .ad-conf .ad-lab{display:block;font-family:var(--mono,monospace);font-size:10px;color:#7d8794;text-transform:uppercase;letter-spacing:.6px;margin-bottom:11px}
  .ad-conf .ad-in{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:11px;border-radius:10px;border:1px solid #2b3139;background:#0b0e12;color:#eaecef;font-family:var(--mono,monospace);font-size:13px;text-transform:none;letter-spacing:0}
  .ad-conf .ad-in:focus{outline:none;border-color:var(--gold-soft,#C9A84B)}
  @media(max-width:560px){
    #adm-panel .ad-c{padding:16px 13px;border-radius:15px}
    #adm-panel .ad-t{font-size:18px}
    #adm-panel .ad-kpi b{font-size:16px}
    #adm-panel .ad-b{min-width:100%}
  }`;
  document.head.appendChild(s);
}
