import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";

import InfoIcon from "../assets/InfoIcon.svg";

export default function MetricsCard({
  icon,
  data,
  label,
  metadata,
  tooltip,
  loading = false,
  onClick = null,
}) {
  const isClickable = onClick && !loading;

  return (
    <div
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex flex-row justify-between h-12">
        <div className="text-2xl">
          {loading ? <Skeleton className="h-6 w-20 bg-teal-700" /> : data}
        </div>
        {/* Render dynamic component and static icons */}
        {loading ? (
          <Skeleton className="h-8 w-8 rounded-full bg-teal-700" />
        ) : typeof icon === "string" ? (
          <img src={icon} alt={label} />
        ) : (
          icon
        )}
      </div>
      <div className="flex flex-row justify-between min-h-12">
        <div className="flex flex-col justify-between">
          <div className="text-md">
            {loading ? <Skeleton className="h-4 w-24 bg-teal-700" /> : label}
          </div>
          {loading ? (
            <Skeleton className="h-3 w-16 bg-teal-700" />
          ) : (
            metadata && <div className="text-sm">{metadata}</div>
          )}
        </div>
        {tooltip && !loading && (
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              {tooltip}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
