import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import Applet from "@/components/applet.jsx";
import AppletExposures from "@/components/applet-exposures.jsx";
import MetricsCard from "@/components/metrics-card.jsx";
import { DateTime } from "luxon";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIcon from "../assets/JiraIcon.svg";
import {
  calculateEfficiency,
  calculateTimeLoss,
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchExposureFlags,
  getDayobsStr,
  getDatetimeFromDayobsStr,
} from "@/utils/fetchUtils";

export default function Layout({ children }) {
  const [dayobs, setDayobs] = useState(
    DateTime.utc().minus({ days: 1 }).toJSDate(),
  );
  const [noOfNights, setNoOfNights] = useState(1);
  const [instrument, setInstrument] = useState("LSSTCam");
  const [nightHours, setNightHours] = useState(0.0);
  const [weatherLoss, setWeatherLoss] = useState(0.0);
  const [faultLoss, setFaultLoss] = useState(0.0);
  const [exposureFields, setExposureFields] = useState([]);
  const [exposureCount, setExposureCount] = useState(0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [flags, setFlags] = useState([]);

  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(true);
  const [flagsLoading, setFlagsLoading] = useState(true);

  const handleDayobsChange = (date) => {
    setDayobs(date);
  };

  const handleNoOfNightsChange = (nightsCount) => {
    setNoOfNights(nightsCount);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
  };

  useEffect(() => {
    setExposuresLoading(true);
    setAlmanacLoading(true);
    setNarrativeLoading(true);
    setFlagsLoading(true);

    let dayobsStr = getDayobsStr(dayobs);
    if (!dayobsStr) {
      console.error("No Date Selected!");
      setExposuresLoading(false);
      setAlmanacLoading(false);
      setNarrativeLoading(false);
      setFlagsLoading(false);
      return;
    }
    let dateFromDayobs = getDatetimeFromDayobsStr(dayobsStr);
    let startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
    let startDayobs = startDate.toFormat("yyyyLLdd");
    let endDate = dateFromDayobs.plus({ days: 1 });
    let endDayobs = endDate.toFormat("yyyyLLdd");

    fetchExposures(startDayobs, endDayobs, instrument)
      .then(([exposureFields, exposureCount, sumExpTime]) => {
        setExposureFields(exposureFields);
        setExposureCount(exposureCount);
        setSumExpTime(sumExpTime);
      })
      .catch(() => {
        console.error("Error fetching exposures");
      })
      .finally(() => {
        setExposuresLoading(false);
      });

    fetchAlmanac(startDayobs, endDayobs)
      .then((hours) => {
        setNightHours(hours);
      })
      .catch(() => {
        console.error("Error fetching Almanac data");
      })
      .finally(() => {
        setAlmanacLoading(false);
      });

    fetchNarrativeLog(startDayobs, endDayobs, instrument)
      .then(([weather, fault]) => {
        setWeatherLoss(weather);
        setFaultLoss(fault);
      })
      .catch(() => {
        console.error("Error fetching Narrative Log data");
      })
      .finally(() => {
        setNarrativeLoading(false);
      });

    fetchExposureFlags(startDayobs, endDayobs, instrument)
      .then(([flags]) => {
        setFlags(flags);
      })
      .catch(() => {
        console.error("Error fetching exposure flags");
      })
      .finally(() => {
        setFlagsLoading(false);
      });
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
          onNoOfNightsChange={handleNoOfNightsChange}
          instrument={instrument}
          onInstrumentChange={handleInstrumentChange}
        />
        <main className="w-full bg-stone-800">
          {/* Show/Hide Sidebar button */}
          <SidebarTrigger className="color-teal-500 fixed hover:bg-sky-900 transition-colors duration-200" />
          {children}
          {/* Main content */}
          <div className="flex flex-col w-full p-8 gap-8">
            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <MetricsCard
                icon={ShutterIcon}
                data={exposureCount}
                label="Nighttime exposures taken"
                metadata="(TBD expected)"
                tooltip="On-sky exposures taken during the night."
                loading={exposuresLoading}
              />
              <MetricsCard
                icon={<EfficiencyChart value={efficiency} />}
                data={efficiencyText}
                label="Open-shutter (-weather) efficiency"
                tooltip="Efficiency computed as total exposure time / (time between 18 degree twilights minus time lost to weather)"
                loading={almanacLoading || exposuresLoading}
              />
              <MetricsCard
                icon={TimeLossIcon}
                data={timeLoss}
                label="Time loss"
                metadata={timeLossDetails}
                tooltip="Time loss as reported in the Narrative Log."
                loading={narrativeLoading}
              />
              <MetricsCard
                icon={JiraIcon}
                data="TBD"
                label="Jira tickets"
                loading={false}
              />
            </div>
            {/* Applets */}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <AppletExposures
                  exposureFields={exposureFields}
                  exposureCount={exposureCount}
                  sumExpTime={sumExpTime}
                  flags={flags}
                  exposuresLoading={exposuresLoading}
                  flagsLoading={flagsLoading}
                />
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
