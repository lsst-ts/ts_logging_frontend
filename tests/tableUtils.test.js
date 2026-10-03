import { describe, it, expect, vi } from "vitest";

import {
  getColumnUrlMappings,
  matchValueOrInList,
} from "@/components/DataTable/tableUtils";

describe("utils", () => {
  describe("getColumnUrlMappings", () => {
    it("extracts mappings from flat column array", () => {
      const columns = [
        { accessorKey: "science_program", meta: { urlParam: "program" } },
        { accessorKey: "image_type", meta: { urlParam: "type" } },
        { accessorKey: "no_param" },
      ];

      const result = getColumnUrlMappings(columns);

      expect(result.urlParamToColumnId).toEqual({
        program: "science_program",
        type: "image_type",
      });
      expect(result.columnIdToUrlParam).toEqual({
        science_program: "program",
        image_type: "type",
      });
      expect(result.urlParamKeys).toEqual(["program", "type"]);
    });

    it("extracts mappings from nested column groups", () => {
      const columns = [
        {
          header: "Group",
          columns: [
            { accessorKey: "target_name", meta: { urlParam: "target" } },
          ],
        },
      ];

      const result = getColumnUrlMappings(columns);

      expect(result.urlParamToColumnId).toEqual({
        target: "target_name",
      });
      expect(result.columnIdToUrlParam).toEqual({
        target_name: "target",
      });
      expect(result.urlParamKeys).toEqual(["target"]);
    });

    it("handles object of column arrays keyed by telescope", () => {
      const columns = {
        Simonyi: [
          { accessorKey: "science_program", meta: { urlParam: "program" } },
        ],
        AuxTel: [{ accessorKey: "image_type", meta: { urlParam: "type" } }],
      };

      const result = getColumnUrlMappings(columns);

      expect(result.urlParamToColumnId).toEqual({
        program: "science_program",
        type: "image_type",
      });
      expect(result.columnIdToUrlParam).toEqual({
        science_program: "program",
        image_type: "type",
      });
      expect(result.urlParamKeys).toEqual(["program", "type"]);
    });

    it("returns empty mappings if no urlParam metadata present", () => {
      const columns = [{ accessorKey: "science_program" }];

      const result = getColumnUrlMappings(columns);

      expect(result.urlParamToColumnId).toEqual({});
      expect(result.columnIdToUrlParam).toEqual({});
      expect(result.urlParamKeys).toEqual([]);
    });
  });

  describe("matchValueOrInList", () => {
    const mockRow = (value) => ({
      getValue: vi.fn().mockReturnValue(value),
    });

    it("returns true for exact match", () => {
      const row = mockRow("SCIENCE");
      expect(matchValueOrInList(row, "col", "SCIENCE")).toBe(true);
    });

    it("returns false for non-matching single value", () => {
      const row = mockRow("SCIENCE");
      expect(matchValueOrInList(row, "col", "CALIB")).toBe(false);
    });

    it("returns true if value is included in list", () => {
      const row = mockRow("SCIENCE");
      expect(matchValueOrInList(row, "col", ["CALIB", "SCIENCE"])).toBe(true);
    });

    it("returns false if value not included in list", () => {
      const row = mockRow("SCIENCE");
      expect(matchValueOrInList(row, "col", ["CALIB", "BIAS"])).toBe(false);
    });
  });
});
