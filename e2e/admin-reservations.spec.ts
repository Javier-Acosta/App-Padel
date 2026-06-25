import { expect, test } from "@playwright/test";

const testPassword = "AppPadel123!";
const playerEmail = "jugador.demo@app-padel.test";
const adminEmail = "admin.demo@app-padel.test";

test.describe.configure({ mode: "serial" });

function getFutureDateValue(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);

  return date.toISOString().slice(0, 10);
}

async function login(
  page: import("@playwright/test").Page,
  email: string,
) {
  const response = await page.request.post("/api/auth/login", {
    data: {
      email,
      password: testPassword,
    },
  });

  expect(response.ok()).toBe(true);
}

async function createPendingReservation(
  page: import("@playwright/test").Page,
  daysFromNow: number,
) {
  const reservationDate = getFutureDateValue(daysFromNow);

  await login(page, playerEmail);

  const availabilityResponse = await page.request.get(
    `/api/availability?date=${reservationDate}&duration=60`,
  );
  expect(availabilityResponse.ok()).toBe(true);

  const availability = (await availabilityResponse.json()) as {
    slots: Array<{ courtId: string; courtName: string; startsAt: string }>;
  };
  const slot = availability.slots[0];

  expect(slot).toBeTruthy();

  const reservationResponse = await page.request.post("/api/reservations", {
    data: {
      courtId: slot.courtId,
      date: reservationDate,
      startsAt: slot.startsAt,
      durationMinutes: 60,
    },
  });
  expect(reservationResponse.ok()).toBe(true);

  return { reservationDate, slot };
}

test("player sees a newly created pending reservation", async ({ page }) => {
  const { slot } = await createPendingReservation(page, 47);

  await page.goto("/reservas");

  const upcomingSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Mis proximos turnos" }),
  });

  await expect(upcomingSection.getByText(slot.courtName).first()).toBeVisible();
  await expect(upcomingSection.getByText("Pendiente de pago").first()).toBeVisible();
  await expect(upcomingSection.getByRole("button", { name: "Pagar sena" }).first()).toBeVisible();
});

test("admin manages reservations from filters and daily agenda", async ({ page }) => {
  const { reservationDate, slot } = await createPendingReservation(page, 53);

  await login(page, adminEmail);
  await page.goto(`/admin?date=${reservationDate}`);

  const agendaSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Agenda del dia" }),
  });

  await expect(agendaSection.getByText(slot.courtName).first()).toBeVisible();
  await expect(agendaSection.getByText("Pendiente de pago").first()).toBeVisible();
  await expect(agendaSection.getByText("Senas pendientes").first()).toBeVisible();
  await expect(agendaSection.getByText(/Total \$/).first()).toBeVisible();
  await expect(agendaSection.getByText(/Sena \$/).first()).toBeVisible();
  await expect(agendaSection.getByRole("link", { name: "Anterior" })).toHaveAttribute(
    "href",
    /\/admin\?date=/,
  );
  await expect(agendaSection.getByRole("link", { name: "Hoy" })).toHaveAttribute(
    "href",
    /\/admin\?date=/,
  );
  await expect(agendaSection.getByRole("link", { name: "Siguiente" })).toHaveAttribute(
    "href",
    /\/admin\?date=/,
  );

  const reservationsSection = page.locator("section", {
    has: page.getByRole("heading", { name: "Reservas proximas" }),
  });

  const reservationsForm = reservationsSection.locator("form").first();
  await reservationsForm.locator('select[name="status"]').selectOption(
    "pending_payment",
  );
  await reservationsForm.locator('input[name="date"]').fill(reservationDate);
  await reservationsForm.getByRole("button", { name: "Filtrar" }).click();

  await expect(page).toHaveURL(/status=pending_payment/);
  await expect(page).toHaveURL(new RegExp(`date=${reservationDate}`));
  await expect(reservationsSection.getByText("Jugador Demo").first()).toBeVisible();
  await expect(
    reservationsSection.locator("p").filter({ hasText: slot.courtName }).first(),
  ).toBeVisible();
  await expect(
    reservationsSection.locator("span").filter({ hasText: "Pendiente de pago" }).first(),
  ).toBeVisible();

  await reservationsSection.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(reservationsForm.locator('select[name="status"]')).toHaveValue(
    "",
  );
  await expect(reservationsForm.locator('input[name="date"]')).toHaveValue("");
  await expect(reservationsSection.getByText("Jugador Demo").first()).toBeVisible();

  await page.goto(`/admin?date=${reservationDate}`);
  const cancelButton = page
    .locator("section", { has: page.getByRole("heading", { name: "Agenda del dia" }) })
    .locator('button:not([disabled])')
    .filter({ hasText: "Cancelar" })
    .first();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("cancelar esta reserva");
    await dialog.accept();
  });
  await cancelButton.click();
  await expect(page.getByText("Cancelada por admin").first()).toBeVisible();
});
