import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

function ColumnVisibilityPopover({ table }) {
  const allColumns = table.getAllLeafColumns(); // Only leaf columns, no groups

  const handleSelectAll = () => {
    allColumns.forEach((column) => {
      if (!column.getIsVisible()) column.toggleVisibility(true);
    });
  };

  const handleDeselectAll = () => {
    allColumns.forEach((column) => {
      if (column.getIsVisible()) column.toggleVisibility(false);
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="btn bg-white text-black mt-4 h-10 font-light rounded-md shadow-[4px_4px_4px_0px_#3CAE3F] 
                      flex justify-center items-center py-2 px-4 
                      hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-white transition-all duration-200"
        >
          Show / Hide Columns
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56">
        <div className="flex justify-between mb-2">
          <button
            onClick={handleSelectAll}
            className="text-xs text-blue-600 hover:underline"
          >
            Select All
          </button>
          <button
            onClick={handleDeselectAll}
            className="text-xs text-red-600 hover:underline"
          >
            Deselect All
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allColumns.map((column) => (
            <div key={column.id} className="flex items-center space-x-2">
              <Checkbox
                checked={column.getIsVisible()}
                onCheckedChange={(checked) =>
                  column.toggleVisibility(!!checked)
                }
              />
              <span className="text-sm">{column.columnDef.header}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ColumnVisibilityPopover;
