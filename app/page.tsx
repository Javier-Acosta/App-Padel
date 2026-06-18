import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-[#f6f7f4] text-[#1b241f]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-between px-6 py-8 sm:px-10">
        <nav className="flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold tracking-normal">
            AppPadel
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link
                href="/reservas"
                className="rounded-md bg-[#164b35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0f3827]"
              >
                Mis reservas
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-medium text-[#24332b] transition hover:bg-white"
                >
                  Ingresar
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-[#164b35] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#0f3827]"
                >
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="grid gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
              Reserva online
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-[#18231d] sm:text-5xl">
              Turnos de padel confirmados con seña por MercadoPago.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-[#526158]">
              AppPadel centraliza la agenda del club, evita cruces de horarios y
              prepara el flujo para reservar canchas con usuarios registrados.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={user ? "/reservas" : "/register"}
                className="inline-flex h-12 items-center justify-center rounded-md bg-[#164b35] px-5 text-sm font-semibold text-white transition hover:bg-[#0f3827]"
              >
                {user ? "Ir a reservas" : "Empezar ahora"}
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-[#c8d0c7] bg-white px-5 text-sm font-semibold text-[#26382f] transition hover:border-[#8ea090]"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#526158]">Agenda</p>
                <h2 className="text-xl font-semibold">Hoy</h2>
              </div>
              <span className="rounded-md bg-[#edf4ef] px-3 py-1 text-sm font-medium text-[#164b35]">
                MVP
              </span>
            </div>
            <div className="grid gap-3">
              {["Cancha 1", "Cancha 2", "Cancha 3"].map((court, index) => (
                <div
                  key={court}
                  className="grid grid-cols-[96px_1fr_auto] items-center gap-3 rounded-md border border-[#e2e6df] p-3"
                >
                  <span className="text-sm font-medium text-[#26382f]">
                    {court}
                  </span>
                  <div className="h-2 rounded-full bg-[#e8ece5]">
                    <div
                      className="h-2 rounded-full bg-[#d7743f]"
                      style={{ width: `${35 + index * 18}%` }}
                    />
                  </div>
                  <span className="text-sm text-[#526158]">
                    {index + 2} libres
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
