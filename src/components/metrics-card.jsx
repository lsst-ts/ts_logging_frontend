import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import InfoIcon from "../assets/InfoIcon.svg";

export default function MetricsCard({ icon, data, label, metadata, tooltip }) {
  return (
    <div className="flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1]">
      <div className="flex flex-row justify-between h-12">
        <div className="text-2xl">{data}</div>
        {/* Render dynamic component and static icons */}
        {icon &&
          (typeof icon === "string" ? (
            <img src={icon} alt={label} />
          ) : (
            <div>{icon}</div>
          ))}
      </div>
      <div className="flex flex-row justify-between min-h-12">
        <div className="flex flex-col justify-between">
          <div className="text-md">{label}</div>
          {metadata && <div className="text-sm">{metadata}</div>}
        </div>
        {tooltip && (
          <Popover>
            <PopoverTrigger className="self-end min-w-4">
              <img src={InfoIcon} />
            </PopoverTrigger>
            <PopoverContent>{tooltip}</PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
