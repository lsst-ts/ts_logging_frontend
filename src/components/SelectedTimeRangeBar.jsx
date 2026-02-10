import { Card } from "@/components/ui/card";
import EditableDateTimeInput from "@/components/EditableDateTimeInput.jsx";

function SelectedTimeRangeBar({
  selectedTimeRange,
  setSelectedTimeRange,
  fullTimeRange,
}) {
  if (!selectedTimeRange[0] || !selectedTimeRange[1]) return null;

  return (
    <div className="@container">
      <Card className="flex flex-col @[700px]:grid @[700px]:grid-cols-1 items-center bg-teal-900 text-stone-100 py-2 @[700px]:py-3 rounded-sm shadow-stone-900 shadow-md border-none px-3 gap-1 @[700px]:gap-0">
        <span className="font-thin text-sm select-none @[700px]:col-start-1 @[700px]:row-start-1 @[700px]:self-center @[700px]:justify-self-start">
          Selected Time Range (UTC):
        </span>
        <span className="text-white font-thin flex flex-col @sm:flex-row items-center gap-1 @sm:gap-0 @[700px]:col-start-1 @[700px]:row-start-1 @[700px]:justify-self-center">
          <EditableDateTimeInput
            value={selectedTimeRange[0]}
            onValidChange={(dt) =>
              setSelectedTimeRange([dt, selectedTimeRange[1]])
            }
            fullTimeRange={fullTimeRange}
            otherBound={selectedTimeRange[1]}
            isStart={true}
          />
          <span className="block text-center @sm:inline @sm:mx-4">-</span>
          <EditableDateTimeInput
            value={selectedTimeRange[1]}
            onValidChange={(dt) =>
              setSelectedTimeRange([selectedTimeRange[0], dt])
            }
            fullTimeRange={fullTimeRange}
            otherBound={selectedTimeRange[0]}
            isStart={false}
          />
        </span>
      </Card>
    </div>
  );
}

export default SelectedTimeRangeBar;
