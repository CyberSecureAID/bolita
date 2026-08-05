/**
 * LA COLMENA — app del bot de rejilla (página propia, pantalla completa)
 * =====================================================================
 * Se dibuja dentro de <div id="colmena-app"> de colmena.html. Lenguaje simple,
 * botones (i), gráfica viva con las cuadrículas, e inversión total en una cifra.
 */

import * as gb from './gridbot.js';
import * as wallet from './wallet.js';
import { MONEDAS, LISTA_TODAS } from './tokens.js';

const $ = (id) => document.getElementById(id);
const APP = 'colmena-app';
// Lo que se OPERA (base). Las estables no pueden ser base.
const BASES  = ['BNB', 'BTCB', 'ETH', 'SOL', 'DOGE', 'XRP', 'CAKE', 'LINK', 'ADA'];
// Contra qué se mide (quote): estables.
const QUOTES = ['USDT', 'USDC'];

const INFO = {
  par: 'Elige qué moneda quieres comprar y vender, y contra cuál (lo normal es una estable como USDT). El bot comprará barato y venderá caro entre esas dos, solo.',
  rango: 'El precio más bajo y el más alto donde quieres que el bot trabaje. Para que funcione, el precio de ahora debe quedar DENTRO del rango. ¿No sabes qué poner? Dale a "Sugerir".',
  cuadriculas: 'En cuántos escalones parte el rango. Más cuadrículas = muchas operaciones pequeñas y seguidas. Menos = operaciones más grandes y espaciadas.',
  inversion: 'Cuánto dinero pones a trabajar. El bot lo reparte entre las cuadrículas para ir comprando por partes cuando el precio baja.',
  proteccion: 'Cuánta diferencia de precio aceptas al operar. Si el precio salta más que esto justo al operar, el bot no opera para no comprarte caro. Si no sabes, deja 1%.',
  ritmo: 'Tiempo mínimo entre una operación y otra. Déjalo en 0 y operará cada vez que pueda.',
  reparto: 'Cuántas cuadrículas quedan por ENCIMA de tu precio de entrada (que se venden) y cuántas por DEBAJO (que compran). El bot compra a mercado el inventario de las de arriba al encender, y deja las de abajo esperando bajadas. El reparto del dinero es proporcional a cada lado, no mitad y mitad.',
  separacion: 'La distancia, en porcentaje, entre una cuadrícula y la siguiente. Es igual en todas (por eso el bot compra y vende parejo). La calcula el sistema con tu rango y tu número de cuadrículas: más cuadrículas = menos distancia; más rango = más distancia.',
  estrategia: 'Configuraciones listas según lo que buscas. "Tranquilo": rango amplio y pocas cuadrículas grandes — opera menos pero cada operación rinde y aguanta meses sin salirse; ideal con poco capital. "Equilibrado": punto medio. "Activo": rango más ceñido y más cuadrículas — opera más seguido, pero necesita más capital para que cada cuadrícula sea rentable. Puedes ajustar el rango a mano después.',
  asesor: 'Estimación aproximada de cuántas operaciones haría el bot al día y cuánto rendiría al mes, según la volatilidad típica de la moneda. NO es una promesa: si el mercado se mueve más, gana más; si se queda quieto, gana menos. Sirve para comparar configuraciones entre sí.',
  tp: 'Opcional. Si el precio sube hasta aquí, el bot vende todo y termina, dejándote la ganancia.',
  sl: 'Opcional. Si el precio baja hasta aquí, el bot vende todo para no seguir perdiendo. Un freno de emergencia.',
  gas: 'La red cobra unos centavos por cada operación (el "gas", no es nuestra comisión). Deja aquí ~2 USD en BNB y el bot se encarga solo. Es tuyo: lo retiras cuando quieras.',
  ganancia: 'Lo que ya ganaste de verdad, con la comisión y el gas descontados. Es dinero que ya está en tu wallet.',
  porcuad: 'Lo que ganas cada vez que el bot completa una vuelta (compra abajo y vende arriba), ya con la comisión descontada.',
  margenmodo: 'Cuando fijas "Ganancia por cuadrícula", elige qué prioriza el sistema. "Ajustar cuadrículas": mantiene tu rango y calcula cuántas cuadrículas caben. "Ampliar rango": mantiene tu número de cuadrículas y te ofrece ampliar el rango (el bot será menos sensible, pero cada cuadrícula gana ese %). Así puedes operar con poco capital sin que la comisión se coma la ganancia.',
  margen: 'Opcional. Si lo pones, cada cuadrícula se venderá SOLO cuando gane al menos ese % por encima de la comisión — nunca a pérdida. Y el sistema recalcula solo cuántas cuadrículas caben en tu rango para que la separación sea ese %. Déjalo en "auto" para el reparto normal.',
  tipobot: 'Tres formas de trabajar. SMART GRID: compra y vende en cada nivel, muchas operaciones pequeñas. ACCUMULATOR: compra en la caída y vende TODO junto al ganar el % que elijas. CASH OUT: vende la cripto que YA tienes cuando suba al precio o % que elijas (sin compra, sin comisión de compra).',
  cashcant: 'Cuánta cripto de la que YA tienes en tu wallet quieres vender. No la compra el bot: es tuya. Solo le das permiso para venderla cuando llegue tu objetivo. Toca "Máx" para vender todo tu saldo.',
  cashobj: 'Cuándo vender. Por % : vende cuando el precio suba ese porcentaje desde ahora. Por precio: vende cuando llegue exactamente a ese precio. En ambos casos, recibes tu estable (USDT/USDC) en tu wallet.',
  acmin: 'El precio más bajo hasta donde el bot seguirá comprando. Cuanto más abajo, más aguanta una caída sin quedarse sin comprar. Pon un mínimo realista para tu moneda.',
  acniv: 'En cuántas compras separadas se reparte tu dinero desde el precio de ahora hasta el mínimo. Más compras = más suave el promediado.',
  acini: 'Qué parte de tu dinero se compra YA, a precio de mercado, al encender. El resto se reserva para comprar más barato si baja. Ej: 30% ahora, 70% esperando caídas.',
  acfactor: 'Cuánto MÁS compra en cada nivel según baja. Ej: 20% significa que cada escalón hacia abajo compra 20% más volumen que el anterior. Así, si cae fuerte, promedias mucho mejor.',
  acobj: 'La ganancia a la que vende TODO de golpe. El bot no vende hasta que tu posición completa esté en ese +% de beneficio. Si está en negativo, espera. Al vender, vuelve a empezar.',
  promedio: 'El precio promedio al que compraste (tu coste ÷ lo que tienes). Si el mercado sube por encima de este precio, tu posición está en ganancia.',
  vueltas: 'Una VUELTA ENTERA es una operación completa: el bot compró en una cuadrícula y luego vendió en otra (o al revés). Ahí se concreta la ganancia de rejilla. "Operaciones" cuenta cada compra o cada venta por separado; una vuelta son dos operaciones. Si el precio cruzó una cuadrícula pero aún no ves la vuelta, es que el keeper todavía no ejecutó esa venta on-chain.'
};

const F = { baseId: 'BNB', quoteId: 'USDT', modo: 'geo', precio: null, rutas: null, avanzado: false, saldoQuote: null, preset: 'equilibrado', tipo: 'grid', margenModo: 'cuadriculas' };
const moneda = (id) => MONEDAS[id];
const FEE_CICLO = 0.0015; // V3: 0.05%×2 PancakeSwap + nuestra comisión en 0
const GAS_OP_USD = 0.012; // ~coste de gas por operación en BSC hoy (~0.05 gwei)
const VOL_DIARIA = { BNB: 0.04, BTCB: 0.025, ETH: 0.035, SOL: 0.06, DOGE: 0.08, XRP: 0.06, CAKE: 0.07, LINK: 0.06, ADA: 0.06, BABYDOGE: 0.10 }; // volatilidad diaria típica (estimada)
const PRESETS = {
  tranquilo:   { rango: 0.30, grids: 14 },  // pocas ops, cada cuadrícula grande → rinde con poco capital, aguanta meses
  equilibrado: { rango: 0.20, grids: 24 },
  activo:      { rango: 0.12, grids: 40 },   // más ops, más sensible; pide más capital por cuadrícula
  volatil:     { rango: 0.45, grids: 26 },   // monedas volátiles: rango amplio + cuadrículas medias (aguanta sin salirse)
};
const CARET = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23C9A84B' stroke-width='3'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

