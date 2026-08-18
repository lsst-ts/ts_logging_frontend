// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  waitForContextFeedLoad,
  tableRows,
} from "../../helpers/contextfeed-helpers.js";
import { CONTEXTFEED_URL } from "../../helpers/constants.js";

// BLOCK rendering reads the lookup off the table instance's meta
// (info.table.options.meta.blockLookup), so these cover a meta path the
// data-log's science_program column does not.
test.describe("Context Feed — BLOCK names and descriptions", () => {
  test("BLOCK names render as links when the lookup resolves", async ({
    page,
  }) => {
    await setupApiMocks(page, { "block-details": "context-feed-blocks" });
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    const blockRow = tableRows(page).filter({ hasText: "BLOCK-T249" });
    const link = blockRow.getByRole("link", { name: "BLOCK-T249" });

    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "https://rubinobs.atlassian.net/projects/BLOCK/BLOCK-T249",
    );
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("the BLOCK summary replaces the raw description", async ({ page }) => {
    await setupApiMocks(page, { "block-details": "context-feed-blocks" });
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    const blockRow = tableRows(page).filter({ hasText: "BLOCK-T249" });
    await expect(blockRow).toContainText("Wide-fast-deep survey block");
    await expect(blockRow).not.toContainText("Block T249 started");

    const otherRow = tableRows(page).filter({ hasText: "BLOCK-T250" });
    await expect(otherRow).toContainText("Twilight microsurvey block");
  });

  test("BLOCK names stay plain text when the lookup is empty", async ({
    page,
  }) => {
    // The default block-details mock returns an empty lookup.
    await setupApiMocks(page);
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    const blockRow = tableRows(page).filter({ hasText: "BLOCK-T249" });
    await expect(blockRow).toContainText("BLOCK-T249");
    await expect(blockRow.getByRole("link")).toHaveCount(0);
    // Falls back to the raw description from the feed.
    await expect(blockRow).toContainText("Block T249 started");
  });

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

  test("partial block errors still render the resolved BLOCKs", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "block-details": {
        data: {
          "BLOCK-T249": {
            summary: "Wide-fast-deep survey block",
            url: "https://rubinobs.atlassian.net/projects/BLOCK/BLOCK-T249",
            source: "zephyr",
          },
        },
        errors: { jira: "Jira unavailable" },
      },
    });
    await page.goto(CONTEXTFEED_URL);
    await waitForContextFeedLoad(page);

    await expect(
      tableRows(page)
        .filter({ hasText: "BLOCK-T249" })
        .getByRole("link", { name: "BLOCK-T249" }),
    ).toBeVisible();
    await expect(page.getByText(/jira-blocks/)).toBeVisible();
  });
});
