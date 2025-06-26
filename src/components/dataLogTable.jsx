"use client";

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCellValue } from "@/utils/utils";

function DataLogTable({ columns, data, dataLogLoading }) {
  if (!Array.isArray(data)) {
    console.error("Expected Data Log `data` to be an array but got:", data);
    return <div className="text-red-500 p-4">Invalid data format</div>;
  }

  const skeletonRowCount = 10;

  return (
    <div className="rounded-md border overflow-auto max-h-[70vh] text-white">
      <Table className="text-white">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead className="text-white" key={col.accessorKey}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {dataLogLoading
            ? Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                <TableRow key={`skeleton-${rowIdx}`}>
                  {columns.map((col, colIdx) => (
                    <TableCell key={`skeleton-cell-${rowIdx}-${colIdx}`}>
                      <Skeleton className="h-4 w-full bg-teal-700" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : data.map((row, i) => (
                <TableRow key={i}>
                  {columns.map((col) => {
                    const rawValue = row[col.accessorKey];
                    const getValue = () => rawValue;
                    return (
                      <TableCell key={col.accessorKey}>
                        {col.cell
                          ? col.cell({ getValue })
                          : formatCellValue(rawValue)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default DataLogTable;
