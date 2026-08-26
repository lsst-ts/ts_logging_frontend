// Fixed dayobs matching the fixture data (LSSTCam night).
// On localhost the retention policy is null, so any past date is valid.
export const TEST_DAYOBS = "20260101";
export const TEST_DAYOBS_INT = 20260101;
export const PLOTS_URL = `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;
export const DIGEST_URL = `/nightlydigest/?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;
export const DATALOG_URL = `/nightlydigest/data-log?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;
export const CONTEXTFEED_URL = `/nightlydigest/context-feed?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;
export const VISITMAPS_URL = `/nightlydigest/visit-maps?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;

// Full time range UTC boundaries for dayobs=20260101:
export const FULL_START = 1767268800000;
export const FULL_END = 1767355199000;
export const FULL_RANGE = FULL_END - FULL_START;

// UTC to TAI conversion offset (37 seconds in milliseconds)
export const UTC_TO_TAI_MS = 37000;

// Timeline grid insets (from TIMELINE_MARGINS in TIMELINE_DEFINITIONS.js).
// The ECharts grid uses containLabel: false, so the plot area is just the
// container inset by these fixed pixel margins.
export const TIMELINE_MARGIN_LEFT = 30;
export const TIMELINE_MARGIN_RIGHT = 30;
