import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

import ObservatoryStatusCumulativePlot from "@/components/ObservatoryStatusCumulativePlot";

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
  brushGroup = null,
}) {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Observatory Status
        </CardTitle>
        <div className="flex flex-row gap-2 justify-end">
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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[300px]">
              {/* TODO */}
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
