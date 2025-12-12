import { createContext, useContext } from "react";

const RetentionConfigContext = createContext(null);

export const useRetentionConfig = () => {
  const ctx = useContext(RetentionConfigContext);
  if (!ctx) {
    throw new Error(
      "useRetentionConfig must be used within a RetentionConfigProvider",
    );
  }
  return ctx;
};

export function RetentionConfigProvider({ children }) {
  const host = window.location.hostname;

  const retentionDays = host.includes("summit")
    ? 30
    : host.includes("tuscon") || host.includes("base")
      ? 7
      : 60;

  const value = { host, retentionDays };

  return (
    <RetentionConfigContext.Provider value={value}>
      {children}
    </RetentionConfigContext.Provider>
  );
}
