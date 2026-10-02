import { useMemo, useState } from "react";
import { useSearch } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AppletHeader from "@/components/AppletHeader";
import DownloadButton from "@/components/DownloadButton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTable } from "@/components/DataTable";
import {
  narrativeLogColumns,
  defaultColumnVisibility,
  defaultColumnOrder,
  formatComponentHierarchy,
} from "@/components/NarrativeLogColumns";

import {
  buildDownloadFilename,
  columnsFromRecords,
  toCsv,
} from "@/utils/downloadUtils";

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
    <div className="w-full bg-stone-800/50 px-8 py-5 leading-relaxed text-neutral-200 border-b border-stone-300 break-words whitespace-normal">
      {messageText || "—"}
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
    total == null || Number.isNaN(total) ? "—" : Number(total).toFixed(2);

  return (
    <div className="flex items-center justify-start gap-10 px-2 py-1 font-semibold">
      <span className="whitespace-nowrap">Total Fault Loss:</span>
      <span className="whitespace-nowrap">{displayTotal}</span>
    </div>
  );
}

/**
 * Render the narrative log table.
 *
 * @param {Object} props
 * @param {boolean} [props.narrativeLogLoading=false] Whether Narrative Log data is loading.
 * @param {Array} [props.narrativeLogEntries=[]] Narrative Log entries with time loss.
 * @param {boolean} [props.narrativeLogError=false] Whether Narrative Log data failed to load.
 */
function NarrativeLogApplet({
  narrativeLogLoading = false,
  narrativeLogEntries = [],
  narrativeLogError = false,
}) {
  const [tableVisible, setTableVisible] = useState(true);
  const [columnFilters, setColumnFilters] = useState([]);

  const errorText = "Narrative Log data could not be fetched.";

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

  const columnVisibility = useMemo(
    () => ({ ...defaultColumnVisibility, attachments: hasAttachments }),
    [hasAttachments],
  );

  const handleReset = () => {
    setColumnFilters([]);
  };

  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "/time-accounting",
  });

  // Download the entries shown, one row each with every field the backend
  // returns. List fields are joined, and the component tree also gets a
  // flat column in the table's "Parent: {Child}" format.
  const handleDownload = () => {
    const joinList = (value) =>
      Array.isArray(value) ? value.join("; ") : value;
    const rows = faultEntriesWithTimeLoss.map((entry) => ({
      ...entry,
      urls: joinList(entry.urls),
      tags: joinList(entry.tags),
      component: formatComponentHierarchy(entry.components_json),
    }));
    return {
      content: toCsv(rows, columnsFromRecords(rows)),
      filename: buildDownloadFilename(
        "narrative-log",
        { telescope, startDayobs, endDayobs },
        "csv",
      ),
      mimeType: "text/csv",
    };
  };

  return (
    <Card className="@container border-none p-0 bg-stone-800 gap-2">
      <AppletHeader
        title="Narrative Log Entries with Fault Time Loss"
        actions={
          <>
            <DownloadButton
              onDownload={handleDownload}
              disabled={
                narrativeLogLoading ||
                narrativeLogError ||
                faultEntriesWithTimeLoss.length === 0
              }
            />

            <Popover>
              <PopoverTrigger
                className="min-w-4 cursor-pointer"
                aria-label="Narrative Log information"
              >
                <img src={InfoIcon} alt="Information" />
              </PopoverTrigger>
              <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px] cursor-pointer">
                <p>
                  Narrative Log entries that have recorded fault time loss
                  during the selected period.
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
      />

      {tableVisible && (
        <CardContent
          id="narrative-log-table"
          className="flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin"
        >
          {narrativeLogLoading ? (
            <div className="flex-grow w-full h-full">
              <Skeleton className="h-full min-h-[180px] bg-stone-900" />
            </div>
          ) : narrativeLogError ? (
            <div className="h-full place-content-center-safe">
              <p className="text-stone-400 text-center">{errorText}</p>
            </div>
          ) : faultEntriesWithTimeLoss.length === 0 ? (
            <div className="h-full place-content-center-safe">
              <p className="text-stone-400 text-center">
                No Narrative Log entries with fault time loss.
              </p>
            </div>
          ) : (
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
                renderFooter: NarrativeLogFooter,
              }}
              toolbar={{
                showColumnVisibility: true,
                showReset: true,
              }}
              onReset={handleReset}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default NarrativeLogApplet;
