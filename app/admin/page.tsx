import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createCourtAction,
  createCourtBlockAction,
  deleteCourtBlockAction,
  updateCourtAction,
  updateSettingsAction,
} from "@/app/admin/actions";
import { LogoutButton } from "@/app/components/logout-button";
import { getAuthToken, getCurrentUser } from "@/lib/auth/session";
import type { ClubSettings, Court } from "@/lib/domain/reservations";
import {
  getAllCourts,
  getClubSettingsRecord,
  getUpcomingCourtBlocks,
} from "@/lib/padel/data";

const dayLabels = [
  ["monday", "Lunes"],
  ["tuesday", "Martes"],
  ["wednesday", "Miercoles"],
  ["thursday", "Jueves"],
  ["friday", "Viernes"],
  ["saturday", "Sabado"],
  ["sunday", "Domingo"],
] as const;

const defaultSettings: ClubSettings = {
  openingHours: Object.fromEntries(
    dayLabels.map(([key]) => [
      key,
      { ranges: [{ startsAt: "08:00", endsAt: "23:00" }] },
    ]),
  ),
  basePrice: 12000,
  depositAmount: 3000,
  paymentHoldMinutes: 10,
  cancellationCutoffHours: 3,
};

function formatDateTime(value: string) {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day} ${hours}:${minutes}`;
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
      {label}
      {children}
    </label>
  );
}

function textInputClassName(extra = "") {
  return `h-10 rounded-md border border-[#cbd3c9] bg-white px-3 text-sm outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8] ${extra}`;
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="h-10 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827]"
    >
      {children}
    </button>
  );
}

function CourtForm({ court }: { court: Court }) {
  return (
    <form
      action={updateCourtAction}
      className="grid gap-3 rounded-md border border-[#e2e6df] p-4 md:grid-cols-[1fr_auto_auto]"
    >
      <input type="hidden" name="id" value={court.id} />
      <Field label="Nombre">
        <input
          name="name"
          defaultValue={court.name}
          required
          className={textInputClassName()}
        />
      </Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#26382f]">
        <input
          type="checkbox"
          name="active"
          defaultChecked={court.active}
          className="size-4 accent-[#164b35]"
        />
        Activa
      </label>
      <div className="self-end">
        <SubmitButton>Guardar</SubmitButton>
      </div>
    </form>
  );
}

