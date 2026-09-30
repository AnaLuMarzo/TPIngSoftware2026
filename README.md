# TPIngSoftware2026
2da entrega:
Modelo Conceptual: Desarrollar el diagrama de dominio para los datos involucrados en el problema. Prueba de Concepto: La funcionalidad debe abarcar los casos de uso relacionados con la inscripción de un postulante para autoridad de mesa, y la consulta de charlas. Incluir la interacción con el sistema externo geográfico para las referencias en mapa.

#Trabajo Práctico

I. Portal para Autoridades de Mesa
Antes de cada elección de representantes, el ente nacional con competencia electoral abre la convocatoria para autoridades de mesa. Se desea desarrollar un
sistema web que permita implementar un registro de postulantes para ser autoridad de mesa.
El administrador del portal será el encargado de informar en el sistema una serie de charlas de orientación abiertas a la comunidad. En cada charla se determinará el
nombre, el tema, la fecha y el horario. Para cada charla se debe informar la sede donde se realizará, indicando el nombre y la dirección del lugar.
La convocatoria es abierta para cualquier persona. La idea de las charlas es ampliar la difusión, para sumar interesados, pero no será requerido anotarse para
participar en las mismas, ni tampoco asistir a alguna para registrarse como postulante.
El registro estará abierto desde la primera charla, hasta la fecha de la última charla de cierre, determinando el plazo en el sistema, para que los ciudadanos puedan
inscribirse como postulantes.
Al momento del registro, se debe seleccionar el distrito electoral correspondiente.
Los postulantes deberán informar su nombre y apellido, DNI, fecha de nacimiento, dirección actual, teléfono y un correo de contacto. Se requiere indicar si ya fue
autoridad de mesa previamente, si cumplió la capacitación, y si es afiliado en alguna agrupación, detallando el partido. En la inscripción, podrán indicar el interés en
participar de alguna de las charlas de orientación brindadas por la organización.
Al cumplirse la fecha límite, el sistema cerrará automáticamente la convocatoria.
El sistema generará un reporte con los postulantes anotados, y lo enviará por mail al administrador, notificando el fin de las postulaciones.
Luego del cierre de la convocatoria, el administrador deberá realizar una evaluación de las solicitudes. Podrán consultar en el sistema los postulantes y verificar
la información. En el caso de aprobar el registro, se le enviará un mail al postulante con la confirmación de la recepción de la solicitud. En el caso que se detecte alguna
anomalía de forma en el registro, se podrá rechazar la solicitud, ingresando el motivo, y el inscripto recibe una notificación por mail.
Al finalizar la verificación de todos los postulantes, se generará nuevamente el reporte, con los voluntarios ya confirmados, y el sistema se lo enviará por mail al
administrador.
Para el envío de las notificaciones por mail, el sistema de autoridades de mesa interactuará con el Servidor de Correo del organismo.
Para las referencias de las sedes, se espera interactuar con algún Servicio de Mapas para mostrar las ubicaciones en un mapa, junto con la información
correspondiente.
