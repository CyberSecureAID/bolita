# CriptoCuba Oficial — README V4 (Estado a la pausa por Cloudflare)

> **Propósito.** Este documento da el **contexto completo del proyecto de bots de
> trading** desde cero hasta el punto exacto en que se **puso en pausa** porque hacía
> falta **comprar el plan de pago de Cloudflare** para el keeper. Es la continuación
> de `README.md` (V1: plataforma web, contratos, bots, keeper) y `README-V2.md`
> (V2: app móvil). Lee estos tres y tendrás todo el contexto para retomar en un chat
> nuevo sin perder nada.

---

## 0. Resumen del proyecto (contexto rápido)

- **Producto:** **CriptoCuba Oficial** — exchange/plataforma de **bots de trading
  NO custodial** en **BNB Smart Chain** (chainId 56, `0x38`), sobre **PancakeSwap V3**.
  El dinero **nunca sale** de la wallet del usuario; los permisos son por monto exacto
  y revocables.
- **Web producción:** https://cybersecureaid.github.io/bot-algoritmico/
- **Repo web:** `CyberSecureAID/bot-algoritmico` · **CNAME:** `criptocubaoficial.com`
- **Repo keeper (Cloudflare Worker):** `CyberSecureAID/bolita-keeper`
  (archivo `src/worker.js`), endpoint tipo `bolita-keeper-bot…workers.dev`.
- **Marca:** dorado `#E8B84B` + negro. **Idioma:** todo en **español** (en el entorno
  de pruebas un i18n traduce a inglés; en el teléfono real sale en español).
- **Soporte:** Telegram `@JesusDevTrader` (chatbot integrado en la app).
- **Sin backend ni APIs de pago.** Todo se lee **on-chain** (RPC/ethers). Única API
  externa: **CoinGecko (gratis)** para precios/logos, con respaldos.

---

## 1. Reglas de trabajo INVIOLABLES

1. **Modularización estricta.** Ningún archivo crece sin control. Función/módulo
   nuevo = **archivo nuevo**. (`niveles.js` ya se pasó de 6.221 a ~800 líneas en 15
   módulos; ese es el estándar.)
2. **No romper nada.** Auditar antes de entregar. No tocar lo que ya funciona.
3. **No tocar la web de escritorio desde lo móvil** (scope con `matchMedia(max-width:760px)`).
4. **Todo on-chain, sin backend ni APIs de pago.** (Salvo CoinGecko gratis.)
5. **Nada de placeholders** que aparenten funcionar. **No inventar datos.**
6. **Entregas mínimas:** solo los archivos afectados, con **ruta exacta**.
7. **Verificar antes de entregar:** compilar cada `.js`
   (`node --input-type=module --check < archivo.js`) y auditar responsividad
   móvil a **390 / 360 / 320 px** (0 desbordes).
8. **Respuestas cortas.** Directo al grano, sin disertaciones.
9. Aclaración histórica: "**raíz**" en estas conversaciones = **`assets/js/`**,
   NO la raíz del repo. Documentos (README-*, PLAN-FASES) sí van a la raíz del repo.
10. El **mapa de calor de Liquidity Pools está CONGELADO / intocable.**

---

## 2. Contratos y direcciones clave (BNB Smart Chain)

> Detalle histórico completo en `README.md` (V1). Aquí, lo esencial para el keeper y
> los bots.

- **GridBot (proxy principal de bots):** `0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B`
  (tenemos el **ABI**, no el `.sol`). Ejecuta los 4 bots.
- **PancakeSwap V3 Router:** `0x10ED43C718714eb63d5aA57B78B54704E256024E`.
- **Multicall3:** `0xcA11bde05977b3631167028862bE2a173976CA11` (el keeper agrupa
  lecturas/ensayos con esto).
- Otros contratos del ecosistema (AurexMarket P2P, AurexSwap, etc.) y sus direcciones
  están documentados en V1. **CriptoCubaPro.sol** (para cobrar la sección Pro) está
  **escrito pero SIN desplegar** — bloquea el cobro de Liquidity/Pro.
- **AurexPrizePool** (sorteo con API3 QRNG): **desechado**.

> Nota: no reasignar roles a direcciones de memoria. Si falta una dirección concreta,
> confirmarla on-chain o en V1 antes de usarla.

---

## 3. Los 4 bots de trading

1. **Smart Grid** — rejilla clásica de compra/venta por niveles.
2. **Accumulator** — acumula en caídas.
3. **Cash Out** — toma de ganancias / salida.
4. **DCA** — compras periódicas.

Una **orden limit** es, on-chain, una **rejilla de 1 nivel**. Regla de producto:
*Cash Out creado desde la sección de Bots = bot; creado desde Liquidity/Institucional/
Smart Levels = orden limit.* El marcador vive en `cco-ordenes-grafico` (la orden limit
guarda su `botId`; el Cash Out de bots no).

