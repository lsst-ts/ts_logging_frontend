import { DateTime } from "luxon";

export const NOTIFICATION_ORDER = [
  "maintenance",
  "noData",
  "error",
  "systemicError",
];

export const ERROR_CONSOLIDATION_THRESHOLD = 1;

const makeNotificationId = ({ id, source }) =>
  id ||
  `${source ?? "notification"}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

export const createNotification = ({
  id,
  type,
  source,
  title,
  description,
  meta,
  timestamp,
}) => {
  const time = timestamp ?? DateTime.utc().toFormat("yyyy-MM-dd HH:mm");
  const normalizedSource = source ?? "unknown";
  const defaultMeta =
    type === "error" ? `${normalizedSource} - ${time} UTC` : `${time} UTC`;

  return {
    id: makeNotificationId({ id, source: normalizedSource }),
    type,
    source: normalizedSource,
    title,
    description,
    meta: meta ?? defaultMeta,
    timestamp: time,
  };
};

export const sortNotifications = (notifications) => {
  const orderMap = Object.fromEntries(
    NOTIFICATION_ORDER.map((type, index) => [type, index]),
  );
  return [...notifications].sort((a, b) => {
    const aOrder = orderMap[a.type] ?? NOTIFICATION_ORDER.length;
    const bOrder = orderMap[b.type] ?? NOTIFICATION_ORDER.length;
    return aOrder - bOrder;
  });
};

export const consolidateNotifications = (notifications) => {
  const errorNotifications = notifications.filter((n) => n.type === "error");
  if (errorNotifications.length <= ERROR_CONSOLIDATION_THRESHOLD) {
    return notifications;
  }

  const failedSources = errorNotifications.map((n) => n.source);
  const systemicNotification = createNotification({
    type: "systemicError",
    source: "systemic",
    title: "Several data sources are unavailable",
    description: `${errorNotifications.length} sources failed to respond. Data may be incomplete.`,
    meta: failedSources.join(" . "),
  });

  return notifications
    .filter((n) => n.type !== "error")
    .concat(systemicNotification);
};
