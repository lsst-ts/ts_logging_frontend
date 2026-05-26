import { useEffect } from "react";
import { useHostConfig } from "@/contexts/HostConfigContext";
import { useNotifications } from "@/hooks/useNotifications";
import { DateTime } from "luxon";

export default function RetentionBanner() {
  const { host, getAvailableDayObsRange, retentionDays } = useHostConfig();
  const { addNotification } = useNotifications();

  const dayObsRange = getAvailableDayObsRange();

  useEffect(() => {
    if (!retentionDays) return;

    addNotification({
      type: "systemNotice",
      source: "retention-policy",
      title: `${host} data is only retained for ${retentionDays} days`,
      description: `Currently available dayobs data: ${dayObsRange.min} - ${dayObsRange.max}.`,
      dismissible: false,
    });
  }, [addNotification, dayObsRange.min, dayObsRange.max, host, retentionDays]);

  return null;
}