/* ================================================================== */
/* Estilos                                                             */
/* ================================================================== */
function inyectarEstilo() {
  if ($('colmena-css')) return;
  const s = document.createElement('style'); s.id = 'colmena-css';
  s.textContent = `
  #colmena-app{
    --panel:#1b2027; --panel-2:#12161c;
    --ink:#eaecef; --ink-2:#b7bdc6; --ink-3:#7d8794;
    --line:#2b3139; --line-soft:rgba(255,255,255,.055);
    --neon:#12d18e; --neon-lit:#2ee86a; --neon-dim:rgba(14,203,129,.38);
    --rojo:#f6465d;
    font-family:var(--sans);color:var(--ink);position:relative;isolation:isolate;
    background:#0b0e11;min-height:100vh;overflow-x:hidden}
  #colmena-app .c-hdr{position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:14px 22px;background:rgba(11,14,17,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  #colmena-app .c-brand{font-family:var(--display);font-weight:700;font-size:20px;color:var(--gold);text-decoration:none;letter-spacing:.3px}
  #colmena-app .c-hdr-r{display:flex;align-items:center;gap:12px}
  #colmena-app .c-volver{font-family:var(--mono);font-size:12px;color:var(--ink-3);text-decoration:none}
  #colmena-app .c-volver:hover{color:var(--gold)}
  #colmena-app .dir{font-family:var(--mono);font-size:12px;font-weight:700;color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);border:1px solid #c79426;border-radius:100px;padding:8px 14px;box-shadow:0 3px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.5);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .hdr-off{width:34px;height:34px;border-radius:50%;background:transparent;border:1px solid var(--line);color:var(--ink-3);cursor:pointer;display:inline-grid;place-items:center;padding:0;line-height:0}
  #colmena-app .hdr-off svg{display:block}
  #colmena-app .hdr-off:hover{border-color:var(--rojo);color:var(--rojo)}
  #colmena-app .hdr-btn{margin:0;width:auto;padding:10px 18px}
  #colmena-app .wrap{max-width:1180px;margin:0 auto;padding:26px 22px 60px}
  #colmena-app .lead{font-size:15px;color:var(--ink-2);margin:0 0 22px;max-width:660px}
  #colmena-app .lead b{color:var(--gold)}
  #colmena-app .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch}
  #colmena-app .cols>div{display:flex;flex-direction:column}
  #colmena-app .cols>div>.card{flex:1}
  #colmena-app .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:18px;padding:22px}
  #colmena-app .card h3{font-family:var(--display);color:var(--gold);margin:0 0 4px;font-size:18px}
  #colmena-app .card .sub{color:var(--ink-3);font-size:12.5px;margin:0 0 16px}
  #colmena-app .lab{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--ink-2);margin:16px 0 7px;padding-left:3px;text-transform:uppercase;letter-spacing:.6px}
  #colmena-app .i-btn{width:14px;height:14px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--ink-3);font-family:var(--display);font-size:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;opacity:.6;transition:opacity .15s,color .15s,border-color .15s}
  #colmena-app .i-btn:hover{opacity:1;color:var(--gold);border-color:var(--gold-soft)}
  #colmena-app .i-btn:hover{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  #colmena-app input,#colmena-app select{width:100%;box-sizing:border-box;background:#0d1117;color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:13px 14px;font-family:var(--mono);font-size:15px}
  #colmena-app select{-webkit-appearance:none;appearance:none;padding-right:40px;background-image:url("${CARET}");background-repeat:no-repeat;background-position:right 14px center;background-size:12px}
  #colmena-app input:focus,#colmena-app select:focus{outline:none;border-color:var(--gold)}
  #colmena-app .fila{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #colmena-app .btn,#colmena-modal .btn{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:14px;font-family:var(--display);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s}
  #colmena-app .btn:hover,#colmena-modal .btn:hover{filter:brightness(1.1)}
  #colmena-app .btn-oro:hover,#colmena-modal .btn-oro:hover{filter:none;transform:translateY(-1px);box-shadow:0 6px 0 #8f6a1a,0 12px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.5)}
  #colmena-app .btn-verde:hover,#colmena-modal .btn-verde:hover{filter:none;transform:translateY(-1px);box-shadow:0 6px 0 #12702f,0 12px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.4)} #colmena-app .btn:disabled{opacity:.5;cursor:not-allowed}
  #colmena-app .btn-oro,#colmena-modal .btn-oro{background:linear-gradient(180deg,#f7db8d,var(--gold) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a,0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .09s,box-shadow .09s,filter .12s;text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .btn-oro:active,#colmena-modal .btn-oro:active{transform:translateY(4px);box-shadow:0 0 0 #8f6a1a,0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4)}
  #colmena-app .btn-oro3d{width:100%;border:none;border-radius:13px;padding:16px;font-family:var(--display);font-weight:800;font-size:16px;cursor:pointer;color:#3a2800;letter-spacing:.3px;background:linear-gradient(180deg,#f7db8d,var(--gold) 45%,#c79426);box-shadow:0 5px 0 #8f6a1a,0 11px 24px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.55);transition:transform .09s,box-shadow .09s,filter .12s;text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .btn-oro3d:hover{filter:brightness(1.05)}
  #colmena-app .btn-oro3d:active{transform:translateY(5px);box-shadow:0 0 0 #8f6a1a,0 4px 12px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.4)}
  #colmena-app .faq-search{width:100%;box-sizing:border-box;margin:0 0 14px;padding:13px 16px;border-radius:11px;border:1px solid var(--line);background:rgba(255,255,255,.03);color:var(--ink);font-family:var(--sans);font-size:14px}
  #colmena-app .faq-search::placeholder{color:var(--ink-3)}
  #colmena-app .faq-search:focus{outline:none;border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(232,184,75,.12)}
  #colmena-app .faq-empty{text-align:center;color:var(--ink-3);font-family:var(--mono);font-size:12px;padding:16px}
  #colmena-app .conectar-box{max-width:440px;margin:44px auto;text-align:center;background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:18px;padding:40px 26px;box-shadow:0 18px 50px rgba(0,0,0,.45)}
  #colmena-app .conectar-box h2{font-family:var(--display);color:var(--gold);font-size:28px;margin:0 0 12px;text-shadow:0 1px 2px rgba(0,0,0,.5)}
  #colmena-app .conectar-box p{font-family:var(--sans);color:var(--ink-2);font-size:15px;line-height:1.6;margin:0 auto 26px;max-width:340px}
  #colmena-app .conectar-box .btn{max-width:300px;margin:0 auto;display:block}
  #colmena-app .c-faq-wrap .faq-short{display:none}
  @media(max-width:560px){
    #colmena-app .conectar-box{margin:22px auto;padding:30px 20px}
    #colmena-app .conectar-box h2{font-size:23px}
    #colmena-app .conectar-box p{font-size:14px}
    #colmena-app .c-faq-wrap .faq-long{display:none}
    #colmena-app .c-faq-wrap .faq-short{display:inline}
    #colmena-app .c-faq-wrap summary{font-size:14px}
    #colmena-app .pio-band .l .v,#colmena-app .pio-band .r .v{word-break:break-all}
    #colmena-app .pio-pair{font-size:18px}
  }
  #colmena-app mark.faq-hl{background:transparent;color:var(--gold);font-weight:800;text-shadow:0 0 8px rgba(232,184,75,.3)}
  #colmena-app .acum-hero{text-align:center;padding:14px 12px 6px}
  #colmena-app .acum-hero .acum-ico{font-size:46px;line-height:1;filter:drop-shadow(0 0 16px rgba(232,184,75,.35))}
  #colmena-app .acum-hero h4{font-family:var(--display);color:var(--gold);font-size:20px;margin:10px 0 8px;text-shadow:0 1px 2px rgba(0,0,0,.5)}
  #colmena-app .acum-hero p{font-family:var(--sans);color:var(--ink-2);font-size:13px;line-height:1.55;margin:0 auto 14px;max-width:300px}
  #colmena-app .acum-flow{display:flex;flex-direction:column;gap:8px;text-align:left;max-width:320px;margin:0 auto}
  #colmena-app .acum-flow .af{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;color:var(--ink-2);background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:10px;padding:9px 12px}
  #colmena-app .acum-flow .af span{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#5cf58c,#1ea34a);color:#03210f;font-weight:800;font-size:12px}
  /* ===== Cash Out ===== */
  #colmena-app .cash-note{font-family:var(--sans);font-size:13px;color:var(--ink-2);text-align:center;background:linear-gradient(180deg,#12161c,#0d1117);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:18px 0 6px;box-shadow:0 3px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)}
  #colmena-app .cash-note b{color:var(--gold)}
  #colmena-app .cash-bal{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-bottom:8px;font-family:var(--mono);font-size:11.5px;color:var(--ink-3)}
  #colmena-app .cash-bal #fc-saldo{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  #colmena-app .cash-max{flex:0 0 auto;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);color:#3a2800;border:1px solid #c79426;border-radius:8px;padding:5px 13px;font-family:var(--mono);font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #8f6a1a;text-shadow:0 1px 0 rgba(255,255,255,.3);transition:transform .08s,box-shadow .08s}
  #colmena-app .cash-max:active{transform:translateY(2px);box-shadow:0 0 0 #8f6a1a}
  #colmena-app .stepper.has-suffix input{padding-right:132px}
  #colmena-app .cash-eq{position:absolute;right:42px;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:12px;color:var(--ink-3);pointer-events:none;max-width:86px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
  #colmena-app .cash-slider{-webkit-appearance:none;appearance:none;width:100%;height:3px;border-radius:100px;background:var(--line);outline:none;margin:16px 0 8px;cursor:pointer}
  #colmena-app .cash-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:15px;height:15px;border-radius:50%;background:#eaecef;border:2px solid var(--gold);cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,.5);margin-top:-6px}
  #colmena-app .cash-slider::-moz-range-thumb{width:13px;height:13px;border-radius:50%;background:#eaecef;border:2px solid var(--gold);cursor:pointer}
  #colmena-app .cash-resumen{margin-top:16px;background:linear-gradient(180deg,#12161c,#0b0e11);border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:0 8px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.03)}
  #colmena-app .cash-resumen .cr-top{font-family:var(--display);color:var(--gold);font-size:14px;font-weight:700;text-align:center;margin-bottom:12px;text-shadow:0 1px 1px rgba(0,0,0,.4);letter-spacing:.3px}
  #colmena-app .cash-resumen .cr-rows{display:flex;flex-direction:column;gap:1px;background:var(--line-soft);border-radius:11px;overflow:hidden}
  #colmena-app .cash-resumen .cr-row{display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:rgba(0,0,0,.28);font-family:var(--mono);font-size:12.5px}
  #colmena-app .cash-resumen .cr-row span{color:var(--ink-3)}
  #colmena-app .cash-resumen .cr-row b{color:var(--ink);font-family:var(--display);font-size:15px}
  #colmena-app .cash-resumen .cr-gan b{font-size:18px}
  #colmena-app .cash-resumen .cr-gan b.pos{color:var(--neon-lit);text-shadow:0 0 12px rgba(46,232,106,.3)}
  #colmena-app .cash-resumen .cr-gan b.neg{color:var(--rojo)}
  #colmena-app .cash-resumen .cr-note{text-align:center;font-family:var(--sans);font-size:12px;color:var(--ink-2);line-height:1.55;margin-top:12px}
  #colmena-app .cash-resumen .cr-note b{color:var(--gold)}
  #colmena-app .btn-verde,#colmena-modal .btn-verde{background:linear-gradient(180deg,#5cf58c,var(--neon) 45%,#1ea34a);color:#03210f;box-shadow:0 4px 0 #12702f,0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .09s,box-shadow .09s,filter .12s;text-shadow:0 1px 0 rgba(255,255,255,.25)}
  #colmena-app .btn-verde:active,#colmena-modal .btn-verde:active{transform:translateY(4px);box-shadow:0 0 0 #12702f,0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .btn-linea,#colmena-modal .btn-linea{background:transparent;border:1px solid var(--line);color:var(--ink)}
  #colmena-app .btn-rojo,#colmena-modal .btn-rojo{background:transparent;border:1px solid var(--rojo);color:var(--rojo)}
  #colmena-app .mt{margin-top:14px} #colmena-app .mt8{margin-top:8px}
  #colmena-app .link{background:none;border:none;color:var(--gold-soft);font-family:var(--mono);font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:16px}
  #colmena-app .sug{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid var(--gold-soft);color:var(--gold);border-radius:8px;padding:6px 11px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-left:auto;box-shadow:0 2px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .08s,box-shadow .08s}
  #colmena-app .sug:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.3)}
  #colmena-app .seg{display:flex;gap:6px}
  #colmena-app .seg button{flex:1;padding:11px;border:1px solid var(--line);background:transparent;color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #colmena-app .seg button.on{background:var(--gold);color:#1a1200;border-color:var(--gold);font-weight:700}
  #colmena-app .avz{border-top:1px solid var(--line-soft);margin-top:18px;padding-top:4px}
  #colmena-app .chart{width:100%;height:auto;display:block;border-radius:14px;background:#0d1117;border:1px solid var(--line-soft)}
  #colmena-app .hint{font-family:var(--mono);font-size:11px;color:var(--gold-soft);margin-top:8px}
  #colmena-app .prev{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
  #colmena-app .p{background:#12161c;border:1px solid var(--line-soft);border-radius:11px;padding:11px;text-align:center}
  #colmena-app .p b{display:flex;align-items:center;justify-content:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #colmena-app .p span{font-family:var(--display);font-size:16px;color:var(--ink);display:block;margin-top:3px}
  #colmena-app .p span.pos{color:var(--neon-lit)}
  #colmena-app .gasbox{background:#12161c;border:1px solid var(--line-soft);border-radius:12px;padding:14px;margin-top:16px}
  #colmena-app .gasbox .top{display:flex;align-items:center;justify-content:space-between}
  #colmena-app .gasbox .v{font-family:var(--display);color:var(--gold);font-size:20px}
  #colmena-app .gas-row{display:flex;gap:8px;margin-top:12px}
  #colmena-app .gas-row input{flex:1}
  #colmena-app .gas-row .btn{width:auto;white-space:nowrap;padding:13px 16px}
  #colmena-app .btn-gasret{margin-top:10px;padding:11px;font-size:13px}
  #colmena-app .aviso{font-family:var(--mono);font-size:12px;padding:11px;border-radius:9px;margin-top:12px}
  #colmena-app .aviso.info{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid var(--gold-soft)}
  #colmena-app .aviso.err{background:rgba(255,107,107,.08);color:var(--rojo);border:1px solid var(--rojo)}
  #colmena-app .aviso.warn{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid var(--gold-soft)}
  #colmena-app .hero{text-align:center;padding:70px 20px}
  #colmena-app .hero h1{font-family:var(--display);color:var(--gold);font-size:34px;margin:0 0 12px}
  #colmena-app .colmenas{margin-top:24px;position:relative;overflow:hidden;
    background:linear-gradient(180deg,rgba(3,11,8,.82),rgba(3,11,8,.9)),url('assets/img/fondo-bots.webp') center/cover no-repeat;
    border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.45)}
  #colmena-app .colmenas h3{position:relative;text-shadow:0 2px 12px rgba(0,0,0,.6)}
  #colmena-app .rej{border:1px solid rgba(232,184,75,.18);border-radius:16px;padding:18px;margin-top:16px;
    background:rgba(255,255,255,.03);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);
    box-shadow:0 10px 34px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)}
  #colmena-app .rej-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  #colmena-app .rej-par{font-family:var(--display);color:var(--gold);font-size:17px}
  #colmena-app .pill{font-family:var(--mono);font-size:10px;padding:4px 9px;border-radius:20px}
  #colmena-app .pill.on{background:rgba(46,232,106,.15);color:var(--neon-lit)} #colmena-app .pill.off{background:rgba(100,133,122,.15);color:var(--ink-3)}
  @keyframes cpulse{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.25)}}
  #colmena-app .pill.on .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--neon-lit);margin-right:6px;animation:cpulse 1.2s ease-in-out infinite;vertical-align:middle}
  #colmena-app .ganmsg{background:rgba(46,232,106,.06);border:1px solid var(--neon-dim);border-radius:10px;padding:10px 12px;font-size:12.5px;color:var(--neon-lit);margin:12px 0}
  #colmena-app .rej-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;align-items:start}
  #colmena-app .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
  #colmena-app .stat{background:#12161c;border:1px solid var(--line-soft);border-radius:10px;padding:9px}
  #colmena-app .stat b{display:flex;align-items:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase}
  #colmena-app .stat span{font-family:var(--display);font-size:15px;color:var(--ink)}
  #colmena-app .stat span.pos{color:var(--neon-lit)} #colmena-app .stat span.neg{color:var(--rojo)}
  #colmena-app .rej-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}
  #colmena-app .rej-btns .btn{font-size:12px;padding:10px}
  #colmena-app .leg{display:flex;gap:12px;flex-wrap:wrap;font-family:var(--mono);font-size:10px;color:var(--ink-3);margin-top:8px}
  #colmena-pop{position:absolute;z-index:9999;max-width:280px;background:#12161c;border:1px solid var(--gold-soft);border-radius:10px;padding:12px 14px;font-size:13px;color:var(--ink);box-shadow:0 10px 30px rgba(0,0,0,.5);display:none;line-height:1.5}
  /* ============ VIDA: fondo, brillos y movimiento ============ */
  #colmena-app::before{content:"";position:fixed;inset:-25%;z-index:-2;pointer-events:none;
    background:radial-gradient(45% 35% at 50% -8%, rgba(232,184,75,.04), transparent 65%);
    filter:blur(60px)}
  #colmena-app::after{content:"";position:fixed;inset:0;z-index:-2;pointer-events:none;opacity:.25;
    background-image:radial-gradient(rgba(255,255,255,.03) 1px, transparent 1.5px);background-size:34px 34px;
    animation:stars 90s linear infinite}
  @keyframes drift{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(3%,-2%,0) scale(1.08)}100%{transform:translate3d(-3%,2%,0) scale(1.05)}}
  @keyframes stars{from{background-position:0 0}to{background-position:340px 700px}}
  @media(prefers-reduced-motion:reduce){#colmena-app::before,#colmena-app::after{animation:none}}
  /* botones vivos */
  #colmena-app .btn{transition:transform .12s ease,filter .15s,box-shadow .2s}
  #colmena-app .btn-linea:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,0,0,.35)}
  #colmena-app .btn:active{transform:translateY(0)}
  #colmena-app .btn-verde,#colmena-app .btn-oro{position:relative;overflow:hidden}
  #colmena-app .btn-verde::after,#colmena-app .btn-oro::after{content:"";position:absolute;top:0;left:-120%;width:55%;height:100%;
    background:linear-gradient(100deg,transparent,rgba(255,255,255,.4),transparent);transform:skewX(-18deg);pointer-events:none;animation:sheen 3.8s ease-in-out infinite}
  @keyframes sheen{0%,55%{left:-120%}100%{left:135%}}
  /* tarjetas con vida */
  #colmena-app .card{transition:box-shadow .25s,border-color .25s}
  #colmena-app .card:hover{border-color:rgba(232,184,75,.22);box-shadow:0 18px 50px rgba(0,0,0,.45)}
  #colmena-app input:focus,#colmena-app select:focus{box-shadow:0 0 0 3px rgba(232,184,75,.14)}
  #colmena-app input[type=number]::-webkit-inner-spin-button,#colmena-app input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
  #colmena-app input[type=number]{-moz-appearance:textfield}
  #colmena-app .stepper{position:relative}
  #colmena-app .stepper input{padding-right:38px}
  #colmena-app .gas-row .stepper{flex:1}
  #colmena-app .stepper-btns{position:absolute;right:6px;top:6px;bottom:6px;display:flex;flex-direction:column;gap:3px}
  #colmena-app .stepper-btns button{flex:1;width:24px;border:1px solid var(--line);background:#1b2027;color:var(--gold-soft);border-radius:6px;font-size:7px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;transition:background .12s,color .12s,transform .1s}
  #colmena-app .stepper-btns button:hover{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  #colmena-app .stepper-btns button:active{transform:scale(.92)}
  #colmena-app .saldo-chip{font-family:var(--mono);font-size:10px;color:var(--gold-soft);cursor:pointer;white-space:nowrap;text-transform:none;letter-spacing:0}
  #colmena-app .saldo-chip:hover{color:var(--gold)} #colmena-app .saldo-chip b{color:var(--gold)}
  #colmena-app .btn-avz{background:rgba(255,255,255,.03);border:1px solid var(--line-soft);color:var(--ink-3);font-family:var(--mono);font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;margin-top:14px;transition:color .12s,border-color .12s}
  #colmena-app .btn-avz:hover{color:var(--gold);border-color:var(--gold-soft)}
  #colmena-app .paso-box{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding:12px 14px;background:#12161c;border:1px solid var(--line-soft);border-radius:11px}
  #colmena-app .paso-box span{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.5px}
  #colmena-app .paso-box b{font-family:var(--display);font-size:17px;color:var(--ink)}
  #colmena-app .seg.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
  #colmena-app .bot-tipos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px}
  @media(max-width:640px){#colmena-app .bot-tipos{grid-template-columns:1fr}}
  #colmena-app .bot-tipo{display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;padding:14px;border:1.5px solid var(--line);background:linear-gradient(180deg,#1b2027,#12161c);border-radius:14px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .1s,box-shadow .1s,border-color .14s,background .14s}
  #colmena-app .bot-tipo:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}
  #colmena-app .bot-tipo:hover{border-color:var(--gold-soft)}
  #colmena-app .bot-tipo.on{border-color:var(--gold);background:linear-gradient(180deg,rgba(232,184,75,.13),rgba(232,184,75,.04));box-shadow:0 3px 0 #8f6a1a,0 0 0 1px var(--gold) inset,inset 0 1px 0 rgba(255,255,255,.14)}
  #colmena-app .bot-tipo .bot-ico{font-size:26px;line-height:1}
  #colmena-app .bot-tipo .bot-nom{font-family:var(--display);font-size:15px;font-weight:700;color:var(--ink)}
  #colmena-app .bot-tipo.on .bot-nom{color:var(--gold)}
  #colmena-app .bot-tipo .bot-des{font-family:var(--sans);font-size:11px;line-height:1.4;color:var(--ink-3)}
  #colmena-app .rep-wrap{display:flex;flex-direction:column;gap:4px;align-items:center;margin-top:4px}
  #colmena-app .rep-pill{font-family:var(--mono);font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:7px;white-space:nowrap}
  #colmena-app .rep-v{background:rgba(46,232,106,.14);color:var(--neon-lit);border:1px solid var(--neon-dim)}
  #colmena-app .rep-c{background:rgba(232,80,80,.14);color:#ff9090;border:1px solid rgba(232,80,80,.3)}
  #colmena-app .seg.presets button{padding:10px 6px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .08s,box-shadow .08s,background .12s,color .12s}
  #colmena-app .seg.presets button:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.35)}
  #colmena-app .seg.presets button:hover{border-color:var(--gold-soft);color:var(--ink)}
  #colmena-app .seg.presets button.on{background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);color:#3a2800;border-color:var(--gold);font-weight:800;box-shadow:0 2px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.4);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .asesor{margin-top:10px;background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:12px;padding:13px 14px}
  #colmena-app .asesor .as-top{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  #colmena-app .asesor .as-top b{color:var(--gold)}
  #colmena-app .asesor .as-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #colmena-app .asesor .as-grid>div{display:flex;flex-direction:column;gap:3px}
  #colmena-app .asesor .as-grid span{font-family:var(--mono);font-size:10px;color:var(--ink-3)}
  #colmena-app .asesor .as-grid b{font-family:var(--display);font-size:17px;color:var(--ink)}
  #colmena-app .asesor .as-grid b.pos{color:var(--neon-lit)} #colmena-app .asesor .as-grid b.neg{color:var(--rojo)}
  #colmena-app .asesor .as-nota{margin-top:10px;font-family:var(--sans);font-size:11.5px;line-height:1.5;color:var(--ink-2)}
  #colmena-app .c-foot{max-width:1180px;margin:40px auto 0;padding:28px 22px 40px;border-top:1px solid var(--line)}
  #colmena-app .c-foot h4{font-family:var(--display);color:var(--gold);font-size:16px;margin:0 0 18px}
  #colmena-app .c-foot-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  #colmena-app .c-faq{background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:14px;padding:16px}
  #colmena-app .c-faq-wrap{border:1px solid var(--line-soft);border-radius:14px;background:rgba(255,255,255,.02);overflow:hidden;max-width:640px;margin:0 auto}
  #colmena-app .c-faq-wrap summary{list-style:none;cursor:pointer;text-align:center;font-family:var(--display);color:var(--gold);font-size:15.5px;font-weight:700;padding:16px 18px;user-select:none;transition:background .15s}
  #colmena-app .c-faq-wrap summary:hover{background:rgba(232,184,75,.06)}
  #colmena-app .c-faq-wrap summary::-webkit-details-marker{display:none}
  #colmena-app .c-faq-wrap summary::after{content:'  ▾';color:var(--ink-3);font-size:12px}
  #colmena-app .c-faq-wrap[open] summary::after{content:'  ▴'}
  #colmena-app .c-faq-wrap[open] summary{border-bottom:1px solid var(--line-soft)}
  #colmena-app .c-faq-wrap .c-foot-grid{padding:16px}
  /* botón Compartir tornasol */
  #colmena-app .pio-tag.share{cursor:pointer;color:#3a2800;font-weight:800;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);box-shadow:0 3px 0 #8f6a1a,0 5px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.55);display:inline-flex;align-items:center;gap:5px;transition:transform .08s,box-shadow .08s;text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .pio-tag.share:hover{filter:brightness(1.06)}
  #colmena-app .pio-tag.share:active{transform:translateY(3px);box-shadow:0 0 0 #8f6a1a,0 2px 8px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4)}
  #colmena-app .c-faq h5{font-family:var(--display);color:var(--ink);font-size:13.5px;margin:0 0 7px}
  #colmena-app .c-faq p{font-family:var(--sans);color:var(--ink-2);font-size:12.5px;line-height:1.55;margin:0}
  #colmena-app .c-foot-bottom{max-width:520px;margin:24px auto 0;text-align:center;font-family:var(--mono);font-size:11px;color:var(--ink-3);border:1px solid var(--line-soft);border-radius:12px;padding:14px 20px;background:rgba(255,255,255,.02)}
  #colmena-app .c-foot-bottom a{color:var(--gold-soft);text-decoration:none} #colmena-app .c-foot-bottom a:hover{color:var(--gold)}
  @media(max-width:720px){#colmena-app .c-foot-grid{grid-template-columns:1fr}}
  #colmena-app .rej{position:relative;overflow:hidden;transition:transform .25s,box-shadow .25s,border-color .25s}
  #colmena-app .rej:hover{transform:translateY(-2px);border-color:rgba(46,232,106,.4);box-shadow:0 20px 50px rgba(0,0,0,.5)}
  #colmena-app .rej>*{position:relative;z-index:1}
  /* indicador En vivo */
  #colmena-app .live{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;color:var(--gold);background:linear-gradient(180deg,rgba(232,184,75,.14),rgba(232,184,75,.05));border:1px solid var(--gold-soft);border-radius:100px;padding:5px 11px;box-shadow:0 2px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.1)}
  #colmena-app .live i{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 8px var(--gold);animation:cpulse 1.2s ease-in-out infinite}
  /* esqueleto de carga */
  #colmena-app .skel{display:inline-block;min-width:70px;height:1em;border-radius:8px;color:transparent;
    background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.12),rgba(255,255,255,.04));background-size:200% 100%;animation:shimmer 1.3s linear infinite}
  @keyframes shimmer{from{background-position:200% 0}to{background-position:-200% 0}}
  /* aparición suave de secciones */
  #colmena-app .card,#colmena-app .rej{animation:rise .5s ease both}
  @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  /* ====== Ficha estilo Pionex ====== */
  #colmena-app .pio-head{display:flex;align-items:center;gap:12px}
  #colmena-app .pio-logo{width:46px;height:46px;border-radius:50%;flex:0 0 auto;object-fit:cover;background:#1b2027;border:1px solid var(--line)}
  #colmena-app .pio-mono{width:46px;height:46px;border-radius:50%;flex:0 0 auto;display:grid;place-items:center;font-family:var(--display);font-weight:700;color:#03210f;font-size:14px;background:linear-gradient(135deg,var(--neon),var(--gold))}
  #colmena-app .pio-titles{flex:1;min-width:0}
  #colmena-app .pio-pair{font-family:var(--display);font-size:19px;color:var(--ink);font-weight:700;line-height:1.1}
  #colmena-app .pio-sub{font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:4px}
  #colmena-app .pio-nombre{text-align:center;font-family:var(--display);font-weight:800;font-size:19px;color:var(--gold);margin:6px 0 2px;letter-spacing:.3px;text-shadow:0 1px 0 rgba(0,0,0,.55),0 2px 10px rgba(232,184,75,.28)}
  #colmena-app .pio-tags{display:flex;gap:6px;flex:0 0 auto}
  #colmena-app .pio-tag{font-family:var(--mono);font-size:11px;padding:5px 11px;border-radius:8px;background:linear-gradient(180deg,rgba(46,232,106,.2),rgba(46,232,106,.08));color:var(--neon-lit);border:1px solid var(--neon-dim);font-weight:700;box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.14);text-shadow:0 1px 1px rgba(0,0,0,.4)}
  #colmena-app .pio-tag.grey{background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.03));color:var(--ink-2);border-color:var(--line);box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.1)}
  #colmena-app .pio-band{position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);min-height:90px;display:flex;align-items:center;margin:16px 0}
  #colmena-app .pio-band .l{position:relative;z-index:2;padding:16px 20px;flex:1}
  #colmena-app .pio-band .r{position:absolute;top:0;right:0;bottom:0;width:58%;z-index:1;padding:14px 22px;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right;background:linear-gradient(120deg,var(--neon-dim),var(--neon));color:#03210f;clip-path:polygon(22% 0,100% 0,100% 100%,0 100%)}
  #colmena-app .pio-band .r.neg{background:linear-gradient(120deg,#a83636,var(--rojo));color:#2a0808}
  #colmena-app .pio-band .k{font-family:var(--mono);font-size:11px;opacity:.9;text-transform:uppercase;letter-spacing:.4px}
  #colmena-app .pio-band .l .v{font-family:var(--display);font-size:27px;font-weight:700;margin-top:4px;color:var(--ink)}
  #colmena-app .pio-band .r .v{font-family:var(--display);font-size:34px;font-weight:800;margin-top:2px;line-height:1;letter-spacing:-.5px;-webkit-text-stroke:1.1px currentColor;text-stroke:1.1px currentColor}
  #colmena-app .pio-band .l .v{-webkit-text-stroke:.5px currentColor;text-stroke:.5px currentColor}
  #colmena-app .pio-band .r .pct{font-family:var(--mono);font-size:15px;font-weight:800;margin-top:5px;opacity:1;-webkit-text-stroke:.35px currentColor;text-stroke:.35px currentColor}
  /* colapsable + pestañas + órdenes */
  #colmena-app .pio-toggle{width:100%;margin-top:14px;background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:12px;padding:12px;font-family:var(--mono);font-size:12px;color:var(--ink-2);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
  #colmena-app .pio-toggle:hover{color:var(--gold);border-color:var(--gold-soft)}
  #colmena-app .pio-panel{margin-top:10px;display:none}
  #colmena-app .pio-panel.open{display:block;animation:rise .3s ease}
  #colmena-app .pio-tabs{display:flex;gap:6px;margin-bottom:10px}
  #colmena-app .pio-tabs button{flex:1;padding:9px;border:1px solid var(--line);background:transparent;color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #colmena-app .pio-tabs button.on{background:var(--gold);color:#1a1200;border-color:var(--gold);font-weight:700}
  #colmena-app .ord-list{max-height:300px;overflow-y:auto;border:1px solid var(--line-soft);border-radius:10px;background:#0d1117}
  #colmena-app .ord-row{display:grid;grid-template-columns:1fr 1.4fr;gap:8px;padding:9px 13px;border-bottom:1px solid var(--line-soft);font-family:var(--mono);font-size:12px}
  #colmena-app .ord-row:last-child{border-bottom:none}
  #colmena-app .ord-row .st{text-align:right}
  #colmena-app .ord-row .st.compra{color:var(--neon-lit)} #colmena-app .ord-row .st.venta{color:var(--rojo)} #colmena-app .ord-row .st.off{color:var(--ink-3)}
  #colmena-app .ob-head{display:flex;justify-content:space-between;font-family:var(--mono);font-size:10px;color:var(--ink-3);padding:9px 13px;text-transform:uppercase;letter-spacing:.4px}
  #colmena-app .ob-side{display:flex;flex-direction:column}
  #colmena-app .ob-row{position:relative;display:flex;justify-content:space-between;align-items:center;padding:5px 13px;font-family:var(--mono);font-size:12.5px;overflow:hidden}
  #colmena-app .ob-bar{position:absolute;right:0;top:1px;bottom:1px;z-index:0;border-radius:3px 0 0 3px;transition:width .5s ease}
  #colmena-app .ob-venta .ob-bar{background:rgba(246,70,93,.14)}
  #colmena-app .ob-compra .ob-bar{background:rgba(14,203,129,.14)}
  #colmena-app .ob-row .ob-p,#colmena-app .ob-row .ob-a{position:relative;z-index:1}
  #colmena-app .ob-venta .ob-p{color:var(--rojo)} #colmena-app .ob-compra .ob-p{color:var(--neon-lit)}
  #colmena-app .ob-row .ob-a{color:var(--ink-2)}
  #colmena-app .ob-mid{display:flex;justify-content:space-between;align-items:baseline;padding:9px 13px;font-family:var(--display);font-weight:800;font-size:17px;color:var(--gold);background:rgba(232,184,75,.07);border-top:1px solid var(--line-soft);border-bottom:1px solid var(--line-soft)}
  #colmena-app .ob-mid .ob-mid-lbl{font-family:var(--mono);font-size:10px;color:var(--ink-3);font-weight:400}
  #colmena-app .ob-empty{padding:14px;text-align:center;color:var(--ink-3);font-family:var(--mono);font-size:11px}
  #colmena-app .gaswarn{background:rgba(255,107,107,.08);border:1px solid var(--rojo);color:var(--rojo);border-radius:10px;padding:9px 12px;font-family:var(--mono);font-size:11.5px;margin-top:12px}
  #colmena-app .pio-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
  #colmena-app .pio-box{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 12px}
  #colmena-app .pio-box .k{display:flex;align-items:center;gap:5px;font-family:var(--mono);font-size:9.5px;color:var(--gold);font-weight:700;text-transform:uppercase;letter-spacing:.4px;text-shadow:0 1px 1px rgba(0,0,0,.5)}
  #colmena-app .pio-box .v{font-family:var(--display);font-size:16px;color:var(--ink);margin-top:5px}
  #colmena-app .pio-box .v.pos{color:var(--neon-lit)} #colmena-app .pio-box .v.neg{color:var(--rojo)}
  #colmena-app .pio-box .v2{font-family:var(--mono);font-size:11.5px;margin-top:2px}
  #colmena-app .pio-box .v2.pos{color:var(--neon-lit)} #colmena-app .pio-box .v2.neg{color:var(--rojo)}
  /* ====== Ficha PREMIUM ====== */
  #colmena-app .rej{background:linear-gradient(160deg,rgba(19,25,29,.98),rgba(8,11,13,.99));border:1px solid rgba(232,184,75,.22);box-shadow:0 18px 52px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.05)}
  #colmena-app .rej::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold-soft) 30%,var(--gold) 50%,var(--gold-soft) 70%,transparent);opacity:.55;z-index:3}
  #colmena-app .pio-band .r .k{font-weight:800;opacity:1;font-size:12px;letter-spacing:.5px}
  @keyframes flow{from{background-position:220% 0}to{background-position:-220% 0}}
  #colmena-app .rej::after{content:none}
  #colmena-app .rej:hover{transform:translateY(-3px);border-color:rgba(232,184,75,.55);box-shadow:0 30px 72px rgba(0,0,0,.62),0 0 34px rgba(232,184,75,.16)}
  #colmena-app .pio-logo,#colmena-app .pio-mono{box-shadow:0 0 0 1px rgba(255,255,255,.14),0 0 18px rgba(232,184,75,.22),0 6px 18px rgba(0,0,0,.45);width:50px;height:50px}
  #colmena-app .pio-mono{background:linear-gradient(135deg,#f7db8d,var(--gold))}
  #colmena-app .pio-pair{letter-spacing:-.3px;font-size:21px;text-shadow:0 0 18px rgba(232,184,75,.15)}
  #colmena-app .pio-sub .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--neon-lit);box-shadow:0 0 10px var(--neon-lit),0 0 4px #fff;margin-right:5px;vertical-align:middle;animation:cpulse 1.2s ease-in-out infinite}
  #colmena-app .pio-tag{backdrop-filter:blur(4px);letter-spacing:.3px}
  /* Banda de P&L premium (con brillo que barre) */
  #colmena-app .pio-band{min-height:116px;border:1px solid rgba(232,184,75,.14);background:radial-gradient(140% 160% at 0% 0%,rgba(24,31,35,.97),rgba(6,9,11,.98));box-shadow:inset 0 1px 0 rgba(255,255,255,.04)}
  #colmena-app .pio-band .r{background:linear-gradient(125deg,var(--neon-dim),var(--neon-lit) 52%,var(--neon));box-shadow:-28px 0 60px rgba(46,232,106,.35)}
  #colmena-app .pio-band .r.neg{background:linear-gradient(125deg,#8f2f2f,#d64545 52%,var(--rojo));box-shadow:-28px 0 60px rgba(232,80,80,.32)}
  #colmena-app .pio-band .r::before{content:'';position:absolute;inset:0;background:linear-gradient(115deg,transparent 30%,rgba(255,255,255,.45) 47%,rgba(255,255,255,.1) 55%,transparent 66%);transform:translateX(-130%);animation:sheen 3.4s ease-in-out infinite;pointer-events:none}
  @keyframes sheen{0%,52%{transform:translateX(-130%)}78%,100%{transform:translateX(130%)}}
  #colmena-app .pio-band .l .v{font-size:30px}
  #colmena-app .pio-band .r .v{font-size:40px;text-shadow:0 2px 18px rgba(0,0,0,.28),0 0 24px rgba(255,255,255,.15)}
  #colmena-app .pio-band .r .pct{font-size:16px}
  /* Cajas de datos premium */
  #colmena-app .pio-grid{gap:9px}
  #colmena-app .pio-box{background:linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid rgba(255,255,255,.09);transition:border-color .18s,transform .18s,box-shadow .18s,background .18s;position:relative;overflow:hidden}
  #colmena-app .pio-box:hover{border-color:rgba(232,184,75,.4);transform:translateY(-2px);box-shadow:0 10px 26px rgba(0,0,0,.4);background:linear-gradient(160deg,rgba(255,255,255,.1),rgba(255,255,255,.03))}
  #colmena-app .pio-box .v{font-weight:700;letter-spacing:-.2px;font-size:16.5px}
  #colmena-app .pio-box .v.pos{text-shadow:0 0 14px rgba(46,232,106,.35)}
  #colmena-app .pio-toggle{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));box-shadow:0 3px 0 rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .08s,box-shadow .08s,color .15s,border-color .15s;font-weight:700}
  #colmena-app .pio-toggle:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.28)}
  /* ====== Modal de la página ====== */
  #colmena-modal{position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(4,7,10,.66);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
  #colmena-modal.show{display:flex;animation:fade .2s ease}
  #colmena-modal .m-card{max-width:430px;width:100%;background:linear-gradient(180deg,#1b2027,#12161c);border:1px solid var(--gold-soft);border-radius:18px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.7);animation:rise .25s ease}
  #colmena-modal h4{font-family:var(--display);color:var(--gold);font-size:19px;margin:0 0 12px}
  #colmena-modal p{font-size:14px;color:var(--ink-2);line-height:1.55;margin:0 0 20px}
  #colmena-modal .m-btns{display:flex;gap:10px}
  #colmena-modal .m-btns .btn{margin:0;flex:1}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  /* ====== gas: botón Max ====== */
  #colmena-app .gas-sep{border-top:1px solid var(--line-soft);margin:14px 0 0;padding-top:12px}
  #colmena-app .btn-max{width:100%;margin-top:0;padding:12px}
  @media(max-width:860px){#colmena-app .cols{grid-template-columns:1fr}#colmena-app .rej-grid{grid-template-columns:1fr}#colmena-app .prev{grid-template-columns:repeat(2,1fr)}#colmena-app .pio-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){
    #colmena-app .c-hdr{padding:10px 14px}
    #colmena-app .c-hdr-r{gap:8px}
    #colmena-app .c-volver,#colmena-app .live{display:none}
    #colmena-app .c-brand{font-size:17px}
    #colmena-app .hdr-btn{padding:9px 14px;font-size:13px}
    #colmena-app .wrap{padding:18px 14px 50px}
    #colmena-app .hero{padding:44px 16px}
    #colmena-app .hero h1{font-size:26px}
    #colmena-app .seg.presets{grid-template-columns:repeat(2,1fr)}
    #colmena-app .seg.presets button{font-size:12px;padding:10px 4px}
    #colmena-app .cols{gap:14px}
    #colmena-app .card{padding:16px}
    #colmena-app .pio-band .r{width:64%;padding:12px 16px}
    #colmena-app .pio-band .l{padding:12px 14px}
    #colmena-app .pio-band .r .v{font-size:26px}
    #colmena-app .pio-band .l .v{font-size:21px}
    #colmena-app .pio-band .pct{font-size:13px}
    #colmena-app .prev{grid-template-columns:repeat(2,1fr)}
    #colmena-app .pio-grid{grid-template-columns:repeat(2,1fr)}
    #colmena-app .fila{flex-wrap:wrap}
    #colmena-app select,#colmena-app input{min-width:0}
    #colmena-app .asesor .as-grid{grid-template-columns:1fr 1fr}
  }
  `;
  document.head.appendChild(s);
  const pop = document.createElement('div'); pop.id = 'colmena-pop'; document.body.appendChild(pop);
  document.addEventListener('click', (e) => { if (!e.target.closest('.i-btn') && e.target.id !== 'colmena-pop') pop.style.display = 'none'; });
  if (!$('colmena-modal')) {
    const md = document.createElement('div'); md.id = 'colmena-modal';
    md.innerHTML = `<div class="m-card"><h4 id="cm-title"></h4><p id="cm-body"></p>
      <div class="m-btns"><button class="btn btn-linea" id="cm-cancel">Cancelar</button><button class="btn btn-oro" id="cm-ok">Confirmar</button></div></div>`;
    document.body.appendChild(md);
  }
  window.__botLogoFail = function (img, ini) { const d = document.createElement('div'); d.className = 'pio-mono'; d.textContent = ini; img.replaceWith(d); };
}

