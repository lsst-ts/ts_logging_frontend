import React from "react";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { useRouter } from "@tanstack/react-router";
import { buildNavItemUrl } from "@/utils/utils";
import { GLOBAL_SEARCH_PARAMS } from "@/routes";

const items = [
  { name: "digest", title: "Nightly Digest", url: "/nightlydigest/" },
  { name: "plots", title: "Plots", url: "/nightlydigest/plots" },
  { name: "data-log", title: "Data Log", url: "/nightlydigest/data-log" },
  {
    name: "context-feed",
    title: "Context Feed",
    url: "/nightlydigest/context-feed",
  },
];

export default function NavMenu() {
  const { state } = useRouter();
  const search = state.location.search;
  const pathname = state.location.pathname;
  return (
    <NavigationMenu className="flex flex-col items-start">
      <NavigationMenuList className="flex flex-col gap-2">
        {items.map((item) => {
          // Remove trailing slash for comparison if needed
          const itemPath = item.url.replace(/\/$/, "");
          const currentPath = pathname.replace(/\/$/, "");
          const isActive = itemPath === currentPath;
          // If leaving the data-log, strip url of search params
          const url = buildNavItemUrl(
            item.url,
            pathname,
            search,
            GLOBAL_SEARCH_PARAMS,
          );

          return (
            <NavigationMenuItem key={item.name}>
              {isActive ? (
                <span className="p-2 flex flex-col gap-1 rounded-sm text-base text-white font-bold cursor-default">
                  {item.title}
                </span>
              ) : (
                <NavigationMenuLink
                  href={url}
                  className="text-base text-white font-normal underline underline-offset-2 hover:text-teal-100 hover:tracking-widest focus:text-teal-100 focus:tracking-widest"
                >
                  {item.title}
                </NavigationMenuLink>
              )}
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
