import React from "react";
import MetricsCard from "./metrics-card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogHeader,
} from "@/components/ui/dialog";

function DialogMetricsCard({
  icon,
  data,
  label,
  metadata,
  tooltip,
  loading = false,
  dialogContent,
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
        <DialogContent className="bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{label}</DialogTitle>
          </DialogHeader>
          {dialogContent ?? (
            <div>
              <h2 className="text-lg font-semibold mb-2">
                Details for {label}
              </h2>
              <p className="text-sm">More information goes here.</p>
            </div>
          )}
          <DialogClose className="mt-4">Close</DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
export default DialogMetricsCard;
