# Lógica Estructural Avanzada — auditoría senior y especificación de implementación

> Documento de trabajo del IMPLEMENTADOR (no material de marketing ni tutorial).
> Objetivo: dejar la estrategia lo bastante desambiguada como para codificarla sin
> adivinar. Todo lo que NO esté cerrado aquí está marcado como **[PREGUNTA]** y
> bloquea la implementación de esa parte hasta que el trader lo responda.
>
> Fuente: explicación verbal del trader (dueño de la estrategia, la opera en real y
> la enseña en su academia). Sección del producto: se renombra de "Institutional
> Radar" a **"Lógica Estructural Avanzada"**.
>
> Contexto técnico del entorno (no olvidar):
> - Datos: klines públicos de Binance (`/api/v3/klines`), 400 velas por defecto, y
>   se pueden pedir temporalidades superiores para la tendencia jerárquica.
> - Todo corre en el navegador. Sin backend. La detección tiene que ser barata.
> - El sandbox de desarrollo NO abre navegador ni internet: se valida por cálculo
>   puro (Node) y el trader confirma en su gráfico real. Cada entrega debe traer un
>   set de casos de prueba en Node.
> - Archivo principal: `assets/js/muros.js` (export `abrirMuros`). Las tarjetas de
>   liquidez de la derecha son datos reales y NO se tocan. Solo cambia lo que se
>   dibuja EN la gráfica y la lógica de zonas/entradas.

---

## 0. Qué NO es esta estrategia (errores ya cometidos, no repetir)

- **NO** es "detectar un rango y un impulso por la forma de las velas y pintar un
  rectángulo". Eso fue lo que se hizo y el trader lo calificó de basura. La forma
  de las velas es solo el último eslabón; sin el contexto de tendencia no vale.
- **NO** es pintar zonas en cualquier sitio. Una zona solo existe si nace de un
  evento estructural (ruptura de trendline de corto plazo con impulso + acumulación
  previa) **o** de un retroceso con acumulación dentro de una tendencia sana.
- **NO** es un robot que dice "entra aquí" a ciegas. Es un sistema que solo marca
  zonas cuando la confluencia de tendencias lo respalda; si no hay confluencia, no
  hay zona.
- **NO** volver a la gráfica llena de órdenes/tachuelas de liquidez. Eso quedó
  eliminado y así se queda.

---

## 1. Arquitectura de la estrategia (visión de alto nivel)

Tres pasos. El orden importa: cada paso es un filtro que condiciona al siguiente.

```
PASO 1 — TENDENCIA (doble): jerárquica (grande) + corto plazo (microtendencia)
            │
            ▼
PASO 2 — EVENTO DE ENTRADA: uno de dos disparadores
            (A) Ruptura de estructura en el punto de confluencia de las 2 tendencias
            (B) Retroceso con acumulación a favor de la tendencia predominante
            │
            ▼
PASO 3 — ZONA SWING + ENTRADAS: el rango de acumulación que originó el impulso se
            marca como rectángulo infinito a la derecha; entradas 1 (y opcional 2)
            con gestión de R:R condicionada al ancho de la zona vs. el impulso.
```

La rentabilidad, según el trader, viene de **operar a favor de la tendencia
jerárquica aprovechando los retrocesos** (paso 2B) y de **las rupturas estructurales
en confluencia** (paso 2A). El resto es ruido y no se opera.

---

## 2. PASO 1 — Determinación de la doble tendencia

### 2.1 Concepto (en palabras del trader, reinterpretado)
- **Tendencia jerárquica (largo plazo):** define el ciclo mayor del precio. Se lee
  en una temporalidad SUPERIOR a la de operación.
- **Tendencia de corto plazo (microtendencia):** dice de dónde viene el precio y
  hacia dónde va a **confluir** con la jerárquica. Se lee en la temporalidad de
  operación (la que el usuario tiene en pantalla).
- El valor está en la **confluencia**: p. ej. semanal bajista + 4H/1H alcista →
  el tramo alcista de corto plazo es en realidad un viaje hacia un punto de
  confluencia donde la jerárquica bajista retomará el control. Quien mira solo 1H
  cree que es alcista; estructuralmente es un rebote dentro de algo mayor.

