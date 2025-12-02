// @ts-check
/* global process */
import { test, expect } from "@playwright/test";

const NIGHTLY_DIGEST_URL =
  "https://usdf-rsp-dev.slac.stanford.edu/nightlydigest";

// Set your authorization token here or use an environment variable
const GAFAELFAWR_COOKIE = {
  name: "gafaelfawr",
  value: process.env.GAFAELFAWR_COOKIE || "cookie-value",
  domain: "usdf-rsp-dev.slac.stanford.edu",
  path: "/",
};

const DATA_LOAD_TIMEOUT = 60000 * 4;
const APPLET_CONTENT_SELECTOR = "main > :nth-child(2)";

/**
 * Function to wait for applet data to load
 * @param {*} page, the Playwright page object
 * It waits for the applet content to be visible and then waits for
 * the skeletons loaders to disappear, indicating that data has finished loading.
 */
async function waitForDataLoad(page) {
  const appletContent = page.locator(APPLET_CONTENT_SELECTOR);
  await expect(appletContent).toBeVisible({ timeout: 10000 });

  // Check if selector has a specific child
  const skeletonLocator = appletContent.locator('[data-slot="skeleton"]');

  // Wait for skeleton to disappear (data finished loading)
  await expect(skeletonLocator).toHaveCount(0, { timeout: DATA_LOAD_TIMEOUT });
}

test.describe("Nightly Digest Dashboard page", () => {
  const url = `${NIGHTLY_DIGEST_URL}`;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([GAFAELFAWR_COOKIE]);
  });

  test("page loads successfully", async ({ page }) => {
    await page.goto(url);

    // Check that the page has a title
    await expect(page).toHaveTitle(/.*Nightly Digest.*/i);

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await waitForDataLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Nightly Digest Plots page", () => {
  const url = `${NIGHTLY_DIGEST_URL}/plots`;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([GAFAELFAWR_COOKIE]);
  });

  test("page loads successfully", async ({ page }) => {
    await page.goto(url);

    // Check that the page has a title
    await expect(page).toHaveTitle(/.*Nightly Digest.*/i);

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await waitForDataLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Nightly Digest Datalog page", () => {
  const url = `${NIGHTLY_DIGEST_URL}/data-log`;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([GAFAELFAWR_COOKIE]);
  });

  test("page loads successfully", async ({ page }) => {
    await page.goto(url);

    // Check that the page has a title
    await expect(page).toHaveTitle(/.*Nightly Digest.*/i);

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await waitForDataLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Nightly Digest Context Feed page", () => {
  const url = `${NIGHTLY_DIGEST_URL}/context-feed`;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([GAFAELFAWR_COOKIE]);
  });

  test("page loads successfully", async ({ page }) => {
    await page.goto(url);

    // Check that the page has a title
    await expect(page).toHaveTitle(/.*Nightly Digest.*/i);

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await waitForDataLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });
});

test.describe("Nightly Digest Visit Maps page", () => {
  const url = `${NIGHTLY_DIGEST_URL}/visit-maps`;

  test.beforeEach(async ({ context }) => {
    await context.addCookies([GAFAELFAWR_COOKIE]);
  });

  test("page loads successfully", async ({ page }) => {
    await page.goto(url);

    // Check that the page has a title
    await expect(page).toHaveTitle(/.*Nightly Digest.*/i);

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await waitForDataLoad(page);
    expect(consoleErrors).toHaveLength(0);
  });
});
