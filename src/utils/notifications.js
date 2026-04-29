import { DateTime } from "luxon";

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
  const defaultMeta =
    type === "error" ? `${source} - ${time} UTC` : `${time} UTC`;

  return {
    id: makeNotificationId({ id, source }),
    type,
    source,
    title,
    description,
    meta: meta ?? defaultMeta,
    timestamp: time,
  };
};

export const mergeNotifications = (notifications) => {
  const errorNotifications = notifications.filter((n) => n.type === "error");
  const rest = notifications.filter((n) => n.type !== "error");

  if (errorNotifications.length === 0) return notifications;

  const failedSources = errorNotifications.map((n) => n.source);
  const mergedErrorNotification = createNotification({
    type: "error",
    source: "multiple",
    title: "One or more data sources are unavailable",
    description: `${errorNotifications.length} source(s) failed to respond. Data may be incomplete.`,
    meta: failedSources.join(" . "),
  });

  return [...rest, mergedErrorNotification];
};
