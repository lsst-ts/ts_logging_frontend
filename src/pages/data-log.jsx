import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
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

  // For display on page
  const baseUrl = import.meta.env.VITE_EXTERNAL_INSTANCE_URL;
  const instrumentName = telescope;
  const dateRangeString =
    startDayobs === endDayobs
      ? `on dayobs ${startDayobs}`
      : `in dayobs range ${startDayobs}–${endDayobs}`;

  // To pass url filter params to table
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
    if (telescope === "AuxTel") {
      return;
    }

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
  }, [startDayobs, queryEndDayobs, instrument]);

  // Temporary display message for AuxTel queries
  if (telescope === "AuxTel") {
    return (
      <div className="flex flex-col w-full p-8 gap-4">
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">Data</span>
          <span className="font-extrabold">Log</span>
        </h1>
        <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          <p>
            <strong>AuxTel is currently not supported in this page.</strong>
          </p>
          <p>
            Please refer to the{" "}
            <a
              href={`${baseUrl}/times-square/github/lsst-ts/ts_logging_and_reporting/ExposureDetail`}
              className="underline text-blue-300 hover:text-blue-400"
              target="_blank"
              rel="noopener noreferrer"
            >
              Exposure Detail notebook
            </a>{" "}
            for AuxTel exposures.
          </p>
        </div>
        <Toaster expand={true} richColors closeButton />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col w-full p-8 gap-4">
        {/* Page title */}
        <h1 className="flex flex-row gap-3 text-white text-5xl uppercase justify-center">
          <span className="tracking-[2px] font-extralight">Data</span>
          <span className="font-extrabold">Log</span>
        </h1>

        {/* Info section */}
        <div className="min-h-[4.5rem] text-white font-thin text-center pb-4 flex flex-col items-center justify-center gap-2">
          {dataLogLoading ? (
            <>
              <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
              <Skeleton className="h-5 w-[90%] max-w-2xl bg-stone-700" />
            </>
          ) : (
            <>
              <p>
                {dataLogEntries.length} exposures returned for {instrumentName}{" "}
                {dateRangeString}.
              </p>
              <p className="max-w-2xl">
                <span className="font-bold">Note:</span> Table customisations
                (such as filtering, sorting, column hiding, and grouping) do not
                persist across page navigations. However, they will persist
                while querying different dates or date ranges on this page. If
                data doesn't appear as expected, try resetting the table.
              </p>
            </>
          )}
        </div>

        {/* Table */}
        <DataLogTable
          data={dataLogEntries}
          dataLogLoading={dataLogLoading}
          tableFilters={tableFilters}
        />
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default DataLog;
