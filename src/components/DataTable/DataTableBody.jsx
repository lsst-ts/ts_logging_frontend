import { memo, useCallback, useRef } from "react";
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
 * and normal row rendering.
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
        const rowValue = row.getValue(selectedKey);
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

        return (
          <TableRow
            key={row.id}
            ref={isSelected ? setSelectedRowRef : null}
            onClick={handleClick}
            data-selected={isSelected ? "true" : undefined}
            className={
              isSelected
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
 * Row wrapper memoized on the props that actually affect rendered output,
 * so selecting a row doesn't re-render every other row in the table.
 */
// const MemoTableRow = memo(
//   // eslint-disable-next-line no-unused-vars
//   function MemoTableRow({ ref, isSelected, row, table, columns, ...props }) {
//     const isGroupedRow = row.getIsGrouped();
//     return (
//       <TableRow ref={ref} {...props}>
//         {isGroupedRow ? (
//           <GroupedRowCell row={row} table={table} columns={columns} />
//         ) : (
//           <NormalRowCells row={row} />
//         )}
//       </TableRow>
//     );
//   },
//   (prevProps, nextProps) =>
//     prevProps.isSelected === nextProps.isSelected &&
//     prevProps.isConfigExpanded === nextProps.isConfigExpanded &&
//     prevProps.isTracebackExpanded === nextProps.isTracebackExpanded
// );

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
