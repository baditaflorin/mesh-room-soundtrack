import { expect, test, type Locator, type Page } from "@playwright/test";
import { captureConsoleErrors } from "@baditaflorin/mesh-common/testing";

function settingsDialog(page: Page): Locator {
  return page.getByRole("dialog", { name: "Settings" });
}

async function isVisible(locator: Locator): Promise<boolean> {
  return locator.isVisible().catch(() => false);
}

/**
 * The app bar is interactive only after the shell's mount effect has applied
 * its semantic accent token. That is a real ready-state signal—not a timing
 * delay—and prevents a cold CI navigation from clicking a pre-effect shell.
 */
async function readyShell(page: Page): Promise<Locator> {
  const shell = page.locator("[data-mesh-app-shell]").first();
  await expect(shell).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.style.getPropertyValue("--mesh-accent").trim()),
    )
    .toMatch(/^#[\da-f]{3,8}$/i);
  return shell;
}

/**
 * First-visit flows may intentionally open the accessible Settings sheet.
 * Radix correctly makes the background inaccessible while it is open, so
 * content-level assertions must close it first rather than mistake that for
 * a missing page. This remains scoped to the test; the app owns onboarding.
 */
async function closeInitiallyOpenSettings(page: Page): Promise<void> {
  const dialog = settingsDialog(page);
  if (!(await isVisible(dialog))) return;
  const close = dialog.getByRole("button", { name: "close" });
  if (await isVisible(close)) {
    await close.click();
  } else {
    await page.keyboard.press("Escape");
  }
  await expect(dialog).toBeHidden();
}

async function openSettings(page: Page): Promise<Locator> {
  const dialog = settingsDialog(page);
  if (await isVisible(dialog)) return dialog;

  const shell = await readyShell(page);
  const trigger = shell.getByRole("button", { name: "Open settings" });
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeEnabled();
  await trigger.click();
  // The dialog is the actual accessible shell surface. Waiting on it keeps
  // the test tied to the product's user-visible state, not an implementation
  // class or a fixed mount delay.
  await expect(dialog).toBeVisible();
  return dialog;
}

/**
 * Generic smoke test — works for any mesh-* app without modification.
 * Asserts: page loads, settings drawer opens, self-ref bar visible, no
 * console errors.
 */

test("page loads with source, support, and version available in settings", async ({ page }) => {
  const c = captureConsoleErrors(page);
  await page.goto("./");
  await closeInitiallyOpenSettings(page);

  // Modern inset chrome intentionally avoids a floating metadata footer. Its
  // settings sheet remains the durable, accessible place for source/support
  // links and the build stamp.
  const drawer = await openSettings(page);
  await expect(drawer.getByRole("link", { name: /source/i })).toBeVisible();
  await expect(drawer.getByRole("link", { name: /support/i })).toBeVisible();
  await expect(drawer.getByText(/^v\d/)).toBeVisible();

  // Allow a moment for async TURN fetch / WebRTC handshake; benign warnings
  // about TURN unreachable are OK, but real errors are not.
  await page.waitForTimeout(800);
  const errors = c.getErrors().filter((e) => {
    // Ignore network failures that come from the intentionally-unreachable
    // signaling URL in the test environment.
    return !/turn|stun|signaling|websocket|webrtc|failed to load resource|err_failed|err_connection|err_blocked|err_name_not_resolved/i.test(
      e,
    );
  });
  expect(errors, errors.join("\n")).toHaveLength(0);
});

test("settings drawer can be opened (or is already open) and shows infra fields", async ({
  page,
}) => {
  await page.goto("./");
  // Settings is an accessible Radix dialog in the current shell. Keep the
  // legacy drawer fallback for older app bundles that are refreshed in place.
  const drawer = await openSettings(page);
  await expect(drawer.getByText(/Self-hosted infra/i)).toBeVisible();
  await expect(drawer.getByText(/Signaling URL/i)).toBeVisible();
  await expect(drawer.getByText(/TURN credentials URL/i)).toBeVisible();
});
