function ToggleExpandCollapseRows({ table, expanded, setExpanded }) {
  const grouping = table.getState().grouping;

  // Walk grouped row model recursively to collect
  // expandable group row ids
  function getAllGroupRowIds(rows) {
    const ids = [];
    for (const row of rows) {
      if (row.getIsGrouped()) {
        ids.push(row.id);
        if (row.subRows?.length) {
          ids.push(...getAllGroupRowIds(row.subRows));
        }
      }
    }
    return ids;
  }

  const allGroupRowIds = getAllGroupRowIds(table.getRowModel().rows);
  const allExpanded = allGroupRowIds.every((id) => expanded[id]);
  const isDisabled = grouping.length === 0;

  const handleClick = () => {
    if (isDisabled) return;
    if (allExpanded) {
      setExpanded({});
    } else {
      const newExpanded = {};
      allGroupRowIds.forEach((id) => {
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
      {allExpanded ? "Collapse All Groups" : "Expand All Groups"}
    </button>
  );
}

export default ToggleExpandCollapseRows;
