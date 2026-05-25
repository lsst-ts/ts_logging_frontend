// import { DateTime } from "luxon";

// // const makeNotificationId = ({ id, source }) =>
// //   id ||
// //   `${source ?? "notification"}-${Date.now()}-${Math.random()
// //     .toString(36)
// //     .slice(2, 8)}`;

// export const createNotification = ({
//   // id,
//   type,
//   source,
//   title,
//   description,
//   meta,
//   timestamp,
// }) => {
//   const time = timestamp ?? DateTime.utc().toFormat("yyyy-MM-dd HH:mm");
//   const defaultMeta = `${time} UTC`;

//   return {
//     id: `${source ?? "notification"}-${Math.random()}`,
//     type,
//     source,
//     title,
//     description,
//     meta: meta ?? defaultMeta,
//     timestamp: time,
//   };
// };

// /**
//  * Merges multiple error notifications into a single notification with combined metadata.
//  * while keeping non-error notifications as they are.
//  *
//  * @param {Array} notifications - The list of notifications to process.
//  * @returns {Array} A new list of notifications with error notifications merged.
//  */
// export const mergeErrorNotifications = (notifications) => {
//   const errorNotifications = notifications.filter((n) => n.type === "error");
//   const rest = notifications.filter((n) => n.type !== "error");
//   // console.log("Merging notifications:", { errorNotifications, rest });
//   if (errorNotifications.length === 0) return notifications;

//   const failedSources = errorNotifications.map((n) => n.source);
//   const mergedErrorNotification = createNotification({
//     type: "error",
//     source: "multiple",
//     title: "One or more data sources are unavailable.",
//     description: `${failedSources.join(", ")} failed to load. Data may be incomplete.`,
//     // meta: failedSources.join(" . "),
//   });

//   return [...rest, mergedErrorNotification];
// };
