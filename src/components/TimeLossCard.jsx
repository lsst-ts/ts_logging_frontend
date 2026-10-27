import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import WarningTooltip from "@/components/WarningTooltip";

import { NO_DATA_DISPLAY } from "@/constants/DATA_SOURCES";

import InfoIcon from "../assets/InfoIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";

/**
 * Displays the observing time lost to fault, weather, and downtime according
 * to Observatory Status records.
 *
 * The resolved display state drives the values: on `error` (a fetch failure,
 * or Observatory Status data unavailable) the three values show a no-data
 * placeholder and a warning icon beside header; on `ready` (full or partial data)
 * the values render, with a warning when partial. The card is clickable only
 * when `onClick` is provided and data is not still loading.
 *
 * @param {Object} props
 * @param {number} [props.obsStatusFaultLoss] Fault loss in hours.
 * @param {number} [props.obsStatusWeatherLoss] Weather loss in hours.
 * @param {number} [props.obsStatusDowntime] Downtime in hours.
 * @param {string} [props.state="ready"] The resolved display state.
 * @param {string} [props.message=""] The resolved display message (for warnings).
 * @param {boolean} [props.obsStatusLoading=false] Whether Observatory Status data is still loading.
 * @param {Function|boolean} [props.onClick=false] Click handler for the card, or `false` to disable.
 */
export default function TimeLossCard({
  obsStatusFaultLoss,
  obsStatusWeatherLoss,
  obsStatusDowntime,
  state = "ready",
  message = "",
  obsStatusLoading = false,
  onClick = false,
}) {
  const loading = obsStatusLoading;
  const isClickable = onClick && !loading;
  const showValues = state !== "error";

  const heading = "Time Loss";

  const formatHours = (value) =>
    showValues && typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(2)
      : NO_DATA_DISPLAY;

  const showWarning =
    !loading && (state === "error" || state === "ready") && message;

  return (
    // Card
    <div
      data-slot="time-loss-card"
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      {/* Heading & Icon */}
      <div className="flex flex-row justify-between h-12">
        <div className="flex gap-2 h-8 place-items-center-safe">
          <div className="text-2xl">{heading}</div>
          {showWarning && (
            <WarningTooltip ariaLabel="Time Loss data availability warning">
              {message}
            </WarningTooltip>
          )}
        </div>
        <img src={TimeLossIcon} alt={heading} />
      </div>
      {/* Data & Info Icon */}
      <div className="flex flex-row justify-between">
        {/* Data */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 text-md">
          <div>Fault:</div>
          {obsStatusLoading ? (
            <Skeleton
              data-slot="time-loss-fault-loading"
              className="h-3 w-10 bg-teal-700"
            />
          ) : (
            <div data-slot="time-loss-fault">
              {formatHours(obsStatusFaultLoss)}
            </div>
          )}
          <div>Weather:</div>
          {obsStatusLoading ? (
            <Skeleton
              data-slot="time-loss-weather-loading"
              className="h-3 w-10 bg-teal-700"
            />
          ) : (
            <div data-slot="time-loss-weather">
              {formatHours(obsStatusWeatherLoss)}
            </div>
          )}
          <div>Downtime:</div>
          {obsStatusLoading ? (
            <Skeleton
              data-slot="time-loss-downtime-loading"
              className="h-3 w-10 bg-teal-700"
            />
          ) : (
            <div data-slot="time-loss-downtime">
              {formatHours(obsStatusDowntime)}
            </div>
          )}
        </div>

        {/* Info Icon */}
        <Popover>
          <PopoverTrigger
            className="self-end min-w-4"
            /* Prevents click from propagating to the card 
            to show the tooltip rather than open the dialog*/
            onClick={(e) => e.stopPropagation()}
          >
            <img src={InfoIcon} />
          </PopoverTrigger>
          <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-100">
            <p>
              Observing time (<code>-12°</code>) per Observatory Status records.
              <br />
              <br />
              <strong>Fault Loss</strong>
              <br />
              Sum of all observing time with an active <strong>
                FAULT
              </strong>{" "}
              status, except during <strong>DOWNTIME</strong>.
              <br />
              <br />
              <strong>Weather</strong>
              <br />
              Sum of all observing time with an active <strong>
                WEATHER
              </strong>{" "}
              status.
              <br />
              <br />
              <strong>Downtime</strong>
              <br />
              Sum of all observing time with an active <strong>
                DOWNTIME
              </strong>{" "}
              status.
              <br />
              <br />
              Where Observatory Status data is not available, weather loss is
              treated as <code>0</code>.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
