import { createColumnHelper } from "@tanstack/react-table";

import { formatDayobsStrForDisplay, formatHours } from "@/utils/timeUtils";

const columnHelper = createColumnHelper();

/**
 * Convert a display state label into a URL-safe selection key.
 *
 * e.g. "Fault + Downtime" -> "fault-downtime", "Dome Open" -> "dome-open".
 *
 * @param {string} value
 * @returns {string}
 */
function slugifyState(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the unique selection key for a row.
 *
 * State parent rows (the totals of all their combinations) are prefixed with
 * "total-" so they don't collide with their identically-labelled lone
 * combination child (e.g. parent "total-operational" vs child "operational").
 *
 * @param {Object} row
 * @returns {string}
 */
function getSelectionKey(row) {
  const slug = slugifyState(row?.state);
  return row?.rowType === "state" ? `total-${slug}` : slug;
}

/**
 * Render the State cell.
 *
 * State rows are parents of their combination sub-rows. An expand arrow is
 * shown on the right-hand side of the cell for rows that have children, and
 * clicking the cell toggles the sub-rows. Combination sub-rows are indented
 * beneath their parent.
 */
function renderStateCell({ row, getValue }) {
  const canExpand = row.getCanExpand();
  const isExpanded = row.getIsExpanded();
  const depth = row.depth ?? 0;

  return (
    <div
      className={
        "flex items-center justify-between gap-2" +
        (canExpand ? " cursor-pointer select-none" : "")
      }
      style={{ paddingLeft: `${depth * 1.5}rem` }}
      onClick={
        canExpand
          ? (e) => {
              e.stopPropagation();
              row.getToggleExpandedHandler()();
            }
          : undefined
      }
    >
      <span>{getValue()}</span>
      {canExpand && (
        <span
          className="text-white text-3xl flex-shrink-0 leading-none"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? "▾" : "▸"}
        </span>
      )}
    </div>
  );
}

/**
 * Build columns for the selected observing nights.
 *
 * @param {string[]} dayObsValues
 * @returns {Array<object>}
 */
export function createObservatoryStatusColumns(dayObsValues) {
  return [
    columnHelper.accessor("state", {
      id: "state",
      header: "State",
      cell: renderStateCell,
      size: 120,
      minSize: 100,
    }),

    // Hidden selection key column. Provides the URL-safe row identifier used
    // for selection without being rendered as a visible column.
    columnHelper.accessor((row) => getSelectionKey(row), {
      id: "stateKey",
      header: "",
      size: 0,
      minSize: 0,
      meta: {
        selectedKey: true,
      },
    }),

    columnHelper.accessor("total", {
      id: "total",
      header: "Total",
      cell: ({ getValue }) => formatHours(getValue(), { nullReplacement: "-" }),
      size: 120,
      minSize: 100,
      meta: {
        align: "right",
      },
    }),

    ...dayObsValues.map((dayObs) =>
      columnHelper.accessor(dayObs, {
        id: dayObs,
        header: formatDayobsStrForDisplay(dayObs),
        cell: ({ getValue }) => formatHours(getValue(), { nullReplacement: "-" }),
        size: 120,
        minSize: 100,
        meta: {
          align: "right",
        },
      }),
    ),
  ];
}

/**
 * Build the default column visibility for the breakdown table.
 *
 * The hidden `stateKey` column is used for row selection and is always
 * hidden by default; every other column starts visible.
 *
 * @param {string[]} dayObsValues Day-obs column ids.
 * @returns {Record<string, boolean>} Column id -> visibility.
 */
export function getObservatoryStatusDefaultColumnVisibility(dayObsValues) {
  return Object.fromEntries([
    ["state", true],
    ["stateKey", false],
    ["total", true],
    ...dayObsValues.map((dayObs) => [dayObs, true]),
  ]);
}

/**
 * Build the default column order for the breakdown table.
 *
 * State first, then Total, then one column per observing night.
 *
 * @param {string[]} dayObsValues Day-obs column ids.
 * @returns {string[]} Column ids in display order.
 */
export function getObservatoryStatusDefaultColumnOrder(dayObsValues) {
  return ["state", "total", ...dayObsValues];
}
