This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment variables

The app needs PocketBase credentials at runtime. Create `.env.local` for local
development, or configure these same variables in your production hosting
provider:

```bash
POCKETBASE_URL=http://127.0.0.1:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=change-me
```

`.env.local` is intentionally ignored by git, so production will not receive it
automatically. Add the variables in the server/platform environment and restart
the Next.js app after changing them.

If PocketBase runs on the same production server as Next.js, `POCKETBASE_URL`
can usually stay as `http://127.0.0.1:8090`. If PocketBase runs on another host,
use that server URL instead.

## Club hours and logo

Superusers can manage the club schedule from the PocketBase admin panel:

1. Open the `club_settings` collection.
2. Edit the `default` record.
3. Update `openingHours` to control available reservation hours.
4. Upload the club logo in the `logo` field.

Default hours are 8:00 to 23:00 every day:

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

To close a day, use `{ "closed": true, "ranges": [] }` for that day.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