/* ================================================================== */
/* Utilidades                                                          */
/* ================================================================== */
function precioFmt(n) {
  if (n === null || !isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a === 0) return '0';
  if (a >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (a >= 0.01) return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (a >= 0.0001) return n.toLocaleString('en-US', { maximumFractionDigits: 6 });
  const dec = Math.min(18, -Math.floor(Math.log10(a)) + 3);
  return n.toFixed(dec).replace(/0+$/, '').replace(/\.$/, '');
}
function num(n, d = 4) { return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: d }) : '—'; }
function animarNumero(el) {
  const to = parseFloat(el.dataset.to); if (!isFinite(to)) return;
  const dec = parseInt(el.dataset.dec || '0', 10), pre = el.dataset.pre || '', suf = el.dataset.suf || '';
  const dur = 800, t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
    el.textContent = pre + num(to * e, dec) + suf; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function activarContadores() { document.querySelectorAll(`#${APP} .numgo`).forEach(animarNumero); }

/* ---- Modal de la página (reemplaza confirm/alert del navegador) ---- */
function modalConfirm(o) {
  return new Promise((resolve) => {
    const m = $('colmena-modal'); if (!m) return resolve(false);
    $('cm-title').textContent = o.titulo || '';
    $('cm-body').innerHTML = o.cuerpo || '';
    const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
    const ok = $('cm-ok'), cancel = $('cm-cancel');
    cancel.style.display = ''; cancel.textContent = o.cancelar || 'Cancelar';
    ok.textContent = o.ok || 'Confirmar'; ok.className = 'btn ' + (o.peligro ? 'btn-rojo' : 'btn-oro');
    m.classList.add('show');
    const fin = (v) => { ok.onclick = null; cancel.onclick = null; m.onclick = null; resolve(v); };
    ok.onclick = () => fin(true);
    cancel.onclick = () => { m.classList.remove('show'); fin(false); };
    m.onclick = (e) => { if (e.target === m) { m.classList.remove('show'); fin(false); } };
  });
}
function modalBusy(txt) {
  const m = $('colmena-modal'); if (!m) return;
  $('cm-body').innerHTML = `<span class="skel" style="width:14px;height:14px;min-width:14px;border-radius:50%;vertical-align:middle;margin-right:9px"></span>${txt}`;
  m.querySelector('.m-btns').style.display = 'none'; m.onclick = null; m.classList.add('show');
}
function modalError(txt) {
  const m = $('colmena-modal'); if (!m) return;
  $('cm-title').textContent = 'No se pudo completar'; $('cm-body').textContent = txt;
  const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
  $('cm-cancel').style.display = 'none'; const ok = $('cm-ok');
  ok.textContent = 'Entendido'; ok.className = 'btn btn-linea'; ok.onclick = () => m.classList.remove('show');
}
function modalClose() { const m = $('colmena-modal'); if (m) m.classList.remove('show'); }
function modalDone(titulo, txt) {
  const m = $('colmena-modal'); if (!m) return;
  $('cm-title').textContent = titulo; $('cm-body').innerHTML = txt;
  const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
  $('cm-cancel').style.display = 'none'; const ok = $('cm-ok');
  ok.textContent = '¡Listo!'; ok.className = 'btn btn-oro'; ok.onclick = () => m.classList.remove('show');
  m.classList.add('show');
}

/* ---- Logo de la moneda (Trust Wallet) con respaldo a monograma ---- */
function logoDe(addr, simbolo) {
  const ini = (simbolo || '?').slice(0, 3);
  let url = null; try { url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${gb.checksum(addr)}/logo.png`; } catch (_) {}
  return url ? `<img class="pio-logo" src="${url}" alt="${simbolo}" onerror="window.__botLogoFail(this,'${ini}')">` : `<div class="pio-mono">${ini}</div>`;
}

/* ---- Tiempo activo (Xd Yh Zm) ---- */
function tiempoActivo(seg) {
  let s = Math.floor(Date.now() / 1000 - Number(seg)); if (!(s > 0)) s = 0;
  const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const mm = Math.floor(s / 60); const ss = s - mm * 60;
  return `${d}d ${h}h ${mm}m ${ss}s`;
}
let RELOJ = null;
function iniciarReloj() {
  if (RELOJ) return;
  RELOJ = setInterval(() => {
    document.querySelectorAll(`#${APP} .pio-time`).forEach((el) => { const s = Number(el.dataset.since); if (s) el.textContent = tiempoActivo(s); });
  }, 1000);
}

