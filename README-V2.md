# CriptoCuba Oficial — README V2 (Versión Móvil)

> **Propósito de este documento.** El `README.md` original describe la plataforma
> web (contratos, bots, keeper, historia). Este **README-V2** es su continuación:
> recoge **todo** lo relativo a la **interfaz MÓVIL** que se construyó encima del
> repo existente, para que el README original no crezca sin control. Aquí está el
> detalle completo —arquitectura, cada módulo, cada función, cada bug corregido,
> el sistema de diseño y las reglas de trabajo— para poder retomar el proyecto en
> una conversación nueva sin perder ningún contexto.

---

## 0. RESUMEN DEL PROYECTO (contexto rápido)

- **Producto:** CriptoCuba Oficial — exchange **no custodial** con bots de trading
  en **BNB Smart Chain** (chainId 56), PancakeSwap V3. El dinero nunca sale de la
  wallet del usuario.
- **Web producción:** https://cybersecureaid.github.io/bot-algoritmico/ ·
  **Repo:** `CyberSecureAID/bot-algoritmico` · **CNAME:** criptocubaoficial.com
- **Idioma:** todo en **español**. (En el entorno de pruebas la app tiene un i18n
  que traduce español→inglés, por eso las capturas de desarrollo salen en inglés;
  en el teléfono real sale en español.)
- **Colores de marca:** dorado `#E8B84B` + negro.
- **Soporte:** Telegram `@JesusDevTrader` (chatbot integrado en la app).

### Reglas de trabajo INVIOLABLES (importantísimas)
1. **NO tocar la web de escritorio.** Todo cambio móvil se hace vía
   `matchMedia('(max-width:760px)')` o clases/CSS con scope móvil. Las
   excepciones aprobadas (archivos compartidos que sí se tocaron con cuidado y sin
   romper escritorio) están listadas más abajo.
2. **Modularización estricta.** Ningún archivo debe crecer sin control. Cada cosa
   en su módulo pequeño.
3. **Todo on-chain, SIN APIs de pago ni backend.** El saldo, bots, volumen, PnL,
   trades, NFTs, etc. se leen on-chain con el RPC/ethers que la app ya usa. La
   única API externa es **CoinGecko (gratuita)** para precios/logos, con respaldo.
4. **Mínimo texto en las entregas.** Entregar solo los archivos afectados con su
   ruta exacta.
5. **NO inventar datos.** Nada de "placeholders" que aparenten funcionar.
6. **Verificar antes de entregar:** compilar cada `.js` y auditar responsividad a
   **390 / 360 / 320 px** (0 desbordes).

### Ubicación de los archivos (aclaración crítica)
- "**Raíz**" en conversaciones anteriores significó siempre **`assets/js/`** (la
  carpeta `js` dentro de `assets`), **NO** la raíz del repositorio.
- Archivos de la app móvil → **`assets/js/movil/`**
- Subcarpetas → su carpeta (`assets/js/niveles/`, etc.)
- Documentos (`README-V2.md`, `PLAN-FASES.md`) → raíz del repo.

---

## 1. ARQUITECTURA DE LA VERSIÓN MÓVIL

Toda la app móvil vive en **`assets/js/movil/`**. Es una "cáscara" (shell) que se
monta **encima** de la web, la cual se oculta en móvil. La web sigue existiendo y
funcionando: la móvil la reutiliza (swap, bots, gráficas, tools…) sin duplicar
lógica on-chain.

### 1.1 Enganche (hook) en `gridbot-ui.js` (archivo de la web)
- Un bloque **síncrono** tras `const F={...}` que, si es móvil (matchMedia
  max-width:760px), inyecta `window._mvHideWeb` = un `<style>` que hace:
  `#colmena-app{visibility:hidden}` + mantiene visibles swap/coin-modal y oculta
  los FAB. **Importante:** NO oculta `#npChat`/`#np-chat` (eso rompía el chatbot).
- Al final de `arrancar()`:
  `if(_movil()) import('./movil/movil.js').then(m=>m.montarMovil({conectarWallet})).catch(()=>{})`.
  ⚠️ Ese `.catch(()=>{})` **oculta errores** de montaje: si algo falla al importar
  o montar, no verás error. Para depurar, hay que capturar el import a mano.

