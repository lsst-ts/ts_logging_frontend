import { DataTable, useUrlSync } from "@/components/DataTable";
import {
  dataLogColumns,
  defaultColumnVisibility,
  defaultColumnOrder,
} from "@/components/DataLogColumns";

/**
 * Table component for displaying Data Log (exposure) data.
 * Wraps DataTable with telescope-specific column configuration
 * and URL-synced filters.
 *
 * @param {Object} props
 * @param {string} props.telescope - Current telescope ("Simonyi" or "AuxTel")
 * @param {Array} props.data - Data Log row data
 * @param {boolean} props.dataLogLoading - Whether data is loading
 */
function DataLogTable({ telescope, data, dataLogLoading }) {
  // Get column filters synced with URL
  const { columnFilters, setColumnFilters, resetFilters } = useUrlSync({
    routePath: "/data-log",
    columns: dataLogColumns[telescope] ?? [],
  });

  // Reset handler - clears all filters
  const handleReset = () => {
    resetFilters();
  };

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
      onReset={handleReset}
    />
  );
}

export default DataLogTable;
