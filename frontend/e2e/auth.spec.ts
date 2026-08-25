import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "apprenant@iat-academy.local";
const DEMO_PASSWORD = "Apprenant@123";

test.describe("Login", () => {
  test("shows a French error message for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Courriel ou matricule").fill(DEMO_EMAIL);
    await page.getByLabel("Mot de passe").fill("wrong-password");
    await page.getByRole("button", { name: "Embarquer" }).click();

    await expect(page.locator(".auth-pass-alert")).toHaveText("Courriel ou mot de passe incorrect.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("redirects a valid learner to the learner dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Courriel ou matricule").fill(DEMO_EMAIL);
    await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Embarquer" }).click();

    await expect(page).toHaveURL(/\/app/);
  });
});
