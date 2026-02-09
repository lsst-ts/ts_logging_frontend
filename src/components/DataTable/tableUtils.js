/**
 * Shared table utility functions
 */

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
