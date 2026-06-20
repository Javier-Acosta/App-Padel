# AppPadel

Este es un proyecto [Next.js](https://nextjs.org) creado con [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Primeros pasos

Primero, inicia el servidor de desarrollo:

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador para ver el resultado.

## Variables de entorno

La app necesita credenciales de PocketBase en tiempo de ejecucion. Crea `.env.local` para desarrollo local, o configura estas mismas variables en tu proveedor de hosting de produccion:

```bash
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=change-me
MERCADOPAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`.env.local` esta ignorado intencionalmente por git, por lo que produccion no lo recibira automaticamente. Agrega las variables en el entorno del servidor o plataforma y reinicia la app Next.js despues de cambiarlas.

Si PocketBase corre en el mismo servidor de produccion que Next.js, `POCKETBASE_URL` normalmente puede quedar como `http://127.0.0.1:8090`. Si PocketBase corre en otro host, usa la URL de ese servidor.

`MERCADOPAGO_ACCESS_TOKEN` se usa del lado servidor para crear preferencias de Checkout Pro y validar notificaciones de pago. `NEXT_PUBLIC_APP_URL` debe ser la URL publica que Mercado Pago puede alcanzar, porque se usa para las URLs de retorno del checkout y para el endpoint de webhook:

```text
/api/payments/mercadopago/webhook
```

## Horarios y logo del club

Los superusuarios pueden administrar el horario del club desde el panel de administracion de PocketBase:

1. Abre la coleccion `club_settings`.
2. Edita el registro `default`.
3. Actualiza `openingHours` para controlar los horarios disponibles para reservas.
4. Sube el logo del club en el campo `logo`.

Los horarios predeterminados son de 8:00 a 23:00 todos los dias:

```json
{
  "monday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "tuesday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "wednesday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "thursday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "friday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "saturday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] },
  "sunday": { "ranges": [{ "startsAt": "08:00", "endsAt": "23:00" }] }
}
```

Para cerrar un dia, usa `{ "closed": true, "ranges": [] }` en ese dia.

Puedes empezar a editar la pagina modificando `app/page.tsx`. La pagina se actualiza automaticamente mientras editas el archivo.

Este proyecto usa [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) para optimizar y cargar automaticamente [Geist](https://vercel.com/font), una familia tipografica de Vercel.

## Mas informacion

Para aprender mas sobre Next.js, consulta estos recursos:

- [Documentacion de Next.js](https://nextjs.org/docs) - aprende sobre las funciones y API de Next.js.
- [Learn Next.js](https://nextjs.org/learn) - un tutorial interactivo de Next.js.

Tambien puedes revisar el [repositorio de Next.js en GitHub](https://github.com/vercel/next.js); los comentarios y contribuciones son bienvenidos.

## Despliegue en Vercel

La forma mas sencilla de desplegar tu app Next.js es usar la [plataforma Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme), de los creadores de Next.js.

Consulta la [documentacion de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para mas detalles.
