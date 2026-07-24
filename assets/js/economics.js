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
    descripcion: 'Un dígito. Sale si el fijo termina en él.',
    multiplicador: 8,
    probabilidad: 1 / 10,
    seleccion: 1,
    rango: 10,
    resultados: 10,
    factorPago: 1        // multiplica el tope de pago de la moneda
  },
  fijo: {
    id: 'fijo',
    nombre: 'Número solo',
    corto: 'Número',
    descripcion: 'Un número del 00 al 99. Sale si aparece entre los cinco.',
    multiplicador: 16,
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
    descripcion: 'Dos números. Tienen que salir los dos.',
    multiplicador: 400,
    probabilidad: 10 / 4950,
    seleccion: 2,
    rango: 100,
    resultados: 4950,
    // El parlé existe para pagar más: se le deja un techo mayor, o su cupo
    // quedaría por debajo del mínimo de apuesta y nunca se podría jugar.
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

  // 1. Separar las que llevan importe fijado a mano
  const fijadas = jugadas.filter((j) => typeof j.fijado === 'number' && j.fijado > 0);
  const libres  = jugadas.filter((j) => !(typeof j.fijado === 'number' && j.fijado > 0));

  const reparto = [];
  let asignado = 0;

  // 2. Las fijadas se respetan, recortadas a su cupo
  for (const j of fijadas) {
    const tope = topeApuesta(banca, exposureBps, j.modo, moneda).valor;
    const libre = Math.max(0, tope - (j.yaApostado ?? 0));
    const monto = Math.min(j.fijado, libre);
    const recortada = monto < j.fijado - 1e-12;
    if (recortada) avisos.push(`${j.clave}: recortada al cupo`);
    if (monto >= moneda.minApuesta) {
      reparto.push({ ...j, monto, pago: pagoDe(monto, j.modo), recortada });
      asignado += monto;
    } else if (monto > 0) {
      avisos.push(`${j.clave}: por debajo del mínimo, se descarta`);
    }
  }

  // 3. El resto se reparte entre las libres
  let bolsa = Math.max(0, total - asignado);

  if (libres.length > 0 && bolsa > 0) {
    // Reparto iterativo: lo que sobra de una jugada tope se reparte otra vez
    let pendientes = libres.map((j) => ({
      ...j,
      tope: Math.max(0, topeApuesta(banca, exposureBps, j.modo, moneda).valor - (j.yaApostado ?? 0)),
      monto: 0
    }));

    let vueltas = 0;
    while (bolsa > 1e-12 && pendientes.some((j) => j.monto < j.tope) && vueltas < 12) {
      const activas = pendientes.filter((j) => j.monto < j.tope - 1e-12);
      if (activas.length === 0) break;

      const cuota = bolsa / activas.length;
      let repartidoEnVuelta = 0;

      for (const j of activas) {
        const cabe = Math.min(cuota, j.tope - j.monto);
        j.monto += cabe;
        repartidoEnVuelta += cabe;
      }

      bolsa -= repartidoEnVuelta;
      if (repartidoEnVuelta < 1e-12) break;
      vueltas++;
    }

    for (const j of pendientes) {
      if (j.monto >= moneda.minApuesta) {
        reparto.push({
          clave: j.clave, modo: j.modo, yaApostado: j.yaApostado,
          monto: j.monto, pago: pagoDe(j.monto, j.modo),
          recortada: j.monto >= j.tope - 1e-12
        });
        asignado += j.monto;
      } else if (j.monto > 0) {
        bolsa += j.monto;
        avisos.push(`${j.clave}: por debajo del mínimo`);
      }
    }
  }

  const pagoMaximo = reparto.reduce((mx, r) => Math.max(mx, r.pago), 0);
  const sobrante = Math.max(0, total - asignado);

  if (sobrante > 1e-9) {
    avisos.push('Sobra importe: los cupos no admiten más en este sorteo.');
  }

  return { reparto, asignado, sobrante, pagoMaximo, avisos };
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
