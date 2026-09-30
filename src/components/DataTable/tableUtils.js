/**
 * Shared table utility functions
 */

import { formatCellValue } from "@/utils/utils";

/**
 * Extracts URL parameter mappings from column definitions.
 * Handles both a single column array or an object keyed by telescope.
 *
 * @param {Array|Object} columns - Column definitions array or object keyed by telescope
 * @returns {Object} { urlParamToColumnId, columnIdToUrlParam, urlParamKeys }
 */
export function getColumnUrlMappings(columns) {
  const urlParamToColumnId = {};
  const columnIdToUrlParam = {};

  const processColumns = (cols) => {
    for (const col of cols) {
      if (col.columns) {
        processColumns(col.columns);
      } else {
        const urlParam = col.meta?.urlParam;
        const columnId = col.accessorKey || col.id;
        if (urlParam && columnId) {
          urlParamToColumnId[urlParam] = columnId;
          columnIdToUrlParam[columnId] = urlParam;
        }
      }
    }
  };

  if (Array.isArray(columns)) {
    processColumns(columns);
  } else {
    // Handle object of column arrays (like dataLogColumns keyed by telescope)
    for (const cols of Object.values(columns)) {
      if (Array.isArray(cols)) processColumns(cols);
    }
  }

  return {
    urlParamToColumnId,
    columnIdToUrlParam,
    urlParamKeys: Object.keys(urlParamToColumnId),
  };
}

/**
 * Filter function for exact match or inclusion in a list.
 * Used for multi-select column filters.
 *
 * @param {Object} row - TanStack Table row object
 * @param {string} columnId - The column ID to filter
 * @param {string|string[]} filterValue - Single value or array of values to match
 * @returns {boolean} - True if row value matches filter
 */
export const matchValueOrInList = (row, columnId, filterValue) => {
  const rowValue = row.getValue(columnId);

  if (Array.isArray(filterValue)) {
    return filterValue.includes(rowValue);
  }

  return rowValue === filterValue;
};

/**
 * Build CSV rows and columns from a table's visible columns.
 *
 * Every record in `data` is included, in the given order, regardless of the
 * table's filtering, grouping or sorting.
 *
 * Each value is `meta.downloadValue(value, original)` when the column
 * provides one, and `formatCellValue(value)` otherwise, where `value` is the
 * column's accessor value. Display-only columns (those without an accessor)
 * are skipped unless they provide `meta.downloadValue`.
 *
 * @param {Object} table - TanStack Table instance
 * @param {Array<Object>} data - Records to export
 * @returns {{
 *   rows: Array<Object>,
 *   columns: Array<{key: string, header: string}>
 * }} Input for `toCsv`
 */
export function getTableDownloadData(table, data) {
  const exportColumns = table
    .getVisibleLeafColumns()
    .filter(
      (column) => column.accessorFn || column.columnDef.meta?.downloadValue,
    );

  const columns = exportColumns.map((column) => ({
    key: column.id,
    header:
      typeof column.columnDef.header === "string"
        ? column.columnDef.header
        : column.id,
  }));

  const rows = data.map((original, index) =>
    Object.fromEntries(
      exportColumns.map((column) => {
        const value = column.accessorFn?.(original, index);
        const downloadValue = column.columnDef.meta?.downloadValue;
        return [
          column.id,
          downloadValue
            ? downloadValue(value, original)
            : formatCellValue(value),
        ];
      }),
    ),
  );

  return { rows, columns };
}
