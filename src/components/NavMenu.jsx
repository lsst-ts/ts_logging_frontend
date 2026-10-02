import React from "react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Link, useMatchRoute, useRouterState } from "@tanstack/react-router";
import { buildNavigationWithSearchParams } from "@/utils/utils";
import { isScientificNightlyDigest } from "@/utils/appConfig";

const items = [
  { name: "digest", title: "Nightly Digest", url: "/" },
  { name: "plots", title: "Plots", url: "/plots" },
  { name: "data-log", title: "Data Log", url: "/data-log" },
  ...(isScientificNightlyDigest
    ? []
    : [
        {
          name: "context-feed",
          title: "Context Feed",
          url: "/context-feed",
        },
      ]),
  {
    name: "visit-maps",
    title: "Visit Maps",
    url: "/visit-maps",
  },
  ...(isScientificNightlyDigest
    ? []
    : [
        {
          name: "time-accounting",
          title: "Time Accounting",
          url: "/nightlydigest/time-accounting",
        },
      ]),
];

/**
 * Render the primary navigation menu, highlighting the active route.
 *
 * Reads the current location from the router and builds navigation targets
 * that preserve relevant search params.
 */
export default function NavMenu() {
  const { pathname, search } = useRouterState({ select: (s) => s.location });
  const matchRoute = useMatchRoute();
  return (
    <NavigationMenu className="flex flex-col items-start">
      <NavigationMenuList className="flex flex-col gap-2">
        {items.map((item) => {
          // pathname includes the basepath, so let the router do the matching
          const isActive = !!matchRoute({ to: item.url });

          // Build navigation target with filtered search params
          const { to, search: filteredSearch } =
            buildNavigationWithSearchParams(item.url, pathname, search);

          return (
            <NavigationMenuItem key={item.name}>
              {isActive ? (
                <span className="p-2 flex flex-col gap-1 rounded-sm text-base text-white font-bold cursor-default">
                  {item.title}
                </span>
              ) : (
                <NavigationMenuLink
                  asChild
                  className="text-base text-white font-normal underline underline-offset-2 hover:text-teal-100 hover:tracking-widest focus:text-teal-100 focus:tracking-widest"
                >
                  <Link to={to} search={filteredSearch}>
                    {item.title}
                  </Link>
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
