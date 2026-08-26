import { TriangleAlert } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OBSERVATORY_STATE_AVAILABILITY_STATUS } from "@/constants/OBSERVATORY_STATUS_DEFINITIONS";
import { formatDayobsStrForDisplay } from "@/utils/timeUtils";

/**
 * A warning trigger and tooltip for incomplete Observatory Status data.
 *
 * @param {Object} props
 * @param {Object} props.availability - Observatory Status availability response.
 * @param {string} [props.ariaLabel] - Accessible name for the warning trigger.
 * @param {React.ReactNode} [props.partialDetails] - Extra text for partial data.
 * @param {React.ReactNode} [props.details] - Extra text for all unavailable states.
 * @param {boolean} [props.fetchError=false] - Whether the data request failed.
 * @param {React.ReactNode} [props.errorDetails] - Extra text for a fetch error.
 * @param {string} [props.iconClassName] - Tailwind classes for the warning icon.
 */
export default function ObservatoryStatusAvailabilityWarning({
  availability,
  ariaLabel = "Observatory Status data availability warning",
  partialDetails = null,
  details = null,
  fetchError = false,
  errorDetails = null,
  iconClassName = "h-5 w-5",
}) {
  const status =
    availability?.status ?? OBSERVATORY_STATE_AVAILABILITY_STATUS.NONE;
  if (!fetchError && status === OBSERVATORY_STATE_AVAILABILITY_STATUS.FULL) {
    return null;
  }

  const availableFrom = availability?.available_from
    ? formatDayobsStrForDisplay(String(availability.available_from))
    : "the supported date range";
  const isPartial = status === OBSERVATORY_STATE_AVAILABILITY_STATUS.PARTIAL;

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
        {fetchError ? (
          <p>
            Observatory Status data could not be fetched.
            {(errorDetails ?? details) && (
              <>
                <br />
                {errorDetails ?? details}
              </>
            )}
          </p>
        ) : (
          <p>
            Observatory Status data is only available from{" "}
            <strong>{availableFrom}</strong>.
            {isPartial && partialDetails && (
              <>
                <br />
                {partialDetails}
              </>
            )}
            {details && (
              <>
                <br />
                {details}
              </>
            )}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
