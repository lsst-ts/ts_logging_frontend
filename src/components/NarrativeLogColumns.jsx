import { createColumnHelper } from "@tanstack/react-table";
import { useSearch, Link } from "@tanstack/react-router";

import { formatCellValue } from "@/utils/utils";
import { formatTimestamp, taiToUTC } from "@/utils/timeUtils";
import { matchValueOrInList } from "@/components/DataTable/tableUtils";

import LinkIcon from "../assets/LinkIcon.svg";

const columnHelper = createColumnHelper();

// Narrative Log datetimes are TAI clock readings. Convert to UTC (subtracting
// the TAI offset) and return the epoch milliseconds.
function parseUTCDateTime(value) {
  if (!value) return null;
  const dt = taiToUTC(value);
  if (!dt.isValid) return null;
  return dt.toMillis();
}

function formatUTCDateTime(value) {
  const ms = parseUTCDateTime(value);
  if (ms == null) return "—";
  const formatted = formatTimestamp(ms);
  return formatted ?? "—";
}

// Extract a display username from a Narrative Log user_id.
function getDisplayUser(userId) {
  if (!userId) return "—";
  return userId.split("@")[0];
}

// Parse a Narrative Log URL into a display label and href.
function parseUrl(url) {
  const markdownMatch = url.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (markdownMatch) {
    return { label: markdownMatch[1], href: markdownMatch[2] };
  }
  const jiraMatch = url.match(/\/browse\/([A-Z]+-\d+)$/);
  return { label: jiraMatch ? jiraMatch[1] : url, href: url };
}

// Extract Jira links from an entry.
function getJiraLinks(entry) {
  return (entry.urls ?? [])
    .map(parseUrl)
    .filter(({ href }) => href.includes("atlassian.net"));
}

// Convert a Narrative Log datetime to Unix microseconds.
//
// Mirrors ContextFeedColumns' "time" accessor so that the produced value
// matches that table's selected row key exactly. The Context Feed row index
// ("Time") is a Unix timestamp in microseconds.
function toDateTimeMicros(value) {
  const ms = parseUTCDateTime(value);
  if (ms == null) return null;
  const match = value.match(/\.(\d+)/);
  if (match) {
    const micros = parseInt(match[1].padEnd(6, "0").slice(3, 6), 10);
    return ms * 1000 + micros;
  }
  return ms * 1000;
}

// Format a component hierarchy for display.
function formatComponentHierarchy(component) {
  if (!component?.name) return "";
  const children = Array.isArray(component.children)
    ? component.children.filter((child) => child?.name)
    : [];
  if (children.length === 0) return component.name;
  return `${component.name}: {${children
    .map(formatComponentHierarchy)
    .join(", ")}}`;
}

// Derive the display "System" value for an entry.
function getSystem(entry) {
  return (
    formatComponentHierarchy(entry.components_json) ||
    entry.systems ||
    entry.instrument ||
    "—"
  );
}

// Render the Context Feed link cell.
// Links to the matching row in the Context Feed table, preserving the current
// Time Accounting URL parameters and selecting the entry by its time.
function ContextFeedLinkCell(info) {
  const { startDayobs, endDayobs, telescope, startTime, endTime } = useSearch({
    from: "/time-accounting",
    select: (search) => ({
      startDayobs: search.startDayobs,
      endDayobs: search.endDayobs,
      telescope: search.telescope,
      startTime: search.startTime,
      endTime: search.endTime,
    }),
  });

  const entry = info.row.original;
  const selectedTime = toDateTimeMicros(entry.date_end);

  if (selectedTime == null) {
    return (
      <span
        className="inline-flex text-stone-300"
        aria-label="Context feed unavailable"
        title="Context feed unavailable"
      >
        <img src={LinkIcon} alt="Context Feed link is unavailable" />
      </span>
    );
  }

  return (
    <Link
      to="/nightlydigest/context-feed"
      search={{
        startDayobs,
        endDayobs,
        telescope,
        startTime,
        endTime,
        selectedTime,
      }}
      aria-label={`Open context feed for ${entry.id}`}
      className="inline-flex hover:opacity-70"
    >
      <img src={LinkIcon} alt="Context Feed link" />
    </Link>
  );
}

// Render the Jira ticket cell.
function renderJiraTicketCell(info) {
  const links = getJiraLinks(info.row.original);

  if (links.length === 0) return "—";

  return (
    <div className="flex flex-col gap-1">
      {links.map(({ label, href }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 underline hover:text-blue-300"
        >
          {label}
        </a>
      ))}
    </div>
  );
}

