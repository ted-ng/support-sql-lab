import { expect, test } from "@playwright/test";

test("support engineer investigates, repairs, and verifies duplicate invoices", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Duplicate invoices after webhook retry" })).toBeVisible();
  await page.getByRole("button", { name: "Reset lab" }).click();
  await page.getByRole("button", { name: "Run query" }).click();
  await expect(page.getByRole("status")).toContainText("9 rows");
  await page.getByRole("button", { name: "Apply guarded repair" }).click();
  await expect(page.getByRole("status")).toContainText("verification passed");
  await expect(page.getByText("One active invoice remains: 1")).toBeVisible();
});
