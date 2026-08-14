import { TriangleAlert } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import ObservatoryStatusAvailabilityWarning from "@/components/ObservatoryStatusAvailabilityWarning";

import InfoIcon from "../assets/InfoIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";

import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

export default function TimeLossCard({
  obsStatusFaultLoss,
  obsStatusWeatherLoss,
  obsStatusAvailability,
  calculatedData,
  obsStatusLoading = false,
  calculatedFaultLoading = false,
  faultDataUnavailable = false,
  faultErrorMessage = null,
  onClick = false,
}) {
  const loading = obsStatusLoading || calculatedFaultLoading;
  const isClickable = onClick && !loading;

  const heading = "Time Loss";

  const availability = obsStatusAvailability ?? {};
  const availabilityStatus =
    availability.status ?? OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE;
  const formatHours = (value) =>
    typeof value === "number" && Number.isFinite(value)
      ? value.toFixed(2)
      : "NA";

  const isFullyAvailable =
    availabilityStatus === OBSERVATORY_STATE_AVAILABILITY_STATUS.FULL;
  const isNotAvailable =
    availabilityStatus === OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE;

  return (
    // Card
    <div
      data-testid="time-loss-card"
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      {/* Heading & Icon */}
      <div className="flex flex-row justify-between h-12">
        <div className="flex items-center gap-1">
          <div className="text-2xl">{heading}</div>
          {!loading && (
            <ObservatoryStatusAvailabilityWarning
              availability={obsStatusAvailability}
              ariaLabel="Time Loss data availability warning"
              testId="time-loss-availability-warning"
              partialDetails="Time loss has been computed for the available dayobs."
              details="Weather loss is treated as 0.0 for dayobs without Observatory Status data."
            />
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
              data-testid="time-loss-fault-loading"
              className="h-3 w-10 bg-teal-700"
            />
          ) : // Show data when availabile
          isFullyAvailable ? (
            <div data-testid="time-loss-fault">
              {formatHours(obsStatusFaultLoss)}
            </div>
          ) : (
            <div
              data-testid="time-loss-fault"
              className="flex items-center gap-1 cursor-help"
            >
              <span>
                {isNotAvailable ? "NA" : formatHours(obsStatusFaultLoss)}
              </span>
            </div>
          )}
          <div>Weather:</div>
          {obsStatusLoading ? (
            <Skeleton
              data-testid="time-loss-weather-loading"
              className="h-3 w-10 bg-teal-700"
            />
          ) : isFullyAvailable ? (
            <div data-testid="time-loss-weather">
              {formatHours(obsStatusWeatherLoss)}
            </div>
          ) : (
            <div
              data-testid="time-loss-weather"
              className="flex items-center gap-1 cursor-help"
            >
              <span>
                {isNotAvailable ? "NA" : formatHours(obsStatusWeatherLoss)}
              </span>
            </div>
          )}

          <div>(Calculated Fault):</div>
          {calculatedFaultLoading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : faultDataUnavailable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span>NA</span>

                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{faultErrorMessage}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div data-testid="time-loss-calculated-fault">
              {formatHours(calculatedData)}
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
              Observing hours (<strong>-12°</strong>) lost to fault or weather
              according to Observatory Status records, and fault loss calculated
              from exposures.
              <br />
              <br />
              <strong>Observatory Status Fault Loss</strong>
              <br />
              Sum of all observing time with an active <strong>
                FAULT
              </strong>{" "}
              status, except during <strong>DOWNTIME</strong>.
              <br />
              <br />
              <strong>Observatory Status Weather Loss</strong>
              <br />
              Sum of all observing time with an active <strong>
                WEATHER
              </strong>{" "}
              status.
              <br />
              <br />
              <strong>Calculated Fault Loss</strong>
              <br />
              Total available observing time – exposure time – overhead time* –
              time lost to weather**.
              <br />
              <br />
              <em>
                *overhead time = expected slew and settle time, including a
                potential additional overhead of up to 2 minutes per visit.
              </em>
              <br />
              <em>
                **weather loss is derived from Observatory Status data when
                available, and treated as 0.0 when not available.
              </em>
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
