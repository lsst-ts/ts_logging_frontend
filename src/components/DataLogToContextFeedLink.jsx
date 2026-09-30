import { getContextFeedUrl, formatCellValue } from "@/utils/utils";

const telescopePrefixes = {
  MC: "Simonyi",
  AT: "AuxTel",
};

export default function DataLogToContextFeedLink({
  exposureId,
  dayObs,
  obsStartTime,
  exposureName,
  windowSeconds = 60,
}) {
  if (!exposureId) return formatCellValue(exposureId);

  const telescope = exposureName
    ? telescopePrefixes[exposureName.slice(0, 2)] ?? ""
    : "";

  const url = getContextFeedUrl(telescope, dayObs, obsStartTime, windowSeconds);
  if (!url) return formatCellValue(exposureId);

  return (
    <div className="p-1 rounded">
      <a
        href={url}
        target="_self"
        rel="noopener noreferrer"
        className="text-sky-500 underline hover:text-sky-300"
      >
        {exposureId}
      </a>
    </div>
  );
}
