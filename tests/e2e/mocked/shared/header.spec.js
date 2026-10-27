// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import { waitForContextFeedLoad } from "../../helpers/contextfeed-helpers.js";
import {
  PLOTS_URL,
  DATALOG_URL,
  CONTEXTFEED_URL,
} from "../../helpers/constants.js";

// Timeline is rendered on canvas via ECharts (see TimelineChart.jsx) and is
// conditionally mounted/unmounted by the Hide/Show Timeline toggle.
const TIMELINE_SELECTOR = '[data-slot="timeline"]';

const PAGES = [
  {
    name: "plots",
    url: PLOTS_URL,
    waitForLoad: waitForPlotsLoad,
    pageSpecificTipsHeading: "Plots Tips",
  },
  {
    name: "data-log",
    url: DATALOG_URL,
    waitForLoad: waitForDataLogLoad,
    pageSpecificTipsHeading: "Table Tips",
  },
  {
    name: "context-feed",
    url: CONTEXTFEED_URL,
    waitForLoad: waitForContextFeedLoad,
    pageSpecificTipsHeading: "Table Tips",
  },
];

for (const { name, url, waitForLoad, pageSpecificTipsHeading } of PAGES) {
  // ---------------------------------------------------------------------------
  test.describe(`${name} — Header: timeline toggle`, () => {
    // Scope to the event timeline; applets toggle independently.
    const timelineCard = (page) =>
      name === "context-feed"
        ? page.getByTestId("applet-card").filter({
            hasText: "Timeline of exposures, scripts, errors and narrations.",
          })
        : page;

    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("Hide Timeline button is visible by default", async ({ page }) => {
      await expect(
        timelineCard(page).getByRole("button", {
          name: "Hide Timeline",
          exact: true,
        }),
      ).toBeVisible();
    });

    test("clicking Hide Timeline removes the timeline chart and updates the button", async ({
      page,
    }) => {
      await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
      await timelineCard(page)
        .getByRole("button", { name: "Hide Timeline", exact: true })
        .click();
      await expect(
        timelineCard(page).getByRole("button", {
          name: "Show Timeline",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator(TIMELINE_SELECTOR)).not.toBeAttached();
    });

    test("clicking Show Timeline restores the timeline chart and updates the button", async ({
      page,
    }) => {
      await timelineCard(page)
        .getByRole("button", { name: "Hide Timeline", exact: true })
        .click();
      await expect(page.locator(TIMELINE_SELECTOR)).not.toBeAttached();
      await timelineCard(page)
        .getByRole("button", { name: "Show Timeline", exact: true })
        .click();
      await expect(
        timelineCard(page).getByRole("button", {
          name: "Hide Timeline",
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.locator(TIMELINE_SELECTOR)).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  test.describe(`${name} — Header: tips toggle`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      await page.goto(url);
      await waitForLoad(page);
    });

    test("both tips cards are hidden by default", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Timeline Tips" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: pageSpecificTipsHeading }),
      ).not.toBeVisible();
    });

    test("clicking Show Tips shows both tips cards and updates the button", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Show Tips" }).click();
      await expect(
        page.getByRole("button", { name: "Hide Tips" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Timeline Tips" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: pageSpecificTipsHeading }),
      ).toBeVisible();
    });

    test("clicking Hide Tips hides both tips cards and updates the button", async ({
      page,
    }) => {
      await page.getByRole("button", { name: "Show Tips" }).click();
      await page.getByRole("button", { name: "Hide Tips" }).click();
      await expect(
        page.getByRole("button", { name: "Show Tips" }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: "Timeline Tips" }),
      ).not.toBeVisible();
      await expect(
        page.getByRole("heading", { name: pageSpecificTipsHeading }),
      ).not.toBeVisible();
    });
  });
}
