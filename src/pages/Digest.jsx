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
import { getObsStatusFetchErrorText } from "@/utils/observatoryStatusUtils";
import {
  formatDayobsStrForDisplay,
  getDayobsStartUTC,
} from "@/utils/timeUtils";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import DialogMetricsCard from "@/components/dialog-metrics-card";
import JiraTicketsTable from "@/components/jira-tickets-table";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/Parameters";
import ObservingConditionsApplet from "@/components/ObservingConditionsApplet";
import NightSummary from "@/components/NightSummary.jsx";
import ObservatoryStatusApplet from "@/components/ObservatoryStatusApplet";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";
import VisitMapStaticApplet from "@/components/VisitMapStaticApplet.jsx";
import WarningTooltip from "@/components/WarningTooltip";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

const EMPTY_OBS_STATUS_AVAILABILITY = {
  status: "none",
  available_from: null,
};

/**
 * Builds the warning content shown on the Time Loss and Efficiency metric
 * cards when Observatory Status or Almanac data is incomplete.
 *
 * Fetch errors take precedence over availability gaps. When both requests
 * fail, a single concise message is returned. When only Almanac fails, the
 * Obs Status availability warning is preserved alongside the error, since the
 * loss metrics still describe the available data. When only Obs Status fails,
 * only the error is shown (weather loss falls back to zero for the efficiency
 * calculation). With no fetch errors, a warning is shown only when Obs Status
 * covers part (or none) of the requested range.
 *
 * @param {Object} options
 * @param {boolean} [options.almanacFetchError=false] Whether the Almanac request failed.
 * @param {boolean} [options.obsStatusFetchError=false] Whether the Observatory Status request failed.
 * @param {Object} [options.obsStatusAvailability] Availability metadata for the observatory-status feed.
 * @returns {React.ReactNode|null} The warning content, or `null` when data is fully available.
 */
function getDigestWarningContent({
  almanacFetchError,
  obsStatusFetchError,
  obsStatusAvailability,
}) {
  const availabilityStatus = obsStatusAvailability?.status;
  // A successful Obs Status response can still cover only part (or none) of
  // the selected range. These are availability warnings, not fetch errors.
  const hasLimitedObsStatusData =
    availabilityStatus === OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL ||
    availabilityStatus === OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE;
  const availableFrom = obsStatusAvailability?.available_from
    ? formatDayobsStrForDisplay(String(obsStatusAvailability.available_from))
    : null;
  const availabilityWarning = hasLimitedObsStatusData && (
    <>
      Observatory Status data is only available from{" "}
      {availableFrom ? (
        <code>{availableFrom}</code>
      ) : (
        "the supported dayobs range"
      )}
      .
      <br />
      Where unavailable, status data is treated as <code>0</code>.
    </>
  );

  const fetchErrorText = getObsStatusFetchErrorText({
    almanacFetchError,
    obsStatusFetchError,
  });

  // When both sources fail, use one concise message rather than stacking two
  // separate warnings on the Time Loss card.
  if (almanacFetchError && obsStatusFetchError) {
    return <>{fetchErrorText}</>;
  }

  // Preserve a successful Obs Status availability warning alongside an
  // Almanac failure, since it still describes the available loss metrics.
  if (almanacFetchError) {
    return (
      <>
        {fetchErrorText}
        {availabilityWarning && <> {availabilityWarning}</>}
      </>
    );
  }

  // An Obs Status fetch failure falls back to zero weather loss for the
  // efficiency calculation, rather than being treated as an availability gap.
  if (obsStatusFetchError) {
    return <>{fetchErrorText}</>;
  }

  // With no fetch errors, show a warning only when Obs Status is limited.
  return availabilityWarning;
}

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

  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [expectedExposuresLoading, setExpectedExposuresLoading] =
    useState(true);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [nightreportLoading, setNightreportLoading] = useState(true);
  const [obsStatusLoading, setObsStatusLoading] = useState(true);

  const [jiraTickets, setJiraTickets] = useState([]);
  const [jiraLoading, setJiraLoading] = useState(true);

  const [flagsLoading, setFlagsLoading] = useState(true);
  const [almanacInfo, setAlmanacInfo] = useState([]);
  const [openDomeTimes, setOpenDomeTimes] = useState([]);

  const [blockLookup, setBlockLookup] = useState({});

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
    setNightreportLoading(true);
    setJiraLoading(true);
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
    setObsStatusFaultLoss(0.0);
    setObsStatusWeatherLoss(0.0);
    setObsStatusDowntime(0.0);
    setObsStatusAvailability(EMPTY_OBS_STATUS_AVAILABILITY);
    setObsStatusFetchError(false);
    setAlmanacFetchError(false);

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

    fetchNightreport(startDayobs, queryEndDayobs, abortController)
      .then(([reports]) => {
        const parsedReports = reports.map((report) => ({
          ...report,
          maintel_summary:
            telescope === "Simonyi" ? report.maintel_summary : null,
          auxtel_summary: telescope === "AuxTel" ? report.auxtel_summary : null,
        }));
        setReports(parsedReports);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching night reports:", err);
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
          addNotification({
            type: "error",
            source: "jira-blocks",
          });
          addNotification({
            type: "error",
            source: "zephyr-blocks",
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

  const efficiencyText = Number.isFinite(efficiency) ? `${efficiency} %` : "NA";
  const newTicketsCount = jiraTickets.filter((tix) => tix.isNew).length;
  const warningContent = getDigestWarningContent({
    almanacFetchError,
    obsStatusFetchError,
    obsStatusAvailability,
  });

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
            tooltip={
              <>
                Efficiency computed as total on-sky exposure time / ( time
                between <code>-12°</code> twilights <code>-</code> time lost to
                weather* ). Exposures started outside the twilights are not
                counted in total time.
                <br />
                <br />
                *If Observatory Status data is not available, weather loss is
                treated as <code>0</code>.
              </>
            }
            loading={almanacLoading || exposuresLoading || obsStatusLoading}
            statusIndicator={
              <WarningTooltip ariaLabel="Efficiency data availability warning">
                {warningContent}
              </WarningTooltip>
            }
          />
          <TimeLossCard
            obsStatusFaultLoss={obsStatusFaultLoss}
            obsStatusWeatherLoss={obsStatusWeatherLoss}
            obsStatusDowntime={obsStatusDowntime}
            obsStatusAvailability={obsStatusAvailability}
            warningContent={warningContent}
            obsStatusLoading={obsStatusLoading}
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
              error={staticVisitMapError}
            />
          </div>
        </div>
      </div>
    </>
  );
}
