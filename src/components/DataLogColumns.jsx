import { createColumnHelper } from "@tanstack/react-table";
import RubinTVLink from "@/components/RubinTVLink";
import {
  formatCellValue,
  DEFAULT_PIXEL_SCALE_MEDIAN,
  PSF_SIGMA_FACTOR,
} from "@/utils/utils";
import { matchValueOrInList } from "@/utils/tableUtils";

const columnHelper = createColumnHelper();

// Columns common to both telescopes
const commonColumns = [
  // Link to RubinTV
  columnHelper.display({
    id: "RubinTVLink",
    header: "RubinTV",
    cell: ({ row }) => (
      <RubinTVLink
        dayObs={row.original.day_obs}
        seqNum={row.original.seq_num}
        exposureName={row.original.exposure_name}
      />
    ),
    size: 140,
    filterType: null,
    meta: {
      tooltip: "Link to RubinTV. Opens in a new tab.",
    },
  }),

  // Identifying data
  columnHelper.accessor("exposure_name", {
    header: "Exposure Name",
    cell: (info) => formatCellValue(info.getValue()),
    size: 200,
    filterType: null,
    meta: {
      tooltip: "Official name of the exposure.",
    },
  }),
  columnHelper.accessor("exposure_id", {
    header: "Exposure Id",
    cell: (info) => formatCellValue(info.getValue()),
    size: 140,
    filterType: null,
    meta: {
      tooltip: "Unique identifier for the exposure.",
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

  // Dayobs and timestamp
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
  columnHelper.accessor("obs_end", {
    header: "Obs End (TAI)",
    cell: (info) => formatCellValue(info.getValue()),
    size: 240,
    filterType: "number-range",
    meta: {
      tooltip:
        "End time (TAI) of the exposure at the fiducial center of the focal plane.",
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
  columnHelper.accessor("air_temp", {
    header: "Outside Air Temp",
    cell: (info) => formatCellValue(info.getValue()),
    size: 150,
    filterType: "number-range",
    meta: {
      tooltip: "Outside air temperature in degC.",
    },
  }),
  columnHelper.accessor("can_see_sky", {
    header: "Can See Sky",
    cell: (info) => formatCellValue(info.getValue()),
    size: 90,
    filterType: "string",
    filterFn: matchValueOrInList,
    meta: {
      tooltip: "Whether the observation can see sky or not.",
    },
  }),
];

// Telescope-specific columns
const dataLogColumns = {
  Simonyi: [
    ...commonColumns,
    columnHelper.accessor("physical_filter", {
      header: "Filter",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterFn: matchValueOrInList,
      filterType: "string",
      meta: {
        tooltip:
          "ID of physical filter, the filter associated with a particular instrument.",
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
    columnHelper.accessor("mt_salindex112_temperature_0_mean", {
      header: "Dome Temp",
      cell: (info) => formatCellValue(info.getValue()),
      size: 100,
      filterType: "number-range",
      meta: {
        tooltip: "Temperature in Dome at M2 in degC.",
      },
    }),
  ],
  AuxTel: [...commonColumns],
};

// Default visibility per telescope
const defaultColumnVisibility = {
  Simonyi: {
    RubinTVLink: true,
    exposure_id: true,
    exposure_name: false,
    seq_num: false,
    day_obs: false,
    science_program: true,
    observation_reason: true,
    img_type: true,
    can_see_sky: true,
    target_name: true,
    obs_start: true,
    obs_end: false,
    exp_time: true,
    physical_filter: true,
    exposure_flag: true,
    message_text: true,
    s_ra: true,
    s_dec: true,
    altitude: true,
    azimuth: true,
    sky_rotation: true,
    airmass: true,
    dimm_seeing: true,
    psf_median: true,
    sky_bg_median: true,
    zero_point_median: true,
    high_snr_source_count_median: true,
    air_temp: true,
    dome_temp: true,
  },
  AuxTel: {
    RubinTVLink: true,
    exposure_id: false,
    exposure_name: true,
    seq_num: false,
    day_obs: false,
    science_program: true,
    observation_reason: true,
    img_type: true,
    can_see_sky: true,
    target_name: true,
    obs_start: true,
    obs_end: false,
    exp_time: true,
    exposure_flag: true,
    message_text: true,
    s_ra: true,
    s_dec: true,
    altitude: true,
    azimuth: true,
    sky_rotation: true,
    airmass: true,
    dimm_seeing: true,
    air_temp: false,
  },
};

// Default column order per telescope
const defaultColumnOrder = {
  Simonyi: [
    "RubinTVLink",
    "exposure_id",
    "exposure_name",
    "day_obs",
    "seq_num",
    "science_program",
    "observation_reason",
    "img_type",
    "can_see_sky",
    "target_name",
    "obs_start",
    "obs_end",
    "exp_time",
    "physical_filter",
    "exposure_flag",
    "message_text",
    "s_ra",
    "s_dec",
    "altitude",
    "azimuth",
    "sky_rotation",
    "airmass",
    "dimm_seeing",
    "psf_median",
    "sky_bg_median",
    "zero_point_median",
    "high_snr_source_count_median",
    "air_temp",
    "dome_temp",
  ],
  AuxTel: [
    "RubinTVLink",
    "exposure_id",
    "exposure_name",
    "day_obs",
    "seq_num",
    "science_program",
    "observation_reason",
    "img_type",
    "can_see_sky",
    "target_name",
    "obs_start",
    "obs_end",
    "exp_time",
    "exposure_flag",
    "message_text",
    "s_ra",
    "s_dec",
    "altitude",
    "azimuth",
    "sky_rotation",
    "airmass",
    "dimm_seeing",
    "air_temp",
  ],
};

export { dataLogColumns, defaultColumnVisibility, defaultColumnOrder };
