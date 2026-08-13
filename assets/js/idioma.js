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
  { id: 'es', nombre: 'Español',  bandera: '🇪🇸' },
  { id: 'en', nombre: 'English',  bandera: '🇺🇸' },
  { id: 'pt', nombre: 'Português', bandera: '🇧🇷' }
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
    'Siguiente': 'Next'
  },

  pt: {
    'Academia': 'Academia',
    'Perfil': 'Perfil',
    'Herramientas Pro': 'Ferramentas Pro',
    'Análisis profesional': 'Análise profissional',
    'Tres herramientas para ver lo que el gráfico esconde': 'Três ferramentas para ver o que o gráfico esconde',
    'Dónde está el dinero atrapado': 'Onde está o dinheiro preso',
    'Radar Institucional': 'Radar Institucional',
    'Vea lo que hacen los grandes': 'Veja o que fazem os grandes',
    'Próximamente': 'Em breve',
    'En desarrollo': 'Em desenvolvimento',
    'Abrir →': 'Abrir →',
    'Acceso a las tres': 'Acesso às três',
    'Una semana': 'Uma semana',
    'Un mes': 'Um mês',
    'Tres meses': 'Três meses',
    'Recomendado': 'Recomendado',
    'Suscribirme': 'Assinar',
    'días': 'dias',
    'Precio ahora': 'Preço agora',
    'En directo': 'Ao vivo',
    'Órdenes detectadas': 'Ordens detectadas',
    'Soporte': 'Suporte',
    'Resistencia': 'Resistência',
    'Fuertes': 'Fortes',
    'Falsas': 'Falsas',
    'EN VENTA': 'VENDENDO',
    'EN COMPRA': 'COMPRANDO',
    'Cómo funciona': 'Como funciona',
    'Cerrar': 'Fechar',
    'Entendido': 'Entendido',
    'Saber más': 'Saber mais',
    'Atrás': 'Voltar',
    'Buscar…': 'Buscar…',
    'Cargando…': 'Carregando…',
    'Filtro': 'Filtro',
    'Todo': 'Tudo',
    'ahorras un 22%': 'poupa 22%',
    'ahorras un 48%': 'poupa 48%',
    '7 días': '7 dias',
    '30 días': '30 dias',
    '90 días': '90 dias',
    'para probarlo': 'para experimentar',
    'sale a cuenta': 'boa relação',
    'Se paga en': 'Pago em',
    'Tu acceso está activo': 'O seu acesso está ativo',
    'Cargando…': 'Carregando…'
  }
};

/* ══════════════════════════════════════════════════════════════
   ESTADO
   ══════════════════════════════════════════════════════════════ */
let _idioma = 'es';

try {
  const g = localStorage.getItem(CLAVE);
  if (g && (g === 'es' || DIC[g])) _idioma = g;
} catch (_) {
  /* Si el navegador bloquea el almacenamiento, se queda en español.
     No es motivo para romper nada. */
}

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
      const trad = d[limpio];
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
  document.documentElement.lang = _idioma;
  traducirTodo();
  vigilar();
}
