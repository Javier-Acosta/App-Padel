# Tareas

## 1. Fundacion

- [x] Definir el modelo de datos para usuarios, canchas, configuracion del club, promociones, bloqueos, reservas y pagos.
- [x] Elegir y configurar la capa de persistencia.
- [x] Agregar validacion del lado servidor para duraciones permitidas, limite de cancelacion y estados de reserva.
- [x] Crear y ejecutar la sincronizacion del esquema de PocketBase para las colecciones del MVP.

## 2. Autenticacion y roles

- [x] Implementar registro e inicio de sesion de usuarios.
- [x] Agregar soporte para roles de usuario y administrador.
- [x] Proteger rutas de reservas y administracion segun rol.

## 3. Disponibilidad y flujo de reserva

- [x] Implementar calculo de disponibilidad para duraciones de reserva en incrementos de 30 minutos.
- [x] Excluir reservas confirmadas, reservas pendientes no expiradas y bloqueos administrativos de la disponibilidad.
- [x] Crear reservas pendientes de pago con expiracion.
- [ ] Expirar reservas pendientes antiguas y liberar sus horarios.
- [x] Evitar reservas activas superpuestas del lado servidor.

## 4. Pago con MercadoPago

- [ ] Crear preferencia de checkout de MercadoPago para senas de reserva.
- [ ] Guardar metadatos de preferencia y pago del proveedor.
- [ ] Implementar endpoint de webhook de MercadoPago.
- [ ] Confirmar reservas solo despues de recibir un webhook de pago aprobado.
- [ ] Registrar eventos de webhook tardios o no coincidentes para revision administrativa.

## 5. Experiencia de usuario

- [x] Construir vista de disponibilidad tipo calendario.
- [x] Permitir que los usuarios elijan fecha, duracion, cancha y hora de inicio disponible.
- [ ] Redirigir usuarios al checkout de MercadoPago.
- [ ] Mostrar estado de reserva despues del retorno del checkout.
- [ ] Agregar vista "Mis reservas".
- [ ] Permitir cancelacion de usuario hasta 3 horas antes del inicio.

## 6. Experiencia administrativa

- [ ] Construir vista de agenda administrativa por dia o semana.
- [ ] Agregar administracion de canchas.
- [ ] Agregar configuracion de horarios de apertura.
- [ ] Agregar configuracion de precio base y seña.
- [ ] Agregar administracion de promociones.
- [ ] Agregar administracion de bloqueos de cancha.
- [ ] Agregar detalle de reserva y cancelacion administrativa.

## 7. Verificacion

- [ ] Probar el flujo exitoso de reserva y confirmacion de pago.
- [ ] Probar timeout de pago y liberacion de horario.
- [ ] Probar prevencion de reservas superpuestas.
- [ ] Probar cancelacion de usuario antes y despues del limite de 3 horas.
- [ ] Probar aplicacion de precio/seña promocional.
- [ ] Probar que los bloqueos administrativos quiten disponibilidad.
