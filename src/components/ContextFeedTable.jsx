import { useState, useRef } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

import { DataTable } from "@/components/DataTable";
import { contextFeedColumns } from "@/components/ContextFeedColumns";
import { CATEGORY_INDEX_INFO } from "@/components/context-feed-definitions.js";

const DEFAULT_COLUMN_VISIBILITY = {
  category_index: false,
  event_type: true,
  current_task: false,
  time: true,
  name: true,
  description: true,
  config: true,
  script_salIndex: true,
  finalStatus: true,
  timestampProcessStart: true,
  timestampConfigureStart: true,
  timestampConfigureEnd: true,
  timestampRunStart: true,
  timestampProcessEnd: true,
};

const DEFAULT_COLUMN_ORDER = [
  "category_index",
  "event_type",
  "current_task",
  "time",
  "name",
  "description",
  "config",
  "script_salIndex",
  "finalStatus",
  "timestampProcessStart",
  "timestampConfigureStart",
  "timestampConfigureEnd",
  "timestampRunStart",
  "timestampProcessEnd",
];

function ContextFeedTable({
  data,
  dataLoading,
  columnFilters,
  setColumnFilters,
}) {
  const tableRef = useRef();

  // State for collapse all checkboxes
  const [collapseTracebacks, setCollapseTracebacks] = useState(true);
  const [collapseYaml, setCollapseYaml] = useState(true);

  // State for group by task checkbox (managed here to sync with checkbox)
  const [groupByTask, setGroupByTask] = useState(false);

  // Handlers for collapse all checkboxes
  const handleCollapseTracebacks = (checked) => {
    setCollapseTracebacks(checked);
    tableRef.current?.setCollapseAll("description", checked);
  };

  const handleCollapseYaml = (checked) => {
    setCollapseYaml(checked);
    tableRef.current?.setCollapseAll("config", checked);
  };

  // Handler for group by task checkbox
  const handleGroupByTask = (checked) => {
    setGroupByTask(checked);
    tableRef.current?.setGrouping(checked ? ["current_task"] : []);
  };

  // Reset handler
  const handleReset = () => {
    setCollapseTracebacks(true);
    setCollapseYaml(true);
    setGroupByTask(false);
    setColumnFilters([
      {
        id: "event_type",
        value: Object.values(CATEGORY_INDEX_INFO).map((info) => info.label),
      },
    ]);
  };

  // Custom center content for toolbar
  const centerContent = (
    <div className="flex flex-row items-left min-h-10 mx-4 px-4 py-1 gap-4 border border-white rounded">
      {/* Group/Ungroup by Task */}
      <label className="flex items-center space-x-2 cursor-pointer">
        <Checkbox
          checked={groupByTask}
          onCheckedChange={handleGroupByTask}
          style={{ borderColor: "#ffffff" }}
          className="cursor-pointer"
        />
        <span className="text-[12px] text-stone-200">Group by Task</span>
      </label>

      {/* Vertical divider */}
      <div className="flex items-center my-1">
        <Separator orientation="vertical" className="bg-stone-600" />
      </div>

      {/* Collapse/Expand Tracebacks */}
      <label className="flex items-center space-x-2 cursor-pointer">
        <Checkbox
          checked={collapseTracebacks}
          onCheckedChange={handleCollapseTracebacks}
          style={{ borderColor: "#ffffff" }}
          className="cursor-pointer"
        />
        <span className="text-[12px] text-stone-200">
          Collapse All Tracebacks
        </span>
      </label>

      {/* Collapse/Expand YAML */}
      <label className="flex items-center space-x-2 cursor-pointer">
        <Checkbox
          checked={collapseYaml}
          onCheckedChange={handleCollapseYaml}
          style={{ borderColor: "#ffffff" }}
          className="cursor-pointer"
        />
        <span className="text-[12px] text-stone-200">Collapse All YAML</span>
      </label>
    </div>
  );

  return (
    <DataTable
      ref={tableRef}
      data={data}
      columns={contextFeedColumns}
      isLoading={dataLoading}
      defaultColumnVisibility={DEFAULT_COLUMN_VISIBILITY}
      defaultColumnOrder={DEFAULT_COLUMN_ORDER}
      defaultSorting={[{ id: "time", desc: false }]}
      columnFilters={columnFilters}
      setColumnFilters={setColumnFilters}
      tableMeta={{
        collapseTracebacks,
        collapseYaml,
      }}
      toolbar={{
        showColumnVisibility: true,
        showExpandCollapseGroups: true,
        showReset: true,
        centerContent,
      }}
      onReset={handleReset}
    />
  );
}

export default ContextFeedTable;
