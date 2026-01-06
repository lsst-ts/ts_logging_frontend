import { createContext, useContext, useMemo, useCallback } from "react";
import { DateTime } from "luxon";

const HostConfigContext = createContext(null);

export const getRetentionPolicy = () => {
  const host = window.location.hostname;

  const retentionDays = host.includes("summit")
    ? 30
    : host.includes("tuscon") || host.includes("base")
      ? 7
      : null; // TODO: keep it null for localhost/dev/usdf?
  return { host, retentionDays };
};

export function HostConfigProvider({ children }) {
  const { host, retentionDays } = useMemo(() => getRetentionPolicy(), []);

  const getAvailableDayObsRange = useCallback(() => {
    const maxDayObs = DateTime.utc().minus({ hours: 12 });
    if (retentionDays === null) {
      return { min: null, max: maxDayObs, hasRestriction: false };
    }
    // const maxDayObs = DateTime.utc().minus({ hours: 12 });
    const minDayObs = maxDayObs.minus({ days: retentionDays });
    return {
      min: minDayObs,
      max: maxDayObs,
      hasRestriction: true,
      retentionDays: retentionDays,
    };
  }, [retentionDays]);

  // Check if a dayobs (yyyyMMdd integer) is within available range
  const isDateInRange = useCallback(
    (dayobsInt) => {
      const range = getAvailableDayObsRange();
      if (!range.hasRestriction) return true;

      const dateStr = dayobsInt.toString();
      const date = DateTime.fromFormat(dateStr, "yyyyMMdd");

      return date >= range.min && date <= range.max;
    },
    [getAvailableDayObsRange],
  );

  // Format range for display
  const getFormattedRange = useCallback(() => {
    const range = getAvailableDayObsRange();

    if (!range.hasRestriction) return null;
    return {
      startDayObs: range.min.toFormat("yyyyMMdd"),
      endDayObs: range.max.toFormat("yyyyMMdd"),
    };
  }, [getAvailableDayObsRange]);

  const value = {
    host,
    retentionDays,
    getAvailableDayObsRange,
    hasRetention: retentionDays !== null,
    isDateInRange,
    getFormattedRange,
  };

  return (
    <HostConfigContext.Provider value={value}>
      {children}
    </HostConfigContext.Provider>
  );
}

export function useHostConfig() {
  const ctx = useContext(HostConfigContext);
  if (!ctx) {
    throw new Error("useHostConfig must be used within a HostConfigProvider");
  }
  return ctx;
}
