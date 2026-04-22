import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import ExposureBreakdownApplet from "@/components/ExposureBreakdownApplet.jsx";
import MetricsCard from "@/components/MetricsCard.jsx";
import VisitMapApplet from "@/components/VisitMapApplet";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIconWhite from "../assets/JiraIconWhite.svg";
import JiraIconBlue from "../assets/JiraIconBlue.svg";
import {
  fetchExposures,
  fetchExpectedExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchVisitMaps,
  fetchBlockDetails,
} from "@/utils/fetchUtils";
import {
  calculateEfficiency,
  calculateTimeLoss,
  calculateSumExpTimeBetweenTwilights,
  getBlockSourceLabel,
  createAddBanner,
} from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import DialogMetricsCard from "@/components/dialog-metrics-card";
import JiraTicketsTable from "@/components/jira-tickets-table";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/Parameters";
import ObservingConditionsApplet from "@/components/ObservingConditionsApplet";
import NightSummary from "@/components/NightSummary.jsx";
import TimeAccountingApplet from "@/components/TimeAccountingApplet";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";

export default function Digest() {
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/");

  const [weatherLoss, setWeatherLoss] = useState(0.0);
  const [faultLoss, setFaultLoss] = useState(0.0);
  const [exposureFields, setExposureFields] = useState([]);
  const [exposureCount, setExposureCount] = useState(0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [onSkyExpCount, setOnSkyExpCount] = useState(0);
  const [expectedOnSkyExpCount, setExpectedOnSkyExpCount] = useState(0);
  const [sumOnSkyExpTime, setSumOnSkyExpTime] = useState(0.0);
  const [flags, setFlags] = useState([]);
  const [reports, setReports] = useState([]);

  const [exposuresLoading, setExposuresLoading] = useState(false);
  const [expectedExposuresLoading, setExpectedExposuresLoading] =
    useState(false);
  const [almanacLoading, setAlmanacLoading] = useState(false);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [nightreportLoading, setNightreportLoading] = useState(false);

  const [jiraTickets, setJiraTickets] = useState([]);
  const [jiraLoading, setJiraLoading] = useState(false);

  const [flagsLoading, setFlagsLoading] = useState(false);
  const [almanacInfo, setAlmanacInfo] = useState([]);
  const [openDomeTimes, setOpenDomeTimes] = useState([]);

  const [interactiveMap, setInteractiveMap] = useState(null);
  const [visitMapLoading, setVisitMapLoading] = useState(false);

  const [blockLookup, setBlockLookup] = useState({});

  const [hoveredExposureIds, setHoveredExposureIds] = useState(null);
  const onBarHover = useCallback(
    (ids) => setHoveredExposureIds(new Set(ids)),
    [],
  );
  const onBarLeave = useCallback(() => setHoveredExposureIds(null), []);

  const [banners, setBanners] = useState([]);
  const addBanner = createAddBanner(setBanners);

  const {
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  // Fetch all data except Zephyr data,
  // which needs exposure data.
  useEffect(() => {
    const abortController = new AbortController();
    // The end dayobs is inclusive, so we add one day to the
    // endDayobs to get the correct range for the queries
    const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
      .plus({ days: 1 })
      .toFormat("yyyyMMdd");
    const instrument = TELESCOPES[telescope];
    setExposuresLoading(true);
    setExpectedExposuresLoading(true);
    setAlmanacLoading(true);
    setNarrativeLoading(true);
    setNightreportLoading(true);
    setJiraLoading(true);
    setFlagsLoading(true);
    setExposureFields([]);
    setAlmanacInfo([]);
    setSumOnSkyExpTime(0.0);
    setSumExpTime(0);
    setJiraTickets([]);
    setWeatherLoss(0.0);
    setFaultLoss(0.0);
    setExposureCount(0);
    setReports([]);
    setOnSkyExpCount(0);
    setExpectedOnSkyExpCount(0);
    setFlags([]);

    setVisitMapLoading(true);
    setInteractiveMap(null);
    clearNotifications();
    toast.dismiss();

    fetchExposures(startDayobs, queryEndDayobs, instrument, abortController)
      .then(
        ([
          exposureFields,
          exposuresNo,
          exposureTime,
          onSkyExpNo,
          totalOnSkyExpTime,
          openDomeTimes,
        ]) => {
          setExposureFields(exposureFields);
          setExposureCount(exposuresNo);
          setSumExpTime(exposureTime);
          setOnSkyExpCount(onSkyExpNo);
          setSumOnSkyExpTime(totalOnSkyExpTime);
          setExposuresLoading(false);
          setOpenDomeTimes(openDomeTimes);
          if (exposuresNo === 0) {
            addNotification({
              type: "noData",
              source: "exposures",
              title: "No exposure entries found in ConsDB",
              description:
                "Parts of the dashboard that depend on exposure data will appear empty. Try a different date range.",
            });
          }
        },
      )
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching exposures:", err);
          addNotification({
            type: "error",
            source: "exposures",
            title: "Exposure data unavailable",
            description: "An error occurred while fetching exposures.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setExposuresLoading(false);
        }
      });

    fetchExpectedExposures(startDayobs, endDayobs, abortController)
      .then((expectedSumExposures) => {
        setExpectedOnSkyExpCount(expectedSumExposures);
        if (expectedSumExposures === 0) {
          toast.warning(
            "Expected number of exposures is zero for the selected date range.",
          );
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching expected exposures:", err);
          addNotification({
            type: "error",
            source: "expected-exposures",
            title: "Error fetching expected exposures",
            description:
              "An error occurred while fetching number of expected exposures.",
          });
          // Display on card
          setExpectedOnSkyExpCount("-");
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setExpectedExposuresLoading(false);
        }
      });

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        setAlmanacInfo(almanac);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching almanac:", err);
          addNotification({
            type: "error",
            source: "almanac",
            title: "Error fetching almanac",
            description: "An error occurred while fetching almanac.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    fetchNarrativeLog(startDayobs, queryEndDayobs, instrument, abortController)
      .then(([weather, fault]) => {
        setWeatherLoss(weather);
        setFaultLoss(fault);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching narrative log:", err);
          addNotification({
            type: "error",
            source: "narrative-log",
            title: "Error fetching narrative log",
            description: "An error occurred while fetching narrative log.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setNarrativeLoading(false);
        }
      });

    fetchNightreport(startDayobs, queryEndDayobs, abortController)
      .then(([reports]) => {
        const parsedReports = reports.map((report) => ({
          ...report,
          maintel_summary:
            telescope === "Simonyi" ? report.maintel_summary : null,
          auxtel_summary: telescope === "AuxTel" ? report.auxtel_summary : null,
        }));
        setReports(parsedReports);
        if (reports.length === 0) {
          toast.warning("No night reports found for the selected date range.");
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching night reports:", err);
          addNotification({
            type: "error",
            source: "night-reports",
            title: "Error fetching night reports",
            description: "An error occurred while fetching night reports.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setNightreportLoading(false);
        }
      });

    fetchJiraTickets(startDayobs, queryEndDayobs, instrument, abortController)
      .then((issues) => {
        setJiraTickets(issues);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching Jira tickets:", err);
          addNotification({
            type: "error",
            source: "jira-tickets",
            title: "Error fetching Jira tickets",
            description: "An error occurred while fetching Jira tickets.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setJiraLoading(false);
        }
      });

    fetchExposureFlags(startDayobs, queryEndDayobs, instrument, abortController)
      .then((flags) => {
        setFlags(flags);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error(
            "Error fetching flagged exposures from exposure Log:",
            err,
          );
          addNotification({
            type: "error",
            source: "flagged-exposures",
            title: "Error fetching flagged exposures",
            description: "An error occurred while fetching flagged exposures.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setFlagsLoading(false);
        }
      });

    fetchVisitMaps(startDayobs, queryEndDayobs, instrument, abortController, {
      appletMode: true,
    })
      .then((interactivePlot) => {
        setInteractiveMap(interactivePlot);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error generating visit maps:", err);
          addNotification({
            type: "error",
            source: "visit-maps",
            title: "Error generating visit maps",
            description: "An error occurred while generating visit maps.",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setVisitMapLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // Fetch BLOCK details from Zephyr/Jira
  useEffect(() => {
    const abortController = new AbortController();

    const blockKeys = [
      ...new Set(exposureFields.map((e) => e.science_program)),
    ];

    if (blockKeys.length === 0) {
      return; // nothing to fetch
    }
    fetchBlockDetails(blockKeys, abortController)
      .then((blocks) => {
        setBlockLookup(blocks.data);

        // Handle partial errors (one of Zephyr/Jira failing)
        if (blocks.errors) {
          Object.entries(blocks.errors).forEach(([source, message]) => {
            toast.error(
              `Error fetching BLOCK descriptions from ${getBlockSourceLabel(
                source,
              )}`,
              {
                description: message,
                duration: Infinity,
              },
            );
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching BLOCK descriptions from Zephyr/Jira", {
            description: msg,
            duration: Infinity,
          });
        }
      });
  }, [exposureFields]);

  const nightHours = useMemo(
    () => almanacInfo?.reduce((acc, day) => acc + day.night_hours, 0) ?? 0,
    [almanacInfo],
  );

  const totalExpTimeBetweenTwilights = useMemo(
    () => calculateSumExpTimeBetweenTwilights(exposureFields, almanacInfo),
    [exposureFields, almanacInfo],
  );

  let efficiency = null;
  if (
    !almanacLoading &&
    !exposuresLoading &&
    almanacInfo?.length &&
    exposureFields
  ) {
    if (exposureFields.length === 0) {
      efficiency = 0;
    } else {
      efficiency = calculateEfficiency(
        nightHours,
        sumOnSkyExpTime,
        totalExpTimeBetweenTwilights,
        weatherLoss,
      );
    }
  }

  const efficiencyText = efficiency >= 0 ? `${efficiency} %` : "N/A";
  const [timeLoss, timeLossDetails] = calculateTimeLoss(weatherLoss, faultLoss);
  const newTicketsCount = jiraTickets.filter((tix) => tix.isNew).length;

  const allLoaded =
    !exposuresLoading &&
    !expectedExposuresLoading &&
    !almanacLoading &&
    !narrativeLoading &&
    !nightreportLoading &&
    !jiraLoading &&
    !flagsLoading &&
    !visitMapLoading;

  // processedNotifications recomputes incrementally as fetches settle.
  // Withhold banners until all fetches are done to avoid showing
  // intermediate or contradictory states mid-load.
  const displayedNotifications = allLoaded ? processedNotifications : [];

  return (
    <>
      <div className="flex flex-col w-full px-8 pb-8 gap-4">
        {displayedNotifications.length > 0 && (
          <NotificationBannerStack
            notifications={displayedNotifications}
            onDismiss={removeNotification}
          />
        )}
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricsCard
            icon={ShutterIcon}
            data={onSkyExpCount}
            label="Nighttime exposures taken"
            metadata={
              telescope === "Simonyi"
                ? `(${expectedOnSkyExpCount} expected)`
                : undefined
            }
            tooltip={
              telescope === "Simonyi"
                ? "On-sky exposures taken during the specified date range, and the expected number of exposures, as given by the latest simulated nominal night."
                : "On-sky exposures taken during the specified date range."
            }
            loading={exposuresLoading || expectedExposuresLoading}
          />
          <MetricsCard
            icon={<EfficiencyChart value={efficiency} />}
            data={efficiencyText}
            label="Open-shutter (-weather) efficiency"
            tooltip="Efficiency computed as total on-sky exposure time / (time between 12 degree twilights minus time lost to weather). Exposures started outside the twilights are not counted in total time."
            loading={almanacLoading || exposuresLoading || narrativeLoading}
          />
          <MetricsCard
            icon={TimeLossIcon}
            data={timeLoss}
            label="Time loss (Narrative Log)"
            metadata={timeLossDetails}
            tooltip="Time loss as reported in the Narrative Log."
            loading={narrativeLoading}
          />
          <DialogMetricsCard
            icons={[JiraIconWhite, JiraIconBlue]}
            data={newTicketsCount}
            label="Jira tickets created"
            metadata={`(${jiraTickets.length - newTicketsCount} updated)`}
            tooltip="Jira tickets created or updated within the specified date range."
            loading={jiraLoading}
            dialogTitle="Jira Tickets"
            dialogDescription="List of Jira tickets created or updated within the specified date range."
            dialogContent={
              <JiraTicketsTable loading={jiraLoading} tickets={jiraTickets} />
            }
          ></DialogMetricsCard>
        </div>
        {/* Applets */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ObservingConditionsApplet
              exposuresLoading={exposuresLoading}
              exposureFields={exposureFields}
              almanacLoading={almanacLoading}
              almanacInfo={almanacInfo}
              fullTimeRange={fullTimeRange}
              selectedTimeRange={selectedTimeRange}
              setSelectedTimeRange={setSelectedTimeRange}
              hoveredExposureIds={hoveredExposureIds}
            />
            <ExposureBreakdownApplet
              exposureFields={exposureFields}
              exposureCount={exposureCount}
              sumExpTime={sumExpTime}
              flags={flags}
              blockLookup={blockLookup}
              exposuresLoading={exposuresLoading}
              flagsLoading={flagsLoading}
              onBarHover={onBarHover}
              onBarLeave={onBarLeave}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <NightSummary
              reports={reports}
              nightreportLoading={nightreportLoading}
            />
            <TimeAccountingApplet
              exposures={exposureFields}
              loading={almanacLoading || exposuresLoading}
              openDomeTimes={openDomeTimes}
              almanac={almanacInfo}
              weatherLossHours={weatherLoss}
            />
            <VisitMapApplet
              mapData={interactiveMap}
              mapLoading={visitMapLoading}
            />
          </div>
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}
