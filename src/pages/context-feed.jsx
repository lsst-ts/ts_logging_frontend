// import { useRouter } from "@tanstack/react-router";
import React from "react";
import { useSearch } from "@tanstack/react-router";

function ContextFeed() {
  const { startDayobs, endDayobs } = useSearch({
    from: "__root__",
  });

  return (
    <div>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page Title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">Context</span>
          <span className="font-extrabold">Feed</span>
        </h1>

        {/* Link Section */}
        <div className="text-l text-center font-thin text-white">
          This page is currently in work. Please see the{" "}
          <a
            href={`https://usdf-rsp.slac.stanford.edu/times-square/github/lsst/schedview_notebooks/nightly/EvaluateScriptQueue?day_obs_min=${startDayobs}&day_obs_max=${endDayobs}&time_order=newest+first&show_salIndex=all&show_table=true&show_timeline=false&ts_hide_code=1`}
            className="underline text-blue-300 hover:text-blue-400"
            target="_blank"
            rel="noopener noreferrer"
          >
            Script Queue Miner Notebook
          </a>
          .
          <br />
          If you have any feature requests for this page, please contact the
          logging team.
        </div>
      </div>
    </div>
  );
}

export default ContextFeed;
