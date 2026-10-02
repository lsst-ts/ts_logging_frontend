import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppletHeader from "@/components/AppletHeader";
import DownloadButton from "@/components/DownloadButton";
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
import { buildDownloadFilename, toCsv } from "@/utils/downloadUtils";
import { getObsAvailabilityWarningText } from "@/utils/observatoryStatusUtils";
import {
  buildBreakdownDownloadData,
  buildObservatoryStatusBreakdown,
} from "@/utils/obsStatusBreakdownUtils";

import InfoIcon from "../assets/InfoIcon.svg";

function ObservatoryStatusBreakdownApplet({
  almanacInfo = [],
  dayObsOpenDomeHours = {},
  obsStatusIntervals = [],
  loading = false,
  availability,
  fetchError = false,
  almanacFetchError = false,
  selected = null,
  onSelectionChange,
}) {
  const [tableVisible, setTableVisible] = useState(true);
  const [columnFilters, setColumnFilters] = useState([]);

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
    <Card className="@container border-none p-0 bg-stone-800 gap-2">
      <AppletHeader
        title="Detailed Breakdown of Observatory States"
        actions={
          <>
            <DownloadButton
              onDownload={handleDownload}
              disabled={
                loading || isEmptyState || breakdown.dayObsValues.length === 0
              }
            />

            <Popover>
              <PopoverTrigger
                className="min-w-4 cursor-pointer"
                aria-label="Narrative Log information"
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
              data={breakdown.rows}
              columns={columns}
              defaultColumnVisibility={defaultColumnVisibility}
              defaultColumnOrder={defaultColumnOrder}
              columnFilters={columnFilters}
              setColumnFilters={setColumnFilters}
              selected={selected}
              onSelectionChange={onSelectionChange}
              toolbar={{
                expandRowNoun: "States",
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
