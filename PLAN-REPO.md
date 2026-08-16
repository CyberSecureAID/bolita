# PLAN DEL REPO COMPLETO — CriptoCuba Oficial

Mapa verificado con el grafo de dependencias real (partiendo de `index.html` →
`gridbot-ui.js`, más las cargas diferidas). Esto es tu checklist para armar el
repo local limpio.

---

## 1. ¿HAY QUE FRAGMENTAR `index.html`?  →  NO.

`index.html` son 248 líneas. Su `<script>` embebido (~100 líneas) y `<style>`
(~80 líneas) NO deben sacarse a módulos, porque son **código de arranque que
tiene que ir inline** por seguridad y velocidad:

- **Anti-clickjacking**: tiene que ejecutarse ANTES que nada. Si lo sacas a un
  archivo, se retrasa y pierde el sentido.
- **Registro del service worker** y **red de seguridad de 20 s** (aviso si la
  app no arrancó).
- **Carga diferida del asistente**: un botón + CSS mínimo que, al tocarlo, baja
  `asistente/motor.js` y `conocimiento.js`. Esto ahorra ~210 KB en el primer
  segundo. Sacarlo lo rompería.
- El `<style>` inline es el CSS "above-the-fold" (el botón flotante y el splash).

**Veredicto: `index.html` está bien montado. Se queda como está.** Lo único a
tocar es actualizar sus `?v=` cuando cambiemos archivos (ya lo controlamos).

---

## 2. BORRAR (basura de la lotería + huérfanos)  —  23 archivos + carpeta

Verificado: NADA de la app viva importa esto. Solo lo usa `app.js` (el entry de
la lotería, `loteria.html`), que también se borra.

**JavaScript (18):**
`app.js` · `charada.js` · `comprar.js` · `confetti.js` · `contrato.js` (el de la
RAÍZ `assets/js/`, no el de `market/`) · `cup.js` · `draws.js` · `economics.js`
· `florida.js` · `icons.js` · `notificaciones.js` · `prices.js` · `versos.js` ·
`delta.js` · `footprint.js` · `termometro.js` · `ethers-carga.js` · `worker.js`

**Páginas y otros (4 + carpeta):**
`loteria.html` · `diag.html` · `manifest.webmanifest` (el de la lotería; la app
usa `manifest-aurex.webmanifest`) · carpeta `contracts/` entera (`Bolita.sol`)

> Ojo: `contrato.js` está DOS veces. El de `assets/js/contrato.js` (raíz, 406
> líneas) es de la lotería → BORRAR. El de `assets/js/market/contrato.js` (17
> líneas, el que hicimos) → SE QUEDA.

**Imágenes de la lotería (revisar y borrar):** `bola-num*.webp`, `bombo-bg.webp`,
`cup-coin.webp`, `drawbar-bg.webp`, `hero-billete.webp`, `importe-bg.webp`,
`modo-*.webp` (si no se usan), `azul.webp`, `banner.*`, `aurex-logo.png`,
`aurex-maskable.png`, `logo.webp`, `logo-nav.webp`, `bots-bg.webp`,
`fondo-bots.webp`. (Las imágenes no rompen la app si sobran; es solo limpieza.
Este paso lo dejamos para el final.)

---

## 3. SE QUEDA TAL CUAL (usado, tamaño sano, no se toca)

**Raíz:** `index.html` · `sw.js`* · `manifest-aurex.webmanifest` · `robots.txt`
· `sitemap.xml` · `CNAME` · `.nojekyll` · `Favicon.webp` · `README.md` ·
`INVENTARIO.md`

**Vendor (librerías, NO se tocan):** `ethers-6.13.4.min.js` ·
`lightweight-charts.mjs` · `qrcode.js` · `walletconnect.umd.js`

**CSS:** `asistente.css` (769 L) · `styles.css` (2.302 L)** 

**JS medianos ya sanos:** `wallet.js` (540) · `gridbot.js` (772) ·
`prizepool.js` (633) · `perfil.js` (602) · `extras.js` (594) · `grafica.js`
(302) · `tokens.js` (322) · `avisos.js` (160) · `gestos.js` (204) ·
`tutorial.js` (219) · `academy-ruta.js` (98)

**Ya modularizados (37 archivos, hechos):** `niveles.js`+`niveles/` (15) ·
`market.js`+`market/` (14) · `gridbot-ui.js`+`gridbot/` (5)

> \* `sw.js`: su lista de precache está en `?v=107` (desfasada del `?v=125` que
> usa el index). No rompe nada (los fallos de precache se ignoran), pero conviene
> actualizarla. Tarea pequeña.
>
> \** `styles.css` (88 KB) es candidato a limpieza/modularización de CSS, pero es
> bajo riesgo (se carga una vez). Prioridad baja.

---

## 4. FALTA MODULARIZAR (archivos grandes, en orden de tamaño)

| # | Archivo | Líneas | Notas |
|---|---|---|---|
| 1 | `asistente/motor.js` | **3.160** | El más grande del repo. Motor del asistente de IA. Se carga diferido desde index. |
| 2 | `liquidity.js` | 2.716 | ⚠️ Contiene el mapa de calor CONGELADO (`calor`/`ESCALONES`). Modularizar ALREDEDOR sin tocarlo. |
| 3 | `idioma.js` | 2.359 | Datos de traducción. Bajo riesgo, se puede partir por secciones. |
| 4 | `muros.js` | 1.966 | Radar Institucional. Revisar si tiene zona congelada. |
| 5 | `asistente/conocimiento.js` | 1.559 | Base de conocimiento del asistente (mayormente datos). |
| 6 | `orden.js` | 1.392 | Órdenes desde el gráfico (lo usa Smart Levels). |
| 7 | `tools.js` | 1.309 | Herramientas. |
| 8 | `academy.js` | 1.087 | Academia. |
| 9 | `admin.js` | 882 | Panel admin. |

---

## 5. ORDEN SUGERIDO DE TRABAJO

1. **Purga** (borrar los 23 archivos + `contracts/`). Rápido, y aligera todo.
2. **`asistente/motor.js`** (el más grande) — mismo método: base + módulos,
   verificando en cada paso.
3. Seguir por tamaño: `liquidity.js` (con cuidado por la zona congelada),
   `idioma.js`, `muros.js`, `conocimiento.js`, `orden.js`, `tools.js`, `academy.js`.
4. Actualizar `sw.js` (precache al día) y limpiar `styles.css`.
5. Pendiente reservado: núcleo de bots de `gridbot-ui.js` (probar en vivo).

Cada archivo grande se entrega igual que hasta ahora: archivo principal + su
carpeta de módulos, verificado headless, y al final auditamos el `.zip` completo.
