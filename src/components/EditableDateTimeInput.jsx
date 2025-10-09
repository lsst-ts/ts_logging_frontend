import { useState, useEffect } from "react";
import { DateTime } from "luxon";

import { Input } from "@/components/ui/input";

function EditableDateTimeInput({
  value,
  onValidChange,
  fullTimeRange,
  otherBound, // the "other" DateTime (start or end)
  isStart = false, // true if this is the start input
}) {
  const [draft, setDraft] = useState(value.toFormat("HH:mm  yyyy-LL-dd"));

  // Keep draft synced with external values
  useEffect(() => {
    setDraft(value.toFormat("HH:mm  yyyy-LL-dd"));
  }, [value]);

  // Validation checks
  const dt = DateTime.fromFormat(draft, "HH:mm  yyyy-LL-dd", { zone: "utc" });
  const inRange =
    dt.isValid && dt >= fullTimeRange[0] && dt <= fullTimeRange[1];

  // Check start < end
  let crossValid = true;
  if (dt.isValid && otherBound) {
    crossValid = isStart ? dt < otherBound : dt > otherBound;
  }

  const isValid = dt.isValid && inRange && crossValid;

  // Commit the change only if input is valid
  const tryCommit = () => {
    if (isValid) {
      onValidChange(dt);
      setDraft(dt.toFormat("HH:mm  yyyy-LL-dd"));
    } else {
      setDraft(value.toFormat("HH:mm  yyyy-LL-dd")); // revert
    }
  };

  return (
    <Input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={tryCommit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          tryCommit();
          e.target.blur();
        }
        if (e.key === "Escape") {
          setDraft(value.toFormat("HH:mm  yyyy-LL-dd")); // revert
          e.target.blur();
        }
      }}
      className={`w-[150px] bg-teal-800 text-center font-normal text-[12px] text-white rounded-md shadow-[2px_2px_2px_0px_#3CAE3F] focus-visible:ring-4 ${
        isValid
          ? "text-white border-none focus-visible:ring-green-500/50"
          : "text-white border border-2 border-red-500 focus-visible:ring-red-500/50"
      }`}
    />
  );
}

export default EditableDateTimeInput;
