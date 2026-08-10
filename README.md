# Aurex Finance

**Plataforma de bots de trading no custodial en BNB Smart Chain.**
El dinero del usuario **nunca sale de su wallet**. Los contratos solo tienen
permiso para mover una cantidad concreta, y ese permiso se puede quitar.

- **Web en producción:** https://cybersecureaid.github.io/bot-algoritmico/
- **Repositorio web:** `CyberSecureAID/bot-algoritmico`
- **Repositorio del keeper:** `CyberSecureAID/bolita-keeper`
- **Worker en Cloudflare:** `bolita-keeper-bot`
- **Red:** BNB Smart Chain (chainId 56)

> **Nota sobre el nombre.** El repositorio se llama `bot-algoritmico` y el del
> keeper `bolita-keeper` por razones históricas: el proyecto empezó como una
> lotería ("La Bolita") y evolucionó a Aurex. **El proyecto es Aurex Finance.**
> Todo lo de la lotería está desechado (ver *Historia*).

---

## 1. QUÉ ES Y QUÉ HACE

Cuatro bots de trading que operan sobre PancakeSwap V3, más un marketplace
persona a persona, un swap y un sorteo comunitario.

| Bot | Qué hace | Cuándo gana |
|---|---|---|
| **Smart Grid** | Reparte el dinero en cuadrículas dentro de un rango. Compra al bajar a una, vende al subir a la siguiente. | Cuando el precio sube y baja dentro del rango. |
| **Accumulator** | Compra más cuanto más baja el precio, bajando el precio medio. Vende TODO de golpe al alcanzar el objetivo. | Cuando el precio se recupera un % desde el promedio. |
| **Cash Out** | Una sola orden de venta a un precio objetivo (Take Profit). | Cuando el precio toca el objetivo. |
| **DCA** | Compra una cantidad fija cada cierto tiempo. Solo compra, no vende. | A largo plazo, suavizando el precio de entrada. |

**Modelo de negocio:** suscripción mensual en BNB + comisión del swap +
comisión por publicar en el marketplace.

---

## 2. CONTRATOS DESPLEGADOS

### 2.1 GridBot — el contrato principal de los bots
```
PROXY (usar siempre esta):  0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B
Tipo:                       actualizable (proxy)
```
**Funciones confirmadas (de su ABI en `assets/js/gridbot.js`):**

*Crear y manejar bots*
- `crearRejilla(config)` — crea un bot con su configuración completa
- `misRejillas(address)` — devuelve las claves de los bots de un usuario
- `resumen(bytes32)` / `resumen(address,address,address)` — estado completo
- `nivelesDe(bytes32)` — las cuadrículas y su estado (1=espera comprar, 2=espera vender)
- `modoDe(bytes32)` — tipo de bot (0=Grid, 1=Acumulador, 2=Cash Out, 3=DCA) y objetivo
- `pathsDe(bytes32)` — rutas de compra y venta
- `clave(address,address,address)` / `claveBot(...,uint256)` — identificadores
- `cancelarRejilla(bytes32)` — cancela y devuelve todo al usuario
- `cerrarAhora(bytes32)` — cierra la posición
- `activarRejilla(address,address,bool)` — pausa/reanuda

*Ejecución (las llama el keeper)*
- `ejecutar(bytes32,uint256)` — dispara una cuadrícula concreta
- `cerrarPorTPSL(address,address,address)` — cierra por Take Profit o Stop Loss
- `venderAcumulado(bytes32)` — venta total del Acumulador
- `comprarDCA(bytes32)` — compra programada del DCA

*Ajustes del usuario*
- `setTPSL(address,address,uint128,uint128)` — objetivo y stop loss
- `ajustarSlippage(address,address,uint16)`
- `ajustarCooldown(address,address,uint32)`

*Gas y suscripción*
- `depositarGas()` payable — el usuario deposita BNB para que sus bots operen
- `retirarGas(uint256)`
- `gasSaldo(address)` — **saldo ÚNICO por usuario, compartido por todos sus bots**
- `gasMinOp()` — coste mínimo de una operación
- `suscribir()` payable, `activo(address)`, `precioSuscripcion()`

