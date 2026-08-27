// @ts-check
import { test, expect } from "@playwright/test";
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
});
