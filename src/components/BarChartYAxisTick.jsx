import { getZephyrUrl } from "@/utils/utils";

// Custom tick label component for Exposures bar chart.
// If grouped by Science Program, and the Test Case group has
// Zephyr documentation that can be linked to, provide that link.
// Otherwise, display a normal (or trimmed if too long) tick label.
const BarChartYAxisTick = ({
  x,
  y,
  payload,
  groupBy,
  GroupByValues,
  testCases,
  maxSize,
}) => {
  const fullLabel = payload.value;

  const displayLabel =
    fullLabel.length > maxSize
      ? `${fullLabel.slice(0, maxSize - 2)}...`
      : fullLabel;

  const isScienceProgram = groupBy === GroupByValues.SCIENCE_PROGRAM;

  const mappedValue = testCases?.[fullLabel];
  const isLinked = isScienceProgram && !!mappedValue;

  const parentTestCase = isLinked ? fullLabel.split("_", 1)[0] : null;
  const href = isLinked ? getZephyrUrl(parentTestCase) : null;

  const textElement = (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill={isLinked ? "#74d4ff" : "#ffffff"}
      fontSize={10}
      style={{
        cursor: isLinked ? "pointer" : "default",
        textDecoration: isLinked ? "underline" : "none",
      }}
      onMouseEnter={(e) => isLinked && (e.currentTarget.style.fill = "#00a6f4")} // darker blue
      onMouseLeave={(e) => isLinked && (e.currentTarget.style.fill = "#74d4ff")} // revert
    >
      {displayLabel}
    </text>
  );

  if (!isLinked) return textElement;

  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {textElement}
    </a>
  );
};

export default BarChartYAxisTick;
