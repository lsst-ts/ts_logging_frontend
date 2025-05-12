import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import Applet from "@/components/applet.jsx";
import MetricsJira from "@/components/metrics-jira.jsx";
import MetricsExposures from "@/components/metrics-exposures.jsx";
import MetricsEfficiency from "@/components/metrics-efficiency.jsx";
import MetricsTimeLoss from "@/components/metrics-timeloss.jsx";

export default function Layout({ children }) {
  const [nooftickets, setNooftickets] = useState(0);
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
        setNooftickets(tix.issues.length);
      } else {
        console.log("error");
      }
    }

    fetchJiraTickets();
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
        <main className="flex bg-gray-800">
          <SidebarTrigger />
          {children}
        </main>
        <div className="w-full bg-gray-800">
          <div className="grid grid-cols-4 gap-20 pt-8 pr-8">
            <MetricsExposures noOfExposures="838" noOfExpectedExposures="843" />
            <MetricsEfficiency efficiency="92" />
            <MetricsTimeLoss
              timeLoss="0.8"
              weatherPercentage="80"
              faultPercentage="20"
            />
            <MetricsJira noOfTickets={nooftickets} />
          </div>
          <div className="grid grid-cols-2 gap-10 pt-8 pl-4 pr-14">
            <Applet />
            <Applet />
          </div>
          <div className="grid grid-cols-3 gap-6 pt-8 pl-4 pr-14">
            <Applet />
            <Applet />
            <Applet />
          </div>
        </div>
      </SidebarProvider>
    </>
  );
}
