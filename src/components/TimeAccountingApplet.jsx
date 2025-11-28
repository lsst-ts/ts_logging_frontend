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
import { almanacDayobsForPlot, TAI_OFFSET_SECONDS } from "../utils/timeUtils";

/*

open dome times are TAI
almanac twilight times are UTC

- night start = -12 deg twilight sunset
- night end = -12 deg twilight sunrise
- obs start = max(night start,  first dome open) [useful for saying "get on sky faster" but not fault counting]
- obs end = min(night end, last dome close) [useful for saying "don't close early" but not fault counting]
- dome close within night = max(0, first_dome_open - night_start) + max(0, night_end - last_dome_close) + time between additional dome close/open periods [translates to how much was the dome closed when it was actually night time]
- on sky visits = visits with can_see_sky = True, that happen within obs start to obs end (or night start to night end .. if they say something can see sky when the dome is closed, we have other problems)
  - the query for visits fetches all visits from night start  to night end regardless of can_see_sky
  - no need to get previous night data .. but maybe extend query window back to 1 hour before sunset
- fault/idle time = night_end - night_start - sum(on_sky_visits.exp_time) - sum(on_sky_visits.valid_overhead) - min(dome_closed_within_night, fault_loss_weather)
- valid_overhead = min(visit_gap, slew_model+2minutes)
- Fault and closed dome times will not be calculated during the night. I'll show a warning about that above the plot
- If the night is still ongoing, ignore ongoing night accounting if more than 1 night is selected 
- If no exposures and dome was closed the whole night, fault calculation formula is still valid. 
  Also most night hours will be fault, closed dome time will still be 0?? see 2025-10-01

  TODO: UPDATE Tooltip
*/

/* Helper function to determine if the night is in progress 
param {string} dayObs - The day_obs string in 'yyyyMMdd' format.
param {DateTime} almanacEveningUTC - The evening twilight time in UTC.
param {DateTime} almanacMorningUTC - The morning twilight time in UTC.
returns {boolean} - True if the night is in progress, false otherwise.
*/
function isNightInProgress(dayObs, almanacEveningUTC, almanacMorningUTC) {
  const nowInUTC = DateTime.now().toUTC();
  const currentDayObs = nowInUTC.minus({ hours: 12 }).toFormat("yyyyMMdd");
  return (
    dayObs === currentDayObs &&
    nowInUTC <= almanacMorningUTC &&
    nowInUTC >= almanacEveningUTC
  );
}

