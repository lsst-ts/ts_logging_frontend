import { useEffect, useState } from "react";

import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

import PlotVisibilityPopover from "@/components/PlotVisibilityPopover";
import PlotFormatPopover from "@/components/PlotFormatPopover";
import { TELESCOPES } from "@/components/parameters";
import {
  TriangleShape,
  FlippedTriangleShape,
  SquareShape,
  StarShape,
  AsteriskShape,
} from "@/components/plotDotShapes";

import Timeline from "@/components/Timeline";
import TimeseriesPlot from "@/components/TimeseriesPlot";
import {
  PLOT_DEFINITIONS,
  BAND_COLORS,
  PLOT_KEY_TIME,
  PLOT_KEY_SEQUENCE,
} from "@/components/PLOT_DEFINITIONS";
import { PLOT_DEFINITIONS, BAND_COLORS } from "@/components/PLOT_DEFINITIONS";
import BokehPlot from "@/components/BokehPlot";

import {
  fetchAlmanac,
  fetchDataLogEntriesFromConsDB,
  fetchVisitMaps,
} from "@/utils/fetchUtils";
import {
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
  getDatetimeFromDayobsStr,
  getNightSummaryLink,
  prettyTitleFromKey,
} from "@/utils/utils";
import {
  isoToTAI,
  getDayobsStartTAI,
  getDayobsEndTAI,
  almanacDayobsForPlot,
  utcDateTimeStrToTAIMillis,
  generateDayObsRange,
} from "@/utils/timeUtils";

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

  // Time ranges for timeline and plots
  const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);
  const [fullTimeRange, setFullTimeRange] = useState([null, null]);

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

  const [interactiveMap, setInteractiveMap] = useState(null);
  const [visitMapsLoading, setVisitMapsLoading] = useState(false);

  function prepareExposureData(dataLog) {
    // Prepare data for plots
    const data = dataLog
      .map((entry) => {
        const psfSigma = parseFloat(entry["psf sigma median"]);
        const pixelScale = !isNaN(entry.pixel_scale_median)
          ? entry.pixel_scale_median
          : DEFAULT_PIXEL_SCALE_MEDIAN;
        const obsStartDt = isoToTAI(entry["obs start"]);
        return {
          ...entry,
          obs_start_dt: obsStartDt,
          obs_start_millis: obsStartDt.toMillis(),
          "psf median": !isNaN(psfSigma)
            ? psfSigma * PSF_SIGMA_FACTOR * pixelScale
            : null,
        };
      })
      // Chronological order
      .sort((a, b) => a.obs_start_millis - b.obs_start_millis);

    // Get all available dayobs
    const dayObsRange = generateDayObsRange(startDayobs, endDayobs);

    // Get first and last observations
    const firstObs = data.at(0)?.obs_start_dt ?? 0;
    const lastObs = data.at(-1)?.obs_start_dt ?? 0;

    // Set static timeline axis to boundaries of queried dayobs
    let fullXRange = [];
    if (dayObsRange.length > 0) {
      const firstDayobs = dayObsRange[0];
      const lastDayobs = dayObsRange[dayObsRange.length - 1];

      const startTimeOfFirstDayobs = getDayobsStartTAI(firstDayobs);
      const endTimeOfLastDayobs = getDayobsEndTAI(lastDayobs);

      // Add an extra minute to the end so that the final dayobs tick line shows
      fullXRange = [
        startTimeOfFirstDayobs,
        endTimeOfLastDayobs.plus({ minute: 1 }),
      ];

      setAvailableDayObs(dayObsRange);
      setFullTimeRange(fullXRange);
      setSelectedTimeRange([firstObs, lastObs]);
    }

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
    setFullTimeRange([null, null]);
    setSelectedTimeRange([null, null]);
    // Almanac
    setTwilightValues([]);
    setIllumValues([]);
    setMoonValues([]);
  }

  useEffect(() => {
    if (telescope === "AuxTel") {
      return;
    }

    const abortController = new AbortController();

    setDataLogLoading(true);
    setAlmanacLoading(true);

    setVisitMapsLoading(true);
    setInteractiveMap(null);

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
    // Visit maps
    fetchVisitMaps(startDayobs, queryEndDayobs, instrument, abortController)
      .then((interactivePlot) => {
        setInteractiveMap(interactivePlot);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching visit maps!", {
            description: err?.message,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setVisitMapsLoading(false);
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

  // Filter data based on selected time range
  const filteredData = dataLogEntries.filter(
    (entry) =>
      entry.obs_start_dt >= selectedTimeRange[0] &&
      entry.obs_start_dt <= selectedTimeRange[1],
  );

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
          <div className="flex flex-col max-w-xxl mt-6 border-1 border-white rounded-md p-2 gap-2">
            <p>
              <span className="font-medium">Click & Drag</span> on the timeline
              or on any plot to zoom in, and{" "}
              <span className="font-medium">Double-Click</span> to zoom out.
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
            <Timeline
              data={dataLogEntries}
              twilightValues={twilightValues}
              illumValues={illumValues}
              moonIntervals={moonIntervals}
              fullTimeRange={fullTimeRange}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
            />
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
              <div className="flex flex-row h-10 px-4 justify-between items-center gap-3 border-1 border-white rounded-md text-white font-thin">
                <div>Bands:</div>
                {Object.entries(BAND_COLORS).map(([band, color]) => {
                  const shapeMap = {
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
                          <circle cx={8} cy={8} fill={color} r={5} />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
            <>
              {visiblePlots.map((key, idx) => {
                const def = PLOT_DEFINITIONS.find((p) => p.key === key);
                return (
                  <TimeseriesPlot
                    title={def?.title || prettyTitleFromKey(key)}
                    unit={def?.unit}
                    dataKey={def.key}
                    key={def.key}
                    data={filteredData}
                    twilightValues={twilightValues}
                    // Show moon rise/set only on sky-related plots
                    {...(def?.showMoon ? { moonIntervals: moonIntervals } : {})}
                    xAxisType={xAxisType}
                    xAxisShow={xAxisShow}
                    fullTimeRange={fullTimeRange}
                    selectedTimeRange={selectedTimeRange}
                    setSelectedTimeRange={setSelectedTimeRange}
                    plotShape={plotShape}
                    plotColor={plotColor}
                    bandMarker={bandMarker}
                    isBandPlot={!!def?.bandMarker}
                    plotIndex={idx}
                    nPlots={visiblePlots.length}
                    availableDayObs={availableDayObs}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* Visit Maps */}
        <div className="mt-16 mxb-8 text-white font-thin text-center">
          <h1 className="flex flex-row gap-2 text-white text-3xl uppercase justify-center pb-4">
            <span className="tracking-[2px] font-extralight">Visit</span>
            <span className="font-extrabold"> Maps</span>
          </h1>
          {dataLogLoading || almanacLoading ? (
            <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
          ) : (
            <>
              <p>
                For visit maps, visit the Scheduler-oriented night summaries:{" "}
                {availableDayObs.map((dayobs, idx) => {
                  const { url, label } = getNightSummaryLink(dayobs);
                  return (
                    <span key={dayobs}>
                      <a
                        href={url}
                        className="underline text-blue-300 hover:text-blue-400"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {label}
                      </a>
                      {idx < availableDayObs.length - 1 && ", "}
                    </span>
                  );
                })}
                .
              </p>
              <p className="pt-2">
                <span className="font-medium">Note: </span>If you see a 404
                error, the summary might not have been created for that day.
              </p>
            </>
          )}
        </div>
        <div className="mt-16 mxb-8 text-white font-thin text-center">
          <h1 className="flex flex-row gap-2 text-white text-3xl uppercase justify-center pb-4">
            <span className="tracking-[2px] font-extralight">Visit</span>
            <span className="font-extrabold"> Maps</span>
          </h1>
          {visitMapsLoading ? (
            <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
          ) : (
            <div className="w-full">
              <div class="prose max-w-none text-natural-200 text-left">
                <p>
                  These plots show the visits collected during the night in two
                  different representations, modeled after physical observing
                  tools.
                </p>
                <ul class="list-disc pl-6">
                  <li>
                    <strong>Armillary sphere</strong> (left): a model of the
                    celestial sphere, with the Earth at its center, and the sky
                    projected onto it.
                  </li>
                  <li>
                    <strong>Planisphere</strong> (right): a flat representation
                    of the sky, as seen from a specific location on Earth at a
                    specific time.
                  </li>
                </ul>
                <p>
                  Both plots show the footprints of camera pointings taken up to
                  the time set by the MJD slider, with the most recent three
                  pointings outlined in{" "}
                  <span class="text-cyan-500 font-semibold">cyan</span>. The
                  fill colors are set according to the{" "}
                  <a
                    className="text-blue-600 font-semibold underline"
                    href="https://rtn-045.lsst.io/"
                    target="_blank"
                  >
                    RTN-45
                  </a>
                  :
                </p>
                <div class="flex flex-wrap justify-center gap-4 items-center">
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-u"></span>
                    <span>u band</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-g"></span>
                    <span>g band</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-r"></span>
                    <span>r band</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-i"></span>
                    <span>i band</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-z"></span>
                    <span>z band</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span className="w-3 h-3 bg-band-y"></span>
                    <span>y band</span>
                  </div>
                </div>
                <p class="mt-4">
                  Both plots have the following additional annotations:
                </p>
                <ul class="list-disc pl-6 space-y-1">
                  <li>
                    The gray background shows the planned final depth of the
                    LSST survey.
                  </li>
                  <li>
                    The{" "}
                    <span class="text-orange-500 font-semibold">
                      orange disk
                    </span>{" "}
                    shows the coordinates of the moon.
                  </li>
                  <li>
                    The{" "}
                    <span class="text-yellow-400 font-semibold">
                      yellow disk
                    </span>{" "}
                    shows the coordinates of the sun.
                  </li>
                  <li>
                    The{" "}
                    <span class="text-green-500 font-semibold">green line</span>{" "}
                    (oval) shows the ecliptic.
                  </li>
                  <ul class="list-disc pl-6 mt-1">
                    <li>
                      The sun moves along the ecliptic in the direction of
                      increasing R.A. (counter-clockwise in the planisphere
                      figure) such that it makes a full revolution in one year.
                    </li>
                    <li>
                      The moon moves roughly (within 5.14°) along the ecliptic
                      in the direction of increasing R.A. (counter-clockwise in
                      the planisphere figure), completing a full revolution in
                      one sidereal month (a bit over 27 days), about 14° per
                      day.
                    </li>
                  </ul>
                  <li>
                    The{" "}
                    <span class="text-blue-500 font-semibold">blue line</span>{" "}
                    (oval) shows the plane of the Milky Way.
                  </li>
                  <li>
                    The <span class="text-white font-semibold">white line</span>{" "}
                    shows the horizon at the time set by the MJD slider.
                  </li>
                  <li>
                    The <span class="text-red-500 font-semibold">red line</span>{" "}
                    shows a zenith distance of 70° (airmass = 2.9) at the time
                    set by the MJD slider.
                  </li>
                </ul>
              </div>
              <div className="flex flex-col w-full px-4 pt-2 space-y-4 items-center">
                {interactiveMap && (
                  <BokehPlot id="interactive-plot" plotData={interactiveMap} />
                )}
              </div>
            </div>
          )}
          {/* Link to nightsum reports */}
          <div className="mt-16 mxb-8 text-white font-thin text-center">
            <h1 className="flex flex-row gap-2 text-white text-3xl uppercase justify-center pb-4">
              <span className="tracking-[2px] font-extralight">Survey</span>
              <span className="font-extrabold"> Progress</span>
            </h1>
            {dataLogLoading || almanacLoading ? (
              <Skeleton className="w-full h-20 bg-stone-700 rounded-md" />
            ) : (
              <>
                <p>
                  For survey progress, visit the Scheduler-oriented night
                  summaries:{" "}
                  {availableDayobs.map((dayobs, idx) => {
                    const { url, label } = getNightSummaryLink(dayobs);
                    return (
                      <span key={dayobs}>
                        <a
                          href={url}
                          className="underline text-blue-300 hover:text-blue-400"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {label}
                        </a>
                        {idx < availableDayobs.length - 1 && ", "}
                      </span>
                    );
                  })}
                  .
                </p>
                <p className="pt-2">
                  <span className="font-medium">Note: </span>If you see a 404
                  error, the summary might not have been created for that day.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default Plots;
