// idioma.js — cambio de idioma
//
// CÓMO FUNCIONA
//
// No hay páginas duplicadas ni archivos por idioma. Los textos siguen
// escritos en español en el código, y aquí vive un diccionario que los
// traduce sobre la marcha cuando el usuario elige otro idioma.
//
// REGLA DE ORO: esto NUNCA puede romper la web.
//
// Si el diccionario falla, si falta una traducción, si el navegador no
// soporta algo — la página sigue funcionando en español como siempre.
// Cada punto delicado está protegido, y el español es el respaldo
// permanente: si un texto no está traducido, se queda como estaba.

const CLAVE = 'cco-idioma';

export const IDIOMAS = [
  { id: 'es', nombre: 'Español',   bandera: '🇲🇽' },
  { id: 'en', nombre: 'English',  bandera: '🇺🇸' },
  { id: 'pt', nombre: 'Português', bandera: '🇵🇹' }
];

/* ══════════════════════════════════════════════════════════════
   EL DICCIONARIO

   Solo lo que ve el usuario. La clave es el texto español tal cual
   está escrito en el código, así no hay que tocar nada más.
   ══════════════════════════════════════════════════════════════ */
const DIC = {
  en: {
    /* ── Menú principal ── */
    'Bots': 'Bots',
    'Market': 'Market',
    'Academia': 'Academy',
    'Tools': 'Tools',
    'Prize Pool': 'Prize Pool',
    'Liquidity': 'Liquidity',
    'Perfil': 'Profile',
    'Install': 'Install',
    'Compartir': 'Share',

    /* ── Portada de Liquidity ── */
    'Herramientas Pro': 'Pro Tools',
    'Análisis profesional': 'Professional Analysis',
    'Tres herramientas para ver lo que el gráfico esconde': 'Three tools to see what the chart hides',
    'Liquidity Pools': 'Liquidity Pools',
    'Dónde está el dinero atrapado': 'Where the money is trapped',
    'El mapa de liquidaciones: los precios donde hay posiciones esperando a ser barridas. El precio va a buscarlas.':
      'The liquidation map: prices where positions wait to be swept. Price goes looking for them.',
    'Radar Institucional': 'Institutional Radar',
    'Vea lo que hacen los grandes': 'See what the big players do',
    'Próximamente': 'Coming soon',
    'En desarrollo': 'In development',
    'La tercera herramienta del paquete. Muy pronto.': 'The third tool in the package. Very soon.',
    'Abrir →': 'Open →',
    'Acceso a las tres': 'Access to all three',
    'Una semana': 'One week',
    'Un mes': 'One month',
    'Tres meses': 'Three months',
    'Recomendado': 'Recommended',
    'Suscribirme': 'Subscribe',
    'para probarlo': 'to try it out',
    'sale a cuenta': 'good value',
    'días': 'days',

    /* ── Liquidity Pools ── */
    'Filtro': 'Filter',
    'Todo': 'All',
    'Menos liquidez': 'Less liquidity',
    'Muros de liquidación': 'Liquidation walls',
    'Cómo funciona': 'How it works',
    'Cerrar': 'Close',
    'Reintentar': 'Retry',
    'Calculando zonas de liquidez…': 'Calculating liquidity zones…',
    'Cómo operar con esto': 'How to trade with this',
    'Cómo se lee el mapa': 'How to read the map',
    'Entendido': 'Got it',
    'Saber más': 'Learn more',
    'Atrás': 'Back',

    /* ── Radar Institucional ── */
    'Precio ahora': 'Price now',
    'En directo': 'Live',
    'Órdenes detectadas': 'Detected orders',
    'Soporte': 'Support',
    'Resistencia': 'Resistance',
    'Fuertes': 'Strong',
    'Falsas': 'Fake',
    'EN VENTA': 'SELLING',
    'EN COMPRA': 'BUYING',
    'Orden blindada': 'Shielded order',
    'Nivel probado': 'Tested level',
    'Orden firme': 'Firm order',
    'Orden falsa': 'Fake order',
    'En observación': 'Under watch',
    'Ha desaparecido': 'Gone',
    'Libro tranquilo': 'Quiet book',
    'Analizando el libro de órdenes': 'Analyzing the order book',
    'firme': 'firm',
    'repuesta': 'refilled',
    'ejecutado': 'executed',
    'fuerza': 'strength',
    'arriba': 'above',
    'abajo': 'below',

    /* ── Frases largas de la portada ── */
    'El libro de órdenes miente: la mayoría de las órdenes grandes son falsas. Vigilamos cada una y le decimos cuáles tienen dinero real detrás.':
      'The order book lies: most large orders are fake. We watch every one and tell you which have real money behind them.',
    'La tercera herramienta del paquete. Muy pronto.': 'The third tool in the package. Coming very soon.',
    'ahorras un 22%': 'save 22%',
    'ahorras un 48%': 'save 48%',
    '7 días': '7 days',
    '30 días': '30 days',
    '90 días': '90 days',
    'Se paga en': 'Paid in',
    'desde tu wallet. Si renuevas antes de que caduque, los días que te quedan se suman.':
      'from your wallet. If you renew before it expires, remaining days carry over.',
    'Tu acceso está activo': 'Your access is active',
    'Elige un plan para entrar a las herramientas.': 'Choose a plan to access the tools.',
    'Conecta tu wallet para poder suscribirte.': 'Connect your wallet to subscribe.',
    'El acceso queda ligado a tu wallet. Si renuevas antes de que caduque, los días que te quedan se suman.':
      'Access is tied to your wallet. If you renew before it expires, remaining days carry over.',
    '¿Con qué quieres pagar?': 'How would you like to pay?',
    'Confirma en tu wallet…': 'Confirm in your wallet…',
    '¡Listo! Ya tienes acceso.': 'Done! You now have access.',
    'Cancelaste la firma.': 'You cancelled the signature.',

    /* ── Comunes ── */
    'Buscar…': 'Search…',
    'Cargando…': 'Loading…',
    'Conectar wallet': 'Connect wallet',
    'Guardar imagen': 'Save image',
    'Aplicar': 'Apply',
    'Cancelar': 'Cancel',
    'Aceptar': 'Accept',
    'Volver': 'Back',
    'Siguiente': 'Next',

    /* ══════════════ BOTS ══════════════ */
    'Arma tu bot': 'Build your bot',
    'Bots activos': 'Active bots',
    'Bots creados (total)': 'Bots created (total)',
    'Bot creado el': 'Bot created on',
    'Smart Grid': 'Smart Grid',
    'Accumulator': 'Accumulator',
    'Cash Out': 'Cash Out',
    'Elige la moneda': 'Choose the coin',
    'Cantidad': 'Amount',
    'Cantidad a vender': 'Amount to sell',
    'Precio de entrada': 'Entry price',
    'Entrada': 'Entry',
    'Mercado': 'Market price',
    'Compra a': 'Buys at',
    'Separación': 'Spacing',
    'Ganancia': 'Profit',
    'Ganancia %': 'Profit %',
    'Flotante': 'Floating',
    'Nº compras': 'Buys',
    'Cerrar bot': 'Close bot',
    'Cerrar con ganancia': 'Close with profit',
    'Cerrar al %': 'Close at %',
    'Ajustar cuadrículas': 'Adjust grids',
    'Ampliar rango': 'Widen range',
    'Aplicar rango': 'Apply range',
    'Cada cuánto': 'How often',
    'Configuración': 'Settings',
    'Configuraciones rentables': 'Profitable setups',
    'Apalancamiento': 'Leverage',
    'Actualizar datos': 'Refresh data',
    'Actividad': 'Activity',
    'Operaciones': 'Trades',
    'Ciclos completados': 'Completed cycles',
    'Compras / ventas': 'Buys / sells',
    'Miembro desde': 'Member since',
    'Resultado': 'Result',
    'Volumen': 'Volume',
    'Rango': 'Range',
    'Mínimo': 'Minimum',
    'Máximo': 'Maximum',
    'Gas disponible': 'Gas available',
    'Gas gastado (total)': 'Gas spent (total)',
    'Cuota mensual': 'Monthly fee',
    'Suscripción y gas': 'Subscription and gas',
    'Tus bots por estrategia': 'Your bots by strategy',
    'Activa': 'Active',
    'Inactiva': 'Inactive',
    'Crear bot': 'Create bot',
    'Continuar': 'Continue',
    'Confirmar': 'Confirm',
    'Añadir gas': 'Add gas',
    'Retirar': 'Withdraw',
    'Retirar todo': 'Withdraw all',
    'Depositar': 'Deposit',
    'Caja fuerte': 'Vault',
    'Saldo': 'Balance',

    /* ══════════════ WALLET ══════════════ */
    'Conecta tu wallet': 'Connect your wallet',
    'Conectar wallet': 'Connect wallet',
    'Cambiar de wallet': 'Change wallet',
    'Cambiar a BNB Chain': 'Switch to BNB Chain',
    'Abrir en MetaMask': 'Open in MetaMask',
    'Abrir en Trust Wallet': 'Open in Trust Wallet',
    'Abrir en SafePal': 'Open in SafePal',
    'Buscando en BNB Chain…': 'Searching on BNB Chain…',
    'Abriendo tu panel…': 'Opening your panel…',
    'Tu nombre o alias': 'Your name or alias',
    'Ponle un nombre a tu cuenta': 'Give your account a name',
    'Ponle un nombre': 'Set a name',
    'Editar nombre': 'Edit name',
    'Tu cuenta': 'Your account',

    /* ══════════════ MARKET ══════════════ */
    'Marketplace': 'Marketplace',
    'Ofertas': 'Offers',
    'Vender': 'Sell',
    'Comprar': 'Buy',
    'Terminadas': 'Completed',
    'Disputas': 'Disputes',
    'Abrir disputa': 'Open dispute',
    'Cancelar pedido': 'Cancel order',
    'Cancelar y recuperar': 'Cancel and recover',
    'Acepta que le paguen': 'Accepts payment',
    'Cargando marketplace…': 'Loading marketplace…',
    'Cargando ofertas…': 'Loading offers…',
    'Avisos del Marketplace': 'Marketplace alerts',
    'Ocultar': 'Hide',
    'Ver todas': 'View all',
    'Nuevo': 'New',
    'Precio': 'Price',
    'Pagar': 'Pay',
    'Ya pagué': 'I paid',
    'Confirmar pago': 'Confirm payment',
    'Liberar fondos': 'Release funds',

    /* ══════════════ ACADEMIA ══════════════ */
    'Academy': 'Academy',
    'Abrir la Academia': 'Open the Academy',
    'Un mes': 'One month',
    'Tres meses': 'Three months',
    'Un año': 'One year',
    'para probar': 'to try it',
    'el más elegido': 'most chosen',
    'el que sale a cuenta': 'best value',
    'Ahora toca practicar.': 'Now it is time to practise.',
    'Tu usuario de Telegram': 'Your Telegram username',
    'Suscripción activa': 'Active subscription',
    'Te quedan': 'You have left',

    /* ══════════════ PRIZE POOL ══════════════ */
    'Cargando Prize Pool…': 'Loading Prize Pool…',
    'Participar': 'Enter',
    'Premio': 'Prize',
    'Participantes': 'Participants',
    'Sorteo': 'Draw',
    'Próximo sorteo': 'Next draw',
    'Ganador': 'Winner',
    'Historial': 'History',

    /* ══════════════ TOOLS ══════════════ */
    'Herramientas': 'Tools',
    'Alerta de precio': 'Price alert',
    'Alertas de precio': 'Price alerts',
    'Miedo y codicia': 'Fear and greed',
    'Análisis técnico': 'Technical analysis',
    'Mapa del mercado': 'Market map',
    'Gráfica en directo': 'Live chart',
    'Colector de polvo': 'Dust collector',
    'Consultando el índice…': 'Checking the index…',
    'Qué es esto': 'What is this',
    'sube a': 'rises to',
    'baja a': 'falls to',
    'Crear alerta': 'Create alert',
    'Mis alertas': 'My alerts',

    /* ══════════════ COMUNES ══════════════ */
    'Cerrar': 'Close',
    'Cancelar': 'Cancel',
    'Continuar': 'Continue',
    'Volver': 'Back',
    'Atrás': 'Back',
    'Ahora no': 'Not now',
    'Buscar…': 'Search…',
    'Cargando…': 'Loading…',
    'Aplicar': 'Apply',
    'Guardar': 'Save',
    'Borrar': 'Delete',
    'Editar': 'Edit',
    'Copiar': 'Copy',
    'Copiado': 'Copied',
    'Sí': 'Yes',
    'No': 'No',
    'Hoy': 'Today',
    'Ayer': 'Yesterday',
    'Tengo un problema': 'I have a problem',
    'opcional': 'optional',
    'cambiar': 'change',
    'elegir': 'choose',
    'gas': 'gas',

    /* ── Frases de cabecera de cada sección ── */
    'Compra y vende con caja fuerte': 'Buy and sell with escrow',
    'Cosas útiles para el día a día con tus bots.': 'Useful things for your day to day with bots.',
    'Junta los restos de monedas que te van quedando': 'Collect the leftover crumbs of coins',
    'De cero a operar con criterio': 'From zero to trading with judgement',
    'Una ruta ordenada, con exámenes para avanzar. No es una carpeta de vídeos.':
      'An ordered path, with exams to progress. Not a folder of videos.',
    'No se pudo cargar el Prize Pool ahora mismo.': 'Could not load the Prize Pool right now.',
    'Revisa tu conexión y vuelve a intentar.': 'Check your connection and try again.',
    'No se pudieron cargar los datos.': 'Could not load the data.',
    'Revisa tu conexión.': 'Check your connection.',
    'Cripto Cuba Academy': 'Cripto Cuba Academy',

    /* ══════════════ WALLET Y CONEXIÓN ══════════════ */
    'Sin conectar': 'Not connected',
    'Conectada': 'Connected',
    'Tus wallets': 'Your wallets',
    'Otra wallet (QR)': 'Other wallet (QR)',
    'Elige cómo quieres hacerlo.': 'Choose how you want to do it.',
    'Lo más sencillo': 'The simplest way',
    'Se abre CriptoCuba dentro de tu wallet y conecta solo.': 'CriptoCuba opens inside your wallet and connects on its own.',
    'Es una sola firma.': 'It is a single signature.',
    'Instalar': 'Install',
    'Usar': 'Use',
    'Mejor no': 'Not now',
    'Swap': 'Swap',

    /* ══════════════ BOTS ══════════════ */
    'Qué hace, en simple.': 'What it does, in plain terms.',
    'Por qué eso ayuda.': 'Why that helps.',
    '¿Por qué este bot da ganancia?': 'Why does this bot make a profit?',
    'Qué puede salir mal, sin adornos:': 'What can go wrong, no sugar-coating:',
    'Tres consejos concretos:': 'Three concrete tips:',
    'Lógica Estructural Avanzada': 'Advanced Structural Logic',
    'bots activos': 'active bots',
    'Compras': 'Buys',
    'Vendes': 'Sells',
    'compra': 'buy',
    'vende': 'sell',
    'Máx': 'Max',
    'Mín': 'Min',
    'Más': 'More',
    'Toca': 'Tap',
    'ya casi': 'almost there',
    'Tu dinero en la caja fuerte': 'Your money in the vault',
    '¿Cuál moneda?': 'Which coin?',
    '¿Cuántos': 'How many',
    'Escríbela tú': 'Type it yourself',
    'Otra': 'Other',
    'Tether · la más usada': 'Tether · the most used',
    'USD Coin': 'USD Coin',

    /* ══════════════ MARKET ══════════════ */
    'Quiero vender': 'I want to sell',
    'Quiero comprar': 'I want to buy',
    'Disputa': 'Dispute',
    'Razón al COMPRADOR': 'In favour of the BUYER',
    'Razón al VENDEDOR': 'In favour of the SELLER',
    'Anular · devolver todo': 'Void · return everything',
    'No hay publicaciones abiertas ahora mismo.': 'No open listings right now.',
    'No se pudo cargar.': 'Could not load.',
    'no se entrega de golpe': 'not delivered all at once',
    'Problema': 'Problem',

    /* ══════════════ PRIZE POOL ══════════════ */
    'más ganadores hay': 'the more winners there are',
    'Cómo funciona el sorteo': 'How the draw works',
    'Tus números': 'Your numbers',
    'Comprar número': 'Buy number',

    /* ══════════════ COMUNES ══════════════ */
    'Aviso': 'Notice',
    'Error': 'Error',
    'Listo': 'Done',
    'Espera': 'Wait',
    'Firmando…': 'Signing…',
    'Confirmando…': 'Confirming…',
    'Hecho': 'Done',
    'Ver más': 'See more',
    'Ver menos': 'See less',
    'Detalles': 'Details',
    'Ayuda': 'Help',
    'Siguiente paso': 'Next step',
    'Paso': 'Step',
    'de': 'of',
    'Total': 'Total',
    'Disponible': 'Available',
    'Pendiente': 'Pending',
    'Completado': 'Completed',
    'Cancelado': 'Cancelled',
    'En curso': 'In progress',
    'Sin datos': 'No data',
    'Actualizado': 'Updated',
    'hace': 'ago',
    'minutos': 'minutes',
    'horas': 'hours',
    'segundos': 'seconds',
    'Cambiar idioma': 'Change language',
    'Idioma': 'Language'
  },

  pt: {
    /* ── Menu principal ── */
    'Bots': 'Bots',
    'Market': 'Market',
    'Academia': 'Academia',
    'Tools': 'Ferramentas',
    'Prize Pool': 'Prize Pool',
    'Liquidity': 'Liquidity',
    'Perfil': 'Perfil',
    'Install': 'Instalar',
    'Compartir': 'Partilhar',

    /* ── Portada de Liquidity ── */
    'Herramientas Pro': 'Ferramentas Pro',
    'Análisis profesional': 'Análise profissional',
    'Tres herramientas para ver lo que el gráfico esconde': 'Três ferramentas para ver o que o gráfico esconde',
    'Liquidity Pools': 'Liquidity Pools',
    'Dónde está el dinero atrapado': 'Onde está o dinheiro preso',
    'El mapa de liquidaciones: los precios donde hay posiciones esperando a ser barridas. El precio va a buscarlas.':
      'O mapa de liquidações: os preços onde há posições à espera de serem varridas. O preço vai procurá-las.',
    'Radar Institucional': 'Radar Institucional',
    'Vea lo que hacen los grandes': 'Veja o que fazem os grandes',
    'El libro de órdenes miente: la mayoría de las órdenes grandes son falsas. Vigilamos cada una y le decimos cuáles tienen dinero real detrás.':
      'O livro de ordens mente: a maioria das ordens grandes são falsas. Vigiamos cada uma e dizemos-lhe quais têm dinheiro real por trás.',
    'Próximamente': 'Em breve',
    'En desarrollo': 'Em desenvolvimento',
    'La tercera herramienta del paquete. Muy pronto.': 'A terceira ferramenta do pacote. Muito em breve.',
    'Abrir →': 'Abrir →',
    'Acceso a las tres': 'Acesso às três',
    'Una semana': 'Uma semana',
    'Un mes': 'Um mês',
    'Tres meses': 'Três meses',
    'Recomendado': 'Recomendado',
    'Suscribirme': 'Subscrever',
    'para probarlo': 'para experimentar',
    'sale a cuenta': 'boa relação',
    'días': 'dias',
    'ahorras un 22%': 'poupa 22%',
    'ahorras un 48%': 'poupa 48%',
    '7 días': '7 dias',
    '30 días': '30 dias',
    '90 días': '90 dias',
    'Se paga en': 'Pago em',
    'desde tu wallet. Si renuevas antes de que caduque, los días que te quedan se suman.':
      'a partir da sua carteira. Se renovar antes de expirar, os dias restantes acumulam.',
    'Tu acceso está activo': 'O seu acesso está ativo',
    'Elige un plan para entrar a las herramientas.': 'Escolha um plano para aceder às ferramentas.',
    'Conecta tu wallet para poder suscribirte.': 'Ligue a sua carteira para subscrever.',
    'El acceso queda ligado a tu wallet. Si renuevas antes de que caduque, los días que te quedan se suman.':
      'O acesso fica ligado à sua carteira. Se renovar antes de expirar, os dias restantes acumulam.',
    '¿Con qué quieres pagar?': 'Como quer pagar?',
    'Confirma en tu wallet…': 'Confirme na sua carteira…',
    '¡Listo! Ya tienes acceso.': 'Pronto! Já tem acesso.',
    'Cancelaste la firma.': 'Cancelou a assinatura.',

    /* ── Liquidity Pools ── */
    'Filtro': 'Filtro',
    'Todo': 'Tudo',
    'Menos liquidez': 'Menos liquidez',
    'Muros de liquidación': 'Muros de liquidação',
    'Cómo funciona': 'Como funciona',
    'Cerrar': 'Fechar',
    'Reintentar': 'Tentar de novo',
    'Calculando zonas de liquidez…': 'A calcular zonas de liquidez…',
    'Cómo operar con esto': 'Como operar com isto',
    'Cómo se lee el mapa': 'Como ler o mapa',
    'Entendido': 'Entendido',
    'Saber más': 'Saber mais',
    'Atrás': 'Voltar',

    /* ── Radar Institucional ── */
    'Precio ahora': 'Preço agora',
    'En directo': 'Ao vivo',
    'Órdenes detectadas': 'Ordens detetadas',
    'Soporte': 'Suporte',
    'Resistencia': 'Resistência',
    'Fuertes': 'Fortes',
    'Falsas': 'Falsas',
    'EN VENTA': 'À VENDA',
    'EN COMPRA': 'EM COMPRA',
    'Orden blindada': 'Ordem blindada',
    'Nivel probado': 'Nível testado',
    'Orden firme': 'Ordem firme',
    'Orden falsa': 'Ordem falsa',
    'En observación': 'Em observação',
    'Ha desaparecido': 'Desapareceu',
    'Libro tranquilo': 'Livro tranquilo',
    'Analizando el libro de órdenes': 'A analisar o livro de ordens',
    'firme': 'firme',
    'repuesta': 'reposta',
    'ejecutado': 'executado',
    'fuerza': 'força',
    'arriba': 'acima',
    'abajo': 'abaixo',

    /* ── Comuns ── */
    'Buscar…': 'Procurar…',
    'Cargando…': 'A carregar…',
    'Conectar wallet': 'Ligar carteira',
    'Guardar imagen': 'Guardar imagem',
    'Aplicar': 'Aplicar',
    'Cancelar': 'Cancelar',
    'Aceptar': 'Aceitar',
    'Volver': 'Voltar',
    'Siguiente': 'Seguinte',

    /* ══════════════ BOTS ══════════════ */
    'Arma tu bot': 'Monte o seu bot',
    'Bots activos': 'Bots ativos',
    'Bots creados (total)': 'Bots criados (total)',
    'Bot creado el': 'Bot criado em',
    'Elige la moneda': 'Escolha a moeda',
    'Cantidad': 'Quantidade',
    'Cantidad a vender': 'Quantidade a vender',
    'Precio de entrada': 'Preço de entrada',
    'Entrada': 'Entrada',
    'Mercado': 'Mercado',
    'Compra a': 'Compra a',
    'Separación': 'Separação',
    'Ganancia': 'Lucro',
    'Ganancia %': 'Lucro %',
    'Flotante': 'Flutuante',
    'Nº compras': 'Nº compras',
    'Cerrar bot': 'Fechar bot',
    'Cerrar con ganancia': 'Fechar com lucro',
    'Ajustar cuadrículas': 'Ajustar grelhas',
    'Ampliar rango': 'Alargar intervalo',
    'Aplicar rango': 'Aplicar intervalo',
    'Cada cuánto': 'De quanto em quanto',
    'Configuración': 'Configuração',
    'Configuraciones rentables': 'Configurações rentáveis',
    'Apalancamiento': 'Alavancagem',
    'Actualizar datos': 'Atualizar dados',
    'Actividad': 'Atividade',
    'Operaciones': 'Operações',
    'Ciclos completados': 'Ciclos concluídos',
    'Compras / ventas': 'Compras / vendas',
    'Miembro desde': 'Membro desde',
    'Resultado': 'Resultado',
    'Volumen': 'Volume',
    'Rango': 'Intervalo',
    'Mínimo': 'Mínimo',
    'Máximo': 'Máximo',
    'Gas disponible': 'Gás disponível',
    'Gas gastado (total)': 'Gás gasto (total)',
    'Cuota mensual': 'Mensalidade',
    'Suscripción y gas': 'Subscrição e gás',
    'Tus bots por estrategia': 'Os seus bots por estratégia',
    'Activa': 'Ativa',
    'Inactiva': 'Inativa',
    'Crear bot': 'Criar bot',
    'Continuar': 'Continuar',
    'Confirmar': 'Confirmar',
    'Añadir gas': 'Adicionar gás',
    'Retirar': 'Levantar',
    'Retirar todo': 'Levantar tudo',
    'Depositar': 'Depositar',
    'Caja fuerte': 'Cofre',
    'Saldo': 'Saldo',

    /* ══════════════ WALLET ══════════════ */
    'Conecta tu wallet': 'Ligue a sua carteira',
    'Conectar wallet': 'Ligar carteira',
    'Cambiar de wallet': 'Mudar de carteira',
    'Cambiar a BNB Chain': 'Mudar para BNB Chain',
    'Buscando en BNB Chain…': 'A procurar na BNB Chain…',
    'Abriendo tu panel…': 'A abrir o seu painel…',
    'Tu nombre o alias': 'O seu nome ou alcunha',
    'Ponle un nombre a tu cuenta': 'Dê um nome à sua conta',
    'Ponle un nombre': 'Dar um nome',
    'Editar nombre': 'Editar nome',
    'Tu cuenta': 'A sua conta',

    /* ══════════════ MARKET ══════════════ */
    'Marketplace': 'Marketplace',
    'Ofertas': 'Ofertas',
    'Vender': 'Vender',
    'Comprar': 'Comprar',
    'Terminadas': 'Concluídas',
    'Disputas': 'Disputas',
    'Abrir disputa': 'Abrir disputa',
    'Cancelar pedido': 'Cancelar pedido',
    'Cancelar y recuperar': 'Cancelar e recuperar',
    'Cargando marketplace…': 'A carregar marketplace…',
    'Cargando ofertas…': 'A carregar ofertas…',
    'Avisos del Marketplace': 'Avisos do Marketplace',
    'Ocultar': 'Ocultar',
    'Ver todas': 'Ver todas',
    'Nuevo': 'Novo',
    'Precio': 'Preço',
    'Pagar': 'Pagar',
    'Ya pagué': 'Já paguei',
    'Confirmar pago': 'Confirmar pagamento',
    'Liberar fondos': 'Libertar fundos',

    /* ══════════════ ACADEMIA ══════════════ */
    'Academy': 'Academia',
    'Abrir la Academia': 'Abrir a Academia',
    'Un mes': 'Um mês',
    'Tres meses': 'Três meses',
    'Un año': 'Um ano',
    'para probar': 'para experimentar',
    'el más elegido': 'o mais escolhido',
    'Tu usuario de Telegram': 'O seu utilizador do Telegram',
    'Suscripción activa': 'Subscrição ativa',
    'Te quedan': 'Faltam-lhe',

    /* ══════════════ PRIZE POOL ══════════════ */
    'Cargando Prize Pool…': 'A carregar Prize Pool…',
    'Participar': 'Participar',
    'Premio': 'Prémio',
    'Participantes': 'Participantes',
    'Sorteo': 'Sorteio',
    'Próximo sorteo': 'Próximo sorteio',
    'Ganador': 'Vencedor',
    'Historial': 'Histórico',

    /* ══════════════ TOOLS ══════════════ */
    'Herramientas': 'Ferramentas',
    'Alerta de precio': 'Alerta de preço',
    'Alertas de precio': 'Alertas de preço',
    'Miedo y codicia': 'Medo e ganância',
    'Análisis técnico': 'Análise técnica',
    'Mapa del mercado': 'Mapa do mercado',
    'Gráfica en directo': 'Gráfico ao vivo',
    'Colector de polvo': 'Coletor de pó',
    'Consultando el índice…': 'A consultar o índice…',
    'Qué es esto': 'O que é isto',
    'sube a': 'sobe a',
    'baja a': 'desce a',
    'Crear alerta': 'Criar alerta',
    'Mis alertas': 'Os meus alertas',

    /* ══════════════ COMUNS ══════════════ */
    'Continuar': 'Continuar',
    'Volver': 'Voltar',
    'Ahora no': 'Agora não',
    'Guardar': 'Guardar',
    'Borrar': 'Apagar',
    'Editar': 'Editar',
    'Copiar': 'Copiar',
    'Copiado': 'Copiado',
    'Sí': 'Sim',
    'No': 'Não',
    'Hoy': 'Hoje',
    'Ayer': 'Ontem',
    'Tengo un problema': 'Tenho um problema',
    'opcional': 'opcional',
    'cambiar': 'mudar',
    'elegir': 'escolher',
    'gas': 'gás',

    /* ── Frases de cabeçalho de cada secção ── */
    'Compra y vende con caja fuerte': 'Compre e venda com cofre',
    'Cosas útiles para el día a día con tus bots.': 'Coisas úteis para o dia a dia com os seus bots.',
    'Junta los restos de monedas que te van quedando': 'Junta os restos de moedas que vão sobrando',
    'De cero a operar con criterio': 'Do zero a operar com critério',
    'Una ruta ordenada, con exámenes para avanzar. No es una carpeta de vídeos.':
      'Um percurso ordenado, com exames para avançar. Não é uma pasta de vídeos.',
    'No se pudo cargar el Prize Pool ahora mismo.': 'Não foi possível carregar o Prize Pool agora.',
    'Revisa tu conexión y vuelve a intentar.': 'Verifique a sua ligação e tente de novo.',
    'No se pudieron cargar los datos.': 'Não foi possível carregar os dados.',
    'Revisa tu conexión.': 'Verifique a sua ligação.',

    /* ══════════════ CARTEIRA ══════════════ */
    'Sin conectar': 'Não ligado',
    'Conectada': 'Ligada',
    'Tus wallets': 'As suas carteiras',
    'Otra wallet (QR)': 'Outra carteira (QR)',
    'Elige cómo quieres hacerlo.': 'Escolha como quer fazer.',
    'Lo más sencillo': 'O mais simples',
    'Es una sola firma.': 'É uma única assinatura.',
    'Instalar': 'Instalar',
    'Usar': 'Usar',
    'Mejor no': 'Agora não',
    'Swap': 'Swap',

    /* ══════════════ BOTS ══════════════ */
    'Qué hace, en simple.': 'O que faz, em simples.',
    'Por qué eso ayuda.': 'Porque isso ajuda.',
    '¿Por qué este bot da ganancia?': 'Porque é que este bot dá lucro?',
    'Qué puede salir mal, sin adornos:': 'O que pode correr mal, sem rodeios:',
    'Tres consejos concretos:': 'Três conselhos concretos:',
    'Lógica Estructural Avanzada': 'Lógica Estrutural Avançada',
    'bots activos': 'bots ativos',
    'Compras': 'Compras',
    'Vendes': 'Vendas',
    'compra': 'compra',
    'vende': 'venda',
    'Máx': 'Máx',
    'Mín': 'Mín',
    'Más': 'Mais',
    'Toca': 'Toque',
    'Tu dinero en la caja fuerte': 'O seu dinheiro no cofre',
    '¿Cuál moneda?': 'Qual moeda?',
    'Escríbela tú': 'Escreva você',
    'Otra': 'Outra',

    /* ══════════════ MARKET ══════════════ */
    'Quiero vender': 'Quero vender',
    'Quiero comprar': 'Quero comprar',
    'Disputa': 'Disputa',
    'Razón al COMPRADOR': 'A favor do COMPRADOR',
    'Razón al VENDEDOR': 'A favor do VENDEDOR',
    'No hay publicaciones abiertas ahora mismo.': 'Não há publicações abertas neste momento.',
    'No se pudo cargar.': 'Não foi possível carregar.',
    'Problema': 'Problema',

    /* ══════════════ COMUNS ══════════════ */
    'Aviso': 'Aviso',
    'Error': 'Erro',
    'Listo': 'Pronto',
    'Espera': 'Aguarde',
    'Firmando…': 'A assinar…',
    'Confirmando…': 'A confirmar…',
    'Hecho': 'Feito',
    'Ver más': 'Ver mais',
    'Ver menos': 'Ver menos',
    'Detalles': 'Detalhes',
    'Ayuda': 'Ajuda',
    'Paso': 'Passo',
    'de': 'de',
    'Total': 'Total',
    'Disponible': 'Disponível',
    'Pendiente': 'Pendente',
    'Completado': 'Concluído',
    'Cancelado': 'Cancelado',
    'En curso': 'Em curso',
    'Sin datos': 'Sem dados',
    'Actualizado': 'Atualizado',
    'hace': 'há',
    'minutos': 'minutos',
    'horas': 'horas',
    'segundos': 'segundos',
    'Cambiar idioma': 'Mudar idioma',
    'Idioma': 'Idioma'
  }
};

