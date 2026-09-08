import { useEffect, useState } from "react";
import { DateTime } from "luxon";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";

import { SidebarProvider } from "@/components/ui/sidebar.jsx";
import { SidebarToggle } from "@/components/SidebarToggle.jsx";
import { AppSidebar } from "@/components/AppSidebar.jsx";
import { TELESCOPES } from "@/components/Parameters";
import { getKeyByValue } from "@/utils/utils";
import { dayObsIntToDateTime } from "@/utils/timeUtils";
import { useHostConfig } from "@/contexts/HostConfigContext";
import { useNotifications } from "@/hooks/useNotifications";

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

  const { host, getAvailableDayObsRange, retentionDays } = useHostConfig();
  const { addNotification } = useNotifications();
  const dayObsRange = getAvailableDayObsRange();

  const setDayObsRange = (start, end) => {
    setQuery("startDayobs", parseInt(start));
    setQuery("endDayobs", parseInt(end));
    setQuery("startTime", undefined);
    setQuery("endTime", undefined);
  };

  /**
   * Largest number of nights selectable for a given dayobs.
   *
   * The range counts backwards from the selected dayobs, so it cannot reach
   * further back than the retention window's earliest available dayobs.
   *
   * @param {Date} dayobs - The selected dayobs (end of the range).
   * @returns {number|null} The maximum number of nights, or null when the site
   *                        has no retention policy and any range is allowed.
   */
  const maxNoOfNights = (dayobs) => {
    if (!dayObsRange.min) return null;
    const minDate = dayObsIntToDateTime(dayObsRange.min);
    const selectedDate = DateTime.fromJSDate(dayobs, { zone: "utc" });
    return Math.max(1, Math.floor(selectedDate.diff(minDate, "days").days) + 1);
  };

  /**
   * Constrain a nights count to at least 1 and to the retention window.
   *
   * @param {number|string} nightsCount - The requested number of nights.
   * @param {Date} dayobs - The selected dayobs (end of the range).
   * @returns {number} The clamped number of nights.
   */
  const clampNoOfNights = (nightsCount, dayobs) => {
    const nights = Math.floor(Number(nightsCount));
    const atLeastOne = Number.isFinite(nights) ? Math.max(1, nights) : 1;
    const max = maxNoOfNights(dayobs);
    return max === null ? atLeastOne : Math.min(atLeastOne, max);
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
    // Moving the dayobs closer to the start of the retention window shrinks
    // the number of nights that still fit inside it.
    const nights = clampNoOfNights(noOfNights, date);
    setNoOfNights(nights);
    const [start, end] = calculateDayObsRange(date, nights);
    setDayObsRange(start, end);
  };

  const handleNoOfNightsChange = (nightsCount) => {
    // Let the field be cleared while typing, and leave the dayobs range alone
    // until it holds a usable number again.
    if (nightsCount === "" || !Number.isFinite(Number(nightsCount))) {
      setNoOfNights(nightsCount);
      return;
    }
    const nights = clampNoOfNights(nightsCount, dayobs);
    setNoOfNights(nights);
    const [start, end] = calculateDayObsRange(dayobs, nights);
    setDayObsRange(start, end);
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
    setQuery("telescope", getKeyByValue(TELESCOPES, inst));
  };

  useEffect(() => {
    if (!retentionDays) return;

    addNotification({
      type: "systemNotice",
      source: "retention-policy",
      title: `${host} data is only retained for ${retentionDays} days`,
      description: `Currently available dayobs data: ${dayObsRange.min} - ${dayObsRange.max}.`,
      meta: `${DateTime.utc().toFormat("yyyy-MM-dd HH:mm")} UTC`,
      dismissible: false,
    });
  }, [addNotification, dayObsRange.min, dayObsRange.max, host, retentionDays]);

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
          {children}
          {/* Main content */}
          <Outlet />
        </main>
      </SidebarProvider>
    </>
  );
}
