/**
 * Data source definitions used across the app.
 *
 * `SOURCE` maps each data source to its backend API endpoint slug (see
 * `fetchUtils.buildBackendURL`) — the identifier used across fetchers, applets
 * and pages, so typos are caught and identifiers stay consistent.
 *
 * `SOURCE_METADATA` provides the per-source display metadata (a label and, where
 * meaningful, a no-data message) used by the status model to build
 * human-readable messages.
 */
export const SOURCE = {
  EXPOSURES: "exposures",
  EXPECTED_EXPOSURES: "expected-exposures",
  ALMANAC: "almanac",
  NARRATIVE_LOG: "narrative-log",
  OBS_STATUS: "obs-status",
  NIGHT_REPORTS: "night-reports",
  EXPOSURE_FLAGS: "exposure-flags",
  JIRA_TICKETS: "jira-tickets",
  DATA_LOG: "data-log",
  EXPOSURE_ENTRIES: "exposure-entries",
  CONTEXT_FEED: "context-feed",
  BACKEND_VERSION: "version",
  MULTI_NIGHT_VISIT_MAPS: "multi-night-visit-maps",
  BLOCK_DETAILS: "block-details",
  STATIC_VISIT_MAP: "static-visit-map",
};

/**
 * Per-source display metadata.
 *
 * `label` is the human-readable source name used in default messages, and
 * `noDataMessage` is the message shown when the source was reached but has no
 * data (as opposed to a fetch failure).
 */
export const SOURCE_METADATA = {
  [SOURCE.ALMANAC]: {
    label: "Almanac",
    noDataMessage: "No almanac data available.",
  },
  [SOURCE.OBS_STATUS]: {
    label: "Observatory Status",
    noDataMessage: "No observatory status data available.",
  },
  [SOURCE.EXPOSURES]: {
    label: "Exposure",
    noDataMessage: "No exposures found in ConsDB.",
  },
  [SOURCE.EXPECTED_EXPOSURES]: {
    label: "Expected exposures",
    noDataMessage: "No expected exposures data available.",
  },
  // For Exposure Flags, if there is no data, then we have no exposures
  // flagged, and this is a good thing, so no need to warn the user.
  [SOURCE.EXPOSURE_FLAGS]: { label: "Exposure Flags" },
  [SOURCE.NARRATIVE_LOG]: {
    label: "Narrative Log",
    noDataMessage: "No narrative log entries available.",
  },
  // An empty Jira result is a good outcome (no tickets created/updated), so it
  // has no noDataMessage: empty data shows 0 rather than warning the user.
  [SOURCE.JIRA_TICKETS]: { label: "Jira tickets" },
  [SOURCE.NIGHT_REPORTS]: {
    label: "Night reports",
    noDataMessage: "No reports available.",
  },
  [SOURCE.DATA_LOG]: {
    label: "Data log",
    noDataMessage: "No exposures found in ConsDB.",
  },
  [SOURCE.EXPOSURE_ENTRIES]: {
    label: "Exposure entries",
    noDataMessage: "No exposure entries available.",
  },
  [SOURCE.BLOCK_DETAILS]: {
    label: "Block details",
    noDataMessage: "No block details available.",
  },
  [SOURCE.MULTI_NIGHT_VISIT_MAPS]: {
    label: "Visit maps",
    noDataMessage: "No visit map data available.",
  },
  [SOURCE.STATIC_VISIT_MAP]: {
    label: "Visit map",
    noDataMessage: "No science visits available.",
  },
};

// Displayed in place of no data.
export const NO_DATA_DISPLAY = "--";