---

## 4. EL KEEPER (Cloudflare Worker) — núcleo del punto de pausa

### 4.1 Qué es
El **keeper** es un **Cloudflare Worker** (repo aparte `CyberSecureAID/bolita-keeper`,
`src/worker.js`) con un **cron trigger** que cada minuto:
- Mira los precios y **ejecuta las órdenes/bots** que deban dispararse.
- Reparte el trabajo en lotes (diseño **30×400 = 12.000 bots/min**), usando
  **Multicall3** y un **ensayo en seco** (dry-run) antes de enviar la tx real.
- El **frontend solo registra** cuentas en el keeper vía `/registrar`; la ejecución
  la hace el Worker con su propia llave (`KEEPER_PRIVATE_KEY`).

### 4.2 Qué se arregló (esta etapa, mayormente resuelto)
- El keeper **no ejecutaba órdenes** (todas las ejecuciones revertían / la corrida
  reventaba antes de ejecutar). Se diagnosticó por qué y **se corrigió** la corrida.
- Se **quitó la comisión on-chain** de la ejecución.
- Se añadieron **notificaciones de "orden completada"**.
- Se creó la ventana **"Mis órdenes"** en la UI (lista órdenes limit reales con logo,
  par, comprar/vender, precio y % ganancia/descuento; botón **Cancelar** que cancela
  la rejilla de 1 nivel on-chain y **libera cupo**; antes de listar llama a
  `sincronizarOrdenes()` para limpiar las llenadas/canceladas).
- Se empezó el **historial de operaciones** en el perfil.

### 4.3 POR QUÉ SE PAUSÓ (crítico)
El keeper corre en el **plan gratuito de Cloudflare Workers**, y ahí choca con los
**límites del free tier**: topes de **tiempo de CPU**, de **subrequests** por
invocación, y el hecho de que los **Workers son stateless** (si la watch-list vive en
memoria y no en KV/almacenamiento, se pierde). Esos límites hacen que el keeper
**se congele durante horas** o no complete la corrida a escala. Diagnóstico: es un
**límite de plataforma**, no un bug de código.

**Conclusión y punto de pausa:** para que el keeper ejecute los bots de forma fiable y
a escala, hace falta **comprar el plan de pago de Cloudflare (Workers Paid)**. Aquí se
**puso el proyecto en pausa**, a la espera de contratar ese plan.

> Nota de contexto: en el proyecto Handicapper (deportes) se decidió **NO** volver a
> usar Cloudflare/keeper por esta misma fricción. Para CriptoCuba, en cambio, el
> keeper es parte del diseño y la vía acordada es **pagar Workers**.

---

## 5. Sección Pro / "Liquidity" (herramientas de análisis)

Tres herramientas dentro de la sección Pro:

- **Liquidity Pools** — mapa de calor de liquidez. **CONGELADO, intocable.**
- **Radar Institucional → renombrado "Lógica Estructural Avanzada"** (`muros.js`).
  Pivotó de "muros del libro de órdenes" a un **detector basado en velas** de
  **zonas de acumulación/distribución (order-blocks / supply-demand)**. Incluye
  (o se trabajó en): backtest, volumen firmado, VWAP/VAH/VAL, confluencia multi-TF,
  confirmación con libro de órdenes, ciclo de vida + alertas, contexto multi-símbolo,
  heatmap, cockpit, timeline de zonas, onboarding, tema claro/oscuro, anclaje de zonas
  (dejan de saltar), fusión de zonas con tope de ancho, filtro de distancia por
  temporalidad, crosshair con precio en el eje, ~80 pares, default 1h.
- **Smart Levels** (`niveles.js`, "la joya") — niveles + **órdenes desde el gráfico**
  (`orden.js`), con **herramienta de posición long/short** y **línea de tendencia
  (Faro)**.

### Analista (chatbot dentro del radar)
Chatbot con efecto de tecleo que da un **plan de trade** y una herramienta
**"Muéstrame"** que proyecta una posición long/short en el propio canvas del radar
(portada fiel de la herramienta de posición de Smart Levels + línea de tendencia,
ancladas a timestamps, sin fugarse fuera del radar al cerrar).

### Heat Pools
Feature de **mapa de calor de liquidez + zonas de swing + herramientas de posición**
construida dentro de la sección del radar. Implementa la estrategia de zonas de swing
del owner.

**Owner / acceso:** constante `OWNER` en `liquidity.js`. **Vacía = modo desarrollo**
(todos entran). Poner ahí la wallet del owner (en minúsculas) hace que los no-owner
vean los 3 planes y el owner entre directo. (Pendiente de fijar.)

