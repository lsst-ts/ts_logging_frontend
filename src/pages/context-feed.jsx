import { useRouter } from "@tanstack/react-router";
import React from "react";

function ContextFeed({ loading = false }) {
  const { params } = useRouter().options.context;
  const { dayobs, noOfNights, instrument } = params;

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
            Day Observed: {dayobs.toLocaleDateString()}
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

export default ContextFeed;
