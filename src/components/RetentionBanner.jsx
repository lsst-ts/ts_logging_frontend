import { useHostConfig } from "@/contexts/HostConfigContext";

export default function RetentionBanner() {
  const { host, getFormattedRange, retentionDays, hasRetention } =
    useHostConfig();
  if (!hasRetention) return null;
  const formattedRange = getFormattedRange();

  return (
    <div className="bg-stone-800 px-8 pt-3 text-center">
      <div className="bg-sky-750 h-10 flex items-center justify-center px-4 rounded-sm text-white font-medium">
        {host} data is only retained for {retentionDays} days. Currently
        available dayobs data: {formattedRange.startDayObs} -{" "}
        {formattedRange.endDayObs}
      </div>
    </div>
  );
}