*Swap integrado*
- `swap(tokenIn,tokenOut,amountIn,minOut,fee)`, `tarifaSwap()`

**⚠️ NO TENEMOS EL CÓDIGO FUENTE DE ESTE CONTRATO.** Solo su ABI. Para añadirle
funciones (renovación automática de suscripción, wallets de respaldo, contador
global de usuarios) hace falta el `.sol` original. Está desplegado como proxy,
así que **sí se puede actualizar** cuando se recupere el código.

### 2.2 AurexMarket — marketplace persona a persona
```
PROXY:   0x1131c4760Da083aaFCf20d6848Af93A8a2edFb18
LÓGICA:  0x16F75Aa7451c1363aEF1C1D1dcC5b38829346A81  (V2)
Fuente:  SÍ la tenemos (AurexMarketV2.sol)
Tipo:    UUPS actualizable · Ownable · Pausable
```
**Funciones:**
- *Vender:* `crearOrden(token,monto,tramos,moneda,metodo,precioFiat)`, `depositarFianza`, `liberarTramo`, `abandonarVenta`, `retirarTodo`
- *Comprar:* `crearAnuncioCompra`, `marcarPagado`, `liberarReserva`, `pedirCancelar`, `cancelarOrden`, `cancelarPorTiempo`
- *Disputas:* `abrirDisputa(id,motivo)`, `resolverDisputa(id,bool)`, `anularDisputa(id)`, `caducarDisputa(id)` (48 h)
- *Perfil:* `guardarPerfil`, `guardarHorario`, `compartirUbicacion`, `ocultarUbicacion`, `calificar`
- *Lectura:* `ordenes(id)`, `misOrdenes`, `misCompras`, `fianzaDe`, `limiteDe`, `totalOrdenes`, `pendientesDeCalificar`
- *Owner:* `setToken`, `setArbitro`, `setFianzaMinima`, `setLimites`, `setPlazos`, `setComision`, `setOraculo`, `setContratoBase`, `pause`, `unpause`

**Nota de compilación:** se compiló con `optimizer runs=1` — es el único valor
con el que cabe en el límite de 24 KB.

### 2.3 AurexPrizePool — sorteo comunitario
```
PROXY:   0x595CD563F236DAEba21219D60AEF656a750A8132
LÓGICA:  0xe5b44a43eEe2a70d76002E7Af43380BaaFb244Bb  (V5)
Fuente:  SÍ la tenemos (AurexPrizePoolV5.sol)
Tipo:    UUPS actualizable · Ownable · Pausable
Aleatoriedad: API3 QRNG (verificable en cadena)
sponsorWallet: 0x53c4b467ee19CD6bfc343eE9E5113d95F125862f
```
**Funciones:**
- *Usuario:* `participar(nombre,telegram,invitador)`, `reclamar(round)`, `abandonarParticipacion()`, `miAporte(address)`, `miReclamo`
- *Lectura:* `currentRound`, `rounds(id)`, `estadoActual`, `entryTotal`, `ultimosGanadores`, `distribucionEstimada`, `saldoGas`, `gasFaltante`, `necesitaGas`, `sorteoAtascado`
- *Antibloqueo:* `destrabarSorteo(round)` payable — **cualquiera** puede destrabar si el árbitro no responde en 48 h
- *Owner:* `setConfig`, `setQrngParams`, `setFeeWallet`, `setDrawTimeout`, `setBloqueoSalida`, `setGasMinimoSorteo`, `setGasFunding`, `setLinkedContract`, `sweepBnb`, `forzarReembolso`, `rescueToken`, `flagName`, `cerrarRonda`, `pause`, `unpause`

**Protección antifraude:** `bloqueoSalida` impide retirarse en las 24 h previas
al cierre (para que nadie infle el pozo y se marche antes del sorteo).

### 2.4 AurexSwap
```
DIRECCIÓN: 0xa15794D9c313F3E2726ED1D45A1B6CC72BFA2a0c
Tipo:      NO es proxy (no actualizable)
```
Intercambio sobre PancakeSwap V3 con comisión propia en BNB.
Solo BNB Smart Chain. (Ver *Pendientes* para el multicadena.)

