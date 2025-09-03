import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getNightSummaryLink } from "@/utils/utils";

import InfoIcon from "../assets/InfoIcon.svg";
import DownloadIcon from "../assets/DownloadIcon.svg";

function VisitMap({ endDayobs: endDayobs }) {
  // Basics from Applet before we implement this fully.
  const [requestedDayobs, setRequestedDayobs] = useState(null);

  useEffect(() => {
    // Set requested dayobs to end dayobs
    setRequestedDayobs(endDayobs);
  }, [endDayobs]);

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
              the previous observing night, based on what is calculated in the
              rubin_nights project from the Schedview and Scheduler simulations
              teams.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-80 font-thin">
        <div>
          The Visit Maps Applet will be displayed here, similar to the schedview
          reports:{" "}
          {requestedDayobs &&
            (() => {
              const { url, label } = getNightSummaryLink(requestedDayobs);
              return (
                <span key={requestedDayobs}>
                  <a
                    href={url}
                    className="underline text-blue-300 hover:text-blue-400"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                  </a>
                </span>
              );
            })()}
          . {"\n"}
          This applet is expected to be released{" "}
          <span className="font-extrabold">mid to late October</span>.
        </div>
      </CardContent>
    </Card>
  );
}

export default VisitMap;
