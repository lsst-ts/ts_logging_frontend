import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import { DateTime } from "luxon";

import { getDayobsStr } from "@/utils/utils";
import { Outlet, useRouter, useSearch } from "@tanstack/react-router";

export default function Layout({ children }) {
  const router = useRouter();
  const { dayObs, noOfNights, instrument } = useSearch({ strict: true });

  const setQuery = (key, value) => {
    router.navigate({
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
      }),
    });
  };

  const [dayobs, setDayobs] = useState(
    // DateTime.utc().minus({ days: 1 }).toJSDate(),
    // (typeof dayObs === "number" && dayObs > 0) ?
    DateTime.fromFormat(dayObs.toString(), "yyyyLLdd").toJSDate(),
    // :
    // // Default to yesterday if no dayObs is provided
    // DateTime.utc().minus({ days: 1 }).toJSDate(),
  );

  const setNoOfNights = (nightsCount) => {
    setQuery("noOfNights", parseInt(nightsCount));
  };

  const setInstrument = (inst) => {
    setQuery("instrument", inst);
  };
  // const [noOfNights, setNoOfNights] = useState(1);
  // const [instrument, setInstrument] = useState("LSSTCam");
  // const [nightHours, setNightHours] = useState(0.0);
  // const [weatherLoss, setWeatherLoss] = useState(0.0);
  // const [faultLoss, setFaultLoss] = useState(0.0);
  // const [exposureFields, setExposureFields] = useState([]);
  // const [exposureCount, setExposureCount] = useState(0);
  // const [sumExpTime, setSumExpTime] = useState(0.0);
  // const [flags, setFlags] = useState([]);

  // const [exposuresLoading, setExposuresLoading] = useState(true);
  // const [almanacLoading, setAlmanacLoading] = useState(true);
  // const [narrativeLoading, setNarrativeLoading] = useState(true);

  // const [jiraTickets, setJiraTickets] = useState([]);
  // const [jiraLoading, setJiraLoading] = useState(true);

  // const [flagsLoading, setFlagsLoading] = useState(true);

  const handleDayobsChange = (date) => {
    setDayobs(date);
    setQuery("dayObs", parseInt(getDayobsStr(date)));
  };

  const handleNoOfNightsChange = (nightsCount) => {
    setNoOfNights(nightsCount);
    setQuery("noOfNights", parseInt(nightsCount));
  };

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
    setQuery("instrument", inst);
  };

  // useEffect(() => {
  //   const abortController = new AbortController();

  //   setExposuresLoading(true);
  //   setAlmanacLoading(true);
  //   setNarrativeLoading(true);
  //   setJiraLoading(true);
  //   setFlagsLoading(true);

  //   let dayobsStr = getDayobsStr(dayobs);
  //   if (!dayobsStr) {
  //     toast.error("No Date Selected! Please select a valid date.");
  //     setExposuresLoading(false);
  //     setAlmanacLoading(false);
  //     setNarrativeLoading(false);
  //     setJiraLoading(false);
  //     setFlagsLoading(false);
  //     return;
  //   }
  //   const dateFromDayobs = getDatetimeFromDayobsStr(dayobsStr);
  //   const startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
  //   const startDayobs = startDate.toFormat("yyyyLLdd");
  //   const endDate = dateFromDayobs.plus({ days: 1 });
  //   const endDayobs = endDate.toFormat("yyyyLLdd");

  //   fetchExposures(startDayobs, endDayobs, instrument, abortController)
  //     .then(([exposureFields, exposuresNo, exposureTime]) => {
  //       setExposureFields(exposureFields);
  //       setExposureCount(exposuresNo);
  //       setSumExpTime(exposureTime);
  //       setExposuresLoading(false);
  //       if (exposuresNo === 0) {
  //         toast.warning("No exposures found for the selected date range.");
  //       }
  //     })
  //     .catch((err) => {
  //       if (!abortController.signal.aborted) {
  //         const msg = err?.message;
  //         toast.error("Error fetching exposures!", {
  //           description: msg,
  //           duration: Infinity,
  //         });
  //       }
  //     })
  //     .finally(() => {
  //       if (!abortController.signal.aborted) {
  //         setExposuresLoading(false);
  //       }
  //     });

  //   fetchAlmanac(startDayobs, endDayobs, abortController)
  //     .then((hours) => {
  //       setNightHours(hours);
  //     })
  //     .catch((err) => {
  //       if (!abortController.signal.aborted) {
  //         const msg = err?.message;
  //         toast.error("Error fetching almanac!", {
  //           description: msg,
  //           duration: Infinity,
  //         });
  //       }
  //     })
  //     .finally(() => {
  //       if (!abortController.signal.aborted) {
  //         setAlmanacLoading(false);
  //       }
  //     });

  //   fetchNarrativeLog(startDayobs, endDayobs, instrument, abortController)
  //     .then(([weather, fault]) => {
  //       setWeatherLoss(weather);
  //       setFaultLoss(fault);
  //       if (weather === 0 && fault === 0) {
  //         toast.warning("No time loss reported in the Narrative Log.");
  //       }
  //     })
  //     .catch((err) => {
  //       if (!abortController.signal.aborted) {
  //         const msg = err?.message;
  //         toast.error("Error fetching narrative log!", {
  //           description: msg,
  //           duration: Infinity,
  //         });
  //       }
  //     })
  //     .finally(() => {
  //       if (!abortController.signal.aborted) {
  //         setNarrativeLoading(false);
  //       }
  //     });

  //   fetchJiraTickets(startDayobs, endDayobs, instrument, abortController)
  //     .then((issues) => {
  //       setJiraTickets(issues);
  //       if (issues.length === 0) {
  //         toast.warning("No Jira tickets reported.");
  //       }
  //     })
  //     .catch((err) => {
  //       if (!abortController.signal.aborted) {
  //         const msg = err?.message;
  //         toast.error("Error fetching Jira!", {
  //           description: msg,
  //           duration: Infinity,
  //         });
  //       }
  //     })
  //     .finally(() => {
  //       if (!abortController.signal.aborted) {
  //         setJiraLoading(false);
  //       }
  //     });

  //   fetchExposureFlags(startDayobs, endDayobs, instrument, abortController)
  //     .then((flags) => {
  //       setFlags(flags);
  //       if (flags.length === 0) {
  //         toast.warning("No exposures flagged for the selected date range.");
  //       }
  //     })
  //     .catch((err) => {
  //       if (!abortController.signal.aborted) {
  //         const msg = err?.message;
  //         toast.error("Error fetching exposure flags!", {
  //           description: msg,
  //           duration: Infinity,
  //         });
  //       }
  //     })
  //     .finally(() => {
  //       if (!abortController.signal.aborted) {
  //         setFlagsLoading(false);
  //       }
  //     });
  //   // router.update({
  //   //   context: {
  //   //     params: {
  //   //       dayobs,
  //   //       noOfNights,
  //   //       instrument,
  //   //     },
  //   //   },
  //   // });

  //   return () => {
  //     abortController.abort();
  //   };
  // }, [dayobs, noOfNights, instrument]);

  // // calculate open shutter efficiency
  // const efficiency = calculateEfficiency(nightHours, sumExpTime, weatherLoss);
  // const efficiencyText = `${efficiency} %`;
  // const [timeLoss, timeLossDetails] = calculateTimeLoss(weatherLoss, faultLoss);
  // const newTicketsCount = jiraTickets.filter((tix) => tix.isNew).length;

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
