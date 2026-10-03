import { useEffect, useState, useMemo } from "react";
import { useSearch } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useSelectionSync } from "@/components/DataTable";
import NarrativeLogApplet from "@/components/NarrativeLogApplet";
import { NotificationBannerStack } from "@/components/NotificationBannerStack";
import ObservatoryStatusCumulativeApplet from "@/components/ObservatoryStatusCumulativeApplet";
import ObservatoryStatusBreakdownApplet from "@/components/ObservatoryStatusBreakdownApplet";
import ObservatoryStatusTimelineApplet from "@/components/ObservatoryStatusTimelineApplet";
import AppletHeader from "@/components/AppletHeader";
import { TELESCOPES } from "@/components/Parameters";
import ExposureTimeAccountingApplet from "@/components/ExposureTimeAccountingApplet";
import TipsCard from "@/components/TipsCard";

import {
  fetchAlmanac,
  fetchExposures,
  fetchNarrativeLog,
  fetchObsStatusFromRubinNights,
} from "@/utils/fetchUtils";
import { prepareAlmanacData } from "@/utils/timelineUtils";
import { getDayobsStartUTC } from "@/utils/timeUtils";
import {
  calculateSumExpTimeBetweenTwilights,
  computeCalculatedFault,
  isDictionaryEmpty,
} from "@/utils/utils";

