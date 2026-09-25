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

import ObservatoryStatusTimelineCardContents from "@/components/ObservatoryStatusTimelineCardContents";
import WarningTooltip from "@/components/WarningTooltip";
import { getObsAvailabilityWarningText } from "@/utils/observatoryStatusUtils";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Render the Observatory Status timeline as a full applet card with its own
 * header, full-screen viewing, and info/download overlays.
 *
 * @param {Object} props
 * @param {Array} [props.entries=[]] Observatory status entries.
 * @param {number[]} [props.twilightValues=[]] 12° twilight times in ms.
 * @param {number[]} [props.twilight0DegValues=[]] 0° twilight times in ms.
 * @param {[DateTime, DateTime]} props.fullTimeRange
 * @param {[DateTime, DateTime]} props.selectedTimeRange
 * @param {Function} props.setSelectedTimeRange
 * @param {string} [props.brushGroup] Shared brush-group id for cross-instance sync.
 * @param {Object} [props.obsStatusMetrics={}] Per-state hour metrics.
 * @param {number} [props.nightHours=null] Total night hours.
 * @param {Object} [props.availability] Availability metadata for the observatory-status feed.
 * @param {boolean} [props.fetchError=false] Whether the Observatory Status request failed.
 * @param {boolean} [props.almanacFetchError=false] Whether the Almanac request failed.
 * @param {boolean} props.loading Whether the underlying data is still loading.
 */
function ObservatoryStatusTimelineApplet({
  entries = [],
  twilightValues = [],
  twilight0DegValues = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  brushGroup,
  obsStatusMetrics = {},
  nightHours = null,
  availability,
  fetchError = false,
  almanacFetchError = false,
  loading,
}) {
  const [visible, setVisible] = useState(true);
  const obsAvailabilityStatus = availability?.status ?? null;
  const obsAvailabilityWarningText = getObsAvailabilityWarningText({
    almanacFetchError,
    obsStatusFetchError: fetchError,
    availability,
  });

  const commonProps = {
    entries,
    twilightValues,
    twilight0DegValues,
    fullTimeRange,
    selectedTimeRange,
    setSelectedTimeRange,
    brushGroup,
    obsStatusMetrics,
    nightHours,
    loading,
    availabilityStatus: obsAvailabilityStatus,
    warningText: obsAvailabilityWarningText,
  };

  return (
    <Card className="@container border-none p-0 bg-stone-800 mt-2 gap-2">
      <AppletHeader
        title="Timeline of Observatory State Changes"
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
                className="min-w-4 cursor-pointer"
                aria-label="Open observatory status timeline in fullscreen"
              >
                <img src={FullScreenIcon} alt="Fullscreen" />
              </DialogTrigger>
              <DialogContent className="bg-teal-900/75 border-none p-8 !w-[95vw] !max-w-[95vw] !h-[80vh] !max-h-[80vh] overflow-auto">
                <DialogTitle className="flex flex-row text-2xl justify-between sr-only">
                  Timeline of Observatory State Changes
                </DialogTitle>
                <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin">
                  <ObservatoryStatusTimelineCardContents
                    {...commonProps}
                    fullScreen
                  />
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
                  A timeline of observatory status changes. Dragging over the
                  chart selects a time range; double-clicking resets it. The
                  selected range is reflected in the cumulative plots below.
                </p>
              </PopoverContent>
            </Popover>
            {/* Button to toggle timeline visibility */}
            <Button
              onClick={() => setVisible((prev) => !prev)}
              className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
            >
              {visible ? "Hide Timeline" : "Show Timeline"}
            </Button>
          </>
        }
      />
      {visible && (
        <CardContent className="bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin">
          <ObservatoryStatusTimelineCardContents {...commonProps} />
        </CardContent>
      )}
    </Card>
  );
}

export default ObservatoryStatusTimelineApplet;
