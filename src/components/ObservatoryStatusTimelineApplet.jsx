import { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

import AppletCard, { AppletStatusBody } from "@/components/AppletCard";
import ObservatoryStatusTimelineCardContents from "@/components/ObservatoryStatusTimelineCardContents";
import { buildObsStatusSource } from "@/utils/appletStatus";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Render the Observatory Status timeline as a full applet card with its own
 * header, full-screen viewing, and info/download overlays.
 *
 * Observatory Status entries are required to draw the timeline; Almanac
 * (twilight) data is not required, so a missing Almanac only produces a
 * warning rather than hiding the timeline.
 *
 * @param {Object} props
 * @param {[DateTime, DateTime]} props.fullTimeRange
 * @param {[DateTime, DateTime]} props.selectedTimeRange
 * @param {Function} props.setSelectedTimeRange
 * @param {string} props.brushGroup Shared brush-group id for cross-instance sync.
 * @param {Object} props.availability Availability metadata for the observatory-status feed.
 * @param {boolean} props.loading Whether the underlying data is still loading.
 * @param {Array} [props.entries=[]] Observatory status entries.
 * @param {number[]} [props.twilightValues=[]] 12° twilight times in ms.
 * @param {number[]} [props.twilight0DegValues=[]] 0° twilight times in ms.
 * @param {Object} [props.obsStatusMetrics={}] Per-state hour metrics.
 * @param {number} [props.nightHours=null] Total night hours.
 * @param {boolean} [props.fetchError=false] Whether the Observatory Status request failed.
 * @param {boolean} [props.almanacFetchError=false] Whether the Almanac request failed.
 */
function ObservatoryStatusTimelineApplet({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  brushGroup,
  availability,
  loading,
  entries = [],
  twilightValues = [],
  twilight0DegValues = [],
  obsStatusMetrics = {},
  nightHours = null,
  fetchError = false,
  almanacFetchError = false,
}) {
  const [visible, setVisible] = useState(true);

  const sources = {
    "obs-status": buildObsStatusSource(availability, fetchError),
    almanac: { ok: !almanacFetchError },
  };
  const required = ["obs-status"];

  const commonProps = {
    sources,
    required,
    loading: false,
    entries,
    twilightValues,
    twilight0DegValues,
    fullTimeRange,
    selectedTimeRange,
    setSelectedTimeRange,
    brushGroup,
    obsStatusMetrics,
    nightHours,
  };

  return (
    <AppletCard
      title="Timeline of Observatory State Changes"
      cardClassName="mt-2"
      open={visible}
      loading={loading}
      sources={sources}
      required={required}
      badgeAriaLabel="Observatory Status data availability warning"
      skeleton={
        <div className="flex-grow w-full h-full">
          <Skeleton className="h-full min-h-[180px] bg-stone-900" />
        </div>
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
                <AppletStatusBody
                  sources={sources}
                  required={required}
                  loading={loading}
                  skeleton={
                    <div className="flex-grow w-full h-full">
                      <Skeleton className="h-full bg-stone-900" />
                    </div>
                  }
                >
                  <ObservatoryStatusTimelineCardContents
                    {...commonProps}
                    fullScreen
                  />
                </AppletStatusBody>
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
    >
      <ObservatoryStatusTimelineCardContents {...commonProps} />
    </AppletCard>
  );
}

export default ObservatoryStatusTimelineApplet;
