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

export default function Layout({ children }) {
  const [tickets, setTickets] = useState([]);
  const [exposures, setExposures] = useState(0);
  const [dayObsStart, setDayObsStart] = useState(new Date(2025, 4, 12));
  const [dayObsEnd, setDayObsEnd] = useState(new Date(2025, 4, 13));
  const [instrument, setInstrument] = useState("LSSTCam");
  const [efficiency, setEfficiency] = useState(0.0);
  const [timeLoss, setTimeLoss] = useState(0.0);
  const [weatherLossPercent, setWeatherLossPercent] = useState(0.0);
  const [faultLossPercent, setFaultLossPercent] = useState(0.0);

  const handleStartDateChange = (date) => {
    setDayObsStart(date);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
  };

  useEffect(() => {
    console.log("Effect triggered", dayObsStart, dayObsEnd, instrument);
    let start = dayObsStart.toISOString().split("T")[0];
    let end = dayObsEnd.toISOString().split("T")[0];
    let sumExpTime = 0.0;
    let nightHours = 0.0;
    let weatherLoss = 0.0;
    let faultLoss = 0.0;

    async function fetchJiraTickets() {
      const res = await fetch(
        `http://0.0.0.0:8000/jira-tickets?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (res.ok) {
        const tix = JSON.parse(await res.text());
        setTickets(tix.issues);
      } else {
        console.log("error");
      }
    }

    async function fetchExposures() {
      const res = await fetch(
        `http://0.0.0.0:8000/exposures?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (res.ok) {
        const data = JSON.parse(await res.text());
        setExposures(data.exposures_count);
        sumExpTime = data.sum_exposure_time;
        console.log(sumExpTime);
      } else {
        console.log("error");
      }
    }

    async function fetchAlmanac() {
      const res = await fetch(
        `http://0.0.0.0:8000/almanac?dayObsStart=${start}&dayObsEnd=${end}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (res.ok) {
        const data = JSON.parse(await res.text());
        nightHours = data.night_hours;
      } else {
        console.log("error");
      }
    }

    async function fetchNarrativeLog() {
      const res = await fetch(
        `http://0.0.0.0:8000/narrative-log?dayObsStart=${start}&dayObsEnd=${end}&instrument=${instrument}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (res.ok) {
        const data = JSON.parse(await res.text());
        weatherLoss = data.time_lost_to_weather;
        faultLoss = data.time_lost_to_faults;
      } else {
        console.log("error");
      }
    }

    fetchJiraTickets();
    fetchExposures();
    fetchAlmanac();
    fetchNarrativeLog();

    if (nightHours !== 0) {
      setEfficiency(sumExpTime / (nightHours * 60 * 60 - weatherLoss));
    } else {
      setEfficiency(0);
    }

    let loss = weatherLoss + faultLoss;
    if (loss > 0) {
      setTimeLoss(loss);
      setWeatherLossPercent((weatherLoss / loss) * 100);
      setFaultLossPercent((faultLoss / loss) * 100);
    }
  }, [dayObsStart, dayObsEnd, instrument]);

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
                data="838"
                label="Nighttime exposures taken"
                metadata="(843 expected)"
                tooltip="On-sky exposures taken during the night."
              />
              <MetricsCard
                icon={<EfficiencyChart value={92} size={40} />}
                data="92 %"
                label="Open-shutter (-weather) efficiency"
                tooltip="Efficiency computed as total exposure time / (time between 18 degree twilights minus time lost to weather)"
              />
              <MetricsCard
                icon={TimeLossIcon}
                data="0.8 hrs"
                label="Time loss"
                metadata="(80% weather; 20% fault)"
              />
              <MetricsCard
                icon={JiraIcon}
                data={nooftickets}
                label="Jira tickets"
              />
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
