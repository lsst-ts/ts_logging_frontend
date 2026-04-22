import { useMemo, useState } from "react";
import {
  createNotification,
  consolidateNotifications,
  sortNotifications,
} from "@/utils/notifications";

export function useNotifications({ consolidateErrors = true } = {}) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    setNotifications((prev) => [...prev, createNotification(notification)]);
  };

  const removeNotification = (id) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id),
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const processedNotifications = useMemo(() => {
    const nextNotifications = consolidateErrors
      ? consolidateNotifications(notifications)
      : notifications;

    return sortNotifications(nextNotifications);
  }, [notifications, consolidateErrors]);

  return {
    notifications,
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}
