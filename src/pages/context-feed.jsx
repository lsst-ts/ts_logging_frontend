// Standard React hooks
import { useEffect, useState } from "react";

// Libraries for the "toast" pop-up messages
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// For routing / querying
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";

// Utils
import { getDatetimeFromDayobsStr } from "@/utils/utils";
import {
  // fetchNarrativeLog,
  fetchContextFeed,
} from "@/utils/fetchUtils";

// This is the page that gets rendered
// as the Routing service's <Outlet /> in main.jsx
function ContextFeed() {
  // Get params from URL
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/context-feed",
  });

  // Our dayobs inputs are inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  // (which are exclusive of the end date).
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // // Time ranges for timeline
  // const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);
  // const [fullTimeRange, setFullTimeRange] = useState([null, null]);

  // Data "state"
  // - [variable, setting function]
  // - inside useState() is the initial values for variable
  // const [narrativeLogData, setNarrativeLogData] = useState([]);
  // const [narrativeLoading, setNarrativeLoading] = useState(true);

  // const [contextFeedData, setContextFeedData] = useState([]);
  const [contextFeedCols, setContextFeedCols] = useState([]);
  const [contextFeedLoading, setContextFeedLoading] = useState(true);

  // This runs every time one of its dependencies changes.
  // The dependencies are listed in [] after the {}
  useEffect(() => {
    // In case we need to cancel a fetch
    const abortController = new AbortController();

    // Here we will set loading state.
    // Either one loading state to wait until all sources have loaded
    // or one loading state per source.
    setContextFeedLoading(true);

    // Fetch the Context Feed data
    fetchContextFeed(startDayobs, queryEndDayobs, instrument, abortController)
      // Just collecting columns for now, until dataframe bug is sorted
      .then(([cols]) => {
        // Set the fetched cols to state.
        setContextFeedCols(cols);
        // setContextFeedData(data);

        // Log to broswer's console
        console.log("Context Feed cols: ", cols);

        // Warn if no data returned but no error
        if (data.length === 0) {
          toast.warning("No Narrative Log entries found in the date range.");
        }
      })
      .catch((err) => {
        // If the error is not caused by the fetch being aborted
        // then toast the error message.
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching narrative log!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          // If we use multiple loading states, we will set the
          // loading state to false for this source here.
        }
      });

    // If we use a global loading state for this page,
    // we will set loading to be false here.
    setContextFeedLoading(false);

    return () => {
      // Aborting the cancelled/superceded fetch happens here.
      abortController.abort();
    };
    // The dependencies for this useEffect() hook.
    // If any of these change, this hook will run.
  }, [startDayobs, endDayobs, telescope]);

  // This is where we lay out what gets displayed.
  // We return html elements, much like normal html,
  // except to pop back into React code (to do some
  // processing or conditional logic, etc.), we use { }.
  return (
    // Everything inside the return function must be
    // contained in one <div> or <>.
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">Context</span>
          <span className="font-extrabold">Feed</span>
        </h1>

        {/* Script Queue Miner notebook link */}
        <p className="font-thin text-white text-center">
          This page is under development. We are implementing a version of the{" "}
          <a
            href={`https://usdf-rsp.slac.stanford.edu/times-square/github/lsst/schedview_notebooks/nightly/EvaluateScriptQueue?day_obs_min=${startDayobs}&day_obs_max=${endDayobs}&time_order=newest+first&show_salIndex=all&show_table=true&show_timeline=false&ts_hide_code=1`}
            className="underline text-blue-300 hover:text-blue-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Script Queue Miner Notebook
          </a>
          .
        </p>
        <p className="font-thin text-white text-center">
          Please contact the Logging team if you have feature requests for this
          page.
        </p>
      </div>

      {/* Error / warning / info message pop-ups */}
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default ContextFeed;
