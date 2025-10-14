import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import AppletExposures from "@/components/applet-exposures.jsx";
import MetricsCard from "@/components/metrics-card.jsx";
import VisitMapApplet from "@/components/VisitMapApplet";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIcon from "../assets/JiraIcon.svg";
import {
  fetchExposures,
  fetchExpectedExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
  fetchVisitMaps,
} from "@/utils/fetchUtils";
import {
  calculateEfficiency,
  calculateTimeLoss,
  getDatetimeFromDayobsStr,
  calculateSumExpTimeBetweenTwilights,
} from "@/utils/utils";
import DialogMetricsCard from "@/components/dialog-metrics-card";
import JiraTicketsTable from "@/components/jira-tickets-table";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";
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

  useEffect(() => {
    const abortController = new AbortController();
    // The end dayobs is inclusive, so we add one day to the
    // endDayobs to get the correct range for the queries
    const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
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
            toast.warning("No exposures found for the selected date range.");
          }
        },
      )
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching exposures!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setExposuresLoading(false);
        }
      });

    fetchExpectedExposures(startDayobs, endDayobs, abortController)
      .then(
        ([
          // expectedNightlyExposures,
          expectedSumExposures,
        ]) => {
          setExpectedOnSkyExpCount(expectedSumExposures);
          if (expectedSumExposures === 0) {
            toast.warning("No exposures expected for the selected date range.");
          }
        },
      )
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching expected exposures!", {
            description: msg,
            duration: Infinity,
          });
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
          const msg = err?.message;
          toast.error("Error fetching almanac!", {
            description: msg,
            duration: Infinity,
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
        if (weather === 0 && fault === 0) {
          toast.warning("No time loss reported in the Narrative Log.");
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching narrative log!", {
            description: msg,
            duration: Infinity,
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
          const msg = err?.message;
          toast.error("Error fetching night reports!", {
            description: msg,
            duration: Infinity,
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
        if (issues.length === 0) {
          toast.warning("No Jira tickets reported.");
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching Jira!", {
            description: msg,
            duration: Infinity,
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
        if (flags.length === 0) {
          toast.warning("No exposures flagged for the selected date range.");
        }
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching exposure flags!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setFlagsLoading(false);
        }
      });
    // Visit maps
    fetchVisitMaps(startDayobs, queryEndDayobs, instrument, abortController, {
      appletMode: true,
    })
      .then((interactivePlot) => {
        setInteractiveMap(interactivePlot);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching visit maps!", {
            description: err?.message,
            duration: Infinity,
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

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-8">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <MetricsCard
            icon={ShutterIcon}
            data={onSkyExpCount}
            label="Nighttime exposures taken"
            metadata={`(${expectedOnSkyExpCount} expected)`}
            tooltip="On-sky exposures taken during the specified date range, and the expected number of exposures, as given by the latest simulated nominal night."
            loading={exposuresLoading || expectedExposuresLoading}
          />
          <MetricsCard
            icon={<EfficiencyChart value={efficiency} />}
            data={efficiencyText}
            label="Open-shutter (-weather) efficiency"
            tooltip="Efficiency computed as total on-sky exposure time / (time between 12 degree twilights minus time lost to weather). Exposures started outside the twilights are not counted in total time."
            loading={almanacLoading || exposuresLoading}
          />
          <MetricsCard
            icon={TimeLossIcon}
            data={timeLoss}
            label="Time loss"
            metadata={timeLossDetails}
            tooltip="Time loss as reported in the Narrative Log."
            loading={narrativeLoading}
          />
          <DialogMetricsCard
            icon={JiraIcon}
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
            />
            <AppletExposures
              exposureFields={exposureFields}
              exposureCount={exposureCount}
              sumExpTime={sumExpTime}
              flags={flags}
              exposuresLoading={exposuresLoading}
              flagsLoading={flagsLoading}
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
