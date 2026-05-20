import { useEffect, useRef } from "react";
import { flexRender } from "@tanstack/react-table";

import { TableBody, TableRow, TableCell } from "@/components/ui/table";

import { Skeleton } from "@/components/ui/skeleton";

import { SKELETON_ROW_COUNT } from "./constants";

/**
 * DataTable body component with skeleton loading, grouped rows,
 * and normal row rendering.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 * @param {Array} props.columns - Column definitions (for skeleton column count)
 * @param {boolean} props.isLoading - Whether data is loading
 * @param {string|null} props.highlighted - The highlight key value to match (or null for none)
 * @param {Function} props.onHighlightChange - Callback when a row is clicked to highlight
 * @param {string} props.highlightKey - The column accessor key used for highlighting
 */
function DataTableBody({
  table,
  columns,
  isLoading,
  highlighted = null,
  onHighlightChange,
  highlightKey,
}) {
  const highlightedRowRef = useRef(null);
  const hasScrolled = useRef(false);

  useEffect(() => {
    if (
      hasScrolled.current ||
      isLoading ||
      highlighted === null ||
      !highlightedRowRef.current
    )
      return;
    hasScrolled.current = true;
    highlightedRowRef.current.scrollIntoView({
      behavior: "smooth",
      block: "center",
      container: "nearest",
    });
  }, [isLoading, highlighted]);

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

        // Check if this row matches the highlighted value
        // Use loose equality (==) to handle number/string comparisons
        const rowValue = row.getValue(highlightKey);
        const isHighlighted =
          !isGroupedRow &&
          highlighted != null &&
          highlightKey &&
          rowValue == highlighted;

        const handleClick = (e) => {
          e.stopPropagation();
          if (onHighlightChange && !isGroupedRow && highlightKey) {
            onHighlightChange(
              isHighlighted ? null : row.getValue(highlightKey),
            );
          }
        };

        return (
          <TableRow
            key={row.id}
            ref={isHighlighted ? highlightedRowRef : null}
            onClick={handleClick}
            data-selected={isHighlighted ? "true" : undefined}
            className={
              isHighlighted
                ? "bg-black/40 shadow-[inset_4px_0_0_0_white] border-t-2 border-b-2 border-white"
                : ""
            }
          >
            {isGroupedRow ? (
              <GroupedRowCell row={row} table={table} columns={columns} />
            ) : (
              <NormalRowCells row={row} />
            )}
          </TableRow>
        );
      })}
    </TableBody>
  );
}

/**
 * Renders a grouped row with expand/collapse toggle
 */
function GroupedRowCell({ row, table, columns }) {
  const groupingColumnId = row.groupingColumnId;
  const groupingColumn = table.getColumn(groupingColumnId);
  const headerLabel = groupingColumn?.columnDef.header ?? groupingColumnId;

  return (
    <TableCell
      colSpan={columns.length}
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
        paddingRight: "1rem",
      }}
      className="align-top whitespace-normal break-words"
      align={cell.column.columnDef.meta?.align}
    >
      {flexRender(cell.column.columnDef.cell, cell.getContext())}
    </TableCell>
  ));
}

export default DataTableBody;
