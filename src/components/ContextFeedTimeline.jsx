import { Fragment, useRef } from "react";

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
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";

// Small thin diamond shapes to represent events in the timeline
const CustomisedDot = ({ cx, cy, stroke, h, w, opacity = 1 }) => {
  if (cx == null || cy == null) return null;

  // Defaults
  const height = h || 8;
  const width = w || 4;
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const fill = stroke || "#3CAE3F";

  // Points for the diamond: top, right, bottom, left
  const points = `
    ${halfWidth},0 
    ${width},${halfHeight} 
    ${halfWidth},${height} 
    0,${halfHeight}
  `;

  return (
    <svg
      x={cx - halfWidth}
      y={cy - halfHeight}
      width={width}
      height={height}
      style={{ opacity }}
    >
      <polygon points={points} fill={fill} />
    </svg>
  );
};

function ContextFeedTimeline({
  data,
  twilightValues,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  columnFilters,
}) {
  // Ref for chart to enable DOM manipulation
  const chartRef = useRef(null);

  // Click & Drag plot hooks ================================
  const { mouseDown, mouseMove, mouseUp, doubleClick } = useDOMClickDrag({
    callback: setSelectedTimeRange,
    resetCallback: () => setSelectedTimeRange(fullTimeRange),
    chartRef,
    mouseRectStyle: { fill: "pink" },
    snappedRectStyle: { fill: "pink" },
  });
  // --------------------------------------------------------

  // Convert datetime inputs to millis format for plots ====
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  if (!xMinMillis || !xMaxMillis) return null;
  // --------------------------------------------------------

  // Axis Utils =============================================
  // TAI xAxis ticks
  const generateHourlyTicks = (startMillis, endMillis, intervalHours = 1) => {
    const ticks = [];

    // Get start of first hour and end of last hour on timeline
    let t = millisToDateTime(startMillis).startOf("hour");
    const endDt = millisToDateTime(endMillis).endOf("hour");

    // Loop through timeline, collecting hours
    while (t <= endDt) {
      ticks.push(t.toMillis());
      t = t.plus({ hours: intervalHours });
    }
    return ticks;
  };
  const hourlyTicks = generateHourlyTicks(xMinMillis, xMaxMillis, 1);

  //   Dayobs labels along xAxis
  //   Show vertical lines at midday dayobs borders
  //   Show dayobs labels at midnight (UTC)
  const renderDayobsTicks = ({ x, y, payload }) => {
    const { value } = payload;
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
          y1={y - PLOT_HEIGHT + DIST_BELOW_xAXIS}
          x2={x}
          y2={y + DIST_BELOW_xAXIS}
          stroke="grey"
        />
      );
    }

    // Dayobs labels
    if (isMidnightUTC) {
      // Get date prior to midnight
      const dayobsLabel = dayobsAtMidnight(dt, "yyyy-LL-dd");

      return (
        <>
          <text
            x={x}
            y={y + DIST_BELOW_xAXIS}
            fontSize={LABEL_TEXT_SIZE}
            textAnchor="middle"
            fill="grey"
            style={{
              WebkitUserSelect: "none",
              userSelect: "none",
            }}
          >
            {dayobsLabel}
          </text>
        </>
      );
    }

    return null;
  };

  // Extract active labels from filters to be used for opacity
  // of event markers in timeline.
  const activeLabels =
    columnFilters.find((f) => f.id === "event_type")?.value ?? [];

  const PLOT_HEIGHT = 290;
  const PLOT_LABEL_HEIGHT = 20; // height of the xAxis label
  // --------------------------------------------------------

  // Timeline ===============================================
  return (
    <ResponsiveContainer
      ref={chartRef}
      title="Time Window Selector"
      width="100%"
      height={PLOT_HEIGHT}
    >
      <LineChart
        width="100%"
        height={PLOT_HEIGHT}
        data={data}
        margin={{ top: 2, right: 2, left: 2, bottom: 0 }}
        onMouseDown={mouseDown}
        onMouseMove={mouseMove}
        onMouseUp={mouseUp}
        onDoubleClick={doubleClick}
      >
        {/* Timeline */}
        <ReferenceLine y={0} stroke="white" strokeWidth={1.5} />
        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine key={tick} x={tick} stroke="white" opacity={0.1} />
        ))}
        {/* Dayobs labels and lines */}
        {twilightValues.length > 1 && (
          <XAxis
            xAxisId="dayobs"
            dataKey="event_time_millis"
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
        )}
        {/* TAI Time Axis */}
        <XAxis
          dataKey="event_time_millis"
          domain={[xMinMillis, xMaxMillis]}
          allowDataOverflow={true}
          type="number"
          scale="time"
          tick={false}
          axisLine={false}
          fontSize="20"
        />
        {/* Fixed domain; 11 event types plotted at integer indices */}
        <YAxis hide domain={[0, 12]} />
        {/* Twilight Lines and Times */}
        {twilightValues.map((twi, i) =>
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
                style: {
                  WebkitUserSelect: "none",
                  userSelect: "none",
                },
              }}
            />
          ) : null,
        )}
        {/* Selection Area (shaded background) shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="none"
            fillOpacity={0.2}
          />
        ) : null}
        {/* Data Points & Lines */}
        {Object.values(CATEGORY_INDEX_INFO)
          .filter((info) => info.displayIndex != null) // exclude AUTOLOG
          .map((info) => {
            const { displayIndex, label, color } = info;
            const isActive =
              activeLabels.length === 0 || activeLabels.includes(label);
            const opacity = isActive ? 1 : 0.1;

            return (
              <Fragment key={displayIndex}>
                {/* Horizontal lines behind data points */}
                <ReferenceLine
                  // Take from 12 to display top to bottom
                  y={12 - displayIndex}
                  stroke="#606060"
                  strokeOpacity={opacity}
                  strokeWidth={1}
                  ifOverflow="visible"
                />
                {/* Data points */}
                <Line
                  data={data
                    .filter((d) => d.displayIndex === displayIndex)
                    .map((d) => ({ ...d, y: 12 - displayIndex }))}
                  dataKey="y"
                  stroke=""
                  dot={(props) => {
                    const { key } = props;
                    return (
                      <CustomisedDot
                        key={key}
                        cx={props.cx}
                        cy={props.cy}
                        stroke={color}
                        opacity={opacity}
                        h="16"
                        w="1"
                      />
                    );
                  }}
                  isAnimationActive={false}
                />
              </Fragment>
            );
          })}
        {/* Selection area (rectangle outline) shown once time window selection made */}
        {selectedMinMillis > 0 && selectedMaxMillis > 0 && (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="hotPink"
            fillOpacity={0}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default ContextFeedTimeline;