### 2.2 Mapa de temporalidades (para que "sea cual sea donde opera el usuario" funcione)
El trader dio ejemplos; de ellos derivo esta tabla. **Confirmar en [PREGUNTA 1].**

| Opera en (pantalla) | Tendencia corto plazo | Tendencia jerárquica |
|---------------------|-----------------------|----------------------|
| 5m                  | 5m                    | 1H                   |
| 15m                 | 15m                   | 4H                   |
| 30m                 | 30m                   | 4H (no 1H: "no tiene sentido sacar 2 tendencias tan pegadas") |
| 1H                  | 1H                    | 1D (diario)          |
| 4H                  | 4H                    | 1D o 1W              |
| 1D                  | 1D                    | 1W                   |

Regla implícita que extraigo: **la jerárquica debe estar suficientemente separada
de la de operación** (al menos ~1 salto grande de escala), porque "no sirve
determinar la tendencia en 1H para operar en 30m". Es decir, no basta con "la
siguiente temporalidad"; hay que dar un salto real de escala.

### 2.3 Cómo se determina cada tendencia (esto es lo que hay que codificar)
El trader dice que traza **líneas tendenciales**:
- La jerárquica: una trendline "vista desde una escala de gráfico más alejada",
  con muchísimas velas.
- La de corto plazo: una trendline que recoge "al menos 10-12 puntos" (aprox.), una
  microtendencia.

Traducción a algo computable (propuesta a validar en **[PREGUNTA 2]**):
- **Trendline por pivotes:** detectar swing highs / swing lows (pivotes) con una
  ventana N. La tendencia bajista se traza uniendo máximos decrecientes; la alcista
  uniendo mínimos crecientes. "10-12 puntos" ≈ usar los últimos ~10-12 pivotes para
  la microtendencia, y una ventana de pivote mayor (más velas) para la jerárquica.
- **Dirección de la tendencia** = estructura de máximos/mínimos (HH/HL = alcista;
  LH/LL = bajista) confirmada por la pendiente de la trendline.
- La jerárquica se calcula con velas de la **temporalidad superior** (segunda
  llamada a klines), no con la misma temporalidad.

> Nota de implementación: ya existe en el repo cálculo de tendencia/sesgo
> (`analizarMercado`, VWAP/VAH/VAL) y el sistema puede pedir velas de temporalidad
> superior (`traerVelas(par, sup, 300)` ya se usa para confluencia multi-timeframe).
> Reutilizar eso en vez de inventar.

### 2.4 Lo que el PASO 1 debe producir
```
tendencia = {
  jerarquica: { dir: 'alcista'|'bajista'|'lateral', trendline: {puntos, pendiente} },
  corto:      { dir: 'alcista'|'bajista'|'lateral', trendline: {puntos, pendiente} },
  confluencia: bool,          // ¿corto se dirige a un punto de choque con jerárquica?
  puntoConfluencia: precio|null
}
```

---

## 3. PASO 2 — Evento de entrada (dos disparadores)

### 3.1 Disparador A — Ruptura de estructura en confluencia
Secuencia exacta descrita por el trader:
1. El precio de corto plazo se acerca al **punto de confluencia** con la jerárquica.
2. Se produce una **ruptura de la trendline de corto plazo** (la microtendencia).
3. Esa ruptura va **acompañada de un impulso**.
4. **Antes** de ese impulso había un **periodo de acumulación**.
5. → Ese periodo de acumulación es la **zona swing**.
6. Se puede medir además el **retesteo** posterior a la ruptura (a validar en
   **[PREGUNTA 3]**: ¿el retesteo es condición para entrar o solo información?).

Dirección de la operación:
- Ruptura bajista → zona swing de **oferta** → **cortos**.
- Ruptura alcista → zona swing de **demanda** → **largos**.

### 3.2 Disparador B — Retroceso con acumulación a favor de la tendencia
Esto es lo que el trader remarcó como el corazón rentable de la estrategia:
- En una tendencia sana (impulso → retroceso → impulso → retroceso…), **cada
  retroceso que forma acumulación es una entrada** para volver a montarse a favor
  de la tendencia predominante.
- No requiere ruptura de trendline. Requiere:
  1. Tendencia predominante clara (paso 1) — p. ej. alcista.
  2. Un impulso en la dirección de la tendencia.
  3. Un **retroceso** que forma una pequeña **acumulación** (rango).
  4. Confirmar que la tendencia (corto) apoya el movimiento **y** que la jerárquica
     no está metiéndonos justo en un punto de inflexión/confluencia contrario (si
     lo está, es mala entrada).