### 1.2 Archivos de `assets/js/movil/`
| Archivo | Rol |
|---|---|
| `movil.js` | Cáscara/router. Monta `#mv-app`, la barra inferior, despacha acciones, inyecta fixes de CSS para overlays de la web, auto-conexión y aviso de red. |
| `estilos.js` | CSS global de la app móvil (paleta, hojas, tarjetas, formularios…). |
| `inicio.js` | Pantalla 1 (Inicio): balance, accesos rápidos, servicios, promos. |
| `markets.js` | Pantalla 2 (Mercados): lista de monedas + hoja para elegir gráfica/indicador. |
| `operar.js` | Pantalla 3 (Operar): libro de órdenes, formulario compra/venta, posición, mis órdenes, bots. |
| `activos.js` | Pantalla 4 (Activos): tarjeta de balance premium, Spot, NFTs, Actividad. |
| `fmt.js` | Utilidades compartidas: formato de dinero/cantidades, **logos** (`logoDe`, `LOGOS`). |
| `iconos.js` | Iconos SVG inline (`IC.*`). |
| `picker.js` | Selector compartido de monedas (con logo/precio/%24h + búsqueda). |
| `alerta.js` | Alerta de precio directa (modal). |
| `nfts.js` | Escáner on-chain de NFTs y Actividad (sin API). |
| `buscar.js` | Overlay de búsqueda. |
| `menu.js` | Overlay de menú. |

### 1.3 Barra inferior perpetua
`#mv-nav` (fixed, z-index alto) SIEMPRE visible con 4 pestañas:
**Inicio · Mercados · Operar · Activos**. El router `irA(tab)` pinta cada
pantalla. `api()` expone: `{ abrir, abrirGrafica, conectar, estaConectado,
balance, irA }`.

### 1.4 Estado y refresco
- Al cambiar de wallet (`wallet.alCambiar`): se resetea el balance y se
  **refrescan todas** las pestañas (no solo Inicio), y se revisa la red.
- El balance se lee on-chain (`leerBalance()` → `{conectado, totalUSD, activos[]}`).

---

## 2. SISTEMA DE DISEÑO (paleta y componentes)

### 2.1 Paleta (variables CSS en `:root`, dentro de `estilos.js`)
```
--mv-bg    #0B0E11   --mv-bg2  #0f141a   --mv-card #151b23
--mv-card2 #1b222c   --mv-line #232b36   --mv-txt  #eaecef
--mv-mut   #8b96a3   --mv-gold #E8B84B   --mv-up   #2ebd85   --mv-down #f6465d
```

### 2.2 Hojas emergentes (sheets/menús)
`#mv-sheet`, `#mv-denom-menu`, `#mv-menu`, `#mv-picker`: z-index **11000**
(por encima de la barra), `width:calc(100% - 20px); max-width:460px; margin:0
auto` → **nunca desbordan** ni en 320px. Toast `#mv-toast` z-11200.

### 2.3 Reglas de especificidad aprendidas (bugs históricos)
- Los botones/etiquetas dentro de `#mv-sheet` deben ir con **id+clase**
  (`#mv-sheet .al-ok`) porque `#mv-sheet button{background:none}` los pisaba y
  salían como "texto plano".
- El badge HOT/TOP de los accesos rápidos debe ser `.mv-qi .mv-qtag` (dos clases),
  porque `.mv-qi span` (clase+elemento) tiene más especificidad y lo pintaba en
  **gris** (bug que costó ~15 intentos; verificado en vivo que ahora es
  `rgb(26,18,0)` sobre oro).

---

## 3. LAS CUATRO PANTALLAS (detalle)

### 3.1 Inicio (`inicio.js`)
- **Top bar:** avatar (movido un poco a la izquierda), buscador, soporte
  (chatbot), campanita (alerta de precio).
- **Tarjeta de balance:** denominación por defecto **"Total"** (no persiste);
  muestra `money(totalUSD)`; al elegir una moneda concreta muestra
  `cantidad(amt) <small>ID</small>` + sub `≈ money(usd)`. Menú de denominación con
  scroll y logos.
- **Accesos rápidos (5, distribuidos, sin scroll):**
  **Market · Swap · Bots (HOT, al centro) · Liquidity · Academy (TOP)**.
  - "Market" reemplazó a los antiguos **Buy/Sell** (confundían). Va **directo a la
    pestaña de vender** del Marketplace (acción `sell`).
  - Badges HOT/TOP: pastilla dorada con texto oscuro, legibles, sin recorte.
- **CTA:** "Agregar fondos" (dorado, va a Recibir) + "Operar" (va a la pestaña
  Operar).
