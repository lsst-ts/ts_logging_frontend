import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import AppletHeader from "@/components/AppletHeader";
import WarningTooltip from "@/components/WarningTooltip";

import { useAppletStatus } from "@/hooks/useAppletStatus";
import { APP_ERROR_HEIGHT } from "@/utils/appletStatus";

/**
 * Standard applet body that renders a loading skeleton, a fetch-error state,
 * or the normal content, based on the applet's data sources.
 *
 * @param {Object} props
 * @param {Object} [props.sources] Map of source key -> `{ ok, message }`.
 * @param {string[]} [props.required] Sources required for a sensible display.
 * @param {boolean} [props.loading] Whether the data is still loading.
 * @param {import("react").ReactNode} [props.skeleton] Skeleton shown while loading.
 * @param {import("react").ReactNode} [props.children] Normal content when ready.
 */
export function AppletStatusBody({
  sources = {},
  required = [],
  loading = false,
  skeleton,
  children,
}) {
  const { status, message } = useAppletStatus({ sources, required, loading });

  if (status === "loading") {
    return skeleton;
  }

  if (status === "error") {
    return (
      <div className="h-full place-content-center-safe">
        <p className="text-stone-400 text-center">{message}</p>
      </div>
    );
  }

  return children;
}

/**
 * Standard applet card used across the Time Accounting page.
 *
 * Owns the full card rendering: the header (title, actions, and an
 * availability-warning badge derived from the applet's data sources) and the
 * CardContent, whose body is a loading skeleton, a fetch-error state, or the
 * normal content, and whose height reflects the current state.
 *
 * @param {Object} props
 * @param {string} props.title Header title.
 * @param {import("react").ReactNode} [props.actions] Right-aligned header actions.
 * @param {Object} [props.sources] Map of source key -> `{ ok, message }`.
 * @param {string[]} [props.required] Sources required for a sensible display.
 * @param {boolean} [props.loading] Whether the data is still loading.
 * @param {boolean} [props.open] Whether the card content is shown (hide/show toggle).
 * @param {string} [props.id] id applied to the CardContent.
 * @param {import("react").ReactNode} [props.skeleton] Skeleton shown while loading.
 * @param {string} [props.readyClassName] Extra classes for the CardContent when ready.
 * @param {boolean} [props.maintainHeight] When true, the error state keeps the
 *   ready height instead of collapsing to the shared compact error height. Use for
 *   applets that are embedded in a dashboard and must keep a fixed height in
 *   every state.
 * @param {string} [props.cardClassName] Extra classes for the outer Card.
 * @param {string} [props.badgeAriaLabel] Accessible label for the warning badge.
 * @param {import("react").ReactNode} [props.children] Normal content when ready.
 */
function AppletCard({
  title,
  actions,
  sources = {},
  required = [],
  loading = false,
  open = true,
  id,
  skeleton,
  readyClassName = "",
  maintainHeight = false,
  cardClassName = "",
  badgeAriaLabel = "data availability warning",
  children,
}) {
  const { status, message } = useAppletStatus({ sources, required, loading });

  return (
    <Card
      className={cn(
        "@container border-none p-0 bg-stone-800 gap-2",
        cardClassName,
      )}
    >
      <AppletHeader
        title={title}
        titleBadge={
          status === "ready" && message ? (
            <div className="flex place-items-center-safe">
              <WarningTooltip ariaLabel={badgeAriaLabel} iconClassName="h-4">
                {message}
              </WarningTooltip>
            </div>
          ) : undefined
        }
        actions={actions}
      />
      {open && (
        <CardContent
          id={id}
          className={cn(
            "flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin",
            status === "error"
              ? maintainHeight
                ? readyClassName
                : APP_ERROR_HEIGHT
              : readyClassName,
          )}
        >
          <AppletStatusBody
            sources={sources}
            required={required}
            loading={loading}
            skeleton={skeleton}
          >
            {children}
          </AppletStatusBody>
        </CardContent>
      )}
    </Card>
  );
}

export default AppletCard;
