import { useMemo, useState } from "react";
import { createNotification, mergeErrorNotifications } from "@/utils/utils";

export function useNotifications() {
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
    const nextNotifications = mergeErrorNotifications(notifications);

    return nextNotifications;
  }, [notifications]);

  return {
    notifications,
    processedNotifications,
    addNotification,
    removeNotification,
    clearNotifications,
  };
}
