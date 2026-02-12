import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TELESCOPES } from "@/components/Parameters";
import DataLogTable from "@/components/DataLogTable.jsx";
import TimelineChart from "@/components/TimelineChart";
import PageHeader from "@/components/PageHeader";
import TipsCard from "@/components/TipsCard";
import SelectedTimeRangeBar from "@/components/SelectedTimeRangeBar";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import DownloadIcon from "../assets/DownloadIcon.svg";
import {
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
  fetchAlmanac,
} from "@/utils/fetchUtils";
import {
  getDatetimeFromDayobsStr,
  mergeDataLogSources,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
} from "@/utils/utils";
import { isoToTAI } from "@/utils/timeUtils";
import {
  prepareAlmanacData,
  prepareMoonIntervals,
} from "@/utils/timelineUtils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";

function DataLog() {
  // Routing and URL params
  const {
    startDayobs,
    endDayobs,
    telescope,
    science_program,
    img_type,
    observation_reason,
    target_name,
  } = useSearch({ from: "/data-log" });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // To pass url filter params to table
  const tableFilters = [];
  if (science_program?.length) {
    tableFilters.push({ id: "science_program", value: science_program });
  }
  if (img_type?.length) {
    tableFilters.push({ id: "img_type", value: img_type });
  }
  if (observation_reason?.length) {
    tableFilters.push({ id: "observation_reason", value: observation_reason });
  }
  if (target_name?.length) {
    tableFilters.push({ id: "target_name", value: target_name });
  }

  // For context menu navigation
  const search = useSearch({ from: "/data-log" });

  // Context menu items
  const contextMenuItems = [
    {
      label: "View Context Feed",
      to: "/nightlydigest/context-feed",
      search,
    },
    {
      label: "View Plots",
      to: "/nightlydigest/plots",
      search,
    },
  ];

  // Data
  const [dataLogEntries, setDataLogEntries] = useState([]);
  const [dataLogLoading, setDataLogLoading] = useState(true);

  // Almanac data for timeline
  const [twilightValues, setTwilightValues] = useState([]);
  const [illumValues, setIllumValues] = useState([]);
  const [moonValues, setMoonValues] = useState([]);
  const [moonIntervals, setMoonIntervals] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Visibility toggles
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(true);

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/data-log");

  // Calculate moon intervals when moon values or full time range changes
  useEffect(() => {
    const [xMinMillis, xMaxMillis] = fullTimeRange;
    if (moonValues?.length && xMinMillis != null && xMaxMillis != null) {
      const intervals = prepareMoonIntervals(
        moonValues,
        xMinMillis.toMillis(),
        xMaxMillis.toMillis(),
      );
      setMoonIntervals(intervals);
    }
  }, [moonValues, fullTimeRange]);

  // Filter data based on selected time range for the table
  const filteredDataLogEntries = useMemo(() => {
    if (!selectedTimeRange[0] || !selectedTimeRange[1]) {
      return dataLogEntries;
    }
    const [startMillis, endMillis] = [
      selectedTimeRange[0].toMillis(),
      selectedTimeRange[1].toMillis(),
    ];
    return dataLogEntries.filter((entry) => {
      const obsStartMillis = entry.obs_start_millis;
      return obsStartMillis >= startMillis && obsStartMillis <= endMillis;
    });
  }, [dataLogEntries, selectedTimeRange]);

  useEffect(() => {
    // To cancel previous fetch if still in progress
    const abortController = new AbortController();

    // Trigger loading skeletons
    setDataLogLoading(true);
    setAlmanacLoading(true);

    // Reset almanac state
    setTwilightValues([]);
    setIllumValues([]);
    setMoonValues([]);

    // Fetch data from both sources
    Promise.all([
      fetchDataLogEntriesFromConsDB(
        startDayobs,
        queryEndDayobs,
        instrument,
        abortController,
      ),
      fetchDataLogEntriesFromExposureLog(
        startDayobs,
        queryEndDayobs,
        instrument,
        abortController,
      ),
    ])
      .then(([consDBData, exposureLogData]) => {
        const dataLog = consDBData.data_log ?? [];

        if (dataLog.length === 0) {
          toast.warning(
            "No data log records found in ConsDB for the selected date range.",
          );
        }

        // Merge the two data sources
        // and apply conversion to required row(s)
        const mergedData = mergeDataLogSources(dataLog, exposureLogData)
          .map((entry) => {
            const psfSigma = Number.parseFloat(entry.psf_sigma_median);
            const pixelScale = Number.isFinite(entry.pixel_scale_median)
              ? entry.pixel_scale_median
              : DEFAULT_PIXEL_SCALE_MEDIAN;
            const psf_median = Number.isFinite(psfSigma)
              ? psfSigma * PSF_SIGMA_FACTOR * pixelScale
              : null;

            // Add obs_start_millis for timeline
            const obsStartDt = isoToTAI(entry.obs_start);

            return {
              ...entry,
              psf_median,
              obs_start_millis: obsStartDt.toMillis(),
            };
          })
          .sort((a, b) => Number(b["exposure_id"]) - Number(a["exposure_id"]));

        // Set the merged data to state
        setDataLogEntries(mergedData);
        setDataLogLoading(false);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setDataLogEntries([]);
          const msg = err?.message || "Unknown error";
          toast.error("Error fetching exposure or data log!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setDataLogLoading(false);
        }
      });

    // Fetch almanac data for timeline
    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        if (almanac === null) {
          toast.warning(
            "No almanac data available. Timeline will be displayed without accompanying almanac information.",
          );
        } else {
          const { twilightValues, illumValues, moonValues } =
            prepareAlmanacData(almanac);
          setTwilightValues(twilightValues);
          setIllumValues(illumValues);
          setMoonValues(moonValues);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching almanac!", {
            description: err?.message,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page Header, Timeline & Tips Banners */}
        <div className="flex flex-col gap-2">
          {/* Page title + buttons */}
          <PageHeader
            title="Data Log"
            description="Exposure metadata and related fields from the ConsDB, Exposure Log and Transformed EFD"
            actions={
              <>
                <Popover>
                  <PopoverTrigger className="min-w-4 cursor-pointer">
                    <img src={DownloadIcon} />
                  </PopoverTrigger>
                  <PopoverContent className="bg-black text-white text-sm border-yellow-700">
                    This is a placeholder for the download/export button. Once
                    implemented, clicking here will download the data shown in
                    the table to a .csv file.
                  </PopoverContent>
                </Popover>
                {/* Button to toggle timeline visibility */}
                <Button
                  onClick={() => setTimelineVisible((prev) => !prev)}
                  className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
                >
                  {timelineVisible ? "Hide Timeline" : "Show Timeline"}
                </Button>
                {/* Button to toggle tips visibility */}
                <Button
                  onClick={() => setTipsVisible((prev) => !prev)}
                  className="bg-amber-400 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-amber-300 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
                >
                  {tipsVisible ? "Hide Tips" : "Show Tips"}
                </Button>
              </>
            }
          />

          {/* Timeline Tips */}
          {tipsVisible && (
            <TipsCard title="Timeline Tips">
              <div>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    <span className="font-medium">Click & Drag</span> on the
                    timeline to select a time range. The table will filter to
                    show only exposures within the selected range.
                  </li>
                  <li>
                    <span className="font-medium">Double-Click</span> on the
                    timeline to reset the selection to the full time range.
                  </li>
                  <li>
                    Hold <span className="font-medium">Shift</span> before
                    starting a new selection to extend the current selection
                    instead of starting a new one.
                  </li>
                  <li>
                    <span className="font-medium">Right-Click</span> on the
                    timeline to see options, including jumping to other pages.
                    These jumps will keep your current time selection.
                  </li>
                </ul>
                <p className="ml-5 mt-2">
                  Twilights are shown as blue lines, moon above the horizon is
                  highlighted in yellow, and moon illumination (%) is displayed
                  above the timeline at local Chilean midnight. All times
                  displayed are <span className="font-light">obs start</span>{" "}
                  times in TAI (UTC+37s).
                </p>
              </div>
            </TipsCard>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {dataLogLoading || almanacLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <ContextMenuWrapper menuItems={contextMenuItems}>
                  <TimelineChart
                    data={[
                      {
                        index: 0.5,
                        timestamps: dataLogEntries.map(
                          (d) => d.obs_start_millis,
                        ),
                        color: "#3CAE3F",
                        isActive: true,
                      },
                    ]}
                    twilightValues={twilightValues}
                    showTwilight={twilightValues.length > 1}
                    illumValues={illumValues}
                    showMoonIllumination={true}
                    moonIntervals={moonIntervals}
                    showMoonArea={true}
                    fullTimeRange={fullTimeRange}
                    selectedTimeRange={selectedTimeRange}
                    setSelectedTimeRange={setSelectedTimeRange}
                  />
                </ContextMenuWrapper>
              )}
            </Card>
          )}

          {/* Editable Time Range */}
          <SelectedTimeRangeBar
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            fullTimeRange={fullTimeRange}
            rightContent={
              dataLogLoading || almanacLoading ? (
                <Skeleton className="h-5 w-64 bg-stone-700 inline-block" />
              ) : (
                `${filteredDataLogEntries.length} of ${dataLogEntries.length} exposures selected`
              )
            }
          />

          {/* Table Tips */}
          {tipsVisible && (
            <TipsCard title="Table Tips">
              <ul className="list-disc list-outside ml-5 space-y-1">
                <li>
                  Use the
                  <span className="font-bold text-lg text-teal-300">
                    {" ⋮ "}
                  </span>
                  menu in column headers to filter, sort, group, or hide
                  columns.
                </li>
                <li>
                  Table customisations (such as filtering, sorting, grouping,
                  and hiding columns) do not persist across page navigations.
                  However, they will persist while querying different dates or
                  date ranges on this page.
                </li>
                <li>
                  If data doesn't appear as expected, try resetting the table.
                </li>
              </ul>
            </TipsCard>
          )}
        </div>

        {/* Table */}
        <DataLogTable
          telescope={telescope}
          data={filteredDataLogEntries}
          dataLogLoading={dataLogLoading}
          tableFilters={tableFilters}
        />
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default DataLog;
