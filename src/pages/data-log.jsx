import React from "react";
import { useSearch } from "@tanstack/react-router";

function DataLog({ loading = false }) {
  const { startDayobs, endDayobs, instrument } = useSearch({
    from: "__root__",
  });

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
            Nights Observed: {startDayobs} - {endDayobs}
            <br />
            Instrument: {instrument}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataLog;
