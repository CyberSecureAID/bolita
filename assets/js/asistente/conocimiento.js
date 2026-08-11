/* ================================================================
   JESÚS — Asistente de Aurex Finance
   SOLO EN ESPAÑOL, a propósito. Mantener dos idiomas obliga a duplicar
   cada respuesta y a que las dos versiones se desincronicen con el
   tiempo. Quien lo necesite en otro idioma tiene el traductor del
   navegador, que hoy funciona muy bien.
   Base de conocimiento. ÚNICO archivo a editar para cambiar lo que
   sabe o lo que dice. El motor (motor.js) no se toca.

   ── CÓMO ESCRIBIR AQUÍ ──────────────────────────────────────
   1. CORTO. Dos o tres frases. Lo demás se ofrece con "more".
   2. VARIANTES. Mínimo tres por respuesta: quien vuelva mañana no
      debe oír el mismo disco.
   3. HONESTO. Nada de promesas de ganancias. Si algo puede salir
      mal, se dice. Preferimos un usuario informado a uno ilusionado.
   4. NUNCA INVENTAR. Sin dato confirmado: se dice y se ofrece hablar
      con una persona.
================================================================ */

window.NP_BOT_KB = {

  bot: {
    name:   'Jesús',
    role:   'Asistente de Aurex',
    avatar: 'assets/img/jesus-avatar.webp',

    /* Cada saludo se presenta y termina llevando al usuario a un terreno
       donde sabemos responder. Los botones hacen el resto: en vez de
       dejarle escribiendo a ciegas, le damos por dónde tirar. */
    greeting: [
      'Hola, soy **Jesús**, del equipo de Aurex.\n\n¿En qué te ayudo?',
      '¡Hola! Soy **Jesús**. Estoy aquí para resolver cualquier duda sobre Aurex.\n\n¿Qué quieres saber?',
      'Buenas. Soy **Jesús**, de Aurex.\n\nPregúntame lo que quieras: los bots, el marketplace, las comisiones, lo que sea.',
      'Hola. Soy **Jesús**.\n\n¿Primera vez por aquí, o ya tienes algún bot funcionando?',
      'Hola, ¿qué tal? Soy **Jesús**, de Aurex.\n\nDime qué necesitas y te echo una mano.',
      '¡Hola! **Jesús** al habla.\n\n¿Te explico cómo funciona esto, o tienes una duda concreta?',
      'Buenas. **Jesús**, de Aurex.\n\nSi te suena a chino todo esto, tranquilo: empezamos por el principio.',
      'Hola. Soy **Jesús** y llevo la parte de atención de Aurex.\n\nDime en qué andas y vemos.',
      '¿Qué tal? Soy **Jesús**.\n\nPregunta sin miedo, que para eso estoy. Aunque sea la duda más básica.',
      'Hola. **Jesús**, de Aurex.\n\n¿Vienes a informarte, o ya andas operando?',
      'Buenas, soy **Jesús**.\n\nTe puedo explicar los bots, el marketplace o lo que se te ocurra.',
      'Hola. Soy **Jesús**, de Aurex.\n\nCuéntame qué te trae por aquí.'
    ],

    /* ── CUANDO EL USUARIO DICE "SÍ" Y NO HAY MÁS QUE CONTAR ──────
       Antes se quedaba en blanco y la conversación moría. Ahora se le
       cuenta algo que de verdad le sirve, y se le dan opciones. */
    sugerencias: [
      {
        texto: 'Mira, algo que mucha gente no sabe:\n\nEl **Accumulator** puede ganar dinero incluso cuando el precio no para de caer. Suena raro, pero tiene sentido: **cuanto más baja, más compra**, y cada compra abarata tu precio medio. Así no necesitas que el mercado vuelva a lo más alto para recuperar; basta con que suba un poco desde tu promedio.\n\n¿Te lo explico con números, o prefieres ver otro bot?',
        opciones: [
          { label: 'Con números', q: 'explicame el acumulador con numeros' },
          { label: 'Ver los otros bots',      q: 'que bots hay' },
          { label: 'Cómo empiezo',            q: 'como empiezo' }
        ]
      },
      {
        texto: 'Te cuento lo que más le sorprende a la gente:\n\nEl **Smart Grid** no necesita que el precio suba para ganar. Le basta con que **se mueva**. Compra cuando baja un escalón y vende cuando sube al siguiente, una y otra vez. Un día lateral, de esos que parecen aburridos, es su mejor día.\n\n¿Quieres que te enseñe cómo se configura?',
        opciones: [
          { label: 'Sí, enséñame',      q: 'como funciona el smart grid' },
          { label: 'Algo más simple', q: 'que es el cash out' },
          { label: 'Cuánto necesito',   q: 'cuanto dinero necesito' }
        ]
      },
      {
        texto: 'Una cosa que conviene saber desde el principio:\n\nAquí **no depositas tu dinero en ningún sitio**. Se queda en tu wallet. El bot solo tiene permiso para mover una cantidad que tú fijas, y ese permiso lo quitas cuando quieras.\n\nEso significa que aunque nosotros desapareciéramos mañana, tu dinero seguiría siendo tuyo.\n\n¿Te enseño cómo se ven esos permisos?',
        opciones: [
          { label: 'Sí, enséñame',   q: 'permisos de gasto' },
          { label: 'Cómo empiezo',   q: 'como empiezo' },
          { label: 'Qué bots hay',   q: 'que bots hay' }
        ]
      },
      {
        texto: 'Va un consejo que ahorra disgustos:\n\n**Empieza con poco.** Con 50 USDT ya ves cómo se comporta un bot, y con eso decides si meter más. La prisa en esto sale cara.\n\n¿Te ayudo a montar el primero?',
        opciones: [
          { label: 'Sí, guíame',        q: 'guiame a montar mi bot' },
          { label: 'Cuéntame más', q: 'que es aurex' },
          { label: '¿Es seguro?',        q: 'es seguro mi dinero' }
        ]
      }
    ],

    /* Cuando dice que no quiere saber más: cerrar sin insistir. */
    cierre: [
      'Perfecto. Aquí sigo por si te surge algo.',
      'De acuerdo. Cuando quieras, pregúntame.',
      'Sin problema. Estoy por aquí.',
      'Vale. Si más adelante te surge una duda, escríbeme.'
    ],

    /* Atajos del menú: las preguntas que más se hacen, a un toque. */
    quick: [
      { label: '¿Qué es Aurex?',        q: 'que es aurex' },
      { label: '¿Cómo empiezo?',        q: 'como empiezo' },
      { label: '¿Qué bots hay?',        q: 'que bots hay' },
      { label: '¿Es seguro?',           q: 'es seguro mi dinero' },
      { label: '¿Cuánto cobran?',       q: 'comisiones' },
      { label: 'Hablar con alguien', q: 'contacto' }
    ],

    /* ── FRASES DEL MOTOR ────────────────────────────────────────
       El motor las usa en situaciones concretas: cuando no entiende,
       cuando la conversación se atasca, cuando alguien pregunta algo
       que no es de aquí. Los perfiles (nuevo / experto / problema) son
       los que definimos en el motor. */

    /* Une varias respuestas cuando preguntan dos cosas a la vez. */
    connectors: {
      first: ['', 'Vamos por partes. ', 'Te contesto a las dos. '],
      next:  ['Y sobre lo otro: ', 'En cuanto a lo segundo: ', 'Respecto a lo demás: ']
    },

    /* Cuando no se entiende lo que escribieron. */
    clarify: [
      'No te he cogido bien. ¿Puedes decírmelo con otras palabras?',
      'No estoy seguro de qué me pides. Cuéntame un poco más.',
      'Se me escapa lo que quieres decir. ¿Me lo explicas de otra forma?'
    ],

    /* Cuando falla dos veces seguidas: mejor una persona. */
    retry: [
      'Sigo sin pillarlo y no quiero hacerte perder el tiempo.\n\nUna persona te entenderá a la primera:',
      'Van dos veces que no acierto. Mejor te paso con alguien:'
    ],

    /* Cuando la conversación da vueltas. */
    escalate: [
      'Antes de seguir en círculos, escríbeme directamente. Te respondo yo mismo:',
      'Esto se resuelve mejor hablando. Aquí me tienes:'
    ],

    /* Cuando preguntan algo que no tiene nada que ver. */
    redirect: {
      any:      ['Eso se sale de lo mío: yo estoy aquí para Aurex.\n\n¿Te ayudo con algo de la plataforma?'],
      nuevo:    ['De eso no sé, lo siento. Lo mío son los bots y la plataforma.\n\n¿Quieres que te cuente cómo funciona?'],
      experto:  ['Ahí no te puedo ayudar. Pregúntame de la plataforma y te respondo mejor.'],
      problema: ['Eso no lo llevo yo. Si tienes algún problema con Aurex, cuéntamelo y lo miramos.']
    },
    stillOffScope: [
      'Sigue sin ser lo mío, y por muchas vueltas que le demos no va a cambiar.\n\nSi es algo de Aurex, aquí estoy. Si no, mejor te lo resuelven en otro sitio.'
    ],

    /* Preguntas para saber por dónde ayudar. */
    triage: {
      any:      ['Para no adivinar: ¿es sobre **los bots**, sobre **el marketplace**, o sobre **algo que no te funciona**?'],
      nuevo:    ['¿Te cuento primero **qué es Aurex**, o prefieres ir directo a **cómo empezar**?'],
      experto:  ['¿De qué bot me hablas, y qué configuración tienes puesta?'],
      problema: ['Cuéntame qué está pasando exactamente y desde cuándo.']
    },

    /* Empujoncitos para seguir la conversación. Suaves, nunca vendedores. */
    /* Los empujoncitos NO son para vender. Son para no dejar al usuario
       mirando la pantalla sin saber qué escribir. Preguntan si le queda
       alguna duda, no le ofrecen productos. Quien llega aquí suele venir
       con un problema, y lo último que necesita es que le vendan algo. */
    nudges: {
      any:      ['¿Te aclaro algo más?', '¿Alguna otra duda?', '¿Necesitas algo más?'],
      nuevo:    ['¿Te queda alguna duda?', '¿Quieres que te lo explique de otra forma?'],
      experto:  ['¿Necesitas el detalle de algo?'],
      problema: ['¿Sigue el problema, o se resolvió?', '¿Te ayudo con algo más de eso?']
    },

    /* Recapitula lo que entendió (del flujo de datos, que aquí no usamos). */
    reflect: {
      full:      ['Dime qué más necesitas.'],
      workCity:  ['Dime qué más necesitas.'],
      workWhen:  ['Dime qué más necesitas.'],
      workOnly:  ['Cuéntame un poco más y te ayudo mejor.']
    },

    /* Si dicen que es urgente. */
    urgent: [
      'Si es urgente, no pierdas tiempo conmigo: escríbeme directo y te respondo yo:',
      'Para algo urgente, mejor por mensaje directo. Aquí me tienes:'
    ],

    /* Cierre después de pasar el contacto. */
    afterSend: [
      'Listo. ¿Algo más en lo que te ayude?',
      'Hecho. Aquí sigo si necesitas otra cosa.'
    ],

    /* ── RESPUESTAS POR INTENCIÓN ────────────────────────────────
       Cuando alguien pregunta algo que no encaja en ningún tema pero SÍ
       se entiende qué quiere (un precio, una prueba, ayuda con un
       problema), se responde por aquí en vez de soltar el "no lo sé". */
    intentAnswers: {
      capability: {
        answer: [
          'Depende de lo que quieras hacer exactamente. Cuéntame y te digo si se puede.',
          'Puede que sí. Dime qué necesitas en concreto y te lo confirmo sin rodeos.'
        ]
      },
      need: {
        answer: [
          'Entendido. **¿Qué quieres hacer exactamente?** Con eso te digo por dónde empezar.',
          'Para eso estoy. **Cuéntame qué necesitas** y te guío.'
        ]
      },
      price: {
        answer: [
          'Hay una suscripción mensual en BNB y una comisión pequeña en el swap. El importe exacto lo ves en tu perfil.\n\nEl gas de cada operación sale de tu saldo, no de tu inversión.',
          'El coste está en tu perfil, sección **Suscripción y gas**: ahí ves la cuota y lo que cuesta cada operación.\n\nNo cobramos porcentaje de tus ganancias.'
        ]
      },
      time: {
        answer: [
          'Depende del mercado. Un bot solo actúa cuando el precio llega a uno de tus niveles: puede ser en horas o en días.',
          'No hay un tiempo fijo. El bot espera a que el precio toque tus cuadrículas. En la gráfica ves cuánto falta para la más cercana.'
        ]
      },
      place: {
        answer: [
          'Aurex funciona desde cualquier país, sin registro ni papeles. Solo necesitas una wallet.',
          'Da igual dónde estés: es una web, y todo pasa en la blockchain. No pedimos documentación a nadie.'
        ]
      },
      person: {
        answer: [
          'Claro, te paso el contacto directo.',
          'Sin problema. Aquí tienes cómo hablar con una persona.'
        ],
        contactCard: true
      },
      proof: {
        answer: [
          'Todo es comprobable: los contratos son públicos y puedes ver cada operación en BscScan.\n\nNo te pedimos que confíes, te pedimos que lo verifiques.',
          'Puedes revisarlo tú mismo en la blockchain. Cada movimiento queda registrado y es público.'
        ]
      },
      problem: {
        answer: [
          'Cuéntame qué pasa exactamente y lo miramos.',
          'Vamos a verlo. ¿Qué te está ocurriendo?'
        ]
      },
      unsure: {
        answer: [
          'Sin prisa. ¿Quieres que te explique lo básico primero?',
          'Tranquilo, para eso estoy. Empezamos por donde quieras.'
        ]
      },
      explain: {
        answer: [
          'Dime qué parte quieres que te explique y lo vemos con calma.',
          'Claro. ¿De qué quieres que te hable: los bots, las comisiones, cómo empezar?'
        ]
      },
      experience: {
        answer: [
          'Aurex lleva funcionando con usuarios reales, y todo lo que hace queda registrado en la blockchain.\n\nLo que te puedo garantizar es que tu dinero es tuyo; lo que no te puedo garantizar son ganancias.',
          'La plataforma está en marcha y los contratos son públicos.\n\nY te lo digo claro: ningún bot garantiza ganar. Lo que sí garantizamos es que nadie toca tus fondos.'
        ]
      },
      intro: {
        answer: [
          'Soy Jesús, el asistente de Aurex. Estoy aquí para lo que necesites de la plataforma.',
          'Jesús, asistente de Aurex. Pregúntame lo que quieras sobre los bots o la web.'
        ]
      },
      compare: {
        answer: [
          'La diferencia con un exchange normal es que **aquí no depositas nada**. Tu dinero sigue en tu wallet.\n\n¿Con qué lo estás comparando? Te digo las diferencias concretas.',
          'Frente a otras plataformas: sin registro, sin KYC y sin custodia. Tú mandas sobre tu dinero todo el tiempo.'
        ]
      }
    },

    /* Contacto real del proyecto. Sin números de teléfono a la vista. */
    contact: {
      telegram:   'https://t.me/JesusDevTrader',
      telegramTx: '@JesusDevTrader',
      /* ⚠️ WHATSAPP DESACTIVADO HASTA TENER EL NÚMERO.
         wa.me SOLO admite números de teléfono, nunca nombres de usuario.
         Por eso el botón no funcionaba: la dirección era imposible.

         PARA ACTIVARLO: pon aquí el número con prefijo de país y sin signos
         ni espacios. Ejemplo para España: 'https://wa.me/34612345678'
         Para Cuba: 'https://wa.me/5351234567'
         Mientras esté vacío, el botón sencillamente no aparece. */
      whatsapp:   'https://wa.me/5358648458',
      grupo:      'https://t.me/CriptoCubaOficial',
      grupoTx:    'CriptoCuba Oficial'
    }
  },

  /* Los "flujos" del bot original recogían datos del cliente para pasarlos
     a un comercial. Aquí no hacen falta: no pedimos datos a nadie, y para
     hablar con una persona está el botón de Telegram. Van vacíos para que
     el motor los encuentre y no falle. */
  flows: {},
  flowTalk: {
    cancel:  ['Dejamos eso entonces. ¿Algo más en lo que te ayude?'],
    thanks:  ['Listo. ¿Necesitas algo más?'],
    invalid: ['No me cuadra eso. ¿Puedes escribirlo de otra forma?']
  },

  /* ══════════════════════════════════════════════════════════
     GUÍAS PASO A PASO
     Un paso por mensaje. El usuario escribe "listo" y sigue. Nada de
     párrafos de treinta líneas que nadie lee.
     ══════════════════════════════════════════════════════════ */
  guias: {

    grid: {
      titulo: 'Smart Grid',
      accion: 'grid',
      intro: 'Vamos a montar tu Smart Grid. Te lo voy contando de uno en uno, sin prisa.',
      pasos: [
        'Arriba a la derecha, pulsa **Conectar wallet** y acepta en tu wallet.\n\nSi ya la tienes conectada, verás tu dirección ahí arriba.',
        'En la fila de bots, elige **Smart Grid** (el primero, el azul).',
        'Debajo elige las dos monedas: arriba la que vas a operar (por ejemplo **BNB**) y debajo con la que pagas (**USDT**).',
        'En **Inversión total**, escribe cuánto vas a poner. Con **100 USDT** vas bien para empezar.',
        'Pulsa el botón azul **Configuraciones rentables** y elige **Equilibrado**.\n\nEsa configuración ya viene calculada: rango de ±28% y 20 cuadrículas, para que cada vuelta deje beneficio después de comisiones.',
        'Mira la tarjeta de la derecha: te dice cuánto deja cada vuelta y cuántas operaciones hará al día. Si te cuadra, seguimos.',
        'Abajo del todo, en la tarjeta de **Gas**, pulsa **Recargar** y pon **0.01 BNB**.\n\nEse es el combustible: sin él, el bot no puede comprar ni vender.',
        'Pulsa **Encender el bot** y firma en tu wallet.\n\nSerán dos firmas: una para dar permiso sobre tu moneda y otra para crear el bot.'
      ],
      fin: 'Listo, tu Smart Grid ya está trabajando.\n\nLo verás abajo en **Mis bots**. Ahí puedes ver sus cuadrículas en la gráfica y cuánto le falta a cada una para dispararse.\n\nUn consejo: déjalo un par de días antes de tocar nada. Estos bots trabajan con el tiempo.',
      despues: [
        { label: '¿Cuándo opera?', q: 'cuando empieza a operar el bot' },
        { label: 'Montar otro bot',      q: 'que bots hay' },
        { label: 'Si el precio baja', q: 'que pasa si el precio baja' }
      ]
    },

    acum: {
      titulo: 'Accumulator',
      accion: 'acum',
      intro: 'Montamos tu Accumulator. Paso a paso, tranquilo.',
      pasos: [
        'Conecta tu wallet arriba a la derecha, si no lo has hecho ya.',
        'En la fila de bots, elige **Accumulator** (el morado, el segundo).',
        'Elige la moneda que quieres acumular (por ejemplo **BNB**) y con cuál pagas (**USDT**).',
        'En **Inversión total** pon cuánto vas a destinar. Con **100 USDT** ya funciona bien.',
        'Pulsa **Configuraciones rentables** y elige **Equilibrado**: vende cuando toda tu posición esté un **+10%** arriba.\n\nEse objetivo se alcanza a menudo, sin esperar meses.',
        'Fíjate en el **precio mínimo** que te ha puesto: es hasta dónde seguirá comprando si el mercado cae. Cuanto más abajo, más margen tiene.',
        'Carga gas: abajo, en la tarjeta de **Gas**, pulsa **Recargar** y pon **0.01 BNB**.',
        'Pulsa **Encender el bot** y firma las dos transacciones en tu wallet.'
      ],
      fin: 'Ya está. Tu Accumulator empieza comprando su primera parte y seguirá comprando cada vez que el precio baje.\n\nCuando todo lo comprado valga un 10% más de lo que te costó, venderá de golpe y verás el resultado.',
      despues: [
        { label: 'El precio medio', q: 'precio medio del acumulador' },
        { label: '¿Y si sigue bajando?',       q: 'que pasa si el precio baja' },
        { label: 'Montar otro bot',            q: 'que bots hay' }
      ]
    },

    cash: {
      titulo: 'Cash Out',
      accion: 'cash',
      intro: 'El Cash Out es el más sencillo de todos. Cuatro pasos y ya.',
      pasos: [
        'Conecta tu wallet arriba a la derecha.',
        'Elige **Cash Out** en la fila de bots (el dorado).',
        'Elige qué moneda vas a vender y a cambio de cuál (por ejemplo vender **BNB** y recibir **USDT**).',
        'Pon la **cantidad** que quieres vender, y elige el objetivo con **Configuraciones rentables**.\n\nCon **+7%** el precio suele llegar en unos días. Con **+3%**, más rápido.',
        'Mira el resumen de la derecha: te dice a qué precio venderá, cuánto recibirás y la comisión.',
        'Carga un poco de gas si no lo tienes: **0.005 BNB** sobra para esta operación.',
        'Pulsa **Encender el bot** y firma en tu wallet.'
      ],
      fin: 'Hecho. Ahora el bot vigila el precio día y noche.\n\nCuando llegue a tu objetivo, vende y el dinero aparece en tu wallet. Si no llega, tu moneda sigue siendo tuya: no pierdes nada por intentarlo.',
      despues: [
        { label: '¿Y si no llega?', q: 'y si el precio no llega al objetivo' },
        { label: 'Montar otro bot',           q: 'que bots hay' }
      ]
    },

    dca: {
      titulo: 'DCA',
      accion: 'dca',
      intro: 'Montamos tu DCA, que es el bot de comprar poco a poco. Va rápido.',
      pasos: [
        'Conecta tu wallet arriba a la derecha.',
        'Elige **DCA** en la fila de bots (el verde, el último).',
        'Elige qué moneda quieres ir comprando y con cuál pagas.',
        'Pon **cuánto vas a comprar cada vez**. Que sean **10 USDT o más**: con menos, el gas se come la ventaja.',
        'Pulsa **Configuraciones rentables** y elige **Semanal**.\n\nSemanal rinde más que diario, porque cada compra paga gas de la red.',
        'Carga gas: **0.01 BNB** te cubre muchas compras.',
        'Pulsa **Encender el bot** y firma.'
      ],
      fin: 'Listo. A partir de ahora comprará solo, cada semana, sin que tengas que acordarte.\n\nRecuerda: este bot **solo compra**. Cuando quieras vender, lo haces tú desde el Swap o con un Cash Out.',
      despues: [
        { label: '¿Cuándo vendo?',   q: 'cuando vendo lo del dca' },
        { label: 'Montar otro bot',  q: 'que bots hay' }
      ]
    },

    prize: {
      titulo: 'Prize Pool',
      accion: 'prize',
      intro: 'Te explico cómo entrar al sorteo. Son tres pasos.',
      pasos: [
        'En el menú de arriba, pulsa **Prize Pool**.',
        'Verás el pozo actual, cuánta gente participa y cuándo cierra la ronda.\n\nAbajo está el importe de la participación.',
        'Pulsa **Participar**, pon tu nombre y tu Telegram (para avisarte si ganas) y firma en tu wallet.'
      ],
      fin: 'Ya estás dentro. Cuando cierre la ronda se sortea con un número aleatorio verificable en la blockchain, y si ganas te aparece un botón para cobrar tu premio.\n\nSi cambias de idea, puedes salirte y recuperar tu aporte hasta 24 horas antes del cierre.',
      despues: [
        { label: '¿Cómo se sortea?', q: 'como se hace el sorteo' },
        { label: 'Ver los bots', q: 'que bots hay' }
      ]
    },

    swap: {
      titulo: 'Swap',
      accion: 'swap',
      intro: 'Cambiar una moneda por otra. Es rápido.',
      pasos: [
        'En el menú de arriba, pulsa **Swap**.',
        'Arriba eliges la moneda que das y cuánta. Abajo, la que quieres recibir.',
        'Mira lo que te va a llegar y la comisión. Si te cuadra, pulsa **Intercambiar** y firma.'
      ],
      fin: 'Listo. La moneda nueva llega directamente a tu wallet.\n\nSi era la primera vez con esa moneda, habrás firmado dos veces: una para el permiso y otra para el cambio.',
      despues: [
        { label: 'Montar un bot',  q: 'que bots hay' },
        { label: '¿Qué comisión?', q: 'comisiones del swap' }
      ]
    },

    market: {
      titulo: 'Marketplace',
      accion: 'market',
      intro: 'Te guío para comprar cripto a otra persona. Con calma, que aquí conviene entenderlo bien.',
      pasos: [
        'En el menú de arriba, pulsa **Market**.',
        'Entra en la pestaña **Comprar** y mira las ofertas: cada una dice cuánto vende, a qué precio y cómo acepta el pago.',
        'Elige una que te encaje y pulsa sobre ella. La cripto del vendedor **queda bloqueada en el contrato**: no puede llevársela.',
        'Paga al vendedor por donde hayáis acordado (transferencia, efectivo, lo que sea) y **guarda el comprobante**.',
        'Vuelve y pulsa **Ya pagué**. El vendedor lo verá y liberará la cripto.',
        'Si el vendedor no libera, pulsa **Abrir disputa** y explica lo que pasó. Un árbitro lo revisa y decide.'
      ],
      fin: 'Y eso es todo. La clave de este sistema: la cripto nunca está en manos del vendedor mientras tú pagas.\n\nY el vendedor deja una fianza, así que si te estafa, sale de ahí tu compensación.',
      despues: [
        { label: '¿Y si me estafan?', q: 'y si el vendedor no me manda el dinero' },
        { label: 'Quiero vender',     q: 'como vendo en el marketplace' }
      ]
    },

    permisos: {
      titulo: 'Quitar permisos a los bots',
      accion: 'perfil',
      intro: 'Vamos a quitarle el permiso a los bots sobre tus monedas. Son cuatro pasos y es la mejor costumbre de seguridad que puedes tener.',
      pasos: [
        'Arriba a la derecha, entra en tu **perfil** (el icono de la persona).',
        'Baja hasta la sección **Permisos de gasto**.\n\nAhí ves cada moneda con permiso activo y hasta cuánto puede mover el contrato.',
        'Al lado de la que quieras cortar, pulsa **quitar**.',
        'Firma en tu wallet. Listo: ese contrato ya no puede tocar esa moneda.'
      ],
      fin: 'Hecho. A partir de ahora, esa moneda **solo se mueve si tú firmas**.\n\nSi vuelves a encender un bot con ella, te pedirá el permiso otra vez. No pierdes nada por quitarlo.',
      despues: [
        { label: '¿Por qué importa?', q: 'por que quitar permisos' },
        { label: 'Ver mi perfil',     q: 'que hay en el perfil' }
      ]
    },

    vender: {
      titulo: 'Vender en el Marketplace',
      accion: 'market',
      intro: 'Vamos a poner tu oferta de venta. Con calma, que aquí se maneja dinero de otra persona.',
      pasos: [
        'Menú de arriba → **Market**.',
        'Pestaña **Vender** → botón **Publicar oferta**.',
        'Elige la moneda y cuánto vendes.\n\nSi es tu primera vez, tendrás que **depositar la fianza**: es tu garantía y la recuperas cuando dejes de vender.',
        'Pon tu precio y cómo aceptas el pago: transferencia, efectivo, lo que uses.',
        'Elige en cuántas **partes** entregas.\n\nEn varias partes es más seguro para los dos: se paga y libera poco a poco.',
        'Publica y firma. Tu cripto **queda bloqueada en el contrato**, no en tus manos ni en las nuestras.',
        'Cuando alguien tome tu oferta, te llega aviso. Comprueba que recibiste el pago **en tu banco o en tu mano**, y solo entonces pulsa **Liberar**.'
      ],
      fin: 'Ya está. Un consejo que vale oro: **nunca liberes sin haber visto el dinero en tu cuenta.** Una captura no es un pago.\n\nSi el comprador dice que pagó y no lo ves, abre disputa y explica lo que pasó.',
      despues: [
        { label: '¿Y si me estafan?', q: 'y si el comprador no paga' },
        { label: 'Quiero comprar',    q: 'como compro en el marketplace' }
      ]
    },

    comprar: {
      titulo: 'Comprar en el Marketplace',
      accion: 'market',
      intro: 'Te guío para comprar cripto a otra persona con seguridad.',
      pasos: [
        'Menú de arriba → **Market**.',
        'Pestaña **Comprar**. Cada oferta dice cuánto vende, a qué precio y cómo acepta el pago.',
        'Mira la **valoración del vendedor** y cuántas operaciones lleva. Es información pública y dice mucho.',
        'Pulsa la oferta que te encaje.\n\nLa cripto **queda bloqueada al momento**: el vendedor ya no puede llevársela.',
        'Paga por donde acordasteis y **guarda el comprobante**.',
        'Vuelve y pulsa **Ya pagué**. El vendedor lo ve y libera tu cripto.'
      ],
      fin: 'Eso es todo. La clave: **la cripto nunca está en manos del vendedor mientras tú pagas**.\n\nSi no libera, pulsa **Abrir disputa** con tu comprobante. Un árbitro decide, y el vendedor tiene una fianza depositada para responder.',
      despues: [
        { label: '¿Y si no libera?', q: 'y si el vendedor no libera' },
        { label: 'Quiero vender',    q: 'como vendo en el marketplace' }
      ]
    },

    perfilGuia: {
      titulo: 'Tu perfil',
      accion: 'perfil',
      intro: 'Te enseño qué hay en tu perfil, que es donde controlas todo.',
      pasos: [
        'Arriba a la derecha, el icono de la persona.',
        '**Tus números**: cuánto llevas ganado, cuántas operaciones han hecho tus bots y cuánto te cuesta cada una.',
        '**Gas**: tu saldo para que los bots operen. Aquí lo recargas o lo retiras: es tuyo.',
        '**Suscripción**: hasta cuándo tienes activo el servicio.',
        '**Permisos de gasto**: lo más importante. Qué contratos pueden mover tus monedas, y el botón para quitárselo.'
      ],
      fin: 'Ese último apartado es el que más gente ignora y el que más protege.\n\nCostumbre sana: **cuando dejes de usar un bot, quítale el permiso.** Treinta segundos que te ahorran disgustos.',
      despues: [
        { label: 'Quitar permisos', q: 'como quito los permisos' },
        { label: 'Recargar gas',    q: 'como recargo el gas' }
      ]
    },

    wallet: {
      titulo: 'Conectar tu wallet',
      accion: 'conectar',
      intro: 'Vamos a conectar tu wallet. Depende de si estás en el ordenador o en el móvil.',
      pasos: [
        '**Si estás en el ordenador:** pulsa **Conectar wallet** arriba a la derecha y acepta en la ventana de MetaMask.',
        '**Si estás en el móvil:** al pulsar **Conectar wallet** sale una ventana con **Abrir en MetaMask**, Trust o SafePal. Toca la tuya.\n\nSe abrirá Aurex dentro de tu wallet y conectará sola.',
        'Comprueba que arriba a la derecha aparece tu dirección (algo como 0x97e0…CA7d). Si la ves, ya estás dentro.'
      ],
      fin: 'Perfecto, wallet conectada.\n\nAhora ya puedes cargar gas y montar tu primer bot.',
      despues: [
        { label: 'Montar mi primer bot', q: 'guiame a montar el smart grid' },
        { label: '¿Qué es el gas?',      q: 'que es el gas' }
      ]
    }
  },

  kb: [
    {
      topic: 'qué hay en el perfil',
      guia: 'perfilGuia', guiaLabel: 'Enséñamelo',
      accion: 'perfil',
      keys: ['que hay en el perfil', 'perfil', 'mi perfil', 'para que sirve el perfil',
             'que veo en el perfil', 'donde esta mi perfil', 'como veo mis datos',
             'mis estadisticas', 'cuanto llevo ganado', 'mis numeros', 'donde veo mis ganancias'],
      answer: [
        'En tu perfil tienes cuatro cosas: **tus números** (cuánto llevas ganado y cuántas operaciones), **el gas** para que los bots operen, **tu suscripción**, y los **permisos de gasto**.\n\nEse último es el más importante y el que menos gente mira.',
        'Es tu centro de control: estadísticas reales, saldo de gas, suscripción y los permisos que tienen los contratos sobre tus monedas.\n\nEstá arriba a la derecha, en el icono de la persona.'
      ]
    },
    {
      topic: 'guía para vender',
      guia: 'vender', guiaLabel: 'Empezar',
      keys: ['guiame para vender', 'guia para vender', 'ensename a vender',
             'como publico una oferta de venta', 'quiero publicar una oferta'],
      answer: [
        'Vamos allá. Te llevo paso a paso para publicar tu oferta de venta.',
        'Perfecto. Te guío para vender, con calma.'
      ]
    },
    {
      topic: 'guía para comprar',
      guia: 'comprar', guiaLabel: 'Empezar',
      keys: ['guiame para comprar', 'guia para comprar', 'ensename a comprar',
             'quiero comprar cripto a alguien'],
      answer: [
        'Vamos allá. Te llevo paso a paso para comprarle a otra persona con seguridad.',
        'Perfecto. Te guío para comprar.'
      ]
    },
    {
      topic: 'vender en el marketplace',
      guia: 'vender', guiaLabel: 'Guíame para vender',
      accion: 'market',
      keys: ['como vendo en el marketplace', 'como vendo en el market',
             'vender en el marketplace', 'quiero vender en el marketplace',
             'como publico una oferta de venta', 'como vendo mis criptos',
             'como vendo', 'quiero vender', 'vendo cripto',
             'publicar oferta', 'poner en venta', 'vender mis criptos', 'ser vendedor',
             'como pongo una orden de venta', 'orden de venta'],
      answer: [
        'Para vender publicas tu oferta, depositas una **fianza** y tu cripto queda bloqueada en el contrato hasta que confirmes el pago.\n\nLa fianza es tu garantía ante el comprador, y la recuperas cuando dejes de vender.',
        'Publicas cuánto vendes, a qué precio y cómo aceptas el pago. La cripto se retiene sola.\n\nCuando el comprador pague y **lo veas en tu cuenta**, pulsas Liberar. Ni antes.'
      ]
    },
    {
      topic: 'comprar en el marketplace',
      guia: 'comprar', guiaLabel: 'Guíame para comprar',
      accion: 'market',
      keys: ['como compro', 'quiero comprar', 'comprar en el marketplace', 'comprar cripto a alguien',
             'como pongo una orden de compra', 'orden de compra', 'tomar una oferta'],
      answer: [
        'Eliges una oferta y **la cripto se bloquea al momento**: el vendedor ya no puede llevársela.\n\nPagas por donde acordéis, pulsas «Ya pagué» y el vendedor libera. Si no lo hace, abres disputa.',
        'Miras las ofertas, te fijas en la valoración del vendedor, y tomas la que te encaje.\n\nEl contrato hace de intermediario: nadie puede irse con el dinero del otro.'
      ]
    },
    {
      topic: 'no puedo entrar al grupo de la academia',
      keys: ['pague y no puedo entrar al grupo', 'pague la academia y no entro',
             'no puedo entrar al grupo de la academia', 'compre la academia y no entro',
             'no me deja entrar al grupo', 'como entro al grupo de la academia',
             'donde esta el contenido de la academia', 'ya pague la academia'],
      answer: [
        'Vamos a resolverlo ahora mismo. Casi siempre es una de estas:\n\n**1.** Tu cuenta **no tiene nombre de usuario** → Telegram → Ajustes → Nombre de usuario.\n**2.** Pusiste **otro usuario** al pagar.\n**3.** Tienes **restringido** que te añadan a grupos → Ajustes → Privacidad → Grupos y canales → **Todos**.\n\nSi ninguna es, escríbeme y te meto a mano.',
        'No te preocupes, esto se arregla siempre y has pagado, así que es cosa mía.\n\nPrimero: comprueba que tu cuenta tiene **nombre de usuario** y que es el mismo que escribiste al pagar. Es el 90% de los casos.\n\nSi está bien, escríbeme directo:'
      ],
      more: [
        'Paso a paso:\n\n**1.** Telegram → Ajustes → **Nombre de usuario**. Si está vacío, ponlo.\n**2.** Ajustes → Privacidad y seguridad → **Grupos y canales** → **Todos**.\n**3.** Escríbele **/estado** a nuestro bot: te dirá si te consta el acceso y hasta cuándo.\n**4.** Vuelve a pedir entrar al grupo.\n\nSi el bot dice que no te consta pero tú pagaste, mándame **el usuario que pusiste** y la captura del pago. Lo arreglo en minutos.'
      ],
      contactCard: true
    },

    /* ══════════════ CORTESÍA ══════════════ */
    {
      topic: 'saludo',
      noNudge: true,
      /* Las erratas del saludo son las más frecuentes y las más cortas,
         demasiado para que el corrector automático las cace. Se listan. */
      keys: ['hola', 'holaa', 'holaaa', 'hol', 'hla', 'ola', 'olaa', 'oa',
             'buenas', 'buenass', 'wenas', 'buenos dias', 'buenas tardes',
             'buenas noches', 'que tal', 'ke tal', 'q tal', 'qtal', 'saludos',
             'hey', 'hello', 'hi', 'oye', 'oiga', 'alo', 'hola como estas',
             'hol como ests', 'como estas', 'como esta', 'komo estas', 'como andas',
             'que onda', 'que hubo', 'saludo', 'holi'],
      answer: [
        'Hola. ¿En qué te ayudo?',
        '¡Hola! Dime qué necesitas.',
        'Buenas. Pregúntame lo que quieras sobre Aurex.',
        'Hola, ¿qué tal? ¿Qué te gustaría saber?'
      ]
    },
    {
      topic: 'gracias',
      noNudge: true,
      keys: ['gracias', 'muchas gracias', 'te lo agradezco', 'genial', 'perfecto', 'ok gracias'],
      answer: [
        'A ti. Aquí sigo si te surge otra cosa.',
        'Un placer. Pregunta lo que quieras cuando quieras.',
        'De nada. Cualquier otra duda, dímelo.'
      ]
    },
    {
      topic: 'despedida',
      noNudge: true,
      keys: ['adios', 'chao', 'hasta luego', 'nos vemos', 'bye', 'me voy'],
      answer: [
        'Hasta luego. Que te vaya bien.',
        'Nos vemos. Aquí estaré cuando vuelvas.',
        'Cuídate. Cualquier cosa, aquí me tienes.'
      ]
    },

    /* ══════════════ LA PREGUNTA MÁS IMPORTANTE ══════════════
       Va primero a propósito: mucha gente llega desconfiando, y con razón.
       Merece una respuesta directa, no un rodeo. */
    {
      topic: 'esto es una estafa',
      keys: ['estafa', 'es estafa', 'esto es una estafa', 'sera estafa', 'es fraude',
             'fraude', 'scam', 'me van a robar', 'timo', 'es un timo', 'engano',
             'no me fio', 'no me fio de esto', 'desconfio', 'esto es real',
             'es real', 'es de verdad', 'es legitimo', 'puedo confiar'],
      answer: [
        'Es la pregunta correcta, y me alegra que la hagas.\n\n**La respuesta corta: no puedo pedirte que confíes, y no lo voy a hacer.** Lo que sí puedo decirte es que aquí **no depositas tu dinero en ningún sitio**. Sigue en tu wallet. Si esto fuera una estafa, no habría nada que robarte.',
        'Haces bien en preguntar. En cripto hay muchísimo fraude.\n\nLo que nos diferencia: **nunca tocamos tu dinero**. No hay depósito, no hay saldo nuestro, no hay que confiar en que te devolvamos nada. Tu wallet es tuya todo el tiempo.',
        'Pregunta legítima. Te respondo sin marketing:\n\nNo custodiamos fondos. El contrato solo tiene permiso para mover la cantidad exacta que tú autorices, y **ese permiso lo quitas en un clic** desde tu perfil.\n\nAdemás, todo el código está publicado: cualquiera puede revisarlo.'
      ],
      more: [
        'Cómo comprobarlo tú mismo, sin fiarte de mí:\n\n**1.** Los contratos están en BscScan. Puedes leer el código y ver cada operación.\n**2.** En tu perfil ves los permisos activos y los quitas cuando quieras.\n**3.** Empieza con 50 USDT. Si algo no te cuadra, cancelas y recuperas.\n\nY una regla que vale para toda la cripto: **nadie legítimo te pedirá jamás tu frase de recuperación.** Nosotros tampoco.'
      ]
    },

    /* ══════════════ QUÉ ES AUREX ══════════════ */
    {
      topic: 'qué es Aurex',
      keys: [
        'que es aurex', 'qué es aurex', 'que es esto', 'que es esta pagina',
        'que es aurex finance',
        'que es este sitio', 'que es la plataforma', 'de que va', 'de que va esto',
        'de que se trata', 'que hacen', 'que hacen aqui', 'que ofrecen',
        'para que sirve', 'para que sirve esto', 'que puedo hacer aqui',
        'explicame la plataforma', 'explicame esto', 'como funciona la pagina',
        'como funciona aurex', 'como funciona esto', 'que tipo de plataforma es',
        'que es aurex finance', 'aurex', 'hablame de aurex', 'cuentame de aurex',
        'informacion', 'informame', 'quiero saber mas', 'de que trata',
        'que servicios tienen', 'que servicios ofrecen', 'que hay aqui',
        'esto que es', 'y esto', 'nunca habia visto esto', 'primera vez aqui'
      ],
      answer: [
        'Aurex es un **ecosistema DeFi no custodial**: un conjunto de herramientas para que tu dinero trabaje en los mercados **sin salir nunca de tu wallet**.\n\nNo es una app de bots: es una plataforma completa con automatización, mercado entre personas, intercambio de monedas, eventos comunitarios y formación.\n\n¿Por dónde quieres que empiece?',
        'Es un **ecosistema descentralizado** montado sobre BNB Smart Chain. Lo que lo distingue: **nunca custodiamos tu dinero**. Ni registro, ni KYC, ni depósitos.\n\nDentro hay automatización de operaciones, un mercado entre personas, swap, sorteos comunitarios y material para aprender.\n\n¿Qué parte te interesa?',
        'Aurex es una plataforma **DeFi no custodial**: automatiza tus operaciones en los mercados financieros mientras tu dinero **sigue siendo tuyo, en tu wallet**.\n\nNo somos un exchange donde depositas. Somos una capa de herramientas sobre la blockchain que tú controlas.\n\n¿Te cuento las partes?'
      ],
      more: [
        'Te lo desgloso. Aurex tiene **cinco patas**:\n\n**1 · Automatización.** Cuatro estrategias distintas, cada una para un momento del mercado:\n· **Smart Grid** — compra abajo y vende arriba, en bucle\n· **Accumulator** — compra más cuanto más baja y vende todo al objetivo\n· **Cash Out** — vende cuando el precio llega a donde marcaste\n· **DCA** — compra una cantidad fija cada cierto tiempo\n\n**2 · Marketplace P2P.** Comprar y vender cripto entre personas de cualquier país, pagando como acordéis. Con fianza, cripto retenida y árbitros.\n\n**3 · Swap.** Intercambio directo entre monedas desde tu wallet.\n\n**4 · Prize Pool.** Sorteos comunitarios con aleatoriedad verificable en cadena. Nadie puede manipularlos, ni nosotros.\n\n**5 · Formación.** Cada herramienta explica su economía real: qué la hace rentable, qué puede salir mal y cuánto cuesta.'
      ],
      opciones: [
        { label: 'Los bots',        q: 'que bots hay' },
        { label: 'El Marketplace',  q: 'que es el marketplace' },
        { label: '¿Es seguro?',     q: 'es seguro mi dinero' },
        { label: 'Cómo empiezo',    q: 'como empiezo' }
      ]
    },
    {
      topic: 'no custodial',
      keys: ['no custodial', 'custodia', 'quien tiene mi dinero', 'donde esta mi dinero',
             'tienen mi dinero', 'me pueden robar', 'se quedan con mi dinero',
             'es seguro', 'seguridad', 'confiar', 'es confiable', 'es estafa', 'scam',
             'esto es una estafa', 'es una estafa', 'sera estafa', 'es fraude',
             'y si desaparecen', 'si desaparecen con mi dinero', 'y si se van con mi dinero',
             'me van a robar', 'puedo confiar', 'es de fiar', 'no me fio',
             'donde veo que es real', 'como se que es real', 'como compruebo'],
      answer: [
        '**Tu dinero nunca sale de tu wallet.** No lo depositas en ningún sitio: sigue siendo tuyo todo el tiempo.\n\nLo que haces es dar permiso al contrato para mover una cantidad concreta, y ese permiso lo puedes quitar cuando quieras desde tu perfil.',
        'No custodiamos nada. Ni yo ni nadie de Aurex puede tocar tus fondos.\n\nEl bot funciona con un permiso limitado que tú das y tú retiras. Está en tu perfil, sección **Permisos de gasto**.',
        'Aquí no hay depósitos. Tu dinero está en tu wallet, y solo se mueve cuando el contrato ejecuta una operación que tú configuraste.\n\nEs la diferencia principal con un exchange centralizado.'
      ],
      more: [
        'Cómo protegerte, en concreto:\n\n**1.** Los permisos son por cantidad exacta, nunca ilimitados.\n**2.** Puedes revocarlos en tu perfil, en un clic.\n**3.** Los contratos son públicos: puedes verlos en BscScan.\n**4.** Nunca te pediremos tu frase de recuperación. **Nadie legítimo lo hace jamás.**'
      ]
    },

    /* ══════════════ LOS BOTS ══════════════ */
    {
      topic: 'los bots',
      opciones: [
        { label: 'Smart Grid',  q: 'como funciona el smart grid' },
        { label: 'Accumulator', q: 'que es el accumulator' },
        { label: 'Cash Out',    q: 'que es el cash out' },
        { label: 'DCA',         q: 'que es el dca' }
      ],
      keys: ['que bots hay', 'tipos de bot', 'cuantos bots', 'que estrategias',
             'cual bot elijo', 'que bot me conviene', 'diferencia entre bots'],
      answer: [
        'Hay cuatro:\n\n**Smart Grid** — compra abajo y vende arriba, una y otra vez.\n**Accumulator** — compra más cuanto más baja, y vende todo al alcanzar tu objetivo.\n**Cash Out** — vende cuando el precio llega a lo que marcaste.\n**DCA** — compra un poco cada cierto tiempo.\n\n¿Cuál te explico?',
        'Cuatro estrategias distintas: **Smart Grid**, **Accumulator**, **Cash Out** y **DCA**.\n\nSi es tu primera vez, el más sencillo de entender es el Cash Out. El más usado, el Smart Grid.',
        'Smart Grid, Accumulator, Cash Out y DCA.\n\nCada uno sirve para un momento distinto del mercado. Dime qué buscas y te digo cuál encaja.'
      ]
    },
    {
      topic: 'Smart Grid',
      guia: 'grid', guiaLabel: 'Guíame paso a paso',
      accion: 'grid',
      keys: ['smart grid', 'grid', 'cuadricula', 'cuadriculas', 'rejilla', 'bot grid',
             'como funciona el grid', 'que es el smart grid'],
      answer: [
        'Imagina una escalera de precios. Tú pones el escalón más bajo y el más alto, y el bot reparte escalones en medio.\n\n**Cuando el precio baja a un escalón, compra. Cuando sube al siguiente, vende.** Y vuelta a empezar.',
        'El Smart Grid parte tu dinero en cuadrículas dentro de un rango. Compra barato, vende un poco más caro, repetidamente.\n\nNo necesita que el precio suba en general: le basta con que se mueva arriba y abajo.',
        'Es el bot clásico de los exchanges. Compra en cada cuadrícula al bajar y vende al subir a la siguiente.\n\nLa ganancia sale de la diferencia entre escalones.'
      ],
      more: [
        '**De dónde sale la ganancia:** si compra a 600 y vende a 615, esos 15 son tuyos menos comisiones. El precio sube y baja varias veces al día, así que puede repetirlo.\n\n**La clave está en la separación.** Cada vuelta paga gas (unos 0,025 USDT) y comisión del exchange. Si los escalones están muy juntos, no cubre costes y **el bot no vende**: está programado para no vender con pérdida.\n\n**Qué puede salir mal:** si el precio se sale del rango por abajo, se queda con la moneda comprada esperando. Si se sale por arriba, vende todo y deja de operar.'
      ]
    },
    {
      topic: 'Accumulator',
      guia: 'acum', guiaLabel: 'Guíame paso a paso',
      accion: 'acum',
      keys: ['accumulator', 'acumulador', 'bot acumulador', 'como funciona el acumulador',
             'promediar', 'precio medio', 'bajar el promedio'],
      answer: [
        'Compra poco a poco mientras el precio baja, **y compra más cuanto más barato está**. Así baja tu precio medio.\n\nNo vende por partes: espera a que todo valga el porcentaje que fijaste y vende de golpe.',
        'El Accumulator sirve cuando quieres entrar en una moneda pero no sabes si va a bajar más.\n\nEn vez de gastar todo de golpe, va soltando el dinero en cada caída. Tu precio medio acaba siendo mejor.',
        'Va comprando en las caídas para bajar tu precio de entrada. Cuando toda tu posición alcanza el objetivo (por ejemplo +10%), vende entera.\n\nComo vende una sola vez, paga comisiones una sola vez.'
      ],
      more: [
        '**Un ejemplo:** compras 10 monedas a 100 y luego 10 a 80. Tu precio medio es 90, así que no necesitas que vuelva a 100 para recuperar.\n\n**Qué puede salir mal:** si el precio sigue bajando y no vuelve a subir, el bot no vende y te quedas con la moneda valiendo menos. Y si cae por debajo del mínimo que pusiste, deja de comprar.\n\n**Consejo:** un objetivo del 8-12% se alcanza a menudo. Por encima del 25% puedes esperar mucho.'
      ]
    },
    {
      topic: 'Cash Out',
      guia: 'cash', guiaLabel: 'Guíame paso a paso',
      accion: 'cash',
      keys: ['cash out', 'cashout', 'take profit', 'vender a un precio',
             'orden de venta', 'como funciona el cash out'],
      answer: [
        'Tú dices "cuando esta moneda llegue a este precio, véndela". El bot vigila día y noche y lo hace en cuanto ocurre.\n\nAunque sea a las cuatro de la mañana.',
        'Es el más sencillo: una orden de venta a un precio objetivo. El bot la ejecuta cuando el mercado lo toca y el dinero llega a tu wallet.',
        'Pone tu venta a un precio concreto y espera. Solo hace **una operación**, así que paga comisiones una sola vez (unos 0,03 USDT).'
      ],
      more: [
        '**Qué puede salir mal:** el precio puede no llegar nunca. Entonces el bot no hace nada y tu moneda sigue siendo tuya.\n\nY si el mercado sube mucho más de tu objetivo, ya habrás vendido y te quedas sin esa subida extra.\n\n**Consejo:** entre +3% y +10% suele tocarse en días. Por encima del +25%, puedes esperar semanas.'
      ]
    },
    {
      topic: 'DCA',
      guia: 'dca', guiaLabel: 'Guíame paso a paso',
      accion: 'dca',
      keys: ['dca', 'compra recurrente', 'comprar cada semana', 'comprar poco a poco',
             'promedio de costo', 'como funciona el dca'],
      answer: [
        'Compra la misma cantidad cada cierto tiempo, sin mirar el precio. Por ejemplo 20 USDT todos los lunes.\n\nUnas veces te toca caro y otras barato, y acabas con un precio medio razonable.',
        'El DCA evita el error más caro que comete la gente: meter todos sus ahorros justo antes de una caída.\n\nCompra siempre un poco, pase lo que pase.',
        'Compras programadas cada cierto tiempo. Este bot **solo compra, no vende**: tú decides cuándo salir.'
      ],
      more: [
        '**Consejo importante:** semanal o mensual rinde más que diario. Cada compra paga gas de la red, y comprando a diario ese coste se come la ventaja.\n\nQue cada compra sea de **10 USDT o más**, para que la comisión pese poco.\n\n**Qué puede salir mal:** si la moneda baja durante años, tu precio medio bajará también, pero seguirás en pérdida. No es magia.'
      ]
    },

    /* ══════════════ EMPEZAR ══════════════ */
    {
      topic: 'cómo empezar',
      opciones: [
        { label: 'Conectar wallet',  q: 'como conecto la wallet' },
        { label: '¿Cuánto pongo?', q: 'cuanto dinero necesito' },
        { label: 'Guíame', q: 'guiame a montar mi bot' }
      ],
      keys: ['como empiezo', 'como empezar', 'primeros pasos', 'soy nuevo',
             'como creo un bot', 'como hago un bot', 'quiero empezar', 'que necesito'],
      answer: [
        'Tres pasos:\n\n**1.** Conecta tu wallet (MetaMask, Trust o SafePal).\n**2.** Deposita un poco de BNB para el gas de las operaciones.\n**3.** Elige un bot, toca "Configuraciones rentables" y escoge una.\n\n¿Te explico alguno de los pasos?',
        'Necesitas una wallet con algo de BNB y las monedas que quieras operar.\n\nLuego eliges el bot, pulsas **Configuraciones rentables** y el sistema te propone opciones ya calculadas para que ganen de verdad.',
        'Lo primero es conectar tu wallet. Después, cargar un poco de gas (con 0,01 BNB tienes para muchas operaciones) y crear tu primer bot.\n\nSi no sabes cuál elegir, el **Equilibrado** del Smart Grid es buen punto de partida.'
      ]
    },
    {
      topic: 'conectar la wallet',
      guia: 'wallet', guiaLabel: 'Guíame para conectarla',
      accion: 'conectar',
      keys: ['conectar wallet', 'no conecta', 'no me conecta', 'conectar billetera',
             'metamask', 'trust wallet', 'safepal', 'no puedo conectar',
             'como conecto', 'walletconnect'],
      answer: [
        'En el ordenador: pulsa **Conectar wallet** y acepta en la extensión.\n\nEn el móvil: al pulsar sale una ventana con **"Abrir en MetaMask"**, "Trust" o "SafePal". Tócala y se abre Aurex dentro de tu wallet, donde conecta solo.',
        'Si estás en el móvil, lo más fiable es **abrir Aurex desde el navegador de tu wallet**. En la ventana de conexión tienes el botón directo.\n\n¿Te sale algún mensaje de error concreto?',
        'Toca "Conectar wallet". Si no funciona, prueba a abrir la página desde el navegador interno de MetaMask o Trust: ahí la conexión es automática.'
      ],
      more: [
        'Si sigue sin conectar, tenemos una página de diagnóstico que te dice el motivo exacto: añade **/diag.html** al final de la dirección.\n\nEnséñame lo que salga ahí y te digo qué pasa.'
      ]
    },
    {
      topic: 'gas',
      keys: ['gas', 'que es el gas', 'para que el gas', 'cuanto gas', 'me quedo sin gas',
             'recargar gas', 'depositar gas', 'bnb para gas', 'comision de red'],
      answer: [
        'El gas es lo que cuesta cada operación en la red. Lo depositas una vez y de ahí van saliendo las compras y ventas de tus bots.\n\nCada operación cuesta unos **0,00002 BNB** (un céntimo). Con 0,01 BNB tienes para cientos.',
        'Es el combustible de tus bots. Sin gas, no pueden operar.\n\nLo cargas desde la pantalla principal y **es tuyo**: puedes retirarlo cuando quieras.',
        'Es un saldo tuyo dentro del contrato para pagar las operaciones en la red. Un saldo único que comparten todos tus bots.\n\nCon poco alcanza: cada operación cuesta alrededor de un céntimo.'
      ]
    },
    {
      topic: 'comisiones',
      keys: ['comision', 'comisiones', 'cuanto cobran', 'cuanto cobran de comision',
             'cuanto cuesta usar', 'suscripcion', 'cuota', 'cuota mensual', 'es gratis',
             'tarifas', 'que cobran', 'me cobran', 'hay que pagar', 'cuanto se paga'],
      answer: [
        'Hay una **suscripción mensual en BNB** para usar los bots, y una comisión pequeña en el swap.\n\nEl coste de cada operación (el gas) sale de tu saldo, no de tu inversión. Lo ves exacto en tu perfil.',
        'Puedes ver el importe exacto de la cuota en tu perfil, sección **Suscripción y gas**. Y también cuánto cuesta cada operación.\n\nNo cobramos porcentaje de tus ganancias.',
        'Suscripción mensual para los bots y comisión en el swap. El gas de red va aparte y es lo que cuesta operar en la blockchain, no es nuestro.'
      ]
    },

    /* ══════════════ PROBLEMAS ══════════════ */
    {
      topic: 'el bot no opera',
      keys: ['no opera', 'no compra', 'no vende', 'no hace nada', 'esta parado',
             'no funciona el bot', 'no se ejecuta', 'lleva dias sin', 'no pasa nada'],
      answer: [
        'Lo más habitual es que **el precio todavía no haya llegado a ninguna cuadrícula**. El bot solo actúa cuando el mercado toca uno de tus niveles.\n\nEn la gráfica del bot puedes ver cuánto falta para el más cercano.',
        'Tres cosas a comprobar:\n\n**1.** ¿Tienes gas cargado? Sin gas no puede operar.\n**2.** ¿El precio ha llegado a alguna cuadrícula?\n**3.** Si las cuadrículas están muy juntas, el bot **se niega a vender con pérdida**. Eso es correcto, no un fallo.',
        'Puede ser normal: si el precio no ha cruzado ningún nivel, no hay nada que hacer todavía.\n\nMira la gráfica del bot: las líneas te dicen dónde está esperando.'
      ],
      more: [
        'Si el precio **sí cruzó** una cuadrícula y no pasó nada, eso sí hay que mirarlo. Escríbeme por Telegram y lo revisamos con tu caso concreto.'
      ],
      contactCard: true
    },
    {
      topic: 'cancelar un bot',
      keys: ['cancelar bot', 'cerrar bot', 'quitar bot', 'parar bot', 'detener bot',
             'sacar mi dinero', 'recuperar mi dinero', 'retirar fondos', 'como retiro',
             'como retiro mi dinero', 'retirar mi dinero', 'sacar el dinero', 'retirar',
             'como saco mi dinero', 'quiero mi dinero', 'devolver mi dinero'],
      answer: [
        'En la tarjeta del bot tienes **Cancelar**. Todo tu dinero vuelve a tu wallet: lo que esté en monedas se vende al precio de ahora y lo que no se usó se devuelve tal cual.',
        'Puedes cancelar cuando quieras. En "Mis bots" también tienes **Cerrar todos** si quieres cerrarlos de una vez.\n\nOjo: si un bot compró y el precio bajó, esa parte se venderá en pérdida.',
        'Cancela el bot desde su tarjeta y recuperas todo. No hay penalización ni tiempo mínimo.'
      ]
    },
    {
      topic: 'perdí dinero',
      keys: ['perdi dinero', 'perdi plata', 'perdi', 'estoy en perdida', 'voy perdiendo',
             'me esta dando perdida', 'perdida', 'bajo mi inversion', 'estoy negativo',
             'estoy perdiendo', 'me hizo perder', 'perdi mi dinero', 'voy en rojo'],
      answer: [
        'Te lo digo con franqueza: **los bots no garantizan ganancias**. Funcionan bien cuando el mercado se mueve dentro de un rango, y mal cuando se va en una sola dirección y no vuelve.\n\n¿Me cuentas qué bot es y qué configuración pusiste? Miramos si hay algo ajustable.',
        'Es posible perder, y conviene tenerlo claro desde el principio.\n\nSi el precio se salió del rango, el bot se queda esperando con la moneda comprada. No has perdido el dinero: está en forma de moneda, valiendo menos hasta que recupere.\n\nCuéntame tu caso y lo vemos.',
        'Lo siento. El mercado no siempre acompaña.\n\nUna cosa importante: si el bot no ha vendido, la pérdida no está cerrada. Tienes la moneda, y su precio puede volver. Cancelar ahora sí la haría real.'
      ],
      contactCard: true
    },

    /* ══════════════ OTRAS SECCIONES ══════════════ */
    {
      topic: 'marketplace',
      /* Aquí llega tanto quien quiere comprar como quien quiere vender.
         En vez de adivinar cuál es, se le pregunta y se le dan las dos
         guías: así nadie acaba en la explicación equivocada. */
      opciones: [
        { label: 'Quiero comprar', q: 'guiame para comprar' },
        { label: 'Quiero vender',  q: 'guiame para vender' },
        { label: '¿Es seguro?',    q: 'y si el vendedor no libera' }
      ],
      accion: 'market',
      keys: ['marketplace', 'market', 'p2p', 'comprar usdt', 'vender usdt',
             'comprar cripto', 'cambiar a pesos', 'efectivo', 'transferencia',
             'que es el marketplace', 'que es el market', 'como funciona el marketplace',
             'mercado'],
      answer: [
        'El Marketplace es para comprar y vender cripto **entre personas**, pagando como acordéis (transferencia, efectivo, lo que sea).\n\nLa cripto queda bloqueada en el contrato hasta que el pago se confirma, así ninguno de los dos se arriesga.',
        'Es un mercado entre usuarios. El vendedor deja una fianza, la cripto queda retenida, y solo se libera cuando confirma que recibió el pago.\n\nSi hay problema, se abre una disputa y un árbitro decide.',
        'Compra y venta directa entre personas, con protección: fianza del vendedor, cripto bloqueada y sistema de disputas.'
      ]
    },
    {
      topic: 'prize pool',
      guia: 'prize', guiaLabel: 'Guíame para participar',
      accion: 'prize',
      keys: ['prize pool', 'sorteo', 'pozo', 'premio', 'ganar premio', 'loteria',
             'como participo en el sorteo'],
      answer: [
        'Es un sorteo comunitario. Entras con una participación y, al cerrar la ronda, se reparten premios entre los ganadores.\n\nEl número aleatorio viene de un sistema **verificable en la blockchain**: nadie puede manipularlo, ni nosotros.',
        'Un pozo común donde cualquiera puede participar. Al cerrar, se sortea con aleatoriedad verificable y se reparten los premios.\n\nPuedes ver la ronda actual y el pozo en la sección Prize Pool.'
      ]
    },
    {
      topic: 'swap',
      guia: 'swap', guiaLabel: 'Guíame para intercambiar',
      accion: 'swap',
      keys: ['swap', 'intercambiar', 'cambiar moneda', 'cambiar token', 'convertir'],
      answer: [
        'El swap te deja cambiar una moneda por otra al momento, desde tu propia wallet.\n\nFunciona sobre PancakeSwap, con una comisión pequeña por usar la plataforma.',
        'Intercambio directo entre monedas. Eliges qué das y qué quieres, y se hace en una operación.'
      ]
    },
    {
      topic: 'instalar la app',
      accion: 'instalar',
      keys: ['instalar', 'app', 'aplicacion', 'descargar', 'tener en el movil',
             'instalar en el telefono', 'como la instalo'],
      answer: [
        'Aurex se puede instalar como aplicación. En el ordenador tienes el botón **Instalar** en el menú de arriba; en el móvil, desde el menú del navegador.\n\nSe abre con su icono, a pantalla completa, y funciona aunque la conexión vaya lenta.',
        'Sí, se instala. Busca **Instalar** en el menú.\n\nUn aviso: si la instalas en el móvil, la wallet no se puede conectar dentro de la app. Para operar desde el teléfono es mejor entrar por el navegador de MetaMask o Trust.'
      ]
    },

    /* ══════════════ LO QUE SALIÓ EN LA AUDITORÍA ══════════════
       Preguntas reales que la gente hizo y el asistente no supo responder. */

    {
      topic: 'quién es el CEO',
      keys: ['quien es el ceo', 'el ceo', 'ceo', 'quien es el fundador', 'fundador',
             'quien es el dueno', 'quien es el dueño', 'el dueño', 'quien manda',
             'quien dirige', 'director', 'con quien hablo', 'quien es jesus',
             'quien eres tu', 'eres el dueño', 'eres una persona real',
             'como se llama el dueño', 'quien lo dirige', 'jefe', 'quien es el jefe'],
      answer: [
        'El CEO de Aurex es **Jesús**. Es quien dirige el proyecto y quien responde personalmente cuando hace falta.\n\nAquí tienes su contacto directo:',
        '**Jesús** lleva Aurex. No hay una empresa grande detrás con departamentos: hay una persona con la que puedes hablar directamente.\n\nEste es su contacto:',
        'Se llama **Jesús** y es el fundador. Puedes escribirle tú mismo, sin intermediarios ni tickets de soporte:'
      ],
      contactCard: true
    },
    {
      topic: 'quién está detrás',
      keys: ['quien esta detras', 'quien hizo esto', 'quien lo lleva', 'quienes son',
             'quien es el dueno', 'quien creo aurex', 'de quien es', 'hay un equipo',
             'es una empresa', 'sois una empresa'],
      answer: [
        'Detrás de Aurex hay un equipo pequeño, y el contacto directo soy yo. No somos una empresa grande ni queremos parecerlo.\n\nLo que sí puedes comprobar tú mismo: los contratos son públicos y están en la blockchain.',
        'Es un proyecto de un equipo reducido. Puedes hablar directamente con nosotros, sin pasar por diez filtros.\n\nY lo importante: aunque desapareciéramos mañana, **tu dinero sigue en tu wallet**. No lo tenemos nosotros.',
        'Un equipo pequeño, con contacto directo. Nada de call center.\n\nY la parte que de verdad importa: no custodiamos fondos, así que no dependes de que sigamos aquí.'
      ],
      more: [
        'Si quieres verificarlo por tu cuenta: en la web, cada contrato tiene enlace a BscScan. Ahí ves el código, las operaciones y quién puede hacer qué.\n\nNo hace falta que confíes en mi palabra.'
      ],
      contactCard: true
    },
    {
      topic: 'qué pasa si el precio baja',
      keys: ['si el precio baja', 'que pasa si baja', 'y si baja mucho', 'si cae el precio',
             'puedo perder', 'aqui puedo perder', 'se puede perder', 'hay riesgo',
             'que riesgo hay', 'y si el mercado cae', 'si se desploma',
             'que pasa si el precio baja', 'que pasa si el precio baja mucho',
             'y si el precio baja', 'si baja el precio', 'y si cae', 'riesgos',
             'es arriesgado', 'puedo perderlo todo'],
      answer: [
        'Sí, se puede perder. Te lo digo sin rodeos porque prefiero que lo sepas antes.\n\nSi el precio baja, el bot compra y **espera**. No vende con pérdida: se queda con la moneda hasta que recupere. Tu dinero no desaparece, pero está ahí abajo esperando.',
        'Puede pasar, y conviene tenerlo claro. Si el mercado cae por debajo de tu rango, el bot deja de operar y se queda con la moneda comprada.\n\nNo pierdes el dinero de golpe: lo tienes en forma de moneda, valiendo menos hasta que suba.',
        'Se puede perder, sí. Estos bots funcionan bien cuando el precio se mueve dentro de un rango, y mal cuando se va en una dirección y no vuelve.\n\nPor eso conviene usar dinero que puedas dejar quieto un tiempo.'
      ],
      more: [
        'Dos cosas que ayudan:\n\n**Un rango amplio** aguanta caídas mayores sin salirse.\n**Monedas grandes** (BNB, BTC, ETH) tienen más probabilidad de recuperarse que una moneda pequeña.\n\nY nunca pongas dinero que necesites la semana que viene.'
      ]
    },
    {
      topic: 'diferencia con otros exchanges',
      keys: ['binance', 'diferencia con binance', 'que diferencia hay con binance',
             'comparado con binance', 'y binance', 'mejor que binance', 'vs binance',
             'diferencia con otros', 'por que aqui', 'que os diferencia',
             'comparado con otros', 'coinbase', 'kucoin', 'exchange', 'otros exchanges',
             'que diferencia hay'],
      answer: [
        'La diferencia grande: **en Binance depositas tu dinero en su plataforma. Aquí no depositas nada.**\n\nTu wallet sigue siendo tuya, y el bot solo tiene permiso para mover una cantidad que tú fijas y puedes retirar.',
        'En un exchange normal les entregas el dinero y confías en que te lo devuelvan. Aquí eso no ocurre: **nunca sale de tu wallet**.\n\nAdemás, sin registro ni KYC. No pedimos documentos a nadie.',
        'Tres diferencias: no custodiamos tus fondos, no pedimos identificación, y no puedes ser bloqueado por tu país.\n\nA cambio, tú eres responsable de tu wallet: si pierdes tus claves, no hay atención al cliente que las recupere.'
      ]
    },
    {
      topic: 'guiarme paso a paso',
      keys: ['me puedes guiar', 'guiarme', 'ayudame a montar', 'como monto mi bot',
             'ayudame a crear', 'paso a paso', 'que hago primero', 'y despues que hago',
             'cual me recomiendas', 'que me recomiendas', 'que bot me conviene',
             'no se cual elegir', 'ayudame a elegir'],
      answer: [
        'Vamos por pasos.\n\n**1.** Conecta tu wallet arriba a la derecha.\n**2.** Carga un poco de gas: con 0,01 BNB tienes para cientos de operaciones.\n**3.** Elige el bot **Smart Grid** y pulsa **Configuraciones rentables**.\n**4.** Escoge **Equilibrado** y dale a Encender.\n\n¿Por cuál vas?',
        'Te guío. Si es tu primera vez, lo más sencillo:\n\nConecta la wallet → carga gas → elige **Cash Out**, que solo hace una venta y se entiende a la primera.\n\nCuando le cojas el aire, pasas al Smart Grid. ¿Empezamos?',
        'Claro. Lo primero es la wallet conectada y algo de gas cargado.\n\nDespués: **Smart Grid** con la configuración **Equilibrado** es el punto de partida más razonable. Ya viene calculada para que cada vuelta deje beneficio.\n\n¿Tienes ya la wallet conectada?'
      ],
      more: [
        'Un consejo de arranque: **empieza con poco**. 50 o 100 USDT bastan para ver cómo se comporta.\n\nY mira la gráfica del bot un par de días antes de meter más. Ahí ves las cuadrículas y cuánto falta para que dispare.'
      ]
    },
    {
      topic: 'seguridad del marketplace',
      guia: 'vender', guiaLabel: 'Guíame para vender',
      keys: ['si no me paga', 'y si no me manda el dinero', 'y si me estafa el vendedor',
             'y si el comprador no paga', 'que pasa si me estafan', 'como me protegen',
             'y si hay problema con la venta', 'que pasa si hay disputa',
             'y si el que me vende no me manda el dinero', 'si el vendedor no envia',
             'y si no cumple', 'quien me protege', 'garantia', 'que garantia hay'],
      answer: [
        'Para eso está el sistema. La cripto **queda bloqueada en el contrato** desde el principio: el vendedor no puede llevársela.\n\nSi el comprador paga y el vendedor no libera, se abre una disputa y un árbitro decide con las pruebas.',
        'Nadie puede irse con el dinero del otro. La cripto se retiene hasta que se confirma el pago.\n\nY el vendedor deja una **fianza**: si pierde una disputa, sale de ahí la compensación.',
        'El contrato hace de intermediario. La cripto no está en manos del vendedor ni del comprador hasta que la operación se cierra bien.\n\nSi algo falla, disputa con motivo escrito y decisión de un árbitro.'
      ]
    },
    {
      topic: 'cuánto dinero necesito',
      keys: ['cuanto dinero necesito', 'cuanto necesito', 'con cuanto empiezo',
             'minimo para empezar', 'cuanto hace falta', 'necesito mucho dinero',
             'puedo empezar con poco', 'con 50 dolares', 'con 100', 'cuanto invierto',
             'cuanto dinero hace falta', 'dinero necesito para empezar',
             'cuanto dinero necesito para empezar', 'inversion minima', 'monto minimo'],
      answer: [
        'Puedes empezar con **50 USDT** tranquilamente. Las configuraciones están calculadas para que rindan incluso con esa cantidad.\n\nY aparte, un poco de BNB para el gas: con 0,01 tienes para cientos de operaciones.',
        'No hace falta mucho. Con 50 o 100 USDT ya funciona, y es lo que te recomiendo para empezar: poco, ver cómo se comporta, y luego decidir.\n\nSuma un poquito de BNB para el gas y listo.',
        'Con 50 USDT arrancas. Cuanto más dinero por cuadrícula, mejor rinde (el gas cuesta lo mismo muevas 2 o 20), pero con 50 ya sale rentable.\n\nNunca pongas dinero que vayas a necesitar pronto.'
      ]
    },

    /* ══════════════ PREGUNTAS DE DINERO ══════════════
       Las que más se hacen. Se responden con números reales y sin
       prometer nada: es la única forma de que confíen. */
    {
      topic: 'cuánto voy a ganar',
      keys: ['cuanto gano', 'cuanto puedo ganar', 'cuanto se gana', 'cuanto ganaria',
             'cuanto voy a ganar', 'cuanto rinde', 'que rentabilidad', 'rentabilidad',
             'cuanto da al mes', 'cuanto genera', 'ganancia mensual', 'cuanto produce',
             'si invierto 1000', 'si invierto 100', 'si pongo 500', 'con 1000 dolares',
             'con 10000', 'cuanto con 1000', 'porcentaje mensual', 'apy', 'roi'],
      answer: [
        'Te respondo con números reales, no con promesas.\n\n**Cada vuelta del Smart Grid deja entre un 2% y un 4%** de lo que mueve esa cuadrícula, ya sin comisiones. Cuántas vueltas dé depende del mercado: un día movido puede dar varias, uno plano ninguna.\n\n**Nadie puede decirte cuánto vas a ganar al mes**, y quien te lo diga te está mintiendo.',
        'Lo que sí sé: con **200 USDT** en un Smart Grid Equilibrado, **cada vuelta deja unos 0,26 USDT limpios**.\n\nSi el mercado se mueve y da 3 vueltas al día, son unos 0,78 al día. Si está plano, cero.\n\nNo hay porcentaje fijo. Depende de cuánto se mueva el precio, y eso no lo controla nadie.',
        'No te voy a dar un porcentaje mensual, porque sería inventado.\n\nLo real: cada operación completa deja **entre 2% y 4%** de lo que mueve, después de comisiones. La frecuencia la pone el mercado.\n\nHay meses buenos y meses en que el bot apenas opera.'
      ],
      more: [
        'Para que te hagas una idea con **1.000 USDT** en Equilibrado (20 cuadrículas):\n\n· Cada cuadrícula mueve 50 USDT\n· Cada vuelta deja **~1,40 USDT** limpios\n· Si el mercado da 2-4 vueltas al día → **entre 2,80 y 5,60 al día**\n· En un mes movido, entre 80 y 170 USDT\n\n**Pero ojo:** eso es en un mercado que sube y baja. Si el precio se va en línea recta y no vuelve, el bot deja de operar y te quedas con la moneda esperando.\n\nY si baja mucho, tendrás pérdida no realizada hasta que recupere.'
      ]
    },
    {
      topic: 'cuánto me recomiendas invertir',
      keys: ['cuanto me recomiendas', 'que cantidad recomiendas', 'cuanto deberia invertir',
             'con 300 esta bien', 'con 500 esta bien', 'esta bien empezar con',
             'es suficiente', 'me alcanza con', 'que me recomiendas invertir',
             'cuanto pongo', 'cuanto meto', 'es poco', 'es mucho'],
      answer: [
        'Mi recomendación sincera: **empieza con lo que no te duela dejar quieto tres meses.**\n\nPara la mayoría eso son 100-300 USDT. No porque con más no funcione, sino porque así aprendes cómo se comporta sin jugarte nada importante.',
        'Con **300 USDT** vas perfectamente. De hecho es una cantidad muy razonable: suficiente para que las comisiones no pesen, y poco para dormir tranquilo.\n\nLa regla de oro: **nunca dinero que necesites pronto.**',
        'Depende menos de la cantidad y más de una cosa: que sea dinero que puedas **dejar quieto**. Estos bots trabajan con el tiempo.\n\nCon 100 ya funciona. Con 300 va cómodo. Y lo que no haría es empezar con todo lo que tienes.'
      ],
      more: [
        'Por qué importa el tamaño de cada cuadrícula:\n\nEl gas cuesta lo mismo muevas 2 USDT o 20. Así que con inversiones muy pequeñas repartidas en muchas cuadrículas, las comisiones se comen la ganancia.\n\n**Referencia:** que cada cuadrícula mueva al menos **10 USDT**. Con 200 USDT y 20 cuadrículas, cada una mueve 10. Justo en el punto.'
      ]
    },



    /* ══════════════ LA ACADEMIA ══════════════ */
    {
      topic: 'la academia',
      accion: 'academy',
      keys: ['que es la academia', 'academy', 'curso', 'cursos', 'formacion', 'aprender',
             'clases', 'quiero aprender', 'ensename', 'estudiar', 'donde aprendo',
             'como aprendo a operar', 'aprender trading', 'curso de trading',
             'quiero aprender trading', 'me ensenas', 'hay formacion'],
      answer: [
        'Sí, tenemos **Aurex Academy**: 17 clases con examen, 20 audiolibros y mi estrategia completa en tres fases.\n\nLa idea es que no dependas de los bots para siempre. Está bien que trabajen por ti, pero **entender lo que hacen es lo que te da tranquilidad**.',
        '**Aurex Academy** es la parte de formación. De cero: qué es una criptomoneda, qué es el spread, cómo leer un gráfico, hasta la estrategia que uso yo.\n\nCada clase tiene examen y hacen falta 80 puntos para pasar. No es una carpeta de vídeos: es un camino.',
        'Hay academia, sí. Y te digo por qué merece la pena aunque uses bots:\n\nEl bot opera por ti, pero **eres tú quien decide el rango, la moneda y cuándo parar**. Esas decisiones se toman mejor sabiendo qué miras.\n\nDesde 10 USD al mes.'
      ],
      more: [
        'Lo que hay dentro:\n\n· **Plan de gestión de riesgo** con software para aplicarlo\n· **17 clases** de cero a cien, cada una con su examen de 20 preguntas\n· **20 audiolibros** escogidos uno a uno\n· **Lógica Estructural Avanzada**: mi estrategia, en tres fases\n· Tutoriales y ejemplos sobre operaciones reales\n· **Certificado** al aprobar cada materia\n\nTres planes: 10 USD al mes, 20 el trimestre o 50 el año.'
      ],
      opciones: [
        { label: 'Ver los planes',   q: 'planes de la academia' },
        { label: '¿Qué incluye?',    q: 'que incluye la academia' },
        { label: 'Ver los bots', q: 'que bots hay' }
      ]
    },
    {
      topic: 'aprender mientras uso bots',
      keys: ['tengo que saber trading', 'necesito saber de trading', 'sin saber nada puedo',
             'hace falta experiencia', 'soy nuevo puedo usar los bots',
             'debo aprender', 'me conviene aprender', 'vale la pena la academia'],
      answer: [
        'No hace falta saber nada para empezar: las configuraciones vienen calculadas y puedes encender un bot hoy mismo.\n\nDicho eso, **quien entiende lo que hace su bot aguanta mejor las malas rachas**. El que no entiende se asusta y cancela en el peor momento.',
        'Puedes empezar sin saber nada, de verdad. Eliges una configuración recomendada y listo.\n\nSi más adelante quieres entender lo que pasa por debajo, tenemos formación. Pero no te hace falta para arrancar.'
      ],
      accion: 'academy'
    },

    /* ══════════════ SEGURIDAD Y PERMISOS ══════════════ */
    {
      topic: 'los permisos de gasto',
      guia: 'permisos', guiaLabel: 'Guíame para quitarlos',
      accion: 'perfil',
      keys: ['permisos', 'permiso', 'quitar permisos', 'revocar', 'revocar permisos',
             'allowance', 'aprobacion', 'approve', 'como quito los permisos',
             'por que quitar permisos', 'permisos de gasto', 'quitar acceso a los bots',
             'que puede mover el bot', 'el bot puede tocar mi dinero'],
      answer: [
        'Cuando enciendes un bot le das permiso para mover **una cantidad concreta** de una moneda. Nunca ilimitado.\n\nEse permiso lo ves y lo quitas en tu perfil, sección **Permisos de gasto**. Es lo más eficaz que puedes hacer por tu seguridad.',
        'Los bots necesitan permiso para operar con tus monedas, pero **tú decides cuánto y hasta cuándo**.\n\nEn tu perfil ves cada permiso activo y hay un botón para cortarlo. Treinta segundos.',
        'Es un buen hábito: **cuando dejes de usar un bot, quítale el permiso.**\n\nEstá en tu perfil, en Permisos de gasto. Y si vuelves a usarlo, te lo pide otra vez. No pierdes nada.'
      ],
      more: [
        'Por qué esto importa tanto:\n\nLa mayoría de robos grandes en cripto no son por contratos rotos, sino por **permisos que la gente dejó abiertos años atrás**. Si un contrato se ve comprometido y tú le diste permiso hace seis meses, puede vaciarte.\n\nAquí: permisos por cantidad exacta, siempre visibles, y se cortan en un clic.\n\nCosas que **nunca** debes hacer: dar tu frase de recuperación a nadie, ni firmar algo que no entiendas.'
      ]
    },

    /* ══════════════ PROBLEMA DE ACCESO AL GRUPO ══════════════ */
    {
      topic: 'no puedo entrar al grupo',
      keys: ['no puedo entrar al grupo', 'no me deja entrar', 'no me acepta el bot',
             'pague y no entro', 'pague y no puedo entrar', 'el bot no me agrega',
             'no me agrega al grupo', 'restriccion telegram', 'no puedo unirme',
             'me rechaza el grupo', 'no me llega la invitacion', 'privacidad telegram',
             'no puedo ser agregado a grupos', 'ya pague y nada'],
      answer: [
        'Vamos a resolverlo. Lo más habitual es una de estas tres:\n\n**1.** Tu cuenta **no tiene nombre de usuario**. Ponlo en Telegram → Ajustes → Nombre de usuario.\n**2.** Escribiste **otro usuario** al pagar. Revisa que sea exactamente el tuyo.\n**3.** Tienes la **privacidad restringida** para grupos.\n\n¿Cuál te suena?',
        'Tranquilo, esto se arregla siempre.\n\nPrimero comprueba que tu cuenta **tiene nombre de usuario** (Ajustes → Nombre de usuario) y que es el mismo que pusiste al pagar. Es el fallo del 90% de los casos.\n\nSi ya lo tienes bien, escríbeme directo y te meto a mano:'
      ],
      more: [
        'Paso a paso:\n\n**1.** Telegram → Ajustes → **Nombre de usuario**. Si está vacío, pon uno.\n**2.** Ajustes → Privacidad y seguridad → **Grupos y canales** → ponlo en **Todos**.\n**3.** Escríbele **/estado** a nuestro bot: te dice si te consta el acceso.\n**4.** Vuelve a pedir entrar al grupo.\n\n**Si aun así no entras, no te quedes atascado: escríbeme y lo soluciono a mano.** Has pagado, así que es problema mío, no tuyo.'
      ],
      contactCard: true
    },

    /* ══════════════ POR QUÉ MERECE LA PENA ══════════════ */
    {
      topic: 'por qué el prize pool es rentable',
      guia: 'prize', guiaLabel: 'Guíame para participar',
      accion: 'prize',
      keys: ['por que es rentable el prize pool', 'el sorteo es rentable', 'vale la pena el sorteo',
             'me conviene el prize pool', 'cuanto se gana en el sorteo', 'como funciona el sorteo',
             'reglas del sorteo', 'cuando puedo salirme', 'abandonar el sorteo',
             'que gano en el prize pool', 'probabilidades sorteo'],
      answer: [
        'Te lo cuento sin adornos: **es un sorteo, no una inversión.** Pones una cantidad pequeña y puede tocarte el pozo o no.\n\nLo que sí puedo garantizarte es que **no está trucado**: el número sale de un sistema verificable en la blockchain que nadie puede manipular, ni nosotros.',
        'Lo bueno del Prize Pool es lo que lo diferencia de una lotería normal:\n\n· El sorteo es **verificable en cadena**, cualquiera lo comprueba\n· Puedes **salirte y recuperar tu aporte** hasta 24 horas antes\n· El pozo y los participantes son **públicos** en todo momento\n\nAhora bien: participa con lo que no te importe perder.'
      ],
      more: [
        'Las reglas, claras:\n\n**Entrar:** pagas la participación y quedas dentro de la ronda.\n**Salir:** puedes retirarte y recuperar tu aporte hasta **24 h antes** del cierre. Después ya no, para que nadie infle el pozo y se marche antes del sorteo.\n**El sorteo:** al cerrar la ronda se pide un número aleatorio verificable. Si no hay participantes suficientes, se **devuelve el dinero a todos**.\n**Cobrar:** si ganas, te aparece un botón para reclamar tu premio.\n\nY una idea, por si te sirve: el sorteo es suerte. **Si lo que quieres es que tu dinero crezca de forma constante, los bots o la formación te van a servir más.**'
      ]
    },

    {
      topic: 'tengo un problema',
      keys: ['tengo un problema', 'necesito ayuda', 'ayuda', 'ayudame', 'algo va mal',
             'me pasa algo', 'no me funciona nada', 'estoy preocupado', 'estoy perdido',
             'no entiendo nada', 'estoy agobiado', 'no se que hacer'],
      answer: [
        'Cuéntame qué pasa y lo miramos. Sin prisa.',
        'Dime qué te ocurre. Cuanto más concreto, mejor te puedo ayudar.',
        'A ver, cuéntame. ¿Qué está pasando exactamente?'
      ],
      opciones: [
        { label: 'Mi bot no opera',   q: 'mi bot no vende nada' },
        { label: 'No conecta wallet', q: 'no me conecta la wallet' },
        { label: 'Perdí dinero',      q: 'perdi dinero' },
        { label: 'Otra cosa',         q: 'contacto' }
      ]
    },

    /* ══════════════ CONTACTO ══════════════ */
    {
      topic: 'contacto',
      keys: ['contacto', 'hablar con alguien', 'hablar con una persona', 'soporte',
             'ayuda humana', 'atencion al cliente', 'quien lleva esto', 'el dueno',
             'telegram', 'whatsapp', 'grupo', 'comunidad', 'no me resuelves'],
      answer: [
        'Claro. Puedes escribirme directamente o pasarte por la comunidad, donde hay más gente que usa la plataforma.',
        'Te dejo por dónde localizarnos. Si es algo de tu caso concreto, mejor por mensaje directo.',
        'Aquí tienes. En el grupo suele haber respuesta rápida, y para algo personal, escríbeme directo.'
      ],
      contactCard: true
    },
    {
      topic: 'no lo sé',
      keys: ['__fallback__'],
      answer: [
        'Eso no lo tengo claro y prefiero no inventarme una respuesta.\n\n¿Te paso el contacto para que lo preguntes directamente?',
        'No sabría decirte con seguridad. Prefiero decírtelo a darte un dato equivocado.\n\nEn la comunidad seguro que te lo resuelven.',
        'Buena pregunta, pero no tengo el dato confirmado.\n\nPregúntalo por Telegram y te responden.'
      ],
      contactCard: true
    }
  ]
};
