/**
 * EL VERSO DEL DÍA
 * ================
 *
 * Tradición cubana: cada día circula un verso, una adivinanza que alude a un
 * número de la charada. "Es verde, salta y le gusta la humedad" -> la rana.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  REGLA DE ORO — NO TOCAR                                             │
 * │                                                                      │
 * │  EL VERSO NO TIENE NINGUNA RELACIÓN CON EL NÚMERO QUE SALE.          │
 * │                                                                      │
 * │  Se elige a partir de la FECHA, nada más. El sorteo lo decide el     │
 * │  contrato con su fuente de azar, en otro momento y por otra vía.     │
 * │  Son dos cosas completamente separadas y NUNCA se deben cruzar.      │
 * │                                                                      │
 * │  Si alguna vez el verso se generara a partir del número ganador,     │
 * │  la banca quedaría expuesta: todo el mundo jugaría ese número y      │
 * │  habría que pagar a todos a la vez.                                  │
 * │                                                                      │
 * │  El verso es tradición y ambiente. Cada quien decide si guiarse por  │
 * │  él o jugar lo que le dé la gana.                                    │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * PARA AÑADIR VERSOS: escribe aquí abajo. El archivo vive en
 * assets/js/versos.js y no necesita nada más.
 */

export const VERSOS = [
  { texto: 'Corre sin patas de goma, no come pero se cansa, lleva al hombre y no lo abraza.', pista: 'lo que corre' },
  { texto: 'Viste de luto sin pena, calla lo que nadie dice, y a todos nos da la mano una vez.', pista: 'lo que llega' },
  { texto: 'Con capa de terciopelo baila de flor en flor, no sabe que fue gusano.', pista: 'lo que vuela' },
  { texto: 'Cuatro patas de silencio, ojos que ven en lo oscuro, dueño de la casa ajena.', pista: 'lo que ronda' },
  { texto: 'Sube y no baja escalera, alumbra sin ser candela, todos la miran de noche.', pista: 'lo que brilla' },
  { texto: 'Lleva la casa a la espalda y aun así nunca llega tarde.', pista: 'lo que carga' },
  { texto: 'Canta antes que el día, no sabe leer la hora y nunca se equivoca.', pista: 'lo que anuncia' },
  { texto: 'Va vestida de agua, no tiene voz ni pies, y en la mesa manda.', pista: 'lo que nada' },
  { texto: 'De arriba viene, de arriba manda, calienta al pobre y al rico igual.', pista: 'lo que arde arriba' },
  { texto: 'Todos lo buscan, pocos lo guardan, y el que lo tiene no lo dice.', pista: 'lo que se cuenta' },
  { texto: 'Anda de noche sin permiso, roba sin manos y deja miga.', pista: 'lo que husmea' },
  { texto: 'Sin brazos abraza el tronco, sin veneno da miedo, y en el monte es rey callado.', pista: 'lo que se arrastra' },
  { texto: 'Blanco por dentro, duro por fuera, guarda agua sin ser jarra.', pista: 'lo que se abre' },
  { texto: 'Con una pata baila, con la otra pica, y en la tierra escribe.', pista: 'lo que camina raro' },
  { texto: 'Habla sin lengua, repite sin memoria, y siempre te dice la verdad de frente.', pista: 'lo que refleja' },
  { texto: 'Se viste de humo, muere de a poquito, y en la boca del hombre se acaba.', pista: 'lo que se consume' },
  { texto: 'Va y viene por el mismo camino, silba antes de llegar, y nadie lo detiene.', pista: 'lo que pasa de largo' },
  { texto: 'Cae del cielo con cola larga, y el que la ve pide un deseo.', pista: 'lo que cruza' },
  { texto: 'Sin escalera sube al techo, sin permiso entra a la casa, y de todos se ríe.', pista: 'lo que trepa' },
  { texto: 'Manda sin ser dueño, cobra sin vender, y todos lo esperan de lejos.', pista: 'lo que vigila' },
  { texto: 'De dos en dos se hace uno, y lo que se firma no se borra fácil.', pista: 'lo que une' },
  { texto: 'Grande y manso, tira del día entero sin quejarse una vez.', pista: 'lo que arrastra' },
  { texto: 'Le dicen sabia y da miedo, canta de noche en el árbol.', pista: 'lo que avisa' },
  { texto: 'Se para en la mano y no pesa, canta gratis y no cobra.', pista: 'lo que pía' },
  { texto: 'Alta y sola en el camino, da sombra y no pide nada.', pista: 'lo que se alza' },
  { texto: 'Lo que se rompe y no se arregla, aunque los dos lo hayan firmado.', pista: 'lo que separa' },
  { texto: 'Chiquito y molesto, canta en la oreja y no deja dormir.', pista: 'lo que zumba' },
  { texto: 'Va al mar sin miedo, vuelve con la red llena o vacía, y nunca cambia de oficio.', pista: 'lo que espera' },
  { texto: 'Corre por el llano con corona de rama.', pista: 'lo que huye' },
  { texto: 'Le dicen fino y anda descalzo, cae de pie siempre.', pista: 'lo que cae bien' },
  { texto: 'Se come el rastro y no engorda, ocho patas y ni un zapato.', pista: 'lo que teje' },
  { texto: 'Sin ser río lleva agua, sin ser cielo tiene fondo.', pista: 'lo que hunde' },
  { texto: 'Todo el mundo lo tiene y nadie lo quiere, se va cuando llega la luz.', pista: 'lo que aprieta' },
  { texto: 'Llega temprano y se va tarde, viste de blanco y sabe de fuego.', pista: 'lo que sirve' },
  { texto: 'Redondo y rojo, alegra el plato sin decir nada.', pista: 'lo que madura' },
  { texto: 'De hierro y viento, corta lo que toca y no sabe llorar.', pista: 'lo que hiere' },
  { texto: 'Le rezan de rodillas y él no cobra por oír.', pista: 'lo que escucha' },
  { texto: 'Sube ligero y no vuelve, y el niño lo suelta llorando.', pista: 'lo que se escapa' },
  { texto: 'Duerme de día, vuela de noche, y del techo cuelga al revés.', pista: 'lo que cuelga' },
  { texto: 'Vino con uno y se va con todos, hermano de sangre o de calle.', pista: 'lo que acompaña' }
];

/**
 * Verso de un día concreto.
 *
 * Se deriva SOLO de la fecha. No sabe nada del sorteo ni puede saberlo:
 * este archivo no importa nada del contrato ni del generador de números.
 *
 * @param {Date} [fecha]
 */
export function versoDelDia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth() + 1;
  const d = fecha.getDate();

  // Semilla estable por día: mismo verso durante toda la jornada
  const semilla = y * 10000 + m * 100 + d;

  // Mezcla sencilla para que días seguidos no den versos contiguos
  let h = semilla;
  h = (h ^ 61) ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4eb2d);
  h = h ^ (h >>> 15);

  const indice = Math.abs(h) % VERSOS.length;
  return { ...VERSOS[indice], fecha: `${d}/${m}/${y}` };
}
