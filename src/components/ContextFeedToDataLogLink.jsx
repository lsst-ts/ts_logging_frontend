import React from "react";
import PropTypes from "prop-types";
import { formatCellValue, getDataLogUrl } from "@/utils/utils";

/**
 * Renders a link to the datalog from the context feed
 * when it's a Simonui expousre.
 */
export default function ContextFeedToDataLogLink({
  exposureId,
  dayObs,
  obsStartTime, //in TAI milliseconds epoch
  exposureName,
  telescope = "Simonyi",
  windowSeconds = 10,
}) {
  if (!exposureId) return formatCellValue(exposureName);

  const url = getDataLogUrl({
    exposureId,
    dayObs,
    obsStartTime,
    telescope,
    windowSeconds,
  });

  return (
    <a
      href={url}
      target="_self"
      rel="noopener noreferrer"
      className="text-sky-500 underline hover:text-sky-300"
      title={`View ${telescope} exposure ${exposureId} in Data Log`}
    >
      {exposureName}
    </a>
  );
}

ContextFeedToDataLogLink.propTypes = {
  exposureId: PropTypes.string,
  dayObs: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  obsStartTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exposureName: PropTypes.string.isRequired,
  telescope: PropTypes.string,
  windowSeconds: PropTypes.number,
};
