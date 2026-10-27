/**
 * Display-state model shared by applets and pages.
 *
 * Each applet/page builds a map of its data sources -> `{ ok, message?, noData? }`
 * plus the sources *required* for a sensible display, then calls
 * `resolveDisplayState` to collapse them into a single render state
 * (`loading | error | noData | ready`).
 *
 * A required source that loaded but has a message (`ok: true` + `message`, no
 * `noData`) does not block the display: content still renders at `ready` and
 * its note surfaces as a header warning via the resolved message.
 *
 * See `resolveDisplayState` for the authoritative per-state semantics.
 */

import { SOURCE_METADATA } from "@/constants/DATA_SOURCES";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { formatDayobsStrForDisplay } from "@/utils/timeUtils";

/**
 * Build the obs-status source status from availability metadata.
 *
 * The obs-status source is treated specially because it is the only data
 * source that has not been available for the entire supported dayobs range.
 * We therefore check the availability metadata and, if the data is partially
 * or fully unavailable over the requested dayobs range, return a status message
 * indicating the range of available data.
 *
 * @param {Object} [availability] Availability metadata for the obs-status feed.
 * @param {boolean} [fetchError] Whether the obs-status request failed.
 * @param {number} [entriesLength] Number of obs-status entries that were
 *   actually returned; used to distinguish "data is empty" from "data is
 *   unavailable for a known reason (availability NONE)".
 * @returns {{ok: boolean, message?: string, noData?: boolean}}
 */
export function buildObsStatusSource(availability, fetchError, entriesLength) {
  if (fetchError) {
    return {
      ok: false,
      message: "Observatory Status data could not be fetched.",
    };
  }

  const status = availability?.status;
  const noData = entriesLength === 0;

  const availabilityMessage = () => {
    const from = availability?.available_from
      ? formatDayobsStrForDisplay(String(availability.available_from))
      : "the supported dayobs range";
    return `Observatory Status data is only available from ${from}.`;
  };

  if (status === OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE) {
    return {
      ok: false,
      noData: true,
      message: availabilityMessage(),
    };
  }

  if (status === OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL) {
    const message = noData
      ? `No observatory status data available. ${availabilityMessage()}`
      : availabilityMessage();
    return { ok: true, noData, message };
  }

  if (noData) {
    return {
      ok: true,
      noData: true,
      message: "No observatory status data available.",
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

  const notes = problems.filter(
    (p) => !/ data could not be fetched\.?$/.test(p),
  );
  return [out, ...notes].filter(Boolean).join(" ");
}

/**
 * Resolve an applet's/page's status from its source statuses.
 *
 * `sources` maps each data source to `{ ok, message?, noData? }` and
 * `required` lists the sources needed for a sensible display:
 *   - `ok: true`, no message  -> full data, no note.
 *   - `ok: true` + message    -> partial data (an informational note).
 *   - `ok: true` + `noData`   -> reached but empty; message comes from the
 *     source's `noDataMessage`, or an explicit `message` if given.
 *   - `ok: false`             -> could not be fetched (an error).
 *
 * Result states:
 *   - `loading` – still fetching (pass `loading: true`); shows a skeleton.
 *   - `error`   – a required source failed to fetch; message (in the card)
 *     lists every failing required source.
 *   - `noData`  – a required source was reached but has no data; an empty
 *     state is shown in the card's data region.
 *   - `ready`   – required sources are fine; any optional-source note is
 *     surfaced as a header warning via the message.
 *
 * The message for `error`/`noData` lists only required-source problems; the
 * `ready` message lists only optional-source problems. A required source
 * that loaded but has a message (`ok: true` + `message`, with no `noData`)
 * is treated as ready: content still renders and its note is surfaced as a
 * header warning.
 *
 * @param {Object} args
 * @param {Object} [args.sources] Map of source -> `{ ok, message, noData }`.
 * @param {string[]} [args.required] Sources required for a sensible display.
 * @param {boolean} [args.loading] Whether the data is still loading.
 * @returns {{state: "loading"|"error"|"noData"|"ready", message: string}}
 */
export function resolveDisplayState({
  sources = {},
  required = [],
  loading = false,
}) {
  if (loading) {
    return { state: "loading", message: "" };
  }

  const requiredProblems = [];
  const optionalProblems = [];
  // Successful required sources may still carry availability notes.
  const requiredNotes = [];
  let anyRequiredFetchError = false;
  let anyRequiredNoData = false;

  for (const [source, status] of Object.entries(sources)) {
    const ok = status?.ok === true;
    const noData = status?.noData === true;

    if (ok && !status?.message && !noData) {
      continue;
    }

    const sourceMeta = SOURCE_METADATA[source] ?? { label: source };

    const text =
      status?.message ??
      (noData ? sourceMeta.noDataMessage : undefined) ??
      `${sourceMeta.label} data could not be fetched.`;

    if (required.includes(source)) {
      if (ok && !noData) {
        requiredNotes.push(text);
      } else {
        requiredProblems.push(text);
        if (!ok) anyRequiredFetchError = true;
        if (noData) anyRequiredNoData = true;
      }
    } else {
      optionalProblems.push(text);
    }
  }

  // Fetch errors take precedence over no-data.
  let state = "ready";
  if (anyRequiredFetchError) state = "error";
  else if (anyRequiredNoData) state = "noData";

  return {
    state,
    message:
      state === "ready"
        ? formatProblemList([...optionalProblems, ...requiredNotes])
        : formatProblemList(requiredProblems),
  };
}