- **Tarjeta Connect:** solo se muestra si NO hay wallet (cuando hay, desaparece y
  el Inicio cabe mejor).
- **Servicios:** carrusel/grid de tarjetas. **Solo el título** (se eliminaron los
  subtítulos que desbordaban). Iconos sobre fondo neutro (contraste; los dorados
  eran dorado-sobre-dorado). Títulos sin recorte de descendentes.
- El Inicio fue **compactado** para que enmarque sin scroll excesivo.

### 3.2 Mercados (`markets.js`)
- Lista de **todas** las monedas (de `niveles/config.js` PARES), con logo, precio
  y %24h. Pestañas Favoritos/Spot, categorías, favoritos en `localStorage`
  (`mv-fav`), búsqueda.
- Datos: **CoinGecko** `coins/markets` (una llamada, cache 5 min en `mv-cg`).
- **Hoja al tocar una moneda** ("Elige la gráfica o indicador"):
  - **Barra de búsqueda robusta** (50px, no fina) que **filtra los indicadores por
    nombre** (real, no placeholder — pensada para 70+ indicadores futuros).
  - Opciones (la primera por defecto):
    1. **Gráfica Limpia** — gráfica de velas en vivo de **TradingView** (herramienta
       `grafica` de tools), gratis. Abre en **su propio overlay** → no deja Tools
       detrás.
    2. **Smart Levels** (niveles) · 3. **Radar Institucional** (muros) ·
       4. **Liquidity Pools** (liquidity).
  - Todas abren con **la moneda seleccionada** (ver bug corregido en §5).

### 3.3 Operar (`operar.js`) — estilo Bitunix SPOT
- Cabecera: selector de moneda (abre `picker`) + acciones (alerta, gráfica→
  liquidity, bots, tools).
- **Libro de órdenes FLUIDO:** WebSocket en vivo a Binance
  (`wss://stream.binance.com:9443/ws/{sym}@depth20@100ms`), ~10 updates/seg,
  actualización **en sitio** con barras animadas (transición CSS). Precio 24h por
  poll cada 3s.
- **Formulario:** pestañas Market/Limit, importe + selector de quote
  (USDT/USDC/BNB), **slider de % FUNCIONAL** (calcula el importe = saldo real del
  quote × %), stop-loss, disponible real (saldo del quote leído on-chain),
  botones comprar/vender.
- **Pestañas del panel:** Posición · **Mis órdenes** · **Bots**.
  - **Mis órdenes:** lista las **órdenes limit** reales con **logo, par,
    Comprar/Vender, precio y % de descuento/ganancia** (calculado con el precio
    actual). Botón **Cancelar** que cancela el **bot de 1 nivel on-chain**
    (`claveBot` + `cancelarRejillaK`) y quita el registro → libera cupo, no queda
    colgada. Antes de listar llama a `sincronizarOrdenes()` para limpiar las ya
    llenadas.
  - **Bots:** muestra tarjetas móviles propias (compactas, estilo Pionex) con los
    bots reales **activos** (leídos con `misRejillas`+`resumenK`+`modoDe`), con
    color por tipo, par, Inversión y Ganancia, y pastilla "activo". (Ver historia
    de este punto en §5.)

### 3.4 Activos (`activos.js`)
- **Tarjeta premium** de balance: ojo "Balance total" + marca **"CriptoCuba
  Oficial"** completa (sin truncar, **sin** botón de compartir). Acciones:
  **Recibir · Market · Swap** (se eliminaron Buy/Sell; Market va directo a vender).
- Pestañas **Spot / NFTs / Actividad** + botón **⚡Polvo** (colector de polvo).
- **NFTs y Actividad:** escáner **on-chain sin API** (`nfts.js`), leyendo eventos
  Transfer por RPC (con `getLogs`), `ownerOf`, `tokenURI` (ipfs→gateway). Máx 24
  NFTs / 30 eventos.

---

## 4. INTEGRACIONES CON LA WEB QUE LA MÓVIL REUTILIZA

La móvil **no reimplementa** la lógica on-chain: reutiliza módulos de la web.

- **`gridbot.js` (gb):** `misRejillas`, `resumenK`, `modoDe`, `claveBot`,
  `crearRejilla`, `cancelarRejillaK`, `cerrarAhoraK`, `fmt`, precios, swap, wrap
  BNB↔WBNB, saldos… (import dinámico desde la móvil).
