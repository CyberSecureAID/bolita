# CriptoCuba Oficial — README V3

> Continuación de README.md y README-V2.md. Aquí se registra lo resuelto en las
> sesiones recientes (keeper, comisiones, UI móvil) y el plan concreto de lo que
> viene: comprar el plan de Cloudflare y añadir 3 bots nuevos.
> Este documento NO reemplaza a los anteriores; los complementa.

---

## 0. Reglas de trabajo INVIOLABLES (recordatorio)

- Responder y trabajar en **español**.
- Entregar **solo los archivos realmente modificados**, con su ruta exacta.
- **Nada embebido**: todo modular, un archivo = una responsabilidad.
- Verificar sintaxis antes de entregar. No romper lo que ya funciona.
- El módulo de órdenes ACTIVO es `assets/js/orden.js` (el de la raíz es duplicado viejo: NO tocar).
- Verificar que el nombre del sitio/dominio sea consistente en todos lados.
- Respuestas cortas. El usuario odia el texto largo.

---

## 1. ESTADO ACTUAL DEL KEEPER (lo más importante)

### 1.1 Qué es y dónde vive
- Worker de Cloudflare: `bolita-keeper-bot`, repo `CyberSecureAID/bolita-keeper`, archivo `src/worker.js`.
- URL: `https://bolita-keeper-bot.yamicelanvivesqui.workers.dev`
- Endpoints: `/estado` (ver cómo va), `/run?key=ADMIN_TOKEN` (disparo manual), `/registrar`, `/parte`.
- Revisa precios cada minuto y dispara compras/ventas en el contrato.

### 1.2 Problemas YA resueltos (causa raíz encontrada)
1. **La "bolita" hacía revertir cada operación.** El contrato llamaba a un contrato externo (`bolita`) en cada swap y revertía todo. Solución: `setBolita(0x0)` (owner). Desde entonces compras y ventas ejecutan.
2. **Comisión por operación eliminada.** Se quitó el 0.10% por swap con `setComision(0,0)`. Modelo actual: **solo $1/mes de suscripción**, cero porcentaje por operación. Abrir/operar bots quedó muy barato.
3. **RPC devolvía 403 y cegaba al keeper.** Se reforzó `getProvider` (valida con una llamada real, no solo el número de bloque) y `ensayar` distingue un error de red (403/429/timeout) de un rechazo real del contrato.
4. **Margen del 0.3% que bloqueaba ejecuciones (bug mío).** Se eliminó: ahora dispara en el precio EXACTO del usuario.
5. **Compra del gráfico se ejecutaba a MERCADO.** Causa: se creaba como DCA (modo 3, que compra por tiempo). Solución: se crea como grid (modo 0) con un nivel de compra a precio exacto (estado 1). Ahora solo entra cuando el precio llega al objetivo. Se ajustó `ordenBase>0` para pasar la validación del contrato.

### 1.3 El problema que FALTA resolver (y su solución ya decidida)
- **Síntoma recurrente:** el keeper funciona un rato y luego se congela. Cada vez es "otro error", pero el patrón se repite hace meses.
- **CAUSA RAÍZ REAL:** el disparador vive en el **cron interno de Cloudflare**, que en el plan gratuito + deploys por Git es **frágil**: se borra o Cloudflare lo pausa. En el último caso, el cron trigger directamente **no estaba registrado** en el panel (la sección Cron Triggers salía vacía), y además apareció un error de conexión con GitHub ("Error fetching GitHub User or Organization details") que puede dejar deploys a medias y tumbar el cron.
- **SOLUCIÓN DECIDIDA (dos partes):**
  1. **Comprar el plan Workers Paid ($5/mes).** Da 10M ejecuciones/mes, 30s de CPU por corrida (vs 10ms del gratis) y 10.000 subpeticiones por corrida (vs 50). Cubre de sobra hasta ~10.000 usuarios. (Bloqueo actual: el pago requiere tarjeta Visa/Mastercard; el usuario está en Cuba y pagará vía un contacto en EE.UU. o tarjeta virtual de $500. Bitrefill con montos pequeños falló.)
  2. **Disparador externo redundante:** un cron externo gratuito (ej. cron-job.org) que llame a `/run?key=ADMIN_TOKEN` cada minuto. Así el keeper corre aunque Cloudflare borre su cron interno. `/run` ejecuta el ciclo completo (idéntico al cron). **Esto rompe el problema recurrente de raíz.**