/* ---- Animación: recorrido de un bot de rejilla (para el hero) ---- */
function animacionRecorrido() {
  const W = 560, H = 250, padL = 18, padR = 18;
  const ys = [55, 90, 125, 160, 195], mid = 125;
  const lines = ys.map((y) => `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${y < mid ? 'var(--rojo)' : 'var(--neon)'}" stroke-width="1.3" stroke-dasharray="7 7" opacity=".5"/>`).join('');
  const etq = `<text x="${padL}" y="46" fill="var(--rojo)" font-family="IBM Plex Mono" font-size="10">vende</text><text x="${padL}" y="220" fill="var(--neon-lit)" font-family="IBM Plex Mono" font-size="10">compra</text>`;
  const d = `M ${padL} 125 C 110 55, 175 195, 255 90 S 395 200, 460 105 S 545 160, ${W - padR} 125`;
  const path = `<path d="${d}" fill="none" stroke="rgba(228,245,239,.22)" stroke-width="1.5"/>`;
  const dot = `<circle r="6" fill="#E4F5EF"><animateMotion dur="7s" repeatCount="indefinite" path="${d}"/><animate attributeName="r" values="5;8;5" dur="1.3s" repeatCount="indefinite"/></circle>`;
  const pops = [[150, 3], [305, 5], [455, 4]].map(([x, val], i) => `<text x="${x}" y="120" fill="var(--neon-lit)" font-family="IBM Plex Mono" font-size="13" font-weight="700" opacity="0">+$${val}<animate attributeName="opacity" values="0;1;0" dur="7s" begin="${i * 2.2}s" repeatCount="indefinite"/><animate attributeName="y" values="120;78" dur="7s" begin="${i * 2.2}s" repeatCount="indefinite"/></text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">${lines}${etq}${path}${pops}${dot}</svg>`;
}
function dias(seg) { const s = Number(seg); return s ? Math.max(0, Math.floor((Date.now()/1000 - s)/86400)).toString() : '0'; }
const _avT = new WeakMap();
function aviso(el, tipo, msg, ms = 5000) {
  if (!el) return;
  el.innerHTML = `<div class="aviso ${tipo}">${msg}</div>`;
  const t = _avT.get(el); if (t) clearTimeout(t);
  if (ms > 0) _avT.set(el, setTimeout(() => { el.innerHTML = ''; }, ms));
}
function iBtn(k) { return `<button class="i-btn" data-info="${k}" type="button">i</button>`; }
function abrirPop(btn) {
  const pop = $('colmena-pop'); pop.textContent = INFO[btn.dataset.info] || '';
  const r = btn.getBoundingClientRect(); pop.style.display = 'block';
  pop.style.left = Math.min(window.scrollX + r.left, window.scrollX + window.innerWidth - 300) + 'px';
  pop.style.top = (window.scrollY + r.bottom + 6) + 'px';
}
function wirePops(root) { (root || document).querySelectorAll('.i-btn').forEach((b) => b.onclick = (e) => { e.stopPropagation(); abrirPop(b); }); }

/* Campo numérico con flechas propias (con estilo) y tope en el mínimo. */
function campoNum(id, o = {}) {
  const min = o.min ?? 0;
  const attrs = [
    `id="${id}"`, 'type="number"', 'inputmode="decimal"',
    o.placeholder != null ? `placeholder="${o.placeholder}"` : '',
    o.value != null ? `value="${o.value}"` : '',
    `min="${min}"`, o.max != null ? `max="${o.max}"` : '',
    `step="${o.int ? 1 : (o.step ?? 'any')}"`,
    `data-min="${min}"`, o.max != null ? `data-max="${o.max}"` : '',
    o.pct != null ? `data-pct="${o.pct}"` : `data-step="${o.step ?? 1}"`,
    o.int ? 'data-int="1"' : ''
  ].filter(Boolean).join(' ');
  return `<div class="stepper${o.suffix ? ' has-suffix' : ''}"><input ${attrs}>${o.suffix ? `<span class="cash-eq" id="${o.suffix}"></span>` : ''}<span class="stepper-btns"><button type="button" class="st-up" tabindex="-1">▲</button><button type="button" class="st-dn" tabindex="-1">▼</button></span></div>`;
}
function wireSteppers(root) {
  (root || document).querySelectorAll(`#${APP} .stepper`).forEach((wr) => {
    const inp = wr.querySelector('input'); if (!inp) return;
    const isInt = inp.dataset.int === '1', pct = inp.dataset.pct ? parseFloat(inp.dataset.pct) : null;
    const lims = () => ({ min: parseFloat(inp.dataset.min), max: inp.dataset.max != null && inp.dataset.max !== '' ? parseFloat(inp.dataset.max) : Infinity });
    const paso = (dir) => {
      const { min, max } = lims();
      let v = parseFloat(inp.value); if (!isFinite(v)) v = isFinite(min) ? min : 0;
      const delta = pct ? Math.max(v * pct, 0.000001) : parseFloat(inp.dataset.step || '1');
      let nv = (pct && v === 0) ? min + (dir > 0 ? delta : 0) : v + dir * delta;
      if (nv < min) nv = min; if (nv > max) nv = max;
      inp.value = isInt ? Math.round(nv) : Number(nv.toPrecision(8));
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    };
    wr.querySelector('.st-up').onclick = () => paso(1);
    wr.querySelector('.st-dn').onclick = () => paso(-1);
    inp.addEventListener('change', () => {
      const { min, max } = lims(); const v = parseFloat(inp.value); if (!isFinite(v)) return;
      const c = v < min ? min : v > max ? max : v;
      if (c !== v) { inp.value = isInt ? Math.round(c) : Number(c.toPrecision(8)); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  });
}

/* ================================================================== */
/* Gráficas                                                            */
/* ================================================================== */
function nivelesPreview(pMin, pMax, n, modo) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    out.push(modo === 'geo' ? pMin * Math.pow(pMax / pMin, t) : pMin + (pMax - pMin) * t);
  }
  return out;
}
/** Dibuja una rejilla. `precios` = array de {p, tipo} donde tipo: 'compra'|'venta'|'off'. */
function dibujar(precios, precio, pMin, pMax, samples, ops) {
  const W = 560, H = 320, padL = 70, padR = 16, padT = 16, padB = 26;
  if (!(pMin > 0 && pMax > pMin)) return svgVacio(W, H, 'Pon un rango para ver la rejilla');
  const y = (p) => padT + (H - padT - padB) * (1 - (Math.max(pMin, Math.min(pMax, p)) - pMin) / (pMax - pMin));
  const partes = [];
  if (precio && precio >= pMin && precio <= pMax) {
    const yp = y(precio);
    partes.push(`<rect x="${padL}" y="${yp}" width="${W-padR-padL}" height="${(H-padB-yp).toFixed(1)}" fill="#2EE86A" opacity=".05"/>`);
    partes.push(`<rect x="${padL}" y="${padT}" width="${W-padR-padL}" height="${(yp-padT).toFixed(1)}" fill="#FF6B6B" opacity=".05"/>`);
  }
  for (const nv of precios) {
    if (nv.p < pMin || nv.p > pMax) continue;
    const yy = y(nv.p).toFixed(1);
    const col = nv.tipo === 'compra' ? 'var(--neon)' : nv.tipo === 'venta' ? 'var(--rojo)' : 'var(--ink-3)';
    const op = nv.tipo === 'off' ? '.35' : '.8';
    partes.push(`<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="${col}" stroke-width="1.4" opacity="${op}"/>`);
  }
  const dentro = precio && precio >= pMin && precio <= pMax;
  const yp = precio ? (precio > pMax ? padT : precio < pMin ? H - padB : y(precio)) : null;
  const hayOps = ops && ops.length > 0;
  const hayTrail = !hayOps && samples && samples.length > 1;

  if (hayOps) {
    // RASTRO REAL: trayectoria de las operaciones ejecutadas (compra verde / venta roja)
    const n = ops.length, x0 = padL, x1 = W - padR;
    const xi = (i) => n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * (i / (n - 1));
    if (n > 1) {
      const pts = ops.map((o, i) => `${xi(i).toFixed(1)},${y(o.precio).toFixed(1)}`);
      partes.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="rgba(228,245,239,.45)" stroke-width="1.6" stroke-linejoin="round"/>`);
    }
    ops.forEach((o, i) => {
      const c = o.compra ? '#4DFF7A' : '#FF6B6B';
      partes.push(`<circle cx="${xi(i).toFixed(1)}" cy="${y(o.precio).toFixed(1)}" r="4.2" fill="${c}" stroke="#020C08" stroke-width="1"/>`);
    });
  }
  if (hayTrail) {
    const n = samples.length, x0 = padL, x1 = W - padR;
    const pts = samples.map((p, i) => `${(x0 + (x1 - x0) * (i / (n - 1))).toFixed(1)},${y(p).toFixed(1)}`);
    partes.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="#4DFF7A" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`);
    partes.push(`<circle cx="${x1.toFixed(1)}" cy="${y(samples[n-1]).toFixed(1)}" r="4.5" fill="#E4F5EF"><animate attributeName="r" values="4;8;4" dur="1.3s" repeatCount="indefinite"/></circle>`);
  }
  if (precio) {
    const suave = hayOps || hayTrail;
    partes.push(`<line x1="${padL}" y1="${yp.toFixed(1)}" x2="${W-padR}" y2="${yp.toFixed(1)}" stroke="#E4F5EF" stroke-width="${suave ? 1 : 2}" stroke-dasharray="5 4" opacity="${suave ? '.4' : '1'}"/>`);
    if (!suave) partes.push(`<circle cx="${padL}" cy="${yp.toFixed(1)}" r="4" fill="#E4F5EF"><animate attributeName="r" values="3;7;3" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle>`);
    partes.push(`<text x="${W-padR}" y="${(yp - 6).toFixed(1)}" fill="#E4F5EF" font-family="IBM Plex Mono" font-size="11" text-anchor="end">precio ${precioFmt(precio)}${dentro ? '' : ' (fuera)'}</text>`);
  }
  partes.push(`<text x="8" y="${padT+9}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${precioFmt(pMax)}</text>`);
  partes.push(`<text x="8" y="${H-padB+4}" fill="#9DBDB2" font-family="IBM Plex Mono" font-size="10">${precioFmt(pMin)}</text>`);
  if (!hayOps && !hayTrail) partes.push(`<line x1="${padL}" x2="${W-padR}" y1="${padT}" y2="${padT}" stroke="#4DFF7A" stroke-width="1.5"><animate attributeName="y1" values="${padT};${H-padB};${padT}" dur="5s" repeatCount="indefinite"/><animate attributeName="y2" values="${padT};${H-padB};${padT}" dur="5s" repeatCount="indefinite"/><animate attributeName="opacity" values="0;.45;0" dur="5s" repeatCount="indefinite"/></line>`);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${partes.join('')}</svg>`;
}
function svgVacio(W, H, txt) {
  return `<svg class="chart" viewBox="0 0 ${W} ${H}"><text x="${W/2}" y="${H/2}" fill="#64857A" font-family="IBM Plex Mono" font-size="13" text-anchor="middle">${txt}</text></svg>`;
}
function graficaPreview() {
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value), n = parseInt($('f-niv')?.value, 10);
  if (!(pMin > 0 && pMax > pMin && n >= 2)) return svgVacio(560, 320, 'Pon un rango para ver la rejilla');
  const ps = nivelesPreview(pMin, pMax, n, F.modo).map((p) => ({ p, tipo: F.precio ? (p < F.precio ? 'compra' : 'venta') : 'compra' }));
  return dibujar(ps, F.precio, pMin, pMax);
}

/* ================================================================== */
/* Encabezado                                                          */
/* ================================================================== */
function headerHTML() {
  const cuenta = wallet.cuentaActual();
  let right;
  if (!cuenta) right = `<button class="btn btn-oro hdr-btn" id="c-conectar">Conectar wallet</button>`;
  else if (!wallet.esRedCorrecta()) right = `<button class="btn btn-rojo hdr-btn" id="c-red">Cambiar a BNB Chain</button>`;
  else right = `<span class="dir">${wallet.abreviar(cuenta)}</span><button class="hdr-off" id="c-off" title="Desconectar" aria-label="Desconectar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  return `<header class="c-hdr">
    <a class="c-brand" href="index.html">Bot Algorítmico</a>
    <div class="c-hdr-r"><span class="live"><i></i>En vivo</span><a class="c-volver" href="index.html">← La Bolita</a>${right}</div>
  </header>`;
}
function conectarWallet() {
  Promise.resolve().then(() => wallet.conectar()).catch((e) => {
    const el = $('c-hero-msg') || $('c-msg');
    const msg = e?.shortMessage || e?.message || String(e);
    if (el) aviso(el, 'err', 'No se pudo conectar: ' + msg + '. Si estás en el móvil, abre esta página desde el navegador de tu wallet (MetaMask o Trust Wallet).', 8000);
  });
}
function wireHeader() {
  if ($('c-conectar')) $('c-conectar').onclick = conectarWallet;
  if ($('c-red')) $('c-red').onclick = () => wallet.cambiarARedCorrecta().catch(() => {});
  if ($('c-off')) $('c-off').onclick = () => wallet.desconectar().catch(() => {});
}
function footerHTML() {
  const faqs = [
    ['¿Cómo retiro mis ganancias?', 'No hay nada que retirar. Tus ganancias caen solas en tu wallet cada vez que el bot vende. El dinero siempre está en tu poder, nunca en el nuestro.'],
    ['¿Qué hace el bot exactamente?', 'Compra barato y vende caro por ti, solo, mientras el precio sube y baja dentro del rango que elijas. Repite ese ciclo una y otra vez.'],
    ['¿Qué es un bot de cuadrícula?', 'Divide un rango de precios en niveles (cuadrículas). Cuando el precio baja a un nivel compra, cuando sube al siguiente vende. Gana con cada subida y bajada.'],
    ['¿Qué es el Bot Acumulador?', 'Compra en la caída (más volumen mientras más baja) y vende TODO junto cuando el total gana el porcentaje que elijas. Hace menos operaciones, ideal para acumular.'],
    ['¿Es seguro mi dinero?', 'Sí. Tus monedas nunca salen de tu wallet a manos de nadie. Le das un permiso limitado que puedes quitar cuando quieras.'],
    ['¿Necesito cuenta o KYC?', 'No. Solo tu wallet. Sin registros, sin papeleo y sin exchange.'],
    ['¿Cuánto cuesta usar la plataforma?', 'Una activación de aproximadamente 1 dólar al mes, que te deja crear todos los bots que quieras. Aparte pagas el gas de la red (unos centavos por operación).'],
    ['¿Qué es el gas?', 'Es el costo que cobra la red BNB por cada operación (comprar o vender). Es de unos centavos y sale del tanque de gas que cargas en cada bot.'],
    ['¿Por qué tengo que cargar gas?', 'Porque el bot paga a la red cada vez que compra o vende. Sin gas, el bot no puede operar. Cárgale un poco de BNB en la sección de gas del bot.'],
    ['¿Puedo perder dinero?', 'Sí. El trading tiene riesgo. Si el precio se sale del rango, el bot espera. Invierte solo lo que puedas permitirte perder. Esto no es consejo financiero.'],
    ['¿Qué pasa si el precio se sale del rango?', 'El bot deja de operar y espera a que el precio vuelva a entrar. Por eso conviene elegir un rango amplio.'],
    ['¿Qué es la Ganancia por cuadrícula?', 'El beneficio mínimo que exiges por cada cuadrícula, por encima de la comisión. El sistema ajusta las cuadrículas para que cada venta deje ganancia limpia.'],
    ['¿Qué es la separación entre cuadrículas?', 'La distancia de precio entre un nivel y el siguiente. Más separación significa menos operaciones pero cada una más rentable.'],
    ['¿Por qué con poco capital gano poco?', 'Porque el gas por operación es fijo. Con poco dinero cada cuadrícula es pequeña y la ganancia por vuelta es de centavos. La ganancia escala con el capital.'],
    ['¿Cuánto capital me conviene poner?', 'Cuanto más, mejor rinde en proporción. Con más capital cada cuadrícula es mayor y la ganancia por vuelta crece.'],
    ['¿Qué es Grid profit?', 'La ganancia ya realizada: dinero que el bot ya ganó cerrando cuadrículas completas y que ya está en tu wallet.'],
    ['¿Qué es el Flotante?', 'La ganancia o pérdida no realizada: cuánto vale ahora lo que el bot tiene comprado, comparado con lo que pagó. Sube y baja con el mercado.'],
    ['¿Qué son las Vueltas?', 'Una vuelta entera es una operación completa: el bot compró y luego vendió. Ahí se concreta la ganancia de rejilla.'],
    ['¿Qué es el precio medio?', 'El precio promedio al que compraste. Si el mercado sube por encima de ese precio, tu posición está en ganancia.'],
    ['¿Cómo activo un bot?', 'Elige el tipo de bot, la moneda, el rango y cuánto inviertes. Firma la activación y la creación en tu wallet, y listo.'],
    ['¿Puedo tener varios bots a la vez?', 'Sí. Con la activación mensual puedes crear todos los bots que quieras, en distintas monedas.'],
    ['¿Cómo cierro un bot?', 'Con el botón Cerrar y vender. Vende todo a estable y el dinero queda en tu wallet.'],
    ['¿Qué monedas puedo usar?', 'Pares con buena liquidez en PancakeSwap: BNB, BTCB, ETH y varias más, contra USDT o USDC.'],
    ['¿En qué red funciona?', 'En BNB Smart Chain (BSC), donde hay liquidez profunda y el gas es barato.'],
    ['¿Quién ejecuta las operaciones?', 'Un servicio automático vigila el precio y dispara las compras y ventas por ti, sin que tengas que hacer nada.'],
    ['¿Por qué mi wallet muestra un aviso?', 'Porque el contrato es nuevo y aún no tiene reputación. El permiso que otorgas es limitado y revocable.'],
    ['¿El bot trabaja si cierro la página?', 'Sí. El bot vive en la blockchain y se opera solo las 24 horas, aunque cierres el navegador.'],
    ['¿Qué es el slippage?', 'La pequeña diferencia entre el precio esperado y el real al operar. En pares líquidos es mínimo.'],
    ['¿Puedo confiar en los números que veo?', 'Sí. Todo lo que ves (ganancia, vueltas, precio medio) sale directo del contrato en la blockchain. No hay datos inventados.']
  ];
  const card = ([q, a], i) => `<div class="c-faq" data-faq="${(q + ' ' + a).toLowerCase().replace(/["<>]/g, '')}" data-q="${q.replace(/"/g, '&quot;')}" data-a="${a.replace(/"/g, '&quot;')}"${i >= 6 ? ' style="display:none"' : ''}><h5>${q}</h5><p>${a}</p></div>`;
  return `<footer class="c-foot">
    <details class="c-faq-wrap">
      <summary><span class="faq-long">¿Tienes dudas sobre cómo funciona la plataforma?</span><span class="faq-short">¿Tienes dudas? Toca aquí</span></summary>
      <div style="padding:16px">
        <input class="faq-search" id="faq-search" type="text" autocomplete="off" placeholder="Escribe aquí sobre lo que quieres saber…">
        <div class="c-foot-grid" id="faq-grid">${faqs.map(card).join('')}</div>
        <div class="faq-empty" id="faq-empty" style="display:none">No encontramos nada con esa palabra. Prueba con otra.</div>
      </div>
    </details>
    <div class="c-foot-bottom">Bot Algorítmico · Opera bajo tu propio riesgo</div>
  </footer>`;
}
function wireFaq() {
  const inp = document.getElementById('faq-search'); if (!inp) return;
  const grid = document.getElementById('faq-grid'), empty = document.getElementById('faq-empty');
  if (!grid) return;
  const esc = (t) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const hl = (t, q) => {
    if (!q) return esc(t);
    const low = t.toLowerCase(); let out = '', i = 0, idx;
    while ((idx = low.indexOf(q, i)) >= 0) { out += esc(t.slice(i, idx)) + '<mark class="faq-hl">' + esc(t.slice(idx, idx + q.length)) + '</mark>'; i = idx + q.length; }
    return out + esc(t.slice(i));
  };
  inp.oninput = () => {
    const q = inp.value.trim().toLowerCase();
    let shown = 0;
    grid.querySelectorAll('.c-faq').forEach((c, i) => {
      const show = q ? c.dataset.faq.includes(q) : i < 6;
      c.style.display = show ? '' : 'none'; if (show) shown++;
      const h5 = c.querySelector('h5'), p = c.querySelector('p');
      if (h5) h5.innerHTML = hl(c.dataset.q || h5.textContent, q);
      if (p) p.innerHTML = hl(c.dataset.a || p.textContent, q);
    });
    if (empty) empty.style.display = (q && shown === 0) ? '' : 'none';
  };
}

