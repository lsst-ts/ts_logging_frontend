import { createContext, useContext, useMemo, useState } from "react";
import { createNotification, mergeErrorNotifications } from "@/utils/utils";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    setNotifications((prev) => {
      const duplicate = prev.some(
        (existing) =>
          existing.source && existing.source === notification.source,
      );
      if (duplicate) {
        return prev;
      }
      return [...prev, createNotification(notification)];
    });
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const processedNotifications = useMemo(
    () => mergeErrorNotifications(notifications),
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      processedNotifications,
      addNotification,
      removeNotification,
      clearNotifications,
    }),
    [notifications, processedNotifications],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return ctx;
}
