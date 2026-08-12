import { formatTimestamp, formatDuration } from "@/utils/timeUtils";
import {
  SERIES_ORDER,
  STATUS_COLORS,
  STATUS_CUMULATIVE_MARGINS,
  STATUS_CUMULATIVE_DIMENSIONS,
  STATUS_CUMULATIVE_SERIES_ORDER,
  STATUS_CUMULATIVE_PLOT_COLOURS,
  STATUS_CUMULATIVE_ELEMENTS_Z,
  STATUS_CUMULATIVE_LEGEND_LABELS,
  STATUS_CUMULATIVE_AREA_OPACITY,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  TIMELINE_DIMENSIONS,
  TIMELINE_COLORS,
} from "@/constants/TIMELINE_DEFINITIONS";

/**
 * Build the ECharts option for the Observatory Status cumulative plot.
 * @param {Object} param0
 * @param {Object} param0.model Result of buildCumulativePlotModel.
 * @param {Array} param0.markerData Flattened marker records built from the state series.
 * @param {Object} param0.markerSize Sizing per marker state, resolved for applet/fullscreen.
 * @param {Object} param0.fontSize Font sizes, resolved for applet/fullscreen.
 * @param {Object} param0.variableDimensions Variable dimensions, resolved for applet/fullscreen.
 * @param {Array} [param0.xDomain] Current zoomed x-domain in millis.
 * @param {Array} [param0.yDomain] Current zoomed y-domain.
 * @returns {Object} ECharts option.
 */
