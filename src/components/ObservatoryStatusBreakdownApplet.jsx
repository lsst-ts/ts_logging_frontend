import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppletHeader from "@/components/AppletHeader";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import DataTable from "@/components/DataTable/DataTable";
import {
  createObservatoryStatusColumns,
  getObservatoryStatusDefaultColumnOrder,
  getObservatoryStatusDefaultColumnVisibility,
} from "@/components/ObservatoryStatusBreakdownColumns";

import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { getObsAvailabilityWarningText } from "@/utils/observatoryStatusUtils";
import {
  buildObservatoryStatusBreakdown,
  filterToActiveStates,
} from "@/utils/obsStatusBreakdownUtils";

import DownloadIcon from "../assets/DownloadIcon.svg";
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
  const [columnFilters, setColumnFilters] = useState([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const obsAvailabilityStatus = availability?.status ?? null;
  const obsAvailabilityWarningText = getObsAvailabilityWarningText({
    almanacFetchError,
    obsStatusFetchError: fetchError,
    availability,
  });

  const breakdown = useMemo(
    () =>
      buildObservatoryStatusBreakdown({
        almanacInfo,
        dayObsOpenDomeHours,
        obsStatusIntervals,
      }),
    [almanacInfo, dayObsOpenDomeHours, obsStatusIntervals],
  );

  const columns = useMemo(
    () => createObservatoryStatusColumns(breakdown.dayObsValues),
    [breakdown.dayObsValues],
  );

  const defaultColumnVisibility = useMemo(
    () => getObservatoryStatusDefaultColumnVisibility(breakdown.dayObsValues),
    [breakdown.dayObsValues],
  );

  const defaultColumnOrder = useMemo(
    () => getObservatoryStatusDefaultColumnOrder(breakdown.dayObsValues),
    [breakdown.dayObsValues],
  );

  const isEmptyState =
    !loading &&
    (almanacFetchError ||
      fetchError ||
      obsAvailabilityStatus === OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE);

  return (
    <Card className="@container border-none p-0 bg-stone-800 gap-2">
      <AppletHeader
        title="Detailed Breakdown of Observatory States"
        actions={
          <>
            <Popover>
              <PopoverTrigger
                className="min-w-4 cursor-pointer"
                aria-label="Download Observatory Status Breakdown data"
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
                aria-label="Observatory Status Breakdown information"
              >
                <img src={InfoIcon} alt="Information" />
              </PopoverTrigger>
              <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px] cursor-pointer">
                <p>A detailed breakdown of possible observatory states.</p>
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
      />

      {tableVisible && (
        <CardContent
          id="obs-status-breakdown-table"
          className={cn(
            "flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin",
            isEmptyState && "h-[100px]",
          )}
        >
          {loading ? (
            <div className="flex-grow w-full h-full">
              <Skeleton className="h-full min-h-[180px] bg-stone-900" />
            </div>
          ) : almanacFetchError ||
            fetchError ||
            obsAvailabilityStatus ===
              OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE ? (
            <div className="place-content-center-safe h-[100px]">
              <p className="text-stone-400 text-center">
                {obsAvailabilityWarningText}
              </p>
            </div>
          ) : (
            <DataTable
              data={
                showOnlyActive
                  ? filterToActiveStates(breakdown.rows)
                  : breakdown.rows
              }
              columns={columns}
              defaultColumnVisibility={defaultColumnVisibility}
              defaultColumnOrder={defaultColumnOrder}
              defaultExpanded={true}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              selected={selected}
              onSelectionChange={onSelectionChange}
              onReset={() => setShowOnlyActive(true)}
              toolbar={{
                expandRowNoun: "States",
                afterColumnVisibility: (
                  <button
                    type="button"
                    onClick={() => setShowOnlyActive((prev) => !prev)}
                    className="btn h-10 w-[160px] bg-teal-800 justify-between
                      font-normal text-[12px] text-white
                      border-2 border-white rounded-md
                      cursor-pointer
                      shadow-[4px_4px_4px_0px_#3CAE3F]
                      hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700
                      transition-all duration-200
                      focus-visible:ring-4
                      focus-visible:ring-green-500/50"
                  >
                    {showOnlyActive
                      ? "Show All States"
                      : "Show Only Active States"}
                  </button>
                ),
              }}
              tableMeta={{
                getRowClassName: (row) => {
                  // Summary rows get different styling
                  if (row.original.rowType === "summary") {
                    return [
                      "bg-stone-700/70",
                      row.original.state === "Dome Open"
                        ? "border-b-3 border-stone-200"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ");
                  }

                  if (row.original.rowType === "combination") {
                    return "bg-stone-900/60 text-stone-400";
                  }

                  return "";
                },
              }}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ObservatoryStatusBreakdownApplet;
