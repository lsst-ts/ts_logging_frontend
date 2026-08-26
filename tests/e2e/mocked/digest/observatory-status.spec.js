// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  observatoryStatusCard,
  observatoryStatusTooltip,
  hoverStateMarker,
  waitForObservatoryStatusAppletLoad,
} from "../../helpers/digest-helpers.js";

// A valid single-night observatory status response. The interval
// (02:00–05:00 UTC on 2026-01-01) falls inside the night's twilight window
// (01:00–09:00 UTC, matching the almanac fixture) so the cumulative plot has
// something to draw when availability is not "none".
const AVAILABLE_OBS_STATUS = () => ({
  entries: [],
  intervals: [
    {
      start_time_ms: 1767232800000,
      end_time_ms: 1767243600000,
      start_state: 2,
      end_state: 2,
      start_note: null,
      end_note: null,
      start_labels: "OPERATIONAL",
      end_labels: "OPERATIONAL",
    },
  ],
  metrics: { fault_loss: 1.5, weather: 0.5 },
  availability: { status: "full", available_from: null },
  totals: { fault_loss: 1.5, weather: 0.5 },
});

test.describe("Observatory Status applet — loading state", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    // Keep the obs-status request pending (never fulfilled) so the applet
    // stays in its loading state. Registered after setupApiMocks so it takes
    // precedence (Playwright evaluates routes LIFO).
    await page.route("**/nightlydigest/api/obs-status*", () => {});
    await page.goto(DIGEST_URL);
  });

  test("shows a skeleton while observatory status is loading", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    await expect(card.locator("[data-slot='card-title']")).toContainText(
      "Observatory Status",
    );
    await expect(card.locator("[data-slot='skeleton']")).toBeVisible();
  });
});

test.describe("Observatory Status applet — full availability", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  test("renders the cumulative plot", async ({ page }) => {
    const card = observatoryStatusCard(page);
    await expect(card.locator("svg").first()).toBeVisible();
  });

  test("opens the fullscreen dialog with the cumulative plot", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    await card
      .getByRole("button", { name: "Open observatory status in fullscreen" })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Observatory Status - Cumulative Time in State",
    );
    // "Cumulative Hours" is the plot's y-axis label — the clearest signal the
    // fullscreen plot rendered (the dialog also contains a close-button SVG).
    await expect(dialog.getByText("Cumulative Hours")).toBeVisible();
  });

  test("opens the info popover with the legend explanation", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    await card
      .getByRole("button", { name: "Observatory status information" })
      .click();
    await expect(
      page.getByText(
        /The observatory's status and dome activity during the observing night/,
      ),
    ).toBeVisible();
  });

  test("opens the download placeholder popover", async ({ page }) => {
    const card = observatoryStatusCard(page);
    await card
      .getByRole("button", { name: "Download observatory status data" })
      .click();
    await expect(
      page.getByText("This is a placeholder for the download/export button.", {
        exact: true,
      }),
    ).toBeVisible();
  });

  test("hovering a marker shows tooltip with time, state and duration", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    const svg = card.locator("svg").first();
    await hoverStateMarker(page, svg, "2:00");

    const tooltip = observatoryStatusTooltip(page);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("2026-01-01 02:00:00.0");
    await expect(tooltip).toContainText("OPERATIONAL");
    await expect(tooltip).toContainText("03:00:00.000");
  });

  test("does not show a note row for a noteless interval", async ({ page }) => {
    const card = observatoryStatusCard(page);
    const svg = card.locator("svg").first();
    await hoverStateMarker(page, svg, "2:00");

    const tooltip = observatoryStatusTooltip(page);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("OPERATIONAL");
    await expect(tooltip).not.toContainText("Note:");
  });

  test("hides the tooltip when the mouse leaves the chart", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    const svg = card.locator("svg").first();
    await hoverStateMarker(page, svg, "2:00");

    const tooltip = observatoryStatusTooltip(page);
    await expect(tooltip).toBeVisible();

    await page.mouse.move(5, 5);
    await expect(tooltip).not.toBeVisible();
  });

  test("tooltip works in the fullscreen dialog", async ({ page }) => {
    const card = observatoryStatusCard(page);
    await card
      .getByRole("button", { name: "Open observatory status in fullscreen" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("svg").first()).toBeVisible();

    await hoverStateMarker(page, dialog.locator("svg").first(), "2:00");

    const tooltip = observatoryStatusTooltip(page);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("2026-01-01 02:00:00.0");
    await expect(tooltip).toContainText("OPERATIONAL");
  });
});

test.describe("Observatory Status applet — interval with a note", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "obs-status": {
        ...AVAILABLE_OBS_STATUS(),
        intervals: [
          {
            ...AVAILABLE_OBS_STATUS().intervals[0],
            start_note: "A note about the observations",
          },
        ],
      },
    });
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  test("shows the note in the tooltip for a noted interval", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    const svg = card.locator("svg").first();
    await hoverStateMarker(page, svg, "2:00");

    const tooltip = observatoryStatusTooltip(page);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("A note about the observations");
  });
});

test.describe("Observatory Status applet — partial availability", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "obs-status": {
        ...AVAILABLE_OBS_STATUS(),
        availability: { status: "partial", available_from: "20260102" },
      },
    });
    await page.goto(DIGEST_URL);
    await waitForObservatoryStatusAppletLoad(page);
  });

  test("shows a warning icon with an explanatory tooltip", async ({ page }) => {
    const card = observatoryStatusCard(page);
    const warning = card.getByRole("button", {
      name: "Observatory Status data availability warning",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "Observatory Status data is only available from 2026-01-02.",
    );
  });
});

test.describe("Observatory Status applet — no availability", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, {
      "obs-status": {
        entries: [],
        intervals: [],
        metrics: {},
        availability: { status: "none", available_from: null },
        totals: {},
      },
    });
    await page.goto(DIGEST_URL);
  });

  test("shows the availability warning instead of the plot", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    await expect(
      card.getByText(
        "Observatory Status data is only available from the supported dayobs range.",
      ),
    ).toBeVisible();
    await expect(card.locator("svg")).toHaveCount(0);
  });

  test("fullscreen shows the availability warning instead of the plot", async ({
    page,
  }) => {
    const card = observatoryStatusCard(page);
    await card
      .getByRole("button", { name: "Open observatory status in fullscreen" })
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Observatory Status data is only available from the supported dayobs range.",
    );
    // No plot in the fullscreen dialog when availability is "none" — verify by
    // the absence of the plot's unique y-axis label.
    await expect(dialog.getByText("Cumulative Hours")).toHaveCount(0);
  });
});

test.describe("Observatory Status applet — fetch failure", () => {
  test("shows a fetch-error message instead of the plot", async ({ page }) => {
    await setupApiMocks(page);
    // Registered after setupApiMocks so this failed route takes precedence.
    await page.route("**/nightlydigest/api/obs-status*", (route) =>
      route.abort(),
    );
    await page.goto(DIGEST_URL);

    const card = observatoryStatusCard(page);
    await expect(
      card.getByText("Observatory Status data could not be fetched."),
    ).toBeVisible();
    await expect(card.locator("svg")).toHaveCount(0);
  });
});
