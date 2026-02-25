// Scripts to generate mock data for e2e fixtures
//
// Designed to be used in a node REPL session since its usually a one-off process to create
// new fixtures, but if you have more advanced needs you can use these scripts in your own
// scripts
//
// #  node
// Welcome to Node.js v23.6.1.
// Type ".help" for more information.
// > const { writeFixture, generateDataLogMock } = await require('./scripts')
// undefined
// > writeFixture(generateDataLogMock(10, { overrides: { airmass: null }}), 'datalog-null-airmass')
// undefined
//
// to generate a new data-log fixture where the airmass is set to null

import fs from "fs";
import path from "path";

/**
 * Generates a mock `data_log` response body for use in e2e tests.
 *
 * @param {number} count - Number of data-log records to generate.
 * @param {object} [options]
 * @param {number} [options.dayobs=20261010] - Day of observation in YYYYMMDD format. Records will
 *   start at midnight UTC on the following day.
 * @param {object} [options.overrides={}] - Field values to override on every generated record.
 * @param {function} [options.postProcess] - Called with each record after overrides are applied.
 *   Return the (optionally modified) record.
 * @returns {{ data_log: object[] }}
 */
export function generateDataLogMock(
  count,
  { dayobs = 20261010, overrides = {}, postProcess = (a) => a } = {},
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
      ),
    );
  }
  return { data_log: dl };
}

export function writeFixture(data, filename) {
  fs.writeFileSync(
    path.resolve(import.meta.dirname, "fixtures", `${filename}.json`),
    JSON.stringify(data, null, 2),
  );
}
