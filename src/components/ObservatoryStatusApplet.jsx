import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import ObservatoryStatusCumulativePlot from "@/components/ObservatoryStatusCumulativePlot";
import WarningTooltip from "@/components/WarningTooltip";
import { formatDayobsStrForDisplay } from "@/utils/timeUtils";
import { getObsStatusFetchErrorText } from "@/utils/observatoryStatusUtils";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Builds the warning text shown by the Observatory Status applet when its
 * data cannot be displayed.
 *
 * Fetch errors take precedence over availability gaps: the cumulative plot
 * cannot render without its source data, so an error message is returned
 * whenever either request failed. Otherwise, when both requests succeeded but
 * Obs Status covers only part of the requested range, an availability message
 * is returned.
 *
 * @param {Object} options
 * @param {boolean} [options.almanacFetchError=false] Whether the Almanac request failed.
 * @param {boolean} [options.obsStatusFetchError=false] Whether the Observatory Status request failed.
 * @param {Object} [options.availability] Availability metadata for the observatory-status feed.
 * @returns {string} The warning text to display.
 */
function getObsAvailabilityWarningText({
  almanacFetchError,
  obsStatusFetchError,
  availability,
}) {
  // Fetch errors take precedence: the plot cannot render without its data.
  const fetchErrorText = getObsStatusFetchErrorText({
    almanacFetchError,
    obsStatusFetchError,
  });
  if (fetchErrorText) return fetchErrorText;

  // Both requests succeeded, but Obs Status covers only part of the range.
  const obsAvailableFrom = availability?.available_from
    ? formatDayobsStrForDisplay(String(availability.available_from))
    : null;
  return `Observatory Status data is only available from ${
    obsAvailableFrom ?? "the supported dayobs range"
  }.`;
}

/**
 * Render the observatory status dashboard applet with availability warnings,
 * fullscreen detail viewing, and info/download overlays.
 *
 * @param {Object} props
 * @param {Array} [props.almanacInfo=[]] Almanac night metadata used by the cumulative plot.
 * @param {Array} [props.intervals=[]] Observatory status intervals to display.
 * @param {Object} [props.availability] Availability metadata for the observatory-status feed.
 * @param {boolean} [props.fetchError=false] Whether the Observatory Status request failed.
 * @param {boolean} [props.almanacFetchError=false] Whether the Almanac request failed.
 * @param {Array} [props.openDomeTimes=[]] Open-dome intervals to overlay on the plot.
 * @param {[DateTime, DateTime]} props.fullTimeRange Visible time range for the chart.
 * @param {boolean} props.loading Whether the underlying data is still loading.
 */
function ObservatoryStatusApplet({
  almanacInfo = [],
  intervals = [],
  availability,
  fetchError = false,
  almanacFetchError = false,
  openDomeTimes = [],
  fullTimeRange,
  loading,
}) {
  const obsAvailabilityStatus = availability?.status ?? null;
  const obsAvailabilityWarningText = getObsAvailabilityWarningText({
    almanacFetchError,
    obsStatusFetchError: fetchError,
    availability,
  });

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          <div className="flex flex-row gap-1">
            <p>Observatory Status</p>
            {/* Partial data availability warning */}
            {!loading &&
              obsAvailabilityStatus ===
                OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL && (
                <div className="flex place-items-center-safe">
                  <WarningTooltip
                    ariaLabel="Observatory Status data availability warning"
                    iconClassName="h-4"
                  >
                    {obsAvailabilityWarningText}
                  </WarningTooltip>
                </div>
              )}
          </div>
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
          <Dialog>
            <DialogTrigger
              className="self-end min-w-4"
              aria-label="Open observatory status in fullscreen"
            >
              <img src={FullScreenIcon} alt="Fullscreen" />
            </DialogTrigger>
            <DialogContent className="bg-teal-900/75 border-none p-8 !w-[95vw] !max-w-7xl max-h-screen overflow-y-auto">
              <DialogTitle className="flex flex-row text-2xl justify-between sr-only">
                Observatory Status - Cumulative Time in State
              </DialogTitle>
              <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 !h-[50vw] font-thin">
                {loading ? (
                  <div className="flex-grow w-full h-full">
                    <Skeleton className="h-full bg-stone-900" />
                  </div>
                ) : almanacFetchError ||
                  fetchError ||
                  obsAvailabilityStatus ===
                    OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE ? (
                  <div className="h-full place-content-center-safe">
                    <p className="text-3xl text-stone-400 text-center">
                      {obsAvailabilityWarningText}
                    </p>
                  </div>
                ) : (
                  <ObservatoryStatusCumulativePlot
                    almanacInfo={almanacInfo}
                    intervals={intervals}
                    openDomeTimes={openDomeTimes}
                    fullTimeRange={fullTimeRange}
                    fullScreen={true}
                  />
                )}
              </CardContent>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger
              className="self-end min-w-4"
              aria-label="Download observatory status data"
            >
              <img src={DownloadIcon} alt="Download" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger
              className="self-end min-w-4"
              aria-label="Observatory status information"
            >
              <img src={InfoIcon} alt="Information" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px]">
              <p>
                The observatory's status and dome activity during the observing
                night.
                <br />
                <br />
                Time is accumulated between twilights, <code>[-12°, -12°]</code>
                , with positive slopes representing an active state. Markers
                represent status updates in UTC as recorded in the{" "}
                <code>EFD</code>'s{" "}
                <code>Scheduler.logevent_observatoryStatus</code> topic.
                <br />
                <br />
                &#9671; : status update with accompanying note
                <br />
                &#9675; : status update only
                <br />
                <br />
                Hover over markers to see the details of the status update.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {loading ? (
          <div className="flex-grow w-full h-full">
            <Skeleton className="h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : almanacFetchError ||
          fetchError ||
          obsAvailabilityStatus ===
            OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE ? (
          <div className="h-full place-content-center-safe">
            <p className="text-stone-400 text-center">
              {obsAvailabilityWarningText}
            </p>
          </div>
        ) : (
          <ObservatoryStatusCumulativePlot
            almanacInfo={almanacInfo}
            intervals={intervals}
            openDomeTimes={openDomeTimes}
            fullTimeRange={fullTimeRange}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default ObservatoryStatusApplet;
