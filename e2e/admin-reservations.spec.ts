import { expect, test } from "@playwright/test";

const testPassword = "AppPadel123!";
const playerEmail = "jugador.demo@app-padel.test";
const adminEmail = "admin.demo@app-padel.test";

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

test("admin sees a newly created reservation and can clear filters", async ({
  page,
}) => {
  const reservationDate = getFutureDateValue(7);

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

  await login(page, adminEmail);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin$/);

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

  await page.goto(`/admin?status=pending_payment&date=${reservationDate}`);
  await reservationsSection
    .locator('button:not([disabled])')
    .filter({ hasText: "Cancelar" })
    .first()
    .click();
  await page.waitForLoadState("networkidle");
});
