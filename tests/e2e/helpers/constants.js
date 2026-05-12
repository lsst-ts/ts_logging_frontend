// Fixed dayobs matching the fixture data (LSSTCam night).
// On localhost the retention policy is null, so any past date is valid.
export const TEST_DAYOBS = "20260101";
export const TEST_DAYOBS_INT = 20260101;
export const PLOTS_URL = `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;

// Full time range UTC boundaries for dayobs=20260101:
export const FULL_START = 1767268800000;
export const FULL_END = 1767355199000;
export const FULL_RANGE = FULL_END - FULL_START;
