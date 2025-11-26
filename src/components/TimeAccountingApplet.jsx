import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Cell, Bar, BarChart, XAxis, YAxis } from "recharts";
import { DateTime } from "luxon";
import { almanacDayobsForPlot, TAI_OFFSET_SECONDS } from "../utils/timeUtils";

/*
open dome times array is empty until the night ends
--> in that case we use twilight times to calculate night hours

for each night:
night start = max(twilight evening, first open dome time)
night end = min(twilight morning, last open dome time)
night hours (observable time) = night end - night start
dome closed hours = night hours - open dome hours

open dome times are TAI
almanac twilight times are UTC

All exposure are counted in exp time and gaps
shutter_time/exp = dark_time - exp_time

valid_overhead = np.min([np.where(np.isnan(visits.slew_model.values), 0, visits.slew_model.values) + max_scatter, visits.visit_gap.values], axis=0)

Questions:
- Should we count only exposures within night start/end times? 
see dayObs 2025-11-20, obs_start 2025-11-20T18:34:03.514000, night start 2025-11-21T00:20:51.000, gaps > night hours


** Fault time calculation ideas**
(End of night - start of night) - exposure time - shutter time* - overhead time** - dome closed time = “fault”
this is probably the best way to do things, although it won’t count fault times if the dome is closed for fault (rather than weather), so how about:
(End of night - start of night) - exposure time - shutter time* - overhead time** - min(time loss to weather, dome closed time) = “fault”

This might be more accurate if the observers mark time loss to weather properly.
*: Assuming this isn’t calculated in the overhead time
**: Assuming overhead time is the min(measured gap time, calculated overhead)

Final:
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
- If the night is still ongoing, we calculate up to current time for fault calculation only if current time > night start 
OR (ignore ongoing night accounting if more than 1 night is selected 
    calculate gaps and overheads and skip fault calculation for ongoing night if only 1 night is selected)
- If no exposures and dome was closed the whole night, fault calculation formula is still valid?? 
  Also most night hours will be fault, closed dome time will still be 0?? see 2025-10-01

  TODO: UPDATE Tooltip
  TODO: 
*/

function TimeAccountingApplet({
  exposures,
  loading,
  sumExpTime,
  openDomeTimes,
  almanac,
  nightHours,
  weatherLossHours,
}) {
  const [expPercent, nonExpPercent] = useMemo(() => {
    if (!nightHours || nightHours === 0) {
      return [0, 0];
    }
    // calculate percentage of on-sky exposure time of night hours between 12 deg twilights
    const expPercentage = Math.round((sumExpTime / (nightHours * 3600)) * 100);
    const nonExpPercentage = 100 - expPercentage;
    return [expPercentage, nonExpPercentage];
  }, [sumExpTime, nightHours]);

  const [nights, currentNight] = useMemo(() => {
    const nightTimes = {};

    console.log("Open dome times:", openDomeTimes);
    console.log("Almanac:", almanac);

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

    // TODO: calculate night in progress flag properly
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

      let domeClosedHours = 0;

      if (domeSessions && domeSessions.length > 0) {
        // find first dome open and last dome close for this night
        const firstDomeOpen = DateTime.min(...domeSessions.map((s) => s.open));
        const lastDomeClose = DateTime.max(...domeSessions.map((s) => s.close));

        // calculate close dome hours within night
        // dome_close_within_night = max(0, firstDomeOpen - twilightEvening) + max(0, twilightMorning - lastDomeClose)
        //+ time between additional dome close/open periods [translates to how much was the dome closed when it was actually night time]
        domeClosedHours =
          Math.max(0, firstDomeOpen.diff(twilightEvening, "hours").hours) +
          Math.max(0, twilightMorning.diff(lastDomeClose, "hours").hours);

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
        night_in_progress:
          dayObs === currentDayObs &&
          nowInUTC.plus({ seconds: TAI_OFFSET_SECONDS }) < twilightMorning, //openDomeTimes && openDomeTimes.length > 0 ? false : true,
      };
    });

    return [nightTimes, currentDayObs];
  }, [almanac, openDomeTimes]);

  const data = useMemo(
    () =>
      // fallback to empty array if exposures is undefined
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
        .filter(
          (entry) =>
            entry.can_see_sky &&
            entry.obs_start_dt >= nights[entry.day_obs]?.twilightEveningTAI &&
            entry.obs_start_dt <= nights[entry.day_obs]?.twilightMorningTAI,
        ),
    [exposures],
  );

  const [
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

    for (let i = 1; i < data.length; i++) {
      const currentExp = data[i];
      const prevExp = data[i - 1];

      // skip gaps between different nights
      if (currentExp.day_obs !== prevExp.day_obs) continue;

      if (currentExp.band === prevExp.band) {
        noFilterChange += currentExp.visit_gap;
        overheadNoFilterChange += currentExp.overhead;
      } else {
        filterChange += currentExp.visit_gap;
        overheadFilterChange += currentExp.overhead;
      }
    }

    const filterChangeHours = filterChange / 3600;
    const noFilterChangeHours = noFilterChange / 3600;
    const overheadFilterChangeHours = overheadFilterChange / 3600;
    const overheadNoFilterChangeHours = overheadNoFilterChange / 3600;
    const domeClosed = Object.values(nights).reduce(
      (sum, night) => sum + (night.closedDomeWithinNight || 0),
      0,
    );
    const faultTimeHours =
      nightHours -
      sumExpTime / 3600 -
      overheadNoFilterChangeHours -
      overheadNoFilterChangeHours -
      Math.min(domeClosed, weatherLossHours || 0);

    return [
      filterChangeHours,
      noFilterChangeHours,
      overheadFilterChangeHours,
      overheadNoFilterChangeHours,
      domeClosed,
      faultTimeHours,
    ];
  }, [data, nights, nightHours, sumExpTime, weatherLossHours]);

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
      name: "Gaps (Filter)",
      value: gapWithFilterChange,
      color: "hsl(40, 70%, 50%)",
      label: "Inter-exposure time (with filter change)",
    },
    {
      name: "Overhead",
      value: overheadWithoutFilterChange,
      color: "hsl(80, 70%, 50%)",
      label: "Calculated overhead (readout)",
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
                <strong>Observable Time:</strong> <strong>Night end</strong>{" "}
                (earliest of nautical twilight morning and last closed dome
                time) -<strong>Night start</strong> (latest of nautical twilight
                evening and first open dome time)
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
        {loading ? (
          <div className="flex-grow grid grid-cols-3 w-full h-full gap-2">
            <Skeleton className="col-span-1 h-full min-h-[180px] bg-stone-900" />
            <Skeleton className="col-span-2 h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3 grid-rows-6">
            <div className="col-span-3 flex mr-1 text-yellow-400 font-normal text-sm mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>

              <span>Dome info isn't available for {currentNight}</span>
            </div>
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
