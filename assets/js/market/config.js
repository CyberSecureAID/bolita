/* market/config.js — Constantes de datos del Marketplace: direcciones de
   contratos, RPCs, ABIs (market y ERC20) y listas (estados, monedas fiat,
   métodos de pago). Datos estáticos. Extraído de market.js. */

export const MARKET = '0x1131c4760Da083aaFCf20d6848Af93A8a2edFb18';
export const USDT   = '0x55d398326f99059fF775485246999027B3197955';
export const USDC   = '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d';
export const TOKENS = { [USDT.toLowerCase()]: 'USDT', [USDC.toLowerCase()]: 'USDC' };
export const RPCS = [
  'https://bsc-dataseed.binance.org',
  'https://bsc-dataseed1.defibit.io',
  'https://bsc-dataseed1.ninicoin.io',
  'https://rpc.ankr.com/bsc'
];

export const ABI = [
  'function ordenes(uint256) view returns (tuple(uint256 id,address vendedor,address comprador,address token,uint256 monto,uint256 liberado,uint16 tramos,uint16 tramosHechos,string moneda,string metodo,uint256 precioFiat,uint64 creadaEn,uint64 tomadaEn,uint64 ultimoMovEn,bool tramoPagado,uint8 estado,address arbitro,bool califVendedor,bool califComprador,uint8 tipo,string motivo,uint64 disputaEn,bool cancelaV,bool cancelaC))',
  'function perfiles(address) view returns (tuple(string nombre,string pais,string moneda,string contacto,bool existe,uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint64 sumaEstrellas,uint32 numVotos,uint64 desde,bool compartirUbic,int32 lat1e3,int32 lon1e3,string zona,string horario))',
  'function reputacionDe(address) view returns (uint32 ventasOk,uint32 comprasOk,uint32 disputasPerdidas,uint256 estrellasX100,uint32 votos,uint64 desde)',
  'function totalOrdenes() view returns (uint256)',
  'function comisionBnb() view returns (uint256)',
  'function fianzaDe(address) view returns (uint256)',
  'function fianzaMinima() view returns (uint256)',
  'function owner() view returns (address)',
  'function limiteDe(address) view returns (uint256)',
  'function misOrdenes(address) view returns (uint256[])',
  'function misCompras(address) view returns (uint256[])',
  'function pendientesDeCalificar(address) view returns (uint256[])',
  'function guardarPerfil(string,string,string,string)',
  'function ubicacionDe(address) view returns (bool comparte,int32 lat1e3,int32 lon1e3,string zona)',
  'function compartirUbicacion(int32,int32,string)',
  'function guardarHorario(string)',
  'function crearAnuncioCompra(address,uint256,string,string,uint256) payable returns (uint256)',
  'function ocultarUbicacion()',
  'function depositarFianza(uint256)',
  'function retirarFianza(uint256)',
  'function crearOrden(address,uint256,uint16,string,string,uint256) payable returns (uint256)',
  'function tomarOrden(uint256,address)',
  'function marcarPagado(uint256)',
  'function liberarTramo(uint256)',
  'function cancelarOrden(uint256)',
  'function cancelarPorTiempo(uint256)',
  'function abrirDisputa(uint256,string)',
  'function anularDisputa(uint256)',
  'function caducarDisputa(uint256)',
  'function pedirCancelar(uint256)',
  'function liberarReserva(uint256)',
  'function abandonarVenta(uint256)',
  'function retirarTodo() returns (uint256)',
  'function calificar(uint256,uint8)'
];
export const ERC20 = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)'
];

export const ESTADOS = ['Abierta', 'En curso', 'Completada', 'Cancelada', 'En disputa'];
export const MONEDAS = ['CUP', 'MLC', 'USD', 'MXN', 'COP', 'ARS', 'EUR', 'BRL', 'CAD', 'CLP', 'PEN', 'DOP', 'VES'];
export const METODOS = ['Transferencia', 'Zelle', 'PayPal', 'Saldo movil', 'Efectivo', 'Otro'];
// Monedas "a la par" (se cotizan cerca de 1:1 con el dólar): sugerimos multiplicadores.
export const PAR = ['USD', 'MLC', 'EUR'];

