// Standard React hooks
import { useEffect, useState } from "react";

// Libraries for the "toast" pop-up messages
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

// For routing / querying
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";
import { Skeleton } from "@/components/ui/skeleton";

// Utils
import { fetchContextFeed } from "@/utils/fetchUtils";

// This is the page that gets rendered
// as the Routing service's <Outlet /> in main.jsx
function ContextFeed() {
  // Get params from URL
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/context-feed",
  });

  // In case we need the name of the instrument.
  const instrument = TELESCOPES[telescope];
  console.log("Instrument: ", instrument); // just to keep precommit happy

  // // Time ranges for timeline
  // const [selectedTimeRange, setSelectedTimeRange] = useState([null, null]);
  // const [fullTimeRange, setFullTimeRange] = useState([null, null]);

  // Storing and setting "state"
  // - [variable, setting function]
  // - inside useState() is the initial values for variable
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
    fetchContextFeed(startDayobs, endDayobs, abortController)
      // Just collecting columns for now, until dataframe bug is sorted
      .then(([cols]) => {
        // Set the fetched cols to state.
        setContextFeedCols(cols);
        // setContextFeedData(data);

        // Log to browser's console
        console.log("Context Feed cols: ", cols);

        // Warn if no data returned but no error
        if (cols.length === 0) {
          toast.warning("No Context Feed entries found in the date range.");
        }
      })
      .catch((err) => {
        // If the error is not caused by the fetch being aborted
        // then toast the error message.
        if (!abortController.signal.aborted) {
          const msg = err?.message;
          toast.error("Error fetching Context Feed data!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          // Stop loading
          setContextFeedLoading(false);
        }
      });

    return () => {
      // Aborting the cancelled/superceded fetch happens here.
      abortController.abort();
    };
    // The dependencies for this useEffect() hook.
    // If any of these change, this hook will run.
  }, [startDayobs, endDayobs]);

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

      {/* TESTING */}
      <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
        {contextFeedLoading ? (
          <>
            <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
            <Skeleton className="h-5 w-[90%] max-w-2xl bg-stone-700" />
          </>
        ) : (
          <>
            <p>
              Columns: {contextFeedCols} returned for Context Feed between{" "}
              {startDayobs} and {endDayobs}.
            </p>
            <div>Columns: {contextFeedCols.join(", ")}</div>
            <div className="font-thin text-white">
              <h2>Columns:</h2>
              <ul className="list-disc list-inside">
                {contextFeedCols.map((col, i) => (
                  <li key={i}>{col}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Error / warning / info message pop-ups */}
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default ContextFeed;
