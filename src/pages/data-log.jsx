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
  const {
    startDayobs,
    endDayobs,
    telescope,
    science_program,
    img_type,
    observation_reason,
    target_name,
  } = useSearch({ from: "/data-log" });

  // The end dayobs is inclusive, so we add one day to the
  // endDayobs to get the correct range for the queries
  const queryEndDayobs = getDatetimeFromDayobsStr(endDayobs.toString())
    .plus({ days: 1 })
    .toFormat("yyyyMMdd");
  const instrument = TELESCOPES[telescope];

  const filterKey = science_program
    ? "science program"
    : img_type
      ? "img type"
      : observation_reason
        ? "observation reason"
        : target_name
          ? "target name"
          : null;

  const filterValue =
    science_program || img_type || observation_reason || target_name;

  const activeFilter =
    filterKey && filterValue ? { id: filterKey, value: [filterValue] } : null;

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
        // and apply conversion to required row(s)
        const mergedData = mergeDataLogSources(dataLog, exposureLogData).map(
          (entry) => {
            const psf = parseFloat(entry["psf sigma median"]);
            return {
              ...entry,
              "psf median": !isNaN(psf) ? psf * 2.355 : null,
            };
          },
        );

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
    <div className="flex flex-col w-full p-8 gap-8">
      {/* Panel of info, user controls? */}
      <h1 className="text-white text-[100px] font-thin text-center">
        Data Log.
      </h1>
      {/* Table */}
      <DataLogTable
        data={dataLogEntries}
        dataLogLoading={dataLogLoading}
        initialColumnFilter={activeFilter}
      />
    </div>
  );
}

export default DataLog;
