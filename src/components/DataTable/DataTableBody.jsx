import { Fragment, useCallback, useRef } from "react";
import { flexRender } from "@tanstack/react-table";

import { TableBody, TableRow, TableCell } from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";

import { SKELETON_ROW_COUNT } from "./constants";

// Finds the column accessor key marked as the selection key in its meta
function findSelectedKey(columns) {
  for (const col of columns) {
    if (col.columns) {
      // Handle column groups
      const found = findSelectedKey(col.columns);
      if (found) return found;
    } else if (col.meta?.selectedKey) {
      return col.accessorKey || col.id;
    }
  }
  return null;
}

/**
 * DataTable body component with skeleton loading, grouped rows,
 * normal row rendering, and optional expandable sub-component rows.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 * @param {Array} props.columns - Column definitions (for skeleton column count and selection key lookup)
 * @param {boolean} props.isLoading - Whether data is loading
 * @param {string|null} props.selected - The selected key value to match (or null for none)
 * @param {Function} props.onSelectionChange - Callback when a row is clicked to select
 */
function DataTableBody({
  table,
  columns,
  isLoading,
  selected = null,
  onSelectionChange,
}) {
  const selectedKey = findSelectedKey(columns);

  const subComponent = table.options.meta?.subComponent;

  // No initial selection means nothing to scroll to, so skip future scrolls too.
  const hasScrolled = useRef(selected === null);

  // Scroll to the selected row when it appears in the DOM
  const setSelectedRowRef = useCallback((node) => {
    if (node && !hasScrolled.current) {
      node.scrollIntoView({
        behavior: "smooth",
        block: "center",
        container: "nearest",
      });
      hasScrolled.current = true;
    }
  }, []);

  if (isLoading) {
    return (
      <TableBody>
        {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIdx) => (
          <TableRow key={`skeleton-${rowIdx}`}>
            {columns.map((_, colIdx) => (
              <TableCell key={`skeleton-cell-${rowIdx}-${colIdx}`}>
                <Skeleton className="h-4 w-full bg-teal-700" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    );
  }

  return (
    <TableBody>
      {table.getRowModel().rows.map((row) => {
        const isGroupedRow = row.getIsGrouped();

        // Check if this row matches the selected value
        // Use loose equality (==) to handle number/string comparisons
        const rowValue = selectedKey ? row.getValue(selectedKey) : undefined;
        const isSelected =
          !isGroupedRow &&
          selected != null &&
          selectedKey &&
          rowValue == selected;

        const handleClick = (e) => {
          e.stopPropagation();
          // Ignore clicks from portaled elements (e.g., modals/dialogs)
          if (!e.currentTarget.contains(e.target)) {
            return;
          }
          // Don't select/deselect row if user is dragging to select text
          if (window.getSelection()?.toString().length > 0) {
            return;
          }
          if (onSelectionChange && !isGroupedRow && selectedKey) {
            onSelectionChange(isSelected ? null : row.getValue(selectedKey));
          }
        };

        const customRowClassName =
          table.options.meta?.getRowClassName?.(row) ?? "";

        const rowClassName = [
          onSelectionChange ? "cursor-pointer" : "",
          isSelected
            ? "bg-black/40 shadow-[inset_4px_0_0_0_white] border-t-2 border-b-2 border-white"
            : "",
          customRowClassName,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Fragment key={row.id}>
            <TableRow
              ref={isSelected ? setSelectedRowRef : null}
              onClick={handleClick}
              data-selected={isSelected ? "true" : undefined}
              className={rowClassName}
            >
              {isGroupedRow ? (
                <GroupedRowCell row={row} table={table} />
              ) : (
                <NormalRowCells row={row} />
              )}
            </TableRow>

            {/* Expandable sub-component (e.g. a full-width message row)
                attached beneath its parent leaf row. Always rendered for
                rows that provide one. */}
            {!isGroupedRow && subComponent && row.getCanExpand() && (
              <TableRow key={`${row.id}__sub`} className="sub-row">
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="p-0"
                >
                  {subComponent({ row })}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        );
      })}
    </TableBody>
  );
}

/**
 * Renders a grouped row with expand/collapse toggle
 */
function GroupedRowCell({ row, table }) {
  const groupingColumnId = row.groupingColumnId;
  const groupingColumn = table.getColumn(groupingColumnId);
  const headerLabel = groupingColumn?.columnDef.header ?? groupingColumnId;

  return (
    <TableCell
      colSpan={table.getVisibleLeafColumns().length}
      className="bg-stone-900 font-light text-teal-400"
    >
      <div
        className="cursor-pointer"
        style={{ paddingLeft: `${row.depth * 1.5}rem` }}
        onClick={row.getToggleExpandedHandler()}
      >
        {row.getIsExpanded() ? "▾" : "▸"} {headerLabel}:{" "}
        {row.getValue(groupingColumnId) ?? "NA"} ({row.subRows?.length})
      </div>
    </TableCell>
  );
}

/**
 * Renders normal (non-grouped) row cells
 */
function NormalRowCells({ row }) {
  return row.getVisibleCells().map((cell) => (
    <TableCell
      key={cell.id}
      style={{
        width: cell.column.getSize(),
        paddingRight: "2rem",
      }}
      className={
        "align-top whitespace-normal break-words" +
        (cell.column.columnDef.meta?.cellClassName
          ? ` ${cell.column.columnDef.meta.cellClassName}`
          : "")
      }
      align={cell.column.columnDef.meta?.align}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  ));
}
export default DataTableBody;