- **Orden al retomar:** (a) comprar plan $5, (b) reconectar GitHub en Cloudflare, (c) añadir cron `* * * * *` en el panel, (d) montar el cron externo, (e) revisar los ~959 errores que se vieron en métricas.

### 1.4 Contrato (referencia)
- Proxy: `0x4e86430BC2260FE359d1Ea7Eef8B595fB241F93B`
- Implementación: `0xAfda4B885CE5599050CF0f1c2c9Cc4661Cae8005`
- Es actualizable (proxy). Usa Pancake V3. `ejecutar(bytes32 clave, uint256 indice)` es la función que dispara el keeper.
- Modos: 0=grid, 1=acumulador, 2=cash out, 3=DCA. El acumulador (modo 1) al vender todo **se re-arma solo** (bot infinito) — confirmado en el código.

---

## 2. LIMPIEZA DE CLOUDFLARE (hecho)

La cuenta tenía Workers viejos de otros proyectos gastando recursos. Se borraron:
`bolita-owner-bot`, `bolita-owner`, `bolita-florida`.
Se quedan (son de la plataforma):
- `bolita-keeper-bot` (el keeper).
- `aurex-academy-bot` (bot de Telegram de la academia — NO tocar).

---

## 3. UI / MÓVIL — arreglado en sesiones recientes

- **Coste por operación (perfil):** antes saltaba de miles a 26 (estimación mala). Ahora usa el **precio de gas real** de la red × consumo típico (~400k gas) → número estable y honesto. Se añadió `precioGasWei()` en `gridbot.js`.
- **Órdenes del gráfico separadas de los bots:** ya no aparecen como "Bot Cash Out". Se muestran como "Orden de compra/venta" con etiqueta LIMIT.
- **Ventana "Mis órdenes":** botón fijo con borde 3D y contador REAL (antes mostraba siempre "1"; causa: se leía otra instancia del módulo por versión distinta del import — se unificó y `ordenesPuestas()` ahora lee del almacenamiento).
- **Historial de operaciones:** sección desplegable en el perfil (web) e icono en el área de operar (móvil). Lee los eventos `Ejecutado` de la cadena, separado en "órdenes limit" y "operaciones de bots". Función `historialDe()` en `gridbot.js`. Sin scroll infinito.
- **Ejes de precio más estrechos** en los 3 gráficos (Heat Pools 66, Liquidity 56, Smart Levels 64), con la detección de clics ajustada.
- **Encabezados móviles** de Heat Pools y Liquidity reorganizados (X arriba a la derecha, "1H" compacto, calendario oculto en móvil).
- **Smart Levels:** arrastre con más recorrido a ambos lados (tipo TradingView).
- **Notificación + sonido** al completarse una orden (`orden.js`).

### Pendiente de UI (para el sábado)
- **Zoom con la rueda sobre el eje de precios en Liquidity Pools.** Requiere tocar el cálculo de la escala vertical, y eso puede mover el mapa de calor (que el usuario pidió NO tocar). Hacerlo con cuidado, escalando todo de forma uniforme.
- Revisar responsividad fina de la barra superior de Heat Pools si aún se ve escalonada.

---

## 4. BOTS NUEVOS PLANEADOS (los 3)

