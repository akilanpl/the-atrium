import { test, expect } from "@playwright/test";
test("cinematic journey: playable opening, skip, character preview and refresh recovery", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByLabel("YOUR NAME", { exact: true })).toBeVisible();
  await expect(page.locator(".cinematic-caption")).toBeVisible();
  await page.getByRole("button", { name: "Skip · Esc" }).click();
  await expect(page.locator(".cinematic-caption")).toHaveCount(0);
  await page.getByRole("button", { name: "Mara", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mara", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: info.outputPath("character-selection.png") });
  await page.reload();
  await expect(page.getByLabel("YOUR NAME", { exact: true })).toBeVisible();
  await expect(page.locator(".cinematic-caption")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("cinematic journey: reduced motion keeps immediate game controls", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByLabel("YOUR NAME", { exact: true })).toBeVisible();
  await expect(page.locator(".cinematic-caption")).toHaveCount(0, {
    timeout: 3000,
  });
});
