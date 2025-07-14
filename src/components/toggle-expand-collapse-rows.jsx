import React from "react";

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
      className={`btn bg-white text-black mt-4 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] flex justify-center items-center py-2 px-4 ${
        grouping.length === 0
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-white text-black hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
      }`}
    >
      {allExpanded ? "Collapse All Groups" : "Expand All Groups"}
    </button>
  );
}

export default ToggleExpandCollapseRows;
