import { useEffect, useState, useMemo, useRef } from "react";

import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useSearch } from "@tanstack/react-router";

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
import ContextFeedTable from "@/components/ContextFeedTable.jsx";
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";
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
} from "@/utils/fetchUtils";
import { mergeContextFeedSources, getBlockSourceLabel } from "@/utils/utils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { prepareAlmanacData } from "@/utils/timelineUtils";
import { useUrlSync } from "@/components/DataTable";

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

  // Data and loading flags
  const [rubinNightsData, setRubinNightsData] = useState([]);
  const [rubinNightsDataLoading, setRubinNightsDataLoading] = useState(false);
  const [blockLookup, setBlockLookup] = useState({});
  const [blockLookupLoading, setBlockLookupLoading] = useState(false);

  // Almanac data for timeline
  const [twilightValues, setTwilightValues] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(false);

  // Visibility toggles
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(false);

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

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        if (almanac === null) {
          toast.warning(
            "No almanac data available. Context Feed will be displayed without accompanying almanac information.",
          );
        } else {
          const { twilightValues } = prepareAlmanacData(almanac);
          setTwilightValues(twilightValues);
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

    fetchContextFeedFromRubinNights(startDayobs, endDayobs, abortController)
      .then(([data]) => {
        if (data.length === 0) {
          toast.warning("No Context Feed entries found in the date range.");
        }

        setRubinNightsData(data);
      })
      .catch((err) => {
        // If the error is not caused by the fetch being aborted
        // then toast the error message.
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching Context Feed data from Rubin-nights!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setRubinNightsDataLoading(false);
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
            toast.error(
              `Error fetching BLOCK descriptions from ${getBlockSourceLabel(
                source,
              )}`,
              {
                description: message,
                duration: Infinity,
              },
            );
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setBlockLookup({});
          const msg = err?.message;
          toast.error("Error fetching BLOCK descriptions from Zephyr/Jira", {
            description: msg,
            duration: Infinity,
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
    rubinNightsDataLoading || almanacLoading || blockLookupLoading;

  // Merge data sources together to form one object
  // to pass to TanStack Table.
  const contextFeedTableData = useMemo(() => {
    if (tableLoading) return [];
    if (!rubinNightsData.length) return [];

    return mergeContextFeedSources(rubinNightsData, blockLookup);
  }, [tableLoading, rubinNightsData, blockLookup]);

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

  const timelineData = useMemo(() => {
    const activeLabels =
      columnFilters.find((f) => f.id === "event_type")?.value ?? [];
    return Object.values(CATEGORY_INDEX_INFO)
      .filter((info) => info.displayIndex != null)
      .map((info, _idx, arr) => {
        return {
          index: arr.length - info.displayIndex + 1,
          timestamps: contextFeedTableData
            .filter((d) => d.displayIndex === info.displayIndex)
            .map((d) => d.event_time_millis),
          color: info.color,
          isActive: activeLabels.includes(info.label),
        };
      });
  }, [contextFeedTableData, columnFilters]);

  return (
    <>
      <div className="flex flex-col w-full h-screen px-8 pb-8 gap-4">
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
                    <span className="font-bold">Shift + Drag</span> to extend
                    selection.
                  </li>

                  <li>
                    <span className="font-bold">Double-Click</span> to reset.
                  </li>
                  <li>
                    <span className="font-bold">Right-Click</span> for more
                    options (keeps selection).
                  </li>
                  <li>Blue lines are twilights. All event times are UTC.</li>
                </ul>
              </div>
            </TipsCard>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {tableLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <div className="flex flex-row">
                  {/* Event Type Checkboxes */}
                  <div className="mt-2 flex flex-col gap-1 w-45">
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
                  <div className="flex-1">
                    <ContextMenuWrapper menuItems={contextMenuItems}>
                      <TimelineChart
                        data={timelineData}
                        twilightValues={twilightValues}
                        showTwilight={true}
                        height={timelineData.length * 20 + 70}
                        fullTimeRange={fullTimeRange}
                        selectedTimeRange={selectedTimeRange}
                        setSelectedTimeRange={setSelectedTimeRange}
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
        />
      </div>
      {/* Error / warning / info message pop-ups */}
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default ContextFeed;
