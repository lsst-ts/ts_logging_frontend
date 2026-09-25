import {
  OBSERVATORY_STATES,
  STATUS_LABELS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  parseStatusBitmask,
  statusBitmaskToString,
} from "@/utils/observatoryStatusUtils";
import {
  almanacDayobsForPlot,
  utcDateTimeStrToMillis,
} from "@/utils/timeUtils";

/**
 * State keys that participate in the nighttime breakdown.
 *
 * DAYTIME is deliberately excluded completely. UNKNOWN is handled
 * separately (see buildObservatoryStatusBreakdown).
 */
export const BREAKDOWN_STATE_KEYS = [
  "OPERATIONAL",
  "FAULT",
  "WEATHER",
  "DOWNTIME",
  "IDLE",
];

/**
 * States that participate in the nighttime breakdown.
 *
 * Derived from the shared constants so labels and bit values stay in sync.
 */
export const BREAKDOWN_STATES = BREAKDOWN_STATE_KEYS.map((key) => ({
  key,
  label: STATUS_LABELS[key],
  bit: OBSERVATORY_STATES[key],
}));

/**
 * State pairs that cannot occur together.
 *
 * Add/remove pairs here when the observatory-state rules change.
 */
export const INVALID_STATE_PAIRS = [
  [OBSERVATORY_STATES.OPERATIONAL, OBSERVATORY_STATES.FAULT],
  [OBSERVATORY_STATES.OPERATIONAL, OBSERVATORY_STATES.DOWNTIME],
  [OBSERVATORY_STATES.OPERATIONAL, OBSERVATORY_STATES.IDLE],
];

const KNOWN_BREAKDOWN_MASK = BREAKDOWN_STATES.reduce(
  (mask, state) => mask | state.bit,
  0,
);

const HOURS_PER_MILLISECOND = 1 / (60 * 60 * 1000);

/**
 * Build the observing-night boundaries from almanac records.
 *
 * @param {Array<object>} almanacInfo
 * @returns {Array<object>}
 */
