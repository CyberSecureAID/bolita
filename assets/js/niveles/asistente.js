/* niveles/asistente.js — Genera la lectura del asistente: toma las velas,
   corre el motor y traduce los datos a mensajes y a un plan operativo.
   No dibuja nada; solo escribe en N. Extraído de niveles.js sin cambios
   de lógica (analizar ahora recibe el par por parámetro). */

import { N } from './estado.js?v=1';
import { elegir, fmt } from './util.js?v=1';
import { pivotes, tendencia, detectarRango, calcularNiveles, detectarImpulso, detectarEstructuras, calcularTendencia, detectarDobles, marea, calcularATR, construirPlan } from './motor.js?v=1';

const nombreTend = (d) => ({ alcista: 'alcista', bajista: 'bajista', lateral: 'lateral', indefinida: 'sin definir' }[d] || d);

export function analizar(par) {
  const v = N.velas;
  if (v.length < 40) { N.mensajes = []; return; }

  const piv = pivotes(v);
  N.tendencia = tendencia(v, piv);
  N.rango = detectarRango(v);
  N.impulso = detectarImpulso(v);
  N.estructuras = detectarEstructuras(v, piv);
  N.linea = calcularTendencia(v, piv, N.tendencia);
  N.dobles = detectarDobles(v, piv, N.precio);
  N.atr = calcularATR(v);
  N.marea = marea(v, N.atr);
  N.precio = v[v.length - 1].c;
  N.niveles = calcularNiveles(v, piv, N.precio);

  /* [CORREGIDO] Si el mercado está en rango, el asistente dice "no
     entres" — así que dibujar seis niveles de compra sería
     contradictorio. En rango solo se marcan los bordes de la banda,
     que es lo único operable ahí. */
  if (N.rango) {
    N.niveles = N.niveles.filter((x) =>
      Math.abs(x.p - N.rango.alto) / N.precio < 0.008 ||
      Math.abs(x.p - N.rango.bajo) / N.precio < 0.008
    ).slice(0, 2);
  }

  const msgs = [];

  /* ══ EL ESCENARIO DE LIBRO: impulso + retesteo ══
     Va primero porque es el más operable. Un impulso fuerte deja
     una zona de origen; cuando el precio vuelve ahí, quien lo
     provocó suele defenderla otra vez. */
  const imp = N.impulso;
  if (imp && imp.invalidado) {
    /* El precio se comió el impulso entero: la estructura ya no
       vale. Decirlo es más útil que inventar una entrada. */
    msgs.push({
      tipo: 'aviso', p: N.precio, prioridad: 7,
      titulo: elegir(['Estructura rota', 'El impulso se agotó', 'Ya no hay setup aquí']),
      txt: elegir([
        `El precio se pasó de la zona que originó el último impulso ${imp.dir}. Cuando eso ocurre, la estructura deja de servir como referencia.`,
        `El movimiento ${imp.dir} se ha deshecho por completo. La zona de origen ya no aguanta.`,
        `El retroceso superó el punto de partida del impulso: esa estructura está invalidada.`
      ]),
      hacer: elegir([
        'Espere a que se forme una estructura nueva. Operar sobre una rota es lo que más caro sale.',
        'No hay referencia válida ahora mismo. Deje que el mercado construya un impulso nuevo.',
        'Cambie de marco temporal o de par: aquí ya no queda nada que operar.'
      ]),
      detalle: [
        `Impulso ${imp.dir} de ${imp.pct.toFixed(2)}%`,
        `Retroceso: ${Math.round(imp.retrocesoReal)}% (por encima del 100% = invalidado)`,
        `Zona de origen: ${fmt(imp.zonaBaja)} – ${fmt(imp.zonaAlta)}`,
        `Han pasado ${imp.velasDesde} velas desde que terminó`
      ]
    });
  } else if (imp && (imp.enZona || imp.acercandose)) {
    const alcista = imp.dir === 'alcista';
    const zA = imp.zonaAlta, zB = imp.zonaBaja;
    const stop = alcista ? zB * 0.993 : zA * 1.007;
    const objetivo = imp.precioFin;
    const riesgo = Math.abs(N.precio - stop);
    const premio = Math.abs(objetivo - N.precio);
    const rr = riesgo > 0 ? premio / riesgo : 0;

    msgs.push({
      tipo: alcista ? 'compra' : 'venta',
      p: imp.zonaMedia,
      prioridad: 10,
      titulo: imp.enZona
        ? elegir([
            alcista ? 'Retesteo en zona de compra' : 'Retesteo en zona de venta',
            alcista ? 'El precio volvió al origen alcista' : 'El precio volvió al origen bajista',
            'Retesteo del impulso'
          ])
        : elegir([
            'El precio se acerca a la zona',
            alcista ? 'Retroceso hacia el origen alcista' : 'Retroceso hacia el origen bajista',
            'Prepárese: retesteo en camino'
          ]),
      txt: imp.enZona
        ? elegir([
            `Hubo un impulso ${alcista ? 'alcista' : 'bajista'} del ${imp.pct.toFixed(1)}% en ${imp.velas} velas, y el precio ha vuelto a la zona donde nació (${fmt(zB)}–${fmt(zA)}). Está dentro de ella ahora mismo.`,
            `El precio ha retrocedido un ${Math.round(imp.retroceso)}% del impulso ${alcista ? 'alcista' : 'bajista'} y está tocando su zona de origen. Ahí es donde entró el dinero que lo movió.`,
            `Impulso ${alcista ? 'alcista' : 'bajista'} de ${imp.pct.toFixed(1)}% y retesteo completo: el precio está en ${fmt(zB)}–${fmt(zA)}, justo donde arrancó el movimiento.`
          ])
        : elegir([
            `Hubo un impulso ${alcista ? 'alcista' : 'bajista'} del ${imp.pct.toFixed(1)}% y el precio está retrocediendo hacia su origen. Queda un ${Math.abs(imp.distZona).toFixed(1)}% para llegar a ${fmt(zB)}–${fmt(zA)}.`,
            `El precio ha devuelto un ${Math.round(imp.retroceso)}% del impulso. La zona de origen está a un ${Math.abs(imp.distZona).toFixed(1)}%.`,
            `Retroceso en marcha hacia ${fmt(zB)}–${fmt(zA)}, la zona que originó el último impulso ${alcista ? 'alcista' : 'bajista'}.`
          ]),
      hacer: imp.enZona
        ? elegir([
            `${alcista ? 'Compra' : 'Venta'} en esta zona con stop ${alcista ? 'debajo de' : 'encima de'} ${fmt(stop)}. Objetivo el máximo del impulso: ${fmt(objetivo)}. Relación riesgo/beneficio ${rr.toFixed(1)}:1.`,
            `Entrada a favor del impulso. Stop en ${fmt(stop)}, objetivo ${fmt(objetivo)}. Si pierde la zona, la estructura se rompe y hay que salir.`,
            `Es la entrada que busca un trader de estructura: stop ajustado en ${fmt(stop)} y recorrido hasta ${fmt(objetivo)}. Riesgo/beneficio de ${rr.toFixed(1)} a 1.`
          ])
        : elegir([
            `Todavía no ha llegado. Ponga alerta en ${fmt(imp.zonaMedia)} y espere a que el precio entre en la zona antes de operar.`,
            `Prepare la entrada pero no la ejecute aún: espere a que toque ${fmt(zB)}–${fmt(zA)} y reaccione ahí.`,
            `Falta un ${Math.abs(imp.distZona).toFixed(1)}%. Entrar antes de tiempo es lo que estropea esta operación.`
          ]),
      detalle: [
        `Impulso ${alcista ? 'alcista' : 'bajista'} de ${imp.pct.toFixed(2)}% en ${imp.velas} velas`,
        `Zona de origen: ${fmt(zB)} – ${fmt(zA)}`,
        `Retroceso actual: ${Math.round(imp.retroceso)}% del movimiento`,
        `Stop sugerido: ${fmt(stop)}`,
        `Objetivo: ${fmt(objetivo)} · Riesgo/beneficio ${rr.toFixed(1)}:1`,
        `Han pasado ${imp.velasDesde} velas desde que terminó el impulso`,
        `Vigencia: mientras el precio no cierre ${alcista ? 'por debajo de' : 'por encima de'} ${fmt(stop)}`
      ]
    });
  }

  /* ══ MENSAJES DE ESTRUCTURA ══
     Cada patrón detectado tiene su lectura y su recomendación, con
     varias formas de decirlo. Todo sale de datos, nada inventado. */
  (N.estructuras || []).forEach((e) => {
    const alc = e.dir === 'alcista';

    if (e.tipo === 'bos') {
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: 8, marca: e,
        titulo: elegir([e.nombre, alc ? 'Estructura rota al alza' : 'Estructura rota a la baja',
                        alc ? 'Continuación alcista confirmada' : 'Continuación bajista confirmada']),
        txt: elegir([
          `El precio cerró ${alc ? 'por encima' : 'por debajo'} de ${fmt(e.nivel)}, rompiendo el último ${alc ? 'máximo' : 'mínimo'} de estructura. La tendencia ${alc ? 'alcista' : 'bajista'} continúa.`,
          `Ruptura confirmada en ${fmt(e.nivel)}: el cierre superó ese nivel, no fue solo una mecha. Eso valida la continuación.`,
          `${alc ? 'Los compradores' : 'Los vendedores'} rompieron ${fmt(e.nivel)} con cierre de cuerpo. La estructura sigue ${alc ? 'al alza' : 'a la baja'}.`
        ]),
        hacer: elegir([
          `Tras una ruptura, lo que funciona es esperar el retroceso a ${fmt(e.nivel)}: ese nivel roto suele convertirse en ${alc ? 'soporte' : 'resistencia'}.`,
          `No persiga el movimiento. Espere a que el precio vuelva a ${fmt(e.nivel)} y reaccione ahí: es la entrada con menos riesgo.`,
          `Opere a favor de la ruptura, pero en el retroceso. Entrar ahora es entrar en el peor precio del movimiento.`
        ]),
        detalle: [
          `Nivel roto: ${fmt(e.nivel)}`,
          `Ruptura confirmada por cierre de cuerpo, no por mecha`,
          `Tipo: ruptura de estructura (BOS) ${alc ? 'alcista' : 'bajista'}`,
          `Lo que suele pasar: el nivel roto pasa a ser ${alc ? 'soporte' : 'resistencia'}`,
          `Vigencia: hasta que el precio cierre de vuelta al otro lado`
        ]
      });
    }

    if (e.tipo === 'choch') {
      msgs.push({
        tipo: 'vigilar', p: e.nivel, prioridad: 9, marca: e,
        titulo: elegir([e.nombre, 'Posible giro del ciclo', 'El mercado cambia de carácter']),
        txt: elegir([
          `El precio cerró ${alc ? 'por encima' : 'por debajo'} de ${fmt(e.nivel)}, rompiendo la estructura anterior por primera vez en sentido contrario. Es el primer aviso de giro.`,
          `Cambio de carácter en ${fmt(e.nivel)}: se ha roto el patrón que traía el mercado. Puede estar girando.`,
          `Primera señal de agotamiento: ${fmt(e.nivel)} cedió y eso rompe la secuencia que venía cumpliéndose.`
        ]),
        hacer: elegir([
          `Un cambio de carácter es un aviso, no una entrada. Espere a que el precio retroceda a una zona ${alc ? 'de demanda' : 'de oferta'} y reaccione ahí.`,
          `No entre solo por esto. Marque el nivel y espere confirmación: la primera ruptura suele fallar sin retroceso.`,
          `Reduzca exposición en la dirección anterior. El ciclo puede estar cambiando, pero aún no está confirmado.`
        ]),
        detalle: [
          `Nivel de referencia: ${fmt(e.nivel)}`,
          `Tipo: cambio de carácter (CHoCH) ${alc ? 'alcista' : 'bajista'}`,
          `Es el PRIMER giro contra la tendencia, no una confirmación`,
          `Lo correcto: esperar retroceso a zona institucional antes de entrar`,
          `Se invalida si el precio recupera el lado anterior`
        ]
      });
    }

    if (e.tipo === 'ob') {
      const dist = ((e.nivel - N.precio) / N.precio) * 100;
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: Math.abs(dist) < 2 ? 9 : 6, marca: e,
        titulo: elegir([e.nombre, alc ? 'Zona donde compró el dinero grande' : 'Zona donde vendió el dinero grande',
                        alc ? 'Order block alcista' : 'Order block bajista']),
        txt: elegir([
          `Antes del último impulso hubo una vela ${alc ? 'bajista' : 'alcista'} en ${fmt(e.zonaB)}–${fmt(e.zonaA)}: ahí es donde se cargaron las órdenes que movieron el precio. Está a un ${Math.abs(dist).toFixed(1)}%.`,
          `La zona ${fmt(e.zonaB)}–${fmt(e.zonaA)} originó el impulso. Es donde entró el volumen institucional, y suele defenderse cuando el precio vuelve.`,
          `Zona institucional marcada en ${fmt(e.zonaB)}–${fmt(e.zonaA)}. El precio salió de ahí con fuerza, y por eso importa.`
        ]),
        hacer: Math.abs(dist) < 2
          ? elegir([
              `El precio está en la zona. Entrada ${alc ? 'larga' : 'corta'} con stop ${alc ? 'debajo de' : 'encima de'} ${fmt(alc ? e.zonaB * 0.994 : e.zonaA * 1.006)}.`,
              `Es el momento: reacción en zona institucional. Stop ajustado justo al otro lado del bloque.`,
              `Zona activa ahora mismo. Si el precio reacciona aquí, es la entrada; si la atraviesa con cierre, se invalida.`
            ])
          : elegir([
              `Ponga alerta en ${fmt(e.nivel)}. Cuando el precio llegue a la zona, ahí se decide.`,
              `Aún no ha llegado: falta un ${Math.abs(dist).toFixed(1)}%. Prepare la entrada pero no la ejecute.`,
              `Marque esta zona y espere. Entrar antes de que el precio la toque es adelantarse sin motivo.`
            ]),
        detalle: [
          `Zona: ${fmt(e.zonaB)} – ${fmt(e.zonaA)}`,
          `Es la última vela ${alc ? 'bajista' : 'alcista'} antes del impulso`,
          `Distancia al precio: ${Math.abs(dist).toFixed(2)}%`,
          `Se invalida si el precio cierra al otro lado de la zona`,
          `Concepto: order block, donde cargó el volumen institucional`
        ]
      });
    }

    if (e.tipo === 'barrido') {
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: e.nivel, prioridad: 7, marca: e,
        titulo: elegir([e.nombre, 'Trampa de liquidez', alc ? 'Cazaron stops abajo' : 'Cazaron stops arriba']),
        txt: elegir([
          `El precio se pasó de ${fmt(e.nivel)} con la mecha pero cerró de vuelta. Han recogido los stops de quien estaba ${alc ? 'largo' : 'corto'} y han devuelto el precio.`,
          `Barrido en ${fmt(e.nivel)}: la mecha atravesó el extremo pero el cuerpo cerró dentro. Es una trampa clásica.`,
          `Movimiento falso en ${fmt(e.nivel)}. Se llevaron la liquidez que había ahí y el precio volvió.`
        ]),
        hacer: elegir([
          `Tras un barrido, el precio suele irse ${alc ? 'al alza' : 'a la baja'}. Entrada a favor con stop ${alc ? 'debajo de' : 'encima de'} ${fmt(e.nivel)}.`,
          `Opere en contra del barrido: quien puso los stops ahí ya está fuera. Stop al otro lado de la mecha.`,
          `Es de las señales más fiables cuando coincide con una zona institucional. Stop ajustado tras el extremo de la mecha.`
        ]),
        detalle: [
          `Extremo barrido: ${fmt(e.nivel)}`,
          `La mecha superó el nivel pero el cuerpo cerró de vuelta`,
          `Significa que se ejecutaron stops y el precio se devolvió`,
          `Stop sugerido: al otro lado del extremo de la mecha`,
          `Concepto: barrido de liquidez (liquidity sweep)`
        ]
      });
    }
  });

  /* ══ MAREA ══
     Solo habla si la herramienta está encendida y tiene algo real
     que contar. */
  if (N.verMarea && N.marea) {
    const MA = N.marea;

    if (MA.finde) {
      msgs.push({
        tipo: 'aviso', p: N.precio, prioridad: 6,
        titulo: elegir(['Fin de semana', 'Marea en calma', 'Mercado de fin de semana']),
        txt: elegir([
          'Sábado y domingo el volumen cae en picado y las señales de cambio de ciclo fallan mucho más. La herramienta no opera hoy.',
          'Es fin de semana: menos participantes, movimientos exagerados y rupturas que no aguantan el lunes.',
          'Marea solo trabaja de lunes a viernes. En fin de semana el mercado engaña.'
        ]),
        hacer: elegir([
          'Espere al lunes. Lo que se rompe en fin de semana suele deshacerse cuando vuelve el volumen real.',
          'No abra posiciones nuevas basándose en lo que pase hoy o mañana.',
          'Use estos días para preparar niveles, no para entrar.'
        ]),
        detalle: [
          'Marea opera de lunes a viernes',
          'En fin de semana el volumen baja entre un 40% y un 60%',
          'Las rupturas de fin de semana se revierten con frecuencia'
        ]
      });
    } else if (MA.lateral) {
      const porADX = MA.motivoLateral !== 'banda';
      msgs.push({
        tipo: 'aviso', p: N.precio, prioridad: 6,
        titulo: elegir(['Mercado lateral', 'Sin ciclo definido', 'Marea en espera']),
        txt: porADX
          ? elegir([
              `No hay fuerza de tendencia medible: el ADX está en ${MA.panel.adx.toFixed(0)}, por debajo de 20. El precio va y viene y cualquier giro es ruido.`,
              'El precio no tiene dirección clara. Aquí un cambio de color no significa nada.',
              'No hay ciclo que seguir: el precio está lateral y las señales aquí fallan.'
            ])
          : elegir([
              `El precio se ha quedado sin recorrido: la banda reciente es de solo ${MA.anchoAhora.toFixed(1)}%. Aunque venga de un tramo fuerte, ahora mismo está plano y no hay señal que valga.`,
              `Sin recorrido en las últimas velas (banda ${MA.anchoAhora.toFixed(1)}%). Marea espera a que el precio vuelva a moverse.`,
              'El movimiento se ha frenado. Hasta que no haya recorrido de nuevo, no se opera.'
            ]),
        hacer: elegir([
          'Espere a que el precio salga con volumen. Ahí sí habrá una señal que valga.',
          'En lateral, lo rentable es operar los bordes, no seguir la tendencia.',
          'Marea vuelve a hablar cuando haya un movimiento con recorrido.'
        ]),
        detalle: [
          `Fuerza de tendencia (ADX): ${MA.panel.adx.toFixed(0)} · se opera desde 20`,
          `Banda reciente: ${MA.anchoAhora.toFixed(2)}% · se opera desde 2%`,
          'Las señales de ciclo sin recorrido tienen el peor rendimiento'
        ]
      });
    } else if (MA.ultima && MA.velasDesde != null && MA.velasDesde < 25) {
      const sg = MA.ultima;
      const alc = sg.dir === 'compra';
      msgs.push({
        tipo: alc ? 'compra' : 'venta', p: sg.precio, prioridad: 10,
        iAncla: sg.i,
        titulo: elegir([
          alc ? 'Marea marcó LONG' : 'Marea marcó SHORT',
          alc ? 'La marea cambió a comprador' : 'La marea cambió a vendedor',
          'Cambio de ciclo confirmado'
        ]),
        txt: elegir([
          `El ciclo cambió de manos en ${fmt(sg.precio)}, hace ${MA.velasDesde} ${MA.velasDesde === 1 ? 'vela' : 'velas'}. El giro de Heikin Ashi se confirmó con ruptura de estructura, volumen y fuerza de tendencia real.`,
          `Hubo un giro confirmado en ${fmt(sg.precio)}: la marea del mercado se dio la vuelta y la vela siguiente lo confirmó, así que no repinta.`,
          `Marea detectó el cambio en ${fmt(sg.precio)}. No es un cruce cualquiera: pasó todos los filtros (fuerza, volumen y ruptura).`
        ]),
        hacer: alc
          ? elegir([
              'El lado comprador tomó el control. Busque entradas en los retrocesos, no persiga el precio aquí arriba.',
              'Opere a favor mientras la marea siga del lado comprador.',
              'Mantenga la dirección larga hasta que la marea vuelva a cambiar.'
            ])
          : elegir([
              'El lado vendedor tomó el control. Busque ventas en los rebotes, no persiga la caída.',
              'Opere a favor mientras la marea siga del lado vendedor.',
              'Mantenga la dirección corta hasta que la marea vuelva a cambiar.'
            ]),
        detalle: [
          `Señal en ${fmt(sg.precio)}`,
          `Fuerza de tendencia (ADX): ${sg.adx.toFixed(0)}`,
          `Confirmadores cumplidos: ${sg.cumplidos} de 5`,
          'Giro de Heikin Ashi confirmado por la vela siguiente (no repinta)',
          `Señales descartadas por los filtros: ${MA.señales.length - MA.validas.length}`
        ]
      });
    }
  }

  /* ══ LA LÍNEA DE TENDENCIA ══ */
  if (N.linea) {
    const alc = N.linea.tipo === 'alcista';
    const ajuste = Math.round(N.linea.r2 * 100);
    msgs.push({
      tipo: 'tendencia', p: N.linea.m * (v.length - 1) + N.linea.b, prioridad: 5,
      iAncla: N.linea.pts[Math.floor(N.linea.pts.length / 2)].i,
      titulo: elegir([
        alc ? 'Línea de tendencia alcista' : 'Línea de tendencia bajista',
        alc ? 'El precio sube apoyado' : 'El precio cae con techo',
        'Tendencia trazada'
      ]),
      txt: elegir([
        `He trazado la línea que une los últimos ${N.linea.pts.length} ${alc ? 'mínimos' : 'máximos'}. Se ajusta al ${ajuste}%, así que es una guía fiable mientras el precio la respete.`,
        `Los ${alc ? 'suelos' : 'techos'} van formando una recta con ${ajuste}% de ajuste. Esa línea es la referencia de la tendencia ${alc ? 'alcista' : 'bajista'}.`,
        `Línea de tendencia ${alc ? 'alcista' : 'bajista'} trazada sobre ${N.linea.pts.length} puntos, con un ajuste del ${ajuste}%.`
      ]),
      hacer: elegir([
        alc ? 'Mientras el precio no cierre por debajo de la línea, la tendencia sigue viva. Las compras en los toques a la línea son las de menos riesgo.'
            : 'Mientras el precio no cierre por encima de la línea, la caída sigue. Las ventas en los toques a la línea son las de menos riesgo.',
        alc ? 'Compre en los apoyos sobre la línea, no en mitad del tramo. Si la pierde con cierre, se acabó la tendencia.'
            : 'Venda en los rechazos contra la línea. Si la rompe con cierre, se acabó la caída.',
        'Use la línea como filtro: opere solo a favor mientras aguante, y salga si el precio la atraviesa con cuerpo.'
      ]),
      detalle: [
        `Trazada sobre ${N.linea.pts.length} pivotes reales`,
        `Ajuste estadístico (R²): ${ajuste}%`,
        `Las líneas de tendencia rondan el 67% de acierto según estudios del sector`,
        `Se invalida con un cierre al otro lado, no con una mecha`,
        `Dirección: ${alc ? 'alcista' : 'bajista'}`
      ]
    });
  }

  /* ══ DOBLE SUELO / DOBLE TECHO ══ */
  (N.dobles || []).forEach((d) => {
    const suelo = d.tipo === 'dobleSuelo';
    msgs.push({
      tipo: suelo ? 'compra' : 'venta', p: d.nivel, prioridad: d.confirmado ? 9 : 6,
      iAncla: d.p2.i,
      titulo: elegir([
        suelo ? 'Doble suelo' : 'Doble techo',
        suelo ? 'Suelo probado dos veces' : 'Techo rechazado dos veces',
        d.confirmado ? (suelo ? 'Doble suelo confirmado' : 'Doble techo confirmado') : (suelo ? 'Doble suelo en formación' : 'Doble techo en formación')
      ]),
      txt: elegir([
        `El precio hizo dos ${suelo ? 'mínimos' : 'máximos'} casi iguales en ${fmt(d.nivel)}. ${d.confirmado ? `Ya rompió el cuello en ${fmt(d.cuello)}, así que el patrón está confirmado.` : `Falta romper el cuello en ${fmt(d.cuello)} para confirmarlo.`}`,
        `Dos ${suelo ? 'suelos' : 'techos'} en ${fmt(d.nivel)} y un cuello en ${fmt(d.cuello)}. ${d.confirmado ? 'Confirmado.' : 'Aún sin confirmar.'}`,
        `Patrón de ${suelo ? 'doble suelo' : 'doble techo'} formado en ${fmt(d.nivel)}. ${d.confirmado ? 'El cuello ya cedió.' : 'Pendiente de que el cuello ceda.'}`
      ]),
      hacer: d.confirmado
        ? elegir([
            `Objetivo del patrón: ${fmt(d.objetivo)}, que es la altura proyectada desde el cuello. Stop ${suelo ? 'debajo de' : 'encima de'} ${fmt(d.nivel)}.`,
            `Entrada tras la confirmación, con objetivo en ${fmt(d.objetivo)} y stop al otro lado de ${fmt(d.nivel)}.`,
            `Patrón activo. Proyección hasta ${fmt(d.objetivo)}; invalidación si vuelve a ${fmt(d.nivel)}.`
          ])
        : elegir([
            `No entre todavía. El patrón solo vale cuando el precio cierra ${suelo ? 'por encima' : 'por debajo'} del cuello en ${fmt(d.cuello)}.`,
            `Espere el cierre más allá de ${fmt(d.cuello)}. Sin eso, no hay patrón: solo dos toques.`,
            `Marque ${fmt(d.cuello)} y espere. Adelantarse a la confirmación es el error más común con este patrón.`
          ]),
      detalle: [
        `Nivel del patrón: ${fmt(d.nivel)}`,
        `Línea de cuello: ${fmt(d.cuello)}`,
        `Objetivo proyectado: ${fmt(d.objetivo)}`,
        `Estado: ${d.confirmado ? 'confirmado por cierre' : 'pendiente de confirmación'}`,
        suelo ? 'El doble suelo tiene un 88% de acierto según estudios de 2026' : 'El doble techo tiene un 68% de acierto en estudios recientes',
        'Solo cuenta el cierre del cuerpo, no las mechas'
      ]
    });
  });

  const soportes = N.niveles.filter((x) => x.tipo === 'soporte' && x.p < N.precio);
  const resist = N.niveles.filter((x) => x.tipo === 'resistencia' && x.p > N.precio);
  const sCerca = soportes[0];
  const rCerca = resist[resist.length - 1];

  /* ── SITUACIÓN 1: el precio está en rango ──
     No hay entrada de tendencia. Se dice claramente. */
  if (N.rango) {
    msgs.push({
      tipo: 'aviso',
      p: N.precio,
      titulo: elegir(['Mercado lateral', 'Sin dirección clara', 'El precio está atrapado']),
      txt: elegir([
        `${par} lleva ${Math.round(N.rango.pctDentro)}% del tiempo dentro de una banda del ${N.rango.amplitud.toFixed(1)}%. No hay tendencia que seguir.`,
        `El precio oscila entre ${fmt(N.rango.bajo)} y ${fmt(N.rango.alto)} sin decidirse. Amplitud de solo ${N.rango.amplitud.toFixed(1)}%.`,
        `Banda estrecha de ${N.rango.amplitud.toFixed(1)}%: el precio no se ha ido a ningún lado en las últimas ${Math.min(50, v.length)} velas.`
      ]),
      hacer: elegir([
        'En rango, las entradas de tendencia fallan. Espere a que rompa la banda, o busque otra moneda con dirección definida.',
        'No fuerce una entrada aquí. O espera la ruptura del rango, o cambia de par: hay mercados con más claridad ahora.',
        'Lo rentable en rango es comprar abajo y vender arriba de la banda, pero con poco recorrido. Si busca tendencia, este no es el par.'
      ]),
      detalle: [
        `Techo de la banda: ${fmt(N.rango.alto)}`,
        `Suelo de la banda: ${fmt(N.rango.bajo)}`,
        `El precio cerró dentro de la zona central en ${Math.round(N.rango.pctDentro)}% de las velas`,
        `Una banda por debajo del 6% se considera lateral para este marco temporal`
      ]
    });
  }

  /* ── SITUACIÓN 2: hay soporte cerca y tendencia a favor ── */
  if (sCerca && !N.rango) {
    const d = Math.abs(sCerca.dist);
    const alcista = N.tendencia.dir === 'alcista';
    const stop = sCerca.p * 0.994;

    /* Antes solo hablaba si el nivel estaba a menos del 2,5%: en la
       práctica casi nunca, y por eso salía el mensaje de relleno. */
    if (d < 6) {
      msgs.push({
        tipo: alcista ? 'compra' : 'vigilar',
        p: sCerca.p,
        nivel: sCerca,
        titulo: alcista
          ? elegir(['Zona de compra', 'Soporte a favor de tendencia', 'Entrada al alza'])
          : elegir(['Soporte cercano', 'Nivel que ya aguantó', 'Zona de reacción']),
        txt: elegir([
          `Soporte en ${fmt(sCerca.p)} que el precio respetó ${sCerca.toques} veces. Está a ${d.toFixed(2)}% por debajo.`,
          `El precio giró ${sCerca.toques} veces en ${fmt(sCerca.p)}. Ahora vuelve a acercarse: queda ${d.toFixed(2)}%.`,
          `${fmt(sCerca.p)} ha frenado la caída en ${sCerca.toques} ocasiones. El precio está a un ${d.toFixed(2)}%.`
        ]),
        hacer: alcista
          ? elegir([
              `Con la tendencia alcista y este soporte cerca, una entrada en ${fmt(sCerca.p)} tiene la estructura a favor. Stop por debajo de ${fmt(stop)}.`,
              `Compra en ${fmt(sCerca.p)} con stop en ${fmt(stop)}. La tendencia acompaña y el nivel tiene ${sCerca.toques} toques detrás.`,
              `Si el precio llega a ${fmt(sCerca.p)} y reacciona, es entrada. Proteja por debajo de ${fmt(stop)}${rCerca ? ` y busque salida hacia ${fmt(rCerca.p)}` : ''}.`
            ])
          : elegir([
              `La tendencia no acompaña, así que no es una compra clara. Si el precio pierde ${fmt(sCerca.p)}, se abre camino a la baja.`,
              `Ojo: el nivel es real pero la tendencia va en contra. Espere confirmación antes de comprar aquí.`,
              `Vigile ${fmt(sCerca.p)}. Si aguanta puede haber rebote, pero contra tendencia el riesgo es mayor.`
            ]),
        detalle: [
          `Toques confirmados: ${sCerca.toques}`,
          `Volumen negociado en la zona: ${sCerca.volPct.toFixed(1)}% del total`,
          `Fuerza del nivel: ${sCerca.fuerza}/100`,
          `Tendencia actual: ${nombreTend(N.tendencia.dir)}`,
          `Stop sugerido: ${fmt(stop)} (0,6% por debajo del nivel)`
        ]
      });
    }
  }

  /* ── SITUACIÓN 3: resistencia cerca ── */
  if (rCerca && !N.rango) {
    const d = Math.abs(rCerca.dist);
    const bajista = N.tendencia.dir === 'bajista';
    if (d < 6) {
      msgs.push({
        tipo: bajista ? 'venta' : 'vigilar',
        p: rCerca.p,
        nivel: rCerca,
        titulo: bajista
          ? elegir(['Zona de venta', 'Resistencia a favor de tendencia', 'Entrada a la baja'])
          : elegir(['Resistencia cercana', 'Techo que ya rechazó', 'Zona de rechazo']),
        txt: elegir([
          `Resistencia en ${fmt(rCerca.p)} que rechazó el precio ${rCerca.toques} veces. Está a ${d.toFixed(2)}%.`,
          `El precio se dio la vuelta ${rCerca.toques} veces en ${fmt(rCerca.p)}. Vuelve a acercarse.`,
          `${fmt(rCerca.p)} ha frenado ${rCerca.toques} subidas. Queda un ${d.toFixed(2)}% para llegar.`
        ]),
        hacer: bajista
          ? elegir([
              `Con tendencia bajista, vender en ${fmt(rCerca.p)} tiene la estructura a favor. Stop por encima de ${fmt(rCerca.p * 1.006)}.`,
              `Si el precio sube a ${fmt(rCerca.p)} y se frena, es entrada corta. Proteja arriba de ${fmt(rCerca.p * 1.006)}.`,
              `Zona de venta en ${fmt(rCerca.p)}. La tendencia acompaña y el nivel tiene ${rCerca.toques} rechazos.`
            ])
          : elegir([
              `Si va largo, plantéese recoger beneficios antes de ${fmt(rCerca.p)}. Ahí es donde el precio se ha frenado antes.`,
              `${fmt(rCerca.p)} es el obstáculo. Si lo rompe con volumen, se abre camino arriba; si no, espere rechazo.`,
              `No compre justo debajo de esta resistencia. Espere a que la rompa o a que rebote desde más abajo.`
            ]),
        detalle: [
          `Rechazos confirmados: ${rCerca.toques}`,
          `Volumen negociado en la zona: ${rCerca.volPct.toFixed(1)}% del total`,
          `Fuerza del nivel: ${rCerca.fuerza}/100`,
          `Tendencia actual: ${nombreTend(N.tendencia.dir)}`
        ]
      });
    }
  }

  /* ── SITUACIÓN 4: precio en tierra de nadie ── */
  /* [CORREGIDO] Este mensaje de relleno acababa siendo el principal
     aunque hubiera lecturas reales. Ahora solo se añade si de verdad
     no hay ninguna otra, y con prioridad mínima. */
  if (!msgs.length) {
    const haciaS = sCerca ? Math.abs(sCerca.dist) : null;
    const haciaR = rCerca ? Math.abs(rCerca.dist) : null;
    msgs.push({
      prioridad: 1,
      tipo: 'aviso',
      p: N.precio,
      titulo: elegir(['Sin entrada clara', 'El precio está en el medio', 'Nada que hacer ahora']),
      txt: elegir([
        `${par} no está cerca de ningún nivel importante. ${haciaS ? `El soporte más próximo está a ${haciaS.toFixed(1)}%` : 'No hay soportes cercanos'}${haciaR ? ` y la resistencia a ${haciaR.toFixed(1)}%` : ''}.`,
        `El precio se mueve entre niveles, sin tocar ninguno. Entrar aquí es entrar a ciegas.`,
        `No hay confluencia ahora mismo: el precio está lejos de las zonas donde ha reaccionado antes.`
      ]),
      hacer: elegir([
        'Esperar. Las mejores entradas salen cuando el precio llega a un nivel probado, no en mitad del camino.',
        'Sin nivel cerca, no hay dónde poner el stop con lógica. Mejor esperar a que el precio se acerque a una zona.',
        'Paciencia: entrar sin referencia es lo que más dinero cuesta. Deje que el precio venga a un nivel.'
      ]),
      detalle: [
        haciaS ? `Soporte más cercano: ${fmt(sCerca.p)} (${haciaS.toFixed(2)}% abajo)` : 'Sin soportes en el rango analizado',
        haciaR ? `Resistencia más cercana: ${fmt(rCerca.p)} (${haciaR.toFixed(2)}% arriba)` : 'Sin resistencias en el rango analizado',
        `Tendencia: ${nombreTend(N.tendencia.dir)}`,
        `Niveles válidos detectados: ${N.niveles.length}`
      ]
    });
  }

  /* ── Aviso de tendencia, siempre que haya una clara ── */
  if (N.tendencia.dir !== 'lateral' && N.tendencia.dir !== 'indefinida' && !N.rango) {
    const alc = N.tendencia.dir === 'alcista';
    msgs.push({
      tipo: 'tendencia',
      p: N.precio,
      titulo: alc
        ? elegir(['Tendencia alcista', 'Estructura al alza', 'El mercado sube'])
        : elegir(['Tendencia bajista', 'Estructura a la baja', 'El mercado cae']),
      txt: elegir([
        alc ? `Máximos y mínimos crecientes en las últimas velas. Movimiento del ${N.tendencia.mov.toFixed(1)}% en el tramo.`
            : `Máximos y mínimos decrecientes. Movimiento del ${N.tendencia.mov.toFixed(1)}% en el tramo.`,
        alc ? `La estructura es alcista: cada retroceso ha hecho un suelo más alto que el anterior.`
            : `La estructura es bajista: cada rebote se ha quedado más bajo que el anterior.`,
        alc ? `El precio construye escalones al alza. Lleva un ${N.tendencia.mov.toFixed(1)}% en este tramo.`
            : `El precio construye escalones a la baja. Lleva un ${N.tendencia.mov.toFixed(1)}% en este tramo.`
      ]),
      hacer: alc
        ? elegir([
            'Operar a favor: buscar compras en los retrocesos hacia soporte, no vender contra la tendencia.',
            'Las compras en soportes tienen ventaja aquí. Vender en corto va contra la corriente.',
            'Priorice entradas largas en los pullbacks. La tendencia es su aliada mientras los suelos suban.'
          ])
        : elegir([
            'Operar a favor: buscar ventas en los rebotes hacia resistencia, no comprar contra la tendencia.',
            'Las ventas en resistencia tienen ventaja aquí. Comprar es ir contra la corriente.',
            'Priorice entradas cortas en los rebotes. La tendencia manda mientras los techos bajen.'
          ]),
      detalle: [
        `Dirección: ${nombreTend(N.tendencia.dir)}`,
        `Recorrido del tramo: ${N.tendencia.mov.toFixed(2)}%`,
        `Medida por estructura de máximos y mínimos, no por indicadores`,
        `Soportes válidos: ${soportes.length} · Resistencias: ${resist.length}`
      ]
    });
  }

  /* ══════════════════════════════════════════════════════════
     EL PLAN ÚNICO

     Antes salían tres análisis independientes contradiciéndose:
     uno decía compra, otro venta, otro espera. Eso no es una
     herramienta, es ruido.

     Ahora todo se pondera y sale UN plan. Cada señal vota según
     su peso, y el resultado manda. Las demás lecturas quedan como
     contexto de apoyo, no como veredictos rivales.
     ══════════════════════════════════════════════════════════ */
  msgs.sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
  N.mensajes = unificar(msgs);
}

