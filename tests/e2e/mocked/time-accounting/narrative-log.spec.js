// @ts-check
import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../../helpers/mock-api.js";
import { generateNarrativeLogMock } from "../../helpers/mock-generators.js";
import { TIME_ACCOUNTING_URL } from "../../helpers/constants.js";
import {
  narrativeLogCard,
  waitForTimeAccountingLoad,
} from "../../helpers/time-accounting-helpers.js";

// Two fault entries with time loss. The first has attachments and a Jira
// ticket; the second has neither, so the table's conditional columns have
// something to show and something to hide.
const FAULT_LOGS = () =>
  generateNarrativeLogMock([
    {
      id: 1,
      date_begin: "2026-01-01T20:00:00",
      date_end: "2026-01-01T22:00:00",
      message_text: "A guide camera fault caused a delay.",
      time_lost: 1.5,
      time_lost_type: "fault",
      systems: "Camera",
      urls: ["https://rubinobs.atlassian.net/browse/OBS-1234"],
      user_id: "observer@example.org",
      attachments: ["https://example.org/attachment.txt"],
    },
    {
      id: 2,
      date_begin: "2026-01-01T22:30:00",
      date_end: "2026-01-01T22:45:00",
      message_text: "Mount tracking issue resolved.",
      time_lost: 0.25,
      time_lost_type: "fault",
      systems: "Mount",
      urls: [],
      user_id: "operator@example.org",
      attachments: [],
    },
  ]);

// Each entry renders as a data row plus an always-on sub-row carrying its
// incident message, so count only the data rows (sub-rows carry the
// `sub-row` class).
const logRows = (page) =>
  narrativeLogCard(page).locator("[data-slot='table-body'] tr:not(.sub-row)");

test.describe("Narrative Log — populated data", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page, { "narrative-log": FAULT_LOGS() });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);
  });

  test("renders the table with fault time-loss entries", async ({ page }) => {
    const card = narrativeLogCard(page);
    await expect(card).toBeVisible();
    await expect(logRows(page)).toHaveCount(2, { timeout: 15000 });
    // The columns shown by default.
    for (const header of [
      "Time of Incident (UTC)",
      "End of Incident",
      "Component",
      "Time Loss",
      "Jira Ticket",
      "User",
    ]) {
      await expect(
        page.getByRole("columnheader").filter({ hasText: header }),
      ).toBeVisible();
    }
  });

  test("shows the total fault loss in the footer", async ({ page }) => {
    const card = narrativeLogCard(page);
    await expect(card).toBeVisible();
    await expect(logRows(page)).toHaveCount(2, { timeout: 15000 });
    // 1.5 + 0.25 = 1.75 hours.
    await expect(card.getByText("Total Fault Loss:")).toBeVisible();
    await expect(card.getByText("1.75")).toBeVisible();
  });

  test("renders each row's incident message", async ({ page }) => {
    const card = narrativeLogCard(page);
    await expect(card).toBeVisible();
    await expect(
      card.getByText("A guide camera fault caused a delay."),
    ).toBeVisible();
    await expect(
      card.getByText("Mount tracking issue resolved."),
    ).toBeVisible();
  });

  test("shows the attachments column when an entry has attachments", async ({
    page,
  }) => {
    const card = narrativeLogCard(page);
    await expect(logRows(page)).toHaveCount(2, { timeout: 15000 });
    await expect(
      page.getByRole("columnheader").filter({ hasText: "Attachments" }),
    ).toBeVisible();
    await expect(
      card.getByRole("link", { name: "https://example.org/attachment.txt" }),
    ).toBeVisible();
  });

  test("links the Jira ticket for entries that have one", async ({ page }) => {
    const card = narrativeLogCard(page);
    await expect(logRows(page)).toHaveCount(2, { timeout: 15000 });
    const jira = card.getByRole("link", { name: "OBS-1234" });
    await expect(jira).toHaveAttribute(
      "href",
      "https://rubinobs.atlassian.net/browse/OBS-1234",
    );
  });

  test("hides and shows the table with the toggle", async ({ page }) => {
    const card = narrativeLogCard(page);
    await expect(logRows(page)).toHaveCount(2, { timeout: 15000 });

    await card.getByRole("button", { name: "Hide Table" }).click();
    await expect(logRows(page)).toHaveCount(0);

    await card.getByRole("button", { name: "Show Table" }).click();
    await expect(logRows(page)).toHaveCount(2);
  });
});

test.describe("Narrative Log — attachments hidden", () => {
  test("hides the attachments column when no entry has attachments", async ({
    page,
  }) => {
    await setupApiMocks(page, {
      "narrative-log": generateNarrativeLogMock([
        {
          id: 3,
          date_begin: "2026-01-01T23:00:00",
          date_end: "2026-01-01T23:10:00",
          message_text: "A fault with no attachments.",
          time_lost: 0.5,
          time_lost_type: "fault",
          systems: "TCS",
          urls: [],
          user_id: "operator@example.org",
          attachments: [],
        },
      ]),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(logRows(page)).toHaveCount(1, { timeout: 15000 });
    await expect(
      page.getByRole("columnheader").filter({ hasText: "Attachments" }),
    ).toHaveCount(0);
  });

  test("only shows entries with fault time loss", async ({ page }) => {
    await setupApiMocks(page, {
      "narrative-log": generateNarrativeLogMock([
        {
          id: 4,
          date_begin: "2026-01-01T20:00:00",
          date_end: "2026-01-01T20:30:00",
          message_text: "A fault with time loss.",
          time_lost: 0.5,
          time_lost_type: "fault",
          systems: "Camera",
          urls: [],
          user_id: "observer@example.org",
          attachments: [],
        },
        {
          id: 5,
          date_begin: "2026-01-01T21:00:00",
          date_end: "2026-01-01T21:15:00",
          message_text: "Weather loss, not a fault.",
          time_lost: 0.25,
          time_lost_type: "weather",
          systems: "Atmosphere",
          urls: [],
          user_id: "observer@example.org",
          attachments: [],
        },
      ]),
    });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(logRows(page)).toHaveCount(1, { timeout: 15000 });
    await expect(
      narrativeLogCard(page).getByText("A fault with time loss."),
    ).toBeVisible();
    await expect(
      narrativeLogCard(page).getByText("Weather loss, not a fault."),
    ).toHaveCount(0);
  });
});

test.describe("Narrative Log — empty state", () => {
  test("shows the no-entries message", async ({ page }) => {
    await setupApiMocks(page, { "narrative-log": generateNarrativeLogMock() });
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      narrativeLogCard(page).getByText(
        "No Narrative Log entries with fault time loss.",
      ),
    ).toBeVisible({ timeout: 15000 });
  });
});

test.describe("Narrative Log — fetch failure", () => {
  test("shows a fetch-error message instead of the table", async ({ page }) => {
    await setupApiMocks(page);
    // Registered after setupApiMocks so this failed route takes precedence.
    await page.route("**/nightlydigest/api/narrative-log*", (route) =>
      route.abort(),
    );
    await page.goto(TIME_ACCOUNTING_URL);
    await waitForTimeAccountingLoad(page);

    await expect(
      narrativeLogCard(page).getByText(
        "Narrative Log data could not be fetched.",
      ),
    ).toBeVisible({ timeout: 15000 });
  });
});
