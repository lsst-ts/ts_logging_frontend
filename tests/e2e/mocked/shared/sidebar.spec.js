// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  TEST_DAYOBS,
  DIGEST_URL,
  PLOTS_URL,
  DATALOG_URL,
} from "../../helpers/constants.js";

/**
 * Sidebar coverage for the internal Nightly Digest: the nav menu, the telescope
 * selector and the dayobs/number-of-nights controls.
 *
 * The Scientific Nightly Digest strips parts of this sidebar, and its specs
 * (tests/e2e/snd/) assert those absences. These are the counterparts that keep
 * an absence test honest: if an item is renamed or dropped from the internal
 * app, this file fails rather than both suites quietly agreeing.
 */

const nav = (page) => page.locator("[data-slot='navigation-menu']");

const NAV_ITEMS = [
  "Nightly Digest",
  "Plots",
  "Data Log",
  "Context Feed",
  "Visit Maps",
];

const digestUrlFor = (start, end, telescope = "Simonyi") =>
  `/nightlydigest/?startDayobs=${start}&endDayobs=${end}&telescope=${telescope}`;

// The picker's trigger is labelled with the currently selected dayobs, which is
// the end of the range.
const openCalendar = (page, label = "January 01, 2026") =>
  page.getByRole("button", { name: label }).click();

// react-day-picker labels its day buttons "Sunday, January 11th, 2026", so the
// cell's data-day is the readable way in.
const pickDay = (page, isoDate) =>
  page.locator(`[data-day="${isoDate}"]`).click();

test.describe("Sidebar — nav menu", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("lists all five pages", async ({ page }) => {
    await page.goto(PLOTS_URL);

    for (const item of NAV_ITEMS) {
      await expect(nav(page).getByText(item, { exact: true })).toBeVisible();
    }
    await expect(nav(page).locator("li")).toHaveCount(NAV_ITEMS.length);
  });

  test("the current page is plain text, the others are links", async ({
    page,
  }) => {
    await page.goto(PLOTS_URL);

    await expect(nav(page).getByRole("link", { name: "Plots" })).toHaveCount(0);
    await expect(nav(page).getByRole("link")).toHaveCount(NAV_ITEMS.length - 1);
  });

  test("navigating from the menu keeps the global search params", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    await nav(page).getByRole("link", { name: "Data Log" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/data-log/);
    await expect(page).toHaveURL(new RegExp(`startDayobs=${TEST_DAYOBS}`));
    await expect(page).toHaveURL(new RegExp(`endDayobs=${TEST_DAYOBS}`));
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });

  test("page-specific params are dropped on navigation", async ({ page }) => {
    // buildNavigationWithSearchParams whitelists GLOBAL_SEARCH_PARAMS, so a
    // data-log column filter must not follow the user to another page.
    await page.goto(`${DATALOG_URL}&physical_filter=y_10`);
    await expect(page).toHaveURL(/physical_filter=y_10/);

    await nav(page).getByRole("link", { name: "Plots" }).click();

    await expect(page).toHaveURL(/\/nightlydigest\/plots/);
    await expect(page).not.toHaveURL(/physical_filter/);
  });
});

test.describe("Sidebar — telescope selector", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("offers both telescopes", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await page.locator("#instrument").click();

    await expect(page.getByRole("option", { name: "Simonyi" })).toBeVisible();
    await expect(page.getByRole("option", { name: "AuxTel" })).toBeVisible();
    await expect(page.getByRole("option")).toHaveCount(2);
  });

  test("reflects the telescope from the URL", async ({ page }) => {
    await page.goto(digestUrlFor(TEST_DAYOBS, TEST_DAYOBS, "AuxTel"));

    await expect(page.locator("#instrument")).toContainText("AuxTel");
  });

  test("choosing a telescope writes it to the URL", async ({ page }) => {
    await page.goto(DIGEST_URL);

    await page.locator("#instrument").click();
    await page.getByRole("option", { name: "AuxTel" }).click();
    await expect(page).toHaveURL(/telescope=AuxTel/);

    await page.locator("#instrument").click();
    await page.getByRole("option", { name: "Simonyi" }).click();
    await expect(page).toHaveURL(/telescope=Simonyi/);
  });
});

