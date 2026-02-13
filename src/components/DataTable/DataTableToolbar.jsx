import ColumnVisibilityPopover from "@/components/column-visibility-popover";
import ToggleExpandCollapseRows from "@/components/toggle-expand-collapse-rows";

/**
 * DataTable toolbar component with configurable buttons and extension points.
 *
 * @param {Object} props
 * @param {Object} props.table - TanStack Table instance
 * @param {Object} props.expanded - Expanded state for row groups
 * @param {Function} props.setExpanded - Setter for expanded state
 * @param {Function} props.onReset - Reset handler
 * @param {Object} props.config - Toolbar configuration
 * @param {boolean} props.config.showColumnVisibility - Show column visibility button
 * @param {boolean} props.config.showExpandCollapseGroups - Show expand/collapse button
 * @param {boolean} props.config.showReset - Show reset button
 * @param {React.ReactNode} props.config.leftContent - Custom content for left section
 * @param {React.ReactNode} props.config.centerContent - Custom content for center section
 * @param {React.ReactNode} props.config.rightContent - Custom content for right section
 */
function DataTableToolbar({
  table,
  expanded,
  setExpanded,
  onReset,
  config = {},
}) {
  const {
    showColumnVisibility = true,
    showExpandCollapseGroups = true,
    showReset = true,
    leftContent = null,
    centerContent = null,
    rightContent = null,
  } = config;

  return (
    <div className="flex flex-row justify-between items-end mb-2">
      {/* Left section */}
      <div className="flex gap-4">
        {showColumnVisibility && <ColumnVisibilityPopover table={table} />}
        {showExpandCollapseGroups && (
          <ToggleExpandCollapseRows
            table={table}
            expanded={expanded}
            setExpanded={setExpanded}
          />
        )}
        {leftContent}
      </div>

      {/* Center section */}
      {centerContent}

      {/* Right section */}
      <div className="flex gap-4 items-center">
        {rightContent}
        {showReset && <ResetButton onClick={onReset} />}
      </div>
    </div>
  );
}

/**
 * Reset button component
 */
function ResetButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="btn h-10 w-[100px] bg-teal-800 justify-between
        font-normal text-[12px] text-white
        border-2 border-white rounded-md
        cursor-pointer
        shadow-[4px_4px_4px_0px_#3CAE3F]
        hover:shadow-[6px_6px_8px_0px_#3CAE3F] hover:scale-[1.02] hover:bg-teal-700
        transition-all duration-200
        focus-visible:ring-4
        focus-visible:ring-green-500/50"
    >
      Reset Table
    </button>
  );
}

export default DataTableToolbar;
