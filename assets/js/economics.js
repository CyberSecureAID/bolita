/**
 * MATEMÁTICA DE LA BANCA — espejo de Bolita.sol
 * =============================================
 *
 * TRES CANDADOS, y manda el más estricto de los tres:
 *
 *   1. TOPE DE EXPOSICIÓN
 *      La banca nunca acepta una jugada que no pueda pagar.
 *          deuda_máxima = banca × exposición
 *          apuesta_máxima = deuda_máxima / multiplicador
 *
 *   2. TOPE DE PAGO POR JUGADA  ← el que controla los premios grandes
 *      Ninguna jugada puede cobrar más de `moneda.maxPago`, pase lo que pase.
 *          apuesta_máxima = maxPago / multiplicador
 *
 *   3. TOPE DE LA MONEDA
 *      Límite fijo por jugada y por persona, en la unidad de esa moneda.
 *
 * El tope 2 es la respuesta a "las recompensas son demasiado altas". Sin él,
 * un parlé de 400× convertiría una apuesta pequeña en un pago enorme. Con él,
 * el premio máximo está acotado en la propia moneda: fracciones de BNB,
 * satoshis, centavos.
 */

export const DENOMINATOR = 10000;

/**
 * MODOS DE JUEGO
 *
 * Salen CINCO números del 00 al 99. El primero es el fijo.
 *
 * Los multiplicadores salen de la probabilidad real, dejando ~20% de margen
 * a la banca. Si cambias uno, cambia el margen: revísalo con `margen()`.
 */
export const MODOS = {
  terminal: {
    id: 'terminal',
    nombre: 'Terminales',
    corto: 'Terminal',
    descripcion: 'Un dígito. Ganas si el fijo termina en él.',
    multiplicador: 1.5,        // apuestas 10, recoges 15
    probabilidad: 1 / 10,
    seleccion: 1,
    rango: 10,
    resultados: 10,
    factorPago: 1
  },
  fijo: {
    id: 'fijo',
    nombre: 'Número solo',
    corto: 'Número',
    descripcion: 'Un número del 00 al 99. Ganas si sale como fijo.',
    multiplicador: 2,          // duplica: apuestas 10, recoges 20
    probabilidad: 5 / 100,
    seleccion: 1,
    rango: 100,
    resultados: 100,
    factorPago: 1.5
  },
  parle: {
    id: 'parle',
    nombre: 'Parlé',
    corto: 'Parlé',
    descripcion: 'Dos números. Ganas si ambos salen ese día.',
    multiplicador: 3,          // apuestas 10, recoges 30
    probabilidad: 10 / 4950,
    seleccion: 2,
    rango: 100,
    resultados: 4950,
    factorPago: 4
  }
};

export const LISTA_MODOS = Object.values(MODOS);

/* ================================================================== */
/* Topes                                                               */
/* ================================================================== */

/** Deuda máxima que la banca acepta por resultado posible. */
export function deudaMaxima(banca, exposureBps) {
  return (banca * exposureBps) / DENOMINATOR;
}

/**
 * Tope de apuesta para una jugada, ya combinando los tres candados.
 * Devuelve también cuál mandó, para poder explicárselo al usuario.
 */
export function topeApuesta(banca, exposureBps, modo, moneda) {
  const porExposicion = deudaMaxima(banca, exposureBps) / modo.multiplicador;
  const porPago       = (moneda.maxPago * (modo.factorPago ?? 1)) / modo.multiplicador;
  const porMoneda     = moneda.maxPorJugada;

  const valor = Math.min(porExposicion, porPago, porMoneda);

  let motivo = 'moneda';
  if (valor === porExposicion) motivo = 'exposicion';
  else if (valor === porPago)  motivo = 'pago';

  return { valor, motivo, porExposicion, porPago, porMoneda };
}

/** Lo que queda libre en una jugada concreta. */
export function disponible(banca, exposureBps, modo, moneda, yaApostado) {
  return Math.max(0, topeApuesta(banca, exposureBps, modo, moneda).valor - yaApostado);
}

