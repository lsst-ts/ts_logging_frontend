import { useEffect, useState, useMemo } from "react";

import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import { useNotifications } from "@/hooks/useNotifications";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import PlotVisibilityPopover from "@/components/PlotVisibilityPopover";
import PlotFormatPopover from "@/components/PlotFormatPopover";
import { TELESCOPES } from "@/components/Parameters";
import {
  CircleShape,
  TriangleShape,
  FlippedTriangleShape,
  SquareShape,
  StarShape,
  AsteriskShape,
} from "@/components/plotDotShapes";

import TimelineChart from "@/components/TimelineChart";
import TimeseriesPlot from "@/components/TimeseriesPlot";
import {
  PLOT_DEFINITIONS,
  BAND_COLORS,
  PLOT_KEY_TIME,
  PLOT_KEY_SEQUENCE,
} from "@/components/PLOT_DEFINITIONS";

import PageHeader from "@/components/PageHeader";
import TipsCard from "@/components/TipsCard";
import SelectedTimeRangeBar from "@/components/SelectedTimeRangeBar";

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
} from "@/utils/fetchUtils";
import {
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  prettyTitleFromKey,
} from "@/utils/utils";
import {
  generateDayObsRange,
  isoToUTC,
  getDayobsStartUTC,
} from "@/utils/timeUtils";
import {
  prepareAlmanacData,
  prepareMoonIntervals,
} from "@/utils/timelineUtils";
import { calculateChartData } from "@/utils/chartCalculations";
import { PlotDataContext } from "@/contexts/PlotDataContext";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";

