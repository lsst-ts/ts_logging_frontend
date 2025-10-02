import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { MyBokehPlot } from "@/pages/plots";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function VisitMapApplet({ mapData, mapLoading }) {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Visit Maps
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
              The Visit Map Applet will display the location of the visits for
              the selected dayObs range, based on what is calculated from the
              Schedview and Scheduler simulations teams.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        {mapLoading ? (
          <Skeleton className="w-full h-full bg-stone-900 rounded-md" />
        ) : (
          <div className="flex flex-col w-full px-4 space-y-4 items-center">
            {mapData && (
              <MyBokehPlot id="interactive-plot" plotData={mapData} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VisitMapApplet;