### 2.5 Lotería (DESECHADA)
```
PROXY:  0x964a68D3A2dB18c723581410C49aa8789048E1B9
LÓGICA: 0x731AD90586d50AaB31Cc19BF62E7d986FED05D25
Estado: VACÍO. Fondos retirados. No se usa.
Fuente: sí (contracts/Bolita.sol, aunque es de una versión anterior)
```
Sigue en el repo (`loteria.html`) pero **sin acceso desde la web**.
Su código tiene ideas aprovechables: `ownerSecundario`, `retirarBanca(token,cantidad,destino)`,
`retirarBeneficios`, `rescateEmergencia`, `redirigirYtomarControl`.

---

## 3. DIRECCIONES IMPORTANTES

```
Owner / comisiones:  0x97e01a1C430E0cC826AcA6e9BE643721e45BCA7d
Wallet del keeper:   0x34D57FBdCD5D7254fdC111357f0f2b28562F4419
sponsorWallet:       0x53c4b467ee19CD6bfc343eE9E5113d95F125862f
Multicall3:          0xcA11bde05977b3631167028862bE2a173976CA11
PancakeSwap Quoter:  0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997
PancakeSwap V2:      0x10ED43C718714eb63d5aA57B78B54704E256024E
Chainlink BNB/USD:   0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE
```

**Monedas** (definidas en `assets/js/tokens.js`):
```
BNB       nativa                                        18 dec
USDT      0x55d398326f99059fF775485246999027B3197955   18 dec
USDC      0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d   18 dec
BTCB      0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c   18 dec
ETH       0x2170Ed0880ac9A755fd29B2688956BD959F933F8   18 dec
USDT.z    0x4BE35Ec329343d7d9F548d42B0F8c17FFfe07db4   18 dec
BabyDoge  0xc748673057861a797275CD8A068AbB95A902e8de    9 dec
EXT       0xd86b5cd7cFC28a1e4Fd6b39F133bF64EF24c5246   18 dec
SOL/DOGE/XRP/CAKE/LINK/ADA — solo bots (soloBot: true)
```

---

## 4. EL KEEPER (lo que hace que los bots operen solos)

**Repo:** `CyberSecureAID/bolita-keeper` · **Worker:** `bolita-keeper-bot`
**URL:** https://bolita-keeper-bot.yamicelanvivesqui.workers.dev
**Archivo:** `src/worker.js`

**Rutas:**
- `/estado` — informe público, sin contraseña. **Es la herramienta de diagnóstico principal.**
- `/registrar?u=0xWallet` — la web lo llama al crear cada bot
- `/parte?n=N&de=M&key=TOKEN` — reparto interno del trabajo

**Variables en Cloudflare:**
```
KEEPER_PRIVATE_KEY   (secreto)  admite VARIAS claves separadas por comas
ADMIN_TOKEN          (secreto)
KEEPER_URL           https://bolita-keeper-bot.yamicelanvivesqui.workers.dev
KV: KEEPER_KV → bolita-keeper-kv (id 0759bdf9e97e47158364ce2ef08f6f6a)
```
**⚠️ El binding de KV debe estar declarado en `wrangler.toml`**, o se borra en
cada despliegue. Ese fue un fallo real que costó días.

**Cómo funciona:**
1. La corrida principal **no trabaja: reparte.** Llama a hasta 30 copias de sí misma en paralelo.
2. Cada copia atiende 400 bots con su presupuesto propio de peticiones.
3. Usa **Multicall3** para leer 150 datos en UNA petición.
4. Antes de enviar cualquier transacción, hace un **ensayo en seco**: si el contrato la va a rechazar, no la envía y anota el motivo.

**Capacidad:** 30 partes × 400 bots = **12.000 bots revisados cada minuto**
(~1.500 usuarios con 8 bots). Para más: subir `MAX_PARTES` y pagar el plan de
Cloudflare (5 $/mes, 50× más capacidad).

**Límite de Cloudflare:** 50 peticiones por corrida. El tope interno está en 38.

---

## 5. ESTRUCTURA DEL REPOSITORIO

