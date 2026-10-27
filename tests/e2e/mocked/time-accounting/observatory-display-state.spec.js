// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { waitForTimeAccountingLoad } from "../../helpers/time-accounting-helpers.js";

const cumulativeCard = (page, mode) =>
  page.getByTestId("applet-card").filter({
    hasText: `Observatory Status - ${mode} Night Accumulations`,
  });
const breakdownCard = (page) =>
  page.getByTestId("applet-card").filter({
    hasText: "Detailed Breakdown of Observatory States",
  });

for (const { source, overrides, message } of [
  {
    source: "observatory status",
    overrides: {
      "obs-status": {
        entries: [],
        intervals: [],
        availability: { status: "full" },
      },
    },
    message: "No observatory status data available.",
  },
  {
    source: "almanac",
    overrides: { almanac: { almanac_info: [] } },
    message: "No almanac data available.",
  },
]) {
  test(`required ${source} no-data keeps both cumulative shells and the breakdown headers`, async ({
    page,
  }) => {
    await setupApiMocks(page, overrides);
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);
    for (const mode of ["Single", "Multi"]) {
      const card = cumulativeCard(page, mode);
      const plot = card.getByTestId("obs-status-cumulative-plot");
      await expect(plot).toBeVisible();
      await expect(plot.getByText(message, { exact: true })).toBeVisible();
      await expect(
        plot.getByText("Cumulative Hours", { exact: true }),
      ).toBeVisible();
      await expect(
        card.getByRole("button", { name: /availability warning/ }),
      ).toHaveCount(0);
    }
    const table = breakdownCard(page);
    await expect(
      table.getByRole("columnheader", { name: "State", exact: true }),
    ).toBeVisible();
    await expect(table.getByText(message, { exact: true })).toBeVisible();
    await expect(
      table.getByRole("row").filter({ hasText: "Night Hours" }),
    ).toHaveCount(0);
    await expect(
      table.getByRole("row").filter({ hasText: "Dome Open" }),
    ).toHaveCount(0);
  });
}

for (const endpoint of ["obs-status", "almanac"]) {
  test(`required ${endpoint} fetch failure replaces both cumulative plots and the breakdown table`, async ({
    page,
  }) => {
    await setupApiMocks(page);
    await page.route(`**/api/${endpoint}*`, (route) =>
      route.fulfill({ status: 500, body: "error" }),
    );
    await page.goto(TIME_ACCOUNTING_URL);
    // A required-source error removes the usual load sentinel.
    const message =
      endpoint === "obs-status"
        ? "Observatory Status data could not be fetched."
        : "Almanac data could not be fetched.";
    for (const mode of ["Single", "Multi"]) {
      const card = cumulativeCard(page, mode);
      await expect(card.getByText(message, { exact: true })).toBeVisible();
      await expect(card.getByTestId("obs-status-cumulative-plot")).toHaveCount(
        0,
      );
      await expect(
        card.getByRole("button", { name: /availability warning/ }),
      ).toHaveCount(0);
    }
    const table = breakdownCard(page);
    await expect(table.getByText(message, { exact: true })).toBeVisible();
    await expect(table.getByRole("table")).toHaveCount(0);
  });
}

for (const hasDomeData of [false, true]) {
  test(`breakdown withholds the dome warning until exposures settle (${hasDomeData ? "populated" : "empty"})`, async ({
    page,
  }) => {
    await setupApiMocks(page);
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/api/exposures*", async (route) => {
      await pending;
      await route.fulfill({
        json: {
          exposures: [],
          open_dome_times: hasDomeData
            ? [
                {
                  day_obs: 20251231,
                  open_time: "2026-01-01T02:00:00Z",
                  close_time: "2026-01-01T05:00:00Z",
                  open_hours: 3,
                },
              ]
            : [],
          day_obs_open_dome_hours: hasDomeData
            ? { 20251231: { open_hours: 3 } }
            : {},
        },
      });
    });
    await page.goto(TIME_ACCOUNTING_URL);
    // The timeline is ready; only exposures remain pending.
    await waitForTimeAccountingLoad(page);
    const card = breakdownCard(page);
    const warning = card.getByRole("button", {
      name: "Observatory Status data availability warning",
      exact: true,
    });
    try {
      await expect(card).toBeVisible();
      await expect(warning).toHaveCount(0);
      await expect(card.getByRole("table")).toHaveCount(0);
    } finally {
      release();
    }
    await expect(
      card.getByRole("columnheader", { name: "State", exact: true }),
    ).toBeVisible();
    if (hasDomeData) {
      await expect(warning).toHaveCount(0);
      await expect(
        card.getByTestId("breakdown-row-dome-open").getByRole("cell"),
      ).toHaveText(["Dome Open", "3.00", "3.00"]);
    } else {
      await expect(warning).toBeVisible();
      await warning.hover();
      await expect(page.getByRole("tooltip")).toContainText(
        "No dome data available.",
      );
    }
  });
}
