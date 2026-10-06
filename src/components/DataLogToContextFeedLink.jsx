import {
  getContextFeedUrl,
  formatCellValue,
  TELESCOPE_PREFIXES,
} from "@/utils/utils";
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

  const url = getContextFeedUrl(telescope, dayObs, obsStartTime, windowSeconds);
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

DataLogToContextFeedLink.propTypes = {
  exposureId: PropTypes.string,
  dayObs: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  obsStartTime: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exposureName: PropTypes.string,
  windowSeconds: PropTypes.number,
  children: PropTypes.node,
};
