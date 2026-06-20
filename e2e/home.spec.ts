import { expect, test } from "@playwright/test";

test("home page shows the public landing actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "AppPadel" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Catamarca Turnos y Torneos de P.del/i }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Crear cuenta" })).toHaveAttribute(
    "href",
    "/register",
  );
  await expect(page.getByRole("link", { name: "Ingresar" })).toHaveAttribute(
    "href",
    "/login",
  );
});
