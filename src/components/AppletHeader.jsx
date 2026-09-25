import { cn } from "@/lib/utils";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Reusable dark teal header bar used consistently across the app, for both
 * page headers and applet (card) headers.
 *
 * Layout uses a responsive flex layout, with the breakpoint depending on the
 * variant. The title (+ optional badge / description) is on the left and
 * arbitrary actions are on the right.
 *
 * @param {Object} props
 * @param {string} [props.isPageHeader] - true renders the full page-header content;
 *   false renders the compact applet-header content. The variant also
 *   controls the responsive breakpoint.
 * @param {string} props.title - Header title.
 * @param {string} [props.description] - Optional subtitle rendered after the title.
 * @param {React.ReactNode} [props.titleBadge] - Optional node rendered next to the
 *   title (e.g. a warning icon).
 * @param {React.ReactNode} [props.actions] - Optional right-aligned action nodes
 *   (buttons, popovers, toggles such as "Show Tips" / "Show Graph").
 */
function AppletHeader({
  isPageHeader = false,
  title,
  description,
  titleBadge,
  actions,
}) {
  return (
    <div className="@container">
      {/* <Card className="border-none p-0 bg-stone-800 mt-2"> */}
      <CardHeader
        className={cn(
          "flex flex-col gap-2 p-3 bg-teal-900 rounded-sm shadow-stone-900 shadow-md",
          isPageHeader
            ? "@xl:flex-row @xl:gap-4 @xl:items-center"
            : "@xs:flex-row @xs:gap-4 @xs:items-center",
        )}
      >
        {/* Page header has title and description, whereas applet headers just have a title */}
        {isPageHeader ? (
          <CardTitle className="flex flex-row text-white font-thin min-w-0 gap-2">
            <span className="flex flex-row shrink-0 gap-2">
              <span className="font-normal">{`${title}:`}</span>
              {titleBadge}
            </span>
            {description && (
              <span className="break-words min-w-0">{description}</span>
            )}
          </CardTitle>
        ) : (
          <CardTitle className="flex flex-row text-white font-thin min-w-0">
            <span className="flex flex-row gap-2">
              {title}
              {titleBadge}
            </span>
          </CardTitle>
        )}

        {/* Icons & Buttons */}
        {actions && (
          <div className="ml-auto shrink-0 self-end">
            <div className="flex flex-row gap-2">{actions}</div>
          </div>
        )}
      </CardHeader>
      {/* </Card> */}
    </div>
  );
}

export default AppletHeader;
