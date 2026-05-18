import { forwardRef, useImperativeHandle } from "react";

// Helper to find the column with highlightKey metadata
function findHighlightKey(columns) {
  for (const col of columns) {
    if (col.columns) {
      // Handle column groups
      const found = findHighlightKey(col.columns);
      if (found) return found;
    } else if (col.meta?.highlightKey) {
      return col.accessorKey;
    }
  }
  return null;
}
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
} from "@tanstack/react-table";

import { Table } from "@/components/ui/table";
import { matchValueOrInList } from "./tableUtils";

import { useDataTableState } from "./useDataTableState";
import DataTableHeader from "./DataTableHeader";
import DataTableBody from "./DataTableBody";
import DataTableToolbar from "./DataTableToolbar";

/**
 * Reusable DataTable component built on TanStack Table.
 *
 * @param {Object} props
 * @param {Array} props.data - Row data
 * @param {Array} props.columns - TanStack column definitions
 * @param {boolean} props.isLoading - Whether data is loading
 * @param {Object} props.defaultColumnVisibility - Initial column visibility
 * @param {string[]} props.defaultColumnOrder - Initial column order
 * @param {Array} props.defaultSorting - Initial sorting state
 * @param {Array} props.columnFilters - Column filters (required)
 * @param {Function} props.setColumnFilters - Filter setter (required)
 * @param {Object} props.toolbar - Toolbar configuration
 * @param {Function} props.onReset - Custom reset handler
 * @param {Object} props.filterFns - Custom filter functions
 * @param {React.Ref} ref - Ref for imperative methods (setCollapseAll, setGrouping)
 * @param {string|null} props.highlighted - The highlight key value (or null for none)
 * @param {Function} props.onHighlightChange - Callback when a row is clicked to highlight
 */
const DataTable = forwardRef(function DataTable(
  {
    data,
    columns,
    isLoading = false,
    defaultColumnVisibility = {},
    defaultColumnOrder = [],
    defaultSorting = [],
    columnFilters,
    setColumnFilters,
    toolbar = {},
    onReset,
    filterFns = {},
    tableMeta = {},
    highlighted = null,
    onHighlightChange,
  },
  ref,
) {
  // Internal state management
  const {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    expanded,
    setExpanded,
    expandedRows,
    toggleExpandedRows,
    setCollapseAll,
    resetState,
  } = useDataTableState({
    defaultColumnVisibility,
    defaultColumnOrder,
    defaultSorting,
  });

  // Create table instance
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
    meta: {
      expandedRows,
      toggleExpandedRows,
      ...tableMeta,
    },
    filterFns: {
      multiEquals: matchValueOrInList,
      ...filterFns,
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

  // Expose imperative methods via ref
  useImperativeHandle(
    ref,
    () => ({
      setCollapseAll: (columnId, collapsed) =>
        setCollapseAll(columnId, collapsed, table),
      setGrouping,
      getTable: () => table,
    }),
    [setCollapseAll, setGrouping, table],
  );

  // Reset handler
  const handleReset = () => {
    resetState();
    onReset?.();
  };

  return (
    <div className="font-light max-h-full">
      {/* Toolbar */}
      <DataTableToolbar
        table={table}
        expanded={expanded}
        setExpanded={setExpanded}
        onReset={handleReset}
        config={toolbar}
      />

      {/* Table */}
      <div className="rounded-md border text-white max-h-full overflow-auto">
        <div className="[&_[data-slot=table-container]]:!overflow-visible">
          <Table className="text-white table-fixed">
            <DataTableHeader table={table} />
            <DataTableBody
              table={table}
              columns={columns}
              isLoading={isLoading}
              highlighted={highlighted}
              onHighlightChange={onHighlightChange}
              highlightKey={findHighlightKey(columns)}
            />
          </Table>
        </div>
      </div>
    </div>
  );
});

export default DataTable;
