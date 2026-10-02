import Papa from "papaparse";

const FILENAME_PREFIX = "nightlydigest";

/**
 * Columns identifying each exposure in exposure-based downloads.
 */
const EXPOSURE_KEY_COLUMNS = [
  "exposure_id",
  "exposure_name",
  "obs_start",
  "day_obs",
  "seq_num",
  "science_program",
  "observation_reason",
].map((key) => ({ key }));

/**
 * Normalise a single value for CSV output.
 *
 * Nested objects and arrays are JSON-stringified so no information is lost;
 * missing values become empty cells.
 *
 * @param {*} value
 * @returns {string|number|boolean}
 */
function toCsvCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/**
 * Serialise rows to CSV text.
 *
 * @param {Array<Object>} rows - Records to serialise.
 * @param {Array<{key: string, header?: string}>} columns - Output columns, in
 *   order. `key` is looked up on each row; `header` defaults to `key`.
 * @returns {string} CSV text, including a header row.
 */
const toCsv = (rows, columns) => {
  const fields = columns.map((column) => column.header ?? column.key);
  const data = rows.map((row) =>
    columns.map((column) => toCsvCell(row[column.key])),
  );

  return Papa.unparse({ fields, data }, { escapeFormulae: true });
};

/**
 * Build `toCsv` columns for every field found in a set of records, in the
 * order each field first appears.
 *
 * @param {Array<Object>} records
 * @returns {Array<{key: string}>}
 */
const columnsFromRecords = (records) => {
  const keys = new Set();
  for (const record of records) {
    for (const key of Object.keys(record)) keys.add(key);
  }
  return [...keys].map((key) => ({ key }));
};

/**
 * Save text content to a file in the browser.
 *
 * @param {string} content - File content.
 * @param {string} filename - Name of the downloaded file.
 * @param {string} mimeType - MIME type, e.g. "text/csv".
 */
const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoke after the click has been handled, so the download can start first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Build the filename for a download.
 *
 * e.g. "nightlydigest_data-log_Simonyi_20260101-20260103.csv"
 *
 * @param {string} source - Page or applet name, in kebab-case.
 * @param {Object} range
 * @param {string} range.telescope - Selected telescope.
 * @param {string|number} range.startDayobs - First dayobs (inclusive).
 * @param {string|number} range.endDayobs - Last dayobs (inclusive).
 * @param {string} ext - File extension, without the dot.
 * @returns {string} The filename.
 */
const buildDownloadFilename = (
  source,
  { telescope, startDayobs, endDayobs },
  ext,
) =>
  `${FILENAME_PREFIX}_${source}_${telescope}_${startDayobs}-${endDayobs}.${ext}`;

export {
  EXPOSURE_KEY_COLUMNS,
  toCsv,
  columnsFromRecords,
  downloadFile,
  buildDownloadFilename,
};
