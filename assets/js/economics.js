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
    multiplicador: 90,         // apuestas 1, recoges 90 (incluye tu apuesta)
    probabilidad: 1 / 10,
    seleccion: 1,
    numerosPorSeleccion: 10,   // un terminal abarca 10 números reales (8,18,28...)
    rango: 10,
    resultados: 10,
    factorPago: 1
  },
  fijo: {
    id: 'fijo',
    nombre: 'Número solo',
    corto: 'Número',
    descripcion: 'Un número del 00 al 99. Ganas si sale como fijo.',
    multiplicador: 100,        // apuestas 1, recoges 100 (incluye tu apuesta)
    probabilidad: 5 / 100,
    seleccion: 1,
    numerosPorSeleccion: 1,    // un número es 1 solo
    rango: 100,
    resultados: 100,
    factorPago: 1.5
  },
  parle: {
    id: 'parle',
    nombre: 'Parlé',
    corto: 'Parlé',
    descripcion: 'Dos números. Ganas si ambos salen ese día.',
    multiplicador: 1000,       // apuestas 1, recoges 1000 (incluye tu apuesta)
    probabilidad: 10 / 4950,
    seleccion: 2,
    numerosPorSeleccion: 1,    // un parlé es 1 combinación
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
 * REPARTO ALINEADO CON EL CONTRATO
 *
 * El importe puesto se reparte a partes iguales entre las CASILLAS marcadas.
 * Lo que la web manda al contrato por cada casilla es ese trozo; el CONTRATO
 * hace el resto de la división internamente:
 *   - Terminal: el contrato divide el trozo entre los 10 números del terminal.
 *   - Número:   va completo a ese número.
 *   - Parlé:    el contrato lo divide entre los 2 números del par.
 *
 * Ej. marco 2 terminales y pongo 10 → 5 a cada terminal → el contrato reparte
 *     cada 5 entre 10 = 0.5 por número. Si sale uno, cobro 0.5 * 90 = 45.
 * Ej. marco el número 46 y pongo 10 → 10 al 46 → cobro 10 * 100 = 1000.
 * Ej. marco un parlé y pongo 10 → el contrato usa 10/2 = 5 por número → cobro
 *     5 * 1000 = 5000.
 *
 * Sin topes ni cupos. `monto` es lo que se ENVÍA al contrato por esa casilla.
 * `pago` es lo que cobraría si sale (ya considerando la división interna).
 *
 * @returns {{ reparto, asignado, sobrante, pagoMaximo, avisos }}
 */
export function repartir(jugadas, total, moneda, banca, exposureBps, minPorNumero = 0) {
  const avisos = [];
  if (jugadas.length === 0) {
    return { reparto: [], asignado: 0, sobrante: 0, pagoMaximo: 0, avisos,
             numerosReales: 0, apuestaPorNumero: 0, bajoMinimo: false };
  }

  // Las casillas con importe fijado a mano se respetan; el resto se reparte.
  const fijadas = jugadas.filter((j) => typeof j.fijado === 'number' && j.fijado > 0);
  const libres  = jugadas.filter((j) => !(typeof j.fijado === 'number' && j.fijado > 0));

  let usadoFijo = 0;
  for (const j of fijadas) usadoFijo += j.fijado;
  const bolsa = Math.max(0, total - usadoFijo);
  const trozo = libres.length > 0 ? bolsa / libres.length : 0;

  const reparto = [];
  let asignado = 0;
  let numerosReales = 0;      // total de números que abarca la selección
  let minUnit = Infinity;     // la apuesta por número más baja

  for (const j of jugadas) {
    const esFija = typeof j.fijado === 'number' && j.fijado > 0;
    const monto = esFija ? j.fijado : trozo;   // lo que se envía al contrato
    if (monto <= 0) continue;

    // Cuántos números reales abarca esta casilla (terminal=10, resto=1)
    // y divisor interno del contrato (terminal /10, parlé /2, número /1).
    const cobertura = j.modo.numerosPorSeleccion ?? 1;
    const div = j.modo.id === 'terminal' ? 10 : (j.modo.id === 'parle' ? 2 : 1);
    const unit = monto / div;                  // lo que queda por número

    numerosReales += cobertura;
    if (unit < minUnit) minUnit = unit;

    reparto.push({
      clave: j.clave, modo: j.modo, yaApostado: j.yaApostado,
      monto,                        // se ENVÍA al contrato (calldata)
      apuestaUnit: unit,            // por número real
      pago: pagoDe(unit, j.modo),   // cobra si sale UN número
      recortada: false
    });
    asignado += monto;
  }

  // La apuesta POR NÚMERO (la más baja, que es la que cuenta para el mínimo).
  const apuestaPorNumero = isFinite(minUnit) ? minUnit : 0;

  // ¿Cae por debajo del mínimo por número? -> avisar.
  const bajoMinimo = minPorNumero > 0 && apuestaPorNumero > 0 && apuestaPorNumero < minPorNumero;

  const pagoMaximo = reparto.reduce((mx, r) => Math.max(mx, r.pago), 0);
  return { reparto, asignado, sobrante: 0, pagoMaximo, avisos,
           numerosReales, apuestaPorNumero, bajoMinimo };
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
