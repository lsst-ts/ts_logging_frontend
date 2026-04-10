/**
 * Generates a mock `data_log` response body for use in e2e tests.
 *
 * @param {number} count - Number of data-log records to generate.
 * @param {object} [options]
 * @param {number} [options.dayobs=20260101] - Day of observation in YYYYMMDD format. Records will
 *   start at midnight UTC on the following day.
 * @param {object} [options.overrides={}] - Field values to override on every generated record.
 * @param {function} [options.postProcess] - Called with each record after overrides are applied.
 *   Return the (optionally modified) record.
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
    const obs_end = new Date(obsStart.getTime() + 30_000)
      .toISOString()
      .replace("Z", "");
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
            obs_end,
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
            science_program: "SURVEY",
            img_type: "SCIENCE",
            observation_reason: "survey",
            target_name: "survey_target",
            s_ra: 180.0,
            s_dec: -30.0,
            altitude: 60.0,
            azimuth: 180.0,
            sky_rotation: 0.0,
            dimm_seeing: 0.8,
            high_snr_source_count_median: 1500,
            mt_salindex112_temperature_0_mean: 18.5,
          },
          overrides,
        ),
      ),
    );
  }
  return { data_log: dl };
}

/**
 * Generates a mock `exposure_entries` response body for use in e2e tests.
 *
 * Each record's `obs_id` matches the `exposure_name` of the corresponding
 * `generateDataLogMock` record (same dayobs + seq_num), so the two mocks
 * can be used together to exercise the `mergeDataLogSources` merge path.
 *
 * Note: ConsDB rows without a matching exposure-entries record still appear
 * in the merged table — they just get default values (`exposure_flag: "none"`,
 * `message_text: ""`). You only need to include records in this mock when you
 * want to test non-default flag or message values.
 *
 * @param {number} count - Number of exposure-entry records to generate.
 * @param {object} [options]
 * @param {number} [options.dayobs=20260101] - Day of observation in YYYYMMDD format.
 * @param {object} [options.overrides={}] - Field values to override on every generated record.
 * @param {function} [options.postProcess] - Called with each record after overrides are applied.
 *   Return the (optionally modified) record.
 * @returns {{ exposure_entries: object[] }}
 */
export function generateExposureEntriesMock(
  count,
  { dayobs = 20260101, overrides = {}, postProcess = (a) => a } = {},
) {
  const entries = [];
  const dayObsStr = String(dayobs);
  for (let i = 1; i <= count; i++) {
    const seqNumStr = i.toString().padStart(6, "0");
    entries.push(
      postProcess(
        Object.assign(
          {
            obs_id: `MC_O_${dayObsStr}_${seqNumStr}`,
            instrument: "LSSTCam",
            exposure_flag: "none",
            message_text: "",
          },
          overrides,
        ),
      ),
    );
  }
  return { exposure_entries: entries };
}
