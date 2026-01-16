import { ISO_DATETIME_FORMAT } from "@/utils/timeUtils";
import { DateTime } from "luxon";

/**
 * Custom tooltip formatter for timeseries plots.
 * Displays the data value along with exposure metadata.
 *
 * @param {string} title - The plot title to display in the tooltip
 * @returns {Function} Formatter function for ChartTooltipContent
 */
export const plotTooltipFormatter =
  (title) => (value, name, item, index, payload) => {
    const dayObs = payload.day_obs;
    const seqNum = payload.seq_num;
    const obsStart = DateTime.fromMillis(payload.obs_start_millis).toFormat(
      ISO_DATETIME_FORMAT,
    );
    const physicalFilter = payload.physical_filter;
    const scienceProgram = payload.science_program;
    const obsReason = payload.observation_reason;

    const formattedValue =
      typeof value === "number" && !Number.isInteger(value)
        ? value.toFixed(4)
        : value;

    return (
      <div className="flex flex-col gap-1 select-none">
        <div>
          <span className="text-muted-foreground">{title}:</span>{" "}
          <span className="font-mono">{formattedValue}</span>
        </div>
        <hr className="m-1 text-cyan-700/50" />
        <div>
          <span className="text-muted-foreground">Day Obs.:</span>{" "}
          <span className="font-mono">{dayObs}</span>{" "}
          <span className="text-muted-foreground ml-4">Sequence: </span>
          <span className="font-mono">{seqNum}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Obs. Start:</span>{" "}
          <span className="font-mono">{obsStart}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Science Program:</span>{" "}
          <span className="font-mono">{scienceProgram}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Obs. Reason:</span>{" "}
          <span className="font-mono">{obsReason}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Filter:</span>{" "}
          <span className="font-mono">{physicalFilter}</span>
        </div>
      </div>
    );
  };
