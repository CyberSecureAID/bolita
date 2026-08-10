/**
 * LA COLMENA — app del bot de rejilla (página propia, pantalla completa)
 * =====================================================================
 * Se dibuja dentro de <div id="colmena-app"> de colmena.html. Lenguaje simple,
 * botones (i), gráfica viva con las cuadrículas, e inversión total en una cifra.
 */

import * as gb from './gridbot.js?v=107';
import * as wallet from './wallet.js?v=107';
import { MONEDAS, LISTA_TODAS } from './tokens.js?v=107';
import * as perfil from './perfil.js?v=107';
import * as prizepool from './prizepool.js?v=107';
import * as tutorial from './tutorial.js?v=107';
import * as market from './market.js?v=107';
import * as avisos from './avisos.js?v=107';
import * as grafica from './grafica.js?v=107';
import * as extras from './extras.js?v=107';
import * as admin from './admin.js?v=107';

const $ = (id) => document.getElementById(id);
const APP = 'colmena-app';
// Lo que se OPERA (base). Las estables no pueden ser base.
const BASES  = ['BNB', 'BTCB', 'ETH', 'SOL', 'XRP', 'ADA', 'DOT', 'LTC', 'AVAX', 'MATIC', 'ATOM', 'NEAR', 'FIL', 'BCH', 'ETC', 'EOS', 'LINK', 'CAKE', 'UNI', 'AAVE', 'XVS', 'INJ', 'TWT', 'DOGE', 'SHIB', 'FLOKI'];
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
  tipobot: 'Cuatro formas de trabajar. SMART GRID: compra y vende en cada nivel, muchas operaciones pequeñas. ACCUMULATOR: compra en la caída y vende TODO junto al ganar el % que elijas. CASH OUT: vende la cripto que YA tienes cuando suba al precio o % que elijas. DCA: compra un monto fijo cada cierto tiempo, sin mirar el precio.',
  dcamonto: 'Cuánto de tu estable (USDT/USDC) se gasta en CADA compra. Por ejemplo, 10 USDT: el bot comprará 10 USDT de tu moneda en cada ciclo. Ten esa estable cargada y aprobada en tu wallet.',
  dcafrec: 'Cada cuánto compra el bot. Semanal o mensual rinden mejor que diario con montos chicos, porque el gas pesa menos por compra. La primera compra se hace al encender.',
  dcanum: 'Cuántas compras hará en total. Elige un número (ej. 52 = un año comprando cada semana) o "Infinito" para que siga hasta que lo suspendas o se acabe tu estable.',
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
/* Configuraciones auditadas: cada cuadrícula deja beneficio REAL después de
   pagar el gas de la red y la comisión del exchange, incluso con 50 USDT.
   Antes "Activo" (40 cuadrículas en ±12%) perdía dinero en cada vuelta: las
   cuadrículas quedaban al 0,6% y las comisiones se comían la ganancia. */
