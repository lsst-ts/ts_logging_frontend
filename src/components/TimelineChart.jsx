import { useRef } from "react";
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
 * @param {'line'|'diamond'} [props.markerType='line'] - Type of marker to use
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
  markerType = "line",
  selectionFill = "pink",
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
}) {
  // Ref for chart to enable DOM manipulation
  const chartRef = useRef(null);

  // Click & Drag plot hooks
  const { mouseDown, mouseMove, mouseUp, mouseLeave, doubleClick } =
    useDOMClickDrag({
      callback: setSelectedTimeRange,
      resetCallback: () => setSelectedTimeRange(fullTimeRange),
      chartRef,
      selectedTimeRange,
      mouseRectStyle: { fill: selectionFill },
      snappedRectStyle: { fill: selectionFill },
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
  const computedHeight = height || 110;

  // Marker configuration based on type
  const markerConfig = {
    line: { height: 20, width: 1 },
    diamond: { height: 16, width: 1 },
  };
  const { height: markerHeight, width: markerWidth } = markerConfig[markerType];

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
  const hourlyTicks = generateHourlyTicks(xMinMillis, xMaxMillis, 1);

  // Helper: Render dayobs ticks (labels and lines)
  const renderDayobsTicks = ({ x, y, payload }) => {
    const value = payload.value;
    const dt = millisToDateTime(value);

    const hourUTC = dt.hour;
    const isMiddayUTC = hourUTC === 12;
    const isMidnightUTC = hourUTC === 0;

    const DIST_BELOW_xAXIS = 10;
    const LABEL_TEXT_SIZE = 16;

    // Lines at midday dayobs borders
    if (isMiddayUTC) {
      return (
        <line
          x1={x}
          y1={y - computedHeight + DIST_BELOW_xAXIS}
          x2={x}
          y2={y + DIST_BELOW_xAXIS}
          stroke="grey"
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
            y={y + DIST_BELOW_xAXIS}
            fontSize={LABEL_TEXT_SIZE}
            textAnchor="middle"
            fill="grey"
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

        const DIST_FROM_xAXIS = 85;
        const X_OFFSET = 4;
        const MOON_RADIUS = 6;

        return (
          <>
            {illumLabel && (
              <>
                {/* Moon symbol */}
                <g
                  transform={`translate(${x - X_OFFSET}, ${
                    y - DIST_FROM_xAXIS - MOON_RADIUS
                  })`}
                >
                  <circle cx={0} cy={0} r={MOON_RADIUS} fill="white" />
                  <circle
                    cx={MOON_RADIUS / 2}
                    cy={-MOON_RADIUS / 2}
                    r={MOON_RADIUS}
                    fill="#27272a"
                  />
                </g>
                {/* Illumination value */}
                <text
                  x={x + X_OFFSET}
                  y={y - DIST_FROM_xAXIS}
                  fontSize={LABEL_TEXT_SIZE}
                  fontWeight={100}
                  letterSpacing={0.5}
                  fill="white"
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

  const PLOT_LABEL_HEIGHT = 20;

  // Calculate Y domain from data indices
  const indices = data.map((d) => d.index);
  const minIndex = Math.min(...indices);
  const maxIndex = Math.max(...indices);

  // Determine if single series (for horizontal line styling)
  const isSingleSeries = data.length === 1;

  // For multiple series, baseline should be at the bottom
  const baselineY = isSingleSeries ? null : 0;

  return (
    <ResponsiveContainer
      ref={chartRef}
      title="Time Window Selector"
      width="100%"
      height={computedHeight}
    >
      <LineChart
        width="100%"
        height={computedHeight}
        margin={{
          top: showMoonIllumination ? PLOT_LABEL_HEIGHT : 0,
          right: 30,
          left: 30,
          bottom: 0,
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
            stroke={isSingleSeries ? "white" : "#606060"}
            strokeWidth={isSingleSeries ? 1.5 : 1}
            strokeOpacity={entry.isActive ? 1 : 0.1}
          />
        ))}

        {/* Additional white baseline if multiple datasets */}
        {!isSingleSeries && baselineY !== null && (
          <ReferenceLine y={baselineY} stroke="white" strokeWidth={1.5} />
        )}

        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine key={tick} x={tick} stroke="white" opacity={0.1} />
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
          height={PLOT_LABEL_HEIGHT}
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
          fontSize="20"
        />

        {/* Y Axis */}
        <YAxis
          hide
          domain={
            isSingleSeries
              ? [minIndex - 0.5, maxIndex + 0.5]
              : [0, Math.max(maxIndex + 0.5, 10)]
          }
        />

        {/* Moon Up Area */}
        {showMoonArea &&
          moonIntervals.map(([start, end], i) => (
            <ReferenceArea
              key={`moon-up-${i}`}
              x1={start}
              x2={end}
              fillOpacity={0.2}
              fill="#EAB308"
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
                stroke="#0ea5e9"
                strokeWidth={3}
                yAxisId="0"
                label={{
                  value: `${millisToHHmm(twi)}`,
                  position: "bottom",
                  fill: "white",
                  dy: 5,
                  fontSize: 16,
                  fontWeight: 100,
                  letterSpacing: 0.5,
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
                type={markerType}
                h={markerHeight}
                w={markerWidth}
                opacity={entry.isActive ? 1 : 0.1}
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
            stroke="hotPink"
            fillOpacity={0.2}
            className="selection-highlight"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default TimelineChart;
