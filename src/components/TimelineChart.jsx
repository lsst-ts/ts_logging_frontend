import { useCallback, useRef } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { useDOMClickDrag } from "@/hooks/useDOMClickDrag";
import {
  millisToDateTime,
  millisToHHmm,
  dayobsAtMidnight,
} from "@/utils/timeUtils";
import TimelineMarker from "@/components/TimelineMarker";
import {
  TIMELINE_DIMENSIONS,
  TIMELINE_MARGINS,
  TIMELINE_COLORS,
  TIMELINE_TEXT_STYLES,
  TIMELINE_OPACITY,
  TIMELINE_INTERVALS,
  TIMELINE_Y_DOMAIN,
} from "@/constants/TIMELINE_DEFINITIONS";

/**
 * Unified timeline chart component for displaying events over time.
 *
 * @param {Object} props
 * @param {Array<{index: number, timestamps: number[], color: string, isActive: boolean}>} props.data - Data series to display
 * @param {[DateTime, DateTime]} props.fullTimeRange - Full time range for the chart
 * @param {[DateTime, DateTime]} props.selectedTimeRange - Currently selected time range
 * @param {Function} props.setSelectedTimeRange - Function to update selected time range
 * @param {boolean} [props.showTwilight=false] - Whether to show twilight lines
 * @param {number[]} [props.twilightValues=[]] - Twilight times in milliseconds
 * @param {boolean} [props.showMoonArea=false] - Whether to show moon-up areas
 * @param {Array<[number, number]>} [props.moonIntervals=[]] - Moon-up intervals
 * @param {boolean} [props.showMoonIllumination=false] - Whether to show moon illumination labels
 * @param {Array<{dayobs: string, illum: string}>} [props.illumValues=[]] - Moon illumination values
 * @param {number} [props.height] - Chart height (auto-calculated if not provided)
 * @param {string} [props.selectionFill='pink'] - Fill color for selection rectangles
 * @param {Function} [props.onMouseDown] - Optional callback for mouseDown event
 * @param {Function} [props.onMouseMove] - Optional callback for mouseMove event
 * @param {Function} [props.onMouseUp] - Optional callback for mouseUp event
 * @param {Function} [props.onDoubleClick] - Optional callback for doubleClick event
 */
