import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

import { formatHours, formatDayobsStrForDisplay } from "@/utils/timeUtils";
import { filterToActiveStates } from "@/utils/obsStatusBreakdownUtils";

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
 * @param {object} row
 * @returns {string}
 */
function getSelectionKey(row) {
  const slug = slugifyState(row?.state);
  return row?.rowType === "state" ? `total-${slug}` : slug;
}

/**
 * The columns of the breakdown table: a State column, a Total column, and one
 * column per observing night.
 *
 * @param {string[]} dayObsValues
 * @returns {Array<{id: string, header: string, align?: string, size?: number, minSize?: number}>}
 */
function buildColumns(dayObsValues) {
  return [
    { id: "state", header: "State", size: 180, minSize: 100 },
    { id: "total", header: "Total", align: "right", size: 120, minSize: 90 },
    ...dayObsValues.map((dayObs) => ({
      id: dayObs,
      header: formatDayobsStrForDisplay(dayObs),
      align: "right",
      size: 120,
      minSize: 90,
    })),
  ];
}

// Default column size used when a column has no explicit size.
const DEFAULT_COL_SIZE = 120;
const MIN_COL_SIZE = 40;

// Horizontal padding applied to the right of every cell. Kept in sync with
// the header-text padding so cell values line up with the header labels and
// clear the column resize line.
const CELL_RIGHT_PADDING = "2rem";

/**
 * Build the initial column-width map from the column definitions.
 *
 * @param {Array<object>} columns
 * @returns {Record<string, number>}
 */
function buildDefaultWidths(columns) {
  return Object.fromEntries(
    columns.map((column) => [column.id, column.size ?? DEFAULT_COL_SIZE]),
  );
}

/**
 * Read the display value for a cell from a row.
 *
 * @param {object} row
 * @param {object} column
 * @returns {*} The raw value for the cell.
 */
function getCellValue(row, column) {
  return column.id === "state" ? row.state : row[column.id];
}

/**
 * Render the State cell. State rows are parents of their combination
 * sub-rows: an expand arrow is shown on the right of the cell and clicking it
 * toggles the sub-rows. Combination sub-rows are indented beneath their
 * parent.
 */
function StateCell({ row, depth, expanded, onToggle }) {
  const canExpand = Boolean(row.subRows?.length);
  const isExpanded = expanded.has(row.state);

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
              onToggle(row.state);
            }
          : undefined
      }
    >
      <span>{row.state}</span>
      {canExpand && (
        <span
          className="text-white flex-shrink-0 leading-none"
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDownIcon size={16} />
          ) : (
            <ChevronRightIcon size={16} />
          )}
        </span>
      )}
    </div>
  );
}

/**
 * The observatory-status breakdown table.
 *
 * A self-contained, static table (not built on the shared DataTable) that
 * shows per-state time broken down across the selected nights. Rows form a
 * small, bounded hierarchy: summary rows, then expandable parent states with
 * their exact time-combination sub-rows. It supports a "show only active
 * states" toggle, expanding/collapsing all states, row selection, and a reset
 * back to the default view.
 *
 * @param {Object} props
 * @param {Array} props.rows - Full breakdown rows from buildObservatoryStatusBreakdown.
 * @param {string[]} props.dayObsValues - Day-obs values that each have a column.
 * @param {string|null} props.selected - Selected selection-key value (or null).
 * @param {Function} props.onSelectionChange - Called with the row's selection key when selected.
 */
