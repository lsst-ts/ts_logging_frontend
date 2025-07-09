import { useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

function ColumnMultiSelectFilter({ column, closeDropdown }) {
  const columnFilterValue = column.getFilterValue() ?? [];

  const sortedUniqueValues = Array.from(
    column.getFacetedUniqueValues()?.keys() ?? [],
  ).sort();

  // Local checkbox state
  const [selected, setSelected] = useState(() => new Set(columnFilterValue));

  // Handle check selections
  const toggleValue = (val) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  };

  // Buttons
  const apply = () => {
    column.setFilterValue(selected.size > 0 ? Array.from(selected) : undefined);
    closeDropdown();
  };

  const clear = () => {
    setSelected(new Set());
    column.setFilterValue(undefined);
    closeDropdown();
  };

  return (
    <div
      // Don't close dropdown on click
      onClick={(e) => e.stopPropagation()}
      className="p-2 mt-2 space-y-2 text-black"
    >
      <Separator className="mb-4 bg-stone-300" />
      <p className="text-sm">Filter:</p>

      {/* Scrollable multi-select checkboxes */}
      <div className="max-h-40 overflow-y-auto pr-6 space-y-1">
        {sortedUniqueValues.map((value) => (
          <label
            key={value}
            className="flex items-center space-x-2 text-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.has(value)}
              onCheckedChange={() => toggleValue(value)}
            />
            <span>{String(value)}</span>
          </label>
        ))}
      </div>

      {/* TODO: Only show once data has loaded? */}
      {/* Clear and Apply buttons */}
      <div className="flex justify-between items-center pt-2 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            clear();
          }}
          className="text-red-600 hover:underline"
        >
          Clear
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            apply();
          }}
          className="text-blue-600 hover:underline"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default ColumnMultiSelectFilter;
