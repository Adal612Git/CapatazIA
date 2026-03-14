# Capataz Automotriz

## Lectura Correcta del Feedback

Si, la idea central que extrajeron va bien encaminada, pero habia que afinarla.

Lo que el cliente realmente esta empujando no es solo "un dashboard para vendedores", sino un sistema operativo ligero para agencias automotrices con tres focos:

1. Control operativo y visibilidad jerarquica por agencia y por grupo.
2. Seguimiento comercial diario con disciplina de piso, guardias, pruebas de manejo, pendientes y cierres.
3. Retencion y post-venta, porque la mayor fuga de clientes ocurre por falta de seguimiento despues de vender.

En paralelo, aparecieron dos requerimientos transversales:

1. Protocolo de atencion critica tipo "campana".
2. Automatizaciones internas como convocatoria diaria y comunicacion general.

## Replanteamiento del Producto

### Problema

Las agencias operan con muchos pendientes distribuidos entre ventas, servicio, refacciones, administracion y gerencia. La informacion existe, pero esta fragmentada en juntas, chats, llamadas, hojas sueltas y memoria de los gerentes.

### Resultado que quiere el cliente

Que un Director de Marca, un Gerente General o un Gerente Comercial pueda saber en minutos:

- que esta pasando hoy
- quien trae pendientes atorados
- quien no esta convirtiendo
- que operaciones van a cerrar
- que clientes estan en riesgo
- que agencias o areas requieren intervencion

## Alcance Aterrizado

### Modulo 1. Jerarquia y Visibilidad

Roles esperados:

- Director o Gerente de Marca
- Gerente General de Agencia
- Gerente Comercial
- Gerente de Servicio
- Gerente de Refacciones
- Gerente de Administracion
- Vendedor
- Asesor de Servicio
- Vendedor de Refacciones
- Personal operativo general

Regla:

- Director de Marca ve todas las agencias.
- Gerente General ve toda su agencia.
- Gerente de Area ve su departamento.
- Operativos ven solo sus propios pendientes, clientes y reportes.

### Modulo 2. Operacion Comercial Diaria

Capta el dia a dia del vendedor:

- guardias en piso
- clientes nuevos
- seguimiento a prospectos
- pruebas de manejo
- apartados
- gestion de documentos para credito
- toma de usados
- diagnostico y negociacion de usados
- pendientes de descuentos, enganches, aprobaciones y avalúos

### Modulo 3. Reporteo y Conversion

El gerente necesita ver:

- cuantos clientes atendio cada vendedor
- cuantos seguimientos hizo
- cuantos prospectos nuevos capto
- cuantas pruebas de manejo realizo
- cuantas operaciones cerro
- tasa de conversion por vendedor y por agencia
- proyeccion de cierre de mes

### Modulo 4. Financiamiento y Subvenciones

Se debe registrar:

- financiera propuesta
- financiera colocada
- subvencion aplicada
- tipo de subvencion
- autorizacion de descuento
- desviaciones de politica comercial

Objetivo:

- detectar cuando el vendedor desvia la operacion
- asegurar cumplimiento de metas con la financiera de la marca

### Modulo 5. Campana / Atencion Critica

Cuando un cliente molesto toca la campana:

- cualquier gerente puede levantar el incidente
- se registra area, hora, responsable y motivo
- se asigna seguimiento
- queda evidencia de cierre
- escala a Gerente General y, si aplica, a Director

### Modulo 6. Post-Venta y Retencion

Este es el diferenciador fuerte.

Se debe controlar:

- entrega de unidad
- primer seguimiento post-venta
- recordatorios de servicio
- contacto para recompra
- contacto de renovacion
- clientes sin seguimiento en ventana critica

Hipotesis central del cliente:

- el 75% vuelve a comprar marca
- lo que se pierde es agencia y vendedor
- el sistema debe impedir que se pierda ese seguimiento

### Modulo 7. Broadcast Interno

Automatizaciones:

- convocatoria diaria de las 8:00 a.m.
- envio del himno o audio institucional
- avisos generales por agencia
- avisos por area

## Casos de Uso

### UC-01. Director de Marca revisa desempeno multisucursal

Actor:

- Director o Gerente de Marca

Objetivo:

- comparar agencias y detectar desviaciones

Entrada:

- rango de fechas
- agencia
- area

Salida:

- prospectos
- pruebas de manejo
- cierres
- conversion
- incidentes de campana
- clientes en riesgo post-venta

### UC-02. Gerente General revisa operacion diaria de su agencia

Actor:

- Gerente General

Objetivo:

- saber si la agencia va en linea con metas diarias y mensuales

Salida:

