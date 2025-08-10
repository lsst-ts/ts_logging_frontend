import { useMemo } from "react";

import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

import { PLOT_DEFINITIONS } from "@/components/PLOT_DEFINITIONS";

function prettyTitleFromKey(key) {
  return key
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function PlotVisibilityPopover({
  dataLogEntries,
  activePlots,
  setActivePlots,
}) {
  // Detect which numeric fields have all-null data
  // so their checkboxes can be disabled.
  const fieldStatus = useMemo(() => {
    if (!dataLogEntries || dataLogEntries.length === 0) return {};
    return Object.fromEntries(
      PLOT_DEFINITIONS.map(({ key }) => {
        const hasValue = dataLogEntries.some(
          (row) => row[key] !== null && row[key] !== undefined,
        );
        return [key, hasValue];
      }),
    );
  }, [dataLogEntries]);

  // Handlers for popover actions
  const handleSelectAll = () => {
    setActivePlots(
      PLOT_DEFINITIONS.map((p) => p.key).filter((key) => fieldStatus[key]),
    );
  };
  const handleDeselectAll = () => {
    setActivePlots([]);
  };
  const togglePlot = (key, checked) => {
    setActivePlots((prev) =>
      checked ? [...prev, key] : prev.filter((k) => k !== key),
    );
  };

  return (
    <div className="flex flex-row justify-between mt-4 gap-8 text-white">
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="text-sm btn bg-white text-black w-40 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                        flex justify-center items-center py-2 px-4 
                        hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
          >
            Show / Hide Plots
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="flex justify-between mb-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-red-600 hover:underline"
            >
              Deselect All
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {PLOT_DEFINITIONS.map(({ key, title }) => (
              <div
                key={key}
                className="flex items-center space-x-2 opacity-100"
              >
                <Checkbox
                  checked={activePlots.includes(key)}
                  onCheckedChange={(checked) => togglePlot(key, !!checked)}
                  disabled={!fieldStatus[key]} // disable if all-null
                />
                <span
                  className={`text-sm ${
                    !fieldStatus[key] ? "text-gray-400 italic" : ""
                  }`}
                >
                  {title || prettyTitleFromKey(key)}
                </span>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default PlotVisibilityPopover;
