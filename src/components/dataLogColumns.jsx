import { createColumnHelper } from "@tanstack/react-table";
import RubinTVLink from "@/components/RubinTVLink";
import {
  formatCellValue,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
} from "@/utils/utils";

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
        dayObs={row.original["day_obs"]}
        seqNum={row.original["seq_num"]}
      />
    ),
    size: 100,
    filterType: null,
    meta: {
      tooltip: "Link to calibrated exposure in RubinTV. Opens in a new tab.",
    },
  }),

  // Identifying data
  columnHelper.accessor("exposure_id", {
    header: "Exposure Id",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: null,
    meta: {
      tooltip: "Unique identifier for the exposure.",
    },
  }),
  columnHelper.accessor("exposure_name", {
    header: "Exposure Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: null,
    meta: {
      tooltip: "Official name of the exposure.",
    },
  }),
  columnHelper.accessor("seq_num", {
    header: "Seq Num",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterType: "number-range",
    meta: {
      tooltip: "Sequence number of the exposure.",
    },
  }),

  // Dayobs and timestamp
  columnHelper.accessor("day_obs", {
    header: "Day Obs",
    cell: (info) => formatCellValue(info.getValue()),
    size: 100,
    filterFn: matchValueOrInList,
    filterType: "string",
    meta: {
      tooltip: "Day of observation.",
    },
  }),
  columnHelper.accessor("obs_start", {
    header: "Obs Start (TAI)",
    cell: (info) => formatCellValue(info.getValue()),
    size: 240,
    filterType: "number-range",
    meta: {
      tooltip:
        "Start time (TAI) of the exposure at the fiducial center of the focal plane.",
    },
  }),
  columnHelper.accessor("exp_time", {
    header: "Exposure Time (s)",
    cell: (info) => formatCellValue(info.getValue(), { decimals: 2 }),
    size: 160,
    filterType: "number-range",
    meta: {
      tooltip: "Spatially-averaged duration of exposure, accurate to 10ms.",
    },
  }),

  // Observation Categories
  columnHelper.accessor("science_program", {
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
  columnHelper.accessor("img_type", {
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
  columnHelper.accessor("observation_reason", {
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
  columnHelper.accessor("target_name", {
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
    header: "Comments",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: null,
    meta: {
      tooltip: "Comments from observers associated with flags.",
    },
  }),

  // Instrument config and environment
  columnHelper.accessor("s_ra", {
    header: "RA",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
    meta: {
      tooltip:
        "Central Spatial Position in ICRS; Computed right ascension of CCD center.",
    },
  }),
  columnHelper.accessor("s_dec", {
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
    header: "Az",
    cell: (info) => formatCellValue(info.getValue()),
    size: 60,
    filterType: "number-range",
    meta: {
      tooltip:
        "Azimuth (deg) of focal plane center at the middle of the visit.",
    },
  }),
  columnHelper.accessor("sky_rotation", {
    header: "Sky Rotation",
    cell: (info) => formatCellValue(info.getValue()),
    size: 120,
    filterType: "number-range",
    meta: {
      tooltip: "Targeted sky rotation angle (deg).",
    },
  }),
  columnHelper.accessor("airmass", {
    header: "Airmass",
    cell: (info) => formatCellValue(info.getValue()),
    size: 90,
    filterType: "number-range",
    meta: {
      tooltip:
        "Airmass of the observed line of sight at the middle of the exposure.",
    },
  }),
  columnHelper.accessor("dimm_seeing", {
    header: "DIMM seeing",
    cell: (info) => formatCellValue(info.getValue()),
    size: 130,
    filterType: "number-range",
    meta: {
      tooltip:
        "Atmospheric seeing (arcsec) as measured by external DIMM (FWHM).",
    },
  }),
  // psf sigma median * 2.355 * [pixelScale or 0.2]
  // conversion is sigma->FWHM and from unit:pixel -> unit:arcsec
  columnHelper.accessor("psf_median", {
    header: "Median PSF",
    cell: (info) => formatCellValue(info.getValue()),
    size: 115,
    filterType: "number-range",
    meta: {
      tooltip:
        "Median PSF FWHM (arcsec): PSF sigma (median across all detectors) * " +
        PSF_SIGMA_FACTOR +
        " * [pixel scale or " +
        DEFAULT_PIXEL_SCALE_MEDIAN +
        " when pixel scale is NaN]",
    },
  }),
  columnHelper.accessor("sky_bg_median", {
    header: "Sky Brightness",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "Average sky background (median across all detectors).",
    },
  }),
  columnHelper.accessor("zero_point_median", {
    header: "Photometric ZP",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: "number-range",
    meta: {
      tooltip: "Photometric zero point (median across all detectors) (mag).",
    },
  }),
  columnHelper.accessor("high_snr_source_count_median", {
    header: "High SNR Source Counts",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: "number-range",
    meta: {
      tooltip:
        "Count of high signal-to-noise-ratio sources (median across all detectors).",
    },
  }),
  columnHelper.accessor("air_temp", {
    header: "Outside Air Temp",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterType: "number-range",
    meta: {
      tooltip: "Outside air temperature in degC.",
    },
  }),
  columnHelper.accessor("dome_temp", {
    header: "Dome Temp",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterType: "number-range",
    meta: {
      tooltip: "Temperature in Dome at M2 in degC.",
    },
  }),
];
