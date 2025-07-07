import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import { DateTime } from "luxon";

import { getDayobsStr } from "@/utils/utils";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";

export default function Layout({ children }) {
  const router = useRouter();
  const { startDayobs, endDayobs, instrument } = useSearch({ strict: true });

  const setQuery = (key, value) => {
    router.navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
      }),
    });
  };
  const dayObsDefault = endDayobs
    ? DateTime.fromFormat(endDayobs.toString(), "yyyyLLdd")
    : null;
  const startDayobsDate = startDayobs
    ? DateTime.fromFormat(startDayobs.toString(), "yyyyLLdd")
    : dayObsDefault;
  const nightsDefault = dayObsDefault.diff(startDayobsDate).as("days") + 1;

  const [dayobs, setDayobs] = useState(dayObsDefault.toJSDate());

  const setInstrument = (inst) => {
    setQuery("instrument", inst);
  };
  const [noOfNights, setNoOfNights] = useState(nightsDefault || 1);

  const setDayObsRange = (start, end) => {
    setQuery("startDayobs", parseInt(getDayobsStr(start)));
    setQuery("endDayobs", parseInt(getDayobsStr(end)));
  };

  const calculateDayObsRange = (dayobs, noOfNights) => {
    const dateFromDayobs = DateTime.fromJSDate(dayobs);
    const startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
    const startDayobs = startDate.toFormat("yyyyLLdd");
    const endDate = dateFromDayobs.plus({ days: 1 });
    const endDayobs = endDate.toFormat("yyyyLLdd");
    return [startDayobs, endDayobs];
  };

  const handleDayobsChange = (date) => {
    setDayobs(date);
    const [start, end] = calculateDayObsRange(date, noOfNights);
    setDayObsRange(start, end);
  };

  const handleNoOfNightsChange = (nightsCount) => {
    setNoOfNights(nightsCount);
    const [start, end] = calculateDayObsRange(dayobs, nightsCount);
    setDayObsRange(start, end);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
    setQuery("instrument", inst);
  };

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
          <Outlet />
        </main>
      </SidebarProvider>
    </>
  );
}
