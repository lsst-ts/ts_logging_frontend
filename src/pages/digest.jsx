import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import Applet from "@/components/applet.jsx";
import AppletExposures from "@/components/applet-exposures.jsx";
import MetricsCard from "@/components/metrics-card.jsx";

import { EfficiencyChart } from "@/components/ui/RadialChart.jsx";
import ShutterIcon from "../assets/ShutterIcon.svg";
import TimeLossIcon from "../assets/TimeLossIcon.svg";
import JiraIcon from "../assets/JiraIcon.svg";
import {
  fetchExposures,
  fetchAlmanac,
  fetchNarrativeLog,
  fetchNightreport,
  fetchExposureFlags,
  fetchJiraTickets,
} from "@/utils/fetchUtils";
import {
  calculateEfficiency,
  calculateTimeLoss,
  getDatetimeFromDayobsStr,
} from "@/utils/utils";
import DialogMetricsCard from "@/components/dialog-metrics-card";
import JiraTicketsTable from "@/components/jira-tickets-table";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";
import ObservingConditionsApplet from "@/components/ObservingConditionsApplet";
import NightSummary from "@/components/NightSummary.jsx";

export default function Digest() {
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

  const [weatherLoss, setWeatherLoss] = useState(0.0);
  const [faultLoss, setFaultLoss] = useState(0.0);
  const [exposureFields, setExposureFields] = useState([]);
  const [exposureCount, setExposureCount] = useState(0);
  const [sumExpTime, setSumExpTime] = useState(0.0);
  const [onSkyExpCount, setOnSkyExpCount] = useState(0);
  const [sumOnSkyExpTime, setSumOnSkyExpTime] = useState(0.0);
  const [flags, setFlags] = useState([]);
  const [reports, setReports] = useState([]);

  const [exposuresLoading, setExposuresLoading] = useState(true);
  const [almanacLoading, setAlmanacLoading] = useState(true);
  const [narrativeLoading, setNarrativeLoading] = useState(true);
  const [nightreportLoading, setNightreportLoading] = useState(true);

  const [jiraTickets, setJiraTickets] = useState([]);
  const [jiraLoading, setJiraLoading] = useState(true);

  const [flagsLoading, setFlagsLoading] = useState(true);
  const [almanacInfo, setAlmanacInfo] = useState([]);

  useEffect(() => {
    const abortController = new AbortController();
    // The end dayobs is inclusive, so we add one day to the
    // endDayobs to get the correct range for the queries
    const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
      .plus({ days: 1 })
      .toFormat("yyyyMMdd");
    const instrument = TELESCOPES[telescope];
    setExposuresLoading(true);
    setAlmanacLoading(true);
    setNarrativeLoading(true);
    setNightreportLoading(true);
    setJiraLoading(true);
    setFlagsLoading(true);
    setExposureFields([]);
    setAlmanacInfo([]);
    setSumOnSkyExpTime(0.0);
    setJiraTickets([]);
    setWeatherLoss(0.0);
    setFaultLoss(0.0);

    fetchExposures(startDayobs, queryEndDayobs, instrument, abortController)
      .then(
        ([
          exposureFields,
          exposuresNo,
          exposureTime,
          onSkyExpNo,
          totalOnSkyExpTime,
        ]) => {
          setExposureFields(exposureFields);
          setExposureCount(exposuresNo);
          setSumExpTime(exposureTime);
          setOnSkyExpCount(onSkyExpNo);
          setSumOnSkyExpTime(totalOnSkyExpTime);
          setExposuresLoading(false);
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

    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  // calculate open shutter efficiency
  const efficiency = calculateEfficiency(
    exposureFields,
    almanacInfo,
    sumOnSkyExpTime,
    weatherLoss,
  );
  const efficiencyText = `${efficiency} %`;
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
            metadata="(TBD expected)"
            tooltip="On-sky exposures taken during the specified date range."
            loading={exposuresLoading}
          />
          <MetricsCard
            icon={<EfficiencyChart value={efficiency} />}
            data={efficiencyText}
            label="Open-shutter (-weather) efficiency"
            tooltip="Efficiency computed as total on-sky exposure time / (time between 18 degree twilights minus time lost to weather)"
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
            <Applet />
            <Applet />
          </div>
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}
