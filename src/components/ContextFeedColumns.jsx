import React from "react";
import yaml from "js-yaml";

import { DateTime } from "luxon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createColumnHelper } from "@tanstack/react-table";
import { formatCellValue } from "@/utils/utils";
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";

import CopyIcon from "../assets/CopyIcon.svg";
import FullScreenIcon from "../assets/FullScreenIcon.svg";

const columnHelper = createColumnHelper();

// TODO: Move to utils and import to here and dataLogColumns (OSW-1118)
// Exact (multiple) match(es) filter function
export const matchValueOrInList = (row, columnId, filterValue) => {
  const rowValue = row.getValue(columnId);

  if (Array.isArray(filterValue)) {
    return filterValue.includes(rowValue);
  }

  return rowValue === filterValue;
};

// Helper function to make time columns more readable
// Luxon only natively supports millisecond precision, not microseconds.
// Will need to extract microseconds if this precision is required.
function formatTimestamp(tsString) {
  if (!tsString) return null;
  const dt = DateTime.fromISO(tsString, { zone: "utc" });
  return dt.isValid ? dt.toFormat("yyyy-LL-dd HH:mm:ss.S") : tsString;
}

// Handles links (<a> tags → styled link), plain text descriptions, and
// expandable tracebacks (with copy/fullscreen).
// Expansion tracked in `expandedRows` and toggled on click.
function renderDescriptionCell(info) {
  const description = info.getValue();
  if (!description) return null;

  const rowId = info.row.id;
  const isTraceback = info.column.columnDef.meta?.isExpandable?.(
    info.row.original,
  );
  const { expandedRows, toggleExpandedRows, collapseTracebacks } =
    info.table.options.meta;
  const expanded = expandedRows[rowId]?.description ?? !collapseTracebacks;

  // Links to scheduler config files are passed as html.
  if (description.startsWith("<a href")) {
    // Create a temporary element to store link in
    // so that we can strip out the url and display text.
    try {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = description;

      const aTag = tempDiv.querySelector("a");
      if (aTag) {
        const href = aTag.getAttribute("href");
        const linkHtml = aTag.innerHTML;
        // Display text usually includes <br>
        // so we split lines here to preserve break.
        const lines = linkHtml.split(/<br\s*\/?>/i);

        return (
          // Wrap in a dark background for visibility
          // when row is highlighted.
          <div className="bg-stone-800 p-2 rounded">
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-500 underline"
            >
              {/* Iterate over the link text lines */}
              {lines.map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < lines.length - 1 && <br />}
                </React.Fragment>
              ))}
            </a>
          </div>
        );
      }
    } catch (err) {
      // Parsing failed, fallback to raw string.
      console.error("Failed to parse link in description:", err);
    }
  }

  if (!isTraceback) return formatCellValue(description);

  // Detect consecutive spaces and move to new line
  const displayDescr = expanded
    ? description.replace(/( {2,})/g, "\n$1")
    : description;

  // Handler for copy-to-clipboard button
  const handleCopy = (e) => {
    // Don’t trigger expand/collapse of entire cell
    e.stopPropagation();
    navigator.clipboard.writeText(description).catch((err) => {
      console.error("Copy failed:", err);
    });
  };

  return (
    <div
      className="relative"
      onClick={() => toggleExpandedRows(rowId, "description")}
    >
      <pre className="whitespace-pre-wrap text-xs bg-stone-900 p-2 rounded cursor-pointer">
        {!expanded ? (
          // Collapsed: intro line of traceback, expandable upon click
          <>Traceback (most recent call last): ...</>
        ) : (
          // Expanded: display full traceback
          <>{displayDescr}</>
        )}
      </pre>

      {expanded && (
        // Expanded: Copy + Fullscreen buttons in top-right of cell
        <div className="absolute top-1 right-1 p-1 flex flex-row gap-2">
          {/* Open Traceback in Full Screen button */}
          <Dialog>
            <DialogTrigger asChild>
              <button
                className="text-stone-400 hover:text-white hover:bg-stone-700 rounded cursor-pointer"
                // Don’t trigger expand/collapse of entire cell
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                <img src={FullScreenIcon} width="20" />
              </button>
            </DialogTrigger>
            <DialogContent className="!w-[95vw] !max-w-[810px] !max-h-screen bg-stone-800/90 text-stone-100 border border-stone-900 p-4">
              <DialogHeader>
                <DialogTitle className="text-s text-stone-100 mb-2">
                  <span
                    className="px-2 py-1 rounded-md border bg-stone-900"
                    style={{
                      borderColor:
                        CATEGORY_INDEX_INFO[info.row.original.category_index]
                          ?.color,
                      color:
                        CATEGORY_INDEX_INFO[info.row.original.category_index]
                          ?.color,
                    }}
                  >
                    {info.row.original.event_type}
                  </span>
                  {" - Script SAL Index "} {info.row.original.script_salIndex}
                </DialogTitle>
                <DialogDescription className="text-stone-400">
                  {info.row.original.name} @{" "}
                  {formatTimestamp(info.row.original.time)}
                </DialogDescription>
              </DialogHeader>
              {/* Display the traceback with copy button in top-right */}
              <div className="relative">
                {/* Traceback */}
                <pre className="whitespace-pre-wrap text-xs text-stone-100 bg-stone-900 p-4 rounded cursor-pointer overflow-y-auto max-h-[80vh]">
                  {displayDescr}
                </pre>
                {/* Copy button */}
                <div className="absolute top-1 right-1 p-1 flex flex-row gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-stone-400 hover:text-white hover:bg-stone-700 rounded cursor-pointer"
                  >
                    <img src={CopyIcon} width="30" />
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {/* Copy-to-clipboard button */}
          <button
            onClick={handleCopy}
            className="text-stone-400 hover:text-white hover:bg-stone-700 rounded cursor-pointer"
          >
            <img src={CopyIcon} width="20" />
          </button>
        </div>
      )}
    </div>
  );
}

