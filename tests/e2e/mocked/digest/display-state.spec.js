// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateExposureTimeAccountingMock } from "../../helpers/mock-generators.js";
import { DIGEST_URL } from "../../helpers/constants.js";
import {
  observatoryStatusCard,
  metricsCard,
  tooltipForTrigger,
} from "../../helpers/digest-helpers.js";

test.describe("Digest — almanac no data", () => {
  test("shows -- % on efficiency with a warning when almanac has no data", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      almanac: { almanac_info: [] },
    });
    await page.goto(DIGEST_URL);

    const eff = metricsCard(page, "Open-shutter (-weather) efficiency");
    await expect(eff).toBeVisible({ timeout: 15000 });
    await expect(eff.getByText("-- %")).toBeVisible();

    const warning = eff.getByRole("button", {
      name: "Efficiency data availability warning",
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "No almanac data available.",
    );
  });
});

test.describe("Digest — dome errors and no data", () => {
  test("warns fetch-error for dome when exposures fail to fetch", async ({
    page,
  }) => {
    // Dome data shares the exposures request.
    await setupApiMocks(page);
    await page.route("**/api/exposures**", (route) =>
      route.fulfill({ status: 500, body: "x" }),
    );
    await page.goto(DIGEST_URL);

    const card = observatoryStatusCard(page);
    await expect(card.getByTestId("obs-status-cumulative-plot")).toBeVisible({
      timeout: 15000,
    });

    const warning = card.getByRole("button", {
      name: /data availability warning/,
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Dome data could not be fetched.",
    );
  });

  test("warns on the observatory status applet when dome data fails to fetch", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposureTimeAccountingMock({
        exposures: [{ day_obs: "20251231" }],
        openDomeError: "boom",
      }),
    });
    await page.goto(DIGEST_URL);

    const card = observatoryStatusCard(page);
    await expect(card.getByTestId("obs-status-cumulative-plot")).toBeVisible({
      timeout: 15000,
    });

    const warning = card.getByRole("button", {
      name: /data availability warning/,
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "Dome data could not be fetched.",
    );
  });

  test("warns on the observatory status applet when dome data is absent", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      exposures: generateExposureTimeAccountingMock({
        exposures: [{ day_obs: "20251231" }],
      }),
    });
    await page.goto(DIGEST_URL);

    const card = observatoryStatusCard(page);
    await expect(card.getByTestId("obs-status-cumulative-plot")).toBeVisible({
      timeout: 15000,
    });

    const warning = card.getByRole("button", {
      name: /data availability warning/,
    });
    await expect(warning).toBeVisible();
    await warning.hover();
    await expect(await tooltipForTrigger(page, warning)).toContainText(
      "No dome data available.",
    );
  });
});
