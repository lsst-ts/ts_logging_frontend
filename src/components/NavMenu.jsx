import React from "react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { Link, useRouterState } from "@tanstack/react-router";
import { buildNavigationWithSearchParams } from "@/utils/utils";

const items = [
  { name: "digest", title: "Nightly Digest", url: "/nightlydigest/" },
  { name: "plots", title: "Plots", url: "/nightlydigest/plots" },
  { name: "data-log", title: "Data Log", url: "/nightlydigest/data-log" },
  {
    name: "context-feed",
    title: "Context Feed",
    url: "/nightlydigest/context-feed",
  },
  {
    name: "visit-maps",
    title: "Visit Maps",
    url: "/nightlydigest/visit-maps",
  },
];

export default function NavMenu() {
  const { pathname, search } = useRouterState({ select: (s) => s.location });
  return (
    <NavigationMenu className="flex flex-col items-start">
      <NavigationMenuList className="flex flex-col gap-2">
        {items.map((item) => {
          // Remove trailing slash for comparison if needed
          const itemPath = item.url.replace(/\/$/, "");
          const currentPath = pathname.replace(/\/$/, "");
          const isActive = itemPath === currentPath;

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
