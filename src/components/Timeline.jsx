import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { useClickDrag } from "@/hooks/useClickDrag";
import {
  millisToDateTime,
  millisToHHmm,
  dayobsAtMidnight,
} from "@/utils/timeUtils";

// Small vertical lines to represent exposures in the timeline
const CustomisedDot = ({ cx, cy, stroke, h, w }) => {
  if (cx == null || cy == null) return null;

  // Defaults
  const height = h || 2;
  const width = w || 1;
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const fill = stroke || "#3CAE3F";

  return (
    <svg x={cx - halfWidth} y={cy - halfHeight} width={width} height={height}>
      <rect x={0} y={0} width={width} height={height} fill={fill} />
    </svg>
  );
};

function Timeline({
  data,
  twilightValues,
  illumValues,
  moonIntervals,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
}) {
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

  // Dayobs and moon illuminations labels along xAxis
  // Show vertical lines at midday dayobs borders
  // Show dayobs/illumination labels at midnights (UTC/Chile)
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
            style={{ WebkitUserSelect: "none" }}
          >
            {dayobsLabel}
          </text>
        </>
      );
    }

    // Convert to Chilean local time
    const dtChile = dt.setZone("America/Santiago");
    const isMidnightChile = dtChile.hour === 0;

    // Moon illumincation labels
    // Illumination data is retrieved at midnight Chilean time
    // so it makes sense to display value at that time.
    if (isMidnightChile) {
      // Get date prior to midnight
      const dayobs = dayobsAtMidnight(dtChile, "yyyyLLdd");
      // Find illumination by matching dayobs timestamp
      const illumEntry = illumValues.find((entry) => entry.dayobs === dayobs);
      // Get label
      const illumLabel = illumEntry?.illum ?? null;

      const DIST_FROM_xAXIS = 85; // distance from xAxis to label
      const X_OFFSET = 4; // offset between moon symbol and label
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

    return null;
  };

  const PLOT_HEIGHT = twilightValues.length > 1 ? 110 : 70;
  const PLOT_LABEL_HEIGHT = 20; // height of the top padding & xAxis label
  // --------------------------------------------------------

  // Timeline ===============================================
  return (
    <ResponsiveContainer
      title="Time Window Selector"
      config={{}}
      width="100%"
      height={PLOT_HEIGHT}
    >
      <LineChart
        width="100%"
        height={PLOT_HEIGHT}
        data={data}
        margin={{ top: PLOT_LABEL_HEIGHT, right: 30, left: 30, bottom: 0 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Timeline */}
        <ReferenceLine y={0.5} stroke="white" strokeWidth={1.5} />
        {/* Vertical lines on the hour */}
        {hourlyTicks.map((tick) => (
          <ReferenceLine key={tick} x={tick} stroke="white" opacity={0.1} />
        ))}
        {/* Dayobs & Moon Illumination labels and lines */}
        {twilightValues.length > 1 && (
          <XAxis
            xAxisId="dayobs"
            dataKey="obs_start_millis"
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
          dataKey="obs_start_millis"
          domain={[xMinMillis, xMaxMillis]}
          allowDataOverflow={true}
          type="number"
          scale="time"
          tick={false}
          axisLine={false}
          fontSize="20"
        />
        {/* Needed, not shown */}
        <YAxis hide domain={[0, 1]} />
        {/* Moon Up Area */}
        {moonIntervals.map(([start, end], i) => (
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
                style: { userSelect: "none" },
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
        {/* Data Points */}
        <Line
          dataKey={() => 0.5}
          stroke="#FFFFFF"
          type="linear"
          dot={<CustomisedDot stroke="#3CAE3F" h="20" w="1" />}
          isAnimationActive={false}
        />
        {/* Selection area (rectangle outline) shown once time window selection made */}
        {selectedMinMillis && selectedMaxMillis ? (
          <ReferenceArea
            x1={selectedMinMillis}
            x2={selectedMaxMillis}
            stroke="hotPink"
            fillOpacity={0}
          />
        ) : null}
        {/* Selection rectangle shown during active highlighting */}
        {refAreaLeft && refAreaRight ? (
          <ReferenceArea
            x1={refAreaLeft}
            x2={refAreaRight}
            fillOpacity={0.3}
            fill="pink"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export default Timeline;
