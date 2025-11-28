import { Link } from "@tanstack/react-router";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

/**
 * Component that adds a right-click context menu to any element. Less boilerplate
 * than default shadcn ContextMenu component
 *
 * @param {React.ReactNode} children - Element to wrap with context menu
 * @param {Array<Object>} menuItems - Array of menu items with shape:
 *   [{ label: string, onClick: () => void }] or [{ label: string, to: string, search?: object }]
 *
 * @example
 * <ContextMenuWrapper menuItems={[
 *   { label: "View details", onClick: () => console.log("details") },
 *   { label: "Open page", to: "/some-page", search: { id: 123 } }
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
        {menuItems.map((item, index) => {
          if (item.to) {
            return (
              <ContextMenuItem key={index} asChild>
                <Link to={item.to} search={item.search}>
                  {item.label}
                </Link>
              </ContextMenuItem>
            );
          }
          return (
            <ContextMenuItem key={index} onClick={item.onClick}>
              {item.label}
            </ContextMenuItem>
          );
        })}
      </ContextMenuContent>
    </ContextMenu>
  );
}