function ObservatoryStatusBreakdownTable({
  rows = [],
  dayObsValues = [],
  selected = null,
  onSelectionChange,
}) {
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [expanded, setExpanded] = useState(
    () =>
      new Set(rows.filter((row) => row.subRows?.length).map((r) => r.state)),
  );

  const columns = useMemo(() => buildColumns(dayObsValues), [dayObsValues]);

  // Column widths, initialized from the column definitions and adjustable by
  // dragging the resize handle on each column header.
  const [colWidths, setColWidths] = useState(() => buildDefaultWidths(columns));

  // The columns are effectively static across the page lifecycle, so the
  // widths can be initialized once from the first column set.
  const draggingRef = useRef(null); // { colId, startX, startWidth }

  useEffect(() => {
    const handleMove = (e) => {
      if (!draggingRef.current) return;
      const { colId, startX, startWidth } = draggingRef.current;
      const nextWidth = Math.max(
        MIN_COL_SIZE,
        startWidth + (e.clientX - startX),
      );
      setColWidths((prev) => ({ ...prev, [colId]: nextWidth }));
    };

    const handleUp = () => {
      draggingRef.current = null;
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const startResize = (colId, e) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = {
      colId,
      startX: e.clientX,
      startWidth: colWidths[colId],
    };
    document.body.style.cursor = "col-resize";
  };

  // With `table-fixed` and a full-width table, columns keep their explicit
  // sizes (width + min-width) and the table fills the container (scrolling
  // horizontally once the columns are wider than the available space).
  const visibleRows = useMemo(
    () => (showOnlyActive ? filterToActiveStates(rows) : rows),
    [rows, showOnlyActive],
  );

  // The expandable parent states that are currently being rendered.
  const visibleParentStates = useMemo(
    () =>
      visibleRows.filter((row) => row.subRows?.length).map((row) => row.state),
    [visibleRows],
  );

  const allExpanded =
    visibleParentStates.length > 0 &&
    visibleParentStates.every((state) => expanded.has(state));

  const handleToggleActive = () => setShowOnlyActive((prev) => !prev);

  const handleExpandCollapseAll = () => {
    setExpanded(
      allExpanded
        ? new Set()
        : new Set(
            rows.filter((row) => row.subRows?.length).map((r) => r.state),
          ),
    );
  };

  const handleToggleRow = (state) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  };

  const renderRows = (rowsToRender, depth, keyPrefix = "") =>
    rowsToRender.map((row) => {
      const isSummary = row.rowType === "summary";
      const isState = row.rowType === "state";

      const selectionKey = getSelectionKey(row);
      const key = `${keyPrefix}${selectionKey}`;
      const isSelected = selected != null && selectionKey === selected;

      const handleRowClick = (e) => {
        e.stopPropagation();
        if (!e.currentTarget.contains(e.target)) return;
        if (window.getSelection()?.toString().length > 0) return;
        if (onSelectionChange) {
          onSelectionChange(isSelected ? null : selectionKey);
        }
      };

      // State rows carry the stone colour; summary rows keep their own stone
      // shade with the Dome Open divider; combination sub-rows stay black.
      const typeClassName = isSummary
        ? "bg-stone-600/70" +
          (row.state === "Dome Open" ? " border-b-3 border-stone-200" : "")
        : isState
          ? "bg-stone-800"
          : "";

      const rowClassName = [
        onSelectionChange ? "cursor-pointer" : "",
        isSelected
          ? "bg-black/40 shadow-[inset_4px_0_0_0_white] border-t-2 border-b-2 border-white"
          : "",
        typeClassName,
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <Fragment key={key}>
          <TableRow
            onClick={handleRowClick}
            data-selected={isSelected ? "true" : undefined}
            className={rowClassName}
          >
            {columns.map((column) => {
              const isState = column.id === "state";
              return (
                <TableCell
                  key={column.id}
                  align={column.align}
                  style={{
                    width: colWidths[column.id],
                    minWidth: column.minSize ?? MIN_COL_SIZE,
                    paddingRight: CELL_RIGHT_PADDING,
                  }}
                  className="align-top whitespace-normal break-words"
                >
                  {isState ? (
                    <StateCell
                      row={row}
                      depth={depth}
                      expanded={expanded}
                      onToggle={handleToggleRow}
                    />
                  ) : (
                    formatHours(getCellValue(row, column), {
                      nullReplacement: "-",
                      zeroReplacement: "--",
                    })
                  )}
                </TableCell>
              );
            })}
          </TableRow>
          {row.subRows?.length && expanded.has(row.state)
            ? renderRows(row.subRows, depth + 1, `${key}__`)
            : null}
        </Fragment>
      );
    });

  return (
    <div className="font-light max-h-full">
      {/* Toolbar */}
      <div className="flex flex-row justify-between items-end mb-2">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleToggleActive}
            className="btn h-10 w-[160px] bg-teal-800 justify-between
              font-normal text-[12px] text-white
              border-2 border-white rounded-md
              cursor-pointer
              shadow-[4px_4px_4px_0px_#3CAE3F]
              hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700
              transition-all duration-200
              focus-visible:ring-4
              focus-visible:ring-green-500/50"
          >
            {showOnlyActive ? "Show All States" : "Show Only Active States"}
          </button>

          <button
            type="button"
            onClick={handleExpandCollapseAll}
            disabled={visibleParentStates.length === 0}
            className={`btn h-10 w-[180px] rounded-md justify-between self-end
              font-normal text-[12px] border-2 ${
                visibleParentStates.length === 0
                  ? "cursor-not-allowed bg-stone-700 text-stone-400 border-stone-400 shadow-[4px_4px_4px_0px_#52525b]"
                  : "cursor-pointer bg-teal-800 text-white border-white shadow-[4px_4px_4px_0px_#3CAE3F] hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700 transition-all duration-200 focus-visible:ring-4 focus-visible:ring-green-500/50"
              }`}
          >
            {allExpanded ? "Collapse All States" : "Expand All States"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border text-white max-h-full overflow-auto">
        <div className="[&_[data-slot=table-container]]:!overflow-visible">
          <Table className="text-white table-fixed">
            <TableHeader>
              <TableRow className="sticky top-0 z-50 bg-teal-700">
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    className="text-white bg-teal-700 shadow-md"
                    align={column.align}
                    style={{
                      width: colWidths[column.id],
                      minWidth: column.minSize ?? MIN_COL_SIZE,
                    }}
                  >
                    <div
                      className={`flex items-center relative group ${
                        column.align === "right"
                          ? "justify-end"
                          : "justify-between"
                      }`}
                      style={{ width: "100%" }}
                    >
                      <span
                        className="break-words"
                        style={{ paddingRight: CELL_RIGHT_PADDING }}
                      >
                        {column.header}
                      </span>

                      {/* Resize handle */}
                      <div
                        onMouseDown={(e) => startResize(column.id, e)}
                        onTouchStart={(e) => startResize(column.id, e)}
                        className="absolute right-0 top-0 z-10 h-full w-3 cursor-col-resize select-none
                          flex items-center justify-center
                          hover:bg-teal-400/30 transition-colors"
                      >
                        <div className="h-full w-0.5 bg-teal-500" />
                      </div>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{renderRows(visibleRows, 0)}</TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export default ObservatoryStatusBreakdownTable;
