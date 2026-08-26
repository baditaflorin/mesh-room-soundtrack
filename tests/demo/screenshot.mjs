export default async function soundtrackScreenshot(page) {
  const settings = page.getByRole("dialog", { name: "Settings" });
  if (await settings.isVisible().catch(() => false)) {
    const close = settings.getByRole("button", { name: "close" });
    if (await close.isVisible().catch(() => false)) await close.click();
    else await page.keyboard.press("Escape");
  }

  await page.getByLabel("Your name").fill("Mira");
  await page.getByLabel("Track title").fill("Morning Signal");
  await page.getByLabel("Artist").fill("Mira & the Mesh");
  await page.getByRole("button", { name: "Add to queue", exact: true }).click();
  // Keep the asset focused on the live queue rather than its transient toast.
  await page.waitForTimeout(3800);
}