import {
  EMPTY_OBS_STATUS_AVAILABILITY,
  METRIC_STATES,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

import { useNotifications } from "@/hooks/useNotifications";
import { useTimeRangeFromURL } from "@/hooks/useTimeRangeFromURL";

import DownloadIcon from "../assets/DownloadIcon.svg";

/**
 * Render the Time Accounting page: a breakdown of how the observable time in
 * the selected dayobs range was spent.
 */
function TimeAccounting() {
  // Subscribe component to URL params
  const search = useSearch({
    from: "/time-accounting",
  });
  const { startDayobs, endDayobs, telescope } = search;

  // Our dayobs inputs are inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  // (which are exclusive of the end date).
  const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // Time range state synced with URL
  const { selectedTimeRange, setSelectedTimeRange, fullTimeRange } =
    useTimeRangeFromURL("/time-accounting", startDayobs, queryEndDayobs);

  // Selection state for the Observatory Status breakdown table, synced with URL.
  const {
    selectedValue: selectedBreakdown,
    setSelectedValue: setSelectedBreakdown,
  } = useSelectionSync({
    routePath: "/time-accounting",
    paramName: "selectedBreakdown",
  });

  const [almanacInfo, setAlmanacInfo] = useState([]);
  const [openDomeTimes, setOpenDomeTimes] = useState([]);
  const [dayObsOpenDomeHours, setDayObsOpenDomeHours] = useState({});
  const [exposuresLoading, setExposuresLoading] = useState(true);

  // Exposure Time Accounting data
  const [exposures, setExposures] = useState([]);
  const [onSkyTimeAccounting, setOnSkyTimeAccounting] = useState(null);
  const [sumOnSkyExpTime, setSumOnSkyExpTime] = useState(null);
  const [openDomeError, setOpenDomeError] = useState(false);
  const [exposureTimeAccountingError, setExposureTimeAccountingError] =
    useState(false);
  const [exposuresError, setExposuresError] = useState(false);

  // Almanac data
  const [twilightValues, setTwilightValues] = useState([]);
  const [twilight0DegValues, setTwilight0DegValues] = useState([]);
  const [almanacLoading, setAlmanacLoading] = useState(true);

  // Observatory status data
  const [obsStatusEntries, setObsStatusEntries] = useState([]);
  const [obsStatusIntervals, setObsStatusIntervals] = useState([]);
  const [obsStatusMetrics, setObsStatusMetrics] = useState(null);
  const [obsStatusAvailability, setObsStatusAvailability] = useState(
    EMPTY_OBS_STATUS_AVAILABILITY,
  );
  const [obsStatusFetchError, setObsStatusFetchError] = useState(false);
  const [almanacFetchError, setAlmanacFetchError] = useState(false);
  const [obsStatusLoading, setObsStatusLoading] = useState(true);

  // Narrative Log data
  const [narrativeLogEntries, setNarrativeLogEntries] = useState([]);
  const [narrativeLogLoading, setNarrativeLogLoading] = useState(true);
  const [narrativeLogError, setNarrativeLogError] = useState(false);

  // Total night hours from almanac (for metrics total row)
  const [nightHours, setNightHours] = useState(null);

  // Visibility toggles
  const [tipsVisible, setTipsVisible] = useState(false);

  const {
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  } = useNotifications();

  useEffect(() => {
    const abortController = new AbortController();

    setAlmanacLoading(true);
    setExposuresLoading(true);
    setObsStatusLoading(true);
    setNarrativeLogLoading(true);

    setExposures([]);
    setAlmanacInfo([]);
    setOpenDomeTimes([]);
    setDayObsOpenDomeHours({});
    setOnSkyTimeAccounting(null);
    setSumOnSkyExpTime(null);
    setOpenDomeError(false);
    setExposureTimeAccountingError(false);
    setExposuresError(false);

    setTwilightValues([]);
    setTwilight0DegValues([]);
    setNightHours(null);

    setObsStatusEntries([]);
    setObsStatusIntervals([]);
    setObsStatusMetrics(null);
    setObsStatusAvailability(EMPTY_OBS_STATUS_AVAILABILITY);

    setAlmanacFetchError(false);
    setObsStatusFetchError(false);
    setNarrativeLogError(false);

    setNarrativeLogEntries([]);

    clearNotifications();

    fetchAlmanac(startDayobs, queryEndDayobs, abortController)
      .then((almanac) => {
        // Used in Obs Status Timeline
        const { twilightValues, twilight0DegValues } = prepareAlmanacData(
          almanac,
          { utc: true },
        );
        setTwilightValues(twilightValues);
        setTwilight0DegValues(twilight0DegValues);

        // Total elapsed twilight (night) hours across the selected range,
        // used in Obs Status Timeline and Exposure Accounting.
        setNightHours(
          almanac.reduce(
            (acc, day) => acc + (day.elapsed_twilight_hours ?? 0),
            0,
          ),
        );

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

    fetchExposures(startDayobs, queryEndDayobs, instrument, abortController)
      .then((data) => {
        // Are exposures actually used anywhere?
        setExposures(data.exposures);
        setSumOnSkyExpTime(data.total_on_sky_exposure_time ?? null);
        setOpenDomeTimes(data.open_dome_times ?? []);
        setDayObsOpenDomeHours(data.day_obs_open_dome_hours ?? {});
        setOnSkyTimeAccounting(data.night_on_sky_time_accounting ?? null);

        if (data.open_dome_error) {
          setOpenDomeError(data.open_dome_error);
          addNotification({
            type: "error",
            source: "dome-times",
          });
        }
        if (data.time_accounting_error) {
          setExposureTimeAccountingError(data.time_accounting_error);
          addNotification({
            type: "error",
            source: "exposure-time-accounting",
          });
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching exposures:", err);
          setExposuresError(true);
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

    fetchObsStatusFromRubinNights({
      start: startDayobs,
      end: endDayobs,
      includeEntries: true,
      includeIntervals: true,
      nightOnlyMetrics: true,
      metrics: METRIC_STATES.map((stateName) => stateName.toLowerCase()),
      abortController,
    })
      .then((data) => {
        const entries = data?.entries ?? [];
        const intervals = data?.intervals ?? [];
        const metrics = data?.metrics ?? {};
        const availability = data?.availability ?? {};

        setObsStatusEntries(entries);
        setObsStatusIntervals(intervals);
        setObsStatusMetrics(metrics);
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

    fetchNarrativeLog(startDayobs, queryEndDayobs, instrument, abortController)
      .then((data) => {
        setNarrativeLogEntries(data?.narrative_log ?? []);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          console.error("Error fetching narrative log:", err);
          setNarrativeLogError(true);
          addNotification({
            type: "error",
            source: "narrative-log",
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setNarrativeLogLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // TODO: total_on_sky_exposure_time fetched from the backend would be ideal to use
  // here except that it does not clip at twilights, like this util.
  const totalExpTimeBetweenTwilights = useMemo(
    () => calculateSumExpTimeBetweenTwilights(exposures, almanacInfo),
    [exposures, almanacInfo],
  );

  // Total closed-dome hours across the queried nights, passed directly into
  // the Exposure Time Accounting applet.
  const domeClosedHours = useMemo(() => {
    if (openDomeError) {
      return null;
    }

    if (!dayObsOpenDomeHours || isDictionaryEmpty(dayObsOpenDomeHours)) {
      return 0.0;
    }

    return Object.values(dayObsOpenDomeHours).reduce(
      (sum, hours) => sum + (hours.closed_hours ?? 0.0),
      0.0,
    );
  }, [dayObsOpenDomeHours, openDomeError]);

  const almanacUnavailable = !almanacLoading && !almanacInfo?.length;

  // TODO: How much can be moved into ExposureTimeAccountingApplet?
  const { calculatedFault, faultUnavailable, faultUnavailableReason } =
    useMemo(() => {
      const unavailable = (reason) => ({
        calculatedFault: null,
        faultUnavailable: true,
        faultUnavailableReason: reason,
      });

      if (almanacUnavailable) {
        return unavailable(
          "Fault data unable to be computed: no almanac data.",
        );
      }
      if (exposureTimeAccountingError) {
        return unavailable(
          "Fault data unable to be computed: no exposure time accounting data.",
        );
      }
      if (!onSkyTimeAccounting || isDictionaryEmpty(onSkyTimeAccounting)) {
        return {
          calculatedFault: 0.0,
          faultUnavailable: false,
          faultUnavailableReason: null,
        };
      }

      return {
        calculatedFault: computeCalculatedFault(
          onSkyTimeAccounting,
          totalExpTimeBetweenTwilights,
          nightHours,
          obsStatusMetrics?.weather ?? 0.0,
        ),
        faultUnavailable: false,
        faultUnavailableReason: null,
      };
    }, [
      almanacUnavailable,
      nightHours,
      onSkyTimeAccounting,
      totalExpTimeBetweenTwilights,
      obsStatusMetrics,
      exposureTimeAccountingError,
    ]);

  // Loading flag for the Exposure Time Accounting applet.
  const exposureAccountingLoading = useMemo(
    () => almanacLoading || obsStatusLoading || exposuresLoading,
    [almanacLoading, obsStatusLoading, exposuresLoading],
  );

  // Loading flag for the full page; determines whether to show the notifications.
  const allLoaded =
    !almanacLoading &&
    !exposuresLoading &&
    !obsStatusLoading &&
    !narrativeLogLoading;

  const displayedNotifications = allLoaded
    ? processedNotifications
    : processedNotifications.filter(
        (notification) => notification.type !== "error",
      );

  return (
    <>
      <div className="flex flex-col w-full h-full p-8 gap-4">
        {displayedNotifications.length > 0 && (
          <NotificationBannerStack
            notifications={displayedNotifications}
            onDismiss={removeNotification}
          />
        )}

        {/* Page Content */}
        <div className="flex flex-col gap-4">
          {/* Page title + buttons */}
          <AppletHeader
            isPageHeader={true}
            title="Time Accounting"
            description="A variety of time accounting plots and metrics."
            actions={
              <>
                <Popover>
                  <PopoverTrigger className="min-w-4 cursor-pointer">
                    <img src={DownloadIcon} />
                  </PopoverTrigger>
                  <PopoverContent className="bg-black text-white text-sm border-yellow-700">
                    This is a placeholder for the download/export button. Once
                    implemented, clicking here will download the data shown on
                    this page to a .csv file.
                  </PopoverContent>
                </Popover>

                {/* Button to toggle tips visibility */}
                <Button
                  onClick={() => setTipsVisible((prev) => !prev)}
                  className="bg-amber-400 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-amber-300 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
                >
                  {tipsVisible ? "Hide Tips" : "Show Tips"}
                </Button>
              </>
            }
          />

          {/* Timeline Tips */}
          {tipsVisible && (
            <TipsCard title="Timeline Tips">
              <div>
                <ul className="list-disc list-outside ml-5 space-y-1">
                  <li>
                    <span className="font-bold">Drag</span> to select a time
                    range (all timeseries plots update automatically).
                  </li>
                  <li>
                    <span className="font-bold">Drag</span> the selection to
                    reposition.
                  </li>
                  <li>
                    <span className="font-bold">Drag</span> the edges of the
                    selection to resize.
                  </li>
                  <li>
                    <span className="font-bold">Double-Click</span> to reset.
                  </li>
                  <li>
                    In the timeline, blue lines are 12° twilights, & dashed
                    white lines are 0° twilights.
                  </li>
                  <li>
                    In the cumulative plots, events outside twilights are not
                    shown.
                  </li>
                  <li>All event times are UTC.</li>
                </ul>
              </div>
            </TipsCard>
          )}

          <ObservatoryStatusTimelineApplet
            entries={obsStatusEntries}
            twilightValues={twilightValues}
            twilight0DegValues={twilight0DegValues}
            fullTimeRange={fullTimeRange}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            brushGroup="time-accounting"
            obsStatusMetrics={obsStatusMetrics}
            nightHours={nightHours}
            availability={obsStatusAvailability}
            fetchError={obsStatusFetchError}
            almanacFetchError={almanacFetchError}
            loading={obsStatusLoading}
          />

          <ObservatoryStatusCumulativeApplet
            appletTitle={"Observatory Status - Single Night Accumulations"}
            plotTitle={"Nightly Cumulative Time in State"}
            collapsable
            compactEmptyState
            almanacInfo={almanacInfo}
            intervals={obsStatusIntervals}
            availability={obsStatusAvailability}
            fetchError={obsStatusFetchError}
            almanacFetchError={almanacFetchError}
            openDomeTimes={openDomeTimes}
            fullTimeRange={fullTimeRange}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            loading={obsStatusLoading || exposuresLoading || almanacLoading}
          />

          <ObservatoryStatusCumulativeApplet
            accumulateAcrossNights
            appletTitle={"Observatory Status - Multi Night Accumulations"}
            plotTitle={"Cumulative Time in State Across Nights"}
            collapsable
            compactEmptyState
            almanacInfo={almanacInfo}
            intervals={obsStatusIntervals}
            availability={obsStatusAvailability}
            fetchError={obsStatusFetchError}
            almanacFetchError={almanacFetchError}
            openDomeTimes={openDomeTimes}
            fullTimeRange={fullTimeRange}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            loading={obsStatusLoading || exposuresLoading || almanacLoading}
          />

          <NarrativeLogApplet
            narrativeLogLoading={narrativeLogLoading}
            narrativeLogEntries={narrativeLogEntries}
            narrativeLogError={narrativeLogError}
          />

          <ObservatoryStatusBreakdownApplet
            almanacInfo={almanacInfo}
            dayObsOpenDomeHours={dayObsOpenDomeHours}
            obsStatusIntervals={obsStatusIntervals}
            loading={obsStatusLoading}
            availability={obsStatusAvailability}
            fetchError={obsStatusFetchError}
            almanacFetchError={almanacFetchError}
            selected={selectedBreakdown}
            onSelectionChange={setSelectedBreakdown}
          />

          <ExposureTimeAccountingApplet
            loading={exposureAccountingLoading}
            onSkyTimeAccounting={onSkyTimeAccounting}
            sumOnSkyExpTime={sumOnSkyExpTime}
            elapsedTwilightHours={nightHours}
            closedDomeHours={domeClosedHours}
            calculatedFaultHours={calculatedFault}
            // All of these are error messages and availability flags.
            // Seems excessive.
            faultDataUnavailable={faultUnavailable}
            faultErrorMessage={faultUnavailableReason}
            exposuresError={exposuresError}
            domeError={openDomeError}
            exposureTimeAccountingError={exposureTimeAccountingError}
            almanacFetchError={almanacFetchError}
            obsStatusFetchError={obsStatusFetchError}
            obsStatusAvailability={obsStatusAvailability}
          />
        </div>
      </div>
    </>
  );
}

export default TimeAccounting;
