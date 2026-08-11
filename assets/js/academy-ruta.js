// academy-ruta.js — El panel de aprendizaje: qué hay, en qué orden y dónde.
//
// Se carga SOLO cuando alguien tiene acceso, así que un visitante normal
// nunca descarga este archivo.
//
// Los enlaces del grupo son públicos a propósito: apuntan a un grupo
// privado de Telegram. Quien no haya pagado y esté dentro del grupo, no
// puede abrirlos aunque los copie del código.

const G = 'https://t.me/c/3416110795/';

/* ── Las 17 clases: cada una con su vídeo y su examen ── */
export const CLASES = [
  { n: 1,  t: '¿Qué es una criptomoneda?',        v: G + '53', e: 'Examen-1-' },
  { n: 2,  t: '¿Qué es un exchange?',             v: G + '54', e: 'Examen-2-Exchange' },
  { n: 3,  t: '¿Qué es el apalancamiento?',       v: G + '55', e: 'apalancamiento' },
  { n: 4,  t: '¿Qué es el spread?',               v: G + '56', e: 'Spread' },
  { n: 5,  t: 'Volumen, soporte y resistencia',   v: G + '57', e: 'Volumen-soporte-y-resistencia' },
  { n: 6,  t: '¿Qué es el trading institucional?', v: G + '58', e: 'Fundamentos-del-Dinero' },
  { n: 7,  t: 'Margen aislado y margen cruzado',  v: G + '59', e: 'margen' },
  { n: 8,  t: '¿Qué es el stop loss?',            v: G + '60', e: 'Stop-Loss' },
  { n: 9,  t: '¿Qué es el take profit?',          v: G + '61', e: 'Take-Profit' },
  { n: 10, t: 'Análisis técnico y fundamental',   v: G + '62', e: 'An-lisis-T-cnico' },
  { n: 11, t: '¿Qué es la liquidez?',             v: G + '63', e: 'Liquidez' },
  { n: 12, t: '¿Qué son los pares?',              v: G + '92', e: 'los-PARES' },
  { n: 13, t: 'Mercado spot y mercado de futuros', v: G + '95', e: 'Spot-y-Futuros' },
  { n: 14, t: 'Orden de mercado y orden límite',  v: G + '96', e: 'Orden' },
  { n: 15, t: '¿Qué es un gráfico?',              v: G + '97', e: 'gr-fico' },
  { n: 16, t: '¿Qué es TradingView?',             v: G + '98', e: 'TradingView' },
  { n: 17, t: 'Long (largo) y short (corto)',     v: G + '99', e: 'LONG-y-SHORT' }
];

const EX = (slug) => 'https://cybersecureaid.github.io/' + slug + '/';
export const examenDe = (c) => EX(c.e);

/* ── Los 20 audiolibros. El primero va como 0: es la base, no un capítulo más ── */
export const AUDIOS = [
  { n: 0,  t: 'Masterclass Premium: ¿Qué es el dinero?', v: G + '67', destacado: true },
  { n: 1,  t: 'Hazte caro y cobra en oro',        v: G + '69' },
  { n: 2,  t: 'Oblígate a creer en ti',           v: G + '70' },
  { n: 3,  t: 'Despierta',                        v: G + '71' },
  { n: 4,  t: 'Ordena tus hábitos',               v: G + '72' },
  { n: 5,  t: 'No te rindas',                     v: G + '73' },
  { n: 6,  t: 'Oblígate a ser disciplinado',      v: G + '74' },
  { n: 7,  t: 'Desintoxica tu mente',             v: G + '75' },
  { n: 8,  t: 'El trader disciplinado',           v: G + '76' },
  { n: 9,  t: 'Las 25 reglas',                    v: G + '77' },
  { n: 10, t: 'Cómo salir adelante',              v: G + '78' },
  { n: 11, t: 'Guarda silencio y enfócate',       v: G + '79' },
  { n: 12, t: 'Mente y cuerpo',                   v: G + '80' },
  { n: 13, t: 'Imparable',                        v: G + '81' },
  { n: 14, t: 'Vivir del trading',                v: G + '82' },
  { n: 15, t: 'Tu máximo potencial',              v: G + '83' },
  { n: 16, t: 'La calma y las emociones',         v: G + '84' },
  { n: 17, t: 'Programa tu autoestima',           v: G + '85' },
  { n: 18, t: 'La verdad sobre las ansiedades',   v: G + '86' },
  { n: 19, t: 'El dinero y la mente',             v: G + '87' }
];

/* ── El resto ── */
export const OTROS = {
  riesgo:   { t: 'Plan de gestión de riesgo', v: G + '51', e: EX('Plan-de-Gesti-n-de-Riesgo') },
  direccion:{ t: 'Identifica la dirección en el mercado', v: G + '101' },
  fase1:    { t: 'Fase 1 · Determina la tendencia', v: G + '143' },
  repaso:   { t: 'Repaso especial de la Fase 1', v: G + '146', e: EX('Repaso') },
  fase2:    { t: 'Fase 2 · Zona Swing', v: G + '149' },
  fase3:    { t: 'Fase 3 · Continuidad de movimiento y rango', v: G + '152' },
  ej1:      { t: 'Ejemplos de operaciones · 1', v: G + '107' },
  ej2:      { t: 'Ejemplos de operaciones · 2', v: G + '114' },
  ej3:      { t: 'Ejemplos de operaciones · 3', v: G + '128' },
  contexto: { t: 'Guía de contexto', v: G + '134' },
  tuto1:    { t: 'Tutorial de TradingView · 1', v: G + '89' },
  tuto2:    { t: 'Tutorial de TradingView · 2', v: G + '90' },
  softGen:  { t: 'Software de aprendizaje general', e: 'https://cybersecureaid.github.io/test.com/' }
};

/* Las cinco secciones del panel. Cada una es una pestaña: así se evita
   el scroll infinito y el usuario ve dónde está en todo momento. */
/* Cinco etapas EN ORDEN. Se numeran a propósito: sin el número, el
   usuario cree que son cinco cajones sueltos y se queda en el primero.
   Con número entiende que hay un camino y que le falta recorrerlo. */
export const SECCIONES = [
  { id: 'empieza',    n: 1, t: 'Empieza aquí',   corto: 'Empieza',    ico: 'bandera', sig: 'clases' },
  { id: 'clases',     n: 2, t: 'Las 17 clases',  corto: 'Clases',     ico: 'clase',   sig: 'estrategia' },
  { id: 'estrategia', n: 3, t: 'La estrategia',  corto: 'Estrategia', ico: 'diana',   sig: 'audios' },
  { id: 'audios',     n: 4, t: 'Audiolibros',    corto: 'Audios',     ico: 'audio',   sig: 'extras' },
  { id: 'extras',     n: 5, t: 'Herramientas',   corto: 'Extras',     ico: 'llave',   sig: null }
];

export const ICONOS = {
  bandera: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  clase:   '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  diana:   '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
  audio:   '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  llave:   '<path d="M12.6 11.4a6 6 0 1 0-8.5 8.5 6 6 0 0 0 8.5-8.5zm0 0L21 3m-3 3 2 2m-5 1 2 2"/>',
  play:    '<path d="M6 4l14 8-14 8z"/>',
  test:    '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
};
