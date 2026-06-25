import { useEffect, useState, useMemo, useRef } from "react";
import { DateTime } from "luxon";

import { useSearch } from "@tanstack/react-router";

import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import { useNotifications } from "@/hooks/useNotifications";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import TimelineChart from "@/components/TimelineChart";
import ObservatoryStatusTimeline from "@/components/ObservatoryStatusTimeline";
import ContextFeedTable from "@/components/ContextFeedTable.jsx";
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";
import { SERIES_ORDER } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  getStatusLabel,
  getStateChangeDescription,
} from "@/utils/observatoryStatusUtils";
import { contextFeedColumns } from "@/components/ContextFeedColumns";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import PageHeader from "@/components/PageHeader";
import TipsCard from "@/components/TipsCard";
import SelectedTimeRangeBar from "@/components/SelectedTimeRangeBar";
import DownloadIcon from "../assets/DownloadIcon.svg";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import {
  fetchAlmanac,
  fetchContextFeedFromRubinNights,
  fetchBlockDetails,
  fetchObsStatusFromRubinNights,
} from "@/utils/fetchUtils";
import { mergeContextFeedSources, getBlockSourceLabel } from "@/utils/utils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { prepareAlmanacData } from "@/utils/timelineUtils";
import { useUrlSync, useSelectionSync } from "@/components/DataTable";

// This filters out the non-selected telescope's exposures, queues and
// narrative logs from the default display.
const filterDefaultEventsByTelescope = (telescope) => {
  const eventTypes = Object.values(CATEGORY_INDEX_INFO).map(
    (info) => info.label,
  );

  // Define which labels to exclude per telescope
  const exclusions = {
    Simonyi: [
      "AT Queue",
      "AuxTel Exposure",
      "Narrative Log (AuxTel)",
      "Error (AuxTel)",
      "AUTOLOG (AuxTel)",
    ],
    AuxTel: [
      "MT Queue",
      "Simonyi Exposure",
      "Narrative Log (Simonyi)",
      "Error (Simonyi)",
      "AUTOLOG (Simonyi)",
    ],
  };

  if (telescope && exclusions[telescope]) {
    return eventTypes.filter((label) => !exclusions[telescope].includes(label));
  }

  return eventTypes;
};

