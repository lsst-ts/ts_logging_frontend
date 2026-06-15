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

import InfoIcon from "../assets/InfoIcon.svg";

import { formatDayobsStrForDisplay } from "@/utils/timeUtils";

export default function TimeLossCard({
  icon,
  narrativeLogData,
  obsStatusData,
  obsStatusAvailability,
  calculatedData,
  narrativeLogloading = false,
  obsStatusLoading = false,
  calculatedFaultLoading = false,
  onClick = false,
}) {
  const loading =
    narrativeLogloading && obsStatusLoading && calculatedFaultLoading;
  const isClickable = onClick && !loading;

  const heading = "Fault Loss";

  const isFullyAvailable = obsStatusAvailability.status === "full";
  const isNotAvailable = obsStatusAvailability.status === "none";

  // Tooltip to be shown over obs status data if data
  // partially or fully unavailable due to user querying
  // before/around when the data started being recorded.
  const tooltipText = isNotAvailable ? (
    <>
      Observatory Status data is only available from{" "}
      <strong>
        {formatDayobsStrForDisplay(
          String(obsStatusAvailability.available_from),
        )}
      </strong>
      .
    </>
  ) : (
    <>
      Observatory Status data is only available from{" "}
      <strong>
        {formatDayobsStrForDisplay(
          String(obsStatusAvailability.available_from),
        )}
      </strong>
      .
      <br />
      Fault time loss has been computed for the available dayobs.
    </>
  );

  return (
    // Card
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      {/* Heading & Icon */}
      <div className="flex flex-row justify-between h-12">
        <div className="text-2xl">{heading}</div>
        <img src={icon} alt={heading} />
      </div>
      {/* Data & Info Icon */}
      <div className="flex flex-row justify-between">
        {/* Data */}
        <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 text-md">
          <div>Obs. Status:</div>
          {obsStatusLoading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : // Show data when availabile
          isFullyAvailable ? (
            <div>{obsStatusData.toFixed(2)}</div>
          ) : (
            // Show tooltip and warning icon for no/partial data
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 cursor-help">
                  <span>
                    {isNotAvailable ? "NA" : obsStatusData.toFixed(2)}
                  </span>

                  <TriangleAlert className="h-4 w-4 text-yellow-500" />
                </div>
              </TooltipTrigger>

              <TooltipContent>
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <div>Narrative Log:</div>
          {narrativeLogloading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : (
            narrativeLogData.toFixed(2)
          )}

          <div>Calculated:</div>
          {calculatedFaultLoading ? (
            <Skeleton className="h-3 w-10 bg-teal-700" />
          ) : (
            calculatedData
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
              Observing hours lost to faults as recorded in the Narrative Log
              and Observatory Status, and calculated from exposures.
              <br />
              <br />
              <strong>Observatory Status Fault Loss</strong>
              <br />
              Sum of all observing time with an active <code>FAULT</code>{" "}
              status, except during <code>DOWNTIME</code>.
              <br />
              <br />
              <strong>Narrative Log Fault Loss</strong>
              <br />
              Sum of all time lost to fault as recorded in the Narrative Log.
              <br />
              <br />
              <strong>Calculated Fault Loss</strong>
              <br />
              Total available observing time – exposure time – overhead time* –
              MIN( time lost to weather**, dome closed time ).
              <br />
              <br />
              <em>
                *overhead time = readout time when not slewing + any setting
                time after slewing.
              </em>
              <br />
              <em>**weather loss is derived from Observatory Status data.</em>
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
