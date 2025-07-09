// import React from "react";
import { useState, useEffect } from "react";

import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { TELESCOPES } from "@/components/parameters";
import DataLogTable from "@/components/dataLogTable.jsx";
import {
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
} from "@/utils/fetchUtils";
import { getDatetimeFromDayobsStr, mergeDataLogSources } from "@/utils/utils";

function DataLog() {
  // Routing and URL params
  const { startDayobs, endDayobs, telescope } = useSearch({
    from: "__root__",
  });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  // Data
  const [dataLogEntries, setDataLogEntries] = useState([]);
  const [dataLogLoading, setDataLogLoading] = useState(true);

  useEffect(() => {
    // To cancel previous fetch if still in progress
    const abortController = new AbortController();

    // Trigger loading skeletons
    setDataLogLoading(true);

    // Fetch data from both sources
    Promise.all([
      fetchDataLogEntriesFromConsDB(
        startDayobs,
        queryEndDayobs,
        instrument,
        abortController,
      ),
      fetchDataLogEntriesFromExposureLog(
        startDayobs,
        queryEndDayobs,
        instrument,
        abortController,
      ),
    ])
      .then(([consDBData, exposureLogData]) => {
        const dataLog = consDBData.data_log ?? [];

        if (dataLog.length === 0) {
          toast.warning(
            "No data log records found in ConsDB for the selected date range.",
          );
        }

        // Merge the two data sources
        const mergedData = mergeDataLogSources(dataLog, exposureLogData);

        // TODO: Remove before PR merge
        // Check merged data sample after merging
        console.log("Merged Data Log sample entries:", mergedData.slice(0, 3));

        // Set the merged data to state
        setDataLogEntries(mergedData);
        setDataLogLoading(false);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          const msg = err?.message || "Unknown error";
          toast.error("Error fetching exposure or data log!", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setDataLogLoading(false);
        }
      });

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [startDayobs, endDayobs, telescope]);

  return (
    <div>
      <div className="flex flex-col w-full p-8 gap-8">
        {/* Panel of info, user controls? */}
        <h1 className="text-white text-[100px] font-thin text-center">
          Data Log.
        </h1>
        {/* Table */}
        <DataLogTable data={dataLogEntries} dataLogLoading={dataLogLoading} />
      </div>
    </div>
  );
}

export default DataLog;
