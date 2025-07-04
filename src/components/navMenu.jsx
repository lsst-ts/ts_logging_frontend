import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";

const items = [
  { name: "digest", title: "Nightly Digest", url: "/nightlydigest/" },
  { name: "plots", title: "Plots", url: "#" },
  { name: "data-log", title: "Data Log", url: "/nightlydigest/data-log" },
  { name: "context-feed", title: "Context Feed", url: "#" },
];

export default function NavMenu({ activeKey }) {
  return (
    <NavigationMenu className="flex flex-col items-start">
      <NavigationMenuList className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = item.name === activeKey;
          return (
            <NavigationMenuItem key={item.name}>
              <NavigationMenuLink
                href={item.url}
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