- **`orden.js`:** órdenes limit = **rejillas de 1 nivel**. `ordenesPuestas()`,
  `cancelar(id)`, y **`sincronizarOrdenes(cuenta)`** (nuevo: revisa on-chain y
  limpia órdenes ya llenadas/canceladas). Claves: `cco-ordenes-grafico` (órdenes),
  `cco-ordenes-aviso` (alertas).
- **`gridbot-ui.js`:** portada de bots (`#colmena-app`, "Mis bots" = `.colmenas
  .card`). **Filtro de órdenes-limit-no-son-bots** (helper `clavesOrdenLimit`) en
  las tarjetas y en el conteo de cupo. Refresco llama a `sincronizarOrdenes`.
- **`niveles.js` / `muros.js` / `liquidity.js`:** las tres funciones de apertura
  (`abrirNiveles/abrirMuros/abrirLiquidity`) ahora **aceptan la moneda** como
  argumento opcional (compatibles con escritorio, que las llama sin argumento).
- **`tools.js`:** herramientas (colector de polvo, alertas, gráfica TradingView).
  Nuevo export **`abrirGraficaLimpia(coinId)`** (abre el widget `grafica` en su
  propio overlay, con la moneda dada, sin la lista de Tools detrás).
- **`wallet.js`:** `conectar`, `reconectarSiProcede` (silenciosa), `esRedCorrecta`,
  `cambiarARedCorrecta`, `cuentaActual`, `alCambiar`. RED = BNB Smart Chain
  (`0x38`).
- **`gridbot/estado.js`:** exporta `LOGOS` (tabla id→{img,price,chg}) que la web
  llena. La móvil la **reutiliza** para los logos.

---

## 5. BUGS CORREGIDOS (historia detallada)

> Muchos fueron errores introducidos durante el propio desarrollo móvil. Se
> documentan para no repetirlos.

1. **Swap invisible/detrás de la cáscara.** El swap se inserta en `#colmena-app`
   (oculto, con `isolation:isolate`). Solución: NO mover el modal (rompía su CSS
   scoped); en su lugar se sube el z-index de `#colmena-app` mientras el swap está
   abierto y se restaura al cerrar (MutationObserver). El botón central `.sw-flip`
   NO se toca.
2. **Chatbot de soporte no abría.** Causa: se ocultaba `#npChat`. Solución: no
   ocultarlo + subir su z-index a 11500 en móvil + apertura robusta de
   `abrirSoporte()` (click al FAB real aunque esté oculto).
3. **Academy/Liquidity sin scroll.** Causa: mi CSS les puso `max-height:none`.
   Solución: `max-height:calc(100vh - 90px); overflow-y:auto`.
4. **Botones de alerta como "texto plano".** Especificidad (`#mv-sheet button`
   pisaba `.al-ok/.al-cancel`). Solución: `#mv-sheet .al-ok` (id+clase).
5. **Barra de búsqueda "fina".** Regla `height:46px` conflictiva. Solución:
   `mvp-search` a 50px, única y consistente en todos los pickers.
6. **Badge HOT/TOP en gris.** `.mv-qi span` pisaba `.mv-qtag`. Solución:
   `.mv-qi .mv-qtag` con texto oscuro `#1a1200` sobre oro (verificado en vivo).
7. **Libro de órdenes a saltos.** Solución: WebSocket en vivo + barras con
   transición.
8. **Bots en Operar = "47 bots" y scroll negro infinito.** Causa: una función que
   **clonaba TODO el CSS de `#colmena-app`** a `#op-panel` arrastraba el fondo y
   layout de la portada. Solución final: **tarjetas móviles propias** (solo bots
   activos, `R.activa===true`), sin reubicar nada de la web.
9. **Órdenes limit aparecían como bots y ocupaban cupo; canceladas seguían.**
   Causa: una orden limit ES una rejilla de 1 nivel on-chain. Regla del producto:
   *Cash Out creado desde la sección de Bots = bot; creado desde Liquidity/
   Institutional/Smart Levels = orden limit*. El marcador ya existía: la orden
   limit guarda su `botId` en `cco-ordenes-grafico`; el Cash Out de bots no.
   Solución: filtro en `gridbot-ui.js` (tarjetas + cupo) y `sincronizarOrdenes`
   para limpiar las llenadas. **No se tocó la creación de bots.**
10. **LTC abría Smart Levels con BTC (bug fatal).** `abrirGrafica(g, par)`
    ignoraba `par`. Solución: pasa la moneda a `abrirNiveles/abrirMuros/
    abrirLiquidity(id)`.
