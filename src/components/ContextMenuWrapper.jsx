import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Component that adds a right-click context menu to any element.
 *
 * Wraps children with a context menu that appears on right-click.
 * Uses shadcn's ContextMenu component for consistent styling.
 *
 * @param {React.ReactNode} children - Element to wrap with context menu
 * @param {Array<Object>} menuItems - Array of menu items with shape:
 *   [{ label: string, onClick: () => void }]
 *
 * @example
 * <ContextMenuWrapper menuItems={[
 *   { label: "View details", onClick: () => console.log("details") },
 *   { label: "Export data", onClick: () => exportData() }
 * ]}>
 *   <div>Right-click me!</div>
 * </ContextMenuWrapper>
 */
export function ContextMenuWrapper({ children, menuItems, ...props }) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div {...props}>{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        {menuItems.map((item, index) => (
          <ContextMenuItem key={index} onClick={item.onClick}>
            {item.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
