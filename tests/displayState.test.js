import { describe, it, expect } from "vitest";

import {
  resolveDisplayState,
  buildObsStatusSource,
} from "../src/utils/displayState";
import { SOURCE } from "../src/constants/DATA_SOURCES";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "../src/constants/OBSERVATORY_STATUS_DEFINITIONS";

describe("resolveDisplayState", () => {
  it("returns loading while loading", () => {
    const result = resolveDisplayState({ loading: true, sources: {} });
    expect(result.state).toBe("loading");
    expect(result.message).toBe("");
  });

  it("is ready with no message when all sources are ok", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true },
        [SOURCE.ALMANAC]: { ok: true },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("ready");
    expect(result.message).toBe("");
  });

  it("errors when a required source is missing", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: false },
        [SOURCE.ALMANAC]: { ok: true },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe("Exposure data could not be fetched.");
  });

  it("lists every missing required source", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: false },
        [SOURCE.ALMANAC]: { ok: false },
      },
      required: [SOURCE.EXPOSURES, SOURCE.ALMANAC],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe(
      "Exposure and Almanac data could not be fetched.",
    );
  });

  it("uses an Oxford comma only for three or more sources", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: false },
        [SOURCE.ALMANAC]: { ok: false },
        [SOURCE.OBS_STATUS]: { ok: false },
      },
      required: [SOURCE.EXPOSURES, SOURCE.ALMANAC, SOURCE.OBS_STATUS],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe(
      "Exposure, Almanac, and Observatory Status data could not be fetched.",
    );
  });

  it("stays ready with a warning when only a non-required source is missing", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true },
        [SOURCE.NARRATIVE_LOG]: { ok: false },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("ready");
    expect(result.message).toBe("Narrative Log data could not be fetched.");
  });

  it("drops required partial notes from the error message (only real problems)", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: false },
        [SOURCE.OBS_STATUS]: {
          ok: true,
          message: "Observatory Status data is only available from 2026-01-02.",
        },
      },
      required: [SOURCE.EXPOSURES, SOURCE.OBS_STATUS],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe("Exposure data could not be fetched.");
  });

  it("is ready with a header warning when a required source is partial", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true },
        [SOURCE.OBS_STATUS]: {
          ok: true,
          message: "Observatory Status data is only available from 2026-01-02.",
        },
      },
      required: [SOURCE.EXPOSURES, SOURCE.OBS_STATUS],
    });
    expect(result.state).toBe("ready");
    expect(result.message).toBe(
      "Observatory Status data is only available from 2026-01-02.",
    );
  });

  it("treats an optional source as a fetch failure like other sources", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.ALMANAC]: { ok: false },
        [SOURCE.EXPOSURES]: { ok: false },
      },
      required: [SOURCE.EXPOSURES, SOURCE.ALMANAC],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe(
      "Almanac and Exposure data could not be fetched.",
    );
  });

  it("treats a present source that is not explicitly ok as needing a message", () => {
    const result = resolveDisplayState({
      sources: { [SOURCE.EXPOSURES]: { ok: 0 } },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe("Exposure data could not be fetched.");
  });

  it("uses the source key as the label for unknown sources", () => {
    const result = resolveDisplayState({
      sources: { "mystery-source": { ok: false } },
      required: ["mystery-source"],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe("mystery-source data could not be fetched.");
  });

  it("is noData with the no-data message when a required source has no data", () => {
    const result = resolveDisplayState({
      sources: { [SOURCE.EXPOSURES]: { ok: true, noData: true } },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("noData");
    expect(result.message).toBe("No exposures found in ConsDB.");
  });

  it("shows only required-source messages in the noData state", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true, noData: true },
        [SOURCE.BLOCK_DETAILS]: { ok: true, noData: true },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("noData");
    expect(result.message).toBe("No exposures found in ConsDB.");
  });

  it("treats a required fetch error as more severe than required no-data", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: false },
        [SOURCE.BLOCK_DETAILS]: { ok: true, noData: true },
      },
      required: [SOURCE.EXPOSURES, SOURCE.BLOCK_DETAILS],
    });
    expect(result.state).toBe("error");
    expect(result.message).toBe(
      "Exposure data could not be fetched. No block details available.",
    );
  });

  it("is ready with a header warning when an optional source has no data", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true },
        [SOURCE.BLOCK_DETAILS]: { ok: true, noData: true },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("ready");
    expect(result.message).toBe("No block details available.");
  });

  it("is clean when a source reports no data is expected (no noData flag)", () => {
    const result = resolveDisplayState({
      sources: {
        [SOURCE.EXPOSURES]: { ok: true },
        // exposure-flags: empty is good, so it should not raise a warning
        [SOURCE.EXPOSURE_FLAGS]: { ok: true },
      },
      required: [SOURCE.EXPOSURES],
    });
    expect(result.state).toBe("ready");
    expect(result.message).toBe("");
  });
});

describe("buildObsStatusSource", () => {
  const FULL = { status: OBSERVATORY_STATE_AVAILABILITY_STATUS.FULL };
  const PARTIAL = {
    status: OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL,
    available_from: "2026-01-02",
  };
  const NONE = {
    status: OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE,
    available_from: "2026-01-02",
  };

  it("carries a fetch-error message on fetch error", () => {
    const source = buildObsStatusSource(FULL, true);
    expect(source).toEqual({
      ok: false,
      message: "Observatory Status data could not be fetched.",
    });
  });

  it("is ok when availability is full and there are entries", () => {
    const source = buildObsStatusSource(FULL, false, 1);
    expect(source).toEqual({ ok: true });
  });

  it("is noData with a message when availability is full but there are no entries", () => {
    const source = buildObsStatusSource(FULL, false, 0);
    expect(source).toEqual({
      ok: true,
      noData: true,
      message: "No observatory status data available.",
    });
  });

  it("is ok with an availability message when partial and there are entries", () => {
    const source = buildObsStatusSource(PARTIAL, false, 1);
    expect(source.ok).toBe(true);
    expect(source.message).toContain("only available from");
  });

  it("is noData with the no-data and availability messages when partial but no entries", () => {
    const source = buildObsStatusSource(PARTIAL, false, 0);
    expect(source.ok).toBe(true);
    expect(source.noData).toBe(true);
    expect(source.message).toContain("No observatory status data available.");
    expect(source.message).toContain(
      "Observatory Status data is only available from",
    );
  });

  it("is not ok with noData and an availability message when availability is none", () => {
    const source = buildObsStatusSource(NONE, false, 0);
    expect(source.ok).toBe(false);
    expect(source.noData).toBe(true);
    expect(source.message).toContain("only available from");
  });
});
