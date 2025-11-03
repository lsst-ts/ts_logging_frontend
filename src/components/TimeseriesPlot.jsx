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
  MoonReferenceArea,
} from "@/components/CustomPlotShapes";
import { plotTooltipFormatter } from "@/components/PlotTooltip";
import {
  PLOT_COLOR_OPTIONS,
  BAND_COLORS,
  PLOT_KEY_TIME,
  PLOT_KEY_SEQUENCE,
  PLOT_COLORS,
  PLOT_DIMENSIONS,
  PLOT_OPACITIES,
  AXIS_TICK_STYLE,
} from "@/components/PLOT_DEFINITIONS";

import { useClickDrag } from "@/hooks/useClickDrag";
import { scaleDotRadius, calculateDecimalPlaces } from "@/utils/plotUtils";
import { calculateChartData } from "@/utils/chartCalculations";

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
  nPlots = 1,
  xAxisType = PLOT_KEY_TIME,
  xAxisShow = false,
}) {
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  // Get color, either from options or generated based on index (for assorted colors)
  const selectedColor =
    plotColor === "assorted"
      ? `hsl(${plotIndex * 40}, 70%, 50%)`
      : PLOT_COLOR_OPTIONS.find((c) => c.key === plotColor)?.color ||
        PLOT_COLORS.defaultColor;

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
  const decimalPlaces = calculateDecimalPlaces(yRange);
  // ---------------------------------------------------------

  // Plot Formatting =========================================
  const DOT_RADIUS = scaleDotRadius(values.length);

  let lineProps = {
    dataKey,
    activeDot: {
      r: PLOT_DIMENSIONS.activeDotRadius,
      fill: PLOT_COLORS.activeDotFill,
    },
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

  // Use calculateChartData to get all chart transformations
  const {
    chartData,
    chartMoon,
    chartDayObsBreaks,
    ticks,
    dayObsTicks,
    dayObsTickMappings,
    noDataX,
    fakeX,
    chartDayObsSpacing,
    chartDataKey,
    domain,
    tickFormatter,
    scale,
  } = calculateChartData({
    xAxisType,
    data,
    moonIntervals,
    availableDayObs,
    selectedMinMillis,
    selectedMaxMillis,
  });

  // Click & Drag plot hooks ================================
  // Flatten chartData for sequence mode lookup (chartData is array of arrays)
  const flatChartData = chartData.flat();

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
      ? (e) => flatChartData.find((d) => d.fakeX === e)?.obs_start_millis
      : (e) => e,
  );
  // --------------------------------------------------------

  // Plot =================================================
  return (
    <ChartContainer
      className="pt-8 h-57 w-full"
      title={title}
      config={{}}
      style={{ zIndex: nPlots - plotIndex }}
    >
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        margin={PLOT_DIMENSIONS.chartMargins}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={PLOT_COLORS.gridStroke} />
        <XAxis
          dataKey={chartDataKey}
          type="number"
          domain={domain}
          scale={scale}
          ticks={ticks}
          tickFormatter={tickFormatter}
          tick={AXIS_TICK_STYLE}
          allowDuplicatedCategory={false}
          xAxisId={0}
          height={16}
        />
        <XAxis
          dataKey={chartDataKey}
          type="number"
          domain={domain}
          allowDuplicatedCategory={false}
          ticks={dayObsTicks}
          tickFormatter={(e) => dayObsTickMappings.get(e)}
          xAxisId={1}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK_STYLE}
          height={18}
          label={
            xAxisShow
              ? {
                  value:
                    chartDataKey === "fakeX"
                      ? "Sequence Number"
                      : "Observation Start Time (TAI)",
                  position: "center",
                  fill: PLOT_DIMENSIONS.axisLabelFill,
                  dy: 24,
                  fontSize: PLOT_DIMENSIONS.axisLabelFontSize,
                  fontWeight: PLOT_DIMENSIONS.axisLabelFontWeight,
                }
              : undefined
          }
        />
        <YAxis
          tick={AXIS_TICK_STYLE}
          tickFormatter={(value) => value.toFixed(decimalPlaces)}
          domain={["auto", "auto"]}
          width={PLOT_DIMENSIONS.yAxisWidth}
          label={{
            value: unit,
            angle: -90,
            fill: PLOT_DIMENSIONS.axisLabelFill,
            position: "insideLeft",
            style: { textAnchor: "middle" },
            fontSize: PLOT_DIMENSIONS.axisLabelFontSize,
            fontWeight: PLOT_DIMENSIONS.axisLabelFontWeight,
            letterSpacing: 1,
          }}
        />
        {/* Moon Up Area */}
        {chartMoon.map(({ start, end, startIsZigzag, endIsZigzag }, i) => {
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
              fillOpacity={PLOT_OPACITIES.overlay}
              fill={PLOT_COLORS.moonFill}
              yAxisId="0"
              shape={
                <MoonReferenceArea
                  startIsZigzag={startIsZigzag}
                  endIsZigzag={endIsZigzag}
                />
              }
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
                stroke={PLOT_COLORS.twilightStroke}
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
            fillOpacity={PLOT_OPACITIES.overlay}
            yAxisId="0"
            fill={PLOT_COLORS.noDataFill}
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
              formatter={plotTooltipFormatter(title)}
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
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            fillOpacity={PLOT_OPACITIES.selection}
          />
        ) : null}
      </LineChart>
    </ChartContainer>
  );
}

export default TimeseriesPlot;
