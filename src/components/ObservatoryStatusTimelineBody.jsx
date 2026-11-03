import ObservatoryStatusTimeline from "@/components/ObservatoryStatusTimeline";
import { useAppletState } from "@/components/AppletCard";
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
 * Renders the state-metric label column alongside the timeline chart.
 * Embedded in the ObservatoryStatusTimelineApplet for the Time Accounting
 * and Context Feed pages, so both share identical rendering.
 *
 * The display state is read from the AppletCard context via useAppletState,
 * so loading and error are handled by AppletCard's AppletStateBody and only
 * `ready`/`noData` reach this content; the noData message is drawn in-plot.
 *
 * @param {Object} props
 * @param {[DateTime, DateTime]} props.fullTimeRange
 * @param {[DateTime, DateTime]} props.selectedTimeRange
 * @param {Function} props.setSelectedTimeRange
 * @param {string} props.brushGroup Shared brush-group id for cross-instance sync.
 * @param {Array} [props.entries=[]] Observatory status entries.
 * @param {number[]} [props.twilightValues=[]] 12° twilight times in ms.
 * @param {number[]} [props.twilight0DegValues=[]] 0° twilight times in ms.
 * @param {Object} [props.obsStatusMetrics={}] Per-state hour metrics.
 * @param {number} [props.nightHours=null] Total night hours.
 * @param {boolean} [props.fullScreen=false] Whether rendered in the full-screen variant.
 */
function ObservatoryStatusTimelineBody({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  brushGroup,
  entries = [],
  twilightValues = [],
  twilight0DegValues = [],
  obsStatusMetrics = {},
  nightHours = null,
  fullScreen = false,
}) {
  const variableDimensions = fullScreen
    ? STATUS_TIMELINE_VARIABLE_DIMENSIONS.FULL_SCREEN
    : STATUS_TIMELINE_VARIABLE_DIMENSIONS.APPLET;

  const { state, message } = useAppletState();

  return (
    <div className="flex flex-row min-w-0">
      <div
        className="flex flex-col w-45"
        style={{
          // Align labels with chart rows.
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
          noDataMessage={state === "noData" ? message : ""}
        />
      </div>
    </div>
  );
}

export default ObservatoryStatusTimelineBody;
