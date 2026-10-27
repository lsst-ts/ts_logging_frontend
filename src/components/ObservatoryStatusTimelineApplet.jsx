import TimelineApplet from "@/components/TimelineApplet";
import ObservatoryStatusTimelineBody from "@/components/ObservatoryStatusTimelineBody";

/** Observatory status timeline with optional Almanac overlays and its own display state. */
function ObservatoryStatusTimelineApplet({
  loading,
  sources = {},
  required = [],
  ...timelineProps
}) {
  return (
    <TimelineApplet
      title="Timeline of Observatory State Changes"
      sources={sources}
      required={required}
      loading={loading}
      badgeAriaLabel="Observatory Status data availability warning"
      downloadAriaLabel="Download observatory status data"
      infoAriaLabel="Observatory status information"
      information="A timeline of observatory status changes. Dragging over the chart selects a time range; double-clicking resets it. The selected range is reflected in the table below."
    >
      <ObservatoryStatusTimelineBody {...timelineProps} />
    </TimelineApplet>
  );
}

export default ObservatoryStatusTimelineApplet;
