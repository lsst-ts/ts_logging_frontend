// Custom tick label component for Exposures bar chart.
// If grouped by Science Program, and the BLOCK group has
// Zephyr/Jira documentation that can be linked to, provide that link.
// Otherwise, display a normal (or trimmed if too long) tick label.
const BarChartYAxisTick = ({
  x,
  y,
  payload,
  groupBy,
  GroupByValues,
  blockLookup,
  maxSize,
}) => {
  const fullLabel = payload.value;

  const displayLabel =
    fullLabel.length > maxSize
      ? `${fullLabel.slice(0, maxSize - 2)}...`
      : fullLabel;

  const isScienceProgram = groupBy === GroupByValues.SCIENCE_PROGRAM;

  // Get url for BLOCK links
  const mappedValue = blockLookup?.[fullLabel];
  const isLinked = isScienceProgram && !!mappedValue;
  const href = isLinked ? blockLookup?.[fullLabel]?.url : null;

  const textElement = (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={10}
      className={
        isLinked
          ? "fill-[#74d4ff] hover:fill-[#00a6f4] cursor-pointer underline"
          : "fill-white"
      }
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
