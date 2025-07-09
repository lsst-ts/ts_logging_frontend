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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

import ColumnVisibilityPopover from "@/components/column-visibility-popover";
import ToggleExpandCollapseRows from "@/components/toggle-expand-collapse-rows";
import ColumnMultiSelectFilter from "@/components/column-multi-select-filter";
import { formatCellValue, getRubinTVUrl } from "@/utils/utils";

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

  const RubinTVLink = ({ dayObs, seqNum }) => {
    const url = getRubinTVUrl(dayObs, seqNum);
    if (!url) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sky-400 underline hover:text-sky-700"
      >
        calexp
      </a>
    );
  };

  // How many skeleton rows to show when loading
  const skeletonRowCount = 10;

  // Columns for Data Log Table
  const columnHelper = createColumnHelper();
  const columns = [
    // Missing field: "dome_temp"

    // Link to RubinTV
    columnHelper.display({
      header: "RubinTV",
      id: "externalLink",
      cell: ({ row }) => (
        <RubinTVLink
          dayObs={row.original["day obs"]}
          seqNum={row.original["seq num"]}
        />
      ),
      size: 100,
      filterType: null,
    }),

    // Identifying data
    columnHelper.accessor("exposure id", {
      header: "Exposure Id",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
      filterType: null,
    }),
    columnHelper.accessor("exposure name", {
      header: "Exposure Name",
      cell: (info) => formatCellValue(info.getValue()),
      size: 200,
      filterType: null,
    }),

    // Dayobs and timestamp
    columnHelper.accessor("day obs", {
      header: "Day Obs",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),
    columnHelper.accessor("obs start", {
      header: "Obs Start",
      cell: (info) => formatCellValue(info.getValue()),
      size: 240,
      filterType: "number-range",
    }),

    // Observation Categories
    columnHelper.accessor("science program", {
      header: "Science Program",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),
    columnHelper.accessor("img type", {
      header: "Obs Type",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),
    columnHelper.accessor("observation reason", {
      header: "Obs Reason",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),
    columnHelper.accessor("target name", {
      header: "Target Name",
      cell: (info) => formatCellValue(info.getValue()),
      size: 160,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),

    // Flag Info
    columnHelper.accessor("exposure_flag", {
      header: "Flags",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
      filterType: "string",
    }),
    columnHelper.accessor("message_text", {
      header: "Comments",
      cell: (info) => formatCellValue(info.getValue()),
      size: 120,
      filterType: null,
    }),

    // Instrument config and environment
    columnHelper.accessor("s ra", {
      header: "RA",
      cell: (info) => formatCellValue(info.getValue()),
      size: 60,
      filterType: "number-range",
    }),
    columnHelper.accessor("s dec", {
      header: "Dec",
      cell: (info) => formatCellValue(info.getValue()),
      size: 70,
      filterType: "number-range",
    }),
    columnHelper.accessor("altitude", {
      header: "Alt",
      cell: (info) => formatCellValue(info.getValue()),
      size: 70,
      filterType: "number-range",
    }),
    columnHelper.accessor("azimuth", {
      header: "Az",
      cell: (info) => formatCellValue(info.getValue()),
      size: 60,
      filterType: "number-range",
    }),
    columnHelper.accessor("sky rotation", {
      header: "Sky Rotation",
      cell: (info) => formatCellValue(info.getValue()),
      size: 120,
      filterType: "number-range",
    }),
    columnHelper.accessor("airmass", {
      header: "Airmass",
      cell: (info) => formatCellValue(info.getValue()),
      size: 90,
      filterType: "number-range",
    }),
    columnHelper.accessor("dimm seeing", {
      header: "DIMM seeing",
      cell: (info) => formatCellValue(info.getValue()),
      size: 130,
      filterType: "number-range",
    }),
    columnHelper.accessor("psf_sigma_median", {
      header: "Median PSF",
      cell: (info) => formatCellValue(info.getValue()),
      size: 115,
      filterType: "number-range",
      meta: {
        tooltip: "psf_sigma_median",
        // tooltip: "Median PSF (FWHM) = psf_sigma_median * 2.355"
      },
    }),
    columnHelper.accessor("sky bg median", {
      header: "Sky Brightness",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
      filterType: "number-range",
      meta: {
        tooltip: "sky bg median",
      },
    }),
    columnHelper.accessor("zero point median", {
      header: "Photometric ZP",
      cell: (info) => formatCellValue(info.getValue()),
      size: 140,
      filterType: "number-range",
      meta: {
        tooltip: "zero point median",
      },
    }),
    columnHelper.accessor("high snr source count median", {
      header: "High SNR Source Counts",
      cell: (info) => formatCellValue(info.getValue()),
      size: 200,
      filterType: "number-range",
      meta: {
        tooltip: "high snr source count median",
      },
    }),
    columnHelper.accessor("air temp", {
      header: "Outside Air Temp",
      cell: (info) => formatCellValue(info.getValue()),
      size: 150,
      filterType: "number-range",
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
  // TODO: Do I need this since can also define in component?
  const allGroupRowIds = getAllGroupRowIds(table.getRowModel().rows);

  return (
    <div className="font-light">
      {/* Buttons to show/hide columns and reset table */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <ColumnVisibilityPopover table={table} />
          <ToggleExpandCollapseRows
            table={table}
            allGroupRowIds={allGroupRowIds}
            expanded={expanded}
            setExpanded={setExpanded}
          />
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
                          {(() => {
                            const tooltipText =
                              header.column.columnDef.meta?.tooltip;
                            const headerContent = (
                              <>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                                {/* Active sorting icons */}
                                {header.column.getIsSorted() === "asc" && " 🔼"}
                                {header.column.getIsSorted() === "desc" &&
                                  " 🔽"}
                              </>
                            );

                            return tooltipText ? (
                              <div className="relative">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      {headerContent}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    align="center"
                                    className="max-w-xs break-words text-sm text-white bg-black p-2 rounded-md shadow-md z-50"
                                  >
                                    {tooltipText}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              headerContent
                            );
                          })()}

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
                                {header.column.columnDef.filterType ===
                                  "string" &&
                                  header.column.getFacetedUniqueValues().size >
                                    1 && (
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