/** La comprobación literal del contrato. */
export function seAcepta(banca, exposureBps, modo, moneda, yaApostado, monto) {
  const tope = topeApuesta(banca, exposureBps, modo, moneda).valor;
  const quedaria = yaApostado + monto;

  if (monto < moneda.minApuesta) {
    return { aceptada: false, motivo: 'minimo', disponible: tope - yaApostado };
  }
  if (quedaria > tope + 1e-12) {
    return { aceptada: false, motivo: 'cupo', disponible: Math.max(0, tope - yaApostado) };
  }
  return { aceptada: true, motivo: 'ok', disponible: tope - quedaria };
}

/** Lo que cobra una jugada si acierta. */
export function pagoDe(monto, modo) {
  return monto * modo.multiplicador;
}

/** Margen de la banca en porcentaje. */
export function margen(modo) {
  return (1 - modo.probabilidad * modo.multiplicador) * 100;
}

/* ================================================================== */
/* Reparto entre varias selecciones                                    */
/* ================================================================== */

/**
 * REPARTO AUTOMÁTICO
 *
 * El usuario marca varias jugadas y pone un importe total. Se reparte a
 * partes iguales, respetando el mínimo de la moneda y el cupo de cada una.
 *
 * Si alguna jugada tiene un importe fijado a mano, ese se respeta y el resto
 * se reparte entre las demás.
 *
 * @param {Array<{clave:string, modo:object, yaApostado:number, fijado?:number}>} jugadas
 * @param {number} total       importe total que quiere jugar
 * @param {object} moneda
 * @param {number} banca
 * @param {number} exposureBps
 *
 * @returns {{
 *   reparto: Array<{clave, modo, monto, pago, recortada:boolean}>,
 *   asignado: number, sobrante: number,
 *   pagoMaximo: number, avisos: string[]
 * }}
 */
export function repartir(jugadas, total, moneda, banca, exposureBps) {
  const avisos = [];
  if (jugadas.length === 0) {
    return { reparto: [], asignado: 0, sobrante: total, pagoMaximo: 0, avisos };
  }

  // Reparto LIBRE, sin topes ni cupos. La persona apuesta lo que quiera; el
  // contrato es quien luego paga la ganancia según la liquidez que haya (y si
  // no alcanza, paga lo que pueda; el capital del jugador nunca se le quita si
  // gana). Aquí solo repartimos el importe entre las jugadas.

  // 1. Las jugadas con importe fijado a mano se respetan tal cual.
  const fijadas = jugadas.filter((j) => typeof j.fijado === 'number' && j.fijado > 0);
  const libres  = jugadas.filter((j) => !(typeof j.fijado === 'number' && j.fijado > 0));

  const reparto = [];
  let asignado = 0;

  for (const j of fijadas) {
    const monto = j.fijado;
    reparto.push({ clave: j.clave, modo: j.modo, yaApostado: j.yaApostado, monto, pago: pagoDe(monto, j.modo), recortada: false });
    asignado += monto;
  }

  // 2. El resto se reparte EQUITATIVAMENTE entre las libres.
  //    (10 dólares a 5 números = 2 cada uno.)
  const bolsa = Math.max(0, total - asignado);
  if (libres.length > 0 && bolsa > 0) {
    const cuota = bolsa / libres.length;
    for (const j of libres) {
      reparto.push({ clave: j.clave, modo: j.modo, yaApostado: j.yaApostado, monto: cuota, pago: pagoDe(cuota, j.modo), recortada: false });
      asignado += cuota;
    }
  }

  const pagoMaximo = reparto.reduce((mx, r) => Math.max(mx, r.pago), 0);
  return { reparto, asignado, sobrante: 0, pagoMaximo, avisos };
}

/* ================================================================== */
/* Liquidación y comprobaciones                                        */
/* ================================================================== */

export function liquidar(apuestas, gana, multiplicador) {
  const total = apuestas.reduce((a, b) => a + b, 0);
  const pago = (apuestas[gana] ?? 0) * multiplicador;
  return { total, pago, delta: total - pago };
}

/** Peor pérdida posible en un sorteo, en unidades de la moneda. */
export function peorPerdida(banca, exposureBps, modo, moneda) {
  const cupo = topeApuesta(banca, exposureBps, modo, moneda).valor;
  const paga = cupo * modo.multiplicador;
  return {
    entra: cupo,
    paga,
    perdida: paga - cupo,
    porcentaje: banca > 0 ? ((paga - cupo) / banca) * 100 : 0
  };
}
