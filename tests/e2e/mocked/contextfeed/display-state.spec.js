// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  getContextFeedUrl,
  waitForContextFeedLoad,
} from "../../helpers/contextfeed-helpers.js";
import { expectNoDataMessageInPlots } from "../../helpers/echarts-helpers.js";

const NO_OBS_DATA = "No observatory status data available.";

async function forceStatus(page, endpoint, status) {
  await page.route(`**/api/${endpoint}*`, (route) =>
    route.fulfill({ status, body: "error" }),
  );
}

test.describe("Context Feed — fetch failure", () => {
  test("shows an error message on the timeline and under the table when context-feed fails", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await forceStatus(page, "context-feed", 500);
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(
      page.getByText("Context feed data could not be fetched."),
    ).toHaveCount(2);

    await expect(
      page.locator("[data-slot='obs-status-timeline']").first(),
    ).toBeVisible();
  });

  test("shows an error message (no shell) when obs-status fails", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await forceStatus(page, "obs-status", 500);
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(
      page.getByText("Observatory Status data could not be fetched."),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: /availability warning/ }),
    ).toHaveCount(0);
  });
});

test.describe("Context Feed — no data", () => {
  test("shows the timeline shell and a message under the table when context-feed has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, { "context-feed": { data: [], cols: [] } });
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(page.locator("[data-slot='timeline']")).toBeVisible();
    // Canvas text needs an ECharts check; table text is in the DOM.
    await expectNoDataMessageInPlots(page, "No context feed data available.");
    await expect(page.getByText("No context feed data available.")).toHaveCount(
      1,
    );
  });

  test("shows a shell on the obs-status timeline when observatory status has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "obs-status": {
        entries: [],
        availability: { status: "full", available_from: null },
      },
    });
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(
      page.locator("[data-slot='obs-status-timeline']").first(),
    ).toBeVisible();
    await expectNoDataMessageInPlots(page, NO_OBS_DATA);
  });
});

test.describe("Context Feed — optional-source header warnings", () => {
  test("almanac failure warns on the page header and both timeline applets but keeps content", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await forceStatus(page, "almanac", 500);
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    for (const name of [
      "Page data availability warning",
      "Context feed data availability warning",
      "Observatory Status data availability warning",
    ]) {
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    }
    await expect(
      page.locator("[data-slot='obs-status-timeline']").first(),
    ).toBeVisible();
    await expect(page.locator("[data-slot='table-body']")).toBeAttached();
  });

  test("shows a single header warning when block details fail but keeps content", async ({
    page,
  }) => {
    await setupApiMocks(page);
    await forceStatus(page, "block-details", 500);
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(
      page.getByRole("button", { name: "data availability warning" }),
    ).toHaveCount(1);
    await expect(page.locator("[data-slot='table-body']")).toBeAttached();
  });

  test("shows no header warning when obs-status fails", async ({ page }) => {
    await setupApiMocks(page);
    await forceStatus(page, "obs-status", 500);
    await page.goto(getContextFeedUrl());
    await waitForContextFeedLoad(page);

    await expect(
      page.getByRole("button", { name: "data availability warning" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Observatory Status data could not be fetched."),
    ).toBeVisible();
  });
});
