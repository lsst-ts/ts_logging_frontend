function ToggleExpandCollapseRows({
  table,
  expanded,
  setExpanded,
  rowNoun = "Groups",
}) {
  // Walk the row model recursively to collect the ids of every expandable row
  // (grouped rows, or parent rows with expandable sub-rows).
  function getAllExpandableRowIds(rows) {
    const ids = [];
    for (const row of rows) {
      if (row.getCanExpand()) {
        ids.push(row.id);
        if (row.subRows?.length) {
          ids.push(...getAllExpandableRowIds(row.subRows));
        }
      } else if (row.subRows?.length) {
        ids.push(...getAllExpandableRowIds(row.subRows));
      }
    }
    return ids;
  }

  const allExpandableRowIds = getAllExpandableRowIds(table.getRowModel().rows);
  const allExpanded = allExpandableRowIds.every((id) => expanded[id]);
  const isDisabled = allExpandableRowIds.length === 0;

  const handleClick = () => {
    if (isDisabled) return;
    if (allExpanded) {
      setExpanded({});
    } else {
      const newExpanded = {};
      allExpandableRowIds.forEach((id) => {
        newExpanded[id] = true;
      });
      setExpanded(newExpanded);
    }
  };

  const baseClasses =
    "btn h-10 w-[150px] rounded-md justify-between self-end font-normal text-[12px] border-2";

  const stateClasses = isDisabled
    ? "cursor-not-allowed bg-stone-700 text-stone-400 border-stone-400 shadow-[4px_4px_4px_0px_#52525b]"
    : "cursor-pointer bg-teal-800 text-white border-white shadow-[4px_4px_4px_0px_#3CAE3F] hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700 transition-all duration-200 focus-visible:ring-4 focus-visible:ring-green-500/50";

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseClasses} ${stateClasses}`}
    >
      {allExpanded ? `Collapse All ${rowNoun}` : `Expand All ${rowNoun}`}
    </button>
  );
}

export default ToggleExpandCollapseRows;
