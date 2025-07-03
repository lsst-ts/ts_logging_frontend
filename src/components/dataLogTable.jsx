"use client";

import { useState } from "react";

import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  flexRender,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
} from "@tanstack/react-table";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { formatCellValue } from "@/utils/utils";

// Popover component for column hiding
// Should move to own file and use ShadCN's component
function ColumnVisibilityPopover({ table }) {
  const allColumns = table.getAllLeafColumns(); // Only leaf columns, no groups

  const handleSelectAll = () => {
    allColumns.forEach((column) => {
      if (!column.getIsVisible()) column.toggleVisibility(true);
    });
  };

  const handleDeselectAll = () => {
    allColumns.forEach((column) => {
      if (column.getIsVisible()) column.toggleVisibility(false);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="btn bg-white font-light text-black p-2 rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] hover:bg-green-100">
          Show / Hide Columns
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="flex justify-between mb-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-xs text-red-600 hover:underline"
          >
            Deselect All
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allColumns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                checked={column.getIsVisible()}
                onCheckedChange={(checked) =>
                  column.toggleVisibility(!!checked)
                }
              />
              <span className="text-sm">{column.columnDef.header}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ColumnMultiSelectFilter({ column, closeDropdown }) {
  const columnFilterValue = column.getFilterValue() ?? [];

  const sortedUniqueValues = Array.from(
    column.getFacetedUniqueValues()?.keys() ?? [],
  ).sort();

  // Local checkbox state
  const [selected, setSelected] = useState(() => new Set(columnFilterValue));

  const toggleValue = (val) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };

  // Buttons
  const apply = () => {
    column.setFilterValue(selected.size > 0 ? Array.from(selected) : undefined);
    closeDropdown();
  };

  const clear = () => {
    setSelected(new Set());
    column.setFilterValue(undefined);
    closeDropdown();
  };

  return (
    <div
      // Don't close dropdown on click
      onClick={(e) => e.stopPropagation()}
      className="p-2 mt-2 space-y-2 text-black"
    >
      {/* <div className="p-2 border-t border-teal-700"> */}
      <Separator className="mb-4 bg-stone-300" />
      {/* Filter label */}
      <p className="text-sm">Filter:</p>

      {/* Scrollable Multi-select checkboxes */}
      <div className="max-h-40 overflow-y-auto pr-6 space-y-1">
        {sortedUniqueValues.map((value) => (
          <label
            key={value}
            className="flex items-center space-x-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.has(value)}
              onCheckedChange={() => toggleValue(value)}
            />
            <span>{String(value)}</span>
          </label>
        ))}
      </div>

      {/* TODO: Only show once data has loaded? */}
      {/* Clear and Apply buttons */}
      <div className="flex justify-between items-center pt-2 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            clear();
          }}
          className="text-red-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            apply();
          }}
          className="text-blue-600 hover:underline"
        >
          Apply
        </button>
      </div>
      {/* </div> */}
    </div>
  );
}

