// Narrative log mapping by telescope
export const NARRATIVE_LOG_MAP = {
  AuxTel: ["Log AuxTel", "Log LATISS", "Log AuxTel Calibration"],
  Simonyi: [
    "Log Simonyi",
    "Log LSSTCam",
    "Log ComCam",
    "Log Simonyi Calibration",
  ],
};

// SAL Index -> Event Type labels, display order and colour mappings
// Bright rainbow colours
export const SAL_INDEX_INFO = {
  0: { color: "#ffffff", label: "Narrative Log", displayIndex: null }, // not plotted
  1: { color: "#eab308", label: "MT Queue", displayIndex: 5 },
  2: { color: "#22c55e", label: "AT Queue", displayIndex: 6 },
  3: { color: "#f97316", label: "OCS Queue", displayIndex: 4 },
  4: { color: "#e41a1c", label: "EFD Error", displayIndex: 3 },
  5: { color: "#a855f7", label: "Simonyi Exposure", displayIndex: 1 },
  6: { color: "#f472b6", label: "AuxTel Exposure", displayIndex: 2 },
  7: { color: "#38bdf8", label: "Narrative Log (AuxTel)", displayIndex: 8 },
  8: { color: "#14b8a6", label: "Narrative Log (Simonyi)", displayIndex: 7 },
  9: { color: "#3b82f6", label: "Narrative Log (General)", displayIndex: 9 },
  10: { color: "#ffffff", label: "AUTOLOG", displayIndex: 10 },
};

// Attempt to group telescope events into colourblind friendly colour groups
// Not quite right yet and looks ugly!
// export const SAL_INDEX_INFO = {
//   0: { color: "#dcdcdc", label: "Narrative Log", displayIndex: null }, // not plotted
//   1: { color: "#ffbb78", label: "MT Queue", displayIndex: 5 },
//   2: { color: "#aec7e8", label: "AT Queue", displayIndex: 6 },
//   3: { color: "#bdbdbd", label: "OCS Queue", displayIndex: 4 },
//   4: { color: "#7f7f7f", label: "EFD Error", displayIndex: 3 },
//   5: { color: "#ff7f0e", label: "Simonyi Exposure", displayIndex: 1 },
//   6: { color: "#1f77b4", label: "AuxTel Exposure", displayIndex: 2 },
//   7: { color: "#c6dbef", label: "Narrative Log (AuxTel)", displayIndex: 8 },
//   8: { color: "#f7b6d1", label: "Narrative Log (Simonyi)", displayIndex: 7 },
//   9: { color: "#d9d9d9", label: "Narrative Log (General)", displayIndex: 9 },
//   10: { color: "#ffffff", label: "AUTOLOG", displayIndex: 10 },
// };
