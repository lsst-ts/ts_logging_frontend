import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { CardContent } from "@/components/ui/card";
import AppletCard, { AppletStateBody } from "@/components/AppletCard";
import ObservatoryStatusCumulativePlot from "@/components/ObservatoryStatusCumulativePlot";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Render the observatory status dashboard applet with availability warnings,
 * fullscreen detail viewing, and info/download overlays.
 *
 * @param {Object} props
 * @param {[DateTime, DateTime]} props.fullTimeRange Visible time range for the chart.
 * @param {[DateTime, DateTime]} props.selectedTimeRange Currently selected time range.
 * @param {Function} props.setSelectedTimeRange Update the selected time range.
 * @param {boolean} props.loading Whether the underlying data is still loading.
 * @param {Object} props.sources Map of source key -> `{ ok, message?, noData? }`.
 * @param {string[]} props.required Sources required to draw the plot.
 * @param {boolean} [props.accumulateAcrossNights=false] Whether to accumulate time across nights.
 * @param {string} [props.appletTitle] Applet header title.
 * @param {string} [props.plotTitle] Plot title.
 * @param {boolean} [props.collapsable=false] Whether to show the Show/Hide Graph toggle.
 * @param {boolean} [props.maintainHeight=false] When true, the error state keeps the
 *   ready height (for dashboard-embedded applets that must not change size).
 * @param {Array} [props.almanacInfo=[]] Almanac night metadata used by the cumulative plot.
 * @param {Array} [props.intervals=[]] Observatory status intervals to display.
 * @param {Array} [props.openDomeTimes=[]] Open-dome intervals to overlay on the plot.
 */
function ObservatoryStatusCumulativeApplet({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  loading,
  sources = {},
  required = [],
  accumulateAcrossNights = false,
  appletTitle = "Observatory Status",
  plotTitle = "Cumulative Time in State",
  collapsable = false,
  maintainHeight = false,
  almanacInfo = [],
  intervals = [],
  openDomeTimes = [],
}) {
  const [cardVisible, setCardVisible] = useState(true);

  const skeleton = (
    <div className="flex-grow w-full h-full">
      <Skeleton className="h-full min-h-[180px] bg-stone-900" />
    </div>
  );

  return (
    <AppletCard
      title={appletTitle}
      sources={sources}
      required={required}
      loading={loading}
      open={cardVisible}
      readyClassName="h-[320px]"
      maintainHeight={maintainHeight}
      badgeAriaLabel="Observatory Status data availability warning"
      skeleton={skeleton}
      actions={
        <>
          <Dialog>
            <DialogTrigger
              className="min-w-4 cursor-pointer"
              aria-label="Open observatory status in fullscreen"
            >
              <img src={FullScreenIcon} alt="Fullscreen" />
            </DialogTrigger>
            <DialogContent className="bg-teal-900/75 border-none p-8 !w-[95vw] !max-w-[95vw] !h-[80vh] !max-h-[80vh] overflow-auto">
              <DialogTitle className="flex flex-row text-2xl justify-between sr-only">
                {appletTitle}
              </DialogTitle>
              <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin">
                <AppletStateBody
                  sources={sources}
                  required={required}
                  loading={loading}
                  skeleton={
                    <div className="flex-grow w-full h-full">
                      <Skeleton className="h-full bg-stone-900" />
                    </div>
                  }
                >
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
                </AppletStateBody>
              </CardContent>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
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
              className="min-w-4 cursor-pointer"
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
          {/* Button to toggle graph visibility */}
          {collapsable && (
            <Button
              onClick={() => setCardVisible((prev) => !prev)}
              className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
            >
              {cardVisible ? "Hide Plot" : "Show Plot"}
            </Button>
          )}
        </>
      }
    >
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
    </AppletCard>
  );
}

export default ObservatoryStatusCumulativeApplet;