export function buildNightDefinitions(almanacInfo = []) {
  return almanacInfo
    .map((almanac) => {
      // The almanac dayobs refers to the calendar day AFTER the night it
      // describes, so it is shifted back a day (see almanacDayobsForPlot).
      const dayObs = almanacDayobsForPlot(almanac.dayobs);
      const startMs = utcDateTimeStrToMillis(almanac.twilight_evening_12deg);
      const endMs = utcDateTimeStrToMillis(almanac.twilight_morning_12deg);

      if (
        !/^\d{8}$/.test(dayObs) ||
        !Number.isFinite(startMs) ||
        !Number.isFinite(endMs) ||
        endMs <= startMs
      ) {
        return null;
      }

      const elapsedTwilightHours = Number(almanac.elapsed_twilight_hours);

      return {
        dayObs,
        startMs,
        endMs,
        nightHours: Number.isFinite(elapsedTwilightHours)
          ? elapsedTwilightHours
          : (endMs - startMs) * HOURS_PER_MILLISECOND,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.dayObs.localeCompare(b.dayObs));
}

/**
 * Determine whether a status mask is a valid nighttime combination.
 *
 * UNKNOWN (0) is valid by itself.
 *
 * DAYTIME is never valid for this breakdown because daytime intervals
 * are excluded completely.
 *
 * @param {number} status
 * @returns {boolean}
 */
export function isValidNighttimeStatus(status) {
  if (!Number.isInteger(status) || status < 0) {
    return false;
  }

  if (status === OBSERVATORY_STATES.UNKNOWN) {
    return true;
  }

  // DAYTIME is excluded from this table entirely.
  if (status & OBSERVATORY_STATES.DAYTIME) {
    return false;
  }

  // Reject bits we don't know about.
  if ((status & ~KNOWN_BREAKDOWN_MASK) !== 0) {
    return false;
  }

  return !INVALID_STATE_PAIRS.some(
    ([first, second]) => (status & first) !== 0 && (status & second) !== 0,
  );
}

/**
 * Get the component state definitions represented by a mask.
 *
 * @param {number} status
 * @returns {Array<object>}
 */
export function getStatesFromMask(status) {
  if (status === OBSERVATORY_STATES.UNKNOWN) {
    return [];
  }

  const activeNames = parseStatusBitmask(status);

  // Preserve the breakdown-state ordering; UNKNOWN is never included and
  // therefore never appears at the start.
  return BREAKDOWN_STATES.filter((state) => activeNames.includes(state.key));
}

/**
 * Generate every valid non-UNKNOWN combination according to the
 * configured state rules.
 *
 * This deliberately generates combinations that may ultimately have
 * zero duration. The table should show all possible combinations.
 *
 * @returns {Array<{mask: number, label: string, states: Array<object>}>}
 */
export function generateValidCombinations() {
  const combinations = [];

  const stateCount = BREAKDOWN_STATES.length;

  for (let selection = 1; selection < 1 << stateCount; selection += 1) {
    let mask = 0;

    for (let index = 0; index < stateCount; index += 1) {
      if (selection & (1 << index)) {
        mask |= BREAKDOWN_STATES[index].bit;
      }
    }

    if (!isValidNighttimeStatus(mask)) {
      continue;
    }

    combinations.push({
      mask,
      label: statusBitmaskToString(mask, " + "),
      states: getStatesFromMask(mask),
    });
  }

  return combinations.sort((a, b) => {
    // Single-state combinations first, then pairs, triples, etc.
    if (a.states.length !== b.states.length) {
      return a.states.length - b.states.length;
    }

    // Preserve the configured state ordering within combinations.
    return a.mask - b.mask;
  });
}

/**
 * All valid exact nighttime combinations.
 */
export const VALID_NIGHTTIME_COMBINATIONS = generateValidCombinations();

/**
 * Return all valid exact combinations containing a particular parent
 * state.
 *
 * @param {number} stateBit
 * @returns {Array<object>}
 */
export function getCombinationsForState(stateBit) {
  return VALID_NIGHTTIME_COMBINATIONS.filter(
    (combination) => (combination.mask & stateBit) !== 0,
  );
}

/**
 * Add a duration to an exact status mask for a particular night.
 *
 * @param {object} durations
 * @param {string} dayObs
 * @param {number} status
 * @param {number} hours
 */
function addDuration(durations, dayObs, status, hours) {
  if (!durations[dayObs][status]) {
    durations[dayObs][status] = 0;
  }

  durations[dayObs][status] += hours;
}

/**
 * Calculate exact status-mask durations clipped to each observing night.
 *
 * An interval's start_state represents the state active throughout the
 * interval, so that is the mask used for the duration.
 *
 * @param {object} args
 * @param {Array<object>} args.almanacInfo
 * @param {Array<object>} args.obsStatusIntervals
 * @returns {{
 *   nights: Array<object>,
 *   exactDurations: Record<string, Record<string, number>>
 * }}
 */
export function calculateExactStatusDurations({
  almanacInfo = [],
  obsStatusIntervals = [],
}) {
  const nights = buildNightDefinitions(almanacInfo);

  const exactDurations = Object.fromEntries(
    nights.map((night) => [night.dayObs, {}]),
  );

  for (const interval of obsStatusIntervals) {
    const startMs = Number(interval.start_time_ms);
    const endMs = Number(interval.end_time_ms);
    const status = Number(interval.start_state);

    if (
      !Number.isFinite(startMs) ||
      !Number.isFinite(endMs) ||
      endMs <= startMs ||
      !Number.isInteger(status)
    ) {
      continue;
    }

    // DAYTIME is completely outside the scope of this table.
    if (status & OBSERVATORY_STATES.DAYTIME) {
      continue;
    }

    // Do not create rows for combinations that violate the configured
    // observatory-state rules.
    if (!isValidNighttimeStatus(status)) {
      continue;
    }

    for (const night of nights) {
      const clippedStart = Math.max(startMs, night.startMs);
      const clippedEnd = Math.min(endMs, night.endMs);

      if (clippedEnd <= clippedStart) {
        continue;
      }

      const hours = (clippedEnd - clippedStart) * HOURS_PER_MILLISECOND;

      addDuration(exactDurations, night.dayObs, status, hours);
    }
  }

  return {
    nights,
    exactDurations,
  };
}

/**
 * Get the exact duration for a mask/night, returning zero when that
 * combination did not occur.
 *
 * @param {object} exactDurations
 * @param {string} dayObs
 * @param {number} status
 * @returns {number}
 */
export function getExactDuration(exactDurations, dayObs, status) {
  return exactDurations[dayObs]?.[status] ?? 0;
}

/**
 * Get the total duration for a parent state.
 *
 * Parent totals include every exact valid combination containing that
 * state.
 *
 * @param {object} exactDurations
 * @param {string} dayObs
 * @param {number} stateBit
 * @returns {number}
 */
export function getParentDuration(exactDurations, dayObs, stateBit) {
  return Object.entries(exactDurations[dayObs] ?? {}).reduce(
    (total, [statusString, hours]) => {
      const status = Number(statusString);

      return (status & stateBit) !== 0 ? total + hours : total;
    },
    0,
  );
}

/**
 * Sum one row's day-by-day values.
 *
 * @param {object} values
 * @returns {number}
 */
function getTotal(values) {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

/**
 * Build the complete table row model.
 *
 * The first two rows are summary rows.
 *
 * Each state parent contains EVERY valid exact combination containing
 * that state, including combinations whose duration is 0.
 *
 * UNKNOWN is special: it is a state mask of 0 and therefore cannot
 * have combination children.
 *
 * @param {object} args
 * @param {Array<object>} args.almanacInfo
 * @param {object} args.dayObsOpenDomeHours
 * @param {Array<object>} args.obsStatusIntervals
 * @returns {{
 *   rows: Array<object>,
 *   dayObsValues: Array<string>,
 *   nights: Array<object>
 * }}
 */
export function buildObservatoryStatusBreakdown({
  almanacInfo = [],
  dayObsOpenDomeHours = {},
  obsStatusIntervals = [],
}) {
  const { nights, exactDurations } = calculateExactStatusDurations({
    almanacInfo,
    obsStatusIntervals,
  });

  const dayObsValues = nights.map((night) => night.dayObs);

  const nightHoursValues = Object.fromEntries(
    nights.map((night) => [night.dayObs, night.nightHours]),
  );

  const domeOpenValues = Object.fromEntries(
    nights.map((night) => [
      night.dayObs,
      Number(dayObsOpenDomeHours?.[night.dayObs]?.open_hours ?? 0),
    ]),
  );

  const nightHoursRow = {
    state: "Night Hours",
    rowType: "summary",
    ...nightHoursValues,
  };

  nightHoursRow.total = getTotal(nightHoursValues);

  const domeOpenRow = {
    state: "Dome Open",
    rowType: "summary",
  };

  Object.assign(domeOpenRow, domeOpenValues);
  domeOpenRow.total = getTotal(domeOpenValues);

  const stateRows = BREAKDOWN_STATES.map((state) => {
    const subRows = getCombinationsForState(state.bit).map((combination) => {
      const values = Object.fromEntries(
        dayObsValues.map((dayObs) => [
          dayObs,
          getExactDuration(exactDurations, dayObs, combination.mask),
        ]),
      );

      return {
        state: combination.label,
        rowType: "combination",
        statusMask: combination.mask,
        ...values,
        total: getTotal(values),
      };
    });

    const values = Object.fromEntries(
      dayObsValues.map((dayObs) => [
        dayObs,
        getParentDuration(exactDurations, dayObs, state.bit),
      ]),
    );

    return {
      state: state.label,
      rowType: "state",
      statusMask: state.bit,
      ...values,
      total: getTotal(values),
      subRows,
    };
  });

  const unknownValues = Object.fromEntries(
    dayObsValues.map((dayObs) => [
      dayObs,
      getExactDuration(exactDurations, dayObs, OBSERVATORY_STATES.UNKNOWN),
    ]),
  );

  const unknownRow = {
    state: "Unknown",
    rowType: "state",
    statusMask: OBSERVATORY_STATES.UNKNOWN,
    ...unknownValues,
    total: getTotal(unknownValues),
  };

  return {
    rows: [nightHoursRow, domeOpenRow, ...stateRows, unknownRow],
    dayObsValues,
    nights,
  };
}
