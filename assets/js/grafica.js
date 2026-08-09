// grafica.js — Gráfica real (TradingView) con las cuadrículas del bot encima.
// Módulo independiente: no toca la lógica existente.
//
// CÓMO FUNCIONA
//   · Abajo va el gráfico de velas real del par, de TradingView.
//   · Encima ponemos un "velo" transparente con las líneas de tus cuadrículas,
//     colocadas por precio y con el color de su estado.
//   · El velo se alinea con la escala de precios del gráfico: usamos el mismo
//     rango (mínimo y máximo del bot) para que las líneas caigan donde toca.

const $ = (id) => document.getElementById(id);

/* Pares que TradingView tiene en Binance (los más comunes en BSC). */
const PARES = {
  'BNB/USDT': 'BINANCE:BNBUSDT', 'BNB/BUSD': 'BINANCE:BNBUSDT',
  'BTC/USDT': 'BINANCE:BTCUSDT', 'BTCB/USDT': 'BINANCE:BTCUSDT',
  'ETH/USDT': 'BINANCE:ETHUSDT', 'CAKE/USDT': 'BINANCE:CAKEUSDT',
  'XRP/USDT': 'BINANCE:XRPUSDT', 'ADA/USDT': 'BINANCE:ADAUSDT',
  'DOGE/USDT': 'BINANCE:DOGEUSDT', 'SOL/USDT': 'BINANCE:SOLUSDT',
  'LINK/USDT': 'BINANCE:LINKUSDT', 'DOT/USDT': 'BINANCE:DOTUSDT',
  'MATIC/USDT': 'BINANCE:MATICUSDT', 'AVAX/USDT': 'BINANCE:AVAXUSDT',
  'LTC/USDT': 'BINANCE:LTCUSDT', 'TRX/USDT': 'BINANCE:TRXUSDT',
  'SHIB/USDT': 'BINANCE:SHIBUSDT', 'UNI/USDT': 'BINANCE:UNIUSDT',
  'ATOM/USDT': 'BINANCE:ATOMUSDT', 'NEAR/USDT': 'BINANCE:NEARUSDT',
  'FIL/USDT': 'BINANCE:FILUSDT', 'INJ/USDT': 'BINANCE:INJUSDT',
  'USDC/USDT': 'BINANCE:USDCUSDT', 'TWT/USDT': 'BINANCE:TWTUSDT'
};

/** Busca el símbolo de TradingView del par. null si no lo tiene. */
export function simboloTV(simB, simQ) {
  const b = String(simB || '').toUpperCase().replace(/^W/, '');   // WBNB → BNB
  const q = String(simQ || '').toUpperCase();
  const directo = PARES[`${b}/${q}`];
  if (directo) return directo;
  if (q === 'USDT' || q === 'BUSD' || q === 'USDC') return `BINANCE:${b}USDT`;
  return null;
}

let _n = 0;

/** Devuelve el HTML del bloque: gráfica + velo con cuadrículas. */
export function bloqueGrafica({ simB, simQ, pmin, pmax, niveles, precio, decQ }) {
  const sym = simboloTV(simB, simQ);
  const id = 'tvg' + (++_n);
  if (!sym) {
    return `<div class="tvbox sin"><div class="tv-sin">
      <b>${String(simB || '')}/${String(simQ || '')}</b>
      <span>Esta moneda no tiene gráfica pública. Abajo tienes tus cuadrículas y sus precios.</span>
    </div>${veloHTML({ pmin, pmax, niveles, precio, decQ, solo: true })}</div>`;
  }
  return `<div class="tvbox" data-tv="${id}" data-sym="${sym}">
    <div class="tv-host" id="${id}"></div>
    ${veloHTML({ pmin, pmax, niveles, precio, decQ })}
    <div class="tv-pie">Gráfica real de ${String(simB).toUpperCase()}. Las líneas son <b>tus cuadrículas</b>, colocadas por su precio.</div>
  </div>`;
}

/* El velo: líneas de cuadrícula colocadas por precio. */
function veloHTML({ pmin, pmax, niveles, precio, decQ, solo = false }) {
  const min = Number(pmin), max = Number(pmax);
  if (!(max > min)) return '';
  // Dejamos un 8% de aire arriba y abajo: así ninguna línea queda pegada al borde.
  const y = (p) => 8 + (1 - (Number(p) - min) / (max - min)) * 84;
  const fmt = (p) => Number(p).toLocaleString('es', { maximumFractionDigits: Math.min(Number(decQ) || 4, 8) });

  const lineas = (niveles || []).map((nv) => {
    const py = y(nv.precio);
    if (py < 0 || py > 100) return '';
    const cls = nv.estado === 1 ? 'compra' : (nv.estado === 2 ? 'venta' : 'espera');
    return `<div class="tv-lin ${cls}" style="top:${py.toFixed(2)}%">
      <span class="tv-precio">${fmt(nv.precio)}</span>
    </div>`;
  }).join('');

  const pyAhora = precio > 0 ? y(precio) : null;
  const ahora = (pyAhora !== null && pyAhora >= 0 && pyAhora <= 100)
    ? `<div class="tv-ahora" style="top:${pyAhora.toFixed(2)}%"><span>${fmt(precio)} ahora</span></div>` : '';

  return `<div class="tv-velo ${solo ? 'solo' : ''}">${lineas}${ahora}</div>`;
}

