import { resolveAppletStatus } from "@/utils/appletStatus";

/**
 * Resolve an applet's display status from the status of its data sources.
 *
 * @param {Object} args
 * @param {Object} [args.sources] Map of source key -> `{ ok, partial }`.
 * @param {string[]} [args.required] Source keys required for a sensible display.
 * @param {boolean} [args.loading] Whether the applet's data is still loading.
 * @returns {{status: "loading"|"error"|"ready", message: string}}
 */
export function useAppletStatus({ sources, required, loading }) {
  return resolveAppletStatus({ sources, required, loading });
}
