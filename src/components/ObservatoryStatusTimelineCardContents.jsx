import { Skeleton } from "@/components/ui/skeleton";

import ObservatoryStatusTimeline from "@/components/ObservatoryStatusTimeline";
import { getStatusLabel } from "@/utils/observatoryStatusUtils";
import {
  METRIC_STATES,
  SERIES_ORDER,
  STATUS_TIMELINE_DIMENSIONS,
  STATUS_TIMELINE_VARIABLE_DIMENSIONS,
  STATUS_TIMELINE_MARGINS,
} from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";

/**
 * Shared contents of the Observatory Status timeline card.
 *
 * Renders the state-metric label column alongside the timeline chart, plus
 * the loading/availability states. Used directly by the Context Feed page
 * (which provides its own surrounding card) and embedded in the
 * ObservatoryStatusTimelineApplet for the Time Accounting page.
 *
 * @param {Object} props
 * @param {Array} [props.entries=[]] Observatory status entries.
 * @param {number[]} [props.twilightValues=[]] 12° twilight times in ms.
 * @param {number[]} [props.twilight0DegValues=[]] 0° twilight times in ms.
 * @param {[DateTime, DateTime]} props.fullTimeRange
 * @param {[DateTime, DateTime]} props.selectedTimeRange
 * @param {Function} props.setSelectedTimeRange
 * @param {string} [props.brushGroup] Shared brush-group id for cross-instance sync.
 * @param {Object} [props.obsStatusMetrics={}] Per-state hour metrics.
 * @param {number} [props.nightHours=null] Total night hours.
 * @param {boolean} [props.loading=false] Whether data is loading.
 * @param {string} [props.availabilityStatus="full"] "full" | "partial" | "none".
 * @param {string} [props.warningText=""] Message shown when data is unavailable.
 * @param {boolean} [props.fullScreen=false] Whether rendered in the full-screen variant.
 */
function ObservatoryStatusTimelineCardContents({
  entries = [],
  twilightValues = [],
  twilight0DegValues = [],
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  brushGroup,
  obsStatusMetrics = {},
  nightHours = null,
  loading = false,
  availabilityStatus = "full",
  warningText = "",
  fullScreen = false,
}) {
  const variableDimensions = fullScreen
    ? STATUS_TIMELINE_VARIABLE_DIMENSIONS.FULL_SCREEN
    : STATUS_TIMELINE_VARIABLE_DIMENSIONS.APPLET;

  if (loading) {
    return <Skeleton className="w-full h-20 bg-stone-900 rounded-md" />;
  }

  if (availabilityStatus === "none") {
    return (
      <p className="text-sm text-stone-400 text-center py-4">{warningText}</p>
    );
  }

  return (
    <div className="flex flex-row min-w-0">
      {/* State Labels */}
      <div
        className="flex flex-col w-45"
        style={{
          // Centre the first label on the first chart row, which
          // sits one row height below the top margin
          paddingTop: `${
            STATUS_TIMELINE_MARGINS.top +
            variableDimensions.SERIES_ROW_HEIGHT / 2
          }px`,
        }}
      >
        {SERIES_ORDER.map((stateName) => (
          <div
            key={stateName}
            className="flex items-center justify-between"
            style={{
              height: `${variableDimensions.SERIES_ROW_HEIGHT}px`,
            }}
          >
            <span
              className="text-stone-200"
              style={{ fontSize: variableDimensions.ROW_LABEL_FONT_SIZE }}
            >
              {getStatusLabel(stateName)}
            </span>
            <span className="text-stone-200 tabular-nums">
              {!METRIC_STATES.includes(stateName)
                ? ""
                : obsStatusMetrics?.[stateName.toLowerCase()] != null
                  ? obsStatusMetrics[stateName.toLowerCase()].toFixed(2)
                  : "—"}
            </span>
          </div>
        ))}
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: `${STATUS_TIMELINE_DIMENSIONS.METRICS_TOTAL_ROW_GAP}px`,
          }}
        >
          <span
            className="text-stone-200"
            style={{ fontSize: variableDimensions.NIGHT_HOURS_FONT_SIZE }}
          >
            Night Hours
          </span>
          <span className="text-stone-400 tabular-nums">
            {nightHours != null ? nightHours.toFixed(2) : "—"}
          </span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <ObservatoryStatusTimeline
          entries={entries}
          twilightValues={twilightValues}
          twilight0DegValues={twilight0DegValues}
          fullTimeRange={fullTimeRange}
          selectedTimeRange={selectedTimeRange}
          setSelectedTimeRange={setSelectedTimeRange}
          brushGroup={brushGroup}
          fullScreen={fullScreen}
        />
      </div>
    </div>
  );
}

export default ObservatoryStatusTimelineCardContents;
