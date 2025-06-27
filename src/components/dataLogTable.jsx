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

// import { useVirtual } from '@tanstack/react-virtual';

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
          Toggle Columns
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
    }),
    columnHelper.accessor("exposure name", {
      header: "Exposure Name",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("science program", {
      header: "Science Program",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("s ra", {
      header: "RA",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("s dec", {
      header: "Dec",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("altitude", {
      header: "Alt",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("azimuth", {
      header: "Az",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("sky rotation", {
      header: "Sky Rotation",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("airmass", {
      header: "Airmass",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("psf trace radius delta median", {
      header: "PSF/Seeing",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("sky bg median", {
      header: "Sky Brightness",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("zero point median", {
      header: "Photometric ZP",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("high snr source count median", {
      header: "Source Counts",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("air temp", {
      header: "Outside Air Temp",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("img type", {
      header: "Obs Type",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("instrument", {
      header: "Instrument",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("exposure_flag", {
      header: "Flags",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("message_text", {
      header: "Comments",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("observation reason", {
      header: "Obs Reason",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("target name", {
      header: "Target Name",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("obs start", {
      header: "Obs Start",
      cell: (info) => formatCellValue(info.getValue()),
    }),
    columnHelper.accessor("day obs", {
      header: "Day Obs",
      cell: (info) => formatCellValue(info.getValue()),
    }),
  ];

  //   const { rows } = useVirtual({
  //     parentRef,
  //     size: dataLogEntries.length,
  //     overscan: 10,
  //   });

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
  });

  return (
    <div>
      {/* Show/hide columns */}
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
        <Table className="text-white">
          {/* Headers */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="relative text-white">
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center justify-between">
                        <span>
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>

                        {/* Dropdown Menu for Sorting/Grouping */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="ml-2 text-xs text-teal-400 hover:underline">
                              ⋮
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                const isAsc =
                                  header.column.getIsSorted() === "asc";
                                header.column.toggleSorting(isAsc); // toggle between asc and desc
                              }}
                            >
                              {header.column.getIsSorted() ? "Unsort" : "Sort"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                header.column.toggleGrouping();
                              }}
                            >
                              {header.column.getIsGrouped()
                                ? "Ungroup"
                                : "Group by"}
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                header.column.toggleVisibility();
                              }}
                            >
                              Hide Column
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
                        // Only one cell for grouped row
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
                        // Normal row cells
                        row
                          .getVisibleCells()
                          .map((cell) => (
                            <TableCell key={cell.id}>
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
