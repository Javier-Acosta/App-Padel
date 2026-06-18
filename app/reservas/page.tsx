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
          <LogoutButton />
        </nav>

        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
            Reservas
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Hola, {user.name}</h1>
          <p className="mt-3 max-w-2xl text-[#526158]">
            Elegi una fecha, una duracion y revisa las canchas activas del
            club. En el proximo paso conectamos los horarios disponibles.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ["Duraciones", "60, 90 y 120 minutos"],
            ["Pago", `Sena online de $${settings?.depositAmount ?? 0}`],
            ["Cancelacion", "Permitida hasta 3 horas antes"],
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

