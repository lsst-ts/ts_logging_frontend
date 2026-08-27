import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import FullScreenIcon from "../assets/FullScreenIcon.svg";

function scrollToNode(node) {
  if (!node) {
    console.warn(`Node is not available to be scrolled into view.`);
    return;
  }
  node.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
}

function Report({
  day_obs: dayObs,
  summary,
  weather,
  maintel_summary: maintelSummary,
  auxtel_summary: auxTelSummary,
  date_sent: dateSent,
  observers_crew: observersCrew,
  reportRef,
}) {
  let telescopeSummary = "-";
  if (maintelSummary) {
    telescopeSummary = maintelSummary;
  } else if (auxTelSummary) {
    telescopeSummary = auxTelSummary;
  }

  return (
    <div
      ref={reportRef}
      className="flex flex-col gap-2 [&:not(:last-child)]:border-b [&:not(:last-child)]:pb-8  max-w-[75ch]"
      data-dayobs={dayObs}
    >
      <div className="font-semibold">Night of {dayObs}</div>
      <div className="whitespace-pre-wrap">{summary}</div>
      <div className="font-medium">Weather</div>
      <div>{weather}</div>
      <div className="font-medium">Detailed report</div>
      <div className="whitespace-pre-wrap">{telescopeSummary}</div>
      <div className="font-medium">Observers</div>
      <div>{(observersCrew ?? []).join(", ")}</div>
      <div className="text-[0.875em] text-end mt-2">Sent at {dateSent}Z</div>
    </div>
  );
}

function SelectObsDay({ days, selectedDay, onChange }) {
  return (
    <Select value={selectedDay} onValueChange={onChange}>
      <SelectTrigger
        className={
          "!h-[1rem] text-sidebar-foreground text-xs px-2 py-0" +
          " inline-flex bg-white justify-between font-normal" +
          " focus-visible:ring-4 focus-visible:ring-green-500/50"
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {days.map((day) => (
          <SelectItem key={day} value={day}>
            {day}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function convertReportToText(report) {
  return `Night of ${report.day_obs}
${report.summary}

Weather:
${report.weather}

Detailed report:
${report.maintel_summary || ""}
${report.auxtel_summary || ""}

Observers:
${(report.observers_crew || []).join(", ")}

${report.date_sent ? `Sent at ${report.date_sent}Z` : ""}`;
}

function handleDownload(reports) {
  // TODO: Implement the download functionality
  // See OSW-1343
  console.log("TODO: download reports...");
  const textContent = reports
    .map(convertReportToText)
    .join("-----------------\n");
  console.log(textContent);
}

function NightSummary({ reports = [], nightreportLoading = false }) {
  const [selectedDay, setSelectedDay] = useState(null);

  const [prevReports, setPrevReports] = useState(reports);
  if (prevReports !== reports) {
    setPrevReports(reports);
    if (reports.length > 0) {
      setSelectedDay(reports[0].day_obs);
    }
  }

  const reportsContainerRef = useRef(null);
  const reportElementsRef = useRef(new Map());

  const handleSelectedDay = useCallback((dayobs) => {
    const node = reportElementsRef.current.get(String(dayobs));
    scrollToNode(node);
  }, []);

  const setReportElementRef = useCallback((dayObs, node) => {
    if (node) {
      reportElementsRef.current.set(String(dayObs), node);
      return;
    }
    reportElementsRef.current.delete(String(dayObs));
  }, []);

  useEffect(() => {
    if (nightreportLoading || !reports.length) return;

    const container = reportsContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dayObs = parseInt(entry.target.dataset.dayobs, 10);
            setSelectedDay(dayObs);
          }
        });
      },
      {
        root: container,
      },
    );

    reportElementsRef.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [nightreportLoading, reports]);

  const renderReports = (dialog = false) => (
    <>
      {nightreportLoading ? (
        <Skeleton className="w-full h-full bg-stone-900" />
      ) : reports.length === 0 ? (
        <div className="flex h-full w-full items-center justify-center">
          No reports available
        </div>
      ) : (
        reports.map((report) => (
          <Report
            key={dialog ? "dialog-" + report.id : report.id}
            reportRef={
              dialog
                ? null
                : (node) => setReportElementRef(report.day_obs, node)
            }
            {...report}
          />
        ))
      )}
    </>
  );

  const availableDays = reports.map((report) => report.day_obs);
  const showObsDaySelector = !nightreportLoading && availableDays.length > 1;
  const appletTitle =
    availableDays.length > 1 ? "Night Reports" : "Night Report";

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader
        className={
          "flex flex-wrap gap-x-4" +
          " bg-teal-900 p-4 rounded-sm align-center items-center"
        }
      >
        <CardTitle className="text-white font-thin">{appletTitle}</CardTitle>
        <div className="flex gap-x-2 grow">
          {showObsDaySelector && (
            <SelectObsDay
              days={availableDays}
              selectedDay={selectedDay}
              onChange={handleSelectedDay}
            />
          )}
          <div className="flex flex-row gap-2 ml-auto">
            <Dialog>
              <DialogTrigger
                className="self-end min-w-4"
                aria-label={`Open ${appletTitle.toLowerCase()} in fullscreen`}
              >
                <img src={FullScreenIcon} alt="Fullscreen" />
              </DialogTrigger>
              <DialogContent className="bg-teal-900/75 border-none p-8 !w-auto !max-w-7xl !max-h-[90vh] grid-rows-[auto_1fr] text-lg">
                <DialogHeader>
                  <DialogTitle className=" text-neutral-200 text-2xl">
                    {appletTitle}
                  </DialogTitle>
                </DialogHeader>
                <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin min-w-[30vw] min-h-[30vh] box-border overflow-y-auto">
                  {renderReports(true)}
                </CardContent>
              </DialogContent>
            </Dialog>
            <Popover>
              <PopoverTrigger
                className="self-end min-w-4"
                aria-label={`Download ${appletTitle.toLowerCase()} data`}
              >
                <img
                  src={DownloadIcon}
                  onClick={() => handleDownload(reports)}
                />
              </PopoverTrigger>
              <PopoverContent className="bg-black text-white text-sm border-yellow-700">
                This is a placeholder for the download/export button. Once
                implemented, clicking here will download this Applet's data to a
                .txt file.
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger
                className="self-end min-w-4"
                aria-label={`${
                  appletTitle.charAt(0).toUpperCase() +
                  appletTitle.slice(1).toLowerCase()
                } information`}
              >
                <img src={InfoIcon} />
              </PopoverTrigger>
              <PopoverContent className="bg-black text-white text-sm border-yellow-700">
                Observers night report retrieved from the nightreport API.
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent
        ref={reportsContainerRef}
        style={{ maxHeight: "100%" }}
        className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin overflow-y-auto"
      >
        {renderReports()}
      </CardContent>
    </Card>
  );
}

export default NightSummary;
