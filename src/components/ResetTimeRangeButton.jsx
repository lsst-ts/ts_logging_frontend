import { Button } from "@/components/ui/button";

function ResetTimeRangeButton({
  fullTimeRange,
  selectedTimeRange,
  setSelectedTimeRange,
}) {
  // Convert datetime inputs to millis format for plots ====
  const xMinMillis = fullTimeRange[0]?.toMillis();
  const xMaxMillis = fullTimeRange[1]?.toMillis();
  const selectedMinMillis = selectedTimeRange[0]?.toMillis();
  const selectedMaxMillis = selectedTimeRange[1]?.toMillis();

  if (!xMinMillis || !xMaxMillis) return null;
  // --------------------------------------------------------

  return (
    <div className="flex flex-row justify-between mt-4 gap-8 text-white">
      <Button
        className="text-sm bg-white text-black w-30 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                flex justify-center items-center py-2 px-4 
                hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
        onClick={() => setSelectedTimeRange(fullTimeRange)}
        disabled={
          selectedMinMillis === xMinMillis && selectedMaxMillis === xMaxMillis
        }
      >
        Zoom Out
      </Button>
    </div>
  );
}

export default ResetTimeRangeButton;
