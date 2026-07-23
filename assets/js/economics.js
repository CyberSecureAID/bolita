/**
 * Matematica de la banca — espejo exacto de Bolita.sol.
 *
 * Si cambias una formula aqui, cambiala tambien en el contrato. Se separa
 * para poder probarla sin desplegar nada.
 *
 * LA IDEA QUE SOSTIENE TODO:
 *
 *   El contrato nunca acepta una apuesta que no pueda pagar. Antes de tomar
 *   el dinero calcula cuanto deberia si ese terminal saliera premiado. Si esa
 *   cifra pasa del limite, la rechaza.
 *
 *   No es que quebrar sea improbable. Es que es aritmeticamente imposible.
 */

export const DENOMINATOR = 10000;
export const TERMINALS = 10;

/** Deuda maxima que se permite por terminal. */
export function maxLiability(bankroll, exposureBps) {
  return (bankroll * exposureBps) / DENOMINATOR;
}

/** Cuanto se puede llegar a apostar a un terminal, en total. */
export function maxStakePerTerminal(bankroll, exposureBps, payoutX) {
  return maxLiability(bankroll, exposureBps) / payoutX;
}

/** Cuanto queda libre en un terminal concreto. */
export function availableOnTerminal(bankroll, exposureBps, payoutX, alreadyStaked) {
  const cap = maxStakePerTerminal(bankroll, exposureBps, payoutX);
  return Math.max(0, cap - alreadyStaked);
}

/**
 * Decide si una apuesta se acepta. Es la comprobacion literal del contrato.
 * @returns {{accepted:boolean, reason:string, available:number}}
 */
export function canAccept(bankroll, exposureBps, payoutX, alreadyStaked, amount) {
  const cap = maxStakePerTerminal(bankroll, exposureBps, payoutX);
  const wouldBe = alreadyStaked + amount;

  if (wouldBe > cap + 1e-9) {
    return {
      accepted: false,
      reason: 'terminal-lleno',
      available: Math.max(0, cap - alreadyStaked)
    };
  }
  return { accepted: true, reason: 'ok', available: cap - wouldBe };
}

/**
 * Liquida una ronda.
 * @param {number[]} stakes  apostado en cada terminal, indices 0..9
 * @param {number} winningTerminal
 * @param {number} payoutX
 * @returns {{totalStaked:number, payout:number, bankrollDelta:number}}
 */
export function settleRound(stakes, winningTerminal, payoutX) {
  const totalStaked = stakes.reduce((a, b) => a + b, 0);
  const payout = stakes[winningTerminal] * payoutX;

  return {
    totalStaked,
    payout,
    bankrollDelta: totalStaked - payout
  };
}

/**
 * Margen teorico de la banca, en porcentaje.
 *
 *   Con 10 terminales, la probabilidad de acertar es 1/10.
 *   Pagando P veces lo apostado, el retorno esperado del jugador es P/10.
 *   El margen de la banca es lo que queda.
 *
 *   Pago 8x  ->  esperanza 0.80  ->  margen 20%
 *   Pago 9x  ->  esperanza 0.90  ->  margen 10%
 *   Pago 10x ->  esperanza 1.00  ->  margen 0%   (juego justo, banca no gana)
 */
export function houseEdge(payoutX) {
  return (1 - payoutX / TERMINALS) * 100;
}

/**
 * Peor caso posible de una ronda: todos los terminales llenos y sale el
 * premiado. Sirve para demostrar que la banca sale ganando incluso asi.
 */
export function worstCase(bankroll, exposureBps, payoutX) {
  const capPerTerminal = maxStakePerTerminal(bankroll, exposureBps, payoutX);
  const totalIn = capPerTerminal * TERMINALS;
  const payout = capPerTerminal * payoutX;

  return {
    capPerTerminal,
    totalIn,
    payout,
    profit: totalIn - payout,
    bankrollAfter: bankroll + (totalIn - payout)
  };
}

/**
 * Caso adverso real: solo se llena UN terminal y justo ese sale premiado.
 * Es la peor perdida posible en una sola ronda.
 */
export function worstLoss(bankroll, exposureBps, payoutX) {
  const capPerTerminal = maxStakePerTerminal(bankroll, exposureBps, payoutX);
  const payout = capPerTerminal * payoutX;

  return {
    stakedIn: capPerTerminal,
    payout,
    loss: payout - capPerTerminal,
    bankrollAfter: bankroll - (payout - capPerTerminal),
    percentOfBankroll: ((payout - capPerTerminal) / bankroll) * 100
  };
}
