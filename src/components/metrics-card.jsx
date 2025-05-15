// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip";

// import InfoIcon from "../assets/InfoIcon.svg";

export default function MetricsCard({ icon, data, label, metadata }) {
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
        {/* Code for tooltip, currently works only for mouse hover, not by touch on tablet. */}
        {/* {tooltip &&
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="self-end min-w-4"><img src={InfoIcon}/></TooltipTrigger>
              <TooltipContent>
                <p>{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        } */}
      </div>
    </div>
  );
}
