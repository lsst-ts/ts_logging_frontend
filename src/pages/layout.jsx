import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import { DateTime } from "luxon";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";
import { getKeyByValue } from "@/utils/utils";

export default function Layout({ children }) {
  const router = useRouter();
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

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
  const nightsDefault = dayObsDefault.diff(startDayobsDate).as("days") + 1; // +2 to include both start and end days

  const [dayobs, setDayobs] = useState(dayObsDefault.toJSDate());

  const [noOfNights, setNoOfNights] = useState(nightsDefault);
  const [instrument, setInstrument] = useState(
    telescope ? TELESCOPES[telescope] : "LSSTCam",
  );

  const setDayObsRange = (start, end) => {
    setQuery("startDayobs", parseInt(start));
    setQuery("endDayobs", parseInt(end));
  };

  const calculateDayObsRange = (dayobs, noOfNights) => {
    const dateFromDayobs = DateTime.fromJSDate(dayobs);
    const startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
    const startDayobs = startDate.toFormat("yyyyLLdd");
    const endDayobs = dateFromDayobs.toFormat("yyyyLLdd");
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
    setQuery("telescope", getKeyByValue(TELESCOPES, inst));
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
