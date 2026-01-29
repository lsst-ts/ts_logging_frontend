import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { TELESCOPES } from "@/components/Parameters";
import DataLogTable from "@/components/DataLogTable.jsx";
import TimelineChart from "@/components/TimelineChart";
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
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import EditableDateTimeInput from "@/components/EditableDateTimeInput.jsx";

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

  // For display on page
  const dateRangeString =
    startDayobs === endDayobs
      ? `on dayobs ${startDayobs}`
      : `in dayobs range ${startDayobs}–${endDayobs}`;

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
        {/* Page title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">Data</span>
          <span className="font-extrabold">Log</span>
        </h1>

        {/* Info section */}
        <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          {dataLogLoading || almanacLoading ? (
            <>
              <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
              <Skeleton className="h-5 w-[90%] max-w-2xl bg-stone-700" />
            </>
          ) : (
            <>
              <p>
                {filteredDataLogEntries.length} of {dataLogEntries.length}{" "}
                exposures shown for {telescope} {dateRangeString}.
              </p>
              <div className="flex flex-col max-w-xxl mt-6 border border-1 border-white rounded-md p-2 gap-2">
                <ul className="list-disc list-inside">
                  <li>
                    <span className="font-medium">Click & Drag</span> on the
                    timeline to select a time range. The table will filter to
                    show only exposures within the selected range
                  </li>
                  <li>
                    <span className="font-medium">Double-Click</span> on the
                    timeline to reset the selection to the full time range
                  </li>
                  <li>
                    Hold <span className="font-medium">Shift</span> before
                    starting a new selection to extend the current selection
                    instead of starting a new one
                  </li>
                  <li>
                    <span className="font-medium">Right-Click</span> on the
                    timeline to see options, including jumping to other pages.
                    These jumps will keep your current time selection
                  </li>
                </ul>
                <p>
                  Twilights are shown as blue lines, moon above the horizon is
                  highlighted in yellow, and moon illumination (%) is displayed
                  above the timeline at local Chilean midnight. All times
                  displayed are <span className="font-light">obs start</span>{" "}
                  times in TAI (UTC+37s).
                </p>
                <p>
                  <span className="font-bold">Note:</span> Table customisations
                  (such as filtering, sorting, column hiding, and grouping) do
                  not persist across page navigations. However, they will
                  persist while querying different dates or date ranges on this
                  page. If data doesn't appear as expected, try resetting the
                  table.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Timeline */}
        {dataLogLoading || almanacLoading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <>
            <ContextMenuWrapper menuItems={contextMenuItems}>
              <TimelineChart
                data={[
                  {
                    index: 0.5,
                    timestamps: dataLogEntries.map((d) => d.obs_start_millis),
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

            {/* Selected Time Range Inputs */}
            <div className="flex flex-row justify-center items-center gap-2 text-white font-thin">
              <EditableDateTimeInput
                value={selectedTimeRange[0]}
                onValidChange={(dt) =>
                  setSelectedTimeRange([dt, selectedTimeRange[1]])
                }
                fullTimeRange={fullTimeRange}
                otherBound={selectedTimeRange[1]}
                isStart={true}
              />
              <span>-</span>
              <EditableDateTimeInput
                value={selectedTimeRange[1]}
                onValidChange={(dt) =>
                  setSelectedTimeRange([selectedTimeRange[0], dt])
                }
                fullTimeRange={fullTimeRange}
                otherBound={selectedTimeRange[0]}
                isStart={false}
              />
            </div>
          </>
        )}

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
