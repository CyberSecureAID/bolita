/**
 * Matematica de la banca — espejo de Bolita.sol.
 *
 * LO QUE SOSTIENE TODO EL SISTEMA:
 *
 *   El contrato nunca acepta una apuesta que no pueda pagar. Antes de tocar
 *   el dinero calcula cuanto deberia si esa jugada acertara. Si pasa del
 *   limite, la rechaza.
 *
 *   No es que quebrar sea improbable. Es aritmeticamente imposible.
 *
 * LA MISMA FORMULA SIRVE PARA LOS TRES MODOS. Cuanto mas paga una jugada,
 * menos se puede apostar a ella. El sistema se equilibra solo:
 *
 *   Terminal   paga  8x  ->  se puede apostar mucho
 *   Fijo       paga 16x  ->  se puede apostar la mitad
 *   Parlé      paga 400x ->  se puede apostar muy poco
 */

export const DENOMINATOR = 10000;

/**
 * MODOS DE JUEGO.
 *
 * En cada sorteo salen 5 numeros del 00 al 99.
 *
 *   TERMINAL  Juegas un digito (0-9). Aciertas si el ultimo digito del
 *             primer numero es el tuyo.       1 de cada 10   ->  8x
 *
 *   FIJO      Juegas un numero (00-99). Aciertas si aparece entre los 5
 *             que salen.                      5 de cada 100  -> 16x
 *
 *   PARLÉ     Juegas dos numeros. Aciertas si LOS DOS aparecen entre los 5.
 *             10 de cada 4950                                -> 400x
 *
 * ⚠️ AJUSTA AQUÍ SI LAS REGLAS DE TU BOLITA SON DISTINTAS. Cambiando el
 *    multiplicador y la probabilidad, todo lo demas se recalcula solo:
 *    los topes, el margen y los limites del contrato.
 */
export const MODOS = {
  terminal: {
    id: 'terminal',
    nombre: 'Terminales',
    descripcion: 'Juegas un dígito. Sale si el último número termina en el tuyo.',
    multiplicador: 8,
    probabilidad: 1 / 10,
    seleccion: 1,
    rango: 10,
    resultados: 10        // digitos 0-9
  },
  fijo: {
    id: 'fijo',
    nombre: 'Número solo',
    descripcion: 'Juegas un número del 00 al 99. Sale si aparece entre los cinco.',
    multiplicador: 16,
    probabilidad: 5 / 100,
    seleccion: 1,
    rango: 100,
    resultados: 100       // numeros 00-99
  },
  parle: {
    id: 'parle',
    nombre: 'Parlé',
    descripcion: 'Juegas dos números. Tienen que salir los dos.',
    multiplicador: 400,
    probabilidad: 10 / 4950,
    seleccion: 2,
    rango: 100,
    resultados: 4950      // combinaciones de dos numeros
  }
};

/** Deuda maxima que la banca acepta por resultado posible. */
export function maxLiability(bankroll, exposureBps) {
  return (bankroll * exposureBps) / DENOMINATOR;
}

/** Tope de lo apostado a una jugada concreta, segun lo que pagaria. */
export function maxStake(bankroll, exposureBps, multiplicador) {
  return maxLiability(bankroll, exposureBps) / multiplicador;
}

/** Cuanto queda libre en una jugada. */
export function disponible(bankroll, exposureBps, multiplicador, yaApostado) {
  return Math.max(0, maxStake(bankroll, exposureBps, multiplicador) - yaApostado);
}

/**
 * La comprobacion literal del contrato: ¿se acepta esta apuesta?
 * @returns {{aceptada:boolean, motivo:string, disponible:number}}
 */
export function seAcepta(bankroll, exposureBps, multiplicador, yaApostado, monto) {
  const tope = maxStake(bankroll, exposureBps, multiplicador);
  const quedaria = yaApostado + monto;

  if (quedaria > tope + 1e-9) {
    return {
      aceptada: false,
      motivo: 'cupo-lleno',
      disponible: Math.max(0, tope - yaApostado)
    };
  }
  return { aceptada: true, motivo: 'ok', disponible: tope - quedaria };
}

/**
 * Margen de la banca, en porcentaje.
 *   esperanza del jugador = probabilidad * multiplicador
 *   margen de la banca    = 1 - esperanza
 */
export function margen(modo) {
  return (1 - modo.probabilidad * modo.multiplicador) * 100;
}

/** Liquida: cuanto se paga en total dado el resultado. */
export function liquidar(apuestas, gana, multiplicador) {
  const total = apuestas.reduce((a, b) => a + b, 0);
  const pago = (apuestas[gana] ?? 0) * multiplicador;
  return { total, pago, delta: total - pago };
}

/** Peor caso: todos los cupos llenos y sale uno. */
export function peorCaso(bankroll, exposureBps, modo) {
  const cupo = maxStake(bankroll, exposureBps, modo.multiplicador);
  const entra = cupo * modo.resultados;
  const paga = cupo * modo.multiplicador;
  return { cupo, entra, paga, beneficio: entra - paga };
}

/** Peor perdida: solo se llena un cupo y justo ese acierta. */
export function peorPerdida(bankroll, exposureBps, modo) {
  const cupo = maxStake(bankroll, exposureBps, modo.multiplicador);
  const paga = cupo * modo.multiplicador;
  return {
    entra: cupo,
    paga,
    perdida: paga - cupo,
    porcentaje: ((paga - cupo) / bankroll) * 100
  };
}
