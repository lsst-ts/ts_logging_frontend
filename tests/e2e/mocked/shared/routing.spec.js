// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { waitForPlotsLoad } from "../../helpers/plots-helpers.js";
import { waitForDataLogLoad } from "../../helpers/datalog-helpers.js";
import {
  TEST_DAYOBS,
  PLOTS_URL,
  DATALOG_URL,
  FULL_START,
  FULL_END,
} from "../../helpers/constants.js";

const PAGES = [
  {
    name: "plots",
    url: PLOTS_URL,
    waitForLoad: waitForPlotsLoad,
  },
  {
    name: "data-log",
    url: DATALOG_URL,
    waitForLoad: waitForDataLogLoad,
  },
];

for (const { name, url, waitForLoad } of PAGES) {
  const basePath = url.split("?")[0];

  test.describe(`${name} — Invalid parameter validation`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
    });

    test("invalid dayobs values show validation errors", async ({ page }) => {
      const invalidCases = [
        { value: "300226", expectedError: /month|valid/i },
        { value: "2026011", expectedError: /format|yyyyMMdd/i },
        { value: "20261301", expectedError: /month|valid/i },
        { value: "20260132", expectedError: /not a valid/i },
        { value: "abcd", expectedError: /format|yyyyMMdd/i },
      ];

      for (const { value, expectedError } of invalidCases) {
        await test.step(`startDayobs="${value}"`, async () => {
          await page.goto(
            `${basePath}?startDayobs=${value}&endDayobs=${TEST_DAYOBS}`,
          );
          await expect(page.getByText("Something went wrong")).toBeVisible({
            timeout: 5000,
          });
          await expect(page.getByText(expectedError).first()).toBeVisible();
        });

        await test.step(`endDayobs="${value}"`, async () => {
          await page.goto(
            `${basePath}?startDayobs=${TEST_DAYOBS}&endDayobs=${value}`,
          );
          await expect(page.getByText("Something went wrong")).toBeVisible({
            timeout: 5000,
          });
          await expect(page.getByText(expectedError).first()).toBeVisible();
        });
      }
    });

    test("retention policy violation shows error", async ({ page }) => {
      await page.goto(`${basePath}?startDayobs=20990101&endDayobs=20990101`);
      await expect(page.getByText("Something went wrong")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText(/retention|future|allowed/i)).toBeVisible();
    });

    test("startDayobs > endDayobs shows validation error", async ({ page }) => {
      await page.goto(`${basePath}?startDayobs=20260105&endDayobs=20260101`);
      await expect(page.getByText("Something went wrong")).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByText(/startDayobs.*before.*endDayobs/i),
      ).toBeVisible();
    });
  });

  test.describe(`${name} — Auto-correction behaviors`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
    });

    test("invalid param values show validation errors", async ({ page }) => {
      await test.step("invalid telescope shows error", async () => {
        await page.goto(`${basePath}?telescope=Invalid`);
        await expect(page.getByText("Something went wrong")).toBeVisible({
          timeout: 5000,
        });
      });

      await test.step("non-numeric startTime shows error", async () => {
        await page.goto(`${basePath}?startTime=invalid`);
        await expect(page.getByText("Something went wrong")).toBeVisible({
          timeout: 5000,
        });
      });

      await test.step("negative startTime shows error", async () => {
        await page.goto(`${basePath}?startTime=-1`);
        await expect(page.getByText("Something went wrong")).toBeVisible({
          timeout: 5000,
        });
      });
    });

    test("time parameters are auto-corrected", async ({ page }) => {
      await test.step("startTime > endTime swaps", async () => {
        await page.goto(
          `${basePath}?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&startTime=${FULL_END}&endTime=${FULL_START}`,
        );
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        const startTime = currentUrl.searchParams.get("startTime");
        const endTime = currentUrl.searchParams.get("endTime");
        expect(startTime).toBe(String(FULL_START));
        expect(endTime).toBe(String(FULL_END));
      });

      await test.step("startTime before dayobs start is clamped", async () => {
        await page.goto(
          `${basePath}?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&startTime=0&endTime=${FULL_END}`,
        );
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        const startTime = currentUrl.searchParams.get("startTime");
        expect(startTime).toBe(String(FULL_START));
      });

      await test.step("endTime after dayobs end is clamped", async () => {
        await page.goto(
          `${basePath}?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&startTime=${FULL_START}&endTime=9999999999999`,
        );
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        const endTime = currentUrl.searchParams.get("endTime");
        expect(endTime).toBe(String(FULL_END));
      });
    });
  });

  test.describe(`${name} — Default parameters added to partial URLs`, () => {
    test.beforeEach(async ({ page }) => {
      await setupApiMocks(page);
      // Set clock to Jan 2, 2026 so "yesterday" = TEST_DAYOBS (Jan 1, 2026)
      await page.clock.install({ time: new Date("2026-01-02T00:00:00Z") });
      await page.clock.setFixedTime(new Date("2026-01-02T00:00:00Z"));
    });

    test("missing parameters are auto-populated", async ({ page }) => {
      await test.step("no params adds all defaults", async () => {
        await page.goto(basePath);
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        expect(currentUrl.searchParams.get("startDayobs")).toBe(TEST_DAYOBS);
        expect(currentUrl.searchParams.get("endDayobs")).toBe(TEST_DAYOBS);
        expect(currentUrl.searchParams.get("telescope")).toBe("Simonyi");
      });

      await test.step("only startDayobs adds endDayobs default", async () => {
        await page.goto(`${basePath}?startDayobs=${TEST_DAYOBS}`);
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        expect(currentUrl.searchParams.get("endDayobs")).toBe(TEST_DAYOBS);
      });

      await test.step("missing startTime/endTime are populated from dayobs", async () => {
        await page.goto(
          `${basePath}?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}`,
        );
        await waitForLoad(page);
        const currentUrl = new URL(page.url());
        expect(currentUrl.searchParams.get("startTime")).toBe(
          String(FULL_START),
        );
        expect(currentUrl.searchParams.get("endTime")).toBe(String(FULL_END));
      });

      await test.step("startTime/endTime without dayobs: dayobs defaults and times are clamped", async () => {
        await page.goto(`${basePath}?startTime=0&endTime=9999999999999`);
        // Wait for the router to apply defaults and redirect (URL-only check — this
        // step tests routing behaviour, not page content).
        await page.waitForURL(
          (url) => new URL(url).searchParams.has("startDayobs"),
          {
            timeout: 5000,
          },
        );
        const currentUrl = new URL(page.url());
        expect(currentUrl.searchParams.get("startDayobs")).toBe(TEST_DAYOBS);
        expect(currentUrl.searchParams.get("endDayobs")).toBe(TEST_DAYOBS);
        expect(currentUrl.searchParams.get("startTime")).toBe(
          String(FULL_START),
        );
        expect(currentUrl.searchParams.get("endTime")).toBe(String(FULL_END));
      });
    });
  });
}

