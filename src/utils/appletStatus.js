/**
 * Generalised applet status model.
 *
 * Each applet/page supplies the status of the data sources it depends on,
 * plus which of those sources are *required* for a sensible display.
 *
 * A source value is `{ ok, message? }`:
 *   - `ok: true`, no message  -> full data, no note.
 *   - `ok: true` + message    -> data present but partial (e.g. obs-status
 *     covers only part of the range): an informational note.
 *   - `ok: false`             -> could not be fetched / no data: an error.
 *     A custom `message` overrides the default "<Label> data could not be
 *     fetched." and a custom per-source message from the catalog is respected.
 *
 * `resolveAppletStatus` derives a single status from `{ sources, required,
 * loading }`:
 *   - `loading` – show a skeleton.
 *   - `error`   – at least one REQUIRED source is `ok: false`; render the
 *     error state (message in the card body, no header badge). The message
 *     lists every non-ok source.
 *   - `ready`   – render the normal content; if any source carries a note
 *     (non-ok or partial), also surface a header warning badge.
 *
 * The composed message always names every non-ok source, so a fetch error
 * is never hidden behind another source's message.
 */

import { formatDayobsStrForDisplay } from "@/utils/timeUtils";

/** Default error-state height (compact) shared by all applets. */
export const APP_ERROR_HEIGHT = "h-[100px]";

const SOURCES = {
  almanac: { label: "Almanac" },
  "obs-status": { label: "Observatory Status" },
  exposures: { label: "Exposure" },
  "time-accounting": { label: "Exposure time accounting" },
  "narrative-log": { label: "Narrative Log" },
  "dome-times": { label: "Dome" },
};

/**
 * Build the obs-status source status from availability metadata.
 *
 * @param {Object} [availability] Availability metadata for the obs-status feed.
 * @param {boolean} [fetchError] Whether the obs-status request failed.
 * @returns {{ok: boolean, message?: string}}
 */
export function buildObsStatusSource(availability, fetchError) {
  if (fetchError) {
    return {
      ok: false,
      message: "Observatory Status data could not be fetched.",
    };
  }

  const status = availability?.status;
  if (status === "none" || status === "partial") {
    const from = availability?.available_from
      ? formatDayobsStrForDisplay(String(availability.available_from))
      : "the supported dayobs range";
    return {
      ok: status === "partial",
      message: `Observatory Status data is only available from ${from}.`,
    };
  }

  return { ok: true };
}

/**
 * Format a list of problem messages into a single human-readable string.
 *
 * Fetch-failure messages ("X data could not be fetched.") are collapsed into
 * one grammatically correct sentence; any other notes are appended as
 * separate sentences.
 *
 * @param {string[]} problems Problem message strings.
 * @returns {string} The combined message (empty string when no problems).
 */
function formatProblemList(problems) {
  if (problems.length === 0) {
    return "";
  }

  // Fetch failures ("X data could not be fetched.") collapse into a single
  // grammatically correct list sentence, e.g. "Almanac and Observatory
  // Status data could not be fetched."
  const failures = problems.filter((p) =>
    / data could not be fetched\.?$/.test(p),
  );
  let out = "";
  if (failures.length > 0) {
    const names = failures.map((p) =>
      p.replace(/ data could not be fetched\.?$/, ""),
    );
    const list =
      names.length > 2
        ? `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`
        : names.join(" and ");
    out = `${list} data could not be fetched.`;
  }

  // Any remaining notes (the obs-status availability message) are appended
  // as separate sentences, so a mixed message reads "Almanac data could not
  // be fetched. Observatory Status data is only available from ..." rather
  // than the awkward "Almanac data could not be fetched. and ...".
  const notes = problems.filter(
    (p) => !/ data could not be fetched\.?$/.test(p),
  );
  return [out, ...notes].filter(Boolean).join(" ");
}

/**
 * Resolve an applet's status from its source statuses.
 *
 * @param {Object} args
 * @param {Object} [args.sources] Map of source key -> `{ ok, message }`.
 * @param {string[]} [args.required] Source keys required for a sensible display.
 * @param {boolean} [args.loading] Whether the applet's data is still loading.
 * @returns {{status: "loading"|"error"|"ready", message: string}}
 */
export function resolveAppletStatus({
  sources = {},
  required = [],
  loading = false,
}) {
  if (loading) {
    return { status: "loading", message: "" };
  }

  const problems = [];
  let anyRequiredMissing = false;

  for (const [key, value] of Object.entries(sources)) {
    const ok = value?.ok !== false;

    if (ok && !value?.message) {
      continue;
    }

    const def = SOURCES[key] ?? { label: key };

    if (!ok) {
      if (required.includes(key)) {
        anyRequiredMissing = true;
      }
    }

    const text =
      value?.message ??
      def.unavailable ??
      `${def.label} data could not be fetched.`;
    problems.push(text);
  }

  return {
    status: anyRequiredMissing ? "error" : "ready",
    message: formatProblemList(problems),
  };
}

/**
 * Shared status for the Observatory Status timeline, used by both the Time
 * Accounting applet and the Context Feed page so they produce identical
 * error/warning messages. Observatory Status is required to draw the
 * timeline; Almanac is not, so a missing Almanac is a warning rather than
 * an error.
 *
 * @param {Object} args
 * @param {Object} [args.availability] Availability metadata for the obs-status feed.
 * @param {boolean} [args.fetchError] Whether the obs-status request failed.
 * @param {boolean} [args.almanacFetchError] Whether the Almanac request failed.
 * @param {boolean} [args.loading] Whether the data is still loading.
 * @returns {{status: "loading"|"error"|"ready", message: string}}
 */
export function resolveObsStatusTimeline({
  availability,
  fetchError,
  almanacFetchError,
  loading = false,
}) {
  return resolveAppletStatus({
    loading,
    sources: {
      "obs-status": buildObsStatusSource(availability, fetchError),
      almanac: { ok: !almanacFetchError },
    },
    required: ["obs-status"],
  });
}