/* ── Datos movidos desde market.js (paneles/asistentes) ── */
export const SUGERE = { CUP: [380, 400, 420, 440], MXN: [17, 18, 19, 20], COP: [3900, 4000, 4200], ARS: [1000, 1100, 1200], VES: [36, 38, 40], DOP: [58, 60, 62], PEN: [3.7, 3.8, 3.9], CLP: [900, 950, 1000], BRL: [5, 5.2, 5.5], CAD: [1.35, 1.4, 1.45] };
export const ICOCT = {
  Telegram: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M21.9 4.3 18.7 19c-.2 1.1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 12.7 1.4 11.2c-1-.3-1.1-1 .2-1.5L20.5 2.4c.9-.3 1.6.2 1.4 1.9z"/></svg>`,
  WhatsApp: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.4 1.3 4.9L2 22l5.3-1.4c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>`,
  'Teléfono': `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .7-.2 1l-2.3 2.2z"/></svg>`
};
export const CF_PASOS = [
  ['Consejo de oro',
   'Divide siempre tu venta en <b>la mayor cantidad de partes posible</b>. Es la mejor defensa que existe aquí, y es gratis.'],
  ['¿Qué es esto?',
   'Un lugar para <b>vender y comprar cripto entre personas</b>, sin que ninguna tenga que confiar a ciegas en la otra. La plataforma no toca tu dinero: solo lo guarda en una caja fuerte automática mientras hacen el trato.'],
  ['El problema de siempre',
   'En los grupos, la pelea es <b>¿quién manda primero?</b> Si mandas tú, te pueden dejar embarcado. Si manda el otro, igual. Aquí eso se acaba.'],
  ['La caja fuerte',
   'El vendedor mete su cripto en el contrato. <b>Ya no la tiene él</b>, y tampoco la tenemos nosotros. El comprador lo ve con sus propios ojos y paga tranquilo.'],
  ['La entrega por partes',
   'El dinero <b>no se entrega de golpe</b>. Si vendes 500 en 5 partes, van saliendo de 100 en 100. Recibes tu pago, confirmas, y sale la siguiente parte.'],
  ['La fianza del vendedor',
   'Para vender hay que dejar una fianza. <b>Ese dinero es tuyo</b> y lo retiras cuando quieras. Solo sirve para responderle al comprador si un árbitro determina que hubo estafa.'],
  ['La reputación',
   'Al terminar, ambos se califican con estrellas. Ese historial queda <b>en la blockchain, y nadie lo puede borrar ni falsificar</b>. Mira siempre las estrellas y las ventas antes de tratar con alguien.'],
  ['Si algo sale mal',
   'Cualquiera puede abrir una disputa. Un árbitro revisa los comprobantes y decide. Como el dinero está trabado, <b>nadie puede desaparecer con él</b>.'],
  ['La distancia',
   'Puedes ver a cuántos kilómetros está la otra persona. Al estafador esto <b>no le gusta nada</b>. Y si viven cerca, quizás puedan hacer el trato en persona.'],
  ['También puedes publicar que compras',
   'Si no encuentras lo que buscas, ve a <b>Comprar</b> y publica tu anuncio: dices cuánto quieres y a cómo lo pagas, y los vendedores te escriben a ti. No trabas cripto ni necesitas fianza.']
];
export const COBROS = [
  { id: 'Transferencia', nom: 'Transferencia', desc: 'Banco, MLC, Clásica…', monedas: ['CUP', 'MLC', 'USD', 'EUR', 'MXN', 'COP'], pideDato: 'Nombre del banco o tarjeta (ej: MLC, Clásica, BPA)' },
  { id: 'Zelle',         nom: 'Zelle',         desc: 'Pago en dólares (EE. UU.)', monedas: ['USD'] },
  { id: 'PayPal',        nom: 'PayPal',        desc: 'Pago en dólares o euros', monedas: ['USD', 'EUR'] },
  { id: 'Saldo movil',   nom: 'Saldo móvil',   desc: 'Recarga al teléfono', monedas: ['CUP'] },
  { id: 'Efectivo',      nom: 'Efectivo',      desc: 'En mano, en persona', monedas: ['CUP', 'USD', 'EUR'] },
  { id: 'Otro',          nom: 'Otro',          desc: 'Tú escribes cuál', monedas: ['CUP', 'MLC', 'USD', 'EUR', 'MXN', 'COP', 'ARS', 'BRL', 'CLP', 'DOP', 'PEN', 'VES'], pideDato: '¿Cuál? Escríbelo' }
];
export const NOMBRE_MONEDA = {
  CUP: 'Peso cubano', MLC: 'Moneda libremente convertible', USD: 'Dólar', EUR: 'Euro',
  MXN: 'Peso mexicano', COP: 'Peso colombiano', ARS: 'Peso argentino', BRL: 'Real brasileño',
  CLP: 'Peso chileno', DOP: 'Peso dominicano', PEN: 'Sol peruano', VES: 'Bolívar'
};
