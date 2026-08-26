import { expect, test, type Page } from "@playwright/test";

async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Settings" });
  if (!(await dialog.isVisible().catch(() => false))) return;

  const close = dialog.getByRole("button", { name: "close" });
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(dialog).toBeHidden();
}

test("the shared queue has an honest, keyboard-ready first screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await closeInitiallyOpenSettings(page);

  await expect(page.getByRole("main", { name: /choose the room’s next track/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Choose the room’s next track." })).toBeVisible();
  await expect(page.getByText(/This room coordinates the queue\./)).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.getByLabel("Track title")).toBeVisible();
  await expect(page.getByLabel("Artist")).toBeVisible();

  const action = page.getByRole("button", { name: "Add to queue", exact: true });
  await expect(action).toBeVisible();
  const box = await action.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? Infinity) + (box?.height ?? 0)).toBeLessThanOrEqual(844);

  await page.getByLabel("Your name").fill("aria");
  await page.getByLabel("Track title").fill("Permission to Dance");
  await page.getByLabel("Artist").fill("The Browser");
  await expect(action).toBeEnabled();
  await action.press("Enter");
  await expect(page.locator(".track-now-title")).toHaveText("Permission to Dance");
  await expect(page.getByText(/Audio opens only when someone chooses a source/i)).toBeVisible();
});

test("the stage and composer remain decisive on a wide viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1141, height: 602 });
  await page.goto("./", { waitUntil: "domcontentloaded" });
  await closeInitiallyOpenSettings(page);

  const stage = page.locator(".track-stage");
  const composer = page.locator(".track-composer");
  await expect(stage).toBeVisible();
  await expect(composer).toBeVisible();

  const [stageBox, composerBox] = await Promise.all([stage.boundingBox(), composer.boundingBox()]);
  expect(stageBox).not.toBeNull();
  expect(composerBox).not.toBeNull();
  expect(Math.abs((stageBox?.y ?? 0) - (composerBox?.y ?? 0))).toBeLessThan(18);
  expect(composerBox?.x ?? 0).toBeGreaterThan(stageBox?.x ?? 0);
  expect((composerBox?.y ?? Infinity) + (composerBox?.height ?? 0)).toBeLessThanOrEqual(602);
});
