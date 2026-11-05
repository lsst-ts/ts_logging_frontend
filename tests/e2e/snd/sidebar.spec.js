// @ts-check
import { test, expect } from "../helpers/snd-test.js";
import { setupApiMocks } from "../helpers/mock-api.js";
import { DIGEST_URL } from "../helpers/constants.js";

test.describe("Scientific Nightly Digest — sidebar footer", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
  });

  // The internal app has no such link; see
  // tests/e2e/mocked/shared/sidebar.spec.js.
  test("links to the LSST Community Forum above the version", async ({
    page,
  }) => {
    const footer = page.locator("[data-slot='sidebar-footer']");
    const link = footer.getByRole("link", { name: "LSST Community Forum" });

    await expect(link).toHaveAttribute(
      "href",
      "https://community.lsst.org/c/support",
    );
    await expect(link).toHaveAttribute("target", "_blank");

    const forum = await link.boundingBox();
    const version = await footer.getByText(/^Nightly Digest/).boundingBox();
    expect(forum.y).toBeLessThan(version.y);
  });

  test("points at the forum's Support category on hover", async ({ page }) => {
    const link = page
      .locator("[data-slot='sidebar-footer']")
      .getByRole("link", { name: "LSST Community Forum" });
    const tooltip = page.locator("[data-slot='tooltip-content']");

    await expect(tooltip).toHaveCount(0);

    await link.hover();

    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText(
      "Questions? Please ask in the Support category of the Rubin Community Forum, and Rubin staff will respond.",
    );
  });
});

test.describe("Scientific Nightly Digest — dayobs calendar", () => {
  // 05:00 UTC is still dayobs 20260101, but already 2 January in Auckland.
  test.use({ timezoneId: "Pacific/Auckland" });

  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-01-02T05:00:00Z"));
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
  });

  // The internal app leaves later days selectable; see
  // tests/e2e/mocked/shared/sidebar.spec.js.
  test("stops at the current dayobs even when the local date runs ahead", async ({
    page,
  }) => {
    await page.getByLabel("Night (dayobs)").click();

    const day = (isoDate) => page.locator(`[data-day="${isoDate}"]`);
    await expect(day("2026-01-02")).toHaveAttribute("data-disabled", "true");
    await expect(day("2026-01-01")).not.toHaveAttribute("data-disabled");
    await expect(day("2026-01-01")).toHaveAttribute("data-today", "true");
  });
});