const PRESETS = {
  tranquilo:   { rango: 0.40, grids: 24, sep: 3.59, ops: 'pocas', desc: 'Rango muy amplio. Opera menos veces, pero cada vuelta deja bastante y aguanta meses sin salirse del rango.' },
  equilibrado: { rango: 0.28, grids: 20, sep: 2.92, ops: 'medias', desc: 'El término medio. Buen número de operaciones y cada una con ganancia holgada. Si no sabes cuál elegir, esta.' },
  activo:      { rango: 0.16, grids: 14, sep: 2.33, ops: 'muchas', desc: 'Rango ceñido al precio de hoy. Opera más seguido, pero si el mercado se va lejos puede salirse del rango.' },
  volatil:     { rango: 0.60, grids: 30, sep: 4.73, ops: 'pocas', desc: 'Para monedas que se mueven mucho. Rango enorme para que no se le escape el precio.' }
};
const NOMBRE_PRESET = { tranquilo: 'Tranquilo', equilibrado: 'Equilibrado', activo: 'Activo', volatil: 'Volátil' };
/* Coste real de una vuelta (comprar + vender) medido en la red. */
const GAS_VUELTA_USD = 0.025;
const COM_DEX = 0.001;          // 0,05% por swap, ida y vuelta
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
    --az:#4d9fff; --mo:#b47cff; --ve:#34d97b;   /* acentos por bot */
    --acento:var(--gold);                          /* color del bot seleccionado (lo fija pintarTipo) */
    --ac-l:#f7db8d; --ac-m:#E8B84B; --ac-d:#c79426; --ac-s:#8f6a1a; --ac-t:#3a2800;  /* set 3D del acento (pintarTipo) */
    font-family:var(--sans);color:var(--ink);position:relative;isolation:isolate;
    background:#0b0e11;min-height:100vh;overflow-x:hidden}
  #colmena-app .c-hdr{max-width:100%;overflow:visible;position:sticky;top:0;z-index:50;display:flex;align-items:center;justify-content:space-between;
    gap:12px;padding:14px 22px;background:rgba(11,14,17,.88);backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
  #colmena-app .c-brand{display:inline-flex;align-items:center;gap:9px;font-family:var(--display);font-weight:700;font-size:20px;color:var(--gold);text-decoration:none;letter-spacing:.3px;min-width:0}
  #colmena-app .c-logo{height:32px;width:auto;flex:0 0 auto;display:block;filter:drop-shadow(0 1px 3px rgba(0,0,0,.55))}
  #colmena-app .c-brand-tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  #colmena-app .c-hdr-r{display:flex;align-items:center;gap:6px;flex:0 1 auto;min-width:0;flex-wrap:nowrap;overflow:visible}
  /* El botón del header se ajusta a su texto. Sin esto, la regla general
     .btn{width:100%} lo estira a todo el ancho y saca el header de la pantalla. */
  #colmena-app .c-hdr .hdr-btn,#colmena-app .c-hdr-r .hdr-btn{width:auto;flex:0 0 auto;white-space:nowrap}
  #colmena-app .c-hdr-r>button,#colmena-app .c-hdr-r>a{flex:0 0 auto;white-space:nowrap}
  /* Si no cabe todo (p. ej. sin wallet conectada), se ocultan los textos antes de montarse */
  /* El recorte solo en pantallas grandes: en el móvil taparía el menú. */
  @media(min-width:900px){#colmena-app .c-hdr{overflow:hidden}}
  @media(min-width:561px) and (max-width:1240px){
    #colmena-app .c-prize-tx,#colmena-app .c-market-tx,#colmena-app .c-lot-tx{display:none}
    #colmena-app .c-swap,#colmena-app .c-prize,#colmena-app .c-market,#colmena-app .c-loteria,#colmena-app .c-perfil{padding:0 9px}
  }
  @media(min-width:561px) and (max-width:1050px){
    #colmena-app .c-swap-tx{display:none}
    #colmena-app .c-ticker{max-width:170px}
  }
  /* ── Cinta Prize Pool (publicidad propia) ── */
  #colmena-app .c-ticker{flex:0 1 290px;min-width:130px;max-width:290px;height:44px;margin:0 0 0 16px;margin-right:auto;padding:0;border:none;background:transparent;overflow:hidden;position:relative;cursor:pointer;display:block;border-radius:5px;
    -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 22%,#000 78%,transparent 100%);-webkit-mask-repeat:no-repeat;-webkit-mask-size:100% 100%;
            mask-image:linear-gradient(90deg,transparent 0,#000 22%,#000 78%,transparent 100%);mask-repeat:no-repeat;mask-size:100% 100%}
  #colmena-app .c-ticker-img{height:100%;width:auto;max-width:none;display:block;will-change:transform;animation:ctSlide 34s ease-in-out infinite alternate}
  #colmena-app .c-ticker:hover .c-ticker-img{animation-play-state:paused}
  @keyframes ctSlide{from{transform:translateX(0)}to{transform:translateX(-58%)}}
  @media(prefers-reduced-motion:reduce){#colmena-app .c-ticker-img{animation:none}}
  #colmena-app .c-menu-btn{display:none;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:40px;height:36px;box-sizing:border-box;border-radius:11px;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);border:1px solid #c79426;box-shadow:0 3px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.5);cursor:pointer;padding:0}
  #colmena-app .c-menu-btn span{display:block;width:17px;height:2px;border-radius:2px;background:#3a2800}
  #colmena-app .c-menu-btn:active{transform:translateY(3px);box-shadow:0 0 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.5)}
  /* Botones del header: todos mismo alto (36px), rectangulares, 3D dorado relleno */
  #colmena-app .c-loteria,#colmena-app .c-perfil,#colmena-app .c-prize,#colmena-app .c-market{display:inline-flex;align-items:center;gap:7px;height:36px;box-sizing:border-box;padding:0 11px;border-radius:8px;font-family:var(--display);font-size:13px;font-weight:600;color:var(--ink-2);text-decoration:none;background:transparent;border:none;box-shadow:none;text-shadow:none;cursor:pointer;transition:color .14s,background .14s}
  #colmena-app .c-swap:active,#colmena-app .c-loteria:active,#colmena-app .c-perfil:active,#colmena-app .c-prize:active,#colmena-app .c-market:active{opacity:.8}
  #colmena-app .c-loteria:active,#colmena-app .c-perfil:active{opacity:.8}
  #colmena-app .c-swap{display:inline-flex;align-items:center;gap:7px;height:36px;box-sizing:border-box;padding:0 11px;border-radius:8px;font-family:var(--display);font-size:13px;font-weight:600;color:var(--ink-2);cursor:pointer;background:transparent;border:none;box-shadow:none;text-shadow:none;transition:color .14s,background .14s}

  #colmena-app .c-swap:active{transform:translateY(3px);box-shadow:0 0 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.5)}
  #colmena-app .c-swap svg{display:block}
  @keyframes spin{to{transform:rotate(360deg)}}
  /* Tablets y pantallas medianas: el header nunca se desborda */
  @media(min-width:561px) and (max-width:900px){
    #colmena-app .c-ticker{display:none}                     /* la cinta cede el sitio */
    #colmena-app .dir{max-width:132px;overflow:hidden;padding:0 9px;font-size:11px}
    #colmena-app .c-swap,#colmena-app .c-prize,#colmena-app .c-market,
    #colmena-app .c-loteria,#colmena-app .c-perfil{padding:0 7px}
    #colmena-app .c-sep{display:none}
  }
  /* En el móvil todo se puede tocar cómodo */
  @media(max-width:560px){
    #colmena-app .c-swap,#colmena-app .c-prize,#colmena-app .c-market,
    #colmena-app .c-loteria,#colmena-app .c-perfil,#colmena-app .dir,
    #colmena-app .hdr-btn,#colmena-app .hdr-off{min-height:44px}
    #colmena-app .bot-tab,#colmena-app .bot-tipo,#colmena-app .seg button,
    #colmena-app .sug,#colmena-app .btn{min-height:44px}
    #colmena-app .stepper-btns button{min-height:20px}
    #colmena-app .btn-avz{min-height:44px;padding:0 14px}
  }
  #colmena-app .vacio-ok{text-align:center;padding:34px 20px;border-radius:16px;background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid var(--line)}
  #colmena-app .vacio-ico{width:58px;height:58px;margin:0 auto 12px;border-radius:16px;display:grid;place-items:center;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.3);color:var(--gold)}
  #colmena-app .vacio-t{font-family:var(--display);font-weight:800;font-size:18px;color:var(--ink)}
  #colmena-app .vacio-d{font-family:var(--sans);font-size:13.5px;color:var(--ink-3);line-height:1.6;margin:7px auto 16px;max-width:330px}
  #colmena-app .vacio-b{padding:13px 26px;border-radius:12px;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold) 45%,#c79426);color:#3a2800;font-family:var(--display);font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:0 4px 0 #8f6a1a;min-height:46px}
  #colmena-app .vacio-b:active{transform:translateY(3px);box-shadow:0 1px 0 #8f6a1a}
  #colmena-app .vacio-p{font-family:var(--mono);font-size:10.5px;color:#6b7681;margin-top:14px;line-height:1.5}
  @media(max-width:560px){#colmena-app .vacio-ok{padding:26px 14px}#colmena-app .vacio-t{font-size:16px}#colmena-app .vacio-d{font-size:12.5px}}
  #colmena-app .dir{cursor:pointer}
  #colmena-app .dir:hover{border-color:var(--gold-soft);color:var(--gold)}
  #colmena-app .dir-logo{width:16px;height:16px;border-radius:4px;object-fit:contain;flex:0 0 auto}
  #colmena-app .dir-ch{width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg);opacity:.65;margin-left:3px;flex:0 0 auto}
  #wsel{position:fixed;inset:0;z-index:9800}
  #wsel .wsel-bg{position:absolute;inset:0}
  #wsel .wsel-p{position:absolute;width:250px;max-width:calc(100vw - 20px);background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft);border-radius:16px;padding:9px;box-shadow:0 22px 60px rgba(0,0,0,.72);animation:wselIn .14s ease both}
  @keyframes wselIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  #wsel .wsel-t{font-family:var(--mono);font-size:9.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.9px;padding:6px 9px 10px}
  #wsel .wsel-b:last-child{margin-bottom:0}
  /* Etiqueta del botón: "Instalar" en ordenador, "Compartir" en el móvil */
  #colmena-app .lbl-mov{display:none!important}
  #colmena-app .lbl-pc{display:inline}
  @media(max-width:560px){
    #colmena-app .lbl-pc{display:none!important}
    #colmena-app .lbl-mov{display:inline!important}
  }
  #wsel .wsel-b{width:100%;display:flex;align-items:center;gap:10px;padding:11px;margin-bottom:6px;border-radius:11px;border:1px solid transparent;background:transparent;color:var(--ink);font-family:var(--display);font-weight:700;font-size:14px;cursor:pointer;text-align:left;min-height:46px}
  #wsel .wsel-b:hover{background:rgba(255,255,255,.06);border-color:var(--line)}
  #wsel .wsel-b.on{background:rgba(232,184,75,.1);border-color:rgba(232,184,75,.4)}
  #wsel .wsel-b img,#wsel .wsel-i{width:26px;height:26px;border-radius:7px;flex:0 0 auto;object-fit:contain;background:rgba(255,255,255,.06)}
  #wsel .wsel-i.wc{display:grid;place-items:center;background:rgba(59,153,252,.16);color:#3b99fc}
  #wsel .wsel-b b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #wsel .wsel-ok{font-family:var(--mono);font-size:8.5px;color:var(--neon-lit);background:rgba(46,232,106,.14);border:1px solid rgba(46,232,106,.4);border-radius:7px;padding:2px 7px;flex:0 0 auto}
  #wsel .wsel-v{font-family:var(--sans);font-size:12px;color:var(--ink-3);line-height:1.55;padding:10px}
  #colmena-app .dir{display:inline-flex;align-items:center;gap:7px;height:36px;box-sizing:border-box;white-space:nowrap;font-family:var(--mono);font-size:12px;font-weight:600;color:var(--ink);background:rgba(255,255,255,.05);border:1px solid var(--line);border-radius:9px;padding:0 12px;box-shadow:none;text-shadow:none}
  #colmena-app .hdr-off{width:36px;height:36px;box-sizing:border-box;border-radius:9px;background:transparent;border:1px solid var(--line);color:var(--ink-3);cursor:pointer;display:inline-grid;place-items:center;padding:0;line-height:0;box-shadow:none;transition:color .14s,border-color .14s}
  #colmena-app .hdr-off:hover{color:var(--rojo);border-color:rgba(246,70,93,.4)}
  #colmena-app .c-swap:hover,#colmena-app .c-loteria:hover,#colmena-app .c-perfil:hover,#colmena-app .c-prize:hover,#colmena-app .c-market:hover{color:var(--gold);background:rgba(255,255,255,.05)}
  #colmena-app .c-sep{width:1px;height:22px;background:var(--line);margin:0 3px;flex:0 0 auto}
  #colmena-app .hdr-off svg{display:block}
  #colmena-app .hdr-off:hover{color:var(--ink);border-color:var(--line-soft)}
  #colmena-app .hdr-off:active{transform:translateY(3px);box-shadow:0 0 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}
  #colmena-app .hdr-btn{margin:0;width:auto;height:36px;box-sizing:border-box;padding:0 16px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center}
  #colmena-app .wrap{max-width:1180px;margin:0 auto;padding:26px 22px 60px}
  #colmena-app .lead{font-size:15px;color:var(--ink-2);margin:0 0 22px;max-width:660px}
  #colmena-app .lead b{color:var(--gold)}
  #colmena-app .cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:stretch}
  #colmena-app .cols>div{display:flex;flex-direction:column}
  #colmena-app .cols>div>.card{flex:1}
  #colmena-app .card{background:linear-gradient(180deg,var(--panel),var(--panel-2));border:1px solid var(--line);border-radius:18px;padding:22px}
  #colmena-app .card h3{font-family:var(--display);color:var(--gold);margin:0 0 4px;font-size:18px}
  #colmena-app .card .sub{color:var(--ink-3);font-size:12.5px;margin:0 0 16px}
  #colmena-app .v-s{display:none}
  @media(max-width:560px){
    #colmena-app .v-l{display:none}
    #colmena-app .v-s{display:inline}
    /* Etiquetas en UNA sola línea: los campos quedan siempre alineados */
    #colmena-app .lab{font-size:9.5px;letter-spacing:.2px;display:flex;align-items:center;gap:4px;flex-wrap:nowrap;white-space:nowrap;min-width:0}
    #colmena-app .lab>span:first-child{overflow:hidden;text-overflow:ellipsis;min-width:0}
    #colmena-app .lab .i-btn{flex:0 0 auto}
    #colmena-app .cols{align-items:start}
    #colmena-app .paso-box>span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
  }
  #colmena-app .lab{display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-family:var(--mono);font-size:11px;color:var(--acento);margin:16px 0 7px;padding-left:3px;text-transform:uppercase;letter-spacing:.6px}
  #colmena-modal .busy-wrap{display:flex;align-items:center;justify-content:space-between;gap:18px}
  #colmena-modal .busy-tx{flex:1;line-height:1.55;font-size:14px}
  #colmena-modal .busy-ring{position:relative;width:58px;height:58px;flex:0 0 auto}
  #colmena-modal .busy-ring svg{width:58px;height:58px;transform:rotate(-90deg)}
  #colmena-modal .busy-ring .br-bg{fill:none;stroke:rgba(255,255,255,.1);stroke-width:3}
  #colmena-modal .busy-ring .br-fg{fill:none;stroke:#e8b84b;stroke-width:3.5;stroke-linecap:round;stroke-dasharray:88 120;transform-origin:22px 22px;animation:brspin 1.8s linear infinite}
  @keyframes brspin{to{transform:rotate(360deg)}}
  #colmena-modal .busy-num{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--display),Georgia,serif;font-size:22px;font-weight:700;color:rgba(255,255,255,.82)}
  /* Acento del bot en TODO el texto secundario de la sección (encabezados, párrafos, hints, saldos, botones no seleccionados) */
  #colmena-app .cols .acum-hero p,
  #colmena-app .cols .acum-flow .af,
  #colmena-app .cols .cash-note,
  #colmena-app .cols .cash-note b,
  #colmena-app .cols .cash-bal,
  #colmena-app .cols .cash-usd,
  #colmena-app .cols .cash-eq,
  #colmena-app .cols .cash-resumen .cr-note,
  #colmena-app .cols .hint,
  #colmena-app .cols .asesor .as-top,
  #colmena-app .cols .asesor .as-nota,
  #colmena-app .cols .seg button:not(.on),
  #colmena-app .cols .btn-linea{color:var(--acento);text-shadow:0 1px 2px rgba(0,0,0,.32)}
  #colmena-app .cols .stepper input::placeholder{color:var(--acento);opacity:.5}
  #colmena-app .i-btn{width:14px;height:14px;border-radius:50%;border:1px solid var(--line);background:transparent;color:var(--ink-3);font-family:var(--display);font-size:9px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;opacity:.6;transition:opacity .15s,color .15s,border-color .15s}
  #colmena-app .i-btn:hover{opacity:1;color:var(--gold);border-color:var(--gold-soft)}
  #colmena-app .i-btn:hover{background:var(--gold);color:#1a1200;border-color:var(--gold)}
  #colmena-app input,#colmena-app select{width:100%;box-sizing:border-box;background:#0d1117;color:var(--ink);border:1px solid var(--line);border-radius:11px;padding:13px 14px;font-family:var(--mono);font-size:15px}
  #colmena-app select{-webkit-appearance:none;appearance:none;padding-right:40px;background-image:url("${CARET}");background-repeat:no-repeat;background-position:right 14px center;background-size:12px}
  #colmena-app input:focus,#colmena-app select:focus{outline:none;border-color:var(--gold)}
  #colmena-app .fila{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  #colmena-app .btn,#colmena-modal .btn{width:100%;box-sizing:border-box;border:none;border-radius:12px;padding:14px;font-family:var(--display);font-weight:700;font-size:15px;cursor:pointer;transition:filter .15s}
  #colmena-app .btn:hover,#colmena-modal .btn:hover{filter:brightness(1.1)}
  #colmena-app .btn-oro:hover,#colmena-modal .btn-oro:hover{filter:none;transform:translateY(-1px);box-shadow:0 6px 0 var(--ac-s),0 12px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.5)}
  #colmena-app .btn-verde:hover,#colmena-modal .btn-verde:hover{filter:none;transform:translateY(-1px);box-shadow:0 6px 0 var(--ac-s),0 12px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.4)} #colmena-app .btn:disabled{opacity:.5;cursor:not-allowed}
  #colmena-app .btn-oro,#colmena-modal .btn-oro{background:linear-gradient(180deg,var(--ac-l),var(--ac-m) 45%,var(--ac-d));color:var(--ac-t);box-shadow:0 4px 0 var(--ac-s),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.5);transition:transform .09s,box-shadow .09s,filter .12s;text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .btn-oro:active,#colmena-modal .btn-oro:active{transform:translateY(4px);box-shadow:0 0 0 var(--ac-s),0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4)}
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
  #colmena-app .acum-hero .acum-ico{font-size:46px;line-height:1;color:var(--acento);filter:drop-shadow(0 0 12px rgba(0,0,0,.5))}
  #colmena-app .acum-hero h4{font-family:var(--display);color:var(--acento);font-size:20px;margin:10px 0 8px;text-shadow:0 1px 2px rgba(0,0,0,.5)}
  #colmena-app .acum-hero p{font-family:var(--sans);color:var(--ink-2);font-size:13px;line-height:1.55;margin:0 auto 14px;max-width:300px}
  #colmena-app .acum-flow{display:flex;flex-direction:column;gap:8px;text-align:left;max-width:320px;margin:0 auto}
  #colmena-app .acum-flow .af{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;color:var(--ink-2);background:rgba(255,255,255,.03);border:1px solid var(--line-soft);border-radius:10px;padding:9px 12px}
  #colmena-app .acum-flow .af span{flex:0 0 auto;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,var(--ac-l),var(--ac-d));color:var(--ac-t);font-weight:800;font-size:12px}
  /* ===== Pestañas de bot (tipo carpeta) + foto ===== */
  #colmena-app .bot-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
  #colmena-app .bot-tab{display:flex;flex-direction:column;align-items:center;gap:5px;padding:11px 5px;background:linear-gradient(180deg,#1b2027,#12161c);border:1.5px solid var(--line);border-radius:12px;cursor:pointer;color:var(--ink-3);box-shadow:0 3px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04);transition:transform .1s,box-shadow .1s,border-color .14s,color .14s,background .14s}
  #colmena-app .bot-tab:hover{border-color:var(--acento);filter:brightness(1.15)}
  #colmena-app .bot-tab .bt-ico{display:grid}
  #colmena-app .bot-tab .bt-nom{font-family:var(--mono);font-size:10.5px;font-weight:700;text-align:center;line-height:1.05}
  #colmena-app .bot-tab[data-tipo="grid"]{color:var(--az)}
  #colmena-app .bot-tab[data-tipo="acum"]{color:var(--mo)}
  #colmena-app .bot-tab[data-tipo="cash"]{color:var(--gold)}
  #colmena-app .bot-tab[data-tipo="dca"]{color:var(--ve)}
  #colmena-app .bot-tab.on{color:var(--ac-t);background:linear-gradient(180deg,var(--ac-l),var(--ac-m) 55%,var(--ac-d));border-color:var(--ac-d);box-shadow:0 4px 0 var(--ac-s),inset 0 1px 0 rgba(255,255,255,.45);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .bot-tab.on:active{transform:translateY(2px);box-shadow:0 2px 0 var(--ac-s),inset 0 1px 0 rgba(255,255,255,.45)}
  #colmena-app .bot-foto{position:relative;width:100%;aspect-ratio:16/9;border-radius:16px;overflow:hidden;margin-bottom:16px;border:2px solid var(--ac-m);box-shadow:0 5px 0 var(--ac-s),0 12px 28px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.1);background:linear-gradient(135deg,#20262f,#0d1117)}
  #colmena-app .bot-foto img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
  #colmena-app .bot-foto img.nocarga{display:none}
  #colmena-app .bot-foto-cap{position:absolute;left:0;right:0;bottom:0;padding:28px 16px 14px;background:linear-gradient(180deg,transparent,rgba(3,5,7,.5) 42%,rgba(3,5,7,.9));display:flex;flex-direction:column;gap:3px}
  #colmena-app .bot-foto-cap b{font-family:var(--display);font-weight:800;font-size:19px;color:var(--gold);text-shadow:0 1px 3px rgba(0,0,0,.7),0 0 12px rgba(232,184,75,.3);letter-spacing:.3px}
  #colmena-app .bot-foto-cap span{font-family:var(--sans);font-size:12.5px;color:var(--gold);text-shadow:0 1px 3px rgba(0,0,0,.85);line-height:1.35}
  /* ===== Selector de moneda + modal ===== */
  #colmena-app .fila-coins{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #colmena-app .coin-sel{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 13px;background:linear-gradient(180deg,#1b2027,#12161c);border:1.5px solid var(--line);border-radius:13px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04);transition:border-color .14s,transform .08s}
  #colmena-app .coin-sel:hover{border-color:var(--gold-soft)}
  #colmena-app .coin-sel:active{transform:translateY(1px)}
  #colmena-app .coin-sel-l{display:flex;align-items:center;gap:10px;min-width:0}
  #colmena-app .coin-sel-ico,#colmena-app .cm-coin-ico{position:relative;overflow:hidden;border-radius:50%;background:#0d1117;border:1px solid var(--line);display:grid;place-items:center;font-weight:700;flex:0 0 auto}
  #colmena-app .coin-sel-ico{width:32px;height:32px;font-size:14px}
  #colmena-app .cm-coin-ico{width:38px;height:38px;font-size:17px}
  #colmena-app .coin-sel-ico img,#colmena-app .cm-coin-ico img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:transparent}
  #colmena-app .coin-sel-ico.conlogo,#colmena-app .cm-coin-ico.conlogo{background:transparent;border:none}
  #colmena-app .coin-sel-ico.conlogo .ico-fb,#colmena-app .cm-coin-ico.conlogo .ico-fb{display:none}
  #colmena-app .coin-sel-tx{display:flex;flex-direction:column;gap:1px;min-width:0;text-align:left}
  #colmena-app .coin-sel-tx b{font-family:var(--display);font-size:15px;color:var(--ink);line-height:1.15}
  #colmena-app .coin-sel-tx i{font-family:var(--mono);font-size:10px;color:var(--ink-3);font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px}
  #colmena-app .coin-chev{color:var(--ink-3);flex:0 0 auto;display:grid}
  #colmena-app .coin-modal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:16px}
  #colmena-app .coin-modal-bg{position:absolute;inset:0;background:rgba(3,5,7,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);animation:cmFade .18s ease}
  #colmena-app .coin-modal-box{position:relative;width:100%;max-width:460px;max-height:84vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#171d25,#0d1117);border:1px solid var(--line);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 0 1px rgba(232,184,75,.06),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden;animation:cmPop .22s cubic-bezier(.2,.9,.3,1.2)}
  #colmena-app .coin-modal-box::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.5}
  @keyframes cmFade{from{opacity:0}to{opacity:1}}
  @keyframes cmPop{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
  #colmena-app .cm-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px}
  #colmena-app .cm-title{font-family:var(--display);font-weight:700;font-size:18px;color:var(--ink)}
  #colmena-app .cm-x{width:34px;height:34px;border-radius:50%;background:#12161c;border:1px solid var(--line);color:var(--ink-3);cursor:pointer;display:grid;place-items:center;padding:0;transition:all .14s}
  #colmena-app .cm-x:hover{border-color:var(--rojo);color:var(--rojo);background:rgba(255,90,90,.06)}
  #colmena-app .cm-search{display:flex;align-items:center;gap:10px;margin:0 20px 14px;padding:13px 15px;background:#0b0e11;border:1px solid var(--line);border-radius:14px;color:var(--ink-3);transition:border-color .14s,box-shadow .14s}
  #colmena-app .cm-search:focus-within{border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(232,184,75,.08)}
  #colmena-app .cm-search input{flex:1;background:transparent;border:none;outline:none;color:var(--ink);font-family:var(--sans);font-size:14.5px}
  #colmena-app .cm-search input::placeholder{color:var(--ink-3)}
  #colmena-app .cm-cats{display:flex;gap:8px;padding:0 20px 14px;flex-wrap:wrap}
  #colmena-app .cm-cats button{font-family:var(--mono);font-size:12px;color:var(--ink-2);background:linear-gradient(180deg,#1b2027,#12161c);border:1px solid var(--line);border-radius:100px;padding:7px 15px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.3);transition:all .12s}
  #colmena-app .cm-cats button:hover{border-color:var(--gold-soft)}
  #colmena-app .cm-cats button:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.3)}
  #colmena-app .cm-cats button.on{color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border-color:#c79426;font-weight:800;box-shadow:0 2px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.4);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .cm-list{overflow-y:auto;padding:2px 12px 16px;display:flex;flex-direction:column;gap:2px}
  #colmena-app .cm-list::-webkit-scrollbar{width:8px}
  #colmena-app .cm-list::-webkit-scrollbar-thumb{background:var(--line);border-radius:8px}
  #colmena-app .cm-coin{display:flex;align-items:center;gap:13px;padding:10px 13px;background:transparent;border:1px solid transparent;border-radius:13px;cursor:pointer;text-align:left;transition:background .12s,border-color .12s}
  #colmena-app .cm-coin:hover{background:#1b222c;border-color:var(--line)}
  #colmena-app .cm-coin.on{background:linear-gradient(90deg,rgba(232,184,75,.12),rgba(232,184,75,.04));border-color:var(--gold-soft)}
  #colmena-app .cm-coin-tx{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
  #colmena-app .cm-coin-tx b{font-family:var(--display);font-size:15.5px;color:var(--ink)}
  #colmena-app .cm-coin-tx i{font-family:var(--mono);font-size:11px;color:var(--ink-3);font-style:normal;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #colmena-app .cm-coin-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex:0 0 auto}
  #colmena-app .cm-coin-price{font-family:var(--display);font-size:14.5px;font-weight:700;color:var(--ink)}
  #colmena-app .cm-coin-chg{font-family:var(--mono);font-size:11px}
  #colmena-app .cm-coin-chg.pos{color:var(--neon-lit)}
  #colmena-app .cm-coin-chg.neg{color:var(--rojo)}
  #colmena-app .cm-price-skel{display:inline-block;width:56px;height:12px;border-radius:6px;background:linear-gradient(90deg,rgba(255,255,255,.04),rgba(255,255,255,.12),rgba(255,255,255,.04));background-size:200% 100%;animation:shimmer 1.3s linear infinite}
  #colmena-app .cm-empty{text-align:center;color:var(--ink-3);font-family:var(--mono);font-size:13px;padding:34px}
  /* ===== Cash Out ===== */
  #colmena-app .cash-note{font-family:var(--sans);font-size:13px;color:var(--ink-2);text-align:center;background:linear-gradient(180deg,#12161c,#0d1117);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:18px 0 6px;box-shadow:0 3px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.04)}
  #colmena-app .cash-note b{color:var(--gold)}
  #colmena-app .cash-cant-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;margin:18px 0 7px;flex-wrap:wrap}
  #colmena-app .cash-bal{display:flex;justify-content:flex-end;align-items:center;gap:10px;font-family:var(--mono);font-size:11.5px;color:var(--ink-3)}
  #colmena-app .cash-bal #fc-saldo{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
  #colmena-app .cash-max{flex:0 0 auto;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);color:#3a2800;border:1px solid #c79426;border-radius:8px;padding:5px 13px;font-family:var(--mono);font-size:11px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #8f6a1a;text-shadow:0 1px 0 rgba(255,255,255,.3);transition:transform .08s,box-shadow .08s}
  #colmena-app .cash-max:active{transform:translateY(2px);box-shadow:0 0 0 #8f6a1a}
  #colmena-app .stepper.has-suffix input{padding-right:132px}
  #colmena-app .cash-eq{position:absolute;right:42px;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:12px;color:var(--ink-3);pointer-events:none;max-width:86px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right}
  #colmena-app .cash-slider{-webkit-appearance:none;appearance:none;width:100%;background:transparent;outline:none;margin:16px 0 8px;cursor:pointer;--fill:0%}
  #colmena-app .cash-slider::-webkit-slider-runnable-track{height:6px;border-radius:100px;background:linear-gradient(90deg,var(--gold) var(--fill),var(--line) var(--fill))}
  #colmena-app .cash-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:20px;height:20px;border-radius:50%;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border:2px solid #8f6a1a;cursor:pointer;box-shadow:0 2px 5px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.5);margin-top:-7px}
  #colmena-app .cash-slider::-moz-range-track{height:6px;border-radius:100px;background:var(--line)}
  #colmena-app .cash-slider::-moz-range-progress{height:6px;border-radius:100px;background:var(--gold)}
  #colmena-app .cash-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border:2px solid #8f6a1a;cursor:pointer}
  #colmena-app .bot-panel-wrap{position:relative;display:block}
  #colmena-app .rec-tag{position:absolute;top:10%;right:9%;display:inline-flex;align-items:center;gap:6px;padding:6px 13px;border-radius:20px;font-family:var(--display);font-weight:800;font-size:10.5px;letter-spacing:.4px;color:#f7db8d;
    background:linear-gradient(180deg,#8f4de0,#6a2fb0 55%,#4a1d80);
    border:1px solid transparent;
    background-origin:border-box;
    background-clip:padding-box,border-box;
    background-image:linear-gradient(180deg,#8f4de0,#6a2fb0 55%,#4a1d80),linear-gradient(150deg,#f7db8d,#c79426 32%,#8f6a1a 55%,#f0d488 78%,#c79426);
    box-shadow:0 3px 0 #3a1566,0 7px 16px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.22);
    text-shadow:0 1px 2px rgba(0,0,0,.6);pointer-events:none;white-space:nowrap;z-index:2;overflow:hidden}
  #colmena-app .rec-tag svg{color:#f7db8d;flex:0 0 auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}
  #colmena-app .rec-tag::after{content:'';position:absolute;top:0;bottom:0;left:-60%;width:45%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.42),transparent);transform:skewX(-20deg);animation:recShine 6s ease-in-out infinite}
  @keyframes recShine{0%,88%{left:-60%}100%{left:130%}}
  @media(prefers-reduced-motion:reduce){#colmena-app .rec-tag::after{animation:none}}
  @media(max-width:560px){#colmena-app .rec-tag{font-size:9px;padding:5px 10px;gap:4px;border-radius:16px;top:9.5%;right:8%}#colmena-app .rec-tag svg{width:9px;height:9px}}
  #colmena-app .bot-panel{display:block;width:100%;height:auto;max-width:100%;margin:0 0 4px;border:none;transition:filter .18s ease}
  #colmena-app .bot-panel:hover{transform:none;filter:drop-shadow(0 10px 24px rgba(0,0,0,.5))}
  #colmena-app .cash-price{position:relative;text-align:center;background:url('assets/img/marco-precio.webp') center/100% 100% no-repeat;border:none;border-radius:0;aspect-ratio:900/338;padding:0;margin-bottom:14px;box-shadow:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:filter .18s ease}
  #colmena-app .cash-price:hover{transform:none;filter:drop-shadow(0 8px 20px rgba(0,0,0,.55))}
  #colmena-app .cash-price .cp-lab{font-family:var(--mono);font-size:11px;color:var(--ink-2);letter-spacing:2.4px;text-transform:uppercase;opacity:.9}
  #colmena-app .cash-price .cp-val{font-family:var(--display);font-weight:800;font-size:clamp(22px,6.2vw,34px);color:var(--acento);margin:2px 0 1px;line-height:1.05;letter-spacing:-.3px;text-shadow:0 2px 4px rgba(0,0,0,.75),0 0 18px color-mix(in srgb,var(--acento) 35%,transparent)}
  #colmena-app .cash-price .cp-src{font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase;letter-spacing:2.6px;opacity:.85}
  #colmena-app .cash-resumen{margin-top:16px;background:linear-gradient(180deg,#12161c,#0b0e11);border:1px solid var(--line);border-radius:16px;padding:16px 18px;box-shadow:0 8px 24px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.03)}
  #colmena-app .cash-resumen .cr-top{font-family:var(--display);color:var(--acento);font-size:14px;font-weight:700;text-align:center;margin-bottom:12px;text-shadow:0 1px 1px rgba(0,0,0,.4);letter-spacing:.3px}
  #colmena-app .cash-resumen .cr-rows{display:flex;flex-direction:column;gap:1px;background:var(--line-soft);border-radius:11px;overflow:hidden}
  #colmena-app .cash-resumen .cr-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 14px;background:rgba(0,0,0,.28);font-family:var(--mono);font-size:12.5px}
  #colmena-app .cash-resumen .cr-row span{color:var(--ink-3);min-width:0}
  #colmena-app .cash-resumen .cr-row b{color:var(--ink);font-family:var(--display);font-size:15px;white-space:nowrap;text-align:right}
  #colmena-app .cash-resumen .cr-gan b{font-size:18px}
  #colmena-app .cash-resumen .cr-gan b.pos{color:var(--neon-lit);text-shadow:0 0 12px rgba(46,232,106,.3)}
  #colmena-app .cash-resumen .cr-gan b.neg{color:var(--rojo)}
  #colmena-app .cash-resumen .cr-note{text-align:center;font-family:var(--sans);font-size:12px;color:var(--ink-2);line-height:1.55;margin-top:12px}
  #colmena-app .cash-resumen .cr-note b{color:var(--gold)}
  #colmena-app .btn-verde,#colmena-modal .btn-verde{background:linear-gradient(180deg,var(--ac-l),var(--ac-m) 45%,var(--ac-d));color:var(--ac-t);box-shadow:0 4px 0 var(--ac-s),0 8px 18px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.4);transition:transform .09s,box-shadow .09s,filter .12s;text-shadow:0 1px 0 rgba(255,255,255,.25)}
  #colmena-app .btn-verde:active,#colmena-modal .btn-verde:active{transform:translateY(4px);box-shadow:0 0 0 var(--ac-s),0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .btn-linea,#colmena-modal .btn-linea{background:transparent;border:1px solid var(--line);color:var(--ink)}
  #colmena-app .btn-rojo,#colmena-modal .btn-rojo{background:transparent;border:1px solid var(--rojo);color:var(--rojo)}
  #colmena-app .mt{margin-top:14px} #colmena-app .mt8{margin-top:8px}
  #colmena-app .link{background:none;border:none;color:var(--gold-soft);font-family:var(--mono);font-size:12px;cursor:pointer;text-decoration:underline;padding:0;margin-top:16px}
  #colmena-app .sug{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.02));border:1px solid var(--acento);color:var(--acento);border-radius:8px;padding:6px 11px;font-family:var(--mono);font-size:11px;cursor:pointer;margin-left:auto;box-shadow:0 2px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .08s,box-shadow .08s}
  #colmena-app .sug:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.3)}
  #colmena-app .seg{display:flex;gap:6px}
  #colmena-app .seg button{flex:1;padding:11px;border:1px solid var(--line);background:transparent;color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer}
  #colmena-app .seg button.on{background:var(--ac-m);color:var(--ac-t);border-color:var(--ac-d);font-weight:700}
  #colmena-app .avz{border-top:1px solid var(--line-soft);margin-top:18px;padding-top:4px}
  #colmena-app .chart{width:100%;height:auto;display:block;border-radius:14px;background:#0d1117;border:1px solid var(--line-soft)}
  #cmov{position:fixed;inset:0;z-index:9900;display:flex;align-items:flex-end;justify-content:center}
  #cmov .cm-bg{position:absolute;inset:0;background:rgba(3,5,8,.86);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #cmov .cm-c{position:relative;width:100%;max-width:420px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid var(--gold-soft);border-radius:22px 22px 0 0;padding:22px 18px calc(22px + env(safe-area-inset-bottom));box-shadow:0 -20px 60px rgba(0,0,0,.75);text-align:center}
  #cmov .cm-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer}
  #cmov .cm-t{font-family:var(--display);font-weight:800;font-size:20px;color:var(--gold)}
  #cmov .cm-s{font-family:var(--sans);font-size:12.5px;color:#8b96a3;margin:5px 0 16px}
  #cmov .cm-eti{font-family:var(--mono);font-size:9.5px;color:#6b7681;text-transform:uppercase;letter-spacing:.9px;text-align:left;margin:14px 0 8px}
  #cmov .cm-b{display:block;width:100%;margin-bottom:8px;padding:15px;border-radius:13px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:#eaecef;font-family:var(--display);font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);min-height:50px}
  #cmov .cm-b.oro{border-color:#c79426;background:linear-gradient(180deg,#f7db8d,var(--gold) 45%,#c79426);color:#3a2800;box-shadow:0 4px 0 #8f6a1a}
  #cmov .cm-b:active{transform:translateY(2px)}
  #cmov .cm-n{font-family:var(--sans);font-size:11px;color:#7d8794;line-height:1.45;margin-top:4px}
  /* Botón único de configuraciones (azul del Smart Grid) */
  /* Etiqueta con botón "Sugerir": ocupa su fila y nunca se sale */
  #colmena-app .lab-sug{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:nowrap;white-space:normal}
  #colmena-app .lab-sug .lab-tx{display:flex;align-items:center;gap:5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #colmena-app .lab-sug .sug{flex:0 0 auto;margin:0}
  @media(max-width:560px){
    #colmena-app .lab-sug{gap:6px}
    #colmena-app .lab-sug .sug{font-size:10px;padding:4px 9px}
  }
  #colmena-app .btn-conf{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;min-height:48px;padding:0 16px;margin:18px 0 14px;border-radius:13px;border:1px solid var(--ac-d,#2b7fe0);background:linear-gradient(180deg,var(--ac-l,#a9d4ff),var(--ac-m,#4d9fff) 45%,var(--ac-d,#2b7fe0));color:var(--ac-t,#04213f);font-family:var(--display);font-weight:800;font-size:14.5px;cursor:pointer;box-shadow:0 4px 0 var(--ac-s,#1a5bb0),0 6px 16px rgba(0,0,0,.3)}
  #colmena-app .btn-conf:active{transform:translateY(3px);box-shadow:0 1px 0 var(--ac-s,#1a5bb0)}
  #colmena-app .btn-conf .bc-sel{font-family:var(--mono);font-size:10.5px;padding:3px 10px;border-radius:20px;background:rgba(4,33,63,.22);border:1px solid rgba(4,33,63,.25)}
  #conf-box{position:fixed;inset:0;z-index:9880;display:flex;align-items:center;justify-content:center;padding:16px}
  #conf-box .cf-bg{position:absolute;inset:0;background:rgba(3,5,8,.88);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  /* Cada bot con su color */
  /* Mismos tonos que la pestaña de cada bot (--mo morado, --ve verde) */
  #conf-box.tema-acum{--cf:#b47cff;--cf-l:#d9b8ff}   /* Accumulator: morado */
  #conf-box.tema-cash{--cf:#E8B84B;--cf-l:#f7db8d}   /* Cash Out: dorado */
  #conf-box.tema-dca{--cf:#34d97b;--cf-l:#8ff0bd}    /* DCA: verde */
  #conf-box.tema-acum .cf-c,#conf-box.tema-cash .cf-c,#conf-box.tema-dca .cf-c{border-color:var(--cf)}
  #conf-box.tema-acum .cf-t,#conf-box.tema-cash .cf-t,#conf-box.tema-dca .cf-t,
  #conf-box.tema-acum .cf-saber summary,#conf-box.tema-cash .cf-saber summary,#conf-box.tema-dca .cf-saber summary{color:var(--cf-l)}
  #conf-box.tema-acum .cf-op:hover,#conf-box.tema-cash .cf-op:hover,#conf-box.tema-dca .cf-op:hover{border-color:var(--cf)}
  #conf-box .cf-c{position:relative;width:100%;max-width:470px;max-height:calc(100vh - 32px);overflow-y:auto;background:linear-gradient(180deg,#141c28,#0b0e12);border:1px solid var(--ac-m,#4d9fff);border-radius:20px;padding:24px 18px 20px;box-shadow:0 30px 90px rgba(0,0,0,.8)}
  #conf-box .cf-x{position:absolute;top:13px;right:13px;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;line-height:1;padding:0;background:rgba(255,255,255,.06);border:1px solid #3a424c;color:#b7bdc6;cursor:pointer;font-size:14px}
  #conf-box .cf-t{font-family:var(--display);font-weight:800;font-size:20px;color:var(--ac-l,#a9d4ff);padding-right:40px}
  #conf-box .cf-s{font-family:var(--sans);font-size:12.5px;color:#8b96a3;margin:5px 0 16px;line-height:1.5}
  #conf-box .cf-s b{color:#eaecef}
  #conf-box .cf-lista{display:flex;flex-direction:column;gap:10px}
  #conf-box .cf-op{width:100%;text-align:left;padding:14px;border-radius:14px;border:1px solid #2b3139;background:linear-gradient(180deg,#1b2430,#0d1117);cursor:pointer;color:var(--ink)}
  #conf-box .cf-op:hover{border-color:var(--ac-m,#4d9fff)}
  #conf-box .cf-op.on{border-color:var(--ac-m,#4d9fff);background:linear-gradient(180deg,rgba(77,159,255,.16),rgba(77,159,255,.05))}
  #conf-box .cf-cab{display:flex;align-items:baseline;justify-content:space-between;gap:8px}
  #conf-box .cf-cab b{font-family:var(--display);font-weight:800;font-size:16px;color:#eaecef}
  #conf-box .cf-ops{font-family:var(--mono);font-size:9.5px;color:var(--ac-l,#a9d4ff);background:rgba(77,159,255,.14);border:1px solid rgba(77,159,255,.3);border-radius:20px;padding:2px 9px}
  #conf-box .cf-d{font-family:var(--sans);font-size:12px;color:#8b96a3;line-height:1.5;margin:6px 0 9px}
  #conf-box .cf-nums{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:9px}
  #conf-box .cf-nums span{font-family:var(--display);font-weight:700;font-size:13px;color:#eaecef}
  #conf-box .cf-nums i{display:block;font-style:normal;font-family:var(--mono);font-size:8.5px;color:#6b7681;text-transform:uppercase;letter-spacing:.6px}
  #conf-box .cf-gana{font-family:var(--sans);font-size:11.5px;color:var(--neon-lit,#2ee86a);background:rgba(46,232,106,.09);border:1px solid rgba(46,232,106,.28);border-radius:9px;padding:8px 10px;line-height:1.45}
  #conf-box .cf-gana.mal{color:var(--gold,#E8B84B);background:rgba(232,184,75,.09);border-color:rgba(232,184,75,.3)}
  #conf-box .cf-sug{width:100%;margin-top:12px;padding:12px;border-radius:11px;border:1px solid #3a424c;background:transparent;color:var(--ac-l,#a9d4ff);font-family:var(--display);font-weight:700;font-size:13px;cursor:pointer;min-height:44px}
  #conf-box .cf-saber{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}
  #conf-box .cf-saber summary{cursor:pointer;font-family:var(--display);font-weight:700;font-size:13.5px;color:var(--ac-l,#a9d4ff);list-style:none;padding:4px 0}
  #conf-box .cf-saber summary::-webkit-details-marker{display:none}
  #conf-box .cf-saber summary:before{content:'▸ '}
  #conf-box .cf-saber[open] summary:before{content:'▾ '}
  #conf-box .cf-txt p{font-family:var(--sans);font-size:12.5px;color:#8b96a3;line-height:1.65;margin:9px 0}
  #conf-box .cf-txt b{color:#eaecef}
  @media(max-width:560px){
    #conf-box .cf-c{padding:20px 14px 16px;border-radius:18px}
    #conf-box .cf-t{font-size:17px}
    #conf-box .cf-cab b{font-size:15px}
    #conf-box .cf-d{font-size:11.5px}
    #conf-box .cf-nums{gap:11px}
  }
  #colmena-app .mb-cab{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  #colmena-app .mb-cab h3{margin:0;flex:1;min-width:0}
  #colmena-app .mb-der{display:flex;align-items:center;gap:7px;flex:0 0 auto}
  /* Botones cómodos de tocar en cualquier pantalla (auditoría con 5 perfiles) */
  #colmena-app .btn-avz,#colmena-app .btn-max,#colmena-app .sug,#colmena-app .cash-max{min-height:34px;padding-top:0;padding-bottom:0;display:inline-flex;align-items:center;justify-content:center}
  @media(max-width:560px){#colmena-app .btn-avz,#colmena-app .btn-max,#colmena-app .sug,#colmena-app .cash-max{min-height:40px}}
  #colmena-app .c-cupo{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:32px;padding:0 13px;border-radius:20px;background:rgba(232,184,75,.1);border:1px solid rgba(232,184,75,.35);cursor:help;white-space:nowrap}
  #colmena-app .c-cupo b{font-family:var(--display);font-weight:800;font-size:13px;color:var(--gold)}
  #colmena-app .c-cupo span{font-family:var(--mono);font-size:10px;color:var(--ink-3)}
  #colmena-app .c-cupo.lleno{background:rgba(246,70,93,.1);border-color:rgba(246,70,93,.4)}
  #colmena-app .c-cupo.lleno b{color:var(--rojo)}
  #colmena-app .btn-cerrar-todos{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 13px;border-radius:20px;border:1px solid #3a424c;background:transparent;color:var(--ink-3);font-family:var(--mono);font-size:10.5px;cursor:pointer;white-space:nowrap}
  #colmena-app .btn-cerrar-todos:hover{color:var(--rojo);border-color:rgba(246,70,93,.45)}
  #colmena-app .btn-cerrar-todos:active{transform:translateY(1px)}
  #colmena-app .btn-cerrar-todos.cargando{color:var(--gold);border-color:rgba(232,184,75,.45);cursor:default}
  #ct-box{position:fixed;inset:0;z-index:9890;display:flex;align-items:center;justify-content:center;padding:18px}
  #ct-box .ct-bg{position:absolute;inset:0;background:rgba(3,5,8,.88);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
  #ct-box .ct-c{position:relative;width:100%;max-width:400px;background:linear-gradient(180deg,#161b22,#0b0e12);border:1px solid rgba(246,70,93,.5);border-radius:20px;padding:24px 20px}
  #ct-box .ct-t{font-family:var(--display);font-weight:800;font-size:20px;color:var(--rojo);text-align:center}
  #ct-box .ct-s{font-family:var(--sans);font-size:13px;color:#8b96a3;line-height:1.6;margin:12px 0 18px}
  #ct-box .ct-s b{color:#eaecef}
  #ct-box .ct-acts{display:flex;gap:9px}
  #ct-box .ct-b{flex:1;padding:13px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:#b7bdc6;font-family:var(--display);font-weight:800;font-size:13.5px;cursor:pointer;min-height:46px}
  #ct-box .ct-b.rojo{border-color:#d14a58;background:linear-gradient(180deg,#f08a95,#e35d6a 45%,#b8323f);color:#fff}
  #ct-box .ct-b:disabled{opacity:.5;cursor:default}
  #ct-box .ct-prog{font-family:var(--mono);font-size:11.5px;color:var(--gold);text-align:center;margin-top:12px;min-height:16px;line-height:1.5}
  @media(max-width:560px){#colmena-app .btn-cerrar-todos{font-size:10px;padding:5px 10px}}
  #colmena-app .pio-acciones{display:flex;gap:8px;align-items:stretch;flex-wrap:wrap;margin-top:14px}
  #colmena-app .pio-acciones .pio-toggle{flex:1;min-width:150px;margin:0}
  /* Misma altura y línea base que "Ver el bot trabajando" */
  #colmena-app .pio-img{display:inline-flex;align-items:center;justify-content:center;gap:7px;margin:0;padding:0 14px;min-height:40px;border-radius:11px;border:1px solid #3a424c;background:linear-gradient(180deg,#1b2027,#0d1117);color:var(--gold);font-family:var(--display);font-weight:700;font-size:12.5px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);white-space:nowrap}
  #colmena-app .pio-img:hover{filter:brightness(1.15);border-color:var(--gold-soft)}
  #colmena-app .pio-img:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4)}
  @media(max-width:560px){#colmena-app .pio-acciones .pio-img{flex:1}}
  #colmena-app .tv-detalle{margin-top:10px}
  #colmena-app .tv-detalle summary{cursor:pointer;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);padding:7px 0;list-style:none}
  #colmena-app .tv-detalle summary::-webkit-details-marker{display:none}
  #colmena-app .tv-detalle summary:before{content:'▸ ';color:var(--gold)}
  #colmena-app .tv-detalle[open] summary:before{content:'▾ '}
  #colmena-app #c-chart{position:relative;background:url('assets/img/marco-rejilla.webp') center/100% 100% no-repeat;padding:11% 11%;box-sizing:border-box}
  #colmena-app #c-chart .chart{background:transparent;border:none;border-radius:0}
  #colmena-app .hint{font-family:var(--sans);font-size:12px;line-height:1.5;color:var(--ink-2);background:rgba(232,184,75,.05);border:1px solid var(--line-soft);border-left:2px solid var(--gold-soft);border-radius:8px;padding:9px 12px;margin:12px 0 4px}
  #colmena-app .prev{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}
  #colmena-app .p{background:linear-gradient(180deg,#12161c,#0d1117);border:1px solid var(--line-soft);border-radius:11px;padding:13px 8px;text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:66px}
  #colmena-app .p b{display:flex;align-items:center;justify-content:center;gap:4px;font-family:var(--mono);font-size:9px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.4px}
  #colmena-app .p span{font-family:var(--display);font-size:18px;font-weight:700;color:var(--ink);display:block;margin-top:6px;letter-spacing:-.3px}
  #colmena-app .p span.pos{color:var(--neon-lit)}
  /* Casillas del Smart Grid con marco tecnológico (una sola imagen, proporción bloqueada) */
  #colmena-app .prev{align-items:start}
  #colmena-app .prev .p{background:url('assets/img/azul.webp') center/100% 100% no-repeat;border:none;border-radius:0;box-shadow:none;aspect-ratio:606/479;min-height:92px;padding:15% 16%;overflow:hidden;justify-content:center}
  #colmena-app .prev .p b{font-size:8px;letter-spacing:.2px}
  /* valores y guiones: chapados en el metal de la pizarra (relieve visible) */
  #colmena-app .prev .p span{font-size:16px;margin-top:3px;text-shadow:0 1px 1px rgba(0,0,0,.9),0 2px 3px rgba(0,0,0,.55),0 -1px 0 rgba(255,255,255,.18)}
  #colmena-app .prev .p span.pos{color:#4dff8a}
  #colmena-app .prev .p span.neg{color:#ff7a7a}
  #colmena-app .prev.vacio .p b,#colmena-app .prev.vacio .p span,#colmena-app .prev.vacio .p .rep-wrap{opacity:0}
  /* reparto: sin título, solo las cápsulas centradas */
  #colmena-app .prev .prep{padding:14% 12%;align-items:center}
  #colmena-app .prev .p .rep-wrap{display:flex;flex-direction:column;align-items:stretch;gap:6px;margin-top:0}
  #colmena-app .prev .p .rep-pill{display:block;width:auto;text-align:center;font-size:10px;padding:3px 11px;border-radius:7px;margin-top:0}
  /* ícono de info visible sobre el metal */
  #colmena-app .prev .p .i-btn{opacity:.85;color:#9aa4b0;border-color:#3b434d;background:rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
  /* En móvil/tableta (2 columnas): casillas más grandes -> texto e info interiores más grandes */
  @media(max-width:860px){
    #colmena-app .prev .p b{font-size:10px}
    #colmena-app .prev .p span{font-size:21px}
    #colmena-app .prev .p .rep-wrap{gap:7px}
    #colmena-app .prev .p .rep-pill{font-size:12px;padding:4px 14px}
  }
  #colmena-app .gasbox{position:relative;aspect-ratio:994/367;background:url('assets/img/marco-gas.webp') center/100% 100% no-repeat;border:none;border-radius:0;padding:0;margin-top:16px;box-sizing:border-box}
  #colmena-app .gas-row{display:contents}
  #colmena-app .gas-stepper{position:absolute;left:3.83%;top:11.85%;width:69.07%;height:26.67%;margin:0;transform:translateY(2px)}
  #colmena-app .gas-stepper input{width:100%;height:100%;box-sizing:border-box;padding-top:0;padding-bottom:0;background:transparent;border:none}
  #colmena-app .gas-stepper input:focus{border:none;outline:none;box-shadow:none}
  #colmena-app #f-gasdep{position:absolute;left:74.44%;top:12.39%;width:21.43%;height:25.99%;padding:0;margin:0;box-sizing:border-box;transform:translateX(-1px);border-radius:8px;font-size:12px}
  #colmena-app .gas-stepper .stepper-btns{top:50%;bottom:auto;transform:translateY(-50%);gap:2px;right:5px}
  #colmena-app .gas-stepper .stepper-btns button{flex:0 0 auto;width:22px;height:13px;font-size:6.5px}
  #colmena-app .gasbox .top{display:flex;align-items:center;justify-content:space-between}
  #colmena-app .gasbox .v{font-family:var(--display);color:var(--gold);font-size:20px}
  #colmena-app .gas-row input{flex:1}
  #colmena-app .gas-row .btn{width:auto;white-space:nowrap;padding:13px 16px}
  #colmena-app .gas-stepper input{padding-right:118px}
  #colmena-app .gas-stepper input:focus{padding-right:38px}
  #colmena-app .gas-hint{position:absolute;right:36px;top:50%;transform:translateY(-50%);font-family:var(--mono);font-size:10.5px;color:#8fb0c8;pointer-events:none;display:inline-flex;align-items:center;gap:5px;white-space:nowrap;transition:opacity .15s}
  #colmena-app .gas-hint .gas-ibtn{pointer-events:auto;width:14px;height:14px;border:1px solid #6f93aa;border-radius:50%;color:#8fb0c8;background:transparent;opacity:1;font-size:8.5px;font-style:italic;font-family:Georgia,serif;display:inline-grid;place-items:center;cursor:pointer;flex:0 0 auto}
  #colmena-app .gas-hint .gas-ibtn:hover{background:rgba(143,176,200,.15);color:#8fb0c8;border-color:#8fb0c8}
  #colmena-app .gas-stepper input:focus~.gas-hint,#colmena-app .gas-stepper input:not(:placeholder-shown)~.gas-hint{opacity:0;pointer-events:none}
  #colmena-app .btn-gasret{margin-top:10px;padding:11px;font-size:13px}
  #colmena-app .aviso{font-family:var(--mono);font-size:12px;padding:11px;border-radius:9px;margin-top:12px}
  #colmena-app .aviso.info{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid var(--gold-soft)}
  #colmena-app .aviso.err{background:rgba(255,107,107,.08);color:var(--rojo);border:1px solid var(--rojo)}
  #colmena-app .aviso.warn{background:rgba(232,184,75,.08);color:var(--gold);border:1px solid var(--gold-soft)}
  #colmena-app .hero{text-align:center;padding:70px 20px}
  #colmena-app .hero h1{font-family:var(--display);color:var(--gold);font-size:34px;margin:0 0 12px}
  #colmena-app .colmenas{margin-top:24px;position:relative;overflow:hidden;background:#0d1117;
    border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.45)}
  #colmena-app .colmenas::before,#colmena-app .colmenas::after{display:none}
  #colmena-app .colmenas>*{position:relative;z-index:2}
  #colmena-app .colmenas h3{position:relative;z-index:2;text-shadow:0 2px 12px rgba(0,0,0,.6)}
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
  #colmena-app .gw-i{width:14px;height:14px;flex:0 0 auto;margin-right:7px;vertical-align:-2px}
  #colmena-app .leg span{display:inline-flex;align-items:center;gap:5px}
  #colmena-app .lg-i{width:11px;height:11px;flex:0 0 auto;overflow:visible}
  #colmena-app .graf-aviso{margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(232,184,75,.07);border:1px dashed rgba(232,184,75,.32);font-family:var(--sans);font-size:11.5px;color:var(--ink-2);line-height:1.55}
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
  #colmena-app .stepper-btns button{flex:1;width:24px;border:1px solid var(--line);background:#1b2027;color:var(--ac-m);border-radius:6px;font-size:7px;line-height:1;cursor:pointer;display:grid;place-items:center;padding:0;transition:background .12s,color .12s,transform .1s}
  #colmena-app .stepper-btns button:hover{background:var(--ac-m);color:var(--ac-t);border-color:var(--ac-d)}
  #colmena-app .stepper-btns button:active{transform:scale(.92)}
  #colmena-app .saldo-chip{font-family:var(--mono);font-size:10px;color:var(--acento);cursor:pointer;white-space:nowrap;text-transform:none;letter-spacing:0}
  #colmena-app .saldo-chip:hover{filter:brightness(1.15)} #colmena-app .saldo-chip b{color:var(--acento)}
  #colmena-app .btn-avz{background:rgba(255,255,255,.03);border:1px solid var(--line-soft);color:var(--ink-3);font-family:var(--mono);font-size:11px;padding:6px 12px;border-radius:8px;cursor:pointer;margin-top:14px;transition:color .12s,border-color .12s}
  #colmena-app .btn-avz:hover{color:var(--gold);border-color:var(--gold-soft)}
  #colmena-app .paso-box{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding:12px 14px;background:#12161c;border:1px solid var(--line-soft);border-radius:11px}
  #colmena-app .paso-box span{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.5px}
  #colmena-app .paso-box b{font-family:var(--display);font-size:17px;color:var(--ink)}
  #colmena-app .seg.presets{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}
  #colmena-app .bot-tipos{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px}
  @media(max-width:640px){#colmena-app .bot-tipos{grid-template-columns:1fr}}
  #colmena-app .bot-tipo{display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:left;padding:14px;border:1.5px solid var(--line);background:linear-gradient(180deg,#1b2027,#12161c);border-radius:14px;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05);transition:transform .1s,box-shadow .1s,border-color .14s,background .14s}
  #colmena-app .bot-tipo:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.05)}
  #colmena-app .bot-tipo:hover{border-color:var(--acento)}
  #colmena-app .bot-tipo.on{border-color:var(--gold);background:linear-gradient(180deg,rgba(232,184,75,.13),rgba(232,184,75,.04));box-shadow:0 3px 0 #8f6a1a,0 0 0 1px var(--gold) inset,inset 0 1px 0 rgba(255,255,255,.14)}
  #colmena-app .bot-tipo .bot-ico{font-size:26px;line-height:1}
  #colmena-app .bot-tipo .bot-nom{font-family:var(--display);font-size:15px;font-weight:700;color:var(--ink)}
  #colmena-app .bot-tipo.on .bot-nom{color:var(--gold)}
  #colmena-app .bot-tipo .bot-des{font-family:var(--sans);font-size:11px;line-height:1.4;color:var(--ink-3)}
  #colmena-app .rep-wrap{display:flex;flex-direction:column;gap:4px;align-items:center;margin-top:4px}
  #colmena-app .rep-pill{font-family:var(--mono);font-size:10.5px;font-weight:700;padding:4px 10px;border-radius:7px;white-space:nowrap}
  #colmena-app .rep-v{background:linear-gradient(180deg,rgba(246,70,93,.30),rgba(246,70,93,.12));color:#ffb0b0;border:1px solid rgba(246,70,93,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.55);text-shadow:0 1px 1px rgba(0,0,0,.75)}
  #colmena-app .rep-c{background:linear-gradient(180deg,rgba(46,232,106,.30),rgba(46,232,106,.1));color:#96ffbe;border:1px solid rgba(46,232,106,.5);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 1px 2px rgba(0,0,0,.55);text-shadow:0 1px 1px rgba(0,0,0,.75)}
  #colmena-app .seg.presets button{padding:10px 6px;border:1px solid var(--line);background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));color:var(--ink-2);border-radius:9px;font-family:var(--mono);font-size:12px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06);transition:transform .08s,box-shadow .08s,background .12s,color .12s}
  #colmena-app .seg.presets button:active{transform:translateY(2px);box-shadow:0 0 0 rgba(0,0,0,.35)}
  #colmena-app .seg.presets button:hover{border-color:var(--acento);color:var(--ink)}
  #colmena-app .seg.presets button.on{background:linear-gradient(180deg,var(--ac-l),var(--ac-m) 50%,var(--ac-d));color:var(--ac-t);border-color:var(--ac-d);font-weight:800;box-shadow:0 2px 0 var(--ac-s),inset 0 1px 0 rgba(255,255,255,.4);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  /* Mismo marco que la tarjeta de "precio ahora", para que todo combine */
  #colmena-app .asesor{position:relative;margin-top:12px;background:url('assets/img/marco-precio.webp') center/100% 100% no-repeat;border:none;border-radius:0;padding:7% 9%;box-shadow:none;transition:filter .18s ease}
  #colmena-app .asesor:hover{filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}
  #colmena-app .as-marco{position:relative;margin-top:12px;background:url('assets/img/marco-precio.webp') center/100% 100% no-repeat;border:none!important;border-radius:0!important;padding:7% 9%!important;box-shadow:none!important;transition:filter .18s ease}
  #colmena-app .as-marco:hover{filter:drop-shadow(0 10px 24px rgba(0,0,0,.45))}
  #colmena-app .asesor .as-top{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10.5px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  #colmena-app .asesor .as-top b{color:var(--acento)}
  #colmena-app .asesor .as-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #colmena-app .asesor .as-grid>div{display:flex;flex-direction:column;gap:4px;background:rgba(0,0,0,.28);border:1px solid var(--line-soft);border-radius:10px;padding:10px 12px}
  #colmena-app .asesor .as-grid span{font-family:var(--mono);font-size:10px;color:var(--ink-3)}
  #colmena-app .asesor .as-grid b{font-family:var(--display);font-size:19px;font-weight:700;color:var(--gold)}
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
  #colmena-app .pio-tag.share{cursor:pointer;color:#3a2800;font-weight:800;border:1px solid #c79426;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);box-shadow:0 2px 0 #8f6a1a,0 5px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.55);transition:transform .08s,box-shadow .08s;text-shadow:0 1px 0 rgba(255,255,255,.3)}
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
  #colmena-app .live{display:inline-flex;align-items:center;gap:6px;height:36px;box-sizing:border-box;white-space:nowrap;padding:0 13px;font-family:var(--mono);font-size:12px;font-weight:800;color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 50%,#c79426);border:1px solid #c79426;border-radius:11px;box-shadow:0 3px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.5);text-shadow:0 1px 0 rgba(255,255,255,.3)}
  #colmena-app .live i{width:7px;height:7px;border-radius:50%;background:var(--neon-lit);box-shadow:0 0 8px var(--neon-lit);animation:cpulse 1.2s ease-in-out infinite}
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
  #colmena-app .pio-tag{font-family:var(--mono);font-size:11px;height:28px;padding:0 12px;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;gap:5px;border-radius:8px;background:linear-gradient(180deg,rgba(46,232,106,.2),rgba(46,232,106,.08));color:var(--neon-lit);border:1px solid var(--neon-dim);font-weight:700;box-shadow:0 2px 0 rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.14);text-shadow:0 1px 1px rgba(0,0,0,.4)}
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
  /* Los tres botones iguales: mismo ancho, misma altura, mismo relieve */
  #colmena-app .pio-tags{display:flex;gap:6px;align-items:stretch}
  #colmena-app .pio-tag{min-width:92px;height:30px;flex:0 0 auto}
  #colmena-app .pio-tag.grey{box-shadow:0 2px 0 rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.1)}
  @media(max-width:560px){#colmena-app .pio-tags{gap:5px}#colmena-app .pio-tag{min-width:0;flex:1;height:28px}}
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
  #colmena-modal{position:fixed;inset:0;z-index:2000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(4,7,10,.66);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px);--ac-l:#f7db8d;--ac-m:#E8B84B;--ac-d:#c79426;--ac-s:#8f6a1a;--ac-t:#3a2800;--acento:var(--gold)}
  #colmena-modal.show{display:flex;animation:fade .16s ease both}
  #colmena-modal .m-card{max-width:430px;width:100%;background:linear-gradient(180deg,#1b2027,#12161c);border:1px solid var(--gold-soft);border-radius:18px;padding:26px;box-shadow:0 30px 90px rgba(0,0,0,.7);animation:rise .2s ease both;will-change:transform,opacity}
  #colmena-modal h4{font-family:var(--display);color:var(--gold);font-size:19px;margin:0 0 12px}
  #colmena-modal h4:empty{display:none;margin:0}
  #colmena-modal p{font-size:14px;color:var(--ink-2);line-height:1.55;margin:0 0 20px}
  #colmena-modal .m-btns{display:flex;gap:10px}
  #colmena-modal .m-btns .btn{margin:0;flex:1}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  /* ====== gas: botón Max ====== */
  #colmena-app .gas-sep{position:absolute;left:3.83%;top:45.79%;width:92.34%;height:34.34%;margin:0;padding:0;border:none}
  #colmena-app .gas-sep .btn{width:100%;height:100%;box-sizing:border-box;padding-top:0;padding-bottom:0;background:transparent;border:none;box-shadow:none}
  #colmena-app .gas-sep .btn:hover{background:transparent;border:none;box-shadow:0 8px 24px rgba(0,0,0,.45);transform:translateY(-1px)}
  #colmena-app .gas-rtx{display:inline-block;transform:translateY(2px)}
  #colmena-app .btn-max{width:100%;margin-top:0;padding:12px}
  /* Sin esto, un elemento ancho estira la columna y saca la tarjeta de la pantalla */
  #colmena-app .cols>*,#colmena-app .fila>*,#colmena-app .fila-coins>*,#colmena-app .card{min-width:0}
  #colmena-app .card{overflow:hidden}
  @media(max-width:400px){
    /* El iconito de ayuda nunca se sale del borde */
    #colmena-app .i-btn{margin-right:2px}
    #colmena-app .lab{padding-right:2px}
    #colmena-app .paso-box{gap:6px;padding:11px 12px}
    /* Ninguna etiqueta se sale por la derecha, ni con el icono de ayuda */
    #colmena-app .lab{max-width:100%;overflow:hidden}
    #colmena-app .lab .i-btn{margin-right:0}
    #colmena-app .lab-sug .lab-tx{max-width:calc(100% - 78px)}
    #colmena-app .paso-box>span{min-width:0;flex:1}
    #colmena-app .paso-box .i-btn{flex:0 0 auto}
    #colmena-app .wrap{padding:18px 12px 50px}
    #colmena-app .card{padding:15px}
    #colmena-app .bot-tabs{grid-template-columns:1fr 1fr}
    #colmena-app .fila,#colmena-app .fila-coins{grid-template-columns:1fr}
  }
  @media(max-width:860px){#colmena-app .cols{grid-template-columns:1fr}#colmena-app .rej-grid{grid-template-columns:1fr}#colmena-app .prev{grid-template-columns:repeat(2,1fr)}#colmena-app .pio-grid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:560px){
    #colmena-app .c-hdr{padding:10px 14px;flex-wrap:wrap}
    #colmena-app .c-ticker{order:3;flex:0 0 100%;width:100%;max-width:none;height:34px;margin:9px 0 1px;border-radius:5px;
      -webkit-mask-image:linear-gradient(90deg,transparent 0,#000 15%,#000 85%,transparent 100%);-webkit-mask-repeat:no-repeat;-webkit-mask-size:100% 100%;
              mask-image:linear-gradient(90deg,transparent 0,#000 15%,#000 85%,transparent 100%);mask-repeat:no-repeat;mask-size:100% 100%}
    #colmena-app .c-menu-btn{display:inline-flex}
    #colmena-app .c-sep{display:none}
    #colmena-app .inv-lbl{display:none}
    #colmena-app .gas-stepper .stepper-btns{display:none}
    #colmena-app .gas-stepper input{padding-right:82px}
    #colmena-app .gas-stepper input:focus{padding-right:14px}
    #colmena-app .gas-hint{font-size:9px;right:12px;gap:3px}
    #colmena-app .gas-i{width:12px;height:12px;font-size:7.5px}
    #colmena-app .c-hdr-r{position:absolute;top:calc(100% + 8px);right:12px;flex-direction:column;align-items:stretch;gap:5px;min-width:212px;background:linear-gradient(180deg,#161b22,#0d1117);border:1px solid var(--line);border-radius:14px;padding:8px;box-shadow:0 18px 44px rgba(0,0,0,.6);display:none;z-index:60}
    #colmena-app .c-hdr.open .c-hdr-r{display:flex;animation:cmFade .14s ease}
    #colmena-app .c-hdr-r>.live,#colmena-app .c-hdr-r>.c-swap,#colmena-app .c-hdr-r>.c-loteria,#colmena-app .c-hdr-r>.c-perfil,#colmena-app .c-hdr-r>.c-prize,#colmena-app .c-hdr-r>.c-market,#colmena-app .c-hdr-r>.dir{width:100%;height:42px;justify-content:flex-start;gap:11px;border-radius:10px;padding:0 13px;font-size:13px;background:transparent;border:1px solid transparent;box-shadow:none;color:var(--gold);text-shadow:none;font-weight:700}
    #colmena-app .c-hdr-r>.live:active,#colmena-app .c-hdr-r>.c-swap:active,#colmena-app .c-hdr-r>.c-loteria:active,#colmena-app .c-hdr-r>.c-perfil:active{transform:none}
    #colmena-app .c-hdr-r>.dir{color:var(--ink-2);font-size:12px}
    #colmena-app .c-hdr-r>.hdr-off{display:flex;align-items:center;justify-content:flex-start;gap:11px;width:100%;height:42px;border-radius:10px;padding:0 13px;background:transparent;border:1px solid transparent;box-shadow:none;color:var(--rojo)}
    #colmena-app .c-hdr-r>.hdr-off::after{content:'Desconectar';font-family:var(--mono);font-size:13px;font-weight:700}
    #colmena-app .c-hdr-r>.hdr-off:active{transform:none}
    #colmena-app .c-lot-tx,#colmena-app .c-swap-tx,#colmena-app .c-prize-tx,#colmena-app .c-market-tx,#colmena-app .live-tx{display:inline}
    #colmena-app .c-logo{height:30px}
    #colmena-app .bot-tabs{grid-template-columns:repeat(2,1fr)}
    #colmena-app .bot-tabs>*,#colmena-app .fila>*,#colmena-app .fila-coins>*,#colmena-app .seg>*,#colmena-app .seg.presets>*,#colmena-app .stats>*,#colmena-app .rej-btns>*,#colmena-app .as-grid>*{min-width:0}
    #colmena-app .bot-tab .bt-nom{overflow-wrap:anywhere}
    #colmena-app .hdr-btn{padding:0 12px;font-size:13px}
    #colmena-app .wrap{padding:18px 14px 50px}
    #colmena-app .hero{padding:44px 16px}
    #colmena-app .hero h1{font-size:26px}
    #colmena-app .seg.presets{grid-template-columns:repeat(2,1fr)}
    #colmena-app .seg.presets button{font-size:12px;padding:10px 4px}
    #colmena-app .cols{gap:14px}
    #colmena-app .card{padding:16px}
    #colmena-app .pio-band .r{width:56%;padding:12px 16px}
    #colmena-app .pio-band .cur{display:none}
    #colmena-app .pio-band .k{white-space:nowrap}
    #colmena-app .pio-band .l{padding:12px 14px}
    #colmena-app .pio-band .r .v{font-size:26px}
    #colmena-app .pio-band .l .v{font-size:21px}
    #colmena-app .pio-band .pct{font-size:13px}
    #colmena-app .prev{grid-template-columns:repeat(2,1fr)}
    #colmena-app .pio-grid{grid-template-columns:repeat(2,1fr)}
    #colmena-app .fila{flex-wrap:wrap}
    #colmena-app select,#colmena-app input{min-width:0}
    #colmena-app .asesor .as-grid{grid-template-columns:1fr 1fr}
    /* Responsividad de la tarjeta del bot en móvil (solo ajuste, sin tocar diseño) */
    #colmena-app .pio-head{flex-wrap:nowrap}
    #colmena-app .pio-tags{flex-basis:auto;margin-top:0;flex-direction:row-reverse;align-self:flex-start;gap:5px}
    #colmena-app .pio-tag{height:24px;font-size:10px;padding:0 8px;gap:3px}
    #colmena-app .pio-tag.share .lbl{display:none}
    #colmena-app .pio-tag.share{padding:0 9px;font-size:13px}
    #colmena-app .pio-time{white-space:nowrap}
    #colmena-app .pio-tags .grey{display:none}
    #colmena-app .pio-op{display:none}
    #colmena-app .pio-band .tot{display:none}
    #colmena-app .pio-box[data-box="vueltas"],#colmena-app .pio-box[data-box="gas"]{display:none}
    #colmena-app .pio-toggle{display:none}
    #colmena-app .pio-logo,#colmena-app .pio-mono{width:42px;height:42px}
    #colmena-app .pio-pair{font-size:18px}
    #colmena-app .pio-nombre{font-size:17px}
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
/** Pausa el flujo antes de una firma y espera un toque del usuario.
 *  Clave en móvil: tras cada firma la wallet te devuelve a su pantalla; este
 *  "Continuar" hace que la siguiente firma la inicie un toque fresco (con la
 *  dApp enfocada), evitando que la wallet te bote entre transacción y transacción. */
function pasoWallet(titulo, texto) {
  return new Promise((resolve) => {
    const m = $('colmena-modal'); if (!m) return resolve();
    limpiarBusy();
    $('cm-title').textContent = titulo || '';
    $('cm-body').innerHTML = texto || '';
    m.querySelector('.m-btns').style.display = 'flex';
    const ok = $('cm-ok'), cancel = $('cm-cancel');
    if (cancel) cancel.style.display = 'none';
    ok.textContent = 'Continuar'; ok.className = 'btn btn-oro';
    m.onclick = null;
    m.classList.add('show');
    ok.onclick = () => { ok.onclick = null; resolve(); };
  });
}
function limpiarBusy() { if (window._busyTimer) { clearInterval(window._busyTimer); window._busyTimer = null; } }
function modalBusy(txt) {
  const m = $('colmena-modal'); if (!m) return;
  $('cm-body').innerHTML = `<div class="busy-wrap"><div class="busy-tx" id="busy-tx">${txt}</div><div class="busy-ring"><svg viewBox="0 0 44 44"><circle class="br-bg" cx="22" cy="22" r="19"/><circle class="br-fg" cx="22" cy="22" r="19"/></svg><span class="busy-num" id="busy-num">1</span></div></div>`;
  m.querySelector('.m-btns').style.display = 'none'; m.onclick = null; m.classList.add('show');
  limpiarBusy();
  let n = 1;
  window._busyTimer = setInterval(() => {
    const el = $('busy-num'); if (!el) { limpiarBusy(); return; }
    if (n < 99) n++; el.textContent = n;
  }, 2500);
}
function modalBusyTexto(txt) { const el = $('busy-tx'); if (el) el.innerHTML = txt; }
window._onTxProcesando = function () { const el = document.getElementById('busy-tx'); if (el) el.innerHTML = 'Procesando en la red… <span style="opacity:.6">ya casi</span>'; };
function modalError(txt) {
  const m = $('colmena-modal'); if (!m) return;
  limpiarBusy(); $('cm-title').textContent = 'No se pudo completar'; $('cm-body').textContent = txt;
  const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
  $('cm-cancel').style.display = 'none'; const ok = $('cm-ok');
  ok.textContent = 'Entendido'; ok.className = 'btn btn-linea'; ok.onclick = () => m.classList.remove('show');
}
function modalClose() { limpiarBusy(); const m = $('colmena-modal'); if (m) m.classList.remove('show'); }
function modalDone(titulo, txt) {
  const m = $('colmena-modal'); if (!m) return;
  limpiarBusy(); $('cm-title').textContent = titulo; $('cm-body').innerHTML = txt;
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
  else right = `<span class="c-sep"></span><button class="c-perfil" id="c-perfil" type="button" aria-label="Mi perfil"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.6-3.4 3.2-5 6.5-5s5.9 1.6 6.5 5"/></svg><span class="c-perfil-tx">Perfil</span></button><button class="dir" id="c-dir" type="button" title="Cambiar de wallet">${iconoWallet()}${wallet.abreviar(cuenta)}<span class="dir-ch"></span></button><button class="hdr-off" id="c-off" title="Desconectar" aria-label="Desconectar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`;
  return `<header class="c-hdr">
    <a class="c-brand" href="index.html"><img class="c-logo" src="assets/img/aurex-logo.png" alt="" width="30" height="30"><span class="c-brand-tx">Aurex</span></a>
    <button class="c-ticker" id="c-ticker" type="button" aria-label="Prize Pool"><img class="c-ticker-img" src="assets/img/cinta-prize.webp" alt="Prize Pool" loading="lazy"></button>
    <div class="c-hdr-r">

      <button class="c-swap" id="c-swap" type="button" aria-label="Intercambiar"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10 3 6l4-4"/><path d="M3 6h14"/><path d="m17 14 4 4-4 4"/><path d="M21 18H7"/></svg><span class="c-swap-tx">Swap</span></button>
      <button class="c-prize" id="c-prize" type="button" aria-label="Prize Pool"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg><span class="c-prize-tx">Prize Pool</span></button>
      <button class="c-market" id="c-market" type="button" aria-label="Marketplace"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9h18l-1.5 10.5a2 2 0 0 1-2 1.5H6.5a2 2 0 0 1-2-1.5L3 9z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></svg><span class="c-market-tx">Market</span></button>
      <button class="c-loteria" id="c-instalar" type="button" aria-label="Instalar la app"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M8 11l4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg><span class="c-lot-tx"><span class="lbl-pc">Instalar</span><span class="lbl-mov">Compartir</span></span></button>
      ${right}
    </div>
    <button class="c-menu-btn" id="c-menu-btn" type="button" aria-label="Menú"><span></span><span></span><span></span></button>
  </header>`;
}
const escT = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* Logo de la wallet conectada (lo envía la propia wallet, sin servidores externos) */
function iconoWallet() {
  try {
    const info = wallet.walletInfo ? wallet.walletInfo() : null;
    if (info?.icon) return `<img class="dir-logo" src="${info.icon}" alt="">`;
  } catch (_) {}
  return `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="2" y="6" width="20" height="13" rx="3"/><path d="M16 12h.01"/></svg>`;
}

/* Desplegable para cambiar de wallet */
function abrirSelectorWallet(ancla) {
  const prev = $('wsel'); if (prev) { prev.remove(); return; }
  let lista = [];
  try { lista = wallet.walletsDisponibles ? wallet.walletsDisponibles() : []; } catch (_) {}

  const d = document.createElement('div');
  d.id = 'wsel';
  d.innerHTML = `<div class="wsel-bg"></div>
    <div class="wsel-p">
      <div class="wsel-t">Tus wallets</div>
      ${lista.map((w) => `
        <button class="wsel-b ${w.activa ? 'on' : ''}" data-w="${escT(w.id)}">
          ${w.icono ? `<img src="${escT(w.icono)}" alt="">` : '<span class="wsel-i"></span>'}
          <b>${escT(w.nombre)}</b>
          ${w.activa ? '<span class="wsel-ok">Conectada</span>' : ''}
        </button>`).join('')}
      <button class="wsel-b" data-wc="1">
        <span class="wsel-i wc"><svg viewBox="0 0 32 32" width="18" height="18" fill="currentColor"><path d="M8.4 11.7c4.2-4.1 11-4.1 15.2 0l.5.5c.2.2.2.5 0 .7l-1.7 1.7c-.1.1-.3.1-.4 0l-.7-.7c-2.9-2.9-7.7-2.9-10.6 0l-.8.7c-.1.1-.3.1-.4 0L7.8 12.9c-.2-.2-.2-.5 0-.7l.6-.5zm18.8 3.5 1.5 1.5c.2.2.2.5 0 .7l-6.8 6.7c-.2.2-.5.2-.7 0L16.4 19c0-.1-.1-.1-.2 0l-4.8 4.8c-.2.2-.5.2-.7 0l-6.8-6.7c-.2-.2-.2-.5 0-.7l1.5-1.5c.2-.2.5-.2.7 0l4.8 4.8c.1.1.2.1.2 0l4.8-4.8c.2-.2.5-.2.7 0l4.8 4.8c.1.1.2.1.2 0l4.8-4.8c.2-.2.5-.2.7 0z"/></svg></span>
        <b>Otra wallet (QR)</b>
      </button>
      ${lista.length === 0 ? '<div class="wsel-v">No hay wallets en este navegador. Usa la opción de arriba para conectar desde tu teléfono.</div>' : ''}
    </div>`;
  document.body.appendChild(d);
  // colocar justo debajo de la cápsula
  const r = ancla.getBoundingClientRect();
  const p = d.querySelector('.wsel-p');
  p.style.top = (r.bottom + 8) + 'px';
  p.style.right = Math.max(10, window.innerWidth - r.right) + 'px';

  const cerrar = () => d.remove();
  d.querySelector('.wsel-bg').onclick = cerrar;
  const bwc = d.querySelector('[data-wc]');
  if (bwc) bwc.onclick = () => { cerrar(); hacerConexion(() => wallet.conectarWalletConnect()); };
  d.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => {
    const id = b.getAttribute('data-w'); cerrar();
    Promise.resolve().then(() => wallet.conectarCon(id)).catch((e) => {
      const el = $('c-hero-msg') || $('c-msg');
      console.warn('[Aurex] detalle técnico:', e);
      if (el) aviso(el, 'err', enCristiano(e), 7000);
    });
  });
}

/** Convierte los errores técnicos en algo que se entiende. */
function enCristiano(e) {
  const crudo = String(e?.shortMessage || e?.reason || e?.message || e || '');
  // Los fallos de WalletConnect los mostramos tal cual: hacen falta para
  // saber qué pasa, y el usuario puede contárnoslo.
  if (/^WC_/.test(crudo)) return crudo;
  const t = crudo.toLowerCase();
  if (t.includes('user rejected') || t.includes('denied') || t.includes('rechaz')) return 'Cancelaste la operación en tu wallet.';
  if (t.includes('insufficient funds')) return 'No te alcanza el BNB para pagar la comisión de red.';
  if (t.includes('transfer amount exceeds balance') || t.includes('exceeds balance')) return 'No tienes suficiente saldo de esa moneda.';
  if (t.includes('allowance') || t.includes('approve')) return 'Falta dar permiso a la moneda. Inténtalo otra vez.';
  if (t.includes('no_wallet')) return 'No encontramos ninguna wallet. Instala MetaMask o abre esta página desde tu wallet.';
  if (t.includes('sin_cuentas')) return 'Tu wallet no dio acceso a ninguna cuenta.';
  if (t.includes('nonce') || t.includes('replacement')) return 'Tienes otra operación en marcha. Espera a que termine.';
  if (t.includes('network') || t.includes('rpc') || t.includes('timeout') || t.includes('fetch')) return 'La red va lenta ahora mismo. Prueba de nuevo en un momento.';
  if (t.includes('chain') || t.includes('red incorrecta')) return 'Cambia tu wallet a la red BNB Smart Chain.';
  if (t.includes('gas required exceeds') || t.includes('gas limit')) return 'La operación no cabe. Prueba con una cantidad menor.';
  if (t.includes('revert')) return 'El sistema no aceptó la operación. Revisa los datos e inténtalo otra vez.';
  return 'No se pudo completar. Inténtalo de nuevo en un momento.';
}

/** Avisa al keeper que vigile esta cuenta (así ejecuta sus bots).
 *  Si falla, no pasa nada: el bot queda creado igual. */
const KEEPER_URL = 'https://bolita-keeper-bot.yamicelanvivesqui.workers.dev';
function avisarKeeper(cuenta) {
  if (!cuenta) return;
  try { fetch(`${KEEPER_URL}/registrar?u=${cuenta}`, { mode: 'cors' }).catch(() => {}); } catch (_) {}
}

function hacerConexion(fn) {
  Promise.resolve().then(fn).catch((e) => {
    const el = $('c-hero-msg') || $('c-msg');
    console.warn('[Aurex] detalle técnico:', e);
    if (el) aviso(el, 'err', enCristiano(e), 8000);
  });
}

function conectarWallet() {
  try {
    if (wallet.necesitaWalletConnect && wallet.necesitaWalletConnect()) {
      // En el móvil damos DOS caminos: abrir la web dentro de la wallet (nunca
      // falla) o WalletConnect. Antes solo había WalletConnect y si fallaba,
      // el usuario se quedaba sin poder conectar.
      if (wallet.esMovil && wallet.esMovil()) { opcionesMovil(); return; }
      hacerConexion(() => wallet.conectarWalletConnect());
      return;
    }
  } catch (_) {}
  hacerConexion(() => wallet.conectar());
}

/* Ventana con las dos vías para conectar desde el teléfono */
function opcionesMovil() {
  const prev = $('cmov'); if (prev) prev.remove();
  const d = document.createElement('div');
  d.id = 'cmov';
  d.innerHTML = `<div class="cm-bg"></div>
    <div class="cm-c">
      <button class="cm-x" aria-label="Cerrar">✕</button>
      <div class="cm-t">Conecta tu wallet</div>
      <div class="cm-s">Elige cómo quieres hacerlo.</div>

      <div class="cm-eti">Lo más sencillo</div>
      <button class="cm-b oro" data-abrir="metamask">Abrir en MetaMask</button>
      <button class="cm-b" data-abrir="trust">Abrir en Trust Wallet</button>
      <button class="cm-b" data-abrir="safepal">Abrir en SafePal</button>
      <div class="cm-n">Se abre Aurex dentro de tu wallet y conecta solo.</div>

      <div class="cm-eti">O sin salir de aquí</div>
      <button class="cm-b" data-wc="1">Conectar con WalletConnect</button>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => { const e = $('cmov'); if (e) e.remove(); };
  d.querySelector('.cm-bg').onclick = cerrar;
  d.querySelector('.cm-x').onclick = cerrar;
  d.querySelectorAll('[data-abrir]').forEach((b) => b.onclick = () => {
    wallet.abrirEnWalletMovil(b.getAttribute('data-abrir'));
  });
  d.querySelector('[data-wc]').onclick = () => { cerrar(); hacerConexion(() => wallet.conectarWalletConnect()); };
}

function wireHeader() {
  if ($('c-swap')) $('c-swap').onclick = abrirSwap;
  if ($('c-conectar')) $('c-conectar').onclick = conectarWallet;
  if ($('c-dir')) $('c-dir').onclick = (e) => { e.stopPropagation(); abrirSelectorWallet($('c-dir')); };
  if ($('c-red')) $('c-red').onclick = () => wallet.cambiarARedCorrecta().catch(() => {});
  if ($('c-off')) $('c-off').onclick = () => wallet.desconectar().catch(() => {});
  if ($('c-perfil')) $('c-perfil').onclick = () => perfil.abrirPerfil();
  if ($('c-prize')) $('c-prize').onclick = () => prizepool.abrirPrizePool();
  if ($('c-ticker')) $('c-ticker').onclick = () => prizepool.abrirPrizePool();
  tutorial.wireFila(document);
  if ($('c-market')) $('c-market').onclick = () => { avisos.limpiarPunto(); market.abrirMarket(); };
  if ($('c-instalar')) $('c-instalar').onclick = (e) => { e.stopPropagation(); extras.panelInstalar($('c-instalar')); };
  try { avisos.iniciar(); } catch (_) {}
  try { extras.iniciarInstalacion(); } catch (_) {}
  try { admin.iniciarPanelOculto(); } catch (_) {}
  const hdr = document.querySelector('#colmena-app .c-hdr');
  if ($('c-menu-btn') && hdr) $('c-menu-btn').onclick = (e) => { e.stopPropagation(); hdr.classList.toggle('open'); };
  if (hdr) { const hr = hdr.querySelector('.c-hdr-r'); if (hr) hr.addEventListener('click', () => hdr.classList.remove('open')); }
  if (!window._menuDocWired) {
    window._menuDocWired = true;
    document.addEventListener('click', (e) => {
      const h = document.querySelector('#colmena-app .c-hdr');
      if (h && h.classList.contains('open') && !h.contains(e.target)) h.classList.remove('open');
    });
  }
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
        ${tutorial.filaBots()}
        <input class="faq-search" id="faq-search" type="text" autocomplete="off" placeholder="Escribe aquí sobre lo que quieres saber…">
        <div class="c-foot-grid" id="faq-grid">${faqs.map(card).join('')}</div>
        <div class="faq-empty" id="faq-empty" style="display:none">No encontramos nada con esa palabra. Prueba con otra.</div>
      </div>
    </details>
    <div class="c-foot-bottom">Aurex Finance · Opera bajo tu propio riesgo</div>
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
        <h2>Aurex</h2>
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
        <div class="bot-tabs" id="f-tipo">
          <button type="button" data-tipo="grid" class="bot-tab ${F.tipo==='grid'?'on':''}"><span class="bt-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></span><span class="bt-nom">Smart Grid</span></button>
          <button type="button" data-tipo="acum" class="bot-tab ${F.tipo==='acum'?'on':''}"><span class="bt-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg></span><span class="bt-nom">Accumulator</span></button>
          <button type="button" data-tipo="cash" class="bot-tab ${F.tipo==='cash'?'on':''}"><span class="bt-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></span><span class="bt-nom">Cash Out</span></button>
          <button type="button" data-tipo="dca" class="bot-tab ${F.tipo==='dca'?'on':''}"><span class="bt-ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg></span><span class="bt-nom">DCA</span></button>
        </div>
        <div class="bot-foto" id="f-foto">
          <img id="f-foto-img" alt="" src="${BOTMETA[F.tipo].img}" onerror="this.classList.add('nocarga')">
          <div class="bot-foto-cap"><b id="f-foto-tit">${BOTMETA[F.tipo].nom}</b><span id="f-foto-des">${BOTMETA[F.tipo].des}</span></div>
        </div>
        <div class="lab">Moneda ${iBtn('par')}</div>
        <div class="fila fila-coins">
          <button type="button" class="coin-sel" id="f-base-btn">
            <span class="coin-sel-l"><span class="coin-sel-ico" id="fb-ico"></span><span class="coin-sel-tx"><b id="fb-sim">—</b><i id="fb-nom"></i></span></span>
            <span class="coin-chev"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
          </button>
          <button type="button" class="coin-sel" id="f-quote-btn">
            <span class="coin-sel-l"><span class="coin-sel-ico" id="fq-ico"></span><span class="coin-sel-tx"><b id="fq-sim">—</b><i id="fq-nom"></i></span></span>
            <span class="coin-chev"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
          </button>
        </div>
        <div id="f-grid" style="${F.tipo!=='grid'?'display:none':''}">
          <button type="button" class="btn-conf" id="f-abrir-conf">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
            <span class="v-l">Configuraciones rentables</span><span class="v-s">Configuración</span>
            <span class="bc-sel" id="f-conf-sel">${F.preset ? NOMBRE_PRESET[F.preset] : 'elegir'}</span>
          </button>
          <div class="lab">Rango de precio ${iBtn('rango')}</div>
          <div class="fila">${campoNum('f-min',{placeholder:'precio bajo',pct:0.005})}${campoNum('f-max',{placeholder:'precio alto',pct:0.005})}</div>
          <div class="fila">
            <div><div class="lab">Cuadrículas ${iBtn('cuadriculas')}</div>${campoNum('f-niv',{value:20,min:2,max:100,step:1,int:true})}</div>
            <div><div class="lab" style="gap:10px"><span style="display:flex;align-items:center;gap:6px"><span class="inv-lbl">Inv. <span id="f-total-sym">(${moneda(F.quoteId).simbolo})</span></span> ${iBtn('inversion')}</span><span id="f-total-saldo" class="saldo-chip">—</span></div>${campoNum('f-total',{placeholder:'0.00',step:1,min:0})}</div>
          </div>
          <div class="lab"><span class="v-l">Gan. cuadrícula %</span><span class="v-s">Ganancia %</span> ${iBtn('margen')} <span style="color:var(--ink-3);font-size:11px;font-family:var(--mono)">opcional</span></div>
          ${campoNum('f-margen',{placeholder:'auto',min:0,max:20,step:0.5})}
          <div id="f-margen-nota"></div>
          <div class="paso-box"><span><span class="v-l">Separación entre cuadrículas</span><span class="v-s">Separación</span> ${iBtn('separacion')}</span><b id="pv-paso">—</b></div>
        </div>
        <div id="f-acum" style="${F.tipo==='acum'?'':'display:none'}">
          <button type="button" class="btn-conf" data-conf-bot="acum"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg><span class="v-l">Configuraciones rentables</span><span class="v-s">Configuración</span><span class="bc-sel" id="conf-sel-acum">elegir</span></button>
          <div class="lab"><span class="v-l">Precio mínimo (hasta dónde compra)</span><span class="v-s">Precio mínimo</span> ${iBtn('acmin')}</div>
          ${campoNum('fa-min',{placeholder:'precio más bajo',pct:0.01})}
          <div class="fila">
            <div><div class="lab"><span class="v-l">Nº de compras</span><span class="v-s">Nº compras</span> ${iBtn('acniv')}</div>${campoNum('fa-niv',{value:15,min:2,max:100,step:1,int:true})}</div>
            <div><div class="lab">Inv. (${moneda(F.quoteId).simbolo}) ${iBtn('inversion')}</div>${campoNum('fa-total',{placeholder:'0.00',step:1,min:0})}</div>
          </div>
          <div class="fila">
            <div><div class="lab"><span class="v-l">Compra inicial %</span><span class="v-s">Inicial %</span> ${iBtn('acini')}</div>${campoNum('fa-ini',{value:30,min:0,max:100,step:5})}</div>
            <div><div class="lab"><span class="v-l">Comprar abajo %</span><span class="v-s">Abajo %</span> ${iBtn('acfactor')}</div>${campoNum('fa-factor',{value:20,min:0,max:200,step:5})}</div>
          </div>
          <div class="lab"><span class="v-l">Vender cuando gane</span><span class="v-s">Vender al %</span> ${iBtn('acobj')}</div>
          <div class="seg presets" id="fa-obj" style="grid-template-columns:repeat(5,1fr)">
            <button type="button" data-obj="3">3%</button><button type="button" data-obj="5">5%</button>
            <button type="button" data-obj="10" class="on">10%</button><button type="button" data-obj="15">15%</button><button type="button" data-obj="20">20%</button>
          </div>
          ${campoNum('fa-obj-val',{value:10,min:0.5,max:100,step:0.5})}
          <div class="asesor as-marco" id="fa-prev">
            <div class="as-top"><b>Resumen del acumulador</b></div>
            <div class="as-grid">
              <div><span>Compra inicial (a mercado)</span><b id="fa-p-ini">—</b></div>
              <div><span>Precio promedio estimado</span><b id="fa-p-prom">—</b></div>
            </div>
            <div class="as-nota">Compra en la caída (más volumen mientras más baja) y vende TODO junto cuando el total gane el % que elijas. Luego repite. Menos comisiones.</div>
          </div>
        </div>
        <div id="f-cash" style="${F.tipo==='cash'?'':'display:none'}">
          <button type="button" class="btn-conf" data-conf-bot="cash"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg><span class="v-l">Configuraciones rentables</span><span class="v-s">Configuración</span><span class="bc-sel" id="conf-sel-cash">elegir</span></button>
          <div class="cash-note">Vendes <b id="cn-b">${moneda(F.baseId).simbolo}</b> y recibes <b id="cn-q">${moneda(F.quoteId).simbolo}</b> en tu wallet.</div>
          <div class="cash-cant-head">
            <div class="lab" style="margin:0"><span class="v-l">Cantidad a vender</span><span class="v-s">Cantidad</span> ${iBtn('cashcant')}</div>
            <div class="cash-bal"><span id="fc-saldo">—</span><button type="button" class="cash-max" id="fc-max">Máx</button></div>
          </div>
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
              <div class="cr-row"><span>Comisión de la venta</span><b id="fc-p-com">—</b></div>
              <div class="cr-row cr-gan"><span>Ganancia estimada</span><b id="fc-p-gan" class="pos">—</b></div>
            </div>
            <div class="cr-note">Vende solo cuando el precio llegue a tu objetivo y recibe <b id="fc-p-est">${moneda(F.quoteId).simbolo}</b> en tu wallet.<br><span style="opacity:.75">Ten esa moneda agregada en tu wallet para verla — llega igual.</span></div>
          </div>
        </div>
        <div id="f-dca" style="${F.tipo==='dca'?'':'display:none'}">
          <button type="button" class="btn-conf" data-conf-bot="dca"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg><span class="v-l">Configuraciones rentables</span><span class="v-s">Configuración</span><span class="bc-sel" id="conf-sel-dca">elegir</span></button>
          <div class="cash-note">Compras <b id="dn-b">${moneda(F.baseId).simbolo}</b> con tu <b id="dn-q">${moneda(F.quoteId).simbolo}</b>, un poco cada cierto tiempo.</div>
          <div class="cash-cant-head">
            <div class="lab" style="margin:0"><span class="v-l">Monto por compra</span><span class="v-s">Monto</span> ${iBtn('dcamonto')}</div>
            <div class="cash-bal"><span id="fd-saldo">—</span></div>
          </div>
          ${campoNum('fd-monto',{placeholder:'0.00',step:1,min:0,suffix:'fd-monto-eq'})}
          <div class="lab" style="margin-top:16px"><span class="v-l">¿Cada cuánto compra?</span><span class="v-s">Cada cuánto</span> ${iBtn('dcafrec')}</div>
          <div class="seg presets" id="fd-frec" style="grid-template-columns:repeat(4,1fr)">
            <button type="button" data-int="86400">Diario</button>
            <button type="button" data-int="604800" class="on">Semanal</button>
            <button type="button" data-int="1209600">Quincenal</button>
            <button type="button" data-int="2592000">Mensual</button>
          </div>
          <div class="lab" style="margin-top:16px"><span class="v-l">¿Cuántas compras?</span><span class="v-s">Nº compras</span> ${iBtn('dcanum')}</div>
          <div class="seg presets" id="fd-num" style="grid-template-columns:repeat(4,1fr)">
            <button type="button" data-n="10">10</button>
            <button type="button" data-n="25">25</button>
            <button type="button" data-n="52">52</button>
            <button type="button" data-n="0" class="on">Infinito</button>
          </div>
          <div class="cash-resumen" id="fd-prev">
            <div class="cr-top">Resumen del DCA</div>
            <div class="cr-rows">
              <div class="cr-row"><span>Compras</span><b id="fd-p-cada">—</b></div>
              <div class="cr-row"><span>Primera compra</span><b id="fd-p-primera">ahora mismo</b></div>
              <div class="cr-row"><span>Total a invertir</span><b id="fd-p-total">—</b></div>
              <div class="cr-row"><span>Precio ahora</span><b id="fd-p-precio">—</b></div>
            </div>
            <div class="cr-note">La primera compra se hace al encender. Ten <b id="fd-p-est">${moneda(F.quoteId).simbolo}</b> cargado en tu wallet para las siguientes.</div>
          </div>
        </div>
        <div style="text-align:right"><button class="btn-avz" id="f-toggleavz">${F.avanzado ? '− Opciones avanzadas' : '+ Opciones avanzadas'}</button></div>
        <div class="avz" id="f-avz" style="${F.avanzado ? '' : 'display:none'}">
          <div class="fila">
            <div><div class="lab"><span class="v-l">Protección precio %</span><span class="v-s">Protección %</span> ${iBtn('proteccion')}</div>${campoNum('f-slip',{value:1,step:0.5,min:0,max:10})}</div>
            <div><div class="lab"><span class="v-l">Ritmo mín (s)</span><span class="v-s">Ritmo (s)</span> ${iBtn('ritmo')}</div>${campoNum('f-cd',{value:0,step:5,min:0,int:true})}</div>
          </div>
          <div class="lab"><span class="v-l">Con "Ganancia por cuadrícula"</span><span class="v-s">Ganancia %</span> ${iBtn('margenmodo')}</div>
          <div class="seg presets" id="f-margenmodo" style="grid-template-columns:1fr 1fr;margin-bottom:10px">
            <button type="button" data-mm="cuadriculas" class="${F.margenModo!=='rango'?'on':''}">Ajustar cuadrículas</button>
            <button type="button" data-mm="rango" class="${F.margenModo==='rango'?'on':''}">Ampliar rango</button>
          </div>
          <div class="fila" id="f-avz-tpsl">
            <div><div class="lab"><span class="v-l">Cerrar con ganancia</span><span class="v-s">Cerrar al %</span> ${iBtn('tp')}</div>${campoNum('f-tp',{placeholder:'off',pct:0.01,min:0})}</div>
            <div><div class="lab"><span class="v-l">Protegerme de caídas</span><span class="v-s">Protección</span> ${iBtn('sl')}</div>${campoNum('f-sl',{placeholder:'off',pct:0.01,min:0})}</div>
          </div>
        </div>
        <button class="btn btn-verde mt" id="f-crear">Encender el bot</button>
        <div id="c-msg"></div>
      </div>
      <div>
        <div class="card">
          <div id="c-chart">${graficaPreview()}</div>
          <div id="c-acum-side" style="display:none">
            <div class="bot-panel-wrap">
              <img class="bot-panel" src="assets/img/panel-acum.webp" alt="Accumulator" loading="lazy">
              <span class="rec-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.6 1.4 6.8L12 17.1 5.9 20.5l1.4-6.8L2.2 9.1l6.9-.8L12 2z"/></svg>Recomendado</span>
            </div>
          </div>
          <div id="c-cash-side" style="display:none">
            <img class="bot-panel" src="assets/img/panel-cash.webp" alt="Cash Out" loading="lazy">
          </div>
          <div id="c-dca-side" style="display:none">
            <img class="bot-panel" src="assets/img/panel-dca.webp" alt="DCA Compra Automática" loading="lazy">
          </div>
          <div id="c-hint"></div>
          <div class="prev vacio">
            <div class="p"><b>Precio</b><span id="pv-precio">—</span></div>
            <div class="p prep"><span id="pv-compras" class="rep-wrap">—</span></div>
            <div class="p"><b>Por compra</b><span id="pv-orden">—</span></div>
            <div class="p"><b>Ganancia ${iBtn('porcuad')}</b><span id="pv-gan" class="pos">—</span></div>
          </div>
          <div class="asesor" id="c-asesor" style="display:none">
            <div class="as-top"><b>Estimación</b> ${iBtn('asesor')}</div>
            <div class="as-grid">
              <div><span>Operaciones/día (est.)</span><b id="as-ops">—</b></div>
            </div>
            <div class="as-nota" id="as-nota"></div>
          </div>
          <div class="gasbox">
            <div class="gas-row">
              <div class="stepper gas-stepper">
                <input id="f-gas" type="number" inputmode="decimal" placeholder="0.01 BNB" min="0" step="0.005" data-min="0" data-step="0.005">
                <span class="gas-hint">Gas del bot <button class="i-btn gas-ibtn" data-info="gas" type="button">i</button></span>
                <span class="stepper-btns"><button type="button" class="st-up" tabindex="-1">▲</button><button type="button" class="st-dn" tabindex="-1">▼</button></span>
              </div>
              <button class="btn btn-oro" id="f-gasdep">Recargar</button>
            </div>
            <div class="gas-sep"><button class="btn btn-linea btn-max" id="f-gasret"><span class="gas-rtx">Retirar <span id="c-gas"><span class="skel">0.00000</span> BNB</span></span></button></div>
          </div>
          <div id="c-gasmsg"></div>
          <div id="c-cash-price" class="cash-price" style="display:none;margin-top:16px;margin-bottom:0">
            <div class="cp-lab" id="cash-price-pair">BNB / USDT</div>
            <div class="cp-val" id="cash-price-val">—</div>
            <div class="cp-src">precio del mercado</div>
          </div>
        </div>
      </div>
    </div>
    <div class="colmenas card"><div class="mb-cab"><h3>Mis bots</h3><div class="mb-der"><span class="c-cupo" id="c-cupo"><b>—</b><span>bots activos</span></span><button class="btn-cerrar-todos" id="c-cerrar-todos" type="button" title="Cerrar todos tus bots">Cerrar todos</button></div></div><div id="c-rejillas"><div class="skel" style="height:120px;width:100%;border-radius:14px"></div></div></div>
    ${footerHTML()}
  </div>`;

  wireHeader(); wireFaq();
  if ($('f-base-btn')) $('f-base-btn').onclick = () => abrirCoinModal('base');
  if ($('f-quote-btn')) $('f-quote-btn').onclick = () => abrirCoinModal('quote');
  actualizarBotonesCoin();
  cargarLogosPrecios();
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
  if ($('f-sug')) $('f-sug').onclick = sugerirRango;   // ya no está en el formulario, vive en la ventana de configuraciones
  if ($('f-abrir-conf')) $('f-abrir-conf').onclick = ventanaConfiguraciones;
  document.querySelectorAll(`#${APP} [data-conf-bot]`).forEach((b) => b.onclick = () => ventanaConfBot(b.dataset.confBot));
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
  if ($('fd-monto')) $('fd-monto').addEventListener('input', previewDCA);
  document.querySelectorAll(`#${APP} #fd-frec button`).forEach((b) => b.onclick = () => { F.dcaFrec = parseInt(b.dataset.int, 10); document.querySelectorAll(`#${APP} #fd-frec button`).forEach((x) => x.classList.toggle('on', x === b)); previewDCA(); });
  document.querySelectorAll(`#${APP} #fd-num button`).forEach((b) => b.onclick = () => { F.dcaNum = parseInt(b.dataset.n, 10); document.querySelectorAll(`#${APP} #fd-num button`).forEach((x) => x.classList.toggle('on', x === b)); previewDCA(); });
  refrescarSaldoCash();
  pintarTipo();
  $('f-crear').onclick = onCrear;
  $('f-gasdep').onclick = onDepositarGas;
  $('f-gasret').onclick = onRetirarGas;
  wirePops(host);
  wireSteppers(host);

  cargarPrecio(); refrescarGas(); refrescarSaldoInversion(); refrescarRejillas();
  // Los datos se refrescan solos: el keeper opera en segundo plano y antes
  // había que recargar la página para ver el gas y los bots actualizados.
  if (window._refrescoAuto) clearInterval(window._refrescoAuto);
  window._refrescoAuto = setInterval(() => {
    if (document.hidden) return;                        // no gastamos si no miras
    if (!wallet.cuentaActual()) return;
    // Solo el gas, que es un número suelto. NUNCA redibujamos la lista de bots:
    // eso cerraba la gráfica abierta y provocaba el parpadeo de la página.
    refrescarGas();
  }, 45000);
}

/* ================================================================== */
/* Precio + vista viva                                                 */
/* ================================================================== */
async function cargarPrecio() {
  const base = moneda(F.baseId), quote = moneda(F.quoteId);
  try { const r = await gb.precioPar(gb.dirDe(base), gb.dirDe(quote), base.decimals, quote.decimals); F.precio = r.precio; F.rutas = r.rutas; }
  catch { F.precio = null; }
  pintarPrecioAhora();                    // la tarjeta del precio, en los cuatro bots
  if (F.tipo === 'cash') previewCash();
  if (F.tipo === 'dca') previewDCA();
  if (F.tipo === 'acum' && typeof previewAcum === 'function') previewAcum();
  actualizarVista();
}
function actualizarVista() {
  pintarPrecioAhora();
  if ($('c-chart')) $('c-chart').innerHTML = graficaPreview();
  if ($('pv-precio')) $('pv-precio').textContent = precioFmt(F.precio);
  const pMin = parseFloat($('f-min')?.value), pMax = parseFloat($('f-max')?.value);
  const n = parseInt($('f-niv')?.value, 10), total = parseFloat($('f-total')?.value);
  const valido = F.precio && pMin > 0 && pMax > pMin && n >= 2;
  const _prev = document.querySelector(`#${APP} .prev`); if (_prev) _prev.classList.toggle('vacio', !valido);
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
/* Configuraciones para los otros tres bots, con su porqué económico. */
const CONF_BOTS = {
  acum: {
    titulo: 'Configuraciones del Accumulator',
    porque: `<p><b>Qué hace, en simple.</b> Imagina que quieres comprar una moneda pero no sabes si va a bajar más. En vez de gastar todo tu dinero de golpe, el bot lo va soltando poco a poco cada vez que el precio baja. Y cuanto más barato está, más compra.</p>
      <p><b>Por qué eso ayuda.</b> Si compras 10 monedas a 100 y luego 10 a 80, no necesitas que vuelva a 100 para recuperar: tu precio medio es 90. El bot hace eso solo. A esto se le llama <b>bajar tu precio medio</b>, y es lo único que hace este bot.</p>
      <p><b>Cuándo vende.</b> No vende por partes. Espera a que <b>todo lo que compró</b> valga el porcentaje que tú fijaste (por ejemplo un 10% más de lo que te costó) y ahí vende de una vez. Como vende una sola vez, paga comisiones una sola vez.</p>
      <p><b>Qué puede salir mal, sin adornos:</b><br>
      · Si el precio <b>sigue bajando y no vuelve a subir</b>, el bot no vende y te quedas con la moneda comprada, valiendo menos de lo que pagaste. No pierdes el dinero de golpe, pero está ahí abajo esperando.<br>
      · Si el precio <b>cae por debajo del mínimo que pusiste</b>, deja de comprar y no puede seguir bajando tu promedio.<br>
      · <b>Nada garantiza que el precio suba.</b> Este bot ordena tus compras y espera con paciencia; no adivina el mercado.</p>
      <p><b>Tres consejos concretos:</b><br>· Un objetivo del <b>8-12%</b> se alcanza con bastante frecuencia. Por encima del 25% puedes esperar mucho tiempo.<br>· Pon el precio mínimo <b>bien abajo</b>, para que tenga margen de compra si hay una caída fuerte.<br>· Úsalo con monedas grandes y conocidas, que tienen más probabilidad de recuperarse que una moneda pequeña.</p>`,
    ops: [
      { id: 'prudente', n: 'Prudente', d: 'Objetivo cercano, sale rápido y repite. Ideal para empezar.', c: { obj: 5, niv: 6, ini: 25, factor: 30, caida: 20 }, r: 'Vende con +5%. Cierra ciclos a menudo.' },
      { id: 'medio', n: 'Equilibrado', d: 'El punto dulce entre frecuencia y ganancia. Recomendado.', c: { obj: 10, niv: 8, ini: 20, factor: 40, caida: 30 }, r: 'Vende con +10%. Buen equilibrio.' },
      { id: 'paciente', n: 'Paciente', d: 'Objetivo alto y mucho margen para comprar en caídas grandes.', c: { obj: 18, niv: 10, ini: 15, factor: 55, caida: 45 }, r: 'Vende con +18%. Menos ciclos, más ganancia cada uno.' }
    ]
  },
  cash: {
    titulo: 'Configuraciones del Cash Out',
    porque: `<p><b>Qué hace, en simple.</b> Tú dices "cuando esta moneda llegue a este precio, véndemela". El bot se queda vigilando el mercado día y noche, y en cuanto lo toca, vende y te manda el dinero a tu wallet.</p>
      <p><b>Por qué es útil.</b> No hace falta que estés pendiente del móvil ni que te despiertes de madrugada. El precio puede tocarse a las 4 de la mañana y el bot lo hará igual.</p>
      <p><b>Por qué apenas cuesta.</b> Solo hace <b>una operación</b>, así que paga comisiones una sola vez: unos <b>0,03 USDT</b> entre la red y el exchange. Todo lo que suba por encima de eso queda para ti.</p>
      <p><b>Qué puede salir mal, sin adornos:</b><br>
      · <b>El precio puede no llegar nunca.</b> Entonces el bot no hace nada y tu moneda sigue siendo tuya, ni más ni menos.<br>
      · Si el mercado <b>sube mucho más</b> de tu objetivo, ya habrás vendido y te habrás quedado sin esa subida extra.<br>
      · Si el precio <b>baja</b>, el bot no te protege: solo vende hacia arriba. Para eso está el stop loss, si lo activas.</p>
      <p><b>Tres consejos concretos:</b><br>· Entre <b>+3% y +10%</b> suele tocarse en días.<br>· Por encima del <b>+25%</b> puedes esperar semanas, o no llegar.<br>· Piensa a qué precio estarías contento vendiendo, y pon ese. No busques el máximo perfecto: nadie lo acierta.</p>`,
    ops: [
      { id: 'rapido', n: 'Rápido', d: 'Un objetivo cercano que el mercado suele tocar en pocos días.', c: { obj: 3 }, r: 'Vende con +3% de subida.' },
      { id: 'normal', n: 'Equilibrado', d: 'El más usado: buena ganancia sin esperar demasiado.', c: { obj: 7 }, r: 'Vende con +7% de subida.' },
      { id: 'ambicioso', n: 'Ambicioso', d: 'Para quien no tiene prisa y busca una subida fuerte.', c: { obj: 15 }, r: 'Vende con +15% de subida.' }
    ]
  },
  dca: {
    titulo: 'Configuraciones del DCA',
    porque: `<p><b>Qué hace, en simple.</b> Compra la misma cantidad cada cierto tiempo (por ejemplo 20 USDT todos los lunes), sin mirar si el precio está alto o bajo. Siempre igual, pase lo que pase.</p>
      <p><b>Por qué eso ayuda.</b> Nadie sabe cuándo es el mejor momento para comprar, ni los profesionales. Comprando siempre un poco, unas veces te tocará caro y otras barato, y acabas con un <b>precio medio razonable</b> en vez de haberlo apostado todo a un solo día.</p>
      <p><b>Lo que evita.</b> El error más caro que comete la gente: meter todos sus ahorros justo antes de una caída. Con esto es imposible que te pase.</p>
      <p><b>Qué puede salir mal, sin adornos:</b><br>
      · <b>No es magia.</b> Si la moneda baja durante años, tu precio medio bajará también, pero seguirás en pérdida.<br>
      · <b>Si el mercado solo sube</b>, habrías ganado más comprando todo al principio. Esto reduce el riesgo, y a cambio reduce el máximo posible.<br>
      · Este bot <b>solo compra, no vende</b>. Tú decides cuándo salir.</p>
      <p><b>Tres consejos concretos:</b><br>· <b>Semanal o mensual, no diario.</b> Cada compra paga gas de la red; comprando a diario ese coste se come la ventaja.<br>· Que cada compra sea de <b>10 USDT o más</b>, para que la comisión pese poco.<br>· Su fuerza está en el tiempo. Esto se piensa en <b>meses</b>, no en días.</p>`,
    ops: [
      { id: 'semanal', n: 'Semanal', d: 'Una compra por semana. El mejor equilibrio entre coste y suavizado.', c: { frec: 604800, num: 52 }, r: 'Un año comprando cada semana.' },
      { id: 'quincenal', n: 'Quincenal', d: 'Cada dos semanas. Menos comisiones, buen promedio.', c: { frec: 1209600, num: 26 }, r: 'Un año comprando cada 15 días.' },
      { id: 'mensual', n: 'Mensual', d: 'Una vez al mes. El más barato en comisiones.', c: { frec: 2592000, num: 24 }, r: 'Dos años comprando cada mes.' }
    ]
  }
};

/** Ventana de configuraciones para acumulador, cash out y DCA. */
function ventanaConfBot(tipo) {
  const CB = CONF_BOTS[tipo]; if (!CB) return;
  const prev = $('conf-box'); if (prev) prev.remove();
  const d = document.createElement('div');
  d.id = 'conf-box';
  d.className = 'tema-' + tipo;
  d.innerHTML = `<div class="cf-bg"></div>
    <div class="cf-c">
      <button class="cf-x" aria-label="Cerrar">✕</button>
      <div class="cf-t">${CB.titulo}</div>
      <div class="cf-s">Elige una y seguimos. Después puedes ajustar lo que quieras.</div>
      <div class="cf-lista">
        ${CB.ops.map((o) => `<button class="cf-op" data-cb="${o.id}">
          <div class="cf-cab"><b>${o.n}</b></div>
          <div class="cf-d">${o.d}</div>
          <div class="cf-gana">${o.r}</div>
        </button>`).join('')}
      </div>
      <details class="cf-saber"><summary>¿Por qué este bot da ganancia?</summary><div class="cf-txt">${CB.porque}</div></details>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => { const e = $('conf-box'); if (e) e.remove(); };
  d.querySelector('.cf-bg').onclick = cerrar;
  d.querySelector('.cf-x').onclick = cerrar;
  d.querySelectorAll('[data-cb]').forEach((b) => b.onclick = () => {
    const op = CB.ops.find((x) => x.id === b.dataset.cb);
    if (op) aplicarConfBot(tipo, op);
    cerrar();
  });
}

/** Vuelca la configuración elegida en los campos del formulario. */
function aplicarConfBot(tipo, op) {
  const set = (id, v) => { const e = $(id); if (e) { e.value = String(v); e.dispatchEvent(new Event('input', { bubbles: true })); } };
  if (tipo === 'acum') {
    set('fa-obj-val', op.c.obj); set('fa-niv', op.c.niv);
    set('fa-ini', op.c.ini); set('fa-factor', op.c.factor);
    if (F.precio > 0) set('fa-min', +(F.precio * (1 - op.c.caida / 100)).toPrecision(6));
    document.querySelectorAll(`#${APP} #fa-obj button`).forEach((b) => b.classList.toggle('on', Number(b.dataset.obj) === op.c.obj));
    if (typeof previewAcum === 'function') previewAcum();
  } else if (tipo === 'cash') {
    const b = document.querySelector(`#${APP} [data-cobj="${op.c.obj}"]`);
    if (b) b.click(); else set('fc-obj-val', op.c.obj);
    if (typeof previewCash === 'function') previewCash();
  } else if (tipo === 'dca') {
    set('fd-frec', op.c.frec); set('fd-num', op.c.num);
    const sel = $('fd-frec'); if (sel && sel.tagName === 'SELECT') { sel.value = String(op.c.frec); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    if (typeof previewDCA === 'function') previewDCA();
  }
  const sel = $('conf-sel-' + tipo); if (sel) sel.textContent = op.n;
}

/** Ventana con las configuraciones auditadas y lo que rinde cada una. */
function ventanaConfiguraciones() {
  const prev = $('conf-box'); if (prev) prev.remove();
  const inv = Math.max(0, Number(String($('f-total')?.value || '').replace(',', '.')) || 0);
  const usada = inv > 0 ? inv : 200;

  const cuenta = (p) => {
    const orden = usada / p.grids;
    const bruto = orden * (p.sep / 100);
    const neto = bruto - (GAS_VUELTA_USD + orden * COM_DEX);
    return { orden, neto, ok: neto > 0 };
  };

  const tarjeta = (id) => {
    const p = PRESETS[id], c = cuenta(p);
    return `<button class="cf-op ${F.preset === id ? 'on' : ''}" data-conf="${id}">
      <div class="cf-cab"><b>${NOMBRE_PRESET[id]}</b><span class="cf-ops">${p.ops} operaciones</span></div>
      <div class="cf-d">${p.desc}</div>
      <div class="cf-nums">
        <span><i>rango</i>±${(p.rango * 100).toFixed(0)}%</span>
        <span><i>cuadrículas</i>${p.grids}</span>
        <span><i>separación</i>${p.sep.toFixed(2)}%</span>
      </div>
      <div class="cf-gana ${c.ok ? '' : 'mal'}">
        ${c.ok ? `Cada vuelta te deja ≈ <b>${c.neto.toFixed(3)} USDT</b> ya libres de comisiones` : `Con ${usada.toFixed(0)} USDT las comisiones se comen la ganancia. Sube la inversión.`}
      </div>
    </button>`;
  };

  const d = document.createElement('div');
  d.id = 'conf-box';
  d.innerHTML = `<div class="cf-bg"></div>
    <div class="cf-c">
      <button class="cf-x" aria-label="Cerrar">✕</button>
      <div class="cf-t">Configuraciones rentables</div>
      <div class="cf-s">Calculado con <b>${usada.toFixed(0)} USDT</b>${inv > 0 ? '' : ' (pon tu inversión para afinar)'}. Elige una y seguimos.</div>
      <div class="cf-lista">${['tranquilo', 'equilibrado', 'activo', 'volatil'].map(tarjeta).join('')}</div>
      <button class="cf-sug" id="cf-sug">Sugerir según el precio de ahora</button>
      <details class="cf-saber">
        <summary>¿Por qué este bot da ganancia?</summary>
        <div class="cf-txt">
          <p><b>Qué es una cuadrícula.</b> Imagina una escalera de precios. Pones el escalón más bajo (por ejemplo 500) y el más alto (700), y el bot reparte escalones entre medias. Cada escalón es una <b>cuadrícula</b>.</p>
          <p><b>Qué hace el bot.</b> Muy sencillo: <b>cuando el precio baja a un escalón, compra. Cuando sube al siguiente, vende.</b> Y vuelta a empezar. Nada más. Compra barato, vende un poquito más caro, una y otra vez.</p>
          <p><b>De dónde sale la ganancia.</b> De la diferencia entre un escalón y el siguiente. Si compra a 600 y vende a 615, esos 15 son tuyos (menos comisiones). El precio de una moneda sube y baja muchas veces al día, así que puede repetirlo varias veces en la misma jornada. <b>No necesita que el precio suba en general</b>: le basta con que se mueva arriba y abajo.</p>
          <p><b>La clave: la separación entre escalones.</b> Cada compra-venta paga el gas de la red (unos 0,025 USDT) y la comisión del exchange. Si los escalones están demasiado juntos, esa ganancia no cubre las comisiones. Cuando eso pasa, <b>el bot no vende</b>: está programado para no vender con pérdida. Por eso las configuraciones de arriba ya vienen con la separación calculada.</p>
          <p><b>Qué puede salir mal, sin adornos:</b><br>
          · <b>Si el precio se sale del rango por abajo</b>, el bot habrá comprado en todos los escalones y se queda quieto con la moneda, que vale menos de lo que pagaste. Tu dinero sigue ahí, en forma de moneda, pero en pérdida hasta que vuelva.<br>
          · <b>Si se sale por arriba</b>, habrá vendido todo y dejará de operar. Ganaste, pero te quedas fuera de la subida.<br>
          · <b>Si el mercado se queda plano</b> y no toca ningún escalón, el bot no hace nada y no gana nada.<br>
          · <b>Nada garantiza ganancias.</b> Esta estrategia funciona bien cuando el precio se mueve dentro de un rango, y funciona mal cuando se va en una sola dirección y no vuelve.</p>
          <p><b>Tres consejos concretos:</b><br>
          · <b>Cuanto más dinero por cuadrícula, mejor.</b> El gas cuesta lo mismo tanto si mueves 2 USDT como 20, así que con órdenes pequeñas se lo come todo.<br>
          · <b>El precio de ahora debe quedar dentro del rango</b>, y a poder ser por el medio. Si no, el bot no tiene dónde operar.<br>
          · <b>Rango amplio para dormir tranquilo</b>, rango estrecho para operar más. Lo primero es más seguro; lo segundo, más activo pero se sale antes.</p>
        </div>
      </details>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => { const e = $('conf-box'); if (e) e.remove(); };
  d.querySelector('.cf-bg').onclick = cerrar;
  d.querySelector('.cf-x').onclick = cerrar;
  d.querySelectorAll('[data-conf]').forEach((b) => b.onclick = () => { aplicarPreset(b.dataset.conf); cerrar(); });
  const sug = $('cf-sug');
  if (sug) sug.onclick = () => { cerrar(); sugerirRango(); };
}

function aplicarPreset(id) {
  if (!F.precio) { aviso($('c-msg'), 'err', 'Espera a que cargue el precio y vuelve a intentar.'); return; }
  const p = PRESETS[id]; if (!p) return;
  F.preset = id;
  const sel = $('f-conf-sel'); if (sel) sel.textContent = NOMBRE_PRESET[id] || 'elegir';
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
  if (cur > maxN) { niv.value = maxN; NOTA_GAS = `Ajustado a ${maxN} cuadrículas: así cada vuelta te deja ganancia neta con tu capital.`; }
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
    el.innerHTML = `${num(balH, 2)} · <b>Máx</b>`;
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
    const bal = await gb.saldoCashDisponible(gb.dirDe(base), cuenta);
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
/** Cierra todos los bots del usuario, uno a uno, con aviso claro antes. */
async function cerrarTodosLosBots(cuenta) {
  // Aviso inmediato: leer los bots tarda unos segundos y el botón parecía roto.
  const btn = $('c-cerrar-todos');
  const txtOrig = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Buscando tus bots…'; btn.classList.add('cargando'); }
  const soltar = () => { if (btn) { btn.disabled = false; btn.textContent = txtOrig; btn.classList.remove('cargando'); } };

  let claves = [];
  try { claves = await gb.misRejillas(cuenta); } catch (_) {}
  const vivos = [];
  for (const k of claves) {
    try { const R = await gb.resumenK(k); if (R.activa) vivos.push({ k, R }); } catch (_) {}
  }
  soltar();
  if (vivos.length === 0) { modalError('No tienes bots activos que cerrar.'); return; }

  const d = document.createElement('div');
  d.id = 'ct-box';
  d.innerHTML = `<div class="ct-bg"></div>
    <div class="ct-c">
      <div class="ct-t">¿Cerrar tus ${vivos.length} bots?</div>
      <div class="ct-s">
        Se cancelan <b>todos</b> a la vez y <b>todo tu dinero vuelve a tu wallet</b>: lo que esté en monedas se vende al precio de ahora, y lo que esté sin usar se devuelve tal cual.<br><br>
        Si algún bot compró y el precio bajó, esa parte se venderá <b>en pérdida</b>. Esto no se puede deshacer.<br><br>
        Tendrás que firmar <b>una transacción por bot</b> (${vivos.length} en total).
      </div>
      <div class="ct-acts">
        <button class="ct-b gris" id="ct-no">Mejor no</button>
        <button class="ct-b rojo" id="ct-si">Sí, cerrar los ${vivos.length}</button>
      </div>
      <div class="ct-prog" id="ct-prog"></div>
    </div>`;
  document.body.appendChild(d);
  const cerrar = () => { const e = $('ct-box'); if (e) e.remove(); };
  d.querySelector('.ct-bg').onclick = cerrar;
  $('ct-no').onclick = cerrar;
  $('ct-si').onclick = async () => {
    const prog = $('ct-prog'), si = $('ct-si'), no = $('ct-no');
    si.disabled = true; no.disabled = true;
    let ok = 0, fallos = 0;
    for (let i = 0; i < vivos.length; i++) {
      prog.textContent = `Cerrando ${i + 1} de ${vivos.length}… confirma en tu wallet`;
      try { await gb.cancelarRejillaK(vivos[i].k); ok++; }
      catch (e) { fallos++; console.warn('[Aurex] cerrar bot:', e); }
    }
    prog.textContent = fallos === 0
      ? `Listo: ${ok} bots cerrados y tu dinero de vuelta.`
      : `${ok} cerrados · ${fallos} no se pudieron (quizá cancelaste la firma).`;
    setTimeout(() => { cerrar(); refrescarRejillas(); refrescarGas(); }, 2200);
  };
}

/* ── Cupo de bots ──────────────────────────────────────────────────────────
   Ocho bots por persona: dos de cada estrategia. Es un límite generoso para
   el usuario y sostenible para el sistema (el keeper revisa TODOS los bots
   de TODOS los usuarios cada minuto). */
const CUPO_TOTAL = 8;
const CUPO_POR_TIPO = 2;
const NOMBRE_TIPO = { grid: 'Smart Grid', acum: 'Accumulator', cash: 'Cash Out', dca: 'DCA' };

/** Cuenta los bots activos del usuario, por tipo. */
async function contarBots(cuenta) {
  const r = { total: 0, grid: 0, acum: 0, cash: 0, dca: 0 };
  try {
    const claves = await gb.misRejillas(cuenta);
    for (const k of claves) {
      try {
        const R = await gb.resumenK(k);
        if (!R.activa) continue;
        r.total++;
        let m = 0;
        try { const md = await gb.modoDe(k); m = Number(Array.isArray(md) ? md[0] : 0); } catch (_) {}
        const t = m === 1 ? 'acum' : m === 2 ? 'cash' : m === 3 ? 'dca' : 'grid';
        r[t]++;
      } catch (_) {}
    }
  } catch (_) {}
  return r;
}

/** ¿Puede crear otro bot de este tipo? Devuelve el motivo si no. */
async function cupoLibre(cuenta, tipo) {
  const c = await contarBots(cuenta);
  if (c.total >= CUPO_TOTAL) {
    return { ok: false, motivo: `Has llegado al máximo de ${CUPO_TOTAL} bots a la vez. Cancela alguno para crear otro.`, c };
  }
  if ((c[tipo] || 0) >= CUPO_POR_TIPO) {
    return { ok: false, motivo: `Ya tienes ${CUPO_POR_TIPO} bots ${NOMBRE_TIPO[tipo]}. Cancela uno para crear otro de este tipo.`, c };
  }
  return { ok: true, c };
}

/** Cápsula "3 de 8" en la cabecera de tus bots. */
async function pintarCupo(cuenta) {
  const el = $('c-cupo');
  if (!el || !cuenta) return;
  const c = await contarBots(cuenta);
  const lleno = c.total >= CUPO_TOTAL;
  el.className = 'c-cupo' + (lleno ? ' lleno' : '');
  el.innerHTML = lleno
    ? `<b>${c.total}/${CUPO_TOTAL}</b><span>máximo alcanzado</span>`
    : `<b>${c.total}/${CUPO_TOTAL}</b><span>bots activos</span>`;
  el.title = `Smart Grid ${c.grid}/${CUPO_POR_TIPO} · Accumulator ${c.acum}/${CUPO_POR_TIPO} · Cash Out ${c.cash}/${CUPO_POR_TIPO} · DCA ${c.dca}/${CUPO_POR_TIPO}`;
}

async function onCrear() {
  if (F.tipo === 'acum') return onCrearAcum();
  if (F.tipo === 'cash') return onCrearCashOut();
  if (F.tipo === 'dca') return onCrearDCA();
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
    const botId = Date.now();
    const config = await gb.construirConfig(p); config.botId = botId;
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
    // Cupo: máximo {CUPO_TOTAL} bots y {CUPO_POR_TIPO} de cada tipo.
    const _cupo = await cupoLibre(cuenta, 'grid');
    if (!_cupo.ok) { modalError(_cupo.motivo); return; }
    await gb.crearRejilla(config);
    avisarKeeper(wallet.cuentaActual());

    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total, entry: config._Pnow, creadoLocal: Date.now(), botId });
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
const LOGOS = {};   // id -> { img, price, chg }  (CoinGecko)
function fmtPrecioUSD(p) {
  if (p == null || !isFinite(p)) return '—';
  if (p >= 1000) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 0.01) return '$' + p.toFixed(4);
  if (p >= 0.0001) return '$' + p.toFixed(6);
  return '$' + Number(p.toPrecision(2)).toString();
}
function icoInner(mo) {
  const letra = mo.icono || (mo.simbolo || '?')[0];
  const L = LOGOS[mo.id];
  return `<span class="ico-fb">${letra}</span>` + (L && L.img ? `<img src="${L.img}" alt="" onload="this.parentElement.classList.add('conlogo')" onerror="this.style.display='none'">` : '');
}
let _logosCargando = false, _logosOk = false;
async function cargarLogosPrecios() {
  if (_logosCargando) return; _logosCargando = true;
  try {
    const ids = [...new Set([...BASES, ...QUOTES].map((id) => moneda(id)?.cg).filter(Boolean))];
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids.join(',')}&per_page=250&price_change_percentage=24h`;
    const r = await fetch(url);
    if (!r.ok) throw new Error('cg ' + r.status);
    const arr = await r.json();
    const byCg = {}; arr.forEach((c) => { byCg[c.id] = c; });
    [...BASES, ...QUOTES].forEach((id) => { const c = byCg[moneda(id)?.cg]; if (c) LOGOS[id] = { img: c.image, price: c.current_price, chg: c.price_change_percentage_24h }; });
    _logosOk = true;
    actualizarBotonesCoin();
    if (window._cmRepintar) window._cmRepintar();
  } catch (_) {} finally { _logosCargando = false; }
}
function actualizarBotonesCoin() {
  const b = moneda(F.baseId), q = moneda(F.quoteId);
  const set = (icoId, simId, nomId, mo) => {
    const ico = $(icoId), sim = $(simId), nom = $(nomId);
    if (sim) sim.textContent = mo.simbolo;
    if (nom) nom.textContent = mo.nombre;
    if (ico) { ico.innerHTML = icoInner(mo); ico.style.color = mo.color || 'var(--gold)'; }
  };
  set('fb-ico', 'fb-sim', 'fb-nom', b);
  set('fq-ico', 'fq-sim', 'fq-nom', q);
}
const CAT_NOMBRES = { l1: 'Layer 1', defi: 'DeFi', meme: 'Memes' };
function abrirCoinModal(sel) {
  const esBase = sel === 'base';
  const ids = esBase ? BASES : QUOTES;
  const host = $(APP) || document.body;
  const viejo = $('coin-modal'); if (viejo) viejo.remove();
  const cats = esBase ? [['todas', 'Todas'], ['l1', 'Layer 1'], ['defi', 'DeFi'], ['meme', 'Memes']] : [];
  const el = document.createElement('div');
  el.innerHTML = `<div class="coin-modal" id="coin-modal">
    <div class="coin-modal-bg" id="cm-bg"></div>
    <div class="coin-modal-box">
      <div class="cm-head"><span class="cm-title">${esBase ? 'Elige la moneda' : 'Elige tu estable'}</span><button class="cm-x" id="cm-x" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
      <div class="cm-search"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="cm-search" placeholder="Buscar por nombre o símbolo…" autocomplete="off"></div>
      ${esBase ? `<div class="cm-cats" id="cm-cats">${cats.map(([c, n], i) => `<button type="button" data-cat="${c}" class="${i === 0 ? 'on' : ''}">${n}</button>`).join('')}</div>` : ''}
      <div class="cm-list" id="cm-list"></div>
    </div>
  </div>`;
  host.appendChild(el.firstElementChild);
  let fcat = 'todas', ftxt = '';
  const selId = () => esBase ? F.baseId : F.quoteId;
  const pintar = () => {
    const q = ftxt.trim().toLowerCase();
    const monedas = ids.map((id) => MONEDAS[id]).filter(Boolean).filter((mo) => {
      const cat = mo.categoria || 'l1';
      if (esBase && fcat !== 'todas' && cat !== fcat) return false;
      if (q && !((mo.simbolo || '').toLowerCase().includes(q) || (mo.nombre || '').toLowerCase().includes(q))) return false;
      return true;
    });
    const list = $('cm-list');
    if (!monedas.length) { list.innerHTML = `<div class="cm-empty">Sin resultados para "${ftxt}"</div>`; return; }
    list.innerHTML = monedas.map((mo) => {
      const on = selId() === mo.id;
      const L = LOGOS[mo.id];
      const chg = L && L.chg != null ? L.chg : null;
      return `<button type="button" class="cm-coin${on ? ' on' : ''}" data-id="${mo.id}">
        <span class="cm-coin-ico" style="color:${mo.color || '#e8b84b'}">${icoInner(mo)}</span>
        <span class="cm-coin-tx"><b>${escT(mo.simbolo)}</b><i>${escT(mo.nombre)}</i></span>
        <span class="cm-coin-right">
          <span class="cm-coin-price">${L ? fmtPrecioUSD(L.price) : '<span class="cm-price-skel"></span>'}</span>
          ${chg != null ? `<span class="cm-coin-chg ${chg >= 0 ? 'pos' : 'neg'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>` : ''}
        </span>
      </button>`;
    }).join('');
    list.querySelectorAll('.cm-coin').forEach((b) => b.onclick = () => elegirCoin(sel, b.dataset.id));
  };
  window._cmRepintar = pintar;
  pintar();
  if (!_logosOk) cargarLogosPrecios();
  $('cm-search').addEventListener('input', (e) => { ftxt = e.target.value; pintar(); });
  setTimeout(() => { const s = $('cm-search'); if (s) s.focus(); }, 60);
  document.querySelectorAll(`#${APP} #cm-cats button`).forEach((b) => b.onclick = () => { fcat = b.dataset.cat; document.querySelectorAll(`#${APP} #cm-cats button`).forEach((x) => x.classList.toggle('on', x === b)); pintar(); });
  const cerrar = () => { window._cmRepintar = null; const mm = $('coin-modal'); if (mm) mm.remove(); };
  $('cm-x').onclick = cerrar; $('cm-bg').onclick = cerrar;
}
function elegirCoin(sel, id) {
  const mm = $('coin-modal'); if (mm) mm.remove();
  if (sel === 'base') { if (id === F.quoteId) return; F.baseId = id; }
  else { if (id === F.baseId) return; F.quoteId = id; }
  actualizarBotonesCoin();
  F.precio = null; F.rutas = null;
  (async () => {
    const sy = $('f-total-sym'); if (sy) sy.textContent = '(' + moneda(F.quoteId).simbolo + ')';
    await cargarPrecio();
    if (F.precio) aplicarPreset(F.preset || 'equilibrado');
    refrescarSaldoInversion(); refrescarSaldoCash();
    if (F.tipo === 'cash') previewCash();
    else if (F.tipo === 'dca') refrescarSaldoDCA();
    else if (F.tipo === 'acum') previewAcum();
  })();
}
const BOTMETA = {
  grid: { nom: 'Smart Grid',  img: 'assets/img/bot-grid.webp',       des: 'Compra y vende en niveles; solo cierra cada cuadrícula en ganancia.' },
  acum: { nom: 'Accumulator', img: 'assets/img/bot-acumulador.webp', des: 'Compra en la caída y vende todo junto al llegar a tu ganancia.' },
  cash: { nom: 'Cash Out',    img: 'assets/img/bot-cashout.webp',    des: 'Vende la cripto que ya tienes, al precio o % que elijas.' },
  dca:  { nom: 'DCA',         img: 'assets/img/bot-dca.webp',        des: 'Compra un poco cada cierto tiempo, sin estar pendiente del precio.' }
};
function pintarTipo() {
  const t = F.tipo, noGrid = t !== 'grid';
  if ($('f-grid')) $('f-grid').style.display = t === 'grid' ? '' : 'none';
  if ($('f-acum')) $('f-acum').style.display = t === 'acum' ? '' : 'none';
  if ($('f-cash')) $('f-cash').style.display = t === 'cash' ? '' : 'none';
  if ($('f-dca')) $('f-dca').style.display = t === 'dca' ? '' : 'none';
  // Panel derecho (gráfica/reparto/neto) es solo del Smart Grid.
  ['c-chart', 'c-hint', 'c-asesor'].forEach((id) => { const e = $(id); if (e) e.style.display = noGrid ? 'none' : ''; });
  { const as = $('c-acum-side'); if (as) as.style.display = t === 'acum' ? '' : 'none'; }
  { const cs = $('c-cash-side'); if (cs) cs.style.display = t === 'cash' ? '' : 'none'; }
  { const ds = $('c-dca-side'); if (ds) ds.style.display = t === 'dca' ? '' : 'none'; }
  { const cp = $('c-cash-price'); if (cp) cp.style.display = ''; }   // el precio de ahora sirve en los cuatro bots
  pintarPrecioAhora();
  { const av = $('f-toggleavz'); if (av && av.parentElement) av.parentElement.style.display = t === 'dca' ? 'none' : ''; }
  const prev = document.querySelector(`#${APP} .prev`); if (prev) prev.style.display = noGrid ? 'none' : '';
  const tpsl = $('f-avz-tpsl'); if (tpsl) tpsl.style.display = noGrid ? 'none' : '';
  document.querySelectorAll(`#${APP} #f-tipo button`).forEach((b) => b.classList.toggle('on', b.dataset.tipo === t));
  { const meta = BOTMETA[t]; if (meta) { const img = $('f-foto-img'), tit = $('f-foto-tit'), des = $('f-foto-des'); if (img) { img.classList.remove('nocarga'); img.src = meta.img; } if (tit) tit.textContent = meta.nom; if (des) des.textContent = meta.des; } }
  { const ac = { grid: 'var(--az)', acum: 'var(--mo)', cash: 'var(--gold)', dca: 'var(--ve)' }[t] || 'var(--gold)'; const h = $(APP); if (h) h.style.setProperty('--acento', ac);
    const th = { grid:['#a9d4ff','#4d9fff','#2b7fe0','#1a5bb0','#04213f'], acum:['#dcc0ff','#b47cff','#8f4de0','#6a2fb0','#23064a'], cash:['#f7db8d','#E8B84B','#c79426','#8f6a1a','#3a2800'], dca:['#8ff0bd','#34d97b','#1fae5c','#158043','#05230f'] }[t] || ['#f7db8d','#E8B84B','#c79426','#8f6a1a','#3a2800'];
    if (h) { h.style.setProperty('--ac-l', th[0]); h.style.setProperty('--ac-m', th[1]); h.style.setProperty('--ac-d', th[2]); h.style.setProperty('--ac-s', th[3]); h.style.setProperty('--ac-t', th[4]); } }
  if (t === 'cash') refrescarSaldoCash();
  if (t === 'dca') refrescarSaldoDCA();
  if (t === 'acum') previewAcum(); else if (t === 'cash') previewCash(); else if (t === 'dca') previewDCA(); else actualizarVista();
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
    const botId = Date.now();
    const config = await gb.construirConfigAcumulador(p); config.botId = botId;
    const price = config._Pnow || F.precio || 1;
    const topeQuote = total * 20, topeBase = (total / price) * 20;
    const quoteNeed = mBI(topeQuote, quote.decimals), baseNeed = mBI(topeBase, base.decimals);
    const [aQ, aB] = await Promise.all([gb.allowance(p.quote, cuenta), gb.allowance(p.base, cuenta)]);
    const pasos = (aQ < quoteNeed ? 1 : 0) + (aB < baseNeed ? 1 : 0) + 1; let i = 0;
    if (aQ < quoteNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${quote.simbolo}.</b><br>Para que el bot compre cuando el precio baje.<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.quote, quoteNeed); }
    if (aB < baseNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${base.simbolo}.</b><br>Para que pueda vender todo lo acumulado.<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.base, baseNeed); }
    i++; modalBusy(`<b>Paso ${i} de ${pasos} — Encender.</b><br>Se crea tu acumulador y hace la compra inicial.<br><br>Confirma en tu wallet.`);
    // Cupo: máximo {CUPO_TOTAL} bots y {CUPO_POR_TIPO} de cada tipo.
    const _cupo = await cupoLibre(cuenta, 'acum');
    if (!_cupo.ok) { modalError(_cupo.motivo); return; }
    await gb.crearRejilla(config);
    avisarKeeper(wallet.cuentaActual());
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total, entry: config._Pnow, creadoLocal: Date.now(), tipo: 'acum', objetivo: p.objetivoPct, botId,
      pMin: p.pMin, nivelesAcum: p.niveles, factorAcum: p.factorPct });
    modalDone('¡Acumulador encendido!', `Ya está comprando en la caída en ${base.simbolo}. Venderá todo al llegar a <b>+${num(p.objetivoPct * 100, 1)}%</b>. Ten <b>gas</b> cargado para que opere. Lo verás en "Mis bots".`);
    refrescarRejillas(); refrescarSaldoInversion();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); } else modalError(e?.shortMessage || e?.message || String(e));
  }
}
const RESERVA_BNB = 0.0015;  // se deja un poco de BNB nativo para el gas de las firmas (~$1)
function maxCash() {
  const bal = F.saldoBase || 0;
  return gb.esBNB(gb.dirDe(moneda(F.baseId))) ? Math.max(0, bal - RESERVA_BNB) : bal;
}
function pintarSlider(pct) {
  const sl = $('fc-slider'); if (!sl) return;
  const p = Math.max(0, Math.min(100, pct));
  sl.value = p;
  sl.style.setProperty('--fill', p + '%');
}
function setCantCash(v) {
  const inp = $('fc-cant'); if (!inp) return;
  const mx = maxCash(); if (v > mx) v = mx;
  inp.value = v > 0 ? Number(v.toPrecision(8)) : '';
  previewCash();
}
/** Rellena la tarjeta de "precio ahora". Vale para los cuatro bots.
 *  Antes solo la rellenaban Cash Out y DCA: en Smart Grid y Acumulador
 *  la tarjeta salía, pero vacía. */
function pintarPrecioAhora() {
  const cpv = $('cash-price-val'), cpp = $('cash-price-pair');
  if (!cpv && !cpp) return;
  const simB = moneda(F.baseId).simbolo, simQ = moneda(F.quoteId).simbolo;
  if (cpp) cpp.textContent = simB + ' / ' + simQ;
  if (cpv) cpv.textContent = F.precio > 0 ? precioFmt(F.precio) + ' ' + simQ : '—';
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
  const cpv = $('cash-price-val'), cpp = $('cash-price-pair');
  if (cpp) cpp.textContent = simB + ' / ' + simQ;
  if (cpv) cpv.textContent = F.precio ? precioFmt(F.precio) + ' ' + simQ : '—';
  const usd = $('fc-cant-usd'); if (usd) usd.textContent = (cant > 0 && F.precio) ? '≈ ' + num(cant * F.precio, 2) + ' ' + simQ : '';
  const mx = maxCash(); pintarSlider(mx > 0 ? (cant / mx * 100) : 0);
  const setT = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  if (cant > 0 && targetPrice > 0 && F.precio) {
    const valor = cant * F.precio, proceeds = cant * targetPrice, g = proceeds - valor;
    setT('fc-p-cant', num(cant, 6) + ' ' + simB);
    setT('fc-p-valor', num(valor, 2) + ' ' + simQ);
    setT('fc-p-recibe', num(proceeds, 2) + ' ' + simQ);
    // Lo que se lleva la red y el exchange al vender, para que no sorprenda.
    const comision = proceeds * 0.0005 + GAS_VUELTA_USD / 2;
    setT('fc-p-com', '≈ ' + num(comision, 3) + ' ' + simQ);
    const neto = g - comision;
    const gan = $('fc-p-gan');
    if (gan) { gan.textContent = (neto >= 0 ? '+' : '') + num(neto, 2) + ' ' + simQ; gan.className = neto >= 0 ? 'pos' : 'neg'; }
  } else {
    setT('fc-p-com', '—');
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
    const balBI = await gb.saldoCashDisponible(p.base, cuenta);
    const balH = Number(gb.fmt(balBI, base.decimals));
    if (cantidad > balH + 1e-9) { modalError(`No tienes suficiente ${base.simbolo}. En tu wallet hay ${num(balH, 6)} ${base.simbolo} y quieres vender ${num(cantidad, 6)}.`); return; }
    if (!(await asegurarSuscripcion(cuenta))) { modalClose(); return; }
    modalBusy('Preparando tu Cash Out con el precio real…');
    const botId = Date.now();
    const config = await gb.construirConfigCashOut(p); config.botId = botId;
    const baseNeed = mBI(cantidad * 3, base.decimals);
    // Paso: convertir BNB -> WBNB si hace falta (firma aparte)
    if (gb.esBNB(p.base)) {
      const wbnbBal = await gb.balanceToken(p.base, cuenta);
      const wbnbH = Number(gb.fmt(wbnbBal, base.decimals));
      if (cantidad > wbnbH + 1e-12) {
        const falta = cantidad - wbnbH;
        await pasoWallet('Preparar tu BNB', `Se convierte <b>${num(falta, 6)} BNB</b> a WBNB para poder venderlo (sigue siendo tuyo).<br><br>Toca <b>Continuar</b> y firma en tu wallet.`);
        modalBusy('Convirtiendo tu BNB… firma en tu wallet.');
        await gb.envolverBNB(mBI(falta * 1.001, base.decimals));
      }
    }
    // Paso: permiso si hace falta (firma aparte)
    const aB = await gb.allowance(p.base, cuenta);
    if (aB < baseNeed) {
      await pasoWallet('Dar permiso', `Le das permiso al bot para vender tus <b>${base.simbolo}</b> cuando llegue el objetivo (puedes revocarlo cuando quieras).<br><br>Toca <b>Continuar</b> y firma en tu wallet.`);
      modalBusy('Registrando el permiso… firma en tu wallet.');
      await gb.aprobarToken(p.base, baseNeed);
    }
    // Paso final: encender (firma aparte)
    await pasoWallet('Encender el bot', 'Última firma: se crea tu Cash Out y queda vigilando el precio.<br><br>Toca <b>Continuar</b> y confirma en tu wallet.');
    modalBusy('Encendiendo tu bot… firma en tu wallet.');
    // Cupo: máximo {CUPO_TOTAL} bots y {CUPO_POR_TIPO} de cada tipo.
    const _cupo = await cupoLibre(cuenta, 'cash');
    if (!_cupo.ok) { modalError(_cupo.motivo); return; }
    await gb.crearRejilla(config);
    avisarKeeper(wallet.cuentaActual());
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total: config._valorActual, cantBase: cantidad, entry: config._Pnow, creadoLocal: Date.now(), tipo: 'cash', targetPrice, botId });
    modalDone('¡Cash Out encendido!', `Cuando ${base.simbolo} llegue a <b>${precioFmt(targetPrice)}</b>, venderá y recibirás ${quote.simbolo} en tu wallet. Ten <b>gas</b> cargado para que pueda operar. Lo verás en "Mis bots".`);
    refrescarRejillas();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); } else modalError(e?.shortMessage || e?.message || String(e));
  }
}
function frecNombre(s) {
  return s <= 86400 ? 'cada día' : s <= 604800 ? 'cada semana' : s <= 1209600 ? 'cada 15 días' : 'cada mes';
}
async function refrescarSaldoDCA() {
  const el = $('fd-saldo'); if (!el) return;
  const cuenta = wallet.cuentaActual(); if (!cuenta) { el.textContent = ''; return; }
  const quote = moneda(F.quoteId);
  try {
    const bal = await gb.balanceToken(gb.dirDe(quote), cuenta);
    el.textContent = `Tienes ${num(Number(gb.fmt(bal, quote.decimals)), 2)} ${quote.simbolo}`;
  } catch { el.textContent = ''; }
  previewDCA();
}
function previewDCA() {
  const simB = moneda(F.baseId).simbolo, simQ = moneda(F.quoteId).simbolo;
  const dnb = $('dn-b'), dnq = $('dn-q'); if (dnb) dnb.textContent = simB; if (dnq) dnq.textContent = simQ;
  const est = $('fd-p-est'); if (est) est.textContent = simQ;
  const monto = parseFloat($('fd-monto')?.value) || 0;
  const intervalo = F.dcaFrec || 604800, comprasMax = F.dcaNum || 0;
  const eq = $('fd-monto-eq'); if (eq) eq.textContent = (monto > 0 && F.precio) ? '≈ ' + num(monto / F.precio, 6) + ' ' + simB : '';
  const cada = $('fd-p-cada'); if (cada) cada.textContent = monto > 0 ? `${num(monto, 2)} ${simQ} ${frecNombre(intervalo)}` : '—';
  const tot = $('fd-p-total'); if (tot) tot.textContent = monto > 0 ? (comprasMax > 0 ? `${num(monto * comprasMax, 2)} ${simQ} (${comprasMax} compras)` : 'Sin límite') : '—';
  const pr = $('fd-p-precio'); if (pr) pr.textContent = F.precio ? precioFmt(F.precio) + ' ' + simQ : '—';
  const cpv = $('cash-price-val'), cpp = $('cash-price-pair');
  if (cpp) cpp.textContent = simB + ' / ' + simQ;
  if (cpv) cpv.textContent = F.precio ? precioFmt(F.precio) + ' ' + simQ : '—';
}
async function onCrearDCA() {
  const m = $('c-msg'); const base = moneda(F.baseId), quote = moneda(F.quoteId);
  const cuenta = wallet.cuentaActual();
  const monto = parseFloat($('fd-monto')?.value) || 0;
  if (!(monto > 0)) { aviso(m, 'err', '¿Cuánto quieres comprar en cada compra?'); return; }
  if (!F.precio) { aviso(m, 'err', 'Espera a que cargue el precio y vuelve a intentar.'); return; }
  const intervalo = F.dcaFrec || 604800, comprasMax = F.dcaNum || 0;
  const p = {
    base: gb.dirDe(base), quote: gb.dirDe(quote), decBase: base.decimals, decQuote: quote.decimals,
    montoQuote: monto, intervalo, comprasMax, slippageBps: 0, rutas: F.rutas
  };
  const totalTxt = comprasMax > 0 ? `${num(monto * comprasMax, 2)} ${quote.simbolo} en ${comprasMax} compras` : `sin límite (según el ${quote.simbolo} que tengas)`;
  const ok = await modalConfirm({
    titulo: 'Encender DCA',
    cuerpo: `El bot comprará <b>${num(monto, 2)} ${quote.simbolo}</b> de <b>${base.simbolo}</b> <b>${frecNombre(intervalo)}</b>. La primera compra se hace ahora mismo.<br><br>Total: <b>${totalTxt}</b>. Ten <b>${quote.simbolo}</b> cargado en tu wallet para las siguientes.`,
    ok: 'Sí, encender'
  });
  if (!ok) return;
  try {
    modalBusy('Comprobando tu saldo…');
    const balH = Number(gb.fmt(await gb.balanceToken(p.quote, cuenta), quote.decimals));
    if (monto > balH + 1e-9) { modalError(`No tienes suficiente ${quote.simbolo} para la primera compra. En tu wallet hay ${num(balH, 2)} ${quote.simbolo}.`); return; }
    if (!(await asegurarSuscripcion(cuenta))) { modalClose(); return; }
    modalBusy('Preparando tu DCA con el precio real…');
    const botId = Date.now();
    const config = await gb.construirConfigDCA(p); config.botId = botId;
    const nAprob = comprasMax > 0 ? comprasMax : 60;
    const quoteNeed = mBI(monto * nAprob, quote.decimals);
    const aQ = await gb.allowance(p.quote, cuenta);
    const pasos = (aQ < quoteNeed ? 1 : 0) + 1; let i = 0;
    if (aQ < quoteNeed) { i++; modalBusy(`<b>Paso ${i} de ${pasos} — Permiso de ${quote.simbolo}.</b><br>Le das permiso al bot para comprar con tus ${quote.simbolo} en cada ciclo (puedes revocarlo cuando quieras).<br><br>Confirma en tu wallet.`); await gb.aprobarToken(p.quote, quoteNeed); }
    i++; modalBusy(`<b>Paso ${i} de ${pasos} — Encender.</b><br>Se crea tu DCA y hace la primera compra ahora.<br><br>Confirma en tu wallet.`);
    // Cupo: máximo {CUPO_TOTAL} bots y {CUPO_POR_TIPO} de cada tipo.
    const _cupo = await cupoLibre(cuenta, 'dca');
    if (!_cupo.ok) { modalError(_cupo.motivo); return; }
    await gb.crearRejilla(config);
    avisarKeeper(wallet.cuentaActual());
    recordarPar(cuenta, config.base, config.quote, { decQuote: quote.decimals, decBase: base.decimals, simBase: base.simbolo, simQuote: quote.simbolo, total: monto, entry: config._Pnow, creadoLocal: Date.now(), tipo: 'dca', intervalo, comprasMax, botId });
    modalDone('¡DCA encendido!', `Comprará ${num(monto, 2)} ${quote.simbolo} de ${base.simbolo} ${frecNombre(intervalo)}. La primera compra ya se hizo. Ten <b>gas</b> cargado y <b>${quote.simbolo}</b> en tu wallet. Lo verás en "Mis bots".`);
    refrescarRejillas();
  } catch (e) {
    if (esRechazo(e)) { modalClose(); } else modalError(e?.shortMessage || e?.message || String(e));
  }
}
function ccl(cuenta, base, quote) { return `${(cuenta || '').toLowerCase()}|${base.toLowerCase()}|${quote.toLowerCase()}`; }
function recordarPar(cuenta, base, quote, extra) {
  const botId = (extra && extra.botId) || 0;
  const k = gb.claveBot(cuenta, base, quote, botId);
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  m[k] = { base, quote, ...(extra || {}) }; localStorage.setItem('bot-pares', JSON.stringify(m));
  // al (re)crear, quitar ESTA clave de las cerradas para que se muestre
  const c = JSON.parse(localStorage.getItem('bot-cerradas') || '{}'); delete c[k]; localStorage.setItem('bot-cerradas', JSON.stringify(c));
}
function olvidarPar(cuenta, clave) {
  const m = JSON.parse(localStorage.getItem('bot-pares') || '{}');
  delete m[clave]; localStorage.setItem('bot-pares', JSON.stringify(m));
  // marcar ESA clave como cerrada (no toca los demás bots del mismo par)
  const c = JSON.parse(localStorage.getItem('bot-cerradas') || '{}'); c[clave] = 1; localStorage.setItem('bot-cerradas', JSON.stringify(c));
}
function simboloDe(addr) {
  if (!addr) return '—';
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
  try { const r = await gb.operacionesDe(cuenta, par.base, par.quote, decB, decQ); st.ops = r.ops || r || []; } catch { st.ops = []; }
  await muestrear();
  st.timer = setInterval(muestrear, 6000);
}

function tarjetaMinima(clave, par, err, R) {
  const pair = (R && R.base) ? `${simboloDe(R.base)}/${simboloDe(R.quote)}` : ((par && par.base) ? `${par.simBase}/${par.simQuote}` : '');
  const estado = R ? (R.activa ? 'activo' : 'inactivo') : 'sin resumen';
  const emsg = err ? (err.shortMessage || err.message || String(err)) : (R ? '' : 'resumenK falló');
  const diag = `estado: ${estado} · ${clave ? clave.slice(0, 10) + '…' : ''}${emsg ? ' · ' + emsg.slice(0, 100) : ''}`;
  return `<div class="rej" style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="min-width:0">
        <div style="font-family:var(--display);color:var(--gold);font-size:15px;font-weight:700">Bot${pair ? ' · ' + pair : ''}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--ink-3);margin-top:5px;line-height:1.4">No se pudieron leer todos sus detalles. Puedes cerrarlo aquí; tu cripto queda en tu wallet.</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--ink-3);opacity:.7;margin-top:6px;word-break:break-all">${diag}</div>
      </div>
      <button class="btn btn-rojo" style="width:auto;padding:11px 16px;white-space:nowrap" data-min-cancel="${clave}">Cerrar bot</button>
    </div>
  </div>`;
}
function wireMinCancel(cont) {
  cont.querySelectorAll('[data-min-cancel]').forEach((btn) => btn.onclick = async () => {
    const clave = btn.dataset.minCancel;
    const ok = await modalConfirm({ titulo: 'Cerrar bot', cuerpo: 'Se cerrará este bot y se quita el permiso. <b>Tu cripto se queda en tu wallet.</b>', ok: 'Sí, cerrar', peligro: true });
    if (!ok) return;
    try { modalBusy('Cerrando el bot… confirma en tu wallet.'); await gb.cancelarRejillaK(clave); modalClose(); refrescarRejillas(); }
    catch (e) { modalError(esRechazo(e) ? 'Cancelaste la firma.' : (e?.shortMessage || e?.message || String(e))); }
  });
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
      if (cerradas[clave]) continue; // ocultado local (mismo navegador)
      // Estado real en el contrato: si el bot está inactivo (cancelado), no se muestra.
      let R = null;
      try { R = await gb.resumenK(clave); } catch (_) {}
      if (R && R.activa === false) continue;   // bot cancelado/inactivo → fuera
      let par = store[clave];
      if (!par) par = { tipo: 'grid', reconstruido: true };   // tarjeta saca el par del resumen (R.base/R.quote)
      par.__cuenta = cuenta;
      // NUNCA ocultar un bot en silencio: si el detalle falla, tarjeta mínima gestionable.
      try { cards.push(await tarjeta(cuenta, clave, par, R)); }
      catch (e) { cards.push(tarjetaMinima(clave, par, e, R)); }
    }
    cont.innerHTML = cards.length ? cards.join('')
      : `<div class="vacio-ok">
          <div class="vacio-ico"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div>
          <div class="vacio-t">Todavía no tienes bots</div>
          <div class="vacio-d">Cuando enciendas uno, aparecerá aquí con su marcha y sus resultados.</div>
          <button class="vacio-b" id="c-ir-crear">Crear mi primer bot</button>
          <div class="vacio-p">¿Tenías bots creados? Puede que estén con otra cuenta: revisa cuál tienes activa en tu wallet.</div>
        </div>`;
    const irC = $('c-ir-crear');
    if (irC) irC.onclick = () => { const t = document.querySelector('#colmena-app .bot-tab'); if (t) { t.click(); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
    pintarCupo(cuenta);
    const bct = $('c-cerrar-todos');
    if (bct) bct.onclick = () => cerrarTodosLosBots(cuenta);
    enganchar(cuenta);
    wireMinCancel(cont);
    activarContadores();
  } catch (e) {
    console.warn('[Aurex] detalle técnico:', e);
    cont.innerHTML = `<div class="vacio-ok"><div class="vacio-t">No pudimos leer tus bots ahora mismo</div><div class="vacio-d">La red está lenta o hubo un corte momentáneo. Tus bots y tu dinero siguen intactos en la blockchain.</div><button class="vacio-b" onclick="location.reload()">Reintentar</button></div>`;
  }
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
    const clave = card.dataset.clave;
    const decB = Number(card.dataset.decb) || 18, decQ = Number(card.dataset.decq) || 18;
    const invertido = Number(card.dataset.total) || 0;
    try {
      const R = await gb.resumenK(clave);
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
  if (!addr) return null;
  if (addr.toLowerCase() === gb.WBNB.toLowerCase()) return 'BNB';
  const e = Object.entries(MONEDAS).find(([, v]) => (v.address || '').toLowerCase() === addr.toLowerCase());
  return e ? e[0] : null;
}
async function tarjeta(cuenta, clave, par, R) {
  if (!R) R = await gb.resumenK(clave);
  const bAddr = par.base || R.base, qAddr = par.quote || R.quote;
  const mbT = monedaPorDir(bAddr), mqT = monedaPorDir(qAddr);
  const decQ = par.decQuote ?? mqT?.decimals ?? 18, decB = par.decBase ?? mbT?.decimals ?? 18;
  const simB = (par.simBase && par.simBase !== '?') ? par.simBase : (mbT?.simbolo || simboloDe(bAddr));
  const simQ = (par.simQuote && par.simQuote !== '?') ? par.simQuote : (mqT?.simbolo || simboloDe(qAddr));
  if (GASMIN === null) { try { GASMIN = await gb.gasMinOp(); } catch { GASMIN = 0n; } }

  // Niveles (órdenes) + precio
  let precio = null, pmin = 0, pmax = 0, ps = [];
  const ordenBaseH = Number(gb.fmt(R.ordenBase, decB)) || 1;
  const ordenQuoteH = Number(gb.fmt(R.ordenQuote, decQ)) || 0;
  try {
    const niveles = await gb.nivelesDe(clave);
    ps = niveles.map((nv) => {
      const est = Number(nv.estado);
      // El precio sale del dato de VENTA o, si no lo hay (cuadrículas de compra
      // del Acumulador), del dato de COMPRA. Antes solo se miraba el de venta,
      // y por eso el Acumulador no mostraba ninguna cuadrícula.
      let p = Number(gb.fmt(nv.minOutVenta, decQ)) / ordenBaseH;
      if (!(p > 0) && ordenQuoteH > 0) {
        const outC = Number(gb.fmt(nv.minOutCompra, decB));
        if (outC > 0) p = ordenQuoteH / outC;
      }
      return { p, tipo: est === 1 ? 'compra' : est === 2 ? 'venta' : 'off' };
    }).filter((x) => isFinite(x.p) && x.p > 0);

    // ACUMULADOR: cada cuadrícula gasta una cantidad distinta, así que el precio
    // no se puede deducir del contrato. Lo reconstruimos con la configuración
    // que guardamos al crearlo: reparto geométrico entre el mínimo y la entrada.
    // Si es un acumulador antiguo (sin esa configuración), preferimos no pintar
    // cuadrículas a pintarlas mal: se verán solo la entrada y la salida.
    if (par.tipo === 'acum' && !(par.pMin > 0 && par.nivelesAcum >= 1)) ps = [];
    // DCA: compra por TIEMPO, no por precio. No tiene cuadrículas que dibujar;
    // lo útil es ver a qué precios ya compró y su precio medio.
    if (par.tipo === 'dca') ps = [];
    if ((par.tipo === 'acum') && par.pMin > 0 && par.entry > 0 && par.nivelesAcum >= 1) {
      const nA = Number(par.nivelesAcum), pTop = Number(par.entry) * 0.999, pM = Number(par.pMin);
      if (pTop > pM) {
        const hechos = Number(R.comprasHechas || 0);
        ps = Array.from({ length: nA }, (_, i) => {
          const t = nA === 1 ? 1 : i / (nA - 1);
          return { p: pM * Math.pow(pTop / pM, t), tipo: i >= nA - hechos ? 'off' : 'compra' };
        });
      }
    }
    try { const pr = await gb.precioPar(bAddr, qAddr, decB, decQ); precio = pr.precio; } catch {}
    if (ps.length) { pmin = Math.min(...ps.map((x) => x.p)); pmax = Math.max(...ps.map((x) => x.p)); }
  } catch {}
  // Objetivo de salida del Acumulador (el % al que vende todo de golpe)
  let objBps = 0;
  try { const md = await gb.modoDe(clave); objBps = Number(Array.isArray(md) ? md[1] : 0) || 0; } catch (_) {}
  let ops = [], sinHistorial = false;
  try { const r = await gb.operacionesDe(cuenta, bAddr, qAddr, decB, decQ); ops = r.ops || r || []; sinHistorial = r.error === 'sin-historial'; } catch {}
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
  const gas = Number(gb.fmtBNB(R.gasSaldoWei)).toFixed(5);   // 5 decimales: con 4, 0.00396 salía 0.0040 y parecía que no cambiaba
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
  const nombreBot = tipo === 'cash' ? 'Bot Cash Out' : tipo === 'acum' ? 'Bot Accumulator' : tipo === 'dca' ? 'Bot DCA' : 'Bot Smart Grid';
  const invLabel = tipo === 'cash' ? simB : simQ;
  const invValue = tipo === 'cash' ? num((par.cantBase != null ? Number(par.cantBase) : posBase), 6) : num(invertido, 2);
  const _entValida = par.entry != null && precioFmt(par.entry) !== '—';
  // Dos datos distintos, cada uno con su nombre claro. Antes ponía
  // "Entrada → Ahora" y, si no había precio de entrada, cambiaba a "Precio
  // ahora": el cartel bailaba y no se entendía qué era cada número.
  // Una sola casilla: el precio al que entraste y cuánto se ha movido desde
  // entonces. Tener otra con el precio de mercado repetía el mismo dato.
  const _boxEntrada = _entValida
    ? `<div class="pio-box" data-box="entrada"><div class="k">Precio de entrada</div><div class="v" style="font-size:15px">${precioFmt(par.entry)}</div><div class="v2 ${mkt == null ? '' : cls(mkt)}" style="${mkt == null ? 'color:var(--ink-3)' : ''}">${mkt == null ? 'al crear el bot' : 'ahora ' + precioFmt(precio) + ' · ' + sg(mkt) + num(Math.abs(mkt), 2) + '%'}</div></div>`
    : `<div class="pio-box" data-box="entrada"><div class="k">Precio del mercado</div><div class="v" style="font-size:15px">${precioFmt(precio)}</div><div class="v2" style="color:var(--ink-3)">ahora mismo</div></div>`;
  const _boxFlotante = `<div class="pio-box" data-box="flotante"><div class="k">Flotante ${iBtn('ganancia')}</div><div class="v ${cls(noRealizado)}">${sg(noRealizado)}${num(Math.abs(noRealizado), 4)}</div><div class="v2 ${cls(noRealizado)}">${sg(pct(noRealizado))}${num(Math.abs(pct(noRealizado)), 2)}%</div></div>`;
  const _boxGas = `<div class="pio-box" data-box="gas"><div class="k">Gas (BNB)</div><div class="v ${gasLow ? 'neg' : ''}">${gas}</div><div class="v2" style="color:var(--ink-3)">para operar</div></div>`;
  const _boxGrid = `<div class="pio-box" data-box="realizado"><div class="k">Grid profit ${iBtn('porcuad')}</div><div class="v ${cls(realizado)} numgo" data-to="${Math.abs(realizado)}" data-dec="4" data-pre="${sg(realizado)}">${sg(realizado)}${num(Math.abs(realizado), 4)}</div><div class="v2 ${cls(realizado)}">${sg(pct(realizado))}${num(Math.abs(pct(realizado)), 2)}%</div></div>`;
  const _boxRango = `<div class="pio-box"><div class="k">Rango (${simQ})</div><div class="v" style="font-size:13px">${precioFmt(pmin)} – ${precioFmt(pmax)}</div><div class="v2" style="color:var(--ink-3)">${R.niveles} cuadrículas</div></div>`;
  const _boxVueltas = `<div class="pio-box" data-box="vueltas"><div class="k">Vueltas / Ops ${iBtn('vueltas')}</div><div class="v numgo" data-to="${Number(R.ciclos)}" data-dec="0">${R.ciclos}</div><div class="v2" style="color:var(--ink-3)">${R.totalOps} operaciones</div></div>`;
  const _boxMedio = `<div class="pio-box" data-box="medio"><div class="k">Precio medio ${iBtn('promedio')}</div><div class="v" style="font-size:14px">${posBase > 0 ? precioFmt(costeQ / posBase) : '—'}</div><div class="v2" style="color:var(--ink-3)">tu coste</div></div>`;
  const _boxObjetivo = `<div class="pio-box"><div class="k">Objetivo</div><div class="v" style="font-size:14px">${par.targetPrice ? precioFmt(Number(par.targetPrice)) : '—'}</div><div class="v2" style="color:var(--ink-3)">precio de venta</div></div>`;
  const _interv = Number(par.intervalo || R.intervalo || 0);
  const _restante = (Number(R.ultimaOpEn) || 0) + _interv - Math.floor(Date.now() / 1000);
  const _proxTxt = _interv <= 0 ? '—' : _restante <= 0 ? 'pronto' : _restante < 3600 ? 'en ' + Math.ceil(_restante / 60) + ' min' : _restante < 86400 ? 'en ' + Math.ceil(_restante / 3600) + ' h' : 'en ' + Math.ceil(_restante / 86400) + ' días';
  const _cmax = Number(par.comprasMax || R.comprasMax || 0);
  const _boxProxima = `<div class="pio-box"><div class="k">Próxima compra</div><div class="v" style="font-size:15px">${_proxTxt}</div><div class="v2" style="color:var(--ink-3)">${frecNombre(_interv)}</div></div>`;
  const _boxCompras = `<div class="pio-box"><div class="k">Compras hechas</div><div class="v">${Number(R.comprasHechas)}${_cmax > 0 ? ' / ' + _cmax : ''}</div><div class="v2" style="color:var(--ink-3)">${_cmax > 0 ? 'de tu plan' : 'sin límite'}</div></div>`;
  const _boxPosicion = `<div class="pio-box"><div class="k">Posición (${simB})</div><div class="v" style="font-size:15px">${num(posBase, 6)}</div><div class="v2" style="color:var(--ink-3)">acumulado</div></div>`;
  let _boxes;
  if (tipo === 'cash') _boxes = _boxEntrada + _boxObjetivo;
  else if (tipo === 'dca') _boxes = _boxProxima + _boxCompras + _boxMedio + _boxPosicion + _boxFlotante + _boxGas;
  else if (tipo === 'acum') _boxes = _boxGrid + _boxFlotante + _boxEntrada + _boxMedio + _boxVueltas + _boxGas;
  else _boxes = _boxGrid + _boxFlotante + _boxEntrada + _boxRango + _boxVueltas + _boxGas;
  const _compartir = `<button class="pio-img" data-acc="historial" title="Descargar todas las operaciones del bot">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg><span>Historial</span></button>`;
  const _panel = `<div class="pio-acciones"><button class="pio-toggle" data-acc="toggle-panel">Ver el bot trabajando ▾</button>${_compartir}</div>
    <div class="pio-panel" data-clave="${clave}" data-gan="${(realizado + noRealizado).toFixed(6)}" data-pct="${baseInv > 0 ? (((realizado + noRealizado) / baseInv) * 100).toFixed(2) : 0}" data-dias="${Math.max(1, Math.floor(creadoSeg / 86400))}" data-vueltas="${Number(R.ciclos)}" data-inv="${baseInv}" data-nombre="${nombreBot}" data-creado="${creadoSeg}" data-tipo="${tipo}" data-ciclos="${Number(R.ciclos)}">
      <div class="pio-tabs"><button data-tab="grafica" class="on">Gráfica</button><button data-tab="ordenes">Órdenes (${ps.length})</button></div>
      <div class="tab-grafica">
        ${grafica.bloqueGrafica({
          simB, simQ, pmin, pmax, precio, decQ, tipo,
          precioMedio: (posBase > 0 && costeQ > 0) ? (costeQ / posBase) : 0,
          objetivoBps: objBps,
          compras: (tipo === 'dca')
            ? [...new Set(ops.filter((o) => o.compra).map((o) => Number(o.precio.toFixed(8))))].slice(-12)
            : [],
          niveles: ps.map((x) => ({ precio: x.p, estado: x.tipo === 'compra' ? 1 : (x.tipo === 'venta' ? 2 : 0) })),
          // Las operaciones YA ejecutadas, para pintarlas sobre su vela
          operaciones: ops.filter((o) => o.tiempo > 0),
          creado: creadoSeg
        })}
        ${sinHistorial ? '<div class="graf-aviso">No pudimos leer el historial de operaciones ahora mismo. Las líneas y el rango sí son reales; las flechas de compra y venta aparecerán cuando la red responda.</div>' : ''}

        <div class="leg">
          <span><svg class="lg-i" viewBox="0 0 12 12"><path d="M6 1.5 10.5 8H1.5z" fill="#2ee86a"/></svg>compró</span>
          <span><svg class="lg-i" viewBox="0 0 12 12"><path d="M6 10.5 1.5 4h9z" fill="#f6465d"/></svg>vendió</span>
          <span><svg class="lg-i" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4" fill="#E8B84B"/></svg>empezó aquí</span>
          <span><svg class="lg-i" viewBox="0 0 14 12"><path d="M0 6h14" stroke="#2ee86a" stroke-width="1.6" stroke-dasharray="3 2"/></svg>espera comprar</span>
          <span><svg class="lg-i" viewBox="0 0 14 12"><path d="M0 6h14" stroke="#f6465d" stroke-width="1.6" stroke-dasharray="3 2"/></svg>espera vender</span>
        </div></div>
      <div class="tab-ordenes" style="display:none"><div class="ord-list">${ordRows}</div></div>
    </div>`;

  return `<div class="rej" data-b="${bAddr}" data-q="${qAddr}" data-sq="${simQ}" data-sb="${simB}"
     data-bid="${idDe(bAddr) || ''}" data-qid="${idDe(qAddr) || ''}" data-pmin="${pmin}" data-pmax="${pmax}"
     data-niv="${R.niveles}" data-total="${invertido}" data-decb="${decB}" data-decq="${decQ}" data-entry="${par.entry || ''}" data-tipo="${par.tipo || 'grid'}" data-cant="${par.cantBase != null ? par.cantBase : ''}" data-clave="${clave}">
    <div class="pio-head">
      ${logoDe(bAddr, simB)}
      <div class="pio-titles">
        <div class="pio-pair">${simB}/${simQ}</div>
        <div class="pio-sub"><span class="pio-time" data-since="${creadoSeg}">${tiempoActivo(creadoSeg)}</span><span class="pio-op"> · ${R.activa ? '<span class="dot"></span>operando' : 'detenido'}</span></div>
      </div>
      <div class="pio-tags"><span class="pio-tag share" data-share>↗<span class="lbl"> Compartir</span></span><span class="pio-tag">LONG</span><span class="pio-tag grey">Spot</span></div>
    </div>
    <div class="pio-nombre">${nombreBot}</div>

    <div class="pio-band">
      <div class="l"><div class="k">Inversión <span class="cur">(${invLabel})</span></div><div class="v">${invValue}</div></div>
      <div class="r ${totalG < 0 ? 'neg' : ''}"><div class="k">Ganancia <span class="tot">total </span><span class="cur">(${simQ})</span></div>
        <div class="v numgo" data-to="${Math.abs(totalG)}" data-dec="4" data-pre="${sg(totalG)}">${sg(totalG)}${num(Math.abs(totalG), 4)}</div>
        <div class="pct">(${sg(pct(totalG))}${num(Math.abs(pct(totalG)), 2)}%)</div></div>
    </div>

    <div class="pio-grid"${tipo === 'cash' ? ' style="grid-template-columns:repeat(2,1fr)"' : ''}>${_boxes}</div>
    ${gasLow ? `<div class="gaswarn">⚠ Gas insuficiente: el bot no puede operar. Recarga BNB en el gas (arriba) para que empiece a comprar y vender.</div>` : ''}
    ${sinPos && !gasLow ? `<div class="gaswarn" style="background:rgba(232,184,75,.08);border-color:var(--gold-soft);color:var(--gold)"><svg class="gw-i" viewBox="0 0 14 14" aria-hidden="true"><circle cx="7" cy="7" r="5.6" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".35"/><path d="M7 2.6a4.4 4.4 0 0 1 4.4 4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 7 7" to="360 7 7" dur="1.1s" repeatCount="indefinite"/></path></svg>Tomando posición inicial… El bot está comprando su primera parte a mercado (el keeper la ejecuta en 1–2 min). En cuanto compre, verás aquí la ganancia moverse con el mercado.</div>` : ''}

    ${_panel}

    <div class="rej-btns" style="grid-template-columns:1fr">
      <button class="btn-oro3d" data-acc="terminar">${(tipo === 'cash' || tipo === 'dca') ? 'Suspender' : 'Cerrar y vender'}</button>
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
  try { await document.fonts.ready; } catch (_) {}
  const tipo = card.dataset.tipo || 'grid';
  const meta = BOTMETA[tipo] || BOTMETA.grid;
  const txt = (sel) => card.querySelector(sel)?.textContent?.trim() || '';
  const sb = card.dataset.sb || '', sq = card.dataset.sq || '';
  const pair = (sb && sq) ? `${sb}/${sq}` : 'MI BOT';
  const nombre = txt('.pio-nombre') || meta.nom;
  const invLab = txt('.pio-band .l .k') || 'Inversión';
  const inv = txt('.pio-band .l .v') || '—';
  const ganEl = card.querySelector('.pio-band .r');
  const gan = ganEl?.querySelector('.v')?.textContent?.trim() || '—';
  const pct = ganEl?.querySelector('.pct')?.textContent?.trim() || '';
  const neg = ganEl?.classList.contains('neg');
  const bid = card.dataset.bid || '';
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const _since = Number(card.querySelector('.pio-time')?.dataset.since || 0);
  let activo = '';
  if (_since > 0) { let s = Math.floor(Date.now() / 1000 - _since); if (s < 0) s = 0; const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const mm = Math.floor(s / 60); activo = (d > 0 ? d + 'd ' : '') + (d > 0 || h > 0 ? h + 'h ' : '') + mm + 'm'; }
  const acento = { grid: '#4d9fff', acum: '#b47cff', cash: '#e8b84b', dca: '#34d97b' }[tipo] || '#e8b84b';
  const DISPLAY = '"Chakra Petch", "Trebuchet MS", sans-serif', MONO = '"IBM Plex Mono", ui-monospace, monospace';

  const loadImg = (src, cross) => new Promise((res) => { if (!src) return res(null); const im = new Image(); if (cross) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  // Logo oficial: Trust Wallet (permite CORS -> dibujable en canvas); si falla, CoinGecko.
  const addr = moneda(bid)?.address;
  const twBase = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain';
  const twUrl = addr ? `${twBase}/assets/${addr}/logo.png` : `${twBase}/info/logo.png`;
  let coinImg = await loadImg(twUrl, true);
  if (!coinImg && LOGOS[bid]?.img) coinImg = await loadImg(LOGOS[bid].img, true);
  const botImg = await loadImg(meta.img, false);

  const W = 1080, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const shadow = (b = 16, oy = 3) => { g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = b; g.shadowOffsetY = oy; };
  const noShadow = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; };

  // Puntas doradas con efecto biselado (bicolor, tipo punta de flecha): cada esquina se
  // parte en diagonal — una cara clara y una oscura — para que no se vea plana.
  g.fillStyle = '#c79426'; g.fillRect(0, 0, W, H);
  const RB = 60, claro = '#fbe8a8', oscuro = '#9a6d18', filo = '#6f4f12';
  const bisel = (cx, cy, dx, dy) => {
    g.fillStyle = claro; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dx * RB, cy); g.lineTo(cx + dx * RB, cy + dy * RB); g.closePath(); g.fill();
    g.fillStyle = oscuro; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy + dy * RB); g.lineTo(cx + dx * RB, cy + dy * RB); g.closePath(); g.fill();
    g.strokeStyle = filo; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dx * RB, cy + dy * RB); g.stroke();
  };
  bisel(0, 0, 1, 1); bisel(W, 0, -1, 1); bisel(0, H, 1, -1); bisel(W, H, -1, -1);

  rr(0, 0, W, H, 48); g.clip();   // esquinas redondeadas de TODA la imagen

  if (botImg) {
    const ir = botImg.width / botImg.height, cr = W / H; let dw, dh, dx, dy;
    if (ir > cr) { dh = H; dw = H * ir; dx = (W - dw) / 2; dy = 0; } else { dw = W; dh = W / ir; dx = 0; dy = (H - dh) / 2; }
    g.drawImage(botImg, dx, dy, dw, dh);
  } else { const bgg = g.createLinearGradient(0, 0, W, H); bgg.addColorStop(0, '#20262f'); bgg.addColorStop(1, '#0b0e11'); g.fillStyle = bgg; g.fillRect(0, 0, W, H); }
  const ov = g.createLinearGradient(0, 0, 0, H);
  ov.addColorStop(0, 'rgba(4,6,9,.62)'); ov.addColorStop(.34, 'rgba(4,6,9,.1)'); ov.addColorStop(.58, 'rgba(4,6,9,.34)'); ov.addColorStop(1, 'rgba(4,6,9,.94)');
  g.fillStyle = ov; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(232,184,75,.6)'; g.lineWidth = 5; rr(16, 16, W - 32, H - 32, 38); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1.5; rr(20, 20, W - 40, H - 40, 34); g.stroke();
  g.textBaseline = 'alphabetic';

  // ── Arriba-izquierda: logo + nombre + par · fecha ──
  const lx = 66, ly = 62, lr = 44;
  shadow(18, 4);
  if (coinImg) { g.beginPath(); g.arc(lx + lr, ly + lr, lr, 0, 7); g.fillStyle = '#fff'; g.fill(); noShadow(); g.save(); g.beginPath(); g.arc(lx + lr, ly + lr, lr, 0, 7); g.closePath(); g.clip(); g.drawImage(coinImg, lx, ly, lr * 2, lr * 2); g.restore(); g.strokeStyle = 'rgba(232,184,75,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(lx + lr, ly + lr, lr, 0, 7); g.stroke(); }
  else { g.fillStyle = acento; g.beginPath(); g.arc(lx + lr, ly + lr, lr, 0, 7); g.fill(); noShadow(); g.fillStyle = '#08121f'; g.font = `800 38px ${DISPLAY}`; g.textAlign = 'center'; g.fillText(sb[0] || '?', lx + lr, ly + lr + 14); g.textAlign = 'left'; }
  noShadow();
  shadow(18, 3);
  g.fillStyle = acento; g.font = `700 52px ${DISPLAY}`; g.fillText(nombre, lx + lr * 2 + 28, ly + 34);
  g.fillStyle = '#eaecef'; g.font = `500 26px ${MONO}`; g.fillText(`${pair} · ${fecha}`, lx + lr * 2 + 30, ly + 70);
  if (activo) { g.fillStyle = '#e8b84b'; g.font = `600 22px ${MONO}`; g.fillText(`Activo  ${activo}`, lx + lr * 2 + 30, ly + 102); }
  noShadow();

  // ── Abajo: banda Inversión ↔ Ganancia (chaflán + verde de la página + 3D dorado) ──
  const bX = 54, bW = W - 108, bH = 172, bY = H - 66 - bH;
  g.fillStyle = '#8a6518'; rr(bX, bY + 8, bW, bH, 28); g.fill();                 // borde inferior 3D dorado
  g.fillStyle = 'rgba(9,12,17,.96)'; rr(bX, bY, bW, bH, 28); g.fill();           // cuerpo oscuro
  g.save(); rr(bX, bY, bW, bH, 28); g.clip();
  const grW = bW * 0.58, grX = bX + bW - grW, topOff = grW * 0.20;
  const gg = g.createLinearGradient(grX, bY, bX + bW, bY);
  if (neg) { gg.addColorStop(0, '#a83636'); gg.addColorStop(1, '#f6465d'); }
  else { gg.addColorStop(0, 'rgba(14,203,129,.5)'); gg.addColorStop(1, '#12d18e'); }
  g.fillStyle = gg; g.beginPath(); g.moveTo(grX + topOff, bY); g.lineTo(bX + bW, bY); g.lineTo(bX + bW, bY + bH); g.lineTo(grX, bY + bH); g.closePath(); g.fill();
  g.restore();
  g.strokeStyle = '#e8b84b'; g.lineWidth = 2.5; rr(bX, bY, bW, bH, 28); g.stroke();                    // borde dorado
  g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 1; rr(bX + 2.5, bY + 2.5, bW - 5, bH - 5, 26); g.stroke();
  // izquierda: Inversión (etiqueta dorada, valor blanco)
  g.fillStyle = '#e8b84b'; g.font = `600 22px ${MONO}`; g.fillText(('Inversión (' + sq + ')').toUpperCase(), bX + 36, bY + 60);
  g.fillStyle = '#eaecef'; g.font = `700 50px ${DISPLAY}`; g.fillText(inv, bX + 34, bY + 120);
  // derecha: Ganancia total (texto OSCURO sobre verde, como la página)
  g.textAlign = 'right';
  const gtxt = neg ? '#2a0808' : '#03210f';
  g.globalAlpha = .82; g.fillStyle = gtxt; g.font = `600 22px ${MONO}`; g.fillText('GANANCIA TOTAL', bX + bW - 36, bY + 56); g.globalAlpha = 1;
  g.fillStyle = gtxt; g.font = `800 50px ${DISPLAY}`; g.fillText(gan, bX + bW - 36, bY + 112);
  if (pct) { g.font = `800 27px ${MONO}`; g.fillText(pct, bX + bW - 36, bY + 148); }
  g.textAlign = 'left';

  // sello
  shadow(12, 2);
  g.fillStyle = 'rgba(232,184,75,.95)'; g.font = `700 25px ${MONO}`; g.textAlign = 'center';
  g.fillText('AUREX FINANCE   ·   SIN CUSTODIA   ·   SIN KYC', W / 2, H - 32);
  g.textAlign = 'left'; noShadow();

  cv.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
    a.download = `bot-${tipo}-${sb}${sq}.png`;
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
      if (acc === 'historial') {
        const r = el.querySelector('[data-nombre]') || el;   // los datos viven en el panel
        extras.avisoHistorial(async () => {
          let ops = [];
          try {
            const mb = MONEDAS[sb], mq = MONEDAS[sq];
            const r = await gb.operacionesDe(cuenta, b, q, mb?.decimals ?? 18, mq?.decimals ?? 18);
            ops = r.ops || r || [];
          } catch (e) { console.warn('[Aurex] historial:', e); }
          extras.descargarHistorial({
            par: `${sb}/${sq}`,
            tipo: r.dataset.nombre || 'Bot Aurex',
            claseBot: r.dataset.tipo || '',
            moneda: sq || '',
            base: sb || '',
            creado: Number(r.dataset.creado) || 0,
            ciclos: Number(r.dataset.ciclos) || 0,
            ganancia: Number(r.dataset.gan) || 0,
            invertido: Number(r.dataset.inv) || 0,
            operaciones: ops
          });
        });
        return;
      }
      if (acc === 'toggle-panel') {
        const panel = el.querySelector('.pio-panel'); const abrir = !panel.classList.contains('open');
        panel.classList.toggle('open', abrir); btn.textContent = abrir ? 'Ocultar ▴' : 'Ver el bot trabajando ▾';
        if (abrir) { try { grafica.pintar(panel); } catch (_) {} }
        if (abrir) arrancarTrail(panel.dataset.clave, { base: b, quote: q }, parseFloat(el.dataset.pmin), parseFloat(el.dataset.pmax), Number(el.dataset.decb), Number(el.dataset.decq), cuenta);
        else { const t = TRAILS.get(panel.dataset.clave); if (t?.timer) { clearInterval(t.timer); TRAILS.delete(panel.dataset.clave); } }
        return;
      }
      if (acc === 'tab-noop') return;
      if (acc === 'editar') { editarBot(el); return; }
      if (acc === 'terminar') {
        const esCash = el.dataset.tipo === 'cash';
        const esDca = el.dataset.tipo === 'dca';
        const soloCancelar = esCash || esDca;   // no vende: solo detiene
        const ok = await modalConfirm({
          titulo: esDca ? 'Suspender DCA' : (esCash ? 'Cerrar Cash Out' : 'Cerrar y vender'),
          cuerpo: esDca ? `Se detiene el DCA y se quita el permiso. <b>La cripto que ya compraste se queda en tu wallet.</b>` : (esCash ? `Se cancelará este Cash Out y se quita el permiso. <b>Tu cripto se queda en tu wallet</b>, no se vende nada.` : `Se venderá todo a <b>${sq}</b> y el bot se cerrará. El dinero queda en tu wallet.`),
          ok: soloCancelar ? 'Sí, suspender' : 'Sí, cerrar'
        });
        if (!ok) return;
        try {
          if (!soloCancelar) {
            try { modalBusy('Vendiendo a estable… confirma en tu wallet.'); await gb.cerrarAhoraK(el.dataset.clave); }
            catch (e) { if (esRechazo(e)) { modalError('Cancelaste la firma. No se hizo ningún cambio.'); return; } }
          }
          modalBusy('Cerrando el bot… confirma en tu wallet.'); await gb.cancelarRejillaK(el.dataset.clave);
          if (esCash && gb.esBNB(b)) {
            try {
              const wbnbBal = await gb.balanceToken(b, cuenta);
              const cant = parseFloat(el.dataset.cant) || 0; const dcb = Number(el.dataset.decb) || 18;
              let unwrap = wbnbBal;
              if (cant > 0) { const cantWei = mBI(cant, dcb); if (unwrap > cantWei) unwrap = cantWei; }
              if (unwrap > 0n) { modalBusy('Devolviendo tu BNB… confirma en tu wallet.'); await gb.desenvolverBNB(unwrap); }
            } catch (_) {}
          }
          olvidarPar(cuenta, el.dataset.clave); modalClose(); refrescarRejillas();
        } catch (e) {
          if (!esRechazo(e)) { olvidarPar(cuenta, el.dataset.clave); refrescarRejillas(); }
          modalError(esRechazo(e) ? 'Cancelaste la firma.' : (e?.shortMessage || e?.message || String(e)));
        }
      } else if (acc === 'desconectar') {
        const ok = await modalConfirm({ titulo: 'Desconectar bot', cuerpo: `Se cerrará este bot y se <b>quitará el permiso</b> que le diste sobre tu ${sq} y ${sb}. No podrá operar hasta que lo actives de nuevo.`, ok: 'Desconectar', peligro: true });
        if (!ok) return;
        try {
          modalBusy('Cerrando el bot… confirma en tu wallet.'); await gb.cancelarRejillaK(el.dataset.clave);
          modalBusy(`Quitando el permiso de ${sq}… confirma.`); await gb.revocarToken(q);
          modalBusy(`Quitando el permiso de ${sb}… confirma.`); await gb.revocarToken(b);
          olvidarPar(cuenta, el.dataset.clave); modalClose(); refrescarRejillas();
        } catch (e) {
          if (!esRechazo(e)) { olvidarPar(cuenta, el.dataset.clave); refrescarRejillas(); }
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
  // Sin pantalla de carga: dejamos el fondo negro y ya. Si la wallet responde
  // rápido (lo normal), el usuario no ve ningún parpadeo. El círculo solo
  // aparece si de verdad tarda más de medio segundo.
  host.innerHTML = `<div id="c-boot" style="min-height:64vh;background:#0b0e11"></div>`;
  const _tBoot = setTimeout(() => {
    const bx = $('c-boot');
    if (bx) bx.innerHTML = `<div style="min-height:64vh;display:flex;align-items:center;justify-content:center"><span style="width:22px;height:22px;border-radius:50%;border:2px solid rgba(232,184,75,.25);border-top-color:#E8B84B;display:inline-block;animation:spin .7s linear infinite"></span></div>`;
  }, 500);
  // Ojo: durante el arranque NO dibujamos al conectar la wallet. Si lo hacemos,
  // la página se dibuja dos veces seguidas (una al conectar y otra al terminar)
  // y se ve un parpadeo feo. Dejamos el aviso activo solo cuando ya arrancó.
  let _arrancando = true;
  wallet.alCambiar(() => { if (!_arrancando) render(); });
  // La página se dibuja SIEMPRE. Si una extensión de wallet no contesta
  // (pasa cuando MetaMask u otra wallet queda en mal estado tras actualizarse),
  // seguimos adelante: nunca un "Cargando…" eterno.
  let walletMuda = false;
  try {
    await Promise.race([
      wallet.reconectarSiProcede(),
      new Promise((r) => setTimeout(() => { walletMuda = true; r(); }, 2500))
    ]);
  } catch (_) {}
  clearTimeout(_tBoot);
  _arrancando = false;
  render(); iniciarReloj();
  if (walletMuda && !wallet.cuentaActual()) {
    setTimeout(() => {
      const el = $('c-hero-msg') || $('c-msg');
      if (el) aviso(el, 'err', 'Tu extensión de wallet no está respondiendo. Abre MetaMask desde la barra del navegador y desbloquéala, o reinicia el navegador. Puedes seguir usando la página mientras tanto.', 12000);
    }, 400);
  }
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
else arrancar();


/* ================================================================== */
/* SWAP — panel de intercambio (estilo PancakeSwap, estética propia)   */
/* ================================================================== */
const WBNB_ADDR = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const WBNB_TOKEN = { id: 'WBNB', simbolo: 'WBNB', nombre: 'Wrapped BNB', address: WBNB_ADDR, decimals: 18, icono: 'W', color: '#F0B90B', cg: 'wbnb' };
function swMon(id) {
  if (id === 'WBNB') return WBNB_TOKEN;
  if (typeof id === 'string' && id.startsWith('0x')) return CUSTOM[id.toLowerCase()] || null;
  return moneda(id);
}
const CUSTOM = {};   // tokens importados por dirección: addrLower -> token
let _impToken = 0;   // guarda de carrera para la importación
function swSyncWbnbLogo() { if (LOGOS['BNB'] && !LOGOS['WBNB']) LOGOS['WBNB'] = { img: LOGOS['BNB'].img, price: LOGOS['BNB'].price, chg: LOGOS['BNB'].chg }; }

const SWAP_IDS = [...new Set(['BNB', 'WBNB', 'USDT', 'USDC', ...BASES])];
const S = { fromId: 'BNB', toId: 'USDT', amount: '', out: 0n, minOut: 0n, fee: 0, feeWei: 0n, allow: 0n, balFromWei: 0n, quoting: false, accion: 'swap' };
let _swT = null, _swToken = 0;
const SW_GAS_BUF = 3000000000000000n; // 0.003 BNB de colchón de gas al usar Máx con BNB

let _swCssOk = false;
function swInjectCSS() {
  if (_swCssOk) return; _swCssOk = true;
  const css = `
  #swap-modal{position:fixed;inset:0;z-index:230;display:flex;align-items:center;justify-content:center;padding:16px}
  #swap-modal *{-webkit-tap-highlight-color:transparent}
  #swap-modal .sw-bg{position:absolute;inset:0;background:rgba(3,5,7,.66);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
  #swap-modal .sw-box{position:relative;width:100%;max-width:436px;background:linear-gradient(180deg,#171d25,#0d1117);border:1px solid var(--line);border-radius:22px;box-shadow:0 30px 80px rgba(0,0,0,.65),0 0 0 1px rgba(232,184,75,.06),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden;animation:cmPop .22s cubic-bezier(.2,.9,.3,1.2)}
  #swap-modal .sw-box::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.5}
  #swap-modal .sw-body{padding:2px 18px 20px}
  #swap-modal .sw-cards{position:relative}
  #swap-modal .sw-card{background:#0b0e11;border:1px solid var(--line);border-radius:16px;padding:13px 15px}
  #swap-modal .sw-card+.sw-card{margin-top:10px}
  #swap-modal .sw-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
  #swap-modal .sw-lbl{font-family:var(--mono);font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.4px}
  #swap-modal .sw-bal{font-family:var(--mono);font-size:11px;color:var(--ink-3)}
  #swap-modal .sw-card-mid{display:flex;align-items:center;gap:10px}
  #swap-modal .sw-amt{flex:1;min-width:0;background:transparent;border:none;outline:none;box-shadow:none;-webkit-appearance:none;appearance:none;color:var(--ink);font-family:var(--display);font-weight:700;font-size:26px;padding:0}
  #swap-modal .sw-amt::placeholder{color:var(--ink-3);opacity:.5}
  #swap-modal input.sw-amt:focus{outline:none;box-shadow:none;border:none;background:transparent}
  #swap-modal .sw-out{flex:1;min-width:0;color:var(--ink);font-family:var(--display);font-weight:700;font-size:26px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  #swap-modal .sw-tok{display:inline-flex;align-items:center;gap:8px;flex:0 0 auto;background:linear-gradient(180deg,#1b2027,#12161c);border:1px solid var(--gold-soft);border-radius:100px;padding:6px 12px 6px 7px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.06);transition:filter .12s,transform .08s}
  #swap-modal .sw-tok:hover{filter:brightness(1.12)}
  #swap-modal .sw-tok:active{transform:translateY(2px)}
  #swap-modal .sw-tok b{font-family:var(--display);font-size:15px;color:var(--ink);font-weight:700}
  #swap-modal .sw-tok .sw-chev{color:var(--gold);display:block;flex:0 0 auto}
  #swap-modal .sw-card-bot{display:flex;justify-content:space-between;align-items:center;margin-top:8px;min-height:17px}
  #swap-modal .sw-usd{font-family:var(--mono);font-size:11px;color:var(--ink-3)}
  #swap-modal .sw-max{font-family:var(--mono);font-size:11px;font-weight:700;color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border:1px solid #c79426;border-radius:8px;padding:3px 9px;cursor:pointer;box-shadow:0 2px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.4);letter-spacing:.5px}
  #swap-modal .sw-max:active{transform:translateY(2px);box-shadow:0 0 0 #8f6a1a}
  #swap-modal .sw-flip{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;border-radius:12px;background:linear-gradient(180deg,#232a33,#141a20);border:2px solid #0d1117;color:var(--gold);cursor:pointer;display:grid;place-items:center;box-shadow:0 3px 8px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .22s ease,filter .12s;z-index:3}
  #swap-modal .sw-flip:hover{filter:brightness(1.2)}
  #swap-modal .sw-flip:active{transform:translate(-50%,-50%) rotate(180deg)}
  #swap-modal .sw-info{margin:14px 2px 0;display:flex;flex-direction:column;gap:6px}
  #swap-modal .sw-info:empty{display:none}
  #swap-modal .sw-info .r{display:flex;justify-content:space-between;gap:10px;font-family:var(--mono);font-size:11.5px;color:var(--ink-2)}
  #swap-modal .sw-info .r span:first-child{color:var(--ink-3)}
  #swap-modal .sw-go{margin-top:16px}
  #swap-modal .sw-go:disabled{opacity:.5;cursor:not-allowed;filter:grayscale(.3)}
  #swap-modal .sw-go:not(:disabled):active{transform:translateY(4px);box-shadow:0 1px 0 #8f6a1a,0 3px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.5)}
  #coin-modal .cm-import{padding:11px 14px;font-family:var(--mono);font-size:12px;color:var(--ink-3);display:flex;align-items:center;justify-content:center;gap:8px}
  #coin-modal .cm-import.err{color:#ff9090}
  #coin-modal .cm-import.ok{display:block;padding:0}
  #coin-modal .cm-imp-spin{width:14px;height:14px;border-radius:50%;border:2px solid rgba(232,184,75,.25);border-top-color:var(--gold);animation:brspin .8s linear infinite;flex:0 0 auto}
  #coin-modal .cm-imp-badge{font-family:var(--mono);font-size:11px;font-weight:700;color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border:1px solid #c79426;border-radius:8px;padding:4px 12px;box-shadow:0 2px 0 #8f6a1a,inset 0 1px 0 rgba(255,255,255,.4)}
  #swap-modal .sw-find{margin:0 18px 6px}
  #swap-modal .sw-find-bar{display:flex;align-items:center;gap:9px;padding:9px 12px;background:#0b0e11;border:1px solid var(--line);border-radius:12px;color:var(--ink-3);transition:border-color .14s,box-shadow .14s}
  #swap-modal .sw-find-bar:focus-within{border-color:var(--gold-soft);box-shadow:0 0 0 3px rgba(232,184,75,.08)}
  #swap-modal .sw-find-bar:focus-within svg{display:none}
  #swap-modal .sw-find-bar svg{flex:0 0 auto;opacity:.75}
  #swap-modal input.sw-find-inp{flex:1;min-width:0;background:transparent;border:none;outline:none;box-shadow:none;-webkit-appearance:none;appearance:none;color:var(--ink);font-family:var(--sans);font-size:12.5px}
  #swap-modal input.sw-find-inp:focus{outline:none;box-shadow:none}
  #swap-modal input.sw-find-inp::placeholder{color:var(--ink-3);opacity:.9}
  #swap-modal .sw-find-res{display:none;margin-top:6px;max-height:214px;overflow-y:auto;background:#0d1117;border:1px solid var(--line);border-radius:12px;padding:4px}
  #swap-modal .sw-find-res.open{display:block}
  #swap-modal .sw-find-row{display:flex;align-items:center;gap:11px;width:100%;padding:8px 10px;background:transparent;border:1px solid transparent;border-radius:10px;cursor:pointer;text-align:left;transition:background .12s,border-color .12s}
  #swap-modal .sw-find-row:hover{background:#1b222c;border-color:var(--line)}
  #swap-modal .sw-find-tx{display:flex;flex-direction:column;gap:1px;flex:1;min-width:0}
  #swap-modal .sw-find-tx b{font-family:var(--display);color:var(--ink);font-size:14px;font-weight:700}
  #swap-modal .sw-find-tx i{font-style:normal;font-family:var(--mono);color:var(--ink-3);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #swap-modal .sw-find-usd{font-family:var(--mono);font-size:11px;color:var(--ink-3);flex:0 0 auto}
  #swap-modal .sw-find-go{margin-left:2px;font-family:var(--mono);font-size:11px;font-weight:700;color:#3a2800;background:linear-gradient(180deg,#f7db8d,var(--gold) 55%,#c79426);border:1px solid #c79426;border-radius:7px;padding:3px 10px;flex:0 0 auto}
  #swap-modal .sw-find-msg{padding:10px 12px;font-family:var(--mono);font-size:12px;color:var(--ink-3);display:flex;align-items:center;justify-content:center;gap:8px}
  #swap-modal .sw-find-msg.err{color:#ff9090}
  @media(max-width:560px){#swap-modal .sw-amt,#swap-modal .sw-out{font-size:22px}#swap-modal input.sw-find-inp{font-size:12px}}
  `;
  const st = document.createElement('style'); st.id = 'sw-css'; st.textContent = css; document.head.appendChild(st);
}

function swTokInner(mo) {
  return `<span class="coin-sel-ico" style="color:${mo.color || '#e8b84b'}">${icoInner(mo)}</span><b>${mo.simbolo}</b><svg class="sw-chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
}
function swBal(mo, cuenta) { return (mo.address == null) ? gb.saldoNativoBNB(cuenta) : gb.balanceToken(mo.address, cuenta); }
function swFmt(wei, dec, max = 6) {
  try { const n = Number(gb.fmt(wei, dec)); if (!isFinite(n) || n === 0) return '0';
    if (n >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: Math.min(max, 6) });
    if (n >= 0.0001) return n.toLocaleString('en-US', { maximumFractionDigits: 8 });
    return Number(n.toPrecision(2)).toString();
  } catch (_) { return '0'; }
}
function swUsdVal(id, wei) {
  const p = (LOGOS[id]?.price) || (id === 'WBNB' ? LOGOS['BNB']?.price : null);
  if (!p || !(wei > 0n)) return '';
  const v = Number(gb.fmt(wei, swMon(id).decimals)) * p;
  if (!isFinite(v) || v <= 0) return '';
  return '≈ $' + (v >= 1 ? v.toLocaleString('en-US', { maximumFractionDigits: 2 }) : v.toFixed(4));
}
function swAmountBI() {
  const from = swMon(S.fromId); const s = String(S.amount || '').replace(',', '.');
  if (!s || !(Number(s) > 0)) return 0n;
  try { return gb.parse(Number(s).toFixed(Math.min(from.decimals, 18)), from.decimals); } catch (_) { return 0n; }
}
// 'wrap' (BNB->WBNB) o 'unwrap' (WBNB->BNB) o null (swap normal)
function swEsWrap() {
  if (S.fromId === 'BNB' && S.toId === 'WBNB') return 'wrap';
  if (S.fromId === 'WBNB' && S.toId === 'BNB') return 'unwrap';
  return null;
}

function abrirSwap() {
  swInjectCSS(); swSyncWbnbLogo();
  const host = $(APP) || document.body;
  const v = $('swap-modal'); if (v) v.remove();
  const from = swMon(S.fromId), to = swMon(S.toId);
  const x = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
  const flip = `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v13"/><path d="m3 13 4 4 4-4"/><path d="M17 20V7"/><path d="m21 11-4-4-4 4"/></svg>`;
  const el = document.createElement('div');
  el.innerHTML = `<div id="swap-modal">
    <div class="sw-bg" id="sw-bg"></div>
    <div class="sw-box">
      <div class="cm-head"><span class="cm-title">Intercambio</span><button class="cm-x" id="sw-x" aria-label="Cerrar">${x}</button></div>
      <div class="sw-find">
        <div class="sw-find-bar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <input id="sw-find-inp" class="sw-find-inp" placeholder="Busca por nombre o pega la dirección de la moneda" autocomplete="off" spellcheck="false">
        </div>
        <div class="sw-find-res" id="sw-find-res"></div>
      </div>
      <div class="sw-body">
        <div class="sw-cards">
          <div class="sw-card">
            <div class="sw-card-top"><span class="sw-lbl">Pagas</span><span class="sw-bal" id="sw-bal-from">—</span></div>
            <div class="sw-card-mid"><input class="sw-amt" id="sw-amt" inputmode="decimal" placeholder="0.0" autocomplete="off"><button class="sw-tok" id="sw-tok-from" type="button">${swTokInner(from)}</button></div>
            <div class="sw-card-bot"><span class="sw-usd" id="sw-usd-from"></span><button class="sw-max" id="sw-max" type="button">MÁX</button></div>
          </div>
          <div class="sw-card">
            <div class="sw-card-top"><span class="sw-lbl">Recibes (estimado)</span><span class="sw-bal" id="sw-bal-to">—</span></div>
            <div class="sw-card-mid"><div class="sw-out" id="sw-out">0.0</div><button class="sw-tok" id="sw-tok-to" type="button">${swTokInner(to)}</button></div>
            <div class="sw-card-bot"><span class="sw-usd" id="sw-usd-to"></span></div>
          </div>
          <button class="sw-flip" id="sw-flip" type="button" aria-label="Invertir">${flip}</button>
        </div>
        <div class="sw-info" id="sw-info"></div>
        <button class="btn-oro3d sw-go" id="sw-go" type="button">Intercambiar</button>
      </div>
    </div>
  </div>`;
  host.appendChild(el.firstElementChild);
  $('sw-x').onclick = cerrarSwap; $('sw-bg').onclick = cerrarSwap;
  if ($('sw-find-inp')) $('sw-find-inp').addEventListener('input', swFindInput);
  $('sw-amt').addEventListener('input', swInput);
  $('sw-max').onclick = swMax;
  $('sw-flip').onclick = swFlip;
  $('sw-tok-from').onclick = () => abrirSwapCoinModal('from');
  $('sw-tok-to').onclick = () => abrirSwapCoinModal('to');
  $('sw-go').onclick = swEjecutar;
  $('sw-amt').value = S.amount || '';
  if (!_logosOk) cargarLogosPrecios();
  swCargarTarifa(); swCargarBalances(); swRenderInfo(); swRenderBtn(); setOut();
  if (S.amount) swCotizar();
  setTimeout(() => { const a = $('sw-amt'); if (a) a.focus(); }, 60);
}
function cerrarSwap() { const p = $('coin-modal'); if (p && $('scm-list')) { window._cmRepintar = null; p.remove(); } const m = $('swap-modal'); if (m) m.remove(); }

function swInput(e) {
  let val = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '');
  const parts = val.split('.'); if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
  e.target.value = val; S.amount = val;
  swRenderInfo(); swRenderBtn(); swCotizarDebounced();
}
function swCotizarDebounced() { clearTimeout(_swT); _swT = setTimeout(swCotizar, 350); }

async function swCargarTarifa() { try { S.feeWei = await gb.tarifaSwap(); } catch (_) {} }
async function swCargarBalances() {
  const cuenta = wallet.cuentaActual();
  const from = swMon(S.fromId), to = swMon(S.toId);
  const set = (id, mo, wei) => { const e = $(id); if (e) e.textContent = (wei == null) ? '—' : (swFmt(wei, mo.decimals) + ' ' + mo.simbolo); };
  if (!cuenta) { S.balFromWei = 0n; set('sw-bal-from', from, null); set('sw-bal-to', to, null); swRenderBtn(); return; }
  try {
    const [bf, bt] = await Promise.all([swBal(from, cuenta), swBal(to, cuenta)]);
    S.balFromWei = bf; set('sw-bal-from', from, bf); set('sw-bal-to', to, bt);
  } catch (_) {}
  swRenderBtn();
}

async function swCotizar() {
  const from = swMon(S.fromId), to = swMon(S.toId);
  const amtBI = swAmountBI();
  if (!(amtBI > 0n)) { S.out = 0n; S.minOut = 0n; S.fee = 0; setOut(); swRenderInfo(); swRenderBtn(); return; }
  // WBNB <-> BNB es conversión 1:1 (envolver/desenvolver), sin cotización ni permiso
  if (swEsWrap()) { S.out = amtBI; S.minOut = amtBI; S.fee = 0; S.allow = 0n; S.quoting = false; setOut(); swRenderInfo(); swRenderBtn(); return; }
  S.quoting = true; swRenderBtn();
  const token = ++_swToken;
  const cuenta = wallet.cuentaActual();
  try {
    const [r, allow] = await Promise.all([
      gb.cotizarSwap({ inAddr: from.address, outAddr: to.address, amountInBI: amtBI, slippageBps: 50 }),
      (from.address == null || !cuenta) ? Promise.resolve(0n) : gb.allowanceSwap(from.address, cuenta)
    ]);
    if (token !== _swToken) return;
    S.allow = allow;
    if (!r) { S.out = 0n; S.minOut = 0n; S.fee = 0; }
    else { S.out = r.amountOut; S.minOut = r.minOut; S.fee = r.fee; }
  } catch (_) { if (token !== _swToken) return; S.out = 0n; S.minOut = 0n; S.fee = 0; }
  S.quoting = false;
  setOut(); swRenderInfo(); swRenderBtn();
}

function setOut() { const to = swMon(S.toId); const e = $('sw-out'); if (e) e.textContent = S.out > 0n ? swFmt(S.out, to.decimals) : '0.0'; }
function swRenderInfo() {
  const el = $('sw-info'); if (!el) return;
  const from = swMon(S.fromId), to = swMon(S.toId);
  const uf = $('sw-usd-from'); if (uf) uf.textContent = swUsdVal(S.fromId, swAmountBI());
  const ut = $('sw-usd-to'); if (ut) ut.textContent = swUsdVal(S.toId, S.out);
  const rows = [];
  if (S.out > 0n) {
    const inH = Number(gb.fmt(swAmountBI(), from.decimals));
    const outH = Number(gb.fmt(S.out, to.decimals));
    if (swEsWrap()) { rows.push(['Conversión', `1 ${from.simbolo} = 1 ${to.simbolo}`]); }
    else if (inH > 0) { const rate = outH / inH; rows.push(['Precio', `1 ${from.simbolo} ≈ ${num(rate, rate >= 1 ? 4 : 8)} ${to.simbolo}`]); rows.push(['Mínimo que recibes', `${swFmt(S.minOut, to.decimals)} ${to.simbolo}`]); }
  }
  el.innerHTML = rows.map(([a, b]) => `<div class="r"><span>${a}</span><span>${b}</span></div>`).join('');
}
function swRenderBtn() {
  const b = $('sw-go'); if (!b) return;
  const from = swMon(S.fromId);
  const cuenta = wallet.cuentaActual();
  const amt = Number(String(S.amount || '').replace(',', '.'));
  const amtBI = swAmountBI();
  const wrap = swEsWrap();
  let label = 'Intercambiar', dis = false, act = 'swap';
  if (!cuenta) { label = 'Conecta tu wallet'; act = 'connect'; }
  else if (!wallet.esRedCorrecta()) { label = 'Cambia a BNB Chain'; act = 'net'; }
  else if (!(amt > 0)) { label = 'Ingresa un monto'; dis = true; }
  else if (amtBI > S.balFromWei) { label = 'Saldo insuficiente'; dis = true; }
  else if (wrap) { label = 'Convertir'; act = wrap; }
  else if (S.quoting) { label = 'Calculando…'; dis = true; }
  else if (S.out === 0n) { label = 'Sin ruta para este par'; dis = true; }
  else if (from.address != null && S.allow < amtBI) { label = 'Aprobar y cambiar'; act = 'approve'; }
  else { label = 'Intercambiar'; act = 'swap'; }
  b.textContent = label; b.disabled = dis; S.accion = act;
}

function swMax() {
  const from = swMon(S.fromId);
  if (!(S.balFromWei > 0n)) return;
  let maxWei = S.balFromWei;
  if (from.address == null) { const buf = (S.feeWei || 0n) + SW_GAS_BUF; maxWei = S.balFromWei > buf ? (S.balFromWei - buf) : 0n; }
  const v = Number(gb.fmt(maxWei, from.decimals));
  S.amount = v > 0 ? String(v) : '';
  const a = $('sw-amt'); if (a) a.value = S.amount;
  swRenderInfo(); swRenderBtn(); swCotizar();
}
function swFlip() {
  const f = S.fromId; S.fromId = S.toId; S.toId = f;
  S.amount = ''; S.out = 0n; S.minOut = 0n; S.allow = 0n;
  const a = $('sw-amt'); if (a) a.value = '';
  swPintarToks(); swCargarBalances(); setOut(); swRenderInfo(); swRenderBtn();
}
function swPintarToks() {
  swSyncWbnbLogo();
  const tf = $('sw-tok-from'), tt = $('sw-tok-to');
  if (tf) tf.innerHTML = swTokInner(swMon(S.fromId));
  if (tt) tt.innerHTML = swTokInner(swMon(S.toId));
}

function abrirSwapCoinModal(lado) {
  swSyncWbnbLogo();
  const host = $(APP) || document.body;
  const viejo = $('coin-modal'); if (viejo) viejo.remove();
  const searchIco = `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>`;
  const x = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
  const el = document.createElement('div');
  el.innerHTML = `<div class="coin-modal" id="coin-modal" style="z-index:260">
    <div class="coin-modal-bg" id="scm-bg"></div>
    <div class="coin-modal-box">
      <div class="cm-head"><span class="cm-title">Elige la moneda</span><button class="cm-x" id="scm-x" aria-label="Cerrar">${x}</button></div>
      <div class="cm-search">${searchIco}<input id="scm-search" placeholder="Nombre, símbolo o dirección…" autocomplete="off" spellcheck="false"></div>
      <div class="cm-list" id="scm-list"></div>
    </div>
  </div>`;
  host.appendChild(el.firstElementChild);
  let ftxt = '';
  const sel = lado === 'from' ? S.fromId : S.toId;
  const pintar = () => {
    swSyncWbnbLogo();
    const q = ftxt.trim();
    const ql = q.toLowerCase();
    const monedas = SWAP_IDS.map((id) => swMon(id)).filter(Boolean).filter((mo) =>
      !q || (mo.simbolo || '').toLowerCase().includes(ql) || (mo.nombre || '').toLowerCase().includes(ql) || (mo.address || '').toLowerCase() === ql);
    const list = $('scm-list');
    let html = monedas.map((mo) => {
      const on = sel === mo.id; const L = LOGOS[mo.id]; const chg = L && L.chg != null ? L.chg : null;
      return `<button type="button" class="cm-coin${on ? ' on' : ''}" data-id="${mo.id}">
        <span class="cm-coin-ico" style="color:${mo.color || '#e8b84b'}">${icoInner(mo)}</span>
        <span class="cm-coin-tx"><b>${mo.simbolo}</b><i>${mo.nombre}</i></span>
        <span class="cm-coin-right">
          <span class="cm-coin-price">${L ? fmtPrecioUSD(L.price) : ''}</span>
          ${chg != null ? `<span class="cm-coin-chg ${chg >= 0 ? 'pos' : 'neg'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span>` : ''}
        </span>
      </button>`;
    }).join('');
    // Importar por dirección: si es una dirección válida y no está ya en la lista
    const yaEsta = monedas.length && monedas.some((mo) => (mo.address || '').toLowerCase() === ql);
    if (gb.esDireccion(q) && !yaEsta) {
      html += `<div class="cm-import" id="cm-import"><span class="cm-imp-spin"></span>Buscando token en BNB Chain…</div>`;
      swImportarToken(q, lado);
    } else if (!html) {
      html = `<div class="cm-empty">Sin resultados para "${q}". Pega su dirección para añadirla.</div>`;
    }
    list.innerHTML = html;
    list.querySelectorAll('.cm-coin').forEach((b) => b.onclick = () => swElegir(lado, b.dataset.id));
  };
  window._cmRepintar = pintar; pintar();
  if (!_logosOk) cargarLogosPrecios();
  $('scm-search').addEventListener('input', (e) => { ftxt = e.target.value; pintar(); });
  setTimeout(() => { const s = $('scm-search'); if (s) s.focus(); }, 60);
  const cerrar = () => { window._cmRepintar = null; const m = $('coin-modal'); if (m) m.remove(); };
  $('scm-x').onclick = cerrar; $('scm-bg').onclick = cerrar;
}
function swElegir(lado, id) {
  const m = $('coin-modal'); if (m) m.remove(); window._cmRepintar = null;
  if (lado === 'from') { if (id === S.toId) S.toId = S.fromId; S.fromId = id; }
  else { if (id === S.fromId) S.fromId = S.toId; S.toId = id; }
  S.allow = 0n;
  swPintarToks(); swCargarBalances(); setOut(); swRenderInfo(); swRenderBtn(); swCotizar();
}

// Importa un token por dirección de contrato (lee symbol/name/decimals en cadena)
async function swImportarToken(addr, lado) {
  const key = addr.trim().toLowerCase();
  if (CUSTOM[key]) { swRenderImport(CUSTOM[key], lado); return; }
  const tk = ++_impToken;
  try {
    const info = await gb.infoToken(addr);
    if (tk !== _impToken) return;
    // El nombre y el símbolo los pone quien creó ESE token, no nosotros.
    // Los limpiamos: solo letras, números y unos pocos signos, y cortos.
    const limpio = (v, max) => String(v || '').replace(/[^\p{L}\p{N} ._+\-]/gu, '').trim().slice(0, max);
    const sim = limpio(info.simbolo, 12) || '?';
    const nom = limpio(info.nombre, 40) || sim;
    const t = { id: key, simbolo: sim, nombre: nom, address: info.address, decimals: info.decimals, icono: sim[0], color: '#E8B84B', custom: true };
    CUSTOM[key] = t;
    if (!LOGOS[key]) LOGOS[key] = { img: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${info.address}/logo.png`, price: null, chg: null };
    swRenderImport(t, lado);
  } catch (_) {
    if (tk !== _impToken) return;
    const el = $('cm-import'); if (el) { el.className = 'cm-import err'; el.textContent = 'No es un token válido en BNB Chain.'; }
  }
}
function swRenderImport(t, lado) {
  const el = $('cm-import'); if (!el) return;
  el.className = 'cm-import ok';
  el.innerHTML = `<button type="button" class="cm-coin" data-id="${t.id}">
    <span class="cm-coin-ico" style="color:${t.color}">${icoInner(t)}</span>
    <span class="cm-coin-tx"><b>${escT(t.simbolo)}</b><i>${escT(t.nombre)}</i></span>
    <span class="cm-coin-right"><span class="cm-imp-badge">Usar</span></span>
  </button>`;
  const b = el.querySelector('.cm-coin'); if (b) b.onclick = () => swElegir(lado, t.id);
}

/* ---- Barra de búsqueda universal (bajo el título del panel) ---- */
function swFindQ() { const i = $('sw-find-inp'); return i ? i.value.trim() : ''; }
function swFindInput() { swFindRender(swFindQ()); }
function swFindRow(mo) {
  const L = LOGOS[mo.id];
  const precio = L && L.price != null ? `<span class="sw-find-usd">${fmtPrecioUSD(L.price)}</span>` : '';
  return `<button type="button" class="sw-find-row" data-id="${mo.id}">
    <span class="coin-sel-ico" style="color:${mo.color || '#e8b84b'}">${icoInner(mo)}</span>
    <span class="sw-find-tx"><b>${mo.simbolo}</b><i>${mo.nombre}</i></span>
    ${precio}<span class="sw-find-go">Usar</span>
  </button>`;
}
function swFindRender(q) {
  const res = $('sw-find-res'); if (!res) return;
  if (!q) { res.innerHTML = ''; res.classList.remove('open'); return; }
  swSyncWbnbLogo();
  res.classList.add('open');
  const ql = q.toLowerCase();
  const monedas = SWAP_IDS.map((id) => swMon(id)).filter(Boolean).filter((mo) =>
    (mo.simbolo || '').toLowerCase().includes(ql) || (mo.nombre || '').toLowerCase().includes(ql) || (mo.address || '').toLowerCase() === ql);
  let html = monedas.slice(0, 6).map(swFindRow).join('');
  const yaEsta = monedas.some((mo) => (mo.address || '').toLowerCase() === ql);
  if (gb.esDireccion(q) && !yaEsta) {
    if (CUSTOM[ql]) html += swFindRow(CUSTOM[ql]);
    else { html += `<div class="sw-find-msg" id="sw-find-imp"><span class="cm-imp-spin"></span>Buscando en BNB Chain…</div>`; swFindImport(q); }
  } else if (!html) {
    html = `<div class="sw-find-msg">Sin resultados. Prueba con otro nombre o pega su dirección.</div>`;
  }
  res.innerHTML = html;
  res.querySelectorAll('.sw-find-row').forEach((b) => b.onclick = () => swFindPick(b.dataset.id));
}
async function swFindImport(q) {
  const key = q.trim().toLowerCase();
  if (CUSTOM[key]) { if (swFindQ().toLowerCase() === key) swFindRender(swFindQ()); return; }
  const tk = ++_impToken;
  try {
    const info = await gb.infoToken(q);
    if (tk !== _impToken) return;
    CUSTOM[key] = { id: key, simbolo: info.simbolo, nombre: info.nombre, address: info.address, decimals: info.decimals, icono: (info.simbolo || '?')[0], color: '#E8B84B', custom: true };
    if (!LOGOS[key]) LOGOS[key] = { img: `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/assets/${info.address}/logo.png`, price: null, chg: null };
    if (swFindQ().toLowerCase() === key) swFindRender(swFindQ());
  } catch (_) {
    if (tk !== _impToken) return;
    const el = $('sw-find-imp'); if (el) { el.className = 'sw-find-msg err'; el.textContent = 'No es un token válido en BNB Chain.'; }
  }
}
function swFindPick(id) {
  if (id === S.fromId) S.fromId = S.toId;   // evita from=to
  S.toId = id; S.allow = 0n;
  const inp = $('sw-find-inp'); if (inp) inp.value = '';
  const res = $('sw-find-res'); if (res) { res.innerHTML = ''; res.classList.remove('open'); }
  swPintarToks(); swCargarBalances(); setOut(); swRenderInfo(); swRenderBtn(); swCotizar();
}

function swExito(from, to, inWei, outWei) {
  const m = $('colmena-modal'); if (!m) return;
  limpiarBusy();
  const check = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3a2800" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
  $('cm-title').textContent = '';
  $('cm-body').innerHTML = `<div style="text-align:center;padding:4px 2px 2px">
    <div style="width:60px;height:60px;margin:0 auto 15px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(180deg,#f7db8d,#E8B84B 55%,#c79426);box-shadow:0 8px 22px rgba(232,184,75,.38),inset 0 1px 0 rgba(255,255,255,.6)">${check}</div>
    <div style="font-family:var(--display);font-weight:800;font-size:21px;color:var(--gold);margin-bottom:12px;text-shadow:0 1px 2px rgba(0,0,0,.4)">¡Intercambio hecho!</div>
    <div style="font-family:var(--sans);font-size:14.5px;color:var(--ink-2);line-height:1.65">Cambiaste <b style="color:var(--ink)">${swFmt(inWei, from.decimals)} ${from.simbolo}</b><br>por <b style="color:var(--ink)">~${swFmt(outWei, to.decimals)} ${to.simbolo}</b>.<br><span style="color:var(--ink-3);font-size:13px">Ya está en tu wallet.</span></div>
  </div>`;
  const btns = m.querySelector('.m-btns'); btns.style.display = 'flex';
  $('cm-cancel').style.display = 'none';
  const ok = $('cm-ok'); ok.textContent = '¡Listo!'; ok.className = 'btn btn-oro'; ok.onclick = () => m.classList.remove('show');
  m.classList.add('show');
}

async function swEjecutar() {
  const act = S.accion;
  if (act === 'connect') { conectarWallet(); return; }
  if (act === 'net') { wallet.cambiarARedCorrecta().catch(() => {}); return; }
  const from = swMon(S.fromId), to = swMon(S.toId);
  const amtBI = swAmountBI();
  if (!(amtBI > 0n)) return;
  try {
    // Conversión WBNB <-> BNB (una sola firma, sin permiso, 1:1)
    if (act === 'wrap' || act === 'unwrap') {
      modalBusy(act === 'wrap'
        ? 'Convertir BNB en WBNB.<br>Es una sola firma.<br><br>Confirma en tu wallet.'
        : 'Convertir WBNB en BNB.<br>Es una sola firma.<br><br>Confirma en tu wallet.');
      if (act === 'wrap') await gb.envolverBNB(amtBI); else await gb.desenvolverBNB(amtBI);
      swExito(from, to, amtBI, amtBI);
      S.amount = ''; S.out = 0n; S.minOut = 0n; const a1 = $('sw-amt'); if (a1) a1.value = '';
      swCargarBalances(); setOut(); swRenderInfo(); swRenderBtn();
      return;
    }
    if (!(S.out > 0n)) { modalError('No hay ruta para este par ahora mismo. Prueba otra moneda o monto.'); return; }
    // Si hace falta permiso, son DOS firmas: permiso + intercambio
    const necesitaPermiso = (act === 'approve');
    if (necesitaPermiso) {
      // Límite de gasto acotado (~$200) para no disparar el aviso de "ilimitado"
      let capBI = amtBI;
      const price = (LOGOS[from.id]?.price) || (from.id === 'WBNB' ? LOGOS['BNB']?.price : null);
      if (price && price > 0) { try { const cb = gb.parse((200 / price).toFixed(Math.min(from.decimals, 18)), from.decimals); if (cb > capBI) capBI = cb; } catch (_) {} }
      modalBusy(`<b>Paso 1 de 2 — Permiso de ${from.simbolo}.</b><br>Autorizas un límite de gasto (puedes cambiarlo o revocarlo cuando quieras). Después confirmarás el intercambio.<br><br>Confirma en tu wallet.`);
      await gb.aprobarSwap(from.address, capBI);
      // refrescar cotización/permiso antes del segundo paso
      const cuenta = wallet.cuentaActual();
      try { S.allow = await gb.allowanceSwap(from.address, cuenta); } catch (_) {}
      const r = await gb.cotizarSwap({ inAddr: from.address, outAddr: to.address, amountInBI: amtBI, slippageBps: 50 });
      if (r) { S.out = r.amountOut; S.minOut = r.minOut; S.fee = r.fee; }
      modalBusy('<b>Paso 2 de 2 — Confirma el intercambio.</b><br>Última firma para completar.<br><br>Confirma en tu wallet.');
    } else {
      modalBusy('Confirma el intercambio en tu wallet…');
    }
    await gb.ejecutarSwap({ inAddr: from.address, outAddr: to.address, amountInBI: amtBI, minOut: S.minOut, fee: S.fee });
    swExito(from, to, amtBI, S.out);
    S.amount = ''; S.out = 0n; S.minOut = 0n; const a2 = $('sw-amt'); if (a2) a2.value = '';
    swCargarBalances(); setOut(); swRenderInfo(); swRenderBtn();
  } catch (e) {
    console.warn('[Aurex] detalle técnico:', e);
    modalError(enCristiano(e));
  }
}
