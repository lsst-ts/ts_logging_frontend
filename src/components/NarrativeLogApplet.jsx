import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import AppletCard, {
  EmptyDisplayState,
  useAppletState,
} from "@/components/AppletCard";

import { DataTable } from "@/components/DataTable";
import {
  narrativeLogColumns,
  defaultColumnVisibility,
  defaultColumnOrder,
} from "@/components/NarrativeLogColumns";

import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Render a row's incident message as an expandable sub-component, spanning the
 * full table width beneath its parent row.
 *
 * @param {Object} props
 * @param {Object} props.row - TanStack Table row
 */
function NarrativeLogMessageRow({ row }) {
  const messageText = row.original.message_text?.trim();
  return (
    <div className="w-full bg-black px-8 py-5 leading-relaxed text-neutral-200 border-b border-stone-300 break-words whitespace-normal">
      {messageText || "--"}
    </div>
  );
}

/**
 * Render the total fault loss footer row.
 *
 * Computes the sum of the "time_lost" column using TanStack's aggregation
 * feature and shows it alongside a label, replicating the MVP footer.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 */
function NarrativeLogFooter({ table }) {
  const total = table.getColumn("time_lost")?.getAggregationValue();
  const displayTotal =
    total == null || Number.isNaN(total) ? "--" : Number(total).toFixed(2);

  return (
    <div className="flex items-center justify-start gap-10 px-2 py-1 font-semibold">
      <span className="whitespace-nowrap">Total Fault Loss:</span>
      <span className="whitespace-nowrap">{displayTotal}</span>
    </div>
  );
}

/**
 * Render the narrative log table content.
 *
 * When the display state is `noData` (the required Narrative Log source was
 * reached but is empty) the standard empty state is shown with the resolved
 * message; otherwise the data table renders (with a fallback empty state
 * when none of the available entries carry a fault time loss).
 *
 * @param {Object} props
 * @param {Array} props.faultEntriesWithTimeLoss Entries with a fault time loss.
 * @param {boolean} props.hasAttachments Whether any entry has attachments.
 * @param {Array} props.columnFilters Active column filters.
 * @param {Function} props.setColumnFilters Update the column filters.
 * @param {Function} props.handleReset Clear the column filters.
 */
function NarrativeLogBody({
  faultEntriesWithTimeLoss,
  hasAttachments,
  columnFilters,
  setColumnFilters,
  handleReset,
}) {
  const { state, message } = useAppletState();

  const columnVisibility = {
    ...defaultColumnVisibility,
    attachments: hasAttachments,
  };

  return (
    <>
      <DataTable
        data={faultEntriesWithTimeLoss}
        columns={narrativeLogColumns}
        isLoading={false}
        defaultColumnVisibility={columnVisibility}
        defaultColumnOrder={defaultColumnOrder}
        defaultSorting={[{ id: "time_begin", desc: false }]}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        tableMeta={{
          subComponent: NarrativeLogMessageRow,

          renderFooter:
            state === "noData" || faultEntriesWithTimeLoss.length === 0
              ? undefined
              : NarrativeLogFooter,
          // Rows are not selectable.
          getRowClassName: () => "bg-stone-800 hover:bg-stone-800",
        }}
        toolbar={{
          showColumnVisibility: true,
          showExpandCollapseGroups: false,
          showReset: true,
        }}
        onReset={handleReset}
      />
      {state === "noData" ? (
        <EmptyDisplayState message={message} />
      ) : faultEntriesWithTimeLoss.length === 0 ? (
        <EmptyDisplayState message="No Narrative Log entries with fault time loss." />
      ) : null}
    </>
  );
}

/**
 * Render the narrative log table.
 *
 * @param {Object} props
 * @param {boolean} [props.loading=false] Whether Narrative Log data is loading.
 * @param {Array} [props.narrativeLogEntries=[]] Narrative Log entries with time loss.
 * @param {Object} props.sources Map of source key -> `{ ok, message?, noData? }`.
 * @param {string[]} props.required Sources required to render the table.
 */
function NarrativeLogApplet({
  loading = false,
  narrativeLogEntries = [],
  sources = {},
  required = [],
}) {
  const [tableVisible, setTableVisible] = useState(true);
  const [columnFilters, setColumnFilters] = useState([]);

  const entries = useMemo(
    () => narrativeLogEntries ?? [],
    [narrativeLogEntries],
  );

  const faultEntriesWithTimeLoss = useMemo(
    () =>
      entries.filter(
        (entry) =>
          entry.time_lost_type === "fault" && Number(entry.time_lost) > 0,
      ),
    [entries],
  );

  // Show the Attachments column only when at least one entry has attachments.
  const hasAttachments = useMemo(
    () =>
      faultEntriesWithTimeLoss.some(
        (entry) => (entry.attachments?.length ?? 0) > 0,
      ),
    [faultEntriesWithTimeLoss],
  );

  const handleReset = () => {
    setColumnFilters([]);
  };

  return (
    <AppletCard
      title="Narrative Log Entries with Fault Time Loss"
      id="narrative-log-table"
      open={tableVisible}
      loading={loading}
      sources={sources}
      required={required}
      skeleton={
        <div className="flex-grow w-full h-full">
          <Skeleton className="h-full min-h-[180px] bg-stone-900" />
        </div>
      }
      actions={
        <>
          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
              aria-label="Download Narrative Log data"
            >
              <img src={DownloadIcon} alt="Download" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
              aria-label="Narrative Log information"
            >
              <img src={InfoIcon} alt="Information" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px]">
              <p>
                Narrative Log entries that have recorded fault time loss during
                the selected period.
                <br />
                <br />
                Times are shown in UTC. Each entry includes its incident
                message, component, time-loss information, Jira ticket, and
                associated user.
              </p>
            </PopoverContent>
          </Popover>

          {/* Button to toggle table visibility */}
          <Button
            onClick={() => setTableVisible((prev) => !prev)}
            className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
          >
            {tableVisible ? "Hide Table" : "Show Table"}
          </Button>
        </>
      }
    >
      <NarrativeLogBody
        faultEntriesWithTimeLoss={faultEntriesWithTimeLoss}
        hasAttachments={hasAttachments}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        handleReset={handleReset}
      />
    </AppletCard>
  );
}

export default NarrativeLogApplet;