/* ================================================================== */
/* Render                                                              */
/* ================================================================== */
function render() {
  const host = $(APP); if (!host) return;
  inyectarEstilo();
  const cuenta = wallet.cuentaActual();

  if (!cuenta) {
    host.innerHTML = headerHTML() + `<div class="wrap">
      <div class="conectar-box">
        <h2>Bot Algorítmico</h2>
        <p>Bots que compran barato y venden caro por ti, en tu propia wallet. Sin custodia y sin KYC.</p>
        <button class="btn btn-oro" id="c-conectar2">Conectar wallet</button>
        <div id="c-hero-msg" style="margin-top:12px"></div>
      </div>
      ${footerHTML()}</div>`;
    wireHeader(); wireFaq();
    if ($('c-conectar2')) $('c-conectar2').onclick = conectarWallet;
    return;
  }

  const optHTML = (ids, val) => ids.map((id) => `<option value="${id}" ${id === val ? 'selected' : ''}>${moneda(id).simbolo}</option>`).join('');

  host.innerHTML = headerHTML() + `<div class="wrap">
    <div class="cols">
      <div class="card">
        <h3>Arma tu bot</h3>
        <div class="lab">¿Qué bot quieres armar? ${iBtn('tipobot')}</div>
        <div class="bot-tipos" id="f-tipo">
          <button type="button" data-tipo="grid" class="bot-tipo ${F.tipo==='grid'?'on':''}">
            <div class="bot-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e8b84b" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>
            <div class="bot-nom">Smart Grid</div>
            <div class="bot-des">Compra y vende en niveles, pero solo cierra cada cuadrícula en ganancia.</div>
          </button>
          <button type="button" data-tipo="acum" class="bot-tipo ${F.tipo==='acum'?'on':''}">
            <div class="bot-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e8b84b" stroke-width="1.8"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg></div>
            <div class="bot-nom">Accumulator</div>
            <div class="bot-des">Compra en la caída y vende todo junto en ganancia.</div>
          </button>
          <button type="button" data-tipo="cash" class="bot-tipo ${F.tipo==='cash'?'on':''}">
            <div class="bot-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#e8b84b" stroke-width="1.8"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
            <div class="bot-nom">Cash Out</div>
            <div class="bot-des">Vende la cripto que ya tienes, solo cuando suba al precio o % que elijas.</div>
          </button>
        </div>
        <div class="lab">Moneda ${iBtn('par')}</div>
        <div class="fila"><select id="f-base">${optHTML(BASES, F.baseId)}</select><select id="f-quote">${optHTML(QUOTES, F.quoteId)}</select></div>
        <div id="f-grid" style="${F.tipo!=='grid'?'display:none':''}">
          <div class="lab">Estrategia ${iBtn('estrategia')}</div>
          <div class="seg presets" id="f-preset">
            <button type="button" data-preset="tranquilo" class="${F.preset==='tranquilo'?'on':''}">Tranquilo</button>
            <button type="button" data-preset="equilibrado" class="${F.preset==='equilibrado'?'on':''}">Equilibrado</button>
            <button type="button" data-preset="activo" class="${F.preset==='activo'?'on':''}">Activo</button>
            <button type="button" data-preset="volatil" class="${F.preset==='volatil'?'on':''}">Volátil</button>
          </div>
          <div class="lab">Rango de precio ${iBtn('rango')}<button class="sug" id="f-sug" type="button">Sugerir</button></div>
          <div class="fila">${campoNum('f-min',{placeholder:'precio bajo',pct:0.005})}${campoNum('f-max',{placeholder:'precio alto',pct:0.005})}</div>
          <div class="fila">
            <div><div class="lab">Cuadrículas ${iBtn('cuadriculas')}</div>${campoNum('f-niv',{value:20,min:2,max:100,step:1,int:true})}</div>
            <div><div class="lab" style="justify-content:space-between;gap:8px"><span style="display:flex;align-items:center;gap:6px">Invierto <span id="f-total-sym">(${moneda(F.quoteId).simbolo})</span> ${iBtn('inversion')}</span><span id="f-total-saldo" class="saldo-chip">—</span></div>${campoNum('f-total',{placeholder:'0.00',step:1,min:0})}</div>
          </div>
          <div class="lab">Ganancia por cuadrícula % ${iBtn('margen')} <span style="color:var(--ink-3);font-size:11px;font-family:var(--mono)">— opcional, recalcula las cuadrículas</span></div>
          ${campoNum('f-margen',{placeholder:'auto',min:0,max:20,step:0.5})}
          <div id="f-margen-nota"></div>
          <div class="paso-box"><span>Separación entre cuadrículas ${iBtn('separacion')}</span><b id="pv-paso">—</b></div>
        </div>
        <div id="f-acum" style="${F.tipo==='acum'?'':'display:none'}">
          <div class="lab">Precio mínimo — hasta dónde compra ${iBtn('acmin')}<button class="sug" id="fa-sug" type="button">Sugerir</button></div>
          ${campoNum('fa-min',{placeholder:'precio más bajo',pct:0.01})}
          <div class="fila">
            <div><div class="lab">Nº de compras ${iBtn('acniv')}</div>${campoNum('fa-niv',{value:15,min:2,max:100,step:1,int:true})}</div>
            <div><div class="lab">Invierto (${moneda(F.quoteId).simbolo}) ${iBtn('inversion')}</div>${campoNum('fa-total',{placeholder:'0.00',step:1,min:0})}</div>
          </div>
          <div class="fila">
            <div><div class="lab">Compra inicial % ${iBtn('acini')}</div>${campoNum('fa-ini',{value:30,min:0,max:100,step:5})}</div>
            <div><div class="lab">Comprar más abajo % ${iBtn('acfactor')}</div>${campoNum('fa-factor',{value:20,min:0,max:200,step:5})}</div>
          </div>
          <div class="lab">Vender cuando gane ${iBtn('acobj')}</div>
          <div class="seg presets" id="fa-obj" style="grid-template-columns:repeat(5,1fr)">
            <button type="button" data-obj="3">3%</button><button type="button" data-obj="5">5%</button>
            <button type="button" data-obj="10" class="on">10%</button><button type="button" data-obj="15">15%</button><button type="button" data-obj="20">20%</button>
          </div>
          ${campoNum('fa-obj-val',{value:10,min:0.5,max:100,step:0.5})}
          <div class="asesor" id="fa-prev" style="margin-top:12px">
            <div class="as-top"><b>Resumen del acumulador</b></div>
            <div class="as-grid">
              <div><span>Compra inicial (a mercado)</span><b id="fa-p-ini">—</b></div>
              <div><span>Precio promedio estimado</span><b id="fa-p-prom">—</b></div>
            </div>
            <div class="as-nota">Compra en la caída (más volumen mientras más baja) y vende TODO junto cuando el total gane el % que elijas. Luego repite. Menos comisiones.</div>
          </div>
        </div>
        <div id="f-cash" style="${F.tipo==='cash'?'':'display:none'}">
          <div class="cash-note">Vendes <b id="cn-b">${moneda(F.baseId).simbolo}</b> y recibes <b id="cn-q">${moneda(F.quoteId).simbolo}</b> en tu wallet.</div>
          <div class="lab">Cantidad a vender ${iBtn('cashcant')}</div>
          <div class="cash-bal"><span id="fc-saldo">—</span><button type="button" class="cash-max" id="fc-max">Máx</button></div>
          ${campoNum('fc-cant',{placeholder:'0.00',step:0.01,min:0,suffix:'fc-cant-usd'})}
          <input type="range" id="fc-slider" class="cash-slider" min="0" max="100" value="0" step="1">
          <div class="seg presets" id="fc-pctamt" style="grid-template-columns:repeat(6,1fr);margin-top:2px">
            <button type="button" data-pa="5">5%</button><button type="button" data-pa="10">10%</button><button type="button" data-pa="25">25%</button><button type="button" data-pa="50">50%</button><button type="button" data-pa="75">75%</button><button type="button" data-pa="100">100%</button>
          </div>
          <div class="lab" style="margin-top:16px">Vender cuando ${iBtn('cashobj')}</div>
          <div class="seg presets" id="fc-modo" style="grid-template-columns:1fr 1fr">
            <button type="button" data-cm="pct" class="on">Suba un %</button>
            <button type="button" data-cm="precio">Llegue a un precio</button>
          </div>
          <div id="fc-pct-wrap">
            <div class="seg presets" id="fc-pctpreset" style="grid-template-columns:repeat(4,1fr);margin-top:8px">
              <button type="button" data-p="5">+5%</button><button type="button" data-p="10" class="on">+10%</button><button type="button" data-p="20">+20%</button><button type="button" data-p="50">+50%</button>
            </div>
            ${campoNum('fc-pct',{value:10,min:0.5,max:2000,step:1})}
          </div>
          <div id="fc-precio-wrap" style="display:none;margin-top:8px">${campoNum('fc-precio',{placeholder:'precio objetivo',pct:0.05})}</div>
          <div class="cash-resumen" id="fc-prev">
            <div class="cr-top">Resumen del Cash Out</div>
            <div class="cr-rows">
              <div class="cr-row"><span>Vendes</span><b id="fc-p-cant">—</b></div>
              <div class="cr-row"><span>Valor ahora</span><b id="fc-p-valor">—</b></div>
              <div class="cr-row"><span>Recibirás al objetivo</span><b id="fc-p-recibe">—</b></div>
              <div class="cr-row cr-gan"><span>Ganancia estimada</span><b id="fc-p-gan" class="pos">—</b></div>
            </div>
            <div class="cr-note">Vende solo cuando el precio llegue a tu objetivo y recibe <b id="fc-p-est">${moneda(F.quoteId).simbolo}</b> en tu wallet.<br><span style="opacity:.75">Ten esa moneda agregada en tu wallet para verla — llega igual.</span></div>
          </div>
        </div>
        <div style="text-align:right"><button class="btn-avz" id="f-toggleavz">${F.avanzado ? '− Opciones avanzadas' : '+ Opciones avanzadas'}</button></div>
        <div class="avz" id="f-avz" style="${F.avanzado ? '' : 'display:none'}">
          <div class="fila">
            <div><div class="lab">Protección precio % ${iBtn('proteccion')}</div>${campoNum('f-slip',{value:1,step:0.5,min:0,max:10})}</div>
            <div><div class="lab">Ritmo mín (s) ${iBtn('ritmo')}</div>${campoNum('f-cd',{value:0,step:5,min:0,int:true})}</div>
          </div>
          <div class="lab">Con "Ganancia por cuadrícula" ${iBtn('margenmodo')}</div>
          <div class="seg presets" id="f-margenmodo" style="grid-template-columns:1fr 1fr;margin-bottom:10px">
            <button type="button" data-mm="cuadriculas" class="${F.margenModo!=='rango'?'on':''}">Ajustar cuadrículas</button>
            <button type="button" data-mm="rango" class="${F.margenModo==='rango'?'on':''}">Ampliar rango</button>
          </div>
          <div class="fila" id="f-avz-tpsl">
            <div><div class="lab">Cerrar con ganancia ${iBtn('tp')}</div>${campoNum('f-tp',{placeholder:'off',pct:0.01,min:0})}</div>
            <div><div class="lab">Protegerme de caídas ${iBtn('sl')}</div>${campoNum('f-sl',{placeholder:'off',pct:0.01,min:0})}</div>
          </div>
        </div>
        <button class="btn btn-verde mt" id="f-crear">Encender el bot</button>
        <div id="c-msg"></div>
      </div>
      <div>
        <div class="card">
          <div id="c-chart">${graficaPreview()}</div>
          <div id="c-acum-side" style="display:none">
            <div class="acum-hero">
              <div class="acum-ico"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#e8b84b" stroke-width="1.6"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg></div>
              <h4>Accumulator</h4>
              <p>Compra en la caída — más volumen mientras más baja — y vende <b>todo junto</b> cuando el total gana el % que elijas. Menos operaciones, menos comisiones.</p>
              <div class="acum-flow">
                <div class="af"><span>1</span> Compra inicial a mercado</div>
                <div class="af"><span>2</span> Compra más en cada caída (progresivo)</div>
                <div class="af"><span>3</span> Vende todo al llegar a tu ganancia</div>
                <div class="af"><span>4</span> Repite, sin parar</div>
              </div>
            </div>
          </div>
          <div id="c-cash-side" style="display:none">
            <div class="acum-hero">
              <div class="acum-ico"><svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#e8b84b" stroke-width="1.5"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
              <h4>Cash Out</h4>
              <p>Ya tienes la cripto. Dices <b>cuánto</b> vender y <b>a qué objetivo</b> (precio o %). El bot vende solo cuando llega, y te paga en tu estable.</p>
              <div class="acum-flow">
                <div class="af"><span>1</span> Eliges la moneda que ya tienes</div>
                <div class="af"><span>2</span> Cuánto vender y a qué objetivo</div>
                <div class="af"><span>3</span> Vende solo al llegar el precio</div>
                <div class="af"><span>4</span> Recibes en USDT/USDC en tu wallet</div>
              </div>
            </div>
          </div>
          <div id="c-hint"></div>
          <div class="prev">
            <div class="p"><b>Precio</b><span id="pv-precio">—</span></div>
            <div class="p"><b>Reparto ${iBtn('reparto')}</b><span id="pv-compras" class="rep-wrap">—</span></div>
            <div class="p"><b>Por compra</b><span id="pv-orden">—</span></div>
            <div class="p"><b>Ganancia/vuelta ${iBtn('porcuad')}</b><span id="pv-gan" class="pos">—</span></div>
          </div>
          <div class="asesor" id="c-asesor" style="display:none">
            <div class="as-top"><b>Estimación</b> ${iBtn('asesor')}</div>
            <div class="as-grid">
              <div><span>Operaciones/día (est.)</span><b id="as-ops">—</b></div>
            </div>
            <div class="as-nota" id="as-nota"></div>
          </div>
          <div class="gasbox">
            <div class="top"><div class="lab" style="margin:0">Gas del bot ${iBtn('gas')}</div><div class="v" id="c-gas"><span class="skel">0.00000</span></div></div>
            <div class="gas-row">${campoNum('f-gas',{placeholder:'0.01 BNB',step:0.005,min:0})}<button class="btn btn-oro" id="f-gasdep">Recargar</button></div>
            <div class="gas-sep"><button class="btn btn-linea btn-max" id="f-gasret">Retirar todo el gas</button></div>
            <div id="c-gasmsg"></div>
          </div>
        </div>
      </div>
    </div>
    <div class="colmenas card"><h3>Mis bots</h3><div id="c-rejillas"><div class="skel" style="height:120px;width:100%;border-radius:14px"></div></div></div>
    ${footerHTML()}
  </div>`;

  wireHeader(); wireFaq();
  $('f-base').onchange = async (e) => { F.baseId = e.target.value; F.precio = null; F.rutas = null; await cargarPrecio(); if (F.precio) aplicarPreset(F.preset || 'equilibrado'); refrescarSaldoCash(); if (F.tipo === 'cash') previewCash(); };
  $('f-quote').onchange = async (e) => {
    F.quoteId = e.target.value; F.precio = null; F.rutas = null;
    const sy = $('f-total-sym'); if (sy) sy.textContent = '(' + moneda(F.quoteId).simbolo + ')';
    refrescarSaldoInversion(); await cargarPrecio(); if (F.precio) aplicarPreset(F.preset || 'equilibrado'); if (F.tipo === 'cash') previewCash();
  };
  $('f-toggleavz').onclick = () => {
    F.avanzado = !F.avanzado; const a = $('f-avz'); if (a) a.style.display = F.avanzado ? '' : 'none';
    $('f-toggleavz').textContent = F.avanzado ? '− Opciones avanzadas' : '+ Opciones avanzadas';
  };
  { const e = $('f-total'); if (e) e.oninput = () => { asegurarRentable(); actualizarVista(); }; }
  { const e = $('f-niv'); if (e) e.oninput = () => { asegurarRentable(); actualizarVista(); }; }
  document.querySelectorAll(`#${APP} #f-margenmodo button`).forEach((b) => b.onclick = () => {
    F.margenModo = b.dataset.mm;
    document.querySelectorAll(`#${APP} #f-margenmodo button`).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    recomputarPorMargen(); actualizarVista();
  });
  ['f-min','f-max','f-margen'].forEach((id) => { const e = $(id); if (e) e.oninput = () => { asegurarRentable(); actualizarVista(); }; });
  $('f-sug').onclick = sugerirRango;
  document.querySelectorAll(`#${APP} #f-preset button`).forEach((b) => b.onclick = () => aplicarPreset(b.dataset.preset));
  document.querySelectorAll(`#${APP} #f-tipo button`).forEach((b) => b.onclick = () => { F.tipo = b.dataset.tipo; pintarTipo(); });
  document.querySelectorAll(`#${APP} #fa-obj button`).forEach((b) => b.onclick = () => {
    document.querySelectorAll(`#${APP} #fa-obj button`).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    const v = $('fa-obj-val'); if (v) { v.value = b.dataset.obj; previewAcum(); }
  });
  ['fa-min','fa-niv','fa-total','fa-ini','fa-factor','fa-obj-val'].forEach((id) => { const e = $(id); if (e) e.oninput = previewAcum; });
  if ($('fa-sug')) $('fa-sug').onclick = sugerirAcum;
  // Cash Out
  if (!F.cashModo) F.cashModo = 'pct';
  document.querySelectorAll(`#${APP} #fc-modo button`).forEach((b) => b.onclick = () => {
    document.querySelectorAll(`#${APP} #fc-modo button`).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    F.cashModo = b.dataset.cm;
    const pw = $('fc-pct-wrap'), rw = $('fc-precio-wrap');
    if (pw) pw.style.display = F.cashModo === 'pct' ? '' : 'none';
    if (rw) rw.style.display = F.cashModo === 'precio' ? '' : 'none';
    if (F.cashModo === 'precio' && $('fc-precio') && !$('fc-precio').value && F.precio) $('fc-precio').value = Number((F.precio * 1.1).toPrecision(6));
    previewCash();
  });
  document.querySelectorAll(`#${APP} #fc-pctpreset button`).forEach((b) => b.onclick = () => {
    document.querySelectorAll(`#${APP} #fc-pctpreset button`).forEach((x) => x.classList.remove('on')); b.classList.add('on');
    const v = $('fc-pct'); if (v) { v.value = b.dataset.p; previewCash(); }
  });
  ['fc-cant', 'fc-pct', 'fc-precio'].forEach((id) => { const e = $(id); if (e) e.oninput = previewCash; });
  if ($('fc-slider')) $('fc-slider').oninput = () => { const pct = parseFloat($('fc-slider').value) || 0; setCantCash(maxCash() * pct / 100); };
  if ($('fc-max')) $('fc-max').onclick = () => setCantCash(maxCash());
  document.querySelectorAll(`#${APP} #fc-pctamt button`).forEach((b) => b.onclick = () => setCantCash(maxCash() * (parseFloat(b.dataset.pa) || 0) / 100));
  refrescarSaldoCash();
  pintarTipo();
  $('f-crear').onclick = onCrear;
  $('f-gasdep').onclick = onDepositarGas;
  $('f-gasret').onclick = onRetirarGas;
  wirePops(host);
  wireSteppers(host);

  cargarPrecio(); refrescarGas(); refrescarSaldoInversion(); refrescarRejillas();
}

