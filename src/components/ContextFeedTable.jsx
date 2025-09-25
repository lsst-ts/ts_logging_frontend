import { useState } from "react";

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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "./ui/separator";

import ColumnVisibilityPopover from "@/components/column-visibility-popover";
import ToggleExpandCollapseRows from "@/components/toggle-expand-collapse-rows";
import ColumnMultiSelectFilter from "@/components/column-multi-select-filter";
import {
  contextFeedColumns,
  matchValueOrInList,
} from "@/components/ContextFeedColumns";
import { SAL_INDEX_INFO } from "@/components/context-feed-definitions.js";

// How many skeleton rows to show when loading
const SKELETON_ROW_COUNT = 10;

const MIN_DEFAULT_COL_WIDTH = 60;
const MAX_DEFAULT_COL_WIDTH = 500;

const SORTING_ENUM = Object.freeze({
  ASC: false,
  DESC: true,
});

const DEFAULT_COLUMN_VISIBILITY = {
  salIndex: false,
  event_type: true,
  current_task: false,
  time: true,
  name: true,
  description: true,
  config: true,
  script_salIndex: true,
  timestampProcessStart: true,
  finalStatus: true,
  timestampConfigureEnd: true,
  timestampRunStart: true,
  timestampProcessEnd: true,
};

const DEFAULT_COLUMN_ORDER = [
  "salIndex",
  "event_type",
  "current_task",
  "time",
  "name",
  "description",
  "config",
  "script_salIndex",
  "timestampProcessStart",
  "finalStatus",
  "timestampConfigureEnd",
  "timestampRunStart",
  "timestampProcessEnd",
];

