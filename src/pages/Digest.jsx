import { useState, useEffect, useMemo, useCallback } from "react";
import ExposureBreakdownApplet from "@/components/ExposureBreakdownApplet.jsx";
import MetricsCard from "@/components/MetricsCard.jsx";
import TimeLossCard from "@/components/TimeLossCard.jsx";
import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import JiraIconWhite from "../assets/JiraIconWhite.svg";
import JiraIconBlue from "../assets/JiraIconBlue.svg";
import {
  fetchExposures,
  fetchExpectedExposures,
  fetchAlmanac,
  fetchObsStatusFromRubinNights,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchBlockDetails,
  fetchStaticVisitMap,
} from "@/utils/fetchUtils";
import {
  calculateEfficiency,
  calculateSumExpTimeBetweenTwilights,
  getBlockSourceLabel,
} from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import { isScientificNightlyDigest } from "@/utils/appConfig";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import DialogMetricsCard from "@/components/DialogMetricsCard";
import JiraTicketsTable from "@/components/jira-tickets-table";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/Parameters";
import ObservingConditionsApplet from "@/components/ObservingConditionsApplet";
import NightSummary from "@/components/NightSummary.jsx";
import ObservatoryStatusApplet from "@/components/ObservatoryStatusApplet";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import VisitMapStaticApplet from "@/components/VisitMapStaticApplet.jsx";
import {
  buildObsStatusSource,
  resolveDisplayState,
} from "@/utils/displayState";
import { SOURCE, NO_DATA_DISPLAY } from "@/constants/DATA_SOURCES";

const EMPTY_OBS_STATUS_AVAILABILITY = {
  status: "none",
  available_from: null,
};

