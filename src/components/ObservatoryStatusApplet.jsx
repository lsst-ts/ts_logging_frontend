import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import ObservatoryStatusCumulativePlot from "@/components/ObservatoryStatusCumulativePlot";

import FullScreenIcon from "../assets/FullScreenIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Observatory status applet (WIP)
 */
function ObservatoryStatusApplet({
  almanacInfo = [],
  intervals = [],
  availability, // TODO: (OSW-2444) Handle availability
  openDomeTimes = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  loading,
  // brushGroup = null,
}) {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Observatory Status
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
          <Dialog>
            <DialogTrigger className="self-end min-w-4">
              <img src={FullScreenIcon} />
            </DialogTrigger>
            <DialogContent className="bg-teal-900/75 p-8 !w-[95vw] !max-w-7xl max-h-screen overflow-y-auto">
              <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 !h-[50vw] font-thin">
                {loading ? (
                  <div className="flex-grow w-full h-full">
                    <Skeleton className="h-full min-h-[180px] bg-stone-900" />
                  </div>
                ) : (
                  <ObservatoryStatusCumulativePlot
                    almanacInfo={almanacInfo}
                    intervals={intervals}
                    availability={availability}
                    openDomeTimes={openDomeTimes}
                    fullTimeRange={fullTimeRange}
                    selectedTimeRange={selectedTimeRange}
                    setSelectedTimeRange={setSelectedTimeRange}
                    fullScreen={true}
                  />
                )}
              </CardContent>
            </DialogContent>
          </Dialog>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={DownloadIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px]">
              <p>
                The observatory's status and dome activity during the observing
                night.
                <br />
                <br />
                Time is accumulated between twilights, <code>[-12°, -12°]</code>
                , with positive slopes representing an active state. Markers
                represent status updates in UTC as recorded in the{" "}
                <code>EFD</code>'s{" "}
                <code>Scheduler.logevent_observatoryStatus</code> topic.
                <br />
                <br />
                &#9671; : status update with accompanying note
                <br />
                &#9675; : status update only
                <br />
                <br />
                Hover over markers to see the details of the status update.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {loading ? (
          <div className="flex-grow w-full h-full">
            <Skeleton className="h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <ObservatoryStatusCumulativePlot
            almanacInfo={almanacInfo}
            intervals={intervals}
            availability={availability}
            openDomeTimes={openDomeTimes}
            fullTimeRange={fullTimeRange}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
          />
        )}
      </CardContent>
    </Card>
  );
}

export default ObservatoryStatusApplet;
