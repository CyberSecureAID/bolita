# La Bolita — lotería de terminales sobre USDT

Bolita cubana en cadena. Juegas al **terminal** (último dígito), no al número
suelto: aciertas 1 de cada 10 veces y cobras **8×**.

---

## Abrir esto

### Ver la demostración (GitHub Pages)

1. Sube la carpeta al repo
2. **Settings → Pages → Deploy from a branch → main / (root)**
3. Abre la URL que te dé GitHub

En local necesita servidor porque usa módulos de JavaScript:

```
python3 -m http.server 8000
```

> La página funciona con una **banca simulada** en el navegador. No hay
> contrato desplegado, no se conecta wallet, no se mueve dinero. Sirve para ver
> el mecanismo y comprobar que las cuentas cuadran.

---

## Estructura

```
bolita/
├── index.html              ← entrada de GitHub Pages
├── README.md
├── .nojekyll
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js          ← interfaz y banca simulada
│       ├── economics.js    ← matemática (espejo del contrato)
│       └── charada.js      ← los 100 números y sus nombres
└── contracts/
    └── Bolita.sol          ← el contrato
```

---

## Por qué terminales y no números sueltos

|  | Número suelto | **Terminal** |
|---|---|---|
| Probabilidad | 1% | **10%** |
| Pago | 80× | **8×** |
| Margen de la banca | 20% | **20%** |
| Coste de un ganador | 80× la apuesta | **8× la apuesta** |

**Mismo margen, diez veces menos riesgo por jugada.** Con $100 de banca puedes
operar terminales; con números sueltos un solo acierto te la revienta.

---

## Por qué la banca no puede quebrar

No es que sea improbable. **El contrato rechaza toda apuesta que no pueda
pagar**, y lo comprueba antes de tocar el dinero:

```solidity
uint256 liabilityIfWins = (newTerminalStake * payoutX100) / 100;
if (liabilityIfWins > maxLiability) revert TerminalFullError(...);
```

Con banca $100, exposición 20% y pago 8×:

| | |
|---|---|
| Deuda máxima por terminal | $20.00 |
| Apostado máximo por terminal | $2.50 |

Cuando un terminal se llena, se cierra. Eso equilibra la banca sola.

### Peor caso: los 10 terminales llenos

```
Entra    10 × $2.50  =  $25.00
Se paga   8 × $2.50  = −$20.00
                        ───────
La banca GANA           +$5.00
```

Solo puede salir **un** terminal, así que solo se paga uno.

### Peor pérdida posible

```
Solo se llena 1 terminal  →  entra $2.50
Y justo ese sale          →  se paga $20.00
                             ─────────────
Pérdida                      −$17.50  (17.5% de la banca)
```

Los topes se recalculan sobre el saldo real, así que la banca se encoge pero
**nunca llega a cero**.

**Verificado:** 2.000 rondas simuladas con apuestas aleatorias. La banca no
tocó cero ni una vez. (El crecimiento de la simulación es un artefacto de que
las apuestas escalan con la banca; no es una promesa de rentabilidad.)

---

## Aleatoriedad

**Una sola fuente buena: Chainlink VRF.** Mezclar diez sistemas caseros no da
más seguridad, da más superficie de fallo. Con VRF ni el dueño puede predecir
ni alterar el resultado, y queda la prueba en cadena para quien quiera mirarla.

Si Chainlink no respondiera en 2 horas, `refundStuckRound()` anula la ronda y
devuelve lo apostado. El dinero nunca queda atrapado.

---

## Administración: sin panel web

Los ajustes viven en el contrato con `onlyOwner` y se llaman desde la wallet
del dueño en BscScan o Remix. **Si no existe página de administración, no hay
nada que hackear desde la web.**

| Función | Para qué |
|---|---|
| `depositBankroll(amount)` | Aportar capital de respaldo |
| `withdrawBankroll(amount)` | Sacar beneficios (nunca el dinero de jugadores) |
| `setPayout(x100)` | Cambiar el pago. Tope: 9.50× |
| `setExposure(bps)` | Riesgo por terminal. Tope: 30% |
| `setBetLimits(min, maxPorPersona)` | Límites de apuesta |
| `pause()` / `unpause()` | Parada de emergencia |

Topes que **ni el dueño** puede saltarse: pago máximo 9.50× (por encima el
margen se vuelve negativo) y exposición máxima 30%.

`withdrawBankroll` no puede tocar `pendingPayouts` ni la garantía reservada
para la ronda en curso.

---

## Desplegar

**Falta por hacer, en este orden:**

1. Compilar `Bolita.sol` en Remix — Solidity 0.8.22, optimizador 200 runs
2. Crear una suscripción de Chainlink VRF en BSC y financiarla con LINK
3. Desplegar con: dirección de USDT en BSC, 18 decimales, coordinador VRF,
   subId y keyHash
4. Añadir el contrato como consumidor de la suscripción VRF
5. `approve` + `depositBankroll` para poner el capital
6. `openRound()` para abrir la primera ronda
7. Conectar la web al contrato (sustituir la banca simulada por llamadas reales)

**Nada de esto se ha compilado ni desplegado todavía.** El contrato es lectura
revisada, no código probado en cadena.

---

## Lo que hay que decir de frente

Pagando 8× con probabilidad 1/10, **la banca se queda el 20% de todo lo
jugado** a largo plazo. Habrá quien gane, pero el conjunto de jugadores pierde
ese 20%. Así funciona la bolita de siempre y así funciona esta.

Tu capital no corre riesgo de quiebra, pero **está inmovilizado**: es la
garantía. Puedes retirar beneficios, no el respaldo mientras haya rondas
abiertas.

Y una nota práctica, no moral: operar apuestas de cara al público tiene
requisitos de licencia en casi todas partes. Para probarte a ti mismo si eres
capaz de construirlo, ningún problema — tenlo en cuenta antes de la parte de
distribución.
