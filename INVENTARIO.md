# Inventario del proyecto

Lista completa de archivos. **Compara con tu repo antes de subir**: si falta
alguno, la página no carga.

```
bolita/
├── index.html                  entrada de GitHub Pages
├── README.md
├── INVENTARIO.md               este archivo
├── .nojekyll                   que Pages sirva todo tal cual
├── assets/
│   ├── css/
│   │   └── styles.css          todos los estilos
│   ├── img/
│   │   ├── hero-bg.webp        fondo desenfocado del banner    ← lo usa el CSS
│   │   ├── banner.webp         vista previa al compartir       ← lo usa og:image
│   │   └── banner.svg          misma imagen en vectorial
│   └── js/
│       ├── app.js              interfaz y flujo
│       ├── economics.js        matemática de la banca
│       ├── tokens.js           monedas admitidas y sus límites
│       ├── draws.js            las dos tiradas del día
│       ├── charada.js          los 100 números y sus nombres
│       ├── versos.js           los 99 versos del día
│       ├── confetti.js         confeti al ganar
│       └── wallet.js           conectar / desconectar / saldos
└── contracts/
    └── Bolita.sol              el contrato
```

**17 archivos en total** (12 dentro de `assets/`).

## Cómo depende cada cosa

```
index.html
  └── assets/css/styles.css
        └── assets/img/hero-bg.webp
  └── assets/js/app.js
        ├── economics.js
        ├── tokens.js
        ├── charada.js
        ├── versos.js
        ├── draws.js
        ├── confetti.js
        └── wallet.js
              └── tokens.js
```

Si borras cualquiera de los `.js`, **la página se queda en blanco**: los
módulos de JavaScript fallan entero cuando falta uno.

## Comprobación rápida

Abre la consola del navegador (F12). Si ves un error del tipo
`Failed to fetch dynamically imported module`, falta ese archivo.
