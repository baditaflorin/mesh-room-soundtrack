import { expect, test, type Page } from "@playwright/test";

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Settings" });
  if (!(await dialog.isVisible().catch(() => false))) return;
  const close = dialog.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

test("untrusted source URLs remain text and never become executable links", async ({ page }) => {
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await closeInitiallyOpenSettings(page);

  await page.getByLabel("Your name").fill("security");
  await page.getByLabel("Track title").fill("Unsafe URL probe");
  await page.getByLabel("Artist").fill("Audit Lab");
  await page.locator(".track-source-details summary").click();
  await page.getByLabel("Source link").fill("javascript:alert(document.domain)");
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();

  const stage = page.locator(".track-now");
  await expect(stage).toContainText("Unsafe URL probe");
  await expect(stage.getByRole("link")).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
});
