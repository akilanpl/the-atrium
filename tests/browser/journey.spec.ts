import { test, expect } from "@playwright/test";

test("cinematic journey: six worlds, scroll and both play entrances", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "THE ATRIUM", exact: true }),
  ).toBeVisible();
  await page
    .locator(".journey-nav")
    .getByRole("link", { name: "The worlds" })
    .click();
  await expect
    .poll(
      () =>
        page
          .locator("#doors")
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
      { timeout: 15000 },
    )
    .toBeLessThan(150);
  const names = [
    "Clockwork Library",
    "Astral Observatory",
    "Sunken Sanctuary",
    "Polarity Forge",
    "Shifting Manor",
    "Tempest Garden",
  ];
  for (const name of names) {
    const door = page.getByRole("button", { name: new RegExp(name) });
    await door.click();
    await expect(door).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("link", { name: "Discover this world" }).click();
  await expect
    .poll(
      () =>
        page
          .locator("#world-5")
          .evaluate((el) => Math.abs(el.getBoundingClientRect().top)),
      { timeout: 15000 },
    )
    .toBeLessThan(150);
  await expect(page.locator("#world-5 h2")).toBeInViewport();
  await page.screenshot({ path: "work/journey-world.png" });
  await page
    .locator("#portal")
    .getByRole("button", { name: "Enter the Atrium" })
    .click();
  await expect(page.getByPlaceholder("Enter a nickname")).toBeVisible();
  await page.goto("/");
  await page
    .locator(".journey-nav")
    .getByRole("button", { name: "Enter the Atrium" })
    .click();
  await expect(page.getByPlaceholder("Enter a nickname")).toBeVisible();
  expect(errors).toEqual([]);
});

test("cinematic journey: mobile, reduced motion and renderer fallback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      options?: unknown,
    ) {
      if (
        type === "webgl" ||
        type === "webgl2" ||
        type === "experimental-webgl"
      )
        return null;
      return original.call(this, type as "2d", options);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "THE ATRIUM", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByRole("link", { name: "The worlds", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Menu", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("button", { name: /Tempest Garden/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".journey-key-art")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
  await page.screenshot({ path: "work/journey-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
