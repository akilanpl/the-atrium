import { test, expect } from "@playwright/test";
import sharp from "sharp";
for (const quality of ["LOW", "MEDIUM", "HIGH"]) {
  test(`art-review ${quality}: all actual environment components render`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/?visual-audit");
    await page
      .getByLabel("Audit quality", { exact: true })
      .selectOption(quality);
    for (const world of [
      "",
      "library",
      "observatory",
      "sanctuary",
      "forge",
      "manor",
      "garden",
    ]) {
      const before = Date.now();
      await page.getByLabel("Audit scene", { exact: true }).selectOption(world);
      await expect
        .poll(async () => {
          try {
            return JSON.parse(
              await page
                .getByLabel("Audit performance", { exact: true })
                .innerText(),
            ).sampledAt;
          } catch {
            return 0;
          }
        })
        .toBeGreaterThan(before + 3500);
      const image = await page.screenshot();
      const stats = await sharp(image).stats();
      expect(
        Math.max(...stats.channels.slice(0, 3).map((c) => c.stdev)),
      ).toBeGreaterThan(2);
      await info.attach(`${world || "atrium"}-${quality}-authoring-preview`, {
        body: image,
        contentType: "image/png",
      });
      await info.attach(`${world || "atrium"}-${quality}-metrics`, {
        body: await page
          .getByLabel("Audit performance", { exact: true })
          .innerText(),
        contentType: "application/json",
      });
    }
    expect(errors).toEqual([]);
  });
}
