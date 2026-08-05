# Plataforma de Bots (BNB Smart Chain)

Bots de trading **no custodiales** sobre **BNB Smart Chain**. Sin exchange, sin KYC,
autocustodia total: cada operación (swap) sale directo a la wallet del usuario. La
plataforma nunca toca el dinero.

La lotería **"La Bolita"** existe todavía como fachada secundaria, pero **el producto
principal son los bots** y todo gira en torno a ellos.

> Para el contexto técnico completo (direcciones, decisiones, bugs resueltos, diseño
> del próximo bot) ver **`contexto.md`**.

---

## Los bots

| Bot | Modo | Qué hace |
|---|---|---|
| **Smart Grid** | 0 | Compra y vende dentro de un rango de precios; solo cierra cada cuadrícula en ganancia neta (cubre comisión + gas). |
| **Accumulator** | 1 | Compra en la caída (más volumen mientras más baja) y vende TODO junto al llegar a tu % de ganancia. |
| **Cash Out** | 2 | Vende la cripto que YA tienes cuando sube a un precio o % objetivo. Venta única, sin comisión de compra. |
| **DCA — "Compra Automática"** | 3 | *(próximo)* Compra un monto fijo cada cierto intervalo (ej. $10/semana), pase lo que pase con el precio. |

**Modelo:** suscripción de **$1 en BNB / 30 días** (camuflada como "activar"), que
habilita bots ilimitados ese mes y va directa al owner.

---

## Estructura del repo `bolita` (web · GitHub Pages)

```
bolita/  →  cybersecurityid.github.io
├── bot.html                  ← página de los bots (importa gridbot-ui.js; aquí va el favicon)
├── index.html                ← lotería (fachada secundaria)
├── README.md
├── contexto.md               ← contexto técnico completo del proyecto
├── .nojekyll
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── gridbot.js        ← capa de contrato (ABI, swaps, claves, wrap/unwrap BNB, recibos)
│       ├── gridbot-ui.js     ← la app de bots (#colmena-app): formularios, "Mis bots", CSS, modales
│       ├── tokens.js         ← lista de monedas (LISTA_TODAS = bots · LISTA_MONEDAS = lotería)
│       ├── wallet.js         ← conexión MetaMask / Trust
│       └── app.js, economics.js, charada.js, versos.js, confetti.js   ← lotería
└── contracts/
    └── GridBotV9.sol         ← implementación actual del contrato de bots
```

Los tres archivos que se tocan para los bots son **`assets/js/gridbot.js`**,
**`assets/js/gridbot-ui.js`** y **`assets/js/tokens.js`**.

---

## Contrato (GridBot · proxy UUPS)

- **Proxy (el que usan web y keeper):** `0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B`
- **Implementación actual: V9** `0x8a77a4e4482075776b5A1A57303Efd4732842A6A`
- Compilar con **Solidity 0.8.22, EVM shanghai, Optimization runs = 1**.
- Actualizar: desplegar la nueva implementación en Remix → `upgradeToAndCall(impl, 0x)`
  en el proxy. El estado vive en el proxy (no se migra).
- Motor: PancakeSwap **V3** (`exactInputSingle` + QuoterV2). Sin mensajes de revert
  (la web pre-chequea). V9 permite **varios bots por par** (`botId` en la clave) y
  expone `feeTier` en el `resumen`.

---

## Infraestructura (Cloudflare Workers)

- **`bolita-keeper`** → worker **`bolita-keeper-bot`** (cron 1 min). **Auto-despliega al
  hacer push.** Único archivo: **`src/worker.js`**. Vigila los bots y ejecuta
  compras/ventas; el gas se reembolsa desde el tanque del usuario. Secrets:
  `KEEPER_PRIVATE_KEY`, `ADMIN_TOKEN`; KV `KEEPER_KV`. Diagnóstico: `/run?key=ADMIN_TOKEN`
  y los logs en tiempo real del dashboard.
- **`bolita-owner`** → worker de la lotería (cron). Único archivo: `src/worker.js`.

---

## Despliegue rápido

1. **Web:** push al repo `bolita` → GitHub Pages reconstruye en ~1 min → `Ctrl+Shift+R`.
2. **Keeper:** push al repo `bolita-keeper` → Cloudflare redespliega solo.
3. **Contrato:** Remix (0.8.22 / shanghai / runs 1) → deploy implementación →
   `upgradeToAndCall` en el proxy.

---

## Economía (honesto)

El gas en BSC es ~$0.01–0.02 por operación. La ganancia **escala con el capital**: con
$10 el grid es ~empate; rinde en proporción con más capital. El valor real de la
plataforma es la **autocustodia + automatización + sin KYC por $1/mes**, no una
promesa de rendimiento. opBNB fue descartado por falta de liquidez.