// Render the Time Loss cell, highlighting the value like the MVP.
function renderTimeLossCell(info) {
  const value = info.getValue();
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toFixed(2);
}

// First Jira ticket key (e.g. "OBS-1671") for the row, used for filtering.
function getFirstJiraTicket(entry) {
  const links = getJiraLinks(entry);
  return links.length ? links[0].label : null;
}

// Render a single attachment value as raw text, or as a link if it is a URL.
function renderAttachment(value) {
  if (typeof value === "string" && /^https?:\/\/\S+$/.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="text-blue-500 underline hover:text-blue-300 break-all"
      >
        {value}
      </a>
    );
  }
  return <span className="break-all">{String(value)}</span>;
}

// Render the Attachments cell as the raw value(s).
function renderAttachmentsCell(info) {
  const value = info.row.original.attachments;
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return (
      <div className="flex flex-col gap-1">
        {value.map((item, index) => (
          <div key={index}>{renderAttachment(item)}</div>
        ))}
      </div>
    );
  }
  if (value == null || value === "") return "—";
  return renderAttachment(value);
}

/**
 * Column definitions for the Narrative Log table.
 */
export const narrativeLogColumns = [
  columnHelper.display({
    id: "contextFeed",
    header: "Context Feed",
    cell: ContextFeedLinkCell,
    size: 130,
    minSize: 80,
    filterType: null,
    meta: {
      tooltip: "Link to the corresponding Context Feed entry.",
    },
  }),
  columnHelper.accessor((row) => parseUTCDateTime(row.date_begin), {
    id: "time_begin",
    header: "Time of Incident (UTC)",
    cell: (info) => formatUTCDateTime(info.row.original.date_begin),
    size: 220,
    minSize: 140,
    sortUndefined: "last",
    filterType: "number-range",
    meta: {
      tooltip: "Time of incident (UTC).",
    },
  }),
  columnHelper.accessor((row) => parseUTCDateTime(row.date_end), {
    id: "date_end",
    header: "End of Incident",
    cell: (info) => formatUTCDateTime(info.row.original.date_end),
    size: 220,
    minSize: 140,
    sortUndefined: "last",
    filterType: "number-range",
    meta: {
      tooltip: "End time of the incident (UTC).",
    },
  }),
  columnHelper.accessor((row) => getSystem(row), {
    id: "system",
    header: "Component",
    cell: (info) => formatCellValue(info.getValue()),
    size: 220,
    minSize: 140,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip:
        "Component(s) affected by the incident. If children components " +
        "are listed, they are shown as `Parent: {Child}`.",
    },
  }),
  columnHelper.accessor(
    (row) =>
      row.time_lost === null || row.time_lost === undefined || row.time_lost === ""
        ? null
        : Number(row.time_lost),
    {
      id: "time_lost",
      header: "Time Loss",
      cell: renderTimeLossCell,
      size: 100,
      minSize: 100,
      meta: {
        tooltip: "Amount of time lost (hours).",
        align: "right",
        cellClassName: "font-bold",
      },
      aggregationFn: "sum",
    },
  ),
  columnHelper.accessor((row) => getFirstJiraTicket(row), {
    id: "jira_ticket",
    header: "Jira Ticket",
    cell: renderJiraTicketCell,
    size: 140,
    minSize: 90,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Associated Jira ticket(s). Opens in a new tab.",
    },
  }),
  columnHelper.accessor((row) => getDisplayUser(row.user_id), {
    id: "user",
    header: "User",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    minSize: 80,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "User associated with the entry.",
    },
  }),
  columnHelper.display({
    id: "attachments",
    header: "Attachments",
    cell: renderAttachmentsCell,
    size: 140,
    minSize: 80,
    filterType: null,
    meta: {
      tooltip: "Files or links attached to the entry.",
    },
  }),
];

/**
 * Default Column visibility for the Narrative Log table.
 *
 * `attachments` is hidden by default.
 */
export const defaultColumnVisibility = {
  contextFeed: true,
  time_begin: true,
  date_end: true,
  system: true,
  time_lost: true,
  jira_ticket: true,
  user: true,
  attachments: false,
};

/**
 * Default column order for the Narrative Log table.
 */
export const defaultColumnOrder = [
  "contextFeed",
  "time_begin",
  "date_end",
  "system",
  "time_lost",
  "jira_ticket",
  "user",
  "attachments",
];