function ContextFeedTable({
  data,
  dataLoading,
  columnFilters,
  setColumnFilters,
}) {
  const [columnVisibility, setColumnVisibility] = useState(
    DEFAULT_COLUMN_VISIBILITY,
  );
  const [columnOrder, setColumnOrder] = useState(DEFAULT_COLUMN_ORDER);
  const [sorting, setSorting] = useState([{ id: "time", desc: false }]);
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [expandedRows, setExpandedRows] = useState({});
  const [collapseTracebacks, setCollapseTracebacks] = useState(true);
  const [collapseYaml, setCollapseYaml] = useState(true);

  // Handler for expanding/collapsing individual rows
  const toggleExpandedRows = (rowId, column) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [column]: !prev[rowId]?.[column],
      },
    }));
  };

  // Reset function
  const resetTable = () => {
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setSorting([{ id: "time", desc: false }]);
    setGrouping([]);
    setColumnFilters([
      {
        id: "event_type",
        value: Object.values(SAL_INDEX_INFO).map((info) => info.label),
      },
    ]);
    setCollapseTracebacks(true);
    setCollapseYaml(true);
  };

  const table = useReactTable({
    data,
    columns: contextFeedColumns,
    state: {
      columnVisibility,
      columnOrder,
      sorting,
      grouping,
      expanded,
      columnFilters,
    },
    meta: {
      expandedRows,
      toggleExpandedRows,
      collapseTracebacks,
      collapseYaml,
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

  // Handler for expanding/collapsing all rows
  // Used for rows with tracebacks/yaml.
  const handleGlobalToggle = (columnId, value) => {
    const col = table.getColumn(columnId);
    if (!col) return;

    const newState = { ...expandedRows };

    table.getRowModel().rows.forEach((row) => {
      if (col.columnDef.meta?.isExpandable?.(row.original)) {
        if (!newState[row.id]) newState[row.id] = {};
        // Pass the opposite of value since the checkboxes
        // for tracebacks and yaml are for collapsing rows
        // whereas this is tracking expanded rows.
        newState[row.id][columnId] = !value;
      }
    });

    setExpandedRows(newState);
  };

  return (
    <div className="font-light max-h-full">
      {/* Buttons to show/hide columns and reset table */}
      <div className="flex flex-row justify-between items-end mb-2">
        <div className="flex gap-4">
          {/* Show/Hide Columns button */}
          <ColumnVisibilityPopover table={table} variant="teal" />

          {/* Expand/Collapse All Groups button */}
          <ToggleExpandCollapseRows
            table={table}
            expanded={expanded}
            setExpanded={setExpanded}
            variant="teal"
          />
        </div>

        {/* Checkboxes for Task grouping & collapsing Tracebacks & YAML */}
        <div className="flex flex-row items-left min-h-10 mx-4 px-4 py-1 gap-4 border border-white rounded">
          {/* Group/Ungroup by Task */}
          <div className="flex items-center space-x-2 opacity-100">
            <Checkbox
              checked={grouping.includes("current_task")}
              onCheckedChange={(val) => {
                setGrouping(val ? ["current_task"] : []);
              }}
              style={{ borderColor: "#ffffff" }}
              className="cursor-pointer"
            />
            <span className="text-[12px] text-stone-200">Group by Task</span>
          </div>

          {/* Vertical divider */}
          <div className="flex items-center my-1">
            <Separator orientation="vertical" className="bg-stone-600" />
          </div>

          {/* Collapse/Expand Tracebacks */}
          <div className="flex items-center space-x-2 opacity-100">
            <Checkbox
              checked={collapseTracebacks}
              onCheckedChange={(val) => {
                setCollapseTracebacks(val);
                handleGlobalToggle("description", val);
              }}
              style={{ borderColor: "#ffffff" }}
              className="cursor-pointer"
            />
            <span className="text-[12px] text-stone-200">
              Collapse All Tracebacks
            </span>
          </div>

          {/* Collapse/Expand YAML */}
          <div className="flex items-center space-x-2 opacity-100">
            <Checkbox
              checked={collapseYaml}
              onCheckedChange={(val) => {
                setCollapseYaml(val);
                handleGlobalToggle("config", val);
              }}
              style={{ borderColor: "#ffffff" }}
              className="cursor-pointer"
            />
            <span className="text-[12px] text-stone-200">
              Collapse All YAML
            </span>
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetTable}
          className="btn h-10 w-[100px] bg-teal-800 justify-between
          font-normal text-[12px] text-white
          border-2 border-white rounded-md
          cursor-pointer
          shadow-[4px_4px_4px_0px_#3CAE3F]
          hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700
          transition-all duration-200
          focus-visible:ring-4
          focus-visible:ring-green-500/50"
        >
          Reset Table
        </button>
      </div>

      {/* Table */}
      <div className="rounded-md border text-white max-h-full overflow-auto">
        {/* For sticky header */}
        <div className="[&_[data-slot=table-container]]:!overflow-visible">
          <Table className="text-white table-fixed">
            {/* Headers */}
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="sticky top-0 z-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      rowSpan={header.rowSpan}
                      style={{
                        width: header.getSize(),
                        minWidth:
                          header.column.columnDef.minSize ??
                          MIN_DEFAULT_COL_WIDTH,
                        maxWidth:
                          header.column.columnDef.maxSize ??
                          MAX_DEFAULT_COL_WIDTH,
                      }}
                      className="text-white bg-teal-700 shadow-md"
                    >
                      {header.isPlaceholder ? null : (
                        // Resizable columns
                        <div
                          className={`flex items-center relative group ${
                            header.column.columnDef.meta?.align === "right"
                              ? "justify-end"
                              : "justify-between"
                          }`}
                          style={{
                            width: header.getSize(),
                            minWidth:
                              header.column.columnDef.minSize ??
                              MIN_DEFAULT_COL_WIDTH,
                            maxWidth:
                              header.column.columnDef.maxSize ??
                              MAX_DEFAULT_COL_WIDTH,
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
                                    className="break-words text-center"
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
                                <button className="h-8 ml-2 mr-6 justify-center cursor-pointer">
                                  <span className="text-lg font-bold text-teal-200 hover:text-2xl hover:text-teal-100">
                                    ⋮
                                  </span>
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                {/* Sorting */}
                                <DropdownMenuItem
                                  onClick={() => {
                                    const currentSort =
                                      header.column.getIsSorted();
                                    if (currentSort === false) {
                                      header.column.toggleSorting(
                                        SORTING_ENUM.ASC,
                                      );
                                    } else if (currentSort === "asc") {
                                      header.column.toggleSorting(
                                        SORTING_ENUM.DESC,
                                      );
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
                                    <div
                                      className="whitespace-normal break-words"
                                      onClick={(e) => e.stopPropagation()}
                                    >
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
                              className="absolute right-2 top-0 h-full w-0.5 bg-teal-500 cursor-col-resize select-none"
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
              {dataLoading
                ? Array.from({ length: SKELETON_ROW_COUNT }).map(
                    (_, rowIdx) => (
                      <TableRow key={`skeleton-${rowIdx}`}>
                        {contextFeedColumns.map((_, colIdx) => (
                          <TableCell key={`skeleton-cell-${rowIdx}-${colIdx}`}>
                            <Skeleton className="h-4 w-full bg-teal-700" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ),
                  )
                : table.getRowModel().rows.map((row) => {
                    const isGroupedRow = row.getIsGrouped();

                    return (
                      <TableRow key={row.id}>
                        {isGroupedRow ? (
                          // Display rows grouped by category
                          <TableCell
                            colSpan={contextFeedColumns.length}
                            className="bg-stone-900 font-light text-teal-400"
                          >
                            <div
                              className="cursor-pointer"
                              style={{ paddingLeft: `${row.depth * 1.5}rem` }}
                              onClick={row.getToggleExpandedHandler()}
                            >
                              {row.getIsExpanded() ? "▾" : "▸"}{" "}
                              {
                                table.getColumn(row.groupingColumnId)?.columnDef
                                  .header
                              }
                              : {row.getValue(row.groupingColumnId) ?? "NA"} (
                              {row.subRows?.length})
                            </div>
                          </TableCell>
                        ) : (
                          // Display rows normally (ungrouped)
                          row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              style={{
                                width: cell.column.getSize(),
                                paddingRight: `1rem`,
                              }}
                              className="align-top whitespace-normal break-words"
                              align={cell.column.columnDef.meta?.align}
                            >
                              {cell.column.id === "event_type"
                                ? // Render event type colourful badges
                                  (() => {
                                    const color =
                                      cell.row.original.event_color ||
                                      "#ffffff";

                                    return (
                                      <span
                                        className="px-2 py-1 rounded-md border bg-stone-900 text-xs"
                                        style={{
                                          borderColor: color,
                                          color: color,
                                        }}
                                      >
                                        {flexRender(
                                          cell.column.columnDef.cell,
                                          cell.getContext(),
                                        )}
                                      </span>
                                    );
                                  })()
                                : // Render remaining columns
                                  flexRender(
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

export default ContextFeedTable;
