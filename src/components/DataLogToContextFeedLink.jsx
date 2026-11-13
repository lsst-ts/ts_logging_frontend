import { getContextFeedUrl, TELESCOPE_PREFIXES } from "@/utils/utils";
import { taiDateTimeStrToUTCMillis } from "@/utils/timeUtils";
import PropTypes from "prop-types";

// Returns the data log to context feed link or "X" if something happens
export default function DataLogToContextFeedLink({
  exposureId,
  dayObs,
  obsStartTime,
  exposureName,
  windowSeconds = 60,
  children,
}) {
  if (!exposureId) return "na";

  const telescope = exposureName
    ? TELESCOPE_PREFIXES[exposureName.slice(0, 2)] ?? ""
    : "";
  if (!telescope) return "na";

  // convert TAI ISO string directly into UTC epoch milliseconds
  const utcSelectedMillis = taiDateTimeStrToUTCMillis(obsStartTime);

  const url = getContextFeedUrl(
    telescope,
    dayObs,
    utcSelectedMillis,
    windowSeconds,
  );

  if (!url) return "na";

  return (
    <div className="p-1 rounded">
      <a
        href={url}
        target="_self"
        rel="noopener noreferrer"
        className="text-sky-500 underline hover:text-sky-300"
      >
        {children ?? "na"}
      </a>
    </div>
  );
}
