import { useState } from "react";
import AppletCard from "@/components/AppletCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import DownloadIcon from "../assets/DownloadIcon.svg";
import InfoIcon from "../assets/InfoIcon.svg";

/** Shared shell for timelines: source states, loading, header actions and visibility. */
function TimelineApplet({
  title,
  sources,
  required,
  loading,
  badgeAriaLabel,
  downloadAriaLabel,
  infoAriaLabel,
  information,
  children,
}) {
  const [visible, setVisible] = useState(true);
  return (
    <AppletCard
      title={title}
      cardClassName="mt-2"
      open={visible}
      loading={loading}
      sources={sources}
      required={required}
      badgeAriaLabel={badgeAriaLabel}
      skeleton={
        <div className="flex-grow w-full h-full">
          <Skeleton className="h-full min-h-[180px] bg-stone-900" />
        </div>
      }
      actions={
        <>
          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
              aria-label={downloadAriaLabel}
            >
              <img src={DownloadIcon} alt="Download" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700">
              This is a placeholder for the download/export button.
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger
              className="min-w-4 cursor-pointer"
              aria-label={infoAriaLabel}
            >
              <img src={InfoIcon} alt="Information" />
            </PopoverTrigger>
            <PopoverContent className="bg-black text-white text-sm border-yellow-700 w-[350px]">
              <p>{information}</p>
            </PopoverContent>
          </Popover>
          <Button
            onClick={() => setVisible((previous) => !previous)}
            className="bg-stone-300 text-teal-900 font-sm h-6 rounded-md px-2 shadow-[3px_3px_3px_0px_#0d9488] cursor-pointer hover:bg-stone-200 hover:shadow-[4px_4px_8px_0px_#0d9488] transition-all duration-200"
          >
            {visible ? "Hide Timeline" : "Show Timeline"}
          </Button>
        </>
      }
    >
      {children}
    </AppletCard>
  );
}

export default TimelineApplet;
