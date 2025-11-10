import { useContext, useEffect, useId, useRef } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PlotDataContext } from "@/contexts/PlotDataContext";
import { hoverStore } from "@/stores/hoverStore";
import {
  DayObsBreakLine,
  NoDataReferenceArea,
  MoonReferenceArea,
} from "@/components/CustomPlotShapes";
import { plotTooltipFormatter } from "@/components/PlotTooltip";
import {
  PLOT_COLOR_OPTIONS,
  PLOT_COLORS,
  PLOT_DIMENSIONS,
  PLOT_OPACITIES,
  AXIS_TICK_STYLE,
} from "@/components/PLOT_DEFINITIONS";

import { useDOMClickDrag } from "@/hooks/useDOMClickDrag";
import { scaleDotRadius, calculateDecimalPlaces } from "@/utils/plotUtils";
import { createDotCallback } from "../utils/createDotCallback";

function TimeseriesPlot({
  title,
  unit = null,
  dataKey,
  fullTimeRange,
  setSelectedTimeRange,
  plotShape,
  plotColor,
  bandMarker,
  isBandPlot = false,
  showMoon = false,
  plotIndex = 0,
  xAxisShow = false,
}) {
  // Get pre-computed chart data from context
  const plotData = useContext(PlotDataContext);

  // Generate unique ID for this graph
  const graphID = useId();

  // Destructure with defaults to handle null case
  const {
    groupedData = [],
    flatData = [],
    chartMoon = [],
    twilightValues = [],
    chartDayObsBreaks = [],
    noDataX = [],
    chartDayObsSpacing = 1,
    chartDataKey = "obs_start_millis",
    domain = [0, 0],
    scale = "time",
    ticks = [],
    dayObsTicks = [],
    tickFormatter = (e) => e,
    dayObsTickFormatter = (e) => e,
    indexToMillis = (e) => e, // Default identity function
    selectedMinMillis = 0,
    selectedMaxMillis = 0,
  } = plotData || {};

  // Ref for chart to enable DOM manipulation
  const chartRef = useRef(null);

  // Click & Drag plot hooks using DOM manipulation
  const { mouseDown, mouseMove, mouseUp, doubleClick } = useDOMClickDrag({
    callback: setSelectedTimeRange,
    indexToMillis,
    resetCallback: () => setSelectedTimeRange(fullTimeRange),
    chartRef,
    onMouseMove: (state, dragState) => {
      // If we're dragging, clear hover state
      if (dragState.isDragging) {
        hoverStore.setHover(null);
        return;
      }

      // Update hover based on active payload
      if (!state || !state.activePayload || state.activePayload.length === 0) {
        hoverStore.setHover(null);
        return;
      }

      hoverStore.setHover(state.activePayload[0].payload["exposure id"]);
    },
  });

  const mouseLeave = () => {
    hoverStore.setHover(null);
  };

  // Register this graph with the hover store
  useEffect(() => {
    hoverStore.registerGraph(graphID);

    return () => {
      hoverStore.unregisterGraph(graphID);
    };
  }, [graphID]);

  if (!plotData) {
    return null;
  }

  // Get color, either from options or generated based on index (for assorted colors)
  const selectedColor =
    plotColor === "assorted"
      ? `hsl(${plotIndex * 40}, 70%, 50%)`
      : PLOT_COLOR_OPTIONS.find((c) => c.key === plotColor)?.color ||
        PLOT_COLORS.defaultColor;

  // Compute decimal places for y-axis ticks ================
  const values = flatData
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
    activeDot: false, // Disable default activeDot since we handle hover ourselves
    isAnimationActive: false,
    animationEasing: "linear",
    stroke: "",
  };

  if (isBandPlot && bandMarker === "bandColorsIcons") {
    // Band markers (colours and icons)
    lineProps.dot = createDotCallback(graphID, Math.max(DOT_RADIUS, 2), {
      band: true,
      useShape: true,
    });
  } else if (isBandPlot && bandMarker === "bandColor") {
    // Band markers (colours only)
    lineProps.dot = createDotCallback(graphID, DOT_RADIUS, {
      band: true,
      useShape: false,
      color: selectedColor,
    });
  } else if (plotShape === "line") {
    // Lines
    lineProps.connectNulls = true;
    lineProps.isAnimationActive = true;
    lineProps.type = "linear";
    lineProps.stroke = selectedColor;
    lineProps.dot = createDotCallback(graphID, DOT_RADIUS, {
      // Hidden dots
      color: "rgba(0,0,0,0)",
    });
  } else {
    // Dots
    lineProps.dot = createDotCallback(graphID, DOT_RADIUS, {
      color: selectedColor,
    });
  }
  // ---------------------------------------------------------

  // Plot =================================================
  return (
    <ChartContainer
      ref={chartRef}
      className="pt-8 h-57 w-full"
      title={title}
      config={{}}
    >
      <h1 className="text-white text-lg font-thin text-center">{title}</h1>
      <LineChart
        width={500}
        margin={PLOT_DIMENSIONS.chartMargins}
        onMouseDown={mouseDown}
        onMouseMove={mouseMove}
        onMouseUp={mouseUp}
        onDoubleClick={doubleClick}
        onMouseLeave={mouseLeave}
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
          tickFormatter={dayObsTickFormatter}
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
        {showMoon &&
          chartMoon.map(({ start, end, startIsZigzag, endIsZigzag }, i) => {
            // Clamp moon intervals to the visible domain
            const clampedStart = Math.max(start, domain[0]);
            const clampedEnd = Math.min(end, domain[1]);

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
        {chartDataKey === "obs_start_millis" &&
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
        {chartDataKey === "fakeX" &&
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
        {groupedData.map((d, i) => (
          <Line
            {...lineProps}
            key={`chart-data-${i}`}
            data={d}
            animationBegin={(1500 * i) / groupedData.length}
            animationDuration={1500 / groupedData.length}
          />
        ))}
        {/* Hover indicator - positioned via direct DOM manipulation */}
        <ReferenceDot
          x={-9999}
          y={-9999}
          r={PLOT_DIMENSIONS.hoveredDotRadius}
          fill={PLOT_COLORS.hoveredDotFill}
          stroke={PLOT_COLORS.hoveredDotFill}
          // ifOverFlow is required because otherwise recharts will cull it from the DOM if it is not visible
          ifOverflow={"visible"}
          data-hover-indicator={graphID}
        />
      </LineChart>
    </ChartContainer>
  );
}

export default TimeseriesPlot;