```
/
├── index.html                 App principal (Aurex)
├── sw.js                      Service worker (app instalable + caché)
├── manifest-aurex.webmanifest App instalable
├── favicon.svg                Logo de Aurex (transparente)
├── diag.html                  Diagnóstico de conexión de wallet
├── loteria.html               Lotería antigua (sin acceso desde la web)
├── README.md                  Este archivo
└── assets/
    ├── css/styles.css
    ├── img/  aurex-32/192/512/apple/maskable.png, aurex-logo.png, marco-precio.webp
    └── js/
        ├── gridbot-ui.js   (3841) Interfaz principal: los 4 bots, tarjetas, swap
        ├── market.js       (1969) Marketplace P2P completo
        ├── gridbot.js      ( 717) Capa de contrato: ABI, lecturas, firmas
        ├── admin.js        ( 687) Panel de control oculto (5 clics)
        ├── extras.js       ( 594) App instalable, compartir, historial Excel
        ├── prizepool.js    ( 562) Sorteo comunitario
        ├── wallet.js       ( 540) Detección de wallets, EIP-6963, WalletConnect
        ├── perfil.js       ( 473) Perfil, estadísticas, permisos revocables
        ├── tokens.js       ( 322) Catálogo de monedas
        ├── grafica.js      ( 238) Velas de Binance + líneas de cuadrículas
        ├── tutorial.js     ( 219) Tutorial de iniciación
        ├── avisos.js       ( 160) Notificaciones
        └── vendor/
            ├── ethers-6.13.4.min.js      (490 KB, alojado localmente)
            ├── lightweight-charts.mjs    (160 KB, TradingView)
            ├── walletconnect.umd.js      (850 KB, se carga SOLO al conectar)
            └── qrcode.js                 ( 55 KB)
```
**Archivos de la lotería que siguen ahí (no tocar, no se usan):**
`app.js`, `contrato.js`, `comprar.js`, `draws.js`, `economics.js`, `charada.js`,
`versos.js`, `cup.js`, `florida.js`, `prices.js`, `icons.js`, `confetti.js`,
`notificaciones.js`, `manifest.webmanifest`, `retirar-bolita.html`.

---

## 6. REGLAS DE TRABAJO (importantes)

1. **Idioma:** español. Respuestas cortas y directas.
2. **Entregar SOLO los archivos modificados** a `/mnt/user-data/outputs/`.
3. **Verificar SIEMPRE** con `node --input-type=module --check`.
4. **Versionado:** todos los archivos llevan `?v=N`. Si se sube la versión,
   **hay que entregar TODOS los JS + index.html + sw.js a la vez**, o los
   módulos se descuadran (síntoma clásico: la wallet se carga dos veces).
5. **Versión actual: `?v=107`** en los imports · caché del service worker: `aurex-v109`
   (pueden ir desacompasadas: los imports solo cambian cuando hace falta romper la caché)
6. **Funciones nuevas → módulo nuevo.** No engordar `gridbot-ui.js`.
7. **Comentarios en el código: en español, explicando el PORQUÉ**, no el qué.
8. **Antes de entregar:** probar con Playwright que la página sigue funcionando.

---

## 7. HISTORIAL DE PROBLEMAS RESUELTOS (para no repetirlos)

### El keeper no ejecutaba nada
- **Había dos workers** usando el mismo KV y se pisaban → se eliminó el viejo.
- **El KV se borraba en cada despliegue** → faltaba declararlo en `wrangler.toml`.
- **`eth_getLogs` no funciona en los RPC públicos de BSC** → se cambió a preguntar
  al contrato por cada usuario vigilado.
- **`cargarEstado()` descartaba la lista de usuarios** → se perdía cada minuto.
- **Gastaba las 50 peticiones solo buscando bots** (33 bots creados, 3 activos, y
  recomprobaba los inactivos cada vez) → ahora se descartan y no se vuelven a mirar.
- **Sin Multicall no escalaba** → 6 peticiones por bot → ahora 150 datos por petición.

### 17 ejecuciones revertidas seguidas
Las transacciones fallaban con `execution reverted` sin mensaje. Se añadió el
**ensayo en seco** (`staticCall`) antes de enviar: ahora el motivo aparece en
`/estado` y no se gasta gas en intentos fallidos. **Pendiente de confirmar en
producción cuando el precio cruce una cuadrícula.**

