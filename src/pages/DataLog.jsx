import { useState, useEffect, useMemo } from "react";
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
import Header from "@/components/Header";
import TipsCard from "@/components/TipsCard";
import SelectedTimeRangeBar from "@/components/SelectedTimeRangeBar";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import {
  EmptyDisplayState,
  renderHeaderWarning,
} from "@/components/AppletCard";
import { SOURCE, BLOCK_DETAIL_SOURCES } from "@/constants/DATA_SOURCES";
import { resolveDisplayState } from "@/utils/displayState";
import DownloadIcon from "../assets/DownloadIcon.svg";
import {
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
  fetchAlmanac,
  fetchBlockDetails,
} from "@/utils/fetchUtils";
import { mergeAllDataLogSources, getBlockSourceLabel } from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import { isScientificNightlyDigest } from "@/utils/appConfig";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import {
  prepareAlmanacData,
  prepareMoonIntervals,
} from "@/utils/timelineUtils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { useSelectionSync } from "@/components/DataTable";

/**
 * Render the Data Log page: merged exposure, script and narrative log data in a
 * filterable table with selection, plus observatory status timelines.
 */
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
    ...(isScientificNightlyDigest
      ? []
      : [
          {
            label: "View Context Feed",
            to: "/context-feed",
            search,
          },
        ]),
    {
      label: "View Plots",
      to: "/plots",
      search,
    },
  ];

  // Data and loading flags
  const [consDBdata, setConsDBdata] = useState([]);
  const [consDBdataLoading, setConsDBdataLoading] = useState(true);
  const [exposureLogData, setExposureLogData] = useState([]);
  const [exposureLogDataLoading, setExposureLogDataLoading] = useState(true);
  const [blockLookup, setBlockLookup] = useState({});
  const [blockLookupLoading, setBlockLookupLoading] = useState(true);

  // Source status flags (no-data vs fetch-error) for each data source
  const [dataLogNoData, setDataLogNoData] = useState(false);
  const [dataLogError, setDataLogError] = useState(false);
  const [exposureLogNoData, setExposureLogNoData] = useState(false);
  const [exposureLogError, setExposureLogError] = useState(false);

  // Almanac data for timeline
  const [twilightValues, setTwilightValues] = useState([]);
  const [illumValues, setIllumValues] = useState([]);
  const [moonValues, setMoonValues] = useState([]);
  const [moonIntervals, setMoonIntervals] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [almanacNoData, setAlmanacNoData] = useState(false);
  const [almanacError, setAlmanacError] = useState(false);

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
  // Selection state synced with URL
  const { selectedValue, setSelectedValue } = useSelectionSync({
    routePath: "/data-log",
    paramName: "selectedExposureId",
  });

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
    setAlmanacNoData(false);
    setAlmanacError(false);
    setTwilightValues([]);
    setIllumValues([]);
    setMoonValues([]);
    clearNotifications();

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        if (!almanac || almanac.length === 0) {
          setAlmanacNoData(true);
        }
        const { twilightValues, illumValues, moonValues } =
          prepareAlmanacData(almanac);
        setTwilightValues(twilightValues);
        setIllumValues(illumValues);
        setMoonValues(moonValues);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setAlmanacError(true);
          console.error("Error fetching almanac data:", err);
          addNotification({
            type: "error",
            source: SOURCE.ALMANAC,
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
    setDataLogNoData(false);
    setDataLogError(false);

    fetchDataLogEntriesFromConsDB(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((consDBData) => {
        const dataLog = consDBData.data_log ?? [];
        if (dataLog.length === 0) {
          setDataLogNoData(true);
          addNotification({
            type: "noData",
            source: SOURCE.DATA_LOG,
            title: "No exposures found in ConsDB",
            description:
              "Table and timeline will appear empty for the selected date range.",
          });
        }

        setConsDBdata(dataLog);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setConsDBdata([]);
          setDataLogError(true);
          console.error("Error fetching data log entries:", err);
          addNotification({
            type: "error",
            source: SOURCE.DATA_LOG,
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
    setExposureLogNoData(false);
    setExposureLogError(false);

    fetchDataLogEntriesFromExposureLog(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((exposureLogData) => {
        if (!exposureLogData || exposureLogData.length === 0) {
          setExposureLogNoData(true);
        }
        setExposureLogData(exposureLogData);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setExposureLogData([]);
          setExposureLogError(true);
          console.error("Error fetching exposure log entries:", err);
          addNotification({
            type: "error",
            source: SOURCE.EXPOSURE_ENTRIES,
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
      setBlockLookupLoading(false);
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
              source: BLOCK_DETAIL_SOURCES[source] ?? SOURCE.BLOCK_DETAILS,
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
            source: SOURCE.JIRA_BLOCKS,
          });
          addNotification({
            type: "error",
            source: SOURCE.ZEPHYR_BLOCKS,
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
    tableLoading || almanacLoading
      ? processedNotifications.filter(
          (notification) => notification.type !== "error",
        )
      : processedNotifications;

  // The data log (ConsDB) is required to draw the table; almanac and
  // exposure entries are optional. A single resolved status handles both:
  // required-source problems show a message below the table, while optional-
  // source problems surface as a header warning once the table is ready.
  const dataLogSources = {
    [SOURCE.DATA_LOG]: dataLogError
      ? { ok: false }
      : dataLogNoData
        ? { ok: true, noData: true }
        : { ok: true },
    [SOURCE.ALMANAC]: almanacError
      ? { ok: false }
      : almanacNoData
        ? { ok: true, noData: true }
        : { ok: true },
    [SOURCE.EXPOSURE_ENTRIES]: exposureLogError
      ? { ok: false }
      : exposureLogNoData
        ? { ok: true, noData: true }
        : { ok: true },
  };

  // Loading here only tracks the table sources (the timeline additionally
  // depends on almanac and gates on `tableLoading || almanacLoading` below).
  const dataLogState = resolveDisplayState({
    sources: dataLogSources,
    required: [SOURCE.DATA_LOG],
    loading: tableLoading,
  });

  const showDataLogMessage =
    dataLogState.state === "error" || dataLogState.state === "noData";

  return (
    <>
      <div className="flex flex-col h-screen w-full p-8 gap-4">
        {displayedNotifications.length > 0 && (
          <NotificationBannerStack
            notifications={displayedNotifications}
            onDismiss={removeNotification}
          />
        )}
        {/* Page Header, Timeline & Tips Banners */}
        <div className="flex flex-col gap-2">
          {/* Page title + buttons */}
          <Header
            isPageHeader={true}
            title="Data Log"
            description="Exposure metadata and related fields from the ConsDB, Exposure Log, Transformed EFD, Zephyr & Jira."
            titleBadge={renderHeaderWarning(dataLogState)}
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
                  <li>
                    <span className="font-bold">Drag</span> the selection to
                    reposition
                  </li>
                  <li>
                    <span className="font-bold">Drag</span> the edges of the
                    selection to resize
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
                <ContextMenuWrapper
                  menuItems={contextMenuItems}
                  style={{ minWidth: 0 }}
                >
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
          selected={selectedValue}
          onSelectionChange={setSelectedValue}
        />

        {showDataLogMessage && (
          <EmptyDisplayState variant="page" message={dataLogState.message} />
        )}
      </div>
    </>
  );
}

export default DataLog;
