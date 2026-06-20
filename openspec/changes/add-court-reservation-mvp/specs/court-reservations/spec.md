# Especificacion de reservas de canchas

## Requisitos agregados

### Requisito: Los usuarios registrados pueden reservar turnos disponibles

El sistema DEBE permitir que los usuarios registrados creen reservas de cancha para turnos disponibles en un solo club.

#### Escenario: El usuario crea una reserva pendiente

- **DADO** que un usuario registrado esta autenticado
- **Y** una cancha activa tiene disponibilidad para el rango horario seleccionado
- **CUANDO** el usuario selecciona fecha, cancha, hora de inicio y una duracion valida
- **ENTONCES** el sistema crea una reserva con estado `pending_payment`
- **Y** el horario seleccionado de la cancha queda temporalmente no disponible para otros usuarios.

### Requisito: Las duraciones de turno soportadas son fijas

El sistema DEBE permitir solo duraciones de reserva de 60 a 900 minutos en incrementos de 30 minutos.

#### Escenario: El usuario selecciona una duracion soportada

- **DADO** que un usuario esta creando una reserva
- **CUANDO** selecciona una duracion entre 60 y 900 minutos en incrementos de 30 minutos
- **ENTONCES** el sistema acepta la duracion.

#### Escenario: El usuario selecciona una duracion no soportada

- **DADO** que un usuario esta creando una reserva
- **CUANDO** selecciona una duracion menor a 60 minutos, mayor a 900 minutos o no alineada a incrementos de 30 minutos
- **ENTONCES** el sistema rechaza la solicitud de reserva.

### Requisito: La disponibilidad se calcula para la duracion completa

El sistema DEBE mostrar un turno como disponible solo cuando la duracion completa solicitada esta libre para una cancha.

#### Escenario: La duracion completa esta disponible

- **DADO** que una cancha no tiene reservas ni bloqueos superpuestos para el rango solicitado
- **Y** el rango solicitado esta dentro del horario de apertura del club
- **CUANDO** el usuario busca disponibilidad
- **ENTONCES** el sistema muestra el turno como disponible.

#### Escenario: Solo una parte de la duracion esta disponible

- **DADO** que una cancha tiene una reserva o bloqueo superpuesto dentro de la duracion solicitada
- **CUANDO** el usuario busca disponibilidad
- **ENTONCES** el sistema no muestra el turno como disponible.

### Requisito: Las reservas pendientes expiran

El sistema DEBE expirar las reservas pendientes de pago que no se paguen antes de su hora de expiracion.

#### Escenario: La reserva pendiente expira

- **DADO** que una reserva esta en estado `pending_payment`
- **Y** su hora de expiracion ya paso
- **CUANDO** el sistema evalua el estado de la reserva
- **ENTONCES** la reserva pasa a `expired`
- **Y** el horario de la cancha vuelve a estar disponible.

### Requisito: Las reservas confirmadas y pendientes activas bloquean disponibilidad

El sistema DEBE tratar las reservas confirmadas y las reservas pendientes de pago no expiradas como horario no disponible.

#### Escenario: Otro usuario busca un horario retenido

- **DADO** que una reserva esta en estado `pending_payment`
- **Y** la reserva no expiro
- **CUANDO** otro usuario busca disponibilidad superpuesta
- **ENTONCES** el horario superpuesto de la cancha no se muestra como disponible.

#### Escenario: Otro usuario busca un horario confirmado

- **DADO** que una reserva esta en estado `confirmed`
- **CUANDO** otro usuario busca disponibilidad superpuesta
- **ENTONCES** el horario superpuesto de la cancha no se muestra como disponible.

### Requisito: Los usuarios pueden cancelar reservas elegibles

El sistema DEBE permitir que los usuarios cancelen reservas confirmadas hasta 3 horas antes del inicio de la reserva.

#### Escenario: El usuario cancela antes del limite

- **DADO** que un usuario tiene una reserva confirmada
- **Y** la reserva empieza en mas de 3 horas
- **CUANDO** el usuario cancela la reserva
- **ENTONCES** el estado de la reserva pasa a `cancelled_by_user`
- **Y** el horario de la cancha queda disponible
- **Y** la seña no se reembolsa.

#### Escenario: El usuario intenta cancelar despues del limite

- **DADO** que un usuario tiene una reserva confirmada
- **Y** la reserva empieza en 3 horas o menos
- **CUANDO** el usuario intenta cancelar la reserva
- **ENTONCES** el sistema rechaza la cancelacion.
