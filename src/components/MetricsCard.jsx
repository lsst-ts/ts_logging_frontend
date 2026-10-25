import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import WarningTooltip from "@/components/WarningTooltip";

import InfoIcon from "../assets/InfoIcon.svg";

/**
 * Generic metric card used across the Digest page.
 *
 * `data` is the ready-state display value; the resolved display state decides
 * whether a warning badge appears next to it. A warning badge is shown on `error`
 * (required source fetch failure) and on `ready` with a message.
 *
 * @param {Object} props
 * @param {string} props.data Ready-state display value (Digest formats `--`,
 *   `0`, etc. per state before passing it).
 * @param {string} props.state The resolved display state ("loading"|"error"|"noData"|"ready").
 * @param {string} [props.message] The resolved display message (for warnings).
 * @param {string} [props.warningAriaLabel] Accessible name for the warning button.
 */
export default function MetricsCard({
  icon,
  data,
  label,
  metadata,
  tooltip,
  state = "ready",
  message = "",
  warningAriaLabel = "data availability warning",
  loading = false,
  onClick = null,
}) {
  const isClickable = onClick && !loading;
  const showWarning =
    !loading && (state === "error" || state === "ready") && message;

  return (
    <div
      data-slot="metrics-card"
      onClick={isClickable ? onClick : undefined}
      className={`flex flex-col justify-between bg-teal-900 text-white font-light p-4 rounded-lg shadow-[4px_4px_4px_0px_#0369A1] transition hover:opacity-90 ${
        isClickable ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex flex-row justify-between h-12">
        <div className="flex gap-2 text-2xl h-8 place-items-center-safe">
          {loading ? (
            <Skeleton className="h-6 w-20 bg-teal-700" />
          ) : (
            <span data-slot="metrics-card-value">{data}</span>
          )}
          {showWarning && (
            <WarningTooltip ariaLabel={warningAriaLabel}>
              {message}
            </WarningTooltip>
          )}
        </div>
        {/* Render dynamic component and static icons */}
        {typeof icon === "string" ? (
          <img src={icon} alt={label} />
        ) : loading ? (
          <Skeleton className="h-[40px] w-[40px] rounded-full border-8 border-teal-700 bg-transparent" />
        ) : (
          icon
        )}
      </div>
      <div className="flex flex-row justify-between min-h-12">
        <div className="flex flex-col justify-between">
          <div data-slot="metrics-card-label" className="text-md">
            {label}
          </div>
          {loading ? (
            <Skeleton className="h-3 w-16 bg-teal-700" />
          ) : (
            metadata && <div className="text-sm">{metadata}</div>
          )}
        </div>
        {tooltip && (
          <Popover>
            <PopoverTrigger
              className="self-end min-w-4"
              /* Prevents click from propagating to the card 
              to show the tooltip rather than open the dialog*/
              onClick={(e) => e.stopPropagation()}
            >
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
