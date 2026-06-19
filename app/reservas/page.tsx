import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/app/components/logout-button";
import { ReservationPicker } from "@/app/components/reservation-picker";
import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import { getActiveCourts, getClubSettings } from "@/lib/padel/data";

export default async function ReservationsPage() {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    redirect("/login");
  }

  const [courts, settings] = await Promise.all([
    getActiveCourts(token),
    getClubSettings(token),
  ]);

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-6 py-8 text-[#1b241f]">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold">
            AppPadel
          </Link>
          <div className="flex items-center gap-2">
            {user.role === "admin" ? (
              <Link
                href="/admin"
                className="rounded-md bg-[#164b35] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f3827]"
              >
                Panel admin
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </nav>

        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
            Reservas
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Hola, {user.name}</h1>
          <p className="mt-3 max-w-2xl text-[#526158]">
            Elegi una fecha, cuantas horas queres jugar y revisa las canchas
            disponibles del club.
          </p>
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-md bg-[#164b35] px-5 text-sm font-semibold text-white transition hover:bg-[#0f3827]"
            >
              Ir al panel de administracion
            </Link>
          ) : null}
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Duraciones", "De 1 a 15 horas"],
            ["Pago", `Sena online de $${settings?.depositAmount ?? 0}`],
            ["Horario", "Todos los dias de 8:00 a 23:00"],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-[#526158]">{title}</p>
              <p className="mt-2 text-lg font-semibold text-[#26382f]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <ReservationPicker courts={courts} settings={settings} />
      </div>
    </main>
  );
}

