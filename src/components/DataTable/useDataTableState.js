import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for managing DataTable state.
 * Handles column visibility, order, sorting, grouping, expanded rows,
 * and expandable cell state.
 *
 * Note: Column filters are NOT managed here - they must be passed as props
 * to DataTable (either from useUrlSync or parent component state).
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.defaultColumnVisibility - Initial column visibility state
 * @param {string[]} options.defaultColumnOrder - Initial column order
 * @param {Array} options.defaultSorting - Initial sorting state
 * @returns {Object} State values and setters
 */
export function useDataTableState({
  defaultColumnVisibility = {},
  defaultColumnOrder = [],
  defaultSorting = [],
}) {
  // Core table state
  const [columnVisibility, setColumnVisibility] = useState(
    defaultColumnVisibility,
  );
  const [columnOrder, setColumnOrder] = useState(defaultColumnOrder);
  const [sorting, setSorting] = useState(defaultSorting);
  const [grouping, setGrouping] = useState([]);
  const [expanded, setExpanded] = useState({});

  // Expandable cells state (for tracebacks, YAML, etc.)
  const [expandedRows, setExpandedRows] = useState({});

  // Track previous defaults to detect changes (for telescope switching)
  const prevDefaultsRef = useRef({
    visibility: defaultColumnVisibility,
    order: defaultColumnOrder,
  });

  // Reset visibility/order when defaults change (e.g., telescope switch)
  useEffect(() => {
    const prevDefaults = prevDefaultsRef.current;

    // Check if visibility defaults changed
    if (
      JSON.stringify(prevDefaults.visibility) !==
      JSON.stringify(defaultColumnVisibility)
    ) {
      setColumnVisibility(defaultColumnVisibility);
    }

    // Check if order defaults changed
    if (
      JSON.stringify(prevDefaults.order) !== JSON.stringify(defaultColumnOrder)
    ) {
      setColumnOrder(defaultColumnOrder);
    }

    // Update ref for next comparison
    prevDefaultsRef.current = {
      visibility: defaultColumnVisibility,
      order: defaultColumnOrder,
    };
  }, [defaultColumnVisibility, defaultColumnOrder]);

  // Toggle expansion for a specific row/column
  const toggleExpandedRows = useCallback((rowId, columnId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [columnId]: !prev[rowId]?.[columnId],
      },
    }));
  }, []);

  // Collapse or expand all rows for a specific column
  const setCollapseAll = useCallback((columnId, collapsed, table) => {
    if (!table) return;

    const col = table.getColumn(columnId);
    if (!col) return;

    const isExpandable = col.columnDef.meta?.isExpandable;
    if (typeof isExpandable !== "function") return;

    const newState = {};
    table.getRowModel().rows.forEach((row) => {
      if (isExpandable(row.original)) {
        if (!newState[row.id]) newState[row.id] = {};
        // collapsed=true means rows should NOT be expanded
        newState[row.id][columnId] = !collapsed;
      }
    });

    setExpandedRows((prev) => {
      const merged = { ...prev };
      for (const rowId in newState) {
        merged[rowId] = {
          ...merged[rowId],
          ...newState[rowId],
        };
      }
      return merged;
    });
  }, []);

  // Reset all state to defaults
  const resetState = useCallback(() => {
    setColumnVisibility(defaultColumnVisibility);
    setColumnOrder(defaultColumnOrder);
    setSorting(defaultSorting);
    setGrouping([]);
    setExpanded({});
    setExpandedRows({});
  }, [defaultColumnVisibility, defaultColumnOrder, defaultSorting]);

  return {
    // Core table state
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

    // Expandable cells
    expandedRows,
    setExpandedRows,
    toggleExpandedRows,
    setCollapseAll,

    // Reset
    resetState,
  };
}
