import { useEffect, useState } from "react";

import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { useRouter, useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import TimelineChart from "@/components/TimelineChart";
import ContextFeedTable from "@/components/ContextFeedTable.jsx";
import EditableDateTimeInput from "@/components/EditableDateTimeInput.jsx";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import { SAL_INDEX_INFO } from "@/components/context-feed-definitions.js";
import DownloadIcon from "../assets/DownloadIcon.svg";
import { fetchAlmanac, fetchContextFeed } from "@/utils/fetchUtils";
import { isoToUTC, utcDateTimeStrToMillis } from "@/utils/timeUtils";
import { getDatetimeFromDayobsStr } from "@/utils/utils";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";

// This filters out the non-selected telescope's exposures, queues and
// narrative logs from the default display.
const filterDefaultEventsByTelescope = (telescope) => {
  const eventTypes = Object.values(SAL_INDEX_INFO).map((info) => info.label);

  // Define which labels to exclude per telescope
  const exclusions = {
    Simonyi: [
      "AT Queue",
      "AuxTel Exposure",
      "Narrative Log (AuxTel)",
      "AUTOLOG - AuxTel",
    ],
    AuxTel: [
      "MT Queue",
      "Simonyi Exposure",
      "Narrative Log (Simonyi)",
      "AUTOLOG - Simonyi",
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
  const router = useRouter();

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
      onClick: () => {
        const location = router.buildLocation({
          to: "/nightlydigest/data-log",
          search,
        });
        window.open(location.href, "_blank");
      },
    },
    {
      label: "View Plots",
      onClick: () => {
        const location = router.buildLocation({
          to: "/nightlydigest/plots",
          search,
        });
        window.open(location.href, "_blank");
      },
    },
  ];

  // Currently unchanged from Plots version.
  // If remains unchanged, move to and import from utils
  function prepareAlmanacData(almanac) {
    // Set values for twilight lines
    const twilightValues = almanac
      .map((dayobsAlm) => [
        utcDateTimeStrToMillis(dayobsAlm.twilight_evening),
        utcDateTimeStrToMillis(dayobsAlm.twilight_morning),
      ])
      .flat();

    setTwilightValues(twilightValues);
  }

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
                Object.entries(SAL_INDEX_INFO).find(
                  ([, info]) => info.label === label,
                )?.[0],
            )
            .filter(Boolean)
        : Object.keys(SAL_INDEX_INFO);

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
              ? selectedEventKeys.map((k) => SAL_INDEX_INFO[k].label)
              : Object.values(SAL_INDEX_INFO).map((info) => info.label), // all==none
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
            "No almanac data available. Plots will be displayed without accompanying almanac information.",
          );
        } else {
          prepareAlmanacData(almanac);
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

            let salInfo = SAL_INDEX_INFO[entry.salIndex] || {};

            return {
              ...entry,
              event_time_dt: isoToUTC(entry["time"]),
              event_time_millis: isoToUTC(entry["time"]).toMillis(),
              event_type: salInfo.label,
              event_color: salInfo.color ?? "#ffffff",
              displayIndex: salInfo.displayIndex,
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
  const filteredData = contextFeedData.filter(
    (entry) =>
      entry.event_time_dt >= selectedTimeRange[0] &&
      entry.event_time_dt <= selectedTimeRange[1],
  );

  return (
    <>
      <div className="flex flex-col w-full h-screen p-8 gap-4">
        {/* Page Header, Timeline & Tips Banners */}
        <Card className="flex-none border-none p-0 bg-stone-800 gap-2">
          {/* Page title + buttons */}
          <CardHeader className="flex flex-row gap-4 bg-teal-900 p-3 rounded-sm align-center items-center shadow-stone-900 shadow-md">
            <CardTitle className="flex flex-row gap-2 text-white font-thin">
              <span className="font-normal">Context Feed: </span>
              <span>
                Chronologically ordered log of exposures, scripts, errors and
                narrations.
              </span>
            </CardTitle>
            {/* Buttons - Download, Show/Hide Timeline, Show/Hide Tips */}
            <div className="justify-end ml-auto">
              <div className="flex flex-row gap-2 justify-end">
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
              </div>
            </div>
          </CardHeader>

          {/* Timeline Tips */}
          {tipsVisible && (
            <CardContent className="bg-stone-800 text-stone-100 rounded-sm border-2 border-amber-400 p-6 shadow-stone-900 shadow-md">
              <div className="flex flex-row items-center lg:px-2 gap-6 text-sm leading-relaxed">
                <span className="text-amber-400 text-2xl">💡</span>
                <h2 className="text-lg font-bold text-amber-400">
                  Timeline Tips
                </h2>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>Click + drag to select a time range.</li>
                  <li>Double-click to reset to the selected dayobs range.</li>
                  <li>The table updates automatically to match.</li>
                </ul>
              </div>
            </CardContent>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {contextFeedLoading || almanacLoading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <div className="flex flex-row">
                  {/* Event Type Checkboxes */}
                  <div className="mt-2 flex flex-col gap-1 w-45">
                    {Object.entries(SAL_INDEX_INFO)
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
                        data={Object.values(SAL_INDEX_INFO)
                          .filter((info) => info.displayIndex != null)
                          .map((info) => {
                            const activeLabels =
                              columnFilters.find((f) => f.id === "event_type")
                                ?.value ?? [];
                            return {
                              index: 10 - info.displayIndex,
                              timestamps: contextFeedData
                                .filter(
                                  (d) => d.displayIndex === info.displayIndex,
                                )
                                .map((d) => d.event_time_millis),
                              color: info.color,
                              isActive:
                                activeLabels.length === 0 ||
                                activeLabels.includes(info.label),
                            };
                          })}
                        twilightValues={twilightValues}
                        showTwilight={true}
                        height={250}
                        markerType="diamond"
                        fullTimeRange={fullTimeRange}
                        selectedTimeRange={selectedTimeRange}
                        setSelectedTimeRange={setSelectedTimeRange}
                      />
                    </ContextMenuWrapper>
                  </div>
                </div>
              )}
            </CardContent>
          )}

          {/* Editable Time Range */}
          {selectedTimeRange[0] && selectedTimeRange[1] && (
            <CardContent className="relative flex flex-row items-center justify-left bg-teal-900 text-stone-100 h-12 rounded-sm shadow-stone-900 shadow-md">
              {/* Left label */}
              <span className="font-thin text-sm mr-4 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 select-none">
                Selected Time Range (UTC):
              </span>

              {/* Centered inputs */}
              <span className="text-white font-thin flex flex-row items-start lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-row lg:items-center">
                {/* Start DateTime */}
                <EditableDateTimeInput
                  value={selectedTimeRange[0]}
                  onValidChange={(dt) =>
                    setSelectedTimeRange([dt, selectedTimeRange[1]])
                  }
                  fullTimeRange={fullTimeRange}
                  otherBound={selectedTimeRange[1]}
                  isStart={true}
                />
                <span className="mx-4">-</span>
                {/* End DateTime */}
                <EditableDateTimeInput
                  value={selectedTimeRange[1]}
                  onValidChange={(dt) =>
                    setSelectedTimeRange([selectedTimeRange[0], dt])
                  }
                  fullTimeRange={fullTimeRange}
                  otherBound={selectedTimeRange[0]}
                  isStart={false}
                />
              </span>
            </CardContent>
          )}

          {/* Table Tips */}
          {tipsVisible && (
            <CardContent className="bg-stone-800 text-stone-100 rounded-sm border-2 border-amber-400 p-6 shadow-stone-900 shadow-md">
              <div className="flex flex-row items-center lg:px-2 gap-6 text-sm leading-relaxed">
                <span className="text-amber-400 text-2xl">💡</span>
                <h2 className="text-lg font-bold text-amber-400">Table Tips</h2>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    Collapse/expand tracebacks & YAMLs by clicking cells or
                    using checkboxes.
                  </li>
                  <li>
                    Use the
                    <span className="font-bold text-lg text-teal-300">
                      {" ⋮ "}
                    </span>
                    menu in column headers for sorting, grouping, filtering, or
                    hiding.
                  </li>
                </ul>
              </div>
            </CardContent>
          )}
        </Card>

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
