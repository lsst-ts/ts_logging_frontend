import { useMemo } from "react";

import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

import { PLOT_DEFINITIONS } from "@/components/PLOT_DEFINITIONS";
import { prettyTitleFromKey } from "@/utils/utils";

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
    <div className="flex flex-row justify-between gap-8 text-white">
      <Dialog>
        <DialogTrigger asChild>
          <button
            className="text-sm btn bg-white text-black w-40 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                        flex justify-center items-center py-2 px-4 
                        hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
          >
            Show / Hide Plots
          </button>
        </DialogTrigger>
        <DialogContent className="!max-w-[600px]">
          <div className="flex justify-between mb-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-blue-600 hover:underline"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAll}
              className="text-xs text-red-600 hover:underline mr-5"
            >
              Deselect All
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-[400px] overflow-y-auto pr-5">
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
                  {!fieldStatus[key] && " (null)"}
                </span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlotVisibilityPopover;