> Nota honesta y central: **ningún bot "genera rentabilidad" solo.** La ganancia depende de que el mercado se mueva a favor de la estrategia y de que el usuario elija bien. No se debe prometer rentabilidad garantizada (riesgo legal y de reputación). Estos 3 son **estrategias legítimas**, cada una buena para un escenario. Se descartó el **arbitraje** (se compite contra bots profesionales; el gas + slippage se comen la ganancia; no es viable como producto que promete rentabilidad).

### 4.1 Bot de Rebalanceo (PRIORITARIO — el de más valor real)
- **Qué hace:** mantiene una proporción fija entre dos activos (ej. 50% BNB / 50% USDT). Si BNB sube, vende un poco (toma ganancia); si baja, compra un poco (promedia). Es "comprar barato, vender caro" automático.
- **Cuándo rinde:** mercados laterales y volátiles. Muy demandado.
- **Qué hace falta:** una nueva estrategia en el contrato (o integración al contrato base vía proxy) que, dado el % objetivo y una desviación de disparo, ejecute el swap de rebalanceo. El keeper lo vigila igual que a los demás (por precio/proporción).

### 4.2 Trailing Stop (stop dinámico)
- **Qué hace:** vende automáticamente si el precio cae X% desde su punto MÁS ALTO alcanzado. No genera ganancia: **protege** la ganancia acumulada.
- **Cuándo sirve:** para asegurar beneficios sin vigilar el gráfico. Muy valorado.
- **Qué hace falta:** guardar el "máximo alcanzado" y disparar la venta cuando el precio caiga el % configurado. El keeper actualiza el máximo y evalúa la caída.

### 4.3 Bot de Señales / Indicadores
- **Qué hace:** compra/vende cuando se cumple una condición técnica (cruce de medias móviles, RSI, etc.).
- **Cuándo sirve:** para usuarios que confían en indicadores. Parece "más inteligente" pero es **más riesgoso y complejo** (falsas señales).
- **Qué hace falta:** calcular el indicador (en el keeper o en el frontend) y disparar según la señal. Es el más complejo de los tres; dejarlo para el final.

### Orden recomendado de construcción
1. **Rebalanceo** (mejor relación valor/esfuerzo, encaja con lo que ya hay).
2. **Trailing Stop** (protección, muy pedido, relativamente simple).
3. **Señales/Indicadores** (el más complejo, al final).

Todos deben:
- Añadirse como **nuevo modo** en el contrato (aprovechando el proxy) o como contrato nuevo integrado.
- Ser vigilados por el **keeper** existente (que ya sabe recorrer niveles por precio).
- Mostrarse en la UI con el mismo estándar visual (web + móvil) y aparecer en el historial.

---

## 5. RESUMEN DE PRÓXIMOS PASOS (al retomar)

1. **Comprar Workers Paid ($5/mes)** (vía contacto en EE.UU.).
2. **Reconectar GitHub** en Cloudflare y hacer un deploy limpio.
3. **Añadir el cron** `* * * * *` en el panel + **montar cron externo** (cron-job.org → `/run`).
4. Confirmar en `/estado` que "Última corrida" se actualiza cada minuto. Revisar los 959 errores.
5. **Fase de bots nuevos:** empezar por el **Rebalanceo** (contrato + keeper + UI).
6. **Pendiente UI:** zoom del eje en Liquidity (con cuidado del mapa de calor).

---

## 6. ADVERTENCIAS HONESTAS (para no tropezar otra vez)

- El keeper NO es confiable si depende solo del cron interno de Cloudflare. El **cron externo es obligatorio** para estabilidad.
- Ningún bot garantiza ganancias. Comunicarlo así a los usuarios (términos claros).
- Antes de cada entrega: sincronizar los archivos ya entregados desde `/mnt/user-data/outputs` al workdir, editar, verificar sintaxis, y entregar solo lo cambiado.
- El arbitraje quedó **descartado** como producto. No retomarlo salvo como experimento personal con flash loans y capital propio.