export default function Digest() {
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/");

  const [exposureFields, setExposureFields] = useState([]);
  const [exposureCount, setExposureCount] = useState(0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [onSkyExpCount, setOnSkyExpCount] = useState(0);
  const [expectedOnSkyExpCount, setExpectedOnSkyExpCount] = useState(0);
  const [sumOnSkyExpTime, setSumOnSkyExpTime] = useState(0.0);
  const [flags, setFlags] = useState([]);
  const [reports, setReports] = useState([]);
  const [obsStatusIntervals, setObsStatusIntervals] = useState([]);
  const [obsStatusFaultLoss, setObsStatusFaultLoss] = useState(0.0);
  const [obsStatusWeatherLoss, setObsStatusWeatherLoss] = useState(0.0);
  const [obsStatusDowntime, setObsStatusDowntime] = useState(0.0);
  const [obsStatusAvailability, setObsStatusAvailability] = useState(
    EMPTY_OBS_STATUS_AVAILABILITY,
  );
  const [obsStatusFetchError, setObsStatusFetchError] = useState(false);
  const [almanacFetchError, setAlmanacFetchError] = useState(false);
  const [exposureFetchError, setExposureFetchError] = useState(false);
  const [expectedExposuresFetchError, setExpectedExposuresFetchError] =
    useState(false);
  const [flagsFetchError, setFlagsFetchError] = useState(false);
  const [nightreportFetchError, setNightreportFetchError] = useState(false);
  const [blockFetchError, setBlockFetchError] = useState(false);

  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [expectedExposuresLoading, setExpectedExposuresLoading] =
    useState(true);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [nightreportLoading, setNightreportLoading] = useState(true);
  const [obsStatusLoading, setObsStatusLoading] = useState(true);

  const [jiraTickets, setJiraTickets] = useState([]);
  const [jiraLoading, setJiraLoading] = useState(true);
  const [jiraFetchError, setJiraFetchError] = useState(false);

  const [flagsLoading, setFlagsLoading] = useState(true);
  const [almanacInfo, setAlmanacInfo] = useState([]);
  const [openDomeTimes, setOpenDomeTimes] = useState([]);

  const [blockLookup, setBlockLookup] = useState({});
  const [blockLookupLoading, setBlockLookupLoading] = useState(true);

  const [hoveredExposureIds, setHoveredExposureIds] = useState(null);
  const onBarHover = useCallback(
    (ids) => setHoveredExposureIds(new Set(ids)),
    [],
  );
  const onBarLeave = useCallback(() => setHoveredExposureIds(null), []);

  const [staticVisitMaps, setStaticVisitMaps] = useState(null);
  const [staticVisitMapLoading, setStaticVisitMapLoading] = useState(true);
  const [staticVisitMapError, setStaticVisitMapError] = useState(false);

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
    // Left false for whatever SND does not fetch, so allLoaded still settles.
    if (!isScientificNightlyDigest) {
      setNightreportLoading(true);
      setJiraLoading(true);
    }
    setFlagsLoading(true);
    setObsStatusLoading(true);
    setExposureFields([]);
    setAlmanacInfo([]);
    setSumOnSkyExpTime(0.0);
    setSumExpTime(0);
    setJiraTickets([]);
    setExposureCount(0);
    setReports([]);
    setOnSkyExpCount(0);
    setExpectedOnSkyExpCount(0);
    setFlags([]);
    setObsStatusIntervals([]);
    setBlockLookup({});
    setBlockLookupLoading(true);
    setObsStatusFaultLoss(0.0);
    setObsStatusWeatherLoss(0.0);
    setObsStatusDowntime(0.0);
    setObsStatusAvailability(EMPTY_OBS_STATUS_AVAILABILITY);
    setObsStatusFetchError(false);
    setAlmanacFetchError(false);
    setExposureFetchError(false);
    setExpectedExposuresFetchError(false);
    setFlagsFetchError(false);
    setNightreportFetchError(false);
    setJiraFetchError(false);

    setStaticVisitMapLoading(true);
    setStaticVisitMaps(null);
    setStaticVisitMapError(false);

    clearNotifications();

    fetchExposures(startDayobs, queryEndDayobs, instrument, abortController)
      .then((data) => {
        setExposureFields(data.exposures);
        setExposureCount(data.exposures_count);
        setSumExpTime(data.sum_exposure_time);
        setOnSkyExpCount(data.on_sky_exposures_count);
        setSumOnSkyExpTime(data.total_on_sky_exposure_time);
        setExposuresLoading(false);
        setOpenDomeTimes(data.open_dome_times);

        if (data.exposures_count === 0) {
          addNotification({
            type: "noData",
            source: "consdb",
            title: "No exposures found in ConsDB",
            description:
              "Parts of the dashboard that depend on exposure data will appear empty for the selected date range.",
          });
        }
        if (data.open_dome_error) {
          addNotification({
            type: "error",
            source: "dome-times",
          });
        }
        if (data.time_accounting_error) {
          addNotification({
            type: "error",
            source: "time-accounting",
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching exposures:", err);
          setExposureFetchError(true);
          addNotification({
            type: "error",
            source: "exposures",
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
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching expected exposures:", err);
          addNotification({
            type: "error",
            source: "expected-exposures",
          });
          setExpectedExposuresFetchError(true);
          setExpectedOnSkyExpCount(NO_DATA_DISPLAY);
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
          console.error("Error fetching almanac data:", err);
          setAlmanacFetchError(true);
          addNotification({
            type: "error",
            source: "almanac",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setAlmanacLoading(false);
        }
      });

    fetchObsStatusFromRubinNights({
      start: startDayobs,
      end: endDayobs,
      includeEntries: true,
      includeIntervals: true,
      nightOnlyMetrics: true,
      metrics: ["fault_loss", "weather", "downtime"],
      abortController,
    })
      .then((data) => {
        const intervals = data?.intervals ?? [];
        const metrics = data?.metrics ?? {};
        const availability = data?.availability ?? {};

        setObsStatusIntervals(intervals);
        setObsStatusFaultLoss(
          typeof metrics.fault_loss === "number" ? metrics.fault_loss : 0.0,
        );
        setObsStatusWeatherLoss(
          typeof metrics.weather === "number" ? metrics.weather : 0.0,
        );
        setObsStatusDowntime(
          typeof metrics.downtime === "number" ? metrics.downtime : 0.0,
        );
        setObsStatusAvailability({
          status:
            typeof availability.status === "string"
              ? availability.status
              : EMPTY_OBS_STATUS_AVAILABILITY.status,
          available_from:
            availability.available_from ??
            EMPTY_OBS_STATUS_AVAILABILITY.available_from,
        });
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching observatory status:", err);
          setObsStatusFetchError(true);
          addNotification({
            type: "error",
            source: "observatory-status",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setObsStatusLoading(false);
        }
      });

    // The Scientific Nightly Digest has no night report applet, so nothing
    // consumes this.
    if (!isScientificNightlyDigest) {
      fetchNightreport(startDayobs, queryEndDayobs, abortController)
        .then(([reports]) => {
          const parsedReports = reports.map((report) => ({
            ...report,
            maintel_summary:
              telescope === "Simonyi" ? report.maintel_summary : null,
            auxtel_summary:
              telescope === "AuxTel" ? report.auxtel_summary : null,
          }));
          setReports(parsedReports);
        })
        .catch((err) => {
          if (!abortController.signal.aborted) {
            console.error("Error fetching night reports:", err);
            setNightreportFetchError(true);
            addNotification({
              type: "error",
              source: "night-reports",
            });
          }
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setNightreportLoading(false);
          }
        });
    }

    // The Scientific Nightly Digest has no Jira tickets card, so nothing
    // consumes this.
    if (!isScientificNightlyDigest) {
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
            });
            setJiraFetchError(true);
          }
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setJiraLoading(false);
          }
        });
    }

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
          setFlagsFetchError(true);
          addNotification({
            type: "error",
            source: "exposure-flags",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setFlagsLoading(false);
        }
      });

    fetchStaticVisitMap(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
      .then((staticMapData) => {
        setStaticVisitMaps(staticMapData);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error generating static map:", err);
          addNotification({
            type: "error",
            source: "static-map",
          });
          setStaticVisitMapError(true);
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setStaticVisitMapLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // Fetch BLOCK details from Zephyr/Jira
  useEffect(() => {
    const abortController = new AbortController();

    // BLOCK details only feed the exposure breakdown's Science Program labels,
    // which the Scientific Nightly Digest renders as plain text.
    if (isScientificNightlyDigest) {
      setBlockLookupLoading(false);
      return;
    }
    // Until exposures (which define the set of BLOCKs) have loaded, keep
    // the block-lookup loading so the exposure-breakdown header shows no
    // premature warning.
    if (exposuresLoading) {
      setBlockLookupLoading(true);
      return;
    }

    const blockKeys = [
      ...new Set(exposureFields.map((e) => e.science_program)),
    ];
    // No exposures, or no BLOCK programs to look up -> settled, nothing to fetch.
    if (blockKeys.length === 0) {
      setBlockLookupLoading(false);
      return;
    }

    setBlockLookupLoading(true);
    fetchBlockDetails(blockKeys, abortController)
      .then((blocks) => {
        setBlockLookup(blocks.data);

        // Handle partial errors (one of Zephyr/Jira failing)
        if (blocks.errors) {
          Object.entries(blocks.errors).forEach(([source, message]) => {
            console.error(
              `Error fetching BLOCK descriptions from ${getBlockSourceLabel(
                source,
              )}`,
              message,
            );
            addNotification({
              type: "error",
              source: `${source}-blocks`,
            });
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error(
            "Error fetching BLOCK descriptions from Zephyr/Jira",
            err,
          );
          setBlockFetchError(true);
          addNotification({
            type: "error",
            source: "jira-blocks",
          });
          addNotification({
            type: "error",
            source: "zephyr-blocks",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setBlockLookupLoading(false);
        }
      });
  }, [exposureFields, exposuresLoading]);

  const nightHours = useMemo(
    () => almanacInfo?.reduce((acc, day) => acc + day.night_hours, 0) ?? 0,
    [almanacInfo],
  );

  const totalExpTimeBetweenTwilights = useMemo(
    () => calculateSumExpTimeBetweenTwilights(exposureFields, almanacInfo),
    [exposureFields, almanacInfo],
  );

  const weatherLossForCalculations = obsStatusFetchError
    ? 0.0
    : obsStatusWeatherLoss;

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
        weatherLossForCalculations,
      );
    }
  }

  const efficiencyText = Number.isFinite(efficiency)
    ? `${efficiency} %`
    : `${NO_DATA_DISPLAY} %`;

  const newTicketsCount = jiraTickets.filter((tix) => tix.isNew).length;

  // Resolve the display state for each metric card. Unlike the applets, the
  // metric cards are not wrapped in an AppletCard, so the resolved state is
  // passed to them via props.
  const exposureMetricState = resolveDisplayState({
    sources: {
      [SOURCE.EXPOSURES]: exposureFetchError
        ? { ok: false }
        : exposureFields.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
      [SOURCE.EXPECTED_EXPOSURES]: expectedExposuresFetchError
        ? { ok: false }
        : { ok: true },
    },
    required: [SOURCE.EXPOSURES],
    loading: exposuresLoading || expectedExposuresLoading,
  });

  const efficiencyState = resolveDisplayState({
    sources: {
      [SOURCE.EXPOSURES]: exposureFetchError
        ? { ok: false }
        : exposureFields.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
      [SOURCE.ALMANAC]: almanacFetchError
        ? { ok: false }
        : almanacInfo.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
      [SOURCE.OBS_STATUS]: buildObsStatusSource(
        obsStatusAvailability,
        obsStatusFetchError,
      ),
    },
    required: [SOURCE.EXPOSURES, SOURCE.ALMANAC],
    loading: almanacLoading || exposuresLoading || obsStatusLoading,
  });

  const timeLossState = resolveDisplayState({
    sources: {
      [SOURCE.OBS_STATUS]: buildObsStatusSource(
        obsStatusAvailability,
        obsStatusFetchError,
      ),
    },
    required: [SOURCE.OBS_STATUS],
    loading: obsStatusLoading,
  });

  const jiraState = resolveDisplayState({
    sources: {
      [SOURCE.JIRA_TICKETS]: jiraFetchError
        ? { ok: false }
        : jiraTickets.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
    },
    required: [SOURCE.JIRA_TICKETS],
    loading: jiraLoading,
  });

  const exposureMetricValue =
    exposureMetricState.state === "error"
      ? NO_DATA_DISPLAY
      : exposureMetricState.state === "noData"
        ? "0"
        : onSkyExpCount;
  const efficiencyValue =
    efficiencyState.state === "error"
      ? `${NO_DATA_DISPLAY}  %`
      : efficiencyState.state === "noData"
        ? "0 %"
        : efficiencyText;
  const jiraValue =
    jiraState.state === "error"
      ? NO_DATA_DISPLAY
      : jiraState.state === "noData"
        ? "0"
        : newTicketsCount;
  const jiraUpdatedValue =
    jiraState.state === "error"
      ? NO_DATA_DISPLAY
      : jiraTickets.length - newTicketsCount;

  // Use fetch errors and returned data to construct data source context
  // to be passed into each component.
  const observingConditionsSources = useMemo(
    () => ({
      [SOURCE.EXPOSURES]: exposureFetchError
        ? { ok: false }
        : exposureFields.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
      [SOURCE.ALMANAC]: almanacFetchError
        ? { ok: false }
        : almanacInfo.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
    }),
    [exposureFetchError, exposureFields, almanacFetchError, almanacInfo],
  );
  const observingConditionsRequired = [SOURCE.EXPOSURES];

  const exposureBreakdownSources = useMemo(
    () => ({
      [SOURCE.EXPOSURES]: exposureFetchError
        ? { ok: false }
        : exposureFields.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
      // An empty result (no flagged exposures) is good, so we deliberately
      // never set noData here - only a fetch failure is a problem.
      [SOURCE.EXPOSURE_FLAGS]: flagsFetchError ? { ok: false } : { ok: true },
      // While the block lookup is still in flight, report it as ok so the
      // header shows no warning until we know for sure whether it has data.
      [SOURCE.BLOCK_DETAILS]: blockLookupLoading
        ? { ok: true }
        : blockFetchError
          ? { ok: false }
          : Object.keys(blockLookup).length === 0
            ? { ok: true, noData: true }
            : { ok: true },
    }),
    [
      exposureFetchError,
      exposureFields,
      flagsFetchError,
      blockFetchError,
      blockLookup,
      blockLookupLoading,
    ],
  );
  const exposureBreakdownRequired = [SOURCE.EXPOSURES];

  const nightSummarySources = useMemo(
    () => ({
      [SOURCE.NIGHT_REPORTS]: nightreportFetchError
        ? { ok: false }
        : reports.length === 0
          ? { ok: true, noData: true }
          : { ok: true },
    }),
    [nightreportFetchError, reports],
  );
  const nightSummaryRequired = [SOURCE.NIGHT_REPORTS];

  const staticVisitMapSources = useMemo(
    () => ({
      [SOURCE.STATIC_VISIT_MAP]: staticVisitMapError
        ? { ok: false }
        : !staticVisitMaps?.staticMapUrl
          ? { ok: true, noData: true }
          : { ok: true },
    }),
    [staticVisitMapError, staticVisitMaps],
  );
  const staticVisitMapRequired = [SOURCE.STATIC_VISIT_MAP];

  const allLoaded =
    !exposuresLoading &&
    !expectedExposuresLoading &&
    !almanacLoading &&
    !obsStatusLoading &&
    !nightreportLoading &&
    !jiraLoading &&
    !flagsLoading &&
    !staticVisitMapLoading;

  // processedNotifications recomputes incrementally as fetches settle.
  // Show system notices and no-data banners immediately, but delay
  // error banners until all fetches are complete.
  const displayedNotifications = allLoaded
    ? processedNotifications
    : processedNotifications.filter(
        (notification) => notification.type !== "error",
      );

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-6">
        {displayedNotifications.length > 0 && (
          <NotificationBannerStack
            notifications={displayedNotifications}
            onDismiss={removeNotification}
          />
        )}
        {/* Metrics */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${
            isScientificNightlyDigest ? "lg:grid-cols-3" : "lg:grid-cols-4"
          }`}
        >
          <MetricsCard
            icon={ShutterIcon}
            data={exposureMetricValue}
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
            state={exposureMetricState.state}
            message={exposureMetricState.message}
            loading={exposuresLoading || expectedExposuresLoading}
          />
          <MetricsCard
            icon={<EfficiencyChart value={efficiency} />}
            data={efficiencyValue}
            label="Open-shutter (-weather) efficiency"
            tooltip={
              <>
                Efficiency computed as total on-sky exposure time / ( time
                between <code>-12°</code> twilights <code>-</code> time lost to
                weather* ). Exposures started outside the twilights are not
                counted in total time.
                <br />
                <br />
                *Where Observatory Status data is not available, weather loss is
                treated as <code>0</code>.
              </>
            }
            state={efficiencyState.state}
            message={efficiencyState.message}
            warningAriaLabel="Efficiency data availability warning"
            loading={almanacLoading || exposuresLoading || obsStatusLoading}
          />
          <TimeLossCard
            obsStatusFaultLoss={obsStatusFaultLoss}
            obsStatusWeatherLoss={obsStatusWeatherLoss}
            obsStatusDowntime={obsStatusDowntime}
            state={timeLossState.state}
            message={timeLossState.message}
            obsStatusLoading={obsStatusLoading}
          />
          {!isScientificNightlyDigest && (
            <DialogMetricsCard
              icons={[JiraIconWhite, JiraIconBlue]}
              data={jiraValue}
              label="Jira tickets created"
              metadata={`(${jiraUpdatedValue} updated)`}
              tooltip="Jira tickets created or updated within the specified date range."
              state={jiraState.state}
              message={jiraState.message}
              loading={jiraLoading}
              dialogTitle="Jira Tickets"
              dialogDescription="List of Jira tickets created or updated within the specified date range."
              dialogContent={
                <JiraTicketsTable loading={jiraLoading} tickets={jiraTickets} />
              }
            ></DialogMetricsCard>
          )}
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
              sources={observingConditionsSources}
              required={observingConditionsRequired}
            />
            <ExposureBreakdownApplet
              exposureFields={exposureFields}
              exposureCount={exposureCount}
              sumExpTime={sumExpTime}
              flags={flags}
              blockLookup={blockLookup}
              exposuresLoading={exposuresLoading}
              flagsLoading={flagsLoading}
              flagsError={flagsFetchError}
              onBarHover={onBarHover}
              onBarLeave={onBarLeave}
              sources={exposureBreakdownSources}
              required={exposureBreakdownRequired}
            />
          </div>
          <div
            className={`grid grid-cols-1 gap-4 ${
              isScientificNightlyDigest ? "lg:grid-cols-2" : "lg:grid-cols-3"
            }`}
          >
            {!isScientificNightlyDigest && (
              <NightSummary
                reports={reports}
                nightreportLoading={nightreportLoading}
                sources={nightSummarySources}
                required={nightSummaryRequired}
              />
            )}
            <ObservatoryStatusApplet
              almanacInfo={almanacInfo}
              intervals={obsStatusIntervals}
              availability={obsStatusAvailability}
              fetchError={obsStatusFetchError}
              almanacFetchError={almanacFetchError}
              openDomeTimes={openDomeTimes}
              fullTimeRange={fullTimeRange}
              loading={obsStatusLoading || exposuresLoading || almanacLoading}
            />
            <VisitMapStaticApplet
              mapData={staticVisitMaps?.staticMapUrl}
              mapLoading={staticVisitMapLoading}
              sources={staticVisitMapSources}
              required={staticVisitMapRequired}
            />
          </div>
        </div>
      </div>
    </>
  );
}
