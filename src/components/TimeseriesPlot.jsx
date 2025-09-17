import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  TriangleShape,
  FlippedTriangleShape,
  SquareShape,
  StarShape,
  AsteriskShape,
} from "@/components/plotDotShapes";
import {
  DayObsBreakLine,
  NoDataReferenceArea,
} from "@/components/customPlotShapes";
import {
  PLOT_COLOR_OPTIONS,
  BAND_COLORS,
  PLOT_KEY_TIME,
  PLOT_KEY_SEQUENCE,
} from "@/components/PLOT_DEFINITIONS";

import { useClickDrag } from "@/hooks/useClickDrag";
import { millisToHHmm } from "@/utils/timeUtils";

// Band markers for the timeseries plots
const CustomisedDotWithShape = ({ cx, cy, band, r = 2 }) => {
  if (cx == null || cy == null) return null;

  // Band "u" is a blue circle
  if (band === "u") {
    return <circle cx={cx} cy={cy} r={r || 2} fill={BAND_COLORS.u} />;
  }

  // Choose shape based on prop
  let ShapeComponent;
  switch (band) {
    case "g":
      ShapeComponent = TriangleShape;
      break;
    case "r":
      ShapeComponent = FlippedTriangleShape;
      break;
    case "i":
      ShapeComponent = SquareShape;
      break;
    case "z":
      ShapeComponent = StarShape;
      break;
    case "y":
      ShapeComponent = AsteriskShape;
      break;
  }

  return <ShapeComponent cx={cx} cy={cy} r={r} />;
};