/* ================================================================== */
/* Precio + vista viva                                                 */
/* ================================================================== */
async function cargarPrecio() {
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  try { const r = await gb.precioPar(gb.dirDe(base), gb.dirDe(quote), base.decimals, quote.decimals); F.precio = r.precio; F.rutas = r.rutas; }
  catch { F.precio = null; }
  actualizarVista();
}
function actualizarVista() {
  if ($('c-chart')) $('c-chart').innerHTML = graficaPreview();
  if ($('pv-precio')) $('pv-precio').textContent = precioFmt(F.precio);
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value);
  const n = parseInt($('f-niv')?.value, 10), total = parseFloat($('f-total')?.value);
  const valido = F.precio && pMin > 0 && pMax > pMin && n >= 2;
  const pasoPct = valido ? (Math.pow(pMax / pMin, 1 / (n - 1)) - 1) : null;
  if ($('pv-paso')) $('pv-paso').textContent = pasoPct != null ? num(pasoPct * 100, 2) + '%' : '—';

  const hint = $('c-hint');
  let aviso1 = '';
  if (NOTA_GAS) aviso1 += `<div class="hint">${NOTA_GAS}</div>`;
  if (F.precio && pMin > 0 && pMax > pMin && (F.precio < pMin || F.precio > pMax))
    aviso1 = `<div class="hint">El precio de ahora (${precioFmt(F.precio)}) está fuera de tu rango. El bot esperará a que entre; si quieres que opere ya, ajusta el rango.</div>`;
  if (hint) hint.innerHTML = aviso1;

  if (valido) {
    const ps = nivelesPreview(pMin, pMax, n, 'geo');
    const nSell = ps.filter((p) => p >= F.precio).length, nBuy = n - nSell;
    if ($('pv-compras')) $('pv-compras').innerHTML = `<span class="rep-pill rep-v">${nSell} venden</span><span class="rep-pill rep-c">${nBuy} compran</span>`;
    const ordenQuote = total > 0 ? total / n : 0;
    if ($('pv-orden')) $('pv-orden').textContent = ordenQuote ? num(ordenQuote, 2) : '—';
    const net = ordenQuote * (pasoPct - FEE_CICLO) - 2 * GAS_OP_USD;   // tras comisiones Y gas
    const gEl = $('pv-gan');
    if (gEl) { gEl.textContent = ordenQuote ? (net >= 0 ? '+' + num(net, 3) : '−' + num(Math.abs(net), 3)) : '—'; gEl.className = net >= 0 ? 'pos' : 'neg'; }
    asesorar(total, n, pasoPct, ordenQuote, net);
  } else {
    ['pv-compras','pv-orden','pv-gan'].forEach((id) => { if ($(id)) $(id).textContent = '—'; });
    const a = $('c-asesor'); if (a) a.style.display = 'none';
  }
}
/** Estimación honesta: operaciones/día y rendimiento/mes según volatilidad típica. */
function asesorar(total, n, pasoPct, ordenQuote, netPorVuelta) {
  const box = $('c-asesor'); if (!box) return;
  if (!(total > 0 && pasoPct > 0)) { box.style.display = 'none'; return; }
  const vol = VOL_DIARIA[F.baseId] || 0.03;
  const gasCiclo = 2 * GAS_OP_USD;                       // dos operaciones por vuelta (estable ≈ USD)
  const netCiclo = ordenQuote * (pasoPct - FEE_CICLO) - gasCiclo;
  const vueltasDia = vol / (2 * pasoPct);                // cruces de ida y vuelta por día (aprox)
  const netDia = vueltasDia * netCiclo;
  const pctMes = total > 0 ? (netDia * 30 / total) * 100 : 0;
  box.style.display = '';
  $('as-ops').textContent = (vueltasDia * 2).toFixed(vueltasDia * 2 < 1 ? 1 : 0);
  let nota = '';
  if (netCiclo <= 0) nota = 'Con esta configuración cada vuelta apenas cubre el gas. Prueba la estrategia "Tranquilo" o sube el capital: cada cuadrícula rinde cuando mueve varios dólares.';
  else if (vueltasDia < 0.3) nota = 'Rinde, pero opera poco (mercado tranquilo para este rango). Para más movimiento, prueba "Activo".';
  else nota = 'Configuración equilibrada para este capital. La estimación depende de cuánto se mueva el mercado.';
  $('as-nota').textContent = nota;
}
function aplicarPreset(id) {
  if (!F.precio) { aviso($('c-msg'), 'err', 'Espera a que cargue el precio y vuelve a intentar.'); return; }
  const p = PRESETS[id]; if (!p) return;
  F.preset = id;
  document.querySelectorAll(`#${APP} #f-preset button`).forEach((b) => b.classList.toggle('on', b.dataset.preset === id));
  $('f-min').value = Number((F.precio * (1 - p.rango)).toPrecision(6));
  $('f-max').value = Number((F.precio * (1 + p.rango)).toPrecision(6));
  $('f-niv').value = p.grids;
  asegurarRentable();
  actualizarVista();
}
let NOTA_GAS = '';
function maxGridsRentable(pMin, pMax, total) {
  for (let n = 2; n <= 100; n++) {
    const spacing = Math.pow(pMax / pMin, 1 / (n - 1)) - 1;
    const net = (total / n) * (spacing - FEE_CICLO) - 2 * GAS_OP_USD;
    if (net < 0) return Math.max(2, n - 1);
  }
  return 100;
}
// Garantiza que "Neto por vuelta" sea SIEMPRE positivo: capa las cuadrículas al máximo rentable.
function asegurarRentable() {
  NOTA_GAS = '';
  const margen = parseFloat($('f-margen')?.value) || 0;
  if (margen > 0) { recomputarPorMargen(); return; }   // el modo margen ya se capa solo
  const total = parseFloat($('f-total')?.value) || 0;
  const pMin = parseFloat($('f-min')?.value) || 0, pMax = parseFloat($('f-max')?.value) || 0;
  const niv = $('f-niv');
  if (!(total > 0 && pMin > 0 && pMax > pMin && niv)) return;
  const maxN = maxGridsRentable(pMin, pMax, total);
  const cur = parseInt(niv.value, 10) || 0;
  if (cur > maxN) { niv.value = maxN; NOTA_GAS = `Ajusté a ${maxN} cuadrículas para que cada vuelta deje ganancia con tu capital (con más, el gas se la comería).`; }
}
function rangoNecesario(n, margen) {
  const s = margen / 100 + FEE_CICLO;
  const ratio = Math.pow(1 + s, n - 1);
  const price = F.precio;
  return { pMin: price / Math.sqrt(ratio), pMax: price * Math.sqrt(ratio) };
}
async function ampliarRango(pMin, pMax, n, margen) {
  const ok = await modalConfirm({
    titulo: 'Ampliar el rango',
    cuerpo: `Para que tus <b>${n} cuadrículas</b> ganen <b>${num(margen, 1)}%</b> cada una (por encima de la comisión), el rango debe ampliarse a:<br><br><b>${precioFmt(pMin)} – ${precioFmt(pMax)}</b><br><br>Un rango más amplio hace el bot <b>menos sensible</b>: opera menos seguido, pero cada operación deja tu ganancia limpia, sin que la comisión se la coma. Así puedes operar con el capital que quieras.<br><br>¿Aplicar este rango?`,
    ok: 'Sí, ampliar'
  });
  if (!ok) return;
  modalClose();   // FIX: cerrar el modal al confirmar (antes se quedaba pegado)
  $('f-min').value = Number(pMin.toPrecision(6));
  $('f-max').value = Number(pMax.toPrecision(6));
  recomputarPorMargen(); actualizarVista();
}
function recomputarPorMargen() {
  const margen = parseFloat($('f-margen')?.value) || 0;
  const niv = $('f-niv'); const nota = $('f-margen-nota');
  if (nota) nota.innerHTML = '';
  if (!(margen > 0)) {   // "auto": modo manual normal
    if (niv) { niv.readOnly = false; niv.style.opacity = ''; niv.title = ''; }
    return;
  }
  const total = parseFloat($('f-total')?.value) || 0;
  const simQ = moneda(F.quoteId).simbolo;
  // Máximo de cuadrículas que el capital soporta al % dado (cada una debe cubrir su gas).
  const maxViable = total > 0 ? Math.max(2, Math.floor(total * (margen / 100) / (2 * GAS_OP_USD))) : 100;
  const sepObj = margen + FEE_CICLO * 100;   // separación objetivo en %

  if (F.margenModo === 'rango') {
    // El usuario fija N; calculamos el rango y avisamos si el gas no da.
    if (niv) { niv.readOnly = false; niv.style.opacity = ''; niv.title = ''; }
    const n = parseInt($('f-niv')?.value, 10) || 0;
    if (!(n >= 2 && F.precio && nota)) return;
    if (total > 0 && n > maxViable) {
      nota.innerHTML = `<div class="hint" style="color:var(--rojo)">⚠ Con ${num(total, 0)} ${simQ} y ${n} cuadrículas al ${num(margen, 1)}%, cada cuadrícula es demasiado pequeña: el gas se comería la ganancia. Con este capital lo rentable es <b>máximo ~${maxViable} cuadrículas</b>. Sube el capital, sube el % o baja las cuadrículas.</div>`;
      return;
    }
    const { pMin, pMax } = rangoNecesario(n, margen);
    const aMin = parseFloat($('f-min')?.value) || 0, aMax = parseFloat($('f-max')?.value) || 0;
    const yaOk = aMin > 0 && aMax > 0 && Math.abs(aMin - pMin) / pMin < 0.02 && Math.abs(aMax - pMax) / pMax < 0.02;
    if (!yaOk) {
      nota.innerHTML = `<div class="hint">Para <b>${n} cuadrículas</b> al ${num(margen, 1)}% cada una (separación ≈ <b>${num(sepObj, 2)}%</b>), el rango debe ser <b>${precioFmt(pMin)} – ${precioFmt(pMax)}</b> (bot menos sensible). <button class="sug" id="f-ampliar" type="button">Aplicar rango</button></div>`;
      if ($('f-ampliar')) $('f-ampliar').onclick = () => ampliarRango(pMin, pMax, n, margen);
    } else {
      nota.innerHTML = `<div class="hint" style="color:var(--neon-lit)">✓ Rango ajustado: ${n} cuadrículas al ${num(margen, 1)}% cada una (separación ≈ ${num(sepObj, 2)}%).</div>`;
    }
    return;
  }
  // Modo por defecto: derivar cuadrículas del rango (campo bloqueado), con tope de gas.
  const pMin = parseFloat($('f-min')?.value) || 0, pMax = parseFloat($('f-max')?.value) || 0;
  if (!(pMin > 0 && pMax > pMin)) return;
  const spacing = margen / 100 + FEE_CICLO;
  let n = Math.round(Math.log(pMax / pMin) / Math.log(1 + spacing));
  n = Math.max(2, Math.min(100, n));
  if (total > 0 && n > maxViable) n = maxViable;   // tope de gas
  if (niv) { niv.value = n; niv.readOnly = true; niv.style.opacity = '0.6'; niv.title = 'Calculado por tu % de ganancia y tu capital'; }
  if (nota && total > 0 && n <= maxViable && maxViable <= 3) {
    nota.innerHTML = `<div class="hint">Con ${num(total, 0)} ${simQ} y ${num(margen, 1)}% por cuadrícula, tu capital solo da para pocas cuadrículas rentables (el gas manda). Sube el capital o el % para tener más.</div>`;
  }
}
function sugerirRango() {
  aplicarPreset('equilibrado');
}

/* ================================================================== */
/* Permisos (limitados, dentro de "Encender")                          */
/* ================================================================== */
// Convierte un número humano a unidades del token (recorta decimales para parseUnits).
function mBI(human, dec) { return gb.parse(Number(human).toFixed(Math.min(dec, 8)), dec); }

/* ================================================================== */
/* Gas                                                                 */
/* ================================================================== */
async function refrescarGas() {
  const cuenta = wallet.cuentaActual(); const el = $('c-gas'); if (!cuenta || !el) return;
  try { const s = await gb.gasSaldo(cuenta); el.textContent = `${Number(gb.fmtBNB(s)).toFixed(5)} BNB`; } catch { el.textContent = '—'; }
}
async function refrescarSaldoInversion() {
  const cuenta = wallet.cuentaActual(); const el = $('f-total-saldo'), inp = $('f-total'); if (!el || !cuenta) return;
  el.textContent = '…';
  try {
    const quote = moneda(F.quoteId);
    const bal = await gb.balanceToken(gb.dirDe(quote), cuenta);
    const balH = Number(gb.fmt(bal, quote.decimals)); F.saldoQuote = balH;
    el.innerHTML = `Tienes ${num(balH, 2)} · <b>Máx</b>`;
    if (inp) inp.dataset.max = balH;                 // el stepper y el clamp respetan este tope
    if (inp && parseFloat(inp.value) > balH) { inp.value = Number(balH.toPrecision(8)); inp.dispatchEvent(new Event('input', { bubbles: true })); }
    el.onclick = () => { if (F.saldoQuote > 0 && inp) { inp.value = Number(F.saldoQuote.toPrecision(8)); inp.dispatchEvent(new Event('input', { bubbles: true })); } };
  } catch { el.textContent = ''; F.saldoQuote = null; }
}
async function refrescarSaldoCash() {
  const el = $('fc-saldo'); const cuenta = wallet.cuentaActual(); if (!el || !cuenta) return;
  el.textContent = '…';
  try {
    const base = moneda(F.baseId);
    const bal = await gb.saldoParaMostrar(gb.dirDe(base), cuenta);
    const balH = Number(gb.fmt(bal, base.decimals));
    F.saldoBase = balH;
    el.textContent = `Tienes ${num(balH, 4)} ${base.simbolo}`;
    const inp = $('fc-cant'); if (inp && !inp.value && balH > 0) setCantCash(maxCash());
    else previewCash();
  } catch { el.textContent = ''; }
}
async function onDepositarGas() {
  const v = parseFloat($('f-gas').value); const m = $('c-gasmsg');
  if (!(v > 0)) { aviso(m, 'err', 'Escribe cuánto BNB quieres poner.'); return; }
  aviso(m, 'info', 'Recargando… confirma en tu wallet.');
  try { await gb.depositarGas(v); aviso(m, 'info', 'Gas recargado.'); refrescarGas(); }
  catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}
async function onRetirarGas() {
  const cuenta = wallet.cuentaActual(); const m = $('c-gasmsg');
  try {
    const s = await gb.gasSaldo(cuenta);
    if (s <= 0n) { aviso(m, 'err', 'No tienes gas para retirar.'); return; }
    aviso(m, 'info', 'Retirando… confirma en tu wallet.');
    await gb.retirarGas(gb.fmtBNB(s)); aviso(m, 'info', 'Gas retirado.'); refrescarGas();
  } catch (e) { aviso(m, 'err', 'No se pudo: ' + (e?.shortMessage || e?.message || e)); }
}

/* ================================================================== */
/* Crear                                                               */
/* ================================================================== */
async function asegurarSuscripcion(cuenta) {
  let act = false;
  try { act = await gb.estaActivo(cuenta); } catch (_) {}
  if (act) return true;
  const precio = await gb.precioSub();
  if (!(precio > 0n)) { modalError('La activación del bot aún no está configurada. Avísame para revisarlo.'); return false; }
  const precioBNB = Number(gb.fmtBNB(precio));
  const ok = await modalConfirm({
    titulo: 'Activar tu bot (30 días)',
    cuerpo: `Para encender tu bot hay que activarlo por 30 días. Es un pago único de <b>${num(precioBNB, 5)} BNB</b> (≈ $1) que firmas desde tu wallet. Con eso puedes tener <b>todos los bots que quieras</b> este mes.<br><br>¿Activar ahora?`,
    ok: 'Sí, activar'
  });
  if (!ok) return false;
  modalBusy('Activando tu bot (firma el pago en tu wallet)…');
  await gb.suscribir();
  return true;
}
async function onCrear() {
  if (F.tipo === 'acum') return onCrearAcum();
  if (F.tipo === 'cash') return onCrearCashOut();
  const m = $('c-msg'); const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const cuenta = wallet.cuentaActual();
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    pMin: parseFloat($('f-min').value), pMax: parseFloat($('f-max').value),
    niveles: parseInt($('f-niv').value, 10), modo: F.modo, totalQuoteHumano: parseFloat($('f-total').value),
    slippageBps: Math.round((parseFloat($('f-slip')?.value) || 1) * 100),
    cooldownSeg: parseInt($('f-cd')?.value, 10) || 0,
    tpPrecio: parseFloat($('f-tp')?.value) || 0, slPrecio: parseFloat($('f-sl')?.value) || 0,
    margenPct: (parseFloat($('f-margen')?.value) || 0) / 100, margenModo: F.margenModo, rutas: F.rutas
  };
  if (!(p.pMin > 0 && p.pMax > p.pMin)) { aviso(m, 'err', 'Revisa el rango: el precio alto debe ser mayor que el bajo. Prueba "Sugerir".'); return; }
  if (!(p.niveles >= 2)) { aviso(m, 'err', 'Pon al menos 2 cuadrículas.'); return; }
  if (!(p.totalQuoteHumano > 0)) { aviso(m, 'err', '¿Cuánto quieres invertir?'); return; }
  const total = p.totalQuoteHumano;

  const n1 = F.precio && (F.precio < p.pMin || F.precio > p.pMax);
  const ok = await modalConfirm({
    titulo: 'Encender el bot',
    cuerpo: `Vas a poner a trabajar <b>${num(total, 2)} ${quote.simbolo}</b> en ${simboloDe(p.base)}/${quote.simbolo}.<br><br>Te pediré firmar <b>varias veces</b> en tu wallet y te explicaré cada paso. Tu dinero sigue en tu wallet; solo le das permiso al bot para intercambiar dentro de este par.${n1 ? '<br><br>⚠ El precio de ahora está fuera de tu rango: el bot esperará a que entre.' : ''}`,
    ok: 'Sí, encender'
  });
  if (!ok) return;

  try {
    // 0) Verificar saldo real ANTES de firmar nada
    modalBusy('Comprobando tu saldo…');
    const balBI = await gb.balanceToken(p.quote, cuenta);
    const balH = Number(gb.fmt(balBI, quote.decimals)); F.saldoQuote = balH;
    if (total > balH + 1e-9) { modalError(`No tienes suficiente ${quote.simbolo}. En tu wallet hay ${num(balH, 4)} ${quote.simbolo} y quieres invertir ${num(total, 2)}. Baja la cantidad o usa "Máx".`); return; }
    if (!(await asegurarSuscripcion(cuenta))) { modalClose(); return; }

    modalBusy('Calculando tu rejilla con el precio real…');
    const config = await gb.construirConfig(p);
    const netV = (config._ordenQuoteHumano || 0) * ((config._pasoPct || 0) - FEE_CICLO) - 2 * GAS_OP_USD;
    if (netV < 0) { modalError('Con esta configuración el gas se comería la ganancia de cada vuelta (daría pérdida). Sube el capital, sube la "ganancia por cuadrícula" o usa menos cuadrículas.'); return; }
    const price = config._Pnow || F.precio || 1;
    const topeQuote = total * 20, topeBase = (total / price) * 20;
    const quoteNeed = mBI(topeQuote, quote.decimals), baseNeed = mBI(topeBase, base.decimals);
    const [aQ, aB] = await Promise.all([gb.allowance(p.quote, cuenta), gb.allowance(p.base, cuenta)]);

    const pasos = (aQ < quoteNeed ? 1 : 0) + (aB < baseNeed ? 1 : 0) + 1;
    let i = 0;
    if (aQ < quoteNeed) {
      i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${quote.simbolo}.</b><br>Le das permiso al bot para usar tu ${quote.simbolo} y comprar cuando el precio baje (hasta ${num(topeQuote, 2)} ${quote.simbolo}, límite que puedes revocar cuando quieras).<br><br>Confirma en tu wallet.`);
      await gb.aprobarToken(p.quote, quoteNeed);
    }
    if (aB < baseNeed) {
      i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${base.simbolo}.</b><br>Para que el bot pueda vender lo que vaya comprando y dejarte la ganancia.<br><br>Confirma en tu wallet.`);
      await gb.aprobarToken(p.base, baseNeed);
    }
    i++; modalBusy(`<b>Paso ${i} de ${pasos} — Encender.</b><br>Se crea tu bot con tu configuración y empieza a vigilar el mercado.<br><br>Confirma en tu wallet.`);
    await gb.crearRejilla(config);

    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total, entry: config._Pnow, creadoLocal: Date.now() });
    modalDone('¡Bot encendido!', `Tu bot ya está trabajando en ${simboloDe(p.base)}/${quote.simbolo}. Recuerda tener <b>gas</b> cargado para que pueda operar. Lo verás abajo en "Mis bots".`);
    refrescarRejillas(); refrescarSaldoInversion();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); }   // canceló la firma: cerrar sin drama
    else modalError(e?.shortMessage || e?.message || String(e));
  }
}

