import { useState } from "react";
import { DateTime } from "luxon";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";

import { SidebarProvider } from "@/components/ui/sidebar.jsx";
import { SidebarToggle } from "@/components/SidebarToggle.jsx";
import { AppSidebar } from "@/components/AppSidebar.jsx";
import { TELESCOPES } from "@/components/Parameters";
import { getKeyByValue } from "@/utils/utils";
import { dayObsIntToDateTime } from "@/utils/timeUtils";
import RetentionBanner from "@/components/RetentionBanner";

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
  const dayObsDefault = endDayobs ? dayObsIntToDateTime(endDayobs) : null;
  const startDayobsDate = startDayobs
    ? dayObsIntToDateTime(startDayobs)
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
    setQuery("startTime", undefined);
    setQuery("endTime", undefined);
  };

  const calculateDayObsRange = (dayobs, noOfNights) => {
    const dateFromDayobs = DateTime.fromJSDate(dayobs, { zone: "utc" });
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
        <main className="flex flex-col flex-1 bg-stone-800 overflow-x-hidden">
          {/* Show/Hide Sidebar toggle */}
          <SidebarToggle />
          <div className="flex flex-col gap-4 px-8">
            <RetentionBanner />
            {/* System notices — deferred, see JIRA-XXX
              Hook placeholder: hooks/useNotifications.js
              Creation workflow to be decided before implementation */}
          </div>
          {children}
          {/* Main content */}
          <Outlet />
        </main>
      </SidebarProvider>
    </>
  );
}
