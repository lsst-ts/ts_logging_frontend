import { useEffect, useState, useMemo } from "react";

import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";

import { TELESCOPES } from "@/components/parameters";

import BokehPlot from "@/components/BokehPlot";

import { fetchVisitMaps } from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr, getNightSummaryLink } from "@/utils/utils";

function VisitMaps() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/visit-maps",
  });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  const [interactiveMap, setInteractiveMap] = useState(null);
  const [visitMapsLoading, setVisitMapsLoading] = useState(false);

  function getDayObsBetween(startDayObs, endDayObs) {
    const format = "yyyyLLdd";
    const dates = [];

    let currentDate = getDatetimeFromDayobsStr(startDayObs.toString());
    const endDate = getDatetimeFromDayobsStr(endDayObs.toString());

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
        {/* Interactive Visit Maps */}
        <div className="mt-8 mb-8 text-white font-thin text-center">
          <h1 className="flex flex-row gap-2 text-white text-5xl uppercase justify-center pb-8">
            <span className="tracking-[2px] font-extralight">Visit</span>
            <span className="font-extrabold"> Maps</span>
          </h1>
          <div className="w-full pb-8">
            <div className="prose max-w-none text-natural-200 text-left">
              <p>
                These plots show the visits collected during the night in two
                different representations, modeled after physical observing
                tools.
              </p>
              <ul className="list-disc pl-6">
                <li>
                  <strong>Armillary sphere</strong> (left): a model of the
                  celestial sphere, with the Earth at its center, and the sky
                  projected onto it.
                </li>
                <li>
                  <strong>Planisphere</strong> (right): a flat representation of
                  the sky, as seen from a specific location on Earth at a
                  specific time.
                </li>
              </ul>
              <p>
                Both plots show the footprints of camera pointings taken up to
                the time set by the MJD slider, with the most recent three
                pointings outlined in{" "}
                <span className="text-cyan-500 font-normal">cyan</span>. The
                fill colors are set according to the{" "}
                <a
                  className="text-blue-600 font-normal underline"
                  href="https://rtn-045.lsst.io/"
                  target="_blank"
                >
                  RTN-45
                </a>
                :
              </p>
              <div className="flex flex-wrap justify-center gap-4 items-center pt-4">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-u"></span>
                  <span>u band</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-g"></span>
                  <span>g band</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-r"></span>
                  <span>r band</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-i"></span>
                  <span>i band</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-z"></span>
                  <span>z band</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-band-y"></span>
                  <span>y band</span>
                </div>
              </div>
              <p className="mt-4">
                Both plots have the following additional annotations:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  The gray background shows the planned final depth of the LSST
                  survey.
                </li>
                <li>
                  The{" "}
                  <span className="text-orange-500 font-normal">
                    orange disk
                  </span>{" "}
                  shows the coordinates of the moon.
                </li>
                <li>
                  The{" "}
                  <span className="text-yellow-400 font-normal">
                    yellow disk
                  </span>{" "}
                  shows the coordinates of the sun.
                </li>
                <li>
                  The{" "}
                  <span className="text-green-500 font-normal">green line</span>{" "}
                  (oval) shows the ecliptic.
                </li>
                <ul className="list-disc pl-6 mt-1">
                  <li>
                    The sun moves along the ecliptic in the direction of
                    increasing R.A. (counter-clockwise in the planisphere
                    figure) such that it makes a full revolution in one year.
                  </li>
                  <li>
                    The moon moves roughly (within 5.14°) along the ecliptic in
                    the direction of increasing R.A. (counter-clockwise in the
                    planisphere figure), completing a full revolution in one
                    sidereal month (a bit over 27 days), about 14° per day.
                  </li>
                </ul>
                <li>
                  The{" "}
                  <span className="text-blue-500 font-normal">blue line</span>{" "}
                  (oval) shows the plane of the Milky Way.
                </li>
                <li>
                  The <span className="text-white font-normal">white line</span>{" "}
                  shows the horizon at the time set by the MJD slider.
                </li>
                <li>
                  The <span className="text-red-500 font-normal">red line</span>{" "}
                  shows a zenith distance of 70° (airmass = 2.9) at the time set
                  by the MJD slider.
                </li>
              </ul>
              <h3 className="text-lg font-normal mt-6 mb-2">
                Multi-night Visits
              </h3>
              <p>
                When data from several nights are loaded, all visits are plotted
                together, and the <strong>MJD slider</strong> lets you step
                through time continuously across the full dayobs range.
              </p>

              <p>As you move the slider:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>
                  Visits from earlier nights fade out while more recent ones
                  appear.
                </li>
                <li>
                  A <strong>night label</strong> below the map updates to
                  indicate the currently active night (between twilights) and
                  disappears otherwise.
                </li>
                <li>
                  The <strong>Sun and Moon positions</strong> update dynamically
                  based on the selected MJD.
                </li>
              </ul>
            </div>
          </div>
          {visitMapsLoading ? (
            <Skeleton className="w-full h-200 bg-stone-700 rounded-md" />
          ) : (
            <div className="flex flex-col w-full p-4 space-y-4 items-center">
              {interactiveMap ? (
                <BokehPlot id="interactive-plot" plotData={interactiveMap} />
              ) : (
                <div className="flex items-center justify-center font-normal w-full h-30 text-stone-400">
                  No visit map data available
                </div>
              )}
            </div>
          )}
        </div>

        {/* Link to nightsum reports */}
        <div className="my-4 text-white font-thin text-center">
          <h1 className="flex flex-row gap-2 text-white text-3xl uppercase justify-center pb-4">
            <span className="tracking-[2px] font-extralight">Survey</span>
            <span className="font-extrabold"> Progress</span>
          </h1>
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
                        className="underline text-blue-300 hover:text-blue-400"
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
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default VisitMaps;
