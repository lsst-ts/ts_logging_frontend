import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import ObservatoryStatusBreakdownTable from "@/components/ObservatoryStatusBreakdownTable";
import AppletCard from "@/components/AppletCard";
import DownloadButton from "@/components/DownloadButton";
import {
  buildBreakdownDownloadData,
  buildObservatoryStatusBreakdown,
} from "@/utils/obsStatusBreakdownUtils";
import {
  buildObsStatusSource,
  resolveAppletStatus,
} from "@/utils/appletStatus";
import { buildDownloadFilename, toCsv } from "@/utils/downloadUtils";

import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Render the Detailed Breakdown of Observatory States as a table applet with its
 * own header and info/download overlays.
 *
 * Displays the per-state time breakdown across the night, with expandable
 * summary rows and a column filter toolbar.
 *
 * @param {Object} props
 * @param {Function} props.onSelectionChange Callback invoked when the table row selection changes.
 * @param {Object} props.availability Availability metadata for the observatory-status feed.
 * @param {Array} [props.almanacInfo=[]] Almanac night metadata used by the breakdown.
 * @param {Object} [props.dayObsOpenDomeHours={}] Day-obs open-dome hours, keyed by day-obs value.
 * @param {Array} [props.obsStatusIntervals=[]] Observatory status intervals to break down.
 * @param {boolean} [props.loading=false] Whether the underlying data is still loading.
 * @param {boolean} [props.fetchError=false] Whether the Observatory Status request failed.
 * @param {boolean} [props.almanacFetchError=false] Whether the Almanac request failed.
 * @param {Array} [props.selected=null] Currently selected rows.
 */
function ObservatoryStatusBreakdownApplet({
  onSelectionChange,
  availability,
  almanacInfo = [],
  dayObsOpenDomeHours = {},
  obsStatusIntervals = [],
  loading = false,
  fetchError = false,
  almanacFetchError = false,
  selected = null,
}) {
  const [tableVisible, setTableVisible] = useState(true);

  const breakdown = useMemo(
    () =>
      buildObservatoryStatusBreakdown({
        almanacInfo,
        dayObsOpenDomeHours,
        obsStatusIntervals,
      }),
    [almanacInfo, dayObsOpenDomeHours, obsStatusIntervals],
  );

  const sources = {
    "obs-status": buildObsStatusSource(availability, fetchError),
    almanac: { ok: !almanacFetchError },
  };
  const required = ["obs-status", "almanac"];
  const { status } = resolveAppletStatus({ sources, required, loading });

  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/time-accounting",
  });

  // Download the hours for each exact state combination, per night.
  const handleDownload = () => {
    const { rows, columns } = buildBreakdownDownloadData(breakdown);
    return {
      content: toCsv(rows, columns),
      filename: buildDownloadFilename(
        "observatory-status-breakdown",
        { telescope, startDayobs, endDayobs },
        "csv",
      ),
      mimeType: "text/csv",
    };
  };

  return (
    <AppletCard
      title="Detailed Breakdown of Observatory States"
      id="obs-status-breakdown-table"
      open={tableVisible}
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
          <DownloadButton
            onDownload={handleDownload}
            disabled={
              status !== "ready" || breakdown.dayObsValues.length === 0
            }
          />

          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
              aria-label="Observatory Status Breakdown information"
            >
              <img src={InfoIcon} alt="Information" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[380px] cursor-pointer">
              <p>
                This table shows how the observatory's status was distributed
                across the selected nights.
              </p>
              <p className="mt-2">
                Each of the date columns is one observing night (measured
                between the -12&deg; twilights). The Total column adds up that
                state's time across all the nights.
              </p>
              <p className="mt-2">
                Each state row shows the total time the observatory spent in
                that state. Beneath it, the row breaks down into the time spent
                in each possible combination - the state on its own, or together
                with one or more other states.
              </p>
            </PopoverContent>
          </Popover>

          {/* Button to toggle table visibility */}
          <Button
            onClick={() => setTableVisible((prev) => !prev)}
            className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
          >
            {tableVisible ? "Hide Table" : "Show Table"}
          </Button>
        </>
      }
    >
      <ObservatoryStatusBreakdownTable
        rows={breakdown.rows}
        dayObsValues={breakdown.dayObsValues}
        selected={selected}
        onSelectionChange={onSelectionChange}
      />
    </AppletCard>
  );
}

export default ObservatoryStatusBreakdownApplet;
