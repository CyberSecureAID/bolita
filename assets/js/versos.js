/**
 * EL VERSO DEL DÍA
 * ================
 *
 * Tradición cubana: cada día circula un verso, una adivinanza que alude a
 * alguna figura de la charada. Aquí hay 99, uno por cada número del tablero.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  EL VERSO SE ELIGE SOLO POR LA FECHA.                                │
 * │                                                                      │
 * │  Este archivo no importa nada del sorteo y no puede conocerlo. El    │
 * │  número lo decide el contrato por otra vía y en otro momento. Nunca  │
 * │  se deben cruzar: si el verso saliera del número ganador, todo el    │
 * │  mundo jugaría lo mismo y habría que pagar a todos a la vez.         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Para añadir versos, escribe dentro del array. Nada más que tocar.
 */

export const VERSOS = [
  'Corre sin patas de goma, no come pero se cansa, lleva al hombre y no lo abraza.',
  'Con capa de terciopelo baila de flor en flor, y no recuerda que fue gusano.',
  'Sale de madrugada, vuelve con sal en la cara, y el mar le debe la vida.',
  'Cuatro patas de silencio, ojos que ven en lo oscuro, dueño de la casa ajena.',
  'Viste de blanco y negro, no canta pero reza, y en la puerta te bendice.',
  'Lleva la casa a la espalda y aun así nunca llega tarde.',
  'Duerme en la arena, guarda el mar por dentro, y quien lo escucha oye lejos.',
  'Viste de luto sin pena, calla lo que nadie dice, y a todos nos da la mano una vez.',
  'Grande como una casa, con nariz de manguera, y le teme al ratón.',
  'Nada sin manos, respira sin aire, y en la mesa termina de plata.',
  'Canta antes que el día, no sabe leer la hora y nunca se equivoca.',
  'Anda de noche y calla de día, y todos saben su nombre menos ella.',
  'Abre el abanico y presume, y lo que le sobra de pluma le falta de canto.',
  'Rayado como una reja, manda en el monte, y su paso no se oye.',
  'Cuida la casa sin cobrar, ladra al que viene, y llora si te vas.',
  'Bajo la luna resopla, cuernos de media luna, y en el campo es rey.',
  'Redonda y fría, cambia de cara cada semana, y nunca se deja tocar.',
  'Cabe en la mano, brilla al sol, y en el anzuelo termina.',
  'Sin ojos ni patas, come tierra y devuelve tierra, y hace el jardín sin saberlo.',
  'De pelaje de seda, camina sin ruido, y duerme donde le da la gana.',
  'Sin brazos abraza el tronco, sin veneno da miedo, y en el monte es rey callado.',
  'Verde, salta, y le gusta la humedad; canta cuando va a llover.',
  'Echa humo por la boca, cruza el agua sin nadar, y anuncia su llegada silbando.',
  'Lleva el mensaje sin cobrar, viste de blanco, y siempre encuentra el camino de vuelta.',
  'Chiquita, dura y clara; el que la tiene la esconde, y el que la ve la quiere.',
  'Larga y resbalosa, vive en el fango, y nadie la agarra dos veces.',
  'Vestida de amarillo y negro, avisa antes de picar, y quien no la oye, lo paga.',
  'Barbudo y terco, come lo que encuentra, y sube donde nadie sube.',
  'Chiquito y ladrón, entra por el hueco, y del gato huye.',
  'De agua salada viene, se pone rojo al fuego, y en la mesa vale más.',
  'Corre por el llano con corona de rama, y no se deja alcanzar.',
  'Se revuelca en el fango y no le importa; de él se aprovecha todo.',
  'Da vueltas en el cielo esperando, viste de luto, y llega cuando ya no hay nada que hacer.',
  'Imita al hombre y se ríe de él, cuelga del rabo y come de arriba.',
  'Ocho patas y ni un zapato, teje sin hilo, y espera sin prisa.',
  'De boca ancha y cuello largo, echa humo y no tiene fuego propio.',
  'Vuela sin alas cuando le da la gana, y su nombre se dice bajito.',
  'Todos lo buscan, pocos lo guardan, y el que lo tiene no lo dice.',
  'Sin patas camina, sin manos aprieta, y su lengua avisa antes que el diente.',
  'Viste de negro y habla de perdones; ni cobra ni presta.',
  'Toma el sol en la pared, suelta el rabo si la agarras, y sigue viva.',
  'Guarda el paso del hombre, se gasta por debajo, y en la puerta descansa.',
  'Con la cola por delante, chiquito y con mala fama, se esconde entre las piedras.',
  'Doce meses le caben dentro, y cuando se acaba, todos brindan.',
  'Manda sin arar, firma sin sembrar, y cada tanto se cambia.',
  'Sobre dos hilos anda, hace ruido de campana, y no puede salirse del camino.',
  'Se para en la mano y no pesa, canta gratis y no cobra.',
  'Corre cuando enciendes la luz, vive donde no la llaman, y no hay quien la acabe.',
  'Se le va la lengua y las piernas, y al día siguiente no se acuerda.',
  'Viste de azul, sopla el pito, y todos miran para otro lado.',
  'Marcha sin música, obedece sin preguntar, y duerme con las botas puestas.',
  'Dos ruedas y ni un motor, corre si la pedaleas, y descansa apoyada.',
  'Grande y de madera, va cargado y no se queja, y el viento lo empuja.',
  'Rumia todo el día, da de comer sin hablar, y el campo es su casa.',
  'Anda para atrás y de lado, con tenaza en cada mano, y en la arena hace su casa.',
  'Va al mar sin miedo, vuelve con la red llena o vacía, y nunca cambia de oficio.',
  'Crece sin comer, se corta y no duele, y con los años se despide.',
  'No cuesta nada, no se compra, y el que lo da recibe el doble.',
  'Corre por dentro y no se ve, y cuando sale, todos se asustan.',
  'De arriba viene, de arriba manda, calienta al pobre y al rico igual.',
  'Come sin dientes, crece si le soplas, y quema al que la toca.',
  'De dos en dos se hace uno, y lo que se firma no se borra fácil.',
  'Quita lo que no le dieron, huye de la luz, y siempre lo alcanzan.',
  'Ya no habla ni oye, y sin embargo lo llevan en hombros.',
  'Alegra la casa, junta a la familia, y se acaba antes de lo que uno quiere.',
  'Lo que se rompe y no se arregla, aunque los dos lo hayan firmado.',
  'Deja la marca sin querer, y el que la lleva se acuerda.',
  'Casa de todos y de nadie, con puerta que solo se abre para entrar.',
  'Hondo y oscuro, guarda agua fría, y devuelve lo que le gritas.',
  'Duro por fuera y dulce por dentro, cae solo cuando está listo.',
  'Todo el mundo lo tiene y nadie lo quiere; hasta el rey lo hace solo.',
  'Grande y manso, tira del día entero sin quejarse una vez.',
  'Le dicen sabia y da miedo, canta de noche en el árbol.',
  'Cae del cielo con cola larga, y el que la ve pide un deseo.',
  'Silba antes de llegar, va y viene por el mismo camino, y no espera a nadie.',
  'Se hace con los pies pero manda el corazón, y no hace falta saber para hacerlo.',
  'De tela y de viento, dice sin hablar de dónde eres.',
  'De madera y silencio, va cerrado y lleva a alguien que ya no vuelve.',
  'Baja el cubo vacío y sube lleno, y nunca ve el fondo.',
  'Manda en la candela, prueba con el dedo, y de él depende la fiesta.',
  'Redondo y rojo, alegra el plato sin decir nada.',
  'Se toma caliente, cura de todo, y sabe mejor si la hizo tu madre.',
  'Nadie la busca y a todos les llega, y de ella se hacen las canciones.',
  'Guarda de todo y fía poco; abre temprano y cierra tarde.',
  'Habla sin lengua, repite sin memoria, y te dice la verdad de frente.',
  'Sube sin escalera, se deshace en el aire, y avisa de la candela.',
  'Se viste de humo, muere de a poquito, y en la boca del hombre se acaba.',
  'Dos cristales para ver mejor, y sin ellos el mundo se borra.',
  'Blanca como el papel, sale de la vaca, y a los niños los cría.',
  'Sin cuerpo aprieta, sin manos agarra, y se va cuando llega la luz.',
  'De loza y de vergüenza, se guarda bajo la cama, y de noche se agradece.',
  'Sube ligero y no vuelve, y el niño lo suelta llorando.',
  'Cambia lo que había por lo que viene, y nadie queda igual después.',
  'De hierro y de filo, corta lo que toca y no sabe llorar.',
  'Todos la pierden aunque digan que ganaron, y de ella nadie vuelve entero.',
  'Manda en la casa sin levantar la voz, y sin ella nada se sostiene.',
  'Chiquito y molesto, canta en la oreja y no deja dormir.',
  'Alta y sola en el camino, da sombra y no pide nada.',
  'Vino con uno y se va con todos, de sangre o de calle, pero está.'
];

/**
 * Verso de un día concreto. Se deriva SOLO de la fecha.
 * @param {Date} [fecha]
 */
export function versoDelDia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = fecha.getMonth() + 1;
  const d = fecha.getDate();

  // Semilla estable por día: el mismo verso toda la jornada
  let h = y * 10000 + m * 100 + d;
  h = (h ^ 61) ^ (h >>> 16);
  h = h + (h << 3);
  h = h ^ (h >>> 4);
  h = Math.imul(h, 0x27d4eb2d);
  h = h ^ (h >>> 15);

  const indice = Math.abs(h) % VERSOS.length;

  return {
    texto: VERSOS[indice],
    numero: indice + 1,
    total: VERSOS.length,
    fecha: `${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`
  };
}