/* ══════════════════════════════════════════════════════════════
   UNIFICAR: de varias lecturas a un plan
   ══════════════════════════════════════════════════════════════ */
function unificar(msgs) {
  if (!msgs.length) return [];

  /* Cada señal vota. El peso sale de su prioridad, que ya refleja
     lo fiable que es el patrón según los estudios del sector. */
  let votoC = 0, votoV = 0, votoE = 0;
  msgs.forEach((m) => {
    const p = (m.prioridad || 5);
    if (m.tipo === 'compra') votoC += p;
    else if (m.tipo === 'venta') votoV += p;
    else votoE += p * 0.55;      // esperar pesa menos: no es una postura activa
  });

  const total = votoC + votoV + votoE || 1;
  let lado, conf;
  if (votoC > votoV && votoC > votoE) { lado = 'compra'; conf = votoC / total; }
  else if (votoV > votoC && votoV > votoE) { lado = 'venta'; conf = votoV / total; }
  else { lado = 'esperar'; conf = votoE / total; }

  /* ══════════════════════════════════════════════════════════
     [CORREGIDO] LA TENDENCIA MANDA

     Antes cualquier señal contraria bloqueaba el plan y salía
     "señales enfrentadas". Eso es absurdo: en una tendencia clara
     SIEMPRE hay algún nivel del otro lado, y eso no invalida nada.

     Ahora la tendencia decide el sesgo. Las señales que van a
     favor cuentan entero; las que van en contra cuentan la mitad,
     porque operar contra tendencia es peor negocio. Solo se
     declara empate si de verdad no hay estructura que mande.
     ══════════════════════════════════════════════════════════ */
  const dirT = N.tendencia ? N.tendencia.dir : 'lateral';
  if (dirT === 'alcista') { votoC *= 1.6; votoV *= 0.5; }
  else if (dirT === 'bajista') { votoV *= 1.6; votoC *= 0.5; }

  // Se recalcula con el sesgo aplicado
  /* Una señal de compra o venta pesa más que un "espera": esperar
     no es una postura, es la ausencia de una. */
  const tot2 = votoC + votoV + votoE || 1;
  if (votoC > votoV && votoC > 0) { lado = 'compra'; conf = votoC / tot2; }
  else if (votoV > votoC && votoV > 0) { lado = 'venta'; conf = votoV / tot2; }
  else { lado = 'esperar'; conf = votoE / tot2; }

  /* Empate solo si NO hay tendencia definida y los pesos están
     realmente parejos. Con tendencia clara nunca se declara empate:
     hay dirección, y hay que decirla. */
  const sinRumbo = dirT === 'lateral' || dirT === 'indefinida';
  const disputado = sinRumbo && votoC > 0 && votoV > 0 &&
                    Math.abs(votoC - votoV) < Math.max(votoC, votoV) * 0.2;
  if (disputado) { lado = 'esperar'; conf = 0.4; }

  N.plan = {
    lado, conf: Math.round(conf * 100), disputado,
    votoC: Math.round(votoC), votoV: Math.round(votoV), votoE: Math.round(votoE)
  };

  /* El mensaje principal: el de mayor prioridad del lado ganador.
     Si el plan es esperar por disputa, se construye uno propio. */
  let principal;
  if (disputado) {
    const arriba = msgs.filter((m) => m.tipo === 'venta')[0];
    const abajo = msgs.filter((m) => m.tipo === 'compra')[0];
    principal = {
      tipo: 'aviso', p: N.precio, prioridad: 99, esPlan: true,
      titulo: elegir(['Señales enfrentadas', 'El mercado no se decide', 'Sin dirección clara']),
      txt: elegir([
        `He encontrado argumentos para ambos lados: ${abajo ? abajo.titulo.toLowerCase() : 'compra'} por abajo y ${arriba ? arriba.titulo.toLowerCase() : 'venta'} por arriba. Cuando la estructura se contradice, lo probable es que el precio siga indeciso.`,
        `Hay señales enfrentadas en este marco temporal. Ni los compradores ni los vendedores tienen el control claro ahora mismo.`,
        `La lectura está dividida: ${Math.round(votoC)} de peso alcista frente a ${Math.round(votoV)} bajista. Demasiado parejo para operar con ventaja.`
      ]),
      hacer: elegir([
        'No opere este par ahora. Espere a que una de las dos fuerzas se imponga con un cierre claro, o cambie a otro marco temporal donde la lectura sea limpia.',
        'Cuando las señales se contradicen, lo rentable es no estar dentro. Vuelva cuando haya una dirección definida.',
        'Suba a un marco temporal mayor para ver quién manda de verdad, o busque otro par con estructura clara.'
      ]),
      detalle: [
        `Peso alcista: ${Math.round(votoC)}`,
        `Peso bajista: ${Math.round(votoV)}`,
        `Diferencia insuficiente para dar una dirección`,
        `Lecturas analizadas: ${msgs.length}`,
        `Recomendación: esperar definición o cambiar de par`
      ]
    };
  } else {
    /* Se busca el de mayor prioridad del lado ganador. Si el lado es
       "esperar", se prefiere cualquier lectura con contenido real
       antes que el relleno. */
    const delLado = msgs.filter((m) => m.tipo === lado)
      .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    const conFondo = msgs.filter((m) => (m.prioridad || 0) >= 5)
      .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0));
    principal = delLado[0] || conFondo[0] || msgs[0];
    principal = { ...principal, esPlan: true, prioridad: 99 };

    /* El plan completo: entrada, stop y objetivos escalonados.
       Solo si hay una dirección clara y un nivel de referencia. */
    if ((lado === 'compra' || lado === 'venta') && principal.p > 0 && N.atr > 0) {
      const entrada = principal.p;
      /* El stop sale de la estructura: bajo el nivel si es compra,
         sobre él si es venta. Después se ajusta por volatilidad. */
      const base = lado === 'compra' ? entrada * 0.994 : entrada * 1.006;
      const plan = construirPlan(lado, entrada, base, N.atr);
      if (plan) {
        principal.plan = plan;
        principal.detalle = [
          `Entrada: ${fmt(plan.entrada)}`,
          `Stop: ${fmt(plan.stop)} (${plan.riesgoPct.toFixed(2)}% de riesgo)`,
          `Objetivo 1: ${fmt(plan.obj[0].p)} · asegura la operación`,
          `Objetivo 2: ${fmt(plan.obj[1].p)} · el principal, 2R`,
          `Objetivo 3: ${fmt(plan.obj[2].p)} · si el movimiento acompaña`,
          `Stop ajustado a 1,2 veces la volatilidad media (${fmt(N.atr)})`,
          ...(principal.detalle || [])
        ];
      }
    }
    /* Se le añade la confianza al detalle: el usuario ve cuánto
       respaldo tiene el plan. */
    principal.detalle = [
      `Confianza del plan: ${Math.round(conf * 100)}% del peso total`,
      ...(principal.detalle || [])
    ];
  }

  /* Las demás lecturas pasan a contexto: apoyan o matizan, pero ya
     no compiten como veredictos. */
  const apoyo = msgs
    .filter((m) => m !== principal && m.titulo !== principal.titulo)
    .slice(0, 2)
    .map((m) => ({ ...m, esApoyo: true, tipo: m.tipo === lado ? m.tipo : 'contexto' }));

  return [principal, ...apoyo];
}
