import { useEffect, useState, useMemo } from "react";

import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

import { TELESCOPES } from "@/components/Parameters";
import PageHeader from "@/components/PageHeader";
import TipsCard from "@/components/TipsCard";
import DownloadIcon from "../assets/DownloadIcon.svg";
import { VISIT_SHAPE, VISIT_SHAPE_INNER } from "@/components/PLOT_DEFINITIONS";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

import BokehPlot from "@/components/BokehPlot";

import { fetchVisitMaps } from "@/utils/fetchUtils";
import { getNightSummaryLink } from "@/utils/utils";
import { getDayobsStartUTC } from "@/utils/timeUtils";

function VisitMaps() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/visit-maps",
  });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDayobsStartUTC(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  const [interactiveMap, setInteractiveMap] = useState(null);
  const [visitMapsLoading, setVisitMapsLoading] = useState(false);
  const [guideVisible, setGuideVisible] = useState(false);

  function getDayObsBetween(startDayObs, endDayObs) {
    const format = "yyyyLLdd";
    const dates = [];

    let currentDate = getDayobsStartUTC(startDayObs.toString());
    const endDate = getDayobsStartUTC(endDayObs.toString());

    while (currentDate <= endDate) {
      dates.push(currentDate.toFormat(format));
      currentDate = currentDate.plus({ days: 1 });
    }
    return dates;
  }

  const availableDayobs = useMemo(() => {
    const dayobsDates = getDayObsBetween(startDayobs, endDayobs);
    return dayobsDates;
  }, [startDayobs, endDayobs]);

  useEffect(() => {
    const abortController = new AbortController();

    setVisitMapsLoading(true);
    setInteractiveMap(null);

    fetchVisitMaps(startDayobs, queryEndDayobs, instrument, abortController)
      .then((interactivePlot) => {
        setInteractiveMap(interactivePlot);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          toast.error("Error fetching visit maps!", {
            description: err?.message,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setVisitMapsLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page Header, legend and collapsible guide */}
        <div className="flex flex-col gap-2">
          {/* Page title + buttons */}
          <PageHeader
            title="Visit Maps"
            description="Interactive sky-maps of visits collected during the night."
            actions={
              <>
                <Popover>
                  <PopoverTrigger className="min-w-4 cursor-pointer">
                    <img src={DownloadIcon} />
                  </PopoverTrigger>
                  <PopoverContent className="bg-black text-white text-sm border-yellow-700">
                    This is a placeholder for the download/export button. Once
                    implemented, clicking here will download the data shown in
                    the table to a .csv file.
                  </PopoverContent>
                </Popover>
                {/* Button to toggle guide visibility */}
                <Button
                  onClick={() => setGuideVisible((prev) => !prev)}
                  className="bg-amber-400 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-amber-300 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
                >
                  {guideVisible ? "Hide Guide" : "Show Guide"}
                </Button>
              </>
            }
          />

          {/* Map Guide */}
          {guideVisible && (
            <TipsCard title="Guide">
              <div className="flex flex-col gap-6 text-left">
                {/* Maps */}
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    Understanding the Maps
                  </h3>
                  <p>
                    These maps show the visits collected during the night in two
                    different sky representations.
                  </p>
                  <ul className="list-disc list-outside ml-5 my-3 space-y-1">
                    <li>
                      <strong>Armillary Sphere</strong> (left): a spherical
                      model of the sky centered on Earth.
                    </li>
                    <li>
                      <strong>Planisphere</strong> (right): a flat sky map for
                      the observing site and selected time.
                    </li>
                  </ul>
                  <p>
                    Each footprint represents a camera pointing and is coloured
                    by band according to{" "}
                    <a
                      className="font-normal underline text-blue-500 hover:text-blue-400"
                      href="https://rtn-095.lsst.io/"
                      target="_blank"
                    >
                      RTN-95
                    </a>
                    :
                  </p>
                </div>

                {/* Multi-night */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Multi-night Data</h3>
                  <ul className="list-disc list-outside ml-5 mt-3 space-y-1">
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

                {/* Controls */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Controls</h3>
                  <p>
                    Use the <strong>UTC date/time slider</strong> to step
                    through observations continuously.
                  </p>
                  <ul className="list-disc list-outside ml-5 my-3 space-y-1">
                    <li>
                      <span className="bg-stone-200 font-medium py-1 px-2 rounded text-stone-800">
                        Center zenith
                      </span>{" "}
                      re-centres the map on the current zenith.
                    </li>
                    <li>
                      The coordinate toggle switches sliders between{" "}
                      <strong>R.A./Dec</strong> and <strong>Alt/Az</strong>.
                    </li>
                    <li>
                      The{" "}
                      <span className="bg-blue-400 font-medium py-1 px-2 rounded">
                        Play
                      </span>{" "}
                      button animates the sliders automatically through time.
                    </li>
                  </ul>
                </div>
              </div>
            </TipsCard>
          )}

          {/* Legend */}
          <Card className="grid gap-4 bg-black p-8 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
            <div className="space-y-6 text-left">
              <h3 className="text-lg font-medium">Map Legend</h3>
              {/* Plot objects */}
              <div>
                <div className="grid grid-flow-col max-w-5xl mx-auto grid-rows-9 sm:grid-rows-5 md:grid-rows-5 lg:grid-rows-3 xl:grid-rows-2 gap-x-6 gap-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-orange-500" />
                    <span>Moon position</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full bg-yellow-400" />
                    <span>Sun position</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-green-500" />
                    <span>Ecliptic*</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-blue-500" />
                    <span>Milky Way plane</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-white" />
                    <span>Horizon</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-red-500" />
                    <span>70° from zenith (airmass 2.9)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-gray-500" />
                    <span>LSST footprint boundaries</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-[6px] rounded-full bg-black border border-stone-500" />
                    <span>LSST footprint boundaries</span>
                  </div>
                  <div className="flex items-center gap-3">
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

                <p className="mt-4 text-sm">
                  * More details about the movements of the sun and moon along
                  the ecliptic can be found in the night summaries (link at page
                  bottom).
                </p>
              </div>

              {/* Band colours */}
              <div className="flex flex-row h-10 w-fit px-4 mx-auto justify-between items-center gap-4 border border-white rounded-md text-white font-thin">
                <div>Bands:</div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-u ${VISIT_SHAPE}`} />
                  <span>u</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-g ${VISIT_SHAPE}`} />
                  <span>g</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-r ${VISIT_SHAPE}`} />
                  <span>r</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-i ${VISIT_SHAPE}`} />
                  <span>i</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-z ${VISIT_SHAPE}`} />
                  <span>z</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-4 h-4 bg-band-y ${VISIT_SHAPE}`} />
                  <span>y</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Interactive Visit Maps */}
        {visitMapsLoading ? (
          <Skeleton className="w-full h-100 bg-stone-700 rounded-md" />
        ) : (
          <div className="flex flex-col w-full p-4 space-y-4 items-center text-neutral-700">
            {interactiveMap ? (
              <BokehPlot id="interactive-plot" plotData={interactiveMap} />
            ) : (
              <div className="flex items-center justify-center font-normal w-full h-30 text-stone-400">
                No visit map data available
              </div>
            )}
          </div>
        )}

        {/* Link to nightsum reports */}
        <div className="flex flex-col gap-2">
          <PageHeader
            title="Survey Progress Reports"
            description="Scheduler-oriented night summaries."
          />
          <Card className="grid gap-4 bg-black p-8 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin shadow-stone-900 shadow-md">
            <div className="font-thin text-left">
              {availableDayobs.length === 0 ? (
                <p>No available dayobs for survey progress links.</p>
              ) : (
                <>
                  <p>
                    For survey progress, visit the Scheduler-oriented night
                    summaries:{" "}
                    {availableDayobs.map((dayobs, idx) => {
                      const { url, label } = getNightSummaryLink(dayobs);
                      return (
                        <span key={dayobs}>
                          <a
                            href={url}
                            className="underline font-normal text-blue-500 hover:text-blue-400"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {label}
                          </a>
                          {idx < availableDayobs.length - 1 && ", "}
                        </span>
                      );
                    })}
                    .
                  </p>
                  <p className="pt-2">
                    <span className="font-medium">Note: </span>If you see a 404
                    error, the summary might not have been created for that day.
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default VisitMaps;