test.describe("Sidebar — dayobs and number of nights", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("number of nights reflects the URL range on load", async ({ page }) => {
    await page.goto(digestUrlFor("20251230", TEST_DAYOBS));

    await expect(page.locator("#noOfNights")).toHaveValue("3");
  });

  test("a single night has an identical start and end dayobs", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);

    await expect(page.locator("#noOfNights")).toHaveValue("1");
    await expect(page).toHaveURL(
      new RegExp(`startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}`),
    );
  });

  test("changing the number of nights moves startDayobs and leaves endDayobs", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    await page.locator("#noOfNights").fill("3");

    await expect(page).toHaveURL(/startDayobs=20251230/);
    await expect(page).toHaveURL(new RegExp(`endDayobs=${TEST_DAYOBS}`));
  });

  test("a long range crosses the year boundary correctly", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await page.locator("#noOfNights").fill("32");

    // 20260101 less 31 nights.
    await expect(page).toHaveURL(/startDayobs=20251201/);
  });

  test("the dayobs badge shows the selected range", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await expect(page.getByText(`dayobs: ${TEST_DAYOBS}`)).toBeVisible();

    await page.locator("#noOfNights").fill("3");
    await expect(
      page.getByText(`dayobs: 20251230 - ${TEST_DAYOBS}`),
    ).toBeVisible();
  });

  test("picking a date updates both dayobs params", async ({ page }) => {
    await page.goto(DIGEST_URL);
    await openCalendar(page);
    await pickDay(page, "2026-01-15");

    await expect(page).toHaveURL(/startDayobs=20260115/);
    await expect(page).toHaveURL(/endDayobs=20260115/);
  });

  test("picking a date keeps the width of a multi-night range", async ({
    page,
  }) => {
    await page.goto(digestUrlFor("20251230", TEST_DAYOBS));
    await expect(page.locator("#noOfNights")).toHaveValue("3");

    await openCalendar(page);
    await pickDay(page, "2026-01-15");

    await expect(page).toHaveURL(/startDayobs=20260113/);
    await expect(page).toHaveURL(/endDayobs=20260115/);
  });

  test("clearing the number of nights is rejected rather than inverting the range", async ({
    page,
  }) => {
    await page.goto(DIGEST_URL);
    await page.locator("#noOfNights").fill("");

    // calculateDayObsRange subtracts (nights - 1), so an empty value would put
    // startDayobs a day after endDayobs; the schema refinement catches it.
    await expect(page.getByText("Something went wrong")).toBeVisible();
    await expect(
      page.getByText("startDayobs must be before or equal to endDayobs."),
    ).toBeVisible();
  });
});

test.describe("Sidebar — footer and toggle", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
  });

  test("the release notes links point at the two repositories", async ({
    page,
  }) => {
    await expect(page.getByRole("link", { name: "Frontend" })).toHaveAttribute(
      "href",
      /github\.com\/lsst-ts\/ts_logging_frontend/,
    );
    await expect(page.getByRole("link", { name: "Backend" })).toHaveAttribute(
      "href",
      /github\.com\/lsst-ts\/ts_logging_and_reporting/,
    );
  });

  // Only the Scientific Nightly Digest carries this link; see
  // tests/e2e/snd/sidebar.spec.js.
  test("there is no community forum link", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: "LSST Community Forum" }),
    ).toHaveCount(0);
  });

  test("toggling collapses and restores the sidebar", async ({ page }) => {
    const toggle = page.getByRole("button", { name: "Toggle Sidebar" });
    // The sidebar slides off-canvas rather than unmounting, so its links stay
    // "visible" to Playwright; data-state is what actually changes.
    const sidebar = page.locator("[data-slot='sidebar'][data-state]").first();

    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");

    await toggle.click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
  });
});
