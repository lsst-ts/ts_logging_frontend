import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import { useRouter } from "@tanstack/react-router";

const items = [
  { name: "digest", title: "Nightly Digest", url: "/nightlydigest/" },
  { name: "plots", title: "Plots", url: "#" },
  { name: "data-log", title: "Data Log", url: "/nightlydigest/data-log" },
  {
    name: "context-feed",
    title: "Context Feed",
    url: "/nightlydigest/context-feed",
  },
];

export default function NavMenu({ activeKey }) {
  const { state } = useRouter();
  const search = state.location.search;
  // If search is an object, convert to query string
  const searchString =
    search && typeof search === "object" && Object.keys(search).length > 0
      ? new URLSearchParams(search).toString()
      : "";
  return (
    <NavigationMenu className="flex flex-col items-start">
      <NavigationMenuList className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.name === activeKey;
          // Only append search params if not navigating to '#'
          const url =
            item.url === "#"
              ? "#"
              : item.url + (searchString ? `?${searchString}` : "");
          return (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuLink
                href={url}
                className={`text-base text-white ${
                  isActive
                    ? "font-bold"
                    : "font-normal underline underline-offset-2 hover:text-teal-100 hover:tracking-widest focus:text-teal-100 focus:tracking-widest"
                }`}
              >
                {item.title}
              </NavigationMenuLink>
            </NavigationMenuItem>
          );
        })}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
