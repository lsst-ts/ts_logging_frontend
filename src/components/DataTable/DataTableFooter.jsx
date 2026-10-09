import { TableFooter, TableRow, TableHead } from "@/components/ui/table";

/**
 * DataTable footer component.
 *
 * Renders a single full-width footer row spanning all leaf columns. The
 * content is provided by `tableMeta.renderFooter({ table })`; when that is
 * not set, no footer is rendered (so existing tables are unaffected).
 *
 * Use TanStack's aggregation API inside `renderFooter` to compute totals,
 * e.g. `table.getColumn(id).getAggregationValue()`.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 */
function DataTableFooter({ table }) {
  const renderFooter = table.options.meta?.renderFooter;
  if (!renderFooter) return null;

  const colCount = table.getVisibleLeafColumns().length;

  return (
    <TableFooter>
      <TableRow className="bg-teal-700">
        <TableHead colSpan={colCount} className="text-white bg-teal-700">
          {renderFooter({ table })}
        </TableHead>
      </TableRow>
    </TableFooter>
  );
}

export default DataTableFooter;
