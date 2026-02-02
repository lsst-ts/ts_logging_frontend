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

/**
 * Filter function that requires explicit selection.
 * Unlike matchValueOrInList, this returns false (hides all rows) when
 * the filter value is empty, rather than showing all rows.
 *
 * Use this for columns where the user must explicitly select what to show.
 *
 * @param {Object} row - TanStack Table row object
 * @param {string} columnId - The column ID to filter
 * @param {string|string[]} filterValue - Single value or array of values to match
 * @returns {boolean} - True if row value matches filter, false if filter is empty
 */
export const matchRequiredSelection = (row, columnId, filterValue) => {
  // If no filter values selected, hide all rows
  if (
    !filterValue ||
    (Array.isArray(filterValue) && filterValue.length === 0)
  ) {
    return false;
  }

  const rowValue = row.getValue(columnId);

  if (Array.isArray(filterValue)) {
    return filterValue.includes(rowValue);
  }

  return rowValue === filterValue;
};
