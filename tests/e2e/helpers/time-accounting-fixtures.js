// Two historical nights with independently countable overlapping states.
export function twoNightAccountingMocks() {
  const almanac = [1, 2].map((day) => ({
    dayobs: 20260101 + day,
    night_hours: 8,
    elapsed_twilight_hours: 8,
    twilight_evening_0deg: `2026-01-0${day} 19:30:00`,
    twilight_evening_12deg: `2026-01-0${day} 20:00:00`,
    twilight_morning_12deg: `2026-01-0${day + 1} 04:00:00`,
    twilight_morning_0deg: `2026-01-0${day + 1} 04:30:00`,
    moon_rise_time: `2026-01-0${day} 22:00:00`,
    moon_set_time: `2026-01-0${day + 1} 02:00:00`,
    moon_illumination: "50%",
  }));
  const intervals = [
    ["2026-01-01T20:00:00Z", 2, 2],
    ["2026-01-01T22:00:00Z", 1, 10],
    ["2026-01-01T23:00:00Z", 1, 8],
    ["2026-01-02T20:00:00Z", 2, 10],
    ["2026-01-02T22:00:00Z", 1, 4],
  ].map(([start, hours, status]) => ({
    start_time_ms: Date.parse(start),
    end_time_ms: Date.parse(start) + hours * 3600000,
    start_state: status,
    end_state: status,
    start_labels: "Test status",
    end_labels: "Test status",
  }));
  return {
    almanac: { almanac_info: almanac },
    "obs-status": {
      entries: intervals.map((i) => ({
        time_ms: i.start_time_ms,
        time: new Date(i.start_time_ms).toISOString(),
        status: i.start_state,
      })),
      intervals,
      metrics: { weather: 4, fault_loss: 1 },
      totals: {},
      availability: { status: "full" },
    },
  };
}
export const TWO_NIGHT_ACCOUNTING_URL =
  "time-accounting?startDayobs=20260101&endDayobs=20260102&telescope=Simonyi";
export const accountingCard = (page, title) =>
  page.getByTestId("applet-card").filter({ hasText: title });
