import { Card } from "@/components/ui/card";
import EditableDateTimeInput from "@/components/EditableDateTimeInput.jsx";

function SelectedTimeRangeBar({
  selectedTimeRange,
  setSelectedTimeRange,
  fullTimeRange,
}) {
  if (!selectedTimeRange[0] || !selectedTimeRange[1]) return null;

  return (
    <Card className="relative flex flex-row items-center justify-left bg-teal-900 text-stone-100 h-12 rounded-sm shadow-stone-900 shadow-md border-none">
      <span className="font-thin text-sm mr-4 lg:absolute lg:left-3 lg:top-1/2 lg:-translate-y-1/2 select-none">
        Selected Time Range (UTC):
      </span>
      <span className="text-white font-thin flex flex-row items-start lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:flex-row lg:items-center">
        <EditableDateTimeInput
          value={selectedTimeRange[0]}
          onValidChange={(dt) =>
            setSelectedTimeRange([dt, selectedTimeRange[1]])
          }
          fullTimeRange={fullTimeRange}
          otherBound={selectedTimeRange[1]}
          isStart={true}
        />
        <span className="mx-4">-</span>
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
  );
}

export default SelectedTimeRangeBar;