/* ================================================================== */
/* Panel                                                               */
/* ================================================================== */
function pintarTipo() {
  const t = F.tipo, noGrid = t !== 'grid';
  if ($('f-grid')) $('f-grid').style.display = t === 'grid' ? '' : 'none';
  if ($('f-acum')) $('f-acum').style.display = t === 'acum' ? '' : 'none';
  if ($('f-cash')) $('f-cash').style.display = t === 'cash' ? '' : 'none';
  // Panel derecho (gráfica/reparto/neto) es solo del Smart Grid.
  ['c-chart', 'c-hint', 'c-asesor'].forEach((id) => { const e = $(id); if (e) e.style.display = noGrid ? 'none' : ''; });
  { const as = $('c-acum-side'); if (as) as.style.display = t === 'acum' ? '' : 'none'; }
  { const cs = $('c-cash-side'); if (cs) cs.style.display = t === 'cash' ? '' : 'none'; }
  const prev = document.querySelector(`#${APP} .prev`); if (prev) prev.style.display = noGrid ? 'none' : '';
  const tpsl = $('f-avz-tpsl'); if (tpsl) tpsl.style.display = noGrid ? 'none' : '';
  document.querySelectorAll(`#${APP} #f-tipo button`).forEach((b) => b.classList.toggle('on', b.dataset.tipo === t));
  if (t === 'cash') refrescarSaldoCash();
  if (t === 'acum') previewAcum(); else if (t === 'cash') previewCash(); else actualizarVista();
}
function sugerirAcum() {
  if (!F.precio) { aviso($('c-msg'), 'err', 'Espera a que cargue el precio y vuelve a intentar.'); return; }
  $('fa-min').value = Number((F.precio * 0.6).toPrecision(6));   // compra hasta ~-40%
  previewAcum();
}
function previewAcum() {
  const total = parseFloat($('fa-total')?.value) || 0;
  const ini = (parseFloat($('fa-ini')?.value) || 0) / 100;
  const n = parseInt($('fa-niv')?.value, 10) || 0;
  const factor = (parseFloat($('fa-factor')?.value) || 0) / 100;
  const pMin = parseFloat($('fa-min')?.value) || 0;
  if ($('fa-p-ini')) $('fa-p-ini').textContent = total > 0 ? num(total * ini, 2) + ' ' + moneda(F.quoteId).simbolo : '—';
  const prom = $('fa-p-prom'); if (!prom) return;
  if (total > 0 && n >= 1 && F.precio && pMin > 0 && pMin < F.precio) {
    const pTop = F.precio * 0.999;
    let sumBase = 0, sumQuote = 0;
    const ci = total * ini; sumQuote += ci; sumBase += ci / F.precio;
    const rest = total * (1 - ini);
    let sw = 0; for (let d = 0; d < n; d++) sw += (1 + factor * d);
    const oq = sw > 0 ? rest / sw : 0;
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 1 : i / (n - 1); const Pi = pMin * Math.pow(pTop / pMin, t);
      const depth = n - 1 - i; const mc = oq * (1 + factor * depth);
      sumQuote += mc; sumBase += mc / Pi;
    }
    const promedio = sumBase > 0 ? sumQuote / sumBase : 0;
    prom.textContent = promedio > 0 ? precioFmt(promedio) : '—';
  } else prom.textContent = '—';
}
async function onCrearAcum() {
  const m = $('c-msg'); const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const cuenta = wallet.cuentaActual();
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    pMin: parseFloat($('fa-min').value),
    niveles: parseInt($('fa-niv').value, 10),
    totalQuoteHumano: parseFloat($('fa-total').value),
    iniPct: (parseFloat($('fa-ini').value) || 0) / 100,
    factorPct: (parseFloat($('fa-factor').value) || 0) / 100,
    objetivoPct: (parseFloat($('fa-obj-val').value) || 0) / 100,
    slippageBps: Math.round((parseFloat($('f-slip')?.value) || 1) * 100),
    cooldownSeg: parseInt($('f-cd')?.value, 10) || 0, rutas: F.rutas
  };
  if (!(p.totalQuoteHumano > 0)) { aviso(m, 'err', '¿Cuánto quieres invertir?'); return; }
  if (!(p.pMin > 0 && F.precio && p.pMin < F.precio)) { aviso(m, 'err', 'El precio mínimo debe ser MENOR que el precio de ahora. Prueba "Sugerir".'); return; }
  if (!(p.niveles >= 2)) { aviso(m, 'err', 'Pon al menos 2 compras.'); return; }
  if (!(p.objetivoPct >= 0.005)) { aviso(m, 'err', 'Elige a qué % de ganancia vender.'); return; }
  const total = p.totalQuoteHumano;
  const ok = await modalConfirm({
    titulo: 'Encender el acumulador',
    cuerpo: `Vas a poner <b>${num(total, 2)} ${quote.simbolo}</b> en ${base.simbolo}. Compra en la caída (más volumen mientras más baja) y vende TODO cuando ganes <b>${num(p.objetivoPct * 100, 1)}%</b>. Luego repite.<br><br>Te pediré firmar varias veces; tu dinero sigue en tu wallet.`,
    ok: 'Sí, encender'
  });
  if (!ok) return;
  try {
    modalBusy('Comprobando tu saldo…');
    const balBI = await gb.balanceToken(p.quote, cuenta);
    const balH = Number(gb.fmt(balBI, quote.decimals)); F.saldoQuote = balH;
    if (total > balH + 1e-9) { modalError(`No tienes suficiente ${quote.simbolo}. Hay ${num(balH, 4)} y quieres invertir ${num(total, 2)}.`); return; }
    if (!(await asegurarSuscripcion(cuenta))) { modalClose(); return; }
    modalBusy('Calculando tu acumulador con el precio real…');
    const config = await gb.construirConfigAcumulador(p);
    const price = config._Pnow || F.precio || 1;
    const topeQuote = total * 20, topeBase = (total / price) * 20;
    const quoteNeed = mBI(topeQuote, quote.decimals), baseNeed = mBI(topeBase, base.decimals);
    const [aQ, aB] = await Promise.all([gb.allowance(p.quote, cuenta), gb.allowance(p.base, cuenta)]);
    const pasos = (aQ < quoteNeed ? 1 : 0) + (aB < baseNeed ? 1 : 0) + 1; let i = 0;
    if (aQ < quoteNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${quote.simbolo}.</b><br>Para que el bot compre cuando el precio baje.<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.quote, quoteNeed); }
    if (aB < baseNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${base.simbolo}.</b><br>Para que pueda vender todo lo acumulado.<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.base, baseNeed); }
    i++; modalBusy(`<b>Paso ${i} de ${pasos} — Encender.</b><br>Se crea tu acumulador y hace la compra inicial.<br><br>Confirma en tu wallet.`);
    await gb.crearRejilla(config);
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total, entry: config._Pnow, creadoLocal: Date.now(), tipo: 'acum', objetivo: p.objetivoPct });
    modalDone('¡Acumulador encendido!', `Ya está comprando en la caída en ${base.simbolo}. Venderá todo al llegar a <b>+${num(p.objetivoPct * 100, 1)}%</b>. Ten <b>gas</b> cargado para que opere. Lo verás en "Mis bots".`);
    refrescarRejillas(); refrescarSaldoInversion();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); } else modalError(e?.shortMessage || e?.message || String(e));
  }
}
const RESERVA_BNB = 0.006;   // se deja para pagar el gas de envolver + crear el bot
function maxCash() {
  const bal = F.saldoBase || 0;
  return gb.esBNB(gb.dirDe(moneda(F.baseId))) ? Math.max(0, bal - RESERVA_BNB) : bal;
}
function pintarSlider(pct) {
  const sl = $('fc-slider'); if (!sl) return;
  const p = Math.max(0, Math.min(100, pct));
  sl.value = p;
  sl.style.background = `linear-gradient(90deg, var(--gold) 0%, var(--gold) ${p}%, var(--line) ${p}%, var(--line) 100%)`;
}
function setCantCash(v) {
  const inp = $('fc-cant'); if (!inp) return;
  const mx = maxCash(); if (v > mx) v = mx;
  inp.value = v > 0 ? Number(v.toPrecision(8)) : '';
  previewCash();
}
function previewCash() {
  const cant = parseFloat($('fc-cant')?.value) || 0;
  const modoObj = F.cashModo || 'pct';
  let targetPrice = 0;
  if (modoObj === 'precio') targetPrice = parseFloat($('fc-precio')?.value) || 0;
  else { const pct = parseFloat($('fc-pct')?.value) || 0; if (F.precio && pct > 0) targetPrice = F.precio * (1 + pct / 100); }
  const simB = moneda(F.baseId).simbolo, simQ = moneda(F.quoteId).simbolo;
  const est = $('fc-p-est'); if (est) est.textContent = simQ;
  const cnb = $('cn-b'), cnq = $('cn-q'); if (cnb) cnb.textContent = simB; if (cnq) cnq.textContent = simQ;
  const usd = $('fc-cant-usd'); if (usd) usd.textContent = (cant > 0 && F.precio) ? '≈ ' + num(cant * F.precio, 2) + ' ' + simQ : '';
  const mx = maxCash(); pintarSlider(mx > 0 ? (cant / mx * 100) : 0);
  const setT = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  if (cant > 0 && targetPrice > 0 && F.precio) {
    const valor = cant * F.precio, proceeds = cant * targetPrice, g = proceeds - valor;
    setT('fc-p-cant', num(cant, 6) + ' ' + simB);
    setT('fc-p-valor', num(valor, 2) + ' ' + simQ);
    setT('fc-p-recibe', num(proceeds, 2) + ' ' + simQ);
    const gan = $('fc-p-gan'); if (gan) { gan.textContent = (g >= 0 ? '+' : '') + num(g, 2) + ' ' + simQ; gan.className = g >= 0 ? 'pos' : 'neg'; }
  } else {
    setT('fc-p-cant', cant > 0 ? num(cant, 6) + ' ' + simB : '—');
    setT('fc-p-valor', (cant > 0 && F.precio) ? num(cant * F.precio, 2) + ' ' + simQ : '—');
    setT('fc-p-recibe', '—');
    const gan = $('fc-p-gan'); if (gan) { gan.textContent = '—'; gan.className = 'pos'; }
  }
}
async function onCrearCashOut() {
  const m = $('c-msg'); const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const cuenta = wallet.cuentaActual();
  const cantidad = parseFloat($('fc-cant')?.value) || 0;
  if (!(cantidad > 0)) { aviso(m, 'err', '¿Cuánto quieres vender?'); return; }
  if (!F.precio) { aviso(m, 'err', 'Espera a que cargue el precio y vuelve a intentar.'); return; }
  const modoObj = F.cashModo || 'pct';
  let targetPrice;
  if (modoObj === 'precio') {
    targetPrice = parseFloat($('fc-precio')?.value) || 0;
    if (!(targetPrice > F.precio)) { aviso(m, 'err', `El precio objetivo debe estar por encima del precio actual (${precioFmt(F.precio)}).`); return; }
  } else {
    const pct = parseFloat($('fc-pct')?.value) || 0;
    if (!(pct > 0)) { aviso(m, 'err', 'Elige a qué % quieres vender.'); return; }
    targetPrice = F.precio * (1 + pct / 100);
  }
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    cantidadBase: cantidad, targetPrice,
    slippageBps: Math.round((parseFloat($('f-slip')?.value) || 1) * 100), rutas: F.rutas
  };
  const proceeds = cantidad * targetPrice, gan = cantidad * (targetPrice - F.precio);
  const ok = await modalConfirm({
    titulo: 'Encender Cash Out',
    cuerpo: `Cuando <b>${base.simbolo}</b> llegue a <b>${precioFmt(targetPrice)} ${quote.simbolo}</b>, el bot venderá tus <b>${num(cantidad, 6)} ${base.simbolo}</b> y recibirás <b>~${num(proceeds, 2)} ${quote.simbolo}</b> (ganancia ~${num(gan, 2)}).<br><br>Tu cripto sigue en tu wallet; solo le das permiso para venderla al llegar el objetivo. Ten <b>${quote.simbolo}</b> agregada en tu wallet para verla.`,
    ok: 'Sí, encender'
  });
  if (!ok) return;
  try {
    modalBusy('Comprobando tu saldo…');
    const balBI = await gb.saldoParaMostrar(p.base, cuenta);
    const balH = Number(gb.fmt(balBI, base.decimals));
    if (cantidad > balH + 1e-9) { modalError(`No tienes suficiente ${base.simbolo}. En tu wallet hay ${num(balH, 6)} ${base.simbolo} y quieres vender ${num(cantidad, 6)}.`); return; }
    if (!(await asegurarSuscripcion(cuenta))) { modalClose(); return; }
    // Si la moneda es BNB, hay que envolver a WBNB lo que falte (para que el bot pueda venderlo).
    if (gb.esBNB(p.base)) {
      const wbnbBal = await gb.balanceToken(p.base, cuenta);
      const wbnbH = Number(gb.fmt(wbnbBal, base.decimals));
      if (cantidad > wbnbH + 1e-12) {
        const falta = cantidad - wbnbH;
        modalBusy(`<b>Preparando tu BNB…</b><br>Se convierte ${num(falta, 6)} BNB a WBNB para poder venderlo (sigue siendo tuyo).<br><br>Confirma en tu wallet.`);
        await gb.envolverBNB(mBI(falta * 1.001, base.decimals));
      }
    }
    modalBusy('Preparando tu Cash Out con el precio real…');
    const config = await gb.construirConfigCashOut(p);
    const topeBase = cantidad * 3;
    const baseNeed = mBI(topeBase, base.decimals);
    const aB = await gb.allowance(p.base, cuenta);
    const pasos = (aB < baseNeed ? 1 : 0) + 1; let i = 0;
    if (aB < baseNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${base.simbolo}.</b><br>Le das permiso al bot para vender tus ${base.simbolo} cuando llegue el objetivo (puedes revocarlo cuando quieras).<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.base, baseNeed); }
    i++; modalBusy(`<b>Paso ${i} de ${pasos} — Encender.</b><br>Se crea tu Cash Out y queda vigilando el precio.<br><br>Confirma en tu wallet.`);
    await gb.crearRejilla(config);
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total: config._valorActual, cantBase: cantidad, entry: config._Pnow, creadoLocal: Date.now(), tipo: 'cash', targetPrice });
    modalDone('¡Cash Out encendido!', `Cuando ${base.simbolo} llegue a <b>${precioFmt(targetPrice)}</b>, venderá y recibirás ${quote.simbolo} en tu wallet. Ten <b>gas</b> cargado para que pueda operar. Lo verás en "Mis bots".`);
    refrescarRejillas();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); } else modalError(e?.shortMessage || e?.message || String(e));
  }
}
function ccl(cuenta, base, quote) { return `${(cuenta || '').toLowerCase()}|${base.toLowerCase()}|${quote.toLowerCase()}`; }
function recordarPar(cuenta, base, quote, extra) {
  const k = gb.claveDe(cuenta, base, quote);
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  m[k] = { base, quote, ...(extra || {}) }; localStorage.setItem('bot-pares', JSON.stringify(m));
  // al (re)crear, quitar de la lista de cerradas para que vuelva a mostrarse
  const c = JSON.parse(localStorage.getItem('bot-cerradas') || '{}'); delete c[ccl(cuenta, base, quote)]; localStorage.setItem('bot-cerradas', JSON.stringify(c));
}
function olvidarPar(cuenta, base, quote) {
  // borrar de bot-pares por VALOR (por si la clave no coincide)
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  for (const k of Object.keys(m)) { const p = m[k]; if (p && (p.base || '').toLowerCase() === base.toLowerCase() && (p.quote || '').toLowerCase() === quote.toLowerCase()) delete m[k]; }
  localStorage.setItem('bot-pares', JSON.stringify(m));
  // marcar como cerrada (blindaje: aunque el contrato la siga listando, no se muestra)
  const c = JSON.parse(localStorage.getItem('bot-cerradas') || '{}'); c[ccl(cuenta, base, quote)] = 1; localStorage.setItem('bot-cerradas', JSON.stringify(c));
}
function simboloDe(addr) {
  if (addr.toLowerCase() === gb.WBNB.toLowerCase()) return 'BNB';
  const m = LISTA_TODAS.find((x) => (x.address || '').toLowerCase() === addr.toLowerCase());
  return m ? m.simbolo : addr.slice(0, 6);
}
function monedaPorDir(addr) {
  const a = (addr || '').toLowerCase();
  return LISTA_TODAS.find((x) => (x.address || '').toLowerCase() === a)
    || (a === gb.WBNB.toLowerCase() ? { simbolo: 'BNB', decimals: 18, address: gb.WBNB } : null);
}

/* ---- Estela (trail): muestrea el precio mientras la gráfica está abierta ---- */
const TRAILS = new Map();
function pararTrails() { for (const t of TRAILS.values()) if (t.timer) clearInterval(t.timer); TRAILS.clear(); }
async function arrancarTrail(clave, par, pmin, pmax, decB, decQ, cuenta) {
  if (TRAILS.has(clave)) return;
  const st = { samples: [], timer: null, ops: [] }; TRAILS.set(clave, st);
  const muestrear = async () => {
    let precio = null; try { const pr = await gb.precioPar(par.base, par.quote, decB, decQ); precio = pr.precio; } catch {}
    if (precio) { st.samples.push(precio); if (st.samples.length > 40) st.samples.shift(); }
    const c = document.querySelector(`.pio-panel[data-clave="${clave}"] .trail-chart`);
    if (c && st.niveles) c.innerHTML = dibujar(st.niveles, precio, pmin, pmax, st.samples, st.ops);
  };
  try {
    const nv = await gb.nivelesDe(clave); const R = await gb.resumen(cuenta, par.base, par.quote);
    const ob = Number(gb.fmt(R.ordenBase, decB)) || 1;
    st.niveles = nv.map((x) => { const p = Number(gb.fmt(x.minOutVenta, decQ)) / ob; const e = Number(x.estado); return { p, tipo: e === 1 ? 'compra' : e === 2 ? 'venta' : 'off' }; }).filter((x) => isFinite(x.p) && x.p > 0);
  } catch { st.niveles = []; }
  try { st.ops = await gb.operacionesDe(cuenta, par.base, par.quote, decB, decQ); } catch { st.ops = []; }
  await muestrear();
  st.timer = setInterval(muestrear, 6000);
}

async function refrescarRejillas() {
  const cuenta = wallet.cuentaActual(); const cont = $('c-rejillas'); if (!cuenta || !cont) return;
  pararTrails();
  try {
    const claves = await gb.misRejillas(cuenta);
    const store = JSON.parse(localStorage.getItem('bot-pares') || '{}');
    const cerradas = JSON.parse(localStorage.getItem('bot-cerradas') || '{}');
    const cards = [];
    for (const clave of claves) {
      let par = store[clave];
      if (!par) {
        // Falta en localStorage (otro navegador, caché borrada…): reconstruir desde el contrato.
        try {
          const paths = await gb.pathsDe(clave);
          const venta = paths.pathVenta || paths[1] || paths.venta || [];
          if (!venta || venta.length < 2) continue;
          const bAddr = venta[0], qAddr = venta[venta.length - 1];
          const mb = monedaPorDir(bAddr), mq = monedaPorDir(qAddr);
          par = { base: bAddr, quote: qAddr, decBase: mb?.decimals ?? 18, decQuote: mq?.decimals ?? 18, simBase: mb?.simbolo || simboloDe(bAddr), simQuote: mq?.simbolo || simboloDe(qAddr) };
        } catch { continue; }
      }
      if (cerradas[ccl(cuenta, par.base, par.quote)]) continue; // cerrado por el usuario → oculto
      par.__cuenta = cuenta;
      try { cards.push(await tarjeta(cuenta, clave, par)); } catch {}
    }
    cont.innerHTML = cards.length ? cards.join('')
      : `<p style="color:var(--ink-3);font-family:var(--mono);font-size:12px">Aún no tienes bots activos. Arma el primero arriba.</p>`;
    enganchar(cuenta);
    activarContadores();
  } catch (e) { cont.innerHTML = `<div class="aviso err">No se pudieron cargar: ${e?.shortMessage || e?.message || e}</div>`; }
  if (PNL_TIMER) clearInterval(PNL_TIMER);
  PNL_TIMER = setInterval(refrescarPnls, 10000);
}

