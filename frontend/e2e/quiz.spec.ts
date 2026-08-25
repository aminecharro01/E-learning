import { test, expect } from "@playwright/test";

const DEMO_EMAIL = "apprenant@iat-academy.local";
const DEMO_PASSWORD = "Apprenant@123";

/** Seeded demo quiz — "Quiz — Français pro" (see backend/.../DemoDataSeeder.java). */
const QUIZ_ID = "c8b3f84b-9d7c-4fa8-8c01-7fadc49daa67";

async function loginAsDemoLearner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByLabel("Courriel ou matricule").fill(DEMO_EMAIL);
  await page.getByLabel("Mot de passe").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Embarquer" }).click();
  await expect(page).toHaveURL(/\/app/);
}

test.describe("Quiz taking flow", () => {
  test("learner can start, answer, and submit a quiz to see a result", async ({ page }) => {
    await loginAsDemoLearner(page);
    await page.goto(`/app/quiz/${QUIZ_ID}`);

    // Answer every question by picking its first option, until the submit button appears.
    for (let guard = 0; guard < 20; guard++) {
      const submitButton = page.getByRole("button", { name: "Soumettre" });
      if (await submitButton.isVisible().catch(() => false)) {
        await submitButton.click();
        break;
      }
      const options = page.locator("ul li button");
      await options.first().click();
      const nextButton = page.getByRole("button", { name: "Suivant" });
      if (await nextButton.isVisible().catch(() => false)) {
        await nextButton.click();
      }
    }

    await expect(page.getByRole("heading", { name: "Résultat" })).toBeVisible();
    await expect(page.getByText(/Score\s*:/)).toBeVisible();
  });
});
