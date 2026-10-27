// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateNarrativeLogMock } from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import { narrativeLogCard } from "../../helpers/time-accounting-helpers.js";

for (const [name, date_end] of [
  ["missing", null],
  ["empty", ""],
  ["invalid", "not-a-date"],
]) {
  test(`${name} incident end date shows an unavailable link instead of navigating`, async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "narrative-log": generateNarrativeLogMock([
        {
          id: 1,
          date_begin: "2026-01-01T22:00:00",
          date_end,
          time_lost: 0.5,
          time_lost_type: "fault",
          systems: "Camera",
          message_text: "Incident with unusable end time",
        },
      ]),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    const card = narrativeLogCard(page);
    const row = card
      .getByRole("row")
      .filter({ has: page.getByRole("cell", { name: "Camera", exact: true }) });
    await expect(row).toBeVisible();
    const unavailable = row.getByLabel("Context Feed link is unavailable.", {
      exact: true,
    });
    await expect(unavailable).toHaveText("--");
    await expect(
      row.getByRole("link", {
        name: "Open the Context Feed around this incident.",
      }),
    ).toHaveCount(0);
    await unavailable.hover();
    await expect(page.getByRole("tooltip")).toContainText(
      "Context Feed link is unavailable.",
    );
    await expect(
      card.getByText("Incident with unusable end time", { exact: true }),
    ).toBeVisible();
  });
}

test("a precise TAI incident link preserves UTC microseconds and its five-minute window across midnight", async ({
  page,
}) => {
  await setupApiMocks(page, {
    "narrative-log": generateNarrativeLogMock([
      {
        id: 2,
        date_begin: "2026-01-01T23:55:00",
        date_end: "2026-01-02T00:00:10.123456",
        time_lost: 0.5,
        time_lost_type: "fault",
        systems: "Mount",
        message_text: "Precise incident",
      },
    ]),
  });
  await page.goto(TIME_ACCOUNTING_URL);
  const link = narrativeLogCard(page).getByRole("link", {
    name: "Open the Context Feed around this incident.",
  });
  await expect(link).toBeVisible();
  const center = Date.parse("2026-01-01T23:59:33.123Z");
  const expected = {
    startTime: String(center - 300000),
    endTime: String(center + 300000),
    selectedTime: String(center * 1000 + 456),
  };
  const href = new URL(await link.getAttribute("href"), page.url());
  for (const [key, value] of Object.entries(expected))
    expect(href.searchParams.get(key)).toBe(value);
  expect(href.searchParams.get("telescope")).toBe("Simonyi");
  expect(href.searchParams.get("startDayobs")).toBe("20260101");
  await link.click();
  await expect(page).toHaveURL(
    (url) =>
      url.pathname.endsWith("/context-feed") &&
      Object.entries(expected).every(
        ([key, value]) => url.searchParams.get(key) === value,
      ),
  );
});