export default async function AdminPage() {
  const [user, token] = await Promise.all([getCurrentUser(), getAuthToken()]);

  if (!user || !token) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/reservas");
  }

  const [courts, settingsRecord, blocks] = await Promise.all([
    getAllCourts(token),
    getClubSettingsRecord(token),
    getUpcomingCourtBlocks(token),
  ]);
  const settings = settingsRecord?.settings ?? defaultSettings;
  const courtNameById = new Map(courts.map((court) => [court.id, court.name]));

  return (
    <main className="min-h-screen bg-[#f6f7f4] px-6 py-8 text-[#1b241f]">
      <div className="mx-auto w-full max-w-6xl">
        <nav className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-lg font-semibold">
            AppPadel
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/reservas"
              className="rounded-md border border-[#cbd3c9] bg-white px-4 py-2 text-sm font-semibold text-[#26382f]"
            >
              Ver reservas
            </Link>
            <LogoutButton />
          </div>
        </nav>

        <section className="mt-10">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
            Administracion
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Panel del club</h1>
          <p className="mt-3 max-w-2xl text-[#526158]">
            Gestiona canchas, horarios generales, precios, senas y bloqueos de
            disponibilidad.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ["Canchas", courts.length],
            ["Activas", courts.filter((court) => court.active).length],
            ["Precio/hora", `$${settings.basePrice}`],
            ["Sena", `$${settings.depositAmount}`],
          ].map(([title, value]) => (
            <div
              key={title}
              className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-[#526158]">{title}</p>
              <p className="mt-2 text-xl font-semibold text-[#26382f]">
                {value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-[#26382f]">
                  Canchas
                </h2>
                <p className="mt-1 text-sm text-[#526158]">
                  Activa o desactiva canchas sin borrarlas del historial.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {courts.map((court) => (
                <CourtForm key={court.id} court={court} />
              ))}
            </div>

            <form
              action={createCourtAction}
              className="mt-5 grid gap-3 rounded-md bg-[#f6f7f4] p-4 md:grid-cols-[1fr_auto_auto]"
            >
              <Field label="Nueva cancha">
                <input
                  name="name"
                  placeholder="Cancha 4"
                  required
                  className={textInputClassName()}
                />
              </Field>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-[#26382f]">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked
                  className="size-4 accent-[#164b35]"
                />
                Activa
              </label>
              <div className="self-end">
                <SubmitButton>Crear</SubmitButton>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-[#26382f]">
              Configuracion
            </h2>
            <p className="mt-1 text-sm text-[#526158]">
              Valores usados para nuevas reservas.
            </p>

            <form action={updateSettingsAction} className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Precio por hora">
                  <input
                    type="number"
                    name="basePrice"
                    min="0"
                    defaultValue={settings.basePrice}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Sena">
                  <input
                    type="number"
                    name="depositAmount"
                    min="0"
                    defaultValue={settings.depositAmount}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Minutos para pagar">
                  <input
                    type="number"
                    name="paymentHoldMinutes"
                    min="1"
                    defaultValue={settings.paymentHoldMinutes}
                    className={textInputClassName()}
                  />
                </Field>
                <Field label="Horas limite cancelacion">
                  <input
                    type="number"
                    name="cancellationCutoffHours"
                    min="0"
                    defaultValue={settings.cancellationCutoffHours}
                    className={textInputClassName()}
                  />
                </Field>
              </div>

              <div className="grid gap-2">
                <p className="text-sm font-semibold text-[#26382f]">
                  Horarios por dia
                </p>
                {dayLabels.map(([dayKey, label]) => {
                  const day = settings.openingHours[dayKey];
                  const range = day?.ranges[0] ?? {
                    startsAt: "08:00",
                    endsAt: "23:00",
                  };

                  return (
                    <div
                      key={dayKey}
                      className="grid gap-2 rounded-md border border-[#e2e6df] p-3 sm:grid-cols-[90px_1fr_1fr_auto]"
                    >
                      <p className="self-center text-sm font-semibold text-[#26382f]">
                        {label}
                      </p>
                      <input
                        type="time"
                        name={`${dayKey}.startsAt`}
                        defaultValue={range.startsAt}
                        className={textInputClassName()}
                      />
                      <input
                        type="time"
                        name={`${dayKey}.endsAt`}
                        defaultValue={range.endsAt}
                        className={textInputClassName()}
                      />
                      <label className="flex items-center gap-2 text-sm font-medium text-[#526158]">
                        <input
                          type="checkbox"
                          name={`${dayKey}.closed`}
                          defaultChecked={day?.closed}
                          className="size-4 accent-[#164b35]"
                        />
                        Cerrado
                      </label>
                    </div>
                  );
                })}
              </div>

              <SubmitButton>Guardar configuracion</SubmitButton>
            </form>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-[#d9ded5] bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold text-[#26382f]">
            Bloqueos de cancha
          </h2>
          <p className="mt-1 text-sm text-[#526158]">
            Usa bloqueos para mantenimiento, clases, torneos o reservas
            administrativas.
          </p>

          <form
            action={createCourtBlockAction}
            className="mt-5 grid gap-3 rounded-md bg-[#f6f7f4] p-4 md:grid-cols-[1fr_160px_130px_130px_1fr_auto]"
          >
            <Field label="Cancha">
              <select
                name="courtId"
                required
                className={textInputClassName("appearance-none")}
              >
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fecha">
              <input
                type="date"
                name="date"
                min={getTodayValue()}
                defaultValue={getTodayValue()}
                className={textInputClassName()}
              />
            </Field>
            <Field label="Desde">
              <input
                type="time"
                name="startsAt"
                defaultValue="08:00"
                className={textInputClassName()}
              />
            </Field>
            <Field label="Hasta">
              <input
                type="time"
                name="endsAt"
                defaultValue="09:00"
                className={textInputClassName()}
              />
            </Field>
            <Field label="Motivo">
              <input
                name="reason"
                placeholder="Mantenimiento"
                required
                className={textInputClassName()}
              />
            </Field>
            <div className="self-end">
              <SubmitButton>Bloquear</SubmitButton>
            </div>
          </form>

          <div className="mt-5 grid gap-3">
            {blocks.length > 0 ? (
              blocks.map((block) => (
                <div
                  key={block.id}
                  className="grid gap-3 rounded-md border border-[#e2e6df] p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <div>
                    <p className="font-semibold text-[#26382f]">
                      {courtNameById.get(block.courtId) ?? "Cancha"}
                    </p>
                    <p className="mt-1 text-sm text-[#526158]">
                      {block.reason}
                    </p>
                  </div>
                  <p className="self-center text-sm font-medium text-[#526158]">
                    {formatDateTime(block.startsAt)} hasta{" "}
                    {formatDateTime(block.endsAt)}
                  </p>
                  <form action={deleteCourtBlockAction} className="self-center">
                    <input type="hidden" name="id" value={block.id} />
                    <button
                      type="submit"
                      className="h-10 rounded-md border border-[#d6b2a2] bg-white px-4 text-sm font-semibold text-[#7b3f28] transition hover:bg-[#fff3ee]"
                    >
                      Quitar
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-[#f6f7f4] p-4 text-sm text-[#526158]">
                No hay bloqueos proximos.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
