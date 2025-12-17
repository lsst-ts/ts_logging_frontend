import { useEffect, useState, useMemo } from "react";

import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

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

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
} from "@/utils/fetchUtils";
import {
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  getDatetimeFromDayobsStr,
  prettyTitleFromKey,
} from "@/utils/utils";
import {
  isoToTAI,
  almanacDayobsForPlot,
  utcDateTimeStrToTAIMillis,
  generateDayObsRange,
} from "@/utils/timeUtils";
import { calculateChartData } from "@/utils/chartCalculations";
import { PlotDataContext } from "@/contexts/PlotDataContext";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";

function Plots() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({ from: "/plots" });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // For display on page
  const instrumentName = telescope;
  const dateRangeString =
    startDayobs === endDayobs
      ? `on dayobs ${startDayobs}`
      : `in dayobs range ${startDayobs}–${endDayobs}`;

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

  function prepareExposureData(dataLog) {
    // Prepare data for plots
    const data = dataLog
      .map((entry) => {
        const psfSigma = Number.parseFloat(entry.psf_sigma_median);
        const pixelScale = Number.isFinite(entry.pixel_scale_median)
          ? entry.pixel_scale_median
          : DEFAULT_PIXEL_SCALE_MEDIAN;
        const obsStartDt = isoToTAI(entry.obs_start);
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

  function prepareAlmanacData(almanac) {
    // Set values for twilight lines
    const twilightValues = almanac
      .map((dayobsAlm) => [
        utcDateTimeStrToTAIMillis(dayobsAlm.twilight_evening),
        utcDateTimeStrToTAIMillis(dayobsAlm.twilight_morning),
      ])
      .flat();

    // Set values for moon illumination at dayobs midnights
    const illumValues = almanac.flatMap((dayobsAlm) => [
      {
        dayobs: almanacDayobsForPlot(dayobsAlm.dayobs),
        illum: dayobsAlm.moon_illumination,
      },
    ]);

    // Set values for moon rise/set times
    const moonValues = almanac.flatMap((dayobsAlm) => [
      {
        time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_rise_time),
        type: "rise",
      },
      {
        time: utcDateTimeStrToTAIMillis(dayobsAlm.moon_set_time),
        type: "set",
      },
    ]);

    setTwilightValues(twilightValues);
    setIllumValues(illumValues);
    setMoonValues(moonValues);
  }

  // Pair up moon rise/set times for display
  function prepareMoonIntervals(events, xMinMillis, xMaxMillis) {
    if (!events?.length) return [];

    const sorted = [...events].sort((a, b) => a.time - b.time);
    const intervals = [];
    let currentStart = null;
    for (let i = 0; i < sorted.length; i++) {
      const { time, type } = sorted[i];

      if (type === "rise") {
        // If this rise is before timeline, clamp it
        currentStart = Math.max(time, xMinMillis);
      } else if (type === "set" && currentStart != null) {
        // Clamp end time to max
        intervals.push([currentStart, Math.min(time, xMaxMillis)]);
        currentStart = null;
      }
    }

    // Handle moon already up at start
    if (sorted[0].type === "set") {
      intervals.unshift([xMinMillis, Math.min(sorted[0].time, xMaxMillis)]);
    }

    // Handle moon still up at end
    const last = sorted.at(-1);
    if (last.type === "rise" && last.time < xMaxMillis) {
      intervals.push([last.time, xMaxMillis]);
    }

    return intervals;
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
          toast.warning(
            "No data log records found in ConsDB for the selected date range.",
          );
        } else {
          prepareExposureData(dataLog);
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching data log!", {
            description: err?.message || "Unknown error",
            duration: Infinity,
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

  // Temporary display message for AuxTel queries
  if (telescope === "AuxTel") {
    return (
      <div className="flex flex-col w-full p-8 gap-4">
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">
            {instrumentName}
          </span>
          <span className="font-extrabold">Plots</span>
        </h1>
        <p className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          AuxTel is currently not supported in this page. Contact the Logging
          team if this is a priority for you.
        </p>
        <Toaster expand={true} richColors closeButton />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">
            {instrumentName}
          </span>
          <span className="font-extrabold">Plots</span>
        </h1>

        {/* Info section */}
        <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          {dataLogLoading || almanacLoading ? (
            <>
              <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
            </>
          ) : (
            <>
              <p>
                {dataLogEntries.length} exposures found for {instrumentName}{" "}
                {dateRangeString}.
              </p>
            </>
          )}
          <div className="flex flex-col max-w-xxl mt-6 border border-1 border-white rounded-md p-2 gap-2">
            <p>
              <span className="font-medium">Click & Drag</span> on the timeline
              or on any plot to zoom in (drag creates a selection box to zoom
              both time and Y-axis), and{" "}
              <span className="font-medium">Double-Click</span> to zoom out. Use
              the reset button in the top-right corner of each plot to reset
              only the Y-axis.
            </p>
            <p>
              Twilights are shown as blue lines, moon above the horizon is
              highlighted in yellow, and moon illumination (%) is displayed
              above the timeline at local Chilean midnight. All times displayed
              are <span className="font-light">obs start</span> times in TAI
              (UTC+37s).
            </p>
            <p>
              Change which plots are shown by clicking the{" "}
              <span className="font-medium">Show/Hide Plots</span> button.
              Formatting options are found by clicking the{" "}
              <span className="font-medium">Plot Format</span> button. Future
              features include remembering your plot preferences.
            </p>
            <p>
              When plotting multiple nights by{" "}
              <span className="font-medium">Sequence Number</span>, nights are
              separated by single zig-zag lines; double zig-zags represent
              nights with no data taken.
            </p>
          </div>
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
          </>
        )}

        {/* Time Window Inputs & Controls */}
        {dataLogLoading || almanacLoading ? (
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
          {dataLogLoading || almanacLoading ? (
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
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