### Las cuadrículas no se veían en la gráfica
La escala se ajustaba **solo a las velas**, así que las líneas fuera de ese rango
quedaban invisibles y sus etiquetas pegadas al borde. Se añadió
`autoscaleInfoProvider` que incluye todas las líneas, con tope de 2,2× el
recorrido de las velas para que no se aplasten.

### La página parpadeaba al cargar
Se dibujaba **dos veces**: una al conectar la wallet y otra al terminar el
arranque. Se añadió una bandera `_arrancando`.

### La gráfica se cerraba sola
Un refresco automático llamaba a `refrescarRejillas()`, que redibujaba toda la
lista. Ahora el refresco solo actualiza el número del gas.

### "El gas no se actualiza" (dos veces)
No era un placeholder: era **redondeo a 4 decimales**. `0.00396` se mostraba como
`0.0040`. Se pasó a 5 decimales en el perfil y en las tarjetas de los bots.

### Configuración "Activo" que perdía dinero
40 cuadrículas en ±12% dejaba una separación del 0,60%, y con 50 USDT las
comisiones se comían la ganancia. **El contrato se negaba a vender con pérdida**
(comportamiento correcto), y parecía que estaba roto. Se recalcularon las cuatro
configuraciones para que rindan incluso con 50 USDT.

### La caché no dejaba ver los cambios
Al dejar de subir el `?v=N`, el service worker servía los archivos viejos. **Regla:
si cambia algo importante, subir la versión y entregar todos los archivos.**

---

## 8. ECONOMÍA DE LOS BOTS (números reales medidos)

```
Gas por operación:      ~0.0000205 BNB  (~$0.012)
Gas por vuelta:         ~$0.025        (comprar + vender)
Comisión PancakeSwap:   0,05% por swap (0,1% ida y vuelta)
```
**Separación mínima para ganar:** con órdenes de $25, basta un 0,20%.

**Configuraciones auditadas** (en `gridbot-ui.js`, constante `PRESETS`):
| Configuración | Rango | Cuadrículas | Separación | Deja con $200 |
|---|---|---|---|---|
| Tranquilo | ±40% | 24 | 3,59% | +0,27 USDT/vuelta |
| Equilibrado | ±28% | 20 | 2,92% | +0,26 USDT/vuelta |
| Activo | ±16% | 14 | 2,33% | +0,29 USDT/vuelta |
| Volátil | ±60% | 30 | 4,73% | +0,28 USDT/vuelta |

**Cupo:** 8 bots por usuario, 2 de cada tipo (`CUPO_TOTAL` / `CUPO_POR_TIPO`).

---

## 9. FUNCIONES DE LA WEB

- **4 bots** con configuraciones rentables explicadas y honestas ("qué puede salir mal")
- **Gráficas** con velas reales de Binance y las cuadrículas dibujadas encima
- **Marketplace P2P** con fianza, tramos, disputas con motivo escrito y árbitros
- **Prize Pool** con aleatoriedad verificable (API3 QRNG)
- **Swap** con comisión propia
- **Perfil**: estadísticas, coste por operación y **permisos revocables**
- **Historial en Excel** por bot (con formato, colores, explicación de la estrategia)
- **App instalable** (PWA) con service worker, funciona con mala conexión
- **Compartir**: imagen del resultado (móvil) y enlace promocional
- **Panel de control oculto** (5 clics en la esquina inferior izquierda)
- **WalletConnect** + apertura directa en MetaMask/Trust/SafePal desde el móvil

---

## 10. EL PANEL DE CONTROL (`admin.js`)

**Se abre con 5 clics en la esquina inferior izquierda.** Si quien los da no es
dueño de los contratos, **no pasa nada**: ni se abre, ni avisa, ni deja rastro.
La comprobación se hace **leyendo los contratos**, no la web.

**Filosofía: no puede romper nada.**
1. No hay ejecución libre de funciones
2. **Lo irreversible NO ESTÁ** (traspasar/renunciar propiedad, actualizar contratos)
3. Cada ajuste enseña su valor actual
4. Cada campo tiene mínimo y máximo
5. **Ensayo en seco** antes de firmar (`staticCall`)
6. **Deshacer** con el valor anterior guardado
7. Todo explicado en lenguaje llano