- → El rango de acumulación del retroceso es la **zona swing**.

### 3.3 Filtro de confluencia jerárquica (sube la probabilidad "al 1000%")
Para AMBOS disparadores, antes de dar la zona por válida:
- Si la operación va **a favor** de la jerárquica → válida (alta probabilidad).
- Si la operación va **en contra** de la jerárquica y estamos **entrando en el punto
  de inflexión/confluencia** → **mala opción**, no marcar o marcar como "incierta".

---

## 4. PASO 3 — Zona swing, entradas y gestión de riesgo

### 4.1 La zona swing
- Es el **rango de acumulación** que originó el impulso (disparador A o B).
- Se dibuja como **rectángulo que se proyecta infinito hacia la derecha**, hasta que
  el precio la **toque** (entrada) o la **invalide** (perforación → deja de existir).
- Colores de la marca (verde demanda / rojo oferta, ya acordado). Nada de azul.

### 4.2 Entradas (1 o 2, variable)
Para una zona de **oferta** (ruptura/tendencia bajista):
- **Entrada 1:** en la línea **inferior** del rectángulo (la que da la cara al
  precio que sube a testear).  ← *ojo, ver **[PREGUNTA 4]**: el trader dijo "la
  primera entrada va en la línea inferior" para una ruptura bajista; confirmar que
  no es errata y que para bajista la entrada agresiva es la inferior y el SL arriba.*
- **Entrada 2 (opcional):** en la línea **superior**, que es donde va el **SL de la
  entrada 1**.
- El número de entradas (1 o 2) es **configurable por el trader** (a veces 1, a
  veces 2). → parámetro de usuario.

Para una zona de **demanda** (alcista): espejo (entrada 1 en la línea superior,
entrada 2 en la inferior con el SL). **Confirmar orientación en [PREGUNTA 4].**

### 4.3 Riesgo/beneficio
- Objetivo **por defecto: 1:2** (siempre que se pueda).
- **Regla de zona ancha (gestión en momentos inciertos):**
  - `ancho_zona = alto de la zona swing`
  - `tamaño_impulso = recorrido del impulso que salió de la zona`
  - Si `ancho_zona >= 50%` (y sobre todo hacia `70%`) de `tamaño_impulso`:
    - No se puede exigir 1:2 al mercado.
    - → operar **1:1**, o **no operar**.
  - **[PREGUNTA 5]:** ¿dónde exactamente está el corte? Propuesta:
    - `ancho < 50% impulso` → 1:2
    - `50% ≤ ancho ≤ 70% impulso` → 1:1
    - `ancho > 70% impulso` → NO operar (marcar zona como "incierta"/descartada)
    Confirmar estos cortes o darme los tuyos.

