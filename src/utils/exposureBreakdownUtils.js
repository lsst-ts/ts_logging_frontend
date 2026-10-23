/**
 * Exposure fields the exposure breakdown can be grouped by.
 */
export const GroupByValues = Object.freeze({
  OBSERVATION_REASON: "observation_reason",
  IMG_TYPE: "img_type",
  SCIENCE_PROGRAM: "science_program",
  TARGET_NAME: "target_name",
  FILTER: "physical_filter",
});

/**
 * Group exposures by a field and total their counts and exposure times,
 * split by whether each exposure is flagged.
 *
 * Exposures with no value for the field are grouped as "No target" when
 * grouping by target name, and "Unknown" otherwise. Missing or non-numeric
 * exposure times count as 0.
 *
 * @param {Array<Object>} exposureFields - Exposure records
 * @param {Array<{obs_id: string}>} flags - Flagged exposures, matched to
 *   records by `exposure_name`
 * @param {string} groupBy - One of `GroupByValues`
 * @returns {{
 *   groups: Array<{
 *     groupKey: string,
 *     exposureIds: string[],
 *     unflaggedCount: number,
 *     flaggedCount: number,
 *     unflaggedTime: number,
 *     flaggedTime: number,
 *   }>,
 *   totalFlaggedCount: number,
 *   totalFlaggedTime: number,
 * }} Groups in the order their first exposure appears, plus flagged totals
 */
export function aggregateExposureBreakdown(exposureFields, flags, groupBy) {
  const flaggedObsIds = new Set(flags.map((f) => f.obs_id));
  const aggregatedMap = {};

  let totalFlaggedCount = 0;
  let totalFlaggedTime = 0;

  if (Array.isArray(exposureFields)) {
    exposureFields.forEach((row) => {
      const rawValue = row[groupBy];
      const groupKey =
        rawValue === null || rawValue === undefined || rawValue === ""
          ? groupBy === GroupByValues.TARGET_NAME
            ? "No target"
            : "Unknown"
          : rawValue;

      const expTime = parseFloat(row.exp_time ?? 0);
      const time = isNaN(expTime) ? 0 : expTime;
      const isFlagged = flaggedObsIds.has(row.exposure_name);

      if (!aggregatedMap[groupKey]) {
        aggregatedMap[groupKey] = {
          groupKey,
          exposureIds: [],
          unflaggedCount: 0,
          flaggedCount: 0,
          unflaggedTime: 0,
          flaggedTime: 0,
        };
      }
      const group = aggregatedMap[groupKey];
      group.exposureIds.push(String(row.exposure_id));

      if (isFlagged) {
        group.flaggedCount += 1;
        group.flaggedTime += time;
        totalFlaggedCount += 1;
        totalFlaggedTime += time;
      } else {
        group.unflaggedCount += 1;
        group.unflaggedTime += time;
      }
    });
  } else {
    console.warn("exposureFields is not an array:", exposureFields);
  }

  return {
    groups: Object.values(aggregatedMap),
    totalFlaggedCount,
    totalFlaggedTime,
  };
}