function ContextFeed() {
  // Subscribe component to URL params
  const search = useSearch({
    from: "/context-feed",
  });
  const { startDayobs, endDayobs, telescope } = search;

  // Our dayobs inputs are inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  // (which are exclusive of the end date).
  const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/context-feed");

  // Selection state synced with URL
  const { selectedValue, setSelectedValue } = useSelectionSync({
    routePath: "/context-feed",
    paramName: "selectedTime",
  });

  // Data and loading flags
  const [rubinNightsData, setRubinNightsData] = useState([]);
  const [rubinNightsDataLoading, setRubinNightsDataLoading] = useState(true);
  const [blockLookup, setBlockLookup] = useState({});
  const [blockLookupLoading, setBlockLookupLoading] = useState(true);

  // Almanac data for timeline
  const [twilightValues, setTwilightValues] = useState([]);
  const [twilight0DegValues, setTwilight0DegValues] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(false);

  // Observatory status data
  const [obsStatusEntries, setObsStatusEntries] = useState([]);
  const [obsStatusLoading, setObsStatusLoading] = useState(false);

  // Visibility toggles
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(false);

  const {
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  // Default event type filters based on telescope
  const defaultEventTypes = filterDefaultEventsByTelescope(telescope);

  // The table filter state is hoisted up here in order to allow
  // the timeline checkboxes to interact with it
  // It is also synced with the page URL

  const { columnFilters, setColumnFilters, resetFilters } = useUrlSync({
    routePath: "/context-feed",
    columns: contextFeedColumns,
    defaultFilters: [{ id: "event_type", value: defaultEventTypes }],
  });

  // Apply telescope-specific default filters when telescope changes
  const prevTelescopeRef = useRef(telescope);
  useEffect(() => {
    if (prevTelescopeRef.current !== telescope) {
      prevTelescopeRef.current = telescope;
      // Reset to new telescope's defaults
      resetFilters();
    }
  }, [telescope, resetFilters]);

  const contextMenuItems = [
    {
      label: "View Data Log",
      to: "/nightlydigest/data-log",
      search,
    },
    {
      label: "View Plots",
      to: "/nightlydigest/plots",
      search,
    },
  ];

  // Handler for timeline checkboxes (eventType filters)
  const toggleEvents = (key, checked) => {
    setColumnFilters((prev) => {
      // Determine currently selected event types
      const prevFilter = prev.find((f) => f.id === "event_type");
      let selectedEventKeys = prevFilter
        ? prevFilter.value
            .map(
              (label) =>
                // Map label back to key
                Object.entries(CATEGORY_INDEX_INFO).find(
                  ([, info]) => info.label === label,
                )?.[0],
            )
            .filter(Boolean)
        : Object.keys(CATEGORY_INDEX_INFO);

      // Update selected keys based on the checkbox toggle
      selectedEventKeys = checked
        ? [...selectedEventKeys, key]
        : selectedEventKeys.filter((k) => k !== key);

      // Build new columnFilters object for TanStack Table
      return [
        {
          id: "event_type",
          value: selectedEventKeys.map((k) => CATEGORY_INDEX_INFO[k].label),
        },
      ];
    });
  };

  useEffect(() => {
    // In case we need to cancel a fetch
    const abortController = new AbortController();

    setRubinNightsDataLoading(true);
    setAlmanacLoading(true);
    setObsStatusLoading(true);
    clearNotifications();

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        const { twilightValues, twilight0DegValues } = prepareAlmanacData(
          almanac,
          { utc: true },
        );
        setTwilightValues(twilightValues);
        setTwilight0DegValues(twilight0DegValues);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching almanac data:", err);
          addNotification({
            type: "error",
            source: "almanac",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    fetchContextFeedFromRubinNights(startDayobs, endDayobs, abortController)
      .then(([data]) => {
        if (data.length === 0) {
          addNotification({
            type: "noData",
            source: "context-feed",
            title: "No Context Feed entries found",
            description:
              "The table and the timeline will be empty for the selected date range.",
          });
        }

        setRubinNightsData(data);
      })
      .catch((err) => {
        // If the error is not caused by the fetch being aborted
        // then notify the error.
        if (!abortController.signal.aborted) {
          console.error(
            "Error fetching Context Feed data from Rubin Nights",
            err,
          );
          addNotification({
            type: "error",
            source: "context-feed",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setRubinNightsDataLoading(false);
        }
      });

    fetchObsStatusFromRubinNights({
      start: startDayobs,
      end: endDayobs,
      abortController,
    })
      .then((data) => {
        setObsStatusEntries(data.entries ?? []);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching observatory status:", err);
          addNotification({
            type: "error",
            source: "obs-status",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setObsStatusLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // Fetch BLOCK details from Zephyr/Jira
  useEffect(() => {
    const abortController = new AbortController();

    if (rubinNightsData.length === 0) {
      return; // don't know which BLOCK to query
    }

    setBlockLookupLoading(true);

    // Extract unique BLOCKs from rubin-nights data
    const newBlockOrFBS = rubinNightsData.filter(
      (e) => e.category_index === 10,
    );
    const names = newBlockOrFBS.map((e) => e.name);
    const blockKeys = [...new Set(names)];

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
              source: `${source}-blocks`,
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
            source: "jira-blocks",
          });
          addNotification({
            type: "error",
            source: "zephyr-blocks",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setBlockLookupLoading(false);
        }
      });
  }, [rubinNightsData]);

  // Global table loading flag
  const tableLoading =
    rubinNightsDataLoading ||
    almanacLoading ||
    blockLookupLoading ||
    obsStatusLoading;

  // Convert observatory status entries to context feed rows
  const obsStatusFeedRows = useMemo(() => {
    return obsStatusEntries.map((entry, i) => {
      const timeUTC = DateTime.fromMillis(entry.time_ms, { zone: "utc" });
      return {
        time: entry.time,
        event_time_dt: timeUTC,
        event_time_millis: entry.time_ms,
        event_type: "Observatory Status",
        event_color: "#ffffff",
        displayIndex: null,
        name: getStateChangeDescription(obsStatusEntries, i),
        description: entry.note ?? "",
      };
    });
  }, [obsStatusEntries]);

  // Merge data sources together to form one object
  // to pass to TanStack Table.
  const contextFeedTableData = useMemo(() => {
    if (tableLoading) return [];

    const feedRows = rubinNightsData.length
      ? mergeContextFeedSources(rubinNightsData, blockLookup)
      : [];

    return [...feedRows, ...obsStatusFeedRows].sort(
      (a, b) => a.event_time_millis - b.event_time_millis,
    );
  }, [tableLoading, rubinNightsData, blockLookup, obsStatusFeedRows]);

  // Filter data based on selected time range
  const filteredData = useMemo(
    () =>
      contextFeedTableData.filter(
        (entry) =>
          entry.event_time_dt >= selectedTimeRange[0] &&
          entry.event_time_dt <= selectedTimeRange[1],
      ),
    [contextFeedTableData, selectedTimeRange],
  );

  const displayedNotifications = tableLoading
    ? processedNotifications.filter(
        (notification) => notification.type !== "error",
      )
    : processedNotifications;
  const timelineSeriesData = useMemo(() => {
    return Object.values(CATEGORY_INDEX_INFO)
      .filter((info) => info.displayIndex != null)
      .sort((a, b) => a.displayIndex - b.displayIndex)
      .map((info, _idx, arr) => ({
        index: arr.length - info.displayIndex + 1,
        label: info.label,
        timestamps: contextFeedTableData
          .filter((d) => d.displayIndex === info.displayIndex)
          .map((d) => d.event_time_millis),
        color: info.color,
      }));
  }, [contextFeedTableData]);

  const timelineData = useMemo(() => {
    const activeLabels =
      columnFilters.find((f) => f.id === "event_type")?.value ?? [];
    return timelineSeriesData.map((series) => ({
      ...series,
      isActive: activeLabels.includes(series.label),
    }));
  }, [timelineSeriesData, columnFilters]);

  return (
    <>
      <div className="flex flex-col w-full h-screen p-8 gap-4">
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
            title="Context Feed"
            description="Chronologically ordered log of exposures, scripts, errors and narrations."
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
                  {timelineVisible ? "Hide Timelines" : "Show Timelines"}
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
                    Blue lines are 12° twilights. Dashed white lines are 0°
                    twilights. All event times are UTC.
                  </li>
                </ul>
              </div>
            </TipsCard>
          )}

          {/* Observatory Status Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {obsStatusLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <div className="flex flex-row min-w-0">
                  {/* State Labels */}
                  <div
                    className="flex flex-col w-45"
                    style={{
                      paddingTop: "30px",
                      paddingBottom: "20px",
                    }}
                  >
                    {SERIES_ORDER.map((stateName) => (
                      <div
                        key={stateName}
                        className="flex items-center"
                        style={{
                          height: "20px",
                        }}
                      >
                        <span className="text-xs text-stone-200">
                          {getStatusLabel(stateName)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <ObservatoryStatusTimeline
                      entries={obsStatusEntries}
                      twilightValues={twilightValues}
                      twilight0DegValues={twilight0DegValues}
                      fullTimeRange={fullTimeRange}
                      selectedTimeRange={selectedTimeRange}
                      setSelectedTimeRange={setSelectedTimeRange}
                      brushGroup="context-feed"
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {tableLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <div className="flex flex-row min-w-0">
                  {/* Event Type Checkboxes */}
                  <div className="mt-8 flex flex-col gap-1 w-45">
                    {Object.entries(CATEGORY_INDEX_INFO)
                      .filter(([, info]) => info.displayIndex != null) // exclude AUTOLOG
                      .sort(
                        // sort on displayIndex
                        ([, aInfo], [, bInfo]) =>
                          (aInfo.displayIndex ?? 0) - (bInfo.displayIndex ?? 0),
                      )
                      .map(([key, info]) => {
                        // Determine if checkbox should be checked
                        const checked = columnFilters
                          .find((f) => f.id === "event_type")
                          ?.value.includes(info.label);
                        return (
                          <div
                            key={key}
                            className="flex items-center space-x-2 opacity-100"
                          >
                            <Checkbox
                              checked={!!checked}
                              onCheckedChange={(checked) =>
                                toggleEvents(key, !!checked)
                              }
                              style={{ borderColor: info.color }}
                            />
                            <span className="text-xs text-stone-200">
                              {info.label}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <ContextMenuWrapper menuItems={contextMenuItems}>
                      <TimelineChart
                        data={timelineData}
                        twilightValues={twilightValues}
                        fullTimeRange={fullTimeRange}
                        selectedTimeRange={selectedTimeRange}
                        setSelectedTimeRange={setSelectedTimeRange}
                        brushGroup="context-feed"
                      />
                    </ContextMenuWrapper>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Editable Time Range */}
          <SelectedTimeRangeBar
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            fullTimeRange={fullTimeRange}
            rightContent={
              tableLoading ? (
                <Skeleton className="h-5 w-64 bg-teal-700 inline-block" />
              ) : (
                `${filteredData.length} of ${contextFeedTableData.length} events selected`
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
                  Collapse/expand tracebacks & YAMLs by clicking cells or using
                  checkboxes.
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
        <ContextFeedTable
          data={filteredData}
          dataLoading={tableLoading}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
          resetFilters={resetFilters}
          blockLookup={blockLookup}
          selected={selectedValue}
          onSelectionChange={setSelectedValue}
        />
      </div>
    </>
  );
}

export default ContextFeed;