function TimeAccountingApplet({
  exposures,
  loading,
  openDomeTimes,
  almanac,
  weatherLossHours,
}) {
  const isLoading = loading || !openDomeTimes || !almanac;
  const [nights, currentNight] = useMemo(() => {
    const nightTimes = {};

    // Group dome sessions by day_obs
    const domeByDay = {};
    openDomeTimes?.forEach((session) => {
      const dayObs = session.day_obs;
      if (!domeByDay[dayObs]) {
        domeByDay[dayObs] = [];
      }
      domeByDay[dayObs].push({
        open: DateTime.fromISO(session.open_time, { zone: "utc" }),
        close: DateTime.fromISO(session.close_time, { zone: "utc" }),
      });
    });

    // True if current day_obs is one of the selected day_obs
    // && current time is within any of the night periods in almanac
    const nowInUTC = DateTime.now().toUTC();
    const currentDayObs = nowInUTC.minus({ hours: 12 }).toFormat("yyyyMMdd");

    // Process each night's almanac data
    almanac.forEach((night) => {
      const dayObs = almanacDayobsForPlot(night.dayobs);
      const domeSessions = domeByDay[dayObs];

      // convert twilight times to TAI
      const twilightEvening = DateTime.fromFormat(
        night.twilight_evening,
        "yyyy-MM-dd HH:mm:ss",
        { zone: "utc" },
      ).plus({ seconds: TAI_OFFSET_SECONDS });
      const twilightMorning = DateTime.fromFormat(
        night.twilight_morning,
        "yyyy-MM-dd HH:mm:ss",
        { zone: "utc" },
      ).plus({ seconds: TAI_OFFSET_SECONDS });

      const nightInProgress = isNightInProgress(
        dayObs,
        twilightEvening.minus({ seconds: TAI_OFFSET_SECONDS }),
        twilightMorning.minus({ seconds: TAI_OFFSET_SECONDS }),
      );

      let domeClosedHours = 0;

      if (!nightInProgress && domeSessions && domeSessions.length > 0) {
        // Sort by open time
        const sortedSessions = [...domeSessions].sort(
          (a, b) => a.open - b.open,
        );
        // find first dome open and last dome close for this night
        const { firstDomeOpen, lastDomeClose } = sortedSessions.reduce(
          (acc, session) => ({
            firstDomeOpen:
              session.open < acc.firstDomeOpen
                ? session.open
                : acc.firstDomeOpen,
            lastDomeClose:
              session.close > acc.lastDomeClose
                ? session.close
                : acc.lastDomeClose,
          }),
          {
            firstDomeOpen: sortedSessions[0].open,
            lastDomeClose: sortedSessions[0].close,
          },
        );

        // calculate close dome hours within night
        domeClosedHours =
          Math.max(0, firstDomeOpen.diff(twilightEvening, "hours").hours) +
          (lastDomeClose > twilightEvening // to discard dome sessions that close before night start
            ? Math.max(0, twilightMorning.diff(lastDomeClose, "hours").hours)
            : 0);

        for (let i = 1; i < domeSessions.length; i++) {
          const prevClose = domeSessions[i - 1].close;
          const currOpen = domeSessions[i].open;
          // only count if the close/open period is within night time
          const overlapStart = DateTime.max(prevClose, twilightEvening);
          const overlapEnd = DateTime.min(currOpen, twilightMorning);
          if (overlapEnd > overlapStart) {
            domeClosedHours += overlapEnd.diff(overlapStart, "hours").hours;
          }
        }
      }

      nightTimes[dayObs] = {
        hours: night.night_hours,
        twilightEveningTAI: twilightEvening,
        twilightMorningTAI: twilightMorning,
        firstDomeOpenTAI:
          domeSessions && domeSessions.length > 0
            ? DateTime.min(...domeSessions.map((s) => s.open))
            : null,
        lastDomeCloseTAI:
          domeSessions && domeSessions.length > 0
            ? DateTime.max(...domeSessions.map((s) => s.close))
            : null,
        closedDomeWithinNight: domeClosedHours, // hours
        night_in_progress: nightInProgress,
      };
    });

    return [nightTimes, currentDayObs];
  }, [almanac, openDomeTimes]);

  const data = useMemo(
    () =>
      (exposures ?? [])
        .map((entry) => {
          // Convert obs_start and obs_end to DateTime objects
          const obsStart = entry["obs_start"];
          const obsEnd = entry["obs_end"];
          let obs_start_dt = undefined;
          let obs_end_dt = undefined;
          if (
            typeof obsStart === "string" &&
            DateTime.fromISO(obsStart).isValid
          ) {
            obs_start_dt = DateTime.fromISO(obsStart, { zone: "utc" }); // read as TAI
          }

          if (typeof obsEnd === "string" && DateTime.fromISO(obsEnd).isValid) {
            obs_end_dt = DateTime.fromISO(obsEnd, { zone: "utc" }); // read as TAI
          }
          return { ...entry, obs_start_dt, obs_end_dt };
        })
        // filter to only on-sky exposures within night start/end times
        .filter((entry) => {
          const night = nights[entry.day_obs];
          return (
            entry.can_see_sky &&
            night &&
            entry.obs_start_dt >= nights[entry.day_obs]?.twilightEveningTAI &&
            entry.obs_start_dt <= nights[entry.day_obs]?.twilightMorningTAI
          );
        }),
    [exposures, nights],
  );

  const groupedByDayobs = useMemo(
    () => Object.groupBy(data, (exp) => exp.day_obs),
    [data],
  );

  const [
    observableTime,
    expTime,
    gapWithFilterChange,
    gapWithoutFilterChange,
    overheadWithFilterChange,
    overheadWithoutFilterChange,
    domeClosedHours,
    calculatedFaultTime,
  ] = useMemo(() => {
    let filterChange = 0;
    let noFilterChange = 0;
    let overheadFilterChange = 0;
    let overheadNoFilterChange = 0;
    let expTime = 0;
    let nightHours = 0;
    let domeClosed = 0;
    let faultTimeHours = 0;

    for (const dayObs in nights) {
      // skip ongoing night data if more than 1 night is selected
      if (nights[dayObs].night_in_progress && almanac.length > 1) continue;

      nightHours += nights[dayObs].hours;
      domeClosed += nights[dayObs].closedDomeWithinNight;

      const exps = groupedByDayobs[dayObs];
      if (!exps || exps.length === 0) continue;
      expTime = exps.reduce((sum, exp) => sum + exp.exp_time, expTime);

      for (let i = 1; i < exps.length; i++) {
        const currentExp = exps[i];
        const prevExp = exps[i - 1];
        if (currentExp.band === prevExp.band) {
          noFilterChange += currentExp.visit_gap;
          overheadNoFilterChange += currentExp.overhead;
        } else {
          filterChange += currentExp.visit_gap;
          overheadFilterChange += currentExp.overhead;
        }
      }
    }
    const filterChangeHours = filterChange / 3600;
    const noFilterChangeHours = noFilterChange / 3600;
    const overheadFilterChangeHours = overheadFilterChange / 3600;
    const overheadNoFilterChangeHours = overheadNoFilterChange / 3600;
    const expTimeHours = expTime / 3600;

    // count fault time only if not ongoing night or only 1 night is selected
    // ongoing night fault time is not calculated to avoid partial night calculations
    const shouldCalculateFault =
      almanac.length !== 1 || !nights[currentNight]?.night_in_progress;

    if (shouldCalculateFault)
      faultTimeHours =
        nightHours -
        expTimeHours -
        overheadFilterChangeHours -
        overheadNoFilterChangeHours -
        Math.min(domeClosed, weatherLossHours ?? 0);

    return [
      nightHours,
      expTimeHours,
      filterChangeHours,
      noFilterChangeHours,
      overheadFilterChangeHours,
      overheadNoFilterChangeHours,
      domeClosed,
      faultTimeHours,
    ];
  }, [groupedByDayobs]);

  const [expPercent, nonExpPercent] = useMemo(() => {
    if (!observableTime || observableTime === 0) {
      return [0, 0];
    }
    // calculate percentage of on-sky exposure time of night hours between 12 deg twilights
    const expPercentage = Math.round((expTime / observableTime) * 100);
    const nonExpPercentage = 100 - expPercentage;
    return [expPercentage, nonExpPercentage];
  }, [expTime, observableTime]);

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

  const chartData = [
    {
      name: "Gaps",
      value: gapWithoutFilterChange,
      color: "hsl(200, 70%, 50%)",
      label: "Inter-exposure time (same filter)",
    },
    {
      name: "Overhead",
      value: overheadWithoutFilterChange,
      color: "hsl(80, 70%, 50%)",
      label: "Calculated overhead (readout, same filter)",
    },
    {
      name: "Gaps (Filter)",
      value: gapWithFilterChange,
      color: "hsl(40, 70%, 50%)",
      label: "Inter-exposure time (filter change)",
    },
    {
      name: "Overhead (Filter)",
      value: overheadWithFilterChange,
      color: "hsl(170, 70%, 50%)",
      label: "Calculated overhead (readout and filter change)",
    },
    {
      name: "Fault (calculated)",
      value: Math.max(calculatedFaultTime, 0),
      color: "hsl(0, 70%, 50%)",
      label: "Calculated fault time",
    },
    {
      name: "Closed Dome",
      value: Math.max(domeClosedHours, 0),
      color: "#c27aff",
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
                    <strong>Overhead:</strong> Calculated readout time when not
                    slewing + any setting time after slewing
                  </li>
                  <li>
                    <strong>Overhead (Filter):</strong> Calculated readout time
                    when not slewing + filter change time + any setting time
                    after slewing
                  </li>
                  <li>
                    <strong>Calculated Fault:</strong> Calculated fault time{" "}
                    <br />
                    (Observable time - exposure time - overhead time - min(time
                    loss to weather, dome closed time)) exposures
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
        {isLoading ? (
          <div className="flex-grow grid grid-cols-3 w-full h-full gap-2">
            <Skeleton className="col-span-1 h-full min-h-[180px] bg-stone-900" />
            <Skeleton className="col-span-2 h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3 grid-rows-6">
            {nights[currentNight]?.night_in_progress && (
              <div className="col-span-3 flex mr-1 text-yellow-400 font-normal text-sm mb-2">
                <WarningIcon />

                {almanac.length === 1 && (
                  <span>
                    {" "}
                    Fault and closed dome times skipped for ongoing night{" "}
                    {currentNight}
                  </span>
                )}
                {almanac.length > 1 && (
                  <span> Ongoing night {currentNight} data isn't included</span>
                )}
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
