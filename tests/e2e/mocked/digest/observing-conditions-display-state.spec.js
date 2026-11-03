// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposuresMock } from "../../helpers/mock-generators.js";
import { DIGEST_URL } from "../../helpers/constants.js";

const conditions = (page) =>
  page.getByTestId("applet-card").filter({ hasText: "Observing Conditions" });

for (const almanac of ["available", "empty", "failed"]) {
  test(`empty exposures retain the plot message with ${almanac} almanac`, async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposuresMock(0),
      ...(almanac === "empty" ? { almanac: { almanac_info: [] } } : {}),
    });
    if (almanac === "failed")
      await page.route("**/api/almanac*", (route) =>
        route.fulfill({ status: 500, body: "error" }),
      );
    await page.goto(DIGEST_URL);
    const card = conditions(page);
    await expect(
      card.getByLabel("No exposures found in ConsDB.", { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByText("Observation Start Time (TAI)", { exact: true }),
    ).toBeVisible();
  });
}

for (const almanac of ["available", "failed"]) {
  test(`off-sky exposures show a distinct empty message with ${almanac} almanac`, async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposuresMock(1, {
        overrides: { can_see_sky: false },
      }),
    });
    if (almanac === "failed")
      await page.route("**/api/almanac*", (route) =>
        route.fulfill({ status: 500, body: "error" }),
      );
    await page.goto(DIGEST_URL);
    const card = conditions(page);
    await expect(
      card.getByLabel("No on-sky exposures found in ConsDB.", { exact: true }),
    ).toBeVisible();
    await expect(
      card.getByLabel("No exposures found in ConsDB.", { exact: true }),
    ).toHaveCount(0);
  });
}

test("on-sky data renders without either empty-state message", async ({
  page,
}) => {
  await setupApiMocks(page, {
    exposures: generateExposuresMock(2, {
      overrides: {
        can_see_sky: true,
        zero_point_median: 25,
        psf_sigma_median: 2,
      },
    }),
  });
  await page.goto(DIGEST_URL);
  const card = conditions(page);
  await expect(
    card.getByText("Observation Start Time (TAI)", { exact: true }),
  ).toBeVisible();
  await expect(
    card.getByLabel(/No (on-sky )?exposures found in ConsDB\./),
  ).toHaveCount(0);
});
