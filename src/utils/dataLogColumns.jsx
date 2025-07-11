import { createColumnHelper } from "@tanstack/react-table";
import RubinTVLink from "@/components/RubinTVLink";
import { formatCellValue } from "@/utils/utils";

const columnHelper = createColumnHelper();

// Exact (multple) match(es) filter function
export const matchValueOrInList = (row, columnId, filterValue) => {
  const rowValue = row.getValue(columnId);

  if (Array.isArray(filterValue)) {
    return filterValue.includes(rowValue);
  }

  return rowValue === filterValue;
};

export const dataLogColumns = [
  // Missing field: "dome_temp"

  // Link to RubinTV
  columnHelper.display({
    header: "RubinTV",
    id: "externalLink",
    cell: ({ row }) => (
      <RubinTVLink
        dayObs={row.original["day obs"]}
        seqNum={row.original["seq num"]}
      />
    ),
    size: 100,
    filterType: null,
  }),

  // Identifying data
  columnHelper.accessor("exposure id", {
    header: "Exposure Id",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: null,
  }),
  columnHelper.accessor("exposure name", {
    header: "Exposure Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: null,
  }),

  // Dayobs and timestamp
  columnHelper.accessor("day obs", {
    header: "Day Obs",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
  }),
  columnHelper.accessor("obs start", {
    header: "Obs Start",
    cell: (info) => formatCellValue(info.getValue()),
    size: 240,
    filterType: "number-range",
  }),

  // Observation Categories
  columnHelper.accessor("science program", {
    header: "Science Program",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "science_program",
    },
  }),
  columnHelper.accessor("img type", {
    header: "Obs Type",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "img_type",
    },
  }),
  columnHelper.accessor("observation reason", {
    header: "Obs Reason",
    cell: (info) => formatCellValue(info.getValue()),
    size: 160,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "observation_reason",
    },
  }),
  columnHelper.accessor("target name", {
    header: "Target Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 160,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "target_name",
    },
  }),

  // Flag Info
  columnHelper.accessor("exposure_flag", {
    header: "Flags",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
  }),
  columnHelper.accessor("message_text", {
    header: "Comments",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: null,
  }),

  // Instrument config and environment
  columnHelper.accessor("s ra", {
    header: "RA",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
  }),
  columnHelper.accessor("s dec", {
    header: "Dec",
    cell: (info) => formatCellValue(info.getValue()),
    size: 70,
    filterType: "number-range",
  }),
  columnHelper.accessor("altitude", {
    header: "Alt",
    cell: (info) => formatCellValue(info.getValue()),
    size: 70,
    filterType: "number-range",
  }),
  columnHelper.accessor("azimuth", {
    header: "Az",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
  }),
  columnHelper.accessor("sky rotation", {
    header: "Sky Rotation",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: "number-range",
  }),
  columnHelper.accessor("airmass", {
    header: "Airmass",
    cell: (info) => formatCellValue(info.getValue()),
    size: 90,
    filterType: "number-range",
  }),
  columnHelper.accessor("dimm seeing", {
    header: "DIMM seeing",
    cell: (info) => formatCellValue(info.getValue()),
    size: 130,
    filterType: "number-range",
  }),
  // psf sigma median * 2.355
  columnHelper.accessor("psf median", {
    header: "Median PSF",
    cell: (info) => formatCellValue(info.getValue()),
    size: 115,
    filterType: "number-range",
    meta: {
      tooltip: "Median PSF (FWHM) = psf sigma median * 2.355",
    },
  }),
  columnHelper.accessor("sky bg median", {
    header: "Sky Brightness",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "sky bg median",
    },
  }),
  columnHelper.accessor("zero point median", {
    header: "Photometric ZP",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "zero point median",
    },
  }),
  columnHelper.accessor("high snr source count median", {
    header: "High SNR Source Counts",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: "number-range",
    meta: {
      tooltip: "high snr source count median",
    },
  }),
  columnHelper.accessor("air temp", {
    header: "Outside Air Temp",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterType: "number-range",
  }),
];
