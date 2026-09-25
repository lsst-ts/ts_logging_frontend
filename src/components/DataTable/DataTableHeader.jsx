import { flexRender } from "@tanstack/react-table";

import { TableHeader, TableRow, TableHead } from "@/components/ui/table";
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

import ColumnMultiSelectFilter from "@/components/column-multi-select-filter";
import {
  MIN_DEFAULT_COL_WIDTH,
  MAX_DEFAULT_COL_WIDTH,
  SORTING_ENUM,
} from "./constants";

/**
 * Get the label for the sort menu item based on current sort state
 */
function getSortLabel(currentSort) {
  if (currentSort === false) return "Sort by asc.";
  if (currentSort === "asc") return "Sort by desc.";
  if (currentSort === "desc") return "Unsort";
  return "Sort";
}

/**
 * DataTable header component with sorting, grouping, filtering,
 * column visibility, resize handles, and tooltips.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 */
function DataTableHeader({ table }) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow
          key={headerGroup.id}
          className="sticky top-0 z-50 bg-teal-700"
        >
          {headerGroup.headers.map((header) => (
            <TableHead
              key={header.id}
              colSpan={header.colSpan}
              rowSpan={header.rowSpan}
              style={{
                width: header.getSize(),
                minWidth:
                  header.column.columnDef.minSize ?? MIN_DEFAULT_COL_WIDTH,
                maxWidth:
                  header.column.columnDef.maxSize ?? MAX_DEFAULT_COL_WIDTH,
              }}
              className="text-white bg-teal-700 shadow-md"
            >
              {header.isPlaceholder ? null : (
                <div
                  className={`flex items-center relative group ${
                    header.column.columnDef.meta?.align === "right"
                      ? "justify-end"
                      : "justify-between"
                  }`}
                  style={{ width: "100%" }}
                >
                  {/* Header content with optional tooltip */}
                  <HeaderContent header={header} />

                  {/* Dropdown menu for sorting/grouping/filtering */}
                  {!header.column.columnDef.columns && (
                    <HeaderDropdownMenu header={header} />
                  )}

                  {/* Resize handle */}
                  {header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={`absolute right-0 top-0 h-full w-3 cursor-col-resize select-none
                        flex items-center justify-center
                        hover:bg-teal-400/30 transition-colors
                        ${
                          header.column.getIsResizing() ? "bg-teal-400/30" : ""
                        }`}
                    >
                      <div
                        className={`h-full w-0.5 ${
                          header.column.getIsResizing()
                            ? "bg-teal-300 w-1"
                            : "bg-teal-500"
                        }`}
                      />
                    </div>
                  )}
                </div>
              )}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}

/**
 * Header content with optional tooltip and sorting indicators
 */
function HeaderContent({ header }) {
  const tooltipText = header.column.columnDef.meta?.tooltip;
  const headerContent = (
    <>
      {flexRender(header.column.columnDef.header, header.getContext())}
      {header.column.getIsSorted() === "asc" && " 🔼"}
      {header.column.getIsSorted() === "desc" && " 🔽"}
    </>
  );

  if (tooltipText) {
    return (
      <div className="relative">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help">{headerContent}</span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="break-words text-center"
          >
            <TooltipText text={tooltipText} />
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return headerContent;
}

/**
 * Renders tooltip text, highlighting backtick-wrapped segments as inline code
 * (e.g. `` `Parent: {Child}` ``).
 */
function TooltipText({ text }) {
  if (typeof text !== "string") return text;

  return text.split("`").map((part, index) =>
    index % 2 === 1 ? (
      <code
        key={index}
        className="font-mono text-teal-300 bg-black/40 px-1 rounded text-[0.9em]"
      >
        {part}
      </code>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

/**
 * Dropdown menu for column actions (sort, group, hide, filter)
 */
function HeaderDropdownMenu({ header }) {
  const currentSort = header.column.getIsSorted();

  const handleSort = () => {
    if (currentSort === false) {
      header.column.toggleSorting(SORTING_ENUM.ASC);
    } else if (currentSort === "asc") {
      header.column.toggleSorting(SORTING_ENUM.DESC);
    } else {
      header.column.clearSorting();
    }
  };

  const showFilter =
    header.column.columnDef.filterType === "string" &&
    header.column.getFacetedUniqueValues().size > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-8 w-8 ml-1 mr-4 flex items-center justify-center cursor-pointer rounded hover:bg-teal-600/50 transition-colors">
          <span className="text-xl font-bold text-teal-200 hover:text-teal-100">
            ⋮
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* Sorting */}
        <DropdownMenuItem onClick={handleSort}>
          {getSortLabel(currentSort)}
        </DropdownMenuItem>

        {/* Row Grouping */}
        <DropdownMenuItem onClick={() => header.column.toggleGrouping()}>
          {header.column.getIsGrouped() ? "Ungroup" : "Group by"}
        </DropdownMenuItem>

        {/* Column Visibility */}
        <DropdownMenuItem onClick={() => header.column.toggleVisibility()}>
          Hide Column
        </DropdownMenuItem>

        {/* Column Filtering */}
        {showFilter && (
          <div
            className="whitespace-normal break-words"
            onClick={(e) => e.stopPropagation()}
          >
            <ColumnMultiSelectFilter
              column={header.column}
              closeDropdown={() => document.activeElement?.blur()}
            />
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DataTableHeader;