function Plots() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({ from: "/plots" });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // Data
  const [dataLogEntries, setDataLogEntries] = useState([]);
  const [availableDayObs, setAvailableDayObs] = useState([]);
  const [dataLogLoading, setDataLogLoading] = useState(true);

  // Twilights, moonrise/set and brightness
  const [twilightValues, setTwilightValues] = useState([]);
  const [illumValues, setIllumValues] = useState([]);
  const [moonValues, setMoonValues] = useState([]);
  const [moonIntervals, setMoonIntervals] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/plots");

  const {
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  // Visibility toggles
  const [timelineVisible, setTimelineVisible] = useState(true);
  const [tipsVisible, setTipsVisible] = useState(false);

  // Keep track of default and user-added plots
  const [visiblePlots, setVisiblePlots] = useState(
    PLOT_DEFINITIONS.filter((p) => p.default).map((p) => p.key),
  );

  // Plot format
  const [xAxisType, setXAxisType] = useState(PLOT_KEY_TIME);
  const [xAxisShow, setXAxisShow] = useState(true);
  const [plotShape, setPlotShape] = useState("dots");
  const [plotColor, setPlotColor] = useState("assorted");
  const [bandMarker, setBandMarker] = useState("bandColorsIcons");

  // Filtered exposure count for SelectedTimeRangeBar
  const filteredCount = useMemo(() => {
    if (!selectedTimeRange[0] || !selectedTimeRange[1])
      return dataLogEntries.length;
    const [s, e] = [
      selectedTimeRange[0].toMillis(),
      selectedTimeRange[1].toMillis(),
    ];
    return dataLogEntries.filter(
      (entry) => entry.obs_start_millis >= s && entry.obs_start_millis <= e,
    ).length;
  }, [dataLogEntries, selectedTimeRange]);

  function prepareExposureData(dataLog) {
    // Prepare data for plots
    const data = dataLog
      .map((entry) => {
        const psfSigma = Number.parseFloat(entry.psf_sigma_median);
        const pixelScale = Number.isFinite(entry.pixel_scale_median)
          ? entry.pixel_scale_median
          : DEFAULT_PIXEL_SCALE_MEDIAN;
        const obsStartDt = isoToUTC(entry.obs_start);
        return {
          ...entry,
          obs_start_dt: obsStartDt,
          obs_start_millis: obsStartDt.toMillis(),
          psf_median: Number.isFinite(psfSigma)
            ? psfSigma * PSF_SIGMA_FACTOR * pixelScale
            : null,
        };
      })
      // Chronological order
      .sort((a, b) => a.obs_start_millis - b.obs_start_millis);

    // Set available dayobs range
    setAvailableDayObs(generateDayObsRange(startDayobs, endDayobs));

    // Set the data to state
    setDataLogEntries(data);
  }

  function resetState() {
    // ConsDB
    setDataLogEntries([]);
    setAvailableDayObs([]);
    // Almanac
    setTwilightValues([]);
    setIllumValues([]);
    setMoonValues([]);
  }

  // Navigation
  const search = useSearch({ from: "/plots" });

  // Context menu items
  const contextMenuItems = [
    {
      label: "View Context Feed",
      to: "/nightlydigest/context-feed",
      search,
    },
    {
      label: "View Data Log",
      to: "/nightlydigest/data-log",
      search,
    },
  ];

  useEffect(() => {
    if (telescope === "AuxTel") {
      return;
    }

    const abortController = new AbortController();

    setDataLogLoading(true);
    setAlmanacLoading(true);
    clearNotifications();

    resetState();

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
            source: "plots",
            title: "No exposure entries found in ConsDB",
            description:
              "Plots will not be displayed. Try a different date range.",
          });
        } else {
          prepareExposureData(dataLog);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          addNotification({
            type: "error",
            source: "data-log",
            title: "Error fetching data log",
            description: err?.message || "Unknown error",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setDataLogLoading(false);
        }
      });

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        if (almanac === null) {
          addNotification({
            type: "noData",
            source: "almanac",
            title: "No almanac data available",
            description:
              "Plots will be displayed without accompanying almanac information.",
          });
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
          addNotification({
            type: "error",
            source: "almanac",
            title: "Error fetching almanac",
            description:
              err?.message || "An error occurred while fetching almanac.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Pair up moon rise/set times
  useEffect(() => {
    const [xMinMillis, xMaxMillis] = fullTimeRange;
    if (moonValues && xMinMillis != null && xMaxMillis != null) {
      const intervals = prepareMoonIntervals(
        moonValues,
        xMinMillis.toMillis(),
        xMaxMillis.toMillis(),
      );
      setMoonIntervals(intervals);
    }
  }, [moonValues, fullTimeRange]);

  // Calculate shared plot context value
  const plotDataContextValue = useMemo(() => {
    const [xMinMillis, xMaxMillis] = selectedTimeRange;
    if (
      dataLogEntries.length > 0 &&
      availableDayObs.length > 0 &&
      xMinMillis != null &&
      xMaxMillis != null
    ) {
      const calculatedData = calculateChartData({
        data: dataLogEntries,
        moonIntervals,
        availableDayObs,
        selectedMinMillis: xMinMillis.toMillis(),
        selectedMaxMillis: xMaxMillis.toMillis(),
        twilightValues,
      });

      return xAxisType === PLOT_KEY_SEQUENCE
        ? calculatedData.sequence
        : calculatedData.time;
    }
  }, [
    dataLogEntries,
    xAxisType,
    moonIntervals,
    selectedTimeRange,
    availableDayObs,
    twilightValues,
  ]);

  const loading = dataLogLoading || almanacLoading;
  const displayedNotifications = loading ? [] : processedNotifications;

  // Temporary display message for AuxTel queries
  if (telescope === "AuxTel") {
    return (
      <div className="flex flex-col w-full px-8 pb-8 gap-4">
        <PageHeader
          title="Plots"
          description="An interactive visual overview of exposure metadata from the ConsDB and related sources."
        />
        <p className="text-white font-thin text-center">
          AuxTel is currently not supported in this page. Contact the Logging
          team if this is a priority for you.
        </p>
      </div>
    );
  }

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
            title="Plots"
            description="An interactive visual overview of exposure metadata from the ConsDB and related sources."
            actions={
              <>
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
              <ul className="list-disc list-outside ml-5 space-y-1">
                <li>
                  <span className="font-bold">Drag</span> to select a time range
                  (plots update automatically).
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
            </TipsCard>
          )}

          {/* Timeline */}
          {timelineVisible && (
            <Card className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
              {loading ? (
                <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
              ) : (
                <ContextMenuWrapper menuItems={contextMenuItems}>
                  <TimelineChart
                    data={[
                      {
                        index: 1,
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
            timezone="TAI"
            rightContent={
              loading ? (
                <Skeleton className="h-5 w-64 bg-teal-700 inline-block" />
              ) : (
                `${filteredCount} of ${dataLogEntries.length} exposures selected`
              )
            }
          />

          {/* Plots Tips */}
          {tipsVisible && (
            <TipsCard title="Plots Tips">
              <ul className="list-disc list-outside ml-5 space-y-1">
                <li>
                  <span className="font-bold">Drag</span> to zoom in. Hold{" "}
                  <span className="font-bold">Shift</span> to zoom only the
                  X-axis.
                </li>
                <li>
                  Hold <span className="font-bold">Ctrl/⌘</span> and drag to
                  zoom out. Hold{" "}
                  <span className="font-bold">Shift + Ctrl/⌘</span> to zoom out
                  only the X-axis.
                </li>
                <li>
                  <span className="font-bold">Double-Click</span> to reset.
                </li>
                <li>
                  Click <span className="font-bold">Reset</span> on the top
                  right of a plot to reset only its Y-axis.
                </li>
                <li>
                  See <span className="font-bold">Show/Hide Plots</span> and{" "}
                  <span className="font-bold">Plot Format</span> menus for plot
                  configurations.
                </li>
                <li>
                  When plotting multiple nights by{" "}
                  <span className="font-bold">Sequence Number</span>, single
                  zig-zags separate nights; double zig-zags indicate nights with
                  no data.
                </li>
              </ul>
            </TipsCard>
          )}
        </div>

        {/* Time Window Inputs & Controls */}
        {loading ? (
          <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
        ) : (
          <div className="flex flex-row w-full justify-between items-center gap-8 mt-4">
            {/* Show/Hide Plots button */}
            <PlotVisibilityPopover
              dataLogEntries={dataLogEntries}
              visiblePlots={visiblePlots}
              setVisiblePlots={setVisiblePlots}
            />

            {/* Conditionally display band icon/color key */}
            {bandMarker !== "none" && (
              <div className="flex flex-row h-10 px-4 justify-between items-center gap-3 border border-1 border-white rounded-md text-white font-thin">
                <div>Bands:</div>
                {Object.entries(BAND_COLORS).map(([band, color]) => {
                  const shapeMap = {
                    u: CircleShape,
                    g: TriangleShape,
                    r: FlippedTriangleShape,
                    i: SquareShape,
                    z: StarShape,
                    y: AsteriskShape,
                  };

                  const ShapeComponent = shapeMap[band];

                  return (
                    <div key={band} className="flex items-center gap-1">
                      <svg width="16" height="16">
                        {bandMarker === "bandColorsIcons" && ShapeComponent ? (
                          <ShapeComponent cx={8} cy={8} fill={color} r={4} />
                        ) : (
                          <CircleShape cx={8} cy={8} fill={color} r={5} />
                        )}
                      </svg>
                      <span>{band}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Plot format controls */}
            <PlotFormatPopover
              xAxisType={xAxisType}
              setXAxisType={setXAxisType}
              xAxisShow={xAxisShow}
              setXAxisShow={setXAxisShow}
              plotShape={plotShape}
              setPlotShape={setPlotShape}
              plotColor={plotColor}
              setPlotColor={setPlotColor}
              bandMarker={bandMarker}
              setBandMarker={setBandMarker}
            />
          </div>
        )}

        {/* Plots */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-40">
          {loading ? (
            <>
              {/* 4 loading plot skeletons */}
              {Array(4)
                .fill(true)
                .map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-full h-80 bg-stone-700 rounded-md"
                  />
                ))}
            </>
          ) : (
            <PlotDataContext.Provider value={plotDataContextValue}>
              {visiblePlots.map((key, idx) => {
                const def = PLOT_DEFINITIONS.find((p) => p.key === key);
                return (
                  <ContextMenuWrapper
                    menuItems={contextMenuItems}
                    key={def.key}
                    style={{ zIndex: visiblePlots.length - idx }}
                  >
                    <TimeseriesPlot
                      title={def?.title || prettyTitleFromKey(key)}
                      unit={def?.unit}
                      dataKey={def.key}
                      fullTimeRange={fullTimeRange}
                      selectedTimeRange={selectedTimeRange}
                      setSelectedTimeRange={setSelectedTimeRange}
                      plotShape={plotShape}
                      plotColor={plotColor}
                      bandMarker={bandMarker}
                      isBandPlot={!!def?.bandMarker}
                      showMoon={!!def?.showMoon}
                      plotIndex={idx}
                      xAxisShow={xAxisShow}
                    />
                  </ContextMenuWrapper>
                );
              })}
            </PlotDataContext.Provider>
          )}
        </div>
      </div>
    </>
  );
}

export default Plots;
