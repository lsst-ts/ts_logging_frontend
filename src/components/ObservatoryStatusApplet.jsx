import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppletHeader from "@/components/AppletHeader";
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
import { getObsAvailabilityWarningText } from "@/utils/observatoryStatusUtils";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

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
 * @param {[DateTime, DateTime]} props.selectedTimeRange Currently selected time range.
 * @param {Function} props.setSelectedTimeRange Update the selected time range.
 * @param {boolean} props.loading Whether the underlying data is still loading.
 */
function ObservatoryStatusApplet({
  accumulateAcrossNights = false,
  appletTitle = "Observatory Status",
  plotTitle = "Cumulative Time in State",
  collapsable = true,
  almanacInfo = [],
  intervals = [],
  availability,
  fetchError = false,
  almanacFetchError = false,
  openDomeTimes = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  loading,
}) {
  const [cardVisible, setCardVisible] = useState(true);
  const obsAvailabilityStatus = availability?.status ?? null;
  const obsAvailabilityWarningText = getObsAvailabilityWarningText({
    almanacFetchError,
    obsStatusFetchError: fetchError,
    availability,
  });

  return (
    <Card className="@container border-none p-0 bg-stone-800 gap-2">
      <AppletHeader
        title={appletTitle}
        titleBadge={
          !loading &&
          obsAvailabilityStatus ===
            OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL ? (
            <div className="flex place-items-center-safe">
              <WarningTooltip
                ariaLabel="Observatory Status data availability warning"
                iconClassName="h-4"
              >
                {obsAvailabilityWarningText}
              </WarningTooltip>
            </div>
          ) : undefined
        }
        actions={
          <>
            <Dialog>
              <DialogTrigger
                className="min-w-4"
                aria-label="Open observatory status in fullscreen"
              >
                <img src={FullScreenIcon} alt="Fullscreen" />
              </DialogTrigger>
              <DialogContent className="bg-teal-900/75 border-none p-8 !w-[95vw] !max-w-[95vw] !h-[80vh] !max-h-[80vh] overflow-auto">
                <DialogTitle className="flex flex-row text-2xl justify-between sr-only">
                  {appletTitle}
                </DialogTitle>
                <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin">
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
                      accumulateAcrossNights={accumulateAcrossNights}
                      plotTitle={plotTitle}
                      almanacInfo={almanacInfo}
                      intervals={intervals}
                      openDomeTimes={openDomeTimes}
                      fullTimeRange={fullTimeRange}
                      selectedTimeRange={selectedTimeRange}
                      setSelectedTimeRange={setSelectedTimeRange}
                      fullScreen={true}
                    />
                  )}
                </CardContent>
              </DialogContent>
            </Dialog>
            <Popover>
              <PopoverTrigger
                className="min-w-4"
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
                className="min-w-4"
                aria-label="Observatory status information"
              >
                <img src={InfoIcon} alt="Information" />
              </PopoverTrigger>
              <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px]">
                <p>
                  The observatory's status and dome activity during the
                  observing night.
                  <br />
                  <br />
                  Time is accumulated between twilights,{" "}
                  <code>[-12°, -12°]</code>, with positive slopes representing
                  an active state. Markers represent status updates in UTC as
                  recorded in the <code>EFD</code>'s{" "}
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
            {/* Button to toggle graph visibility */}
            {collapsable && (
              <Button
                onClick={() => setCardVisible((prev) => !prev)}
                className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
              >
                {cardVisible ? "Hide Graph" : "Show Graph"}
              </Button>
            )}
          </>
        }
      />
      {cardVisible && (
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
              accumulateAcrossNights={accumulateAcrossNights}
              plotTitle={plotTitle}
              almanacInfo={almanacInfo}
              intervals={intervals}
              openDomeTimes={openDomeTimes}
              fullTimeRange={fullTimeRange}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ObservatoryStatusApplet;
