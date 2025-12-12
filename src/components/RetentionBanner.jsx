import { DateTime } from "luxon";
import { useRetentionConfig } from "@/contexts/RetentionConfigContext";

export default function RetentionBanner() {
  const { host, retentionDays } = useRetentionConfig();

  if (!retentionDays) return null;

  const todayDayObs = DateTime.utc().minus({ hours: 12 });
  const maxDayObs = todayDayObs.toFormat("yyyy-LL-dd");
  const minDayObs = todayDayObs
    .minus({ days: retentionDays })
    .toFormat("yyyy-LL-dd");

  return (
    <div className="bg-stone-800 px-8 pt-3 text-center">
      <div className="bg-sky-750 h-10 flex items-center justify-center px-4 rounded-sm text-white font-medium">
        {host} data is only retained for {retentionDays} days. Currently
        available dayobs data: {minDayObs} to {maxDayObs}.
      </div>
    </div>
  );
}
