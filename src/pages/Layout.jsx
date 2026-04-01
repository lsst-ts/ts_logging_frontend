import { useState, useEffect } from "react";
import { DateTime } from "luxon";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";

import { SidebarProvider } from "@/components/ui/sidebar.jsx";
import { SidebarToggle } from "@/components/SidebarToggle.jsx";
import { AppSidebar } from "@/components/AppSidebar.jsx";
import { TELESCOPES } from "@/components/Parameters";
import { getKeyByValue } from "@/utils/utils";
import { dayObsIntToDateTime, isoToUTC } from "@/utils/timeUtils";
import RetentionBanner from "@/components/RetentionBanner";
import { fetchSystemNotices } from "@/utils/fetchUtils";
import { NotificationBannerSolid } from "@/components/NotificationBannerSolid";

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

  const [systemNotices, setSystemNotices] = useState([]);

  const CACHE_KEY = "systemNoticesCache";
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in ms

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

  useEffect(() => {
    const abortController = new AbortController();
    setSystemNotices([]);

    // Check cache
    const cachedData = localStorage.getItem(CACHE_KEY);
    const now = Date.now();

    if (cachedData) {
      try {
        const { notices, timestamp } = JSON.parse(cachedData);
        if (notices && timestamp && now - timestamp < CACHE_DURATION) {
          console.log("Using cached system notices");
          setSystemNotices(notices);
          return; // Skip fetch
        }
      } catch {
        console.warn("Invalid cache data, fetching fresh notices");
      }
    }

    // Fetch if no valid cache
    fetchSystemNotices(abortController)
      .then((notices) => {
        console.log("Fetched system notices:", notices);
        setSystemNotices(notices);
        // Cache the result
        const cacheData = { notices, timestamp: now };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Error fetching system notices:", error);
          // Optionally, fall back to cached notices if fetch fails
          if (cachedData) {
            try {
              const { notices } = JSON.parse(cachedData);
              if (notices) setSystemNotices(notices);
            } catch {
              console.warn("Could not parse cached data");
            }
          }
        }
      });
  }, []);

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
        <main className="flex flex-col flex-1 bg-stone-800 overflow-x-hidden gap-4">
          {/* Show/Hide Sidebar toggle */}
          <SidebarToggle />
          <div className="flex flex-col gap-4 px-8 pt-8">
            <RetentionBanner />
            {systemNotices.length > 0 && (
              <div className="flex flex-col gap-4">
                {systemNotices.map((notice) => (
                  <NotificationBannerSolid
                    key={notice.id}
                    type="systemNotice"
                    title={notice.title}
                    description={notice.description}
                    meta={`${notice.meta} . posted ${isoToUTC(
                      notice.created_at,
                    ).toFormat("yyyy-MM-dd HH:mm")} UTC`}
                  />
                ))}
              </div>
            )}
          </div>
          {children}
          {/* Main content */}
          <Outlet />
        </main>
      </SidebarProvider>
    </>
  );
}
