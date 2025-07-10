import React from "react";
import MetricsCard from "./metrics-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
import { XIcon } from "lucide-react";

function DialogMetricsCard({
  icon,
  data,
  label,
  metadata,
  tooltip,
  loading = false,
  dialogContent,
  dialogTitle = "Details",
  dialogDescription = "Description goes here",
}) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <>
      <MetricsCard
        icon={icon}
        data={data}
        label={label}
        metadata={metadata}
        tooltip={tooltip}
        loading={loading}
        dialogContent={dialogContent}
        onClick={() => setIsOpen(true)}
      />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          className="bg-sky-750 text-white font-light p-4 rounded-lg
               shadow-[0px_4px_4px_0px_#00000040,4px_4px_16px_4px_#006DA8B2]
               border-4 border-[#0C4A47] p-8
               !w-[95vw] !max-w-7xl "
        >
          <DialogHeader>
            <DialogTitle className="flex flex-row text-2xl justify-between">
              <div className="uppercase">{dialogTitle}</div>
              <div>
                <img src={icon} alt={dialogTitle} />
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {dialogDescription}
            </DialogDescription>
          </DialogHeader>
          {dialogContent ?? (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Details for {label}
              </h2>
              <p className="text-sm">More information goes here.</p>
            </div>
          )}
          <DialogClose className="ml-auto items-center mt-4 mr-4 w-[150px] h-10 justify-between font-normal rounded-xs border border-1 shadow-[4px_4px_4px_0px_#FF7E00] flex p-2 hover:shadow-[6px_6px_8px_0px_#FF7E00] hover:scale-102 transition-all duration-200">
            <span className="text-xl">Close</span>
            <span className="w-5 h-5">
              <XIcon />
            </span>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default DialogMetricsCard;
