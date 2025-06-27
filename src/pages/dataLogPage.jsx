import { DateTime } from "luxon";
import { toast } from "sonner";
import { useState, useEffect } from "react";

import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { AppSidebar } from "@/components/app-sidebar.jsx";
import DataLogTable from "@/components/dataLogTable.jsx";

import {
  fetchDataLogEntriesFromConsDB,
  fetchDataLogEntriesFromExposureLog,
} from "@/utils/fetchUtils";
import {
  getDayobsStr,
  getDatetimeFromDayobsStr,
  formatCellValue,
  mergeDataLogSources,
} from "@/utils/utils";

export default function Layout({ children }) {
  // Inputs

  const [instrument, setInstrument] = useState("LSSTCam");
  const [dayobs, setDayobs] = useState(
    DateTime.utc().minus({ days: 1 }).toJSDate(),
  );
  const [noOfNights, setNoOfNights] = useState(1);

  // Data
  const [dataLogEntries, setDataLogEntries] = useState([]);
  const [dataLogLoading, setDataLogLoading] = useState(true);

  // User Input Handlers

  const handleInstrumentChange = (inst) => {
    setInstrument(inst);
  };

  const handleDayobsChange = (date) => {
    setDayobs(date);
  };

  const handleNoOfNightsChange = (nightsCount) => {
    setNoOfNights(nightsCount);
  };

  // Columns for Data Log Table
  const columns = [
    // Missing fields:
    //      "dome_temp",
    //      "test case it was scheduled in",
    {
      accessorKey: "exposure id",
      header: "Exposure Id",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "exposure name",
      header: "Exposure Name",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "s ra",
      header: "RA",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "s dec",
      header: "Dec",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "altitude",
      header: "Alt",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "azimuth",
      header: "Az",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "sky rotation",
      header: "Sky Rotation",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "airmass",
      header: "Airmass",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "psf trace radius delta median",
      header: "PSF/Seeing",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "sky bg median",
      header: "Sky Brightness",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "zero point median",
      header: "Photometric ZP",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "high snr source count median",
      header: "Source Counts",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "air temp",
      header: "Outside Air Temp",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "img type",
      header: "Obs Type",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "instrument",
      header: "Instrument",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "exposure_flag",
      header: "Flags",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "message_text",
      header: "Comments",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    // Extras:
    {
      accessorKey: "science program",
      header: "Science Program",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "observation reason",
      header: "Obs Reason",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "target name",
      header: "Target Name",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "obs start",
      header: "Obs Start",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
    {
      accessorKey: "day obs",
      header: "Day Obs",
      cell: ({ getValue }) => formatCellValue(getValue()),
    },
  ];

  // On Change Handlers
  useEffect(() => {
    // To cancel previous fetch if still in progress
    const abortController = new AbortController();

    // Trigger loading skeletons
    setDataLogLoading(true);

    // TODO: Why is only dayobs being checked for existence?
    let dayobsStr = getDayobsStr(dayobs);
    if (!dayobsStr) {
      toast.error("No Date Selected! Please select a valid date.");
      setDataLogLoading(false);
      //   setFlagsLoading(false);
      return;
    }

    // TODO: This should go in utils.jsx
    // Get correct date format for fetching data
    let dateFromDayobs = getDatetimeFromDayobsStr(dayobsStr);
    let startDate = dateFromDayobs.minus({ days: noOfNights - 1 });
    let startDayobs = startDate.toFormat("yyyyLLdd");
    let endDate = dateFromDayobs.plus({ days: 1 });
    let endDayobs = endDate.toFormat("yyyyLLdd");

    // Fetch data from both sources
    Promise.all([
      fetchDataLogEntriesFromConsDB(
        startDayobs,
        endDayobs,
        instrument,
        abortController,
      ),
      fetchDataLogEntriesFromExposureLog(
        startDayobs,
        endDayobs,
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
  }, [dayobs, noOfNights, instrument]); // Dependencies

  return (
    <>
      <SidebarProvider>
        {/* Sidebar */}
        <AppSidebar
          dayobs={dayobs}
          onDayobsChange={handleDayobsChange}
          noOfNights={noOfNights}
          onNoOfNightsChange={handleNoOfNightsChange}
          instrument={instrument}
          onInstrumentChange={handleInstrumentChange}
        />

        {/* Main Content */}
        <main className="w-full bg-stone-800">
          {/* Sidebar Button (Show/Hide) */}
          <SidebarTrigger className="color-teal-500 fixed hover:bg-sky-900 transition-colors duration-200" />
          {/* TODO: Do we need this? */}
          {children}

          {/* Data Log =========================================== */}
          <div className="flex flex-col w-full p-8 gap-8">
            {/* Panel of info, user controls? */}
            <h1 className="text-white text-[100px] font-thin text-center">
              Data Log.
            </h1>
            {/* Table */}
            <DataLogTable
              columns={columns}
              data={dataLogEntries}
              dataLogLoading={dataLogLoading}
            />
          </div>
          {/* ==================================================== */}

          {/* Error/Warning Pop-Up Messages */}
          <Toaster expand={true} richColors closeButton />
        </main>
      </SidebarProvider>
    </>
  );
}
