import { useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Hook for syncing a single selected value with URL parameters.
 * Reads the selected_* param from URL and writes changes back.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.routePath - TanStack Router route path (e.g., "/data-log")
 * @param {string} options.selectedKey - The column accessor key used for selection
 * @returns {Object} { selectedValue, setSelectedValue, clearSelection }
 */
export function useSelectionSync({ routePath, selectedKey }) {
  const navigate = useNavigate({ from: routePath });
  const searchParams = useSearch({ from: routePath });

  // Build the URL param name from the selected key
  const selectedParam = `selected_${selectedKey}`;

  // Get the current selected value from URL (single value, not array)
  const selectedValue = useMemo(() => {
    const paramValue = searchParams[selectedParam];
    if (Array.isArray(paramValue)) {
      // Take first value if array (single-select mode)
      return paramValue[0] || null;
    }
    return paramValue || null;
  }, [searchParams, selectedParam]);

  // Set the selected value (updates URL)
  const setSelectedValue = (value) => {
    const newParams = { ...searchParams };

    if (value) {
      // Set as single-element array for consistency with router parsing
      newParams[selectedParam] = [value];
    } else {
      // Remove the param if value is null/empty
      delete newParams[selectedParam];
    }

    navigate({ to: routePath, search: newParams, replace: true });
  };

  // Clear the selection (removes URL param)
  const clearSelection = () => {
    const newParams = { ...searchParams };
    delete newParams[selectedParam];
    navigate({ to: routePath, search: newParams, replace: true });
  };

  return {
    selectedValue,
    setSelectedValue,
    clearSelection,
  };
}
