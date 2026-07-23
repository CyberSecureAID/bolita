/**
 * La charada.
 *
 * En la bolita cubana cada numero lleva asociado un simbolo tradicional. Es
 * parte de la cultura del juego: la gente no dice "salio el 8", dice "salio
 * el muerto". Se incluye porque es lo que hace que esto se sienta como la
 * bolita de verdad y no como una ruleta generica.
 *
 * Existen variantes regionales y no todo el mundo usa exactamente la misma
 * lista. Esta es la version mas extendida.
 */

export const CHARADA = [
  'caballo', 'mariposa', 'marinero', 'gato', 'monja',
  'jicotea', 'caracol', 'muerto', 'elefante', 'pescado grande',
  'gallo', 'ramera', 'pavo real', 'tigre', 'perro',
  'toro', 'luna', 'pescado chico', 'lombriz', 'gato fino',
  'majá', 'sapo', 'vapor', 'paloma', 'piedra fina',
  'anguila', 'avispa', 'chivo', 'ratón', 'camarón',
  'venado', 'cochino', 'tiñosa', 'mono', 'araña',
  'pipa', 'bruja', 'dinero', 'culebra', 'cura',
  'lagartija', 'zapato', 'escorpión', 'año', 'presidente',
  'tranvía', 'pájaro', 'cucaracha', 'borracho', 'policía',
  'soldado', 'bicicleta', 'barco', 'vaca', 'cangrejo',
  'pescador', 'pelo', 'abrazo', 'sangre', 'sol',
  'candela', 'matrimonio', 'asesino', 'difunto', 'comida',
  'divorcio', 'mordida', 'cementerio', 'pozo', 'coco',
  'excremento', 'buey', 'lechuza', 'cometa', 'tren',
  'baile', 'banderas', 'ataúd', 'pozo hondo', 'cocinero',
  'tomate', 'sopa', 'tragedia', 'bodega', 'espejo',
  'humo', 'cigarro', 'espejuelos', 'leche', 'miedo',
  'orinal', 'globo', 'revolución', 'cuchillo', 'guerra',
  'mujer', 'mosquito', 'palma', 'hermano', 'automóvil'
];

/** Numero formateado a dos digitos: 7 -> "07" */
export const pad2 = (n) => String(n).padStart(2, '0');

/** Los diez numeros que cubre un terminal: terminal 4 -> 04,14,24... */
export function numbersOfTerminal(terminal) {
  return Array.from({ length: 10 }, (_, i) => i * 10 + terminal);
}

/** Simbolo de un numero del 0 al 99. */
export function symbolOf(number) {
  return CHARADA[number] ?? '';
}
