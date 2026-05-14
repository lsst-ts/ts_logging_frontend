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
  fetchBlockDetails,
} from "@/utils/fetchUtils";
import { mergeAllDataLogSources, getBlockSourceLabel } from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import {
  prepareAlmanacData,
  prepareMoonIntervals,
} from "@/utils/timelineUtils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";

function DataLog() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/data-log",
  });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

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

  // Data and loading flags
  const [consDBdata, setConsDBdata] = useState([]);
  const [consDBdataLoading, setConsDBdataLoading] = useState(false);
  const [exposureLogData, setExposureLogData] = useState([]);
  const [exposureLogDataLoading, setExposureLogDataLoading] = useState(false);
  const [blockLookup, setBlockLookup] = useState({});
  const [blockLookupLoading, setBlockLookupLoading] = useState(false);

  // Almanac data for timeline
  const [twilightValues, setTwilightValues] = useState([]);
  const [illumValues, setIllumValues] = useState([]);
  const [moonValues, setMoonValues] = useState([]);
  const [moonIntervals, setMoonIntervals] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Visibility toggles
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(false);

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/data-log");

  // Notification banners
  const {
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useNotifications();

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

  // Fetch almanac data for timeline
  useEffect(() => {
    // To cancel previous fetch if still in progress
    const abortController = new AbortController();

    // Trigger loading skeletons
    setAlmanacLoading(true);

    // Reset almanac state
    setTwilightValues([]);
    setIllumValues([]);
    setMoonValues([]);
    clearNotifications();
    toast.dismiss();

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        // when does this happen? if the date range is in the future and almanac data is not yet available?
        // should we show a different message for that case?
        // should we differentiate between no data vs error fetching data for almanac?
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
          console.error("Error fetching almanac:", err);
          addNotification({
            type: "error",
            source: "almanac",
            title: "Almanac data unavailable",
            description:
              "An error occurred while fetching almanac. Timeline will be displayed without accompanying almanac information.",
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

  // Fetch from ConsDB
  useEffect(() => {
    const abortController = new AbortController();

    setConsDBdataLoading(true);

    fetchDataLogEntriesFromConsDB(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((consDBData) => {
        const dataLog = consDBData.data_log ?? [];
        if (dataLog.length === 0) {
          addNotification({
            type: "noData",
            source: "data-log",
            title: "No exposure entries found in ConsDB",
            description:
              "Table and timeline will appear empty. Try a different date range.",
          });
        }

        setConsDBdata(dataLog);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setConsDBdata([]);
          console.error("Error fetching data log entries:", err);
          addNotification({
            type: "error",
            source: "data-log",
            title: "Data log data unavailable",
            description: "Error fetching exposure log or data log",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setConsDBdataLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Fetch flags and comments from Exposure Log
  useEffect(() => {
    const abortController = new AbortController();

    setExposureLogDataLoading(true);

    fetchDataLogEntriesFromExposureLog(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((exposureLogData) => {
        setExposureLogData(exposureLogData);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setExposureLogData([]);
          console.error("Error fetching exposure log entries:", err);
          addNotification({
            type: "error",
            source: "exposure-log",
            title: "Exposure log data unavailable",
            description:
              "Error fetching exposure log data. Flags and comments will be missing from the table.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setExposureLogDataLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Fetch BLOCK details from Zephyr/Jira
  useEffect(() => {
    const abortController = new AbortController();

    if (consDBdata.length === 0) {
      return; // don't know which BLOCKs to query
    }

    setBlockLookupLoading(true);

    // Extrace unique BLOCKs from ConsDB data
    const blockKeys = [...new Set(consDBdata.map((e) => e.science_program))];

    // There is nothing to fetch
    if (blockKeys.length === 0) {
      setBlockLookupLoading(false);
      return;
    }

    fetchBlockDetails(blockKeys, abortController)
      .then((blocks) => {
        setBlockLookup(blocks.data);

        // Handle partial errors (one of Zephyr/Jira failing)
        if (blocks.errors) {
          Object.entries(blocks.errors).forEach(([source, message]) => {
            addNotification({
              type: "error",
              source: `${getBlockSourceLabel(source)}`,
              title: "Error fetching BLOCK descriptions",
              description:
                "An error occurred while fetching context feed data.",
            });
            console.error(
              `Error fetching BLOCK descriptions from ${getBlockSourceLabel(
                source,
              )}`,
              message,
            );
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setBlockLookup({});
          console.error(
            "Error fetching BLOCK descriptions from Zephyr/Jira",
            err,
          );
          addNotification({
            type: "error",
            source: "block-lookup",
            title: "Error fetching BLOCK descriptions",
            description:
              "An error occurred while fetching BLOCK descriptions from Zephyr/Jira.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setBlockLookupLoading(false);
        }
      });
  }, [consDBdata]);

  // Global table loading flag
  const tableLoading =
    consDBdataLoading || exposureLogDataLoading || blockLookupLoading;

  // Merge data sources together to form one object
  // to pass to TanStack Table.
  const dataLogTableData = useMemo(() => {
    if (tableLoading) return [];
    if (!consDBdata.length) return [];

    return mergeAllDataLogSources(consDBdata, exposureLogData, blockLookup);
  }, [tableLoading, consDBdata, exposureLogData, blockLookup]);

  // Filter data based on selected time range for the table
  const filteredDataLogTableData = useMemo(() => {
    if (!selectedTimeRange[0] || !selectedTimeRange[1]) {
      return dataLogTableData;
    }
    const [startMillis, endMillis] = [
      selectedTimeRange[0].toMillis(),
      selectedTimeRange[1].toMillis(),
    ];
    return dataLogTableData.filter((entry) => {
      const obsStartMillis = entry.obs_start_millis;
      return obsStartMillis >= startMillis && obsStartMillis <= endMillis;
    });
  }, [dataLogTableData, selectedTimeRange]);

  const displayedNotifications =
    tableLoading || almanacLoading ? [] : processedNotifications;

  return (
    <>
      <div className="flex flex-col h-screen w-full p-8 gap-6">
        {displayedNotifications.length > 0 && (
          <NotificationBannerStack
            notifications={displayedNotifications}
            onDismiss={removeNotification}
          />
        )}
        {/* Page Header, Timeline & Tips Banners */}
        <div className="flex flex-col gap-2">
          {/* Page title + buttons */}
          <PageHeader
            title="Data Log"
            description="Exposure metadata and related fields from the ConsDB, Exposure Log, Transformed EFD, Zephyr & Jira."
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
                    <span className="font-bold">Drag</span> to select a time
                    range (table updates automatically).
                  </li>
                  <li>Drag the edges of the selection to resize.</li>
                  <li>
                    The selected time range can also be dragged to reposition.
                  </li>
                  <li>
                    <span className="font-bold">Double-Click</span> to reset.
                  </li>
                  <li>
                    <span className="font-bold">Right-Click</span> for more
                    options (keeps selection).
                  </li>
                  <li>
                    Blue lines are twilights and yellow shading is moon above
                    horizon.
                  </li>
                  <li>Moon illumination (%) is shown at Chilean midnight.</li>
                  <li>Exposures are shown at observation start times (TAI).</li>
                </ul>
              </div>
            </TipsCard>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {tableLoading || almanacLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <ContextMenuWrapper menuItems={contextMenuItems}>
                  <TimelineChart
                    data={[
                      {
                        index: 1,
                        timestamps: dataLogTableData.map(
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
            timezone="TAI"
            rightContent={
              tableLoading || almanacLoading ? (
                <Skeleton className="h-5 w-64 bg-teal-700 inline-block" />
              ) : (
                `${filteredDataLogTableData.length} of ${dataLogTableData.length} exposures selected`
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
                  Filters remain active when changing dates or times. No
                  results? Clear filters or reset the table..
                </li>
              </ul>
            </TipsCard>
          )}
        </div>

        {/* Table */}
        <DataLogTable
          telescope={telescope}
          data={filteredDataLogTableData}
          dataLogLoading={tableLoading}
          blockLookup={blockLookup}
        />
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default DataLog;
