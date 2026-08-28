import { TriangleAlert } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * An icon-only warning button with explanatory tooltip content.
 *
 * @param {Object} props
 * @param {string} props.ariaLabel - Accessible name for the warning button.
 * @param {React.ReactNode} props.children - Tooltip content.
 * @param {string} [props.iconClassName] - Tailwind classes for the warning icon.
 */
export default function WarningTooltip({
  ariaLabel,
  children,
  iconClassName = "h-5 w-5",
}) {
  if (!children) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className="inline-flex shrink-0 cursor-help text-yellow-500"
          onClick={(event) => event.stopPropagation()}
        >
          <TriangleAlert className={iconClassName} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{children}</p>
      </TooltipContent>
    </Tooltip>
  );
}
