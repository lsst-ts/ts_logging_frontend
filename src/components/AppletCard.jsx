import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";
import Header from "@/components/Header";
import WarningTooltip from "@/components/WarningTooltip";

import { resolveDisplayState } from "@/utils/displayState";

/** Default error-state height (compact) shared by all applets. */
const APP_ERROR_HEIGHT = "h-[100px]";

/** Default display-state context. */
const DisplayStateContext = createContext({ state: "ready", message: "" });

/**
 * Read the state of the current applet from the context that `AppletCard`
 * provides.
 *
 * Only usable inside an `<AppletCard>` (typically from an applet's own
 * body). Only the `ready` and `noData` states reach the content
 * (`loading`/`error` are handled by AppletStateBody), so applets can use
 * this to render their empty-state shell when state is `noData`.
 */
export function useAppletState() {
  return useContext(DisplayStateContext);
}

/**
 * Shared empty-state message placed in a data region when the display state
 * is `noData` (a required source was reached but is empty) or `error` (a
 * required source failed to fetch).
 *
 * @param {Object} props
 * @param {string} props.message - The message to display.
 * @param {"applet"|"page"} [props.variant] - Which variant to style for.
 *   Text size and vertical padding differ between `applet` (default)
 *   and `page` variants.
 */
export function EmptyDisplayState({ message, variant = "applet" }) {
  return (
    <div className="h-full place-content-center-safe">
      <p
        className={cn(
          "text-stone-400 text-center font-thin",
          variant === "page" ? "text-xl py-10" : "text-md py-4",
        )}
      >
        {message}
      </p>
    </div>
  );
}

/**
 * Standard card body that renders a loading skeleton, a fetch-error state,
 * or the normal content, based on the display state.
 *
 * The state is read from context (provided by AppletCard), which is
 * resolved exactly once per card. A fetch error ("error") renders the
 * standard EmptyDisplayState message and gates the content entirely (a fetch
 * error means nothing to show at all), whereas no-data ("noData") still lets
 * the content render its own shell around the message via useAppletState.
 *
 * @param {Object} props
 * @param {import("react").ReactNode} [props.skeleton] Skeleton shown while loading.
 * @param {import("react").ReactNode} [props.children] Content when ready (and, via
 *   the consumer's own use of useAppletState, when there is no data).
 */
export function AppletStateBody({ skeleton, children }) {
  const { state, message } = useAppletState();

  if (state === "loading") {
    return skeleton;
  }

  if (state === "error") {
    return EmptyDisplayState({ message });
  }

  return children;
}

/**
 * Render a header warning badge from a resolved display state. Shows a
 * warning tooltip when the state is ready but one or more non-required
 * sources carry a message (a warning rather than an error).
 *
 * @param {{state: "loading"|"error"|"noData"|"ready", message: string}} resolved
 * @param {string} [ariaLabel]
 * @returns {import("react").ReactNode} The badge, or `undefined` when no warning.
 */
export function renderHeaderWarning(
  { state, message },
  ariaLabel = "data availability warning",
) {
  if (state === "ready" && message) {
    return (
      <div className="flex place-items-center-safe">
        <WarningTooltip ariaLabel={ariaLabel} iconClassName="h-4">
          {message}
        </WarningTooltip>
      </div>
    );
  }
  return undefined;
}

/**
 * Standard applet card.
 *
 * Owns the full card rendering: the header (title, optional custom badge,
 * actions, and an availability-warning badge derived from the applet's data
 * sources) and the CardContent, whose body is a loading skeleton, a
 * fetch-error state, or the normal content, and whose height reflects the
 * current state.
 *
 * @param {Object} props
 * @param {string} props.title Header title.
 * @param {string} [props.description] Optional subtitle rendered after the title.
 * @param {import("react").ReactNode} [props.actions] Right-aligned header actions.
 * @param {import("react").ReactNode} [props.titleBadge] Optional badge next to the title.
 * @param {Object} [props.sources] Map of source key -> `{ ok, message, noData }`.
 * @param {string[]} [props.required] Sources required for a sensible display.
 * @param {boolean} [props.loading] Whether the data is still loading.
 * @param {boolean} [props.open] Whether the card content is shown (hide/show toggle).
 * @param {string} [props.id] id applied to the CardContent.
 * @param {import("react").Ref} [props.contentRef] Ref attached to the CardContent.
 * @param {import("react").ReactNode} [props.skeleton] Skeleton shown while loading.
 * @param {string} [props.readyClassName] Extra classes for the CardContent when ready or no data.
 * @param {boolean} [props.maintainHeight] When true, the error state keeps the
 *   ready height instead of collapsing to the shared compact error height. Use for
 *   applets that are embedded in a dashboard and must keep a fixed height in
 *   every state.
 * @param {boolean} [props.collapseNoData] When true, the no-data state collapses
 *   to the shared compact error height, like the fetch-error state. Use for
 *   applets that have no non-data elements to show when there is no data.
 * @param {string} [props.cardClassName] Extra classes for the outer Card.
 * @param {string} [props.badgeAriaLabel] Accessible label for the warning badge.
 * @param {import("react").ReactNode} [props.children] Content when ready or no data.
 */
function AppletCard({
  title,
  description,
  actions,
  titleBadge,
  id,
  contentRef,
  skeleton,
  sources = {},
  required = [],
  loading = false,
  open = true,
  readyClassName = "",
  maintainHeight = false,
  collapseNoData = false,
  cardClassName = "",
  badgeAriaLabel = "data availability warning",
  children,
}) {
  const { state, message } = resolveDisplayState({
    sources,
    required,
    loading,
  });

  const warningBadge = renderHeaderWarning({ state, message }, badgeAriaLabel);

  return (
    <Card
      data-testid="applet-card"
      className={cn(
        "@container border-none p-0 bg-stone-800 gap-2",
        cardClassName,
      )}
    >
      <DisplayStateContext.Provider value={{ state, message }}>
        <Header
          title={title}
          description={description}
          titleBadge={
            titleBadge || warningBadge ? (
              <span className="flex flex-row gap-2 items-center">
                {titleBadge}
                {warningBadge}
              </span>
            ) : undefined
          }
          actions={actions}
        />
        {open && (
          <CardContent
            id={id}
            ref={contentRef}
            className={cn(
              "flex flex-col gap-4 bg-black p-4 text-neutral-200 rounded-sm border-2 border-teal-900 font-thin",
              (state === "error" || (collapseNoData && state === "noData")) &&
                !maintainHeight
                ? APP_ERROR_HEIGHT
                : readyClassName,
            )}
          >
            <AppletStateBody skeleton={skeleton}>{children}</AppletStateBody>
          </CardContent>
        )}
      </DisplayStateContext.Provider>
    </Card>
  );
}

export default AppletCard;
