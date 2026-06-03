import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

export default function VisitMapStaticApplet({ mapData, mapLoading }) {
  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Visit Map
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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 flex flex-col max-w-5xl mx-auto gap-y-2">
              <p>
                A full-sky map showing how many times each area has been
                observed over the selected dates.
              </p>
              <p>
                Declination (Dec) lines are labelled from -60° to +60° every 30°
                horizontally.
              </p>
              <p>
                Right ascension (RA) lines are labelled in degrees from 0° to
                300° every 60° vertically.
              </p>
              <p>Brighter areas have more visits.</p>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="bg-black p-4 text-neutral-700 rounded-sm border-2 border-teal-900 h-80 font-thin">
        {mapLoading ? (
          <Skeleton className="w-full h-full bg-stone-900 rounded-md" />
        ) : !mapData ? (
          <div className="flex h-full w-full items-center justify-center p-1.5 sm:p-2">
            No visit map data available
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center p-1.5 sm:p-2">
            <img
              src={mapData}
              alt="Visit Map"
              className="block h-auto max-h-full w-auto max-w-full rounded-md border-2 border-black object-contain"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
