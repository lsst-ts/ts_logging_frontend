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
        <button className="btn bg-white text-black p-2 rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] hover:bg-green-100">
          Show/Hide Columns
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

function DataLogTable({ data, dataLogLoading }) {
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [sorting, setSorting] = useState([]);
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Reset function
  const resetTable = () => {
    setColumnVisibility({});
    setColumnOrder([]);
    setSorting([]);
    setGrouping([]);
  };

  // How many skeleton rows to show when loading
  const skeletonRowCount = 10;

  // Columns for Data Log Table
  const columnHelper = createColumnHelper();
  const columns = [
    // Missing field(s): "dome_temp"
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
    columnHelper.accessor("science program", {
      header: "Science Program",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
    }),
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
      header: "Source Counts",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
    }),
    columnHelper.accessor("air temp", {
      header: "Outside Air Temp",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
    }),
    columnHelper.accessor("img type", {
      header: "Obs Type",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
    }),
    columnHelper.accessor("instrument", {
      header: "Instrument",
      cell: (info) => formatCellValue(info.getValue()),
      size: 110,
    }),
    columnHelper.accessor("exposure_flag", {
      header: "Flags",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
    }),
    columnHelper.accessor("message_text", {
      header: "Comments",
      cell: (info) => formatCellValue(info.getValue()),
      size: 120,
    }),
    columnHelper.accessor("observation reason", {
      header: "Obs Reason",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
    }),
    columnHelper.accessor("target name", {
      header: "Target Name",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
    }),
    columnHelper.accessor("obs start", {
      header: "Obs Start",
      cell: (info) => formatCellValue(info.getValue()),
      size: 240,
    }),
    columnHelper.accessor("day obs", {
      header: "Day Obs",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
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
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    columnResizeMode: "onChange",
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
  });

  return (
    <div>
      {/* Buttons to show/hide columns and reset table */}
      <div className="flex justify-between items-center mb-4">
        <ColumnVisibilityPopover table={table} />
        <button
          onClick={resetTable}
          className="btn bg-white text-black p-2 rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] hover:bg-green-100"
        >
          Reset Table
        </button>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-auto max-h-[70vh] text-white">
        <Table className="text-white table-fixed">
          {/* Headers */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
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
                          className="bg-stone-900 font-bold text-teal-400"
                        >
                          <div
                            className="cursor-pointer"
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
  );
}

export default DataLogTable;
