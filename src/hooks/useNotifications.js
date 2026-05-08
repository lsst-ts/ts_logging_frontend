import { useMemo, useState } from "react";
import { createNotification, mergeNotifications } from "@/utils/notifications";

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
    const nextNotifications = mergeNotifications(notifications);

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

// Placeholder for system notices — to be wired up in a later PR
// once the authoring workflow is decided.
//
// export function useSystemNotices() {
//   const { addNotification, processedNotifications, removeNotification } = useNotifications();
//
//   useEffect(() => {
//     // fetch from /notices, populate via addNotification
//   }, []);
//
//   return { systemNotices: processedNotifications, removeNotification };
// }
