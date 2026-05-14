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
import { VISIT_SHAPE, VISIT_SHAPE_INNER } from "./PLOT_DEFINITIONS";

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
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 flex flex-col max-w-5xl mx-auto gap-y-2">
              <p>
                <strong>Planisphere</strong> is a flat sky map for the observing
                site and selected time.
              </p>
              <div className="flex flex-col max-w-5xl mx-auto gap-y-1">
                <div className="flex gap-1 items-center">
                  <span className="w-3 h-3 rounded-full bg-orange-500" />
                  <span>Moon position</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-3 h-3 rounded-full bg-yellow-400" />
                  <span>Sun position</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-green-500" />
                  <span>Ecliptic</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-blue-500" />
                  <span>Milky Way Plane</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-white" />
                  <span>Horizon</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-red-500" />
                  <span>70° from zenith (airmass 2.9)</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-gray-500" />
                  <span>LSST footprint boundaries</span>
                </div>
                <div className="flex gap-1 items-center">
                  <span className="w-4 h-[4px] rounded-full bg-black border border-stone-500" />
                  <span>LSST footprint boundaries</span>
                </div>
                <div className="flex gap-1 items-center">
                  <div className="relative w-4 aspect-square shrink-0">
                    <span
                      className={`absolute inset-0 bg-fuchsia-500 ${VISIT_SHAPE}`}
                    />
                    <span
                      className={`absolute inset-[1px] bg-black ${VISIT_SHAPE_INNER}`}
                    />
                  </div>
                  <span>Most recent visits</span>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mt-1">Multi-night Data</h3>
                <ul className="list-disc list-outside ml-5 mt-2 space-y-1">
                  <li>
                    Visits accumulate during each observing night, and are
                    cleared between nights.
                  </li>
                  <li>
                    <strong>Sun</strong> and <strong>Moon</strong> positions
                    update dynamically.
                  </li>
                </ul>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-700 rounded-sm border-2 border-teal-900 h-80 font-thin">
        {mapLoading ? (
          <Skeleton className="w-full h-full bg-stone-900 rounded-md" />
        ) : (
          <div className="flex flex-col w-full px-4 space-y-4 items-center">
            {mapData ? (
              <BokehPlot id="interactive-plot" plotData={mapData} />
            ) : (
              <div className="flex items-center justify-center font-normal w-full h-full text-stone-400">
                No visit map data available
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VisitMapApplet;
