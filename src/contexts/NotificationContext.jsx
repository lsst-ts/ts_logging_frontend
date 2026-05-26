import { createContext, useContext, useMemo, useState } from "react";
import { DateTime } from "luxon";

/**
 * Creates a notification object with a unique ID, type, source, title, description, metadata, and timestamp.
 *
 * @param {string} params.type - The type of notification (e.g., "error", "info").
 * @param {string} [params.source] - The source of the notification (e.g., "zephyr", "jira").
 * @param {string} params.title - The title of the notification.
 * @param {string} params.description - The description or details of the notification.
 * @param {string} [params.meta] - Additional metadata for the notification (e.g., timestamp).
 * @param {string} [params.timestamp] - An optional timestamp for the notification; if not provided, current UTC time is used.
 * @returns {Object} The created notification object.
 */
const createNotification = ({
  type,
  source,
  title,
  description,
  meta,
  timestamp,
  dismissible,
}) => {
  const time = timestamp ?? DateTime.utc().toFormat("yyyy-MM-dd HH:mm");
  const defaultMeta = `${time} UTC`;

  return {
    id: `${source ?? "notification"}-${Math.random()}`,
    type,
    source,
    title,
    description,
    meta: meta ?? defaultMeta,
    timestamp: time,
    dismissible,
  };
};

/**
 * Merges multiple error notifications into a single notification with combined metadata.
 * while keeping non-error notifications as they are.
 *
 * @param {Array} notifications - The list of notifications to process.
 * @returns {Array} A new list of notifications with error notifications merged.
 */
const mergeErrorNotifications = (notifications) => {
  const errorNotifications = notifications.filter((n) => n.type === "error");
  const rest = notifications.filter((n) => n.type !== "error");
  if (errorNotifications.length === 0) return notifications;

  const failedSources = errorNotifications.map((n) => n.source);
  const mergedErrorNotification = createNotification({
    type: "error",
    source: "multiple",
    title: "One or more data sources are unavailable.",
    description: `${failedSources.join(
      ", ",
    )} failed to load. Data may be incomplete.`,
  });

  return [...rest, mergedErrorNotification];
};

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
