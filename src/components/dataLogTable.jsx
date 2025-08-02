import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
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
import {
  dataLogColumns,
  matchValueOrInList,
} from "@/components/dataLogColumns";

const DEFAULT_COLUMN_VISIBILITY = {
  RubinTVLink: true,
  exposure_id: true,
  exposure_name: false,
  seq_num: false,
  day_obs: false,
  science_program: true,
  observation_reason: true,
  img_type: true,
  target_name: true,
  obs_start: true,
  exp_time: true,
  exposure_flag: true,
  message_text: true,
  s_ra: true,
  s_dec: true,
  altitude: true,
  azimuth: true,
  sky_rotation: true,
  airmass: true,
  dimm_seeing: true,
  psf_median: true,
  sky_bg_median: true,
  zero_point_median: true,
  high_snr_source_count_median: true,
  air_temp: true,
};

const DEFAULT_COLUMN_ORDER = [
  "RubinTVLink",
  "exposure_id",
  "exposure_name",
  "day_obs",
  "seq_num",
  "science_program",
  "observation_reason",
  "img_type",
  "target_name",
  "obs_start",
  "exp_time",
  "exposure_flag",
  "message_text",
  "s_ra",
  "s_dec",
  "altitude",
  "azimuth",
  "sky_rotation",
  "airmass",
  "dimm_seeing",
  "psf_median",
  "sky_bg_median",
  "zero_point_median",
  "high_snr_source_count_median",
  "air_temp",
];

function DataLogTable({ data, dataLogLoading, tableFilters }) {
  const [columnVisibility, setColumnVisibility] = useState(
    DEFAULT_COLUMN_VISIBILITY,
  );
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [sorting, setSorting] = useState([]);
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [columnFilters, setColumnFilters] = useState([]);

  // Check if url filter params have been applied
  const hasAppliedTableFilters = useRef(false);

  // Apply url filters on first render
  // Must be separate from general url-filter sync to avoid infinite renders.
  useEffect(() => {
    if (!hasAppliedTableFilters.current && tableFilters?.length) {
      setColumnFilters((prev) => {
        const existingIds = new Set(tableFilters.map((f) => f.id));
        const remaining = prev.filter((f) => !existingIds.has(f.id));
        return [...remaining, ...tableFilters];
      });
      hasAppliedTableFilters.current = true;
      console.log("Applied filters from URL:", tableFilters);
    }
  }, [tableFilters]);

  // Reset function
  const resetTable = () => {
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setSorting([]);
    setGrouping([]);
    setColumnFilters([]);
  };

  // How many skeleton rows to show when loading
  const skeletonRowCount = 10;

  const table = useReactTable({
    data,
    columns: dataLogColumns,
    state: {
      columnVisibility,
      columnOrder,
      sorting,
      grouping,
      expanded,
      columnFilters,
    },
    filterFns: {
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
  });

  // Nav & search param hooks
  const navigate = useNavigate({ from: "/data-log" });
  const searchParams = useSearch({ from: "/data-log" });

  // Sync url with filters
  useEffect(() => {
    const newParams = { ...searchParams };

    // Remove old filter params
    for (const column of table.getAllColumns()) {
      const urlParam = column.columnDef.meta?.urlParam;
      if (urlParam && Object.hasOwn(newParams, urlParam)) {
        delete newParams[urlParam];
      }
    }

    // Add current filters
    for (const filter of columnFilters) {
      const column = table.getColumn(filter.id);
      const urlParam = column?.columnDef.meta?.urlParam;
      if (urlParam) {
        newParams[urlParam] = filter.value;
      }
    }

    navigate({ to: "/data-log", search: newParams, replace: true });
  }, [searchParams, table, columnFilters, navigate]);

  return (
    <div className="font-light">
      {/* Buttons to show/hide columns and reset table */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <ColumnVisibilityPopover table={table} />
          <ToggleExpandCollapseRows
            table={table}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        </div>
        <button
          onClick={resetTable}
          className="btn bg-white text-black mt-4 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                      flex justify-center items-center py-2 px-4 
                      hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
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
                      {dataLogColumns.map((_, colIdx) => (
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
                            colSpan={dataLogColumns.length}
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
