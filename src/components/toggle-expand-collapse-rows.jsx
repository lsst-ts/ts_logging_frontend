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
      className={`btn p-2 w-40 font-light justify-center rounded-sm shadow-[4px_4px_4px_0px_#3CAE3F] ${
        grouping.length === 0
          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
          : "bg-white text-black hover:bg-green-100"
      }`}
    >
      {allExpanded ? "Collapse All Groups" : "Expand All Groups"}
    </button>
  );
}

export default ToggleExpandCollapseRows;