// Handles empty/null (→ null), plain non-YAML strings, and expandable YAML
// (collapsed = first line, expanded = full formatted + copy-to-clipboard).
// Expansion tracked in `expandedRows` and toggled on click.
function renderConfigCell(info) {
  const config = info.getValue();
  if (!config) return null;

  const rowId = info.row.id;
  const { expandedRows, collapseYaml, toggleExpandedRows } =
    info.table.options.meta;
  const expanded = expandedRows[rowId]?.config ?? !collapseYaml;

  // Determine if YAML
  const mightBeYaml = info.column.columnDef.meta?.isExpandable?.(
    info.row.original,
  );

  if (!mightBeYaml) return formatCellValue(config);

  // Apply YAML formatting if possible
  let formattedConfig = config;
  try {
    formattedConfig = yaml.dump(yaml.load(config), { flowLevel: -1 });
  } catch (err) {
    // Errors caught here aren't necessarily due to the parsing
    // failing. ts-yaml will also raise an error if the yaml
    // itself has a problem (e.g. duplicate keys).
    // If parsing does fail, we'll fallback to raw string.
    console.error("Problem with parsing config yaml:", err);
  }

  // Get first line for collapsed display.
  // First split into lines to check line length in collapsed mode
  // for appending "..." if more than one line.
  const lines = formattedConfig
    .split("\n")
    .filter((line) => line.trim() !== "");
  const firstLine = lines[0] || "";

  // Handler for copy-to-clipboard button
  const handleCopy = (e) => {
    // Don’t trigger expand/collapse of entire cell
    e.stopPropagation();
    navigator.clipboard.writeText(formattedConfig).catch((err) => {
      console.error("Copy failed:", err);
    });
  };

  // Return collapsed/expanded cell
  return (
    <div
      className="relative"
      onClick={() => toggleExpandedRows(rowId, "config")}
    >
      <pre className="whitespace-pre-wrap text-xs bg-stone-900 p-2 rounded cursor-pointer">
        {!expanded ? (
          // Collapsed: first line of YAML, expandable upon click
          // "..." appended if more lines
          <>
            {firstLine}
            {lines.length > 1 && " ..."}
          </>
        ) : (
          // Expanded: YAML
          <>{formattedConfig}</>
        )}
      </pre>

      {expanded && (
        // Expanded: copy button in top-right of cell
        <button
          onClick={handleCopy}
          className="absolute top-1 right-1 p-0.5 text-stone-400 hover:text-white hover:bg-stone-700 rounded cursor-pointer"
        >
          <img src={CopyIcon} width="20" />
        </button>
      )}
    </div>
  );
}

export const contextFeedColumns = [
  columnHelper.accessor("category_index", {
    header: "Category Index",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Category Index.",
      align: "right",
    },
  }),
  columnHelper.accessor("event_type", {
    header: "Event Type",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Data type displayed in the row (derived from Category Index).",
    },
  }),
  columnHelper.accessor("current_task", {
    header: "Current Task",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "BLOCK or FBS configuration.",
    },
  }),
  columnHelper.accessor("time", {
    header: "Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 220,
    filterType: "number-range",
    meta: {
      tooltip: "Time associated with event.",
    },
  }),
  columnHelper.accessor("name", {
    header: "Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 300,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Name of event.",
    },
  }),
  columnHelper.accessor("description", {
    header: "Description",
    size: 400,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Description of event or expandable error traceback.",
      isExpandable: (row) => row.finalStatus === "Traceback",
    },
    cell: renderDescriptionCell,
  }),
  columnHelper.accessor("config", {
    header: "Config",
    size: 350,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Configurations, including expandable YAML.",
      isExpandable: (row) => {
        const { script_salIndex, category_index, config } = row;
        return (
          script_salIndex > 0 &&
          [1, 2, 3].includes(category_index) &&
          typeof config === "string" &&
          !config.startsWith("Traceback") &&
          config.length > 0
        );
      },
    },
    cell: renderConfigCell,
  }),
  columnHelper.accessor("script_salIndex", {
    header: "Script SAL Index",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Script SAL Index.",
      align: "right",
    },
  }),
  columnHelper.accessor("finalStatus", {
    header: "Final Status",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Final Status.",
    },
  }),
  columnHelper.accessor("timestampProcessStart", {
    header: "Process Start Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 220,
    filterType: "number-range",
    meta: {
      tooltip: "Timestamp at start of process.",
    },
  }),
  columnHelper.accessor("timestampConfigureStart", {
    header: "Configuration Start Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 240,
    filterType: "number-range",
    meta: {
      tooltip: "Timestamp at start of configuration.",
    },
  }),
  columnHelper.accessor("timestampConfigureEnd", {
    header: "Configuration End Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 240,
    filterType: "number-range",
    meta: {
      tooltip: "Timestamp at end of configuration.",
    },
  }),
  columnHelper.accessor("timestampRunStart", {
    header: "Run Start Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 220,
    filterType: "number-range",
    meta: {
      tooltip: "Timestamp at start of run.",
    },
  }),
  columnHelper.accessor("timestampProcessEnd", {
    header: "Process End Time (UTC)",
    cell: (info) => formatTimestamp(info.getValue()),
    size: 220,
    filterType: "number-range",
    meta: {
      tooltip: "Timestamp at end of process.",
    },
  }),
];
