import { useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

/**
 * Hook for syncing a single highlight value with URL parameters.
 * Reads the highlighted_* param from URL and writes changes back.
 *
 * @param {Object} options - Configuration options
 * @param {string} options.routePath - TanStack Router route path (e.g., "/data-log")
 * @param {string} options.highlightKey - The column accessor key used for highlighting
 * @returns {Object} { highlightedValue, setHighlightedValue, clearHighlight }
 */
export function useHighlightSync({ routePath, highlightKey }) {
  const navigate = useNavigate({ from: routePath });
  const searchParams = useSearch({ from: routePath });

  // Build the URL param name from the highlight key
  const highlightParam = `highlighted_${highlightKey}`;

  // Get the current highlighted value from URL (single value, not array)
  const highlightedValue = useMemo(() => {
    const paramValue = searchParams[highlightParam];
    if (Array.isArray(paramValue)) {
      // Take first value if array (single-select mode)
      return paramValue[0] || null;
    }
    return paramValue || null;
  }, [searchParams, highlightParam]);

  // Set the highlighted value (updates URL)
  const setHighlightedValue = (value) => {
    const newParams = { ...searchParams };

    if (value) {
      // Set as single-element array for consistency with router parsing
      newParams[highlightParam] = [value];
    } else {
      // Remove the param if value is null/empty
      delete newParams[highlightParam];
    }

    navigate({ to: routePath, search: newParams, replace: true });
  };

  // Clear the highlight (removes URL param)
  const clearHighlight = () => {
    const newParams = { ...searchParams };
    delete newParams[highlightParam];
    navigate({ to: routePath, search: newParams, replace: true });
  };

  return {
    highlightedValue,
    setHighlightedValue,
    clearHighlight,
  };
}
