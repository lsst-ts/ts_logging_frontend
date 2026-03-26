// @ts-check

// Fixed dayobs matching the fixture data (LSSTCam night).
// On localhost the retention policy is null, so any past date is valid.
export const TEST_DAYOBS = "20260101";
export const TEST_DAYOBS_INT = 20260101;
export const PLOTS_URL = `/nightlydigest/plots?startDayobs=${TEST_DAYOBS}&endDayobs=${TEST_DAYOBS}&telescope=Simonyi`;

// Full time range UTC boundaries for dayobs=20260101:
//   getDayobsStartUTC("20260101") = 2026-01-01T12:00:00Z = 1767268800000 ms
//   getDayobsEndUTC("20260101")   = 2026-01-02T11:59:59Z = 1767355199000 ms
export const FULL_START = 1767268800000;
export const FULL_END = 1767355199000;
export const FULL_RANGE = FULL_END - FULL_START;
