import {
  getContextFeedUrl,
  formatCellValue,
  TELESCOPE_PREFIXES,
} from "@/utils/utils";
import { taiDateTimeStrToUTCMillis } from "@/utils/timeUtils";
import PropTypes from "prop-types";

export default function DataLogToContextFeedLink({
  exposureId,
  dayObs,
  obsStartTime,
  exposureName,
  windowSeconds = 60,
  children,
}) {
  if (!exposureId) return formatCellValue(exposureId);

  const telescope = exposureName
    ? TELESCOPE_PREFIXES[exposureName.slice(0, 2)] ?? ""
    : "";

  // convert TAI ISO string directly into UTC epoch milliseconds
  const utcSelectedMillis = taiDateTimeStrToUTCMillis(obsStartTime);

  const url = getContextFeedUrl(
    telescope,
    dayObs,
    utcSelectedMillis,
    windowSeconds,
  );
  if (!url) return "X";

  return (
    <div className="p-1 rounded">
      <a
        href={url}
        target="_self"
        rel="noopener noreferrer"
        className="text-sky-500 underline hover:text-sky-300"
      >
        {children ?? "X"}
      </a>
    </div>
  );
}
