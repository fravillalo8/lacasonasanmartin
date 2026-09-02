/* ════════════════════════════════════════════════════════════════════════════
   La fecha del RESTAURANTE, no la del reloj universal ni la del equipo.

   🔴🔴 Antes, `today()` en CierreCaja.tsx y en Ventas.tsx sacaba el día
   cortando los diez primeros caracteres del ISO de un Date recién creado.
   Ese texto es el instante en UTC: Chile va UTC−4 (−3 en verano), así que
   desde las 20:00 ya trae el día SIGUIENTE.

   (Escrito en prosa a propósito: el patrón NO se copia literal acá. La guardia
   del deploy busca esa forma y un comentario que la contenga bloquea el archivo
   —ya pasó tres veces—. La documentación describe el error, no lo reproduce.)

   Por qué acá dolía más que en otras partes: el CIERRE DE CAJA se hace cuando
   el local cierra, o sea SIEMPRE después de las 20:00. No era un caso de borde
   de medianoche — el cierre y los gastos del turno se archivaban en el día
   equivocado prácticamente todos los días, y de ahí salen los reportes y la
   contabilidad. El formulario manda la fecha explícita al backend, así que este
   valor pre-llenado es el que manda: nadie lo corrige porque parece correcto.

   `timeZone` explícito y no la zona del equipo: un notebook mal configurado o
   alguien mirando la caja desde otro país no puede correrle el día al local.
   `en-CA` porque su formato nativo ya es AAAA-MM-DD y no hay que armarlo a mano.
   ════════════════════════════════════════════════════════════════════════════ */

const ZONA = 'America/Santiago'

export function hoyCL(d?: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d ?? new Date())
}

/* «Hace n días» contado sobre el día chileno, no sobre el instante UTC.
   El ancla es el mediodía: restar días desde las 00:00 puede cruzar el cambio
   de hora de verano y caer en el día anterior. Desde el mediodía, nunca. */
export function haceDiasCL(n: number): string {
  const [a, m, d] = hoyCL().split('-').map(Number)
  const ancla = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
  ancla.setUTCDate(ancla.getUTCDate() - n)
  return ancla.toISOString().slice(0, 10)
}
