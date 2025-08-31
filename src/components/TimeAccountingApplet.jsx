import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";
import { Skeleton } from "@/components/ui/skeleton";

function TimeAccountingApplet({
  exposuresLoading,
  almanacLoading,
  sumExpTime,
  nightHours,
}) {
  const expPercent = Math.round((sumExpTime / (nightHours * 3600)) * 100);
  const nonExpPercent = 100 - expPercent;

  return (
    <Card className="border-none p-0 bg-stone-800 gap-2">
      <CardHeader className="grid-cols-3 bg-teal-900 p-4 rounded-sm align-center gap-0">
        <CardTitle className="text-white font-thin col-span-2">
          Time Accounting
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
              Time Accounting Description.
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 h-[320px] font-thin">
        {exposuresLoading || almanacLoading ? (
          <div className="flex-grow">
            <Skeleton className="w-full h-full min-h-[180px] bg-stone-900" />
          </div>
        ) : (
          <div className="h-full w-full flex-grow min-w-0 grid grid-cols-3">
            <div className="col-span-1 flex flex-col items-center">
              {nonExpPercent > 0 && (
                <div className="text-neutral-200 font-thin">Not exposures</div>
              )}
              <div className="h-56 w-18 text-black font-bold rounded-sm py-2">
                {nonExpPercent > 0 && (
                  <div
                    className={`bg-sky-100 ${
                      nonExpPercent === 100 ? "rounded-sm" : "rounded-t-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${nonExpPercent}%` }}
                  >
                    {nonExpPercent} %
                  </div>
                )}
                {expPercent > 0 && (
                  <div
                    className={`h-4/5 bg-teal-900 ${
                      expPercent === 100 ? "rounded-sm" : "rounded-b-sm"
                    } flex items-center justify-center`}
                    style={{ height: `${expPercent}%` }}
                  >
                    {expPercent} %
                  </div>
                )}
              </div>
              {expPercent > 0 && (
                <div className="text-neutral-200 font-thin">Exposures</div>
              )}
            </div>
            <div className="col col-span-2">Hello Hellloooooooooooo</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default TimeAccountingApplet;