/* ══════════════════════════════════════════════════════════════
   ESTADO
   ══════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════
   QUÉ IDIOMA MOSTRAR

   1. Si el usuario ya eligió uno, ese manda siempre.
   2. Si no, se mira el idioma del navegador: quien entra desde
      Estados Unidos con Chrome en inglés ve la web en inglés sin
      tocar nada, y quien entra desde México la ve en español.
   3. Si no reconocemos el idioma, español.

   Así se capta el público de fuera sin obligar a nadie a buscar el
   selector, y el de casa no nota ningún cambio.
   ══════════════════════════════════════════════════════════════ */
let _idioma = 'es';
let _autodetectado = false;

try {
  const g = localStorage.getItem(CLAVE);
  if (g && (g === 'es' || DIC[g])) {
    // El usuario ya decidió: se respeta y no se toca más
    _idioma = g;
  } else {
    const nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    const base = String(nav).toLowerCase().slice(0, 2);
    if (base === 'pt') { _idioma = 'pt'; _autodetectado = true; }
    else if (base && base !== 'es') { _idioma = 'en'; _autodetectado = true; }
    // Cualquier variante de español (es-MX, es-ES, es-CU…) se queda en 'es'
  }
} catch (_) {
  /* Si el navegador bloquea el almacenamiento, se queda en español.
     No es motivo para romper nada. */
}

