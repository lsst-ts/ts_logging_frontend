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

  const tableFilters = [];
  if (science_program?.length) {
    tableFilters.push({ id: "science program", value: science_program });
  }
  if (img_type?.length) {
    tableFilters.push({ id: "img type", value: img_type });
  }
  if (observation_reason?.length) {
    tableFilters.push({ id: "observation reason", value: observation_reason });
  }
  if (target_name?.length) {
    tableFilters.push({ id: "target name", value: target_name });
  }

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
  }, [startDayobs, endDayobs, telescope, instrument, queryEndDayobs]);
  // TODO: remove endDayobs, telescope?

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
        tableFilters={tableFilters}
      />
    </div>
  );
}

export default DataLog;