### 4.4 Objetivo (TP) — [PREGUNTA 6]
Con R:R 1:2, el TP = entrada + 2× (distancia entrada→SL). Pero falta definir si el
SL de la entrada 1 es exactamente la línea opuesta de la zona (como sugiere "entrada
2 va donde va el SL de la entrada 1") o si lleva un pequeño colchón. Confirmar:
- ¿SL exactamente en la línea opuesta del rectángulo? ¿o con margen (X ticks / %)?

---

## 5. Salida visual en la gráfica (qué ve el cliente)

Propuesta (a afinar contigo):
1. Las **dos trendlines** (jerárquica y corto plazo) dibujadas, diferenciadas
   (p. ej. jerárquica más gruesa/tenue, corto plazo más marcada).
2. La **zona swing** como rectángulo proyectado a la derecha, verde/rojo.
3. Las **líneas de entrada 1 (y 2)**, el **SL** y el **TP** con su R:R, como la
   herramienta de posición que ya existe.
4. Una **etiqueta de estado** de la zona: "a favor de tendencia" / "incierta
   (confluencia contraria)" / "zona ancha → 1:1" — para que el cliente entienda el
   porqué, sin ruido.
5. Nada más. Sin tachuelas de liquidez en la gráfica (siguen en las tarjetas
   derechas).

---

## 6. Plan de implementación por fases (para no volver al ciclo de parches)

Construir **una fase, validarla contigo, y solo entonces la siguiente.** No entregar
las cinco a medias.

- **Fase 1 — Tendencia de corto plazo (microtendencia) por pivotes + su trendline.**
  Entregable: la trendline de corto plazo dibujada y la dirección (alcista/bajista/
  lateral) mostrada. Validas que coincide con lo que tú ves. *(Es la base de todo;
  si esto no coincide con tu ojo, nada de lo demás sirve.)*
- **Fase 2 — Tendencia jerárquica** (velas de temporalidad superior) + confluencia.
- **Fase 3 — Detección de acumulación + impulso** (disparadores A y B) usando ya el
  contexto de tendencia de las fases 1-2.
- **Fase 4 — Zona swing + entradas + R:R + regla de zona ancha.**
- **Fase 5 — Estados/etiquetas y pulido visual.**

Cada fase trae casos de prueba en Node y una descripción de qué debes ver en tu
gráfica real para aprobarla.

---

## 7. PREGUNTAS ABIERTAS (bloquean la implementación — necesito tus respuestas)

1. **Mapa de temporalidades (2.2):** ¿la tabla es correcta? En concreto: operando
   en 15m, ¿jerárquica en 4H? Operando en 1H, ¿jerárquica en 1D? Dame el par
   (operación → jerárquica) para: 1m, 5m, 15m, 30m, 1H, 4H, 1D.
2. **Definición computable de tendencia (2.3):** ¿te sirve "estructura de pivotes
   HH/HL vs LH/LL + trendline por los últimos ~10-12 pivotes"? ¿O tú determinas la
   tendencia de otra forma concreta (una media, la trendline a mano sobre ciertos
   toques, etc.)? Cuanto más exacto me lo des, más se parecerá a tu ojo.
3. **Retesteo (3.1, punto 6):** tras la ruptura, ¿el retesteo de la zona es
   **requisito** para habilitar la entrada, o es solo información/confirmación
   opcional?
4. **Orientación de las entradas (4.2):** para una ruptura **bajista** (zona de
   oferta), confirma: ¿entrada 1 en la línea **inferior** del rectángulo y SL en la
   **superior**? (Me chirría un poco porque en oferta lo natural sería vender arriba;
   quiero tu confirmación exacta para no invertirlo.)
5. **Cortes de la regla de zona ancha (4.3):** ¿`<50%`→1:2, `50-70%`→1:1,
   `>70%`→no operar? ¿o tus umbrales son otros?
6. **Stop loss (4.4):** ¿el SL va exactamente en la línea opuesta de la zona swing,
   o con un colchón (cuántos ticks / qué %)?
7. **"Impulso" y "acumulación", en números:** para poder detectarlos sin adivinar:
   - Impulso mínimo: ¿lo defines por % de movimiento, por nº de velas, por tamaño
     relativo a la volatilidad (ATR)? Un impulso "válido" para ti, ¿cuánto mide
     típicamente en 1H de BNB, por ejemplo?
   - Acumulación mínima: dijiste "a veces 13 velas/13 horas en 1H, a veces menos, a
     veces hasta 24h". ¿Cuál es el **mínimo** de velas que aceptas para llamarlo
     acumulación válida? ¿y el máximo?
8. **Tendencia lateral:** si el paso 1 da "lateral" (sin tendencia clara), ¿qué
   hacemos? ¿no marcamos nada? ¿marcamos ambos lados?
9. **Cuántas zonas a la vez:** ¿mostramos solo la mejor zona activa por lado
   (1 demanda + 1 oferta), o varias? En tu operativa real, ¿cuántas zonas válidas
   sueles tener en pantalla a la vez?
10. **Invalidación:** una zona swing deja de existir cuando el precio la perfora.
    ¿Perforación = un **cierre** de vela al otro lado, o basta con que la **mecha**
    la atraviese? (Esto cambia mucho cuántas zonas sobreviven.)

---

## 8. Nota del implementador
La parte más difícil y de la que depende TODO es el **Paso 1 (tendencia)**. Si la
tendencia que calcula el sistema no coincide con la que tú ves a ojo, las zonas
saldrán "bien detectadas" pero en el lado equivocado, y volverá a parecer basura.
Por eso la Fase 1 se valida sola, contigo, antes de seguir. Es el cimiento.
