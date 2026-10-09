import { describe, it, expect } from "vitest";

import {
  resolveAppletStatus,
  buildObsStatusSource,
} from "../src/utils/appletStatus";

describe("resolveAppletStatus", () => {
  it("returns loading while loading", () => {
    const status = resolveAppletStatus({ loading: true, sources: {} });
    expect(status.status).toBe("loading");
    expect(status.message).toBe("");
  });

  it("is ready with no message when all sources are ok", () => {
    const status = resolveAppletStatus({
      sources: { exposures: { ok: true }, almanac: { ok: true } },
      required: ["exposures"],
    });
    expect(status.status).toBe("ready");
    expect(status.message).toBe("");
  });

  it("errors when a required source is missing", () => {
    const status = resolveAppletStatus({
      sources: {
        exposures: { ok: false },
        "time-accounting": { ok: true },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("error");
    expect(status.message).toBe("Exposure data could not be fetched.");
  });

  it("lists every missing source, even non-required ones", () => {
    const status = resolveAppletStatus({
      sources: {
        exposures: { ok: false },
        almanac: { ok: false },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("error");
    expect(status.message).toBe(
      "Exposure and Almanac data could not be fetched.",
    );
  });

  it("uses an Oxford comma only for three or more sources", () => {
    const status = resolveAppletStatus({
      sources: {
        exposures: { ok: false },
        almanac: { ok: false },
        "obs-status": { ok: false },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("error");
    expect(status.message).toBe(
      "Exposure, Almanac, and Observatory Status data could not be fetched.",
    );
  });

  it("stays ready with a warning when only a non-required source is missing", () => {
    const status = resolveAppletStatus({
      sources: {
        exposures: { ok: true },
        "time-accounting": { ok: false },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("ready");
    expect(status.message).toBe(
      "Exposure time accounting data could not be fetched.",
    );
  });

  it("appends non-fetch notes as a separate sentence", () => {
    const status = resolveAppletStatus({
      sources: {
        exposures: { ok: false },
        "obs-status": {
          ok: true,
          message: "Observatory Status data is only available from 2026-01-02.",
        },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("error");
    expect(status.message).toBe(
      "Exposure data could not be fetched. Observatory Status data is only available from 2026-01-02.",
    );
  });

  it("treats dome as a fetch failure like other sources", () => {
    const status = resolveAppletStatus({
      sources: {
        "dome-times": { ok: false },
        exposures: { ok: false },
      },
      required: ["exposures"],
    });
    expect(status.status).toBe("error");
    expect(status.message).toBe("Dome and Exposure data could not be fetched.");
  });
});

describe("buildObsStatusSource", () => {
  it("carries a fetch-error message on fetch error", () => {
    const source = buildObsStatusSource(undefined, true);
    expect(source).toEqual({
      ok: false,
      message: "Observatory Status data could not be fetched.",
    });
  });

  it("is ok when full availability", () => {
    const source = buildObsStatusSource({ status: "full" }, false);
    expect(source).toEqual({ ok: true });
  });

  it("is not ok with a message when none", () => {
    const source = buildObsStatusSource(
      { status: "none", available_from: "2026-01-02" },
      false,
    );
    expect(source.ok).toBe(false);
    expect(source.message).toContain("only available from");
  });

  it("is ok with a message when partial", () => {
    const source = buildObsStatusSource(
      { status: "partial", available_from: "2026-01-02" },
      false,
    );
    expect(source.ok).toBe(true);
    expect(source.message).toContain("only available from");
  });
});
