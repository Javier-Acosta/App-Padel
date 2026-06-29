# AppPadel

AppPadel es una aplicación web para organizar turnos de pádel en un club. Permite que los jugadores creen una cuenta, consulten disponibilidad, reserven una cancha y paguen una seña online. También incluye un panel administrativo para gestionar canchas, precios, horarios, promociones, bloqueos y estados de reservas.

Aplicación publicada: [https://187.77.225.53/](https://187.77.225.53/)

> Nota de entrega: si el navegador muestra una advertencia de certificado en la URL publicada "La conexión no es privada", tienes que ir a Avanzado, luego Continuar a 187.77.225.53 (no seguro).

## Problema y usuarios

Muchos clubes o grupos deportivos gestionan turnos por mensajes, planillas o llamados, lo que puede generar cruces de horarios, reservas duplicadas y poca visibilidad para el jugador. AppPadel busca centralizar ese proceso en una experiencia simple.

Usuarios principales:

- Jugador: consulta disponibilidad, arma una reserva y paga la seña.
- Administrador: configura canchas, horarios, precios, promociones, bloqueos y seguimiento de reservas.

## Funcionalidades

- Registro e inicio de sesión.
- Vista pública con presentación del club y acceso a reservas.
- Consulta de disponibilidad por fecha, cancha y horario.
- Selección de turnos de 1 a 15 horas en bloques de 30 minutos.
- Creación de reservas pendientes de pago.
- Panel administrativo con agenda diaria, filtros, estados y resumen operativo.
- Configuración de canchas activas, horarios de apertura, precio base, seña y promociones.
- Bloqueo de canchas por mantenimiento u otros motivos.
- Tests end-to-end con Playwright para validar flujos principales.

## Capturas

Las capturas de referencia están en `public/capturas/`:

- Home: `public/capturas/home.png`
- Login: `public/capturas/login.png`
- Registro: `public/capturas/register.png`

Las pantallas autenticadas de reservas y panel admin se pueden capturar después de sembrar usuarios de prueba en un PocketBase local o de ingresar manualmente en el despliegue.

## Tecnologías utilizadas

- Next.js 16 con App Router.
- React 19.
- TypeScript.
- Tailwind CSS.
- PocketBase para autenticación y persistencia.
- Hostinger como alojamiento web
- Dokploy como despliegue y la gestión de aplicaciones web y bases de datos
- Mercado Pago Checkout Pro y webhook de pagos.
- Playwright para pruebas end-to-end.
- Codex para la implementación de la App, utilizando inteligencia artificial de OpenAI

## Estructura principal

- `app/page.tsx`: landing pública.
- `app/login` y `app/register`: autenticación.
- `app/reservas`: flujo del jugador.
- `app/admin`: panel administrativo.
- `app/api`: endpoints de autenticación, disponibilidad, reservas y pagos.
- `lib/padel`: reglas de negocio de disponibilidad, horarios, precios y datos.
- `lib/payments`: integración con Mercado Pago.
- `e2e`: pruebas de interfaz y flujos críticos.
- `docs/memoria-desarrollo.md`: memoria breve del trabajo final.

## Variables de entorno

Crear un archivo `.env.local` para desarrollo o configurar estas variables en producción:

```bash
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=change-me
MERCADOPAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_APP_URL` debe apuntar a la URL pública real para que Mercado Pago pueda redirigir al usuario y llamar al webhook:

```text
/api/payments/mercadopago/webhook
```

## Instalación y ejecución local

```bash
npm install
npm run dev
```

Luego abrir [http://localhost:3000](http://localhost:3000).

Para compilar producción:

```bash
npm run build
npm run start
```

## Datos iniciales

El proyecto incluye scripts para sincronizar y sembrar datos de prueba en PocketBase:

```bash
npm run pb:schema
npm run pb:seed
npm run pb:seed:users
```

Los usuarios de prueba se usan en los tests e2e:

- Jugador: `jugador.demo@app-padel.test`
- Clave: AppPadel123!

- Admin: `admin.demo@app-padel.test`
- Clave: AppPadel123!

## Pueden usar Tarjetas de créditos de Pruebas 

Tarjeta	Número :      5031 7557 3453 0604
Código de seguridad : 123
Fecha de caducidad :  11/30


## Pruebas

```bash
npm run lint
npm run build
npm run test:e2e
```

Durante la revisión se verificó que `npm run lint` y `npm run build` finalizan correctamente.

## Uso de inteligencia artificial

La IA se utilizó como copiloto para:

- Convertir la idea inicial en un MVP de reservas.
- Definir entidades, estados de reserva y reglas de disponibilidad.
- Revisar errores de codificación, validaciones y copy de interfaz.
- Generar documentación de entrega y memoria de desarrollo.
- Preparar una checklist contra el enunciado del trabajo final.

Las decisiones funcionales finales fueron revisadas manualmente para mantener el alcance viable y centrado en el usuario.

## Mejoras futuras

- Configurar HTTPS con certificado válido en la URL publicada.
- Integración con Mercado Pago para cobrar la seña.
- Webhook para actualizar pagos y confirmar reservas.
- Agregar notificaciones por email o WhatsApp.
- Generar reportes mensuales de reservas y recaudación.
- Permitir edición de reservas desde el jugador.
- Agregar roles más granulares para empleados del club.
