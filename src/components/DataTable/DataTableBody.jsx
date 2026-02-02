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
 */
function DataTableBody({ table, columns, isLoading }) {
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

        return (
          <TableRow key={row.id}>
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
