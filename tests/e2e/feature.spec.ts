import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

test("alice queues a track → bob sees it in now-playing", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    await a.getByPlaceholder("title").fill("Mesh Anthem");
    await a.getByPlaceholder("artist").fill("Various Peers");
    await a.getByRole("button", { name: "queue it", exact: true }).click();

    await expect(b.locator(".track-now")).toContainText("Mesh Anthem");
    await expect(b.locator(".track-now")).toContainText("Various Peers");
    await expect(b.locator(".track-now")).toContainText("alice");
  } finally {
    await cleanup();
  }
});

test("bob's upvote re-ranks the playlist → alice sees the new top track", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await a.getByPlaceholder("your name").fill("alice");
    await b.getByPlaceholder("your name").fill("bob");
    await a.waitForTimeout(500);

    // Alice queues two tracks. The first one queued sorts to the top (tie-break
    // on ts), so it becomes "now playing" with zero votes.
    await a.getByPlaceholder("title").fill("First Track");
    await a.getByPlaceholder("artist").fill("Band A");
    await a.getByRole("button", { name: "queue it", exact: true }).click();
    await a.waitForTimeout(150);
    await a.getByPlaceholder("title").fill("Second Track");
    await a.getByPlaceholder("artist").fill("Band B");
    await a.getByRole("button", { name: "queue it", exact: true }).click();

    // Both peers agree on the initial ranking: First Track is on top.
    await expect(a.locator(".track-now-title")).toHaveText("First Track");
    await expect(b.locator(".track-now-title")).toHaveText("First Track");

    // Bob (the OPPOSITE peer from the queuer) upvotes the runner-up. Owners
    // cannot vote on their own tracks, so this vote can only come from bob,
    // and it must cross the mesh to change alice's view.
    await b
      .locator(".track-queue .track-row", { hasText: "Second Track" })
      .getByRole("button", { name: /^upvote/ })
      .click();

    // The advertised core action: the upvote propagates peer→peer and the
    // democratic ranking re-orders. Alice (who never voted) now sees the
    // upvoted Second Track promoted to now-playing.
    await expect(a.locator(".track-now-title")).toHaveText("Second Track");
    await expect(a.locator(".track-now")).toContainText("Band B");
    // And the demoted First Track drops into the rest-of-queue list on alice.
    await expect(a.locator(".track-queue")).toContainText("First Track");
  } finally {
    await cleanup();
  }
});