test.describe("Plots — unknown parameter stripping", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("unknown params are stripped, known params preserved", async ({
    page,
  }) => {
    await page.goto(
      `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&unknown=value&foo=bar`,
    );
    await waitForPlotsLoad(page);
    await expect(page).not.toHaveURL(/unknown=/);
    await expect(page).not.toHaveURL(/foo=/);
    await expect(page).toHaveURL(/startDayobs=/);
  });
});

test.describe("Data-log — unknown parameter stripping", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "data-log": "datalog-multi-program" });
  });

  test("unknown params are stripped, global params preserved", async ({
    page,
  }) => {
    await page.goto(`${DATALOG_URL}&unknown=value`);
    await waitForDataLogLoad(page);
    await expect(page).not.toHaveURL(/unknown=/);
    await expect(page).toHaveURL(/startDayobs=/);
    await expect(page).toHaveURL(/telescope=Simonyi/);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(30);
  });

  test("unknown params stripped, column filter params preserved and applied", async ({
    page,
  }) => {
    await page.goto(`${DATALOG_URL}&unknown=value&science_program=FM`);
    await waitForDataLogLoad(page);
    await expect(page).not.toHaveURL(/unknown=/);
    await expect(page).toHaveURL(/science_program=FM/);
    await expect(page.locator("[data-slot='table-body'] tr")).toHaveCount(6);
  });
});