function TimeseriesPlot({
  title,
  unit = null,
  dataKey,
  data,
  twilightValues,
  moonIntervals = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  plotShape,
  plotColor,
  bandMarker,
  availableDayObs,
  isBandPlot = false,
  plotIndex = 0,
  xAxisType = PLOT_KEY_TIME,
}) {
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  // Get color, either from options or generated based on index (for assorted colors)
  const selectedColor =
    plotColor === "assorted"
      ? `hsl(${plotIndex * 40}, 70%, 50%)`
      : PLOT_COLOR_OPTIONS.find((c) => c.key === plotColor)?.color || "#ffffff";

  // Click & Drag plot hooks ================================
  const {
    refAreaLeft,
    refAreaRight,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDoubleClick,
  } = useClickDrag(
    setSelectedTimeRange,
    fullTimeRange,
    xAxisType === PLOT_KEY_SEQUENCE
      ? (e) => data.find((d) => d.fakeX === e)?.obs_start_millis
      : (e) => e,
  );
  // --------------------------------------------------------

  // Compute decimal places for y-axis ticks ================
  const values = data
    .map((d) => d[dataKey])
    .filter((v) => typeof v === "number" && Number.isFinite(v));
  // Get min/max
  const minVal = values.length > 0 ? Math.min(...values) : null;
  const maxVal = values.length > 0 ? Math.max(...values) : null;
  // Get yRange
  const yRange = minVal !== null && maxVal !== null ? maxVal - minVal : 0;
  // Decide decimal places based on yRange
  let decimalPlaces = 3;
  if (yRange > 5) decimalPlaces = 0;
  else if (yRange > 1.5) decimalPlaces = 1;
  else if (yRange > 0.02) decimalPlaces = 2;
  else if (yRange === 0) decimalPlaces = 0;
  // ---------------------------------------------------------

  // Plot Formatting =========================================
  // Dynamically set dot radius based on number of data points
  // plotted, for maximum visibility.
  function scaleDotRadius(n) {
    if (n > 500) return 0.5;
    if (n > 200) return 0.75;
    if (n > 100) return 1;
    if (n > 50) return 2;
    if (n > 20) return 3;
    if (n > 10) return 4;
    return 5;
  }
  const DOT_RADIUS = scaleDotRadius(values.length);

  let lineProps = {
    dataKey,
    activeDot: { r: 4, fill: "#ffffff" },
    isAnimationActive: false,
    animationEasing: "linear",
  };

  if (isBandPlot && bandMarker === "bandColorsIcons") {
    // Band markers (colours and icons)
    lineProps.stroke = "";
    lineProps.dot = ({ index, ...rest }) => (
      <CustomisedDotWithShape
        {...rest}
        key={`dot-${index}`}
        stroke={selectedColor}
        band={rest.payload.band}
        style={{ pointerEvents: "all" }}
      />
    );
  } else if (isBandPlot && bandMarker === "bandColor") {
    // Band markers (colours only)
    lineProps.stroke = "";
    lineProps.dot = ({ cx, cy, payload, index }) => {
      const fill = BAND_COLORS[payload.band] || selectedColor;
      if (cy == null) return null; // don't show a dot if undefined or null
      return (
        <circle
          key={`dot-${index}`}
          cx={cx}
          cy={cy}
          r={DOT_RADIUS}
          fill={fill}
          stroke={fill}
          style={{ pointerEvents: "all" }}
        />
      );
    };
  } else if (plotShape === "line") {
    // Lines
    lineProps.connectNulls = true;
    lineProps.isAnimationActive = true;
    lineProps.type = "linear";
    lineProps.stroke = selectedColor;
    lineProps.dot = false;
  } else {
    // Dots
    lineProps.stroke = "";
    lineProps.dot = {
      r: DOT_RADIUS,
      fill: selectedColor,
      stroke: selectedColor,
    };
  }
  // ---------------------------------------------------------
  // Group an array into an array of arrays based on key, preserving insertion order
  const groupBy = (arr, key, map) => {
    for (const obj of arr) {
      const prop = obj[key];
      if (!map.has(prop)) map.set(prop, []);
      map.get(prop).push(obj);
    }
    return [...map.values()];
  };

  // Massage data into multiple line sets grouped by dayobs
  const chartData = groupBy(
    data,
    "day obs",
    new Map(availableDayObs.map((e) => [parseInt(e, 10), []])),
  );

  while (chartData.length && chartData[0].length === 0) {
    chartData.shift();
  }
  while (chartData.length && chartData.at(-1).length === 0) {
    chartData.pop();
  }

  // If we're charting by sequence number, we have a fakeX which
  // is where the point actually appears on the graph
  // We also need to manipulate the moon points
  // so they fit at the relevant point
  let fakeX = 0;
  const chartMoon = [];
  const chartDayObsBreaks = [];
  const ticks = [];
  const tickMappings = [];
  const dayObsTicks = [];
  const dayObsTickMappings = [];
  const noDataX = [];
  // Calculate size of spacing between dayobs in PLOT_KEY_SEQUENCE mode
  // We use the smaller of two numbers based off the number of data points
  // or the number of dayObs, but no less than 8 (otherwise the squiggle lines overlap)
  const chartDayObsSpacing =
    chartData.length > 1
      ? Math.ceil(
          Math.max(
            8,
            Math.min(
              200 / chartData.length - 1,
              (data.length * 0.2) / chartData.length,
            ),
          ),
        )
      : 1;
  if (xAxisType === PLOT_KEY_SEQUENCE) {
    let moonUp = 0;
    let moonIdx = 0;
    chartData.forEach((dayObsGroup, dIdx) => {
      // Calculate tick size for this dayObs
      const tickSpacing = Math.ceil(Math.min(dayObsGroup.length / 6, 50));
      const dayObsStartFakeX = fakeX;
      dayObsGroup.forEach((e, i) => {
        // Where this data point falls on the X axis
        e.fakeX = fakeX;

        // We use while instead of if here to handle the case where
        // the interval is contained within consecutive data elements e.g., between dayobs
        while (
          moonIntervals[moonIdx] &&
          e.obs_start_millis > moonIntervals[moonIdx][moonUp]
        ) {
          if (!moonUp) {
            chartMoon.push([]);
          }
          if (i === 0) {
            // If the moon event occurred before the start of this dayobs
            // place the start in the middle of the spacing
            chartMoon[moonIdx].push(fakeX - chartDayObsSpacing / 2);
          } else {
            chartMoon[moonIdx].push(fakeX);
          }
          if (moonUp) {
            moonIdx++;
          }
          moonUp = moonUp ? 0 : 1;
        }

        if (i % tickSpacing === 0) {
          ticks.push(fakeX);
          tickMappings[fakeX] = e["seq num"];
        }

        fakeX++;
      });
      const dayObsEndFakeX = fakeX;
      const dayObsMidFakeX = Math.floor(
        (dayObsEndFakeX - dayObsStartFakeX) / 2 + dayObsStartFakeX,
      );

      // Add a tick to display the dayobs on the second x axis
      dayObsTicks.push(dayObsMidFakeX);
      dayObsTickMappings[dayObsMidFakeX] = availableDayObs[dIdx];

      // If there is no data for the day, add a NO DATA label
      if (dayObsGroup.length === 0) {
        noDataX.push(fakeX);
      }

      // After each dayobs group, add some spacing on the graph
      fakeX += chartDayObsSpacing;
      chartDayObsBreaks.push(fakeX - chartDayObsSpacing / 2);
    });

    // Close the moon if required (and other sentences for the utterly deranged)
    if (chartMoon.length && chartMoon.at(-1).length < 2) {
      chartMoon.at(-1).push(fakeX);
    }
    // We don't want a daytime-like gap in the sequence at the end
    fakeX -= chartDayObsSpacing;
  } else {
    // Otherwise we can just use the time-series data
    chartMoon.push(...moonIntervals);
  }

  // Plot =================================================
  return (
    <ChartContainer className="pt-8 h-50 w-full" title={title} config={{}}>
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        margin={{ top: 10, right: 0, left: 5, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
        {xAxisType === PLOT_KEY_TIME ? (
          <XAxis
            dataKey="obs_start_millis"
            type="number"
            domain={[selectedMinMillis, selectedMaxMillis]}
            scale="time"
            tickFormatter={(tick) => millisToHHmm(tick)}
            tick={{ fill: "white", style: { userSelect: "none" } }}
            allowDuplicatedCategory={false}
          />
        ) : (
          <>
            <XAxis
              dataKey="fakeX"
              type="number"
              domain={[0, fakeX]}
              allowDuplicatedCategory={false}
              ticks={ticks}
              tickFormatter={(e) => tickMappings[e]}
              xAxisId={0}
            />
            <XAxis
              dataKey="fakeX"
              type="number"
              domain={[0, fakeX]}
              allowDuplicatedCategory={false}
              ticks={dayObsTicks}
              tickFormatter={(e) => dayObsTickMappings[e]}
              xAxisId={1}
              tickLine={false}
              axisLine={false}
              dy={-14}
            />
          </>
        )}
        <YAxis
          tick={{ fill: "white", style: { userSelect: "none" } }}
          tickFormatter={(value) => value.toFixed(decimalPlaces)}
          domain={["auto", "auto"]}
          width={70}
          label={{
            value: unit,
            angle: -90,
            position: "insideLeft",
            fill: "white",
            dx: 0,
            dy: 30,
            fontSize: 16,
            fontWeight: 100,
            letterSpacing: 1,
          }}
        />
        {/* Moon Up Area */}
        {chartMoon.map(([start, end], i) => {
          // If entire moon-up area is not inside selected range,
          // clamp start/end times so moon-up area is visible.
          const clampedStart =
            xAxisType === PLOT_KEY_SEQUENCE
              ? Math.max(start, 0)
              : Math.max(start, selectedMinMillis);
          const clampedEnd =
            xAxisType === PLOT_KEY_SEQUENCE
              ? Math.min(end, fakeX)
              : Math.min(end, selectedMaxMillis);

          return (
            <ReferenceArea
              key={`moon-up-${i}`}
              x1={clampedStart}
              x2={clampedEnd}
              fillOpacity={0.2}
              fill="#EAB308"
              yAxisId="0"
            />
          );
        })}
        {xAxisType === PLOT_KEY_TIME &&
          twilightValues.map((twi, i) =>
            selectedMinMillis <= twi &&
            twi <= selectedMaxMillis &&
            twi !== 0 ? (
              <ReferenceLine
                key={`twilight-${i}-${twi}`}
                x={twi}
                stroke="#0ea5e9"
                strokeWidth={3}
                yAxisId="0"
              />
            ) : null,
          )}
        {noDataX.map((x) => (
          <ReferenceArea
            key={`no-data-${x}`}
            x1={x - chartDayObsSpacing / 2}
            x2={x + chartDayObsSpacing / 2}
            fillOpacity={0.2}
            yAxisId="0"
            fill="#ccc"
            shape={<NoDataReferenceArea />}
          />
        ))}
        {xAxisType === PLOT_KEY_SEQUENCE &&
          chartDayObsBreaks.map((dayObsBreak, i) => (
            <ReferenceLine
              key={`day-obs-break-${i}`}
              x={dayObsBreak}
              stroke="none"
              strokeWidth={3}
              yAxisId={0}
              label={<DayObsBreakLine />}
            />
          ))}
        <ChartTooltip
          position={"topRight"}
          offset={50}
          allowEscapeViewBox={{ x: false, y: true }}
          content={(props) => (
            <ChartTooltipContent
              {...props}
              formatter={(value, name, item, index, payload) => {
                const exposureId = payload["exposure id"];
                const physicalFilter = payload["physical filter"];
                const scienceProgram = payload["science program"];
                const obsReason = payload["observation reason"];

                const formattedValue =
                  typeof value === "number" && !Number.isInteger(value)
                    ? value.toFixed(4)
                    : value;

                return (
                  <div className="flex flex-col gap-1 select-none">
                    <div>
                      <span className="text-muted-foreground">{title}:</span>{" "}
                      <span className="font-mono">{formattedValue}</span>
                    </div>
                    <hr className="m-1 text-cyan-700/50" />
                    <div>
                      <span className="text-muted-foreground">Exposure:</span>{" "}
                      <span className="font-mono">{exposureId}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Science Program:
                      </span>{" "}
                      <span className="font-mono">{scienceProgram}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Obs. Reason:
                      </span>{" "}
                      <span className="font-mono">{obsReason}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Filter:</span>{" "}
                      <span className="font-mono">{physicalFilter}</span>
                    </div>
                  </div>
                );
              }}
              hideLabel
            />
          )}
        />
        {/* Data */}
        {chartData.map((d, i) => (
          <Line
            {...lineProps}
            key={`chart-data-${i}`}
            data={d}
            animationBegin={(1500 * i) / chartData.length}
            animationDuration={1500 / chartData.length}
          />
        ))}
        {/* Selection rectangle shown during active highlighting */}
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fillOpacity={0.3} />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}

export default TimeseriesPlot;
