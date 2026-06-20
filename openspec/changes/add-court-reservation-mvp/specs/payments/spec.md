# Especificacion de pagos

## Requisitos agregados

### Requisito: Las reservas requieren pago de seña con MercadoPago

El sistema DEBE requerir un pago de seña con MercadoPago antes de confirmar una reserva.

#### Escenario: El usuario inicia el pago

- **DADO** que una reserva esta en estado `pending_payment`
- **CUANDO** el usuario avanza al pago
- **ENTONCES** el sistema crea una preferencia de checkout de MercadoPago para la seña de la reserva
- **Y** guarda los metadatos de preferencia del proveedor.

### Requisito: El webhook aprobado confirma la reserva

El sistema DEBE confirmar reservas solo despues de recibir y validar un webhook de pago aprobado de MercadoPago.

#### Escenario: MercadoPago aprueba el pago

- **DADO** que una reserva esta en estado `pending_payment`
- **Y** MercadoPago envia un webhook de pago aprobado para la seña de la reserva
- **CUANDO** el sistema valida el evento de webhook
- **ENTONCES** el estado del pago se registra como aprobado
- **Y** el estado de la reserva pasa a `confirmed`.

### Requisito: El retorno del checkout del cliente no confirma la reserva

El sistema NO DEBE confirmar una reserva solamente por un retorno del checkout del lado cliente.

#### Escenario: El usuario vuelve del checkout antes de procesar el webhook

- **DADO** que un usuario vuelve del checkout de MercadoPago
- **Y** el webhook de aprobacion todavia no fue procesado
- **CUANDO** se muestra la pagina de reservas
- **ENTONCES** el sistema muestra el estado actual de la reserva
- **Y** no marca la reserva como confirmada a partir de la URL de retorno solamente.

### Requisito: La cancelacion del usuario no reembolsa la seña

El sistema DEBE retener la seña pagada cuando un usuario cancela una reserva confirmada.

#### Escenario: El usuario cancela una reserva pagada

- **DADO** que una reserva esta en estado `confirmed`
- **Y** el pago de seña vinculado esta aprobado
- **CUANDO** el usuario cancela antes del limite de cancelacion
- **ENTONCES** la reserva pasa a `cancelled_by_user`
- **Y** el pago permanece registrado como aprobado
- **Y** no se crea ningun reembolso automatico.

### Requisito: Los pagos aprobados tarde requieren revision

El sistema NO DEBE confirmar automaticamente una reserva expirada cuando llega un pago aprobado despues de la expiracion.

#### Escenario: El pago llega despues de la expiracion de la reserva

- **DADO** que una reserva esta en estado `expired`
- **CUANDO** llega un webhook aprobado de MercadoPago para esa reserva
- **ENTONCES** el sistema registra el evento de pago
- **Y** no marca la reserva como `confirmed`
- **Y** deja el evento disponible para revision administrativa.
