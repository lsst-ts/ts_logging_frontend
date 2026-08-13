import { useState, useEffect, useRef } from "react";
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

function Report({
  id,
  day_obs: dayObs,
  summary,
  weather,
  maintel_summary: maintelSummary,
  auxtel_summary: auxTelSummary,
  date_sent: dateSent,
  observers_crew: observersCrew,
  containerRef,
  setDay = () => {},
}) {
  const reportRef = useRef(null);

  useEffect(() => {
    if (!containerRef?.current) return;
    const container = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const dayObs = parseInt(entry.target.id, 10);
            setDay(dayObs);
          }
        });
      },
      {
        root: container,
      },
    );

    const node = reportRef.current;
    if (node) {
      observer.observe(node);
    }

    return () => {
      if (node) {
        observer.unobserve(node);
      }
    };
  }, [containerRef?.current]);

  let telescopeSummary = "-";
  if (maintelSummary) {
    telescopeSummary = maintelSummary;
  } else if (auxTelSummary) {
    telescopeSummary = auxTelSummary;
  }

  return (
    <div
      ref={reportRef}
      id={dayObs}
      className="flex flex-col gap-2 [&:not(:last-child)]:border-b [&:not(:last-child)]:pb-8  max-w-[75ch]"
    >
      <div className="hidden">{id}</div>
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

function scrollToId(id) {
  const target = document.getElementById(id);
  if (!target) {
    console.warn(`Element with id ${id} not found.`);
    return;
  }
  target.scrollIntoView({
    behavior: "smooth",
    block: "start",
    inline: "nearest",
  });
}

function SelectObsDay({ days, selectedDay, setDay }) {
  const handleChange = (value) => {
    scrollToId(value);
    setDay(value);
  };
  return (
    <Select value={selectedDay} onValueChange={handleChange}>
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
  const availableDays = reports.map((report) => report.day_obs);
  const [selectedDay, setSelectedDay] = useState(availableDays[0]);

  const reportsContainerRef = useRef(null);

  const showObsDaySelector = !nightreportLoading && availableDays.length > 1;

  const appletTitle =
    availableDays.length > 1 ? "Night Reports" : "Night Report";

  const renderReports = () => (
    <>
      {nightreportLoading ? (
        <Skeleton className="w-full h-full bg-stone-900" />
      ) : (
        reports.map((report) => (
          <Report
            key={report.id}
            containerRef={reportsContainerRef}
            setDay={setSelectedDay}
            {...report}
          />
        ))
      )}
    </>
  );

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
              setDay={setSelectedDay}
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
              <PopoverTrigger className="self-end min-w-4">
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
              <PopoverTrigger className="self-end min-w-4">
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
