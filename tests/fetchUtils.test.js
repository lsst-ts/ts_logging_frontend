import { afterEach, describe, expect, it, vi } from "vitest";

const loadBuilder = async (isSND) => {
  vi.resetModules();
  vi.stubEnv("VITE_BACKEND_URL", "https://backend.example/api");
  vi.doMock("@/utils/appConfig", () => ({
    isScientificNightlyDigest: isSND,
  }));
  const { buildBackendURL } = await import("@/utils/fetchUtils");
  return buildBackendURL;
};

afterEach(() => {
  vi.doUnmock("@/utils/appConfig");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("buildBackendURL for internal backend", () => {
  it("builds an API URL with instrument and date range parameters", async () => {
    const buildBackendURL = await loadBuilder(false);

    expect(buildBackendURL("exposures", "20250101", "20250102", "LATISS")).toBe(
      "https://backend.example/api/exposures?instrument=LATISS&dayObsStart=20250101&dayObsEnd=20250102",
    );
  });

  it("omits optional API parameters when they are not provided", async () => {
    const buildBackendURL = await loadBuilder(false);

    expect(buildBackendURL("version")).toBe(
      "https://backend.example/api/version",
    );
    expect(buildBackendURL("almanac", "20250101")).toBe(
      "https://backend.example/api/almanac?dayObsStart=20250101",
    );
  });

  it("adds extra query parameters when provided", async () => {
    const buildBackendURL = await loadBuilder(false);

    const extraParams = new URLSearchParams({
      extraParam: "value",
      anotherParam: "anotherValue",
    });
    expect(
      buildBackendURL(
        "exposures",
        "20250101",
        "20250102",
        "LATISS",
        extraParams,
      ),
    ).toBe(
      "https://backend.example/api/exposures?instrument=LATISS&dayObsStart=20250101&dayObsEnd=20250102&extraParam=value&anotherParam=anotherValue",
    );
  });
});

describe("buildBackendURL for SND backend", () => {
  it("builds a static JSON path with instrument and complete date range", async () => {
    const buildBackendURL = await loadBuilder(true);

    expect(buildBackendURL("exposures", "20250101", "20250102", "LATISS")).toBe(
      "https://backend.example/api/exposures/LATISS/20250101_20250102.json",
    );
  });

  it("omits instrument and incomplete date ranges from static JSON paths", async () => {
    const buildBackendURL = await loadBuilder(true);

    expect(buildBackendURL("version")).toBe(
      "https://backend.example/api/version.json",
    );
    expect(buildBackendURL("almanac", "20250101")).toBe(
      "https://backend.example/api/almanac.json",
    );
  });

  it("omits extra query parameters for SND backend", async () => {
    const buildBackendURL = await loadBuilder(true);

    const extraParams = new URLSearchParams({
      extraParam: "value",
      anotherParam: "anotherValue",
    });
    expect(
      buildBackendURL(
        "exposures",
        "20250101",
        "20250102",
        "LATISS",
        extraParams,
      ),
    ).toBe(
      "https://backend.example/api/exposures/LATISS/20250101_20250102.json",
    );
  });
});
