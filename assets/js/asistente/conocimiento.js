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
          { label: 'Explícamelo con números', q: 'explicame el acumulador con numeros' },
          { label: 'Ver los otros bots',      q: 'que bots hay' },
          { label: 'Cómo empiezo',            q: 'como empiezo' }
        ]
      },
      {
        texto: 'Te cuento lo que más le sorprende a la gente:\n\nEl **Smart Grid** no necesita que el precio suba para ganar. Le basta con que **se mueva**. Compra cuando baja un escalón y vende cuando sube al siguiente, una y otra vez. Un día lateral, de esos que parecen aburridos, es su mejor día.\n\n¿Quieres que te enseñe cómo se configura?',
        opciones: [
          { label: 'Sí, enséñame',      q: 'como funciona el smart grid' },
          { label: 'Prefiero algo más simple', q: 'que es el cash out' },
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
          { label: 'Antes cuéntame más', q: 'que es aurex' },
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
      { label: 'Hablar con una persona', q: 'contacto' }
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
    nudges: {
      any:      ['¿Quieres que te cuente algo más?', '¿Te aclaro alguna otra cosa?'],
      nuevo:    ['¿Te explico cómo empezar?', '¿Quieres que veamos qué bot te encaja?'],
      experto:  ['¿Quieres el detalle de cómo se calcula?'],
      problema: ['¿Te paso con una persona para que lo miren contigo?']
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
      whatsapp:   'https://wa.me/message/JesusDevTrader',
      whatsappTx: '@JesusDevTrader',
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

  kb: [

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
             'que hay', 'q hay', 'que onda', 'que hubo', 'saludo', 'holi'],
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
      keys: ['que es aurex', 'que es esto', 'de que va', 'que hacen', 'para que sirve',
             'explicame la plataforma', 'que ofrecen', 'como funciona la pagina',
             'que es la plataforma', 'de que se trata'],
      answer: [
        'Aurex son **bots de trading que operan con tu dinero sin que salga de tu wallet**.\n\nTú configuras el bot, y él compra y vende por ti siguiendo esas reglas. Nosotros nunca tocamos tus fondos.',
        'Es una plataforma de **bots de trading no custodiales**. La diferencia con un exchange normal: tu dinero se queda en tu wallet, no lo depositas en ningún sitio.\n\nHay cuatro tipos de bot, un marketplace para comprar y vender entre personas, y un swap.',
        'Aurex te deja poner bots a trabajar en el mercado cripto **sin entregarle tu dinero a nadie**. Tú mandas siempre.\n\n¿Quieres que te cuente los tipos de bot que hay?'
      ],
      more: [
        'Lo que hay dentro:\n\n**Cuatro bots** — Smart Grid, Accumulator, Cash Out y DCA. Cada uno con una estrategia distinta.\n\n**Marketplace** — comprar y vender cripto entre personas, con fianza y sistema de disputas.\n\n**Swap** — intercambiar monedas al momento.\n\n**Prize Pool** — un sorteo comunitario con aleatoriedad verificable.\n\nTodo funciona en BNB Smart Chain, sin registro y sin KYC.'
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
        { label: '¿Cuánto necesito?', q: 'cuanto dinero necesito' },
        { label: 'Guíame paso a paso', q: 'guiame a montar mi bot' }
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
      accion: 'market',
      keys: ['marketplace', 'market', 'p2p', 'comprar usdt', 'vender usdt',
             'comprar cripto', 'cambiar a pesos', 'efectivo', 'transferencia',
             'que es el marketplace', 'que es el market', 'como funciona el marketplace',
             'vender entre personas', 'comprar entre personas', 'mercado'],
      answer: [
        'El Marketplace es para comprar y vender cripto **entre personas**, pagando como acordéis (transferencia, efectivo, lo que sea).\n\nLa cripto queda bloqueada en el contrato hasta que el pago se confirma, así ninguno de los dos se arriesga.',
        'Es un mercado entre usuarios. El vendedor deja una fianza, la cripto queda retenida, y solo se libera cuando confirma que recibió el pago.\n\nSi hay problema, se abre una disputa y un árbitro decide.',
        'Compra y venta directa entre personas, con protección: fianza del vendedor, cripto bloqueada y sistema de disputas.'
      ]
    },
    {
      topic: 'prize pool',
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
      keys: ['me puedes guiar', 'guiame', 'guiarme', 'ayudame a montar', 'como monto mi bot',
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