**Pestañas:** Resumen (usuarios, bots, pozo, estado del keeper) · Disputas ·
Sorteo (recargar gas, destrabar, cerrar ronda, reembolsar) · Ajustes (fianza,
plazos, árbitros) · Emergencia (congelar/reanudar).

---

## 11. SEGURIDAD

**Corregido:**
- **XSS por token malicioso** — el nombre y símbolo de una moneda importada los
  pone quien creó ese token. Se limpian (solo letras/números, máx. 12 y 40) y se escapan.
- **Clickjacking** — si Aurex se carga dentro de un iframe, se sale del marco.
- **Permisos revocables** — la web decía "puedes revocarlo cuando quieras" pero
  no había dónde. Ahora está en el perfil.

**Ya estaba bien:** permisos con monto exacto (nunca infinito), direcciones fijas
en el código, `rel="noopener"` en enlaces externos, datos ajenos escapados.

**El riesgo real NO está en el código.** Según los datos de 2026, las cuentas
comprometidas son >50% de los ataques DeFi. Los dos puntos débiles son:
1. **La wallet del owner** (controla contratos actualizables) → **usar wallet física**
2. **La cuenta de GitHub** (puede servir un JS malicioso) → **2FA con app, no SMS**

---

## 12. PENDIENTES

### Bloqueado por falta de código fuente
- **Renovación automática de la suscripción** — necesita el `.sol` del GridBot.
  Si está verificado en BscScan, copiar el código al repo y desbloquea esto.
- **Contador global de usuarios** en el contrato de bots (ahora se saca del keeper).
- **Wallets de respaldo (owner 1→2→3)** en los tres contratos principales. La
  lotería ya lo tenía implementado (`ownerSecundario`); hay que llevarlo a los demás.

### Decidido pero sin hacer
- **Swap multicadena.** PancakeSwap está en BNB Chain, Ethereum, Base, Arbitrum,
  Linea, zkSync, opBNB, Solana y Aptos. **Tron NO** (haría falta otro exchange).
  Solana necesita otra wallet (Phantom) y es un desarrollo aparte.
  *Decisión pendiente:* la comisión no se puede cobrar en BNB fuera de BSC →
  o se renuncia a ella en otras redes, o se despliega un contrato por red.
- **Números animados** (`data-contar` ya está en `extras.js`, falta aplicarlo).
- **Historial del Marketplace** con fechas de ejecución y limpieza automática.
- **Marcas de compra/venta sobre las velas** (los datos de `operacionesDe` ya existen).
- **Lotería propia** con premio proporcional al bote (sistema pari-mutuel: la casa
  nunca pierde y siempre hay ganador, sin engañar a nadie). Interfaz ya hecha;
  faltaría contrato nuevo y cambiar el verde por el negro/dorado de Aurex.

### Lo más importante ahora mismo
**Confirmar que el keeper ejecuta sin revertir.** Es lo único que separa la
plataforma de estar lista. Cuando el precio cruce una cuadrícula, mirar `/estado`:
- `✅ VENTA nivel 3 · tx 0x…` → funciona
- `✋ NO se puede — [motivo]` → ahí está el fallo, con su explicación

---

## 13. HERRAMIENTAS DE DIAGNÓSTICO

| Herramienta | Para qué |
|---|---|
| `/estado` del keeper | Ver si trabaja, cuántos bots vigila y por qué no ejecuta |
| `diag.html` | Problemas de conexión de wallet (muestra el error exacto) |
| Panel de control | Estado general y acciones de administración |
| Consola del navegador | Los errores se registran con prefijo `[Aurex]` |

**Lectura del `/estado`:**
```
Revisados en esta corrida: 3 (peticiones: 3 de 50)   ← salud del keeper
WBNB/USDT: 6 niveles · 3 esperan comprar (falta 1.20% de bajada)
           · 3 esperan vender (falta 0.85% de subida)
WBNB/USDT: ACUMULADOR — falta 12.05% para vender todo
```
