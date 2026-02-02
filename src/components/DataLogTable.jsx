import { DataTable, useUrlSync } from "@/components/DataTable";
import {
  dataLogColumns,
  defaultColumnVisibility,
  defaultColumnOrder,
} from "@/components/DataLogColumns";

function DataLogTable({ telescope, data, dataLogLoading }) {
  // Get column filters synced with URL
  const { columnFilters, setColumnFilters } = useUrlSync({
    routePath: "/data-log",
    columns: dataLogColumns[telescope] ?? [],
    defaultFilters: [],
  });

  return (
    <DataTable
      data={data}
      columns={dataLogColumns[telescope] ?? []}
      isLoading={dataLogLoading}
      defaultColumnVisibility={defaultColumnVisibility[telescope] ?? {}}
      defaultColumnOrder={defaultColumnOrder[telescope] ?? []}
      defaultSorting={[{ id: "exposure_id", desc: false }]}
      columnFilters={columnFilters}
      setColumnFilters={setColumnFilters}
      toolbar={{
        showColumnVisibility: true,
        showExpandCollapseGroups: true,
        showReset: true,
      }}
    />
  );
}

export default DataLogTable;
