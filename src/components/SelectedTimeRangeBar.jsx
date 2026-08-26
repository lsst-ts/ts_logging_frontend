import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import EditableDateTimeInput from "@/components/EditableDateTimeInput.jsx";

function SelectedTimeRangeBar({
  selectedTimeRange,
  setSelectedTimeRange,
  fullTimeRange,
  rightContent,
  rightContentLoading = false,
  timezone = "UTC",
}) {
  if (!selectedTimeRange[0] || !selectedTimeRange[1]) return null;

  return (
    <div className="@container">
      <Card className="flex flex-col @[700px]:grid @[700px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center bg-teal-900 text-stone-100 py-2 @[700px]:py-3 rounded-sm shadow-stone-900 shadow-md border-none px-3 gap-2 @[700px]:gap-x-4 @[700px]:gap-y-0">
        <span className="font-thin text-sm select-none @[700px]:justify-self-start">
          Selected Time Range ({timezone}):
        </span>
        <span className="text-white font-thin flex flex-col @sm:flex-row items-center gap-1 @sm:gap-0 @[700px]:justify-self-center">
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
        {(rightContentLoading || rightContent) && (
          <span className="font-thin text-sm select-none w-full max-w-64 text-center break-words @[700px]:text-right @[700px]:justify-self-end">
            {rightContentLoading ? (
              <Skeleton className="h-5 w-full bg-teal-700 inline-block align-middle" />
            ) : (
              rightContent
            )}
          </span>
        )}
      </Card>
    </div>
  );
}

export default SelectedTimeRangeBar;
