# Diseno: MVP de reservas de canchas

## Modelo de producto

La aplicacion sirve a un club de padel. Todas las canchas pertenecen a ese club y comparten las mismas reglas base de precio. El sistema se enfoca en reservar horarios de cancha, no en armar grupos de jugadores para partidos.

## Roles principales

- `user`: jugador registrado que puede explorar disponibilidad, crear reservas, pagar senas y cancelar reservas elegibles.
- `admin`: operador del club que puede configurar canchas, horarios, precios, promociones, bloqueos y administrar reservas.

## Entidades principales

### User

- `id`
- `name`
- `email`
- `phone`
- `role`
- `createdAt`

### Court

- `id`
- `name`
- `active`
- `createdAt`
- `updatedAt`

Todas las canchas usan la misma configuracion base de precios para el MVP.

### ClubSettings

- `openingHours`
- `basePrice`
- `depositAmount`
- `paymentHoldMinutes`
- `cancellationCutoffHours`

Valores iniciales:

- `paymentHoldMinutes`: 10
- `cancellationCutoffHours`: 3

### Promotion

- `id`
- `name`
- `active`
- `startsAt`
- `endsAt`
- `daysOfWeek`
- `timeRange`
- `priceOverride`
- `depositOverride`

Las promociones son administradas por el administrador y pueden afectar el precio total, el monto de seña o ambos.

### CourtBlock

- `id`
- `courtId`
- `startsAt`
- `endsAt`
- `reason`
- `createdBy`

Los bloqueos se usan para mantenimiento, eventos privados, cierres por clima o retenciones manuales del administrador.

### Reservation

- `id`
- `userId`
- `courtId`
- `startsAt`
- `endsAt`
- `durationMinutes`
- `status`
- `totalPrice`
- `depositAmount`
- `expiresAt`
- `createdAt`
- `updatedAt`

Estados de reserva:

- `pending_payment`
- `confirmed`
- `expired`
- `cancelled_by_user`
- `cancelled_by_admin`
- `completed`
- `no_show`

### Payment

- `id`
- `reservationId`
- `provider`
- `providerPreferenceId`
- `providerPaymentId`
- `status`
- `amount`
- `rawWebhookData`
- `createdAt`
- `updatedAt`

Proveedor de pago para el MVP:

- `mercadopago`

## Flujo de reserva

```text
El usuario selecciona duracion
  -> El usuario selecciona fecha
  -> El sistema muestra horarios disponibles por cancha
  -> El usuario selecciona cancha y hora de inicio
  -> El sistema crea una reserva pending_payment
  -> El sistema crea una preferencia de checkout de MercadoPago
  -> El usuario paga la seña
  -> MercadoPago envia webhook
  -> El sistema valida el pago
  -> La reserva pasa a confirmed
```

## Reglas de disponibilidad

Un horario esta disponible solo cuando:

- La cancha esta activa.
- La duracion solicitada es de al menos 60 minutos, no supera los 900 minutos y esta alineada a incrementos de 30 minutos.
- El rango horario solicitado esta dentro del horario de apertura del club.
- Ninguna reserva confirmada se superpone con el rango solicitado.
- Ninguna reserva pendiente de pago no expirada se superpone con el rango solicitado.
- Ningun bloqueo administrativo se superpone con el rango solicitado.

La disponibilidad debe calcularse para toda la duracion seleccionada. Por ejemplo, una reserva de 90 minutos debe tener 90 minutos continuos libres.

## Retencion por pago pendiente

Cuando un usuario inicia el checkout, el sistema crea una reserva `pending_payment` con una marca de tiempo `expiresAt`. Mientras este pendiente y no haya expirado, el rango horario no esta disponible para otros usuarios.

Si el usuario no completa el pago antes de la expiracion:

- la reserva pasa a `expired`;
- el horario de la cancha vuelve a estar disponible.

Si llega un pago aprobado de MercadoPago despues de que la reserva haya expirado, el sistema no debe confirmar automaticamente la reserva. El pago debe registrarse para revision administrativa.

## Confirmacion de pago

El webhook de MercadoPago es la fuente de verdad para confirmar reservas. Las URLs de retorno del cliente pueden mostrar un resultado intermedio, pero no deben confirmar la reserva sin validacion del webhook.

Solo los pagos de seña aprobados confirman reservas.

## Reglas de cancelacion

Los usuarios pueden cancelar reservas confirmadas hasta 3 horas antes de `startsAt`.

Ante una cancelacion del usuario:

- el estado de la reserva pasa a `cancelled_by_user`;
- el horario de cancha se libera;
- la seña no se reembolsa;
- el registro de pago permanece vinculado a la reserva cancelada.

Los administradores pueden cancelar reservas sin importar el limite horario. El manejo de reembolsos queda fuera del alcance del MVP y permanece como decision operativa manual.

## Operaciones administrativas

La interfaz administrativa debe soportar:

- Administrar canchas.
- Administrar horarios de apertura del club.
- Administrar precio base y monto de seña.
- Administrar promociones.
- Crear y eliminar bloqueos de cancha.
- Ver agenda por dia o semana.
- Ver detalles de reserva y estado de pago.
- Cancelar reservas.

## Integridad de datos

El sistema debe evitar reservas activas superpuestas para la misma cancha. Los estados que bloquean disponibilidad son:

- `pending_payment` cuando no esta expirada
- `confirmed`

La implementacion debe hacer cumplir la prevencion de superposiciones del lado servidor durante la creacion y confirmacion de reservas.
