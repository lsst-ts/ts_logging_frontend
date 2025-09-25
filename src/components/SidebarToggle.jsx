import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar.jsx";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/TooltipContentCustom.jsx";

export function SidebarToggle() {
  const { open } = useSidebar();

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        {/* Button */}
        <TooltipTrigger asChild>
          <SidebarTrigger className="color-teal-500 fixed hover:bg-stone-700" />
        </TooltipTrigger>
        {/* Hover text */}
        <TooltipContent
          className="flex items-center whitespace-nowrap gap-1 fixed"
          side="right"
        >
          <span className="flex items-center">
            {open ? "Close sidebar (" : "Open sidebar ("}
          </span>
          <code className="font-bold flex items-center">
            <span className="text-lg align-[-2px]">⌘</span>+B
          </code>
          {" or "}
          <code className="font-bold">Ctrl+B</code>
          {")"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