11. **Temporalidad de Smart Levels = franja gigante.** Solución: se oculta la
    franja; se pone un **chip de temporalidad junto al selector de moneda** que
    despliega una **lista en cuadrícula** con TODAS las temporalidades reales de
    Binance (`1m,5m,15m,30m,1H,2H,4H,6H,12H,1D,3D,1W`), la activa en dorado.
    Maneja los botones reales ocultos `.nv-tf` para no duplicar lógica.
12. **Colector de polvo:** abría Tools primero, se cortaba abajo y dejaba Tools
    detrás. Solución: apertura directa (Tools oculto y removido al aparecer el
    overlay del polvo) + overlay del polvo responsive con scroll.
13. **Liquidity (Professional Analysis) "horrible".** Rediseño **completo** en
    móvil vía CSS inyectado: tarjetas de servicio con **imagen grande arriba
    (hero, 132px)** protagonista, nombre + lema dorado + descripción + chip dorado
    "Abrir"; separador con líneas; planes atractivos (precio grande en oro, botón
    dorado, recomendado con borde+glow, badge **centrado**). **Bug clave del
    rediseño:** había quedado un **bloque de CSS viejo con `!important`** que
    pisaba las nuevas reglas (fijaba la imagen en 54px) → se eliminó.
14. **Buy/Sell → Market.** En Inicio y Activos se reemplazaron los dos botones por
    uno "Market" que va directo a vender.
15. **Liquidity: Open muestra planes.** El botón "Abrir" va **centrado y sin
    flecha**; la portada muestra **solo los servicios**; al tocar Abrir, un
    **no-owner** ve los 3 planes (revelados + scroll) y el **owner** entra directo.
    Constante `OWNER` en `liquidity.js` (vacía = modo desarrollo, todos entran;
    con tu dirección, solo tú entras directo).

---

## 6. LO ÚLTIMO QUE SE HIZO (esta sesión)

### 6.1 Auto-conexión en móvil + aviso de red (`movil.js`, `estilos.js`)
- **Auto-conexión:** al montar en móvil, `autoConectarMovil()` intenta primero la
  reconexión silenciosa (`reconectarSiProcede`) y, si hay wallet inyectada y sigue
  sin cuenta, pide conexión una vez (`conectar()`). Ya no hace falta botón.
- **Aviso de red (`revisarRed()`):** si estás conectado pero NO en BNB Smart
  Chain, aparece una **ventanita sólida** (fondo oscuro, borde dorado, sombra,
  animación de entrada) con:
  - Título "Red incorrecta" + explicación.
  - Botón **"Cambiar a BNB Smart Chain"** (`wallet_switchEthereumChain`; funciona
    igual en Trust/MetaMask/SafePal — no distingue marca).
  - **X** para cerrar **y** se quita **solo** al corregir la red (hook en
    `alCambiar`).
  - **Instrucciones por wallet** (todas dentro del mismo mensajito), señalando
    dónde tocar: **MetaMask** (nombre de red arriba a la izq.), **Trust Wallet**
    (icono de red arriba a la der.), **SafePal** (selector de red arriba), y una
    línea genérica para **otras wallets**. (Phantom no se incluye porque es
    principalmente Solana.)

### 6.2 Bug crítico de logos (todos en blanco en móvil) — RESUELTO
- **Causa:** los logos del móvil dependían 100% de **CoinGecko** (incluso las URLs
  "fijas" eran de `assets.coingecko.com`). Dentro del navegador de una wallet
  (Trust/MetaMask), CoinGecko suele estar bloqueado/limitado → ningún logo. La web
  no fallaba porque tiene un respaldo desde GitHub que la móvil no usaba.
- **Solución (`fmt.js`):** la fuente de logos pasó a **GitHub (Trust Wallet
  assets)**, `raw.githubusercontent.com/trustwallet/assets/...`, que **sí carga**
  dentro de cualquier wallet. `logoDe(id,cg,cache)` prueba en orden:
  **tabla `LOGOS` del web** (que ya trae respaldos) → **GitHub** (tabla ampliada) →
  **cache de CoinGecko**.
  - Se ampliaron los logos a las monedas de mercado (BTC, ETH, BNB, WBNB, USDT,
    USDC, BUSD, DAI, CAKE, PAXG, BabyDoge, SOL, XRP, DOGE, ADA, AVAX, DOT, MATIC,
    LTC, TRX, ATOM, NEAR, APT, SUI, FIL, LINK, UNI, SHIB, PEPE, ARB, OP, INJ). Cada
    URL se **verificó con `curl` (HTTP 200)**. (TIA se quitó: no existe en Trust
    Wallet → cae a CoinGecko/inicial.)
  - En la lista de **Mercados** el logo se pinta como `<img>` con **respaldo**: si
    una URL fallara, muestra la **inicial** (nunca un cuadro en blanco).
  - Como todos los sitios usan `logoDe`, el arreglo se propaga a toda la app.