---

## 6. App móvil (resumen — detalle en README-V2)

Cáscara (shell) en **`assets/js/movil/`** que se monta encima de la web en
pantallas ≤760px y **reutiliza la lógica on-chain** sin duplicarla. 4 pantallas:
**Inicio · Mercados · Operar · Activos** (barra inferior `#mv-nav` siempre visible).
Logos servidos desde **GitHub/Trust Wallet** (CoinGecko se bloquea dentro de wallets).
Libro de órdenes en vivo por **WebSocket a Binance**. Todo el detalle (módulos, bugs,
sistema de diseño, reglas de especificidad) está en **README-V2.md**.

---

## 7. Estructura del repositorio (web)

```
bot-algoritmico/
  index.html
  README.md            # V1: plataforma web, contratos, bots, keeper, historia
  README-V2.md         # V2: app móvil (assets/js/movil/)
  README-V4.md         # ESTE documento (estado a la pausa por Cloudflare)
  INVENTARIO.md
  orden.js             # órdenes limit = rejillas de 1 nivel
  assets/
    css/               # estilos web
    img/               # imágenes/logos
    js/                # lógica: gridbot.js, gridbot-ui.js, niveles.js, muros.js,
                       # liquidity.js, tools.js, wallet.js, orden.js, movil/ …
```
Repo aparte del keeper: `CyberSecureAID/bolita-keeper` (`src/worker.js`, Cloudflare).

---

## 8. Estado por áreas (a la pausa)

| Área | Estado |
|------|--------|
| Plataforma web + 4 bots | Funcionando |
| App móvil (4 pantallas) | Funcionando (Fase 0 casi cerrada) |
| Smart Levels / niveles.js | Funcionando (modularizado) |
| Lógica Estructural Avanzada (radar) | Construido, muchas features; pulido en curso |
| Heat Pools | Construido |
| Analista (chatbot + posición) | Construido |
| "Mis órdenes" + cancelar + liberar cupo | Hecho |
| Comisión on-chain removida + notificaciones | Hecho |
| Historial de operaciones (perfil) | Empezado |
| **KEEPER (ejecución de bots)** | **Arreglado en código, pero BLOQUEADO por límites del free tier de Cloudflare** |
| CriptoCubaPro.sol (cobro Pro) | Escrito, **sin desplegar** |
| OWNER de Liquidity | Vacío (modo desarrollo) |

---

## 9. PENDIENTES / CÓMO SEGUIR (en orden)

1. **Comprar el plan de pago de Cloudflare (Workers Paid)** y redeployar el keeper.
   Es el **desbloqueo #1**: sin esto, los bots no se ejecutan de forma fiable a escala.
   Al hacerlo, revisar que la watch-list persista (KV, no memoria) y validar la corrida
   completa (30×400) sin cortes por CPU/subrequests.
2. **Desplegar `CriptoCubaPro.sol`** para poder **cobrar** la sección Pro/Liquidity.
3. **Fijar `OWNER`** en `liquidity.js` (wallet del owner en minúsculas).
4. Terminar el **historial de operaciones** en el perfil.
5. Cerrar **Fase 0** (estabilización) y avanzar el roadmap de V2:
   Fase 1 (acciones de wallet), Fase 2+ (Marketplace NFT — pendiente definir **% de
   comisión** y **dirección de tesorería**).
6. Marcador **on-chain** en la creación de la orden para que "Mis órdenes" cruce entre
   dispositivos (hoy es `localStorage` por dispositivo).

---

## 10. Entorno de pruebas del asistente (para reproducir)

- Copia de trabajo típica: `/home/claude/**/bot-algoritmico-main/`.
- Compilar módulos: `node --input-type=module --check < archivo.js`.
- Pruebas móviles headless (Playwright) con MIME completo (`.mjs`, `.woff2`, `.jpg`…),
  viewport 390×844 / 360 / 320, `isMobile:true`.
- **El sandbox NO puede** abrir el navegador de una wallet real, ni conectar wallet,
  ni acceder a CoinGecko/Binance/RPC/GitHub-raw desde el navegador headless, **ni
  inspeccionar/ejecutar el Worker de Cloudflare**. Esas cosas se confirman en el
  teléfono / en Cloudflare. Lo verificable (que compila, que las URLs existen, que no
  desborda) sí se verifica.

---

## 11. Para retomar en un chat nuevo

Comparte los tres READMEs: **`README.md` (V1)**, **`README-V2.md` (V2)** y este
**`README-V4.md`**. Con eso hay contexto completo. **Primer paso al volver:** contratar
**Cloudflare Workers Paid** y redeployar `bolita-keeper`; ese es el bloqueo que nos
puso en pausa.
