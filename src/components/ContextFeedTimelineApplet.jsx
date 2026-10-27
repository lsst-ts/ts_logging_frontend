import TimelineApplet from "@/components/TimelineApplet";
import ContextFeedTimelineBody from "@/components/ContextFeedTimelineBody";

/** Event timeline with optional Almanac overlays and its own display state. */
function ContextFeedTimelineApplet({
  loading,
  sources = {},
  required = [],
  ...timelineProps
}) {
  return (
    <TimelineApplet
      title="Timeline of exposures, scripts, errors and narrations."
      sources={sources}
      required={required}
      loading={loading}
      badgeAriaLabel="Context feed data availability warning"
      downloadAriaLabel="Download context feed data"
      infoAriaLabel="Context feed timeline information"
      information="A timeline of summit events, contextualized by narrative logs. Dragging over the chart selects a time range; double-clicking resets it. The selected range is reflected in the table below."
    >
      <ContextFeedTimelineBody {...timelineProps} />
    </TimelineApplet>
  );
}

export default ContextFeedTimelineApplet;
