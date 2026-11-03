import { Checkbox } from "@/components/ui/checkbox";
import { useAppletState } from "@/components/AppletCard";
import TimelineChart from "@/components/TimelineChart";
import { ContextMenuWrapper } from "@/components/ContextMenuWrapper";
import { CATEGORY_INDEX_INFO } from "@/constants/CONTEXT_FEED_DEFINITIONS";

function ContextFeedTimelineBody({
  timelineData,
  columnFilters,
  toggleEvents,
  contextMenuItems,
  twilightValues,
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
  brushGroup,
}) {
  const { state, message } = useAppletState();

  return (
    <div className="flex flex-row min-w-0">
      {/* Event Type Checkboxes */}
      <div className="mt-8 flex flex-col gap-1 w-45">
        {Object.entries(CATEGORY_INDEX_INFO)
          .filter(([, info]) => info.displayIndex != null) // exclude AUTOLOG
          .sort(
            ([, aInfo], [, bInfo]) =>
              (aInfo.displayIndex ?? 0) - (bInfo.displayIndex ?? 0),
          )
          .map(([key, info]) => {
            const checked = columnFilters
              .find((f) => f.id === "event_type")
              ?.value.includes(info.label);
            return (
              <div
                key={key}
                className="flex items-center space-x-2 opacity-100"
              >
                <Checkbox
                  aria-label={info.label}
                  checked={!!checked}
                  onCheckedChange={(checked) => toggleEvents(key, !!checked)}
                  style={{ borderColor: info.color }}
                  className="cursor-pointer"
                />
                <span className="text-xs text-stone-200">{info.label}</span>
              </div>
            );
          })}
      </div>
      <div className="flex-1 min-w-0">
        <ContextMenuWrapper menuItems={contextMenuItems}>
          <TimelineChart
            data={timelineData}
            twilightValues={twilightValues}
            fullTimeRange={fullTimeRange}
            selectedTimeRange={selectedTimeRange}
            setSelectedTimeRange={setSelectedTimeRange}
            brushGroup={brushGroup}
            noDataMessage={state === "noData" ? message : ""}
          />
        </ContextMenuWrapper>
      </div>
    </div>
  );
}

export default ContextFeedTimelineBody;