---

## 7. PLAN POR FASES (resumen — detalle en `PLAN-FASES.md`)

- **Fase 0 — Estabilización** (casi cerrada): todos los bugs anteriores + auditoría.
- **Fase 1 — Acciones de wallet** (gratis, on-chain): Enviar/Transferir,
  Wrap/Unwrap BNB↔WBNB, Seguridad (ver/revocar aprobaciones), Firmar mensaje,
  Cambiar de red.
- **Fase 2 — Marketplace NFT: contratos.** ERC-721 + Marketplace sin escrow
  (`setApprovalForAll`+`listar/comprar/cancelar`) + comisión + proxy UUPS; metadata
  gratis en GitHub Pages; leer publicaciones desde nuestro contrato por RPC (sin
  indexador). A confirmar: **% de comisión** y **dirección de tesorería**.
- **Fase 3 — Marketplace NFT: interfaz** (explorar/comprar/vender/cancelar/mis NFTs).
- **Fase 4 — Colección, historial e ingresos.**
- **Fase 5 — Pulido comercial + auditoría final.**

---

## 8. LIMITACIONES / PENDIENTES CONOCIDOS (honestos)

- **"Mis órdenes" es por dispositivo.** `cco-ordenes-grafico` es `localStorage`:
  las órdenes creadas en la web (PC) **no** aparecen en el móvil y viceversa. Para
  que crucen entre dispositivos hace falta un **marcador on-chain** en la creación
  de la orden (cambio pequeño en el lado de creación, pendiente).
- **Logos de monedas muy "long-tail"** que no estén en la tabla dependen aún de
  CoinGecko (si está bloqueado, muestran inicial).
- **Owner de Liquidity:** la constante `OWNER` en `liquidity.js` está **vacía**
  (modo desarrollo: todos entran). Hay que poner ahí la wallet del owner (en
  minúsculas) para que los no-owner vean los planes y el owner entre directo.
- El asistente **no puede** abrir el navegador de una wallet real en su entorno de
  pruebas, ni conectar wallet, ni acceder a CoinGecko/RPC/Binance/GitHub-raw desde
  el navegador headless (están bloqueados en sandbox). Por eso ciertas cosas
  (auto-conexión, cambio de red, carga real de logos/precios/bots) solo se pueden
  confirmar del todo **en el teléfono**. Lo verificable (que las URLs existen, que
  compila, que no desborda) sí se verifica.

---

## 9. ENTORNO DE PRUEBAS DEL ASISTENTE (para reproducir)

- Copia de trabajo: `/home/claude/rev/bot-algoritmico-main/`.
- **Compilar** cada módulo: `node --input-type=module --check < archivo.js`.
- **Servidor de pruebas headless** (Playwright): servir el repo con un mapa MIME
  **completo** (incluir `.mjs`, `.woff2`, `.jpg`, etc. — si falta, el shell no
  monta y da falsos negativos). Viewport 390×844 (y 360/320), `isMobile:true`.
- **Montaje manual** para depurar (evita el `.catch` que oculta errores):
  `const m = await import('./assets/js/movil/movil.js'); m.montarMovil({conectarWallet:()=>{}})`.
- **Auditoría responsive:** recorrer las 4 pantallas + modales en 390/360/320 y
  comprobar `scrollWidth <= innerWidth` (objetivo: 0 problemas).
- En sandbox se **bloquean** CoinGecko/Binance/flagcdn/RPC/WebSocket → precios,
  logos, libro, bots y NFTs salen "—" o vacíos; en el teléfono cargan en vivo.

---

## 10. CÓMO SEGUIR

Al retomar en una conversación nueva: comparte este `README-V2.md` (y el
`README.md` original si hace falta el contexto de contratos/keeper). El estado
actual: **Fase 0 casi cerrada**; el siguiente objetivo natural es **Fase 1**
(acciones de wallet). Para la Fase 2 se necesitan del owner: **% de comisión** y
**dirección de tesorería**.