/** ¿El idioma lo elegimos nosotros o el usuario? */
export const esAutodetectado = () => _autodetectado;

export const idiomaActual = () => _idioma;

/** Traduce un texto. Si no está en el diccionario, se devuelve igual. */
export function t(texto) {
  if (_idioma === 'es' || !texto) return texto;
  const d = DIC[_idioma];
  if (!d) return texto;
  return d[texto] || texto;
}

/* ══════════════════════════════════════════════════════════════
   TRADUCIR LO QUE YA ESTÁ EN PANTALLA

   Se recorren los nodos de texto y se sustituyen los que estén en el
   diccionario. Se deja intacto todo lo que no reconozcamos: números,
   precios, direcciones de wallet y cualquier texto sin traducción.
   ══════════════════════════════════════════════════════════════ */
function traducirNodo(raiz) {
  if (_idioma === 'es') return;
  const d = DIC[_idioma];
  if (!d || !raiz) return;

  try {
    const paseo = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        // Ni scripts ni estilos: ahí no hay nada que traducir
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const et = p.tagName;
        if (et === 'SCRIPT' || et === 'STYLE' || et === 'CANVAS') return NodeFilter.FILTER_REJECT;
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const pendientes = [];
    let n;
    while ((n = paseo.nextNode())) pendientes.push(n);

    pendientes.forEach((nodo) => {
      const original = nodo.nodeValue;
      const limpio = original.trim();
      /* Se busca tal cual y, si no, en minúsculas: muchos títulos van
         en mayúsculas por CSS pero en el código están normales. */
      let trad = d[limpio];
      if (!trad) {
        const clave = Object.keys(d).find((k) => k.toLowerCase() === limpio.toLowerCase());
        if (clave) trad = d[clave];
      }
      if (trad && trad !== limpio) {
        // Se conserva el espaciado original alrededor del texto
        nodo.nodeValue = original.replace(limpio, trad);
      }
    });

    // Los marcadores de posición y los títulos emergentes
    raiz.querySelectorAll('[placeholder]').forEach((el) => {
      const v = d[el.placeholder];
      if (v) el.placeholder = v;
    });
    raiz.querySelectorAll('[title]').forEach((el) => {
      const v = d[el.title];
      if (v) el.title = v;
    });
  } catch (_) {
    /* Si algo falla al recorrer el árbol, se abandona en silencio:
       la página se queda en español, que es perfectamente usable. */
  }
}

