import { useCallback, useEffect, useRef, useMemo } from "react";
import * as echarts from "echarts";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import {
  buildBrushConfig,
  buildTwilightSeries,
  buildTimelineGraphicElements,
} from "@/utils/timelineUtils";
import {
  transformStatusToSeries,
  buildCumulativePlotModel,
} from "@/utils/observatoryStatusUtils";
import { formatTimestamp } from "@/utils/timeUtils";
import {
  SERIES_ORDER,
  STATUS_COLORS,
  STATUS_BAR_COLORS,
  STATUS_TIMELINE_DIMENSIONS,
  STATUS_TIMELINE_MARGINS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import {
  TIMELINE_COLORS,
  TIMELINE_MARGINS,
  TIMELINE_DIMENSIONS,
} from "@/constants/TIMELINE_DEFINITIONS";
import { useEChartsTimeline } from "@/hooks/useEChartsTimeline";

import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

// TODO: remove once ready to use real data
import openDomeTimes_static from "../assets/OpenDomeTimes.json";
import stateIntervals_static from "../assets/stateIntervals.json";

/**
 * Observatory status applet.
 */
function ObservatoryStatusApplet({
  intervals = [],
  availability, // TODO: (OSW-2444) Handle availability
  openDomeTimes = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  loading,
  brushGroup = null,
}) {
  // const isLoading = loading || !openDomeTimes || !intervals;
  const isLoading = false;

  const containerRef = useRef(null);
  const markerDataRef = useRef([]);
  const markerSeriesIdxRef = useRef(-1);

  // console.log("intervals: ", intervals);
  // console.log("availability: ", availability);
  // console.log("openDomeTimes: ", openDomeTimes);
  // console.log("fullTimeRange: ", fullTimeRange);
  // console.log("selectedTimeRange: ", selectedTimeRange);
  // console.log("setSelectedTimeRange: ", setSelectedTimeRange);
  // console.log("loading: ", loading);
  // console.log("brushGroup: ", brushGroup);

  // Only used as a backup in the following function.
  const computedHeight = 0;

  // ── Graphic elements (dayobs labels, border lines, baseline) ────────────────
  // These are positioned in pixel space, so must be computed after render.
  // Defined before the option useEffect so it can be in its dependency array.
  const updateGraphicElements = useCallback(
    (instance) => {
      const result = buildTimelineGraphicElements(instance, containerRef, {
        fullTimeRange,
        computedHeight,
        showBaseline: false,
      });
      if (!result) return;

      instance.setOption({ graphic: result.elements });
    },
    [fullTimeRange, computedHeight],
  );

  // console.log("updateGraphicElements: ", updateGraphicElements);

  const { instanceRef, syncBrushToSelection, xAxisOption } = useEChartsTimeline(
    containerRef,
    {
      fullTimeRange,
      selectedTimeRange,
      setSelectedTimeRange,
      onResize: updateGraphicElements,
      brushGroup,
    },
  );

  // console.log("instanceRef: ", instanceRef);
  // console.log("syncBrushToSelection: ", syncBrushToSelection);
  // console.log("xAxisOption: ", xAxisOption);

  // ── Tooltip hit detection (brush intercepts ECharts mouse events) ──────────
  // The brush overlay captures all pointer events, so ECharts' own hover
  // never fires over a brush selection. We listen natively, find the nearest
  // marker by pixel distance, and dispatch showTip with a concrete
  // seriesIndex+dataIndex (bypasses internal hit testing entirely).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let activeDataIndex = -1;

    const handleMouseMove = (e) => {
      const instance = instanceRef.current;
      const seriesIdx = markerSeriesIdxRef.current;
      if (!instance || seriesIdx === -1) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const data = markerDataRef.current;
      let closestIdx = -1;
      let closestDist = Infinity;
      let closestPixel = null;

      for (let i = 0; i < data.length; i++) {
        const pixel = instance.convertToPixel(
          { seriesIndex: seriesIdx },
          data[i].value,
        );
        if (!pixel) continue;
        const dx = pixel[0] - mouseX;
        const dy = pixel[1] - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius =
          (data[i].hasNote
            ? STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE_WITH_NOTE
            : STATUS_TIMELINE_DIMENSIONS.MARKER_SIZE) / 2;
        if (dist < radius && dist < closestDist) {
          closestDist = dist;
          closestIdx = i;
          closestPixel = pixel;
        }
      }

      if (closestIdx === activeDataIndex) return;
      activeDataIndex = closestIdx;

      if (closestIdx !== -1) {
        instance.dispatchAction({
          type: "showTip",
          seriesIndex: seriesIdx,
          dataIndex: closestIdx,
          x: closestPixel[0],
          y: closestPixel[1],
        });
      } else {
        instance.dispatchAction({ type: "hideTip" });
      }
    };

    const handleMouseLeave = () => {
      activeDataIndex = -1;
      instanceRef.current?.dispatchAction({ type: "hideTip" });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Build and apply the ECharts option ─────────────────────────────────────
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const xMinMillis = fullTimeRange[0]?.toMillis();
    const xMaxMillis = fullTimeRange[1]?.toMillis();
    if (!xMinMillis || !xMaxMillis) return;
  
    const {
      breaks,
      nightHours,
      stateSeries,
      // markerSeries,
      openDomeSeries,
    } = buildCumulativePlotModel(
      // intervals,
      // openDomeTimes,
      stateIntervals_static,
      openDomeTimes_static,
      availability,
    )

    // console.log("openDomeSeries: ", openDomeSeries);
    // console.log("stateSeries: ", stateSeries);
  
    // Modify CF option to suit applet.
    // Swap fullTimeRange out for sunset-sunrise.
    xAxisOption.min = nightHours[0][0];
    xAxisOption.max = nightHours[nightHours.length - 1][0];
    // Add day breaks to show only nights.
    xAxisOption.breaks = breaks;
    xAxisOption.breakArea = {
      expandOnClick: false,
      zigzagAmplitude: 0,
      // zigzagZ: 200,
      itemStyle: {
        opacity: 0.1,
        borderColor: "grey",
        // fillColor: "#0ea5e9", // Sky blue
        // lineWidth: 2,
        // lineType: "solid",
      }
    };

    const option = {
      animation: false,
      // toolbox: { show: false },
      // backgroundColor: "transparent",
      title: {
        text: "Cumulative Time in State",
        textStyle: {
          // height: 50,
          color: "#bbbbbb",
          fontSize: 18,
          fontWeight: "normal", // don't think its working
        },
        top: 10,
        // padding: 0,
      },
      tooltip: {
        trigger: "axis",
        confine: true,
      },
      // legend: {
      //   bottom: -10,
      //   textStyle: {
      //     color: "#ffffff",
      //   },
      // },
      grid: {
        top: 40,
        right: STATUS_TIMELINE_MARGINS.right,
        left: STATUS_TIMELINE_MARGINS.left,
        bottom: STATUS_TIMELINE_MARGINS.bottom,
        containLabel: false,
      },
      xAxis: xAxisOption,
      yAxis: {
        type: "value",
        name: "Cumulative Hours",
        nameLocation: "center",
        nameRotate: 90,
        nameTextStyle: {
          color: "#bbbbbb",
        },
        axisLine: {
          show: true,
          lineStyle: {
            color: "#444444",
            width: 2,
          },
        },
        axisTick: {
          show: true,
          alignWithLabel: true,
          lineStyle: {
            color: "#444444",
            width: 2,
          },
        },
        axisLabel: {
          color: "#444444",
          interval: 2,
        },
        splitNumber: 24,
        splitLine: {
          lineStyle: {
            color: "#222222",
          },
        },
        minInterval: 1,
      },
      brush: buildBrushConfig(),
      // dataZoom: [
      //   {
      //     type: "inside",
      //   },
      // ],
      series: [
        {
          name: "Operational",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["OPERATIONAL"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["OPERATIONAL"],
            opacity: 0.3,
          },
          data: stateSeries["OPERATIONAL"],
        },
        {
          name: "Weather",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["WEATHER"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["WEATHER"],
            opacity: 0.3,
          },
          data: stateSeries["WEATHER"],
        },
        {
          name: "Fault",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["FAULT"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["FAULT"],
            opacity: 0.3,
          },
          data: stateSeries["FAULT"],
        },
        {
          name: "Idle",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["IDLE"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["IDLE"],
            opacity: 0.5,
          },
          data: stateSeries["IDLE"],
        },
        {
          name: "Downtime",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["DOWNTIME"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["DOWNTIME"],
            opacity: 0.4,
          },
          data: stateSeries["DOWNTIME"],
        },
        {
          name: "Unknown",
          type: "line",
          showSymbol: false,
          lineStyle: {
            color: STATUS_COLORS["UNKNOWN"],
            width: 2,
          },
          areaStyle: {
            color: STATUS_COLORS["UNKNOWN"],
            opacity: 0.5,
          },
          data: stateSeries["UNKNOWN"],
        },
        {
          name: "Open Dome",
          type: "line",
          showSymbol: false,
          data: openDomeSeries,
          lineStyle: {
            color: "#CC79A7",
            width: 2,
          },
        },
        {
          name: "Night Hours",
          type: "line",
          showSymbol: false,
          data: nightHours,
          lineStyle: {
            color: "white",
            width: 2,
          },
        },
      ],
    };

    markerSeriesIdxRef.current = option.series.length - 1;
    instance.setOption(option, { notMerge: false });

    // Activate brush mode permanently — without this the brush is inert
    // because there's no toolbox button to enable it.
    instance.dispatchAction({
      type: "takeGlobalCursor",
      key: "brush",
      brushOption: { brushType: "lineX", brushMode: "single" },
    });

    // Sync brush to URL-restored selection — must run after setOption (brush
    // component must exist) and after takeGlobalCursor (brush mode must be active).
    syncBrushToSelection();

    // Defer graphic elements until ECharts has finished rendering,
    // since convertToPixel is only valid after the chart is laid out.
    setTimeout(() => updateGraphicElements(instance), 0);
  }, [
    fullTimeRange,
    xAxisOption,
    updateGraphicElements,
    syncBrushToSelection,
    instanceRef,
    intervals,
    availability,
    openDomeTimes,
  ]);

  // Re-run graphic elements when the relevant props change
  useEffect(() => {
    const instance = instanceRef.current;
    if (instance) updateGraphicElements(instance);
  }, [updateGraphicElements, instanceRef]);

  return (
     <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Observatory Status
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={DownloadIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[300px]">
                {/* TODO */}
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {isLoading ? (
          <div className="flex-grow w-full h-full">
            <Skeleton className="h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 border border-teal-900">
            <div
              ref={containerRef}
              style={{
                width: "100%",
                minWidth: 0,
                // height: 300,
                height: "100%",
                // overflow: "hidden",
                userSelect: "none",
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ObservatoryStatusApplet;