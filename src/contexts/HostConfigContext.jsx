import { createContext, useContext, useMemo } from "react";
import {
  getRetentionPolicy,
  isDateInRetentionRange,
  getFormattedDateRange,
  getAvailableDayObsRange,
} from "@/utils/retentionPolicyUtils";

const HostConfigContext = createContext(null);

export function HostConfigProvider({ children }) {
  const { host, retentionDays } = useMemo(() => getRetentionPolicy(), []);

  const value = useMemo(
    () => ({
      host,
      retentionDays,
      getAvailableDayObsRange,
      hasRetention: retentionDays !== null,
      isDateInRetentionRange,
      getFormattedDateRange,
    }),
    [host, retentionDays],
  );

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
