// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForContextFeedLoad } from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

// BLOCK rendering reads the lookup off the table instance's meta
// (info.table.options.meta.blockLookup), so these cover a meta path the
// data-log's science_program column does not.
test.describe("Context Feed — BLOCK names and descriptions", () => {
  test("a block-details failure surfaces both source errors", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route("**/nightlydigest/api/block-details*", (route) =>
      route.fulfill({ status: 500, json: { detail: "boom" } }),
    );
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await expect(
      page.getByText("One or more data sources are unavailable."),
    ).toBeVisible();
    await expect(page.getByText(/jira-blocks/)).toBeVisible();
    await expect(page.getByText(/zephyr-blocks/)).toBeVisible();
  });
});
