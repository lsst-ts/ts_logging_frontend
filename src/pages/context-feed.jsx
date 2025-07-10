// import { useRouter } from "@tanstack/react-router";
import React from "react";
import { useSearch } from "@tanstack/react-router";
import { TELESCOPES } from "@/components/parameters";
import { getDatetimeFromDayobsStr } from "@/utils/utils";

function ContextFeed({ loading = false }) {
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Context Feed</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div>
          <div className="text-sm text-gray-500">
            This is a placeholder for the ContextFeed
          </div>
          <div className="text-sm text-gray-500">
            Nights Observed: {startDayobs} - {endDayobs}
            <br />
            Query: {startDayobs} - {queryEndDayobs}
            <br />
            Instrument: {instrument}
            <br />
            Telescope: {telescope}
          </div>
        </div>
      )}
    </div>
  );
}

export default ContextFeed;
