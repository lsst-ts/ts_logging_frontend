import { useEffect, useState, useMemo } from "react";

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
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import PageHeader from "@/components/PageHeader";
import TipsCard from "@/components/TipsCard";
import SelectedTimeRangeBar from "@/components/SelectedTimeRangeBar";
import DownloadIcon from "../assets/DownloadIcon.svg";
import { fetchAlmanac, fetchContextFeed } from "@/utils/fetchUtils";
import { isoToUTC } from "@/utils/timeUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { prepareAlmanacData } from "@/utils/timelineUtils";

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
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/context-feed");

  const [contextFeedData, setContextFeedData] = useState([]);
  const [contextFeedLoading, setContextFeedLoading] = useState(true);
  const [twilightValues, setTwilightValues] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(true);

  // Timeline checkbox state is stored in the Table's columnFilters state.
  // While all other table state is kept inside ContextFeedTable.jsx,
  // This state is kept here so that the timeline checkboxes can update it.
  const [columnFilters, setColumnFilters] = useState([
    {
      id: "event_type",
      value: filterDefaultEventsByTelescope(telescope),
    },
  ]);

  // Update the "event_type" filter whenever telescope changes
  useEffect(() => {
    setColumnFilters((prevFilters) => {
      // Keep other filters
      const otherFilters = prevFilters.filter((f) => f.id !== "event_type");

      return [
        ...otherFilters,
        {
          id: "event_type",
          value: filterDefaultEventsByTelescope(telescope),
        },
      ];
    });
  }, [telescope]);

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
          value:
            selectedEventKeys.length > 0
              ? selectedEventKeys.map((k) => CATEGORY_INDEX_INFO[k].label)
              : Object.values(CATEGORY_INDEX_INFO).map((info) => info.label), // all==none
        },
      ];
    });
  };

  useEffect(() => {
    // In case we need to cancel a fetch
    const abortController = new AbortController();

    setContextFeedLoading(true);
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

    fetchContextFeed(startDayobs, endDayobs, abortController)
      .then(([data]) => {
        let currentTask = null;

        const preparedData = data
          .map((entry) => {
            if (entry.finalStatus === "Task Change") {
              currentTask = entry.name;
            }

            let categoryInfo = CATEGORY_INDEX_INFO[entry.category_index] || {};

            return {
              ...entry,
              event_time_dt: isoToUTC(entry["time"]),
              event_time_millis: isoToUTC(entry["time"]).toMillis(),
              event_type: categoryInfo.label,
              event_color: categoryInfo.color ?? "#ffffff",
              displayIndex: categoryInfo.displayIndex,
              current_task: currentTask,
            };
          })
          // Chronological order
          .sort((a, b) => a.event_time_millis - b.event_time_millis);

        setContextFeedData(preparedData);

        if (data.length === 0) {
          toast.warning("No Context Feed entries found in the date range.");
        }
      })
      .catch((err) => {
        // If the error is not caused by the fetch being aborted
        // then toast the error message.
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching Context Feed data!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setContextFeedLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // Filter data based on selected time range
  // and the event types selected by checkboxes
  const filteredData = useMemo(
    () =>
      contextFeedData.filter(
        (entry) =>
          entry.event_time_dt >= selectedTimeRange[0] &&
          entry.event_time_dt <= selectedTimeRange[1],
      ),
    [contextFeedData, selectedTimeRange],
  );

  const timelineData = useMemo(() => {
    const activeLabels =
      columnFilters.find((f) => f.id === "event_type")?.value ?? [];
    return Object.values(CATEGORY_INDEX_INFO)
      .filter((info) => info.displayIndex != null)
      .map((info, _idx, arr) => {
        return {
          index: arr.length - info.displayIndex + 1,
          timestamps: contextFeedData
            .filter((d) => d.displayIndex === info.displayIndex)
            .map((d) => d.event_time_millis),
          color: info.color,
          isActive:
            activeLabels.length === 0 || activeLabels.includes(info.label),
        };
      });
  }, [contextFeedData, columnFilters]);

  return (
    <>
      <div className="flex flex-col w-full h-screen p-8 gap-4">
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
                  Twilights are shown as blue lines. All times displayed are{" "}
                  <span className="font-light">event</span> times in UTC.
                </p>
              </div>
            </TipsCard>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {contextFeedLoading || almanacLoading ? (
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
                <li>
                  Collapse/expand tracebacks & YAMLs by clicking cells or using
                  checkboxes.
                </li>
              </ul>
            </TipsCard>
          )}
        </div>

        {/* Table */}
        <ContextFeedTable
          data={filteredData}
          dataLoading={contextFeedLoading}
          columnFilters={columnFilters}
          setColumnFilters={setColumnFilters}
        />
      </div>
      {/* Error / warning / info message pop-ups */}
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default ContextFeed;
