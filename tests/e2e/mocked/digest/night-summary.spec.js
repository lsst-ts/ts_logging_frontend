import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";

function nightSummaryCard(page) {
  return page.locator("[data-slot='card']").filter({
    has: page.locator("[data-slot='card-title']", {
      hasText: /^Night Reports?$/,
    }),
  });
}

const REPORTS_FIXTURE = [
  {
    id: "report-20260101",
    day_obs: 20260101,
    summary: "Clear conditions for most of the night.",
    weather: "Low winds and intermittent thin clouds.",
    maintel_summary: "Main telescope observations completed successfully.",
    auxtel_summary: "Aux telescope summary should not render for Simonyi.",
    date_sent: "2026-01-02T09:15:00",
    observers_crew: ["alice", "bob"],
  },
  {
    id: "report-20260102",
    day_obs: 20260102,
    summary: "Late-night clouds reduced observing efficiency.",
    weather: "Cloud cover increased after midnight.",
    maintel_summary: "Maintenance checks completed before twilight.",
    auxtel_summary: "Aux telescope standby operations.",
    date_sent: "2026-01-03T09:20:00",
    observers_crew: ["carol", "dave"],
  },
];

test.describe("Night Summary applet — loading state", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    // Keep the night-report request pending so the applet remains in loading
    // state while the rest of the dashboard loads from mocks.
    await page.route("**/nightlydigest/api/night-reports*", () => {});
    await page.goto(DIGEST_URL);
  });

  test("shows a skeleton while night reports are loading", async ({ page }) => {
    const card = nightSummaryCard(page);
    await expect(card.locator("[data-slot='card-title']")).toContainText(
      "Night Report",
    );
    await expect(card.locator("[data-slot='skeleton']")).toBeVisible();
  });
});

test.describe("Night Summary applet — with reports", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "night-reports": { reports: REPORTS_FIXTURE },
    });
    await page.goto(DIGEST_URL);
    await expect(
      nightSummaryCard(page).getByText("Night of 20260101"),
    ).toBeVisible();
  });

  test("renders report content for Simonyi and omits AuxTel summary", async ({
    page,
  }) => {
    const card = nightSummaryCard(page);
    await expect(card.locator("[data-slot='card-title']")).toContainText(
      "Night Reports",
    );
    await expect(
      card.getByText("Clear conditions for most of the night."),
    ).toBeVisible();
    await expect(
      card.getByText("Main telescope observations completed successfully."),
    ).toBeVisible();
    await expect(
      card.getByText("Aux telescope summary should not render for Simonyi."),
    ).toHaveCount(0);
    await expect(card.getByText("alice, bob")).toBeVisible();
    await expect(card.getByText("Sent at 2026-01-02T09:15:00Z")).toBeVisible();
  });

  test("switches to another day from the day selector", async ({ page }) => {
    const card = nightSummaryCard(page);
    const daySelector = card.getByRole("combobox");

    await expect(daySelector).toContainText("20260101");
    await daySelector.click();
    await page.getByRole("option", { name: "20260102" }).click();

    await expect(daySelector).toContainText("20260102");
    await expect(card.getByText("Night of 20260102")).toBeVisible();
  });

  test("opens the fullscreen dialog with night report content", async ({
    page,
  }) => {
    const card = nightSummaryCard(page);
    await card
      .getByRole("button", { name: /Open night reports? in fullscreen/ })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Night Reports");
    await expect(dialog).toContainText("Night of 20260101");
    await expect(dialog).toContainText(
      "Main telescope observations completed successfully.",
    );
  });

  test("opens the download placeholder popover", async ({ page }) => {
    const card = nightSummaryCard(page);
    await card
      .getByRole("button", { name: /Download night reports? data/ })
      .click();

    await expect(
      page.getByText("This is a placeholder for the download/export button."),
    ).toBeVisible();
  });

  test("opens the info popover", async ({ page }) => {
    const card = nightSummaryCard(page);
    await card
      .getByRole("button", { name: /Night reports? information/ })
      .click();

    await expect(
      page.getByText(
        "Observers night report retrieved from the nightreport API.",
      ),
    ).toBeVisible();
  });
});

test.describe("Night Summary applet — no reports", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "night-reports": { reports: [] },
    });
    await page.goto(DIGEST_URL);
  });

  test("shows a no reports message", async ({ page }) => {
    const card = nightSummaryCard(page);
    await expect(card.locator("[data-slot='card-title']")).toContainText(
      "Night Report",
    );
    await expect(card.getByText("No reports available")).toBeVisible();
  });
});
