/**
 * Interfaz de La Bolita — modo demostracion.
 *
 * Usa la MISMA matematica que el contrato (economics.js), con una banca
 * simulada en memoria. Asi se puede ver el mecanismo funcionando en GitHub
 * Pages sin desplegar nada ni conectar una wallet.
 *
 * Cuando el contrato este desplegado, solo hay que sustituir las funciones de
 * `bank` por llamadas a roundSnapshot() y bet(). El resto de la interfaz no
 * cambia.
 */

import {
  maxStakePerTerminal, availableOnTerminal, canAccept, settleRound, houseEdge
} from './economics.js';

import { pad2, numbersOfTerminal, symbolOf } from './charada.js';

/* ================================================================== */
/* Banca simulada                                                      */
/* ================================================================== */

const CONFIG = {
  bankroll: 100,
  exposureBps: 2000,   // 20% de la banca por terminal
  payoutX: 8,
  minBet: 0.1,
  maxPerUser: 2
};

const bank = {
  bankroll: CONFIG.bankroll,
  round: 1,
  stakes: new Array(10).fill(0),   // apostado por todos en cada terminal
  mine: new Array(10).fill(0),     // lo que ha puesto el usuario
  selected: null,
  rolling: false
};

const $ = (id) => document.getElementById(id);
const money = (n) => '$' + n.toFixed(2);

/* ================================================================== */
/* Pintado                                                             */
/* ================================================================== */

function paintBoard() {
  $('b-bank').textContent = money(bank.bankroll);
  $('b-payout').textContent = CONFIG.payoutX + '×';
  $('b-cap').textContent = money(
    maxStakePerTerminal(bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX)
  );
  $('b-round').textContent = '#' + bank.round;
}

function buildTerminals() {
  const host = $('terminals');
  host.innerHTML = '';

  for (let t = 0; t < 10; t++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tile';
    btn.dataset.terminal = t;
    btn.innerHTML = `
      <span class="digit">${t}</span>
      <div class="covers">${pad2(t)} · ${pad2(t + 10)} · …</div>
      <div class="gauge"><span></span></div>
      <div class="room"></div>
    `;
    btn.addEventListener('click', () => selectTerminal(t));
    btn.addEventListener('mouseenter', () => showCharada(t));
    host.appendChild(btn);
  }
  paintTerminals();
}

function paintTerminals() {
  const cap = maxStakePerTerminal(bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX);

  document.querySelectorAll('.tile').forEach((tile) => {
    const t = Number(tile.dataset.terminal);
    const used = bank.stakes[t];
    const room = availableOnTerminal(bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX, used);
    const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;

    const gauge = tile.querySelector('.gauge span');
    gauge.style.width = pct + '%';
    gauge.className = pct >= 99.9 ? 'full' : pct >= 60 ? 'warm' : '';

    tile.querySelector('.room').textContent =
      room <= 0.001 ? 'lleno' : 'quedan ' + money(room);

    tile.classList.toggle('selected', bank.selected === t);
    tile.disabled = room <= 0.001 || bank.rolling;

    const oldFlag = tile.querySelector('.flag');
    if (oldFlag) oldFlag.remove();
    if (bank.mine[t] > 0) {
      const flag = document.createElement('span');
      flag.className = 'flag';
      flag.textContent = money(bank.mine[t]);
      tile.appendChild(flag);
    }
  });
}

function showCharada(t) {
  const nums = numbersOfTerminal(t);
  $('charada-box').innerHTML =
    `<div style="color:var(--brass-lit);margin-bottom:10px">Terminal ${t} — cubre estos diez números</div>` +
    nums.map((n) =>
      `<span style="display:inline-block;min-width:150px">
         <strong style="color:var(--ivory)">${pad2(n)}</strong>
         <span style="color:var(--ivory-deep)"> ${symbolOf(n)}</span>
       </span>`
    ).join('');
}

