import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import Applet from "@/components/applet.jsx";
import MetricsCard from "@/components/metrics-card.jsx";
import { DateTime } from "luxon";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import EfficiencyIcon from "../assets/EfficiencyIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIcon from "../assets/JiraIcon.svg";
import {
  calculateEfficiency,
  calculateTimeLoss,
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
} from "@/utils/fetchUtils";

export default function Layout({ children }) {
  const [exposures, setExposures] = useState(0);
  const [dayobs, setDayobs] = useState(DateTime.utc().toJSDate());
  const [noOfNights, setNoOfNights] = useState(1);
  const [instrument, setInstrument] = useState("LSSTCam");

  const [nightHours, setNightHours] = useState(0.0);
  const [weatherLoss, setWeatherLoss] = useState(0.0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [faultLoss, setFaultLoss] = useState(0.0);

  /**
   * Formats a given JavaScript Date object into a string format 'yyyyLLdd' using luxon.
   *
   * @param {Date|null|undefined} date - The date to format. If null or undefined, returns an empty string.
   * @returns {string} The formatted date string, or an empty string if no date is provided.
   */
  const getDayobsStr = (date) => {
    return date ? DateTime.fromJSDate(date).toFormat("yyyyLLdd") : "";
  };

  /**
   * Converts a date string in 'yyyyMMdd' format (assumed to be in the 'America/Santiago' timezone)
   * to a UTC DateTime object set at 12:00:00 local time.
   *
   * @param {string} dayObsStr - The date string in 'yyyyMMdd' format (e.g., '20240607').
   * @returns luxon {DateTime} The corresponding UTC DateTime object at 12:00:00.
   */
  const getDatetimFromDayobsStr = (dayObsStr) => {
    const chileZone = "America/Santiago";
    const result = DateTime.fromFormat(dayObsStr, "yyyyMMdd", {
      zone: chileZone,
    }).set({ hour: 12, minute: 0, second: 0 });
    return result.toUTC(); //.toJSDate();
  };

  const handleDayobsChange = (date) => {
    setDayobs(date);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
  };

  useEffect(() => {
    let dayobsStr = getDayobsStr(dayobs);

    if (!dayobsStr) {
      console.error("No Date Selected!");
      return;
    }

    let dateFromDayobs = getDatetimFromDayobsStr(dayobsStr);

    let startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
    let startDayobs = startDate.toFormat("yyyyLLdd");

    let endDate = dateFromDayobs.plus({ days: 1 });
    let endDayobs = endDate.toFormat("yyyyLLdd");

    // Fetch exposures, almanac, and narrative log
    fetchExposures(startDayobs, endDayobs, instrument).then(
      ([exposuresCount, exposureTime]) => {
        setExposures(exposuresCount);
        setSumExpTime(exposureTime);
      },
    );

    fetchAlmanac(startDayobs, endDayobs).then((hours) => {
      setNightHours(hours);
    });

    fetchNarrativeLog(startDayobs, endDayobs, instrument).then(
      ([weather, fault]) => {
        setWeatherLoss(weather);
        setFaultLoss(fault);
      },
    );
  }, [dayobs, noOfNights, instrument]);

  // calculate open shutter efficiency
  const efficiency = calculateEfficiency(nightHours, sumExpTime, weatherLoss);
  const efficiencyText = `${efficiency} %`;
  const [timeLoss, timeLossDetails] = calculateTimeLoss(weatherLoss, faultLoss);

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          dayobs={dayobs}
          onDayobsChange={handleDayobsChange}
          noOfNights={noOfNights}
          onNoOfNightsChange={setNoOfNights}
          instrument={instrument}
          onInstrumentChange={handleInstrumentChange}
        />
        <main className="w-full bg-stone-800">
          {/* Show/Hide Sidebar button */}
          <SidebarTrigger className="color-teal-500" />
          {children}
          {/* Main content */}
          <div className="flex flex-col w-full p-8 gap-8">
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <MetricsCard
                icon={ShutterIcon}
                data={exposures}
                label="Nighttime exposures taken"
                metadata="(TBD expected)"
                tooltip="On-sky exposures taken during the night."
              />
              <MetricsCard
                icon={<EfficiencyChart value={efficiency} />}
                data={efficiencyText}
                label="Open-shutter (-weather) efficiency"
                tooltip="Efficiency computed as total exposure time / (time between 18 degree twilights minus time lost to weather)"
              />
              <MetricsCard
                icon={TimeLossIcon}
                data={timeLoss}
                label="Time loss"
                metadata={timeLossDetails}
                tooltip="Time loss as reported in the Narrative Log."
              />
              <MetricsCard icon={JiraIcon} data="TBD" label="Jira tickets" />
            </div>
            {/* Applets */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Applet />
                <Applet />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Applet />
                <Applet />
                <Applet />
              </div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </>
  );
}
