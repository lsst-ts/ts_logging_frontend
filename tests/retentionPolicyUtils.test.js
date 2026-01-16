import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getRetentionPolicy,
  getAvailableDayObsRange,
  isDateInRetentionRange,
} from "../src/utils/retentionPolicyUtils";
import { DateTime } from "luxon";

vi.mock("../src/utils/utils", () => ({
  getSiteConfig: vi.fn(),
}));

import { getSiteConfig } from "../src/utils/utils";
DateTime;
describe("getRetentionPolicy", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    globalThis.window = { location: { hostname: "test.example.com" } };
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.clearAllMocks();
  });

  it("should return valid retention policy when config is valid", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 30,
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "Test Site",
      retentionDays: 30,
    });
  });

  it("should return null retentionDays when hostDisplayName is missing", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "",
      retentionDays: 30,
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "test.example.com",
      retentionDays: null,
    });
  });

  it("should return null retentionDays when retentionDays is null", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: null,
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "Test Site",
      retentionDays: null,
    });
  });

  it("should return null retentionDays when retentionDays is not a number", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: "30",
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "Test Site",
      retentionDays: null,
    });
  });

  it("should return null retentionDays when retentionDays is zero", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 0,
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "Test Site",
      retentionDays: null,
    });
  });

  it("should return null retentionDays when retentionDays is negative", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: -5,
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "Test Site",
      retentionDays: null,
    });
  });

  it("should return null retentionDays when getSiteConfig throws error", () => {
    getSiteConfig.mockImplementation(() => {
      throw new Error("Config not found");
    });

    const result = getRetentionPolicy();

    expect(result).toEqual({
      host: "test.example.com",
      retentionDays: null,
    });
  });
});

describe("getAvailableDayObsRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-16T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return range with min date when retention policy exists", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 30,
    });

    const result = getAvailableDayObsRange();

    expect(result).toEqual({
      min: "20231217",
      max: "20240116",
      retentionDays: 30,
    });
  });

  it("should return null min when no retention policy exists", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: null,
    });

    const result = getAvailableDayObsRange();

    expect(result).toEqual({
      min: null,
      max: "20240116",
      retentionDays: null,
    });
  });
});

describe("isDateInRetentionRange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-16T15:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for dates within retention range", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 30,
    });

    const result = isDateInRetentionRange(20240110);

    expect(result).toBe(true);
  });

  it("should return false for dates before or after retention range", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 30,
    });

    let result = isDateInRetentionRange(20231201);
    expect(result).toBe(false);

    result = isDateInRetentionRange(20240120);
    expect(result).toBe(false);
  });

  it("should return true for date exactly at min or max boundary", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: 30,
    });

    let result = isDateInRetentionRange(20231217);
    expect(result).toBe(true);

    result = isDateInRetentionRange(20240116);
    expect(result).toBe(true);
  });

  it("should return true for any date before max boundary when no retention policy exists", () => {
    getSiteConfig.mockReturnValue({
      hostDisplayName: "Test Site",
      retentionDays: null,
    });

    expect(isDateInRetentionRange(20200101)).toBe(true);
    expect(isDateInRetentionRange(20301231)).toBe(false);
  });
});
