import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import WarningIcon from "../assets/WarningIcon";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Cell, Bar, BarChart, XAxis, YAxis } from "recharts";
import { DateTime } from "luxon";

/**
 * Time accounting logic for night analysis.
 *
 * Full documentation:
 *   - doc/time_accounting.rst
 *
 * See "Definitions and Assumptions for Time Accounting"
 * for detailed rules used in this component.
 */

function TimeAccountingApplet({
  loading,
  onSkyTimeAccounting,
  sumOnSkyExpTime,
  nightHours,
  closedDomeHours,
  calculatedFaultHours,
  faultDataUnavailable,
  faultErrorMessage,
}) {
  // console.log(`openDomeError: ${openDomeError}`);
  // console.log(`timeAccountingError: ${timeAccountingError}`);
  // const timeAccountingUnavailable = Boolean(timeAccountingError);
  // const domeUnavailable = Boolean(openDomeError);
  // Fault is derived from overhead (time accounting) AND weather/dome-closed
  // loss (dome data), so it's unreliable if either upstream source failed.
  // const faultUnavailable = timeAccountingUnavailable || domeUnavailable;

  const [expPercent, nonExpPercent] = useMemo(() => {
    if (!nightHours || nightHours === 0) {
      return [0, 0];
    }
    const expHours = sumOnSkyExpTime / 3600;
    // calculate percentage of on-sky exposure time of night hours between 12 deg twilights
    const expPercentage = Math.round((expHours / nightHours) * 100);
    const nonExpPercentage = 100 - expPercentage;
    return [expPercentage, nonExpPercentage];
  }, [sumOnSkyExpTime, nightHours]);

  // One hue (teal), varying only in lightness, for the four bars that are
  // sub-components of the same two metrics (gap time, overhead time) split
  // by filter change -- using distinct hues here would imply a categorical
  // difference that doesn't exist, and would visually clash with the
  // dynamically-colored rainbow chart elsewhere on this page.
  const COLOR_GAPS = "#5eead4"; // teal-300
  const COLOR_OVERHEAD = "#14b8a6"; // teal-500
  const COLOR_GAPS_FILTER_CHANGE = "#0f766e"; // teal-700
  const COLOR_OVERHEAD_FILTER_CHANGE = "#134e4a"; // teal-900, matches CardHeader

  // Fault and Closed Dome come from different upstream sources and are
  // genuinely distinct categories, so they get their own hues -- chosen to
  // reuse meaning already established elsewhere rather than adding new ones.
  const COLOR_FAULT = "#dc2626"; // red-600, matches the "Data unavailable" error text
  const COLOR_CLOSED_DOME = "#71717a"; // zinc-500, neutral: "no data," not an error

  // redundant: added to stop Recharts from complaining about empty config
  const chartConfig = {
    gaps: {
      label: "Inter-Exposure time (same filter)",
      color: "hsl(200, 70%, 50%)",
    },
    gaps_filter_change: {
      label: "Inter-Exposure time (with filter change)",
      color: "hsl(40, 70%, 50%)",
    },
    fault: { label: "Fault", color: "hsl(0, 70%, 50%)" },
    domeClose: { label: "dome_close", color: "hsl(80, 70%, 50%)" },
  };

  // TODO: how to diffriantiate null/error values from actual zeros
  // TODO: Test with past night when the dome didn't open 20260616
  // TODO: Test with current night with a current open session
  // TODO: Test with current night with a past closed session and current open session
  // TODO: Test with a night with multiple open sessions
  // TODO: Test with a night with only non-science exposures 20260215
  // TODO: Test with a night with only non-science exposures and the dome was open 20260615
  // TODO: Test with a night in the future
  // TODO: check error in night 20260614
  const chartData = [
    {
      name: "Gaps",
      value: onSkyTimeAccounting?.sum_visit_gap_without_filter_change ?? 0.0,
      color: COLOR_GAPS,
      label: "Inter-exposure time (same filter)",
    },
    {
      name: "Overhead",
      value: onSkyTimeAccounting?.sum_overhead_without_filter_change ?? 0.0,
      color: COLOR_OVERHEAD,
      label: "Calculated overhead (slew and settle time, same filter)",
    },
    {
      name: "Gaps (Filter)",
      value: onSkyTimeAccounting?.sum_visit_gap_with_filter_change ?? 0.0,
      color: COLOR_GAPS_FILTER_CHANGE,
      label: "Inter-exposure time (filter change)",
    },
    {
      name: "Overhead (Filter)",
      value: onSkyTimeAccounting?.sum_overhead_with_filter_change ?? 0.0,
      color: COLOR_OVERHEAD_FILTER_CHANGE,
      label: "Calculated overhead (slew, settle and filter change time)",
    },
    {
      name: "Fault (calculated)",
      value: Math.max(calculatedFaultHours, 0),
      color: COLOR_FAULT,
      label: "Calculated fault time",
    },
    {
      name: "Closed Dome",
      value: Math.max(closedDomeHours, 0),
      color: COLOR_CLOSED_DOME,
      label: "Closed dome during the night",
    },
    {
      // dummy bar to adjust the bar labels position
      name: "",
      value: 0,
      color: "transparent",
      label: "",
    },
  ];

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Time Accounting
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
              <p>Breakdown of observable time during selected dayobs range.</p>

              <p>
                <strong>Observable Time:</strong> Time between nautical
                twilights
              </p>

              <p>
                <strong>Exposures:</strong> Total exposure time
              </p>

              <p>
                <strong>Not Exposures:</strong> Observable time - Exposure Time
              </p>
              <div>
                <ul className="p-2 list-inside list-disc">
                  <li>
                    <strong>Gaps:</strong> Inter-exposure time between exposures
                    (includes readout & slew)
                  </li>
                  <li>
                    <strong>Gaps (Filter):</strong> Inter-exposure time with
                    filter change
                  </li>
                  <li>
                    <strong>Overhead:</strong> Estimated slew and settle time,
                    plus up to 2 minutes of additional overhead per visit.
                  </li>
                  <li>
                    <strong>Overhead (Filter):</strong> Estimated slew, settle
                    and filter change time plus up to 2 minutes of additional
                    overhead per visit.
                  </li>
                  <li>
                    <strong>Calculated Fault:</strong> Calculated fault loss{" "}
                    <br />
                    (Observable time - exposure time - overhead time - time loss
                    to weather)
                  </li>
                  <li>
                    <strong>Closed Dome:</strong> Time where the dome was closed
                    during the night (from ~50% <code>positionActual</code>{" "}
                    shutter values)
                  </li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {loading ? (
          <div className="flex-grow grid grid-cols-3 w-full h-full gap-2">
            <Skeleton className="col-span-1 h-full min-h-[180px] bg-stone-900" />
            <Skeleton className="col-span-2 h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3 grid-rows-6">
            {faultDataUnavailable && (
              <div className="col-span-3 flex mr-1 text-yellow-400 font-normal text-sm mb-2">
                <WarningIcon />
                <span> {faultErrorMessage} </span>
              </div>
            )}
            <div className="col-span-1 flex flex-col items-center row-span-5">
              {nonExpPercent > 0 && (
                <div className="text-neutral-200 font-thin text-center">
                  Not exposures
                </div>
              )}
              <div className="h-56 w-15 text-teal-900 font-bold rounded-sm py-2">
                {nonExpPercent > 0 && (
                  <div
                    className={`bg-teal-100 max-h-36 min-h-6 ${
                      nonExpPercent === 100 ? "rounded-sm" : "rounded-t-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${nonExpPercent}%` }}
                  >
                    {nonExpPercent} %
                  </div>
                )}
                {expPercent > 0 && (
                  <div
                    className={`h-4/5 bg-teal-900 text-teal-100 max-h-36 min-h-6 ${
                      expPercent === 100 ? "rounded-sm" : "rounded-b-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${expPercent}%` }}
                  >
                    {expPercent} %
                  </div>
                )}
              </div>
              {expPercent > 0 && (
                <div className="text-neutral-200 font-thin">Exposures</div>
              )}
            </div>
            <div className="col col-span-2 row-span-5">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <BarChart
                  width={380}
                  height={250}
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#ffffff" }}
                    angle={45}
                    interval={0}
                    height={77}
                    textAnchor="start"
                    tickLine={false}
                  />
                  <YAxis
                    width={15}
                    tick={{ fill: "#ffffff" }}
                    label={{
                      value: "Hours",
                      angle: -90,
                      position: "insideLeft",
                      fill: "white",
                      dx: -22,
                      dy: 10,
                    }}
                    domain={[0, "auto"]}
                  />
                  <Bar dataKey="value" barSize="20" stackId="a">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        label={entry.label}
                        radius={[4, 4, 0, 0]}
                      />
                    ))}
                    /
                  </Bar>
                  <ChartTooltip
                    cursor={false}
                    wrapperStyle={{ opacity: 0.9 }}
                    content={({ active, payload }) => {
                      if (
                        !active ||
                        !payload ||
                        !payload.length ||
                        payload[0].payload.label === ""
                      )
                        return null;
                      return (
                        <div className="bg-white text-xs p-2 border border-white rounded text-black font-light mb-1">
                          <div className="font-semibold">{`${payload[0].payload.label}`}</div>
                          <div>
                            Hours:{" "}
                            <span className="font-semibold">{`${payload[0].value.toFixed(
                              2,
                            )}`}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                </BarChart>
              </ChartContainer>
            </div>
            <div className="col-span-1 text-center flex flex-col pt-4 text-neutral-200">
              Observable time
            </div>
            <div className="col col-span-2 text-center pt-4 text-neutral-200">
              Time not exposing
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default TimeAccountingApplet;
