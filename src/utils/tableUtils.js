/**
 * Shared table utility functions
 */

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