- resumen por area
- vendedores en riesgo
- operaciones atoradas
- incidentes abiertos
- pendientes de seguimiento

### UC-03. Gerente Comercial corre junta diaria de pendientes

Actor:

- Gerente Comercial

Objetivo:

- abrir la junta con informacion actualizada y no con memoria informal

Salida:

- pendientes por vendedor
- autos no conseguidos
- descuentos no aprobados
- enganches listos
- documentos faltantes
- avalúos pendientes
- pruebas de manejo faltantes

### UC-04. Vendedor registra actividad diaria

Actor:

- Vendedor

Objetivo:

- reportar su avance sin friccion

Acciones:

- registrar cliente nuevo
- registrar seguimiento
- registrar prueba de manejo
- registrar apartado
- registrar solicitud de credito
- registrar toma de usado
- reportar bloqueo

### UC-05. Gerente detecta vendedor con bajo pipeline

Actor:

- Gerente Comercial

Regla:

- si no hay pruebas de manejo, no hay pipeline sano

Salida:

- alerta por vendedor
- recomendacion de intervencion

### UC-06. Se levanta incidente de campana

Actor:

- cualquier gerente

Entrada:

- cliente
- area
- descripcion
- responsable inicial

Salida:

- incidente abierto
- notificacion a niveles superiores
- SLA de atencion

### UC-07. Post-venta no atendida

Actor:

- sistema

Regla:

- si no hubo seguimiento despues de la entrega en una ventana definida, se genera alerta

Salida:

- tarea de contacto
- reporte de riesgo de fuga

### UC-08. Broadcast diario institucional

Actor:

- sistema o gerente general

Disparador:

- 8:00 a.m.

Salida:

- mensaje de convocatoria
- audio del himno
- registro de envio

## Entidades Clave

- grupo_automotriz
- marca
- agencia
- area
- usuario
- rol
- vendedor
- cliente
- prospecto
- seguimiento
- prueba_manejo
- apartado
- operacion_venta
- solicitud_credito
- subvencion
- financiera
- auto_usado_tomado
- incidente_campana
- tarea_operativa
- contacto_postventa
- broadcast
- reporte_diario

## KPIs Minimos

### Ventas

- clientes nuevos por vendedor
- seguimientos por vendedor
- pruebas de manejo por vendedor
- apartados
- solicitudes de credito completas
- operaciones cerradas
- conversion visita a venta

### Gerencia

- pronostico de cierre de mes
- operaciones bloqueadas
- cumplimiento por financiera
- subvencion aplicada por vendedor

### Post-Venta

- clientes contactados post-entrega
- clientes sin seguimiento
- clientes recuperados
- retencion por agencia

### Servicio al Cliente

- incidentes de campana
- tiempo de respuesta
- tiempo de cierre
- reincidencia por area

## MVP Recomendado

### Fase 1. Control Comercial Diario

- jerarquia y permisos
- vendedores y gerentes
- clientes nuevos
- seguimientos
- pruebas de manejo
- pendientes de junta diaria
- reportes por vendedor y agencia

### Fase 2. Financiamiento y Bloqueos

- documentos faltantes
- subvenciones
- financiera de la marca
- pipeline de cierre

### Fase 3. Campana y Atencion Critica

- modulo de incidente
- alertas y seguimiento
- tableros de gerencia

### Fase 4. Post-Venta

- seguimiento post-entrega
- recompra
- alertas de fuga

### Fase 5. Broadcast Interno

- convocatoria diaria
- himno
- mensajes por area o agencia

## Reglas de Negocio Importantes

- una prueba de manejo es predictor operativo de cierre
- una operacion sin seguimiento no puede considerarse sana
- una subvencion debe quedar trazable
- un incidente de campana no puede cerrarse sin responsable y evidencia
- el Director de Marca siempre debe tener vista consolidada
- el Gerente General siempre debe tener vista total de su agencia

## Riesgo de Malentender el Proyecto

Errores que conviene evitar:

- hacerlo demasiado generico y perder el enfoque automotriz
- enfocarse solo en tareas internas y no en conversion comercial
- olvidar post-venta, que es donde el cliente dice que se pierde dinero
- no reflejar la jerarquia real entre marca, agencia, area y operativo

## Siguiente Decision Correcta

Si quieren construir sobre esto con orden, el mejor siguiente paso no es empezar por el himno.

El mejor siguiente paso es:

1. cerrar modelo jerarquico y permisos
2. definir modulo comercial diario
3. definir el flujo de campana
4. dejar broadcast como automatizacion posterior

El himno es facil. Lo dificil y valioso es capturar bien ventas, seguimiento, conversion y post-venta.
