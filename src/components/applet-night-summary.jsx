import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function Report({
  id,
  day_obs: dayObs,
  summary,
  weather,
  maintel_summary: maintelSummary,
  auxtel_summary: auxTelSummary,
  date_sent: dateSent,
  observers_crew: observersCrew,
}) {
  return (
    <div
      className={`flex flex-col gap-2 [&:not(:last-child)]:border-b [&:not(:last-child)]:pb-4`}
    >
      <div className="hidden">{id}</div>
      <div className="font-semibold">Night of {dayObs}</div>
      <div className="whitespace-pre-wrap">{summary}</div>
      <div className="font-medium">Weather</div>
      <div>{weather}</div>
      {maintelSummary && (
        <>
          <div className="font-medium">Simonyi</div>
          <div className="whitespace-pre-wrap">{maintelSummary}</div>
        </>
      )}
      {auxTelSummary && (
        <>
          <div className="font-medium">AuxTel</div>
          <div className="whitespace-pre-wrap">{auxTelSummary}</div>
        </>
      )}
      <div className="font-medium">Observers</div>
      <div>{(observersCrew ?? []).join(", ")}</div>
      <div className="text-xs text-end">Sent at {dateSent}Z</div>
    </div>
  );
}

function NightSummary({ reports = [], nightreportLoading = false }) {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Observers Night Summary
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={DownloadIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button. Once
              implemented, clicking here will download this Applet's data to a
              .csv file.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              Observers night report retrieves from the nightreport API.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin overflow-y-auto">
        {nightreportLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : (
          reports.map((report) => <Report key={report.id} {...report} />)
        )}
      </CardContent>
    </Card>
  );
}

export default NightSummary;
