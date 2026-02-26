import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useSearch } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { TELESCOPES } from "@/components/Parameters";
import DataLogTable from "@/components/DataLogTable.jsx";
import {
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
  fetchTestCases,
} from "@/utils/fetchUtils";
import {
  getDatetimeFromDayobsStr,
  mergeAllSources,
} from "@/utils/utils";

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
  const dateRangeString =
    startDayobs === endDayobs
      ? `on dayobs ${startDayobs}`
      : `in dayobs range ${startDayobs}–${endDayobs}`;

  // To pass url filter params to table
  const tableFilters = [];
  if (science_program?.length) {
    tableFilters.push({ id: "science_program", value: science_program });
  }
  if (img_type?.length) {
    tableFilters.push({ id: "img_type", value: img_type });
  }
  if (observation_reason?.length) {
    tableFilters.push({ id: "observation_reason", value: observation_reason });
  }
  if (target_name?.length) {
    tableFilters.push({ id: "target_name", value: target_name });
  }

  // Data and loading flags
  const [consDBdata, setConsDBdata] = useState([]);
  const [consDBdataLoading, setConsDBdataLoading] = useState(false);
  const [exposureLogData, setExposureLogData] = useState([]);
  const [exposureLogDataLoading, setExposureLogDataLoading] = useState(false);
  const [zephyrData, setZephyrData] = useState({});
  const [zephyrDataLoading, setZephyrDataLoading] = useState(false);

  // Fetch from ConsDB
  useEffect(() => {
    const abortController = new AbortController();

    setConsDBdataLoading(true);

    fetchDataLogEntriesFromConsDB(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
    .then((consDBData) => {
      const dataLog = consDBData.data_log ?? [];
      if (dataLog.length === 0) {
        toast.warning(
          "No data log records found in ConsDB for the selected date range.",
        );
      }

      setConsDBdata(dataLog);
    })
    .catch((err) => {
      if (!abortController.signal.aborted) {
        setConsDBdata([]);
        const msg = err?.message || "Unknown error";
        toast.error("Error fetching data from ConsDB!", {
          description: msg,
          duration: Infinity,
        });
      }
    })
    .finally(() => {
      if (!abortController.signal.aborted) {
        setConsDBdataLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Fetch flags and comments from Exposure Log
  useEffect(() => {
    const abortController = new AbortController();

    setExposureLogDataLoading(true);

    fetchDataLogEntriesFromExposureLog(
      startDayobs,
      queryEndDayobs,
      instrument,
      abortController,
    )
    .then((exposureLogData) => {
      setExposureLogData(exposureLogData);
    })
    .catch((err) => {
      if (!abortController.signal.aborted) {
        setExposureLogData([]);
        const msg = err?.message || "Unknown error";
        toast.error("Error fetching exposure log data!", {
          description: msg,
          duration: Infinity,
        });
      }
    })
    .finally(() => {
      if (!abortController.signal.aborted) {
        setExposureLogDataLoading(false);
      }
    });

    return () => {
      abortController.abort();
    };
  }, [startDayobs, queryEndDayobs, instrument]);

  // Fetch test case details from Zephyr
  useEffect(() => {
    const abortController = new AbortController();

    if (consDBdata.length === 0) {
      return; // don't know which test cases to query
    }

    setZephyrDataLoading(true);

    // Extrace unique test cases from ConsDB data
    const testCaseKeys = [...new Set(consDBdata.map(e => e.science_program))];
    console.log("testCaseKeys: ", testCaseKeys);

    if (testCaseKeys.length === 0) {
      return; // nothing to fetch
    }
    fetchTestCases(testCaseKeys, abortController)
      .then((testCases) => {
        console.log("Test cases: ", testCases);
        setZephyrData(testCases.data);
      })
      .catch((err) => {
        if (!abortController.signal.aborted) {
          setZephyrData({});
          const msg = err?.message;
          toast.error("Error fetching test case descriptions from Zephyr", {
            description: msg,
            duration: Infinity,
          });
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setZephyrDataLoading(false);
        }
      });
  }, [consDBdata]);

  // Global loading flag
  const tableLoading =
    consDBdataLoading || exposureLogDataLoading || zephyrDataLoading;

  // Merge data sources together to form one object
  // to pass to TanStack Table.
  const dataLogTableData = useMemo(() => {
    if (tableLoading) return [];
    if (!consDBdata.length) return [];

    return mergeAllSources(
      consDBdata,
      exposureLogData,
      zephyrData
    );
  }, [tableLoading, consDBdata, exposureLogData, zephyrData]);

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
          {tableLoading ? (
            <>
              <Skeleton className="h-5 w-3/4 max-w-xl bg-stone-700" />
              <Skeleton className="h-5 w-[90%] max-w-2xl bg-stone-700" />
            </>
          ) : (
            <>
              <p>
                {dataLogTableData.length} exposures returned for {telescope}{" "}
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
          telescope={telescope}
          data={dataLogTableData}
          dataLogLoading={tableLoading}
          tableFilters={tableFilters}
        />
      </div>
      <Toaster expand={true} richColors closeButton />
    </>
  );
}

export default DataLog;