export function buildCumulativePlotOption({
  model,
  markerData,
  markerSize,
  fontSize,
  variableDimensions,
  xDomain,
  yDomain,
}) {
  const { breaks, nightHours, openDomeSeries, stateSeries } = model;

  return {
    useUTC: true,
    animation: false,
    toolbox: { show: false },
    title: {
      text: "Cumulative Time in State",
      textStyle: {
        color: STATUS_CUMULATIVE_PLOT_COLOURS.NAMES,
        fontSize: fontSize.TITLE_FONT_SIZE,
        fontWeight: "lighter",
      },
      top: STATUS_CUMULATIVE_DIMENSIONS.TITLE_TOP,
    },
    tooltip: {
      trigger: "item",
      triggerOn: "none",
      confine: true,
      backgroundColor: "none",
      borderColor: "none",
      borderWidth: 0,
      padding: 0,
      // Replicates ECharts' native tooltip positioning, which is lost when
      // the tooltip is triggered programmatically via dispatchAction.
      // Positions the tooltip to the right of the marker with a 10px gap,
      // flipping to the left if it would overflow the chart. Vertically
      // centered on the marker, clamped to stay within the chart bounds.
      position: (point, _params, _dom, _rect, size) => {
        const [x, y] = point;
        const [cw, ch] = size.contentSize;
        const [vw, vh] = size.viewSize;
        const offset = 16;
        const tx = x + offset + cw <= vw ? x + offset : x - offset - cw;
        const ty = Math.max(0, Math.min(y - ch / 2, vh - ch));
        return [tx, ty];
      },
      formatter: (params) => {
        if (params.seriesType !== "scatter") return undefined;
        const { time_ms, duration, status, note, clippedAtSunset } =
          params.data;

        // Format time using the standard formatter
        const timeFormatted = formatTimestamp(time_ms);
        const durationFormatted = formatDuration(duration);

        // Escape HTML to prevent XSS while displaying raw text
        const escapedNote = note
          ? note
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;")
          : "";

        // Build two-column tooltip HTML with Tailwind classes
        return `
          <div class="font-mono text-stone-100 bg-black opacity-80 p-5 border-1 border-stone-200 rounded-sm">
            ${
              clippedAtSunset
                ? `<p class="italic">Status change occured prior to sunset; duration is clipped.</p></br>`
                : ""
            }
            <table class="border-collapse">
              <tr>
                <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">Time:</td>
                <td class="text-stone-100 whitespace-nowrap">${timeFormatted}</td>
              </tr>
              <tr>
                <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">State:</td>
                <td class="text-stone-100 whitespace-nowrap">${status}</td>
              </tr>
              <tr>
                <td class="font-semibold pr-3 whitespace-nowrap text-stone-100 ">Duration:</td>
                <td class="text-stone-100 whitespace-nowrap">${durationFormatted}</td>
              </tr>
              ${
                note
                  ? `<tr><td class="font-semibold pr-3 whitespace-nowrap pt-2 text-stone-100 ">Note:</td><td class="font-light pt-2 text-stone-300 max-w-[300px] break-words whitespace-normal">${escapedNote}</td></tr>`
                  : ""
              }
            </table>
          </div>
        `;
      },
    },
    legend: {
      borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.BORDERS,
      borderWidth: STATUS_CUMULATIVE_DIMENSIONS.LEGEND_BORDER_WIDTH,
      borderRadius: STATUS_CUMULATIVE_DIMENSIONS.LEGEND_BORDER_RADIUS,
      backgroundColor: STATUS_CUMULATIVE_PLOT_COLOURS.LEGEND_BACKGROUND,
      bottom: STATUS_CUMULATIVE_DIMENSIONS.LEGEND_BORDER_BOTTOM,
      textStyle: {
        color: STATUS_CUMULATIVE_PLOT_COLOURS.NAMES,
        fontWeight: "lighter",
        fontSize: fontSize.LEGEND_FONT_SIZE,
      },
      lineStyle: {
        width: STATUS_CUMULATIVE_DIMENSIONS.LEGEND_LINES_WIDTH,
        inactiveColor: STATUS_CUMULATIVE_PLOT_COLOURS.BORDERS,
        inactiveWidth: STATUS_CUMULATIVE_DIMENSIONS.LEGEND_INACTIVE_WIDTH,
      },
      data: [
        { name: "night hours" },
        { name: "open dome" },
        ...SERIES_ORDER.filter((stateName) => stateName !== "DAYTIME").map(
          (stateName) => ({
            name: `${
              STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
            }`,
          }),
        ),
      ],
    },
    grid: {
      z: STATUS_CUMULATIVE_ELEMENTS_Z.GRID,
      top: variableDimensions.GRID_TOP,
      left: STATUS_CUMULATIVE_MARGINS.left,
      right: STATUS_CUMULATIVE_MARGINS.right,
      bottom: STATUS_CUMULATIVE_MARGINS.bottom,
      borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.BORDERS,
      borderWidth: STATUS_CUMULATIVE_DIMENSIONS.GRID_BORDER_WIDTH,
      show: true,
      containLabel: true, // deprecated, but still has effect
      outerBoundsMode: "same",
    },
    xAxis: {
      type: "time",
      name: "UTC",
      nameLocation: "center",
      nameGap: variableDimensions.X_AXIS_NAME_GAP,
      nameTextStyle: {
        color: STATUS_CUMULATIVE_PLOT_COLOURS.NAMES,
        fontWeight: "lighter",
        fontSize: fontSize.X_AXIS_NAME_FONT_SIZE,
      },
      min: xDomain?.[0] ?? nightHours?.[0][0],
      max: xDomain?.[1] ?? nightHours?.[nightHours.length - 1][0],
      minInterval: 180 * 1000,
      maxInterval: 3600 * 1000,
      interval: 3600 * 1000,
      axisLine: { show: false },
      splitLine: { show: false },
      axisTick: {
        show: true,
        length: TIMELINE_DIMENSIONS.HOURLY_TICK_LENGTH,
        lineStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.AXIS_TICK,
          width: STATUS_CUMULATIVE_DIMENSIONS.AXIS_TICK_WIDTH,
        },
      },
      axisLabel: {
        show: true,
        showMinLabel: false,
        showMaxLabel: false,
        hideOverlap: true,
        formatter: (val) => {
          const d = new Date(val);
          const h = d.getUTCHours();
          const m = d.getUTCMinutes();

          return `${h}:${String(m).padStart(2, "0")}`;
        },
        margin: variableDimensions.X_AXIS_LABEL_MARGIN,
        fontSize: fontSize.X_AXIS_LABEL_FONT_SIZE,
        color: STATUS_CUMULATIVE_PLOT_COLOURS.AXIS_LABEL,
        fontWeight: "lighter",
      },
      // Add day breaks to show only nights.
      breaks: breaks,
      breakArea: {
        expandOnClick: false,
        zigzagAmplitude: 0,
        zigzagZ: STATUS_CUMULATIVE_ELEMENTS_Z.X_AXIS_BREAKS,
        itemStyle: {
          borderType: "solid",
          borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.BORDERS,
          borderWidth: STATUS_CUMULATIVE_DIMENSIONS.BREAK_BORDER_WIDTH,
          color: STATUS_CUMULATIVE_PLOT_COLOURS.BREAK_AREA_FILL,
          opacity: 1,
        },
      },
    },
    yAxis: {
      type: "value",
      name: "Cumulative Hours",
      nameLocation: "center",
      nameRotate: 90,
      nameGap: STATUS_CUMULATIVE_DIMENSIONS.Y_AXIS_NAME_GAP,
      nameTextStyle: {
        color: STATUS_CUMULATIVE_PLOT_COLOURS.NAMES,
        fontWeight: "lighter",
        fontSize: fontSize.Y_AXIS_NAME_FONT_SIZE,
      },
      min: yDomain?.[0],
      max: yDomain?.[1],
      axisTick: {
        show: true,
        lineStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.AXIS_TICK,
          width: STATUS_CUMULATIVE_DIMENSIONS.AXIS_TICK_WIDTH,
        },
      },
      axisLabel: {
        show: true,
        color: STATUS_CUMULATIVE_PLOT_COLOURS.AXIS_LABEL,
        fontWeight: "lighter",
        fontSize: fontSize.Y_AXIS_LABEL_FONT_SIZE,
        width: STATUS_CUMULATIVE_DIMENSIONS.Y_AXIS_LABEL_WIDTH,
        formatter: (val) => parseFloat(val.toFixed(2)),
      },
      splitLine: {
        lineStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.HOUR_LINES,
        },
      },
    },
    // TODO: (OSW-2444) align zoom functionality with other plots
    brush: {
      toolbox: [],
      brushType: "rect",
      xAxisIndex: 0,
      yAxisIndex: 0,
      brushMode: "single",
      brushStyle: {
        borderColor: TIMELINE_COLORS.SELECTION_STROKE,
        color: TIMELINE_COLORS.DEFAULT_SELECTION_FILL,
        borderWidth: 1,
        opacity: 1,
      },
      inBrush: {},
      outOfBrush: {},
    },
    series: [
      // Status-update vertical lines
      {
        type: "scatter",
        id: "status-update-lines",
        silent: true,
        animation: false,
        markLine: {
          silent: true,
          z: STATUS_CUMULATIVE_ELEMENTS_Z.VERTICAL_LINES,
          symbol: ["none", "none"],
          lineStyle: {
            color: STATUS_CUMULATIVE_PLOT_COLOURS.STATUS_UPDATE_LINES,
            opacity: STATUS_CUMULATIVE_DIMENSIONS.VERTICAL_LINES_OPACITY,
            width: STATUS_CUMULATIVE_DIMENSIONS.VERTICAL_LINES_WIDTH,
            type: "solid",
          },
          label: { show: false },
          data: markerData.map((i) => ({ xAxis: i.value[0] })),
        },
      },
      // State time accumulation lines
      ...STATUS_CUMULATIVE_SERIES_ORDER.map((stateName) => ({
        type: "line",
        data: stateSeries?.[stateName],
        id: `state-line-${
          STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
        }`,
        name: `${STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName}`,
        lineStyle: {
          color: STATUS_COLORS[stateName],
          width: STATUS_CUMULATIVE_DIMENSIONS.STATE_LINE_WIDTH,
        },
        areaStyle: {
          color: STATUS_COLORS[stateName],
          opacity: STATUS_CUMULATIVE_AREA_OPACITY[stateName],
        },
        itemStyle: {
          opacity: 0,
        },
        z: STATUS_CUMULATIVE_ELEMENTS_Z.STATE_LINES,
      })),
      // Open dome line
      {
        type: "line",
        data: openDomeSeries,
        name: "open dome",
        id: "open-dome",
        lineStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.OPEN_DOME_LINE,
          width: STATUS_CUMULATIVE_DIMENSIONS.OPEN_DOME_LINE_WIDTH,
        },
        itemStyle: {
          opacity: 0,
        },
        z: STATUS_CUMULATIVE_ELEMENTS_Z.OPEN_DOME_LINE,
      },
      // Night Hours - horizontal lines marking available observing hours
      {
        type: "line",
        data: nightHours,
        name: "night hours",
        id: "night-hours",
        lineStyle: {
          color: STATUS_CUMULATIVE_PLOT_COLOURS.NIGHT_HOURS_LINE,
          opacity: 1,
          type: "solid",
          width: STATUS_CUMULATIVE_DIMENSIONS.NIGHT_HOURS_LINE_WIDTH,
        },
        itemStyle: {
          opacity: 0,
        },
        z: STATUS_CUMULATIVE_ELEMENTS_Z.NIGHT_HOURS,
      },
      // Markers at the start of each interval: diamond if has note, circle if not
      ...STATUS_CUMULATIVE_SERIES_ORDER.map((stateName) => ({
        type: "scatter",
        name: `${STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName}`,
        data: markerData.filter((d) => d.stateName == stateName),
        id: `state-marker-${
          STATUS_CUMULATIVE_LEGEND_LABELS?.[stateName] ?? stateName
        }`,
        itemStyle: {
          color: (params) =>
            STATUS_COLORS[params.data.stateName] ??
            STATUS_CUMULATIVE_PLOT_COLOURS.MARKER_BORDER,
          borderColor: STATUS_CUMULATIVE_PLOT_COLOURS.MARKER_BORDER,
          borderWidth: STATUS_CUMULATIVE_DIMENSIONS.MARKER_BORDER_WIDTH,
          opacity: 1,
        },
        symbol: (value, params) => (params.data.hasNote ? "diamond" : "circle"),
        symbolSize: (value, params) =>
          params.data.hasNote ? markerSize.WITH_NOTE : markerSize.WITHOUT_NOTE,
        z: STATUS_CUMULATIVE_ELEMENTS_Z.MARKERS,
      })),
    ],
  };
}