function paintPreview() {
  const amount = parseFloat($('amount').value) || 0;
  $('preview').textContent = money(amount * CONFIG.payoutX);

  const btn = $('play');
  if (bank.rolling) {
    btn.disabled = true;
    btn.textContent = 'Sorteando…';
    return;
  }
  if (bank.selected === null) {
    btn.disabled = true;
    btn.textContent = 'Escoge un terminal';
    return;
  }

  const check = canAccept(
    bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX,
    bank.stakes[bank.selected], amount
  );

  const mineWouldBe = bank.mine.reduce((a, b) => a + b, 0) + amount;

  if (amount < CONFIG.minBet) {
    btn.disabled = true;
    btn.textContent = `Mínimo ${money(CONFIG.minBet)}`;
  } else if (mineWouldBe > CONFIG.maxPerUser) {
    btn.disabled = true;
    btn.textContent = `Tope por persona: ${money(CONFIG.maxPerUser)}`;
  } else if (!check.accepted) {
    btn.disabled = true;
    btn.textContent = `Terminal lleno — quedan ${money(check.available)}`;
  } else {
    btn.disabled = false;
    btn.textContent = `Jugar ${money(amount)} al terminal ${bank.selected}`;
  }
}

/* ================================================================== */
/* Acciones                                                            */
/* ================================================================== */

function selectTerminal(t) {
  if (bank.rolling) return;
  bank.selected = bank.selected === t ? null : t;
  paintTerminals();
  paintPreview();
  showCharada(t);
}

/**
 * Simula que otros jugadores entran a la ronda.
 * Sin esto la demostracion se ve vacia y no se entiende el aforo.
 */
function simulateOthers() {
  const cap = maxStakePerTerminal(bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX);

  for (let t = 0; t < 10; t++) {
    if (Math.random() < 0.55) {
      const room = Math.max(0, cap - bank.stakes[t]);
      if (room > 0.05) {
        bank.stakes[t] += Math.random() * room * 0.7;
      }
    }
  }
}

async function play() {
  const amount = parseFloat($('amount').value) || 0;
  const terminal = bank.selected;
  if (terminal === null) return;

  const check = canAccept(
    bank.bankroll, CONFIG.exposureBps, CONFIG.payoutX,
    bank.stakes[terminal], amount
  );
  if (!check.accepted) return;

  bank.stakes[terminal] += amount;
  bank.mine[terminal] += amount;
  bank.rolling = true;
  paintTerminals();
  paintPreview();

  simulateOthers();
  paintTerminals();

  // Animacion del bombo
  const ball = $('ball');
  ball.classList.add('rolling');
  $('symbol').textContent = 'girando';
  $('outcome').textContent = 'Sacando el número…';
  $('outcome').className = 'outcome';

  const spin = setInterval(() => {
    ball.textContent = pad2(Math.floor(Math.random() * 100));
  }, 70);

  await new Promise((r) => setTimeout(r, 2200));
  clearInterval(spin);
  ball.classList.remove('rolling');

  // El sorteo. En produccion esto lo da Chainlink VRF.
  const number = Math.floor(Math.random() * 100);
  const winner = number % 10;

  ball.textContent = pad2(number);
  $('symbol').textContent = symbolOf(number);

  const result = settleRound(bank.stakes, winner, CONFIG.payoutX);
  bank.bankroll += result.bankrollDelta;

  const myWin = bank.mine[winner] * CONFIG.payoutX;

  if (myWin > 0) {
    $('outcome').className = 'outcome win';
    $('outcome').textContent =
      `Salió el terminal ${winner}. Cobras ${money(myWin)}.`;
  } else {
    $('outcome').className = 'outcome lose';
    $('outcome').textContent =
      `Salió el terminal ${winner}. Esta vez no.`;
  }

  // Nueva ronda
  bank.round += 1;
  bank.stakes = new Array(10).fill(0);
  bank.mine = new Array(10).fill(0);
  bank.selected = null;
  bank.rolling = false;

  paintBoard();
  paintTerminals();
  paintPreview();
}

/* ================================================================== */
/* Arranque                                                            */
/* ================================================================== */

function init() {
  buildTerminals();
  paintBoard();

  $('amount').addEventListener('input', paintPreview);
  $('play').addEventListener('click', play);

  document.querySelectorAll('.quick').forEach((b) => {
    b.addEventListener('click', () => {
      $('amount').value = b.dataset.amt;
      paintPreview();
    });
  });

  simulateOthers();
  paintTerminals();
  paintPreview();

  console.info(
    `[Bolita] Margen de la banca con pago ${CONFIG.payoutX}x: ${houseEdge(CONFIG.payoutX).toFixed(0)}%`
  );
}

init();
