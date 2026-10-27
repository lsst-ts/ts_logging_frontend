// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  generateExposureTimeAccountingMock,
  generateNarrativeLogMock,
} from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import {
  exposureTimeAccountingCard,
  narrativeLogCard,
  waitForTimeAccountingLoad,
} from "../../helpers/time-accounting-helpers.js";

test("switching to AuxTel fetches and renders LATISS exposures and narrative logs", async ({
  page,
}) => {
  await setupApiMocks(page);
  const requests = { exposures: [], "narrative-log": [] };
  for (const endpoint of Object.keys(requests)) {
    await page.route(`**/api/${endpoint}*`, (route) => {
      const url = new URL(route.request().url());
      const instrument = url.searchParams.get("instrument");
      requests[endpoint].push(instrument);
      const aux = instrument === "LATISS";
      const json =
        endpoint === "exposures"
          ? generateExposureTimeAccountingMock({
              exposures: aux
                ? [
                    {
                      day_obs: "20251231",
                      obs_start: "2026-01-01T02:00:00Z",
                      can_see_sky: true,
                      exp_time: 14400,
                    },
                  ]
                : [],
              nightOnSkyAccounting: {
                sum_overhead_without_filter_change: 0.5,
                sum_overhead_with_filter_change: 0.25,
              },
            })
          : generateNarrativeLogMock(
              aux
                ? [
                    {
                      id: 42,
                      date_begin: "2026-01-01T20:00:00",
                      date_end: "2026-01-01T20:30:00",
                      time_lost_type: "fault",
                      time_lost: 0.5,
                      systems: "LATISS",
                      message_text: "AuxTel instrument fault",
                    },
                  ]
                : [],
            );
      return route.fulfill({ json });
    });
  }
  await page.goto(TIME_ACCOUNTING_URL);
  await waitForTimeAccountingLoad(page);
  await expect(
    exposureTimeAccountingCard(page).getByText(
      "No exposures found in ConsDB.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Telescope", exact: true }).click();
  await page.getByRole("option", { name: "AuxTel", exact: true }).click();
  await expect(page).toHaveURL(/telescope=AuxTel/);
  await expect(
    narrativeLogCard(page).getByText("AuxTel instrument fault", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    exposureTimeAccountingCard(page).getByText("50 %", { exact: true }),
  ).toHaveCount(2);
  expect(requests.exposures).toContain("LSSTCam");
  expect(requests.exposures).toContain("LATISS");
  expect(requests["narrative-log"]).toContain("LSSTCam");
  expect(requests["narrative-log"]).toContain("LATISS");
});
