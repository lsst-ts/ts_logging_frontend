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
    id: "RubinTVLink",
    header: "RubinTV",
    cell: ({ row }) => (
      <RubinTVLink
        dayObs={row.original["day obs"]}
        seqNum={row.original["seq num"]}
      />
    ),
    size: 100,
    filterType: null,
    meta: {
      tooltip: "Link to calibrated exposure in RubinTV. Opens in a new tab.",
    },
  }),

  // Identifying data
  columnHelper.accessor("exposure id", {
    id: "exposure_id",
    header: "Exposure Id",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: null,
    meta: {
      tooltip: "Unique identifier for the exposure.",
    },
  }),
  columnHelper.accessor("exposure name", {
    id: "exposure_name",
    header: "Exposure Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: null,
    meta: {
      tooltip: "Official name of the exposure.",
    },
  }),
  columnHelper.accessor("seq num", {
    id: "seq_num",
    header: "Seq Num",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterType: "number-range",
    meta: {
      tooltip: "Sequence number of the exposure.",
    },
  }),

  // Dayobs and timestamp
  columnHelper.accessor("day obs", {
    id: "day_obs",
    header: "Day Obs",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Day of observation.",
    },
  }),
  columnHelper.accessor("obs start", {
    id: "obs_start",
    header: "Obs Start (TAI)",
    cell: (info) => formatCellValue(info.getValue()),
    size: 240,
    filterType: "number-range",
    meta: {
      tooltip:
        "Start time (TAI) of the exposure at the fiducial center of the focal plane.",
    },
  }),
  columnHelper.accessor("exp time", {
    id: "exp_time",
    header: "Exposure Time (s)",
    cell: (info) => formatCellValue(info.getValue(), { decimals: 2 }),
    size: 160,
    filterType: "number-range",
    meta: {
      tooltip: "Spatially-averaged duration of exposure, accurate to 10ms.",
    },
  }),

  // Observation Categories
  columnHelper.accessor("science program", {
    id: "science_program",
    header: "Science Program",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "science_program",
      tooltip: "Science program.",
    },
  }),
  columnHelper.accessor("img type", {
    id: "img_type",
    header: "Obs Type",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "img_type",
      tooltip: "Type of visit taken.",
    },
  }),
  columnHelper.accessor("observation reason", {
    id: "observation_reason",
    header: "Obs Reason",
    cell: (info) => formatCellValue(info.getValue()),
    size: 160,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "observation_reason",
      tooltip: "Reason for the observation.",
    },
  }),
  columnHelper.accessor("target name", {
    id: "target_name",
    header: "Target Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 160,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      urlParam: "target_name",
      tooltip: "Target of the observation.",
    },
  }),

  // Flag Info
  columnHelper.accessor("exposure_flag", {
    id: "exposure_flag",
    header: "Flags",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Manually tagged by observers.",
    },
  }),
  columnHelper.accessor("message_text", {
    id: "message_text",
    header: "Comments",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: null,
    meta: {
      tooltip: "Comments from observers associated with flags.",
    },
  }),

  // Instrument config and environment
  columnHelper.accessor("s ra", {
    id: "s_ra",
    header: "RA",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
    meta: {
      tooltip:
        "Central Spatial Position in ICRS; Computed right ascension of CCD center.",
    },
  }),
  columnHelper.accessor("s dec", {
    id: "s_dec",
    header: "Dec",
    cell: (info) => formatCellValue(info.getValue()),
    size: 70,
    filterType: "number-range",
    meta: {
      tooltip:
        "Central Spatial Position in ICRS; Computed declination of CCD center.",
    },
  }),
  columnHelper.accessor("altitude", {
    id: "altitude",
    header: "Alt",
    cell: (info) => formatCellValue(info.getValue()),
    size: 70,
    filterType: "number-range",
    meta: {
      tooltip:
        "Altitude (deg) of focal plane center at the middle of the exposure.",
    },
  }),
  columnHelper.accessor("azimuth", {
    id: "azimuth",
    header: "Az",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
    meta: {
      tooltip:
        "Azimuth (deg) of focal plane center at the middle of the visit.",
    },
  }),
  columnHelper.accessor("sky rotation", {
    id: "sky_rotation",
    header: "Sky Rotation",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: "number-range",
    meta: {
      tooltip: "Targeted sky rotation angle (deg).",
    },
  }),
  columnHelper.accessor("airmass", {
    id: "airmass",
    header: "Airmass",
    cell: (info) => formatCellValue(info.getValue()),
    size: 90,
    filterType: "number-range",
    meta: {
      tooltip:
        "Airmass of the observed line of sight at the middle of the exposure.",
    },
  }),
  columnHelper.accessor("dimm seeing", {
    id: "dimm_seeing",
    header: "DIMM seeing",
    cell: (info) => formatCellValue(info.getValue()),
    size: 130,
    filterType: "number-range",
    meta: {
      tooltip:
        "Atmospheric seeing (arcesc) as measured by external DIMM (FWHM).",
    },
  }),
  // psf sigma median * 2.355 * [pixelScale or 2.0]
  columnHelper.accessor("psf median", {
    id: "psf_median",
    header: "Median PSF",
    cell: (info) => formatCellValue(info.getValue()),
    size: 115,
    filterType: "number-range",
    meta: {
      tooltip:
        "Median PSF FWHM (arcsec): PSF sigma (median across all detectors) * 2.355 * [pixel scale or 2.0 when pixel scale is NaN]",
    },
  }),
  columnHelper.accessor("sky bg median", {
    id: "sky_bg_median",
    header: "Sky Brightness",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "Average sky background (median across all detectors).",
    },
  }),
  columnHelper.accessor("zero point median", {
    id: "zero_point_median",
    header: "Photometric ZP",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "Photometric zero point (median across all detectors) (mag).",
    },
  }),
  columnHelper.accessor("high snr source count median", {
    id: "high_snr_source_count_median",
    header: "High SNR Source Counts",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: "number-range",
    meta: {
      tooltip:
        "Count of high signal-to-noise-ratio sources (median across all detectors).",
    },
  }),
  columnHelper.accessor("air temp", {
    id: "air_temp",
    header: "Outside Air Temp",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterType: "number-range",
    meta: {
      tooltip: "Outside air temperature in degC.",
    },
  }),
];