/* ── Estilos ── */
function estilos() {
  if ($('tvg-css')) return;
  const s = document.createElement('style'); s.id = 'tvg-css';
  s.textContent = `
  .tvbox{position:relative;width:100%;height:300px;border-radius:14px;overflow:hidden;background:#0b0e12;border:1px solid var(--line,#2b3139)}
  .tvbox.sin{height:auto;min-height:230px;display:flex;flex-direction:column}
  .tv-host{position:absolute;inset:0}
  .tv-host iframe{border:none!important}
  .tv-sin{padding:16px;text-align:center}
  .tv-sin b{display:block;font-family:var(--display,sans-serif);font-size:16px;color:var(--gold,#E8B84B)}
  .tv-sin span{display:block;font-family:var(--sans,sans-serif);font-size:11.5px;color:var(--ink-3,#7d8794);margin-top:5px;line-height:1.5}
  /* el velo deja pasar el ratón al gráfico */
  .tv-velo{position:absolute;inset:0;pointer-events:none;z-index:2}
  .tv-velo.solo{position:relative;height:180px;margin:0 12px 12px}
  .tv-lin{position:absolute;left:0;right:0;height:0;border-top:1px dashed rgba(255,255,255,.28)}
  .tv-lin.compra{border-top-color:rgba(46,232,106,.75)}
  .tv-lin.venta{border-top-color:rgba(246,70,93,.7)}
  .tv-lin.espera{border-top-color:rgba(255,255,255,.22)}
  .tv-precio{position:absolute;left:6px;top:-9px;font-family:var(--mono,monospace);font-size:9px;padding:1px 6px;border-radius:5px;background:rgba(11,14,18,.82);color:#cfd6de;border:1px solid rgba(255,255,255,.12);white-space:nowrap}
  .tv-lin.compra .tv-precio{color:#8ff0bd;border-color:rgba(46,232,106,.4)}
  .tv-lin.venta .tv-precio{color:#ffb3bd;border-color:rgba(246,70,93,.4)}
  .tv-ahora{position:absolute;left:0;right:0;height:0;border-top:1.5px solid var(--gold,#E8B84B);box-shadow:0 0 10px rgba(232,184,75,.45)}
  .tv-ahora span{position:absolute;right:6px;top:-9px;font-family:var(--mono,monospace);font-size:9px;padding:1px 7px;border-radius:5px;background:var(--gold,#E8B84B);color:#3a2800;font-weight:700;white-space:nowrap}
  .tv-pie{position:absolute;left:0;right:0;bottom:0;z-index:1;padding:5px 10px;font-family:var(--mono,monospace);font-size:9px;color:#8b96a3;background:linear-gradient(180deg,transparent,rgba(11,14,18,.9) 55%);text-align:center}
  .tv-pie b{color:var(--gold-soft,#C9A84B)}
  @media(max-width:560px){
    .tvbox{height:250px}
    .tv-precio,.tv-ahora span{font-size:8px;padding:1px 4px}
    .tv-pie{font-size:8px}
  }`;
  document.head.appendChild(s);
}

/* ── Cargar el widget de TradingView (una sola vez) ── */
let _tvCargando = null;
function cargarTV() {
  if (window.TradingView) return Promise.resolve(true);
  if (_tvCargando) return _tvCargando;
  _tvCargando = new Promise((res) => {
    const sc = document.createElement('script');
    sc.src = 'https://s3.tradingview.com/tv.js';
    sc.async = true;
    sc.onload = () => res(true);
    sc.onerror = () => res(false);      // si no carga, se queda solo el velo
    document.head.appendChild(sc);
    setTimeout(() => res(!!window.TradingView), 8000);
  });
  return _tvCargando;
}

/** Pinta las gráficas que haya en pantalla. Se puede llamar varias veces. */
export async function pintar(raiz) {
  estilos();
  const cajas = [...(raiz || document).querySelectorAll('.tvbox[data-tv]')].filter((c) => !c.dataset.listo);
  if (cajas.length === 0) return;
  const ok = await cargarTV();
  for (const caja of cajas) {
    caja.dataset.listo = '1';
    const host = caja.querySelector('.tv-host');
    if (!ok || !window.TradingView) {
      if (host) host.innerHTML = `<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#7d8794;font-family:var(--mono,monospace);font-size:11px;text-align:center;padding:14px">No se pudo cargar la gráfica.<br>Tus cuadrículas y precios siguen abajo.</div>`;
      continue;
    }
    try {
      new window.TradingView.widget({
        container_id: caja.querySelector('.tv-host').id,
        symbol: caja.dataset.sym,
        interval: '60',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'es',
        toolbar_bg: '#0b0e12',
        hide_top_toolbar: true,
        hide_legend: false,
        hide_side_toolbar: true,
        allow_symbol_change: false,
        save_image: false,
        withdateranges: false,
        autosize: true
      });
    } catch (_) {}
  }
}
