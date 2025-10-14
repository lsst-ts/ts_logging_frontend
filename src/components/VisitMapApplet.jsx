import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import BokehPlot from "@/components/BokehPlot";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function VisitMapApplet({ mapData, mapLoading }) {
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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              <p>
                <strong>Planisphere</strong> is a flat representation of the
                sky, as seen from a specific location on Earth at a specific
                time.
              </p>
              <ul class="list-disc pl-6 space-y-1">
                <li>
                  The gray background shows the planned final depth of the LSST
                  survey.
                </li>
                <li>
                  The{" "}
                  <span class="text-orange-500 font-semibold">orange disk</span>
                  : the coordinates of the moon.
                </li>
                <li>
                  The{" "}
                  <span class="text-yellow-400 font-semibold">yellow disk</span>
                  : the coordinates of the sun.
                </li>
                <li>
                  The{" "}
                  <span class="text-green-500 font-semibold">green line</span>{" "}
                  (oval): the ecliptic.
                </li>
                <li>
                  The <span class="text-blue-500 font-semibold">blue line</span>{" "}
                  (oval): the plane of the Milky Way.
                </li>
                <li>
                  The <span class="text-white font-semibold">white line</span>:
                  The horizon at the time set by the MJD slider.
                </li>
                <li>
                  The <span class="text-red-500 font-semibold">red line</span>:
                  a zenith distance of 70° (airmass = 2.9) at the time set by
                  the MJD slider.
                </li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        {mapLoading ? (
          <Skeleton className="w-full h-full bg-stone-900 rounded-md" />
        ) : (
          <div className="flex flex-col w-full px-4 space-y-4 items-center">
            {mapData && <BokehPlot id="interactive-plot" plotData={mapData} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VisitMapApplet;
