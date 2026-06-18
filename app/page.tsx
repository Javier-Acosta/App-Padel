import Image from "next/image";
import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";
import { getPublicClubSettings } from "@/lib/padel/data";

export default async function Home() {
  const [user, settings] = await Promise.all([
    getCurrentUser(),
    getPublicClubSettings(),
  ]);
  const hasClubLogo = Boolean(settings?.logoUrl);

  return (
    <main className="min-h-screen bg-[#10241b] text-white">
      <section className="relative min-h-screen overflow-hidden">
        <Image
          src="/images/padel-court-hero.png"
          alt="Cancha de padel del club"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07150f]/90 via-[#10241b]/68 to-[#10241b]/12" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07150f]/70 via-transparent to-[#07150f]/25" />

        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 sm:px-10">
          <nav className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-lg font-semibold tracking-normal"
            >
              {hasClubLogo ? (
                <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md bg-white/95 p-1.5 shadow-sm">
                  <Image
                    src="/api/club/logo"
                    alt="Logo del club"
                    width={48}
                    height={48}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                </span>
              ) : null}
              <span>AppPadel</span>
            </Link>

            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/reservas"
                  className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#164b35] transition hover:bg-[#edf4ef]"
                >
                  Mis reservas
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-md px-4 py-2 text-sm font-medium text-white transition hover:bg-white/12"
                  >
                    Ingresar
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-[#164b35] transition hover:bg-[#edf4ef]"
                  >
                    Crear cuenta
                  </Link>
                </>
              )}
            </div>
          </nav>

          <div className="flex flex-1 items-center py-16">
            <div className="max-w-2xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#f6c46b]">
                Reserva online
              </p>
              <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Turnos de padel confirmados con sena por MercadoPago.
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[#dbe8df]">
                AppPadel centraliza la agenda del club, evita cruces de horarios
                y prepara el flujo para reservar canchas con usuarios
                registrados.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={user ? "/reservas" : "/register"}
                  className="inline-flex h-12 items-center justify-center rounded-md bg-[#f6c46b] px-5 text-sm font-semibold text-[#10241b] transition hover:bg-[#ffd990]"
                >
                  {user ? "Ir a reservas" : "Empezar ahora"}
                </Link>
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center rounded-md border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/18"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>

          <div className="mb-4 grid gap-3 text-sm text-[#dbe8df] sm:grid-cols-3">
            {[
              ["Duraciones", "60, 90 y 120 minutos"],
              ["Pago", "Sena online"],
              ["Agenda", "Disponibilidad por cancha"],
            ].map(([title, value]) => (
              <div
                key={title}
                className="rounded-md border border-white/15 bg-white/10 px-4 py-3 backdrop-blur"
              >
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
