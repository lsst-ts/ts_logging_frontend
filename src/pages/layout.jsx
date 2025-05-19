import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import Applet from "@/components/applet.jsx";
import MetricsCard from "@/components/metrics-card.jsx";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import EfficiencyIcon from "../assets/EfficiencyIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIcon from "../assets/JiraIcon.svg";
import { calculateEfficiency, calculateTimeLoss } from "@/utils/fetchUtils";

export default function Layout({ children }) {
  const [exposures, setExposures] = useState(0);
  const [dayObsStart, setDayObsStart] = useState(new Date(2025, 4, 12));
  const [dayObsEnd, setDayObsEnd] = useState(new Date(2025, 4, 13));
  const [instrument, setInstrument] = useState("LSSTCam");
  const [efficiency, setEfficiency] = useState(0);
  const [efficiencyText, setEfficiencyText] = useState(`${efficiency} %`);
  const [timeLoss, setTimeLoss] = useState("0 hours");
  const [timeLossDetails, setTimeLossDetails] = useState(
    "(- weather; - fault)",
  );
  const [nightHours, setNightHours] = useState(0.0);
  const [weatherLoss, setWeatherLoss] = useState(0.0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [faultLoss, setFaultLoss] = useState(0.0);

  const httpProtocol = window.location.protocol;
  const host = window.location.host;
  const backendLocation = `${httpProtocol}//${host}/nightlydigest/api`;

  const handleStartDateChange = (date) => {
    setDayObsStart(date);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
  };

  useEffect(() => {
    let start = dayObsStart.toISOString().split("T")[0];
    let end = dayObsEnd.toISOString().split("T")[0];

    async function fetchExposures() {
      try {
        const res = await fetch(
          `${backendLocation}/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Fetch failed with status ${res.status}: ${errorText}`);
          return;
        }
        const data = await res.json();
        setExposures(data.exposures_count);
        setSumExpTime(data.sum_exposure_time);
      } catch (error) {
        console.error("Error fetching exposures:", error);
      }
    }

    async function fetchAlmanac() {
      try {
        const res = await fetch(
          `${backendLocation}/almanac?dayObsStart=${start}&dayObsEnd=${end}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Fetch failed with status ${res.status}: ${errorText}`);
          return;
        }

        const data = await res.json();
        setNightHours(data.night_hours);
      } catch (error) {
        console.error("Error fetching almanac:", error);
      }
    }

    async function fetchNarrativeLog() {
      try {
        const res = await fetch(
          `${backendLocation}/narrative-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Fetch failed with status ${res.status}: ${errorText}`);
          return;
        }
        const data = await res.json();
        setWeatherLoss(data.time_lost_to_weather);
        setFaultLoss(faultLoss);
      } catch (error) {
        console.error("Error fetching narrative log:", error);
      }
    }

    // Fetch exposures, almanac, and narrative log
    fetchExposures();
    fetchAlmanac();
    fetchNarrativeLog();
  }, [dayObsStart, dayObsEnd, instrument]);

  useEffect(() => {
    // Calculate efficiency
    let eff = calculateEfficiency(nightHours, sumExpTime, weatherLoss);
    setEfficiency(eff);
    setEfficiencyText(`${eff} %`);

    // Calculate time loss
    let lossValues = calculateTimeLoss(weatherLoss, faultLoss);
    setTimeLoss(lossValues[0]);
    setTimeLossDetails(lossValues[1]);
  }, [sumExpTime, weatherLoss, nightHours, faultLoss]);

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          startDay={dayObsStart}
          onStartDayChange={handleStartDateChange}
          endDay={dayObsEnd}
          onEndDayChange={setDayObsEnd}
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
                icon={<EfficiencyChart value={efficiency} size={40} />}
                data={efficiencyText}
                label="Open-shutter (-weather) efficiency"
                tooltip="Efficiency computed as total exposure time / (time between 18 degree twilights minus time lost to weather)"
              />
              <MetricsCard
                icon={TimeLossIcon}
                data={timeLoss}
                label="Time loss"
                metadata={timeLossDetails}
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
