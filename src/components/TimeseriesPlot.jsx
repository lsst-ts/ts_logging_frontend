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
import { PLOT_COLOR_OPTIONS, BAND_COLORS } from "@/components/PLOT_DEFINITIONS";

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
  isBandPlot = false,
  plotIndex = 0,
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
  } = useClickDrag(setSelectedTimeRange, fullTimeRange);
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
  else if (yRange == 0) decimalPlaces = 0;
  // ---------------------------------------------------------

  // Plot Formatting =========================================
  const DOT_RADIUS = 2;
  let lineProps = {
    dataKey,
    activeDot: { r: 4, fill: "#ffffff" },
    isAnimationActive: false,
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
    (lineProps.isAnimationActive = true), (lineProps.type = "linear");
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

  // Plot =================================================
  return (
    <ChartContainer className="pt-8 h-50 w-full" title={title} config={{}}>
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        data={data}
        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" />
        <XAxis
          dataKey="obs_start_millis"
          type="number"
          domain={[selectedMinMillis, selectedMaxMillis]}
          scale="time"
          tickFormatter={(tick) => millisToHHmm(tick)}
          tick={{ fill: "white", style: { userSelect: "none" } }}
        />
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
        {moonIntervals.map(([start, end], i) => {
          // If entire moon-up area is not inside selected range,
          // clamp start/end times so moon-up area is visible.
          const clampedStart = Math.max(start, selectedMinMillis);
          const clampedEnd = Math.min(end, selectedMaxMillis);

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
        {/* Twilight lines */}
        {twilightValues.map((twi, i) =>
          selectedMinMillis <= twi && twi <= selectedMaxMillis ? (
            <ReferenceLine
              key={`twilight-${i}-${twi}`}
              x={twi}
              stroke="#0ea5e9"
              strokeWidth={3}
              yAxisId="0"
            />
          ) : null,
        )}
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
                        Science Progam:
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
        <Line {...lineProps} />
        {/* Selection rectangle shown during active highlighting */}
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea x1={refAreaLeft} x2={refAreaRight} fillOpacity={0.3} />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}

export default TimeseriesPlot;
