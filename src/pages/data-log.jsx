import React from "react";
// import { useRouter } from "@tanstack/react-router";
import { useSearch } from "@tanstack/react-router";

function DataLog({ loading = false }) {
  // const { params } = useRouter().options.context;
  // const { dayobs, noOfNights, instrument } = params;
  const { dayObs, noOfNights, instrument } = useSearch({ from: "__root__" });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Data Log</h2>
      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div>
          <div className="text-sm text-gray-500">
            This is a placeholder for the data log.
          </div>
          <div className="text-sm text-gray-500">
            Day Observed: {dayObs}
            <br />
            Number of Nights: {noOfNights}
            <br />
            Instrument: {instrument}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataLog;