let PNL_TIMER = null;
/** Refresca en vivo los números de cada bot (P&L, vueltas) sin recargar la página ni reiniciar la gráfica. */
async function refrescarPnls() {
  const cuenta = wallet.cuentaActual(); if (!cuenta) return;
  const cards = document.querySelectorAll(`#${APP} .rej`);
  for (const card of cards) {
    const base = card.dataset.b, quote = card.dataset.q;
    if (!base || !quote) continue;
    const decB = Number(card.dataset.decb) || 18, decQ = Number(card.dataset.decq) || 18;
    const invertido = Number(card.dataset.total) || 0;
    try {
      const R = await gb.resumen(cuenta, base, quote);
      let precio = null; try { const pr = await gb.precioPar(base, quote, decB, decQ); precio = pr.precio; } catch {}
      const costeQ = Number(gb.fmt(R.costeQuote, decQ));
      const posBase = Number(gb.fmt(R.posicionBase, decB));
      const realizado = Number(gb.fmt(R.gananciaQuote, decQ));
      const noRealizado = precio ? (posBase * precio - costeQ) : 0;
      const totalG = realizado + noRealizado;
      const baseInv = invertido > 0 ? invertido : costeQ;
      const P = (x) => baseInv > 0 ? (x / baseInv * 100) : 0;
      const sg = (x) => (x < 0 ? '−' : '+'), cls = (x) => (x < 0 ? 'neg' : 'pos');
      const r = card.querySelector('.pio-band .r');
      if (r) {
        r.classList.toggle('neg', totalG < 0);
        const v = r.querySelector('.v'); if (v) v.textContent = sg(totalG) + num(Math.abs(totalG), 4);
        const pc = r.querySelector('.pct'); if (pc) pc.textContent = '(' + sg(P(totalG)) + num(Math.abs(P(totalG)), 2) + '%)';
      }
      const qbox = (name) => card.querySelector(`.pio-grid .pio-box[data-box="${name}"]`);
      const upd = (box, val, pctVal) => {
        if (!box) return;
        const v = box.querySelector('.v'), v2 = box.querySelector('.v2');
        if (v) { v.classList.remove('pos', 'neg'); v.classList.add(cls(val)); v.textContent = sg(val) + num(Math.abs(val), 4); }
        if (v2 && pctVal !== undefined) { v2.classList.remove('pos', 'neg'); v2.classList.add(cls(val)); v2.textContent = sg(pctVal) + num(Math.abs(pctVal), 2) + '%'; }
      };
      upd(qbox('realizado'), realizado, P(realizado));
      upd(qbox('flotante'), noRealizado, P(noRealizado));
      const entry = Number(card.dataset.entry) || null;
      const ea = qbox('entrada');
      if (ea && precio) {
        const v = ea.querySelector('.v'); if (v) v.textContent = (entry ? precioFmt(entry) : '—') + ' → ' + precioFmt(precio);
        const mkt = entry ? (precio - entry) / entry * 100 : null;
        const v2 = ea.querySelector('.v2');
        if (v2 && mkt !== null) { v2.classList.remove('pos', 'neg'); v2.classList.add(cls(mkt)); v2.textContent = sg(mkt) + num(Math.abs(mkt), 2) + '% mercado'; }
      }
      const vu = qbox('vueltas');
      if (vu) { const v = vu.querySelector('.v'); const v2 = vu.querySelector('.v2');
        if (v) v.textContent = String(R.ciclos); if (v2) v2.textContent = R.totalOps + ' operaciones'; }
      const pm = qbox('medio');
      if (pm) { const v = pm.querySelector('.v'); if (v) v.textContent = posBase > 0 ? precioFmt(costeQ / posBase) : '—'; }
    } catch (_) {}
  }
}
let GASMIN = null;
function idDe(addr) {
  if (addr.toLowerCase() === gb.WBNB.toLowerCase()) return 'BNB';
  const e = Object.entries(MONEDAS).find(([, v]) => (v.address || '').toLowerCase() === addr.toLowerCase());
  return e ? e[0] : null;
}
async function tarjeta(cuenta, clave, par) {
  const R = await gb.resumen(cuenta, par.base, par.quote);
  const decQ = par.decQuote ?? 18, decB = par.decBase ?? 18;
  const simB = par.simBase ?? simboloDe(par.base), simQ = par.simQuote ?? simboloDe(par.quote);
  if (GASMIN === null) { try { GASMIN = await gb.gasMinOp(); } catch { GASMIN = 0n; } }

  // Niveles (órdenes) + precio
  let precio = null, pmin = 0, pmax = 0, ps = [];
  const ordenBaseH = Number(gb.fmt(R.ordenBase, decB)) || 1;
  try {
    const niveles = await gb.nivelesDe(clave);
    ps = niveles.map((nv) => {
      const p = Number(gb.fmt(nv.minOutVenta, decQ)) / ordenBaseH; const est = Number(nv.estado);
      return { p, tipo: est === 1 ? 'compra' : est === 2 ? 'venta' : 'off' };
    }).filter((x) => isFinite(x.p) && x.p > 0);
    try { const pr = await gb.precioPar(par.base, par.quote, decB, decQ); precio = pr.precio; } catch {}
    if (ps.length) { pmin = Math.min(...ps.map((x) => x.p)); pmax = Math.max(...ps.map((x) => x.p)); }
  } catch {}
  let ops = []; try { ops = await gb.operacionesDe(cuenta, par.base, par.quote, decB, decQ); } catch {}
  const chart = ps.length ? dibujar(ps, precio, pmin, pmax, null, ops) : svgVacio(560, 300, 'este bot ya no tiene órdenes');

  // Números
  const invertido = (par.total != null) ? Number(par.total) : Number(gb.fmt(R.costeQuote, decQ));
  const costeQ = Number(gb.fmt(R.costeQuote, decQ));
  const posBase = Number(gb.fmt(R.posicionBase, decB));
  const realizado = Number(gb.fmt(R.gananciaQuote, decQ));
  const noRealizado = precio ? (posBase * precio - costeQ) : 0;
  const totalG = realizado + noRealizado;
  const baseInv = invertido > 0 ? invertido : costeQ;
  const pct = (x) => baseInv > 0 ? (x / baseInv * 100) : 0;
  const sg = (x) => (x < 0 ? '−' : '+'), cls = (x) => (x < 0 ? 'neg' : 'pos');
  const mkt = (par.entry && precio) ? (precio - par.entry) / par.entry * 100 : null;
  const sinPos = posBase <= 0 && Number(R.comprasHechas) === 0;
  const gas = Number(gb.fmtBNB(R.gasSaldoWei)).toFixed(4);
  const gasLow = R.gasSaldoWei < (GASMIN || 0n);
  const creadoSeg = par.creadoLocal ? Math.floor(par.creadoLocal / 1000) : Number(R.creadaEn);

  const obMid = precio || pmin;
  const obAmt = num(Number(gb.fmt(R.ordenBase, decB)), 4);
  const obW = (p) => obMid > 0 ? Math.max(22, Math.min(94, 22 + Math.abs(p - obMid) / obMid * 700)) : 45;
  const obRow = (o, side) => `<div class="ob-row ob-${side}"><span class="ob-bar" style="width:${obW(o.p).toFixed(0)}%"></span><span class="ob-p">${precioFmt(o.p)}</span><span class="ob-a">${obAmt}</span></div>`;
  const obSells = ps.filter((o) => o.tipo === 'venta').sort((a, b) => b.p - a.p);
  const obBuys = ps.filter((o) => o.tipo === 'compra').sort((a, b) => b.p - a.p);
  const ordRows = `
    <div class="ob-head"><span>Precio (${simQ})</span><span>Cantidad (${simB})</span></div>
    <div class="ob-side ob-sells">${obSells.map((o) => obRow(o, 'venta')).join('') || '<div class="ob-empty">sin ventas armadas</div>'}</div>
    <div class="ob-mid"><span>${precioFmt(obMid)}</span><span class="ob-mid-lbl">precio ahora</span></div>
    <div class="ob-side ob-buys">${obBuys.map((o) => obRow(o, 'compra')).join('') || '<div class="ob-empty">sin compras armadas</div>'}</div>`;

  const tipo = par.tipo || 'grid';
  const nombreBot = tipo === 'cash' ? 'Bot Cash Out' : tipo === 'acum' ? 'Bot Accumulator' : 'Bot Smart Grid';
  const invLabel = tipo === 'cash' ? simB : simQ;
  const invValue = tipo === 'cash' ? num((par.cantBase != null ? Number(par.cantBase) : posBase), 6) : num(invertido, 2);
  const _boxEntrada = `<div class="pio-box" data-box="entrada"><div class="k">Entrada → Ahora</div><div class="v" style="font-size:14px">${par.entry ? precioFmt(par.entry) : '—'} → ${precioFmt(precio)}</div><div class="v2 ${mkt == null ? '' : cls(mkt)}">${mkt == null ? simQ : sg(mkt) + num(Math.abs(mkt), 2) + '% mercado'}</div></div>`;
  const _boxFlotante = `<div class="pio-box" data-box="flotante"><div class="k">Flotante ${iBtn('ganancia')}</div><div class="v ${cls(noRealizado)}">${sg(noRealizado)}${num(Math.abs(noRealizado), 4)}</div><div class="v2 ${cls(noRealizado)}">${sg(pct(noRealizado))}${num(Math.abs(pct(noRealizado)), 2)}%</div></div>`;
  const _boxGas = `<div class="pio-box"><div class="k">Gas (BNB)</div><div class="v ${gasLow ? 'neg' : ''}">${gas}</div><div class="v2" style="color:var(--ink-3)">para operar</div></div>`;
  const _boxGrid = `<div class="pio-box" data-box="realizado"><div class="k">Grid profit ${iBtn('porcuad')}</div><div class="v ${cls(realizado)} numgo" data-to="${Math.abs(realizado)}" data-dec="4" data-pre="${sg(realizado)}">${sg(realizado)}${num(Math.abs(realizado), 4)}</div><div class="v2 ${cls(realizado)}">${sg(pct(realizado))}${num(Math.abs(pct(realizado)), 2)}%</div></div>`;
  const _boxRango = `<div class="pio-box"><div class="k">Rango (${simQ})</div><div class="v" style="font-size:13px">${precioFmt(pmin)} – ${precioFmt(pmax)}</div><div class="v2" style="color:var(--ink-3)">${R.niveles} cuadrículas</div></div>`;
  const _boxVueltas = `<div class="pio-box" data-box="vueltas"><div class="k">Vueltas / Ops ${iBtn('vueltas')}</div><div class="v numgo" data-to="${Number(R.ciclos)}" data-dec="0">${R.ciclos}</div><div class="v2" style="color:var(--ink-3)">${R.totalOps} operaciones</div></div>`;
  const _boxMedio = `<div class="pio-box" data-box="medio"><div class="k">Precio medio ${iBtn('promedio')}</div><div class="v" style="font-size:14px">${posBase > 0 ? precioFmt(costeQ / posBase) : '—'}</div><div class="v2" style="color:var(--ink-3)">tu coste</div></div>`;
  const _boxObjetivo = `<div class="pio-box"><div class="k">Objetivo</div><div class="v" style="font-size:14px">${par.targetPrice ? precioFmt(Number(par.targetPrice)) : '—'}</div><div class="v2" style="color:var(--ink-3)">precio de venta</div></div>`;
  let _boxes;
  if (tipo === 'cash') _boxes = _boxEntrada + _boxObjetivo + _boxFlotante + _boxGas;
  else if (tipo === 'acum') _boxes = _boxGrid + _boxFlotante + _boxEntrada + _boxMedio + _boxVueltas + _boxGas;
  else _boxes = _boxGrid + _boxFlotante + _boxEntrada + _boxRango + _boxVueltas + _boxGas;
  const _panel = tipo === 'cash' ? '' : `<button class="pio-toggle" data-acc="toggle-panel">Ver el bot trabajando ▾</button>
    <div class="pio-panel" data-clave="${clave}">
      <div class="pio-tabs"><button data-tab="grafica" class="on">Gráfica</button><button data-tab="ordenes">Órdenes (${ps.length})</button></div>
      <div class="tab-grafica"><div class="trail-chart">${chart}</div>
        <div class="leg"><span style="color:var(--neon-lit)">● esperando comprar</span><span style="color:var(--rojo)">● comprado, esperando vender</span><span>● en espera</span></div></div>
      <div class="tab-ordenes" style="display:none"><div class="ord-list">${ordRows}</div></div>
    </div>`;

  return `<div class="rej" data-b="${par.base}" data-q="${par.quote}" data-sq="${simQ}" data-sb="${simB}"
     data-bid="${idDe(par.base) || ''}" data-qid="${idDe(par.quote) || ''}" data-pmin="${pmin}" data-pmax="${pmax}"
     data-niv="${R.niveles}" data-total="${invertido}" data-decb="${decB}" data-decq="${decQ}" data-entry="${par.entry || ''}" data-tipo="${par.tipo || 'grid'}" data-cant="${par.cantBase != null ? par.cantBase : ''}">
    <div class="pio-head">
      ${logoDe(par.base, simB)}
      <div class="pio-titles">
        <div class="pio-pair">${simB}/${simQ}</div>
        <div class="pio-sub">Activo <span class="pio-time" data-since="${creadoSeg}">${tiempoActivo(creadoSeg)}</span> · ${R.activa ? '<span class="dot"></span>operando' : 'detenido'}</div>
      </div>
      <div class="pio-tags"><span class="pio-tag share" data-share>↗ Compartir</span><span class="pio-tag">LONG</span><span class="pio-tag grey">Spot</span></div>
    </div>
    <div class="pio-nombre">${nombreBot}</div>

    <div class="pio-band">
      <div class="l"><div class="k">Inversión (${invLabel})</div><div class="v">${invValue}</div></div>
      <div class="r ${totalG < 0 ? 'neg' : ''}"><div class="k">Ganancia total (${simQ})</div>
        <div class="v numgo" data-to="${Math.abs(totalG)}" data-dec="4" data-pre="${sg(totalG)}">${sg(totalG)}${num(Math.abs(totalG), 4)}</div>
        <div class="pct">(${sg(pct(totalG))}${num(Math.abs(pct(totalG)), 2)}%)</div></div>
    </div>

    <div class="pio-grid">${_boxes}</div>
    ${gasLow ? `<div class="gaswarn">⚠ Gas insuficiente: el bot no puede operar. Recarga BNB en el gas (arriba) para que empiece a comprar y vender.</div>` : ''}
    ${sinPos && !gasLow ? `<div class="gaswarn" style="background:rgba(232,184,75,.08);border-color:var(--gold-soft);color:var(--gold)">⏳ Tomando posición inicial… El bot está comprando su primera parte a mercado (el keeper la ejecuta en 1–2 min). En cuanto compre, verás aquí la ganancia moverse con el mercado.</div>` : ''}

    ${_panel}

    <div class="rej-btns" style="grid-template-columns:1fr">
      <button class="btn-oro3d" data-acc="terminar">${tipo === 'cash' ? 'Suspender' : 'Cerrar y vender'}</button>
    </div>
    <div class="rej-msg"></div>
  </div>`;
}
function esRechazo(e) { return e?.code === 'ACTION_REJECTED' || /reject|denied|user\s*rejected/i.test(e?.message || ''); }
function editarBot(el) {
  const bid = el.dataset.bid, qid = el.dataset.qid;
  if (bid && MONEDAS[bid]) F.baseId = bid;
  if (qid && MONEDAS[qid]) F.quoteId = qid;
  F.avanzado = false; render();
  // rellenar el formulario con la config actual
  if ($('f-min')) $('f-min').value = Number(parseFloat(el.dataset.pmin).toPrecision(6));
  if ($('f-max')) $('f-max').value = Number(parseFloat(el.dataset.pmax).toPrecision(6));
  if ($('f-niv')) $('f-niv').value = el.dataset.niv;
  if ($('f-total') && el.dataset.total && el.dataset.total !== 'undefined') $('f-total').value = el.dataset.total;
  cargarPrecio();
  aviso($('c-msg'), 'info', `Editando ${el.dataset.sb}/${el.dataset.sq}: cambia lo que quieras (por ejemplo las cuadrículas) y pulsa "Encender el bot" para guardar los cambios.`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
async function compartirBot(card) {
  const get = (sel) => card.querySelector(sel)?.textContent?.trim() || '';
  const pair = get('.pio-pair') || 'MI BOT';
  const inv = get('.pio-band .l .v') || '—';
  const ganEl = card.querySelector('.pio-band .r');
  const gan = ganEl?.querySelector('.v')?.textContent?.trim() || '';
  const pct = ganEl?.querySelector('.pct')?.textContent?.trim() || '';
  const neg = ganEl?.classList.contains('neg');
  const boxes = card.querySelectorAll('.pio-grid .pio-box');
  const vueltas = boxes[4]?.querySelector('.v')?.textContent?.trim() || '0';

  const W = 1080, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const verde = '#2ee86a', rojo = '#ff6b6b', oro = '#e8b84b', tint = neg ? rojo : verde;

  const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#0c2a1c'); bg.addColorStop(1, '#040f0b');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const halo = g.createRadialGradient(W * 0.5, 360, 40, W * 0.5, 360, 640);
  halo.addColorStop(0, neg ? 'rgba(255,107,107,.16)' : 'rgba(46,232,106,.18)'); halo.addColorStop(1, 'transparent');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(232,184,75,.35)'; g.lineWidth = 3; rr(40, 40, W - 80, H - 80, 40); g.stroke();

  g.textBaseline = 'alphabetic';
  g.fillStyle = oro; g.font = '700 44px Georgia, serif'; g.fillText('LA BOLITA', 90, 150);
  g.fillStyle = '#9dbdb2'; g.font = '500 26px Arial'; g.fillText('Bot Algorítmico', 92, 190);

  const ar = 62, ax = W - 210, ay = 96;
  const av = g.createLinearGradient(ax, ay, ax, ay + 2 * ar); av.addColorStop(0, verde); av.addColorStop(1, oro);
  g.fillStyle = av; g.beginPath(); g.arc(ax + ar, ay + ar, ar, 0, 7); g.fill();
  g.textAlign = 'center'; g.font = '62px Arial'; g.fillText('🤖', ax + ar, ay + ar + 22); g.textAlign = 'left';

  g.fillStyle = '#eafff2'; g.font = '700 80px Georgia, serif'; g.fillText(pair, 90, 365);
  g.fillStyle = '#9dbdb2'; g.font = '600 30px Arial'; g.fillText('Ganancia total', 92, 470);
  g.fillStyle = tint; g.font = '800 150px Georgia, serif'; g.fillText(gan || '—', 86, 618);
  g.font = '700 58px Arial'; g.fillText(pct, 92, 696);

  const stat = (x, lab, val) => {
    g.fillStyle = 'rgba(255,255,255,.05)'; rr(x, 782, 420, 128, 22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 1.5; rr(x, 782, 420, 128, 22); g.stroke();
    g.fillStyle = '#9dbdb2'; g.font = '600 26px Arial'; g.fillText(lab, x + 30, 832);
    g.fillStyle = '#eafff2'; g.font = '700 44px Georgia, serif'; g.fillText(val, x + 30, 886);
  };
  stat(90, 'Invertido', inv);
  stat(W - 90 - 420, 'Vueltas', vueltas);

  g.fillStyle = oro; g.font = '700 33px Arial'; g.textAlign = 'center';
  g.fillText('Sin custodia · Sin KYC · Arma el tuyo', W / 2, 992);
  g.textAlign = 'left';

  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'mi-bot-bolita.png';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, 'image/png');
}
function enganchar(cuenta) {
  document.querySelectorAll(`#${APP} .rej`).forEach((el) => {
    const b = el.dataset.b, q = el.dataset.q, sq = el.dataset.sq, sb = el.dataset.sb;
    wirePops(el);
    const shareBtn = el.querySelector('[data-share]');
    if (shareBtn) shareBtn.onclick = () => compartirBot(el);
    el.querySelectorAll('[data-acc]').forEach((btn) => btn.onclick = async () => {
      const acc = btn.dataset.acc;
      if (acc === 'toggle-panel') {
        const panel = el.querySelector('.pio-panel'); const abrir = !panel.classList.contains('open');
        panel.classList.toggle('open', abrir); btn.textContent = abrir ? 'Ocultar ▴' : 'Ver el bot trabajando ▾';
        if (abrir) arrancarTrail(panel.dataset.clave, { base: b, quote: q }, parseFloat(el.dataset.pmin), parseFloat(el.dataset.pmax), Number(el.dataset.decb), Number(el.dataset.decq), cuenta);
        else { const t = TRAILS.get(panel.dataset.clave); if (t?.timer) { clearInterval(t.timer); TRAILS.delete(panel.dataset.clave); } }
        return;
      }
      if (acc === 'tab-noop') return;
      if (acc === 'editar') { editarBot(el); return; }
      if (acc === 'terminar') {
        const esCash = el.dataset.tipo === 'cash';
        const ok = await modalConfirm({
          titulo: esCash ? 'Cerrar Cash Out' : 'Cerrar y vender',
          cuerpo: esCash ? `Se cancelará este Cash Out y se quita el permiso. <b>Tu cripto se queda en tu wallet</b>, no se vende nada.` : `Se venderá todo a <b>${sq}</b> y el bot se cerrará. El dinero queda en tu wallet.`,
          ok: 'Sí, cerrar'
        });
        if (!ok) return;
        try {
          if (!esCash) {
            try { modalBusy('Vendiendo a estable… confirma en tu wallet.'); await gb.cerrarAhora(b, q); }
            catch (e) { if (esRechazo(e)) { modalError('Cancelaste la firma. No se hizo ningún cambio.'); return; } }
          }
          modalBusy('Cerrando el bot… confirma en tu wallet.'); await gb.cancelarRejilla(b, q);
          if (esCash && gb.esBNB(b)) {
            try {
              const wbnbBal = await gb.balanceToken(b, cuenta);
              const cant = parseFloat(el.dataset.cant) || 0; const dcb = Number(el.dataset.decb) || 18;
              let unwrap = wbnbBal;
              if (cant > 0) { const cantWei = mBI(cant, dcb); if (unwrap > cantWei) unwrap = cantWei; }
              if (unwrap > 0n) { modalBusy('Devolviendo tu BNB… confirma en tu wallet.'); await gb.desenvolverBNB(unwrap); }
            } catch (_) {}
          }
          olvidarPar(cuenta, b, q); modalClose(); refrescarRejillas();
        } catch (e) {
          if (!esRechazo(e)) { olvidarPar(cuenta, b, q); refrescarRejillas(); }
          modalError(esRechazo(e) ? 'Cancelaste la firma.' : (e?.shortMessage || e?.message || String(e)));
        }
      } else if (acc === 'desconectar') {
        const ok = await modalConfirm({ titulo: 'Desconectar bot', cuerpo: `Se cerrará este bot y se <b>quitará el permiso</b> que le diste sobre tu ${sq} y ${sb}. No podrá operar hasta que lo actives de nuevo.`, ok: 'Desconectar', peligro: true });
        if (!ok) return;
        try {
          modalBusy('Cerrando el bot… confirma en tu wallet.'); await gb.cancelarRejilla(b, q);
          modalBusy(`Quitando el permiso de ${sq}… confirma.`); await gb.revocarToken(q);
          modalBusy(`Quitando el permiso de ${sb}… confirma.`); await gb.revocarToken(b);
          olvidarPar(cuenta, b, q); modalClose(); refrescarRejillas();
        } catch (e) {
          if (!esRechazo(e)) { olvidarPar(cuenta, b, q); refrescarRejillas(); }
          modalError(esRechazo(e) ? 'Cancelaste una firma.' : (e?.shortMessage || e?.message || String(e)));
        }
      }
    });
    // pestañas del panel
    el.querySelectorAll('.pio-tabs button').forEach((tb) => tb.onclick = () => {
      el.querySelectorAll('.pio-tabs button').forEach((x) => x.classList.remove('on')); tb.classList.add('on');
      const g = el.querySelector('.tab-grafica'), o = el.querySelector('.tab-ordenes');
      if (tb.dataset.tab === 'grafica') { g.style.display = ''; o.style.display = 'none'; }
      else { g.style.display = 'none'; o.style.display = ''; }
    });
  });
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */
async function arrancar() {
  if (!$(APP)) return;
  const host = $(APP);
  // Splash neutro mientras se resuelve si hay wallet conectada (evita el pestañeo del hero).
  host.innerHTML = `<div style="min-height:64vh;display:flex;align-items:center;justify-content:center;color:var(--ink-3);font-family:var(--mono);font-size:13px"><span class="skel" style="width:16px;height:16px;min-width:16px;border-radius:50%;margin-right:10px"></span>Cargando…</div>`;
  wallet.alCambiar(() => render());
  try { await wallet.reconectarSiProcede(); } catch (_) {}
  render(); iniciarReloj();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();
