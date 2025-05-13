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
  const [exposures, setExposures] = useState([]);
  const [dayObsStart, setDayObsStart] = useState(new Date());
  const [dayObsEnd, setDayObsEnd] = useState(new Date());
  const [instrument, setInstrument] = useState("auxtel");

  useEffect(() => {
    async function fetchJiraTickets() {
      let start = dayObsStart.toISOString().split("T")[0];
      let end = dayObsEnd.toISOString().split("T")[0];
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
      let start = dayObsStart.toISOString().split("T")[0];
      let end = dayObsEnd.toISOString().split("T")[0];
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
        setExposures(data.exposures);
      } else {
        console.log("error");
      }
    }

    fetchJiraTickets();
    fetchExposures();
  }, [dayObsStart, dayObsEnd, instrument]);

  return (
    <>
      <SidebarProvider>
        <AppSidebar
          startDay={dayObsStart}
          onStartDayChange={setDayObsStart}
          endDay={dayObsEnd}
          onEndDayChange={setDayObsEnd}
          instrument={instrument}
          onInstrumentChange={setInstrument}
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
