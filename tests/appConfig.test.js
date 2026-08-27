import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * The flag is resolved when the module first loads, so each case stubs the env
 * var and re-imports with a fresh module registry.
 */
const loadFlag = async (value) => {
  vi.resetModules();
  if (value === undefined) {
    vi.stubEnv("VITE_SCIENTIFIC_NIGHTLY_DIGEST", undefined);
  } else {
    vi.stubEnv("VITE_SCIENTIFIC_NIGHTLY_DIGEST", value);
  }
  const { isScientificNightlyDigest } = await import("../src/utils/appConfig");
  return isScientificNightlyDigest;
};

describe("isScientificNightlyDigest", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["true", "1", "yes", "on", "TRUE", " True "])(
    "is true when the env var is %o",
    async (value) => {
      expect(await loadFlag(value)).toBe(true);
    },
  );

  it.each([undefined, "", "false", "0", "no", "off", "maybe"])(
    "is false when the env var is %o",
    async (value) => {
      expect(await loadFlag(value)).toBe(false);
    },
  );
});