function TimelineChart({
  data,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  showTwilight = false,
  twilightValues = [],
  showMoonArea = false,
  moonIntervals = [],
  showMoonIllumination = false,
  illumValues = [],
  height,
  selectionFill = "pink",
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
}) {
  // Ref for chart to enable DOM manipulation
  const chartRef = useRef(null);

  // Click & Drag plot hooks - callback calculates time from fractions
  const handleSelection = useCallback(
    (start, end) => {
      // Calculate times from fractions of fullTimeRange
      const startMillis = fullTimeRange[0].toMillis();
      const endMillis = fullTimeRange[1].toMillis();
      const range = endMillis - startMillis;

      // Round to integer milliseconds
      const startTime = millisToDateTime(
        Math.round(startMillis + start.fractionX * range),
      );
      const endTime = millisToDateTime(
        Math.round(startMillis + end.fractionX * range),
      );

      // Set time range in correct order
      const minTime = startTime < endTime ? startTime : endTime;
      const maxTime = startTime < endTime ? endTime : startTime;
      setSelectedTimeRange([minTime, maxTime]);
    },
    [setSelectedTimeRange, fullTimeRange],
  );

  const { mouseDown, mouseMove, mouseUp, mouseLeave, doubleClick } =
    useDOMClickDrag({
      callback: handleSelection,
      resetCallback: () => setSelectedTimeRange(fullTimeRange),
      chartRef,
      mouseRectStyle: { fill: selectionFill },
      showSnappedRect: false,
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onDoubleClick,
    });

  // Convert datetime inputs to millis format for plots
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  if (!xMinMillis || !xMaxMillis) return null;

  // Compute height if not provided
  const computedHeight = height || TIMELINE_DIMENSIONS.DEFAULT_HEIGHT;

  // Marker configuration based on type

  // Helper: Generate hourly ticks for xAxis
  const generateHourlyTicks = (startMillis, endMillis, intervalHours = 1) => {
    const ticks = [];
    let t = millisToDateTime(startMillis).startOf("hour");
    const endDt = millisToDateTime(endMillis).endOf("hour");

    while (t <= endDt) {
      ticks.push(t.toMillis());
      t = t.plus({ hours: intervalHours });
    }
    return ticks;
  };
  const hourlyTicks = generateHourlyTicks(
    xMinMillis,
    xMaxMillis,
    TIMELINE_INTERVALS.HOURLY_TICK_INTERVAL,
  );

  // Helper: Render dayobs ticks (labels and lines)
  const renderDayobsTicks = ({ x, y, payload }) => {
    const value = payload.value;
    const dt = millisToDateTime(value);

    const hourUTC = dt.hour;
    const isMiddayUTC = hourUTC === 12;
    const isMidnightUTC = hourUTC === 0;

    // Lines at midday dayobs borders
    if (isMiddayUTC) {
      return (
        <line
          x1={x}
          y1={y - computedHeight + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
          x2={x}
          y2={y + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
          stroke={TIMELINE_COLORS.DAYOBS_BORDER}
        />
      );
    }

    // Dayobs labels
    if (isMidnightUTC) {
      const dayobsLabel = dayobsAtMidnight(dt, "yyyy-LL-dd");

      return (
        <>
          <text
            x={x}
            y={y + TIMELINE_DIMENSIONS.DIST_BELOW_X_AXIS}
            fontSize={TIMELINE_DIMENSIONS.LABEL_TEXT_SIZE}
            textAnchor="middle"
            fill={TIMELINE_COLORS.DAYOBS_LABEL}
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            {dayobsLabel}
          </text>
        </>
      );
    }

    // Moon illumination labels
    if (showMoonIllumination) {
      const dtChile = dt.setZone("America/Santiago");
      const isMidnightChile = dtChile.hour === 0;

      if (isMidnightChile) {
        const dayobs = dayobsAtMidnight(dtChile, "yyyyLLdd");
        const illumEntry = illumValues.find((entry) => entry.dayobs === dayobs);
        const illumLabel = illumEntry?.illum ?? null;

        return (
          <>
            {illumLabel && (
              <>
                {/* Moon symbol */}
                <g
                  transform={`translate(${x - TIMELINE_DIMENSIONS.X_OFFSET}, ${
                    y -
                    TIMELINE_DIMENSIONS.DIST_FROM_X_AXIS -
                    TIMELINE_DIMENSIONS.MOON_RADIUS
                  })`}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={TIMELINE_DIMENSIONS.MOON_RADIUS}
                    fill={TIMELINE_COLORS.MOON_SYMBOL_LIGHT}
                  />
                  <circle
                    cx={TIMELINE_DIMENSIONS.MOON_RADIUS / 2}
                    cy={-TIMELINE_DIMENSIONS.MOON_RADIUS / 2}
                    r={TIMELINE_DIMENSIONS.MOON_RADIUS}
                    fill={TIMELINE_COLORS.MOON_SYMBOL_DARK}
                  />
                </g>
                {/* Illumination value */}
                <text
                  x={x + TIMELINE_DIMENSIONS.X_OFFSET}
                  y={y - TIMELINE_DIMENSIONS.DIST_FROM_X_AXIS}
                  fontSize={TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE}
                  fontWeight={TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT}
                  letterSpacing={TIMELINE_TEXT_STYLES.LABEL_LETTER_SPACING}
                  fill={TIMELINE_COLORS.MOON_LABEL}
                  textAnchor="left"
                  style={{ userSelect: "none" }}
                >
                  {illumLabel}
                </text>
              </>
            )}
          </>
        );
      }
    }

    return null;
  };

  // Calculate Y domain from data indices
  const indices = data.map((d) => d.index);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);

  // Determine if single series (for horizontal line styling)
  const isSingleSeries = data.length === 1;

  // For multiple series, baseline should be at the bottom
  const baselineY = isSingleSeries ? null : TIMELINE_Y_DOMAIN.MULTI_SERIES_MIN;

  return (
    <ResponsiveContainer
      ref={chartRef}
      title="Time Window Selector"
      width="100%"
      height={computedHeight}
      style={{ userSelect: "none" }}
    >
      <LineChart
        width="100%"
        height={computedHeight}
        margin={{
          top: showMoonIllumination
            ? TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT
            : TIMELINE_MARGINS.top,
          right: TIMELINE_MARGINS.right,
          left: TIMELINE_MARGINS.left,
          bottom: TIMELINE_MARGINS.bottom,
        }}
        onMouseDown={mouseDown}
        onMouseMove={mouseMove}
        onMouseUp={mouseUp}
        onMouseLeave={mouseLeave}
        onDoubleClick={doubleClick}
      >
        {/* Horizontal lines at each data series y-value */}
        {data.map((entry, i) => (
          <ReferenceLine
            key={`hline-${i}`}
            y={entry.index}
            stroke={
              isSingleSeries
                ? TIMELINE_COLORS.SINGLE_SERIES_LINE
                : TIMELINE_COLORS.MULTI_SERIES_LINE
            }
            strokeWidth={
              isSingleSeries
                ? TIMELINE_COLORS.SINGLE_SERIES_STROKE_WIDTH
                : TIMELINE_COLORS.MULTI_SERIES_STROKE_WIDTH
            }
            strokeOpacity={
              entry.isActive
                ? TIMELINE_OPACITY.ACTIVE
                : TIMELINE_OPACITY.INACTIVE
            }
          />
        ))}

        {/* Additional white baseline if multiple datasets */}
        {!isSingleSeries && baselineY !== null && (
          <ReferenceLine
            y={baselineY}
            stroke={TIMELINE_COLORS.SINGLE_SERIES_LINE}
            strokeWidth={TIMELINE_COLORS.SINGLE_SERIES_STROKE_WIDTH}
          />
        )}

        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine
            key={tick}
            x={tick}
            stroke={TIMELINE_COLORS.GRID_LINE}
            opacity={TIMELINE_COLORS.GRID_OPACITY}
          />
        ))}

        {/* Dayobs & Moon Illumination labels and lines */}
        <XAxis
          xAxisId="dayobs"
          dataKey="timestamp"
          domain={[xMinMillis, xMaxMillis]}
          allowDataOverflow
          type="number"
          scale="time"
          ticks={hourlyTicks}
          interval={0}
          axisLine={false}
          tickLine={false}
          tick={renderDayobsTicks}
          height={TIMELINE_DIMENSIONS.PLOT_LABEL_HEIGHT}
        />

        {/* TAI Time Axis */}
        <XAxis
          dataKey="timestamp"
          domain={[xMinMillis, xMaxMillis]}
          allowDataOverflow={true}
          type="number"
          scale="time"
          tick={false}
          axisLine={false}
          fontSize={TIMELINE_TEXT_STYLES.AXIS_FONT_SIZE}
        />

        {/* Y Axis */}
        <YAxis
          hide
          domain={
            isSingleSeries
              ? [
                  minIndex - TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
                  maxIndex + TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
                ]
              : [
                  TIMELINE_Y_DOMAIN.MULTI_SERIES_MIN,
                  Math.max(
                    maxIndex + TIMELINE_Y_DOMAIN.SINGLE_SERIES_PADDING,
                    TIMELINE_Y_DOMAIN.MULTI_SERIES_MIN_MAX,
                  ),
                ]
          }
        />

        {/* Moon Up Area */}
        {showMoonArea &&
          moonIntervals.map(([start, end], i) => (
            <ReferenceArea
              key={`moon-up-${i}`}
              x1={start}
              x2={end}
              fillOpacity={TIMELINE_COLORS.MOON_AREA_OPACITY}
              fill={TIMELINE_COLORS.MOON_AREA_FILL}
              yAxisId="0"
            />
          ))}

        {/* Twilight Lines and Times */}
        {showTwilight &&
          twilightValues.map((twi, i) =>
            xMinMillis <= twi && twi <= xMaxMillis ? (
              <ReferenceLine
                key={`twilight-${i}-${twi}`}
                x={twi}
                stroke={TIMELINE_COLORS.TWILIGHT_LINE}
                strokeWidth={TIMELINE_COLORS.TWILIGHT_STROKE_WIDTH}
                yAxisId="0"
                label={{
                  value: `${millisToHHmm(twi)}`,
                  position: "bottom",
                  fill: TIMELINE_COLORS.TWILIGHT_LABEL,
                  dy: 5,
                  fontSize: TIMELINE_TEXT_STYLES.LABEL_FONT_SIZE,
                  fontWeight: TIMELINE_TEXT_STYLES.LABEL_FONT_WEIGHT,
                  letterSpacing: TIMELINE_TEXT_STYLES.LABEL_LETTER_SPACING,
                  style: { userSelect: "none" },
                }}
              />
            ) : null,
          )}

        {/* Data points */}
        {data.map((entry, i) => (
          <Line
            key={`data-${i}`}
            data={entry.timestamps.map((t) => ({
              timestamp: t,
              y: entry.index,
            }))}
            dataKey="y"
            stroke=""
            dot={(props) => (
              <TimelineMarker
                cx={props.cx}
                cy={props.cy}
                color={entry.color}
                opacity={
                  entry.isActive
                    ? TIMELINE_OPACITY.ACTIVE
                    : TIMELINE_OPACITY.INACTIVE
                }
              />
            )}
            isAnimationActive={false}
          />
        ))}

        {/* Selection area (rectangle outline) shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke={TIMELINE_COLORS.SELECTION_STROKE}
            fillOpacity={TIMELINE_COLORS.SELECTION_FILL_OPACITY}
            className="selection-highlight"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TimelineChart;
