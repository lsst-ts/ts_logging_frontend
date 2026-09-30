// @ts-check
import { readFile } from "node:fs/promises";
import Papa from "papaparse";

/**
 * Clicks a download button and returns the downloaded file.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} button
 * @returns {Promise<{filename: string, text: string}>}
 */
export async function downloadFile(page, button) {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    button.click(),
  ]);

  return {
    filename: download.suggestedFilename(),
    text: await readFile(await download.path(), "utf8"),
  };
}

/**
 * Clicks a download button and parses the downloaded CSV.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} [button] - Defaults to the
 *   page's only "Download CSV" button.
 * @returns {Promise<{filename: string, headers: string[], rows: Object[]}>}
 */
export async function downloadCsv(
  page,
  button = page.getByRole("button", { name: "Download CSV" }),
) {
  const { filename, text } = await downloadFile(page, button);
  const { data, meta } = Papa.parse(text, { header: true });

  return { filename, headers: meta.fields, rows: data };
}
