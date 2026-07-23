# La Bolita

La bolita cubana en cadena. Tres formas de jugar: **terminales**, **número
solo** y **parlé**.

---

## Estructura

```
bolita/
├── index.html                ← entrada de GitHub Pages
├── README.md
├── .nojekyll
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js            ← interfaz
│       ├── economics.js      ← matemática de la banca (espejo del contrato)
│       ├── charada.js        ← los 100 números y sus nombres
│       ├── versos.js         ← ⬅ EL VERSO DEL DÍA VA AQUÍ
│       ├── confetti.js       ← confeti al ganar, sin librerías
│       └── wallet.js         ← conexión MetaMask / Trust / etc.
└── contracts/
    └── Bolita.sol
```

**El archivo de los versos es `assets/js/versos.js`.** Para añadir más, escribe
dentro del array `VERSOS`. No hace falta tocar nada más.

---

## Las tres formas de jugar

Salen **cinco números** del 00 al 99. El primero es el **fijo**.

| Modo | Qué juegas | Aciertas si | Probabilidad | Paga |
|---|---|---|---|---|
| **Terminales** | Un dígito (0–9) | El fijo termina en tu dígito | 1 de 10 | **8×** |
| **Número solo** | Un número (00–99) | Aparece entre los cinco | 5 de 100 | **16×** |
| **Parlé** | Dos números | Aparecen **los dos** | 10 de 4.950 | **400×** |

Margen de la banca: **20%** en los tres.

> Si las reglas de tu bolita son distintas, se ajustan en un solo sitio:
> el objeto `MODOS` de `assets/js/economics.js`. Cambiando el multiplicador y
> la probabilidad, los topes y el margen se recalculan solos.

---

## El verso del día

Tradición cubana: cada día circula un verso, una adivinanza que alude a un
número. *"Es verde, salta y le gusta la humedad"* → la rana.

### ⚠️ La regla que no se toca

**El verso NO tiene ninguna relación con el número que sale.**

Se elige a partir de la **fecha**, nada más. El sorteo lo decide el contrato
por otra vía y en otro momento. Son dos cosas separadas y nunca se cruzan.

Si el verso se generara a partir del número ganador, todo el mundo jugaría ese
número y habría que pagar a todos a la vez. La banca quedaría expuesta.

**Verificado:** `versos.js` no importa nada del sorteo y no contiene ninguna
referencia a él. Mismo día → mismo verso; días distintos → versos distintos.

Vienen 40 versos escritos. Cada quien decide si guiarse por él o jugar lo que
le dé la gana.

---

## Por qué la banca no puede quebrar

El contrato **rechaza toda apuesta que no pueda pagar**. Lo comprueba antes de
tocar el dinero:

```solidity
uint256 liabilityIfWins = (newStake * payoutX100) / 100;
if (liabilityIfWins > maxLiability) revert CupoLleno(...);
```

**La misma fórmula sirve para los tres modos.** Cuanto más paga una jugada,
menos se puede apostar a ella. Con banca $100 y exposición 20%:

| Modo | Paga | Cupo por jugada |
|---|---|---|
| Terminales | 8× | $2.50 |
| Número solo | 16× | $1.25 |
| Parlé | 400× | $0.05 |

### Peor caso: todos los cupos de terminales llenos

```
Entra    10 × $2.50 =  $25.00
Se paga   8 × $2.50 = −$20.00
                       ───────
La banca GANA          +$5.00
```

### Peor pérdida posible en un sorteo

```
Se llena un solo cupo →  entra   $2.50
Y justo ese sale      →  se paga $20.00
                          ─────────────
Pérdida                   −$17.50  (17.5% de la banca)
```

Los cupos se recalculan sobre lo que queda, así que la banca se encoge pero
**nunca llega a cero**.

**Verificado con Node:** 5.000 sorteos simulados con los tres modos a la vez y
apuestas aleatorias. La banca no bajó del capital inicial en ningún momento.
(El crecimiento de la simulación es un artefacto de que las apuestas escalan
con la banca; no es una promesa de rentabilidad.)

---

## Wallet

`wallet.js` conecta con **MetaMask, Trust Wallet, Rabby, OKX, Phantom en modo
EVM** y cualquier otra que use el estándar EIP-1193 o EIP-6963. Sin librerías.

Detecta si estás en la red equivocada y ofrece cambiar a BNB Smart Chain, o
añadirla si no la tienes.

De momento solo conecta y muestra la cuenta: aún no hay contrato desplegado.

---

## Administración: sin panel web

Los ajustes viven en el contrato con `onlyOwner` y se llaman desde la wallet
del dueño en BscScan o Remix. **Si no existe página de administración, no hay
nada que hackear desde la web.**

| Función | Para qué |
|---|---|
| `depositBankroll(amount)` | Poner capital de respaldo |
| `withdrawBankroll(amount)` | Sacar beneficios (nunca el dinero de jugadores) |
| `setPayout(x100)` | Cambiar el pago |
| `setExposure(bps)` | Riesgo por resultado. Tope duro: 30% |
| `setBetLimits(min, maxPorPersona)` | Límites de apuesta |
| `pause()` / `unpause()` | Parada de emergencia |

`withdrawBankroll` no puede tocar lo que se debe a ganadores ni la garantía
reservada para el sorteo en curso.

---

## Estado

**Funciona:** interfaz completa, tres modos, cupos en vivo, bombo de cinco
bolas con revelado, confeti al ganar, charada de 100 números con filtros,
verso del día, conexión de wallet, modales de economía, reglas y pagos.

**Falta:** el contrato está escrito pero **no compilado ni desplegado**.
Y hay que conectar la interfaz al contrato — ahora usa una banca simulada.

### Para desplegar

1. Compilar `Bolita.sol` en Remix — Solidity 0.8.22, optimizador 200 runs
2. Crear suscripción de VRF y financiarla
3. Desplegar con: dirección de USDT en BSC, decimales, coordinador, subId, keyHash
4. Añadir el contrato como consumidor de la suscripción
5. `approve` + `depositBankroll`
6. `openRound()`
7. Sustituir la banca simulada de `app.js` por llamadas al contrato

---

## En local

Necesita servidor porque usa módulos de JavaScript:

```
python3 -m http.server 8000
```

En GitHub Pages funciona directo: **Settings → Pages → Deploy from a branch →
main / (root)**.
