import { describe, it, expect, vi } from "vitest";

import {
  getColumnUrlMappings,
  getTableDownloadData,
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

  describe("getTableDownloadData", () => {
    const mockColumn = (id, { header = id, accessorFn, meta } = {}) => ({
      id,
      accessorFn: accessorFn ?? ((row) => row[id]),
      columnDef: { header, meta },
    });
    const mockTable = (columns) => ({
      getVisibleLeafColumns: () => columns,
    });

    it("uses the visible columns, in order, with their headers", () => {
      const table = mockTable([
        mockColumn("b", { header: "B" }),
        mockColumn("a", { header: "A" }),
      ]);

      const { columns } = getTableDownloadData(table, []);

      expect(columns).toEqual([
        { key: "b", header: "B" },
        { key: "a", header: "A" },
      ]);
    });

    it("falls back to the column id for non-string headers", () => {
      const table = mockTable([mockColumn("a", { header: () => "A" })]);

      expect(getTableDownloadData(table, []).columns).toEqual([
        { key: "a", header: "a" },
      ]);
    });

    it("includes every record, in order, formatted with formatCellValue", () => {
      const table = mockTable([mockColumn("name"), mockColumn("value")]);
      const data = [
        { name: "first", value: 1.23456 },
        { name: "second", value: null },
      ];

      expect(getTableDownloadData(table, data).rows).toEqual([
        { name: "first", value: "1.23" },
        { name: "second", value: "na" },
      ]);
    });

    it("uses downloadValue with the accessor value and the record", () => {
      const downloadValue = vi.fn((value, row) => `${value}-${row.id}`);
      const table = mockTable([
        mockColumn("doubled", {
          accessorFn: (row) => row.x * 2,
          meta: { downloadValue },
        }),
      ]);

      const { rows } = getTableDownloadData(table, [{ id: "r1", x: 2 }]);

      expect(downloadValue).toHaveBeenCalledWith(4, { id: "r1", x: 2 });
      expect(rows).toEqual([{ doubled: "4-r1" }]);
    });

    it("skips display-only columns unless they provide downloadValue", () => {
      const displayColumn = (id, meta) => ({
        id,
        accessorFn: undefined,
        columnDef: { header: id, meta },
      });
      const table = mockTable([
        displayColumn("icon"),
        displayColumn("link", { downloadValue: (_value, row) => row.url }),
      ]);

      const { rows, columns } = getTableDownloadData(table, [
        { url: "https://example.com" },
      ]);

      expect(columns).toEqual([{ key: "link", header: "link" }]);
      expect(rows).toEqual([{ link: "https://example.com" }]);
    });
  });
});
