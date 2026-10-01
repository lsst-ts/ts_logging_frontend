import { describe, it, expect, vi, afterEach } from "vitest";

import {
  GroupByValues,
  aggregateExposureBreakdown,
} from "@/utils/exposureBreakdownUtils";

const exposure = (id, fields) => ({
  exposure_id: id,
  exposure_name: `MC_O_20260101_00000${id}`,
  exp_time: 30,
  ...fields,
});

describe("aggregateExposureBreakdown", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("totals counts and times per group, split by flag", () => {
    const exposures = [
      exposure(1, { science_program: "A" }),
      exposure(2, { science_program: "B", exp_time: 15 }),
      exposure(3, { science_program: "A" }),
      exposure(4, { science_program: "A", exp_time: 5 }),
    ];
    const flags = [{ obs_id: "MC_O_20260101_000003" }];

    const { groups, totalFlaggedCount, totalFlaggedTime } =
      aggregateExposureBreakdown(
        exposures,
        flags,
        GroupByValues.SCIENCE_PROGRAM,
      );

    expect(groups).toEqual([
      {
        groupKey: "A",
        exposureIds: ["1", "3", "4"],
        unflaggedCount: 2,
        flaggedCount: 1,
        unflaggedTime: 35,
        flaggedTime: 30,
      },
      {
        groupKey: "B",
        exposureIds: ["2"],
        unflaggedCount: 1,
        flaggedCount: 0,
        unflaggedTime: 15,
        flaggedTime: 0,
      },
    ]);
    expect(totalFlaggedCount).toBe(1);
    expect(totalFlaggedTime).toBe(30);
  });

  it("groups missing values as Unknown, or No target for target names", () => {
    const exposures = [
      exposure(1, { img_type: null, target_name: "" }),
      exposure(2, {}),
    ];

    const byImgType = aggregateExposureBreakdown(
      exposures,
      [],
      GroupByValues.IMG_TYPE,
    );
    const byTarget = aggregateExposureBreakdown(
      exposures,
      [],
      GroupByValues.TARGET_NAME,
    );

    expect(byImgType.groups.map((g) => g.groupKey)).toEqual(["Unknown"]);
    expect(byTarget.groups.map((g) => g.groupKey)).toEqual(["No target"]);
  });

  it("counts missing or non-numeric exposure times as 0", () => {
    const exposures = [
      exposure(1, { physical_filter: "r_57", exp_time: null }),
      exposure(2, { physical_filter: "r_57", exp_time: "n/a" }),
    ];

    const { groups } = aggregateExposureBreakdown(
      exposures,
      [],
      GroupByValues.FILTER,
    );

    expect(groups[0]).toMatchObject({ unflaggedCount: 2, unflaggedTime: 0 });
  });

  it("returns no groups, with a warning, when the exposures aren't an array", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = aggregateExposureBreakdown(
      undefined,
      [],
      GroupByValues.SCIENCE_PROGRAM,
    );

    expect(result).toEqual({
      groups: [],
      totalFlaggedCount: 0,
      totalFlaggedTime: 0,
    });
    expect(warn).toHaveBeenCalled();
  });
});
