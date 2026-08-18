/**
 * Generates a mock `data_log` response body for use in e2e tests.
 *
 * @param {number} count - Number of data-log records to generate.
 * @param {object} [options]
 * @param {number} [options.dayobs=20260101] - Day of observation in YYYYMMDD format. Records will
 *   start at midnight UTC on the following day.
 * @param {object} [options.overrides={}] - Field values to override on every generated record.
 * @param {function} [options.postProcess] - Called with (record, i) after overrides are applied,
 *   where i is the 1-based sequence number. Return the (optionally modified) record.
 * @returns {{ data_log: object[] }}
 */
export function generateDataLogMock(
  count,
  { dayobs = 20260101, overrides = {}, postProcess = (a) => a } = {},
) {
  const dl = [];
  const dayObsStr = String(dayobs);
  const year = dayObsStr.slice(0, 4);
  const month = dayObsStr.slice(4, 6);
  const day = dayObsStr.slice(6, 8);
  const nightStart = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  nightStart.setUTCDate(nightStart.getUTCDate() + 1);
  for (let i = 1; i <= count; i++) {
    const obsStart = new Date(nightStart.getTime() + (i - 1) * 60_000);
    const obs_start = obsStart.toISOString().replace("Z", "");
    const seqNumStr = i.toString().padStart(6, "0");
    dl.push(
      postProcess(
        Object.assign(
          {
            exposure_id: parseInt(`${dayObsStr}${seqNumStr}`),
            exposure_name: `MC_O_${dayObsStr}_${seqNumStr}`,
            controller: "O",
            day_obs: dayobs,
            seq_num: i,
            obs_start,
            science_program: "SURVEY",
            physical_filter: "y_10",
            band: "y",
            can_see_sky: true,
            airmass: 1.3,
            psf_sigma_median: 2.8,
            pixel_scale_median: null,
            zero_point_median: 32,
            sky_bg_median: 630,
            exp_time: 30,
            air_temp: 15,
          },
          overrides,
        ),
        i,
      ),
    );
  }
  return { data_log: dl };
}

/**
 * Generates mock data-log records with varied band/physical_filter values.
 * Cycles through ["y", "g", "r", "i", "z"] so each band appears 6 times in 30 records.
 *
 * @param {number} count
 * @param {object} [options] - Same options as generateDataLogMock
 * @returns {{ data_log: object[] }}
 */
export function generateDataLogMockMultiBand(count, options = {}) {
  const bands = ["y", "g", "r", "i", "z"];
  return generateDataLogMock(count, {
    ...options,
    postProcess: (r, i) => ({
      ...r,
      band: bands[i % bands.length],
      physical_filter: `${bands[i % bands.length]}_10`,
    }),
  });
}

/**
 * Generates mock data-log records with varied science_program values.
 * Cycles through ["FM", "BF", "DF", "MINI", "SN"] so each program appears 6 times in 30 records.
 *
 * @param {number} count
 * @param {object} [options] - Same options as generateDataLogMock
 * @returns {{ data_log: object[] }}
 */
export function generateDataLogMockMultiProgram(count, options = {}) {
  const programs = ["FM", "BF", "DF", "MINI", "SN"];
  return generateDataLogMock(count, {
    ...options,
    postProcess: (r, i) => ({
      ...r,
      science_program: programs[i % programs.length],
    }),
  });
}

/**
 * Generates a mock `exposure_entries` response body (the exposure-log endpoint).
 *
 * Flags/Comments can only be mocked via this endpoint: mergeAllDataLogSources
 * matches entries to ConsDB rows by obs_id === exposure_name and overwrites
 * any exposure_flag present on the data-log records themselves.
 *
 * @param {object[]} entries - Partial entries; `obs_id` is required and must
 *   match a generated `exposure_name` (e.g. "MC_O_20260101_000001"). Other
 *   fields default to instrument "LSSTCam", exposure_flag "none",
 *   message_text "".
 * @returns {{ exposure_entries: object[] }}
 */
export function generateExposureLogMock(entries) {
  return {
    exposure_entries: entries.map((entry) => ({
      instrument: "LSSTCam",
      exposure_flag: "none",
      message_text: "",
      ...entry,
    })),
  };
}

/**
 * Generates a context-feed API response.
 *
 * Rows are spaced a minute apart from 20:00 UTC on the given dayobs, which
 * keeps them inside the night's full time range. `postProcess` receives each
 * row and its one-based index, so tests can vary category_index, finalStatus
 * or config per row.
 *
 * @param {number} count
 * @param {{dayobs?: number, overrides?: object, postProcess?: (row: object, i: number) => object}} [options]
 * @returns {{data: object[], cols: string[]}}
 */
export function generateContextFeedMock(
  count,
  { dayobs = 20260101, overrides = {}, postProcess = (a) => a } = {},
) {
  const dayObsStr = String(dayobs);
  const year = dayObsStr.slice(0, 4);
  const month = dayObsStr.slice(4, 6);
  const day = dayObsStr.slice(6, 8);
  const nightStart = new Date(`${year}-${month}-${day}T20:00:00.000Z`);

  const data = [];
  for (let i = 1; i <= count; i++) {
    const time = new Date(nightStart.getTime() + (i - 1) * 60_000);
    data.push(
      postProcess(
        Object.assign(
          {
            time: time.toISOString(),
            category_index: 7,
            name: `MC_O_${dayObsStr}_${String(i).padStart(6, "0")}`,
            description: `Simonyi exposure ${i}`,
            config: null,
            script_salIndex: 0,
            finalStatus: null,
            timestampProcessStart: null,
            timestampConfigureStart: null,
            timestampConfigureEnd: null,
            timestampRunStart: null,
            timestampProcessEnd: null,
          },
          overrides,
        ),
        i,
      ),
    );
  }

  return {
    data,
    cols: [
      "time",
      "category_index",
      "name",
      "description",
      "config",
      "script_salIndex",
      "finalStatus",
    ],
  };
}