function DataLogTable({ data, dataLogLoading }) {
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);

  // Reset function
  const resetTable = () => {
    setColumnVisibility({});
    setColumnOrder([]);
    setSorting([]);
    setGrouping([]);
    setColumnFilters([]);
  };

  // Exact match filter function
  const equalsFilterFn = (row, columnId, filterValue) => {
    return row.getValue(columnId) === filterValue;
  };

  // Exact (multple) match(es) filter function
  const matchValueOrInList = (row, columnId, filterValue) => {
    const rowValue = row.getValue(columnId);

    if (Array.isArray(filterValue)) {
      return filterValue.includes(rowValue);
    }

    return rowValue === filterValue;
  };

  // How many skeleton rows to show when loading
  const skeletonRowCount = 10;

  // Columns for Data Log Table
  const columnHelper = createColumnHelper();
  const columns = [
    // Missing field(s): "dome_temp"

    // Identifying data
    columnHelper.accessor("exposure id", {
      header: "Exposure Id",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
    }),
    columnHelper.accessor("exposure name", {
      header: "Exposure Name",
      cell: (info) => formatCellValue(info.getValue()),
      size: 200,
    }),

    // Dayobs and timestamp
    columnHelper.accessor("day obs", {
      header: "Day Obs",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
    }),
    columnHelper.accessor("obs start", {
      header: "Obs Start",
      cell: (info) => formatCellValue(info.getValue()),
      size: 240,
    }),

    // Observation Categories
    // columnHelper.accessor("instrument", {
    //   header: "Instrument",
    //   cell: (info) => formatCellValue(info.getValue()),
    //   size: 110,
    // }),
    columnHelper.accessor("science program", {
      header: "Science Program",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
      filterFn: matchValueOrInList,
    }),
    columnHelper.accessor("img type", {
      header: "Obs Type",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
    }),
    columnHelper.accessor("observation reason", {
      header: "Obs Reason",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
      filterFn: matchValueOrInList,
    }),
    columnHelper.accessor("target name", {
      header: "Target Name",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
      filterFn: matchValueOrInList,
    }),

    // Flag Info
    columnHelper.accessor("exposure_flag", {
      header: "Flags",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
    }),
    columnHelper.accessor("message_text", {
      header: "Comments",
      cell: (info) => formatCellValue(info.getValue()),
      size: 120,
    }),

    // Instrument config and environment
    columnHelper.accessor("s ra", {
      header: "RA",
      cell: (info) => formatCellValue(info.getValue()),
      size: 60,
    }),
    columnHelper.accessor("s dec", {
      header: "Dec",
      cell: (info) => formatCellValue(info.getValue()),
      size: 70,
    }),
    columnHelper.accessor("altitude", {
      header: "Alt",
      cell: (info) => formatCellValue(info.getValue()),
      size: 70,
    }),
    columnHelper.accessor("azimuth", {
      header: "Az",
      cell: (info) => formatCellValue(info.getValue()),
      size: 60,
    }),
    columnHelper.accessor("sky rotation", {
      header: "Sky Rotation",
      cell: (info) => formatCellValue(info.getValue()),
      size: 120,
    }),
    columnHelper.accessor("airmass", {
      header: "Airmass",
      cell: (info) => formatCellValue(info.getValue()),
      size: 90,
    }),
    columnHelper.accessor("psf trace radius delta median", {
      header: "PSF/Seeing",
      cell: (info) => formatCellValue(info.getValue()),
      size: 115,
    }),
    columnHelper.accessor("sky bg median", {
      header: "Sky Brightness",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
    }),
    columnHelper.accessor("zero point median", {
      header: "Photometric ZP",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
    }),
    columnHelper.accessor("high snr source count median", {
      header: "High Source Counts",
      cell: (info) => formatCellValue(info.getValue()),
      size: 170,
    }),
    columnHelper.accessor("air temp", {
      header: "Outside Air Temp",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      columnVisibility,
      columnOrder,
      sorting,
      grouping,
      expanded,
      columnFilters,
    },
    filterFns: {
      equals: equalsFilterFn,
      multiEquals: matchValueOrInList,
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    columnResizeMode: "onChange",
    // debugTable: true,
    // debugHeaders: true,
    // debugColumns: true,
  });

  // Walk grouped row model recursively to collect
  // expandable group row ids
  function getAllGroupRowIds(rows) {
    const ids = [];
    for (const row of rows) {
      if (row.getIsGrouped()) {
        ids.push(row.id);
        if (row.subRows?.length) {
          ids.push(...getAllGroupRowIds(row.subRows));
        }
      }
    }
    return ids;
  }

  // Expand / Collapse helpers
  const allGroupRowIds = getAllGroupRowIds(table.getRowModel().rows);
  const allExpanded = allGroupRowIds.every((id) => expanded[id]);

  return (
    <div className="font-light">
      {/* Buttons to show/hide columns and reset table */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <ColumnVisibilityPopover table={table} />
          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => {
              if (grouping.length === 0) return;
              if (allExpanded) {
                setExpanded({});
              } else {
                const newExpanded = {};
                allGroupRowIds.forEach((id) => {
                  newExpanded[id] = true;
                });
                setExpanded(newExpanded);
              }
            }}
            disabled={grouping.length === 0}
            className={`btn p-2 w-40 font-light justify-center rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] ${
              grouping.length === 0
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-black hover:bg-green-100"
            }`}
          >
            {allExpanded ? "Collapse All Groups" : "Expand All Groups"}
          </button>
        </div>
        <button
          onClick={resetTable}
          className="btn bg-white font-light text-black p-2 rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] hover:bg-green-100"
        >
          Reset Table
        </button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[70vh] text-white">
        {/* For sticky header */}
        <div className="[&_[data-slot=table-container]]:!overflow-visible">
          <Table className="text-white table-fixed">
            {/* Headers */}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="sticky top-0">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      rowSpan={header.rowSpan}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize ?? 60,
                        maxWidth: header.column.columnDef.maxSize ?? 500,
                      }}
                      className="text-white bg-teal-700 sticky left-0 shadow-md"
                    >
                      {header.isPlaceholder ? null : (
                        // Resizable columns
                        <div
                          className="flex items-center justify-between relative group"
                          style={{
                            width: header.getSize(),
                            minWidth: header.column.columnDef.minSize ?? 60,
                            maxWidth: header.column.columnDef.maxSize ?? 500,
                          }}
                        >
                          {/* Header content */}
                          <span>
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                            {/* Active sorting icon */}
                            {header.column.getIsSorted() === "asc" && " 🔼"}
                            {header.column.getIsSorted() === "desc" && " 🔽"}
                          </span>

                          {/* Dropdown menus against each header for sorting/grouping */}
                          {!header.column.columnDef.columns && ( // Only show dropdown on leaf columns
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="mx-4 text-s text-teal-400 hover:underline">
                                  ⋮
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {/* Sorting */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    const currentSort =
                                      header.column.getIsSorted();
                                    if (currentSort === false) {
                                      header.column.toggleSorting(false); // set to asc
                                    } else if (currentSort === "asc") {
                                      header.column.toggleSorting(true); // set to desc
                                    } else {
                                      header.column.clearSorting(); // unsort
                                    }
                                  }}
                                >
                                  {(() => {
                                    const currentSort =
                                      header.column.getIsSorted();
                                    if (currentSort === false)
                                      return "Sort by asc.";
                                    if (currentSort === "asc")
                                      return "Sort by desc.";
                                    if (currentSort === "desc") return "Unsort";
                                    return "Sort"; // fallback, shouldn't happen
                                  })()}
                                </DropdownMenuItem>

                                {/* Row Grouping */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    header.column.toggleGrouping();
                                  }}
                                >
                                  {header.column.getIsGrouped()
                                    ? "Ungroup"
                                    : "Group by"}
                                </DropdownMenuItem>

                                {/* Column Visibility */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    header.column.toggleVisibility();
                                  }}
                                >
                                  Hide Column
                                </DropdownMenuItem>

                                {/* Column Filtering */}
                                {header.column.id === "science program" && (
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <ColumnMultiSelectFilter
                                      column={header.column}
                                      closeDropdown={() =>
                                        document.activeElement?.blur()
                                      }
                                    />
                                  </div>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {/* Resize handle */}
                          {header.column.getCanResize() && (
                            <div
                              // onDoubleClick={header.column.resetSize()} // causes infinite loop
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
                              className="absolute right-2 top-0 h-full w-1 bg-teal-400 cursor-col-resize select-none"
                              style={{
                                transform: header.column.getIsResizing()
                                  ? "scaleX(2)"
                                  : "",
                              }}
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            {/* Rows */}
            <TableBody>
              {dataLogLoading
                ? Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                    <TableRow key={`skeleton-${rowIdx}`}>
                      {columns.map((_, colIdx) => (
                        <TableCell key={`skeleton-cell-${rowIdx}-${colIdx}`}>
                          <Skeleton className="h-4 w-full bg-teal-700" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : table.getRowModel().rows.map((row) => {
                    const isGroupedRow = row.getIsGrouped();

                    return (
                      <TableRow key={row.id}>
                        {isGroupedRow ? (
                          // Display rows grouped by category
                          <TableCell
                            colSpan={columns.length}
                            className="bg-stone-900 font-light text-teal-400"
                          >
                            <div
                              className="cursor-pointer"
                              style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                              onClick={row.getToggleExpandedHandler()}
                            >
                              {row.getIsExpanded() ? "▾" : "▸"}{" "}
                              {row.groupingColumnId}:{" "}
                              {row.getValue(row.groupingColumnId)} (
                              {row.subRows?.length})
                            </div>
                          </TableCell>
                        ) : (
                          // Display rows normally (ungrouped)
                          row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{ width: cell.column.getSize() }}
                              className="truncate"
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))
                        )}
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default DataLogTable;
