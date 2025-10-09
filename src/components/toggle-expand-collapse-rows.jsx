import React from "react";

function ToggleExpandCollapseRows({ table, expanded, setExpanded, variant }) {
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

  return (
    <button
      onClick={() => {
        if (grouping.length === 0) return;
        if (allExpanded) {
          setExpanded({});
        } else {
          const newExpanded = {};
          allGroupRowIds.forEach((id) => {
            newExpanded[id] = true;
          });
          setExpanded(newExpanded);
        }
      }}
      disabled={grouping.length === 0}
      className={
        "btn h-10 rounded-md " +
        (variant === "teal"
          ? grouping.length === 0
            ? "cursor-not-allowed w-[150px] justify-between self-end font-normal text-[12px] bg-stone-700 text-stone-400 border-2 border-stone-400 shadow-[4px_4px_4px_0px_#52525b]"
            : "cursor-pointer w-[150px] justify-between self-end font-normal text-[12px] bg-teal-800 text-white border-2 border-white shadow-[4px_4px_4px_0px_#3CAE3F] focus-visible:ring-4 focus-visible:ring-green-500/50 hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700 transition-all duration-200"
          : grouping.length === 0
            ? "cursor-not-allowed flex justify-center items-center py-2 px-4 font-light mt-4 bg-gray-200 text-gray-400 border-2 border-gray-300 shadow-[4px_4px_4px_0px_#a8a29e]"
            : "cursor-pointer flex justify-center items-center py-2 px-4 font-light mt-4 bg-white text-black border-2 border-white shadow-[4px_4px_4px_0px_#3CAE3F] hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200")
      }
    >
      {allExpanded ? "Collapse All Groups" : "Expand All Groups"}
    </button>
  );
}

export default ToggleExpandCollapseRows;
