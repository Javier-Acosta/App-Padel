# Agregar MVP de reservas de canchas

## Resumen

Construir el primer MVP para una aplicacion de reservas de canchas de padel de un solo club. Los usuarios registrados pueden explorar horarios disponibles en un calendario, elegir un turno de al menos 60 minutos en incrementos de 30 minutos, pagar una seña no reembolsable mediante MercadoPago y recibir una reserva confirmada automaticamente cuando el pago sea aprobado.

## Motivacion

El club necesita un flujo digital de reservas que reduzca la coordinacion manual, evite reservas superpuestas y les de a los jugadores una forma clara de asegurar un turno de cancha. El pago de seña con MercadoPago garantiza compromiso antes de confirmar la reserva, manteniendo el saldo restante pagadero en el club.

## Alcance

- Registro de usuarios y flujo de reservas autenticado.
- Disponibilidad de canchas basada en calendario para un solo club.
- Multiples canchas con las mismas reglas base de precio.
- Duraciones de turno de al menos 60 minutos en incrementos de 30 minutos.
- Retencion temporal de la reserva mientras el pago esta pendiente.
- Checkout de MercadoPago para el pago de seña.
- Manejo de webhooks de MercadoPago para confirmacion de pago.
- Confirmacion automatica de la reserva luego de un pago aprobado.
- Cancelacion por parte del usuario hasta 3 horas antes del inicio.
- Seña no reembolsable ante cancelacion del usuario.
- Gestion administrativa de canchas, horarios de apertura, precio base, monto de seña, promociones, bloqueos y reservas.

## Fuera de alcance

- Comportamiento de marketplace multiclub.
- Pago online completo del precio de la cancha.
- Procesamiento automatico de reembolsos.
- Emparejamiento de jugadores o creacion social de partidos.
- Ranking competitivo y torneos.
- Aplicaciones moviles nativas.

## Criterios de exito

- Un usuario registrado puede reservar un horario disponible y pagar la seña online.
- Una reserva no se confirma hasta que MercadoPago informe un pago aprobado.
- Una retencion pendiente de pago expira y libera la disponibilidad si el pago no se completa a tiempo.
- Una reserva confirmada bloquea el horario de la cancha para todos los usuarios.
- Un usuario puede cancelar una reserva confirmada mas de 3 horas antes del inicio, liberando la cancha sin reembolsar la seña.
- Un administrador puede configurar los datos operativos necesarios para que el club use el sistema de reservas.
