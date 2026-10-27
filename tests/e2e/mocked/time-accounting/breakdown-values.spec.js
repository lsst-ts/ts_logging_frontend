// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import {
  twoNightAccountingMocks,
  TWO_NIGHT_ACCOUNTING_URL,
  accountingCard,
} from "../../helpers/time-accounting-fixtures.js";

test.beforeEach(async ({ page }) => {
  const mocks = twoNightAccountingMocks();
  await setupApiMocks(page, {
    ...mocks,
    exposures: {
      exposures: [],
      open_dome_times: [],
      day_obs_open_dome_hours: {
        20260101: { open_hours: 6 },
        20260102: { open_hours: 5 },
      },
    },
  });
  await page.goto(TWO_NIGHT_ACCOUNTING_URL);
  await expect(
    page.getByTestId("breakdown-row-total-operational"),
  ).toBeVisible();
});
const tableCard = (page) =>
  accountingCard(page, "Detailed Breakdown of Observatory States");

test("per-night and combined totals count overlapping states independently", async ({
  page,
}) => {
  const card = tableCard(page);
  for (const [key, values] of [
    ["night-hours", ["Night Hours", "16.00", "8.00", "8.00"]],
    ["dome-open", ["Dome Open", "11.00", "6.00", "5.00"]],
    ["total-operational", [/Operational/, "5.00", "3.00", "2.00"]],
    ["total-weather", [/Weather/, "4.00", "2.00", "2.00"]],
    ["total-fault", [/Fault/, "1.00", "--", "1.00"]],
    [
      "total-operational__operational-weather",
      ["Operational + Weather", "3.00", "1.00", "2.00"],
    ],
  ])
    await expect(
      card.getByTestId(`breakdown-row-${key}`).getByRole("cell"),
    ).toHaveText(values);
});

test("parent and combination selections remain distinct through active-only filtering", async ({
  page,
}) => {
  const card = tableCard(page);
  const parent = card.getByTestId("breakdown-row-total-operational");
  const child = card.getByTestId(
    "breakdown-row-total-operational__operational-weather",
  );
  await parent.getByRole("cell").nth(1).click();
  await expect(parent).toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(/selectedBreakdown=total-operational/);
  await child
    .getByRole("cell", { name: "Operational + Weather", exact: true })
    .click();
  await expect(child).toHaveAttribute("data-selected", "true");
  await expect(parent).not.toHaveAttribute("data-selected", "true");
  await expect(page).toHaveURL(/selectedBreakdown=operational-weather/);
  await card
    .getByRole("button", { name: "Show All States", exact: true })
    .click();
  await expect(child).toHaveAttribute("data-selected", "true");
  await card
    .getByRole("button", { name: "Show Only Active States", exact: true })
    .click();
  await expect(child).toHaveAttribute("data-selected", "true");
  await child
    .getByRole("cell", { name: "Operational + Weather", exact: true })
    .click();
  await expect(child).not.toHaveAttribute("data-selected", "true");
  await expect(page).not.toHaveURL(/selectedBreakdown=/);
});

test("individual and global collapse controls hide and restore combination rows", async ({
  page,
}) => {
  const card = tableCard(page);
  const parent = card.getByTestId("breakdown-row-total-operational");
  const child = card.getByTestId(
    "breakdown-row-total-operational__operational-weather",
  );
  await parent.getByLabel("Collapse", { exact: true }).click();
  await expect(child).toHaveCount(0);
  await parent.getByLabel("Expand", { exact: true }).click();
  await expect(child).toBeVisible();
  await card
    .getByRole("button", { name: "Collapse All States", exact: true })
    .click();
  await expect(child).toHaveCount(0);
  await card
    .getByRole("button", { name: "Expand All States", exact: true })
    .click();
  await expect(child).toBeVisible();
});
