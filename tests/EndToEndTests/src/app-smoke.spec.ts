import { expect, test } from "@playwright/test";

test("root route loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Catalog Workspace" })).toBeVisible();
});
