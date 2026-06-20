# Especificacion de operaciones administrativas

## Requisitos agregados

### Requisito: El administrador puede gestionar canchas

El sistema DEBE permitir que los administradores creen, actualicen, activen y desactiven canchas del club.

#### Escenario: El administrador desactiva una cancha

- **DADO** que un administrador esta gestionando canchas
- **CUANDO** el administrador desactiva una cancha
- **ENTONCES** la cancha ya no aparece en nuevas busquedas de disponibilidad de usuarios.

### Requisito: El administrador puede configurar precios del club

El sistema DEBE permitir que los administradores configuren el precio base del club y el monto de seña usado para las reservas.

#### Escenario: El administrador actualiza el monto de seña

- **DADO** que un administrador cambia el monto de seña
- **CUANDO** un usuario crea una nueva reserva
- **ENTONCES** la nueva reserva usa el monto de seña actualizado, salvo que una promocion lo sobrescriba.

### Requisito: El administrador puede gestionar promociones

El sistema DEBE permitir que los administradores definan promociones que puedan sobrescribir el precio total y/o el monto de seña para turnos coincidentes.

#### Escenario: La promocion aplica a un turno coincidente

- **DADO** que una promocion activa coincide con la fecha y hora seleccionadas
- **CUANDO** un usuario crea una reserva para ese turno
- **ENTONCES** la reserva usa el precio promocional y/o la seña promocional.

#### Escenario: La promocion no coincide con el turno

- **DADO** que una promocion activa no coincide con la fecha u hora seleccionada
- **CUANDO** un usuario crea una reserva
- **ENTONCES** la reserva usa el precio estandar del club y la configuracion de seña.

### Requisito: El administrador puede bloquear horarios de cancha

El sistema DEBE permitir que los administradores bloqueen horarios de cancha para que los usuarios no puedan reservarlos.

#### Escenario: El administrador crea un bloqueo de cancha

- **DADO** que un administrador crea un bloqueo para un rango horario de una cancha
- **CUANDO** los usuarios buscan disponibilidad para ese rango
- **ENTONCES** el horario bloqueado no se muestra como disponible.

### Requisito: El administrador puede ver y gestionar reservas

El sistema DEBE permitir que los administradores vean reservas y cancelen reservas cuando sea necesario.

#### Escenario: El administrador cancela una reserva

- **DADO** que un administrador ve una reserva confirmada
- **CUANDO** el administrador cancela la reserva
- **ENTONCES** el estado de la reserva pasa a `cancelled_by_admin`
- **Y** el horario de la cancha queda disponible, salvo que otra regla lo bloquee.

### Requisito: El administrador puede configurar horarios de apertura

El sistema DEBE permitir que los administradores configuren los horarios de apertura del club usados por los calculos de disponibilidad.

#### Escenario: El usuario busca fuera del horario de apertura

- **DADO** que el club esta cerrado para el rango horario solicitado
- **CUANDO** un usuario busca disponibilidad
- **ENTONCES** el sistema no muestra turnos fuera del horario de apertura.