/** Traduce toda la página. */
export function traducirTodo() {
  traducirNodo(document.body);
}

/* Las ventanas se crean después de cargar la página (bots, market,
   liquidity…). Un observador las traduce en cuanto aparecen. */
let _observador = null;

function vigilar() {
  if (_observador || _idioma === 'es') return;
  try {
    _observador = new MutationObserver((cambios) => {
      cambios.forEach((c) => {
        c.addedNodes.forEach((n) => {
          if (n.nodeType === 1) traducirNodo(n);
        });
      });
    });
    _observador.observe(document.body, { childList: true, subtree: true });
  } catch (_) {}
}

function dejarDeVigilar() {
  try { if (_observador) { _observador.disconnect(); _observador = null; } } catch (_) {}
}

/* ══════════════════════════════════════════════════════════════
   CAMBIAR DE IDIOMA
   ══════════════════════════════════════════════════════════════ */
export function cambiarIdioma(id) {
  if (id !== 'es' && !DIC[id]) return;
  _idioma = id;
  _autodetectado = false;
  try { localStorage.setItem(CLAVE, id); } catch (_) {}

  /* Volver al español obliga a recargar: el texto original ya se
     sustituyó y no hay forma limpia de deshacerlo. Es un instante y
     garantiza que la página queda exactamente como estaba. */
  if (id === 'es') {
    dejarDeVigilar();
    location.reload();
    return;
  }

  document.documentElement.lang = id;
  traducirTodo();
  vigilar();
}

/** Arranca al cargar la página, si había un idioma guardado. */
export function arrancarIdioma() {
  if (_idioma === 'es') return;
  /* Si el idioma vino del navegador, se guarda para que la próxima
     visita no tenga que volver a detectarlo. */
  if (_autodetectado) { try { localStorage.setItem(CLAVE, _idioma); } catch (_) {} }
  document.documentElement.lang = _idioma;
  traducirTodo();
  vigilar();
}
